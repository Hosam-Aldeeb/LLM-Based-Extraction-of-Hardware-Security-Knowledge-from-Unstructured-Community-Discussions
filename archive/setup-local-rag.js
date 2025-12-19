const fs = require('fs');
const { ChromaClient } = require('chromadb');

/**
 * LOCAL RAG SETUP - Process Discord Export into Vector Database
 * 
 * This script:
 * 1. Loads Discord export JSON
 * 2. Chunks messages into smaller pieces
 * 3. Generates embeddings using Ollama
 * 4. Stores in ChromaDB (local vector database)
 */

// Configuration
const EXPORT_FILE = './discord-exports/Arduino_generalhelp_Jan2025_export.json';
const COLLECTION_NAME = 'arduino_messages';
const OLLAMA_URL = 'http://localhost:11434';

// OPTION: Set to false to process ALL messages (no keyword filtering)
// true = faster (3-5 min), might miss some messages
// false = slower (15-20 min), processes everything
const USE_KEYWORD_FILTER = false;  // SEMANTIC ONLY - Process everything!

console.log('🚀 LOCAL RAG SETUP - Arduino Server Test\n');
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
        console.error(`  ❌ Embedding error: ${error.message}`);
        return null;
    }
}

// Helper: Check if message is relevant to hardware hacking/cybersecurity
function isRelevantToResearch(text) {
    const lowerText = text.toLowerCase();
    
    // Expanded keyword list for better coverage
    const keywords = [
        // Direct security terms
        'hack', 'exploit', 'vulnerability', 'vulnerabilities', 'security', 'attack', 'breach',
        'malicious', 'unauthorized', 'insecure', 'exposed', 'leak', 'compromise',
        
        // Hardware interfaces & debugging
        'jtag', 'uart', 'spi', 'i2c', 'usb', 'serial', 'debug', 'debugger',
        'test mode', 'test point', 'debug port', 'debug interface',
        
        // Firmware & software
        'firmware', 'bootloader', 'bios', 'rom', 'flash', 'eeprom',
        'binary', 'hex file', 'upload', 'program', 'reflash',
        
        // Reverse engineering
        'extract', 'dump', 'read out', 'reverse', 'disassemble', 'decompile',
        'bypass', 'crack', 'unlock', 'jailbreak', 'root',
        
        // Attack techniques
        'glitch', 'glitching', 'fault injection', 'power analysis', 'timing attack',
        'side channel', 'buffer overflow', 'injection', 'fuzzing',
        
        // Malware & threats
        'backdoor', 'trojan', 'malware', 'rootkit', 'virus', 'worm',
        'privilege', 'escalation', 'arbitrary code',
        
        // Cryptography & authentication
        'encryption', 'decrypt', 'cipher', 'key', 'password', 'credential',
        'authentication', 'authorization', 'access control', 'permission',
        'certificate', 'signature', 'verify', 'validation',
        
        // Security features
        'secure boot', 'trusted', 'chain of trust', 'attestation',
        'sandbox', 'isolation', 'protection', 'hardening',
        
        // Security domains
        'hardware security', 'embedded security', 'iot security', 'device security',
        'physical security', 'supply chain',
        
        // Hardware components
        'chip', 'microcontroller', 'mcu', 'processor', 'cpu', 'fpga', 'asic',
        'soc', 'pcb', 'circuit', 'board', 'component',
        
        // Tools
        'oscilloscope', 'logic analyzer', 'multimeter', 'bus pirate', 'flipper',
        'programmer', 'probe', 'adapter', 'dongle',
        
        // Risk & threat terms
        'risk', 'threat', 'danger', 'unsafe', 'warning', 'caution',
        'cve', 'zero day', 'zero-day', 'disclosure', 'advisory',
        
        // Mitigation & fixes
        'mitigation', 'patch', 'fix', 'update', 'secure', 'harden',
        'protect', 'defend', 'prevent', 'block',
        
        // Production & manufacturing concerns
        'production', 'manufacturing', 'factory', 'default', 'shipped',
        'enabled by default', 'test mode', 'development mode',
        
        // Memory & storage
        'memory', 'ram', 'flash', 'storage', 'read', 'write', 'erase',
        
        // Communication & protocols
        'protocol', 'communication', 'interface', 'bus', 'channel',
        'transmit', 'receive', 'sniff', 'intercept', 'monitor'
    ];
    
    // Check if message contains any relevant keywords
    return keywords.some(keyword => lowerText.includes(keyword));
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
    
    // Split long messages into chunks
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
        
        // 2. Filter for hardware hacking/cybersecurity topics (optional)
        let relevantMessages;
        if (USE_KEYWORD_FILTER) {
            console.log('\n🔍 Step 2: Filtering for hardware hacking & cybersecurity topics...');
            console.log('  💡 Using keyword filter (faster, might miss some messages)');
            relevantMessages = messages.filter(msg => {
                if (!msg.content || msg.content.trim().length < 20) return false;
                return isRelevantToResearch(msg.content);
            });
            console.log(`  ✅ Found ${relevantMessages.length} relevant messages (${((relevantMessages.length/messages.length)*100).toFixed(1)}% of total)`);
        } else {
            console.log('\n🔍 Step 2: Processing ALL messages (no filtering)...');
            console.log('  💡 This will take longer but ensures nothing is missed');
            relevantMessages = messages.filter(msg => {
                return msg.content && msg.content.trim().length >= 20;
            });
            console.log(`  ✅ Processing all ${relevantMessages.length} messages`);
        }
        
        // 3. Chunk relevant messages
        console.log('\n✂️  Step 3: Chunking relevant messages...');
        const allChunks = [];
        for (const msg of relevantMessages) {
            const chunks = chunkMessage(msg);
            allChunks.push(...chunks);
        }
        console.log(`  ✅ Created ${allChunks.length} chunks from ${relevantMessages.length} relevant messages`);
        
        // 4. Initialize ChromaDB (embedded mode - no server needed)
        console.log('\n🗄️  Step 4: Initializing ChromaDB...');
        const client = new ChromaClient({
            path: "./chroma_db"  // Local storage directory
        });
        
        // Delete collection if it exists (fresh start)
        try {
            await client.deleteCollection({ name: COLLECTION_NAME });
            console.log('  ℹ️  Deleted existing collection');
        } catch (e) {
            // Collection doesn't exist, that's fine
        }
        
        // Create collection without default embedding function (we'll provide our own)
        const collection = await client.getOrCreateCollection({
            name: COLLECTION_NAME,
            metadata: { description: 'Arduino Discord messages for hardware security research' },
            embeddingFunction: undefined  // We provide embeddings manually
        });
        console.log(`  ✅ Created collection: ${COLLECTION_NAME}`);
        
        // 5. Generate embeddings and store (in batches)
        console.log('\n🧠 Step 5: Generating embeddings and storing in vector DB...');
        console.log(`  ⏳ Processing ${allChunks.length} relevant chunks (estimated time: ${Math.ceil(allChunks.length/50/60)} minutes)`);
        console.log('  💡 Processing in batches of 100...\n');
        
        const BATCH_SIZE = 100;
        let processed = 0;
        let successful = 0;
        let failed = 0;
        
        for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
            const batch = allChunks.slice(i, i + BATCH_SIZE);
            const batchIds = [];
            const batchEmbeddings = [];
            const batchDocuments = [];
            const batchMetadatas = [];
            
            // Generate embeddings for batch
            for (const chunk of batch) {
                const embedding = await generateEmbedding(chunk.text);
                
                if (embedding) {
                    batchIds.push(chunk.metadata.id);
                    batchEmbeddings.push(embedding);
                    batchDocuments.push(chunk.text);
                    batchMetadatas.push(chunk.metadata);
                    successful++;
                } else {
                    failed++;
                }
                
                processed++;
            }
            
            // Add batch to ChromaDB
            if (batchIds.length > 0) {
                await collection.add({
                    ids: batchIds,
                    embeddings: batchEmbeddings,
                    documents: batchDocuments,
                    metadatas: batchMetadatas
                });
            }
            
            // Progress update
            const progress = ((processed / allChunks.length) * 100).toFixed(1);
            process.stdout.write(`\r  📊 Progress: ${progress}% (${processed}/${allChunks.length}) | ✅ ${successful} | ❌ ${failed}`);
        }
        
        console.log('\n\n✅ RAG SETUP COMPLETE!\n');
        console.log('='.repeat(70));
        console.log(`📊 STATISTICS:`);
        console.log(`  - Total messages: ${messages.length}`);
        console.log(`  - Total chunks: ${allChunks.length}`);
        console.log(`  - Successfully embedded: ${successful}`);
        console.log(`  - Failed: ${failed}`);
        console.log(`  - Collection name: ${COLLECTION_NAME}`);
        console.log(`\n🎯 NEXT STEP: Run 'node query-local-rag.js' to search your data!`);
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
        console.error('   Please start Ollama first:');
        console.error('   1. Open a new terminal');
        console.error('   2. Run: ollama serve');
        console.error('   3. Then run this script again');
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

