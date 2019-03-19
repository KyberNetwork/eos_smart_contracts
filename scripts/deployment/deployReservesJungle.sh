## means we skip it for now
### means we already did it

set -x
jleos="cleos -u http://jungle2.cryptolions.io:80"

ISSUE_TOKENS=true

PUBLIC_KEY=EOS7qKhbpNCruW5F93FkRSWxoLk2HXJoDyxGU4GD1rKPLTtMvsabC
ACCOUNT_NAME=lionofcourse
ARR_TOKEN_ACCOUNT[idx]="testtokeaaaa"
RESERVE_ADMIN_ACCOUNT=lionofcourse
NETWORK_ACCOUNT="yolonetw1115"
#NETWORK_ACCOUNT="yolonetw1113"
NETWORK_ADMIN_ACCOUNT=lionofcourse
EOS_ACCOUNT="eosio.token"
MOSHE_ACCOUNT="testmoseaaaa"
ALICE_ACCOUNT="testalicaaaa"


ARR_RESERVE_ACCOUNT[0]="yolresexa114"
ARR_RESERVE_ACCOUNT[1]="yolresexa115"
 
ARR_SYMBOL[0]="EXD"
ARR_SYMBOL[1]="EXE"

ARR_DECIMALS[0]=4
ARR_DECIMALS[1]=2

ARR_DECIMALS_ZEROS[0]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[0]}))"}"); }`
ARR_DECIMALS_ZEROS[1]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[1]}))"}"); }`

ARR_TOKEN_ACCOUNT[0]="testtokeaaaa"
ARR_TOKEN_ACCOUNT[1]="testtokeaaab"

for idx in 0 1
do
	break
    # create more reserve account
    $jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME ${ARR_RESERVE_ACCOUNT[$idx]} $PUBLIC_KEY
    
    #move small amount of eos to the new accounts (before deployment)
    $jleos push action $EOS_ACCOUNT transfer "[ \"$ACCOUNT_NAME\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"4.0000 EOS\", \"deposit\" ]" -p $ACCOUNT_NAME@active

    if $ISSUE_TOKENS; then
    	# create tokens
    	$jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} create "[ \"${ARR_TOKEN_ACCOUNT[$idx]}\", \"1000000000.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\" ]" -p ${ARR_TOKEN_ACCOUNT[$idx]}@active

        #move tokens to alice
        $jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} issue "[ \"$ALICE_ACCOUNT\", \"100000.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\", \"memo\" ]" -p ${ARR_TOKEN_ACCOUNT[$idx]}@active
    
        #move tokens to reserve admin
        $jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} issue "[ \"$RESERVE_ADMIN_ACCOUNT\", \"100000000.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\", \"memo\" ]" -p ${ARR_TOKEN_ACCOUNT[$idx]}@active
    fi

    # create reserves for all the new tokens
    $jleos system delegatebw ${ARR_RESERVE_ACCOUNT[$idx]} ${ARR_RESERVE_ACCOUNT[$idx]} "1.0 EOS" "1.0 EOS"
    
    # buy ram
    $jleos system buyram $ACCOUNT_NAME ${ARR_RESERVE_ACCOUNT[$idx]} --kbytes 400
    
    #deploy reserves contracts
    $jleos set contract ${ARR_RESERVE_ACCOUNT[$idx]} contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p ${ARR_RESERVE_ACCOUNT[$idx]}@active
    
    sleep 3
    
    #init 
    $jleos push action ${ARR_RESERVE_ACCOUNT[$idx]} init "[\"$RESERVE_ADMIN_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"${ARR_DECIMALS[$idx]},${ARR_SYMBOL[$idx]}\", \"${ARR_TOKEN_ACCOUNT[$idx]}\", \"$EOS_ACCOUNT\", true ]" -p ${ARR_RESERVE_ACCOUNT[$idx]}@active
    
    #add code premission (later only codepermission will be left as control will be resigned)
    $jleos set account permission ${ARR_RESERVE_ACCOUNT[$idx]} active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"${ARR_RESERVE_ACCOUNT[$idx]}\", \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p ${ARR_RESERVE_ACCOUNT[$idx]}@active
    
    #add reserves to network
    $jleos push action $NETWORK_ACCOUNT addreserve "[ \"${ARR_RESERVE_ACCOUNT[$idx]}\", true ]" -p $NETWORK_ADMIN_ACCOUNT@active

    #list reserve pairs                 
    $jleos push action $NETWORK_ACCOUNT listpairres "[ \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"${ARR_DECIMALS[$idx]},${ARR_SYMBOL[$idx]}\", \"${ARR_TOKEN_ACCOUNT[$idx]}\", true ]" -p $NETWORK_ADMIN_ACCOUNT@active

    #change premission to code only (after seeing stuff works)
    # TODO
done

for idx in 0 1
do
    #move more eos to the new accounts (done by reserev admin)
    $jleos push action $EOS_ACCOUNT transfer "[ \"$RESERVE_ADMIN_ACCOUNT\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"19.0000 EOS\", \"deposit\" ]" -p $RESERVE_ADMIN_ACCOUNT@active
        
    #move tokens to the new account (done by reserev admin)
    $jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} transfer "[ \"$RESERVE_ADMIN_ACCOUNT\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"100000000.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\", \"deposit\" ]" -p $RESERVE_ADMIN_ACCOUNT@active
done

# previous params deployed:
#$jleos push action $PXS_RESERVE_ACCOUNT     setparams '[ "0.035", "0.00001"  , "20.0000 EOS", "20.0000 EOS", "0.25", "0.00004",  "0.00001" ]'   -p $RESERVE_ADMIN_ACCOUNT@active
#$jleos push action $KARMA_RESERVE_ACCOUNT   setparams '[ "0.035", "0.000107" , "20.0000 EOS", "20.0000 EOS", "0.25", "0.000428", "0.000107" ]'  -p $RESERVE_ADMIN_ACCOUNT@active
#$jleos push action $TRYBE_RESERVE_ACCOUNT   setparams '[ "0.035", "0.0006"   , "20.0000 EOS", "20.0000 EOS", "0.25", "0.0024",   "0.0006" ]'    -p $RESERVE_ADMIN_ACCOUNT@active
#$jleos push action $MEETONE_RESERVE_ACCOUNT setparams '[ "0.035", "0.000404" , "20.0000 EOS", "20.0000 EOS", "0.25", "0.001616", "0.000404" ]'  -p $RESERVE_ADMIN_ACCOUNT@active
#$jleos push action $EOSDAC_RESERVE_ACCOUNT  setparams '[ "0.035", "0.001015" , "20.0000 EOS", "20.0000 EOS", "0.25", "0.00406",  "0.001015" ]'  -p $RESERVE_ADMIN_ACCOUNT@active
#$jleos push action $IQ_RESERVE_ACCOUNT      setparams '[ "0.035", "0.0004765", "20.0000 EOS", "20.0000 EOS", "0.25", "0.001906", "0.0004765" ]' -p $RESERVE_ADMIN_ACCOUNT@active
#$jleos push action $HVT_RESERVE_ACCOUNT     setparams '[ "0.035", "0.000355" , "20.0000 EOS", "20.0000 EOS", "0.25", "0.00142",  "0.000355" ]'  -p $RESERVE_ADMIN_ACCOUNT@active


#set params (done by reserve admin)
$jleos push action ${ARR_RESERVE_ACCOUNT[0]} setparams '[ "0.035", "0.00022"  , "20.0000 EOS", "20.0000 EOS", "0.25", "0.00004",  "0.00001" ]' -p $RESERVE_ADMIN_ACCOUNT@active
$jleos push action ${ARR_RESERVE_ACCOUNT[1]} setparams '[ "0.035", "0.00033"  , "20.0000 EOS", "20.0000 EOS", "0.25", "0.00004",  "0.00001" ]' -p $RESERVE_ADMIN_ACCOUNT@active    

# complete a sell
#$jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"811.2926 ${ARR_SYMBOL[$idx]}\", \"4 EOS,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active

