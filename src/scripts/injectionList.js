const fs = require('fs');

fs.readFileSync('indices.csv', { encoding: 'utf-8' }).split('\n').forEach((entry) => {
    const [who,org,num,index,ksm,dot] = entry.split(',');
    if (dot == 'Polkadot Address') return;
    if (dot) {
        fs.appendFileSync('x.csv', `${num},${dot}\n`);
    } else if (ksm && ksm != '(asked)') {
        fs.appendFileSync('x.csv', `${num},${ksm}\n`);
    } else { return; }
});
