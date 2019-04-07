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

        /**
         * Init the reserve.
         * Should be called right after deploying the contract.
         * Can only be called once, and only by the reserve account authority.
         *
         * @param admin - the only account that can deposit/withdraw tokens,
         * and configure the reserve contract.
         * @param network_contract - contract of the network the reserve is listed on.
         * Only the network contract is allowed to trade through the reserve.
         * @param token_symbol - the symbol of the token traded on the reserve.
         * @param token_contract - the contract implementing the token traded on the reserve.
         * @param eos_contract - account of eos native token, usually eosio.token.
         * @param enable_trade - whether to initiate the reserve in an operating state,
         * or otherwise wait for a setenable operation.
         */
        ACTION init(name    admin,
                    name    network_contract,
                    symbol  token_symbol,
                    name    token_contract,
                    name    eos_contract,
                    bool    enable_trade);

        /**
         * Set reserve parameters quickly, using default values.
         * Can only be called by the reserve admin.
         * Liquidity rate (r) will be auto calculated according to the contract’s EOS amount.
         * Supported price movements will be half to twice of the initial price.
         * No cap restrictions per single trade will be enforced.
         * Profit percent will be set to 0.
         *
         * @param p - initial token to EOS sell price.
         */
        ACTION quickset(double p);

        /**
        * Set reserve parameters.
        * Can only be called by the reserve admin.
        *
        * @param r - liquidity rate.
        * @param p_min - minimum supported price, in token sell convention.
        * @param max_eos_cap_buy - maximum single buy amount in EOS units.
        * @param max_eos_cap_sell - maximum single sell amount in EOS units.
        * @param profit_percent - percent of reserve tokens profit per trade.
        * @param ram_fee - eos fee per eos->token trade, purposed to cover transfer ram expenses.
        * @param max_sell_rate - maximum rate allowed, in token sell convention.
        * @param min_sell_rate - minimum rate allowed, in token sell convention.
        * @param fee_wallet - account to send profit and fee to.
        */
        ACTION setparams(double r,
                         double p_min,
                         asset  max_eos_cap_buy,
                         asset  max_eos_cap_sell,
                         double profit_percent,
                         double ram_fee,
                         double max_sell_rate,
                         double min_sell_rate,
                         name   fee_wallet);

        /**
         * Change the admin account.
         * Can only be called by the reserve admin.
         *
         * @param admin - the new admin account.
         */
        ACTION setadmin(name admin);

        /**
         * Change the registered network contract.
         * Can only be called by the reserve admin.
         * Only the registered network account can send trades to the reserve.
         *
         * @param network_contract - the new network contract.
         */
        ACTION setnetwork(name network_contract);

        /**
         * Enable or disable the reserve.
         * Can only be called by the reserve admin.
         * When disabled, both trade and get conversion rate are disabled.
         *
         * @param enable - enable or disable.
         */
        ACTION setenable(bool enable);

        /**
         * Get conversion rate.
         * Can only be called by the network contract, as registered in the reserve.
         * Result will be written to the trade table.
         *
         * @param src - src asset for the rate query. Can be either EOS or the reserve’s token.
         */
        ACTION getconvrate(asset src);

        /* Withdraw funds from the reserve account.
         * Can only be called by the reserve admin.
         *
         * @param to - account to withdraw to.
         * @param quantity - asset to withdraw.
         * @param dest_contract - account implementing the withdrawn token.
         * @param memo - optional memo to be added to the withdraw end transfer operation.
         */
        ACTION withdraw(name to, asset quantity, name dest_contract, string memo);

        /* Notification handler for transfer events from/to this contract.
         * Before init() is called anyone can deposit to the contract.
         * After init() is called only the contract admin can deposit.
         * Any other transfer to the contract is regarded as a trade attempt.
         * A trade is expected to come from the network account and have a valid memo.
         *
         * @param name - sender.
         * @param to - recipient, this contract.
         * @quantity - sent asset
         * @memo - for trades expected as “<dest account>”. For example: "bob111111111".
         */
        void transfer(name from, name to, asset quantity, string memo);

    private:
        double reserve_get_conv_rate(asset src,
                                     bool subtract_src,
                                     asset &dest,
                                     double &charged_fee);

        void trade(name from, asset src, string memo, name code, state &state);

        state_type get_state_assert_admin();
};

