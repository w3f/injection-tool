import { getW3, getClaimsContract, getFrozenTokenContract } from './genesis';

(async () => {
  const w3 = getW3();
  const claimsContract = getClaimsContract(w3);
  const frozenTokenContract = getFrozenTokenContract(w3);

  const claimedLength = await claimsContract.methods.claimedLength().call();
  console.log('Claimed length:', claimedLength);

  let total = 0;
  let i = 0;
  try {
    while (i < claimedLength-1) {
      const claimer = await claimsContract.methods.claimed(i).call();
      console.log('Claimer:', claimer);
      const balance = await frozenTokenContract.methods.balanceOf(claimer).call();
      console.log('Balance:', balance);
      total += Number(balance);
      i++;
    }
  } catch (e) { console.error('Total:', total, 'i:', i); }

  console.log('Total:', total);

})();
