const fs = require('fs');

// Get channel name from command line
const channelName = process.argv[2];
if (!channelName) {
    console.error('Usage: node process-channel.js <channel_name>');
    process.exit(1);
}

const EXPORT_FILE = `./discord-exports/${channelName}_Jan2025_export.json`;
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

console.log(`\n🚀 PROCESSING: ${channelName}`);
console.log('='.repeat(70));

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
        return null;
    }
}

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
        console.log('\n📖 Loading export...');
        const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
        const messages = data.messages || [];
        console.log(`  ✅ ${messages.length} messages\n`);
        
        console.log('✂️  Chunking...');
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
        console.log(`  ✅ ${chunks.length} chunks\n`);
        
        console.log('🧠 Query embedding...');
        const queryEmbedding = await generateEmbedding(CYBER_QUERY);
        if (!queryEmbedding) throw new Error('Failed to generate query embedding');
        console.log('  ✅ Ready\n');
        
        console.log(`🔍 Processing ${chunks.length} chunks...`);
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
            
            if ((i + 1) % 50 === 0 || i === chunks.length - 1) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const rate = (i + 1) / elapsed;
                const remaining = Math.ceil((chunks.length - i - 1) / rate);
                process.stdout.write(`\r  ${i + 1}/${chunks.length} (${((i + 1) / chunks.length * 100).toFixed(0)}%) | Found: ${relevantMessages.length} | ${remaining}s left  `);
            }
        }
        
        console.log(`\n  ✅ Found ${relevantMessages.length} relevant\n`);
        
        console.log('💾 Saving...');
        const outputFile = `${channelName}_filtered_messages.json`;
        const outputTxt = `${channelName}_filtered_messages.txt`;
        
        fs.writeFileSync(outputFile, JSON.stringify({
            query: CYBER_QUERY.trim(),
            threshold: SIMILARITY_THRESHOLD,
            source: EXPORT_FILE,
            totalMessages: messages.length,
            totalChunks: chunks.length,
            relevantMessages: relevantMessages.length,
            results: relevantMessages
        }, null, 2));
        
        const readable = relevantMessages.map((r, i) => {
            const date = new Date(r.metadata.timestamp).toLocaleDateString();
            return `[${i + 1}] Similarity: ${r.similarity.toFixed(3)} | ${r.metadata.author} | ${date}\n${r.text}\n${'='.repeat(70)}`;
        }).join('\n\n');
        fs.writeFileSync(outputTxt, readable);
        
        console.log(`  ✅ ${outputFile}`);
        console.log(`  ✅ ${outputTxt}\n`);
        
        console.log(`📊 ${messages.length} messages → ${relevantMessages.length} relevant (${(relevantMessages.length / chunks.length * 100).toFixed(2)}%)`);
        console.log('='.repeat(70));
        console.log('✅ DONE!\n');
        
    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}\n`);
    }
}

processExport();




