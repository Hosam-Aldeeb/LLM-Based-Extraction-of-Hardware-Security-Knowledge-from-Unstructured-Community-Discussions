const fs = require('fs');

console.log('\n' + '═'.repeat(80));
console.log('📊 ALL CHANNELS - FINDINGS SUMMARY');
console.log('═'.repeat(80));

const files = fs.readdirSync('.').filter(f => f.endsWith('_openai_analysis.json'));

let totalThreads = 0;
let totalVulns = 0;
let totalTechs = 0;
let totalHardware = 0;
let totalProtocols = 0;

const channelData = [];

files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const channelName = file.replace('_openai_analysis.json', '');
    
    const stats = {
        name: channelName,
        threads: data.threadsAnalyzed,
        vulns: data.aggregatedFindings.vulnerabilities.length,
        techs: data.aggregatedFindings.techniques.length,
        hardware: data.aggregatedFindings.hardware.length,
        protocols: data.aggregatedFindings.protocols.length
    };
    
    channelData.push(stats);
    
    totalThreads += stats.threads;
    totalVulns += stats.vulns;
    totalTechs += stats.techs;
    totalHardware += stats.hardware;
    totalProtocols += stats.protocols;
});

// Sort by thread count (descending)
channelData.sort((a, b) => b.threads - a.threads);

console.log('\n📋 CHANNELS (sorted by thread count):\n');

channelData.forEach((ch, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${ch.name.padEnd(40)} | Threads: ${ch.threads.toString().padStart(3)} | V:${ch.vulns.toString().padStart(3)} T:${ch.techs.toString().padStart(4)} H:${ch.hardware.toString().padStart(4)} P:${ch.protocols.toString().padStart(3)}`);
});

console.log('\n' + '═'.repeat(80));
console.log('🎯 GRAND TOTALS');
console.log('═'.repeat(80));
console.log(`\n📊 Total Channels: ${files.length}`);
console.log(`📊 Total Threads Analyzed: ${totalThreads}`);
console.log(`\n🚨 Total Vulnerabilities: ${totalVulns}`);
console.log(`🛠️  Total Techniques: ${totalTechs}`);
console.log(`💻 Total Hardware: ${totalHardware}`);
console.log(`📡 Total Protocols: ${totalProtocols}`);
console.log(`\n🎯 GRAND TOTAL FINDINGS: ${totalVulns + totalTechs + totalHardware + totalProtocols}`);

console.log('\n' + '═'.repeat(80));
console.log('📖 COMMANDS TO VIEW MORE:');
console.log('═'.repeat(80));
console.log('\n1️⃣  View specific channel:');
console.log('   node view-channel-findings.js <channel_name>');
console.log('\n2️⃣  View top findings across all channels:');
console.log('   node view-top-findings.js');
console.log('\n3️⃣  View this summary again:');
console.log('   node view-all-findings.js');
console.log('\n' + '═'.repeat(80) + '\n');





