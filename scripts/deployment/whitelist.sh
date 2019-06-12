set -x

meos='cleos -v -u https://api.eossweden.se'

PUBLIC_KEY="EOS6DaNSbeHMuCg4sWbVmihGoorNteSd8rp696HBHBuDnjqav1dXy"
ACCOUNT_NAME="deploydeploy"
WHITELIST_ACCOUNT="yolowhitelst"
NETWORK_ACCOUNT="yolonetwork1"
LISTENER_ACCOUNT="eosio"

###$meos system newaccount --stake-net "0.05 EOS" --stake-cpu "0.05 EOS" --buy-ram-kbytes 8 -x 1000 $ACCOUNT_NAME $WHITELIST_ACCOUNT $PUBLIC_KEY
###$meos system buyram $ACCOUNT_NAME $WHITELIST_ACCOUNT --kbytes 130
###$meos set contract $WHITELIST_ACCOUNT contracts/Mock Whitelist.wasm --abi Whitelist.abi -p $WHITELIST_ACCOUNT@active
###$meos set account permission $WHITELIST_ACCOUNT active "{\"threshold\":1, \"keys\":[{\"key\": \"$PUBLIC_KEY\", \"weight\": 1}], \"accounts\":[{\"permission\":{\"actor\":\"$WHITELIST_ACCOUNT\", \"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p $WHITELIST_ACCOUNT@active

###$meos push action $WHITELIST_ACCOUNT config "[\"$NETWORK_ACCOUNT\", \"\"]" -p $WHITELIST_ACCOUNT@active


