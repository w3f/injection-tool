/// Test script
const fs = require('fs');

const toWrite = fs.readFileSync('keys.csv', { encoding: 'utf-8' }).split('\n').map((line) => {
    return `${line.split(',')[1]},1.000`;
}).join('\n');

fs.writeFileSync('inp.csv', toWrite);