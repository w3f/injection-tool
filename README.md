# Injection Tool

After cloning the repository run `yarn` at the root to install the dependencies and `yarn global add ts-node` to install `ts-node` globally.

**Utilities:**

- [Transfers](#transfers) - Make batch transfers on Kusama and other Substrate based chains.
- [Force Transfers on Kusama](#force-transfers-on-kusama)`  
- [DOT Allocations on Ethereum](#dot-allocations-on-ethereum)

## Installing

The injection-tool requires some dependencies to be installed on your system such as [nodeJS](https://nodejs.org)
and the accompanying package manager [npm](https://npmjs.org). On most systems these can be installed from your
operating system's package manager such as Homebrew for MacOS or apt for Ubuntu.

To check you have these pre-requisite installed try `node --version` and `npm --version` on the commandline. If you
do not see version numbers from the output of running these commands (one at a time), then you will need to install
them.

You will also need [git](https://git-scm.com/) for cloning this repository locally. Git, like node and npm, is
usually provided in your operating system's package managers. Once this is installed try cloning the `injection-tool`
like so:

```sh
git clone https://github.com/w3f/injection-tool.git
```

This will create an `injection-tool` code repository on your local machine. Next you will `cd` into the repository and use `yarn`
to install the dependencies:

```sh
cd injection-tool
npm i -g yarn # <- this is needed if you haven't installed yarn before
yarn
```

Once all the dependencies are install you should be able to use the utilities outlined in the rest of this README.

## Transfers (on Kusama, Polkadot and other Substrate chains)

Transfers expect a CSV (comma-separated-values) file that is formatted with <address>,<amount> on each line. An example
of this file looks like the below:

```csv
5Chi986mMWi8ksR2AEcz9VwuHw7DQdU6afB1GtqzkGo2iQN9,1000000000000
5FCTrcwzkr1uxxLAaTqfkB66NHBEDx2YoDGs3tcX8PM911hC,2000000000000
```

NOTE: On Kusama the values have **12 decimal places** so the amounts in the example above are sending 1 and 2 KSM respectively.

### Usage

```sh
Usage: transfer [options]

Options:
  --csv <file>         A CSV file formatted <destination>,<amount> on each line.
  --cryptoType <type>  One of ed25519 or sr25519, depending on the crypto used to derive your keys. (default: "sr25519")
  --wsEndpoint <url>   The endpoint of the WebSockets to connect. (default: "wss://cc3-4.kusama.network")
  --suri <suri>        The secret URI for the signer key.
  -h, --help           output usage information
```

### Example

If you are sending transfers on Kusama then most of the defaults should work and the only two values you need to
provided are `--csv <file>` and `--suri <secret phrase>` like so: 

```sh
yarn transfer --csv sample.csv --suri 'here is my mnemonic that I keep very safe because it holds the funds'
```

## Force Transfers (On Kusama)

### Usage

```sh
Usage: force-transfers [options]

Options:
  --csv <filepath>             A CSV file formatted <dest>,<amount> on each line.
  --source <source>            The address from which funds will be force transferred from.
  --cryptoType <type>          One of ed25519 or sr25519. (default: "sr25519")
  --wsEndpoint <url>             The endpoint of the WebSockets to connect with. (default: "wss://canary-4.kusama.network")
  --mnemonic <string>          Pass in the mnemonic for the Sudo key.
  --suri <suri>                Pass in the suri for the Sudo key.
  --jsonPath <pathToKeystore>  Pass in the path to the JSON keystore for the Sudo key.
  -h, --help                   output usage information
```

### Example

```sh
$ yarn force-transfers --csv test.csv.example --wsEndpoint ws://localhost:9944 --mnemonic 'one two three four' --source 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
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
$ yarn dot-allocate --csv allocations.csv.test --from 0xd84b338b06222295a9ac1f1e81722f0c3a354884 --password 1234
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
ts-node src/index eth:vesting --csv test.csv --from 0xd84b338b06222295a9ac1f1e81722f0c3a354884 --password 1234
```

## Walkthrough

This walkthrough will proceed through each of the core utilities of the 
Ethereum side of the tool using `openethereum` v3.0.0. The tool was updated
to separate the signing and the broadcasting functionality so it may work
differently than the behavior you expected in the past.

### Using `openethereum`

Set up a new account in the local keystore. For this walkthrough we'll be using
the Goerli test network.

```zsh
openethereum account new --chain goerli
```

Type your password in twice and you will be given a fresh and newly generated
account.

```zsh
Please note that password is NOT RECOVERABLE.
Type password: 
Repeat password: 
0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2
```

Now since we will only be using openethereum for its keystore, we can start
the service using the following flags to disable networking and syncing.

```zsh
openethereum --chain goerli --max-peers 0 --ws-apis all
```

### Using injection-tool

Now open a new terminal, we'll be using most of the Ethereum functionality
in injection-tool now to manage our own deployment of a `FrozenToken` and
`Claims` contract.

```zsh
ts-node src/index eth:frozenToken-deploy --nonce 0 --output frozen.raw.tx --owner 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --from 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --password <your_password>
```

Now we can submit this to the network using the broadcast command.

```zsh
ts-node src/index eth:broadcast --csv frozen.raw.tx --providerUrl wss://goerli.infura.io/ws/v3/7121204aac9a45dcb9c2cc825fb85159
```

The transaction will be broadcast to the node and the script will wait until
it's mined and a receipt is received. It will then print this receipt to a 
`receipts` file and close the process.

In the receipts file ctrl-f and look for `transactionHash` copy the hash that's
given there and enter it into a block explorer like Etherscan to see the details. If everything went right, you should see the transaction succeeded.

Now we will deploy the claims contract. From the deployment transaction before
we can grab the address for our token (the "dot indicator") from Etherscan.
Use the address for the `--dotIndicator` option below.

```zsh
ts-node src/index eth:claims-deploy --nonce 1 --output claims.raw.tx --dotIndicator 0x10068eBE0665BB6d7a58deBB0C1c262849613505 --owner 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --from 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --password <your_password>
```

Use the broadcast command like before:

```zsh
ts-node src/index eth:broadcast --csv claims.raw.tx --providerUrl wss://goerli.infura.io/ws/v3/7121204aac9a45dcb9c2cc825fb85159
```
