const fs = require('fs');

const file = 'pd_regulat.csv';

const entries = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n');

const lines = entries.map((entry) => entry.split(','));

console.log(lines);