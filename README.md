# Injection Tool

After cloning the repository run `yarn` at the root to install the dependencies and `yarn global add ts-node` to install `ts-node` globally.

**Utilities:**

- [Transfers](#transfers) - Make batch transfers on Kusama and other Substrate based chains.
- [Force Transfers on Kusama](#force-transfers-on-kusama)`  
- [DOT Allocations on Ethereum](#dot-allocations-on-ethereum)

## Installing

### Using npm

You can run the injection tool commands using `npx` (this will ensure you're always using the latest version).

```
npx @w3f/injection-tool transfer ...
```

Or by installing the latest version using `npm`.

```
npm i @w3f/injection-tool -g
```

### From source

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

## Batch-Proxy-Sudo-Force-Transfers

```zsh
Usage: index batch-proxy-sudo-force-transfers [options]

Options:
  --cryptoType <type>              One of ed25519 or sr25519. (default: "sr25519")
  --csv <filepath[,filepath,...]>  One or more CSV files formatted <dest>,<amount> on each line.
  --dry                            Runs in dry run mode.
  --source <source>                The address from which funds will be force transferred from.
  --suri <suri>                    Pass in the suri for the Sudo key.
  --types <json>                   A JSON configuration of types for the node. (default: "{}")
  --wsEndpoint <url>               The endpoint of the WebSockets to connect with. (default: "wss://canary-4.kusama.network")
  -h, --help                       display help for command
```

### Example

```zsh
ts-node src/index batch-proxy-sudo-force-transfers --csv dot_transfers.csv --source 15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5 --suri <secret> --wsEndpoint ws://localhost:9944
```


### Example

```sh
$ yarn force-transfers --csv test.csv.example --wsEndpoint ws://localhost:9944 --mnemonic 'one two three four' --source 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
```

## Walkthrough (Ethereum functionality)

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

You may need some Goerli eth for the newly generated account, please see the
available options on [goerli.net](https://goerli.net).

### Using injection-tool

Now open a new terminal, we'll be using most of the Ethereum functionality
in injection-tool now to manage our own deployment of a `FrozenToken` and
`Claims` contract.

> Note: The instruction below assume you have the injection-tool source code
> locally and that you're using `ts-node` to run the commands. An alternative
> is to install the injection-tool from NPM with `npm i @w3f/injection-tool -g`.
> After installing you would replace `ts-node src/index` in the commands below
> with the `injection-tool` command.

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

#### Allocations

```zsh
ts-node src/index eth:dot-allocations --nonce 2 --output allocations.raw.tx --csv allocations.csv --frozenToken 0x10068eBE0665BB6d7a58deBB0C1c262849613505 --from 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --password <your_password>
```

and 

```zsh
ts-node src/index eth:broadcast --csv allocations.raw.tx --providerUrl wss://goerli.infura.io/ws/v3/7121204aac9a45dcb9c2cc825fb85159
```

#### Amendments

```zsh
ts-node src/index eth:amend --nonce 12 --output amendments.raw.tx --csv amend.csv --claims 0x2f0C597Ce268d8dBFD8a7C33639d34A4bBd1ec41 --from 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --password <your_password>
```

#### Vesting

##### Set vesting

Set vesting can only be called on an address that has not claimed yet, and is
not already vested. If you need to increase the vesting on an account, use 
`increaseVesting` instead.

```zsh
ts-node src/index eth:set-vesting --nonce 13 --output vesting.raw.tx --csv vesting.csv --claims 0x2f0C597Ce268d8dBFD8a7C33639d34A4bBd1ec41 --from 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --password <your_password>
```

##### Increase vesting

```zsh
ts-node src/index eth:increase-vesting --nonce 14 --output incVesting.raw.tx --csv incVesting.csv --claims 0x2f0C597Ce268d8dBFD8a7C33639d34A4bBd1ec41 --from 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --password <your_password>
```

#### Making Claims

```zsh
ts-node src/index eth:make-claims --nonce 15 --output claims.raw.tx --csv claims.csv --claims 0x2f0C597Ce268d8dBFD8a7C33639d34A4bBd1ec41 --from 0x5b01b9990cd3d7b4ddaff97665eff702d1ccb2a2 --password <your_password>
```

#### Broadcast Batching

You can pass the `--batch <num>` flag to the broadcast transaction.
