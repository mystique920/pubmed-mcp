import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DEFAULT_TOOL = 'pubmed-api';
const DEFAULT_EMAIL = 'default@example.com';
const RATE_LIMIT_DELAY = 334;
// Define Zod schemas for validation
const SearchArgumentsSchema = z.object({
    query: z.string(),
    maxResults: z.number().default(10),
    filterOpenAccess: z.boolean().default(true)
});
const LatestArticlesSchema = z.object({
    topic: z.string(),
    days: z.number().default(30),
    maxResults: z.number().default(10)
});
// Create server instance
const server = new Server({
    name: "pubmed",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search",
                description: "Search PubMed for research articles",
                inputSchema: SearchArgumentsSchema
            },
            {
                name: "getLatestArticles",
                description: "Get recent articles on a topic",
                inputSchema: LatestArticlesSchema
            }
        ]
    };
});
let lastRequestTime = 0;
async function enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
}
async function search({ query, maxResults = 10, filterOpenAccess = true }) {
    await enforceRateLimit();
    try {
        const searchQuery = filterOpenAccess ?
            `(${query}) AND ("open access"[Filter])` : query;
        const searchUrl = new URL(`${PUBMED_BASE_URL}/esearch.fcgi`);
        searchUrl.searchParams.append('db', 'pubmed');
        searchUrl.searchParams.append('term', searchQuery);
        searchUrl.searchParams.append('retmax', maxResults.toString());
        searchUrl.searchParams.append('retmode', 'json');
        searchUrl.searchParams.append('tool', DEFAULT_TOOL);
        searchUrl.searchParams.append('email', DEFAULT_EMAIL);
        const response = await fetch(searchUrl.toString());
        if (!response.ok)
            throw new Error(`PubMed search failed: ${response.statusText}`);
        const data = await response.json();
        const ids = data.esearchresult.idlist;
        if (!ids.length) {
            return { content: [{ type: "text", text: "No results found" }] };
        }
        const articles = await fetchArticleDetails(ids);
        const formattedArticles = articles.map(article => `Title: ${article.title}\n` +
            `Authors: ${article.authors.join(', ')}\n` +
            `Journal: ${article.journal}\n` +
            `Date: ${article.publicationDate}\n` +
            `URL: ${article.url}\n` +
            (article.abstract ? `Abstract: ${article.abstract}\n` : '') +
            '---\n').join('\n');
        return {
            content: [{
                    type: "text",
                    text: `Found ${articles.length} articles:\n\n${formattedArticles}`
                }]
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{
                    type: "text",
                    text: `Error searching PubMed: ${errorMessage}`
                }]
        };
    }
}
async function fetchArticleDetails(ids) {
    await enforceRateLimit();
    try {
        const summaryUrl = new URL(`${PUBMED_BASE_URL}/esummary.fcgi`);
        summaryUrl.searchParams.append('db', 'pubmed');
        summaryUrl.searchParams.append('id', ids.join(','));
        summaryUrl.searchParams.append('retmode', 'json');
        summaryUrl.searchParams.append('tool', DEFAULT_TOOL);
        summaryUrl.searchParams.append('email', DEFAULT_EMAIL);
        const response = await fetch(summaryUrl.toString());
        if (!response.ok)
            throw new Error(`Failed to fetch article details: ${response.statusText}`);
        const data = await response.json();
        return ids.map(id => {
            const article = data.result[id];
            return {
                pmid: id,
                title: article.title || 'No title',
                authors: article.authors?.map(author => author.name) || [],
                publicationDate: article.pubdate || 'No date',
                journal: article.source || 'No journal',
                abstract: article.abstract || null,
                url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
            };
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch article details: ${errorMessage}`);
    }
}
function getDateFilter(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const formattedDate = date.toISOString().split('T')[0];
    return `"${formattedDate}"[Date - Publication] : "3000"[Date - Publication]`;
}
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'search':
                const searchArgs = SearchArgumentsSchema.parse(args);
                return await search(searchArgs);
            case 'getLatestArticles':
                const { topic, days, maxResults } = LatestArticlesSchema.parse(args);
                const dateFilter = getDateFilter(days);
                const query = `${topic} AND ${dateFilter}`;
                return await search({ query, maxResults, filterOpenAccess: true }); // Added filterOpenAccess parameter
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Invalid arguments: ${error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ")}`);
        }
        throw error;
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("PubMed MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
