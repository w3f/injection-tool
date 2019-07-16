#!/usr/bin/bash

yarn inject --from 0x00b46c2526e227482e2EbB8f4C69E4674d262E75 --provider ws://127.0.0.1:8546 --gas 200000\
 --claims REPLACE_WITH_DEPLOYED_CLAIMS_ADDRESS --password PASSWORD --claimFile 6.csv
 