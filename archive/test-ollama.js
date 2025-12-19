const http = require('http');

console.log('🧪 Testing Ollama connection...\n');

const data = JSON.stringify({
    model: 'nomic-embed-text',
    prompt: 'test'
});

const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/api/embeddings',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(body);
            console.log(`✅ Embedding length: ${result.embedding.length}`);
            console.log('✅ Ollama is working!\n');
        } catch (e) {
            console.log('❌ Failed to parse response');
        }
    });
});

req.on('error', (error) => {
    console.error(`❌ Error: ${error.message}`);
});

req.on('timeout', () => {
    console.error('❌ Request timed out');
    req.destroy();
});

req.write(data);
req.end();




