const fs = require('fs');
const http = require('http');

// ============================================================================
// 🔧 USER CONFIGURATION - EDIT THIS SECTION
// ============================================================================
// Add your channel names here. Each channel should have a corresponding
// export file in discord-exports/ folder named: {ChannelName}_Jan2025_export.json
// 
// Example: If you exported "MyServer_general", add 'MyServer_general' to this list
// and make sure discord-exports/MyServer_general_Jan2025_export.json exists.
// ============================================================================
const CHANNELS = [
    // ═══════════════════════════════════════════════════════════════════════════
    // ADD YOUR CHANNELS HERE - uncomment/add channel names as needed
    // ═══════════════════════════════════════════════════════════════════════════
    'Adafruit_fpga',
    'Adafruit_helpwithhwdesign',
    'Amulius_arm',
    'Amulius_esp32',
    'Amulius_linux',
    'Amulius_risc-v',
    'CutFreedom_hwinfo',
    'CutFreedom_swinfo',
    'Defcon_hw-hacks',
    'ElectronicRepair_laptops',
    'ElectronicRepair_pc-repair',
    'HardwayHacking_general-hacking',
    'HardwayHacking_hardware',
    'KiCad_general',
    'KiCad_pcb',
    'meshatastic_firmware',
    'meshatastic_flashingfw',
    'Meshtastic_firmware',
    'MisterFPGA_controllers',
    'MisterFPGA_mister-debug',
    'Rinkhals_HardwareHacking',
    'SDRplusplus_dsp',
    'SDRplusplus_programming',
    'STM32World_general',
    'STM32World_hardware'
];

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

async function processChannel(channelName, channelNum, totalChannels) {
    const EXPORT_FILE = `./discord-exports/${channelName}_Jan2025_export.json`;
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🚀 CHANNEL ${channelNum}/${totalChannels}: ${channelName}`);
    console.log(`${'═'.repeat(80)}`);
    
    try {
        console.log('\n📖 Step 1/5: Loading export...');
        if (!fs.existsSync(EXPORT_FILE)) {
            console.log(`  ⚠️  File not found: ${EXPORT_FILE}`);
            return { success: false, reason: 'File not found' };
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
        if (!queryEmbedding) {
            console.log('  ❌ Failed to generate query embedding - is Ollama running?');
            return { success: false, reason: 'Ollama error' };
        }
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
        
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`\n📊 ${messages.length} messages → ${relevantMessages.length} relevant (${(relevantMessages.length / chunks.length * 100).toFixed(2)}%) in ${elapsed}s`);
        console.log(`✅ CHANNEL COMPLETE!`);
        
        return { 
            success: true, 
            totalMessages: messages.length,
            relevantMessages: relevantMessages.length,
            timeSeconds: elapsed
        };
        
    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}`);
        return { success: false, reason: error.message };
    }
}

async function processAll() {
    console.log('\n🎯 BATCH PROCESSING ALL REMAINING CHANNELS');
    console.log(`📊 Total channels to process: ${CHANNELS.length}`);
    console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}\n`);
    
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < CHANNELS.length; i++) {
        const result = await processChannel(CHANNELS[i], i + 1, CHANNELS.length);
        results.push({
            channel: CHANNELS[i],
            ...result
        });
    }
    
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(80));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n✅ Successful: ${successful.length}/${CHANNELS.length}`);
    console.log(`❌ Failed: ${failed.length}/${CHANNELS.length}`);
    console.log(`⏰ Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s\n`);
    
    if (successful.length > 0) {
        console.log('✅ Successfully processed:');
        successful.forEach(r => {
            console.log(`   ${r.channel}: ${r.totalMessages} → ${r.relevantMessages} relevant (${r.timeSeconds}s)`);
        });
    }
    
    if (failed.length > 0) {
        console.log('\n❌ Failed:');
        failed.forEach(r => {
            console.log(`   ${r.channel}: ${r.reason}`);
        });
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 BATCH PROCESSING COMPLETE!');
    console.log('═'.repeat(80) + '\n');
}

processAll();
