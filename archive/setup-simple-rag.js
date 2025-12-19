const fs = require('fs');

/**
 * SIMPLE LOCAL RAG SETUP - No ChromaDB needed!
 * 
 * Stores embeddings in a simple JSON file for fast semantic search
 */

// Configuration
const EXPORT_FILE = './discord-exports/Arduino_generalhelp_Jan2025_export.json';
const OUTPUT_FILE = './vector-db/arduino_embeddings.json';
const OLLAMA_URL = 'http://localhost:11434';

console.log('🚀 SIMPLE LOCAL RAG SETUP - Arduino Server\n');
console.log('='.repeat(70));

// Helper: Generate embedding using Ollama
async function generateEmbedding(text) {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nomic-embed-text',
                prompt: text
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.embedding;
    } catch (error) {
        return null;
    }
}

// Helper: Chunk long messages
function chunkMessage(message, maxLength = 500) {
    const text = message.content || '';
    if (text.length <= maxLength) {
        return [{
            text: text,
            metadata: {
                id: message.id,
                author: message.author?.name || 'Unknown',
                timestamp: message.timestamp,
                channel: 'Arduino_generalhelp'
            }
        }];
    }
    
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLength) {
        chunks.push({
            text: text.slice(i, i + maxLength),
            metadata: {
                id: `${message.id}_chunk${chunks.length}`,
                author: message.author?.name || 'Unknown',
                timestamp: message.timestamp,
                channel: 'Arduino_generalhelp',
                isChunk: true
            }
        });
    }
    return chunks;
}

async function setupRAG() {
    try {
        // 1. Load Discord export
        console.log('\n📖 Step 1: Loading Discord export...');
        const exportData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
        const messages = exportData.messages || [];
        console.log(`  ✅ Loaded ${messages.length} messages`);
        
        // 2. Process ALL messages (no filtering - semantic only!)
        console.log('\n🔍 Step 2: Processing ALL messages (semantic-only, no filtering)...');
        const relevantMessages = messages.filter(msg => {
            return msg.content && msg.content.trim().length >= 20;
        });
        console.log(`  ✅ Processing all ${relevantMessages.length} messages`);
        
        // 3. Chunk messages
        console.log('\n✂️  Step 3: Chunking messages...');
        const allChunks = [];
        for (const msg of relevantMessages) {
            const chunks = chunkMessage(msg);
            allChunks.push(...chunks);
        }
        console.log(`  ✅ Created ${allChunks.length} chunks`);
        
        // 4. Generate embeddings and store
        console.log('\n🧠 Step 4: Generating embeddings...');
        
        // Check for existing progress
        const dir = './vector-db';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        let processed = 0;
        let successful = 0;
        let failed = 0;
        let fileCount = 0;
        let currentBatch = [];
        
        // Resume from existing files
        const existingFiles = fs.readdirSync(dir).filter(f => f.startsWith('arduino_embeddings_part'));
        if (existingFiles.length > 0) {
            fileCount = existingFiles.length;
            processed = fileCount * 5000;
            successful = processed;
            console.log(`  🔄 RESUMING from ${processed} chunks (${fileCount} files already saved)`);
        }
        
        console.log(`  ⏳ Processing ${allChunks.length - processed} remaining chunks (estimated time: ${Math.ceil((allChunks.length - processed)/50/60)} minutes)`);
        console.log('  💡 Processing in batches of 100...\n');
        
        const BATCH_SIZE = 100;
        const SAVE_EVERY = 5000;  // Save every 5000 embeddings to separate file
        const startTime = Date.now();
        
        for (let i = processed; i < allChunks.length; i += BATCH_SIZE) {
            const batch = allChunks.slice(i, Math.min(i + BATCH_SIZE, allChunks.length));
            
            for (const chunk of batch) {
                const embedding = await generateEmbedding(chunk.text);
                
                if (embedding) {
                    currentBatch.push({
                        id: chunk.metadata.id,
                        text: chunk.text,
                        embedding: embedding,
                        metadata: chunk.metadata
                    });
                    successful++;
                } else {
                    failed++;
                }
                
                processed++;
                
                // Save to file every SAVE_EVERY embeddings
                if (currentBatch.length >= SAVE_EVERY) {
                    const partFile = OUTPUT_FILE.replace('.json', `_part${fileCount}.json`);
                    fs.writeFileSync(partFile, JSON.stringify(currentBatch, null, 2));
                    currentBatch = [];
                    fileCount++;
                }
                
                // Progress update
                const progress = ((processed / allChunks.length) * 100).toFixed(1);
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const rate = processed / elapsed;
                const remaining = Math.ceil((allChunks.length - processed) / rate);
                
                process.stdout.write(`\r  📊 Progress: ${progress}% (${processed}/${allChunks.length}) | ✅ ${successful} | ❌ ${failed} | 💾 ${fileCount} files | ⏱️  ${remaining}s remaining`);
            }
        }
        
        // Save remaining embeddings
        if (currentBatch.length > 0) {
            const partFile = OUTPUT_FILE.replace('.json', `_part${fileCount}.json`);
            fs.writeFileSync(partFile, JSON.stringify(currentBatch, null, 2));
            fileCount++;
        }
        
        console.log('\n\n💾 Step 5: Saving metadata...');
        
        // Save metadata file
        const metadataFile = OUTPUT_FILE.replace('.json', '_metadata.json');
        fs.writeFileSync(metadataFile, JSON.stringify({
            source: EXPORT_FILE,
            created: new Date().toISOString(),
            totalMessages: messages.length,
            processedMessages: relevantMessages.length,
            totalChunks: allChunks.length,
            successfulEmbeddings: successful,
            failedEmbeddings: failed,
            totalFiles: fileCount,
            embeddingsPerFile: SAVE_EVERY
        }, null, 2));
        
        console.log(`  ✅ Saved ${fileCount} embedding files`);
        console.log(`  ✅ Saved metadata to: ${metadataFile}`);
        
        console.log('\n✅ RAG SETUP COMPLETE!\n');
        console.log('='.repeat(70));
        console.log(`📊 STATISTICS:`);
        console.log(`  - Total messages: ${messages.length}`);
        console.log(`  - Processed messages: ${relevantMessages.length}`);
        console.log(`  - Total chunks: ${allChunks.length}`);
        console.log(`  - Successfully embedded: ${successful}`);
        console.log(`  - Failed: ${failed}`);
        console.log(`  - Output files: ${fileCount} part files + metadata`);
        console.log(`\n🎯 NEXT STEP: Run 'node query-simple-rag.js "your search query"'`);
        console.log('='.repeat(70));
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    }
}

// Check if Ollama is running
async function checkOllama() {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!response.ok) throw new Error('Ollama not responding');
        console.log('✅ Ollama is running');
        return true;
    } catch (error) {
        console.error('❌ ERROR: Ollama is not running!');
        console.error('   Please start Ollama first.');
        return false;
    }
}

// Main execution
(async () => {
    console.log('\n🔍 Checking prerequisites...\n');
    
    if (await checkOllama()) {
        console.log('✅ All prerequisites met!\n');
        await setupRAG();
    }
})();

