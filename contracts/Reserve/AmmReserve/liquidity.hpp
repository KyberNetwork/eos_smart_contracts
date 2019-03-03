#pragma once

#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>
#include "../../Common/common.hpp"

#include <math.h>

using namespace eosio;

/* duplicated from reserve contract */
struct liquidity_params {
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

double p_of_e(const struct liquidity_params *current_params, double e) {
    return current_params->p_min * exp(current_params->r * e);
}

double delta_t_func(const struct liquidity_params *current_params, double e, double delta_e) {
    return (-1) *
           ((exp(-current_params->r * delta_e) - 1.0) /
            (current_params->r * p_of_e(current_params, e)));
}

double delta_e_func(const struct liquidity_params *current_params, double e, double delta_t) {
    return ((log(1 + current_params->r * p_of_e(current_params, e) * delta_t)) / current_params->r);
}

double value_after_reducing_fee(const struct liquidity_params *current_params, double val) {
    eosio_assert(val < MAX_AMOUNT, "fail overflow validation");
    return ((100.0 - current_params->fee_percent) * val) / 100.0;
}

double buy_rate(const struct liquidity_params *current_params, double e, double delta_e) {
    double delta_t = delta_t_func(current_params, e, delta_e);
    /* require(deltaTInFp <= maxQtyInFp); */ // covered by asset limits
    delta_t = value_after_reducing_fee(current_params, delta_t);
    return delta_t / delta_e;
}

double buy_rate_zero_quantity(const struct liquidity_params *current_params, double e) {
    double rate_pre_reduction = 1 / p_of_e(current_params, e);
    return value_after_reducing_fee(current_params, rate_pre_reduction);
}

double sell_rate(const struct liquidity_params *current_params,
                 double e,
                 double sell_input_qty,
                 double delta_t,
                 double &delta_e) {

    delta_e = delta_e_func(current_params, e, delta_t);
    return delta_e / sell_input_qty;
}

double sell_rate_zero_quantity(const struct liquidity_params *current_params, double e) {
    double rate_pre_reduction = p_of_e(current_params, e);
    return value_after_reducing_fee(current_params, rate_pre_reduction);
}

double rate_after_validation(const struct liquidity_params *current_params, double rate, bool buy) {
    double min_allowed_rate, max_allowed_rate;

    if (buy) {
        min_allowed_rate = current_params->min_buy_rate;
        max_allowed_rate = current_params->max_buy_rate;
    } else {
        min_allowed_rate = current_params->min_sell_rate;
        max_allowed_rate = current_params->max_sell_rate;
    }

    if ((rate > max_allowed_rate) || (rate < min_allowed_rate) || (rate > MAX_RATE)) return 0;
    return rate;
}

double get_rate_with_e(const struct liquidity_params *current_params, bool is_buy, asset src, double e) {
    double src_damount = asset_to_damount(src);
    double rate, delta_e, delta_t;

    if (is_buy) {
        delta_e = src_damount;
        if (src.amount > current_params->max_eos_cap_buy.amount) return 0;
        rate = (delta_e == 0) ? buy_rate_zero_quantity(current_params, e) :
                                buy_rate(current_params, e, delta_e);
    } else {
        auto delta_t = value_after_reducing_fee(current_params, src_damount);
        rate = (delta_t == 0) ? sell_rate_zero_quantity(current_params, e) :
                                sell_rate(current_params, e, src_damount, delta_t, delta_e);
        if (delta_t == 0) delta_e = 0;
        if (delta_e > current_params->max_eos_cap_sell.amount) return 0;
    }
    return rate_after_validation(current_params, rate, is_buy);
}

double liquidity_get_rate(name self_contract,
                          name eos_contract,
                          const struct liquidity_params *current_params,
                          bool is_buy,
                          asset src) {
    /* require(qtyInSrcWei <= MAX_QTY); */ // covered by asset limits

    asset eos_balance = get_balance(self_contract, eos_contract, EOS_SYMBOL);
    double e = asset_to_damount(eos_balance);
    double rate = get_rate_with_e(current_params, is_buy, src, e);

    return rate;
}
