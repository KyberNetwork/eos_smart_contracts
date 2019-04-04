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
const tokenData =         {account: "listoken",   publicKey: keyPairArray[0][0], privateKey: keyPairArray[0][1]}
const reserveData =      {account: "lisreserve", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const networkData =       {account: "lisnetwork", publicKey: keyPairArray[2][0], privateKey: keyPairArray[2][1]}
const listenerData =       {account: "lislistener", publicKey: keyPairArray[3][0], privateKey: keyPairArray[3][1]}
const aliceData =         {account: "lisalice",   publicKey: keyPairArray[4][0], privateKey: keyPairArray[4][1]}

const systemData =  {account: "eosio", publicKey: "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV", privateKey: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3"}

/* create eos handler objects */
systemData.eos = Eos({ keyProvider: systemData.privateKey /* , verbose: 'false' */})
tokenData.eos = Eos({ keyProvider: tokenData.privateKey /* , verbose: 'false' */})
reserveData.eos = Eos({ keyProvider: reserveData.privateKey /* , verbose: 'false' */})
networkData.eos = Eos({ keyProvider: networkData.privateKey /* , verbose: 'false' */})
listenerData.eos = Eos({ keyProvider: listenerData.privateKey /* , verbose: 'false' */})
aliceData.eos = Eos({ keyProvider: aliceData.privateKey /* , verbose: 'false' */})

let defaultParams

describe(path.basename(__filename), function () {
before("setup accounts, contracts and initial funds", async () => {
    /* create accounts */
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:tokenData.account, owner: tokenData.publicKey, active: tokenData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserveData.account, owner: reserveData.publicKey, active: reserveData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:networkData.account, owner: networkData.publicKey, active: networkData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:listenerData.account, owner: listenerData.publicKey, active: listenerData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:aliceData.account, owner: aliceData.publicKey, active: aliceData.publicKey})});

    /* deploy contracts */
    await tokenData.eos.setcode(tokenData.account, 0, 0, fs.readFileSync(`contracts/Mock/Token/Token.wasm`));
    await tokenData.eos.setabi(tokenData.account, JSON.parse(fs.readFileSync(`contracts/Mock/Token/Token.abi`)))
    await reserveData.eos.setcode(reserveData.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserveData.eos.setabi(reserveData.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await networkData.eos.setcode(networkData.account, 0, 0, fs.readFileSync(`contracts/Network/Network.wasm`));
    await networkData.eos.setabi(networkData.account, JSON.parse(fs.readFileSync(`contracts/Network/Network.abi`)))
    await listenerData.eos.setcode(listenerData.account, 0, 0, fs.readFileSync(`contracts/Listener/Listener.wasm`));
    await listenerData.eos.setabi(listenerData.account, JSON.parse(fs.readFileSync(`contracts/Listener/Listener.abi`)))

    /* create contract objects */
    networkAsNetwork = await networkData.eos.contract(networkData.account);
    networkAsAlice = await aliceData.eos.contract(networkData.account);
    reserve = await reserveData.eos.contract(reserveData.account);
    listener = await listenerData.eos.contract(listenerData.account);

    /* spread initial funds */
    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 TOK', {authorization: tokenData.account})
        myaccount.issue(reserveData.account, '10000.0000 TOK', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '100.0000 TOK', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 EOS', {authorization: tokenData.account})
        myaccount.issue(networkData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(listenerData.account, '10000.0000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserveData.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
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
        fixed_fee: "0.0",
        max_sell_rate: "0.5555",
        min_sell_rate: "0.00000555"
    }

    await reserve.setparams(defaultParams,{authorization: `${reserveData.account}@active`});
    /* network configurations */

    /* init network */
    await networkAsNetwork.init({admin:networkData.account, eos_contract:tokenData.account, listener:"", enable:1},{authorization: `${networkData.account}@active`});

    await networkAsNetwork.addreserve({reserve:reserveData.account, add:1},{authorization: `${networkData.account}@active`});
    await networkAsNetwork.listpairres({add: 1, reserve:reserveData.account, token_symbol:"4,TOK", token_contract:tokenData.account},{authorization: `${networkData.account}@active`});

    /* renounce reserve control */
    addCodeToPerm(networkData.eos, networkData.account);
    addCodeToPerm(listenerData.eos, listenerData.account);
    addCodeToPerm(reserveData.eos, reserveData.account);
})

describe('as alice', () => {
    it('no rebate is returned when no listener was configured in init', async function() {
        const eosBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:aliceData.eos})

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"5.0000 EOS",
            memo:"4 TOK," + tokenData.account + "," + aliceData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        const eosAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  eosBefore - eosAfter
        assert.equal(balanceChange, 5);
    })
    it('no rebate is returned when listener was set in network but not configured', async function() {
        await networkAsNetwork.setlistener({listener:`${listenerData.account}`},{authorization: `${networkData.account}@active`});
        const eosBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:aliceData.eos})

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"5.0000 EOS",
            memo:"4 TOK," + tokenData.account + "," + aliceData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        const eosAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  eosBefore - eosAfter
        assert.equal(balanceChange, 5);
    })
    it('rebate is returned on buy', async function() {
        await listener.config({eos_contract: `${tokenData.account}`,
                               network_contract: `${networkData.account}`,
                               rebate_percent: "2.53",
                               min_eos_for_rebate: "0.0000 EOS"},
                              {authorization: [`${listenerData.account}@active`]})
        const eosBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:aliceData.eos})

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"10.0000 EOS",
            memo:"4 TOK," + tokenData.account + "," + aliceData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]});
        
        const eosAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  eosBefore - eosAfter
        assert.equal(balanceChange, 10.0 - (2.53 / 100.0) * 10.000);
    })
    it('rebate is returned on sell', async function() {
        const eosBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:aliceData.eos})

        let calcRate = await networkServices.getRate({
            eos:networkData.eos,
            srcSymbol:'TOK',
            destSymbol:'EOS',
            srcAmount:1.0000,
            networkAccount:networkData.account,
            eosTokenAccount:tokenData.account}
        )
        let calcDestAmount = roundDown(srcAmount * calcRate, 4);

        const token = await aliceData.eos.contract(tokenData.account);
        await token.transfer({
            from:aliceData.account,
            to:networkData.account,
            quantity:"1.0000 TOK",
            memo:"4 EOS," + tokenData.account + "," + aliceData.account + ",0.000000"},
            {authorization: [`${aliceData.account}@active`]}
        );

        const eosAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:aliceData.eos})
        balanceChange =  eosAfter - eosBefore
        balanceChange.should.be.closeTo(calcDestAmount * (1 + (2.53 / 100.0)), AMOUNT_PRECISON);
    })
});

});