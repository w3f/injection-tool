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
/** Test the Ethereum injections. */
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
const server = ganache_core_1.default.server({ port: 8588, ws: true });
server.listen(8588);
const w3 = new web3_1.default(server.provider);
const test = () => __awaiter(void 0, void 0, void 0, function* () {
    const accounts = yield w3.eth.getAccounts();
    /// Create a new account for testing purposes.
    const testOwner = yield w3.eth.personal.newAccount('tester');
    yield w3.eth.sendTransaction({
        from: accounts[0],
        to: testOwner,
        value: w3.utils.toWei('10', 'ether'),
    });
    const ftResults = yield execute(`ts-node src/index eth:frozenToken-deploy --owner ${testOwner} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester`);
    const ftIndex = ftResults.indexOf('0x');
    const ftReceipt = yield w3.eth.getTransactionReceipt(ftResults.slice(ftIndex, ftIndex + 66));
    const frozenTokenAddress = ftReceipt.contractAddress;
    const cResults = yield execute(`ts-node src/index eth:claims-deploy --dotIndicator ${frozenTokenAddress} --owner ${testOwner} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester`);
    const cIndex = cResults.indexOf('0x');
    const cReceipt = yield w3.eth.getTransactionReceipt(cResults.slice(cIndex, cIndex + 66));
    const claimsAddress = cReceipt.contractAddress;
    /// Time to make some allocations.
    /// First create a mocked CSV.
    const holders = accounts.map((account) => `${account},1.000`);
    fs.writeFileSync('allocations.csv', holders.join('\n'));
    const alloResults = yield execute(`ts-node src/index eth:dot-allocations --csv allocations.csv --frozenToken ${frozenTokenAddress} --providerUrl ws://localhost:8588 --from ${testOwner} --password tester -y`);
    // console.log(alloResults);
    process.exit(0);
});
try {
    test();
}
catch (ERR) {
    console.error(ERR);
}
