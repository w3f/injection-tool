# Kusama scraping and genesis specification

This repository contains a simple node (writte in TypeScript) utility for scraping the state of the Claims contract and generating the Kusama genesis chain specification.

## Running locally

You can generate the Kusama chain specification locally by following these steps:

### Testing (only one that works now)

### Full generation (not working yet)

In order to do a complete generation of the Kusama genesis block, including compiling the WebAssembly binary and formatting it in hex requires additional Rust dependencies.

```
$ rustup update
```

Run the script:

```
$ full_gen.sh
```
