const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const EXPORT_FILE = './discord-exports/ece722_Nov4-Nov11_export.json';
const OUTPUT_FILE = './discord-exports/ece722_FULL_LAB3_SUMMARY.txt';

async function comprehensiveLab3Summary() {
    console.log('🤖 Creating Comprehensive Lab 3 Summary from ALL Messages...\n');
    console.log('='.repeat(70));

    // 1. Read the full export
    console.log('\n📂 Reading full export (Nov 4 - Today)...');
    const exportData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
    const messages = exportData.messages || [];
    console.log(`  ✅ Found ${messages.length} total messages`);

    // 2. Extract all message content
    console.log('\n📝 Extracting all message content...');
    let allText = '';
    let messageCount = 0;
    
    for (const msg of messages) {
        if (msg.content && msg.content.trim().length > 0) {
            const timestamp = new Date(msg.timestamp).toLocaleDateString();
            allText += `[${timestamp}] ${msg.author.name}: ${msg.content}\n\n`;
            messageCount++;
        }
    }
    
    console.log(`  ✅ Extracted ${messageCount} messages with content`);
    console.log(`  📊 Total text length: ${allText.length} characters`);

    // 3. Save full text for reference
    const fullTextFile = './discord-exports/ece722_Nov4-Nov11_ALL_MESSAGES.txt';
    fs.writeFileSync(fullTextFile, `ECE722 HOMEWORK HELP - ALL MESSAGES (Nov 4-11, 2025)
Total Messages: ${messageCount}
Generated: ${new Date().toLocaleString()}

${'='.repeat(70)}

${allText}`, 'utf8');
    console.log(`  ✅ Saved full text to: ${fullTextFile}`);

    // 4. Create focused prompt for Lab 3 summary
    // Take a sample of messages (first 50k chars to avoid timeout)
    const sampleText = allText.slice(0, 50000);
    
    const prompt = `You are analyzing ECE722 hardware design course discussions from Nov 4-11, 2025 (${messageCount} messages).

Below is a sample of student and professor discussions from the homework-help channel.

Your task: Create a comprehensive Lab 3 summary that would help a student working on Lab 3.

Extract and organize:

**LAB 3 TECHNICAL DETAILS:**
- What is Lab 3 about? (RCA adder, Verilator, testing, etc.)
- Key modules and components (rca.sv, test_adder.sv, etc.)
- File structure and naming conventions
- Testing commands and procedures

**COMMON PROBLEMS & SOLUTIONS:**
- Verilator issues (installation, path, errors)
- Compilation errors and fixes
- Golden file mismatches
- SDC file conflicts
- File management issues

**DEBUGGING TIPS:**
- How to test modules
- How to debug Verilator errors
- How to verify outputs
- Common mistakes to avoid

**TOOLS & COMMANDS:**
- Make commands (make sim DUT=rca, etc.)
- Verilator usage
- File paths and directories

**PROFESSOR'S ADVICE:**
- Any tips or warnings from the professor
- Timeline and deadlines mentioned
- Progress check-ins

**RELATED TOPICS:**
- Any other hardware design concepts discussed that relate to adders, simulation, or testing

Be specific and actionable. Focus on information that would help a student complete Lab 3 successfully.

MESSAGES SAMPLE (first 50k chars of ${messageCount} total messages):

${sampleText}`;

    // 5. Save prompt to temp file
    const promptFile = './temp-comprehensive-prompt.txt';
    fs.writeFileSync(promptFile, prompt, 'utf8');

    // 6. Call Ollama directly with llama3.1 for better quality
    console.log('\n⏳ Generating comprehensive AI summary with Ollama llama3.1...');
    console.log('   (This may take 1-2 minutes for a detailed analysis)');
    
    try {
        const { stdout, stderr } = await execAsync(`ollama run llama3.1 < ${promptFile}`, {
            timeout: 180000, // 3 minutes
            maxBuffer: 20 * 1024 * 1024 // 20MB buffer
        });

        const summary = stdout.trim();
        
        // 7. Save comprehensive summary
        const finalOutput = `ECE722 LAB 3 - COMPREHENSIVE SUMMARY
Generated: ${new Date().toLocaleString()}
Model: llama3.1 (via Ollama CLI)
Source: ${messageCount} messages from Nov 4-11, 2025
Channel: homework-help

${'='.repeat(70)}

${summary}

${'='.repeat(70)}

ANALYSIS NOTES:
- This summary was generated from ${messageCount} Discord messages
- The AI analyzed the first 50,000 characters for Lab 3-relevant content
- Full message archive available in: ece722_Nov4-Nov11_ALL_MESSAGES.txt

${'='.repeat(70)}

HOW TO USE THIS SUMMARY:
1. Copy this entire summary
2. Paste it into ChatGPT with your specific Lab 3 question
3. Example: "Based on this summary, how do I fix Verilator path errors?"
4. Or: "What are the key steps to complete Lab 3 successfully?"

${'='.repeat(70)}
`;

        fs.writeFileSync(OUTPUT_FILE, finalOutput, 'utf8');
        console.log(`\n✅ Comprehensive summary saved to: ${OUTPUT_FILE}`);
        console.log('\n📊 SUMMARY PREVIEW:');
        console.log('─'.repeat(70));
        console.log(summary.slice(0, 2000) + (summary.length > 2000 ? '\n\n... [See full summary in output file]' : ''));
        console.log('─'.repeat(70));

        // Cleanup
        fs.unlinkSync(promptFile);

    } catch (error) {
        console.error('\n❌ Error during summarization:', error.message);
        
        // Cleanup on error
        if (fs.existsSync(promptFile)) {
            fs.unlinkSync(promptFile);
        }
        
        // Provide fallback
        console.log('\n💡 Fallback: Full message text saved to:', fullTextFile);
        console.log('   You can copy that file and paste it directly into ChatGPT');
        
        throw error;
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPREHENSIVE LAB 3 SUMMARY COMPLETE!');
    console.log(`\n📁 Output files:`);
    console.log(`   1. ${OUTPUT_FILE} (AI summary - copy this to ChatGPT)`);
    console.log(`   2. ${fullTextFile} (Full messages - backup)`);
    console.log('\n💡 Ready to paste into ChatGPT for Lab 3 help!');
}

comprehensiveLab3Summary().catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});

