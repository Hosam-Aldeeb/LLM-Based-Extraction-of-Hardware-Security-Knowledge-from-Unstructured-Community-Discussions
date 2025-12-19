const fs = require('fs');
const path = require('path');

const exportsDir = './discord-exports';
const files = fs.readdirSync(exportsDir).filter(f => f.endsWith('_Jan2025_export.json'));

let totalMessages = 0;
let totalChannels = 0;

console.log('\n📊 Counting messages across all Discord exports...\n');

files.forEach(file => {
    const filePath = path.join(exportsDir, file);
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const messageCount = data.messages ? data.messages.length : 0;
        totalMessages += messageCount;
        totalChannels++;
        console.log(`${file.replace('_Jan2025_export.json', '').padEnd(40)} | ${messageCount.toLocaleString().padStart(8)} messages`);
    } catch (err) {
        console.log(`${file.padEnd(40)} | ERROR reading file`);
    }
});

console.log('\n' + '═'.repeat(80));
console.log(`📊 TOTAL: ${totalMessages.toLocaleString()} messages across ${totalChannels} channels`);
console.log('═'.repeat(80) + '\n');





