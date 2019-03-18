#pragma once

#include <string>
#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/singleton.hpp>
#include "../../Common/common.hpp"

CONTRACT AmmReserve : public contract {
    public:
        using contract::contract;

        TABLE state {
            name        owner;
            name        network_contract;
            symbol      token_symbol;
            name        token_contract;
            name        eos_contract;
            bool        trade_enabled;
            asset       collected_fees_in_tokens;
        };

        TABLE params {
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

        TABLE rate {
            double      stored_rate;
            asset       dest;
        };

        typedef eosio::singleton<"state"_n, state> state_type;
        typedef eosio::singleton<"params"_n, params> params_type;
        typedef eosio::singleton<"rate"_n, rate> rate_type;

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

        ACTION setowner(name owner);

        ACTION setnetwork(name network_contract);

        ACTION setenable(bool enable);

        ACTION resetfee();

        ACTION getconvrate(asset src);

        ACTION withdraw(name to, asset quantity, name dest_contract);

        void transfer(name from, name to, asset quantity, string memo);

    private:
        double reserve_get_conv_rate(asset src, asset &dest);

        void trade(name from, asset src, string memo, name code, state &state);

        void record_fees(const struct params &params, asset token, bool buy);
};

