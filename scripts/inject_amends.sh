#!/usr/bin/bash

yarn inject --from "0x00444c3281dadacb6e7c55357e5a7BBD92C2DC34" --provider ws://localhost:8545\
 --claims REPLACE_WITH_DEPLOYED_CLAIMS_ADDRESS --password PASSWORD --amends 1.csv ;
#     vvv Adjust accordingly
sleep 200 ;
yarn inject --from "0x00444c3281dadacb6e7c55357e5a7BBD92C2DC34" --provider ws://localhost:8545\
 --claims REPLACE_WITH_DEPLOYED_CLAIMS_ADDRESS --password PASSWORD --amends 5.csv