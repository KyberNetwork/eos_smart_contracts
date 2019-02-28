#pragma once

#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include "../Common/common.hpp"

using namespace eosio;

#define MAX_RESERVES_PER_TOKEN  5
#define NOT_FOUND              -1

struct trade_info_struct {
    name        trader;
    name        src_contract;
    asset       src;
    name        dest_contract;
    asset       dest;
    name        dest_account;
    double      min_conversion_rate;
};

CONTRACT Network : public contract {

    public:
        using contract::contract;

        TABLE state_t {
            name        owner;
            name        eos_contract;
            bool        is_enabled;
            EOSLIB_SERIALIZE(state_t, (owner)(eos_contract)(is_enabled))
        };

        TABLE reserve_t {
            name        contract;
            uint64_t    primary_key() const { return contract.value; }
            EOSLIB_SERIALIZE(reserve_t, (contract))
        };

        TABLE reservespert_t {
            symbol          symbol;
            name            token_contract;
            vector<name>    reserve_contracts;
            uint8_t         num_reserves;
            uint64_t        primary_key() const { return symbol.raw(); }
            EOSLIB_SERIALIZE(reservespert_t, (symbol)(token_contract)(reserve_contracts)(num_reserves))
        };

        typedef eosio::singleton<"state"_n, state_t> state_type;
        typedef eosio::multi_index<"state"_n, state_t> dummy_state_for_abi; /* hack until abi generator generates correct name */
        typedef eosio::multi_index<"reserve"_n, reserve_t> reserves_type;
        typedef eosio::multi_index<"reservespert"_n, reservespert_t> reservespert_type;

        ACTION init(name owner, name eos_contract, bool enable);

        ACTION setenable(bool enable);

        ACTION addreserve(name reserve, bool add);

        ACTION listpairres(name reserve,
                           symbol token_symbol,
                           name token_contract,
                           bool add);

        ACTION trade1(trade_info_struct trade_info);

        ACTION trade2(name reserve,
                      trade_info_struct trade_info,
                      asset actual_src,
                      asset actual_dest,
                      asset dest_before_trade);

        ACTION withdraw(name to, asset quantity, name dest_contract);

        void transfer(name from, name to, asset quantity, string memo);

    private:
        void trade0(name from, name to, asset quantity, string memo, state_t &current_state);

        void calc_actuals(trade_info_struct &trade_info,
                          double rate_result,
                          uint64_t rate_result_dest_amount,
                          asset &actual_src,
                          asset &actual_dest);

        int find_reserve(vector<name> reserve_list,
                         uint8_t num_reserves,
                         name reserve);

        trade_info_struct parse_memo(string memo, symbol &dest_symbol);
};
