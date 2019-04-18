#pragma once

#include <math.h>
#include <string>
#include <vector>
#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/symbol.hpp>
#include <eosiolib/singleton.hpp>

using std::string;
using std::vector;
using std::make_tuple;
using std::stoi;
using namespace eosio;

#define EOS_PRECISION 4
#define EOS_SYMBOL symbol("EOS", EOS_PRECISION)
#define MAX_AMOUNT asset::max_amount
#define MAX_RATE 1000000 /* up to 1M tokens per EOS */
#define STAKE_ACCOUNT "eosio.stake"_n
#define RAM_ACCOUNT "eosio.ram"_n

struct account {
    asset    balance;
    uint64_t primary_key() const { return balance.symbol.code().raw(); }
};
typedef eosio::multi_index<"accounts"_n, account> accounts;

asset get_balance(name user, name token_contract, symbol symbol) {
    accounts fromAcc(token_contract, user.value);
    auto itr = fromAcc.find(symbol.code().raw());
    if (itr == fromAcc.end()) {
        /* balance was never created */
        return asset(0, symbol);
    }
    return itr->balance;
}

void async_pay(name from, name to, asset quantity, name dest_contract, string memo) {
    action {
        permission_level{from, "active"_n},
        dest_contract,
        "transfer"_n,
        std::make_tuple(from, to, quantity, memo)
    }.send();
}

vector<string> split(const string& str, const string& delim) {
    vector<string> tokens;
    size_t prev = 0, pos = 0;
    do {
        pos = str.find(delim, prev);
        if (pos == string::npos) pos = str.length();
        string token = str.substr(prev, pos-prev);
        tokens.push_back(token);
        prev = pos + delim.length();
    } while (pos < str.length() && prev < str.length());
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
}

int64_t to_int64(double x) {
    eosio_assert(x <= MAX_AMOUNT, "fail max amount overflow validation");
    return int64_t(x);
}

double amount_to_damount(int64_t amount, uint64_t precision) {
    return (double(amount) / double(pow(10, precision)));
}

double asset_to_damount(asset quantity) {
    return (double(quantity.amount) / double(pow(10, quantity.symbol.precision())));
}

int64_t damount_to_amount(double damount, uint64_t precision) {
    return to_int64(damount * double(pow(10, precision)));
}

asset calc_dest(double rate, asset src, symbol dest_symbol) {
    double src_damount = amount_to_damount(src.amount, src.symbol.precision());
    double dest_damount = src_damount * rate;
    int64_t dest_amount = damount_to_amount(dest_damount, dest_symbol.precision());

    return asset(dest_amount, dest_symbol);
}
