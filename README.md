# Injection Tool

In your shell type `ts-node index --help` after running `yarn` in the root of the project for complete usage options.

## Force Transfers (On Kusama)

### Usage

```sh
Usage: force-transfers [options]

Options:
  --csv <filepath>             A CSV file formatted <source>,<dest>,<amount> on each line.
  --cryptoType <type>          One of ed25519 or sr25519. (default: "sr25519")
  --endpoint <url>             The endpoint of the WebSockets to connect with.
  --mnemonic <string>          Pass in the mnemonic for the Sudo key.
  --suri <suri>                Pass in the suri for the Sudo key.
  --jsonPath <pathToKeystore>  Pass in the path to the JSON keystore for the Sudo key.
  -h, --help                   output usage information
```

### Example

```sh
$ ts-node index force-transfers --csv test.csv.example --endpoint ws://localhost:9944 --suri '//Alice'
```