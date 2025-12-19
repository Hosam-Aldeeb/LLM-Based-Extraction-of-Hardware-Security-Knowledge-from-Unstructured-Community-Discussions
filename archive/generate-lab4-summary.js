const fs = require('fs');
const path = require('path');
const http = require('http');

const promptPath = path.join(__dirname, 'discord-exports', 'ece722_lab4_PROMPT.txt');
const summaryPath = path.join(__dirname, 'discord-exports', 'ece722_lab4_SUMMARY_NEW.txt');

async function generateSummary() {
    console.log('📖 Reading prompt file...');
    const prompt = fs.readFileSync(promptPath, 'utf8');
    console.log(`✅ Loaded prompt (${prompt.length} characters)`);
    
    console.log('\n🤖 Calling Ollama with tinyllama...');
    console.log('⏳ This may take 2-5 minutes...\n');
    
    const requestData = JSON.stringify({
        model: 'tinyllama',
        prompt: prompt,
        stream: false
    });
    
    const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestData)
        },
        timeout: 600000 // 10 minute timeout
    };
    
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        console.log(`[${new Date().toLocaleTimeString()}] Request sent to Ollama...`);
        console.log('Progress: ');
        
        const req = http.request(options, (res) => {
            let data = '';
            let chunkCount = 0;
            
            res.on('data', (chunk) => {
                data += chunk;
                chunkCount++;
                if (chunkCount % 10 === 0) {
                    process.stdout.write('.');
                }
            });
            
            res.on('end', () => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`\n\n✅ Response received in ${elapsed}s`);
                console.log(`📦 Received ${data.length} bytes of data`);
                
                try {
                    const result = JSON.parse(data);
                    
                    if (!result.response) {
                        console.error('❌ No response field in result:', JSON.stringify(result, null, 2));
                        reject(new Error('No response from Ollama'));
                        return;
                    }
                    
                    const summary = result.response;
                    
                    fs.writeFileSync(summaryPath, summary);
                    console.log(`\n💾 Summary saved to: ${summaryPath}`);
                    console.log(`📊 Summary length: ${summary.length} characters`);
                    console.log(`\n✅ DONE!\n`);
                    resolve(summary);
                } catch (error) {
                    console.error('\n❌ Error parsing response:', error.message);
                    console.error('Raw data preview:', data.substring(0, 500));
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('\n❌ Request error:', error.message);
            reject(error);
        });
        
        req.on('timeout', () => {
            console.error('\n❌ Request timed out after 10 minutes');
            req.destroy();
            reject(new Error('Timeout'));
        });
        
        req.write(requestData);
        req.end();
    });
}

console.log('════════════════════════════════════════════════════════════════');
console.log('🚀 ECE722 Lab 4 Summary Generator (tinyllama via Ollama)');
console.log('════════════════════════════════════════════════════════════════\n');

generateSummary().catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});

