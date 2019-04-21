const fs = require('fs')
const Eos = require('eosjs')
const BigNumber = require('bignumber.js');
const path = require('path');
const should = require('chai').should();
const assert = require('assert');

const {ensureContractAssertionError, snooze, getUserBalance,
       renouncePermToOnlyCode, roundDown} = require('./utils');
const networkServices = require('../scripts/services/networkServices')
const reserveServices = require('../scripts/services/ammReserveServices')

const AMOUNT_PRECISON = 0.0001
const RATE_PRECISON =   0.00000001

/* Assign keypairs. to accounts. Use unique name prefixes to prevent collisions between test modules. */
const keyPairArray = JSON.parse(fs.readFileSync("tests/keys.json"))
const tokenData =         {account: "nettoken",   publicKey: keyPairArray[0][0], privateKey: keyPairArray[0][1]}
const mockTokenData =     {account: "netmocktoken",   publicKey: keyPairArray[0][0], privateKey: keyPairArray[0][1]}

const reserve1Data =      {account: "netreserve1", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve1AdminData = {account: "netadmin1",   publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve2Data =      {account: "netreserve2", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve2AdminData = {account: "netadmin2",   publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve3Data =      {account: "netreserve3", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve3AdminData = {account: "netadmin3",   publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve4Data =      {account: "netreserve4", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve4AdminData = {account: "netadmin4",   publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve5Data =      {account: "netreserve5", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve5AdminData = {account: "netadmin5",   publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve6Data =      {account: "netreserve11", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve6AdminData = {account: "netadmin11",   publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve7Data =      {account: "netreserve12", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const reserve7AdminData = {account: "netadmin12",   publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}


const aliceData =         {account: "netalice",   publicKey: keyPairArray[2][0], privateKey: keyPairArray[2][1]}
const mosheData =         {account: "netmoshe",   publicKey: keyPairArray[3][0], privateKey: keyPairArray[3][1]}
const networkData =       {account: "netnetwork", publicKey: keyPairArray[4][0], privateKey: keyPairArray[4][1]}
const networkAdminData =  {account: "netadmin", publicKey: keyPairArray[5][0], privateKey: keyPairArray[5][1]}
const walletData =        {account: "netawallet", publicKey: keyPairArray[5][0], privateKey: keyPairArray[5][1]}


const systemData =  {account: "eosio",      publicKey: "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV", privateKey: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3"}

/* create eos handler objects */
systemData.eos = Eos({ keyProvider: systemData.privateKey /* , verbose: 'false' */})
tokenData.eos = Eos({ keyProvider: tokenData.privateKey /* , verbose: 'false' */})
mockTokenData.eos = Eos({ keyProvider: tokenData.privateKey /* , verbose: 'false' */})
reserve1Data.eos = Eos({ keyProvider: reserve1Data.privateKey /* , verbose: 'false' */})
reserve1AdminData.eos = Eos({ keyProvider: reserve1AdminData.privateKey /* , verbose: 'false' */})
reserve2Data.eos = Eos({ keyProvider: reserve2Data.privateKey /* , verbose: 'false' */})
reserve2AdminData.eos = Eos({ keyProvider: reserve2AdminData.privateKey /* , verbose: 'false' */})
reserve3Data.eos = Eos({ keyProvider: reserve3Data.privateKey /* , verbose: 'false' */})
reserve3AdminData.eos = Eos({ keyProvider: reserve3AdminData.privateKey /* , verbose: 'false' */})
reserve4Data.eos = Eos({ keyProvider: reserve4Data.privateKey /* , verbose: 'false' */})
reserve4AdminData.eos = Eos({ keyProvider: reserve4AdminData.privateKey /* , verbose: 'false' */})
reserve5Data.eos = Eos({ keyProvider: reserve5Data.privateKey /* , verbose: 'false' */})
reserve5AdminData.eos = Eos({ keyProvider: reserve5AdminData.privateKey /* , verbose: 'false' */})
reserve6Data.eos = Eos({ keyProvider: reserve6Data.privateKey /* , verbose: 'false' */})
reserve6AdminData.eos = Eos({ keyProvider: reserve6AdminData.privateKey /* , verbose: 'false' */})
reserve7Data.eos = Eos({ keyProvider: reserve7Data.privateKey /* , verbose: 'false' */})
reserve7AdminData.eos = Eos({ keyProvider: reserve7AdminData.privateKey /* , verbose: 'false' */})
aliceData.eos = Eos({ keyProvider: aliceData.privateKey /* , verbose: 'false' */})
mosheData.eos = Eos({ keyProvider: mosheData.privateKey /* , verbose: 'false' */})
networkData.eos = Eos({ keyProvider: networkData.privateKey /* , verbose: 'false' */})
networkAdminData.eos = Eos({ keyProvider: networkAdminData.privateKey /* , verbose: 'false' */})
walletData.eos = Eos({ keyProvider: walletData.privateKey /* , verbose: 'false' */})


let networkAsAdmin
let networkAsNetwork
let networkAsAlice
let tokenAsNetworkOwner
let reserve1AsAdmin
let reserve2AsAdmin
let reserve3AsAdmin
let reserve4AsAdmin
let reserve5AsAdmin
let reserve6AsAdmin
let reserve7AsAdmin
let reserve1
let reserve2
let reserve3
let reserve4
let reserve5
let reserve6
let reserve7
let reserve1AsNetwork
let reserve2AsNetwork

let defaultParams

describe(path.basename(__filename), function () {
before("setup accounts, contracts and initial funds", async () => {
    /* create accounts */
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:tokenData.account, owner: tokenData.publicKey, active: tokenData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:mockTokenData.account, owner: mockTokenData.publicKey, active: mockTokenData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve1Data.account, owner: reserve1Data.publicKey, active: reserve1Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve2Data.account, owner: reserve2Data.publicKey, active: reserve2Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve3Data.account, owner: reserve3Data.publicKey, active: reserve3Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve4Data.account, owner: reserve4Data.publicKey, active: reserve4Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve5Data.account, owner: reserve5Data.publicKey, active: reserve5Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve6Data.account, owner: reserve6Data.publicKey, active: reserve6Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve7Data.account, owner: reserve7Data.publicKey, active: reserve7Data.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:aliceData.account, owner: aliceData.publicKey, active: aliceData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:mosheData.account, owner: mosheData.publicKey, active: mosheData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:networkData.account, owner: networkData.publicKey, active: networkData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve1AdminData.account, owner: reserve1AdminData.publicKey, active: reserve1AdminData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve2AdminData.account, owner: reserve2AdminData.publicKey, active: reserve2AdminData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve3AdminData.account, owner: reserve3AdminData.publicKey, active: reserve3AdminData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve4AdminData.account, owner: reserve4AdminData.publicKey, active: reserve4AdminData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve5AdminData.account, owner: reserve5AdminData.publicKey, active: reserve5AdminData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve6AdminData.account, owner: reserve6AdminData.publicKey, active: reserve6AdminData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserve7AdminData.account, owner: reserve7AdminData.publicKey, active: reserve7AdminData.publicKey})});
    
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:networkAdminData.account, owner: networkAdminData.publicKey, active: networkAdminData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:walletData.account, owner: walletData.publicKey, active: walletData.publicKey})});

    /* deploy contracts */
    await tokenData.eos.setcode(tokenData.account, 0, 0, fs.readFileSync(`contracts/Mock/Token/Token.wasm`));
    await tokenData.eos.setabi(tokenData.account, JSON.parse(fs.readFileSync(`contracts/Mock/Token/Token.abi`)))
    await mockTokenData.eos.setcode(mockTokenData.account, 0, 0, fs.readFileSync(`contracts/Mock/Token/Token.wasm`));
    await mockTokenData.eos.setabi(mockTokenData.account, JSON.parse(fs.readFileSync(`contracts/Mock/Token/Token.abi`)))
    await reserve1Data.eos.setcode(reserve1Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve1Data.eos.setabi(reserve1Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await reserve2Data.eos.setcode(reserve2Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve2Data.eos.setabi(reserve2Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await reserve3Data.eos.setcode(reserve3Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve3Data.eos.setabi(reserve3Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await reserve4Data.eos.setcode(reserve4Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve4Data.eos.setabi(reserve4Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await reserve5Data.eos.setcode(reserve5Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve5Data.eos.setabi(reserve5Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await reserve6Data.eos.setcode(reserve6Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve6Data.eos.setabi(reserve6Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await reserve7Data.eos.setcode(reserve7Data.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserve7Data.eos.setabi(reserve7Data.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    await networkData.eos.setcode(networkData.account, 0, 0, fs.readFileSync(`contracts/Network/Network.wasm`));
    await networkData.eos.setabi(networkData.account, JSON.parse(fs.readFileSync(`contracts/Network/Network.abi`)))

    /* create contract objects */
    networkAsAdmin = await networkAdminData.eos.contract(networkData.account);
    networkAsNetwork = await networkData.eos.contract(networkData.account);
    networkAsAlice = await aliceData.eos.contract(networkData.account);
    tokenAsNetworkOwner = await networkAdminData.eos.contract(tokenData.account);
    reserve1AsAdmin = await reserve1AdminData.eos.contract(reserve1Data.account);
    reserve2AsAdmin = await reserve1AdminData.eos.contract(reserve2Data.account);
    reserve3AsAdmin = await reserve1AdminData.eos.contract(reserve3Data.account);
    reserve4AsAdmin = await reserve1AdminData.eos.contract(reserve4Data.account);
    reserve5AsAdmin = await reserve1AdminData.eos.contract(reserve5Data.account);
    reserve6AsAdmin = await reserve1AdminData.eos.contract(reserve6Data.account);
    reserve7AsAdmin = await reserve7AdminData.eos.contract(reserve7Data.account);
    reserve1 = await reserve1Data.eos.contract(reserve1Data.account);
    reserve2 = await reserve2Data.eos.contract(reserve2Data.account);
    reserve3 = await reserve3Data.eos.contract(reserve3Data.account);
    reserve4 = await reserve4Data.eos.contract(reserve4Data.account);
    reserve5 = await reserve5Data.eos.contract(reserve5Data.account);
    reserve6 = await reserve6Data.eos.contract(reserve6Data.account);
    reserve7 = await reserve7Data.eos.contract(reserve7Data.account);
    reserve1AsNetwork = await networkData.eos.contract(reserve1Data.account);
    reserve2AsNetwork = await networkData.eos.contract(reserve2Data.account);

    /* spread initial funds */
    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 SYS', {authorization: tokenData.account})
        myaccount.issue(reserve1Data.account, '100.0000 SYS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve6Data.account, '100.0000 SYS', 'deposit', {authorization: tokenData.account})
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
        myaccount.create(tokenData.account, '100000000.0 TOKC', {authorization: tokenData.account})
        myaccount.issue(reserve4Data.account, '1000.0 TOKC', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '1000.0 TOKC', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '100000000 TOKD', {authorization: tokenData.account})
        myaccount.issue(reserve5Data.account, '1000 TOKD', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '1000 TOKD', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '100000000.0000000000 TOKE', {authorization: tokenData.account})
        myaccount.issue(reserve7Data.account, '1000.0000000000 TOKE', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '1000.0000000000 TOKE', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '100000000.0000 MOCKA', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '1000.0000 MOCKA', 'deposit', {authorization: tokenData.account})
    })

    await mockTokenData.eos.transaction(mockTokenData.account, myaccount => {
        myaccount.create(mockTokenData.account, '100000000.0000 EOS', {authorization: mockTokenData.account})
        myaccount.issue(aliceData.account, '1000.0000 EOS', 'deposit', {authorization: mockTokenData.account})
        myaccount.create(mockTokenData.account, '100000000.0000 SYS', {authorization: mockTokenData.account})
        myaccount.issue(aliceData.account, '1000.0000 SYS', 'deposit', {authorization: mockTokenData.account})

    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 EOS', {authorization: tokenData.account})
        myaccount.issue(networkData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve1Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve2Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve3Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve4Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve5Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve6Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(reserve7Data.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account, '100.0000 EOS', 'deposit', {authorization: tokenData.account})
    })

    /* init reserves, setparams */
    await reserve1.init({
        token_symbol: "4,SYS",
        admin: reserve1AdminData.account,
        network_contract: networkData.account,
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve1Data.account}@active`});

    await reserve2.init({
        token_symbol: "3,TOKA",
        admin: reserve2AdminData.account,
        network_contract: networkData.account,
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve2Data.account}@active`});

    await reserve3.init({
        token_symbol: "2,TOKB",
        admin: reserve3AdminData.account,
        network_contract: networkData.account,
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve3Data.account}@active`});

    await reserve4.init({
        token_symbol: "1,TOKC",
        admin: reserve4AdminData.account,
        network_contract: networkData.account,
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve4Data.account}@active`});

    await reserve5.init({
        token_symbol: "0,TOKD",
        admin: reserve5AdminData.account,
        network_contract: networkData.account,
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve5Data.account}@active`});

    await reserve6.init({
        token_symbol: "4,SYS",
        admin: reserve6AdminData.account,
        network_contract: networkData.account,
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve6Data.account}@active`});

    await reserve7.init({
        token_symbol: "10,TOKE",
        admin: reserve7AdminData.account,
        network_contract: networkData.account,
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserve7Data.account}@active`});

    /* after init reserves (from reserve contract), renounce permission */
    await renouncePermToOnlyCode(reserve1Data.eos, reserve1Data.account)
    await renouncePermToOnlyCode(reserve2Data.eos, reserve2Data.account)
    await renouncePermToOnlyCode(reserve3Data.eos, reserve3Data.account)
    await renouncePermToOnlyCode(reserve4Data.eos, reserve4Data.account)
    await renouncePermToOnlyCode(reserve5Data.eos, reserve5Data.account)
    await renouncePermToOnlyCode(reserve6Data.eos, reserve6Data.account)
    await renouncePermToOnlyCode(reserve7Data.eos, reserve7Data.account)

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

    await reserve1AsAdmin.setparams(defaultParams,{authorization: `${reserve1AdminData.account}@active`});
    await reserve2AsAdmin.setparams(defaultParams,{authorization: `${reserve2AdminData.account}@active`});
    await reserve3AsAdmin.setparams(defaultParams,{authorization: `${reserve3AdminData.account}@active`});
    await reserve4AsAdmin.setparams(defaultParams,{authorization: `${reserve4AdminData.account}@active`});
    await reserve5AsAdmin.setparams(defaultParams,{authorization: `${reserve5AdminData.account}@active`});
    await reserve6AsAdmin.setparams(defaultParams,{authorization: `${reserve6AdminData.account}@active`});
    await reserve7AsAdmin.setparams(defaultParams,{authorization: `${reserve7AdminData.account}@active`});
    /* network configurations */

    /* init network */
    await networkAsNetwork.init({admin:networkAdminData.account, eos_contract:tokenData.account, listener:"", enable:1},{authorization: `${networkData.account}@active`});

    /* after init network, renounce permission */
    await renouncePermToOnlyCode(networkData.eos, networkData.account)
})

describe('as admin', () => {
    describe('without reserves added beforehand', () => {
        it('set admin', async function() {
            let state
            await networkAsAdmin.setadmin({admin: aliceData.account},{authorization: `${networkAdminData.account}@active`});
            state = await networkAdminData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'state', json: true});
            assert.equal(state["rows"][0].admin, aliceData.account);
    
            await networkAsAlice.setadmin({admin: networkAdminData.account},{authorization: `${aliceData.account}@active`});
            state = await networkAdminData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'state', json: true});
            assert.equal(state["rows"][0].admin, networkAdminData.account);
        })
        it('set enable', async function() {
            let state
            await networkAsAdmin.setenable({enable: 0},{authorization: `${networkAdminData.account}@active`});
            state = await networkAdminData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'state', json: true});
            assert.equal(state["rows"][0].enabled, 0);
    
            await networkAsAdmin.setenable({enable: 1},{authorization: `${networkAdminData.account}@active`});
            state = await networkAdminData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'state', json: true});
            assert.equal(state["rows"][0].enabled, 1);
        })
        it('withdraw', async function() {
            const balanceBefore = await getUserBalance({account:networkData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            await networkAsAdmin.withdraw({to:networkAdminData.account, quantity:"5.0000 EOS", dest_contract:tokenData.account, memo:""},{authorization: `${networkAdminData.account}@active`});
            const balanceAfter = await getUserBalance({account:networkData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceBefore - balanceAfter 
            balanceChange.should.be.closeTo(5.0000, AMOUNT_PRECISON);
        })
        it('deposit', async function() {
            const balanceBefore = await getUserBalance({account:networkData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            await tokenAsNetworkOwner.transfer({from:networkAdminData.account, to:networkData.account, quantity:"5.0000 EOS", memo:""},{authorization: [`${networkAdminData.account}@active`]});
            const balanceAfter = await getUserBalance({account:networkData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore
            balanceChange.should.be.closeTo(5.0000, AMOUNT_PRECISON);
        })
        it('add multiple reserves, each with different token, than remove them', async function() {
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve2Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve3Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve4Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve5Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            reserves = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reserve', json: true});
            assert.equal(reserves["rows"].length, 5)
            assert.equal(reserves["rows"][0]["contract"], reserve1Data.account)
            assert.equal(reserves["rows"][1]["contract"], reserve2Data.account)
            assert.equal(reserves["rows"][2]["contract"], reserve3Data.account)
            assert.equal(reserves["rows"][3]["contract"], reserve4Data.account)
            assert.equal(reserves["rows"][4]["contract"], reserve5Data.account)
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve2Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve3Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve4Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve5Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            reserves = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reserve', json: true});
            assert.equal(reserves["rows"].length, 0)
        })
        xit('removed because of Duplicate transaction - revert on adding an already existing reserve', async function() {
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            const p = networkAsAdmin.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await ensureContractAssertionError(p, "can only add a non existing reserve or delete an existing one");
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
        })
        it('delete an existing reserve', async function() {
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            reserves = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reserve', json: true});
            assert.equal(reserves["rows"].length, 1)
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            reserves = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reserve', json: true});
            assert.equal(reserves["rows"].length, 0)
        })
        xit('removed because of Duplicate transaction - revert on deleting a non existing reserve', async function() {
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            const p = networkAsAdmin.addreserve({reserve:reserve2Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await ensureContractAssertionError(p, "can only add a non existing reserve or delete an existing one");            
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
        })
    });
    describe('with reserves added beforehand', () => {
        before("add reserves", async () => {
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve2Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve3Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve4Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve5Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve6Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
        });
        it('add several tokens to same reserve and check num tokens is correct', async function() {
            await networkAsAdmin.listpairres({add: 1, reserve:reserve3Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve3Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve3Data.account, token_symbol:"2,TOKB", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});

            reserves = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reserve', json: true});
            assert.equal(reserves["rows"][3].contract, reserve3Data.account)
            assert.equal(reserves["rows"][3].num_tokens, "3")
        
            await networkAsAdmin.listpairres({add: 0, reserve:reserve3Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reserves = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reserve', json: true});
            assert.equal(reserves["rows"][3].num_tokens, "2")

            await networkAsAdmin.listpairres({add: 0, reserve:reserve3Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 0, reserve:reserve3Data.account, token_symbol:"2,TOKB", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reserves = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reserve', json: true});
            assert.equal(reserves["rows"][3].num_tokens, "0")
        })
        it('listing an existing pair for a reserve does nothing, also removing a pair works', async function() {
            /* start with two different pairs */
            await networkAsAdmin.listpairres({add: 1, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve2Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"][0].symbol, "4,SYS")
            assert.equal(reservesPerTable["rows"].length, 2)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts[0], reserve1Data.account)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts.length, 1)

            /* add one of the existing pairs and make sure it reverts */
            const p = networkAsAdmin.listpairres({add: 1, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await ensureContractAssertionError(p, "already listed in reserve");

            assert.equal(reservesPerTable["rows"][0].symbol, "4,SYS")
            assert.equal(reservesPerTable["rows"].length, 2)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts[0], reserve1Data.account)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts.length, 1)

            /* remove one pair and see it is removed */
            await networkAsAdmin.listpairres({add: 0, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"].length, 1)
            assert.equal(reservesPerTable["rows"][0].symbol, "3,TOKA")

            /* remove the other pair and make sure they are both removed */ 
            await networkAsAdmin.listpairres({add: 0, reserve:reserve2Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"].length, 0)
        })
        it('revert when attempting to remove a reserve from a token which has no reserves.', async function() {
            /* remove non existing pair and see it reverts */
            const p = networkAsAdmin.listpairres({add: 0, reserve:reserve2Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await ensureContractAssertionError(p, "not listed at all");
        })
        it('revert when attempting to remove a reserve from a token which has only other reserves.', async function() {
            /* start with two different pairs */
            await networkAsAdmin.listpairres({add: 1, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve2Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"][0].symbol, "4,SYS")
            assert.equal(reservesPerTable["rows"].length, 2)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts[0], reserve1Data.account)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts.length, 1)

            /* remove non existing pair and see it reverts */
            const p = networkAsAdmin.listpairres({add: 0, reserve:reserve1Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await ensureContractAssertionError(p, "not listed in reserve");

            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"].length, 2)
            assert.equal(reservesPerTable["rows"][0].symbol, "4,SYS")
            assert.equal(reservesPerTable["rows"][1].symbol, "3,TOKA")
            assert.equal(reservesPerTable["rows"][0].reserve_contracts.length, 1)
            assert.equal(reservesPerTable["rows"][1].reserve_contracts.length, 1)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts[0], reserve1Data.account)
            assert.equal(reservesPerTable["rows"][1].reserve_contracts[0], reserve2Data.account)
            
            /* remove existing pairs */
            await networkAsAdmin.listpairres({add: 0, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 0, reserve:reserve2Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"].length, 0)
        })
        it('revert when trying to remove a reserve that still has listed tokens.', async function() {
            /* start with two different pairs */
            await networkAsAdmin.listpairres({add: 1, reserve:reserve1Data.account, token_symbol:"2,TOKB", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            const p = networkAsAdmin.addreserve({reserve:reserve1Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await ensureContractAssertionError(p, "reserve has listed tokens");

            await networkAsAdmin.listpairres({add: 0, reserve:reserve1Data.account, token_symbol:"2,TOKB", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
        })
        it('list more than one reserve per token, then delist', async function() {
            await networkAsAdmin.listpairres({add: 1, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve6Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"][0].symbol, "4,SYS")
            assert.equal(reservesPerTable["rows"].length, 1)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts[0], reserve1Data.account)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts[1], reserve6Data.account)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts.length, 2)

            await networkAsAdmin.listpairres({add: 0, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"][0].symbol, "4,SYS")
            assert.equal(reservesPerTable["rows"].length, 1)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts[0], reserve6Data.account)
            assert.equal(reservesPerTable["rows"][0].reserve_contracts.length, 1)

            await networkAsAdmin.listpairres({add: 0, reserve:reserve6Data.account, token_symbol:"4,SYS", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            reservesPerTable = await networkData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'reservespert', json: true});
            assert.equal(reservesPerTable["rows"].length, 0)
        })
        after("remove reserves", async () => {
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve2Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve3Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve4Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve5Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve6Data.account, add:0},{authorization: `${networkAdminData.account}@active`});
        });
    })
});

describe('as non admin', () => {
    describe('with reserves added and pairs listed beforehand', () => {
        before("add reserves, list pairs", async () => {
            await networkAsAdmin.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve2Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve3Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve4Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve5Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve6Data.account, add:1},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.addreserve({reserve:reserve7Data.account, add:1},{authorization: `${networkAdminData.account}@active`});

            await networkAsAdmin.listpairres({add: 1, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:tokenData.account}, {authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve2Data.account, token_symbol:"3,TOKA", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve3Data.account, token_symbol:"2,TOKB", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve4Data.account, token_symbol:"1,TOKC", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve5Data.account, token_symbol:"0,TOKD", token_contract:tokenData.account},{authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve6Data.account, token_symbol:"4,SYS", token_contract:tokenData.account}, {authorization: `${networkAdminData.account}@active`});
            await networkAsAdmin.listpairres({add: 1, reserve:reserve7Data.account, token_symbol:"10,TOKE", token_contract:tokenData.account}, {authorization: `${networkAdminData.account}@active`});
        });
        it('can not set admin', async function() {
            const p = networkAsAlice.setadmin({admin: aliceData.account},{authorization: `${aliceData.account}@active`});
            await ensureContractAssertionError(p, "Missing required authority");
        })
        it('can not enable', async function() {
            const p = networkAsAlice.setenable({enable: 0},{authorization: `${aliceData.account}@active`});
            await ensureContractAssertionError(p, "Missing required authority");
        })
        it('can not add reserve', async function() {
            const p = networkAsAlice.addreserve({reserve:reserve1Data.account, add:1},{authorization: `${aliceData.account}@active`});
            await ensureContractAssertionError(p, "Missing required authority");
        })
        it('can not list pair', async function() {
            const p = networkAsAlice.listpairres({add: 1, reserve:reserve1Data.account, token_symbol:"4,SYS", token_contract:aliceData.account}, {authorization: `${aliceData.account}@active`});
            await ensureContractAssertionError(p, "Missing required authority");
        })
        it('can not withdraw', async function() {
            const p = networkAsAlice.withdraw({
                to:aliceData.account,
                quantity:"5.0000 EOS",
                dest_contract:tokenData.account,
                memo:""
                },{authorization: `${aliceData.account}@active`});
            await ensureContractAssertionError(p, "Missing required authority");
        })
        it('can not deposit', async function() {
            const token = await aliceData.eos.contract(tokenData.account);
            const p = token.transfer({from:aliceData.account, to:networkData.account, quantity:"5.0000 EOS", memo:""},{authorization: [`${aliceData.account}@active`]});
            // if expecting a memo it means we are in trade path, and not in deposit path
            await ensureContractAssertionError(p, "needs a memo");
        })
        it('can get expected buy rate correctly with non 0 amount', async function() {
            await networkAsAlice.getexprate({src: "1.0000 EOS", dest_symbol: "3,TOKA"},{authorization: `${aliceData.account}@active`});
            rate = (await networkData.eos.getTableRows({table:"rate", code:networkData.account, scope:networkData.account, json: true})).rows[0].stored_rate
            assert.notEqual(rate, 0)
        });
        it('can get epxected buy rate correctly with 0 amount', async function() {
            await networkAsAlice.getexprate({src: "0.0000 EOS", dest_symbol: "3,TOKA"},{authorization: `${aliceData.account}@active`});
            rate = (await networkData.eos.getTableRows({table:"rate", code:networkData.account, scope:networkData.account, json: true})).rows[0].stored_rate
            assert.notEqual(rate, 0)
        });
        it('can get expected sell rate correctly with non 0 amount', async function() {
            await networkAsAlice.getexprate({src: "1.000 TOKA", dest_symbol: "4,EOS"},{authorization: `${aliceData.account}@active`});
            rate = (await networkData.eos.getTableRows({table:"rate", code:networkData.account, scope:networkData.account, json: true})).rows[0].stored_rate
            assert.notEqual(rate, 0)
        });
        it('can get epxected sell rate correctly with 0 amount', async function() {
            await networkAsAlice.getexprate({src: "0.000 TOKA", dest_symbol: "4,EOS"},{authorization: `${aliceData.account}@active`});
            rate = (await networkData.eos.getTableRows({table:"rate", code:networkData.account, scope:networkData.account, json: true})).rows[0].stored_rate
            assert.notEqual(rate, 0)
        });
        it('can get epxected rate correctly when 2 reserves hold same token and 1st have better rate', async function() {
            /* set params so that reserve1 will have higher rate than reserve2 */
            let alteredParams = Object.assign({}, defaultParams);
            alteredParams.p_min = defaultParams.p_min * 0.7; /* this will result in lower sell price -> higher buy price */
            await reserve1AsAdmin.setparams(alteredParams,{authorization: `${reserve1AdminData.account}@active`});

            /* get conversion rates from each of the reserves */
            rate1 = await reserveServices.getRate({eos:reserve1Data.eos, srcAmount:1.2322, reserveAccount:reserve1Data.account, srcSymbol:'EOS', destSymbol:'SYS', eosTokenAccount:tokenData.account})
            rate2 = await reserveServices.getRate({eos:reserve2Data.eos, srcAmount:1.2322, reserveAccount:reserve2Data.account, srcSymbol:'EOS', destSymbol:'SYS', eosTokenAccount:tokenData.account})

            await networkAsAlice.getexprate({src: "1.2322 EOS", dest_symbol: "4,SYS"},{authorization: `${aliceData.account}@active`});
            rate = (await networkData.eos.getTableRows({table:"rate", code:networkData.account, scope:networkData.account, json: true})).rows[0].stored_rate
            assert.notEqual(rate1, rate2)
            parseFloat(rate).should.be.closeTo(rate1, RATE_PRECISON);
        })
        it('can get epxected rate correctly when 2 reserves hold same token and 2nd have better rate', async function() {
            /* set params so that reserve1 will have lower rate than reserve2 */
            let alteredParams = Object.assign({}, defaultParams);
            alteredParams.p_min = defaultParams.p_min * 1.2; /* this will result in higher sell price -> lower buy price */
            await reserve1AsAdmin.setparams(alteredParams,{authorization: `${reserve1AdminData.account}@active`});

            /* get conversion rates from each of the reserves */
            rate1 = await reserveServices.getRate({eos:reserve1Data.eos, srcAmount:2.2322, reserveAccount:reserve1Data.account, srcSymbol:'EOS', destSymbol:'SYS', eosTokenAccount:tokenData.account})
            rate2 = await reserveServices.getRate({eos:reserve2Data.eos, srcAmount:2.2322, reserveAccount:reserve2Data.account, srcSymbol:'EOS', destSymbol:'SYS', eosTokenAccount:tokenData.account})

            await networkAsAlice.getexprate({src: "2.2322 EOS", dest_symbol: "4,SYS"},{authorization: `${aliceData.account}@active`});
            rate = (await networkData.eos.getTableRows({table:"rate", code:networkData.account, scope:networkData.account, json: true})).rows[0].stored_rate
            assert.notEqual(rate1, rate2)
            parseFloat(rate).should.be.closeTo(rate2, RATE_PRECISON);
            
            await reserve1AsAdmin.setparams(defaultParams,{authorization: `${reserve1AdminData.account}@active`});
        })
        it('check accounting of volume', async function() {
            let tokenStats 
            tokenStatsBefore = await networkAdminData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'tokenstats', json: true});
            eosCountBefore =  parseFloat(tokenStatsBefore["rows"][0]["eos_counter"].split(" "))
            tokenCountBefore =  parseFloat(tokenStatsBefore["rows"][0]["token_counter"].split(" "))

            await networkAsAlice.getexprate({src: "5.0000 EOS", dest_symbol: "4,SYS"},{authorization: `${aliceData.account}@active`});
            expDestAmount = parseFloat((await networkData.eos.getTableRows({table:"rate", code:networkData.account, scope:networkData.account, json: true})).rows[0].dest.split(" "))

            const token = await aliceData.eos.contract(tokenData.account);
            await token.transfer({
                from:aliceData.account,
                to:networkData.account,
                quantity:"5.0000 EOS",
                memo:"4 SYS," + tokenData.account + ",0.000001"},
                {authorization: [`${aliceData.account}@active`]});

            tokenStatsAfter = await networkAdminData.eos.getTableRows({code: networkData.account, scope: networkData.account, table: 'tokenstats', json: true});
            eosCountAfter =  parseFloat(tokenStatsAfter["rows"][0]["eos_counter"].split(" "))
            tokenCountAfter =  parseFloat(tokenStatsAfter["rows"][0]["token_counter"].split(" "))

            assert.equal(eosCountAfter - eosCountBefore, 5.0000)
            assert.equal(tokenCountAfter - tokenCountBefore, expDestAmount)
        })
        it('bad memo on trade', async function() {
            const token = await aliceData.eos.contract(tokenData.account);
            const p = token.transfer({
                from:aliceData.account,
                to:networkData.account,
                quantity:"5.0000 EOS",
                memo:"bad memo"},
                {authorization: [`${aliceData.account}@active`]});
            await ensureContractAssertionError(p, "wrong memo length");
        })
        
        it('check trade reverts on big min conversion rate', async function() {
            const token = await aliceData.eos.contract(tokenData.account);
            const p = token.transfer({
                from:aliceData.account,
                to:networkData.account,
                quantity:"5.0000 EOS",
                memo:"4 SYS," + tokenData.account  + ",100.000000"},
                {authorization: [`${aliceData.account}@active`]});
            await ensureContractAssertionError(p, "rate < min conversion rate");
        })
        it('can not call internal action storeexprate', async function() {
            const p = networkAsAdmin.storeexprate({src: "1.000 TOKA", dest_symbol: "4,EOS"},{authorization: `${networkAdminData.account}@active`});
            await ensureContractAssertionError(p, "Missing required authority");
        })
        it('trade from known token/eos contract with unregistered src symbol', async function() {
            const token = await aliceData.eos.contract(tokenData.account);
            const p = token.transfer({
                from:aliceData.account,
                to:networkData.account,
                quantity:"5.0000 MOCKA",
                memo:"4 EOS,"  + tokenData.account + ",0.000001"},
                {authorization: [`${aliceData.account}@active`]});
            await ensureContractAssertionError(p, "unlisted token");
        })
        it('trade from unknown token contract with registered token symbol', async function() {
            const mockToken = await aliceData.eos.contract(mockTokenData.account);
            const p = mockToken.transfer({
                from:aliceData.account,
                to:networkData.account,
                quantity:"5.0000 SYS",
                memo:"4 EOS," + tokenData.account + ",0.000001"},
                {authorization: [`${aliceData.account}@active`]});
            await ensureContractAssertionError(p, "unexpected src contract");
        })
        it('trade from unknown eos contract with registered eos symbol', async function() {
            const mockToken = await aliceData.eos.contract(mockTokenData.account);
            const p = mockToken.transfer({
                from:aliceData.account,
                to:networkData.account,
                quantity:"5.0000 EOS",
                memo:"4 SYS," + tokenData.account + ",0.000001"},
                {authorization: [`${aliceData.account}@active`]});
            await ensureContractAssertionError(p, "unexpected src contract");
        })

        describe('using services', () => {
        it('buy token with precision 10', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'TOKE', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:'EOS',
                destSymbol:'TOKE',
                srcAmount:2.0132,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 10);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:"2.0132",
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"EOS",
                destPrecision:10,
                destSymbol:"TOKE",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'TOKE', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore
            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        });
        it('sell token with precision 10', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:'TOKE',
                destSymbol:'EOS',
                srcAmount:1.3678123453,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 4);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:"1.3678123453",
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"TOKE",
                destPrecision:4,
                destSymbol:"EOS",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore

            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        });
        it('buy token with precision 4', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'SYS', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:'EOS',
                destSymbol:'SYS',
                srcAmount:2.0132,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 4);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:"2.0132",
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"EOS",
                destPrecision:4,
                destSymbol:"SYS",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'SYS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore
            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        });
        it('sell token with precision 4', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:'SYS',
                destSymbol:'EOS',
                srcAmount:1.3678,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 4);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:"1.3678",
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"SYS",
                destPrecision:4,
                destSymbol:"EOS",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore

            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        });
        it('buy token with precision 3', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:"EOS",
                destSymbol:"TOKA",
                srcAmount:1.1134,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 3);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:1.1134,
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"EOS",
                destPrecision:3,
                destSymbol:"TOKA",
                minConversionRate:"0.000001"
            })
            return

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'TOKA', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore
            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        })
        it('sell token with precision 3', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:'TOKA',
                destSymbol:'EOS',
                srcAmount:1.367,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 4);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:"1.367",
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"TOKA",
                destPrecision:4,
                destSymbol:"EOS",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore

            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);

        })
        it('buy token with precision 2', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'TOKB', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:"EOS",
                destSymbol:"TOKB",
                srcAmount:1.1103,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate,2);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:1.1103,
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"EOS",
                destPrecision:2,
                destSymbol:"TOKB",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'TOKB', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore
            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        })
        it('sell token with precision 2', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:'TOKB',
                destSymbol:'EOS',
                srcAmount:2.31,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 4);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:"2.31",
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"TOKB",
                destPrecision:4,
                destSymbol:"EOS",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore

            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        })
        it('buy token with precision 1', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'TOKC', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:"EOS",
                destSymbol:"TOKC",
                srcAmount:3.7107,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate,1);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:3.7107,
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"EOS",
                destPrecision:1,
                destSymbol:"TOKC",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'TOKC', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore
            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        })
        it('sell token with precision 1', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:'TOKC',
                destSymbol:'EOS',
                srcAmount:3.9,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 4);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:"3.9",
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"TOKC",
                destPrecision:4,
                destSymbol:"EOS",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore

            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        })
            it('buy token with precision 0', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'TOKD', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:"EOS",
                destSymbol:"TOKD",
                srcAmount:3.7107,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate,0);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:3.7107,
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"EOS",
                destPrecision:0,
                destSymbol:"TOKD",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'TOKD', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore
            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        })
        it('sell token with precision 0', async function() {
            const balanceBefore = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

            let calcRate = await networkServices.getRate({
                eos:networkData.eos,
                srcSymbol:'TOKD',
                destSymbol:'EOS',
                srcAmount:4,
                networkAccount:networkData.account,
                eosTokenAccount:tokenData.account})
            let calcDestAmount = roundDown(srcAmount * calcRate, 4);

            await networkServices.trade({
                eos:aliceData.eos,
                networkAccount:networkData.account,
                userAccount:aliceData.account, 
                srcAmount:"4",
                srcTokenAccount:tokenData.account,
                destTokenAccount:tokenData.account,
                srcSymbol:"TOKD",
                destPrecision:4,
                destSymbol:"EOS",
                minConversionRate:"0.000001"
            })

            const balanceAfter = await getUserBalance({account:aliceData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
            const balanceChange = balanceAfter - balanceBefore

            balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        })
        })
    });
});
});