#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Ollama API base URL
const OLLAMA_BASE_URL = 'http://localhost:11434';

class OllamaMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'ollama-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'ollama_generate',
          description: 'Generate text using Ollama models',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'The model to use (e.g., llama3.1)',
                default: 'llama3.1'
              },
              prompt: {
                type: 'string',
                description: 'The prompt to generate text from'
              },
              stream: {
                type: 'boolean',
                description: 'Whether to stream the response',
                default: false
              }
            },
            required: ['prompt']
          }
        },
        {
          name: 'ollama_list_models',
          description: 'List all available Ollama models',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'ollama_generate':
            return await this.handleGenerate(args);
          case 'ollama_list_models':
            return await this.handleListModels();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    });
  }

  private async handleGenerate(args: any) {
    const { model = 'llama3.1', prompt, stream = false } = args;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { response?: string };
    
    return {
      content: [
        {
          type: 'text',
          text: result.response || 'No response generated'
        }
      ]
    };
  }

  private async handleListModels() {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { models?: Array<{ name: string; size?: number }> };
    const models = result.models || [];
    
    const modelList = models.map((model: any) => 
      `• ${model.name} (${model.size ? this.formatBytes(model.size) : 'unknown size'})`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available Ollama models:\n${modelList || 'No models found'}`
        }
      ]
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ollama MCP server running on stdio');
  }
}

const server = new OllamaMCPServer();
server.run().catch(console.error); 