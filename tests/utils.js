const Eos = require('eosjs');
const fs = require('fs');
const path = require('path');
const Math = require('math')

async function ensureContractAssertionError(prom, expected_error) {
    try {
        await prom;
        assert(false, 'should have failed');
    }
    catch (err) {
        err.should.include(expected_error);
    }
}

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

const getUserBalance = async function(options){
    let eos = options.eos
    let account = options.account
    let symbol = options.symbol
    let tokenContract = options.tokenContract

    let balance = await eos.getTableRows({
        code: tokenContract,
        scope: account,
        table: 'accounts',
        json: true,
    });
    for (i = 0; i < balance["rows"].length; i++) {
        balanceDict = balance["rows"][i]
        if(balanceDict["balance"] && balanceDict["balance"].includes(symbol)) {
            return parseFloat(balanceDict["balance"])
        }
    }
    return 0;
}

async function getCurrentPermissions(eos, accountName) {
    const account = await eos.getAccount(accountName)
    const perms = JSON.parse(JSON.stringify(account.permissions))
    return perms
}

const addCodeToPerm = async function(eos, accountName) {
    const perms = await getCurrentPermissions(eos, accountName)
    perms[0]['required_auth']['accounts'] = [{"permission":{"actor":accountName,"permission":"eosio.code"},"weight":1}]
    perms[1]['required_auth']['accounts'] = [{"permission":{"actor":accountName,"permission":"eosio.code"},"weight":1}]

    const updateAuthResult = await eos.transaction(tr => {
          for(const perm of perms) {
             tr.updateauth({
                 account: accountName,
                 permission: perm.perm_name,
                 parent: perm.parent,
                 auth: perm.required_auth
             }, {authorization: `${accountName}@owner`})
         }
    })
}

const renouncePermToOnlyCode = async function(eos, accountName) {
    const perms = await getCurrentPermissions(eos, accountName)
    // console.log('Current permissions =>', JSON.stringify(perms))
    perms[0]['required_auth']['accounts'] = [{"permission":{"actor":accountName,"permission":"eosio.code"},"weight":1}]
    perms[0]['required_auth']['keys'] = []
    perms[1]['required_auth']['accounts'] = [{"permission":{"actor":accountName,"permission":"eosio.code"},"weight":1}]
    perms[1]['required_auth']['keys'] = []

    const updateAuthResult = await eos.transaction(tr => {
          for(const perm of perms) {
             tr.updateauth({
                 account: accountName,
                 permission: perm.perm_name,
                 parent: perm.parent,
                 auth: perm.required_auth
             }, {authorization: `${accountName}@owner`})
         }
    })
}

function roundDown(number, decimals) {
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}

module.exports ={
    ensureContractAssertionError,
    snooze,
    getUserBalance,
    renouncePermToOnlyCode,
    addCodeToPerm,
    roundDown
}