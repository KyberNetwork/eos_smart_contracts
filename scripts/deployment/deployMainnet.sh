#original PUBLIC_KEY for yolonetwork1 and ramldeployer is stored in local wallet with public key:
#EOS6DaNSbeHMuCg4sWbVmihGoorNteSd8rp696HBHBuDnjqav1dXy

set -x

meos="cleos -u https://node2.liquideos.com"

NETWORK_ACCOUNT=yolonetwork1
OWNER_ACCOUNT=ramramramle1
EOS_ACCOUNT=eosio.token

# 1kb = 0.04940264 EOS
# 650kb = 32.111716

$meos system buyram $NETWORK_ACCOUNT $NETWORK_ACCOUNT --kbytes 650
#$meos system sellram $NETWORK_ACCOUNT 10000

$meos set contract $NETWORK_ACCOUNT contracts/Network Network.wasm --abi Network.abi -p $NETWORK_ACCOUNT@active
#$meos set contract $NETWORK_ACCOUNT --clear

#this can not be done with scatter/bloks.io since can not pronounce "" there (for listener)
$meos push action $NETWORK_ACCOUNT init "[ \"$OWNER_ACCOUNT\", \"$EOS_ACCOUNT\", \"\", true ]" -p $NETWORK_ACCOUNT@active

#changing to owner which heys is only in scatter
$meos set account permission $NETWORK_ACCOUNT active "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$OWNER_ACCOUNT\",\"permission\":\"active\"},\"weight\":1}], \"waits\":[] }" owner -p $NETWORK_ACCOUNT
$meos set account permission $NETWORK_ACCOUNT owner "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$OWNER_ACCOUNT\",\"permission\":\"owner\"},\"weight\":1}], \"waits\":[] }" "" -p $NETWORK_ACCOUNT@owner
exit
