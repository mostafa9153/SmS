const fs = require('fs');
const file = 'app/(dashboard)/results/results-client.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    '<span className="truncate max-w-[170px]">\n          {selectedOption ? selectedOption.label : placeholder}\n        </span>',
    '<span suppressHydrationWarning className="truncate max-w-[170px]">\n          {selectedOption ? selectedOption.label : placeholder}\n        </span>'
);

fs.writeFileSync(file, content);
console.log('Hydration patched.');
