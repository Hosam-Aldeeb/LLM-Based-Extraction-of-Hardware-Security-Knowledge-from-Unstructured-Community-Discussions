const fs = require('fs');

const channelName = process.argv[2];

if (!channelName) {
    console.log('\n📖 USAGE: node export-vulnerabilities.js <channel_name>');
    console.log('\nOR export ALL channels:');
    console.log('   node export-vulnerabilities.js ALL');
    console.log('\nAvailable channels:');
    const files = fs.readdirSync('.').filter(f => f.endsWith('_openai_analysis.json'));
    files.forEach(f => {
        const name = f.replace('_openai_analysis.json', '');
        console.log(`  - ${name}`);
    });
    process.exit(0);
}

function exportChannel(channel) {
    const file = `${channel}_openai_analysis.json`;
    
    if (!fs.existsSync(file)) {
        console.log(`❌ File not found: ${file}`);
        return false;
    }
    
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const outputFile = `${channel}_VULNERABILITIES.txt`;
    
    let output = '';
    output += '═'.repeat(80) + '\n';
    output += `🚨 VULNERABILITIES: ${data.channel}\n`;
    output += '═'.repeat(80) + '\n\n';
    output += `Total Vulnerabilities Found: ${data.aggregatedFindings.vulnerabilities.length}\n`;
    output += `Threads Analyzed: ${data.threadsAnalyzed}\n\n`;
    output += '═'.repeat(80) + '\n';
    output += 'COMPLETE LIST:\n';
    output += '═'.repeat(80) + '\n\n';
    
    data.aggregatedFindings.vulnerabilities.forEach((v, i) => {
        output += `${(i + 1).toString().padStart(4)}. ${v}\n`;
    });
    
    output += '\n' + '═'.repeat(80) + '\n';
    output += `📊 Source: ${file}\n`;
    output += `📅 Exported: ${new Date().toISOString()}\n`;
    output += '═'.repeat(80) + '\n';
    
    fs.writeFileSync(outputFile, output, 'utf8');
    console.log(`✅ Exported ${data.aggregatedFindings.vulnerabilities.length} vulnerabilities to: ${outputFile}`);
    return true;
}

if (channelName === 'ALL') {
    console.log('\n📦 Exporting vulnerabilities from ALL channels...\n');
    const files = fs.readdirSync('.').filter(f => f.endsWith('_openai_analysis.json'));
    let count = 0;
    files.forEach(file => {
        const channel = file.replace('_openai_analysis.json', '');
        if (exportChannel(channel)) {
            count++;
        }
    });
    console.log(`\n🎉 Exported vulnerabilities from ${count} channels!`);
} else {
    exportChannel(channelName);
}





