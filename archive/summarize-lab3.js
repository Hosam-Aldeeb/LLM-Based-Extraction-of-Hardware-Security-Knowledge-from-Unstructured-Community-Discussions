const fs = require('fs');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Configuration
const INPUT_FILE = './discord-exports/ece722_lab3_summary.txt';
const OUTPUT_FILE = './discord-exports/ece722_lab3_AI_SUMMARY.txt';

async function summarizeLab3() {
    console.log('🤖 Starting Lab 3 AI Summarization...\n');
    console.log('='.repeat(70));

    // 1. Read the raw messages
    console.log('\n📂 Reading Lab 3 messages...');
    const rawMessages = fs.readFileSync(INPUT_FILE, 'utf8');
    console.log('  ✅ Loaded messages');

    // 2. Connect to MCP server
    console.log('\n🔌 Connecting to MCP server...');
    
    const transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/server.js']
    });

    const mcp = new Client({
        name: 'lab3-summarizer',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    await mcp.connect(transport);
    console.log('  ✅ Connected to MCP server');

    // 3. Extract just the key messages (shorter prompt)
    const keyMessages = `
[10/27] Prof: SDC files have naming conflicts, cleaning up Lab3 today
[10/27] Prof: Need to test larger netlist, still have to do Lab3
[11/1] Student: Only have 4 golden files, one should be lab2q3.golden not lab3.golden
[11/4] Student: Shared lab3q3.csv file
[11/5] Prof: @here Can I check how far along you've come in Lab3?
[11/5] Student: Error running 'make sim DUT=rca' - verilator: No such file or directory
[11/7] Student: Removed files from lab3 folder and cloned again, will that cause issues?
`;

    const prompt = `Summarize ECE722 Lab 3 key points from these messages:

${keyMessages}

Provide:
1. What Lab 3 is about (RCA adder design, Verilator simulation)
2. Common issues (Verilator path, SDC conflicts, golden file mismatches, cloning issues)
3. Tips (use 'make sim DUT=rca', check file paths, don't remove/re-clone carelessly)
4. Timeline (Prof checked progress Nov 5)

Keep it concise and actionable for students.`;

    // 4. Call MCP to generate summary
    console.log('\n⏳ Generating AI summary (20-30 seconds)...');
    
    try {
        const result = await mcp.callTool({
            name: 'ollama_generate',
            arguments: {
                model: 'tinyllama',
                prompt: prompt
            }
        }, {
            timeout: 60000 // 1 minute
        });

        const summary = result.content?.[0]?.text || 'No summary generated';
        
        // 5. Save summary
        const finalOutput = `ECE722 LAB 3 - AI GENERATED SUMMARY
Generated: ${new Date().toLocaleString()}
Model: tinyllama (via MCP + Ollama)
Source: 9 Lab 3-related messages (Oct 27 - Nov 7, 2025)

${'='.repeat(70)}

${summary}

${'='.repeat(70)}

For full raw messages, see: ece722_lab3_summary.txt
`;

        fs.writeFileSync(OUTPUT_FILE, finalOutput, 'utf8');
        console.log(`\n✅ AI summary saved to: ${OUTPUT_FILE}`);
        console.log('\n📊 SUMMARY PREVIEW:');
        console.log('─'.repeat(70));
        console.log(summary);
        console.log('─'.repeat(70));

    } catch (error) {
        console.error('\n❌ Error during summarization:', error.message);
        throw error;
    } finally {
        await mcp.close();
        console.log('\n🔌 Disconnected from MCP server');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ SUMMARIZATION COMPLETE!');
    console.log(`📁 Output: ${OUTPUT_FILE}`);
}

summarizeLab3().catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});

