const { execSync } = require('child_process');
const path = require('path');

// Configuration
const TOKEN = "YOUR_DISCORD_TOKEN_HERE";
const EXPORTER_PATH = path.join(__dirname, 'discord-exports', 'DiscordChatExporter.Cli.exe');
const OUTPUT_DIR = path.join(__dirname, 'discord-exports');
const DATE_START = "2025-01-01"; // Jan 2025 to today

// Tier 1 Channels
const channels = [
  { id: '846366734725152808', server: 'Defcon', channel: 'hw-hacks' },
  { id: '656770973852237844', server: 'Adafruit', channel: 'helpwithhwdesign' },
  { id: '758882395599405087', server: 'Adafruit', channel: 'fpga' },
  { id: '1020203748729049159', server: 'Arduino', channel: 'hw-help' },
  { id: '451155251580633089', server: 'Arduino', channel: 'generalhelp' },
  { id: '1348004345253199902', server: 'STM32World', channel: 'hardware' },
  { id: '1347730523824455753', server: 'STM32World', channel: 'general' },
  { id: '813247702732636222', server: 'KiCad', channel: 'pcb' },
  { id: '502708194179809283', server: 'KiCad', channel: 'general' }
];

// Delay function (30-45 seconds between exports for safety)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay() {
  return 30000 + Math.random() * 15000; // 30-45 seconds
}

async function exportChannels() {
  console.log('🚀 Starting Tier 1 Batch Export');
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



