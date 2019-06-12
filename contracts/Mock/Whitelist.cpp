#include <string>
#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/singleton.hpp>
#include "../Common/common.hpp"

CONTRACT Whitelist : public contract {
    public:
        using contract::contract;

        TABLE state {
            name   network_contract;
            name   listener;
        };

        TABLE allowed {
            name user;
            uint64_t primary_key() const { return user.value; }
        };

        typedef eosio::singleton<"state"_n, state> state_type;
        typedef multi_index<"allowed"_n, allowed> allowed_table;

        ACTION config(name network_contract, name listener) {
            require_auth(_self);

            state_type state_inst(_self, _self.value);
            state new_state = {network_contract, listener};
            state_inst.set(new_state, _self);
        }

        ACTION adduser(name user, bool add) {
            require_auth(_self);

            allowed_table whitelist(_self, _self.value);
            auto itr = whitelist.find(user.value);
            bool exists = (itr != whitelist.end());
            eosio_assert(((add && !exists) || (!add && exists)),
                         "can only add a non existing user or delete an existing one");
            if (add) {
                whitelist.emplace(_self, [&](auto& s) { s.user = user; });
            } else {
                whitelist.erase(itr);
            }
        }

        ACTION posttrade(asset src, asset dest, name reserve, name sender) {
            state_type state_inst(_self, _self.value);
            if (!state_inst.exists()) return;
            auto state = state_inst.get();

            require_auth(state.network_contract);

            allowed_table whitelist(_self, _self.value);
            auto itr = whitelist.find(sender.value);
            eosio_assert(itr != whitelist.end(), "sender not whitelisted");

            name listener = state_inst.get().listener;
            if ((listener != name()) && (listener != "eosio"_n)) {
                action {permission_level{_self, "active"_n},
                        listener,
                        "posttrade"_n,
                        make_tuple(src, dest, reserve, sender)}.send();
            }
         }
};

extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
        if (code == receiver) {
            switch (action) {
                EOSIO_DISPATCH_HELPER(Whitelist, (config)(adduser)(posttrade))
            }
        }
        eosio_exit(0);
    }
}
