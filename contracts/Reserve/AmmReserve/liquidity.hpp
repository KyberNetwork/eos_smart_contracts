#pragma once

#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>
#include "../../Common/common.hpp"

#include <math.h>

using namespace eosio;

/* duplicated from reserve contract */
struct liq_params {
    double      r;
    double      p_min;
    asset       max_eos_cap_buy;
    asset       max_eos_cap_sell;
    double      profit_percent;
    double      max_buy_rate;
    double      min_buy_rate;
    double      max_sell_rate;
    double      min_sell_rate;
};

double p_of_e(const struct liq_params *params, double e) {
    return params->p_min * exp(params->r * e);
    // if overflow can return inf
}

double delta_t_func(const struct liq_params *params, double e, double delta_e) {
    return (-1) *
           ((exp(-params->r * delta_e) - 1.0) /
            (params->r * p_of_e(params, e)));
    // if overflow can return either inf or 0
}

double delta_e_func(const struct liq_params *params, double e, double delta_t) {
    return ((log(1 + params->r * p_of_e(params, e) * delta_t)) / params->r);
    // if overflow can return inf
}

double value_after_reducing_profit(const struct liq_params *params, double val) {
    return ((100.0 - params->profit_percent) * val) / 100.0;
    // if overflow can return inf
}

double buy_rate(const struct liq_params *params, double e, double delta_e) {
    double delta_t = delta_t_func(params, e, delta_e);  // if overflow can return either inf or 0
    delta_t = value_after_reducing_profit(params, delta_t);
    return delta_t / delta_e;
    // if overflow can return either inf or 0
}

double buy_rate_zero_quantity(const struct liq_params *params, double e) {
    double rate_pre_reduction = 1 / p_of_e(params, e);
    return value_after_reducing_profit(params, rate_pre_reduction);
    // if overflow can return either inf or 0
}

double sell_rate(const struct liq_params *params,
                 double e,
                 double sell_input_qty,
                 double delta_t,
                 double &delta_e) {
    delta_e = delta_e_func(params, e, delta_t);
    return delta_e / sell_input_qty;
    // if overflow can return either inf or 0
}

double sell_rate_zero_quantity(const struct liq_params *params, double e) {
    double rate_pre_reduction = p_of_e(params, e);
    return value_after_reducing_profit(params, rate_pre_reduction);
    // if overflow can return either inf or 0
}

double rate_after_validation(const struct liq_params *params, double rate, bool buy) {
    if (rate == INFINITY) return 0;

    double min_allowed_rate = buy ? params->min_buy_rate : params->min_sell_rate;
    double max_allowed_rate = buy ? params->max_buy_rate : params->max_sell_rate;

    if ((rate > max_allowed_rate) || (rate < min_allowed_rate) || (rate > MAX_RATE)) return 0;
    return rate;
}

double get_rate_with_e(const struct liq_params *params, bool buy, asset src, double e) {
    double src_damount = asset_to_damount(src);
    double rate, delta_e, delta_t;

    if (buy) {
        delta_e = src_damount;
        if (src.amount > params->max_eos_cap_buy.amount) return 0;
        rate = (delta_e == 0) ? buy_rate_zero_quantity(params, e) :
                                buy_rate(params, e, delta_e);
    } else {
        auto delta_t = value_after_reducing_profit(params, src_damount);
        rate = (delta_t == 0) ? sell_rate_zero_quantity(params, e) :
                                sell_rate(params, e, src_damount, delta_t, delta_e);
        if (delta_t == 0) delta_e = 0;
        if (delta_e > params->max_eos_cap_sell.amount) return 0;
    }
    return rate_after_validation(params, rate, buy);
}

double liquidity_get_rate(name self_contract,
                          name eos_contract,
                          const struct liq_params *params,
                          bool buy,
                          asset src) {
    asset eos_balance = get_balance(self_contract, eos_contract, EOS_SYMBOL);
    double e = asset_to_damount(eos_balance);
    double rate = get_rate_with_e(params, buy, src, e);

    return rate;
}
