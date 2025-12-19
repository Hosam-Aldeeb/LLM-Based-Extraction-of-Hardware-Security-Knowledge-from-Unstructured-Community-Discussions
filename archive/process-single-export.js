const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Process a single Discord export through the full pipeline
 * Usage: node process-single-export.js <export_filename>
 */

const OLLAMA_URL = 'http://localhost:11434';
const CYBER_QUERY = `
cybersecurity hardware hacking vulnerabilities exploits 
JTAG UART SPI I2C firmware reverse engineering 
debugging bootloader flash memory encryption 
security vulnerabilities penetration testing 
exploit development buffer overflow 
hardware security embedded systems IoT security
`;
const SIMILARITY_THRESHOLD = 0.55;

// Get export filename from command line
const exportFilename = process.argv[2];

if (!exportFilename) {
    console.error('❌ Usage: node process-single-export.js <export_filename>');
    console.error('   Example: node process-single-export.js Defcon_hw-hacks_Jan2025_export.json');
    process.exit(1);
}

const exportPath = `./discord-exports/${exportFilename}`;
const channelName = exportFilename.replace('_Jan2025_export.json', '').replace(/_/g, '_');

console.log('\n' + '='.repeat(70));
console.log(`🔄 PROCESSING: ${channelName}`);
console.log('='.repeat(70) + '\n');

// Helper: Call Ollama API using curl
async function generateEmbedding(text) {
    try {
        const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 2000);
        const cmd = `curl -s -X POST ${OLLAMA_URL}/api/embeddings -H "Content-Type: application/json" -d "{\\"model\\":\\"nomic-embed-text\\",\\"prompt\\":\\"${escapedText}\\"}"`;
        
        const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
        const data = JSON.parse(stdout);
        return data.embedding;
    } catch (error) {
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

async function processExport() {
    try {
        // 1. Load export
        console.log('📖 Step 1: Loading export...');
        if (!fs.existsSync(exportPath)) {
            throw new Error(`File not found: ${exportPath}`);
        }
        
        const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        const messages = data.messages || [];
        console.log(`   ✅ Loaded ${messages.length} messages\n`);
        
        if (messages.length === 0) {
            console.log('   ⚠️  No messages found, skipping...\n');
            return;
        }
        
        // 2. Chunk messages
        console.log('✂️  Step 2: Chunking messages...');
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
                        channel: channelName
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
                            channel: channelName
                        }
                    });
                }
            }
        });
        console.log(`   ✅ Created ${chunks.length} chunks\n`);
        
        // 3. Generate query embedding
        console.log('🧠 Step 3: Generating query embedding...');
        const queryEmbedding = await generateEmbedding(CYBER_QUERY);
        if (!queryEmbedding) throw new Error('Failed to generate query embedding');
        console.log('   ✅ Query embedding ready\n');
        
        // 4. Process chunks and filter
        console.log(`🔍 Step 4: Processing ${chunks.length} chunks for relevance...`);
        console.log(`   Threshold: ${SIMILARITY_THRESHOLD}\n`);
        
        const relevantMessages = [];
        const startTime = Date.now();
        
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
            
            // Progress update every 50 chunks
            if ((i + 1) % 50 === 0 || i === chunks.length - 1) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const rate = (i + 1) / elapsed;
                const remaining = Math.ceil((chunks.length - i - 1) / rate);
                process.stdout.write(`\r   Progress: ${i + 1}/${chunks.length} (${((i + 1) / chunks.length * 100).toFixed(1)}%) | Found: ${relevantMessages.length} | ETA: ${remaining}s    `);
            }
        }
        
        console.log(`\n   ✅ Processed ${chunks.length} chunks | Found ${relevantMessages.length} relevant\n`);
        
        if (relevantMessages.length === 0) {
            console.log('   ⚠️  No relevant messages found, skipping...\n');
            return;
        }
        
        // 5. Save results
        console.log('💾 Step 5: Saving results...');
        const outputFile = `${channelName}_filtered_messages.json`;
        const outputTxt = `${channelName}_filtered_messages.txt`;
        
        // Save JSON
        fs.writeFileSync(outputFile, JSON.stringify({
            query: CYBER_QUERY.trim(),
            threshold: SIMILARITY_THRESHOLD,
            source: exportFilename,
            totalMessages: messages.length,
            totalChunks: chunks.length,
            relevantMessages: relevantMessages.length,
            results: relevantMessages
        }, null, 2));
        
        // Save readable version
        const readable = relevantMessages.map((r, i) => {
            const date = new Date(r.metadata.timestamp).toLocaleDateString();
            return `[${i + 1}] Similarity: ${r.similarity.toFixed(3)} | ${r.metadata.author} | ${date}\n${r.text}\n${'='.repeat(70)}`;
        }).join('\n\n');
        fs.writeFileSync(outputTxt, readable);
        
        console.log(`   ✅ Saved JSON: ${outputFile}`);
        console.log(`   ✅ Saved TXT: ${outputTxt}\n`);
        
        // Summary
        console.log('='.repeat(70));
        console.log('📊 SUMMARY:\n');
        console.log(`   Channel: ${channelName}`);
        console.log(`   Total messages: ${messages.length}`);
        console.log(`   Total chunks: ${chunks.length}`);
        console.log(`   Relevant messages: ${relevantMessages.length} (${(relevantMessages.length / chunks.length * 100).toFixed(2)}%)`);
        console.log('='.repeat(70));
        console.log('\n✅ COMPLETE!\n');
        
    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}\n`);
        process.exit(1);
    }
}

processExport();




