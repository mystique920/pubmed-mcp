import { Server } from '@modelcontextprotocol/sdk';
import axios from 'axios';

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DEFAULT_TOOL = 'pubmed-api';
const DEFAULT_EMAIL = 'default@example.com';
const RATE_LIMIT_DELAY = 334;

// Create an MCP server instance
const server = new Server({
  name: "pubmed",
  version: "1.0.0",
  capabilities: {
    tools: [
      {
        name: "search",
        description: "Search PubMed for research articles",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            maxResults: { type: "number" },
            filterOpenAccess: { type: "boolean" }
          },
          required: ["query"]
        }
      },
      {
        name: "getLatestArticles",
        description: "Get recent articles on a topic",
        inputSchema: {
          type: "object",
          properties: {
            topic: { type: "string" },
            days: { type: "number" },
            maxResults: { type: "number" }
          },
          required: ["topic"]
        }
      }
    ]
  }
});

// Implement the request handler
server.setRequestHandler(async (request) => {
  const { method, params } = request;

  switch (method) {
    case 'search':
      return await search(params);
    case 'getLatestArticles':
      return await getLatestArticles(params);
    default:
      throw new Error(`Unknown method: ${method}`);
  }
});

// Your existing PubMed functions
async function search({ query, maxResults = 10, filterOpenAccess = true, sort = 'relevance' }) {
  // ... (rest of your existing search function)
}

async function getLatestArticles({ topic, days = 30, maxResults = 10 }) {
  // ... (rest of your existing getLatestArticles function)
}

// Export the server
export default server;