/////////// exported functions /////////// 

module.exports.getRate = async function(options) {
    eos = options.eos
    reserveAccount = options.reserveAccount
    eosTokenAccount = options.eosTokenAccount
    srcSymbol = options.srcSymbol
    destSymbol = options.destSymbol
    srcAmount = options.srcAmount

    let params = await getParams(eos, reserveAccount);
    let currentParams = {
        r:              parseFloat(params["rows"][0]["r"]),
        pMin:           parseFloat(params["rows"][0]["p_min"]),
        maxEosCapBuy:   parseFloat(params["rows"][0]["max_eos_cap_buy"].split(" ")[0]),
        maxEosCapSell:  parseFloat(params["rows"][0]["max_eos_cap_buy"].split(" ")[0]),
        profitPercent:     parseFloat(params["rows"][0]["profit_percent"]),
        maxBuyRate:     parseFloat(params["rows"][0]["max_buy_rate"]),
        minBuyRate:     parseFloat(params["rows"][0]["min_buy_rate"]),
        maxSellRate:    parseFloat(params["rows"][0]["max_sell_rate"]),
        minSellRate:    parseFloat(params["rows"][0]["min_sell_rate"])
    }

    let e = await getReserveEos(eos, reserveAccount, eosTokenAccount);

    let rate
    let deltaE
    let deltaT;

    isBuy = (srcSymbol == "EOS")
    if (isBuy) {
        deltaE = srcAmount;
        if (srcAmount > currentParams.maxEosCapBuy) return 0;
        rate = (deltaE == 0) ? buyRateZeroQuantity(currentParams, e) :
                               buyRate(currentParams, e, deltaE)
    } else {
        deltaT = valueAfterReducingprofit(currentParams, srcAmount);
        if (deltaT == 0) {
            rate = sellRateZeroQuantity(currentParams, e)
            deltaE = 0
        } else {
            rateAnddeltaE = sellRate(currentParams, e, srcAmount, deltaT);
            rate = rateAnddeltaE[0]
            deltaE = rateAnddeltaE[1]
        }
        if (deltaE > currentParams.maxEosCapSell) return 0;
    }
    return rateAfterValidation(currentParams, rate, isBuy);
}

/////////// internal function /////////// 

function buyRate(currentParams, e, deltaE) {
    let deltaT = deltaTFunc(currentParams, e, deltaE);
    deltaT = valueAfterReducingprofit(currentParams, deltaT);
    return deltaT / deltaE;
}

function buyRateZeroQuantity(currentParams, e) {
    let ratePreReduction = 1 / pOfE(currentParams.r, currentParams.pMin, e);
    return valueAfterReducingprofit(currentParams, ratePreReduction);
}

function sellRate(currentParams, e, srcAmount, deltaT) {
    let deltaE = deltaEFunc(currentParams, e, deltaT);
    let rate = deltaE / srcAmount;
    return [rate, deltaE]
}

function sellRateZeroQuantity(currentParams, e) {
    let ratePreReduction = pOfE(currentParams.r, currentParams.pMin, e);
    return valueAfterReducingprofit(currentParams, ratePreReduction);
}

function valueAfterReducingprofit(currentParams, value) {
    return ((100.0 - currentParams.profitPercent) * value) / 100.0;
}

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