const { ChromaClient } = require('chromadb');

/**
 * QUERY LOCAL RAG - Search your vector database
 * 
 * This script lets you search your Discord messages using semantic search
 * Find messages related to your research topics!
 */

// Configuration
const COLLECTION_NAME = 'arduino_messages';
const OLLAMA_URL = 'http://localhost:11434';

console.log('🔍 LOCAL RAG QUERY SYSTEM\n');
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

async function queryRAG(queryText, nResults = 20) {
    try {
        console.log(`\n🔎 Query: "${queryText}"\n`);
        
        // 1. Connect to ChromaDB (embedded mode)
        const client = new ChromaClient({
            path: "./chroma_db"  // Local storage directory
        });
        const collection = await client.getCollection({ 
            name: COLLECTION_NAME,
            embeddingFunction: undefined  // We provide embeddings manually
        });
        
        // 2. Generate embedding for query
        console.log('🧠 Generating query embedding...');
        const queryEmbedding = await generateEmbedding(queryText);
        
        if (!queryEmbedding) {
            throw new Error('Failed to generate query embedding');
        }
        
        // 3. Search vector database
        console.log(`🔍 Searching for top ${nResults} most relevant messages...\n`);
        const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: nResults
        });
        
        // 4. Display results
        console.log('='.repeat(70));
        console.log(`📊 FOUND ${results.documents[0].length} RELEVANT MESSAGES\n`);
        
        for (let i = 0; i < results.documents[0].length; i++) {
            const doc = results.documents[0][i];
            const metadata = results.metadatas[0][i];
            const distance = results.distances[0][i];
            const similarity = (1 - distance).toFixed(3); // Convert distance to similarity
            
            console.log(`[Result ${i + 1}] Similarity: ${similarity}`);
            console.log(`Author: ${metadata.author} | Date: ${new Date(metadata.timestamp).toLocaleDateString()}`);
            console.log(`Message: ${doc.slice(0, 200)}${doc.length > 200 ? '...' : ''}`);
            console.log('-'.repeat(70));
        }
        
        console.log('\n✅ Query complete!\n');
        
        return results;
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.message.includes('Collection') || error.message.includes('not found')) {
            console.error('\n💡 TIP: Run "node setup-local-rag.js" first to create the database!');
        }
    }
}

// Example queries for hardware security research
async function runExampleQueries() {
    console.log('\n🎯 RUNNING EXAMPLE QUERIES FOR HARDWARE SECURITY RESEARCH\n');
    console.log('='.repeat(70));
    
    const queries = [
        'hardware security vulnerabilities',
        'debugging embedded systems',
        'UART serial communication issues',
        'firmware extraction and analysis',
        'hardware hacking techniques'
    ];
    
    for (const query of queries) {
        await queryRAG(query, 10);
        console.log('\n' + '='.repeat(70) + '\n');
        
        // Pause between queries
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Main execution
(async () => {
    // Check if user provided custom query
    const customQuery = process.argv[2];
    
    if (customQuery) {
        // Run custom query
        await queryRAG(customQuery, 20);
    } else {
        // Run example queries
        console.log('💡 Usage: node query-local-rag.js "your search query"');
        console.log('💡 Or run without arguments to see example queries\n');
        
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question('Run example queries? (y/n): ', async (answer) => {
            if (answer.toLowerCase() === 'y') {
                await runExampleQueries();
            } else {
                console.log('\n💡 Run: node query-local-rag.js "your search query"');
            }
            readline.close();
        });
    }
})();

