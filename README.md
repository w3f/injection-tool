# Injection Tool

After cloning the repository run `yarn` at the root to install the dependencies and `yarn global add ts-node` to install `ts-node` globally.

**Utilities:**

- [Force Transfers on Kusama](#force-transfers-on-kusama)
- [DOT Allocations on Ethereum](#dot-allocations-on-ethereum)

## Force Transfers (On Kusama)

### Usage

```sh
Usage: force-transfers [options]

Options:
  --csv <filepath>             A CSV file formatted <dest>,<amount> on each line.
  --source <source>            The address from which funds will be force transferred from.
  --cryptoType <type>          One of ed25519 or sr25519. (default: "sr25519")
  --endpoint <url>             The endpoint of the WebSockets to connect with. (default: "wss://canary-4.kusama.network")
  --mnemonic <string>          Pass in the mnemonic for the Sudo key.
  --suri <suri>                Pass in the suri for the Sudo key.
  --jsonPath <pathToKeystore>  Pass in the path to the JSON keystore for the Sudo key.
  -h, --help                   output usage information
```

### Example

```sh
$ ts-node index force-transfers --csv test.csv.example --endpoint ws://localhost:9944 --suri '//Alice' --source 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
```

## DOT Allocations (On Ethereum)

### Usage

```sh
Usage: eth:dot-allocations [options]

Options:
  --csv <filepath>           A CSV file formatted <address>,<amount> on each line.
  --frozenToken <address>    The address of the Frozen Token (default: "0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907")
  --providerUrl <url>        A WebSockets provider for an Ethereum node. (default: "ws://localhost:8546")
  --from <address>           Sender of the transactions.
  --gas <amount>             Amount of gas to send. (default: "50000")
  --gasPrice <price_in_wei>  Amount to pay in wei per each unit of gas (default: "29500000000")
  --password <string>        The password to unlock personal_* RPC methods on the node.
  -h, --help                 output usage information
```

### Example

```sh
$ ts-node index eth:dot-allocations --csv allocations.csv.test --from 0xd84b338b06222295a9ac1f1e81722f0c3a354884 --password 1234
```

## Vesting (On Ethereum)

### Usage 

```sh
Usage: eth:vesting [options]

Options:
  --csv <filepath>           A CSV file formatted <address>,<amount> on each line.
  --claims <address>         The address of the Claims contract. (default: "0x9a1B58399EdEBd0606420045fEa0347c24fB86c2")
  --providerUrl <url>        A WebSockets provider for an Ethereum node. (default: "ws://localhost:8545")
  --from <address>           Sender of the transactions.
  --gas <amount>             Amount of gas to send. (default: "2000000")
  --gasPrice <price_in_wei>  Amount to pay in wei per each unit of gas (default: "29500000000")
  --password <string>        The password to unlock personal_* RPC methods on the node.
  -h, --help                 output usage information
```

### Example

```sh
ts-node index eth:vesting --csv test.csv --from 0xd84b338b06222295a9ac1f1e81722f0c3a354884 --password 1234
```