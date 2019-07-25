#!/usr/bin/bash

for f in 2.csv 3.csv 7.csv 8.csv
do
    echo "injecting $f"
    yarn inject --from "0x00b46c2526e227482e2EbB8f4C69E4674d262E75" --provider ws://127.0.0.1:8546 --gas 100000 --password PASSWORD --allocations $f
    #     vvv Adjust accordingly
    sleep 200
done
