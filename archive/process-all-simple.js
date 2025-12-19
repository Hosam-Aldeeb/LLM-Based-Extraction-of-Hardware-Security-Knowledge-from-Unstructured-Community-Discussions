const fs = require('fs');
const path = require('path');

console.log('\n🚀 STARTING PIPELINE...\n');

// Configuration
const EXPORTS_DIR = './discord-exports';
const SKIP_EXPORTS = [
    'Arduino_generalhelp_Jan2025_export.json',
    'ece722_Nov4-Nov11_export.json',
    'ece722_Oct7-25_export.json',
    'ece722_Oct7-Today_export.json'
];

// Get export files
console.log('📁 Scanning for exports...');
const files = fs.readdirSync(EXPORTS_DIR)
    .filter(f => f.endsWith('_export.json'))
    .filter(f => !SKIP_EXPORTS.includes(f));

console.log(`✅ Found ${files.length} exports to process:\n`);
files.forEach((f, i) => {
    const name = f.replace('_Jan2025_export.json', '').replace(/_/g, '_');
    console.log(`  ${i + 1}. ${name}`);
});

console.log('\n' + '='.repeat(70));
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
console.log('='.repeat(70) + '\n');

setTimeout(() => {
    console.log('🚀 Starting processing in 3...');
    setTimeout(() => {
        console.log('🚀 Starting processing in 2...');
        setTimeout(() => {
            console.log('🚀 Starting processing in 1...');
            setTimeout(() => {
                console.log('\n✅ Ready! Now run the actual processing.\n');
                console.log('Next step: I will create individual scripts for each export.');
            }, 1000);
        }, 1000);
    }, 1000);
}, 1000);




