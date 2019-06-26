const fs = require('fs')
const Eos = require('eosjs')
const BigNumber = require('bignumber.js');
const path = require('path');
const should = require('chai').should();
const assert = require('assert');

const {ensureContractAssertionError, snooze, getUserBalance,
       renouncePermToOnlyCode, addCodeToPerm, roundDown} = require('./utils');
const networkServices = require('../scripts/services/networkServices')

const AMOUNT_PRECISON = 0.0001
const RATE_PRECISON =   0.00000001

/* Assign keypairs. to accounts. Use unique name prefixes to prevent collisions between test modules. */
const keyPairArray = JSON.parse(fs.readFileSync("tests/keys.json"))
const tokenData =    {account: "rebtoken",   publicKey: keyPairArray[0][0], privateKey: keyPairArray[0][1]}
const reserveData =  {account: "rebreserve", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const networkData =  {account: "rebnetwork", publicKey: keyPairArray[2][0], privateKey: keyPairArray[2][1]}
const rebateData =   {account: "reblistener",publicKey: keyPairArray[3][0], privateKey: keyPairArray[3][1]}

// alice pattern is     v,v,v..v,v
const aliceData =    {account: "rebalice",   publicKey: keyPairArray[4][0], privateKey: keyPairArray[4][1]}

// moshe pattern is     x,v,v..x,x
const mosheData =    {account: "rebmoshe",   publicKey: keyPairArray[5][0], privateKey: keyPairArray[5][1]}

//yosi pattern is     v,x,v..x,x
const yosiData =    {account: "rebyosi",   publicKey: keyPairArray[6][0], privateKey: keyPairArray[6][1]}

const walletData =   {account: "rebwallet",  publicKey: keyPairArray[7][0], privateKey: keyPairArray[7][1]}
const systemData =  {account: "eosio", publicKey: "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV", privateKey: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3"}

/* create eos handler objects */
systemData.eos = Eos({ keyProvider: systemData.privateKey /* , verbose: 'false' */})
tokenData.eos = Eos({ keyProvider: tokenData.privateKey /* , verbose: 'false' */})
reserveData.eos = Eos({ keyProvider: reserveData.privateKey /* , verbose: 'false' */})
networkData.eos = Eos({ keyProvider: networkData.privateKey /* , verbose: 'false' */})
rebateData.eos = Eos({ keyProvider: rebateData.privateKey /* , verbose: 'false' */})
aliceData.eos = Eos({ keyProvider: aliceData.privateKey /* , verbose: 'false' */})
mosheData.eos = Eos({ keyProvider: mosheData.privateKey /* , verbose: 'false' */})
yosiData.eos = Eos({ keyProvider: yosiData.privateKey /* , verbose: 'false' */})
walletData.eos = Eos({ keyProvider: walletData.privateKey /* , verbose: 'false' */})


let defaultParams

describe(path.basename(__filename), function () {
before("setup accounts, contracts and initial funds", async () => {
    /* create accounts */
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:tokenData.account, owner: tokenData.publicKey, active: tokenData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserveData.account, owner: reserveData.publicKey, active: reserveData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:networkData.account, owner: networkData.publicKey, active: networkData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:rebateData.account, owner: rebateData.publicKey, active: rebateData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:aliceData.account, owner: aliceData.publicKey, active: aliceData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:mosheData.account, owner: mosheData.publicKey, active: mosheData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:yosiData.account, owner: yosiData.publicKey, active: yosiData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:walletData.account, owner: walletData.publicKey, active: walletData.publicKey})});

    /* deploy contracts */
    await tokenData.eos.setcode(tokenData.account, 0, 0, fs.readFileSync(`contracts/Mock/Token/Token.wasm`));
    await tokenData.eos.setabi(tokenData.account, JSON.parse(fs.readFileSync(`contracts/Mock/Token/Token.abi`)))
    await reserveData.eos.setcode(reserveData.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserveData.eos.setabi(reserveData.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await networkData.eos.setcode(networkData.account, 0, 0, fs.readFileSync(`contracts/Network/Network.wasm`));
    await networkData.eos.setabi(networkData.account, JSON.parse(fs.readFileSync(`contracts/Network/Network.abi`)))
    await rebateData.eos.setcode(rebateData.account, 0, 0, fs.readFileSync(`contracts/Listener/Rebate.wasm`));
    await rebateData.eos.setabi(rebateData.account, JSON.parse(fs.readFileSync(`contracts/Listener/Rebate.abi`)))

    /* create contract objects */
    networkAsNetwork = await networkData.eos.contract(networkData.account);
    networkAsAlice = await aliceData.eos.contract(networkData.account);
    networkAsMoshe = await mosheData.eos.contract(networkData.account);
    networkAsYosi = await yosiData.eos.contract(networkData.account);   
    reserve = await reserveData.eos.contract(reserveData.account);
    rebate = await rebateData.eos.contract(rebateData.account);

    /* spread initial funds */
    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 TOK', {authorization: tokenData.account})
        myaccount.issue(reserveData.account, '10000.0000 TOK', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '100.0000 TOK', 'deposit', {authorization: tokenData.account})
        myaccount.issue(mosheData.account, '100.0000 TOK', 'deposit', {authorization: tokenData.account})
        myaccount.issue(yosiData.account, '100.0000 TOK', 'deposit', {authorization: tokenData.account})
        myaccount.issue(rebateData.account, '100.0000 TOK', 'deposit', {authorization: tokenData.account})
    })

    /* spread rebate funds */
    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 TOKA', {authorization: tokenData.account})
        myaccount.issue(rebateData.account, '100.0000 TOKA', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 EOS', {authorization: tokenData.account})
        myaccount.issue(networkData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(rebateData.account, '10000.0000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserveData.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(mosheData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(yosiData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
    })

    /* init reserves, setparams */
    await reserve.init({
        token_symbol: "4,TOK",
        admin: reserveData.account,
        network_contract: networkData.account,
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserveData.account}@active`});


    /*set reserve params */
    defaultParams = {
        r: "0.01",
        p_min: "0.05",
        max_eos_cap_buy: "20.0000 EOS",
        max_eos_cap_sell: "20.0000 EOS",
        profit_percent: "0.25",
        ram_fee: "0.0",
        max_sell_rate: "0.5555",
        min_sell_rate: "0.00000555",
        fee_wallet: walletData.account
    }

    await reserve.setparams(defaultParams,{authorization: `${reserveData.account}@active`});
    /* network configurations */

    /* init network */
    await networkAsNetwork.init({admin:networkData.account, eos_contract:tokenData.account, listener:rebateData.account, enable:1},{authorization: `${networkData.account}@active`});

    await networkAsNetwork.addreserve({reserve:reserveData.account, add:1},{authorization: `${networkData.account}@active`});
    await networkAsNetwork.listpairres({add: 1, reserve:reserveData.account, token_symbol:"4,TOK", token_contract:tokenData.account},{authorization: `${networkData.account}@active`});

    /* config rebate */
    await rebate.config({network_contract:networkData.account,
                         token_contract:tokenData.account,
                         default_reward:"1.0000 TOKA",
                         round_seconds: 3 },
                        {authorization: `${rebateData.account}@active`})

    /* renounce reserve control */
    addCodeToPerm(networkData.eos, networkData.account);
    addCodeToPerm(rebateData.eos, rebateData.account);
    addCodeToPerm(reserveData.eos, reserveData.account);
})

describe('in first period', () => {
    it('rebate is returned on first trade', async function() { // alice + yosi
        tokenBefore = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})

        token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"5.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        tokenAfter = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 1);
        
        //// trade also from yosi, to support later test cases:
        
        tokenBefore = await getUserBalance({account:yosiData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})

        token = await yosiData.eos.contract(tokenData.account);
        await token.transfer({
            from:yosiData.account,
            to:networkData.account,
            quantity:"5.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${yosiData.account}@active`]});
        
        tokenAfter = await getUserBalance({account:yosiData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:yosiData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 1);
    })
    it('rebate is not returned on second trade in same period', async function() { // alice
        const tokenBefore = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"3.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        const tokenAfter = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 0);
    })
});

describe('in second period', () => {
    it('double rebate is returned if traded in first and second period', async function(){ // alice
        await snooze(3000);

        const tokenBefore = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"6.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        const tokenAfter = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 2);
    });
    it('regular rebate is returned if traded only in second period', async function(){ // moshe
        tokenBefore = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        token = await mosheData.eos.contract(tokenData.account);
        await token.transfer({
            from:mosheData.account,
            to:networkData.account,
            quantity:"1.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${mosheData.account}@active`]});
        
        tokenAfter = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:mosheData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 1);
    });
    it('rebate is not returned on second trade in same period', async function() {  // moshe
        tokenBefore = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        token = await mosheData.eos.contract(tokenData.account);
        await token.transfer({
            from:mosheData.account,
            to:networkData.account,
            quantity:"2.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${mosheData.account}@active`]});
        
        tokenAfter = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:mosheData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 0);
    });
});

describe('in third period', () => {
    it('triple rebate is returned if traded in first, second and third period', async function(){ // alice
        await snooze(3000);

        const tokenBefore = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"6.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        const tokenAfter = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 3);
    });
    it('regular rebate is returned if traded only in first period', async function() { // yosi
        tokenBefore = await getUserBalance({account:yosiData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})

        token = await yosiData.eos.contract(tokenData.account);
        await token.transfer({
            from:yosiData.account,
            to:networkData.account,
            quantity:"5.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${yosiData.account}@active`]});
        
        tokenAfter = await getUserBalance({account:yosiData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:yosiData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 1);
    });
    it('double rebate is returned if traded only in second period', async function() {  // moshe
        tokenBefore = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        token = await mosheData.eos.contract(tokenData.account);
        await token.transfer({
            from:mosheData.account,
            to:networkData.account,
            quantity:"2.1000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${mosheData.account}@active`]});
        
        tokenAfter = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:mosheData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 2);
    });
    it('rebate is not returned on second trade in same period', async function() { // moshe
        tokenBefore = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        token = await mosheData.eos.contract(tokenData.account);
        await token.transfer({
            from:mosheData.account,
            to:networkData.account,
            quantity:"2.2000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${mosheData.account}@active`]});
        
        tokenAfter = await getUserBalance({account:mosheData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:mosheData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 0);
    });
});

describe('in 5th period', () => {
    it('regular rebate is returned if not traded in fourth round', async function(){ // alice
        await snooze(2 * 3000);
        const tokenBefore = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"7.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        const tokenAfter = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 1);
    });
});

describe('in 6th period', () => {
    it('no rebate is returned', async function(){ // alice
        await snooze(3000);
        const tokenBefore = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"7.0000 EOS",
            memo:"4 TOK," + tokenData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        const tokenAfter = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  tokenAfter - tokenBefore 
        assert.equal(balanceChange, 0);
    });
});

});