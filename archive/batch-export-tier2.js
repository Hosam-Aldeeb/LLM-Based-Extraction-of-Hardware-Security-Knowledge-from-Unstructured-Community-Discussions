const { execSync } = require('child_process');
const path = require('path');

// Configuration
const TOKEN = "YOUR_DISCORD_TOKEN_HERE";
const EXPORTER_PATH = path.join(__dirname, 'discord-exports', 'DiscordChatExporter.Cli.exe');
const OUTPUT_DIR = path.join(__dirname, 'discord-exports');
const DATE_START = "2025-01-01"; // Jan 2025 to today

// Tier 2 Channels
const channels = [
  { id: '709820474460471426', server: 'Amulius', channel: 'esp32' },
  { id: '708981465328648234', server: 'Amulius', channel: 'linux' },
  { id: '708982085934645248', server: 'Amulius', channel: 'arm' },
  { id: '708982159217524798', server: 'Amulius', channel: 'risc-v' },
  { id: '449497165308624896', server: 'ElectronicRepair', channel: 'laptops' },
  { id: '499238475690672154', server: 'ElectronicRepair', channel: 'pc-repair' },
  { id: '752673189854838885', server: 'SDRplusplus', channel: 'programming' },
  { id: '990309531097640961', server: 'SDRplusplus', channel: 'dsp' }
];

// Delay function (30-45 seconds between exports for safety)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay() {
  return 30000 + Math.random() * 15000; // 30-45 seconds
}

async function exportChannels() {
  console.log('🚀 Starting Tier 2 Batch Export');
  console.log(`📊 Total channels: ${channels.length}`);
  console.log(`⏱️  Estimated time: ${Math.ceil(channels.length * 40 / 60)} minutes\n`);
  console.log('=' .repeat(70));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const filename = `${ch.server}_${ch.channel}_Jan2025_export.json`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    console.log(`\n[${i + 1}/${channels.length}] Exporting: ${ch.server} / ${ch.channel}`);
    console.log(`📁 Output: ${filename}`);

    const command = `"${EXPORTER_PATH}" export --token "${TOKEN}" --channel "${ch.id}" --after "${DATE_START}" --format Json --output "${outputPath}"`;

    try {
      execSync(command, { 
        stdio: 'inherit',
        cwd: OUTPUT_DIR,
        windowsHide: true
      });
      successCount++;
      console.log(`✅ Success!`);
    } catch (error) {
      failCount++;
      console.error(`❌ Failed: ${error.message}`);
    }

    // Add delay between exports (except after the last one)
    if (i < channels.length - 1) {
      const delayMs = getRandomDelay();
      console.log(`⏳ Waiting ${Math.ceil(delayMs / 1000)}s before next export...`);
      await delay(delayMs);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉 Batch Export Complete!');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📂 All files saved to: ${OUTPUT_DIR}`);
}

exportChannels().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});



