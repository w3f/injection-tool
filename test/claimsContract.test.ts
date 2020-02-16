// /** Test the Ethereum injections. */
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

const Claims = require('../build/contracts/Claims.json');
const FrozenToken = require('../build/contracts/FrozenToken.json');

/**
 * @jest-environment node
 */

describe("testing claims contract function", () => {
  // Start ganache
  const server = ganache.server({ port: 8588, ws: true });
  server.listen(8588);
  const w3 = new Web3(server.provider);

  const allocationsFile = 'allocations.csv';
  const vestingFile = 'vesting.csv';
  const newAccountFile = 'newAccountList.csv';
  const increaseVestingFile = 'increaseVesting.csv';
  const injectSaleFile = 'secondSale.csv';

  let frozenTokenAddress : any;
  let claimsAddress: any;
  let testOwner : any;

  beforeAll(async () => {
      // Initialize accounts
      const accounts = await w3.eth.getAccounts();

      // Create a new account for testing purposes.
      testOwner = await w3.eth.personal.newAccount('tester');
      await w3.eth.sendTransaction({
        from: accounts[0],
        to: testOwner,
        value: w3.utils.toWei('10', 'ether'),
      });

      // Deploy DOTs allocation and claims contract
      const ftResults = await execute(`ts-node src/index eth:frozenToken-deploy --owner ${testOwner} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester`);
      const ftIndex = ftResults.indexOf('0x');

      const ftReceipt = await w3.eth.getTransactionReceipt(ftResults.slice(ftIndex, ftIndex+66));
      frozenTokenAddress = ftReceipt.contractAddress;

      const cResults = await execute(
        `ts-node src/index eth:claims-deploy --dotIndicator ${frozenTokenAddress} --owner ${testOwner} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester`
      );
      const cIndex = cResults.indexOf('0x');
      const cReceipt = await w3.eth.getTransactionReceipt(cResults.slice(cIndex, cIndex+66));
      claimsAddress = cReceipt.contractAddress;


      /// Time to make some allocations.
      /// First create a mocked CSV.
      const holders = accounts.map((account: any) => `${account},1.000`);
      fs.writeFileSync(allocationsFile, holders.join('\n'));

      /// mocked vesting CSV
      const vestingHolders = accounts.map((account: any) => `${account},1500.000`);
      fs.writeFileSync(vestingFile, vestingHolders.join('\n'));

      /// mocked increaseVesting CSV
      const increaseVestingHolders = accounts.map((account: any) => `${account},3000.000`);
      fs.writeFileSync(increaseVestingFile, increaseVestingHolders.join('\n'));

      let newAccountList = [];
      for (let i=0; i<5; i++) {
        let acc = await w3.eth.accounts.create();
        newAccountList.push(acc.address);
      }
      const newAccountHolders = newAccountList.map((account: any) => `${account},100.000`);
      fs.writeFileSync(newAccountFile, newAccountHolders.join('\n'));

      // mocked second sale CSV
      const secondSaleData = [
        "0xc82d7e8d689019ee8da869fce0ae4bec3be5bfb542e9981b6d409c58623ca357,10000",
        "0xfc0988cf6b008c017319fdbc1bbf52c1b516185b86780216e0ace045ae9fd544,20000"
      ];
      fs.writeFileSync(injectSaleFile, secondSaleData.join('\n'));

  });


  it("allocating DOTs to the mocked CSV", async () => {

    const dotAllocationsResult = await execute(
      `ts-node src/index eth:dot-allocations --csv ${allocationsFile} --frozenToken ${frozenTokenAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --gas 200000 --password tester -y --noConfirm`
    );
    const counterIdx = dotAllocationsResult.indexOf("TotalAllocationCount:");
    const counter = dotAllocationsResult.substr((counterIdx+22), 3);
    expect(Number(counter)).toBe(10);
    
  });

  it("should fail when without calling setVesting before", async () => {

    const validateAddressResult = await execute(
      `ts-node src/index eth:validation --csv ${allocationsFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} -y --noConfirm` 
    );
    const errorIdx = validateAddressResult.indexOf("Something is wrong!");
    expect(errorIdx).toBe(-1);
      
  });

  it("calling setVesting with mocked CSV", async () => {

    const vestingResult = await execute(
      `ts-node src/index eth:set-vesting --csv ${vestingFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --gas 2000000 --password tester -y --noConfirm`
    );
    const successIdx = vestingResult.indexOf("Finished without error.");
    expect(successIdx).toBeGreaterThan(-1);

  });

  it("should success when calling validateAddress", async () => {

    const validateAddressResult = await execute(
      `ts-node src/index eth:validation --csv ${allocationsFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} -y --noConfirm` 
    );
    const successIdx = validateAddressResult.indexOf("All good!");
    expect(successIdx).toBeGreaterThan(-1);  
  });

  it("should fail when no DOT allocation", async () => {

    const validateAddressResult = await execute(
      `ts-node src/index eth:validation --csv ${newAccountFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} -y --noConfirm` 
    );

    const errorIdx = validateAddressResult.indexOf("Something is wrong!");
    expect(errorIdx).toBe(-1);

  });

  it("calling increaseVesting", async () => {

    const increaseVestingResult = await execute(
      `ts-node src/index eth:increase-vesting --csv ${increaseVestingFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester -y --noConfirm` 
    );
    const successIdx = increaseVestingResult.indexOf("Hash:");
    expect(successIdx).toBeGreaterThan(-1);

  });

  it("checking the balance after increaseVesting", async () => {

    const checkAmountResult = await execute(
      `ts-node src/index eth:check-amount --csv ${increaseVestingFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --startBlock 5 --endBlock 100 -y --noConfirm`
    );
    const successIdx = checkAmountResult.indexOf("Finished without error.");
    expect(successIdx).toBeGreaterThan(-1);

  });

  it("injecting secondSale mocked CSV", async () => {

    const injectSaleResult = await execute(
      `ts-node src/index eth:inject-sale --csv ${injectSaleFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester -y --noConfirm`
    );
  
    const successIdx = injectSaleResult.indexOf("Finished without error.");
    expect(successIdx).toBeGreaterThan(-1);

  });

  it("querying the balance of the secondSale addresses", async () => {

    const checkInjectSaleResult = await execute(
      `ts-node src/index eth:query-second-sale-amount --csv ${injectSaleFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 -y --noConfirm`
    );

    const successIdx = checkInjectSaleResult.indexOf("Finished without error.");
    expect(successIdx).toBeGreaterThan(-1);

  })
});

