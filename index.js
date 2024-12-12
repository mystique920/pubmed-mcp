const axios = require('axios');

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DEFAULT_TOOL = 'pubmed-api';
const DEFAULT_EMAIL = 'default@example.com';
const RATE_LIMIT_DELAY = 334;

class PubMedServer {
  constructor() {
    this.lastRequestTime = 0;
  }

  // Required MCP method
  async handleRequest(request) {
    const { method, params } = request;
    
    switch (method) {
      case 'search':
        return await this.search(params);
      case 'getLatestArticles':
        return await this.getLatestArticles(params);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // Rest of your existing methods stay the same
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  async search({ query, maxResults = 10, filterOpenAccess = true, sort = 'relevance' }) {
    await this.enforceRateLimit();
    try {
      const searchQuery = filterOpenAccess ? 
        `(${query}) AND ("open access"[Filter])` : query;

      const response = await axios.get(`${PUBMED_BASE_URL}/esearch.fcgi`, {
        params: {
          db: 'pubmed',
          term: searchQuery,
          retmax: maxResults,
          sort: sort,
          retmode: 'json',
          tool: DEFAULT_TOOL,
          email: DEFAULT_EMAIL
        }
      });

      const ids = response.data.esearchresult.idlist;
      if (!ids.length) {
        return { results: [], total: 0 };
      }

      const articles = await this.fetchArticleDetails(ids);
      return {
        results: articles,
        total: parseInt(response.data.esearchresult.count)
      };
    } catch (error) {
      console.error('PubMed search error:', error);
      throw new Error(`Failed to search PubMed: ${error.message}`);
    }
  }

  // ... rest of your existing methods ...
}

// Export as both MCP server and regular module
module.exports = new PubMedServer();