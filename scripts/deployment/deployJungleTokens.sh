## means we skip it for now
### means we already did it

set -x
jleos="cleos -u http://jungle2.cryptolions.io:80"

PUBLIC_KEY=EOS7qKhbpNCruW5F93FkRSWxoLk2HXJoDyxGU4GD1rKPLTtMvsabC
ACCOUNT_NAME=lionofcourse
TOKEN_ACCOUNT="testtokeaaaa"

RESERVE_OWNER_ACCOUNT=lionofcourse
NETWORK_ACCOUNT="yolonetw1112"
NETWORK_OWNER_ACCOUNT=lionofcourse
EOS_ACCOUNT="eosio.token"
MOSHE_ACCOUNT="testmoseaaaa"
ALICE_ACCOUNT="testalicaaaa"

ANOTHER_TOKEN_ACCOUNT="testtokeaaab"
OTA_RESERVE_ACCOUNT="yolorese1131"
OTB_RESERVE_ACCOUNT="yolorese1114"
OTC_RESERVE_ACCOUNT="yolorese1115"
OTD_RESERVE_ACCOUNT="yolorese1121"
NTA_RESERVE_ACCOUNT="yolorese1122"
NTB_RESERVE_ACCOUNT="yolorese1123"
NTC_RESERVE_ACCOUNT="yolorese1124"
NTD_RESERVE_ACCOUNT="yolorese1125"


# deploy another contract just to make it interesting
###$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $ANOTHER_TOKEN_ACCOUNT $PUBLIC_KEY

# create more reserve account
###$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $OTA_RESERVE_ACCOUNT $PUBLIC_KEY
###$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $OTB_RESERVE_ACCOUNT $PUBLIC_KEY
##$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $OTC_RESERVE_ACCOUNT $PUBLIC_KEY
##$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $OTD_RESERVE_ACCOUNT $PUBLIC_KEY
###$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $NTA_RESERVE_ACCOUNT $PUBLIC_KEY
###$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $NTB_RESERVE_ACCOUNT $PUBLIC_KEY
##$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $NTC_RESERVE_ACCOUNT $PUBLIC_KEY
##$jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $NTD_RESERVE_ACCOUNT $PUBLIC_KEY

#move eos to the new accounts
###$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$ANOTHER_TOKEN_ACCOUNT\", \"3.0000 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
###$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$OTA_RESERVE_ACCOUNT\", \"7.1300 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
###$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$OTB_RESERVE_ACCOUNT\", \"7.1300 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
##$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$OTC_RESERVE_ACCOUNT\", \"7.1300 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
##$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$OTD_RESERVE_ACCOUNT\", \"7.100 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
###$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$NTA_RESERVE_ACCOUNT\", \"7.1300 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
###$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$NTB_RESERVE_ACCOUNT\", \"7.1300 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
##$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$NTC_RESERVE_ACCOUNT\", \"7.1300 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active
##$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$NTD_RESERVE_ACCOUNT\", \"7.1300 EOS\", "deposit" ]" -p $ACCOUNT_NAME@active

###$jleos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$ANOTHER_TOKEN_ACCOUNT\", \"3.0000 EOS\", "m" ]" -p $ACCOUNT_NAME@active
###$jleos system delegatebw $ANOTHER_TOKEN_ACCOUNT   $ANOTHER_TOKEN_ACCOUNT   "1.0 EOS" "1.0 EOS"
###$jleos system buyram $ACCOUNT_NAME $ANOTHER_TOKEN_ACCOUNT --kbytes 200
###jleos set contract $ANOTHER_TOKEN_ACCOUNT contracts/Token Token.wasm --abi Token.abi -p $ANOTHER_TOKEN_ACCOUNT@active


# create 4 more tokens with old token account
###$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0000 OTA\"]" -p $TOKEN_ACCOUNT@active
###$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.000 OTB\"]" -p $TOKEN_ACCOUNT@active
##$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.00 OTC\"]" -p $TOKEN_ACCOUNT@active
##$jleos push action $TOKEN_ACCOUNT create "[ \"$TOKEN_ACCOUNT\", \"1000000000.0 OTD\"]" -p $TOKEN_ACCOUNT@active

# create 4 more tokens with new tokens accout
###$jleos push action $ANOTHER_TOKEN_ACCOUNT create "[ \"$ANOTHER_TOKEN_ACCOUNT\", \"1000000000.0000 NTA\"]" -p $ANOTHER_TOKEN_ACCOUNT@active
###$jleos push action $ANOTHER_TOKEN_ACCOUNT create "[ \"$ANOTHER_TOKEN_ACCOUNT\", \"1000000000.000 NTB\"]" -p $ANOTHER_TOKEN_ACCOUNT@active
##$jleos push action $ANOTHER_TOKEN_ACCOUNT create "[ \"$ANOTHER_TOKEN_ACCOUNT\", \"1000000000.00 NTC\"]" -p $TOKEN_ACCOUNT@active
##$jleos push action $ANOTHER_TOKEN_ACCOUNT create "[ \"$ANOTHER_TOKEN_ACCOUNT\", \"1000000000.0 NTD\"]" -p $TOKEN_ACCOUNT@active

#move tokens to reserves acccounts
sleep 1
###$jleos push action $TOKEN_ACCOUNT issue "[ \"$OTA_RESERVE_ACCOUNT\", \"100.0000 OTA\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
###$jleos push action $TOKEN_ACCOUNT issue "[ \"$OTB_RESERVE_ACCOUNT\", \"100.000 OTB\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
##$jleos push action $TOKEN_ACCOUNT issue "[ \"$OTC_RESERVE_ACCOUNT\", \"100.00 OTC\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
##$jleos push action $TOKEN_ACCOUNT issue "[ \"$OTD_RESERVE_ACCOUNT\", \"100.0 OTD\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
###$jleos push action $ANOTHER_TOKEN_ACCOUNT issue "[ \"$NTA_RESERVE_ACCOUNT\", \"100.0000 NTA\", \"memo\" ]" -p $ANOTHER_TOKEN_ACCOUNT@active
###$jleos push action $ANOTHER_TOKEN_ACCOUNT issue "[ \"$NTB_RESERVE_ACCOUNT\", \"100.000 NTB\", \"memo\" ]" -p $ANOTHER_TOKEN_ACCOUNT@active
##$jleos push action $ANOTHER_TOKEN_ACCOUNT issue "[ \"$NTC_RESERVE_ACCOUNT\", \"100.00 NTC\", \"memo\" ]" -p $ANOTHER_TOKEN_ACCOUNT@active
##$jleos push action $ANOTHER_TOKEN_ACCOUNT issue "[ \"$NTD_RESERVE_ACCOUNT\", \"100.0 NTD\", \"memo\" ]" -p $ANOTHER_TOKEN_ACCOUNT@active

#move tokens to alice
###$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.0000 OTA\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
##$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.000 OTB\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
##$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.00 OTC\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
##$jleos push action $TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.0 OTD\", \"memo\" ]" -p $TOKEN_ACCOUNT@active
###$jleos push action $ANOTHER_TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.0000 NTA\", \"memo\" ]" -p $ANOTHER_TOKEN_ACCOUNT@active
##$jleos push action $ANOTHER_TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.000 NTB\", \"memo\" ]" -p $ANOTHER_TOKEN_ACCOUNT@active
##$jleos push action $ANOTHER_TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.00 NTC\", \"memo\" ]" -p $ANOTHER_TOKEN_ACCOUNT@active
##$jleos push action $ANOTHER_TOKEN_ACCOUNT issue "[ \"$ALICE_ACCOUNT\", \"100.0 NTD\", \"memo\" ]" -p $ANOTHER_TOKEN_ACCOUNT@active

# create reserves for all the new tokens
### $jleos system delegatebw $OTA_RESERVE_ACCOUNT $OTA_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
## $jleos system delegatebw $OTA_RESERVE_ACCOUNT $OTB_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
## $jleos system delegatebw $OTA_RESERVE_ACCOUNT $OTC_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
## $jleos system delegatebw $OTA_RESERVE_ACCOUNT $OTD_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
###$jleos system delegatebw $OTA_RESERVE_ACCOUNT $NTA_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
## $jleos system delegatebw $OTA_RESERVE_ACCOUNT $NTB_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
## $jleos system delegatebw $OTA_RESERVE_ACCOUNT $NTC_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"
## $jleos system delegatebw $OTA_RESERVE_ACCOUNT $NTD_RESERVE_ACCOUNT "1.0 EOS" "1.0 EOS"

# buy ram
###$jleos system buyram $ACCOUNT_NAME $OTA_RESERVE_ACCOUNT --kbytes 400
## $jleos system buyram $ACCOUNT_NAME $OTB_RESERVE_ACCOUNT --kbytes 400
## $jleos system buyram $ACCOUNT_NAME $OTC_RESERVE_ACCOUNT --kbytes 400
## $jleos system buyram $ACCOUNT_NAME $OTD_RESERVE_ACCOUNT --kbytes 400
###$jleos system buyram $ACCOUNT_NAME $NTA_RESERVE_ACCOUNT --kbytes 400
## $jleos system buyram $ACCOUNT_NAME $NTB_RESERVE_ACCOUNT --kbytes 400
## $jleos system buyram $ACCOUNT_NAME $NTC_RESERVE_ACCOUNT --kbytes 400
## $jleos system buyram $ACCOUNT_NAME $NTD_RESERVE_ACCOUNT --kbytes 400

#deploy reserves contracts
###$jleos set contract $OTA_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $OTA_RESERVE_ACCOUNT@active
##jleos set contract $OTB_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $OTA_RESERVE_ACCOUNT@active
##jleos set contract $OTC_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $OTA_RESERVE_ACCOUNT@active
##jleos set contract $OTD_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $OTA_RESERVE_ACCOUNT@active
###$jleos set contract $NTA_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $NTA_RESERVE_ACCOUNT@active
##jleos set contract $NTB_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $OTA_RESERVE_ACCOUNT@active
##jleos set contract $NTC_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $OTA_RESERVE_ACCOUNT@active
##jleos set contract $NTD_RESERVE_ACCOUNT contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p $OTA_RESERVE_ACCOUNT@active

#init 
###$jleos push action $OTA_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0000 OTA\", \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $OTA_RESERVE_ACCOUNT@active
##$jleos push action $OTB_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0000 OTB\", \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $OTB_RESERVE_ACCOUNT@active
##$jleos push action $OTC_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.000 OTC\", \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $OTC_RESERVE_ACCOUNT@active
##$jleos push action $OTD_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.00 OTD\", \"$TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $OTD_RESERVE_ACCOUNT@active
###$jleos push action $NTA_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0000 NTA\", \"$ANOTHER_TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $NTA_RESERVE_ACCOUNT@active
##$jleos push action $NTB_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.000 NTB\", \"$ANOTHER_TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $NTB_RESERVE_ACCOUNT@active
##$jleos push action $NTC_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.00 NTC\", \"$ANOTHER_TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $NTC_RESERVE_ACCOUNT@active
##$jleos push action $NTD_RESERVE_ACCOUNT  init "[\"$RESERVE_OWNER_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"0.0 NTD\", \"$ANOTHER_TOKEN_ACCOUNT\", \"$EOS_ACCOUNT\", true ]" -p $OTD_RESERVE_ACCOUNT@active

#set params
###$jleos push action $OTA_RESERVE_ACCOUNT setparams '[ "0.1", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active
##$jleos push action $OTB_RESERVE_ACCOUNT setparams '[ "0.1", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active
##$jleos push action $OTC_RESERVE_ACCOUNT setparams '[ "0.1", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active
##$jleos push action $OTD_RESERVE_ACCOUNT setparams '[ "0.1", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active
###$jleos push action $NTA_RESERVE_ACCOUNT setparams '[ "0.1", "0.03", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active
##$jleos push action $NTB_RESERVE_ACCOUNT setparams '[ "0.1", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active
##$jleos push action $NTC_RESERVE_ACCOUNT setparams '[ "0.1", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active
##$jleos push action $NTD_RESERVE_ACCOUNT setparams '[ "0.1", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p $RESERVE_OWNER_ACCOUNT@active

#add code premission (later only codepermission will be left as control will be resigned)
###$jleos set account permission $OTA_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$OTA_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $OTA_RESERVE_ACCOUNT@active
##$jleos set account permission $OTB_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$OTA_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $OTB_RESERVE_ACCOUNT@active
##$jleos set account permission $OTC_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$OTA_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $OTC_RESERVE_ACCOUNT@active
##$jleos set account permission $OTD_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$OTA_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $OTD_RESERVE_ACCOUNT@active
###$jleos set account permission $NTA_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$NTA_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $NTA_RESERVE_ACCOUNT@active
##$jleos set account permission $NTB_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$OTA_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $NTB_RESERVE_ACCOUNT@active
##$jleos set account permission $NTC_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$OTA_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $NTC_RESERVE_ACCOUNT@active
##$jleos set account permission $NTD_RESERVE_ACCOUNT active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"$OTA_RESERVE_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $NTD_RESERVE_ACCOUNT@active


#add reserves to network
###$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$OTA_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$OTB_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$OTC_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$OTD_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
###$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$NTA_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$NTB_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$NTB_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$NTC_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT addreserve "[ \"$NTD_RESERVE_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active

#list reserve pairs
###$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$OTA_RESERVE_ACCOUNT\", \"0.0000 OTA\", \"$TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$OTB_RESERVE_ACCOUNT\", \"0.000 OTB\", \"$EOS_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$OTC_RESERVE_ACCOUNT\", \"0.00 OTC\", \"$EOS_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$OTD_RESERVE_ACCOUNT\", \"0.0 OTD\", \"$EOS_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
###$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$NTA_RESERVE_ACCOUNT\", \"0.0000 NTA\", \"$ANOTHER_TOKEN_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$NTB_RESERVE_ACCOUNT\", \"0.000 NTB\", \"$EOS_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$NTC_RESERVE_ACCOUNT\", \"0.00 NTC\", \"$EOS_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active
##$jleos push action $NETWORK_ACCOUNT listpairres "[ \"$NTD_RESERVE_ACCOUNT\", \"0.0 NTD\", \"$EOS_ACCOUNT\", true ]" -p $NETWORK_OWNER_ACCOUNT@active

#change premission to code only (after seeing stuff works)
# TODO

# end of deployment, now out trying stuff #

# complete a sell
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

