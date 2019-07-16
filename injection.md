# Injection

## Inject allocations

You can use the tool provided. First make sure you run `yarn` in the root of the directory to install all necessary dependencies.

```
yarn inject --from <ADDRESS> --provider <HTTP_PROVIDER> --allocations <CSV>
```

Optionally you can pass the `--gas <GAS>` and `--gasPrice <GAS_PRICE>` flags. These change the values away from the default, which are `3000000` and `200000000` (2 gwei) respectively.

## Deploy the Kusama claim contract

Modifiy the `src/deploy.ts` file with the correct parameters.

```
yarn deploy
```


## Inject Indices

```
yarn inject --from <ADDRESS> --provider <HTTP_PROVIDER> --claims <CLAIMS_ADDRESS> --indices <CSV>
```

## Inject Amendments

```
yarn inject --from <ADDRESS> --provider <HTTP_PROVIDER> --claims <CLAIMS_ADDRESS> --amends <CSV>
```

## Inject Vesting

```
yarn inject --from <ADDRESS> --provider <HTTP_PROVIDER> --claims <CLAIMS_ADDRESS> --vesting <CSV>
```
