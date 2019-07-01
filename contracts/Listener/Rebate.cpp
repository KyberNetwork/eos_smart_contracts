#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>
#include "../Common/common.hpp"

using namespace eosio;

#define SECONDS_PER_WEEK 604800
#define WEEKS_TO_RUN 5
#define INITIAL_REWARD_FACTOR 1.0

CONTRACT Rebate : public contract {
    public:
        using contract::contract;

        TABLE state {
            name        network_contract;
            name        token_contract;
            asset       default_reward;
            uint64_t    start_time_seconds;
            uint64_t    round_seconds;
            double      reward_factor;
        };

        TABLE userreward {
            name            user;
            vector<asset>   reward_per_week;
            uint64_t        primary_key() const { return user.value; }
        };

        typedef eosio::singleton<"state"_n, state> state_type;
        typedef eosio::multi_index<"userreward"_n, userreward> userreward_type;

        ACTION config(name  network_contract,
                      name  token_contract,
                      asset default_reward,
                      uint64_t round_seconds ) // configureable for testing
        {
            eosio_assert(is_account(network_contract), "network contract does not exist");
            eosio_assert(is_account(token_contract), "token contract does not exist");

            require_auth(_self);

            // current_time() returns time in microseconds (rounded to block time)
            uint64_t start_time_seconds = current_time() / 1000000;

            state_type state_inst(_self, _self.value);
            state new_state = {
                    network_contract,
                    token_contract,
                    default_reward,
                    start_time_seconds,
                    round_seconds == 0 ? SECONDS_PER_WEEK : round_seconds,
                    INITIAL_REWARD_FACTOR
            };
            state_inst.set(new_state, _self);
        }

        ACTION setfactor(double reward_factor) {
            state_type state_inst(_self, _self.value);

            auto s = state_inst.get();
            s.reward_factor = reward_factor;
            state_inst.set(s, _self);
        }

        ACTION posttrade(asset src, asset dest, name reserve, name sender) {
            state_type state_inst(_self, _self.value);
            if (!state_inst.exists()) return;
            auto state = state_inst.get();
            require_auth(state.network_contract);

            uint64_t current_time_seconds = current_time() / 1000000;
            uint64_t week_index = (current_time_seconds - state.start_time_seconds) / state.round_seconds;

            userreward_type userreward_inst(_self, _self.value);
            auto itr = userreward_inst.find(sender.value);
            bool user_exists = (itr != userreward_inst.end());

            asset rewarded_this_week = asset(0, state.default_reward.symbol);
            asset rewarded_last_week = asset(0, state.default_reward.symbol);
            if (user_exists) {
                rewarded_this_week = itr->reward_per_week[week_index];
                if (week_index > 0) rewarded_last_week = itr->reward_per_week[week_index - 1];
            }

            if (rewarded_this_week.amount > 0 || week_index > (WEEKS_TO_RUN - 1)) return;

            asset reward = state.default_reward + rewarded_last_week;
            if (!user_exists) {
                userreward_inst.emplace(_self, [&](auto& s) {
                   s.user = sender;
                   for( int i = 0; i < WEEKS_TO_RUN; i++) {
                       s.reward_per_week.push_back(asset(0, state.default_reward.symbol));
                   }
                   s.reward_per_week[week_index] = reward;
                });
            } else {
                userreward_inst.modify(itr, _self, [&](auto& s) {
                    s.user = sender;
                    s.reward_per_week[week_index] = reward;
                });
            }

            asset factored_reward = calc_dest(state.reward_factor, reward, reward.symbol);
            asset balance = get_balance(_self, state.token_contract, state.default_reward.symbol);

            if (balance >= factored_reward) {
                async_pay(_self, sender, factored_reward, state.token_contract, "yolo rebate");
            }

            return;
        }
};

extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
        if (code == receiver) {
            switch (action) {
                EOSIO_DISPATCH_HELPER( Rebate, (config)(posttrade)(setfactor))
            }
        }
        eosio_exit(0);
    }
}
