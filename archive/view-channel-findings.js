const fs = require('fs');

const channelName = process.argv[2];

if (!channelName) {
    console.log('\n📖 USAGE: node view-channel-findings.js <channel_name>');
    console.log('\nAvailable channels:');
    const files = fs.readdirSync('.').filter(f => f.endsWith('_openai_analysis.json'));
    files.forEach(f => {
        const name = f.replace('_openai_analysis.json', '');
        console.log(`  - ${name}`);
    });
    process.exit(0);
}

const file = `${channelName}_openai_analysis.json`;

if (!fs.existsSync(file)) {
    console.log(`\n❌ File not found: ${file}`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('\n' + '═'.repeat(80));
console.log(`🔍 CHANNEL: ${data.channel}`);
console.log('═'.repeat(80));

console.log(`\n📊 Threads Analyzed: ${data.threadsAnalyzed}`);

console.log('\n' + '═'.repeat(80));
console.log('📊 AGGREGATED FINDINGS');
console.log('═'.repeat(80));

console.log(`\n🚨 Vulnerabilities: ${data.aggregatedFindings.vulnerabilities.length}`);
if (data.aggregatedFindings.vulnerabilities.length > 0) {
    console.log('\nTop 20:');
    data.aggregatedFindings.vulnerabilities.slice(0, 20).forEach((v, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${v}`);
    });
}

console.log(`\n🛠️  Techniques: ${data.aggregatedFindings.techniques.length}`);
if (data.aggregatedFindings.techniques.length > 0) {
    console.log('\nTop 20:');
    data.aggregatedFindings.techniques.slice(0, 20).forEach((t, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${t}`);
    });
}

console.log(`\n💻 Hardware: ${data.aggregatedFindings.hardware.length}`);
if (data.aggregatedFindings.hardware.length > 0) {
    console.log('\nTop 20:');
    data.aggregatedFindings.hardware.slice(0, 20).forEach((h, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${h}`);
    });
}

console.log(`\n📡 Protocols: ${data.aggregatedFindings.protocols.length}`);
if (data.aggregatedFindings.protocols.length > 0) {
    console.log('\nAll:');
    data.aggregatedFindings.protocols.forEach((p, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${p}`);
    });
}

console.log('\n' + '═'.repeat(80));
console.log(`💾 Full details in: ${file}`);
console.log('═'.repeat(80) + '\n');


