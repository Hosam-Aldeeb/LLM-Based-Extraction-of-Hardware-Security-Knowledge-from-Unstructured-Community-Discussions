const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const INPUT_FILE = './discord-exports/ece722_lab3_summary.txt';
const OUTPUT_FILE = './discord-exports/ece722_lab3_AI_SUMMARY.txt';

async function summarizeLab3() {
    console.log('🤖 Starting Lab 3 AI Summarization (Direct Ollama)...\n');
    console.log('='.repeat(70));

    // 1. Read the raw messages
    console.log('\n📂 Reading Lab 3 messages...');
    const rawMessages = fs.readFileSync(INPUT_FILE, 'utf8');
    console.log('  ✅ Loaded messages');

    // 2. Extract key messages
    const keyMessages = `
[10/27] Prof: SDC files have naming conflicts, cleaning up Lab3 today
[10/27] Prof: Need to test larger netlist, still have to do Lab3
[11/1] Student: Only have 4 golden files, one should be lab2q3.golden not lab3.golden
[11/4] Student: Shared lab3q3.csv file
[11/5] Prof: @here Can I check how far along you've come in Lab3?
[11/5] Student: Error running 'make sim DUT=rca' - verilator: No such file or directory
[11/7] Student: Removed files from lab3 folder and cloned again, will that cause issues?
`;

    const prompt = `Summarize ECE722 Lab 3 key points from these Discord messages:

${keyMessages}

Provide a clear summary with these sections:

**LAB 3 OVERVIEW:**
What is Lab 3 about? (RCA adder design, Verilator simulation, testing)

**COMMON ISSUES:**
- Verilator path/installation issues
- SDC file naming conflicts
- Golden file mismatches (lab2q3 vs lab3)
- File management (cloning/removing files)

**TESTING PROCEDURE:**
How to test: make sim DUT=rca

**IMPORTANT TIPS:**
- Check Verilator is installed and in PATH
- Verify golden file names match expected format
- Don't carelessly remove/re-clone lab files
- Watch for SDC path mismatches

**TIMELINE:**
Professor checked progress on Nov 5, 2025

Keep it concise and actionable.`;

    // 3. Save prompt to temp file
    const promptFile = './temp-prompt.txt';
    fs.writeFileSync(promptFile, prompt, 'utf8');

    // 4. Call Ollama directly
    console.log('\n⏳ Generating AI summary with Ollama (20-30 seconds)...');
    
    try {
        const { stdout, stderr } = await execAsync(`ollama run tinyllama < ${promptFile}`, {
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });

        const summary = stdout.trim();
        
        // 5. Save summary
        const finalOutput = `ECE722 LAB 3 - AI GENERATED SUMMARY
Generated: ${new Date().toLocaleString()}
Model: tinyllama (via Ollama CLI)
Source: 9 Lab 3-related messages (Oct 27 - Nov 7, 2025)

${'='.repeat(70)}

${summary}

${'='.repeat(70)}

RAW MESSAGES:
${keyMessages}

For full raw messages with timestamps and usernames, see: ece722_lab3_summary.txt
`;

        fs.writeFileSync(OUTPUT_FILE, finalOutput, 'utf8');
        console.log(`\n✅ AI summary saved to: ${OUTPUT_FILE}`);
        console.log('\n📊 SUMMARY:');
        console.log('─'.repeat(70));
        console.log(summary);
        console.log('─'.repeat(70));

        // Cleanup
        fs.unlinkSync(promptFile);

    } catch (error) {
        console.error('\n❌ Error during summarization:', error.message);
        
        // Cleanup on error
        if (fs.existsSync(promptFile)) {
            fs.unlinkSync(promptFile);
        }
        
        throw error;
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ SUMMARIZATION COMPLETE!');
    console.log(`📁 Output: ${OUTPUT_FILE}`);
    console.log('\n💡 Use this summary to understand Lab 3 requirements and common issues!');
}

summarizeLab3().catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});





