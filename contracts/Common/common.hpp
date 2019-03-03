#pragma once

#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/symbol.hpp>
#include <eosiolib/singleton.hpp>

#include <math.h>
#include <string>
#include <vector>

using std::string;
using std::vector;
using std::make_tuple;
using std::stoi;
using namespace eosio;

#define EOS_PRECISION 4
#define EOS_SYMBOL symbol("EOS", EOS_PRECISION)
#define MAX_RATE 100000 /* up to 1M tokens per EOS */

/* 2^62 - 1 is max amount in asset.
 * We want any amount to be multiply-able by 10^4 ~= 2^14 and still be lower. */
#define MAX_AMOUNT ((1LL << (62-14)) - 1)

struct transfer { /* TODO - can this be removed? */
    name         from;
    name         to;
    asset        quantity;
    string       memo;
};

struct account {
    asset    balance;
    uint64_t primary_key() const { return balance.symbol.code().raw(); }
};

struct rate_t {
    double     stored_rate;
    int64_t    dest_amount;
};

typedef eosio::multi_index<"accounts"_n, account> accounts;
typedef eosio::singleton<"rate"_n, rate_t> rate_type;
typedef eosio::multi_index<"rate"_n, rate_t> dummy_rate_for_abi; /* hack until abi generator generates correct name */

asset get_balance(name user, name token_contract, symbol symbol) {
    accounts fromAcc(token_contract, user.value);
    auto itr = fromAcc.find(symbol.code().raw());
    if ( itr == fromAcc.end()) {
        /* balance was never created */
        return asset(0, symbol);
    }
    const auto& userAcc = fromAcc.get(symbol.code().raw());
    return userAcc.balance;
}

void send(name from, name to, asset quantity, name dest_contract) {
    action {
        permission_level{from, "active"_n},
        dest_contract,
        "transfer"_n,
        std::make_tuple(from, to, quantity, string("memo"))
    }.send();
}

vector<string> split(const string& str, const string& delim) {
    vector<string> tokens;
    size_t prev = 0, pos = 0;
    do
    {
        pos = str.find(delim, prev);
        if (pos == string::npos) pos = str.length();
        string token = str.substr(prev, pos-prev);
        tokens.push_back(token);
        prev = pos + delim.length();
    }
    while (pos < str.length() && prev < str.length());
    return tokens;
}

float stof(const char* s) {
    float rez = 0, fact = 1;
    if (*s == '-') {
        s++;
        fact = -1;
    }

    for (int point_seen = 0; *s; s++) {
        if (*s == '.') {
            point_seen = 1;
            continue;
        }

        int d = *s - '0';
        if (d >= 0 && d <= 9) {
            if (point_seen) fact /= 10.0f;
            rez = rez * 10.0f + (float)d;
        }
    }

    return rez * fact;
};

double amount_to_damount(int64_t amount, uint64_t precision) {
    return (double(amount) / double(pow(10, precision)));
}

int64_t damount_to_amount(double damount, uint64_t precision) {
    eosio_assert(damount < MAX_AMOUNT, "fail overflow validation");
    return int64_t(damount * double(pow(10, precision)));
}

int64_t damount_to_ceil_amount(double damount, uint64_t precision) {
    eosio_assert(damount < MAX_AMOUNT, "fail overflow validation");
    return int64_t(ceil(damount * double(pow(10, precision))));
}

double asset_to_damount(asset quantity) {
    return (double(quantity.amount) / double(pow(10, quantity.symbol.precision())));
}

int64_t calc_src_amount(double rate,
                        uint64_t src_precision,
                        int64_t dest_amount,
                        uint64_t dest_precision) {

    double dest_damount = amount_to_damount(dest_amount, dest_precision);
    double src_damount = dest_damount / rate;
    /* source quantity is rounded up. to avoid dest quantity being too low. */
    int64_t src_amount = damount_to_ceil_amount(src_damount, src_precision);

    return src_amount;
}

int64_t calc_dest_amount(double rate,
                         uint64_t src_precision,
                         int64_t src_amount,
                         uint64_t dest_precision) {

    double src_damount = amount_to_damount(src_amount, src_precision);
    eosio_assert(src_damount < MAX_AMOUNT, "fail overflow validation");
    double dest_damount = src_damount * rate;
    int64_t dest_amount = damount_to_amount(dest_damount, dest_precision);

    return dest_amount;
}
