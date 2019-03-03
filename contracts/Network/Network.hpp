#pragma once

#include <vector>
#include <string>
#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
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

        TABLE state_t {
            name        owner;
            name        eos_contract;
            bool        enabled;
            bool        during_trade;
            double      expected_rate;
        };

        TABLE reserve_t {
            name        contract;
            uint64_t    primary_key() const { return contract.value; }
        };

        TABLE reservespert_t {
            symbol          symbol;
            name            token_contract;
            vector<name>    reserve_contracts;
            uint64_t        primary_key() const { return symbol.raw(); }
        };

        typedef eosio::singleton<"state"_n, state_t> state_type;
        typedef eosio::multi_index<"state"_n, state_t> dummy_state_for_abi;
        typedef eosio::multi_index<"reserve"_n, reserve_t> reserves_type;
        typedef eosio::multi_index<"reservespert"_n, reservespert_t> reservespert_type;

        ACTION init(name owner, name eos_contract, bool enable);

        ACTION setowner(name new_owner);

        ACTION setenable(bool enable);

        ACTION addreserve(name reserve, bool add);

        ACTION listpairres(name reserve, symbol token_symbol, name token_contract, bool add);

        ACTION trade1(trade_info info);

        ACTION trade2(name reserve, trade_info info, asset src, asset dest, asset balance_pre);

        ACTION withdraw(name to, asset quantity, name dest_contract);

        ACTION getexprate(asset src, symbol dest_symbol);

        ACTION storeexprate(asset src, symbol dest_symbol);

        void transfer(name from, name to, asset quantity, string memo);

    private:
        void trade0(name from, name to, asset src, string memo, state_t &current_state);

        void search_best_rate(reservespert_t &token_entry, asset src);

        void get_best_rate_results(asset src, symbol dest_symbol, double &rate, name &reserve);

        void reentrancy_check(bool enter);

        trade_info parse_memo(string memo, symbol &dest_symbol);
};
