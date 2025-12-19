const fs = require('fs');
const path = require('path');
const https = require('https');

const messagesPath = path.join(__dirname, 'discord-exports', 'ece722_lab4_ALL_MESSAGES.txt');
const summaryPath = path.join(__dirname, 'discord-exports', 'ece722_lab4_SUMMARY.txt');

console.log('📖 Reading Lab 4 messages...');
const messages = fs.readFileSync(messagesPath, 'utf8');
console.log(`✅ Loaded ${messages.length} characters\n`);

const prompt = `You are an expert in ECE722 (Hardware Security) and FPGA design.
Summarize the following Discord messages about Lab 4 (2048-bit adder implementation).

Focus on:
- Common issues and bugs
- Design decisions (M values, pipelining, prefix trees)
- Optimization tips (Fmax, ALM)
- TA/Professor clarifications

Provide a concise, structured summary.

Messages:
${messages}`;

console.log('🤖 Calling OpenAI GPT-4o-mini...\n');

const requestData = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000
});

const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_OPENAI_API_KEY_HERE',
        'Content-Length': Buffer.byteLength(requestData)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => {
        data += chunk;
        process.stdout.write('.');
    });
    
    res.on('end', () => {
        console.log('\n');
        const result = JSON.parse(data);
        const summary = result.choices[0].message.content;
        
        fs.writeFileSync(summaryPath, summary);
        console.log(`✅ Summary saved to: ${summaryPath}`);
        console.log(`\n${summary}\n`);
    });
});

req.on('error', err => console.error('❌ Error:', err.message));
req.write(requestData);
req.end();




