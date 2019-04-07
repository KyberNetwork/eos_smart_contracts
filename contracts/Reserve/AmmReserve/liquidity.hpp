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
                          double ram_fee,
                          double &charged_fee) {

    liq_info info = {r, p_min, profit_percent, ram_fee};
    double e = asset_to_damount(eos_balance);
    double src_damount = asset_to_damount(src);
    double dest_damount, src_without_profit;
    double rate, delta_e;

    if (!src_damount) {
        double pre_profit_rate = buy ? (1 / p_of_e(info, e)) : p_of_e(info, e);
        rate = ((100.0 - info.profit_percent) * pre_profit_rate) / 100.0;
    } else {
        if (buy) {
            charged_fee = (info.profit_percent * src_damount) / 100.0;
            if (info.ram_fee >= (src_damount - charged_fee)) {
                charged_fee = 0;
                return 0;
            }
            charged_fee += info.ram_fee;
            dest_damount = get_delta_t(info, e, src_damount - charged_fee);
        } else {
            delta_e = get_delta_e(info, e, src_damount);
            charged_fee = (info.profit_percent * delta_e) / 100.0;
            dest_damount = delta_e - charged_fee;
        }
        rate = dest_damount / src_damount;
    }
    return rate;
}
