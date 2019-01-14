#include "./Network.hpp"
#include <math.h>

ACTION Network::init(name owner, name eos_contract, bool enable) {
    require_auth(_self);

    state_type state_instance(_self, _self.value);
    eosio_assert(!state_instance.exists(), "init already called");

    state_t new_state;
    new_state.owner = owner;
    new_state.eos_contract = eos_contract;
    new_state.is_enabled = enable;
    state_instance.set(new_state, _self);
}

ACTION Network::setenable(bool enable) {
    state_type state_instance(_self, _self.value);
    eosio_assert(state_instance.exists(), "init not called yet");

    auto s = state_instance.get();
    require_auth(s.owner);

    s.is_enabled = enable;
    state_instance.set(s, _self);
}

ACTION Network::addreserve(name reserve, bool add) {
    state_type state_instance(_self, _self.value);
    eosio_assert(state_instance.exists(), "init not called yet");
    require_auth(state_instance.get().owner);

    reserves_type reserves_table_inst(_self, _self.value);
    auto itr = reserves_table_inst.find(reserve.value);
    bool exists = (itr != reserves_table_inst.end());
    eosio_assert(add != exists, "can only add a non existing reserve or delete an existing one");
    if (add) {
        reserves_table_inst.emplace(_self, [&]( auto& s ) {
            s.contract = reserve;
        });
    } else {
        reserves_table_inst.erase(itr);
    }
}

ACTION Network::listpairres(name reserve,
                            asset token,
                            name token_contract,
                            bool add
) {
    state_type state_instance(_self, _self.value);
    eosio_assert(state_instance.exists(), "init not called yet");
    require_auth(state_instance.get().owner);

    reserves_type reserves_table_inst(_self, _self.value);
    auto reserve_exists = (reserves_table_inst.find(reserve.value) != reserves_table_inst.end());
    eosio_assert(reserve_exists, "reserve does not exist");

    reservespert_type reservespert_table_inst(_self, _self.value);
    auto itr = reservespert_table_inst.find(token.symbol.raw());
    auto token_exists = (itr != reservespert_table_inst.end());

    if (add) {
        if (!token_exists) {
            reservespert_table_inst.emplace(_self, [&]( auto& s ) {
               s.symbol = token.symbol;
               s.token_contract = token_contract;
               s.reserve_contracts = vector<name>(MAX_RESERVES_PER_TOKEN, name());
               s.reserve_contracts[0] = reserve;
               s.num_reserves = 1;
            });
        } else {
            reservespert_table_inst.modify(itr, _self, [&]( auto& s ) {
                if(find_reserve(s.reserve_contracts, s.num_reserves, reserve) == -1) {
                    /* reserve does not exist */
                    eosio_assert(s.num_reserves < MAX_RESERVES_PER_TOKEN,
                                 "reached number of reserves limit for this token ");
                    s.reserve_contracts[s.num_reserves] = reserve;
                    s.num_reserves++;
                }
            });
        }
    } else if (token_exists) {
        bool erase = false;
        reservespert_table_inst.modify(itr, _self, [&]( auto& s ) {
            int reserve_index = find_reserve(s.reserve_contracts, s.num_reserves, reserve);
            if(reserve_index != -1) {
                /* reserve exist */
                s.reserve_contracts[reserve_index] = s.reserve_contracts[s.num_reserves-1];
                s.reserve_contracts[s.num_reserves-1] = name();
                s.num_reserves--;
            }
            if(s.num_reserves == 0) {
                erase = true;
            }
        });
        if (erase) {
            reservespert_table_inst.erase(itr);
        }
    }
}

ACTION Network::withdraw(name to, asset quantity, name dest_contract) {
    state_type state_instance(_self, _self.value);
    eosio_assert(state_instance.exists(), "init not called yet");
    require_auth(state_instance.get().owner);

    send(_self, to, quantity, dest_contract);
}

void Network::trade0(name from, name to, asset quantity, string memo) {
    eosio_assert(memo.length() > 0, "needs a memo with transaction details");
    eosio_assert(quantity.is_valid(), "invalid transfer");

    symbol dest_symbol;
    auto memo_struct = parse_memo(memo, dest_symbol);

    reservespert_type reservespert_table_inst(_self, _self.value);
    state_type state_instance(_self, _self.value);
    auto current_state = state_instance.get();

    bool buy = (quantity.symbol == EOS_SYMBOL);
    auto token_symbol = buy ? dest_symbol: quantity.symbol;

    eosio_assert(reservespert_table_inst.find(token_symbol.raw()) !=
                 reservespert_table_inst.end(),
                 "unlisted token");
    auto token_entry = reservespert_table_inst.get(token_symbol.raw());

    memo_struct.trader = from;
    memo_struct.src = quantity;
    memo_struct.src_contract = buy ? current_state.eos_contract : token_entry.token_contract;
    memo_struct.dest = asset(0, buy ? token_symbol : EOS_SYMBOL);
    memo_struct.dest_contract = buy ? token_entry.token_contract : current_state.eos_contract;

    eosio_assert(_code == memo_struct.src_contract, "src token contract must match memo.");

    /* get rates from all reserves that hold the pair */
    auto reservespert_entry = (memo_struct.src.symbol != EOS_SYMBOL) ?
            reservespert_table_inst.get(memo_struct.src.symbol.raw()) :
            reservespert_table_inst.get(memo_struct.dest.symbol.raw());

    for (int i = 0; i < reservespert_entry.num_reserves; i++) {
        auto reserve = reservespert_entry.reserve_contracts[i];
        action {
            permission_level{_self, "active"_n},
            reserve,
            "getconvrate"_n,
            make_tuple(memo_struct.src)
        }.send();
    }

    SEND_INLINE_ACTION(*this, trade1, {_self, "active"_n}, {memo_struct});
}

ACTION Network::trade1(memo_trade_structure memo_struct) {
    eosio_assert( _code == _self, "current action can only be called internally" );

    /* read stored rates from all reserves that hold the pair */
    reservespert_type reservespert_table_inst(_self, _self.value);
    auto reservespert_entry = (memo_struct.src.symbol != EOS_SYMBOL) ?
            reservespert_table_inst.get(memo_struct.src.symbol.raw()) :
            reservespert_table_inst.get(memo_struct.dest.symbol.raw());

    double best_rate = 0;
    int best_reserve_index = 0;
    for (int i = 0; i < reservespert_entry.num_reserves; i++) {
        auto reserve = reservespert_entry.reserve_contracts[i];
        auto rate_entry = rate_type(reserve, reserve.value).get();

        if(rate_entry.stored_rate > best_rate) {
            best_reserve_index = i;
        }
    }
    auto best_reserve = reservespert_entry.reserve_contracts[best_reserve_index];
    auto best_rate_entry = rate_type(best_reserve, best_reserve.value).get();
    auto stored_rate = best_rate_entry.stored_rate;
    auto rate_result_dest_amount = best_rate_entry.dest_amount;

    eosio_assert(stored_rate >= memo_struct.min_conversion_rate,
                 "recieved rate is smaller than min conversion rate.");

    asset actual_src;
    asset actual_dest;

    calc_actuals(memo_struct,
                 stored_rate,
                 rate_result_dest_amount,
                 actual_src,
                 actual_dest);

    if(actual_src < memo_struct.src) {
        /* if there is "change" send back to trader */
        auto change = memo_struct.src - actual_src;
        send(_self, memo_struct.trader, change, memo_struct.src_contract);
    }

    SEND_INLINE_ACTION(*this,
                       trade2,
                       {_self, "active"_n},
                       {best_reserve, memo_struct, actual_src, actual_dest});
}

ACTION Network::trade2(name reserve,
                     memo_trade_structure memo_struct,
                     asset actual_src,
                     asset actual_dest) {

    eosio_assert( _code == _self, "current action can only be called internally" );

    /* store dest balance to help verify later that dest amount was received. */
    asset dest_before_trade = get_balance(memo_struct.dest_account,
                                          memo_struct.dest_contract,
                                          memo_struct.dest.symbol);

    /* since no suitable method to turn double into string we do not pass
     * conversion rate to reserve. Instead we assume that it's already stored there. */

    /* do reserve trade */
    action {
        permission_level{_self, "active"_n},
        memo_struct.src_contract,
        "transfer"_n,
        make_tuple(_self,
                   reserve,
                   actual_src,
                   (name{memo_struct.dest_account}).to_string())
    }.send();

    SEND_INLINE_ACTION(
        *this,
        trade3,
        {_self, "active"_n},
        {reserve, memo_struct, actual_src, actual_dest, dest_before_trade}
    );
}

ACTION Network::trade3(name reserve,
                     memo_trade_structure memo_struct,
                     asset actual_src,
                     asset actual_dest,
                     asset dest_before_trade) {

    eosio_assert( _code == _self, "current action can only be called internally" );

    /* verify dest balance was indeed added to dest account */
    auto dest_after_trade = get_balance(memo_struct.dest_account,
                                        memo_struct.dest_contract,
                                        memo_struct.dest.symbol);
    asset dest_difference = dest_after_trade - dest_before_trade;

    eosio_assert(dest_difference == actual_dest, "trade amount not added to dest");
}

void Network::calc_actuals(memo_trade_structure &memo_struct,
                           double rate_result,
                           uint64_t rate_result_dest_amount,
                           asset &actual_src,
                           asset &actual_dest) {
    uint64_t actual_dest_amount;
    uint64_t actual_src_amount;

    /* removed since we do not support max_dest_amount input at this point:
    if (rate_result_dest_amount > memo_struct.max_dest_amount) {
        actual_dest_amount = memo_struct.max_dest_amount;
        actual_src_amount = calc_src_amount(rate_result,
                                            memo_struct.src.symbol.precision(),
                                            actual_dest_amount,
                                            memo_struct.dest.symbol.precision());
        eosio_assert(actual_src_amount <= memo_struct.src.amount,
                     "actual src amount can not be bigger than memo src amount");
    } else {
    */

    actual_dest_amount = rate_result_dest_amount;
    actual_src_amount = memo_struct.src.amount;

    actual_src.amount = actual_src_amount;
    actual_src.symbol = memo_struct.src.symbol;
    actual_dest.amount = actual_dest_amount;
    actual_dest.symbol = memo_struct.dest.symbol;
}

int Network::find_reserve(vector<name> reserve_list,
                          uint8_t num_reserves,
                          name reserve) {
    for(int index = 0; index < num_reserves; index++) {
        if (reserve_list[index] == reserve) {
            return index;
        }
    }
    return NOT_FOUND;
}

memo_trade_structure Network::parse_memo(string memo, symbol &dest_symbol) {
    auto res = memo_trade_structure();
    auto parts = split(memo, ",");

    auto sym_parts = split(parts[0], " ");
    dest_symbol = symbol(sym_parts[1].c_str(), stoi(sym_parts[0].c_str()));

    res.dest_account = name(parts[1].c_str());
    res.min_conversion_rate = stof(parts[2].c_str()); /* TODO: is it ok to use stdof to parse double? */
    return res;
}

void Network::transfer(name from, name to, asset quantity, string memo) {

    if (from == _self) {
        /* allow this contract to send funds (by code) and withdraw funds (by owner or self).
         * after self renounces its authorities only owner can withdraw. */
        return;
    }

    state_type state_instance(_self, _self.value);
    if (to == _self) {
        if (!state_instance.exists()) {
            /* if init not called yet allow anyone to deposit. */
            return;
        }

        auto current_state = state_instance.get();
        if (from == current_state.owner) {
            /* owner can (only) deposit funds */
            return;
        } else {
            /* this is a trade */
            trade0(from, to, quantity, memo);
            return;
        }
    }
    eosio_assert(false, "unreachable code");
}

extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {

        if (action == "transfer"_n.value && code != receiver) {
            eosio::execute_action( eosio::name(receiver), eosio::name(code), &Network::transfer );
        }
        if (code == receiver){
            switch( action ) {
                EOSIO_DISPATCH_HELPER( Network, (init)(setenable)(addreserve)(listpairres)(withdraw)
                                                (trade1)(trade2)(trade3))
            }
        }
        eosio_exit(0);
    }
}
