## means we skip it for now
### means we already did it

set -x
jleos="cleos -u http://jungle2.cryptolions.io:80"

PUBLIC_KEY=EOS7qKhbpNCruW5F93FkRSWxoLk2HXJoDyxGU4GD1rKPLTtMvsabC
ACCOUNT_NAME=lionofcourse
TOKEN_ACCOUNT="testtokeaaaa"

RESERVE_OWNER_ACCOUNT=lionofcourse
#NETWORK_ACCOUNT="yolonetw1113"
NETWORK_ACCOUNT="yolonetw1115"
NETWORK_OWNER_ACCOUNT=lionofcourse
EOS_ACCOUNT="eosio.token"
MOSHE_ACCOUNT="testmoseaaaa"
ALICE_ACCOUNT="testalicaaaa"

#ANOTHER_TOKEN_ACCOUNT="testtokeaaab"
PXS_RESERVE_ACCOUNT="yolorese1151"
KARMA_RESERVE_ACCOUNT="yolorese1152"
TRYBE_RESERVE_ACCOUNT="yolorese1153"
MEETONE_RESERVE_ACCOUNT="yolorese1154"
EOSDAC_RESERVE_ACCOUNT="yolorese1155"
IQ_RESERVE_ACCOUNT="yolorese1211"
HVT_RESERVE_ACCOUNT="yolorese1212"

# deploy another contract just to make it interesting
###$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $ANOTHER_TOKEN_ACCOUNT $PUBLIC_KEY

# create more reserve account
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $PXS_RESERVE_ACCOUNT     $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $KARMA_RESERVE_ACCOUNT   $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $TRYBE_RESERVE_ACCOUNT   $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $MEETONE_RESERVE_ACCOUNT $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $EOSDAC_RESERVE_ACCOUNT  $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $IQ_RESERVE_ACCOUNT      $PUBLIC_KEY
$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $HVT_RESERVE_ACCOUNT     $PUBLIC_KEY

#move eos to the new accounts
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$PXS_RESERVE_ACCOUNT\",     \"20.0000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$KARMA_RESERVE_ACCOUNT\",   \"20.0000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$TRYBE_RESERVE_ACCOUNT\",   \"20.0000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$MEETONE_RESERVE_ACCOUNT\", \"20.0000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$EOSDAC_RESERVE_ACCOUNT\",  \"20.0000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$IQ_RESERVE_ACCOUNT\",      \"20.0000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$HVT_RESERVE_ACCOUNT\",     \"20.0000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active

# create tokens
$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0000 PXS\"]"     -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0000 KARMA\"]"   -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0000 TRYBE\"]"   -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0000 MEETONE\"]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0000 EOSDAC\"]"  -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.000 IQ\"]"       -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0000 HVT\"]"     -p $TOKEN_ACCOUNT@active

$jleos push action $TOKEN_ACCOUNT issue "[ \"$PXS_RESERVE_ACCOUNT\",     \"100000000.0000 PXS\",     \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$KARMA_RESERVE_ACCOUNT\",   \"100000000.0000 KARMA\",   \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$TRYBE_RESERVE_ACCOUNT\",   \"100000000.0000 TRYBE\",   \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$MEETONE_RESERVE_ACCOUNT\", \"100000000.0000 MEETONE\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$EOSDAC_RESERVE_ACCOUNT\",  \"100000000.0000 EOSDAC\",  \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$IQ_RESERVE_ACCOUNT\",      \"100000000.000 IQ\",       \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$HVT_RESERVE_ACCOUNT\",     \"100000000.0000 HVT\",     \"memo\" ]" -p $TOKEN_ACCOUNT@active

#move tokens to alice
$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"10000.0000 PXS\",     \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"10000.0000 KARMA\",   \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"10000.0000 TRYBE\",   \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"10000.0000 MEETONE\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"10000.0000 EOSDAC\",  \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"10000.000 IQ\",       \"memo\" ]" -p $TOKEN_ACCOUNT@active
$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"10000.0000 HVT\",     \"memo\" ]" -p $TOKEN_ACCOUNT@active

# create reserves for all the new tokens
$jleos system delegatebw $PXS_RESERVE_ACCOUNT     $PXS_RESERVE_ACCOUNT     "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $KARMA_RESERVE_ACCOUNT   $KARMA_RESERVE_ACCOUNT   "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $TRYBE_RESERVE_ACCOUNT   $TRYBE_RESERVE_ACCOUNT   "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $MEETONE_RESERVE_ACCOUNT $MEETONE_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $EOSDAC_RESERVE_ACCOUNT  $EOSDAC_RESERVE_ACCOUNT  "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $IQ_RESERVE_ACCOUNT      $IQ_RESERVE_ACCOUNT      "1.0 EOS" "1.0 EOS"
$jleos system delegatebw $HVT_RESERVE_ACCOUNT     $HVT_RESERVE_ACCOUNT     "1.0 EOS" "1.0 EOS"

# buy ram
$jleos system buyram $ACCOUNT_NAME $PXS_RESERVE_ACCOUNT     --kbytes 400
$jleos system buyram $ACCOUNT_NAME $KARMA_RESERVE_ACCOUNT   --kbytes 400
$jleos system buyram $ACCOUNT_NAME $TRYBE_RESERVE_ACCOUNT   --kbytes 400
$jleos system buyram $ACCOUNT_NAME $MEETONE_RESERVE_ACCOUNT --kbytes 400
$jleos system buyram $ACCOUNT_NAME $EOSDAC_RESERVE_ACCOUNT  --kbytes 400
$jleos system buyram $ACCOUNT_NAME $IQ_RESERVE_ACCOUNT      --kbytes 400
$jleos system buyram $ACCOUNT_NAME $HVT_RESERVE_ACCOUNT     --kbytes 400

#deploy reserves contracts
$jleos set contract $PXS_RESERVE_ACCOUNT     contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $PXS_RESERVE_ACCOUNT@active
$jleos set contract $KARMA_RESERVE_ACCOUNT   contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $KARMA_RESERVE_ACCOUNT@active
$jleos set contract $TRYBE_RESERVE_ACCOUNT   contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $TRYBE_RESERVE_ACCOUNT@active
$jleos set contract $MEETONE_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $MEETONE_RESERVE_ACCOUNT@active
$jleos set contract $EOSDAC_RESERVE_ACCOUNT  contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $EOSDAC_RESERVE_ACCOUNT@active
$jleos set contract $IQ_RESERVE_ACCOUNT      contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $IQ_RESERVE_ACCOUNT@active
$jleos set contract $HVT_RESERVE_ACCOUNT     contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $HVT_RESERVE_ACCOUNT@active

#init 
$jleos push action $PXS_RESERVE_ACCOUNT      init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"4,PXS\",     \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $PXS_RESERVE_ACCOUNT@active
$jleos push action $KARMA_RESERVE_ACCOUNT    init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"4,KARMA\",   \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $KARMA_RESERVE_ACCOUNT@active
$jleos push action $TRYBE_RESERVE_ACCOUNT    init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"4,TRYBE\",   \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $TRYBE_RESERVE_ACCOUNT@active
$jleos push action $MEETONE_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"4,MEETONE\", \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $MEETONE_RESERVE_ACCOUNT@active
$jleos push action $EOSDAC_RESERVE_ACCOUNT   init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"4,EOSDAC\",  \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $EOSDAC_RESERVE_ACCOUNT@active
$jleos push action $IQ_RESERVE_ACCOUNT       init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"3,IQ\",      \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $IQ_RESERVE_ACCOUNT@active
$jleos push action $HVT_RESERVE_ACCOUNT      init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"4,HVT\",     \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $HVT_RESERVE_ACCOUNT@active

#set params
$jleos push action $PXS_RESERVE_ACCOUNT     setparams '[ "0.035", "0.00001"  , "20.0000 EOS", "20.0000 EOS", "0.25", "0.00004",  "0.00001" ]'   -p $RESERVE_OWNER_ACCOUNT@active
$jleos push action $KARMA_RESERVE_ACCOUNT   setparams '[ "0.035", "0.000107" , "20.0000 EOS", "20.0000 EOS", "0.25", "0.000428", "0.000107" ]'  -p $RESERVE_OWNER_ACCOUNT@active
$jleos push action $TRYBE_RESERVE_ACCOUNT   setparams '[ "0.035", "0.0006"   , "20.0000 EOS", "20.0000 EOS", "0.25", "0.0024",   "0.0006" ]'    -p $RESERVE_OWNER_ACCOUNT@active
$jleos push action $MEETONE_RESERVE_ACCOUNT setparams '[ "0.035", "0.000404" , "20.0000 EOS", "20.0000 EOS", "0.25", "0.001616", "0.000404" ]'  -p $RESERVE_OWNER_ACCOUNT@active
$jleos push action $EOSDAC_RESERVE_ACCOUNT  setparams '[ "0.035", "0.001015" , "20.0000 EOS", "20.0000 EOS", "0.25", "0.00406",  "0.001015" ]'  -p $RESERVE_OWNER_ACCOUNT@active
$jleos push action $IQ_RESERVE_ACCOUNT      setparams '[ "0.035", "0.0004765", "20.0000 EOS", "20.0000 EOS", "0.25", "0.001906", "0.0004765" ]' -p $RESERVE_OWNER_ACCOUNT@active
$jleos push action $HVT_RESERVE_ACCOUNT     setparams '[ "0.035", "0.000355" , "20.0000 EOS", "20.0000 EOS", "0.25", "0.00142",  "0.000355" ]'  -p $RESERVE_OWNER_ACCOUNT@active

#add code premission (later only codepermission will be left as control will be resigned)
$jleos set account permission $PXS_RESERVE_ACCOUNT     active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$PXS_RESERVE_ACCOUNT\",    \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $PXS_RESERVE_ACCOUNT@active
$jleos set account permission $KARMA_RESERVE_ACCOUNT   active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$KARMA_RESERVE_ACCOUNT\",  \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $KARMA_RESERVE_ACCOUNT@active
$jleos set account permission $TRYBE_RESERVE_ACCOUNT   active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$TRYBE_RESERVE_ACCOUNT\",  \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $TRYBE_RESERVE_ACCOUNT@active
$jleos set account permission $MEETONE_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$MEETONE_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $MEETONE_RESERVE_ACCOUNT@active
$jleos set account permission $EOSDAC_RESERVE_ACCOUNT  active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$EOSDAC_RESERVE_ACCOUNT\", \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $EOSDAC_RESERVE_ACCOUNT@active
$jleos set account permission $IQ_RESERVE_ACCOUNT      active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$IQ_RESERVE_ACCOUNT\",     \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $IQ_RESERVE_ACCOUNT@active
$jleos set account permission $HVT_RESERVE_ACCOUNT     active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$HVT_RESERVE_ACCOUNT\",    \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $HVT_RESERVE_ACCOUNT@active

#add reserves to network
$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$PXS_RESERVE_ACCOUNT\", true ]"     -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$KARMA_RESERVE_ACCOUNT\", true ]"   -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$TRYBE_RESERVE_ACCOUNT\", true ]"   -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$MEETONE_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$EOSDAC_RESERVE_ACCOUNT\", true ]"  -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$IQ_RESERVE_ACCOUNT\", true ]"      -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$HVT_RESERVE_ACCOUNT\", true ]"     -p $NETWORK_OWNER_ACCOUNT@active

#list reserve pairs
$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$PXS_RESERVE_ACCOUNT\",     \"4,PXS\",     \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$KARMA_RESERVE_ACCOUNT\",   \"4,KARMA\",   \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$TRYBE_RESERVE_ACCOUNT\",   \"4,TRYBE\",   \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$MEETONE_RESERVE_ACCOUNT\", \"4,MEETONE\", \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$EOSDAC_RESERVE_ACCOUNT\",  \"4,EOSDAC\",  \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$IQ_RESERVE_ACCOUNT\",      \"3,IQ\",      \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$HVT_RESERVE_ACCOUNT\",     \"4,HVT\",     \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active

#change premission to code only (after seeing stuff works)
# TODO

# end of deployment, now out trying stuff #

# complete a sell
#$jleos push action $TOKEN_ACCOUNT transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"811.2926 TRYBE\", \"4 EOS,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active

### $jleos push action $TOKEN_ACCOUNT transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0100 SYS\", \"$ALICE_ACCOUNT,$TOKEN_ACCOUNT,4 SYS,$EOS_ACCOUNT,4 EOS,$MOSHE_ACCOUNT,20,0.000001,somewallid,somehint\" ]" -p $ALICE_ACCOUNT@active
### $jleos push action $TOKEN_ACCOUNT transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0100 OTA\", \"$ALICE_ACCOUNT,$TOKEN_ACCOUNT,4 OTA,$EOS_ACCOUNT,4 EOS,$MOSHE_ACCOUNT,20,0.000001,somewallid,somehint\" ]" -p $ALICE_ACCOUNT@active
###$jleos push action $ANOTHER_TOKEN_ACCOUNT transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0100 NTA\", \"$ALICE_ACCOUNT,$ANOTHER_TOKEN_ACCOUNT,4 NTA,$EOS_ACCOUNT,4 EOS,$MOSHE_ACCOUNT,20,0.000001,somewallid,somehint\" ]" -p $ALICE_ACCOUNT@active

# complete a buy
### $jleos push action $EOS_ACCOUNT transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0100 EOS\", \"$ALICE_ACCOUNT,$EOS_ACCOUNT,4 EOS,$TOKEN_ACCOUNT,4 SYS,$MOSHE_ACCOUNT,100000,0.000001,somewallid,somehint\" ]" -p $ALICE_ACCOUNT@active
###$jleos push action $EOS_ACCOUNT transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0100 EOS\", \"$ALICE_ACCOUNT,$EOS_ACCOUNT,4 EOS,$TOKEN_ACCOUNT,4 OTA,$MOSHE_ACCOUNT,100000,0.000001,somewallid,somehint\" ]" -p $ALICE_ACCOUNT@active
###$jleos push action $EOS_ACCOUNT transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0100 EOS\", \"$ALICE_ACCOUNT,$EOS_ACCOUNT,4 EOS,$ANOTHER_TOKEN_ACCOUNT,4 NTA,$MOSHE_ACCOUNT,100000,0.000001,somewallid,somehint\" ]" -p $ALICE_ACCOUNT@active

#$jleos get table $NETWORK_ACCOUNT $NETWORK_ACCOUNT reservespert
##!!!!$jleos push action eosio.token transfer "[ \"$MOSHE_ACCOUNT\", \"$OTA_RESERVE_ACCOUNT\", \"0.100 EOS\", \"$MOSHE_ACCOUNT\" ]" -p $NETWORK_ACCOUNT@active
##$jleos get table $OTA_RESERVE_ACCOUNT $OTA_RESERVE_ACCOUNT rate
exit

