const reserveServices = require('./ammReserveServices')
var request = require('request-promise');
DFUSE_URL = 'https://mainnet.eos.dfuse.io/'

module.exports.getBalances = async function(options){
    let eos = options.eos
    let reserveAccount = options.reserveAccount
    let tokenSymbols = options.tokenSymbols
    let tokenContracts = options.tokenContracts

    let balances = []
    let arrayLength = tokenSymbols.length;
    for (var i = 0; i < arrayLength; i++) {
        let balanceRes = await eos.getCurrencyBalance({
            code: tokenContracts[i],
            account: reserveAccount,
            symbol: tokenSymbols[i]}
        )
        balances.push(parseFloat(balanceRes[0]))
    }
    return balances
}

module.exports.getEnabled = async function(options){
    let eos = options.eos
    let networkAccount = options.networkAccount

    let state = await eos.getTableRows({
        code:networkAccount,
        scope:networkAccount,
        table:"state",
        json: true
    })
    return state.rows[0].is_enabled
}

module.exports.getRate = async function(options) {
    eos = options.eos
    srcSymbol = options.srcSymbol
    destSymbol = options.destSymbol
    srcAmount = options.srcAmount
    networkAccount = options.networkAccount
    eosTokenAccount = options.eosTokenAccount
    srcPrecision = options.srcPrecision
    destPrecision = options.destPrecision

    let tokenSymbol = (srcSymbol == "EOS" ? destSymbol : srcSymbol)
    let tokenPrecision = (srcSymbol == "EOS" ? destPrecision : srcPrecision)
    let tokenFullSymbol = tokenPrecision + ',' + tokenSymbol
    let reservesReply = await eos.getTableRows({
        code: networkAccount,
        scope:networkAccount,
        table:"reservespert",
        json: true,
        lower_bound: tokenFullSymbol,
        upper_bound: tokenFullSymbol
    })
    let bestRate = 0
    for (var t = 0; t < reservesReply.rows.length; t++) {
        if (tokenSymbol == reservesReply.rows[t].symbol.split(",")[1]) {
            for (var i = 0; i < reservesReply.rows[t].reserve_contracts.length; i++) {
                reserveName = reservesReply.rows[t].reserve_contracts[i];
                currentRate = await reserveServices.getRate({
                    eos:eos,
                    reserveAccount:reserveName,
                    eosTokenAccount:eosTokenAccount,
                    srcSymbol:srcSymbol,
                    destSymbol:destSymbol,
                    srcAmount:srcAmount
                })
                if(currentRate > bestRate) {
                    bestRate = currentRate
                }
            }
            break;
        }
    }

    return bestRate
}

module.exports.getRates = async function(options) {
    eos = options.eos
    srcSymbols = options.srcSymbols
    destSymbols = options.destSymbols
    srcAmounts = options.srcAmounts
    networkAccount = options.networkAccount
    eosTokenAccount = options.eosTokenAccount

    let arrayLength = srcSymbols.length
    let ratesArray = []
    for (var i = 0; i < arrayLength; i++) {
        rate = await this.getRate({
            eos:eos,
            srcSymbol:srcSymbols[i],
            destSymbol:destSymbols[i],
            srcAmount:srcAmounts[i],
            networkAccount:networkAccount,
            eosTokenAccount:eosTokenAccount
        })
        ratesArray.push(rate)
    }
    return ratesArray
}

module.exports.trade = async function(options) {
    let eos = options.eos
    let networkAccount = options.networkAccount
    let userAccount = options.userAccount 
    let srcAmount = options.srcAmount
    let srcTokenAccount = options.srcTokenAccount
    let destTokenAccount = options.destTokenAccount
    let srcSymbol = options.srcSymbol
    let destPrecision = options.destPrecision
    let destSymbol = options.destSymbol
    let minConversionRate = options.minConversionRate

    let memo = `${destPrecision} ${destSymbol},${destTokenAccount},${minConversionRate}`
    let asset = `${srcAmount} ${srcSymbol}`

    const token = await eos.contract(srcTokenAccount);
    await token.transfer({from:userAccount, to:networkAccount, quantity:asset, memo:memo},
                         {authorization: [`${userAccount}@active`]});
}

module.exports.getUserBalance = async function(options){
    let eos = options.eos
    let account = options.account
    let symbol = options.symbol
    let tokenContract = options.tokenContract

    let balanceRes = await eos.getCurrencyBalance({
        code: tokenContract,
        account: account,
        symbol: symbol}
    )
    return parseFloat(balanceRes[0]);
}

module.exports.getVolume = async function(options){
    let dfuseKey = options.dfuseKey
    let blockNum = options.blockNum
    let networkContract = options.networkContract

    qs = {
        'accounts' : networkContract,
        'scope' : networkContract,
        'table' : 'tokenstats',
        'json' : 'true',
        'block_num' : blockNum
    }

    url = DFUSE_URL + 'v0/state/tables/accounts'
    options = {
        url: url,
        auth : {'bearer' : dfuseKey},
        qs : qs
    };

    res = await request(options);
    return res
}

module.exports.getBlockByDate = async function(options){
    let dfuseKey = options.dfuseKey
    let date = options.date // ISO format string

    url = DFUSE_URL + 'v0/block_id/by_time'
    options = {
            url: url,
            auth : {'bearer' : dfuseKey},
            qs : {
                'time' : date,
                'comparator' : 'gte'
            }
            
    };
    res = await request(options);
    return res
}

module.exports.getLastDaysVolume = async function getLastDaysVolume(options){
    dfuseKey = options.dfuseKey
    networkContract = options.networkContract
    days = options.days

    var current = new Date();
    var past = new Date();
    past.setDate(current.getDate() - days);

    // substract 10 seconds to avoid race condition with dfuse
    current.setSeconds(current.getSeconds() - 10);
    past.setSeconds(past.getSeconds() - 10);

    // convert to ISO string
    currentDate = current.toISOString();
    pastDate = past.toISOString();

    // get current block num
    res = await this.getBlockByDate({
        dfuseKey:dfuseKey,
        date:currentDate
    })
    let currentBlockNum = JSON.parse(res)["block"]["num"]

    // get past block num
    res = await this.getBlockByDate({
        dfuseKey:KEY,
        date:pastDate
    })
    let pastBlockNum = JSON.parse(res)["block"]["num"]

    // get current volume
    currentVolume = await this.getVolume({
        dfuseKey:KEY,
        blockNum: currentBlockNum,
        networkContract:networkContract
    })

    // get past volume
    pastVolume = await this.getVolume({
        dfuseKey:KEY,
        blockNum: pastBlockNum,
        networkContract:networkContract
    })

    // calculate volume diff per token
    compare = {}
    totalDiffEos = 0
    currentTokenDataList = JSON.parse(currentVolume)["tables"][0]["rows"]
    pastTokenDataList = JSON.parse(pastVolume)["tables"][0]["rows"]
    for (i in currentTokenDataList) {
        currentTokenData = currentTokenDataList[i]
        symbol = currentTokenData["json"]["token_counter"].split(" ")[1]

        currentEos = currentTokenData["json"]["eos_counter"].split(" ")[0]
        currentTokens = currentTokenData["json"]["token_counter"].split(" ")[0]

        pastEos = 0
        pastTokens = 0
        for (i in pastTokenDataList) {
            pastTokenData = pastTokenDataList[i]
            if (symbol == pastTokenData["json"]["token_counter"].split(" ")[1]) {
                pastEos = pastTokenData["json"]["eos_counter"].split(" ")[0]
                pastTokens = pastTokenData["json"]["token_counter"].split(" ")[0]
            }
        }

        diffEos = parseFloat(currentEos) - parseFloat(pastEos)
        totalDiffEos += diffEos
        diffTokens = parseFloat(currentTokens) - parseFloat(pastTokens)
        compare[symbol] = {"tokens" : diffTokens, "eos" : diffEos}
    }
    compare["total_eos"] = totalDiffEos
    compare["from"] = currentDate
    compare["to"] = pastDate

    return compare
}