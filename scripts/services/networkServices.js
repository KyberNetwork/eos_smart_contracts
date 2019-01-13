const reserveServices = require('./ammReserveServices')

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

    let reservesReply = await eos.getTableRows({
        code: networkAccount,
        scope:networkAccount,
        table:"reservespert",
        json: true
    })

    let bestRate = 0
    let tokenSymbol = (srcSymbol == "EOS" ? destSymbol : srcSymbol)
    for (var t = 0; t < reservesReply.rows.length; t++) { 
        if (tokenSymbol == reservesReply.rows[t].symbol.substring(2)) {
            for (var i = 0; i < reservesReply.rows[t].num_reserves; i++) {
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
    // TODO: missing slippageRate handling

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
    let srcPrecision = options.srcPrecision
    let srcTokenAccount = options.srcTokenAccount
    let srcSymbol = options.srcSymbol
    let destPrecision = options.destPrecision
    let destSymbol = options.destSymbol
    let destTokenAccount = options.destTokenAccount
    let destAccount = options.destAccount
    let maxDestAmount = options.maxDestAmount
    let minConversionRate = options.minConversionRate
    let walletId = options.walletId
    let hint = options.hint

    let memo = `${userAccount},${srcTokenAccount},${srcPrecision} ${srcSymbol},` +
               `${destTokenAccount},${destPrecision} ${destSymbol},${destAccount},` +
               `${maxDestAmount},${minConversionRate},${walletId},${hint}`
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