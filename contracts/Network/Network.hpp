#pragma once

#include <vector>
#include <string>
#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/time.hpp>
#include "../Common/common.hpp"

#define EXPECTED_MEMO_LENGTH 3
#define EXPECTED_SYMBOL_PARTS 2

using namespace eosio;

struct trade_info {
    name        sender;
    name        src_contract;
    asset       src;
    name        dest_contract;
    asset       dest;
    double      min_conversion_rate;
};

CONTRACT Network : public contract {
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

        /**
         * Init the contract.
         * Should be called right after deploying the contract.
         * Can only be called once, and only by the network account authority (owner).
         *
         * @param admin - the only account that can deposit/withdraw tokens,
         * and configure the network contract.
         * @param eos_contract - account of EOS native token, usually eosio.token.
         * @param listener - listener contract to call hooks.
         * @param enable - whether to initiate the network in an operating state,
         * or otherwise wait for a setenable operation.
         */
        ACTION init(name admin, name eos_contract, name listener, bool enable);

        /**
         * Change the admin account.
         * Can only be called by the admin.
         *
         * @param admin - the new admin account.
         */
        ACTION setadmin(name admin);

        /**
         * Enable or disable the network.
         * Can only be called by the admin.
         *
         * @param enable - enable or disable.
         */
        ACTION setenable(bool enable);

        /**
         * Set listener contract to process hooks.
         * Can be used for various tasks such as promotions, traffic calculations, fee burning.
         * Can only be called by the admin.
         *
         * @param listener - listener contract.
         */
        ACTION setlistener(name listener);

        /**
         * Add/Remove a reserve to/from the network.
         * Can only be called by the admin.
         *
         * @param reserve - account of the reserve contract.
         * @param add - add or remove.
         */
        ACTION addreserve(name reserve, bool add);

        /**
        * List/Unlist a trade pair on the network.
        * Can only be called by the admin.
        *
        * @param reserve - account of the reserve where the pair is added/removed to/from.
        * @param token_symbol - symbol of the added/removed token, which will be paired with EOS.
        * @param token_contract - account contract implementing the added/removed token.
        * @param add - add or remove the pair.
        */
        ACTION listpairres(name reserve, symbol token_symbol, name token_contract, bool add);

        /**
         * Withdraw funds from the network account. Can only be called by the admin.
         *
         * @param to - account to withdraw to.
         * @param quantity - asset to withdraw.
         * @param dest_contract - account implementing the withdrawn token.
         * @param memo - optional memo to be added to the end withdraw transfer operation.
         */
        ACTION withdraw(name to, asset quantity, name dest_contract, string memo);

        /**
         * Get expected rate for a specific pair.
         * Result is written to the “rate” table.
         * Should only be used for on chain integration.
         * Only in such on-chain contracts integration the table can be read in atomic manner.
         *
         * @param src - src asset in the pair to query rate for.
         * @param dest_symbol - destination token symbol for the rate query.
         */
        ACTION getexprate(asset src, symbol dest_symbol);

        /*
         * The following functions are internal actions.
         * They are purposed to only be called internally by the network contract.
         * We implement these as separate actions (and not regular functions/logic),
         * since when calling a preceding action, the only way to assure their logic
         * would happen after that action is to make them a separate action on their own.
         */

        /** internal */
        ACTION storeexprate(asset src, symbol dest_symbol);

        /** internal */
        ACTION trade1(trade_info info);

        /** internal */
        ACTION trade2(name reserve, trade_info info, asset src, asset dest, asset balance_pre);

        /** internal */
        ACTION trade3();

        /**
         * Notification handler for transfer events from/to this contract.
         * Before init() is called anyone can deposit to the contract.
         * After init() is called only the admin can deposit.
         * At that stage any other transfer to the contract is regarded as a trade attempt,
         * and expected to have a valid memo for a trade.
         * Note that the memo's min conversion rate parameter is the way for
         * the user to ensure that the actual rate for the trade is not less
         * than what he expects.
         *
         * @param from - sender.
         * @param to - recipient, this contract.
         * @param quantity - sent asset.
         * @param memo - Expected as “<dest symbol>,<dest contract>,<min conversion rate>”
         * For example: "4 KARMA,therealkarma,7200.0000"
         */
        void transfer(name from, name to, asset quantity, string memo);

    private:
        void trade(name from, name to, asset src, string memo, state &current_state);

        void async_search_best_rate(reservespert &token_entry, asset src);

        void get_best_rate_results(asset src, symbol dest_symbol, double &rate, name &reserve);

        void reentrancy_check(bool enter);

        state_type get_state_assert_admin();

        void parse_memo(string memo, trade_info &info);

        trade_info create_trade_info(string memo, name from, asset src, name _code);
};
