# PubMed MCP Server (@mystique920/pubmed-mcp)

An MCP server providing tools to search PubMed (including non-open access articles by default) and retrieve article details via the E-utilities API. 

## Features

- Search PubMed database for research articles (`search` tool).
- Get recent articles on a specific topic (`getLatestArticles` tool).
- Optionally filter search results for open access content.
- Retrieve article details including title, authors, journal, date, and abstract (when available).
- Built-in rate limiting for API compliance (approximates NCBI guidelines).

## Installation

```bash
npm install @mystique920/pubmed-mcp
```
## LibreChat Integration (Docker)

For users running LibreChat via Docker Compose, follow these steps to integrate this local MCP server:

1.  **Clone the Repository:**
    Clone this repository to a location accessible by your Docker daemon (e.g., alongside your LibreChat `docker-compose.yaml`).
    ```bash
    git clone https://github.com/mystique920/pubmed-mcp.git
    cd pubmed-mcp
    ```

2.  **Install Dependencies & Build:**
    Install the necessary Node.js packages and compile the TypeScript code.
    ```bash
    npm install
    npm run build
    ```
    This creates the `build/index.js` file needed to run the server.

3.  **Configure Docker Compose:**
    Edit your LibreChat `docker-compose.yaml` file. Add a volume mount to the `librechat` service to make the server's code available inside the container:
    ```yaml
    services:
      librechat:
        # ... other service configurations ...
        volumes:
          - ./pubmed-mcp:/app/mcp_servers/pubmed-mcp # Mount local dir to container path
          # ... other volumes ...
    ```
    *(Adjust the local path `./pubmed-mcp` if you cloned the repository elsewhere relative to your `docker-compose.yaml`)*

4.  **Configure LibreChat MCP:**
    Define the MCP server in your `librechat.yaml` file. Set the `type` to `local` and provide the `command` and `args` to execute the built JavaScript file using `node`:

    *Example `librechat.yaml` configuration:*
    ```yaml
    mcp:
      servers:
        - name: "pubmed-mcp" # This name must match the volume mount directory name
          type: "local"
          command: "node"
          args:
            - /app/mcp_servers/pubmed-mcp/build/index.js
        # ... potentially other servers ...
    ```
    *(Ensure the `name` here matches the target directory name used in the volume mount in step 3, e.g., `pubmed-mcp`)*.

5.  **Restart LibreChat:**
    Apply the changes by restarting your LibreChat stack.
    ```bash
    docker compose up -d --force-recreate
    ```

The `pubmed-mcp` server should now be available within LibreChat.


## Usage (Conceptual MCP Client Interaction)

This server provides tools callable via the Model Context Protocol. A client would interact like this:

**Example 1: Get latest articles on a topic (defaults to open access)**
```json
{
  "tool_name": "getLatestArticles",
  "arguments": {
    "topic": "machine learning",
    "days": 30,
    "maxResults": 5
  }
}
```

**Example 2: Search for articles (open access filter off by default)**
```json
{
  "tool_name": "search",
  "arguments": {
    "query": "cancer treatment",
    "maxResults": 20
  }
}
```

**Example 3: Search for open access articles**
```json
{
  "tool_name": "search",
  "arguments": {
    "query": "covid vaccine efficacy",
    "maxResults": 15,
    "filterOpenAccess": true
  }
}
```

## Tools Reference

### `search`
Search for articles using PubMed E-utilities.
- `query` (string, required): Search terms.
- `maxResults` (number, optional, default: 10): Maximum number of results.
- `filterOpenAccess` (boolean, optional, default: false): Whether to filter for open access content using `open access[filter]`.

### `getLatestArticles`
Get recent articles on a topic (defaults to searching open access).
- `topic` (string, required): Search topic.
- `days` (number, optional, default: 30): Number of past days to include in the date range filter.
- `maxResults` (number, optional, default: 10): Maximum number of results.

## Rate Limiting

The server implements automatic rate limiting (approx. 3 requests per second) to comply with NCBI's E-utilities guidelines.

## Acknowledgements

This project was originally derived from the `@rikachu225/pubmed-server` package.

## License

ISC
