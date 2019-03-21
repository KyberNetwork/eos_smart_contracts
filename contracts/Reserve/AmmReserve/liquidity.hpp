#pragma once

#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>
#include "../../Common/common.hpp"

#include <math.h>

using namespace eosio;

/* duplicated from reserve contract */
struct liq_info {
    double      r;
    double      p_min;
    double      profit_percent;
};

double p_of_e(struct liq_info &info, double e) {
    return info.p_min * exp(info.r * e);
}

double value_after_reducing_profit(struct liq_info &info, double val) {
    return ((100.0 - info.profit_percent) * val) / 100.0;
}

double buy_rate(struct liq_info &info, double e, double delta_e) {
    double delta_t = (-1) *
                     (exp(-info.r * delta_e) - 1.0) /
                     (info.r * p_of_e(info, e));
    delta_t = value_after_reducing_profit(info, delta_t);
    return delta_t / delta_e;
}

double buy_rate_zero_quantity(struct liq_info &info, double e) {
    double rate_pre_reduction = 1 / p_of_e(info, e);
    return value_after_reducing_profit(info, rate_pre_reduction);
}

double sell_rate(struct liq_info &info,
                 double e,
                 double sell_input_qty,
                 double delta_t,
                 double &delta_e) {
    delta_e = ((log(1 + info.r * p_of_e(info, e) * delta_t)) / info.r);
    return delta_e / sell_input_qty;
}

double sell_rate_zero_quantity(struct liq_info &info, double e) {
    double rate_pre_reduction = p_of_e(info, e);
    return value_after_reducing_profit(info, rate_pre_reduction);
}

double liquidity_get_rate(name self_contract,
                          asset eos_balance,
                          bool buy,
                          asset src,
                          double r,
                          double p_min,
                          double profit_percent) {

    liq_info info = {r, p_min, profit_percent};
    double e = asset_to_damount(eos_balance);
    double src_damount = asset_to_damount(src);
    double rate, delta_e, delta_t;

    if (buy) {
        delta_e = src_damount;
        rate = (delta_e == 0) ? buy_rate_zero_quantity(info, e) :
                                buy_rate(info, e, delta_e);
    } else {
        auto delta_t = value_after_reducing_profit(info, src_damount);
        rate = (delta_t == 0) ? sell_rate_zero_quantity(info, e) :
                                sell_rate(info, e, src_damount, delta_t, delta_e);
        if (delta_t == 0) delta_e = 0;
    }
    return rate;
}
