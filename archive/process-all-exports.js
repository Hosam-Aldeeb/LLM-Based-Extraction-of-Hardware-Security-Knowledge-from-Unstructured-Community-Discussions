const fs = require('fs');
const path = require('path');

/**
 * AUTOMATED PIPELINE - Process All Discord Exports
 * Runs the complete RAG pipeline for each export:
 * 1. Generate embeddings (Ollama)
 * 2. Filter for cybersecurity relevance
 * 3. Thread conversations
 * 4. Analyze with OpenAI
 */

const EXPORTS_DIR = './discord-exports';
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';
const OLLAMA_URL = 'http://localhost:11434';

// Cybersecurity/hardware hacking query
const CYBER_QUERY = `
cybersecurity hardware hacking vulnerabilities exploits 
JTAG UART SPI I2C firmware reverse engineering 
debugging bootloader flash memory encryption 
security vulnerabilities penetration testing 
exploit development buffer overflow 
hardware security embedded systems IoT security
`;

const SIMILARITY_THRESHOLD = 0.55;
const SKIP_EXPORTS = [
    'Arduino_generalhelp_Jan2025_export.json', // Already processed
    'ece722_Nov4-Nov11_export.json', // Not relevant
    'ece722_Oct7-25_export.json', // Not relevant
    'ece722_Oct7-Today_export.json' // Not relevant
];

console.log('\n🚀 AUTOMATED PIPELINE - PROCESS ALL DISCORD EXPORTS\n');
console.log('='.repeat(70));
console.log('⏳ Starting up... (this may take a moment)\n');

// Get all export files
function getExportFiles() {
    const files = fs.readdirSync(EXPORTS_DIR)
        .filter(f => f.endsWith('_export.json'))
        .filter(f => !SKIP_EXPORTS.includes(f));
    
    return files.map(f => ({
        filename: f,
        fullPath: path.join(EXPORTS_DIR, f),
        channelName: f.replace('_Jan2025_export.json', '').replace(/_/g, '_')
    }));
}

// Helper: Generate embedding
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
        
        if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
        const data = await response.json();
        return data.embedding;
    } catch (error) {
        console.error(`❌ Embedding error: ${error.message}`);
        return null;
    }
}

// Helper: Cosine similarity
function cosineSimilarity(a, b) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Step 1: Generate embeddings and filter
async function processEmbeddings(exportFile) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📁 Processing: ${exportFile.channelName}`);
    console.log(`${'='.repeat(70)}\n`);
    
    try {
        // Load export
        console.log('📖 Loading export...');
        const data = JSON.parse(fs.readFileSync(exportFile.fullPath, 'utf8'));
        const messages = data.messages || [];
        console.log(`  ✅ Loaded ${messages.length} messages\n`);
        
        if (messages.length === 0) {
            console.log('  ⚠️  No messages found, skipping...\n');
            return null;
        }
        
        // Chunk messages
        console.log('✂️  Chunking messages...');
        const chunks = [];
        messages.forEach(msg => {
            if (!msg.content || msg.content.trim().length === 0) return;
            
            const text = msg.content;
            const maxChunkSize = 500;
            
            if (text.length <= maxChunkSize) {
                chunks.push({
                    text: text,
                    metadata: {
                        id: msg.id,
                        author: msg.author.name,
                        timestamp: msg.timestamp,
                        channel: exportFile.channelName
                    }
                });
            } else {
                for (let i = 0; i < text.length; i += maxChunkSize) {
                    chunks.push({
                        text: text.substring(i, i + maxChunkSize),
                        metadata: {
                            id: msg.id,
                            author: msg.author.name,
                            timestamp: msg.timestamp,
                            channel: exportFile.channelName
                        }
                    });
                }
            }
        });
        console.log(`  ✅ Created ${chunks.length} chunks\n`);
        
        // Generate query embedding
        console.log('🧠 Generating query embedding...');
        const queryEmbedding = await generateEmbedding(CYBER_QUERY);
        if (!queryEmbedding) throw new Error('Failed to generate query embedding');
        console.log('  ✅ Query embedding ready\n');
        
        // Generate embeddings for chunks and filter
        console.log(`🔍 Processing ${chunks.length} chunks...`);
        const relevantMessages = [];
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await generateEmbedding(chunk.text);
            
            if (embedding) {
                const similarity = cosineSimilarity(queryEmbedding, embedding);
                
                if (similarity >= SIMILARITY_THRESHOLD) {
                    relevantMessages.push({
                        text: chunk.text,
                        metadata: chunk.metadata,
                        similarity: similarity
                    });
                }
            }
            
            if ((i + 1) % 100 === 0) {
                process.stdout.write(`\r  Progress: ${i + 1}/${chunks.length} | Found: ${relevantMessages.length}`);
            }
        }
        
        console.log(`\r  ✅ Processed ${chunks.length} chunks | Found ${relevantMessages.length} relevant\n`);
        
        if (relevantMessages.length === 0) {
            console.log('  ⚠️  No relevant messages found, skipping...\n');
            return null;
        }
        
        // Save filtered messages
        const outputFile = `${exportFile.channelName}_filtered_messages.json`;
        fs.writeFileSync(outputFile, JSON.stringify({
            query: CYBER_QUERY.trim(),
            threshold: SIMILARITY_THRESHOLD,
            totalChunks: chunks.length,
            relevantMessages: relevantMessages.length,
            results: relevantMessages
        }, null, 2));
        
        console.log(`  ✅ Saved to: ${outputFile}\n`);
        
        return {
            channelName: exportFile.channelName,
            totalMessages: messages.length,
            totalChunks: chunks.length,
            relevantMessages: relevantMessages.length,
            outputFile: outputFile
        };
        
    } catch (error) {
        console.error(`\n❌ ERROR processing ${exportFile.channelName}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('🔍 Checking Ollama connection...');
    try {
        const testResponse = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!testResponse.ok) throw new Error('Ollama not responding');
        console.log('  ✅ Ollama is running\n');
    } catch (error) {
        console.error('  ❌ Ollama is not running! Please start Ollama first.');
        process.exit(1);
    }
    
    const exportFiles = getExportFiles();
    
    console.log(`📊 Found ${exportFiles.length} exports to process\n`);
    console.log('Exports to process:');
    exportFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f.channelName}`));
    console.log('\n' + '='.repeat(70));
    console.log('🚀 STARTING PROCESSING...\n');
    
    const results = [];
    let processedCount = 0;
    
    for (const exportFile of exportFiles) {
        processedCount++;
        console.log(`\n🔄 Processing ${processedCount}/${exportFiles.length}: ${exportFile.channelName}`);
        
        const result = await processEmbeddings(exportFile);
        if (result) {
            results.push(result);
            console.log(`✅ Success! Found ${result.relevantMessages} relevant messages\n`);
        } else {
            console.log(`⚠️  Skipped (no relevant messages or error)\n`);
        }
        
        // Show running total
        const totalRelevant = results.reduce((sum, r) => sum + r.relevantMessages, 0);
        console.log(`📊 Running total: ${results.length} channels processed, ${totalRelevant} relevant messages found`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 PROCESSING SUMMARY\n');
    console.log(`  Total exports processed: ${results.length}/${exportFiles.length}`);
    console.log(`  Total relevant messages found: ${results.reduce((sum, r) => sum + r.relevantMessages, 0)}`);
    console.log('='.repeat(70));
    
    console.log('\n✅ Step 1 complete! Next: Thread conversations and analyze with OpenAI\n');
    
    // Save summary
    fs.writeFileSync('processing_summary.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        processed: results,
        skipped: exportFiles.length - results.length
    }, null, 2));
}

main();

