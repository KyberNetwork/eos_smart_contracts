set -x

#jleos="cleos -u http://dev.cryptolions.io:38888"
jleos="cleos -u http://jungle2.cryptolions.io:80"

#cleos wallet unlock --password XXXXXXXXXXXXXXXXXXXX...

PUBLIC_KEY=EOS7qKhbpNCruW5F93FkRSWxoLk2HXJoDyxGU4GD1rKPLTtMvsabC
ACCOUNT_NAME=lionofcourse

TOKEN_ACCOUNT="testtokeaaaa"
RESERVE_ACCOUNT="yolorese1112"
RESERVE_OWNER_ACCOUNT=lionofcourse
NETWORK_ACCOUNT="yolonetw1112"
NETWORK_OWNER_ACCOUNT=lionofcourse
MOSHE_ACCOUNT="testmoseaaaa"
EOS_ACCOUNT="eosio.token"

#check network liveness:
$jleos get info
$jleos get account lionofcourse 

#on mainnet:
#cleos -u https://node2.liquideos.com get info

#buy ram if needed:
$jleos system buyram $ACCOUNT_NAME $ACCOUNT_NAME --kbytes 100
#on mainnet:
#cleos -u https://node2.liquideos.com system buyram joxixmziepps joxixmziepps --kbytes 100

#create accounts:
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $TOKEN_ACCOUNT $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $RESERVE_ACCOUNT $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $NETWORK_ACCOUNT $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $MOSHE_ACCOUNT $PUBLIC_KEY
#on mainnet:
#cleos -u https://node2.liquideos.com  system newaccount --stake-net "0.0001 EOS" --stake-cpu "0.0001 EOS" --buy-ram-kbytes 8 -x 1000 joxixmziepps a1t4sfalt5ls EOS6PR5LHAqRXmWLHGRKVbsNKvuTsJRypAWTc5B2F8bRVLdGLJDk7

#move some eos to the accounts
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$TOKEN_ACCOUNT\", \"3.0000 EOS\", "m" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$RESERVE_ACCOUNT\", \"71.3000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$NETWORK_ACCOUNT\", \"3.0000 EOS\", "m" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$MOSHE_ACCOUNT\", \"3.0000 EOS\", "m" ]" -p $ACCOUNT_NAME@active

#delegate bw in each party
$jleos system delegatebw $TOKEN_ACCOUNT   $TOKEN_ACCOUNT   "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $RESERVE_ACCOUNT $RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $NETWORK_ACCOUNT $NETWORK_ACCOUNT "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $MOSHE_ACCOUNT   $MOSHE_ACCOUNT   "1.0 EOS" "1.0 EOS"

#deploy token
$jleos system buyram $ACCOUNT_NAME $TOKEN_ACCOUNT --kbytes 200
$jleos set contract $TOKEN_ACCOUNT contracts/Mock/Token Token.wasm --abi Token.abi -p $TOKEN_ACCOUNT@active

#move some SYS to the accounts
$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0000 SYS\"]" -p $TOKEN_ACCOUNT@active
sleep 1
$jleos push action $TOKEN_ACCOUNT issue "[ \"$RESERVE_ACCOUNT\", \"100.0000 SYS\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$NETWORK_ACCOUNT\", \"100.0000 SYS\", \"memo\" ]" -p $TOKEN_ACCOUNT@active

#deploy reserve
$jleos system buyram $ACCOUNT_NAME $RESERVE_ACCOUNT --kbytes 400

$jleos set contract $RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $RESERVE_ACCOUNT@active
$jleos push action $RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0000 SYS\", \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $RESERVE_ACCOUNT@active
$jleos set account permission $RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" -p $RESERVE_ACCOUNT"@owner"
$jleos set account permission $RESERVE_ACCOUNT owner "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" -p $RESERVE_ACCOUNT"@owner"
$jleos push action $RESERVE_ACCOUNT setparams '[ "0.01", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active

# end of deployment, now out trying stuff #
# get conversion rate
$jleos push action $RESERVE_ACCOUNT getconvrate '[ "0.0000 SYS"]' -p $NETWORK_ACCOUNT@active
$jleos get table $RESERVE_ACCOUNT $RESERVE_ACCOUNT rate

# complete a reserve trade
$jleos push action eosio.token transfer "[ \"$NETWORK_ACCOUNT\", \"$RESERVE_ACCOUNT\", \"0.0100 EOS\", \"$MOSHE_ACCOUNT\" ]" -p $NETWORK_ACCOUNT@active

exit

