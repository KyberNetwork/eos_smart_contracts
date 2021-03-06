## means we skip it for now
### means we already did it

set -x
jleos="cleos -u http://jungle2.cryptolions.io:80"

CREATE_TOKENS=false

PUBLIC_KEY=EOS7qKhbpNCruW5F93FkRSWxoLk2HXJoDyxGU4GD1rKPLTtMvsabC
ACCOUNT_NAME=lionofcourse
RESERVE_ADMIN_ACCOUNT=lionofcourse
NETWORK_ACCOUNT="yolonetw1121"
#NETWORK_ACCOUNT="yolonetw1115"
#NETWORK_ACCOUNT="yolonetw1113"
NETWORK_ADMIN_ACCOUNT=lionofcourse
EOS_ACCOUNT="eosio.token"
MOSHE_ACCOUNT="testmoseaaaa"
ALICE_ACCOUNT="testalicaaaa"

ARR_RESERVE_ACCOUNT[0]="yolorese1213"
ARR_RESERVE_ACCOUNT[1]="yolorese1214"
ARR_RESERVE_ACCOUNT[2]="yolorese1215"
ARR_RESERVE_ACCOUNT[3]="yolorese1221"
ARR_RESERVE_ACCOUNT[4]="yolorese1222"
ARR_RESERVE_ACCOUNT[5]="yolorese1223"
ARR_RESERVE_ACCOUNT[6]="yolorese1224"

ARR_SYMBOL[0]="IQ"
ARR_SYMBOL[1]="PXS"
ARR_SYMBOL[2]="HVT"
ARR_SYMBOL[3]="KARMA"
ARR_SYMBOL[4]="TRYBE"
ARR_SYMBOL[5]="EOSDAC"
ARR_SYMBOL[6]="MEETONE"

ARR_DECIMALS[0]=3
ARR_DECIMALS[1]=4
ARR_DECIMALS[2]=4
ARR_DECIMALS[3]=4
ARR_DECIMALS[4]=4
ARR_DECIMALS[5]=4
ARR_DECIMALS[6]=4


ARR_DECIMALS_ZEROS[0]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[0]}))"}"); }`
ARR_DECIMALS_ZEROS[1]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[1]}))"}"); }`
ARR_DECIMALS_ZEROS[2]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[2]}))"}"); }`
ARR_DECIMALS_ZEROS[3]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[3]}))"}"); }`
ARR_DECIMALS_ZEROS[4]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[4]}))"}"); }`
ARR_DECIMALS_ZEROS[5]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[5]}))"}"); }`
ARR_DECIMALS_ZEROS[6]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[6]}))"}"); }`

ARR_TOKEN_ACCOUNT[0]="testtokeaaaa"
ARR_TOKEN_ACCOUNT[1]="testtokeaaaa"
ARR_TOKEN_ACCOUNT[2]="testtokeaaaa"
ARR_TOKEN_ACCOUNT[3]="testtokeaaaa"
ARR_TOKEN_ACCOUNT[4]="testtokeaaaa"
ARR_TOKEN_ACCOUNT[5]="testtokeaaaa"
ARR_TOKEN_ACCOUNT[6]="testtokeaaaa"

for idx in 0 1 2 3 4 5 6
do 
    # create more reserve account
    $jleos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME ${ARR_RESERVE_ACCOUNT[$idx]} $PUBLIC_KEY

    sleep 2

    #move small amount of eos to the new accounts (before deployment)
    $jleos push action $EOS_ACCOUNT transfer "[ \"$ACCOUNT_NAME\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"4.0000 EOS\", \"deposit\" ]" -p $ACCOUNT_NAME@active

    if $CREATE_TOKENS; then
    	# create tokens
    	$jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} create "[ \"${ARR_TOKEN_ACCOUNT[$idx]}\", \"1000000000.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\" ]" -p ${ARR_TOKEN_ACCOUNT[$idx]}@active
    fi

    #move tokens to alice
    $jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} issue "[ \"$ALICE_ACCOUNT\", \"100000.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\", \"memo\" ]" -p ${ARR_TOKEN_ACCOUNT[$idx]}@active

    #move tokens to reserve admin
    $jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} issue "[ \"$RESERVE_ADMIN_ACCOUNT\", \"100000000.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\", \"memo\" ]" -p ${ARR_TOKEN_ACCOUNT[$idx]}@active

    # create reserves for all the new tokens
    $jleos system delegatebw ${ARR_RESERVE_ACCOUNT[$idx]} ${ARR_RESERVE_ACCOUNT[$idx]} "1.0 EOS" "1.0 EOS"
    
    # buy ram
    $jleos system buyram $ACCOUNT_NAME ${ARR_RESERVE_ACCOUNT[$idx]} --kbytes 450
    
    #deploy reserves contracts
    $jleos set contract ${ARR_RESERVE_ACCOUNT[$idx]} contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p ${ARR_RESERVE_ACCOUNT[$idx]}@active
    
    sleep 3
    
    #init 
    $jleos push action ${ARR_RESERVE_ACCOUNT[$idx]} init "[\"$RESERVE_ADMIN_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"${ARR_DECIMALS[$idx]},${ARR_SYMBOL[$idx]}\", \"${ARR_TOKEN_ACCOUNT[$idx]}\", \"$EOS_ACCOUNT\", true ]" -p ${ARR_RESERVE_ACCOUNT[$idx]}@active
    
    #add code premission
    $jleos set account permission ${ARR_RESERVE_ACCOUNT[$idx]} active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"${ARR_RESERVE_ACCOUNT[$idx]}\", \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p ${ARR_RESERVE_ACCOUNT[$idx]}@active

    #add reserves to network
    $jleos push action $NETWORK_ACCOUNT addreserve "[ \"${ARR_RESERVE_ACCOUNT[$idx]}\", true ]" -p $NETWORK_ADMIN_ACCOUNT@active

    #list reserve pairs                 
    $jleos push action $NETWORK_ACCOUNT listpairres "[ \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"${ARR_DECIMALS[$idx]},${ARR_SYMBOL[$idx]}\", \"${ARR_TOKEN_ACCOUNT[$idx]}\", true ]" -p $NETWORK_ADMIN_ACCOUNT@active
done

for idx in 0 1 2 3 4 5 6
do
    #move more eos to the new accounts (done by reserev admin)
    $jleos push action $EOS_ACCOUNT transfer "[ \"$RESERVE_ADMIN_ACCOUNT\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"16.0000 EOS\", \"deposit\" ]" -p $RESERVE_ADMIN_ACCOUNT@active
        
    #move tokens to the new account (done by resereve admin)
    $jleos push action ${ARR_TOKEN_ACCOUNT[$idx]} transfer "[ \"$RESERVE_ADMIN_ACCOUNT\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"100000000.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\", \"deposit\" ]" -p $RESERVE_ADMIN_ACCOUNT@active

done

# previous params deployed:
$jleos push action ${ARR_RESERVE_ACCOUNT[0]}  quickset '["0.00078968"]' -p $RESERVE_ADMIN_ACCOUNT@active
$jleos push action ${ARR_RESERVE_ACCOUNT[1]}  quickset '["0.00032"]' -p $RESERVE_ADMIN_ACCOUNT@active
$jleos push action ${ARR_RESERVE_ACCOUNT[2]}  quickset '["0.00071"]' -p $RESERVE_ADMIN_ACCOUNT@active
$jleos push action ${ARR_RESERVE_ACCOUNT[3]}  quickset '["0.000110"]' -p $RESERVE_ADMIN_ACCOUNT@active
$jleos push action ${ARR_RESERVE_ACCOUNT[4]}  quickset '["0.00080"]' -p $RESERVE_ADMIN_ACCOUNT@active
$jleos push action ${ARR_RESERVE_ACCOUNT[5]}  quickset '["0.00133"]' -p $RESERVE_ADMIN_ACCOUNT@active
$jleos push action ${ARR_RESERVE_ACCOUNT[6]}  quickset '["0.00048"]' -p $RESERVE_ADMIN_ACCOUNT@active

# complete a sell
$jleos push action ${ARR_TOKEN_ACCOUNT[0]} transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"1000.0000 ${ARR_SYMBOL[0]}\", \"4 EOS,$EOS_ACCOUNT,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active
$jleos push action ${ARR_TOKEN_ACCOUNT[1]} transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"1000.0000 ${ARR_SYMBOL[1]}\", \"4 EOS,$EOS_ACCOUNT,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active
$jleos push action ${ARR_TOKEN_ACCOUNT[2]} transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"1000.0000 ${ARR_SYMBOL[2]}\", \"4 EOS,$EOS_ACCOUNT,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active
$jleos push action ${ARR_TOKEN_ACCOUNT[3]} transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"1000.0000 ${ARR_SYMBOL[3]}\", \"4 EOS,$EOS_ACCOUNT,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active
$jleos push action ${ARR_TOKEN_ACCOUNT[4]} transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"1000.0000 ${ARR_SYMBOL[4]}\", \"4 EOS,$EOS_ACCOUNT,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active
$jleos push action ${ARR_TOKEN_ACCOUNT[5]} transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"1000.0000 ${ARR_SYMBOL[5]}\", \"4 EOS,$EOS_ACCOUNT,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active
$jleos push action ${ARR_TOKEN_ACCOUNT[6]} transfer "[ \"$ALICE_ACCOUNT\", \"$NETWORK_ACCOUNT\", \"1000.0000 ${ARR_SYMBOL[6]}\", \"4 EOS,$EOS_ACCOUNT,$ALICE_ACCOUNT,0.0000001\" ]" -p $ALICE_ACCOUNT@active
