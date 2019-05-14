const Eos = require('eosjs')
const networkServices = require('../scripts/services/networkServices')

const networkAccount = "yolonetworkx"
const eos = Eos({
    keyProvider: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3",
    httpEndpoint: 'https://api.eossweden.se',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
});

async function main() {

    dict = { "network_tables" : {}, "reserves_stats" : {} }
    summary = { "reserves_stats" : {}, "tokenstats" : {} }

    tables = ["tokenstats", "state", "reserve", "reservespert"]
    for (i in tables) {
        dict["network_tables"][tables[i]] = await eos.getTableRows({code: networkAccount, scope:networkAccount, table:tables[i], json: true})
    }

    reserves = dict["network_tables"]["reserve"]["rows"]
    tables = ["state", "params"]
    for (i in reserves) {
        reserve = reserves[i]["contract"]
        dict["reserves_stats"][reserve] = {}
        summary["reserves_stats"][reserve] = {}

        for (j in tables) {
            dict["reserves_stats"][reserve][tables[j]] = await eos.getTableRows({code: reserve, scope:reserve, table:tables[j], json: true})
        }
        tokenContract = dict["reserves_stats"][reserve]["state"]["rows"][0]["token_contract"]
        tokenSymbol = dict["reserves_stats"][reserve]["state"]["rows"][0]["token_symbol"].split(",")[1]
        minSellRate = dict["reserves_stats"][reserve]["params"]["rows"][0]["min_sell_rate"]

        eosRes = await eos.getCurrencyBalance({code: "eosio.token", account: reserve, symbol: "EOS"})
        tokensRes = await eos.getCurrencyBalance({code: tokenContract, account: reserve, symbol: tokenSymbol})

        let sellRate = await networkServices.getRate({
            eos:eos,
            srcSymbol:tokenSymbol,
            destSymbol:"EOS",
            srcAmount:0,
            networkAccount:networkAccount,
            eosTokenAccount:"eosio.token"
        })

       rateFloat = parseFloat(sellRate)
       minRateFloat = parseFloat(minSellRate)
       rateRatio = rateFloat / (minRateFloat * 2)

       summary["reserves_stats"][reserve]["eos"] =  eosRes[0]
       summary["reserves_stats"][reserve]["tokens"] =  tokensRes[0]
       summary["reserves_stats"][reserve]["rate_ratio"] =  rateRatio
    }

    summary["tokenstats"] = dict["network_tables"]["tokenstats"]
    console.log(JSON.stringify(summary, null, 4))
}

main()