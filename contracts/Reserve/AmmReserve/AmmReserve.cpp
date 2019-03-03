#include "./AmmReserve.hpp"

using namespace eosio;

ACTION AmmReserve::init(name    owner,
                        name    network_contract,
                        symbol  token_symbol,
                        name    token_contract,
                        name    eos_contract,
                        bool    enable_trade) {
    eosio_assert(is_account(owner), "owner account does not exist");
    eosio_assert(is_account(network_contract), "network account does not exist");
    eosio_assert(is_account(token_contract), "token account does not exist");
    eosio_assert(is_account(eos_contract), "eos contract account does not exist");

    require_auth(_self);

    state_type state_inst(_self, _self.value);
    eosio_assert(!state_inst.exists(), "init already called");

    state_t new_state;
    new_state.owner = owner;
    new_state.network_contract = network_contract;
    new_state.token_symbol = token_symbol;
    new_state.token_contract = token_contract;
    new_state.eos_contract = eos_contract;
    new_state.trade_enabled = enable_trade;
    new_state.collected_fees_in_tokens.symbol = token_symbol;
    new_state.collected_fees_in_tokens.amount = 0;
    state_inst.set(new_state, _self);
}

ACTION AmmReserve::setparams(double r,
                             double p_min,
                             asset  max_eos_cap_buy,
                             asset  max_eos_cap_sell,
                             double fee_percent,
                             double max_sell_rate,
                             double min_sell_rate) {
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().owner);

    eosio_assert(fee_percent < 100, "illegal fee_percent");
    eosio_assert(min_sell_rate < max_sell_rate, "min_sell_rate not smaller than max_sell_rate");

    params_type params_instance(_self, _self.value);
    params_t new_params;
    new_params.r = r;
    new_params.p_min = p_min;
    new_params.max_eos_cap_buy = max_eos_cap_buy;
    new_params.max_eos_cap_sell = max_eos_cap_sell;
    new_params.fee_percent = fee_percent;
    new_params.max_buy_rate = 1.0 / min_sell_rate;
    new_params.min_buy_rate = 1.0 / max_sell_rate;
    new_params.max_sell_rate = max_sell_rate;
    new_params.min_sell_rate = min_sell_rate;
    params_instance.set(new_params, _self);
}

ACTION AmmReserve::setowner(name new_owner) {
    eosio_assert(is_account(new_owner), "new owner account does not exist");

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    auto s = state_inst.get();
    require_auth(s.owner);

    s.owner = new_owner;
    state_inst.set(s, _self);
}

ACTION AmmReserve::setnetwork(name network_contract) {
    eosio_assert(is_account(network_contract), "network account does not exist");

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    auto s = state_inst.get();
    require_auth(s.owner);

    s.network_contract = network_contract;
    state_inst.set(s, _self);
}

ACTION AmmReserve::setenable(bool enable) {
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    auto s = state_inst.get();
    require_auth(s.owner);

    s.trade_enabled = enable;
    state_inst.set(s, _self);
}

ACTION AmmReserve::resetfee() {
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");

    auto s = state_inst.get();
    require_auth(s.owner);

    s.collected_fees_in_tokens.amount = 0;
    state_inst.set(s, _self);
}

ACTION AmmReserve::getconvrate(asset src) {
    double rate;
    int64_t dest_amount;

    rate = reserve_get_conv_rate(src, dest_amount);
    if(rate == 0) dest_amount = 0;

    rate_type rate_instance(_self, _self.value);
    rate_t s;
    s.stored_rate = rate;
    s.dest_amount = dest_amount;
    rate_instance.set(s, _self);
}

ACTION AmmReserve::withdraw(name to, asset quantity, name dest_contract) {
    eosio_assert(is_account(to), "to account does not exist");
    eosio_assert(is_account(dest_contract), "dest contract account does not exist");

    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().owner);

    send(_self, to, quantity, dest_contract);
}

double AmmReserve::reserve_get_conv_rate(asset      src,
                                         int64_t   &dest_amount) {

    /* verify contract was init */
    state_type state_inst(_self, _self.value);
    /* if reserve is not ready return gracefully to allow other rate queries in network */
    if (!state_inst.exists()) return 0;
    auto current_state = state_inst.get();

    /* verify params were set */
    params_type params_instance(_self, _self.value);
    if (!params_instance.exists()) return 0;
    auto current_params = params_instance.get();

    /* we only allow network to get conversion rate since it actually writes to ram */
    require_auth(current_state.network_contract);
    if (!current_state.trade_enabled) return 0;

    bool is_buy = (EOS_SYMBOL == src.symbol) ? true : false;
    double rate = liquidity_get_rate(current_state.eos_contract, current_params, is_buy, src);
    if (rate == 0) return 0;

    uint64_t dest_precision = is_buy ? current_state.token_symbol.precision() : EOS_PRECISION;
    dest_amount = calc_dest_amount(rate,
                                   src.symbol.precision(),
                                   src.amount,
                                   dest_precision);

    /* make sure reserve has enough of the dest token */
    asset this_balance = get_balance(_self,
                                     is_buy ? current_state.token_contract : current_state.eos_contract,
                                     is_buy ? current_state.token_symbol : EOS_SYMBOL);

    if (this_balance.amount < dest_amount) return 0;

    return rate;
}

double AmmReserve::liquidity_get_rate(name eos_contract,
                                      const struct params_t &current_params,
                                      bool is_buy,
                                      asset src) {
    /* require(qtyInSrcWei <= MAX_QTY); */ // covered by asset limits

    asset eos_balance = get_balance(_self, eos_contract, EOS_SYMBOL);
    double e = asset_to_damount(eos_balance);
    double rate = get_rate_with_e(current_params, is_buy, src, e);

    return rate;
}

double AmmReserve::get_rate_with_e(const struct params_t &current_params,
                                   bool is_buy,
                                   asset src,
                                   double e) {

    double src_damount = asset_to_damount(src);
    double rate, delta_e, delta_t;

    if (is_buy) {
        delta_e = src_damount;
        if (src.amount > current_params.max_eos_cap_buy.amount) return 0;
        rate = (delta_e == 0) ? buy_rate_zero_quantity(current_params, e) :
                                buy_rate(current_params, e, delta_e);
    } else {
        auto delta_t = value_after_reducing_fee(current_params, src_damount);
        rate = (delta_t == 0) ? sell_rate_zero_quantity(current_params, e) :
                                sell_rate(current_params, e, src_damount, delta_t, delta_e);
        if (delta_t == 0) delta_e = 0;
        if (delta_e > current_params.max_eos_cap_sell.amount) return 0;
    }
    return rate_after_validation(current_params, rate, is_buy);
}

double AmmReserve::rate_after_validation(const struct params_t &current_params,
                                         double rate,
                                         bool buy) {
    double min_allowed_rate, max_allowed_rate;

    if (buy) {
        min_allowed_rate = current_params.min_buy_rate;
        max_allowed_rate = current_params.max_buy_rate;
    } else {
        min_allowed_rate = current_params.min_sell_rate;
        max_allowed_rate = current_params.max_sell_rate;
    }

    if ((rate > max_allowed_rate) || (rate < min_allowed_rate) || (rate > MAX_RATE)) return 0;
    return rate;
}

double AmmReserve::buy_rate(const struct params_t &current_params, double e, double delta_e) {
    double delta_t = delta_t_func(current_params, e, delta_e);
    /* require(deltaTInFp <= maxQtyInFp); */
    delta_t = value_after_reducing_fee(current_params, delta_t);
    return delta_t / delta_e;
}

double AmmReserve::buy_rate_zero_quantity(const struct params_t &current_params, double e) {
    double rate_pre_reduction = 1 / p_of_e(current_params, e);
    return value_after_reducing_fee(current_params, rate_pre_reduction);
}

double AmmReserve::sell_rate(const struct params_t &current_params,
                             double e,
                             double sell_input_qty,
                             double delta_t,
                             double &delta_e) {

    delta_e = delta_e_func(current_params, e, delta_t);
    return delta_e / sell_input_qty;
}

double AmmReserve::sell_rate_zero_quantity(const struct params_t &current_params, double e) {
    double rate_pre_reduction = p_of_e(current_params, e);
    return value_after_reducing_fee(current_params, rate_pre_reduction);
}

double AmmReserve::value_after_reducing_fee(const struct params_t &current_params, double val) {
    eosio_assert(val < MAX_AMOUNT, "fail overflow validation");
    return ((100.0 - current_params.fee_percent) * val) / 100.0;
}

double AmmReserve::p_of_e(const struct params_t &current_params, double e) {
    return current_params.p_min * exp(current_params.r * e);
}

double AmmReserve::delta_t_func(const struct params_t &current_params, double e, double delta_e) {
    return (-1) *
           ((exp(-current_params.r * delta_e) - 1.0) /
            (current_params.r * p_of_e(current_params, e)));
}

double AmmReserve::delta_e_func(const struct params_t &current_params, double e, double delta_t) {
    return ((log(1 + current_params.r * p_of_e(current_params, e) * delta_t)) / current_params.r);
}

void AmmReserve::reserve_trade(name from, asset quantity, string memo, name code, state_t &current_state) {

    eosio_assert(current_state.trade_enabled, "trade disabled");
    eosio_assert(from == current_state.network_contract, "only network can perform a trade");
    eosio_assert(code == current_state.token_contract || code == current_state.eos_contract,
                 "must come from token contract or eos contract");

    eosio_assert(quantity.is_valid(), "invalid transfer");
    eosio_assert(quantity.symbol == EOS_SYMBOL || quantity.symbol == current_state.token_symbol,
                 "unrecognized transfer asset symbol");

    params_type params_instance(_self, _self.value);
    eosio_assert(params_instance.exists(), "params were not set");
    auto current_params = params_instance.get();

    eosio_assert(memo.length() > 0 , "needs a memo");
    name dest_address = name(memo.c_str());

    symbol dest_symbol;
    name dest_contract;
    if (quantity.symbol == EOS_SYMBOL) {
        dest_symbol = current_state.token_symbol;
        dest_contract = current_state.token_contract;
    } else {
        dest_symbol = EOS_SYMBOL;
        dest_contract = current_state.eos_contract;
    }

    /* get conversion rate, assuming it is stored here since getconvrate was called beforehand in this tx */
    rate_type rate_instance(_self, _self.value);
    double conversion_rate = rate_instance.get().stored_rate;

    do_trade(current_params,
             quantity,
             dest_address,
             conversion_rate,
             dest_symbol,
             dest_contract);
}

void AmmReserve::do_trade(const struct params_t &current_params,
                          asset src,
                          name dest_address,
                          double conversion_rate,
                          symbol dest_symbol,
                          name dest_contract) {
    eosio_assert(conversion_rate > 0, "conversion rate must be bigger than 0");

    int64_t dest_amount = calc_dest_amount(conversion_rate,
                                           src.symbol.precision(),
                                           src.amount,
                                           dest_symbol.precision());
    eosio_assert(dest_amount > 0, "internal error. calculated dest amount must be > 0");

    asset dest;
    dest.symbol = dest_symbol;
    dest.amount = dest_amount;

    bool buy = (src.symbol == EOS_SYMBOL) ? true : false;
    asset token = buy ? dest : src;
    record_fees(current_params, token, buy);

    send(_self, dest_address, dest, dest_contract);
}

void AmmReserve::record_fees(const struct params_t &current_params,
                             asset token,
                             bool buy) {
    /* require(val <= MAX_QTY); */

    double dfees;
    double token_damount = amount_to_damount(token.amount, token.symbol.precision());
    int64_t fees_amount;

    if (buy) {
        dfees = (token_damount * current_params.fee_percent /
                 (100.0 - current_params.fee_percent));
    } else {
        dfees = (token_damount * current_params.fee_percent) / 100.0;
    }
    fees_amount = damount_to_amount(dfees, token.symbol.precision());

    state_type state_inst(_self, _self.value);
    auto s = state_inst.get();
    s.collected_fees_in_tokens.amount += fees_amount;
    state_inst.set(s, _self);
}

void AmmReserve::transfer(name from, name to, asset quantity, string memo) {

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
        reserve_trade(from, quantity, memo, _code, current_state);
        return;
    }
    eosio_assert(false, "unreachable code");
}

extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
        if (action == "transfer"_n.value && code != receiver) {
            eosio::execute_action(eosio::name(receiver), eosio::name(code), &AmmReserve::transfer);
        }
        else if (code == receiver) {
            switch (action) {
                EOSIO_DISPATCH_HELPER(AmmReserve, (init)(setparams)(setowner)(setnetwork)(setenable)
                                                  (resetfee)(getconvrate)(withdraw))
            }
        }
        eosio_exit(0);
    }
}
