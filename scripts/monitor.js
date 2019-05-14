const fs = require("fs");
const Eos = require('eosjs')
const networkServices = require('../scripts/services/networkServices')

const networkAccount = "yolonetworkx"
const eos = Eos({
    keyProvider: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3",
    httpEndpoint: 'https://api.eossweden.se',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
});

async function status() {

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
    return summary
}

async function compare(data1, data2) {

    tokenstats1 = data1["tokenstats"]["rows"]
    tokenstats2 = data2["tokenstats"]["rows"]
    
    diffDict = {}
    
    for (i in tokenstats1) {
        symbol1 = tokenstats1[i]["token_counter"].split(" ")[1]
        for (j in tokenstats2) {
            symbol2 = tokenstats2[j]["token_counter"].split(" ")[1]
            if (symbol1 == symbol2) {
                eos1 = tokenstats1[i]["eos_counter"].split(" ")[0]
                eos2 = tokenstats2[j]["eos_counter"].split(" ")[0]
                diff = parseFloat(eos2) - parseFloat(eos1)
                diffDict[symbol1] = diff
                break
            }
        }
    }
    return diffDict
}

const { mode, file1, file2 } = require('yargs')
.usage('Usage: $0 --mode [mode] --file1 [file1] --file2 [file2]')
.demandOption(['mode'])
.argv;

async function main() {
    if (mode == "status") {
        output = await status();
    } else if (mode == "compare_status") {
        status = await status()
        oldData = JSON.parse(fs.readFileSync(file1, 'utf8'));
        output = await compare(oldData, status)
    } else if (mode == "compare_files") {
        oldData1 = JSON.parse(fs.readFileSync(file1, 'utf8'));
        oldData2 = JSON.parse(fs.readFileSync(file2, 'utf8'));
        output = await compare(oldData1, oldData2)
    } else {
        throw "invalid mode"
    }
    console.log(JSON.stringify(output, null, 4))
}

main()

// examples:
// node scripts/monitor.js --mode status > yolo_stats_$(date +"%Y_%m_%d_%H_%M").log
// node scripts/monitor.js --mode compare_status --file1 yolo_stats_2019_05_14_11_27.log 
// node scripts/monitor.js --mode compare_files  --file1 yolo_stats_2019_05_14_11_27.log --file2 yolo_stats_2019_05_14_18_31.log


