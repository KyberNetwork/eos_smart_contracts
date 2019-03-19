const fs = require('fs')
const Eos = require('eosjs')
const BigNumber = require('bignumber.js');
const path = require('path');
const should = require('chai').should();
const assert = require('assert');


const { ensureContractAssertionError, snooze, getUserBalance, renouncePermToOnlyCode} = require('./utils');
const reserveServices = require('../scripts/services/ammReserveServices')

const AMOUNT_PRECISON = 0.0001
const RATE_PRECISON =   0.00000001

/* Assign keypairs. to accounts. Use unique name prefixes to prevent collisions between test modules. */
const keyPairArray = JSON.parse(fs.readFileSync("tests/keys.json"))
const tokenData =   {account: "ammtoken",   publicKey: keyPairArray[0][0], privateKey: keyPairArray[0][1]}
const reserveData = {account: "ammreserve", publicKey: keyPairArray[1][0], privateKey: keyPairArray[1][1]}
const aliceData =   {account: "ammalice",   publicKey: keyPairArray[2][0], privateKey: keyPairArray[2][1]}
const mosheData =   {account: "ammmoshe",   publicKey: keyPairArray[3][0], privateKey: keyPairArray[3][1]}
const networkData = {account: "ammnetwork", publicKey: keyPairArray[4][0], privateKey: keyPairArray[4][1]}
const adminData =   {account: "ammadmin",      publicKey: keyPairArray[5][0], privateKey: keyPairArray[5][1]}

const systemData =  {account: "eosio",      publicKey: "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV", privateKey: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3"}

/* create eos handler objects */
systemData.eos = Eos({ keyProvider: systemData.privateKey /* , verbose: 'false' */})
tokenData.eos = Eos({ keyProvider: tokenData.privateKey /* , verbose: 'false' */})
reserveData.eos = Eos({ keyProvider: reserveData.privateKey /* , verbose: 'false' */})
aliceData.eos = Eos({ keyProvider: aliceData.privateKey /* , verbose: 'false' */})
mosheData.eos = Eos({ keyProvider: mosheData.privateKey /* , verbose: 'false' */})
networkData.eos = Eos({ keyProvider: networkData.privateKey /* , verbose: 'false' */})
adminData.eos = Eos({ keyProvider: adminData.privateKey /* , verbose: 'false' */})

let reserveAsOwner
let reserveAsAlice
let reserveAsReserve
let reserveAsNetwork
let token

let defaultParams

describe(path.basename(__filename), function () {
before("setup accounts, contracts and initial funds", async () => {
    /* create accounts */
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:tokenData.account, owner: tokenData.publicKey, active: tokenData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserveData.account, owner: reserveData.publicKey, active: reserveData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:aliceData.account, owner: aliceData.publicKey, active: aliceData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:mosheData.account, owner: mosheData.publicKey, active: mosheData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:networkData.account, owner: networkData.publicKey, active: networkData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:adminData.account, owner: adminData.publicKey, active: adminData.publicKey})});

    /* deploy contracts */
    await tokenData.eos.setcode(tokenData.account, 0, 0, fs.readFileSync(`contracts/Mock/Token/Token.wasm`));
    await tokenData.eos.setabi(tokenData.account, JSON.parse(fs.readFileSync(`contracts/Mock/Token/Token.abi`)))
    await reserveData.eos.setcode(reserveData.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserveData.eos.setabi(reserveData.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    //await addCodeToPerm(reserveData.eos, reserveData.account)

    /* spread initial funds */
    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 SYS', {authorization: tokenData.account})
        myaccount.issue(networkData.account, '100000.0000 SYS', 'issue', {authorization: tokenData.account})
        myaccount.issue(reserveData.account, '100.0000 SYS', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 EOS', {authorization: tokenData.account})
        myaccount.issue(networkData.account, '100.0000 EOS', 'issue', {authorization: tokenData.account})
        myaccount.issue(reserveData.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account,   '40.0000 EOS', 'deposit', {authorization: tokenData.account})
    })

    reserveAsReserve = await reserveData.eos.contract(reserveData.account);
    reserveAsOwner = await adminData.eos.contract(reserveData.account);
    reserveAsAlice = await aliceData.eos.contract(reserveData.account);
    reserveAsNetwork = await networkData.eos.contract(reserveData.account);
    token = await networkData.eos.contract(tokenData.account);

    /* init reserve, setparams */
    await reserveAsReserve.init({
        admin: adminData.account,
        network_contract: networkData.account,
        token_symbol: "4,SYS",
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserveData.account}@active`});

    /* after init (from reserve contract), renounce permission */
    await renouncePermToOnlyCode(reserveData.eos, reserveData.account)

    defaultParams = {
        r: "0.01",
        p_min: "0.05",
        max_eos_cap_buy: "20.0000 EOS",
        max_eos_cap_sell: "20.0000 EOS",
        profit_percent: "0.25",
        max_sell_rate: "0.5555",
        min_sell_rate: "0.00000555"
    }
    await reserveAsOwner.setparams(defaultParams, {authorization: `${adminData.account}@active`});

})

describe('As reserve admin', () => {
    it('can set network', async function() {
        await reserveAsOwner.setnetwork({network_contract: aliceData.account},{authorization: `${adminData.account}@active`});
        state = await adminData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        assert.equal(state["rows"][0].network_contract, aliceData.account);

        await reserveAsOwner.setnetwork({network_contract: networkData.account},{authorization: `${adminData.account}@active`});
        state = await adminData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        assert.equal(state["rows"][0].network_contract, networkData.account);
    });
    it('can enable trade', async function() {
        let state
        await reserveAsOwner.setenable({enable: 0},{authorization: `${adminData.account}@active`});
        state = await adminData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        assert.equal(state["rows"][0].trade_enabled, 0);

        await reserveAsOwner.setenable({enable: 1},{authorization: `${adminData.account}@active`});
        state = await adminData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        assert.equal(state["rows"][0].trade_enabled, 1);
    });
    it('can set admin', async function() {
        let state
        await reserveAsOwner.setadmin({admin: aliceData.account},{authorization: `${adminData.account}@active`});
        state = await adminData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        assert.equal(state["rows"][0].admin, aliceData.account);

        await reserveAsAlice.setadmin({admin: adminData.account},{authorization: `${aliceData.account}@active`});
        state = await aliceData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        assert.equal(state["rows"][0].admin, adminData.account);
    });
    it('can withdraw funds from reserve', async function() {
        const balanceBefore = await getUserBalance({account:adminData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        await reserveAsOwner.withdraw({
            to:adminData.account,
            quantity:"23.0000 EOS",
            dest_contract:tokenData.account,
            memo: ""
            },{authorization: `${adminData.account}@active`});

        const balanceAfter = await getUserBalance({account:adminData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(23.0000, AMOUNT_PRECISON);
    });
    it('can deposit funds to reserve', async function() {
        const balanceBefore = await getUserBalance({account:reserveData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

        const token = await adminData.eos.contract(tokenData.account);
        await token.transfer({from:adminData.account, to:reserveData.account, quantity:"23.0000 EOS", memo:mosheData.account},
                             {authorization: [`${adminData.account}@active`]});

        const balanceAfter = await getUserBalance({account:reserveData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(23.0000, AMOUNT_PRECISON);
    });
});

describe('as a regular user', () => {
    it('can not set params', async function() {
        const p = reserveAsAlice.setparams(defaultParams,{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    it('can not set network', async function() {
        const p = reserveAsAlice.setnetwork({network_contract: networkData.account},{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    it('can not enable trade', async function() {
        const p = reserveAsAlice.setenable({enable: 0},{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    it('can not set admin', async function() {
        const p =  reserveAsAlice.setadmin({admin: adminData.account},{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    it('can not reset profit', async function() {
        const p = reserveAsAlice.resetprofit({},{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    it('can not withdraw funds from reserve', async function() {
        const p = reserveAsAlice.withdraw({
            to:adminData.account,
            quantity:"23.0000 EOS",
            dest_contract:tokenData.account,
            memo: ""
            },{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    it('can not deposit to reserve', async function() {
        const token = await aliceData.eos.contract(tokenData.account);
        const p = token.transfer({from:aliceData.account, to:reserveData.account, quantity:"23.0000 EOS", memo:mosheData.account},
                             {authorization: [`${aliceData.account}@active`]});
        await ensureContractAssertionError(p, "only network can perform a trade");
    });
    it('get buy rate with 0 quantity', async function() {
        /* get rate from blockchain. */
        const reserveAsNetwork = await networkData.eos.contract(reserveData.account);
        await reserveAsNetwork.getconvrate({src: "0.0000 EOS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"EOS", destSymbol:"SYS", srcAmount: 0.0000, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.should.be.closeTo(rate, RATE_PRECISON)
    });
    it('get buy rate with non 0 quantity', async function() {
        /* get rate from blockchain. */
        await reserveAsNetwork.getconvrate({src: "4.7611 EOS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"EOS", destSymbol:"SYS", srcAmount: 4.7611, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.should.be.closeTo(rate, RATE_PRECISON)
    });
    it('buy with rate < min_buy_rate is 0', async function() {
        await reserveAsNetwork.getconvrate({src: "1.2321 EOS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)
        assert.notEqual(rate, 0)

        let max_sell_rate = (1/rate) * 0.9
        let alteredParams = Object.assign({}, defaultParams);
        alteredParams.max_sell_rate = max_sell_rate.toFixed(4).toString()
        await reserveAsOwner.setparams(alteredParams,{authorization: `${adminData.account}@active`});
        
        await reserveAsNetwork.getconvrate({src: "1.2322 EOS"},{authorization: `${networkData.account}@active`});
        rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)
        assert.equal(rate, 0)

        /* return to previous params */
        await reserveAsOwner.setparams(defaultParams,{authorization: `${adminData.account}@active`});
    });
    it('buy with rate > max_buy_rate is 0', async function() {
        await reserveAsNetwork.getconvrate({src: "1.2321 EOS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)
        assert.notEqual(rate, 0)

        let min_sell_rate = (1/rate) * 1.01
        let alteredParams = Object.assign({}, defaultParams);
        alteredParams.min_sell_rate = min_sell_rate.toFixed(4).toString()
        await reserveAsOwner.setparams(alteredParams, {authorization: `${adminData.account}@active`});

        await reserveAsNetwork.getconvrate({src: "1.2322 EOS"},{authorization: `${networkData.account}@active`});
        rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)
        assert.equal(rate, 0)

        /* return to previous params */
        await reserveAsOwner.setparams(defaultParams, {authorization: `${adminData.account}@active`});
    });
    it('get sell rate with 0 quantity', async function() {
        /* get rate from blockchain. */
        await reserveAsNetwork.getconvrate({src: "0.0000 SYS"},{authorization: `${networkData.account}@active`});
        let rate = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"SYS", destSymbol:"EOS", srcAmount: 0.0000, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.toString().should.be.equal(rate)
    });
    it('get sell rate with non 0 quantity', async function() {
        /* get rate from blockchain. */
        await reserveAsNetwork.getconvrate({src: "34.211 SYS"},{authorization: `${networkData.account}@active`});
        let rate = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"SYS", destSymbol:"EOS", srcAmount: 34.211, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.toString().should.be.equal(rate)
    });
    it('sell with rate < min_sell_rate is 0', async function() {
        await reserveAsNetwork.getconvrate({src: "14.2172 SYS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)
        assert.notEqual(rate, 0)

        /* change only max_sell_rate, other params stay the same */
        let min_sell_rate = rate * 1.001
        let alteredParams = Object.assign({}, defaultParams);
        alteredParams.min_sell_rate = min_sell_rate.toFixed(4).toString()
        await reserveAsOwner.setparams(alteredParams,{authorization: `${adminData.account}@active`});
        
        await reserveAsNetwork.getconvrate({src: "14.2171 SYS"},{authorization: `${networkData.account}@active`});
        rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)
        assert.equal(rate, 0)

        /* return to previous params */
        await reserveAsOwner.setparams(defaultParams,{authorization: `${adminData.account}@active`});
    });
    xit('removed because of Duplicate transaction - sell with rate > max_sell_rate is 0 ', async function() {        await reserveAsNetwork.getconvrate({src: "14.213 SYS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)
        assert.notEqual(rate, 0)
    
        let max_sell_rate = rate * 0.9
        let alteredParams = Object.assign({}, defaultParams);
        alteredParams.max_sell_rate = max_sell_rate.toFixed(4).toString()
        await reserveAsOwner.setparams(alteredParams,{authorization: `${adminData.account}@active`});
        
        await reserveAsNetwork.getconvrate({src: "14.213 SYS"},{authorization: `${networkData.account}@active`});
        rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)
        assert.equal(rate, 0)
    
        /* return to previous params */
        await reserveAsOwner.setparams(defaultParams,{authorization: `${adminData.account}@active`});
    });
});

describe('As network', () => {
    it('buy', async function() {
        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcAmount: 2.3110, srcSymbol:"EOS", destSymbol:"SYS", eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'SYS', tokenContract:tokenData.account, eos:mosheData.eos})

        await reserveAsNetwork.getconvrate({src: "2.3110 EOS"},{authorization: `${networkData.account}@active`});
        await token.transfer({from:networkData.account, to:reserveData.account, quantity:"2.3110 EOS", memo:mosheData.account},
                             {authorization: [`${networkData.account}@active`]});

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'SYS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
    });
    it('profit is recorded on buy', async function() {
        state = await networkData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        collected_before = parseFloat(state["rows"][0].collected_profit_in_tokens.split(" ")[0])
 
        let calcRate = await reserveServices.getRate({ srcAmount: 3.3112, srcSymbol:"EOS", destSymbol:"SYS", eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        await reserveAsNetwork.getconvrate({src: "3.3112 EOS"},{authorization: `${networkData.account}@active`});
        await token.transfer({from:networkData.account, to:reserveData.account, quantity:"3.3112 EOS", memo:mosheData.account},
                             {authorization: [`${networkData.account}@active`]});
        state = await networkData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        collected_after = parseFloat(state["rows"][0].collected_profit_in_tokens.split(" ")[0])

        collected_change = collected_after - collected_before
        let dest_amount_before_profit_reduction = calcDestAmount * (100 / (100 - 0.25))
        let expected_profit = dest_amount_before_profit_reduction * (0.25 / 100)
        collected_change.should.be.closeTo(expected_profit, AMOUNT_PRECISON);
    })
    xit('removed because of Duplicate transaction - buy rate includes profit', async function() {
        // get rate with profit
        await reserveAsNetwork.getconvrate({src: "7.3116 EOS"},{authorization: `${networkData.account}@active`});
        let rateWithprofits = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate

        //set profit as 0 and get rate without profit
        let alteredParams = Object.assign({}, defaultParams);
        alteredParams.profit_percent = 0
        await reserveAsOwner.setparams(alteredParams,{authorization: `${adminData.account}@active`});

        // get rate without profit
        await reserveAsNetwork.getconvrate({src: "7.3116 EOS"},{authorization: `${networkData.account}@active`});
        let rateWithoutprofits = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate
        (rateWithoutprofits * (100 + 0.25) / 100).should.be.closeTo(rateWithprofits, AMOUNT_PRECISON);

        // return profit to normal
        await reserveAsOwner.setparams(defaultParams,{authorization: `${adminData.account}@active`});
    });
    it('profit is recorded as 0 on buy when profit_percent = 0', async function() {
        let alteredParams = Object.assign({}, defaultParams);
        alteredParams.profit_percent = 0
        await reserveAsOwner.setparams(alteredParams,{authorization: `${adminData.account}@active`});

        state = await networkData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        collected_before = parseFloat(state["rows"][0].collected_profit_in_tokens.split(" ")[0])
 
        await reserveAsNetwork.getconvrate({src: "3.3112 EOS"},{authorization: `${networkData.account}@active`});
        await token.transfer({from:networkData.account, to:reserveData.account, quantity:"3.3112 EOS", memo:mosheData.account},
                             {authorization: [`${networkData.account}@active`]});
        state = await networkData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        collected_after = parseFloat(state["rows"][0].collected_profit_in_tokens.split(" ")[0])

        collected_change = collected_after - collected_before
        assert.equal(collected_change, 0)

        // return profit to normal
        await reserveAsOwner.setparams(defaultParams,{authorization: `${adminData.account}@active`});
    });
    it('sell', async function() {
        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcAmount: 34.2110, srcSymbol:"SYS", destSymbol:"EOS", eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

        await reserveAsNetwork.getconvrate({src: "34.2110 SYS"},{authorization: `${networkData.account}@active`});
        await token.transfer({from:networkData.account, to:reserveData.account, quantity:"34.2110 SYS", memo:mosheData.account},
                             {authorization: [`${networkData.account}@active`]});

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
    });
    it('profit is recorded on sell', async function() {
        state = await networkData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        collected_before = parseFloat(state["rows"][0].collected_profit_in_tokens.split(" ")[0])

        let calcRate = await reserveServices.getRate({ srcAmount: 34.2113, srcSymbol:"SYS", destSymbol:"EOS", eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        await reserveAsNetwork.getconvrate({src: "34.2113 SYS"},{authorization: `${networkData.account}@active`});
        await token.transfer({from:networkData.account, to:reserveData.account, quantity:"34.2113 SYS", memo:mosheData.account},
                {authorization: [`${networkData.account}@active`]});
        state = await networkData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        collected_after = parseFloat(state["rows"][0].collected_profit_in_tokens.split(" ")[0])

        collected_change = collected_after - collected_before
        let expected_profit = 34.2113 * (0.25 / 100)
        collected_change.should.be.closeTo(expected_profit, AMOUNT_PRECISON);
    })
    xit('removed because of Duplicate transaction - sell rate includes profit', async function() {
        // get rate with profit
        await reserveAsNetwork.getconvrate({src: "0.2111 SYS"},{authorization: `${networkData.account}@active`});
        rateWithoutprofits = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate

        //set profit as 0 and get rate without profit
        let alteredParams = Object.assign({}, defaultParams);
        alteredParams.profit_percent = 0
        await reserveAsOwner.setparams(alteredParams,{authorization: `${adminData.account}@active`});

        // get rate without profit
        await reserveAsNetwork.getconvrate({src: "0.2111 SYS"},{authorization: `${networkData.account}@active`});
        let rateWithprofits = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate

        (rateWithprofits * (100 + 0.25) / 100).should.be.closeTo(rateWithoutprofits, AMOUNT_PRECISON);

        // return profit to normal
        await reserveAsOwner.setparams(defaultParams,{authorization: `${adminData.account}@active`});
    });
    it('reset profit', async function() {
        state = await networkData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        collected_before = parseFloat(state["rows"][0].collected_profit_in_tokens.split(" ")[0])
        assert.notEqual(collected_before, 0)

        await reserveAsOwner.resetprofit({},{authorization: `${adminData.account}@active`});

        state = await networkData.eos.getTableRows({code: reserveData.account, scope: reserveData.account, table: 'state', json: true});
        collected_after = parseFloat(state["rows"][0].collected_profit_in_tokens.split(" ")[0])
        assert.equal(collected_after, 0)
    })
    
    it('when eos is depleted - rate should be around pmin', async function() {

        //sell token until eos is depleted, than check price
        amount = 100.0000
        while (true) {
            // increase amount each time to avoid tx duplication
            amount += 0.1
            amountAsString = amount.toFixed(4).toString() + " SYS"
            //console.log(amountAsString)

            // get sell rate
            await reserveAsNetwork.getconvrate({src: amountAsString},{authorization: `${networkData.account}@active`});
            rate = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate
            //console.log("sell rate", rate)

            if(rate == 0) {
                // eos is depleted

                // make sure last sell rate is close to pmin 
                parseFloat(last_rate).should.be.closeTo(parseFloat(defaultParams.p_min), 0.01);

                // make sure current buy rate is close to pmin
                await reserveAsNetwork.getconvrate({src: "0.0000 EOS"},{authorization: `${networkData.account}@active`});
                res = await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})
                buyRate = 1/parseFloat(res.rows[0].stored_rate)
                buyRate.should.be.closeTo(parseFloat(defaultParams.p_min), 0.01);
                break
            }

            // sell SYS to gradually deplete the reserve
            last_rate = rate
            await token.transfer({from:networkData.account, to:reserveData.account, quantity:amountAsString, memo:mosheData.account},
                    {authorization: [`${networkData.account}@active`]});
        } 
        
    });

});

describe('As reserve', () => {
    it('can not change reserve code after renouncing ownership', async function() {
        const p = reserveData.eos.setcode(reserveData.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
        await ensureContractAssertionError(p, "Provided keys, permissions, and delays do not satisfy declared authorizations");
    });
});
});