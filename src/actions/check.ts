/**
 * check.ts
 * 
 * This script expects to take as input a CSV file formatted in the same
 * format as expected by dot/balances.ts or dot/batch.ts and check the
 * receiving balances are GTE the sent amounts. 
 * 
 * File format:
 *   <polkadot_address>,<dot_amount>
 *   <polkadot_address>,<dot_amount>
 *   and so on
 */

import * as util from "@polkadot/util"; 
import { initApi, parseCsv } from "../helpers";

type Options = {
    csv: string;
    failHard: boolean;
    types: any;
    wsEndpoint: string;
}

export const check = async (opts: Options) => {
    const { csv, failHard, types, wsEndpoint } = opts;

    const input = parseCsv(csv);
    const api = await initApi(wsEndpoint, types);

    for (const entry of input) {
        const [destination, amount] = entry;

        const amtBN = util.bnToBn(amount);
        const { data } = await api.query.system.account(destination);
        const { free, reserved } = data;
        const totalBal = free.add(reserved);

        const hasAtLeast = totalBal.gte(amtBN);
        if (hasAtLeast) {
            console.log(destination + " OK");
        } else {
            const errStr = destination + " NOT OK... FOUND "  + totalBal.toString() + " EXPECTED " + amtBN.toString();
            if (failHard) {
                throw new Error(errStr);
            } else {
                console.log(errStr);
            }
        }
    }
}