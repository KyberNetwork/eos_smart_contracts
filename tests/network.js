const fs = require('fs')
const Eos = require('eosjs')
const BigNumber = require('bignumber.js');
const path = require('path');
const assert = require('chai').should();
const Math = require('math')

//TIDO - move to utils module
function roundDown(number, decimals) {
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}


const { ensureContractAssertionError, snooze, getUserBalance, renouncePermToOnlyCode } = require('./utils');
const networkServices = require('../scripts/services/networkServices')

const AMOUNT_PRECISON = 0.0001
const RATE_PRECISON =   0.00000001

/* Assign keypairs. to accounts. Use unique name prefixes to prevent collisions between test modules. */
const keyPairArray = JSON.parse(fs.readFileSync("tests/keys.json"))
const tokenData =         {account: "nettoken",   publicKey: keyPairArray[0][0], privateKey: keyPairArray[0][1]}

const reserve1Data =      {account: "netreserve1", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve1OwnerData = {account: "netowner1",   publicKey: keyPairArray[2][0], privateKey: keyPairArray[2][1]}
const reserve2Data =      {account: "netreserve2", publicKey: keyPairArray[3][0], privateKey: keyPairArray[3][1]}
const reserve2OwnerData = {account: "netowner2",   publicKey: keyPairArray[4][0], privateKey: keyPairArray[4][1]}
const reserve3Data =      {account: "netreserve3", publicKey: keyPairArray[3][0], privateKey: keyPairArray[3][1]}
const reserve3OwnerData = {account: "netowner3",   publicKey: keyPairArray[4][0], privateKey: keyPairArray[4][1]}

const aliceData =         {account: "netalice",   publicKey: keyPairArray[5][0], privateKey: keyPairArray[5][1]}
const mosheData =         {account: "netmoshe",   publicKey: keyPairArray[6][0], privateKey: keyPairArray[6][1]}
const networkData =       {account: "netnetwork", publicKey: keyPairArray[7][0], privateKey: keyPairArray[7][1]}
const networkOwnerData =  {account: "netowner", publicKey: keyPairArray[8][0], privateKey: keyPairArray[8][1]}

const systemData =  {account: "eosio",      publicKey: "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV", privateKey: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3"}

/* create eos handler objects */
systemData.eos = Eos({ keyProvider: systemData.privateKey /* , verbose: 'false' */})
tokenData.eos = Eos({ keyProvider: tokenData.privateKey /* , verbose: 'false' */})
reserve1Data.eos = Eos({ keyProvider: reserve1Data.privateKey /* , verbose: 'false' */})
reserve1OwnerData.eos = Eos({ keyProvider: reserve1OwnerData.privateKey /* , verbose: 'false' */})
reserve2Data.eos = Eos({ keyProvider: reserve2Data.privateKey /* , verbose: 'false' */})
reserve2OwnerData.eos = Eos({ keyProvider: reserve2OwnerData.privateKey /* , verbose: 'false' */})
reserve3Data.eos = Eos({ keyProvider: reserve3Data.privateKey /* , verbose: 'false' */})
reserve3OwnerData.eos = Eos({ keyProvider: reserve3OwnerData.privateKey /* , verbose: 'false' */})
aliceData.eos = Eos({ keyProvider: aliceData.privateKey /* , verbose: 'false' */})
mosheData.eos = Eos({ keyProvider: mosheData.privateKey /* , verbose: 'false' */})
networkData.eos = Eos({ keyProvider: networkData.privateKey /* , verbose: 'false' */})
networkOwnerData.eos = Eos({ keyProvider: networkOwnerData.privateKey /* , verbose: 'false' */})

before("setup accounts, contracts and initial funds", async () => {
    /* create accounts */
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:tokenData.account, owner: tokenData.publicKey, active: tokenData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve1Data.account, owner: reserve1Data.publicKey, active: reserve1Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve2Data.account, owner: reserve2Data.publicKey, active: reserve2Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve3Data.account, owner: reserve3Data.publicKey, active: reserve3Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:aliceData.account, owner: aliceData.publicKey, active: aliceData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:mosheData.account, owner: mosheData.publicKey, active: mosheData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:networkData.account, owner: networkData.publicKey, active: networkData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve1OwnerData.account, owner: reserve1OwnerData.publicKey, active: reserve1OwnerData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve2OwnerData.account, owner: reserve2OwnerData.publicKey, active: reserve2OwnerData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve3OwnerData.account, owner: reserve3OwnerData.publicKey, active: reserve3OwnerData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:networkOwnerData.account, owner: networkOwnerData.publicKey, active: networkOwnerData.publicKey})});

    /* deploy contracts */
    await tokenData.eos.setcode(tokenData.account, 0, 0, fs.readFileSync(`contracts/Token/Token.wasm`));
    await tokenData.eos.setabi(tokenData.account, JSON.parse(fs.readFileSync(`contracts/Token/Token.abi`)))
    await reserve1Data.eos.setcode(reserve1Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve1Data.eos.setabi(reserve1Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await reserve2Data.eos.setcode(reserve2Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve2Data.eos.setabi(reserve2Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await reserve3Data.eos.setcode(reserve3Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve3Data.eos.setabi(reserve3Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))

    await networkData.eos.setcode(networkData.account, 0, 0, fs.readFileSync(`contracts/Network/Network.wasm`));
    await networkData.eos.setabi(networkData.account, JSON.parse(fs.readFileSync(`contracts/Network/Network.abi`)))

    /* spread initial funds */
    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 SYS', {authorization: tokenData.account})
        myaccount.issue(reserve1Data.account, '100.0000 SYS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '100.0000 SYS', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.000 TOKA', {authorization: tokenData.account})
        myaccount.issue(reserve2Data.account, '1000.000 TOKA', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '1000.000 TOKA', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.00 TOKB', {authorization: tokenData.account})
        myaccount.issue(reserve3Data.account, '1000.00 TOKB', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '1000.00 TOKB', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 EOS', {authorization: tokenData.account})
        myaccount.issue(reserve1Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve2Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve3Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
    })



    /* init reserves, setparams */
    const reserve1 = await reserve1Data.eos.contract(reserve1Data.account);
    await reserve1.init({
        owner: reserve1OwnerData.account,
        network_contract: networkData.account,
        token_symbol: "4,SYS",
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve1Data.account}@active`});

    const reserve2 = await reserve2Data.eos.contract(reserve2Data.account);
    await reserve2.init({
        owner: reserve2OwnerData.account,
        network_contract: networkData.account,
        token_symbol: "3,TOKA",
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve2Data.account}@active`});

    const reserve3 = await reserve3Data.eos.contract(reserve3Data.account);
    await reserve3.init({
        owner: reserve3OwnerData.account,
        network_contract: networkData.account,
        token_symbol: "2,TOKB",
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve3Data.account}@active`});

    /* after init reserves (from reserve contract), renounce permission */
    await renouncePermToOnlyCode(reserve1Data.eos, reserve1Data.account)
    await renouncePermToOnlyCode(reserve2Data.eos, reserve2Data.account)
    await renouncePermToOnlyCode(reserve3Data.eos, reserve3Data.account)

    /*set reserve params */
    const reserve1AsOwner = await reserve1OwnerData.eos.contract(reserve1Data.account);
    await reserve1AsOwner.setparams({
        r: "0.01",
        p_min: "0.05",
        max_eos_cap_buy: "20.0000 EOS",
        max_eos_cap_sell: "20.0000 EOS",
        fee_percent: "0.25",
        max_sell_rate: "0.5555",
        min_sell_rate: "0.00000555"
        },{authorization: `${reserve1OwnerData.account}@active`});

    const reserve2AsOwner = await reserve2OwnerData.eos.contract(reserve2Data.account);
    await reserve2AsOwner.setparams({
        r: "0.01",
        p_min: "0.05",
        max_eos_cap_buy: "20.0000 EOS",
        max_eos_cap_sell: "20.0000 EOS",
        fee_percent: "0.25",
        max_sell_rate: "0.5555",
        min_sell_rate: "0.00000555"
        },{authorization: `${reserve2OwnerData.account}@active`});

    const reserve3AsOwner = await reserve3OwnerData.eos.contract(reserve3Data.account);
    await reserve3AsOwner.setparams({
        r: "0.01",
        p_min: "0.05",
        max_eos_cap_buy: "20.0000 EOS",
        max_eos_cap_sell: "20.0000 EOS",
        fee_percent: "0.25",
        max_sell_rate: "0.5555",
        min_sell_rate: "0.00000555"
        },{authorization: `${reserve3OwnerData.account}@active`});

    /* network configurations */

    /* init network */
    const network = await networkData.eos.contract(networkData.account);
    await network.init({owner:networkOwnerData.account, eos_contract:tokenData.account, enable:1},{authorization: `${networkData.account}@active`});

    /* after init network, renounce permission */
    await renouncePermToOnlyCode(networkData.eos, networkData.account)

    const networkAsOwner = await networkOwnerData.eos.contract(networkData.account);
    await networkAsOwner.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${networkOwnerData.account}@active`});
    await networkAsOwner.addreserve({reserve:reserve2Data.account, add:1},{authorization: `${networkOwnerData.account}@active`});
    await networkAsOwner.addreserve({reserve:reserve3Data.account, add:1},{authorization: `${networkOwnerData.account}@active`});
    await networkAsOwner.listpairres({add: 1, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},
                                     {authorization: `${networkOwnerData.account}@active`});
    await networkAsOwner.listpairres({add: 1, reserve:reserve2Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},
                                     {authorization: `${networkOwnerData.account}@active`});
    await networkAsOwner.listpairres({add: 1, reserve:reserve3Data.account, token_symbol:"2,TOKB", token_contract:tokenData.account},
                                     {authorization: `${networkOwnerData.account}@active`});

})

describe('As owner', () => {
});

describe('as non owner', () => {
    it('buy token with precision 4', async function() {
        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'SYS', tokenContract:tokenData.account, eos:mosheData.eos})

        let calcRate = await networkServices.getRate({
            eos:networkData.eos,
            srcSymbol:'EOS',
            destSymbol:'SYS',
            srcAmount:2.0132,
            networkAccount:networkData.account,
            eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        await networkServices.trade({
            eos:aliceData.eos,
            networkAccount:networkData.account,
            userAccount:aliceData.account, 
            srcAmount:"2.0132",
            srcTokenAccount:tokenData.account,
            srcSymbol:"EOS",
            destPrecision:4,
            destSymbol:"SYS",
            destAccount:mosheData.account,
            minConversionRate:"0.000001"
        })

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'SYS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
    });
    it('sell token with precision 4', async function() {
        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

        let calcRate = await networkServices.getRate({
            eos:networkData.eos,
            srcSymbol:'SYS',
            destSymbol:'EOS',
            srcAmount:1.3678,
            networkAccount:networkData.account,
            eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        await networkServices.trade({
            eos:aliceData.eos,
            networkAccount:networkData.account,
            userAccount:aliceData.account, 
            srcAmount:"1.3678",
            srcTokenAccount:tokenData.account,
            srcSymbol:"SYS",
            destPrecision:4,
            destSymbol:"EOS",
            destAccount:mosheData.account,
            minConversionRate:"0.000001"
        })

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore

        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
    });
    it('buy token with precision 3', async function() {
        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:mosheData.eos})

        let calcRate = await networkServices.getRate({
            eos:networkData.eos,
            srcSymbol:"EOS",
            destSymbol:"TOKA",
            srcAmount:1.1134,
            networkAccount:networkData.account,
            eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        await networkServices.trade({
            eos:aliceData.eos,
            networkAccount:networkData.account,
            userAccount:aliceData.account, 
            srcAmount:1.1134,
            srcTokenAccount:tokenData.account,
            srcSymbol:"EOS",
            destPrecision:3,
            destSymbol:"TOKA",
            destAccount:mosheData.account,
            minConversionRate:"0.000001"
        })
        return

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
    })
    it('sell token with precision 3', async function() {
        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

        let calcRate = await networkServices.getRate({
            eos:networkData.eos,
            srcSymbol:'TOKA',
            destSymbol:'EOS',
            srcAmount:1.367,
            networkAccount:networkData.account,
            eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        await networkServices.trade({
            eos:aliceData.eos,
            networkAccount:networkData.account,
            userAccount:aliceData.account, 
            srcAmount:"1.367",
            srcTokenAccount:tokenData.account,
            srcSymbol:"TOKA",
            destPrecision:4,
            destSymbol:"EOS",
            destAccount:mosheData.account,
            minConversionRate:"0.000001"
        })

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore

        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);

    })
    it('buy token with precision 2', async function() {
        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'TOKB', tokenContract:tokenData.account, eos:mosheData.eos})

        let calcRate = await networkServices.getRate({
            eos:networkData.eos,
            srcSymbol:"EOS",
            destSymbol:"TOKB",
            srcAmount:1.1103,
            networkAccount:networkData.account,
            eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;
        calcDestAmount = roundDown(calcDestAmount,2) // TO - should we do the same in other cases?

        await networkServices.trade({
            eos:aliceData.eos,
            networkAccount:networkData.account,
            userAccount:aliceData.account, 
            srcAmount:1.1103,
            srcTokenAccount:tokenData.account,
            srcSymbol:"EOS",
            destPrecision:2,
            destSymbol:"TOKB",
            destAccount:mosheData.account,
            minConversionRate:"0.000001"
        })

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'TOKB', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
    })
    xit('sell token with precision 2', async function() {})

});

