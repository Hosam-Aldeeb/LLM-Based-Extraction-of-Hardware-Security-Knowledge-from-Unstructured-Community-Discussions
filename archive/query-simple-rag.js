const fs = require('fs');

/**
 * QUERY SIMPLE RAG - Search your embeddings
 */

// Configuration
const EMBEDDINGS_DIR = './vector-db';
const EMBEDDINGS_PREFIX = 'arduino_embeddings_part';
const METADATA_FILE = './vector-db/arduino_embeddings_metadata.json';
const OLLAMA_URL = 'http://localhost:11434';

console.log('🔍 SIMPLE RAG QUERY SYSTEM\n');
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

async function queryRAG(queryText, nResults = 20) {
    try {
        console.log(`\n🔎 Query: "${queryText}"\n`);
        
        // 1. Load embeddings from all part files
        console.log('📖 Loading embeddings database...');
        const files = fs.readdirSync(EMBEDDINGS_DIR)
            .filter(f => f.startsWith(EMBEDDINGS_PREFIX) && f.endsWith('.json'))
            .sort();
        
        let embeddings = [];
        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(`${EMBEDDINGS_DIR}/${file}`, 'utf8'));
            embeddings = embeddings.concat(data);
        }
        console.log(`  ✅ Loaded ${embeddings.length} embeddings from ${files.length} files`);
        
        // 2. Generate embedding for query
        console.log('🧠 Generating query embedding...');
        const queryEmbedding = await generateEmbedding(queryText);
        
        if (!queryEmbedding) {
            throw new Error('Failed to generate query embedding');
        }
        
        // 3. Calculate similarities
        console.log(`🔍 Searching ${embeddings.length} chunks...\n`);
        const results = embeddings.map(item => ({
            ...item,
            similarity: cosineSimilarity(queryEmbedding, item.embedding)
        }));
        
        // 4. Sort by similarity and get top N
        results.sort((a, b) => b.similarity - a.similarity);
        const topResults = results.slice(0, nResults);
        
        // 5. Display results
        console.log('='.repeat(70));
        console.log(`📊 FOUND ${topResults.length} MOST RELEVANT MESSAGES\n`);
        
        for (let i = 0; i < topResults.length; i++) {
            const result = topResults[i];
            const date = new Date(result.metadata.timestamp).toLocaleDateString();
            
            console.log(`[Result ${i + 1}] Similarity: ${result.similarity.toFixed(3)}`);
            console.log(`Author: ${result.metadata.author} | Date: ${date}`);
            console.log(`Message: ${result.text.slice(0, 200)}${result.text.length > 200 ? '...' : ''}`);
            console.log('-'.repeat(70));
        }
        
        console.log('\n✅ Query complete!\n');
        
        return topResults;
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.message.includes('ENOENT')) {
            console.error('\n💡 TIP: Run "node setup-simple-rag.js" first to create the database!');
        }
    }
}

// Main execution
(async () => {
    const customQuery = process.argv[2];
    
    if (customQuery) {
        await queryRAG(customQuery, 20);
    } else {
        console.log('\n💡 Usage: node query-simple-rag.js "your search query"\n');
        console.log('Examples:');
        console.log('  node query-simple-rag.js "hardware security vulnerabilities"');
        console.log('  node query-simple-rag.js "debugging embedded systems"');
        console.log('  node query-simple-rag.js "firmware extraction techniques"');
        console.log('  node query-simple-rag.js "UART communication problems"\n');
    }
})();

