set -x
rm contracts/Mock/Token/*.wasm contracts/Mock/Token/*.abi contracts/Reserve/AmmReserve/*.wasm contracts/Reserve/AmmReserve/*.abi
cd contracts/Mock/Token/ ; eosio-cpp -I ./ -o Token.wasm Token.cpp --abigen; cd ../../../
cd contracts/Listener/ ; eosio-cpp -I ./ -o Listener.wasm Listener.cpp --abigen; cd ../../
cd contracts/Reserve/AmmReserve ; eosio-cpp -I ./ -o AmmReserve.wasm AmmReserve.cpp --abigen ; cd ../../..
cd contracts/Network/ ; eosio-cpp -I ./ -o Network.wasm Network.cpp --abigen ; cd ../../