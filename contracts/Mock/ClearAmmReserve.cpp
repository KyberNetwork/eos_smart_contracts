#pragma once

#include <string>
#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/singleton.hpp>
#include "../Common/common.hpp"

CONTRACT ClearAmmReserve : public contract {
    public:
        using contract::contract;

        TABLE state {
            name        admin;
            name        network_contract;
            symbol      token_symbol;
            name        token_contract;
            name        eos_contract;
            bool        trade_enabled;
        };

        TABLE params {
            double      r;
            double      p_min;
            asset       max_eos_cap_buy;
            asset       max_eos_cap_sell;
            double      profit_percent;
            double      ram_fee;
            double      max_buy_rate;
            double      min_buy_rate;
            double      max_sell_rate;
            double      min_sell_rate;
            name        fee_wallet;
        };

        TABLE rate {
            double      stored_rate;
            asset       dest;
        };

        typedef eosio::singleton<"state"_n, state> state_type;
        typedef eosio::singleton<"params"_n, params> params_type;
        typedef eosio::singleton<"rate"_n, rate> rate_type;

        ACTION clear() {

            state_type state_inst(_self, _self.value);
            if(state_inst.exists()) {
                state_inst.remove();
            }

            params_type params_inst(_self, _self.value);
            if(params_inst.exists()) {
                params_inst.remove();
            }

            rate_type rate_inst(_self, _self.value);
            if(rate_inst.exists()) {
                rate_inst.remove();
            }
        }
};


extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
        if (code == receiver) {
            switch (action) {
                EOSIO_DISPATCH_HELPER(ClearAmmReserve, (clear))
            }
        }
        eosio_exit(0);
    }
}
