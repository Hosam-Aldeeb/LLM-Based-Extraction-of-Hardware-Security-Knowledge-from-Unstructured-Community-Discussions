const fs = require('fs');
const http = require('http');

// Get channel name from command line
const channelName = process.argv[2];
if (!channelName) {
    console.error('Usage: node process-one-channel.js <channel_name>');
    process.exit(1);
}

const EXPORT_FILE = `./discord-exports/${channelName}_Jan2025_export.json`;
const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;

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
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'nomic-embed-text',
            prompt: text
        });

        const options = {
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/embeddings',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 30000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.embedding);
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
        
        req.write(postData);
        req.end();
    });
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
        console.log('\n📖 Step 1/5: Loading export...');
        if (!fs.existsSync(EXPORT_FILE)) {
            throw new Error(`File not found: ${EXPORT_FILE}`);
        }
        
        const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
        const messages = data.messages || [];
        console.log(`  ✅ Loaded ${messages.length} messages`);
        
        console.log('\n✂️  Step 2/5: Chunking messages...');
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
        console.log(`  ✅ Created ${chunks.length} chunks`);
        
        console.log('\n🧠 Step 3/5: Generating query embedding...');
        const queryEmbedding = await generateEmbedding(CYBER_QUERY);
        if (!queryEmbedding) throw new Error('Failed to generate query embedding - is Ollama running?');
        console.log('  ✅ Query embedding ready');
        
        console.log(`\n🔍 Step 4/5: Processing ${chunks.length} chunks for relevance...`);
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
            
            // Show progress every 10 chunks or at the end
            if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const rate = (i + 1) / (elapsed || 1);
                const remaining = Math.ceil((chunks.length - i - 1) / rate);
                process.stdout.write(`\r  Progress: ${i + 1}/${chunks.length} (${((i + 1) / chunks.length * 100).toFixed(0)}%) | Relevant: ${relevantMessages.length} | Est. ${remaining}s left     `);
            }
        }
        
        console.log(`\n  ✅ Found ${relevantMessages.length} relevant messages`);
        
        console.log('\n💾 Step 5/5: Saving results...');
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
        
        console.log(`  ✅ Saved ${outputFile}`);
        console.log(`  ✅ Saved ${outputTxt}`);
        
        console.log('\n' + '='.repeat(70));
        console.log(`📊 SUMMARY: ${messages.length} messages → ${relevantMessages.length} relevant (${(relevantMessages.length / chunks.length * 100).toFixed(2)}%)`);
        console.log('='.repeat(70));
        console.log('✅ CHANNEL COMPLETE!\n');
        
    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}\n`);
        process.exit(1);
    }
}

processExport();


