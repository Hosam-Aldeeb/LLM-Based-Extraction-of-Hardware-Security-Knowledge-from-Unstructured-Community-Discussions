const fs = require('fs');
const path = require('path');

/**
 * RAG System Builder for Hardware Hacking Research
 * 
 * This script:
 * 1. Reads 3 Discord export JSON files
 * 2. Chunks messages into smaller pieces
 * 3. Generates embeddings using Ollama (nomic-embed-text)
 * 4. Stores in Chroma vector database
 * 5. Enables semantic search for vulnerabilities and techniques
 */

console.log('🚀 Building RAG System for Hardware Hacking Research\n');
console.log('=' .repeat(70));

// Configuration
const EXPORTS_DIR = './discord-exports';
const VECTOR_DB_DIR = './vector-db';
const CHANNELS = [
  'Defcon_hw-hacks_Jan2025_export.json',
  'Adafruit_helpwithhwdesign_Jan2025_export.json',
  'STM32World_hardware_Jan2025_export.json'
];

// Step 1: Check if files exist
console.log('\n📂 Step 1: Checking export files...');
let allFilesExist = true;
for (const channel of CHANNELS) {
  const filePath = path.join(EXPORTS_DIR, channel);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${channel} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.log(`  ❌ ${channel} - NOT FOUND`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('\n❌ Error: Some export files are missing!');
  process.exit(1);
}

// Step 2: Read and parse JSON files
console.log('\n📖 Step 2: Reading export files...');
const allMessages = [];
let totalMessages = 0;

for (const channel of CHANNELS) {
  const filePath = path.join(EXPORTS_DIR, channel);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const messages = data.messages || [];
    
    // Add metadata to each message
    messages.forEach(msg => {
      if (msg.content && msg.content.trim().length > 0) {
        allMessages.push({
          content: msg.content,
          author: msg.author?.name || 'Unknown',
          timestamp: msg.timestamp,
          channel: channel.replace('_Jan2025_export.json', ''),
          id: msg.id
        });
      }
    });
    
    totalMessages += messages.length;
    console.log(`  ✅ ${channel}: ${messages.length} messages`);
  } catch (error) {
    console.error(`  ❌ Error reading ${channel}:`, error.message);
  }
}

console.log(`\n📊 Total messages collected: ${allMessages.length} (with content)`);

// Step 3: Chunk messages (group small messages, split large ones)
console.log('\n✂️  Step 3: Chunking messages...');
const chunks = [];
const CHUNK_SIZE = 1000; // characters
const OVERLAP = 200; // characters

for (const msg of allMessages) {
  const content = msg.content;
  
  if (content.length <= CHUNK_SIZE) {
    // Small message - keep as is
    chunks.push({
      text: content,
      metadata: {
        author: msg.author,
        timestamp: msg.timestamp,
        channel: msg.channel,
        messageId: msg.id
      }
    });
  } else {
    // Large message - split into chunks with overlap
    for (let i = 0; i < content.length; i += CHUNK_SIZE - OVERLAP) {
      const chunkText = content.slice(i, i + CHUNK_SIZE);
      chunks.push({
        text: chunkText,
        metadata: {
          author: msg.author,
          timestamp: msg.timestamp,
          channel: msg.channel,
          messageId: msg.id,
          chunkIndex: Math.floor(i / (CHUNK_SIZE - OVERLAP))
        }
      });
    }
  }
}

console.log(`  ✅ Created ${chunks.length} chunks`);

// Step 4: Save chunks to JSON for embedding
console.log('\n💾 Step 4: Saving chunks...');
const chunksPath = path.join(VECTOR_DB_DIR);
if (!fs.existsSync(chunksPath)) {
  fs.mkdirSync(chunksPath, { recursive: true });
}

const chunksFile = path.join(chunksPath, 'chunks.json');
fs.writeFileSync(chunksFile, JSON.stringify(chunks, null, 2));
console.log(`  ✅ Saved to: ${chunksFile}`);

// Step 5: Instructions for next steps
console.log('\n' + '='.repeat(70));
console.log('✅ RAG System Data Preparation Complete!\n');
console.log('📊 Summary:');
console.log(`  - Channels processed: ${CHANNELS.length}`);
console.log(`  - Total messages: ${allMessages.length}`);
console.log(`  - Total chunks: ${chunks.length}`);
console.log(`  - Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length)} chars`);

console.log('\n🔄 Next Steps:');
console.log('  1. Run: node generate-embeddings.js (to create embeddings with Ollama)');
console.log('  2. Run: node query-rag.js (to query for vulnerabilities & techniques)');
console.log('\n📁 Output files ready in: ./vector-db/');



