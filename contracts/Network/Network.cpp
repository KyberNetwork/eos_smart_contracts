#include "Network.hpp"
#include <math.h>

ACTION Network::init(name admin, name eos_contract, name listener, bool enable) {
    eosio_assert(is_account(admin), "admin account does not exist");
    eosio_assert(is_account(eos_contract), "eos contract does not exist");

    require_auth(_self);

    state_type state_inst(_self, _self.value);
    eosio_assert(!state_inst.exists(), "init already called");

    state new_state = {admin, eos_contract, listener, enable, false};
    state_inst.set(new_state, _self);
}

ACTION Network::setadmin(name admin) {
    eosio_assert(is_account(admin), "new admin account does not exist");

    auto state_inst = get_state_assert_admin();

    auto s = state_inst.get();
    s.admin = admin;
    state_inst.set(s, _self);
}

ACTION Network::setenable(bool enable) {
    auto state_inst = get_state_assert_admin();

    auto s = state_inst.get();
    s.enabled = enable;
    state_inst.set(s, _self);
}

ACTION Network::setlistener(name listener) {
    auto state_inst = get_state_assert_admin();

    auto s = state_inst.get();
    s.listener = listener;
    state_inst.set(s, _self);
}

ACTION Network::addreserve(name reserve, bool add) {
    eosio_assert(is_account(reserve), "reserve account does not exist");

    get_state_assert_admin();

    reserves_type reserves_inst(_self, _self.value);
    auto itr = reserves_inst.find(reserve.value);
    bool exists = (itr != reserves_inst.end());
    eosio_assert(((add && !exists) || (!add && exists)),
                 "can only add a non existing reserve or delete an existing one");
    if (add) {
        reserves_inst.emplace(_self, [&](auto& s) {
            s.contract = reserve;
        });
    } else {
        reserves_inst.erase(itr);
    }
}

ACTION Network::listpairres(name reserve, symbol token_symbol, name token_contract, bool add) {
    eosio_assert(is_account(token_contract), "token contract does not exist");

    get_state_assert_admin();

    reserves_type reserves_inst(_self, _self.value);
    eosio_assert(reserves_inst.find(reserve.value) != reserves_inst.end(), "invalid reserve");

    reservespert_type reservespert_table_inst(_self, _self.value);
    auto itr = reservespert_table_inst.find(token_symbol.raw());
    auto token_exists = (itr != reservespert_table_inst.end());

    if (add) {
        if (!token_exists) {
            reservespert_table_inst.emplace(_self, [&](auto& s) {
               s.symbol = token_symbol;
               s.token_contract = token_contract;
               s.reserve_contracts.push_back(reserve);
            });
        } else {
            reservespert_table_inst.modify(itr, _self, [&](auto& s) {
                auto res_it = find(s.reserve_contracts.begin(), s.reserve_contracts.end(), reserve);
                if (res_it == s.reserve_contracts.end()) {
                    s.reserve_contracts.push_back(reserve);
                }
            });
        }
    } else if (token_exists) {
        bool last_reserve_for_token = false;
        reservespert_table_inst.modify(itr, _self, [&](auto& s) {
            auto res_it = find(s.reserve_contracts.begin(), s.reserve_contracts.end(), reserve);
            if (res_it != s.reserve_contracts.end()) {
                s.reserve_contracts.erase(res_it);
            }
            if (!s.reserve_contracts.size()) {
                last_reserve_for_token = true;
            }
        });
        if (last_reserve_for_token) {
            reservespert_table_inst.erase(itr);
        }
    }

    /* Note: token stats entries are never deleted, so we can continue count on re-list. */
    if (add && !token_exists) {
        tokenstats_type tokenstats_table_inst(_self, _self.value);
        if (tokenstats_table_inst.find(token_symbol.raw()) == tokenstats_table_inst.end()) {
            tokenstats_table_inst.emplace(_self, [&](auto& s) {
               s.token_counter = asset(0, token_symbol);
               s.eos_counter = asset(0, EOS_SYMBOL);
            });
        }
    }
}

ACTION Network::withdraw(name to, asset quantity, name dest_contract, string memo) {
    eosio_assert(is_account(to), "to account does not exist");
    eosio_assert(is_account(dest_contract), "dest contract does not exist");
    eosio_assert(to != _self, "can not witdraw to self");
    eosio_assert(quantity.amount > 0, "illegal quantity");

    get_state_assert_admin();

    async_pay(_self, to, quantity, dest_contract, memo);
}

ACTION Network::getexprate(asset src, symbol dest_symbol) {
    eosio_assert(src.is_valid(), "invalid transfer");
    eosio_assert(src.amount >= 0, "src amount can not be negative");

    eosio_assert(src.symbol == EOS_SYMBOL || dest_symbol == EOS_SYMBOL, "src or dest must be EOS");
    eosio_assert(src.symbol != dest_symbol, "src symbol can not equal dest symbol");

    reservespert_type reservespert_table_inst(_self, _self.value);
    auto token_symbol = (src.symbol == EOS_SYMBOL) ? dest_symbol: src.symbol;
    auto token_entry = reservespert_table_inst.get(token_symbol.raw(), "unlisted token");

    async_search_best_rate(token_entry, src);
    SEND_INLINE_ACTION(*this, storeexprate, {_self, "active"_n}, {src, dest_symbol});
}

ACTION Network::storeexprate(asset src, symbol dest_symbol) {
    require_auth(_self);  // can only be called internally

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    double best_rate;
    name best_reserve;
    get_best_rate_results(src, dest_symbol, best_rate, best_reserve);

    asset dest = calc_dest(best_rate, src, dest_symbol);

    rate_type rate_inst(_self, _self.value);
    rate_inst.set({best_rate, dest}, _self);
}

void Network::trade(name from, name to, asset src, string memo, state &state) {
    reentrancy_check(true);

    eosio_assert(state.enabled, "trade not enabled");
    eosio_assert(memo.length() > 0, "needs a memo");

    /* gather all inputs together, non of them is trusted yet. */
    bool buy = (src.symbol == EOS_SYMBOL);
    auto info = create_trade_info(memo, from, src, _code);

    /* validate inputs. */
    eosio_assert(info.src.is_valid(), "invalid transfer");
    eosio_assert(info.src.amount > 0, "src must be positive");

    eosio_assert(info.src.symbol == EOS_SYMBOL || info.dest.symbol == EOS_SYMBOL, "no eos side");
    eosio_assert(info.src.symbol != info.dest.symbol, "src symbol can not equal dest symbol");

    auto token_symbol = buy ? info.dest.symbol: info.src.symbol;
    reservespert_type reservespert_table_inst(_self, _self.value);
    auto token_entry = reservespert_table_inst.get(token_symbol.raw(), "unlisted token");

    /* note: this is the check against _code, to prevent fake src token attacks. */
    name expected_src_contract = buy ? state.eos_contract : token_entry.token_contract;
    eosio_assert(info.src_contract == expected_src_contract, "unexpected src contract.");

    name expected_dest_contract = buy ? token_entry.token_contract : state.eos_contract;
    eosio_assert(info.dest_contract == expected_dest_contract, "unexpected dest contract.");

    async_search_best_rate(token_entry, info.src);
    SEND_INLINE_ACTION(*this, trade1, {_self, "active"_n}, {info});
}

ACTION Network::trade1(trade_info info) {
    require_auth(_self);  // can only be called internally

    double best_rate;
    name best_reserve;
    get_best_rate_results(info.src, info.dest.symbol, best_rate, best_reserve);
    eosio_assert(best_rate != 0, "got 0 rate.");
    eosio_assert(best_rate >= info.min_conversion_rate, "rate < min conversion rate.");
    eosio_assert(best_rate <= MAX_RATE, "rate > max rate.");

    asset dest = calc_dest(best_rate, info.src, info.dest.symbol);

    asset balance_pre = get_balance(info.sender, info.dest_contract, info.dest.symbol);

    /* do reserve trade */
    async_pay(_self, best_reserve, info.src, info.src_contract, (name{info.sender}).to_string());

    SEND_INLINE_ACTION(*this, trade2, {_self, "active"_n},
                       {best_reserve, info, info.src, dest, balance_pre});
}

ACTION Network::trade2(name reserve, trade_info info, asset src, asset dest, asset balance_pre) {
    require_auth(_self);  // can only be called internally

    /* verify dest balance was indeed added to dest account */
    auto balance_post = get_balance(info.sender, info.dest_contract, info.dest.symbol);
    eosio_assert(balance_post > balance_pre, "post balance not bigger than pre balance.");
    asset balance_diff = balance_post - balance_pre;
    eosio_assert(balance_diff >= dest, "trade dest amount not added.");

    /* update token stats */
    bool buy = (src.symbol == EOS_SYMBOL);
    asset eos = buy ? src : dest;
    asset token = buy ? dest : src;

    tokenstats_type tokenstats_table_inst(_self, _self.value);
    auto itr = tokenstats_table_inst.find(token.symbol.raw());
    tokenstats_table_inst.modify(itr, _self, [&](auto& s) {
        s.token_counter += token;
        s.eos_counter += eos;
    });

    state_type state_inst(_self, _self.value);
    name listener = state_inst.get().listener;
    if ((listener != name()) && (listener != "eosio"_n)) {
        action {permission_level{_self, "active"_n},
                listener,
                "posttrade"_n,
                make_tuple(src, dest, reserve, info.sender)}.send();
    }

    SEND_INLINE_ACTION(*this, trade3, {_self, "active"_n}, {});
}

ACTION Network::trade3() {
    require_auth(_self);  // can only be called internally
    reentrancy_check(false);
} /* end of trade process */

void Network::async_search_best_rate(reservespert &token_entry, asset src) {
    for (int i = 0; i < token_entry.reserve_contracts.size(); i++) {
        auto reserve = token_entry.reserve_contracts[i];
        action {permission_level{_self, "active"_n},
                reserve,
                "getconvrate"_n,
                make_tuple(src)}.send();
    }
}

void Network::get_best_rate_results(asset src, symbol dest_symbol, double &rate, name &reserve) {
    /* read stored rates from all reserves that hold the pair and decide on the best one */
    reservespert_type reservespert_table_inst(_self, _self.value);
    symbol token_symbol = (src.symbol == EOS_SYMBOL) ? dest_symbol : src.symbol;
    auto reservespert_entry = reservespert_table_inst.get(token_symbol.raw());

    rate = 0;
    for (int i = 0; i < reservespert_entry.reserve_contracts.size(); i++) {
        auto current_reserve = reservespert_entry.reserve_contracts[i];
        auto current_rate_entry = rate_type(current_reserve, current_reserve.value).get();

        if (current_rate_entry.stored_rate > rate) {
            reserve = current_reserve;
            rate = current_rate_entry.stored_rate;
        }
    }
}

void Network::reentrancy_check(bool enter) {
    state_type state_inst(_self, _self.value);
    auto s = state_inst.get();
    eosio_assert(((!s.during_trade && enter) || (s.during_trade && !enter)),
                  "re-entrancy during a trade");
    s.during_trade = enter;
    state_inst.set(s, _self);
}

Network::state_type Network::get_state_assert_admin() {
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().admin);
    return state_inst;
}

void Network::parse_memo(string memo, trade_info &res) {
    auto parts = split(memo, ",");
    eosio_assert(parts.size() == EXPECTED_MEMO_LENGTH, "wrong memo length");

    auto sym_parts = split(parts[0], " ");
    eosio_assert(sym_parts.size() == EXPECTED_SYMBOL_PARTS, "wrong num of symbol parts");
    res.dest = asset(0, symbol(sym_parts[1].c_str(), stoi(sym_parts[0].c_str())));

    res.dest_contract = name(parts[1].c_str());
    res.min_conversion_rate = stof(parts[2].c_str());
}

trade_info Network::create_trade_info(string memo, name from, asset src, name src_contract) {
    auto res = trade_info();
    res.sender = from;
    res.src = src;
    res.src_contract = src_contract;

    parse_memo(memo, res);
    return res;
}

void Network::transfer(name from, name to, asset quantity, string memo) {
    if (to != _self) return;

    state_type state_inst(_self, _self.value);
    if (!state_inst.exists()) {
        /* if init not called yet don't trade, instead allow anyone to deposit. */
        return;
    }

    auto state = state_inst.get();
    if (from == state.admin) {
        /* admin can deposit funds, but not trade */
        return;
    } else {
        /* this is a trade */
        trade(from, to, quantity, memo, state);
        return;
    }
    eosio_assert(false, "unreachable code");
}

extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
        if (action == "transfer"_n.value && code != receiver) {
            eosio::execute_action(eosio::name(receiver), eosio::name(code), &Network::transfer);
        } else if (code == receiver) {
            switch (action) {
                EOSIO_DISPATCH_HELPER( Network, (init)(setadmin)(setenable)(setlistener)(addreserve)
                                                (listpairres)(withdraw)(trade1)(trade2)(trade3)
                                                (getexprate)(storeexprate))
            }
        }
        eosio_exit(0);
    }
}
