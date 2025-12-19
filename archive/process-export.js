const fs = require('fs');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Configuration
const EXPORT_FILE = './discord-exports/CutFreedom_Jan2025_export.json';
const OUTPUT_FILE = './discord-exports/CutFreedom_Processed_Summaries.json';
const MCP_SERVER_PATH = 'C:/Users/Hosam/Desktop/MCP/dist/server.js';

async function processExport() {
  console.log('🚀 Starting export processing...\n');

  // 1. Connect to YOUR MCP server
  console.log('📡 Connecting to MCP server...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [MCP_SERVER_PATH]
  });
  
  const mcp = new Client({
    name: 'export-processor',
    version: '1.0.0'
  }, { capabilities: {} });
  
  await mcp.connect(transport);
  console.log('✅ Connected to MCP server\n');

  // 2. Read DiscordChatExporter JSON
  console.log('📂 Reading export file...');
  const exportData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
  console.log(`✅ Found ${exportData.messages.length} messages\n`);

  // 3. Process each message
  const summaries = [];
  const totalMessages = exportData.messages.length;
  
  console.log('🤖 Processing messages with Ollama...\n');
  
  for (let i = 0; i < totalMessages; i++) {
    const msg = exportData.messages[i];
    
    // Skip messages without content
    if (!msg.content || msg.content.trim().length === 0) {
      console.log(`[${i + 1}/${totalMessages}] Skipped (empty message)`);
      continue;
    }

    try {
      // 4. Call YOUR MCP server's ollama_generate tool
      const result = await mcp.callTool({
        name: 'ollama_generate',
        arguments: {
          model: 'tinyllama',
          prompt: `You are analyzing hardware hacking discussions. Summarize this message in 2-3 concise sentences, focusing on technical details, tools mentioned, and any actionable insights:\n\n${msg.content}`
        }
      });
      
      summaries.push({
        id: msg.id,
        timestamp: msg.timestamp,
        author: msg.author.name,
        original_content: msg.content,
        summary: result.content[0].text,
        has_attachments: msg.attachments.length > 0,
        has_embeds: msg.embeds.length > 0
      });
      
      console.log(`[${i + 1}/${totalMessages}] ✅ Processed message from ${msg.author.name}`);
      
    } catch (error) {
      console.error(`[${i + 1}/${totalMessages}] ❌ Error: ${error.message}`);
      summaries.push({
        id: msg.id,
        timestamp: msg.timestamp,
        author: msg.author.name,
        original_content: msg.content,
        summary: `[ERROR: ${error.message}]`,
        has_attachments: msg.attachments.length > 0,
        has_embeds: msg.embeds.length > 0
      });
    }
    
    // Small delay to avoid overwhelming Ollama
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${Math.round(((i + 1) / totalMessages) * 100)}%\n`);
    }
  }

  // 5. Save processed results
  console.log('\n💾 Saving processed summaries...');
  const output = {
    metadata: {
      source_file: EXPORT_FILE,
      processed_at: new Date().toISOString(),
      total_messages: totalMessages,
      processed_messages: summaries.length,
      channel: exportData.channel.name,
      guild: exportData.guild.name
    },
    summaries: summaries
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`✅ Saved to: ${OUTPUT_FILE}`);
  
  // 6. Print stats
  console.log('\n📊 Summary Statistics:');
  console.log(`   Total messages: ${totalMessages}`);
  console.log(`   Successfully processed: ${summaries.filter(s => !s.summary.startsWith('[ERROR')).length}`);
  console.log(`   Errors: ${summaries.filter(s => s.summary.startsWith('[ERROR')).length}`);
  console.log(`   Messages with attachments: ${summaries.filter(s => s.has_attachments).length}`);
  console.log(`   Messages with embeds: ${summaries.filter(s => s.has_embeds).length}`);
  
  console.log('\n✨ Processing complete!');
  process.exit(0);
}

processExport().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});


