const fs = require('fs');
const file = 'components/routine/routine-subjects-tab.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('onValueChange={(val: "single" | "both" | "lab") => {', 'onValueChange={(val: any) => {');
fs.writeFileSync(file, content);
console.log('Fixed onValueChange');
