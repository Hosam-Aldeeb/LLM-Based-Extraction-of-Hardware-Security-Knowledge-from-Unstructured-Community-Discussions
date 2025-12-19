const fs = require('fs');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Configuration
const EXPORT_FILE = './discord-exports/ece722_Oct7-Today_export.json';
const OUTPUT_FILE = './discord-exports/ece722_lab_tips_summary.txt';
const MCP_SERVER_PATH = 'C:/Users/Hosam/Desktop/MCP/dist/server.js';

async function processLabDiscussion() {
  console.log('🔧 Starting ECE722 Lab Tips Extraction...\n');

  // 1. Connect to MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: [MCP_SERVER_PATH]
  });

  const mcp = new Client(
    {
      name: 'ece722-processor',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  await mcp.connect(transport);
  console.log('✅ Connected to MCP server\n');

  // 2. Read the export file
  const exportData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
  const messages = exportData.messages || [];
  console.log(`📊 Found ${messages.length} messages\n`);

  if (messages.length === 0) {
    console.log('⚠️  No messages found in export.');
    process.exit(0);
  }

  // 3. Collect all message content
  let allContent = '';
  for (const msg of messages) {
    if (msg.content && msg.content.trim().length > 0) {
      allContent += `[${msg.author?.name || 'Unknown'}]: ${msg.content}\n\n`;
    }
  }

  console.log(`📝 Collected ${allContent.length} characters of discussion\n`);

  // 4. Use MCP to analyze and extract lab tips
  console.log('🤖 Analyzing with MCP (this may take a minute)...\n');

  const prompt = `You are analyzing a Discord channel discussion about an ECE722 lab assignment. 
Extract and summarize ALL lab tips, advice, and important discussion points from the following messages.

Format your response as a clean, organized text summary with these sections:
1. LAB OVERVIEW (what the lab is about)
2. KEY TIPS & ADVICE (bullet points of helpful tips mentioned)
3. COMMON ISSUES & SOLUTIONS (problems students faced and how to solve them)
4. IMPORTANT NOTES (deadlines, requirements, warnings)
5. USEFUL RESOURCES (links, tools, references mentioned)

Be thorough and include all relevant technical details. This summary will be used to help complete the lab.

DISCORD MESSAGES:
${allContent.slice(0, 15000)}`;

  try {
    const result = await mcp.callTool({
      name: 'ollama_generate',
      arguments: {
        model: 'llama3.1',
        prompt: prompt
      }
    });

    const first = Array.isArray(result.content) ? result.content[0] : undefined;
    const summary = first && first.type === 'text' ? first.text : 'No summary generated';

    // 5. Save to text file
    const outputContent = `ECE722 LAB TIPS & DISCUSSION SUMMARY
Generated: ${new Date().toISOString()}
Source: ${messages.length} messages from homework-help channel (Oct 7-25, 2025)

${'='.repeat(80)}

${summary}

${'='.repeat(80)}

RAW MESSAGE COUNT: ${messages.length}
PARTICIPANTS: ${[...new Set(messages.map(m => m.author?.name).filter(Boolean))].join(', ')}
`;

    fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf8');
    console.log(`\n✅ Summary saved to: ${OUTPUT_FILE}`);
    console.log(`📄 File size: ${(outputContent.length / 1024).toFixed(2)} KB`);
    console.log('\n🎉 Done! You can now send this text file to ChatGPT.');

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    
    // Fallback: save raw messages
    console.log('\n⚠️  Saving raw messages as fallback...');
    fs.writeFileSync(OUTPUT_FILE, allContent, 'utf8');
    console.log(`✅ Raw messages saved to: ${OUTPUT_FILE}`);
  }

  await mcp.close();
  process.exit(0);
}

processLabDiscussion().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

