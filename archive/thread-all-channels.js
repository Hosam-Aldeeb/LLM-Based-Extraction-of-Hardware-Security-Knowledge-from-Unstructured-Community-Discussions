const fs = require('fs');

const CHANNELS = [
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

const TIME_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

function buildConversationThreads(filteredMessages, allMessages) {
    // Create a map of all messages by ID for quick lookup
    const messageMap = new Map();
    allMessages.forEach(msg => {
        messageMap.set(msg.id, msg);
    });

    // Build threads
    const threads = [];
    const processedIds = new Set();

    filteredMessages.forEach(filtered => {
        const msgId = filtered.metadata.id;
        
        if (processedIds.has(msgId)) return;

        // Start a new thread
        const thread = [];
        const toProcess = [msgId];
        const threadIds = new Set();

        while (toProcess.length > 0) {
            const currentId = toProcess.shift();
            
            if (threadIds.has(currentId)) continue;
            threadIds.add(currentId);

            const msg = messageMap.get(currentId);
            if (!msg) continue;

            thread.push({
                id: msg.id,
                author: msg.author.name,
                timestamp: msg.timestamp,
                content: msg.content,
                reference: msg.reference
            });

            // Add parent message if it exists
            if (msg.reference && msg.reference.messageId) {
                toProcess.push(msg.reference.messageId);
            }

            // Find replies to this message
            allMessages.forEach(m => {
                if (m.reference && m.reference.messageId === currentId && !threadIds.has(m.id)) {
                    toProcess.push(m.id);
                }
            });
        }

        // Sort thread by timestamp
        thread.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Mark all as processed
        thread.forEach(msg => processedIds.add(msg.id));

        // Add nearby messages within time window
        const threadStart = new Date(thread[0].timestamp);
        const threadEnd = new Date(thread[thread.length - 1].timestamp);

        allMessages.forEach(msg => {
            if (threadIds.has(msg.id)) return;
            
            const msgTime = new Date(msg.timestamp);
            if (msgTime >= threadStart && msgTime <= new Date(threadEnd.getTime() + TIME_WINDOW_MS)) {
                // Check if author is in thread
                const threadAuthors = new Set(thread.map(t => t.author));
                if (threadAuthors.has(msg.author.name)) {
                    thread.push({
                        id: msg.id,
                        author: msg.author.name,
                        timestamp: msg.timestamp,
                        content: msg.content,
                        reference: msg.reference
                    });
                    threadIds.add(msg.id);
                }
            }
        });

        // Final sort
        thread.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (thread.length > 0) {
            threads.push(thread);
        }
    });

    return threads;
}

async function threadChannel(channelName, channelNum, totalChannels) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🧵 THREADING ${channelNum}/${totalChannels}: ${channelName}`);
    console.log(`${'═'.repeat(80)}`);

    try {
        const filteredFile = `${channelName}_filtered_messages.json`;
        const exportFile = `./discord-exports/${channelName}_Jan2025_export.json`;

        console.log('\n📖 Step 1/3: Loading files...');
        
        if (!fs.existsSync(filteredFile)) {
            console.log(`  ⚠️  Filtered file not found: ${filteredFile}`);
            return { success: false, reason: 'Filtered file not found' };
        }

        if (!fs.existsSync(exportFile)) {
            console.log(`  ⚠️  Export file not found: ${exportFile}`);
            return { success: false, reason: 'Export file not found' };
        }

        const filteredData = JSON.parse(fs.readFileSync(filteredFile, 'utf8'));
        const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));

        console.log(`  ✅ Loaded ${filteredData.relevantMessages} filtered messages`);
        console.log(`  ✅ Loaded ${exportData.messages.length} total messages`);

        console.log('\n🔗 Step 2/3: Building conversation threads...');
        const threads = buildConversationThreads(filteredData.results, exportData.messages);
        console.log(`  ✅ Created ${threads.length} threads`);

        // Filter threads with at least 3 messages
        const substantialThreads = threads.filter(t => t.length >= 3);
        console.log(`  ✅ ${substantialThreads.length} threads with 3+ messages`);

        console.log('\n💾 Step 3/3: Saving results...');
        const outputFile = `${channelName}_threaded_conversations.json`;
        
        fs.writeFileSync(outputFile, JSON.stringify({
            channel: channelName,
            source: exportFile,
            filteredMessages: filteredData.relevantMessages,
            totalThreads: threads.length,
            substantialThreads: substantialThreads.length,
            threads: substantialThreads
        }, null, 2));

        console.log(`  ✅ Saved ${outputFile}`);
        
        console.log(`\n📊 ${filteredData.relevantMessages} filtered → ${threads.length} threads (${substantialThreads.length} with 3+ messages)`);
        console.log(`✅ THREADING COMPLETE!`);

        return {
            success: true,
            filteredMessages: filteredData.relevantMessages,
            totalThreads: threads.length,
            substantialThreads: substantialThreads.length
        };

    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}`);
        return { success: false, reason: error.message };
    }
}

async function threadAll() {
    console.log('\n🎯 THREADING ALL CHANNELS');
    console.log(`📊 Total channels: ${CHANNELS.length}`);
    console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}\n`);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < CHANNELS.length; i++) {
        const result = await threadChannel(CHANNELS[i], i + 1, CHANNELS.length);
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
        console.log('✅ Successfully threaded:');
        const totalFiltered = successful.reduce((sum, r) => sum + r.filteredMessages, 0);
        const totalThreads = successful.reduce((sum, r) => sum + r.totalThreads, 0);
        const totalSubstantial = successful.reduce((sum, r) => sum + r.substantialThreads, 0);
        
        console.log(`\n   TOTALS: ${totalFiltered} filtered messages → ${totalThreads} threads (${totalSubstantial} with 3+ messages)\n`);
        
        successful.forEach(r => {
            console.log(`   ${r.channel}: ${r.filteredMessages} → ${r.totalThreads} threads (${r.substantialThreads} substantial)`);
        });
    }

    if (failed.length > 0) {
        console.log('\n❌ Failed:');
        failed.forEach(r => {
            console.log(`   ${r.channel}: ${r.reason}`);
        });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 THREADING COMPLETE!');
    console.log('═'.repeat(80) + '\n');
}

threadAll();


