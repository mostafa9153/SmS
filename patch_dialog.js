const fs = require('fs');
const file = 'components/results/evaluation-print-dialog.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('className="w-[210mm] shrink-0"', 'className="w-[420mm] shrink-0"');
fs.writeFileSync(file, content);
