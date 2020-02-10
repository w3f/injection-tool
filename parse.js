const fs = require('fs');

const fileRaw = fs.readFileSync('post2.csv', { encoding: 'utf-8' });
const lines = fileRaw.split('\n');

for (const line of lines) {
  const [a,b,address,amount] = line.split(',');
  fs.appendFileSync('input.csv', `${address},${amount.concat('0'.repeat(12))}\n`);
}
