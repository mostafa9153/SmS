const fs = require('fs');
const file = 'components/results/evaluation-register-printable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/text-\[([\d.]+)px\]/g, (match, p1) => {
    let oldVal = parseFloat(p1);
    let newVal = Math.round(oldVal * 1.5);
    return `text-[${newVal}px]`;
});

fs.writeFileSync(file, content);
console.log('Font sizes updated successfully.');
