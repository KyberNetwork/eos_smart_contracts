#pragma once

#include <string>
#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/singleton.hpp>
#include "../Common/common.hpp"

CONTRACT ClearNetwork : public contract {
    public:
        using contract::contract;

        TABLE state {
            name        admin;
            name        eos_contract;
            name        listener;
            bool        enabled;
            bool        during_trade;
        };

        TABLE reserve {
            name        contract;
            uint64_t    num_tokens;
            uint64_t    primary_key() const { return contract.value; }
        };

        TABLE reservespert {
            symbol          symbol;
            name            token_contract;
            vector<name>    reserve_contracts;
            uint64_t        primary_key() const { return symbol.raw(); }
        };

        TABLE tokenstats {
            asset           token_counter;
            asset           eos_counter;
            uint64_t        primary_key() const { return token_counter.symbol.raw(); }
        };

        TABLE rate {
            double      stored_rate;
            asset       dest;
        };

        typedef eosio::singleton<"state"_n, state> state_type;
        typedef eosio::multi_index<"reserve"_n, reserve> reserves_type;
        typedef eosio::multi_index<"reservespert"_n, reservespert> reservespert_type;
        typedef eosio::multi_index<"tokenstats"_n, tokenstats> tokenstats_type;
        typedef eosio::singleton<"rate"_n, rate> rate_type;

        ACTION clear() {

            state_type state_inst(_self, _self.value);
            if(state_inst.exists()) {
                state_inst.remove();
            }

            rate_type rate_inst(_self, _self.value);
            if(rate_inst.exists()) {
                rate_inst.remove();
            }

            tokenstats_type tokenstats_table_inst(_self, _self.value);
            auto itr = tokenstats_table_inst.find(symbol("CUSD",2).raw());
            if (itr != tokenstats_table_inst.end()){
                tokenstats_table_inst.erase(itr);
            };

            itr = tokenstats_table_inst.find(symbol("IQ",3).raw());
            if (itr != tokenstats_table_inst.end()){
                tokenstats_table_inst.erase(itr);
            };
        }
};


extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
        if (code == receiver) {
            switch (action) {
                EOSIO_DISPATCH_HELPER(ClearNetwork, (clear))
            }
        }
        eosio_exit(0);
    }
}
