#original PUBLIC_KEY for yolonetwork1 and ramldeployer is stored in local wallet with public key:
#EOS6DaNSbeHMuCg4sWbVmihGoorNteSd8rp696HBHBuDnjqav1dXy

set -x

#meos="cleos -u https://node2.liquideos.com"
meos='cleos -v -u https://api.eossweden.se'

NETWORK_ACCOUNT=yolonetwork1
IQ_RESERVE_ACCOUNT=yoloiqreserv
CUSD_RESERVE_ACCOUNT=yolocusdrese
OWNER_ACCOUNT=ramramramle1
EOS_ACCOUNT=eosio.token

# 1kb = 0.04940264 EOS
# 650kb = 32.111716

######$meos system buyram $NETWORK_ACCOUNT $NETWORK_ACCOUNT --kbytes 650
#$meos system sellram $NETWORK_ACCOUNT 10000

######$meos set contract $NETWORK_ACCOUNT contracts/Network Network.wasm --abi Network.abi -p $NETWORK_ACCOUNT@active
#$meos set contract $NETWORK_ACCOUNT --clear

#this can not be done with scatter/bloks.io since can not pronounce "" there (for listener)
######$meos push action $NETWORK_ACCOUNT init "[ \"$OWNER_ACCOUNT\", \"$EOS_ACCOUNT\", \"\", true ]" -p $NETWORK_ACCOUNT@active

#changing to owner which to an account maintained only in scatter
######$meos set account permission $NETWORK_ACCOUNT active "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$OWNER_ACCOUNT\",\"permission\":\"active\"},\"weight\":1}, {\"permission\":{\"actor\":\"$NETWORK_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $NETWORK_ACCOUNT
######$meos set account permission $NETWORK_ACCOUNT owner "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$OWNER_ACCOUNT\",\"permission\":\"owner\"},\"weight\":1}], \"waits\":[] }" "" -p $NETWORK_ACCOUNT@owner

#####################################################
#deploy reserve
#### first creact account, and send there eos and tokens!!!! ####

######$meos system buyram $IQ_RESERVE_ACCOUNT $IQ_RESERVE_ACCOUNT --kbytes 420
######$meos system buyram $CUSD_RESERVE_ACCOUNT $CUSD_RESERVE_ACCOUNT --kbytes 420

######$meos set contract $IQ_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $IQ_RESERVE_ACCOUNT@active
######$meos set contract $CUSD_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $CUSD_RESERVE_ACCOUNT@active


#begin with setting self as owner, will change it later
######$meos push action $IQ_RESERVE_ACCOUNT init "[\"$IQ_RESERVE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"3,IQ\", \"everipediaiq\", \"eosio.token\", true ]" -p $IQ_RESERVE_ACCOUNT@active
######$meos push action $CUSD_RESERVE_ACCOUNT init "[\"$CUSD_RESERVE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"2,CUSD\", \"stablecarbon\", \"eosio.token\", true ]" -p $CUSD_RESERVE_ACCOUNT@active

######$meos push action $IQ_RESERVE_ACCOUNT quickset '["0.00078968"]' -p IQ_RESERVE_ACCOUNT@active
######$meos push action $CUSD_RESERVE_ACCOUNT quickset '["0.2323"]' -p $CUSD_RESERVE_ACCOUNT@active

######$meos set account permission $IQ_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$OWNER_ACCOUNT\",\"permission\":\"active\"},\"weight\":1}, {\"permission\":{\"actor\":\"$IQ_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $IQ_RESERVE_ACCOUNT
######$meos set account permission $IQ_RESERVE_ACCOUNT owner "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$OWNER_ACCOUNT\",\"permission\":\"owner\"},\"weight\":1}], \"waits\":[] }" "" -p $IQ_RESERVE_ACCOUNT@owner

######$meos set account permission $CUSD_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$OWNER_ACCOUNT\",\"permission\":\"active\"},\"weight\":1}, {\"permission\":{\"actor\":\"$CUSD_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $CUSD_RESERVE_ACCOUNT
######$meos set account permission $CUSD_RESERVE_ACCOUNT owner "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$OWNER_ACCOUNT\",\"permission\":\"owner\"},\"weight\":1}], \"waits\":[] }" "" -p $CUSD_RESERVE_ACCOUNT@owner

#in bloks. io
######$meos push action $NETWORK_ACCOUNT addreserve "[ \"IQ_RESERVE_ACCOUNT\", true ]" -p $OWNER_ACCOUNT@active
######$meos push action $NETWORK_ACCOUNT addreserve "[ \"CUSD_RESERVE_ACCOUNT\", true ]" -p $OWNER_ACCOUNT@active

######$meos push action $NETWORK_ACCOUNT listpairres "[ \"$IQ_RESERVE_ACCOUNT\", \"3,IQ\", \"$everipediaiq\", true ]" -p $OWNER_ACCOUNT@active
######$meos push action $NETWORK_ACCOUNT listpairres "[ \"$CUSD_RESERVE_ACCOUNT\", \"2,CUSD\", \"$stablecarbon\", true ]" -p $OWNER_ACCOUNT@active

#$meos push action everipediaiq transfer '[ "ramldeployer", "yolonetwork1", "1.266 IQ", "4 EOS,eosio.token,ramldeployer,0.000001" ]' -p ramldeployer@active
#$meos push action eosio.token transfer '[ "ramldeployer", "yolonetwork1", "0.1000 EOS", "2 CUSD,stablecarbon,ramldeployer,0.000001" ]' -p ramldeployer@active

exit
