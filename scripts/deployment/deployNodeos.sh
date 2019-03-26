#cleos wallet unlock --password XXXXXXXXXXXXXXXXXXXX...

#in another shell:
#rm -rf ~/.local/share/eosio/nodeos/data
#nodeos -e -p eosio --plugin eosio::chain_api_plugin --plugin eosio::history_api_plugin --contracts-console --verbose-http-errors

set -x

PUBLIC_KEY=EOS5CYr5DvRPZvfpsUGrQ2SnHeywQn66iSbKKXn4JDTbFFr36TRTX
EOSIO_DEV_KEY=EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV

cleos create account eosio eosio.token $EOSIO_DEV_KEY # deploy token with eosio development key
cleos create account eosio other.token $EOSIO_DEV_KEY # deploy token with eosio development key
cleos create account eosio reserve $PUBLIC_KEY
cleos create account eosio resadmin $PUBLIC_KEY
cleos create account eosio network $PUBLIC_KEY
cleos create account eosio netadmin $PUBLIC_KEY
cleos create account eosio reserve1 $PUBLIC_KEY
cleos create account eosio reserve2 $PUBLIC_KEY
cleos create account eosio reserve3 $PUBLIC_KEY
cleos create account eosio alice $PUBLIC_KEY
cleos create account eosio moshe $PUBLIC_KEY
cleos create account eosio listener $PUBLIC_KEY

cleos set contract eosio.token contracts/Mock/Token Token.wasm --abi Token.abi -p eosio.token@active -f
cleos set contract other.token contracts/Mock/Token Token.wasm --abi Token.abi -p other.token@active

#spread initial funds
cleos push action eosio.token create '[ "eosio", "1000000000.0000 SYS"]' -p eosio.token@active
cleos push action other.token create '[ "eosio", "1000000000.0000 OTA"]' -p other.token@active

cleos push action eosio.token issue '[ "alice", "100.0000 SYS", "memo" ]' -p eosio@active
cleos push action other.token issue '[ "alice", "100.0000 OTA", "memo" ]' -p eosio@active

cleos push action eosio.token issue '[ "reserve", "100.0000 SYS", "deposit" ]' -p eosio@active
cleos push action other.token issue '[ "reserve1", "100.0000 OTA", "deposit" ]' -p eosio@active

#issuing also to network so can test reserve standalone
cleos push action eosio.token issue '[ "network", "100.0000 SYS", "deposit" ]' -p eosio@active
cleos push action other.token issue '[ "network", "100.0000 OTA", "deposit" ]' -p eosio@active

cleos push action eosio.token create '[ "eosio", "1000000000.0000 EOS"]' -p eosio.token@active
cleos push action eosio.token issue '[ "alice", "100.0000 EOS", "memo" ]' -p eosio@active
cleos push action eosio.token issue '[ "network", "100.0000 EOS", "memo" ]' -p eosio@active
cleos push action eosio.token issue '[ "reserve", "69.3000 EOS", "deposit" ]' -p eosio@active
cleos push action eosio.token issue '[ "reserve1", "69.3000 EOS", "deposit" ]' -p eosio@active
cleos push action eosio.token issue '[ "listener", "1000.0000 EOS", "for listener" ]' -p eosio@active

#deploy reserve
cleos set account permission reserve active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"reserve\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p reserve@active
cleos set account permission reserve1 active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"reserve1\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p reserve1@active

cleos set contract reserve contracts/Reserve/AmmReserve AmmReserve.wasm -p reserve@active
cleos set contract reserve1 contracts/Reserve/AmmReserve AmmReserve.wasm -p reserve1@active

#account_name network_contract admin, account_name network_contract, asset token_asset, account_name token_contract, account_name eos_contract, bool trade_enabled
cleos push action reserve init '["resadmin", "network", "4,SYS", "eosio.token", "eosio.token", true ]' -p reserve@active
cleos push action reserve1 init '["resadmin", "network", "4,OTA", "other.token", "eosio.token", true ]' -p reserve1@active

#double r, double p_min, asset  max_eos_cap_buy, asset  max_eos_cap_sell, double profit_percent, double max_sell_rate, double min_sell_rate
cleos push action reserve setparams '[ "0.01", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p resadmin@active
cleos push action reserve1 setparams '[ "0.01", "0.05", "20.0000 EOS", "20.0000 EOS", "0.25", "0.5555", "0.00000555" ]' -p resadmin@active

#cleos push action reserve enabletrade '[ ]' -p resadmin@active

#get conversion rate for buy
cleos get table reserve reserve rate
cleos push action reserve getconvrate '[ "0.0100 EOS"]' -p network@active
cleos get table reserve reserve rate
cleos push action eosio.token transfer '[ "network", "reserve", "0.0100 EOS", "alice" ]' -p network@active

cleos get table reserve1 reserve1 rate
cleos push action reserve1 getconvrate '[ "0.0100 EOS"]' -p network@active
cleos get table reserve1 reserve1 rate
cleos push action eosio.token transfer '[ "network", "reserve1", "0.0100 EOS", "alice" ]' -p network@active




#get conversion rate for sell
cleos push action reserve getconvrate '[ "1.0000 SYS"]' -p network@active
cleos push action eosio.token transfer '[ "network", "reserve", "0.0100 SYS", "alice" ]' -p network@active
cleos push action reserve1 getconvrate '[ "1.0000 OTA"]' -p network@active
cleos push action other.token transfer '[ "network", "reserve1", "1.0000 OTA", "alice" ]' -p network@active

cleos get table reserve reserve rate
cleos get table reserve1 reserve1 rate

#do a trade (send back to alice)

####################################################################

#deploy network
cleos set account permission network active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"network\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p network
cleos set contract network contracts/Network Network.wasm -p network@active
cleos push action network init '[ "netadmin", "eosio.token", "listener", true ]' -p network@active

# deploy listener
cleos set account permission listener active "{\"threshold\": 1, \"keys\":[{\"key\":\"$PUBLIC_KEY\", \"weight\":1}] , \"accounts\":[{\"permission\":{\"actor\":\"listener\",\"permission\":\"eosio.code\"},\"weight\":1}], \"waits\":[] }" owner -p listener
cleos set contract listener contracts/Listener Listener.wasm --abi Listener.abi -p listener@active -f
cleos push action listener config '[ "eosio.token", "network", "3.000", "0.0001 EOS" ]' -p listener@active

# add reserves
cleos push action network addreserve '[ "reserve", true ]' -p netadmin@active
cleos push action network addreserve '[ "reserve1", true ]' -p netadmin@active
#cleos push action network addreserve '[ "reserve2", true ]' -p netadmin@active


cleos push action network listpairres '[ "reserve", "4,SYS", "eosio.token", true ]' -p netadmin@active
cleos push action network listpairres '[ "reserve1", "4,OTA", "other.token", true ]' -p netadmin@active
#cleos push action network listpairres '[ "reserve2", "4,SYS", "eosio.token", true ]' -p netadmin@active

#cleos push action network listpairres '[ "reserve1", "4,SYS", "eosio.token", false ]' -p netadmin@active
#cleos push action network listpairres '[ "reserve2", "4,SYS", "eosio.token", false ]' -p netadmin@active

cleos get table network network reservespert

# test trade for first reserve
cleos get table reserve reserve rate
cleos push action eosio.token transfer '[ "alice", "network", "10.0100 SYS", "4 EOS,eosio.token,moshe,0.000001" ]' -p alice@active
cleos get table reserve reserve rate

cleos get table reserve reserve rate
cleos push action eosio.token transfer '[ "alice", "network", "5.0100 EOS", "4 SYS,eosio.token,moshe,0.000001" ]' -p alice@active
cleos get table reserve reserve rate

# test trade for second reserve
cleos get table reserve1 reserve1 rate
cleos push action other.token transfer '[ "alice", "network", "4.0100 OTA", "4 EOS,eosio.token,moshe,0.000001" ]' -p alice@active
cleos get table reserve1 reserve1 rate


cleos get table reserve1 reserve1 rate
cleos push action eosio.token transfer '[ "alice", "network", "2.0100 EOS", "4 OTA,other.token,moshe,0.000001" ]' -p alice@active
cleos get table reserve1 reserve1 rate

