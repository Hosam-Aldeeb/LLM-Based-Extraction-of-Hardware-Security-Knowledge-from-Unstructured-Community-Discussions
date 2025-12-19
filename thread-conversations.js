const fs = require('fs');

/**
 * CONVERSATION THREADING
 * Groups filtered messages into conversation threads using:
 * 1. Discord reply chains
 * 2. Time-based proximity
 * 3. Context expansion
 */

// ============================================================================
// 🔧 USER CONFIGURATION - EDIT THESE FOR EACH CHANNEL
// ============================================================================
// You must run this script ONCE PER CHANNEL. Before each run:
// 1. Change FILTERED_MESSAGES_FILE to your channel's filtered output
// 2. Change ORIGINAL_EXPORT_FILE to your channel's Discord export
// 3. Change OUTPUT_FILE and OUTPUT_TXT to your channel name
//
// Example for channel "MyServer_general":
//   FILTERED_MESSAGES_FILE = './MyServer_general_filtered_messages.json'
//   ORIGINAL_EXPORT_FILE = './discord-exports/MyServer_general_Jan2025_export.json'
//   OUTPUT_FILE = 'MyServer_general_threaded_conversations.json'
//   OUTPUT_TXT = 'MyServer_general_threaded_conversations.txt'
// ============================================================================
const FILTERED_MESSAGES_FILE = './YourChannel_filtered_messages.json';  // ← CHANGE THIS
const ORIGINAL_EXPORT_FILE = './discord-exports/YourChannel_Jan2025_export.json';  // ← CHANGE THIS
const OUTPUT_FILE = 'YourChannel_threaded_conversations.json';  // ← CHANGE THIS
const OUTPUT_TXT = 'YourChannel_threaded_conversations.txt';  // ← CHANGE THIS

// Time window for grouping messages (in milliseconds)
const TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

console.log('🧵 CONVERSATION THREADING SYSTEM\n');
console.log('='.repeat(70));

function threadConversations() {
    try {
        // 1. Load filtered messages
        console.log('📖 Loading filtered messages...');
        const filteredData = JSON.parse(fs.readFileSync(FILTERED_MESSAGES_FILE, 'utf8'));
        const filteredMessages = filteredData.results;
        console.log(`  ✅ Loaded ${filteredMessages.length} filtered messages\n`);
        
        // 2. Load original Discord export
        console.log('📖 Loading original Discord export...');
        const originalData = JSON.parse(fs.readFileSync(ORIGINAL_EXPORT_FILE, 'utf8'));
        const allMessages = originalData.messages;
        console.log(`  ✅ Loaded ${allMessages.length} total messages\n`);
        
        // 3. Create message lookup map
        console.log('🗺️  Creating message lookup map...');
        const messageMap = new Map();
        allMessages.forEach(msg => {
            messageMap.set(msg.id, msg);
        });
        console.log(`  ✅ Indexed ${messageMap.size} messages\n`);
        
        // 4. Build conversation threads
        console.log('🧵 Building conversation threads...');
        const threads = [];
        const processedIds = new Set();
        
        // Sort filtered messages by timestamp
        filteredMessages.sort((a, b) => 
            new Date(a.metadata.timestamp) - new Date(b.metadata.timestamp)
        );
        
        for (const filteredMsg of filteredMessages) {
            const msgId = filteredMsg.metadata.id;
            
            // Skip if already processed
            if (processedIds.has(msgId)) continue;
            
            // Get full message from original export
            const fullMsg = messageMap.get(msgId);
            if (!fullMsg) continue;
            
            // Start a new thread
            const thread = {
                id: threads.length + 1,
                rootMessageId: msgId,
                messages: [],
                participants: new Set(),
                startTime: fullMsg.timestamp,
                endTime: fullMsg.timestamp,
                channel: filteredMsg.metadata.channel
            };
            
            // Collect thread messages
            const threadMessages = collectThreadMessages(fullMsg, messageMap, filteredMessages, processedIds);
            
            // Add messages to thread
            threadMessages.forEach(msg => {
                thread.messages.push({
                    id: msg.id,
                    author: msg.author.name,
                    timestamp: msg.timestamp,
                    content: msg.content,
                    type: msg.type,
                    isFiltered: filteredMessages.some(f => f.metadata.id === msg.id)
                });
                thread.participants.add(msg.author.name);
                processedIds.add(msg.id);
                
                // Update time range
                const msgTime = new Date(msg.timestamp);
                if (msgTime < new Date(thread.startTime)) thread.startTime = msg.timestamp;
                if (msgTime > new Date(thread.endTime)) thread.endTime = msg.timestamp;
            });
            
            // Convert Set to Array for JSON serialization
            thread.participants = Array.from(thread.participants);
            
            // Only add threads with multiple messages or substantive single messages
            if (thread.messages.length > 0) {
                threads.push(thread);
            }
        }
        
        console.log(`  ✅ Created ${threads.length} conversation threads\n`);
        
        // 5. Calculate statistics
        console.log('📊 Calculating statistics...');
        const stats = {
            totalThreads: threads.length,
            totalMessages: threads.reduce((sum, t) => sum + t.messages.length, 0),
            avgMessagesPerThread: 0,
            minMessages: Math.min(...threads.map(t => t.messages.length)),
            maxMessages: Math.max(...threads.map(t => t.messages.length)),
            singleMessageThreads: threads.filter(t => t.messages.length === 1).length,
            multiMessageThreads: threads.filter(t => t.messages.length > 1).length
        };
        stats.avgMessagesPerThread = (stats.totalMessages / stats.totalThreads).toFixed(2);
        
        // 6. Save results
        console.log('💾 Saving threaded conversations...');
        
        // Save JSON
        const output = {
            metadata: {
                created: new Date().toISOString(),
                sourceFile: FILTERED_MESSAGES_FILE,
                originalExport: ORIGINAL_EXPORT_FILE
            },
            statistics: stats,
            threads: threads
        };
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`  ✅ Saved to: ${OUTPUT_FILE}`);
        
        // Save human-readable version
        const readableOutput = threads.map(thread => {
            const duration = Math.round((new Date(thread.endTime) - new Date(thread.startTime)) / 1000 / 60);
            let output = `\n${'='.repeat(70)}\n`;
            output += `THREAD #${thread.id}\n`;
            output += `Channel: ${thread.channel}\n`;
            output += `Participants: ${thread.participants.join(', ')}\n`;
            output += `Messages: ${thread.messages.length} | Duration: ${duration} minutes\n`;
            output += `Time: ${new Date(thread.startTime).toLocaleString()}\n`;
            output += `${'='.repeat(70)}\n\n`;
            
            thread.messages.forEach((msg, idx) => {
                const marker = msg.isFiltered ? '🎯' : '💬';
                const time = new Date(msg.timestamp).toLocaleTimeString();
                output += `${marker} [${idx + 1}] ${msg.author} (${time})${msg.type === 'Reply' ? ' [REPLY]' : ''}\n`;
                output += `${msg.content}\n\n`;
            });
            
            return output;
        }).join('\n');
        
        fs.writeFileSync(OUTPUT_TXT, readableOutput);
        console.log(`  ✅ Saved readable version to: ${OUTPUT_TXT}\n`);
        
        // 7. Display statistics
        console.log('='.repeat(70));
        console.log('📊 THREADING STATISTICS:\n');
        console.log(`  Total Threads: ${stats.totalThreads}`);
        console.log(`  Total Messages: ${stats.totalMessages}`);
        console.log(`  Avg Messages/Thread: ${stats.avgMessagesPerThread}`);
        console.log(`  Min Messages: ${stats.minMessages}`);
        console.log(`  Max Messages: ${stats.maxMessages}`);
        console.log(`  Single-message threads: ${stats.singleMessageThreads}`);
        console.log(`  Multi-message threads: ${stats.multiMessageThreads}`);
        console.log('='.repeat(70));
        
        console.log('\n✅ THREADING COMPLETE!\n');
        console.log('🎯 Next steps:');
        console.log('  1. Review: threaded_conversations.txt');
        console.log('  2. Analyze: threaded_conversations.json');
        console.log('  3. Ready for OpenAI analysis (Step 4)');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    }
}

/**
 * Collect all messages in a thread (replies, context, time-proximity)
 */
function collectThreadMessages(rootMsg, messageMap, filteredMessages, processedIds) {
    const threadMessages = [];
    const toProcess = [rootMsg];
    const seen = new Set();
    
    while (toProcess.length > 0) {
        const currentMsg = toProcess.shift();
        if (!currentMsg || seen.has(currentMsg.id)) continue;
        
        seen.add(currentMsg.id);
        threadMessages.push(currentMsg);
        
        // 1. Find direct replies to this message
        const replies = Array.from(messageMap.values()).filter(msg => 
            msg.reference && msg.reference.messageId === currentMsg.id
        );
        toProcess.push(...replies);
        
        // 2. If this is a reply, get the parent message
        if (currentMsg.reference && currentMsg.reference.messageId) {
            const parentMsg = messageMap.get(currentMsg.reference.messageId);
            if (parentMsg && !seen.has(parentMsg.id)) {
                toProcess.push(parentMsg);
            }
        }
        
        // 3. Get time-proximity messages (same author, within time window)
        const currentTime = new Date(currentMsg.timestamp);
        const proximityMessages = Array.from(messageMap.values()).filter(msg => {
            if (seen.has(msg.id)) return false;
            if (msg.author.id !== currentMsg.author.id) return false;
            
            const msgTime = new Date(msg.timestamp);
            const timeDiff = Math.abs(msgTime - currentTime);
            
            return timeDiff <= TIME_WINDOW_MS;
        });
        
        toProcess.push(...proximityMessages);
    }
    
    // Sort by timestamp
    threadMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return threadMessages;
}

threadConversations();




