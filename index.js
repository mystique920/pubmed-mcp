const { MCPServer } = require('@rikachu225/pubmed-server');
const axios = require('axios');

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DEFAULT_TOOL = 'pubmed-api';
const DEFAULT_EMAIL = 'default@example.com';
const RATE_LIMIT_DELAY = 334;

class PubMedMCPServer extends MCPServer {
  constructor() {
    super();
    this.lastRequestTime = 0;
  }

  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  async searchPubMed({ query, maxResults = 10, filterOpenAccess = true, sort = 'relevance' }) {
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

  async fetchArticleDetails(ids) {
    await this.enforceRateLimit();
    try {
      const response = await axios.get(`${PUBMED_BASE_URL}/esummary.fcgi`, {
        params: {
          db: 'pubmed',
          id: ids.join(','),
          retmode: 'json',
          tool: DEFAULT_TOOL,
          email: DEFAULT_EMAIL
        }
      });

      const articles = [];
      const result = response.data.result;
      
      for (const id of ids) {
        const article = result[id];
        if (article) {
          articles.push({
            pmid: id,
            title: article.title,
            authors: article.authors?.map(author => author.name) || [],
            publicationDate: article.pubdate,
            journal: article.source,
            doi: article.elocationid?.replace('doi: ', '') || null,
            abstract: article.abstract || null,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
          });
        }
      }

      return articles;
    } catch (error) {
      console.error('PubMed fetch error:', error);
      throw new Error(`Failed to fetch article details: ${error.message}`);
    }
  }

  getDateFilter(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const formattedDate = date.toISOString().split('T')[0];
    return `"${formattedDate}"[Date - Publication] : "3000"[Date - Publication]`;
  }

  async getLatestArticles({ topic, days = 30, maxResults = 10 }) {
    const dateFilter = this.getDateFilter(days);
    const query = `${topic} AND ${dateFilter}`;
    return this.searchPubMed({ query, maxResults, sort: 'date' });
  }
}


module.exports = new PubMedMCPServer();