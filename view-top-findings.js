const fs = require('fs');

const CHANNELS = [
    'Adafruit_helpwithhwdesign',
    'Amulius_arm',
    'Amulius_esp32',
    'Amulius_linux',
    'Amulius_risc-v',
    'CutFreedom_swinfo',
    'Defcon_hw-hacks',
    'ElectronicRepair_laptops',
    'ElectronicRepair_pc-repair',
    'HardwayHacking_general-hacking',
    'HardwayHacking_hardware',
    'KiCad_general',
    'KiCad_pcb',
    'meshatastic_firmware',
    'meshatastic_flashingfw',
    'Meshtastic_firmware',
    'MisterFPGA_controllers',
    'Rinkhals_HardwareHacking',
    'SDRplusplus_dsp',
    'SDRplusplus_programming',
    'STM32World_general',
    'STM32World_hardware'
];

console.log('\n' + '═'.repeat(80));
console.log('🔍 TOP FINDINGS ACROSS ALL CHANNELS');
console.log('═'.repeat(80) + '\n');

// Aggregate all findings with counts
const vulnerabilityCounts = new Map();
const techniqueCounts = new Map();
const hardwareCounts = new Map();
const protocolCounts = new Map();

let totalThreads = 0;

CHANNELS.forEach(channel => {
    const file = `${channel}_openai_analysis.json`;
    if (!fs.existsSync(file)) return;

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    totalThreads += data.threadsAnalyzed || 0;

    // Count occurrences
    data.aggregatedFindings?.vulnerabilities?.forEach(v => {
        vulnerabilityCounts.set(v, (vulnerabilityCounts.get(v) || 0) + 1);
    });

    data.aggregatedFindings?.techniques?.forEach(t => {
        techniqueCounts.set(t, (techniqueCounts.get(t) || 0) + 1);
    });

    data.aggregatedFindings?.hardware?.forEach(h => {
        hardwareCounts.set(h, (hardwareCounts.get(h) || 0) + 1);
    });

    data.aggregatedFindings?.protocols?.forEach(p => {
        protocolCounts.set(p, (protocolCounts.get(p) || 0) + 1);
    });
});

// Sort by frequency
const topVulnerabilities = Array.from(vulnerabilityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

const topTechniques = Array.from(techniqueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

const topHardware = Array.from(hardwareCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

const topProtocols = Array.from(protocolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

console.log(`📊 Analyzed ${totalThreads} threads across ${CHANNELS.length} channels\n`);

console.log('═'.repeat(80));
console.log('🚨 TOP 20 VULNERABILITIES (by frequency across channels)');
console.log('═'.repeat(80));
topVulnerabilities.forEach((item, idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. [${item[1]} channels] ${item[0]}`);
});

console.log('\n' + '═'.repeat(80));
console.log('🛠️  TOP 20 TECHNIQUES (by frequency across channels)');
console.log('═'.repeat(80));
topTechniques.forEach((item, idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. [${item[1]} channels] ${item[0]}`);
});

console.log('\n' + '═'.repeat(80));
console.log('💻 TOP 20 HARDWARE (by frequency across channels)');
console.log('═'.repeat(80));
topHardware.forEach((item, idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. [${item[1]} channels] ${item[0]}`);
});

console.log('\n' + '═'.repeat(80));
console.log('📡 TOP 20 PROTOCOLS (by frequency across channels)');
console.log('═'.repeat(80));
topProtocols.forEach((item, idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. [${item[1]} channels] ${item[0]}`);
});

console.log('\n' + '═'.repeat(80));
console.log('✅ SUMMARY COMPLETE');
console.log('═'.repeat(80) + '\n');

// Save to file
const summary = {
    totalThreadsAnalyzed: totalThreads,
    totalChannels: CHANNELS.length,
    topVulnerabilities: topVulnerabilities.map(([name, count]) => ({ name, channels: count })),
    topTechniques: topTechniques.map(([name, count]) => ({ name, channels: count })),
    topHardware: topHardware.map(([name, count]) => ({ name, channels: count })),
    topProtocols: topProtocols.map(([name, count]) => ({ name, channels: count })),
    allFindings: {
        totalUniqueVulnerabilities: vulnerabilityCounts.size,
        totalUniqueTechniques: techniqueCounts.size,
        totalUniqueHardware: hardwareCounts.size,
        totalUniqueProtocols: protocolCounts.size
    }
};

fs.writeFileSync('TOP_FINDINGS_SUMMARY.json', JSON.stringify(summary, null, 2));
console.log('💾 Saved detailed summary to TOP_FINDINGS_SUMMARY.json\n');


