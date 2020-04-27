/** Test the Ethereum injections. */
import { exec } from 'child_process';
import ganache from 'ganache-core';
import Web3 from 'web3';

import * as fs from 'fs';

const puts = (err:any, stdout:any, stdin:any) => {
  if (err) {
    console.error('ERR', err);
  }
  console.log(stdout);
}

const gets = (err: any, stdout: any, stdin: any) => {
  if (err) {
     console.error('ERR', err);
  }
  return stdout;
}

const execute = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (err: any, stdout: any, stderr: any) => {
      if (err) {
        reject(err);
      }
      console.log(stdout.toString());
      resolve(stdout.toString());
    });
  });
}

const server = ganache.server({ port: 8588, ws: true });
server.listen(8588);
const w3 = new Web3(server.provider);

const test = async () => {
  const accounts = await w3.eth.getAccounts();

  console.log('account list:', accounts)
  /// Create a new account for testing purposes.
  const testOwner = await w3.eth.personal.newAccount('tester');
  await w3.eth.sendTransaction({
    from: accounts[0],
    to: testOwner,
    value: w3.utils.toWei('10', 'ether'),
  });

  const ftResults = await execute(`ts-node src/index eth:frozenToken-deploy --owner ${testOwner} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester`);
  const ftIndex = ftResults.indexOf('0x');

  const ftReceipt = await w3.eth.getTransactionReceipt(ftResults.slice(ftIndex, ftIndex+66));
  const frozenTokenAddress = ftReceipt.contractAddress;

  const cResults = await execute(
    `ts-node src/index eth:claims-deploy --dotIndicator ${frozenTokenAddress} --owner ${testOwner} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester`
  );
  const cIndex = cResults.indexOf('0x');
  const cReceipt = await w3.eth.getTransactionReceipt(cResults.slice(cIndex, cIndex+66));
  const claimsAddress = cReceipt.contractAddress;

  /// Time to make some allocations.
  /// First create a mocked CSV.
  const holders = accounts.map((account: any) => `${account},1.000`);
  fs.writeFileSync('allocations.csv', holders.join('\n'));

  const alloResults = await execute(
    `ts-node src/index eth:dot-allocations --csv allocations.csv --frozenToken ${frozenTokenAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester -y`
  );

  // console.log(alloResults);

  process.exit(0);
}

try {
  test();
} catch (ERR) {
  console.error(ERR);
}