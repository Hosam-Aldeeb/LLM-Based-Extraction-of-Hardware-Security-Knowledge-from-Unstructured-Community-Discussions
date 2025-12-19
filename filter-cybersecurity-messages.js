const fs = require('fs');

/**
 * FILTER ALL CYBERSECURITY/HARDWARE HACKING MESSAGES
 * Uses semantic search to find ALL relevant messages above a threshold
 */

const EMBEDDINGS_DIR = './vector-db';
const EMBEDDINGS_PREFIX = 'arduino_embeddings_part';
const OLLAMA_URL = 'http://localhost:11434';
const OUTPUT_FILE = 'cybersecurity_filtered_messages.json';

// Similarity threshold (0.5 = moderately relevant, 0.6 = highly relevant)
const SIMILARITY_THRESHOLD = 0.55;

// Broad cybersecurity/hardware hacking query
const QUERY = `
cybersecurity hardware hacking vulnerabilities exploits 
JTAG UART SPI I2C firmware reverse engineering 
debugging bootloader flash memory encryption 
security vulnerabilities penetration testing 
exploit development buffer overflow 
hardware security embedded systems IoT security
`;

console.log('🔍 FILTERING CYBERSECURITY/HARDWARE HACKING MESSAGES\n');
console.log('='.repeat(70));

// Helper: Generate embedding for query
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
        console.error(`❌ Embedding error: ${error.message}`);
        return null;
    }
}

// Helper: Calculate cosine similarity
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function filterMessages() {
    try {
        // 1. Load all embeddings
        console.log('📖 Loading embeddings database...');
        const files = fs.readdirSync(EMBEDDINGS_DIR)
            .filter(f => f.startsWith(EMBEDDINGS_PREFIX) && f.endsWith('.json'))
            .sort();
        
        let allEmbeddings = [];
        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(`${EMBEDDINGS_DIR}/${file}`, 'utf8'));
            allEmbeddings = allEmbeddings.concat(data);
        }
        console.log(`  ✅ Loaded ${allEmbeddings.length} embeddings from ${files.length} files\n`);
        
        // 2. Generate query embedding
        console.log('🧠 Generating query embedding for cybersecurity topics...');
        const queryEmbedding = await generateEmbedding(QUERY);
        
        if (!queryEmbedding) {
            throw new Error('Failed to generate query embedding');
        }
        console.log('  ✅ Query embedding generated\n');
        
        // 3. Calculate similarities for ALL messages
        console.log(`🔍 Calculating similarity for ${allEmbeddings.length} messages...`);
        const results = allEmbeddings.map((item, index) => {
            if (index % 5000 === 0) {
                process.stdout.write(`\r  Progress: ${index}/${allEmbeddings.length}`);
            }
            return {
                text: item.text,
                metadata: item.metadata,
                similarity: cosineSimilarity(queryEmbedding, item.embedding)
            };
        });
        console.log(`\r  ✅ Processed ${allEmbeddings.length} messages\n`);
        
        // 4. Filter by threshold
        console.log(`🎯 Filtering messages with similarity >= ${SIMILARITY_THRESHOLD}...`);
        const relevantMessages = results.filter(r => r.similarity >= SIMILARITY_THRESHOLD);
        relevantMessages.sort((a, b) => b.similarity - a.similarity);
        
        console.log(`  ✅ Found ${relevantMessages.length} relevant messages\n`);
        
        // 5. Save results
        console.log('💾 Saving filtered messages...');
        
        // Save full results (with similarity scores)
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
            query: QUERY.trim(),
            threshold: SIMILARITY_THRESHOLD,
            totalMessages: allEmbeddings.length,
            relevantMessages: relevantMessages.length,
            results: relevantMessages
        }, null, 2));
        
        // Save human-readable version
        const readableOutput = relevantMessages.map((r, i) => {
            const date = new Date(r.metadata.timestamp).toLocaleDateString();
            return `[${i + 1}] Similarity: ${r.similarity.toFixed(3)} | ${r.metadata.author} | ${date}\n${r.text}\n${'='.repeat(70)}`;
        }).join('\n\n');
        
        fs.writeFileSync('cybersecurity_filtered_messages.txt', readableOutput);
        
        console.log(`  ✅ Saved to: ${OUTPUT_FILE}`);
        console.log(`  ✅ Saved readable version to: cybersecurity_filtered_messages.txt`);
        
        // 6. Statistics
        console.log('\n' + '='.repeat(70));
        console.log('📊 STATISTICS:');
        console.log(`  - Total messages analyzed: ${allEmbeddings.length}`);
        console.log(`  - Relevant messages found: ${relevantMessages.length}`);
        console.log(`  - Percentage relevant: ${((relevantMessages.length / allEmbeddings.length) * 100).toFixed(2)}%`);
        console.log(`  - Similarity threshold: ${SIMILARITY_THRESHOLD}`);
        console.log(`  - Top similarity score: ${relevantMessages[0]?.similarity.toFixed(3) || 'N/A'}`);
        console.log(`  - Lowest similarity score: ${relevantMessages[relevantMessages.length - 1]?.similarity.toFixed(3) || 'N/A'}`);
        console.log('='.repeat(70));
        
        console.log('\n✅ FILTERING COMPLETE!\n');
        console.log('🎯 Next steps:');
        console.log('  1. Review: cybersecurity_filtered_messages.txt');
        console.log('  2. Analyze: cybersecurity_filtered_messages.json');
        console.log('  3. Adjust threshold if needed and re-run');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    }
}

filterMessages();




