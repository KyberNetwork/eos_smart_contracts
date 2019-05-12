set -x

meos='cleos -v -u https://api.eossweden.se'


OLD_NETWORK_ACCOUNT=yolonetwork1
OLD_IQ_RESERVE_ACCOUNT=yoloiqreserv
OLD_CUSD_RESERVE_ACCOUNT=yolocusdrese
OWNER_ACCOUNT=ramramramle1
EOS_ACCOUNT=eosio.token

#### remove old staging contracts and ram ###

###### reserve ######
#$meos set contract $OLD_CUSD_RESERVE_ACCOUNT --clear
#$meos set contract $OLD_CUSD_RESERVE_ACCOUNT contracts/Mock ClearAmmReserve.wasm --abi ClearAmmReserve.abi -p $OLD_CUSD_RESERVE_ACCOUNT@active
#$meos push action $OLD_CUSD_RESERVE_ACCOUNT clear "{}" -p $OLD_CUSD_RESERVE_ACCOUNT@active

###### network ######
 #$meos set contract $OLD_NETWORK_ACCOUNT --clear
 #$meos set contract $OLD_NETWORK_ACCOUNT contracts/Mock ClearNetwork.wasm --abi ClearNetwork.abi -p $OLD_NETWORK_ACCOUNT@active
 #$meos push action $OLD_NETWORK_ACCOUNT clear "{}" -p $OLD_NETWORK_ACCOUNT@active
 
