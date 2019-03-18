#pragma once

#include <vector>
#include <string>
#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/time.hpp>
#include "../Common/common.hpp"

using namespace eosio;

struct trade_info {
    name        sender;
    name        src_contract;
    asset       src;
    name        dest_contract;
    asset       dest;
    name        receiver;
    double      min_conversion_rate;
};

CONTRACT Network : public contract {
    public:
        using contract::contract;

        TABLE state {
            name        owner;
            name        eos_contract;
            bool        enabled;
            bool        during_trade;
        };

        TABLE reserve {
            name        contract;
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

        ACTION init(name owner, name eos_contract, bool enable);

        ACTION setowner(name owner);

        ACTION setenable(bool enable);

        ACTION addreserve(name reserve, bool add);

        ACTION listpairres(name reserve, symbol token_symbol, name token_contract, bool add);

        ACTION withdraw(name to, asset quantity, name dest_contract, string memo);

        ACTION getexprate(asset src, symbol dest_symbol);

        /* internal */
        ACTION storeexprate(asset src, symbol dest_symbol);

        /* internal */
        ACTION trade1(trade_info info);

        /* internal */
        ACTION trade2(name reserve, trade_info info, asset src, asset dest, asset balance_pre);

        void transfer(name from, name to, asset quantity, string memo);

    private:
        void trade(name from, name to, asset src, string memo, state &current_state);

        void search_best_rate(reservespert &token_entry, asset src);

        void get_best_rate_results(asset src, symbol dest_symbol, double &rate, name &reserve);

        void reentrancy_check(bool enter);

        void parse_memo(string memo, trade_info &info);

        trade_info create_trade_info(string memo, name from, asset src, name _code);
};
