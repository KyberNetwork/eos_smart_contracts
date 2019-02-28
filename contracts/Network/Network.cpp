#include "./Network.hpp"
#include <math.h>

ACTION Network::init(name owner, name eos_contract, bool enable) {
    eosio_assert(is_account(owner), "owner account does not exist");
    eosio_assert(is_account(eos_contract), "eos contract account does not exist")

    require_auth(_self);

    state_type state_inst(_self, _self.value);
    eosio_assert(!state_inst.exists(), "init already called");

    state_t new_state;
    new_state.owner = owner;
    new_state.eos_contract = eos_contract;
    new_state.is_enabled = enable;
    state_inst.set(new_state, _self);
}

ACTION Network::setowner(name new_owner) {
    eosio_assert(is_account(new_owner), "new owner account does not exist");

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    auto s = state_inst.get();
    require_auth(s.owner);

    s.owner = new_owner;
    state_inst.set(s, _self);
}

ACTION Network::setenable(bool enable) {
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    auto s = state_inst.get();
    require_auth(s.owner);

    s.is_enabled = enable;
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
        reserves_inst.emplace(_self, [&]( auto& s ) {
            s.contract = reserve;
        });
    } else {
        reserves_inst.erase(itr);
    }
}

ACTION Network::listpairres(name reserve,
                            symbol token_symbol,
                            name token_contract,
                            bool add
) {
    eosio_assert(is_account(token_contract), "token contract account does not exist");

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
            reservespert_table_inst.emplace(_self, [&]( auto& s ) {
               s.symbol = token_symbol;
               s.token_contract = token_contract;
               s.reserve_contracts = vector<name>(MAX_RESERVES_PER_TOKEN, name());
               s.reserve_contracts[0] = reserve;
               s.num_reserves = 1;
            });
        } else {
            reservespert_table_inst.modify(itr, _self, [&]( auto& s ) {
                if(find_reserve(s.reserve_contracts, s.num_reserves, reserve) == NOT_FOUND) {
                    /* reserve does not exist */
                    eosio_assert(s.num_reserves < MAX_RESERVES_PER_TOKEN,
                                 "reached number of reserves limit for this token ");
                    s.reserve_contracts[s.num_reserves] = reserve;
                    s.num_reserves++;
                }
            });
        }
    } else if (token_exists) {
        bool last_reserve_for_token = false;
        reservespert_table_inst.modify(itr, _self, [&]( auto& s ) {
            int reserve_index = find_reserve(s.reserve_contracts, s.num_reserves, reserve);
            if(reserve_index != NOT_FOUND) {
                /* reserve exist */
                s.reserve_contracts[reserve_index] = s.reserve_contracts[s.num_reserves-1];
                s.reserve_contracts[s.num_reserves-1] = name();
                s.num_reserves--;
            }
            if(s.num_reserves == 0) {
                last_reserve_for_token = true;
            }
        });
        if (last_reserve_for_token) {
            reservespert_table_inst.erase(itr);
        }
    }
}

ACTION Network::withdraw(name to, asset quantity, name dest_contract) {
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().owner);
    eosio_assert(is_account(dest_contract), "dest contract account does not exist");

    send(_self, to, quantity, dest_contract);
}

void Network::trade0(name from, name to, asset quantity, string memo, state_t &current_state) {
    eosio_assert(memo.length() > 0, "needs a memo with transaction details");
    eosio_assert(quantity.is_valid(), "invalid transfer");
    eosio_assert(quantity.amount > 0, "quantity must be positive in transfer");

    symbol dest_symbol;
    auto trade_info = parse_memo(memo, dest_symbol);
    eosio_assert(trade_info.dest_account != _self, "dest account can not be network contract");

    eosio_assert(quantity.symbol == EOS_SYMBOL || dest_symbol == EOS_SYMBOL, "either src or dest must be EOS");
    eosio_assert(quantity.symbol != dest_symbol, "src symbol can not equal dest symbol");

    bool buy = (quantity.symbol == EOS_SYMBOL);
    auto token_symbol = buy ? dest_symbol: quantity.symbol;

    reservespert_type reservespert_table_inst(_self, _self.value);
    auto token_entry = reservespert_table_inst.get(token_symbol.raw(), "unlisted token");

    trade_info.src_contract = buy ? current_state.eos_contract : token_entry.token_contract;
    eosio_assert(_code == trade_info.src_contract, "_code does not match registered eos/token contract.");

    trade_info.trader = from;
    trade_info.src = quantity;
    trade_info.dest = asset(0, buy ? token_symbol : EOS_SYMBOL);
    trade_info.dest_contract = buy ? token_entry.token_contract : current_state.eos_contract;

    /* get rates from all reserves that hold the pair */
    for (int i = 0; i < token_entry.num_reserves; i++) {
        auto reserve = token_entry.reserve_contracts[i];
        action {permission_level{_self, "active"_n}, reserve, "getconvrate"_n, make_tuple(trade_info.src)}.send();
    }

    SEND_INLINE_ACTION(*this, trade1, {_self, "active"_n}, {trade_info});
}

ACTION Network::trade1(trade_info_struct trade_info) {

    eosio_assert( _code == _self, "current action can only be called internally" );
    require_auth(_self);

    /* read stored rates from all reserves that hold the pair and decide on the best one */
    reservespert_type reservespert_table_inst(_self, _self.value);
    symbol token_symbol = (trade_info.src.symbol == EOS_SYMBOL) ? trade_info.dest.symbol : trade_info.src.symbol;
    auto reservespert_entry = reservespert_table_inst.get(token_symbol.raw());

    double best_rate = 0;
    name best_reserve = name();
    struct rate_t best_rate_entry = {0};
    for (int i = 0; i < reservespert_entry.num_reserves; i++) {
        auto reserve = reservespert_entry.reserve_contracts[i];
        auto rate_entry = rate_type(reserve, reserve.value).get();

        if(rate_entry.stored_rate > best_rate) {
            best_reserve = reservespert_entry.reserve_contracts[i];
            best_rate_entry = rate_entry;
        }
    }

    eosio_assert(best_rate_entry.stored_rate != 0,
                 "got 0 rate.");
    eosio_assert(best_rate_entry.stored_rate >= trade_info.min_conversion_rate,
                 "rate smaller than min conversion rate.");

    asset actual_src, actual_dest;
    calc_actuals(trade_info,
                 best_rate_entry.stored_rate,
                 best_rate_entry.dest_amount,
                 actual_src,
                 actual_dest);

    /* save dest balance to help verify later that dest amount was received. */
    asset dest_before_trade = get_balance(trade_info.dest_account,
                                          trade_info.dest_contract,
                                          trade_info.dest.symbol);

    /* since no suitable method to turn double into string we do not pass
     * conversion rate to reserve. Instead we assume that it's already stored there. */

    /* do reserve trade */
    action {
        permission_level{_self, "active"_n},
        trade_info.src_contract,
        "transfer"_n,
        make_tuple(_self,
                   best_reserve,
                   actual_src,
                   (name{trade_info.dest_account}).to_string())
    }.send();

    SEND_INLINE_ACTION(
        *this,
        trade2,
        {_self, "active"_n},
        {best_reserve, trade_info, actual_src, actual_dest, dest_before_trade}
    );
}

ACTION Network::trade2(name reserve,
                       trade_info_struct trade_info,
                       asset actual_src,
                       asset actual_dest,
                       asset dest_before_trade) {

    eosio_assert( _code == _self, "current action can only be called internally" );
    require_auth(_self);

    /* verify dest balance was indeed added to dest account */
    auto dest_after_trade = get_balance(trade_info.dest_account,
                                        trade_info.dest_contract,
                                        trade_info.dest.symbol);
    asset dest_difference = dest_after_trade - dest_before_trade;

    eosio_assert(dest_difference == actual_dest, "trade amount not added to dest");
} /* end of trade process */

void Network::calc_actuals(trade_info_struct &trade_info,
                           double rate_result,
                           uint64_t rate_result_dest_amount,
                           asset &actual_src,
                           asset &actual_dest) {
    uint64_t actual_dest_amount;
    uint64_t actual_src_amount;

    actual_dest_amount = rate_result_dest_amount;
    actual_src_amount = trade_info.src.amount;

    actual_src.amount = actual_src_amount;
    actual_src.symbol = trade_info.src.symbol;
    actual_dest.amount = actual_dest_amount;
    actual_dest.symbol = trade_info.dest.symbol;
}

int Network::find_reserve(vector<name> reserve_list, uint8_t num_reserves, name reserve) {
    for(int index = 0; index < num_reserves; index++) {
        if (reserve_list[index] == reserve) {
            return index;
        }
    }
    return NOT_FOUND;
}

trade_info_struct Network::parse_memo(string memo, symbol &dest_symbol) {
    auto res = trade_info_struct();
    auto parts = split(memo, ",");

    auto sym_parts = split(parts[0], " ");
    dest_symbol = symbol(sym_parts[1].c_str(), stoi(sym_parts[0].c_str()));

    res.dest_account = name(parts[1].c_str());
    res.min_conversion_rate = stof(parts[2].c_str()); /* TODO: is it ok to use stdof to parse double? */
    return res;
}

void Network::transfer(name from, name to, asset quantity, string memo) {

    /* allow this contract to send funds (by code) and withdraw funds (by owner or self).
    * after self renounces its authorities only owner can withdraw. */
    if (to != _self) return;

    state_type state_inst(_self, _self.value);
    if (!state_inst.exists()) {
        /* if init not called yet don't trade, instead allow anyone to deposit. */
        return;
    }

    auto current_state = state_inst.get();
    if (from == current_state.owner) {
        /* owner can deposit funds, but not trade */
        return;
    } else {
        /* this is a trade */
        eosio_assert(current_state.is_enabled, "trade not enabled");
        trade0(from, to, quantity, memo, current_state);
        return;
    }
    eosio_assert(false, "unreachable code");
}

extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {

        if (action == "transfer"_n.value && code != receiver) {
            eosio::execute_action( eosio::name(receiver), eosio::name(code), &Network::transfer );
        }
        else if (code == receiver){
            switch( action ) {
                EOSIO_DISPATCH_HELPER( Network, (init)(setowner)(setenable)(addreserve)(listpairres)
                                                (withdraw)(trade1)(trade2))
            }
        }
        eosio_exit(0);
    }
}
