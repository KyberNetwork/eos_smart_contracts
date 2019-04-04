#pragma once

#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>
#include "../../Common/common.hpp"

#include <math.h>

using namespace eosio;

struct liq_info {
    double      r;
    double      p_min;
    double      profit_percent;
    double      ram_fee;
};

double p_of_e(struct liq_info &info, double e) {
    return info.p_min * exp(info.r * e);
}

double value_after_reducing_profit(struct liq_info &info, double val) {
    return ((100.0 - info.profit_percent) * val) / 100.0;
}

double value_after_reducing_ram_fee(struct liq_info &info, double val) {
    return (info.ram_fee >= val) ? 0 : (val - info.ram_fee);
}

double get_delta_t(struct liq_info &info, double e, double delta_e) {
    return (-1) * (exp(-info.r * delta_e) - 1.0) / (info.r * p_of_e(info, e));
}

double get_delta_e(struct liq_info &info, double e, double delta_t) {
    return ((log(1 + info.r * p_of_e(info, e) * delta_t)) / info.r);
}

double liquidity_get_rate(name self_contract,
                          asset eos_balance,
                          bool buy,
                          asset src,
                          double r,
                          double p_min,
                          double profit_percent,
                          double ram_fee) {

    liq_info info = {r, p_min, profit_percent, ram_fee};
    double e = asset_to_damount(eos_balance);
    double src_damount = asset_to_damount(src);
    double dest_damount;
    double rate, delta_e, delta_t;

    if (!src_damount) {
        double pre_profit_rate = buy ? (1 / p_of_e(info, e)) : p_of_e(info, e);
        rate = value_after_reducing_profit(info, pre_profit_rate);
    } else {
        if (buy) {
            /* reduce ram fee since might need to allocate a line in token contract */
            delta_e = value_after_reducing_ram_fee(info, src_damount);
            delta_t = get_delta_t(info, e, delta_e);
            dest_damount = value_after_reducing_profit(info, delta_t);
        } else {
            delta_t = value_after_reducing_profit(info, src_damount);
            delta_e = get_delta_e(info, e, delta_t);
            dest_damount = delta_e;
        }
        rate = dest_damount / src_damount;
    }
    return rate;
}
