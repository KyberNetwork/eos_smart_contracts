#include "AmmReserve.hpp"
#include "liquidity.hpp"

using namespace eosio;

ACTION AmmReserve::init(name    admin,
                        name    network_contract,
                        symbol  token_symbol,
                        name    token_contract,
                        name    eos_contract,
                        bool    enable_trade) {
    eosio_assert(is_account(admin), "admin account does not exist");
    eosio_assert(is_account(network_contract), "network account does not exist");
    eosio_assert(is_account(token_contract), "token account does not exist");
    eosio_assert(is_account(eos_contract), "eos contract does not exist");

    require_auth(_self);

    state_type state_inst(_self, _self.value);
    eosio_assert(!state_inst.exists(), "init already called");

    state new_state;
    new_state.admin = admin;
    new_state.network_contract = network_contract;
    new_state.token_symbol = token_symbol;
    new_state.token_contract = token_contract;
    new_state.eos_contract = eos_contract;
    new_state.trade_enabled = enable_trade;
    new_state.collected_profit_in_tokens.symbol = token_symbol;
    new_state.collected_profit_in_tokens.amount = 0;
    state_inst.set(new_state, _self);
}

ACTION AmmReserve::quickset(double p) {
    auto state_inst = get_state_assert_admin();
    params_type params_inst(_self, _self.value);
    params new_params;

    new_params.p_min = p / 2.0;
    new_params.max_eos_cap_buy = asset(MAX_AMOUNT, EOS_SYMBOL);
    new_params.max_eos_cap_sell = asset(MAX_AMOUNT, EOS_SYMBOL);
    new_params.profit_percent = 0.0;
    new_params.max_sell_rate = p * 2.0;
    new_params.min_sell_rate = p / 2.0;
    new_params.max_buy_rate = 1.0 / new_params.min_sell_rate;
    new_params.min_buy_rate = 1.0 / new_params.max_sell_rate;

    /* (p/p_min) = 2.0 = e^(rE) => r = ln(2)/E */
    asset eos_balance = get_balance(_self, state_inst.get().eos_contract, EOS_SYMBOL);
    eosio_assert(eos_balance.is_valid() && eos_balance.amount > 0, "no balance");
    new_params.r = 0.69314 / amount_to_damount(eos_balance.amount, EOS_PRECISION);

    params_inst.set(new_params, _self);
}

ACTION AmmReserve::setparams(double r,
                             double p_min,
                             asset  max_eos_cap_buy,
                             asset  max_eos_cap_sell,
                             double profit_percent,
                             double max_sell_rate,
                             double min_sell_rate) {
    get_state_assert_admin();

    eosio_assert(profit_percent < 100.0, "illegal profit_percent");
    eosio_assert(min_sell_rate < max_sell_rate, "min_sell_rate not smaller than max_sell_rate");

    params_type params_inst(_self, _self.value);
    params new_params;
    new_params.r = r;
    new_params.p_min = p_min;
    new_params.max_eos_cap_buy = max_eos_cap_buy;
    new_params.max_eos_cap_sell = max_eos_cap_sell;
    new_params.profit_percent = profit_percent;
    new_params.max_buy_rate = 1.0 / min_sell_rate;
    new_params.min_buy_rate = 1.0 / max_sell_rate;
    new_params.max_sell_rate = max_sell_rate;
    new_params.min_sell_rate = min_sell_rate;
    params_inst.set(new_params, _self);
}

ACTION AmmReserve::setadmin(name admin) {
    eosio_assert(is_account(admin), "new admin account does not exist");

    auto state_inst = get_state_assert_admin();

    auto s = state_inst.get();
    s.admin = admin;
    state_inst.set(s, _self);
}

ACTION AmmReserve::setnetwork(name network_contract) {
    eosio_assert(is_account(network_contract), "network account does not exist");

    auto state_inst = get_state_assert_admin();

    auto s = state_inst.get();
    s.network_contract = network_contract;
    state_inst.set(s, _self);
}

ACTION AmmReserve::setenable(bool enable) {
    auto state_inst = get_state_assert_admin();

    auto s = state_inst.get();
    s.trade_enabled = enable;
    state_inst.set(s, _self);
}

ACTION AmmReserve::resetprofit() {
    auto state_inst = get_state_assert_admin();

    auto s = state_inst.get();
    s.collected_profit_in_tokens.amount = 0;
    state_inst.set(s, _self);
}

ACTION AmmReserve::getconvrate(asset src) {
    eosio_assert(src.is_valid(), "src amount");
    eosio_assert(src.amount >= 0, "src amount can not be negative");

    /* for simplicity and safety only network can get conversion rate */
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().network_contract);

    asset dest = asset();
    double rate_result = reserve_get_conv_rate(src, false, dest);

    rate_type rate_inst(_self, _self.value);
    rate s = {rate_result, dest};
    rate_inst.set(s, _self);
}

ACTION AmmReserve::withdraw(name to, asset quantity, name dest_contract, string memo) {
    eosio_assert(is_account(to), "to account does not exist");
    eosio_assert(is_account(dest_contract), "dest contract does not exist");

    auto state_inst = get_state_assert_admin();
    async_pay(_self, to, quantity, dest_contract, memo);
}

double AmmReserve::reserve_get_conv_rate(asset src, bool substract_src, asset &dest) {
    dest = asset();

    state_type state_inst(_self, _self.value);
    /* if reserve not ready return gracefully (store 0 rate) to continue queries in network */
    if (!state_inst.exists()) return 0;
    auto state = state_inst.get();
    if (!state.trade_enabled) return 0;

    /* verify params were set */
    params_type params_inst(_self, _self.value);
    if (!params_inst.exists()) return 0;
    auto params = params_inst.get();

    bool buy = (EOS_SYMBOL == src.symbol) ? true : false;

    asset eos_balance = get_balance(_self, state.eos_contract, EOS_SYMBOL);
    if(substract_src) {
        /* disregard eos src quantity, so it will not affect e used for rate calc. */
        if (src > eos_balance) return 0;
        eos_balance = eos_balance - src;
    }

    double rate = liquidity_get_rate(_self,
                                     eos_balance,
                                     buy,
                                     src,
                                     params.r,
                                     params.p_min,
                                     params.profit_percent);
    if (!rate || rate == INFINITY) return 0;

    double min_allowed_rate = buy ? params.min_buy_rate : params.min_sell_rate;
    double max_allowed_rate = buy ? params.max_buy_rate : params.max_sell_rate;
    if ((rate > max_allowed_rate) || (rate < min_allowed_rate) || (rate > MAX_RATE)) return 0;

    symbol dest_symbol = buy ? state.token_symbol : EOS_SYMBOL;
    dest = calc_dest(rate, src, dest_symbol);

    asset eos_trade_quantity = buy ? src : dest;
    asset max_eos_cap = buy ? params.max_eos_cap_buy : params.max_eos_cap_sell;
    if (eos_trade_quantity > max_eos_cap) {
        dest = asset();
        return 0;
    }

    /* make sure reserve has enough of the dest token */
    name dest_contract = buy ? state.token_contract : state.eos_contract;
    if (get_balance(_self, dest_contract, dest_symbol) < dest) {
        dest = asset();
        return 0;
    }

    return rate;
}

void AmmReserve::trade(name from, asset src, string memo, name code, state &state) {
    eosio_assert(state.trade_enabled, "trade disabled");
    eosio_assert(from == state.network_contract, "only network can perform a trade");
    bool buy = (src.symbol == EOS_SYMBOL) ? true : false;

    name expected_src_contract = buy ? state.eos_contract : state.token_contract;
    eosio_assert(code == expected_src_contract, "wrong src contract");

    eosio_assert(src.is_valid(), "invalid transfer");
    eosio_assert(src.amount > 0, "src amount must be positive");
    eosio_assert(src.symbol == EOS_SYMBOL || src.symbol == state.token_symbol, "unrecognized src");

    params_type params_inst(_self, _self.value);
    eosio_assert(params_inst.exists(), "params were not set");
    auto params = params_inst.get();

    name receiver = name(memo.c_str());
    eosio_assert(receiver != _self, "receiver can not be current contract");

    symbol dest_symbol = buy ? state.token_symbol : EOS_SYMBOL;
    name dest_contract = buy ? state.token_contract : state.eos_contract;

    /* get conversion rate again */
    asset dest = asset();
    double conversion_rate = reserve_get_conv_rate(src, buy, dest);
    eosio_assert(conversion_rate > 0, "conversion rate must be bigger than 0");
    eosio_assert(conversion_rate < MAX_RATE, "fail overflow validation");

    record_profit(buy ? dest : src, buy);
    async_pay(_self, receiver, dest, dest_contract, "");
}

void AmmReserve::record_profit(asset token, bool buy) {
    params_type params_inst(_self, _self.value);
    auto params = params_inst.get();

    double token_damount = amount_to_damount(token.amount, token.symbol.precision());
    double dprofit = buy ?
        (token_damount * params.profit_percent / (100.0 - params.profit_percent)) :
        (token_damount * params.profit_percent) / 100.0;
    int64_t profit_amount = damount_to_amount(dprofit, token.symbol.precision());
    asset profit = asset(profit_amount, token.symbol);

    state_type state_inst(_self, _self.value);
    auto s = state_inst.get();
    s.collected_profit_in_tokens += profit;
    state_inst.set(s, _self);
}

AmmReserve::state_type AmmReserve::get_state_assert_admin() {
    state_type state_inst(_self, _self.value);
    eosio_assert(state_inst.exists(), "init not called yet");
    require_auth(state_inst.get().admin);
    return state_inst;
}

void AmmReserve::transfer(name from, name to, asset quantity, string memo) {
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
        trade(from, quantity, memo, _code, state);
        return;
    }
    eosio_assert(false, "unreachable code");
}

extern "C" {
    [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
        if (action == "transfer"_n.value && code != receiver) {
            eosio::execute_action(eosio::name(receiver), eosio::name(code), &AmmReserve::transfer);
        } else if (code == receiver) {
            switch (action) {
                EOSIO_DISPATCH_HELPER(AmmReserve, (init)(quickset)(setparams)(setadmin)(setnetwork)
                                                  (setenable)(resetprofit)(getconvrate)(withdraw))
            }
        }
        eosio_exit(0);
    }
}
