set -x

jleos="cleos -u http://jungle2.cryptolions.io:80"

#cleos wallet unlock --password XXXXXXXXXXXXXXXXXXXX...

PUBLIC_KEY=EOS7qKhbpNCruW5F93FkRSWxoLk2HXJoDyxGU4GD1rKPLTtMvsabC
ACCOUNT_NAME=lionofcourse

TOKEN_ACCOUNT="testtokeaaaa"
RESERVE_ACCOUNT="yolorese1112"
RESERVE_OWNER_ACCOUNT=lionofcourse
#NETWORK_ACCOUNT="yolonetw1112"
NETWORK_ACCOUNT="yolonetw1115"
NETWORK_OWNER_ACCOUNT=lionofcourse
MOSHE_ACCOUNT="testmoseaaaa"
EOS_ACCOUNT="eosio.token"
ALICE_ACCOUNT="testalicaaaa"

#check network liveness:
#$jleos get info
#$jleos get account lionofcourse 

#on mainnet:
#cleos -u https://node2.liquideos.com get info

#buy ram if needed:
$jleos system buyram $ACCOUNT_NAME $ACCOUNT_NAME --kbytes 100
#on mainnet:
#cleos -u https://node2.liquideos.com system buyram joxixmziepps joxixmziepps --kbytes 100

#create accounts:
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $NETWORK_ACCOUNT $PUBLIC_KEY
#on mainnet:
#cleos -u https://node2.liquideos.com  system newaccount --stake-net "0.0001 EOS" --stake-cpu "0.0001 EOS" --buy-ram-kbytes 8 -x 1000 joxixmziepps a1t4sfalt5ls EOS6PR5LHAqRXmWLHGRKVbsNKvuTsJRypAWTc5B2F8bRVLdGLJDk7

#move some eos to the accounts
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$NETWORK_ACCOUNT\", \"3.0000 EOS\", "m" ]" -p $ACCOUNT_NAME@active

#delegate bw in each party
$jleos system delegatebw $NETWORK_ACCOUNT $NETWORK_ACCOUNT "1.0 EOS" "1.0 EOS"

#move some SYS to the accounts
$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.0000 SYS\", \"memo\" ]" -p $TOKEN_ACCOUNT@active

#deploy network
$jleos system buyram $ACCOUNT_NAME $NETWORK_ACCOUNT --kbytes 550

$jleos set contract $NETWORK_ACCOUNT contracts/Network Network.wasm --abi Network.abi -p $NETWORK_ACCOUNT@active
sleep 3
$jleos push action $NETWORK_ACCOUNT init "[ \"$NETWORK_OWNER_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $NETWORK_ACCOUNT@active

$jleos set account permission $NETWORK_ACCOUNT active "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$NETWORK_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" -p $NETWORK_ACCOUNT"@owner"
$jleos set account permission $NETWORK_ACCOUNT owner "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$NETWORK_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" -p $NETWORK_ACCOUNT"@owner"

$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$RESERVE_ACCOUNT\", \"0.0000 SYS\", \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active

$jleos get table $NETWORK_ACCOUNT $NETWORK_ACCOUNT reservespert

$jleos push action $TOKEN_ACCOUNT transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0100 SYS\", \"$ALICE_ACCOUNT,$TOKEN_ACCOUNT,4 SYS,$EOS_ACCOUNT,4 EOS,$MOSHE_ACCOUNT,20,0.000001,somewallid,somehint\" ]" -p $ALICE_ACCOUNT@active

exit


