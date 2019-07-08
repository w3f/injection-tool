# Kusama scraping and genesis specification

This repository contains a simple node (written in TypeScript) utility for scraping the state of the Claims contract and generating the Kusama genesis chain specification.

## Running locally

You can generate the Kusama chain specification locally by following these steps:

### Goerli (Testing)

```
$ yarn
$ yarn goerli:scrape
```

The above commands will output a `kusama.json` file containing genesis state generated from the Claims and FrozenToken contracts that are deployed to the Goerli test network.

#### Goerli contract addresses

```
Claims - 0x0453F59D19F55bC8501306D2A44EA4c872f4d05E
FrozenToken - 0x8f23892739D2A094E430d983317d02eE906cFe3c
```

### Full generation (not working yet)

In order to do a complete generation of the Kusama genesis block, including compiling the WebAssembly binary and formatting it in hex requires additional Rust dependencies.

```
$ rustup update
```

Run the script:

```
$ full_gen.sh
```
