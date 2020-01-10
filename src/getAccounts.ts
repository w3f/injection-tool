import Web3 from "web3";

// @ts-ignore
import Api from "@parity/api";

const main = async () => {
  const w3Provider = new Web3.providers.WebsocketProvider('ws://localhost:8546');
  const w3 = new Web3(w3Provider);

  // Parity instantiation.
  const provider = new Api.Provider.Ws('ws://localhost:8546');
  const api = new Api(provider);

  const accounts = await api.eth.accounts();
  console.log(accounts)
  const balances = await Promise.all(
    accounts.map((acc: any) => {
      return w3.eth.getBalance(acc);
    })
  );
  
  accounts.forEach((account: any, index: any) => {
    console.log(`${accounts[index]} : ${balances[index]}`);
  });

}

try {
  main();
} catch (ERR) {
  console.error(ERR);
}
