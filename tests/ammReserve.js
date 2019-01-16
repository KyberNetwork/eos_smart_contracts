const fs = require('fs')
const Eos = require('eosjs')
const BigNumber = require('bignumber.js');
const path = require('path');
const assert = require('chai').should();

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
const ownerData =   {account: "ammowner",      publicKey: keyPairArray[5][0], privateKey: keyPairArray[5][1]}

const systemData =  {account: "eosio",      publicKey: "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV", privateKey: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3"}

/* create eos handler objects */
systemData.eos = Eos({ keyProvider: systemData.privateKey /* , verbose: 'false' */})
tokenData.eos = Eos({ keyProvider: tokenData.privateKey /* , verbose: 'false' */})
reserveData.eos = Eos({ keyProvider: reserveData.privateKey /* , verbose: 'false' */})
aliceData.eos = Eos({ keyProvider: aliceData.privateKey /* , verbose: 'false' */})
mosheData.eos = Eos({ keyProvider: mosheData.privateKey /* , verbose: 'false' */})
networkData.eos = Eos({ keyProvider: networkData.privateKey /* , verbose: 'false' */})
ownerData.eos = Eos({ keyProvider: ownerData.privateKey /* , verbose: 'false' */})

before("setup accounts, contracts and initial funds", async () => {
    /* create accounts */
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:tokenData.account, owner: tokenData.publicKey, active: tokenData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:reserveData.account, owner: reserveData.publicKey, active: reserveData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:aliceData.account, owner: aliceData.publicKey, active: aliceData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:mosheData.account, owner: mosheData.publicKey, active: mosheData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:networkData.account, owner: networkData.publicKey, active: networkData.publicKey})});
    await systemData.eos.transaction(tr => {tr.newaccount({creator: "eosio", name:ownerData.account, owner: ownerData.publicKey, active: ownerData.publicKey})});

    /* deploy contracts */
    await tokenData.eos.setcode(tokenData.account, 0, 0, fs.readFileSync(`contracts/Token/Token.wasm`));
    await tokenData.eos.setabi(tokenData.account, JSON.parse(fs.readFileSync(`contracts/Token/Token.abi`)))
    await reserveData.eos.setcode(reserveData.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
    await reserveData.eos.setabi(reserveData.account, JSON.parse(fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.abi`)))
    //await addCodeToPerm(reserveData.eos, reserveData.account)

    /* spread initial funds */
    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 SYS', {authorization: tokenData.account})
        myaccount.issue(networkData.account, '100.0000 SYS', 'issue', {authorization: tokenData.account})
        myaccount.issue(reserveData.account, '100.0000 SYS', 'deposit', {authorization: tokenData.account})
    })

    await tokenData.eos.transaction(tokenData.account, myaccount => {
        myaccount.create(tokenData.account, '1000000000.0000 EOS', {authorization: tokenData.account})
        myaccount.issue(networkData.account, '100.0000 EOS', 'issue', {authorization: tokenData.account})
        myaccount.issue(reserveData.account, '69.3000 EOS', 'deposit', {authorization: tokenData.account})
        myaccount.issue(aliceData.account,   '40.0000 EOS', 'deposit', {authorization: tokenData.account})
    })

    /* init reserve, setparams */
    const reserveAsReserve = await reserveData.eos.contract(reserveData.account);
    await reserveAsReserve.init({
        owner: ownerData.account,
        network_contract: networkData.account,
        token_symbol: "4,SYS",
        token_contract: tokenData.account,
        eos_contract: tokenData.account,
        enable_trade: 1,
        },{authorization: `${reserveData.account}@active`});

    /* after init (from reserve contract), renounce permission */
    await renouncePermToOnlyCode(reserveData.eos, reserveData.account)

    const reserveAsOwner = await ownerData.eos.contract(reserveData.account);
    await reserveAsOwner.setparams({
        r: "0.01",
        p_min: "0.05",
        max_eos_cap_buy: "20.0000 EOS",
        max_eos_cap_sell: "20.0000 EOS",
        fee_percent: "0.25",
        max_sell_rate: "0.5555",
        min_sell_rate: "0.00000555"
        },{authorization: `${ownerData.account}@active`});
})

describe('As reserve owner', () => {

    it('set network', async function() {
        const reserveAsOwner = await ownerData.eos.contract(reserveData.account);
        await reserveAsOwner.setnetwork({network_contract: networkData.account},{authorization: `${ownerData.account}@active`});
    });
    xit('enable trade', async function() {});
    xit('disable trade', async function() {});
    xit('reset fee', async function() {});
    it('can withdraw funds from reserve', async function() {
        const balanceBefore = await getUserBalance({account:ownerData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

        const reserveAsOwner = await ownerData.eos.contract(reserveData.account);
        await reserveAsOwner.withdraw({
            to:ownerData.account,
            quantity:"23.0000 EOS",
            dest_contract:tokenData.account
            },{authorization: `${ownerData.account}@active`});

        const balanceAfter = await getUserBalance({account:ownerData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(23.0000, AMOUNT_PRECISON);
    });
    it('can deposit funds to reserve', async function() {
        const balanceBefore = await getUserBalance({account:reserveData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

        const token = await ownerData.eos.contract(tokenData.account);
        await token.transfer({from:ownerData.account, to:reserveData.account, quantity:"23.0000 EOS", memo:mosheData.account},
                             {authorization: [`${ownerData.account}@active`]});

        const balanceAfter = await getUserBalance({account:reserveData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(23.0000, AMOUNT_PRECISON);
    });

});

describe('as non reserve owner', () => {
    it('can not set params', async function() {
        const reserveAsAlice = await aliceData.eos.contract(reserveData.account);
        const p = reserveAsAlice.setparams({
            r: "0.02",
            p_min: "0.05",
            max_eos_cap_buy: "20.0000 EOS",
            max_eos_cap_sell: "20.0000 EOS",
            fee_percent: "0.25",
            max_sell_rate: "0.5555",
            min_sell_rate: "0.00000555"
            },{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    it('can not set network', async function() {
        const reserveAsAlice = await aliceData.eos.contract(reserveData.account);
        const p = reserveAsAlice.setnetwork({network_contract: networkData.account},{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    xit('can not enable trade', async function() {});
    xit('can not disable trade', async function() {});
    xit('can not reset fee', async function() {});
    it('can not withdraw funds from reserve', async function() {
        const reserveAsAlice = await aliceData.eos.contract(reserveData.account);
        const p = reserveAsAlice.withdraw({
            to:ownerData.account,
            quantity:"23.0000 EOS",
            dest_contract:tokenData.account
            },{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
    it('can not deposit to reserve', async function() {
        const token = await aliceData.eos.contract(tokenData.account);
        const p = token.transfer({from:aliceData.account, to:reserveData.account, quantity:"23.0000 EOS", memo:mosheData.account},
                             {authorization: [`${aliceData.account}@active`]});
        await ensureContractAssertionError(p, "not coming from network contract");
    });
});

describe('As network', () => {
    it('get buy rate with 0 quantity', async function() {
        /* get rate from blockchain. */
        const reserve = await networkData.eos.contract(reserveData.account);
        await reserve.getconvrate({src: "0.0000 EOS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"EOS", destSymbol:"SYS", srcAmount: 0.0000, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.should.be.closeTo(rate, RATE_PRECISON)
    });
    it('get buy rate with non 0 quantity', async function() {
        /* get rate from blockchain. */
        const reserve = await networkData.eos.contract(reserveData.account);
        await reserve.getconvrate({src: "4.7611 EOS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"EOS", destSymbol:"SYS", srcAmount: 4.7611, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.should.be.closeTo(rate, RATE_PRECISON)
    });
    it('get sell rate with 0 quantity', async function() {
        /* get rate from blockchain. */
        const reserve = await networkData.eos.contract(reserveData.account);
        await reserve.getconvrate({src: "0.0000 SYS"},{authorization: `${networkData.account}@active`});
        let rate = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"SYS", destSymbol:"EOS", srcAmount: 0.0000, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.toString().should.be.equal(rate)
    });
    it('get sell rate with non 0 quantity', async function() {
        /* get rate from blockchain. */
        const reserve = await networkData.eos.contract(reserveData.account);
        await reserve.getconvrate({src: "34.211 SYS"},{authorization: `${networkData.account}@active`});
        let rate = (await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"SYS", destSymbol:"EOS", srcAmount: 34.211, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.toString().should.be.equal(rate)
    });
    it('buy', async function() {
        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcAmount: 2.3110, srcSymbol:"EOS", destSymbol:"SYS", eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'SYS', tokenContract:tokenData.account, eos:mosheData.eos})

        const reserve = await networkData.eos.contract(reserveData.account);
        await reserve.getconvrate({src: "2.3110 EOS"},{authorization: `${networkData.account}@active`});
        const token = await networkData.eos.contract(tokenData.account);
        await token.transfer({from:networkData.account, to:reserveData.account, quantity:"2.3110 EOS", memo:mosheData.account},
                             {authorization: [`${networkData.account}@active`]});

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'SYS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
        
    });
    it('sell', async function() {
        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcAmount: 34.2110, srcSymbol:"SYS", destSymbol:"EOS", eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        let calcDestAmount = srcAmount * calcRate;

        const balanceBefore = await getUserBalance({account:mosheData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})

        const reserve = await networkData.eos.contract(reserveData.account);
        await reserve.getconvrate({src: "34.2110 SYS"},{authorization: `${networkData.account}@active`});
        const token = await networkData.eos.contract(tokenData.account);
        await token.transfer({from:networkData.account, to:reserveData.account, quantity:"34.2110 SYS", memo:mosheData.account},
                             {authorization: [`${networkData.account}@active`]});

        const balanceAfter = await getUserBalance({account:mosheData.account, symbol:'EOS', tokenContract:tokenData.account, eos:mosheData.eos})
        const balanceChange = balanceAfter - balanceBefore
        balanceChange.should.be.closeTo(calcDestAmount, AMOUNT_PRECISON);
    });
    it('buy with rate > max_buy_rate', async function() {
        /* get rate from blockchain. */
        const reserve = await networkData.eos.contract(reserveData.account);
        await reserve.getconvrate({src: "4.7611 EOS"},{authorization: `${networkData.account}@active`});
        let rate = parseFloat((await reserveData.eos.getTableRows({table:"rate", code:reserveData.account, scope:reserveData.account, json: true})).rows[0].stored_rate)

        /* calc expected rate offline*/
        let calcRate = await reserveServices.getRate({ srcSymbol:"EOS", destSymbol:"SYS", srcAmount: 4.7611, eos:reserveData.eos, reserveAccount:reserveData.account, eosTokenAccount:tokenData.account})
        calcRate.should.be.closeTo(rate, RATE_PRECISON)
    });
    xit('buy with rate < min_buy_rate', async function() {});
    xit('sell with rate > max_buy_rate', async function() {});
    xit('sell with rate < min_buy_rate', async function() {});
    xit('fee is kept on buy', async function() {});
    xit('fee is kept on sell', async function() {});

    
});

describe('As non network', () => {
    it('can not get conversion rate', async function() {
        const reserve = await aliceData.eos.contract(reserveData.account);
        const p = reserve.getconvrate({src: "0.0000 EOS"},{authorization: `${aliceData.account}@active`});
        await ensureContractAssertionError(p, "Missing required authority");
    });
})

describe('As reserve', () => {
    it('can not change reserve code after renouncing ownership', async function() {
        const p = reserveData.eos.setcode(reserveData.account, 0, 0, fs.readFileSync(`contracts/Reserve/AmmReserve/AmmReserve.wasm`));
        await ensureContractAssertionError(p, "Provided keys, permissions, and delays do not satisfy declared authorizations");
    });
});
