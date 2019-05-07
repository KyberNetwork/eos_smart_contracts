## means we skip it for now
### means we already did it

set -x
meos='cleos -v -u https://api.eossweden.se'

PUBLIC_KEY="EOS6DaNSbeHMuCg4sWbVmihGoorNteSd8rp696HBHBuDnjqav1dXy"
ACCOUNT_NAME="ramldeployer"
RESERVE_ADMIN_ACCOUNT="ramramramle1"
NETWORK_ACCOUNT="yolonetwork1"
NETWORK_ADMIN_ACCOUNT="ramramramle1"
EOS_ACCOUNT="eosio.token"
INITIAL_EOS="3.0000"

ARR_RESERVE_ACCOUNT[0]="yoresiqxx111"
ARR_SYMBOL[0]="IQ"
ARR_DECIMALS[0]=3
ARR_TOKEN_ACCOUNT[0]="everipediaiq"
ARR_INITIAL_TOKENS[0]=4285
ARR_INITIAL_PRICE[0]=0.00070306

ARR_RESERVE_ACCOUNT[1]="yorescusd111"
ARR_SYMBOL[1]="CUSD"
ARR_DECIMALS[1]=2
ARR_TOKEN_ACCOUNT[1]="stablecarbon"
ARR_INITIAL_TOKENS[1]=20
ARR_INITIAL_PRICE[1]=0.20604000

ARR_RESERVE_ACCOUNT[2]="yoresarnx111"
ARR_SYMBOL[2]="ARN"
ARR_DECIMALS[2]=8
ARR_TOKEN_ACCOUNT[2]="aeronaerozzz"
ARR_INITIAL_TOKENS[2]=39
ARR_INITIAL_PRICE[2]=0.08371616

ARR_RESERVE_ACCOUNT[3]="yoresemtx111"
ARR_SYMBOL[3]="EMT"
ARR_DECIMALS[3]=4
ARR_TOKEN_ACCOUNT[3]="emanateoneos"
ARR_INITIAL_TOKENS[3]=486
ARR_INITIAL_PRICE[3]=0.00795358

ARR_RESERVE_ACCOUNT[4]="yoresinfx111"
ARR_SYMBOL[4]="INF"
ARR_DECIMALS[4]=4
ARR_TOKEN_ACCOUNT[4]="infinicoinio"
ARR_INITIAL_TOKENS[4]=486
ARR_INITIAL_PRICE[4]=0.00052881

ARR_RESERVE_ACCOUNT[5]="yoresbntx111"
ARR_SYMBOL[5]="BNT"
ARR_DECIMALS[5]=10
ARR_TOKEN_ACCOUNT[5]="bntbntbntbnt"
ARR_INITIAL_TOKENS[5]=34
ARR_INITIAL_PRICE[5]=0.13000000

ARR_DECIMALS_ZEROS[0]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[0]}))"}"); }`
ARR_DECIMALS_ZEROS[1]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[1]}))"}"); }`
ARR_DECIMALS_ZEROS[2]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[2]}))"}"); }`
ARR_DECIMALS_ZEROS[3]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[3]}))"}"); }`
ARR_DECIMALS_ZEROS[4]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[4]}))"}"); }`
ARR_DECIMALS_ZEROS[5]=`{ printf "0"'%.s' $(eval "echo {1.."$((${ARR_DECIMALS[5]}))"}"); }`

for idx in 0 1 2 3 4 5 
do 
    break
    # create another reserve account
    $meos system newaccount --stake-net "0.1 EOS" --stake-cpu "0.1 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME ${ARR_RESERVE_ACCOUNT[$idx]} $PUBLIC_KEY

    # move some eos to reserve and stake with it 
    $meos push action $EOS_ACCOUNT transfer "[ \"$ACCOUNT_NAME\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"2.0000 EOS\", \"deposit\" ]" -p $ACCOUNT_NAME@active
    $meos system delegatebw ${ARR_RESERVE_ACCOUNT[$idx]} ${ARR_RESERVE_ACCOUNT[$idx]} "1.0 EOS" "1.0 EOS"

    # buy ram
    $meos system buyram $ACCOUNT_NAME ${ARR_RESERVE_ACCOUNT[$idx]} --kbytes 450

    # deploy reserves contracts
    $meos set contract ${ARR_RESERVE_ACCOUNT[$idx]} contracts/Reserve/AmmReserve AmmReserve.wasm --abi AmmReserve.abi -p ${ARR_RESERVE_ACCOUNT[$idx]}@active

    sleep 3

    #init 
    $meos push action ${ARR_RESERVE_ACCOUNT[$idx]} init "[\"$ACCOUNT_NAME\", \"$NETWORK_ACCOUNT\", \"${ARR_DECIMALS[$idx]},${ARR_SYMBOL[$idx]}\", \"${ARR_TOKEN_ACCOUNT[$idx]}\", \"$EOS_ACCOUNT\", true ]" -p ${ARR_RESERVE_ACCOUNT[$idx]}@active
	
    #change reserve owner
    $meos set account permission ${ARR_RESERVE_ACCOUNT[$idx]} active "{\"threshold\":1, \"keys\":[], \"accounts\":[{\"permission\":{\"actor\":\"$RESERVE_ADMIN_ACCOUNT\", \"permission\":\"active\"},\"weight\":1}, {\"permission\":{\"actor\":\"${ARR_RESERVE_ACCOUNT[$idx]}\", \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p ${ARR_RESERVE_ACCOUNT[$idx]}@active
    $meos set account permission ${ARR_RESERVE_ACCOUNT[$idx]} owner "{\"threshold\":1, \"keys\":[], \"accounts\":[{\"permission\":{\"actor\":\"$RESERVE_ADMIN_ACCOUNT\", \"permission\":\"owner\"},\"weight\":1}   ], \"waits\":[] }" "" -p ${ARR_RESERVE_ACCOUNT[$idx]}@owner

    # move more eos to the new accounts (done by reserev admin)
    $meos push action $EOS_ACCOUNT transfer "[ \"$ACCOUNT_NAME\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"$INITIAL_EOS EOS\", \"deposit\" ]" -p $ACCOUNT_NAME@active
	
    # move tokens to the new account (done by resereve admin)
    $meos push action ${ARR_TOKEN_ACCOUNT[$idx]} transfer "[ \"$ACCOUNT_NAME\", \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"${ARR_INITIAL_TOKENS[$idx]}.${ARR_DECIMALS_ZEROS[$idx]} ${ARR_SYMBOL[$idx]}\", \"deposit\" ]" -p $ACCOUNT_NAME@active

    # now that funds are there set initial price
    $meos push action ${ARR_RESERVE_ACCOUNT[$idx]} quickset "[\"${ARR_INITIAL_PRICE[$idx]}\"]" -p $ACCOUNT_NAME@active

	# change reserve admin
	$meos push action ${ARR_RESERVE_ACCOUNT[$idx]} setadmin "[\"$RESERVE_ADMIN_ACCOUNT\"]" -p $ACCOUNT_NAME@active
done

# deploy network 
####$meos set contract $NETWORK_ACCOUNT contracts/Network Network.wasm --abi Network.abi -p $NETWORK_ACCOUNT@active

#this can not be done with scatter/bloks.io since can not pronounce "" there (for listener)
####$meos push action $NETWORK_ACCOUNT init "[ \"$ACCOUNT_NAME\", \"$EOS_ACCOUNT\", \"\", true ]" -p $NETWORK_ACCOUNT@active

for idx in 0 1 2 3 4 5
do
	break
	$meos push action $NETWORK_ACCOUNT addreserve "[ \"${ARR_RESERVE_ACCOUNT[$idx]}\", true ]" -p $ACCOUNT_NAME@active
	$meos push action $NETWORK_ACCOUNT listpairres "[ \"${ARR_RESERVE_ACCOUNT[$idx]}\", \"${ARR_DECIMALS[$idx]},${ARR_SYMBOL[$idx]}\", \"${ARR_TOKEN_ACCOUNT[$idx]}\", true ]" -p $ACCOUNT_NAME@active
done

####$meos push action $NETWORK_ACCOUNT setadmin "[\"$NETWORK_ADMIN_ACCOUNT\"]" -p $ACCOUNT_NAME@active

#changing to owner which to an account maintained only in scatter
####$meos set account permission $NETWORK_ACCOUNT active "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$NETWORK_ADMIN_ACCOUNT\",\"permission\":\"active\"},\"weight\":1}, {\"permission\":{\"actor\":\"$NETWORK_ACCOUNT\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $NETWORK_ACCOUNT
####$meos set account permission $NETWORK_ACCOUNT owner "{\"threshold\": 1, \"keys\":[] , \"accounts\":[{\"permission\":{\"actor\":\"$NETWORK_ADMIN_ACCOUNT\",\"permission\":\"owner\"},\"weight\":1}], \"waits\":[] }" "" -p $NETWORK_ACCOUNT@owner

# complete a buy
for idx in 0 1 2 3 4 5
do
	break
	$meos push action eosio.token transfer "[ \"$ACCOUNT_NAME\", \"$NETWORK_ACCOUNT\", \"0.0100 EOS\", \"${ARR_DECIMALS[$idx]} ${ARR_SYMBOL[$idx]},${ARR_TOKEN_ACCOUNT[$idx]},0.0000001\" ]" -p $ACCOUNT_NAME@active
done

# complete a sell
AM[0]=14.200
AM[1]=0.04
AM[2]=0.11931421
AM[3]=1.2558
AM[4]=18.8886
AM[5]=0.0768348329
for idx in 0 1 2 3 4 5
do
	$meos push action ${ARR_TOKEN_ACCOUNT[$idx]} transfer "[ \"$ACCOUNT_NAME\", \"$NETWORK_ACCOUNT\", \"${AM[$idx]} ${ARR_SYMBOL[$idx]}\", \"4 EOS,eosio.token,0.0000001\" ]" -p $ACCOUNT_NAME@active
done
