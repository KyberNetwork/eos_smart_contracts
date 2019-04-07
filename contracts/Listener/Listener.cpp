#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>
#include "../Common/common.hpp"

using namespace eosio;

CONTRACT Listener : public contract {
    public:
        using contract::contract;

        TABLE state {
            name   eos_contract;
            name   network_contract;
            double rebate_percent;
            asset  min_eos_for_rebate;
        };

        typedef eosio::singleton<"state"_n, state> state_type;

        ACTION config(name eos_contract,
                      name network_contract,
                      double rebate_percent,
                      asset min_eos_for_rebate) {
            eosio_assert(is_account(eos_contract), "eos contract not exist");
            eosio_assert(is_account(network_contract), "network contract does not exist");
            eosio_assert((rebate_percent >= 0) && (rebate_percent < 100.000), "illegal rebate");
            eosio_assert(min_eos_for_rebate.symbol == EOS_SYMBOL, "wrong symbol");

            require_auth(_self);

            state_type state_inst(_self, _self.value);
            state new_state = {eos_contract, network_contract, rebate_percent, min_eos_for_rebate};
            state_inst.set(new_state, _self);
        }

        ACTION posttrade(asset src, asset dest, name reserve, name sender) {
            state_type state_inst(_self, _self.value);
            if (!state_inst.exists()) return;
            auto state = state_inst.get();

            require_auth(state.network_contract);

            if (state.rebate_percent > 0) {
                asset eos_traded = (src.symbol == EOS_SYMBOL) ? src : dest;
                asset rebate = calc_dest(state.rebate_percent / 100.00, eos_traded, EOS_SYMBOL);
                asset eos_balance = get_balance(_self, state.eos_contract, EOS_SYMBOL);

                if ((rebate.amount > 0) &&
                    (rebate <= eos_balance) &&
                    (eos_traded >= state.min_eos_for_rebate)) {
                    async_pay(_self, sender, rebate, state.eos_contract, "rebate");
                }
            }
        }
};

extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
        if (code == receiver) {
            switch (action) {
                EOSIO_DISPATCH_HELPER( Listener, (config)(posttrade))
            }
        }
        eosio_exit(0);
    }
}
