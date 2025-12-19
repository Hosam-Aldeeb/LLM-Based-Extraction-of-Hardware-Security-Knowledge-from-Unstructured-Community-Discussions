const fs = require('fs');
const https = require('https');

// ============================================================================
// 🔧 USER CONFIGURATION - EDIT THIS SECTION
// ============================================================================
// Add your channel names here. Each channel should have a corresponding
// threaded file named: {ChannelName}_threaded_conversations.json
// 
// Before running this script:
// 1. Make sure you've run process-all-remaining.js for these channels
// 2. Make sure you've run thread-conversations.js for EACH channel
// 3. Each channel needs a {ChannelName}_threaded_conversations.json file
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

// Set your OpenAI API key as environment variable: $env:OPENAI_API_KEY = "sk-..."
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE';

const BATCH_SIZE = 5; // Process 5 threads at a time to avoid rate limits

function callOpenAI(messages) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: 0.3,
            max_tokens: 2000
        });

        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 60000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(json.error.message));
                    } else {
                        resolve(json.choices[0].message.content);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
    });
}

async function analyzeThread(thread, threadNum, totalThreads) {
    // Handle both formats: thread as array OR thread as object with messages property
    const messages = Array.isArray(thread) ? thread : thread.messages;
    const conversationText = messages.map(msg => 
        `[${new Date(msg.timestamp).toLocaleString()}] ${msg.author?.name || msg.author}: ${msg.content}`
    ).join('\n\n');

    const prompt = `Analyze this Discord conversation about hardware/cybersecurity and extract:

1. **Vulnerabilities**: Any security issues, exploits, or weaknesses discussed
2. **Techniques**: Methods, tools, or approaches mentioned
3. **Hardware**: Specific hardware, chips, or devices discussed
4. **Protocols**: Communication protocols or interfaces mentioned (UART, SPI, JTAG, etc.)

Conversation:
${conversationText}

Respond in JSON format:
{
  "vulnerabilities": ["list of vulnerabilities"],
  "techniques": ["list of techniques"],
  "hardware": ["list of hardware"],
  "protocols": ["list of protocols"],
  "summary": "brief summary of the conversation"
}`;

    try {
        const response = await callOpenAI([
            {
                role: 'system',
                content: 'You are a hardware security expert analyzing Discord discussions. Extract structured information and respond only with valid JSON.'
            },
            {
                role: 'user',
                content: prompt
            }
        ]);

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            return {
                vulnerabilities: [],
                techniques: [],
                hardware: [],
                protocols: [],
                summary: response
            };
        }
    } catch (error) {
        console.error(`    ⚠️  Error analyzing thread ${threadNum}: ${error.message}`);
        return null;
    }
}

async function analyzeChannel(channelName, channelNum, totalChannels) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🤖 ANALYZING ${channelNum}/${totalChannels}: ${channelName}`);
    console.log(`${'═'.repeat(80)}`);

    try {
        const threadedFile = `${channelName}_threaded_conversations.json`;

        console.log('\n📖 Step 1/3: Loading threaded conversations...');
        
        if (!fs.existsSync(threadedFile)) {
            console.log(`  ⚠️  File not found: ${threadedFile}`);
            return { success: false, reason: 'File not found' };
        }

        const data = JSON.parse(fs.readFileSync(threadedFile, 'utf8'));
        const threads = data.threads || [];

        console.log(`  ✅ Loaded ${threads.length} threads`);

        if (threads.length === 0) {
            console.log(`  ℹ️  No threads to analyze, skipping...`);
            return { success: true, threadsAnalyzed: 0, skipped: true };
        }

        console.log(`\n🔍 Step 2/3: Analyzing ${threads.length} threads with OpenAI...`);
        const analyses = [];
        const startTime = Date.now();

        for (let i = 0; i < threads.length; i += BATCH_SIZE) {
            const batch = threads.slice(i, Math.min(i + BATCH_SIZE, threads.length));
            
            // Process batch in parallel
            const batchPromises = batch.map((thread, idx) => 
                analyzeThread(thread, i + idx + 1, threads.length)
            );
            
            const batchResults = await Promise.all(batchPromises);
            analyses.push(...batchResults.filter(r => r !== null));

            const progress = Math.min(i + BATCH_SIZE, threads.length);
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const rate = progress / (elapsed || 1);
            const remaining = Math.ceil((threads.length - progress) / rate);
            
            process.stdout.write(`\r  Progress: ${progress}/${threads.length} (${((progress / threads.length) * 100).toFixed(0)}%) | Analyzed: ${analyses.length} | Est. ${remaining}s left     `);

            // Small delay to avoid rate limits
            if (i + BATCH_SIZE < threads.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`\n  ✅ Analyzed ${analyses.length} threads`);

        console.log('\n💾 Step 3/3: Saving results...');
        const outputFile = `${channelName}_openai_analysis.json`;

        // Aggregate findings
        const allVulnerabilities = new Set();
        const allTechniques = new Set();
        const allHardware = new Set();
        const allProtocols = new Set();

        analyses.forEach(analysis => {
            analysis.vulnerabilities?.forEach(v => allVulnerabilities.add(v));
            analysis.techniques?.forEach(t => allTechniques.add(t));
            analysis.hardware?.forEach(h => allHardware.add(h));
            analysis.protocols?.forEach(p => allProtocols.add(p));
        });

        const summary = {
            channel: channelName,
            threadsAnalyzed: analyses.length,
            aggregatedFindings: {
                vulnerabilities: Array.from(allVulnerabilities),
                techniques: Array.from(allTechniques),
                hardware: Array.from(allHardware),
                protocols: Array.from(allProtocols)
            },
            detailedAnalyses: analyses
        };

        fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));

        console.log(`  ✅ Saved ${outputFile}`);
        
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`\n📊 Analyzed ${analyses.length} threads in ${elapsed}s`);
        console.log(`   Vulnerabilities: ${allVulnerabilities.size}`);
        console.log(`   Techniques: ${allTechniques.size}`);
        console.log(`   Hardware: ${allHardware.size}`);
        console.log(`   Protocols: ${allProtocols.size}`);
        console.log(`✅ ANALYSIS COMPLETE!`);

        return {
            success: true,
            threadsAnalyzed: analyses.length,
            vulnerabilities: allVulnerabilities.size,
            techniques: allTechniques.size,
            hardware: allHardware.size,
            protocols: allProtocols.size,
            timeSeconds: elapsed
        };

    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}`);
        return { success: false, reason: error.message };
    }
}

async function analyzeAll() {
    console.log('\n🎯 OPENAI ANALYSIS FOR ALL CHANNELS');
    console.log(`📊 Total channels: ${CHANNELS.length}`);
    console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}\n`);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < CHANNELS.length; i++) {
        const result = await analyzeChannel(CHANNELS[i], i + 1, CHANNELS.length);
        results.push({
            channel: CHANNELS[i],
            ...result
        });
    }

    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(80));

    const successful = results.filter(r => r.success && !r.skipped);
    const skipped = results.filter(r => r.success && r.skipped);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successful: ${successful.length}/${CHANNELS.length}`);
    console.log(`⏭️  Skipped (no threads): ${skipped.length}/${CHANNELS.length}`);
    console.log(`❌ Failed: ${failed.length}/${CHANNELS.length}`);
    console.log(`⏰ Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s\n`);

    if (successful.length > 0) {
        console.log('✅ Successfully analyzed:');
        const totalThreads = successful.reduce((sum, r) => sum + r.threadsAnalyzed, 0);
        const totalVulns = successful.reduce((sum, r) => sum + r.vulnerabilities, 0);
        const totalTechs = successful.reduce((sum, r) => sum + r.techniques, 0);
        const totalHw = successful.reduce((sum, r) => sum + r.hardware, 0);
        const totalProtos = successful.reduce((sum, r) => sum + r.protocols, 0);
        
        console.log(`\n   TOTALS: ${totalThreads} threads analyzed`);
        console.log(`   - ${totalVulns} unique vulnerabilities`);
        console.log(`   - ${totalTechs} unique techniques`);
        console.log(`   - ${totalHw} unique hardware items`);
        console.log(`   - ${totalProtos} unique protocols\n`);
        
        successful.forEach(r => {
            console.log(`   ${r.channel}: ${r.threadsAnalyzed} threads (V:${r.vulnerabilities} T:${r.techniques} H:${r.hardware} P:${r.protocols})`);
        });
    }

    if (skipped.length > 0) {
        console.log(`\n⏭️  Skipped (no threads):`);
        skipped.forEach(r => {
            console.log(`   ${r.channel}`);
        });
    }

    if (failed.length > 0) {
        console.log('\n❌ Failed:');
        failed.forEach(r => {
            console.log(`   ${r.channel}: ${r.reason}`);
        });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 ALL ANALYSIS COMPLETE!');
    console.log('═'.repeat(80) + '\n');
}

analyzeAll();


