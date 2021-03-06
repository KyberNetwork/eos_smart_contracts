/////////// exported functions /////////// 

module.exports.getRate = async function(options) {
    eos = options.eos
    reserveAccount = options.reserveAccount
    eosTokenAccount = options.eosTokenAccount
    srcSymbol = options.srcSymbol
    destSymbol = options.destSymbol
    srcAmount = options.srcAmount
    destAmount = 0;

    let params = await getParams(eos, reserveAccount);
    let currentParams = {
        r:              parseFloat(params["rows"][0]["r"]),
        pMin:           parseFloat(params["rows"][0]["p_min"]),
        maxEosCapBuy:   parseFloat(params["rows"][0]["max_eos_cap_buy"].split(" ")[0]),
        maxEosCapSell:  parseFloat(params["rows"][0]["max_eos_cap_buy"].split(" ")[0]),
        profitPercent:  parseFloat(params["rows"][0]["profit_percent"]),
        ramFee:         parseFloat(params["rows"][0]["ram_fee"]),
        maxBuyRate:     parseFloat(params["rows"][0]["max_buy_rate"]),
        minBuyRate:     parseFloat(params["rows"][0]["min_buy_rate"]),
        maxSellRate:    parseFloat(params["rows"][0]["max_sell_rate"]),
        minSellRate:    parseFloat(params["rows"][0]["min_sell_rate"])
    }

    let e = await getReserveEos(eos, reserveAccount, eosTokenAccount);
    let rate

    buy = (srcSymbol == "EOS")

    if (!srcAmount) {
        p = pOfE(currentParams.r, currentParams.pMin, e)
        preProfitRate = buy ? (1 / p) : p;
        rate = ((100.0 - currentParams.profitPercent) * preProfitRate) / 100.0; 
    } else {
        if (buy) {
            chargedFee = (currentParams.profitPercent * srcAmount) / 100.0;
            if (currentParams.ramFee >= (srcAmount - chargedFee)) {
                chargedFee = 0;
                return 0;
            }
            chargedFee += currentParams.ramFee;
            destAmount = deltaTFunc(currentParams, e, srcAmount - chargedFee);
        } else {
            deltaE = deltaEFunc(currentParams, e, srcAmount);
            chargedFee = (currentParams.profitPercent * deltaE) / 100.0;
            destAmount = deltaE - chargedFee;
        }
        rate = destAmount / srcAmount;
    }

    if (buy) {
        if (srcAmount > currentParams.maxEosCapBuy) return 0;
    } else {
        if (destAmount > currentParams.maxEosCapSell) return 0;
    }

    return rateAfterValidation(currentParams, rate, buy);
}

/////////// internal function /////////// 

function deltaTFunc(currentParams, e, deltaE) {
    return (-1.0) *
           (Math.exp((-currentParams.r) * deltaE) - 1.0) /
           (currentParams.r * pOfE(currentParams.r, currentParams.pMin, e));
}
function deltaEFunc(currentParams, e, deltaT) {
    return Math.log(1.0 + currentParams.r * pOfE(currentParams.r, currentParams.pMin, e) * deltaT) / 
           currentParams.r;
}

function pOfE(r, pMin, e) {
    return pMin * Math.exp(r * e); 
}

function rateAfterValidation(currentParams, rate, isBuy) {
    let minAllowedRate, maxAllowedRate;

    if (isBuy) {
        minAllowedRate = currentParams.minBuyRate;
        maxAllowedRate = currentParams.maxBuyRate;
    } else {
        minAllowedRate = currentParams.minSellRate;
        maxAllowedRate = currentParams.maxSellRate;
    }

    if ((rate > maxAllowedRate) || (rate < minAllowedRate)) return 0;
    return rate;
}

async function getParams(eos, reserveAccount) {
    let params = await eos.getTableRows({
        code: reserveAccount,
        scope:reserveAccount,
        table:"params",
        json: true
    })
    return params;
}

async function getReserveEos(eos, reserveAccount, eosTokenAccount) {
    let balanceRes = await eos.getCurrencyBalance({
        code: eosTokenAccount,
        account: reserveAccount,
        symbol: 'EOS'}
    )
    let reserveEos = parseFloat(balanceRes[0])

    return reserveEos; 
}