const fs = require('fs');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const EXPORT_FILE = './discord-exports/ece722_Nov4-Today_export.json';
const OUTPUT_FILE = './discord-exports/ece722_lab3_summary.txt';
const MCP_SERVER_PATH = 'C:/Users/Hosam/Desktop/MCP/dist/server.js';

async function processLab3Discussion() {
    console.log('🔧 Starting ECE722 Lab 3 Summary Extraction...\n');
    console.log('='.repeat(70));

    // 1. Read DiscordChatExporter JSON
    console.log('\n📂 Reading export file...');
    const exportData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
    const messages = exportData.messages || [];
    console.log(`  ✅ Found ${messages.length} messages from Nov 4 to today`);

    // 2. Filter for Lab 3 related messages
    console.log('\n🔍 Filtering for Lab 3 related messages...');
    const lab3Keywords = ['lab 3', 'lab3', 'lab three', 'third lab', 'assignment 3'];
    const lab3Messages = messages.filter(msg => {
        if (!msg.content) return false;
        const lowerContent = msg.content.toLowerCase();
        return lab3Keywords.some(keyword => lowerContent.includes(keyword));
    });
    console.log(`  ✅ Found ${lab3Messages.length} Lab 3-related messages`);

    // 3. Collect all Lab 3 discussion text
    let collectedText = '=== ECE722 LAB 3 DISCUSSION ===\n\n';
    for (const msg of lab3Messages) {
        if (msg.content && msg.content.trim().length > 0) {
            const timestamp = new Date(msg.timestamp).toLocaleString();
            collectedText += `[${timestamp}] ${msg.author.name}:\n${msg.content}\n\n${'─'.repeat(70)}\n\n`;
        }
    }

    // 4. If no Lab 3 messages found, collect all messages for context
    if (lab3Messages.length === 0) {
        console.log('\n⚠️  No explicit Lab 3 mentions found. Collecting all messages for analysis...');
        collectedText = '=== ECE722 HOMEWORK HELP (Nov 4 - Today) ===\n\n';
        for (const msg of messages) {
            if (msg.content && msg.content.trim().length > 0) {
                const timestamp = new Date(msg.timestamp).toLocaleString();
                collectedText += `[${timestamp}] ${msg.author.name}:\n${msg.content}\n\n${'─'.repeat(70)}\n\n`;
            }
        }
    }

    console.log(`\n📝 Collected ${collectedText.length} characters of discussion`);

    // 5. Connect to MCP server for summarization
    console.log('\n🤖 Connecting to MCP server for AI summarization...');
    
    let mcpClient;
    let serverProcess;
    
    try {
        // Start MCP server process
        serverProcess = spawn('node', [MCP_SERVER_PATH], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(MCP_SERVER_PATH)
        });

        const transport = new StdioClientTransport({
            reader: serverProcess.stdout,
            writer: serverProcess.stdin
        });

        mcpClient = new Client({
            name: 'ece722-lab3-processor',
            version: '1.0.0'
        }, {
            capabilities: {}
        });

        await mcpClient.connect(transport);
        console.log('  ✅ Connected to MCP server');

        // 6. Create a focused prompt for Lab 3 summary
        const prompt = `You are analyzing ECE722 hardware hacking course discussions about Lab 3.

Below are Discord messages from the homework-help channel (Nov 4 - Today).

Please provide a comprehensive summary with these sections:

**LAB 3 OVERVIEW:**
- What is Lab 3 about? (main objectives)

**KEY TOPICS & CONCEPTS:**
- Important hardware/software concepts discussed
- Tools or equipment mentioned

**COMMON ISSUES & SOLUTIONS:**
- Problems students encountered
- Solutions or tips provided

**IMPORTANT TIPS:**
- Debugging advice
- Best practices mentioned
- Things to avoid

**DEADLINES & REQUIREMENTS:**
- Any mentioned due dates
- Specific requirements or deliverables

If no explicit Lab 3 content is found, summarize the most relevant hardware hacking topics discussed that could relate to typical lab assignments.

DISCUSSIONS:
${collectedText.slice(0, 15000)}`; // Limit to avoid timeout

        console.log('\n⏳ Generating Lab 3 summary (this may take 30-60 seconds)...');
        
        const result = await mcpClient.callTool({
            name: 'ollama_generate',
            arguments: {
                model: 'llama3.1',
                prompt: prompt
            }
        }, {
            timeout: 120000 // 2 minute timeout
        });

        const summary = result.content?.[0]?.text || 'No summary generated';
        
        // 7. Save summary
        const finalOutput = `ECE722 LAB 3 SUMMARY
Generated: ${new Date().toLocaleString()}
Source: ${messages.length} messages from Nov 4, 2024 to today
Lab 3 specific messages: ${lab3Messages.length}

${'='.repeat(70)}

${summary}

${'='.repeat(70)}

RAW MESSAGES (for reference):

${collectedText}
`;

        fs.writeFileSync(OUTPUT_FILE, finalOutput, 'utf8');
        console.log(`\n✅ Summary saved to: ${OUTPUT_FILE}`);
        console.log('\n📊 SUMMARY PREVIEW:');
        console.log('─'.repeat(70));
        console.log(summary.slice(0, 1000) + (summary.length > 1000 ? '...\n\n[See full summary in output file]' : ''));
        console.log('─'.repeat(70));

    } catch (error) {
        console.error('\n❌ Error during MCP analysis:', error.message);
        
        // Fallback: Save raw messages without AI summary
        const fallbackOutput = `ECE722 LAB 3 MESSAGES (RAW)
Generated: ${new Date().toLocaleString()}
Source: ${messages.length} messages from Nov 4, 2024 to today
Lab 3 specific messages: ${lab3Messages.length}

NOTE: AI summarization failed. Below are the raw messages for manual review.

${'='.repeat(70)}

${collectedText}
`;
        fs.writeFileSync(OUTPUT_FILE, fallbackOutput, 'utf8');
        console.log(`\n⚠️  Saved raw messages to: ${OUTPUT_FILE}`);
        console.log('💡 You can manually review the messages or try running the script again.');
    } finally {
        // Cleanup
        if (mcpClient) {
            try {
                await mcpClient.close();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        if (serverProcess) {
            serverProcess.kill();
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ PROCESSING COMPLETE!');
    console.log(`📁 Output file: ${OUTPUT_FILE}`);
    console.log('💡 Use this summary to prepare for Lab 3 or review key concepts!');
}

processLab3Discussion().catch(async (error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});





