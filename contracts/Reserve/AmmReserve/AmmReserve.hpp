#pragma once

#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/singleton.hpp>
#include "../../Common/common.hpp"

CONTRACT AmmReserve : public contract {

    public:
        using contract::contract;

        TABLE state_t {
            name        owner;
            name        network_contract;
            symbol      token_symbol;
            name        token_contract;
            name        eos_contract;
            bool        trade_enabled;
            asset       collected_fees_in_tokens;
        };

        TABLE params_t {
            double      r;
            double      p_min;
            asset       max_eos_cap_buy;
            asset       max_eos_cap_sell;
            double      fee_percent;
            double      max_buy_rate;
            double      min_buy_rate;
            double      max_sell_rate;
            double      min_sell_rate;
        };

        /* TODO: the following is duplicated with common.hpp, see if can remove from here. */
        TABLE rate_t {
            double      stored_rate;
            asset       dest;
        };

        typedef eosio::singleton<"state"_n, state_t> state_type;
        typedef eosio::multi_index<"state"_n, state_t> dummy_state_for_abi; /* hack until abi generator generates correct name */
        typedef eosio::singleton<"params"_n, params_t> params_type;
        typedef eosio::multi_index<"params"_n, params_t> dummy_params_for_abi; /* hack until abi generator generates correct name */
        typedef eosio::singleton<"rate"_n, rate_t> rate_type;
        typedef eosio::multi_index<"rate"_n, rate_t> dummy_rate_for_abi; /* hack until abi generator generates correct name */

        ACTION init(name    owner,
                    name    network_contract,
                    symbol  token_symbol,
                    name    token_contract,
                    name    eos_contract,
                    bool    enable_trade);

         ACTION setparams(double r,
                          double p_min,
                          asset  max_eos_cap_buy,
                          asset  max_eos_cap_sell,
                          double fee_percent,
                          double max_sell_rate,
                          double min_sell_rate);

        ACTION setowner(name new_owner);

        ACTION setnetwork(name network_contract);

        ACTION setenable(bool enable);

        ACTION resetfee();

        ACTION getconvrate(asset src);

        ACTION withdraw(name to, asset quantity, name dest_contract);

        void transfer(name from, name to, asset quantity, string memo);

    private:

        double reserve_get_conv_rate(asset src, asset &dest);

        void trade(name from, asset src, string memo, name code, state_t &current_state);

        void record_fees(const struct params_t &params, asset token, bool buy);
};

