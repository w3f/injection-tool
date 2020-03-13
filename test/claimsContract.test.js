"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// /** Test the Ethereum injections. */
const child_process_1 = require("child_process");
const ganache_core_1 = __importDefault(require("ganache-core"));
const web3_1 = __importDefault(require("web3"));
const fs = __importStar(require("fs"));
const puts = (err, stdout, stdin) => {
    if (err) {
        console.error('ERR', err);
    }
    console.log(stdout);
};
const gets = (err, stdout, stdin) => {
    if (err) {
        console.error('ERR', err);
    }
    return stdout;
};
const execute = (command) => {
    return new Promise((resolve, reject) => {
        child_process_1.exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            console.log(stdout.toString());
            resolve(stdout.toString());
        });
    });
};
const Claims = require('../build/contracts/Claims.json');
const FrozenToken = require('../build/contracts/FrozenToken.json');
/**
 * @jest-environment node
 */
describe("testing claims contract function", () => {
    // Start ganache
    const server = ganache_core_1.default.server({ port: 8588, ws: true });
    server.listen(8588);
    const w3 = new web3_1.default(server.provider);
    const allocationsFile = 'allocations.csv';
    const vestingFile = 'vesting.csv';
    const newAccountFile = 'newAccountList.csv';
    const increaseVestingFile = 'increaseVesting.csv';
    const injectSaleFile = 'secondSale.csv';
    const duplicateAccountFile = 'duplicateAddress.csv';
    let frozenTokenAddress;
    let claimsAddress;
    let testOwner;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Initialize accounts
        const accounts = yield w3.eth.getAccounts();
        // Create a new account for testing purposes.
        testOwner = yield w3.eth.personal.newAccount('tester');
        yield w3.eth.sendTransaction({
            from: accounts[0],
            to: testOwner,
            value: w3.utils.toWei('10', 'ether'),
        });
        // Deploy DOTs allocation and claims contract
        const ftResults = yield execute(`ts-node src/index eth:frozenToken-deploy --owner ${testOwner} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester`);
        const ftIndex = ftResults.indexOf('0x');
        const ftReceipt = yield w3.eth.getTransactionReceipt(ftResults.slice(ftIndex, ftIndex + 66));
        frozenTokenAddress = ftReceipt.contractAddress;
        const cResults = yield execute(`ts-node src/index eth:claims-deploy --dotIndicator ${frozenTokenAddress} --owner ${testOwner} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester`);
        const cIndex = cResults.indexOf('0x');
        const cReceipt = yield w3.eth.getTransactionReceipt(cResults.slice(cIndex, cIndex + 66));
        claimsAddress = cReceipt.contractAddress;
        /// Time to make some allocations.
        /// First create a mocked CSV.
        const holders = accounts.map((account) => `${account},1.000`);
        fs.writeFileSync(allocationsFile, holders.join('\n'));
        /// mocked vesting CSV
        const vestingHolders = accounts.map((account) => `${account},1500.000`);
        fs.writeFileSync(vestingFile, vestingHolders.join('\n'));
        /// mocked increaseVesting CSV
        const increaseVestingHolders = accounts.map((account) => `${account},3000.000`);
        fs.writeFileSync(increaseVestingFile, increaseVestingHolders.join('\n'));
        let newAccountList = [];
        for (let i = 0; i < 5; i++) {
            let acc = yield w3.eth.accounts.create();
            newAccountList.push(acc.address);
        }
        const newAccountHolders = newAccountList.map((account) => `${account},100.000`);
        fs.writeFileSync(newAccountFile, newAccountHolders.join('\n'));
        // mocked second sale CSV
        const secondSaleData = [
            "0xc82d7e8d689019ee8da869fce0ae4bec3be5bfb542e9981b6d409c58623ca357,10000",
            "0xfc0988cf6b008c017319fdbc1bbf52c1b516185b86780216e0ace045ae9fd544,20000"
        ];
        fs.writeFileSync(injectSaleFile, secondSaleData.join('\n'));
        // mocked duplicate an address CSV (for setVesting & increaseVesting)
        const duplicateAddressData = [
            "0x83BED0AaC8f16fFB782934Aaf9bf95c2Ab8eD672,123.000",
            "0x4eFFb2719eaF36d0938804D6688f921eEFbB8bC6,325.000",
            "0xc5fBd14add1732D899a6498397DfB0E6f6cbd6F4,234.000",
            "0x145140DA9d78CB9618Ce752362C2Ea73111dF27a,555.000",
            "0x4eFFb2719eaF36d0938804D6688f921eEFbB8bC6,325.000",
            "0xc7C4d57204f528b1743a2d89c599B190Fbe24940,777.000"
        ];
        fs.writeFileSync(duplicateAccountFile, duplicateAddressData.join('\n'));
    }));
    it("allocating DOTs to the mocked CSV", () => __awaiter(void 0, void 0, void 0, function* () {
        const dotAllocationsResult = yield execute(`ts-node src/index eth:dot-allocations --csv ${allocationsFile} --frozenToken ${frozenTokenAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --gas 200000 --password tester -y --noConfirm`);
        const counterIdx = dotAllocationsResult.indexOf("TotalAllocationCount:");
        const counter = dotAllocationsResult.substr((counterIdx + 22), 3);
        expect(Number(counter)).toBe(10);
    }));
    it("should fail when without calling setVesting before", () => __awaiter(void 0, void 0, void 0, function* () {
        const validateAddressResult = yield execute(`ts-node src/index eth:validation --csv ${allocationsFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} -y --noConfirm`);
        const errorIdx = validateAddressResult.indexOf("Something is wrong!");
        expect(errorIdx).toBe(-1);
    }));
    it("calling setVesting with mocked CSV", () => __awaiter(void 0, void 0, void 0, function* () {
        const vestingResult = yield execute(`ts-node src/index eth:set-vesting --csv ${vestingFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --gas 2000000 --password tester -y --noConfirm`);
        const successIdx = vestingResult.indexOf("Finished without error.");
        expect(successIdx).toBeGreaterThan(-1);
    }));
    it("should success when calling validateAddress", () => __awaiter(void 0, void 0, void 0, function* () {
        const validateAddressResult = yield execute(`ts-node src/index eth:validation --csv ${allocationsFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} -y --noConfirm`);
        const successIdx = validateAddressResult.indexOf("All good!");
        expect(successIdx).toBeGreaterThan(-1);
    }));
    it("should fail when no DOT allocation", () => __awaiter(void 0, void 0, void 0, function* () {
        const validateAddressResult = yield execute(`ts-node src/index eth:validation --csv ${newAccountFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} -y --noConfirm`);
        const errorIdx = validateAddressResult.indexOf("Something is wrong!");
        expect(errorIdx).toBe(-1);
    }));
    it("calling increaseVesting", () => __awaiter(void 0, void 0, void 0, function* () {
        const increaseVestingResult = yield execute(`ts-node src/index eth:increase-vesting --csv ${increaseVestingFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester -y --noConfirm`);
        const successIdx = increaseVestingResult.indexOf("Hash:");
        expect(successIdx).toBeGreaterThan(-1);
    }));
    it("checking the balance after increaseVesting", () => __awaiter(void 0, void 0, void 0, function* () {
        const checkAmountResult = yield execute(`ts-node src/index eth:check-amount --csv ${increaseVestingFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --startBlock 5 --endBlock 100 -y --noConfirm`);
        const successIdx = checkAmountResult.indexOf("Finished without error.");
        expect(successIdx).toBeGreaterThan(-1);
    }));
    it("injecting secondSale mocked CSV", () => __awaiter(void 0, void 0, void 0, function* () {
        const injectSaleResult = yield execute(`ts-node src/index eth:inject-sale --csv ${injectSaleFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester -y --noConfirm`);
        const successIdx = injectSaleResult.indexOf("Finished without error.");
        expect(successIdx).toBeGreaterThan(-1);
    }));
    it("querying the balance of the secondSale addresses", () => __awaiter(void 0, void 0, void 0, function* () {
        const checkInjectSaleResult = yield execute(`ts-node src/index eth:query-second-sale-amount --csv ${injectSaleFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 -y --noConfirm`);
        const successIdx = checkInjectSaleResult.indexOf("Finished without error.");
        expect(successIdx).toBeGreaterThan(-1);
    }));
    it("should fail when duplicate an address calling setVesting", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield execute(`ts-node src/index eth:set-vesting --csv ${duplicateAccountFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --gas 2000000 --password tester -y --noConfirm`);
        }
        catch (e) {
            const errorIdx = e.message.indexOf("Duplicate address exists in the data file!");
            expect(errorIdx).toBeGreaterThan(-1);
        }
    }));
    it("should fail when duplicate an address calling increaseVesting", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield execute(`ts-node src/index eth:increase-vesting --csv ${duplicateAccountFile} --claims ${claimsAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester -y --noConfirm`);
        }
        catch (e) {
            const errorIdx = e.message.indexOf("Duplicate address exists in the data file!");
            expect(errorIdx).toBeGreaterThan(-1);
        }
    }));
});
