const { execSync } = require('child_process');
const path = require('path');

// Configuration
const TOKEN = "YOUR_DISCORD_TOKEN_HERE";
const EXPORTER_PATH = path.join(__dirname, 'discord-exports', 'DiscordChatExporter.Cli.exe');
const OUTPUT_DIR = path.join(__dirname, 'discord-exports');
const DATE_START = "2025-01-01"; // Jan 2025 to today

// Final Batch Channels
const channels = [
  { id: '806759728885006356', server: 'MisterFPGA', channel: 'mister-debug' },
  { id: '806024374368075776', server: 'MisterFPGA', channel: 'controllers' },
  { id: '985150159514124318', server: 'HardwayHacking', channel: 'hardware' },
  { id: '430469162700242956', server: 'HardwayHacking', channel: 'general-hacking' }
];

// Delay function (30-45 seconds between exports for safety)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay() {
  return 30000 + Math.random() * 15000; // 30-45 seconds
}

async function exportChannels() {
  console.log('🚀 Starting Final Batch Export');
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



