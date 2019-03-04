#include "Network.hpp"
#include <math.h>

ACTION Network::init(name owner, name eos_contract, bool enable) {
    eosio_assert(is_account(owner), "owner account does not exist");
    eosio_assert(is_account(eos_contract), "eos contract does not exist");

    require_auth(_self);

    state_type state_inst(_self, _self.value);
    eosio_assert(!state_inst.exists(), "init already called");

    state_t new_state = {owner, eos_contract, enable, false, 0};
    state_inst.set(new_state, _self);
}

ACTION Network::setowner(name owner) {
    eosio_assert(is_account(owner), "new owner account does not exist");

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    auto s = state_inst.get();
    require_auth(s.owner);

    s.owner = owner;
    state_inst.set(s, _self);
}

ACTION Network::setenable(bool enable) {
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    auto s = state_inst.get();
    require_auth(s.owner);

    s.enabled = enable;
    state_inst.set(s, _self);
}

ACTION Network::addreserve(name reserve, bool add) {
    eosio_assert(is_account(reserve), "reserve account does not exist");

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().owner);

    reserves_type reserves_inst(_self, _self.value);
    auto itr = reserves_inst.find(reserve.value);
    bool exists = (itr != reserves_inst.end());
    eosio_assert(add != exists, "can only add a non existing reserve or delete an existing one");
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

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().owner);

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
               s.reset_time = time_point_sec(now());
            });
        }
    }
}

ACTION Network::withdraw(name to, asset quantity, name dest_contract) {
    eosio_assert(is_account(to), "to account does not exist");
    eosio_assert(is_account(dest_contract), "dest contract does not exist");

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().owner);

    trans(_self, to, quantity, dest_contract, "");
}

ACTION Network::getexprate(asset src, symbol dest_symbol) {
    eosio_assert(src.is_valid(), "invalid transfer");
    eosio_assert(src.amount > 0, "src amount must be positive");

    eosio_assert(src.symbol == EOS_SYMBOL || dest_symbol == EOS_SYMBOL, "src or dest must be EOS");
    eosio_assert(src.symbol != dest_symbol, "src symbol can not equal dest symbol");

    reservespert_type reservespert_table_inst(_self, _self.value);
    auto token_symbol = (src.symbol == EOS_SYMBOL) ? dest_symbol: src.symbol;
    auto token_entry = reservespert_table_inst.get(token_symbol.raw(), "unlisted token");

    search_best_rate(token_entry, src);
    SEND_INLINE_ACTION(*this, storeexprate, {_self, "active"_n}, {src, dest_symbol});
}

ACTION Network::storeexprate(asset src, symbol dest_symbol) {
    require_auth(_self);  // can only be called internally

    double best_rate = 0;
    name best_reserve;
    get_best_rate_results(src, dest_symbol, best_rate, best_reserve);

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    auto s = state_inst.get();
    s.expected_rate = best_rate;
    state_inst.set(s, _self);
}

void Network::trade(name from, name to, asset src, string memo, state_t &state) {
    reentrancy_check(true);

    eosio_assert(state.enabled, "trade not enabled");
    eosio_assert(memo.length() > 0, "needs a memo");
    eosio_assert(src.is_valid(), "invalid transfer");
    eosio_assert(src.amount > 0, "src must be positive");

    symbol dest_symbol;
    auto info = parse_memo(memo, dest_symbol);
    eosio_assert(info.receiver != _self, "receiver can not be network contract");

    eosio_assert(src.symbol == EOS_SYMBOL || dest_symbol == EOS_SYMBOL, "src or dest must be EOS");
    eosio_assert(src.symbol != dest_symbol, "src symbol can not equal dest symbol");

    bool buy = (src.symbol == EOS_SYMBOL);
    auto token_symbol = buy ? dest_symbol: src.symbol;

    reservespert_type reservespert_table_inst(_self, _self.value);
    auto token_entry = reservespert_table_inst.get(token_symbol.raw(), "unlisted token");

    info.src_contract = buy ? state.eos_contract : token_entry.token_contract;
    eosio_assert(_code == info.src_contract, "_code does not match registered eos/token contract.");

    info.sender = from;
    info.src = src;
    info.dest = asset(0, buy ? token_symbol : EOS_SYMBOL);
    info.dest_contract = buy ? token_entry.token_contract : state.eos_contract;

    search_best_rate(token_entry, info.src);
    SEND_INLINE_ACTION(*this, trade1, {_self, "active"_n}, {info});
}

ACTION Network::trade1(trade_info info) {
    require_auth(_self);  // can only be called internally

    double best_rate = 0;
    name best_reserve;
    get_best_rate_results(info.src, info.dest.symbol, best_rate, best_reserve);
    eosio_assert(best_rate != 0, "got 0 rate.");
    eosio_assert(best_rate >= info.min_conversion_rate, "rate < min conversion rate.");

    asset dest;
    calc_dest(best_rate, info.src, info.dest.symbol, dest);

    asset balance_pre = get_balance(info.receiver, info.dest_contract, info.dest.symbol);

    /* do reserve trade */
    trans(_self, best_reserve, info.src, info.src_contract, (name{info.receiver}).to_string());

    SEND_INLINE_ACTION(*this, trade2, {_self, "active"_n},
                       {best_reserve, info, info.src, dest, balance_pre});
}

ACTION Network::trade2(name reserve, trade_info info, asset src, asset dest, asset balance_pre) {
    require_auth(_self);  // can only be called internally

    /* verify dest balance was indeed added to dest account */
    auto balance_post = get_balance(info.receiver, info.dest_contract, info.dest.symbol);
    asset balance_diff = balance_post - balance_pre;
    eosio_assert(balance_diff == dest, "trade amount not added to receiver");

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

    reentrancy_check(false);
} /* end of trade process */

void Network::search_best_rate(reservespert_t &token_entry, asset src) {
    /* get rates from all reserves that hold the pair */
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
    eosio_assert(s.during_trade != enter, "re-entrancy during a trade");
    s.during_trade = enter;
    state_inst.set(s, _self);
}

trade_info Network::parse_memo(string memo, symbol &dest_symbol) {
    auto res = trade_info();
    auto parts = split(memo, ",");

    auto sym_parts = split(parts[0], " ");
    dest_symbol = symbol(sym_parts[1].c_str(), stoi(sym_parts[0].c_str()));

    res.receiver = name(parts[1].c_str());
    res.min_conversion_rate = stof(parts[2].c_str());
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
    if (from == state.owner) {
        /* owner can deposit funds, but not trade */
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
                EOSIO_DISPATCH_HELPER( Network, (init)(setowner)(setenable)(addreserve)(listpairres)
                                                (withdraw)(trade1)(trade2)(getexprate)
                                                (storeexprate))
            }
        }
        eosio_exit(0);
    }
}
