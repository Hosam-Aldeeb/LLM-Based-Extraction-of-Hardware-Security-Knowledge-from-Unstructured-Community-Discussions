import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType, TextChannel } from 'discord.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const DISCORD_TOKEN: string = process.env.DISCORD_BOT_TOKEN as string;
if (!DISCORD_TOKEN) {
	console.error('Missing DISCORD_BOT_TOKEN in .env');
	process.exit(1);
}

// Command to start your local MCP server (already built)
const MCP_COMMAND = 'node';
const MCP_ARGS = [
	'C:/Users/Hosam/Desktop/MCP/dist/server.js'
];

async function createMCPClient() {
	const transport = new StdioClientTransport({
		command: MCP_COMMAND,
		args: MCP_ARGS,
	});
	const client = new MCPClient({
		name: 'discord-mcp-client',
		version: '0.1.0',
	}, { capabilities: {} });

	await client.connect(transport);
	return client;
}

// Simple JSON config for watchers: { [sourceChannelId]: destinationChannelId }
const WATCH_CONFIG_PATH = path.resolve(process.cwd(), 'watch-config.json');
const MESSAGES_DIR = path.resolve(process.cwd(), 'archived-messages');

async function readWatchConfig(): Promise<Record<string, string>> {
	try {
		const raw = await fs.readFile(WATCH_CONFIG_PATH, 'utf8');
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

async function writeWatchConfig(cfg: Record<string, string>): Promise<void> {
	await fs.writeFile(WATCH_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function ensureMessagesDir(): Promise<void> {
	try {
		await fs.mkdir(MESSAGES_DIR, { recursive: true });
	} catch {
		// ignore if exists
	}
}

async function archiveMessage(channelId: string, messageData: any): Promise<void> {
	await ensureMessagesDir();
	const filename = path.join(MESSAGES_DIR, `${channelId}.jsonl`);
	const line = JSON.stringify(messageData) + '\n';
	await fs.appendFile(filename, line, 'utf8');
}

async function registerCommands(clientId: string) {
	const commands = [
		new SlashCommandBuilder()
			.setName('models')
			.setDescription('List available Ollama models via MCP'),
		new SlashCommandBuilder()
			.setName('ask')
			.setDescription('Ask tinyllama via MCP')
			.addStringOption(opt => opt.setName('prompt').setDescription('Your question').setRequired(true)),
		new SlashCommandBuilder()
			.setName('watch_add')
			.setDescription('Start summarizing a source channel into a destination channel')
			.addChannelOption(o => o.setName('source').setDescription('Source channel to watch').addChannelTypes(ChannelType.GuildText).setRequired(true))
			.addChannelOption(o => o.setName('destination').setDescription('Channel to post summaries into').addChannelTypes(ChannelType.GuildText).setRequired(true)),
		new SlashCommandBuilder()
			.setName('watch_remove')
			.setDescription('Stop summarizing a source channel')
			.addChannelOption(o => o.setName('source').setDescription('Source channel to stop watching').addChannelTypes(ChannelType.GuildText).setRequired(true)),
		new SlashCommandBuilder()
			.setName('watch_list')
			.setDescription('List watched channels'),
		new SlashCommandBuilder()
			.setName('backfill')
			.setDescription('Fetch and archive old messages from a channel')
			.addChannelOption(o => o.setName('channel').setDescription('Channel to backfill').addChannelTypes(ChannelType.GuildText).setRequired(true))
			.addIntegerOption(o => o.setName('limit').setDescription('Number of messages to fetch (default 100, max 500)').setRequired(false))
	].map(c => c.toJSON());

	const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
	await rest.put(Routes.applicationCommands(clientId), { body: commands });
}

async function run() {
	// Requires Message Content intent enabled in the Developer Portal
	const discord = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

	discord.once('ready', async () => {
		console.log(`Discord bot logged in as ${discord.user?.tag}`);
		await registerCommands(discord.user!.id);
		console.log('Slash commands registered');
	});

	const mcp = await createMCPClient();

	discord.on('interactionCreate', async (interaction) => {
		if (!interaction.isChatInputCommand()) return;

		if (interaction.commandName === 'models') {
			await interaction.deferReply();
			try {
				const res = await mcp.callTool({ name: 'ollama_list_models', arguments: {} });
				const first = Array.isArray(res.content) ? res.content[0] : undefined;
				const text = first && first.type === 'text' ? first.text : 'No output';
				await interaction.editReply(text);
			} catch (err: any) {
				await interaction.editReply(`Error: ${err.message || String(err)}`);
			}
			return;
		}

		if (interaction.commandName === 'ask') {
			const prompt = interaction.options.getString('prompt', true);
			await interaction.deferReply();
			try {
				const res = await mcp.callTool({ name: 'ollama_generate', arguments: { model: 'tinyllama', prompt } });
				const first = Array.isArray(res.content) ? res.content[0] : undefined;
				const text = first && first.type === 'text' ? first.text : 'No output';
				await interaction.editReply(text.slice(0, 1800));
			} catch (err: any) {
				await interaction.editReply(`Error: ${err.message || String(err)}`);
			}
			return;
		}

		if (interaction.commandName === 'watch_add') {
			await interaction.deferReply({ ephemeral: true });
			const source = interaction.options.getChannel('source', true);
			const destination = interaction.options.getChannel('destination', true);
			if (source?.type !== ChannelType.GuildText || destination?.type !== ChannelType.GuildText) {
				await interaction.editReply('Both source and destination must be text channels.');
				return;
			}
			const cfg = await readWatchConfig();
			cfg[source.id] = destination.id;
			await writeWatchConfig(cfg);
			await interaction.editReply(`Watching <#${source.id}> → summarizing into <#${destination.id}>.`);
			return;
		}

		if (interaction.commandName === 'watch_remove') {
			await interaction.deferReply({ ephemeral: true });
			const source = interaction.options.getChannel('source', true);
			const cfg = await readWatchConfig();
			if (cfg[source.id]) {
				delete cfg[source.id];
				await writeWatchConfig(cfg);
				await interaction.editReply(`Stopped watching <#${source.id}>.`);
			} else {
				await interaction.editReply(`No watch found for <#${source.id}>.`);
			}
			return;
		}

		if (interaction.commandName === 'watch_list') {
			await interaction.deferReply({ ephemeral: true });
			const cfg = await readWatchConfig();
			if (!Object.keys(cfg).length) {
				await interaction.editReply('No channels are being watched.');
				return;
			}
			const lines = Object.entries(cfg).map(([src, dst]) => `<#${src}> → <#${dst}>`);
			await interaction.editReply(lines.join('\n'));
			return;
		}

		if (interaction.commandName === 'backfill') {
			await interaction.deferReply({ ephemeral: true });
			const channel = interaction.options.getChannel('channel', true) as TextChannel;
			const limit = Math.min(interaction.options.getInteger('limit') || 100, 500);

			try {
				await interaction.editReply(`Fetching up to ${limit} messages from <#${channel.id}>...`);
				
				let collected = 0;
				let lastId: string | undefined;
				
				while (collected < limit) {
					const batch = await channel.messages.fetch({ 
						limit: Math.min(100, limit - collected),
						...(lastId && { before: lastId })
					});
					
					if (batch.size === 0) break;
					
					for (const msg of batch.values()) {
						const data = {
							id: msg.id,
							channelId: msg.channelId,
							guildId: msg.guildId,
							author: { id: msg.author.id, username: msg.author.username, bot: msg.author.bot },
							content: msg.content,
							embeds: msg.embeds.map(e => ({ description: e.description, title: e.title })),
							timestamp: msg.createdTimestamp,
							url: msg.url
						};
						await archiveMessage(channel.id, data);
						collected++;
					}
					
					lastId = batch.last()?.id;
				}
				
				await interaction.editReply(`✅ Archived ${collected} messages from <#${channel.id}> to \`archived-messages/${channel.id}.jsonl\``);
			} catch (err: any) {
				await interaction.editReply(`Error: ${err.message || String(err)}`);
			}
			return;
		}
	});

	discord.on('messageCreate', async (message) => {
		// ignore bot messages
		if (message.author.bot || !message.guild) return;
		const cfg = await readWatchConfig();
		const destinationId = cfg[message.channelId];
		if (!destinationId) return;

		// Archive the message first
		try {
			const data = {
				id: message.id,
				channelId: message.channelId,
				guildId: message.guildId,
				author: { id: message.author.id, username: message.author.username, bot: message.author.bot },
				content: message.content,
				embeds: message.embeds.map(e => ({ description: e.description, title: e.title })),
				timestamp: message.createdTimestamp,
				url: message.url
			};
			await archiveMessage(message.channelId, data);
		} catch (err) {
			console.error('Archive error:', err);
		}

		// Extract text (content or first embed description)
		let text = message.content?.trim() || '';
		if (!text && message.embeds?.length && message.embeds[0].description) {
			text = message.embeds[0].description;
		}
		if (!text) return;

		// Limit text length for tiny models
		const snippet = text.slice(0, 1800);
		const prompt = `Summarize the following post for hardware-hacking research.
Return exactly these sections:
Summary (5 bullets)
BOM (part – purpose – approx cost if known)
Risks (safety/legal/ethics)
Next actions (3-5, specific)
Scores (Relevance/5, Actionability/5, Novelty/5)

Post:\n${snippet}`;

		try {
			const res = await mcp.callTool({ name: 'ollama_generate', arguments: { model: 'tinyllama', prompt } });
			const first = Array.isArray(res.content) ? res.content[0] : undefined;
			const summary = (first && first.type === 'text' ? first.text : 'No output').slice(0, 1800);
			const dest = message.guild.channels.cache.get(destinationId) as TextChannel | undefined;
			if (dest) {
				await dest.send(`Source: ${message.url}\n${summary}`);
			}
		} catch (err) {
			console.error('Auto-summary error:', err);
		}
	});

	await discord.login(DISCORD_TOKEN);
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
}); 