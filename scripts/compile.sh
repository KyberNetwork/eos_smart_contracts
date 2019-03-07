set -x
rm contracts/Mock/Token/*.wasm contracts/Mock/Token/*.abi contracts/Reserve/AmmReserve/*.wasm contracts/Reserve/AmmReserve/*.abi
cd contracts/Mock/Token/ ; eosio-cpp -o Token.wasm Token.cpp --abigen; cd ../../../
cd contracts/Reserve/AmmReserve ; eosio-cpp -o AmmReserve.wasm AmmReserve.cpp --abigen ; cd ../../..
cd contracts/Network/ ; eosio-cpp -o Network.wasm Network.cpp --abigen ; cd ../../