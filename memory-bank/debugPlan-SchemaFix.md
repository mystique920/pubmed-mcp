# Debugging Plan: MCP Tool Schema Fix (2025-04-08)

This document outlines the plan to fix the MCP tool schema validation error encountered when loading the `pubmed-mcp-server` in environments like LibreChat.

## 1. Problem Analysis

*   **Symptom:** Error logs from LibreChat show `Invalid literal value, expected "object"` at path `tools[...].inputSchema.type` when attempting to load the `pubmed-mcp` server.
*   **Root Cause:** The server's `src/index.ts` currently defines tools (`search`, `getLatestArticles`) in the `ListToolsRequestSchema` handler (lines 71-86) by assigning Zod schema objects (`SearchArgumentsSchema`, `LatestArticlesSchema`) directly to the `inputSchema` property.
*   **Issue:** MCP consumers expect standard JSON Schema objects for `inputSchema`, specifically requiring `"type": "object"` at the root. Providing Zod objects directly causes schema validation failure on the consumer side.

## 2. Proposed Solution

Replace the Zod schema variables used in the `ListToolsRequestSchema` handler's return value with equivalent standard JSON Schema object literals. This ensures the server advertises its tool capabilities in a format compliant with the MCP specification.

The Zod schemas will still be used within the `CallToolRequestSchema` handler (lines 190+) for parsing and validating the *actual* arguments received during a tool call.

## 3. Implementation Steps

1.  **Define JSON Schema Literals:** Create the following standard JSON Schema object literals:

    *   **For `search` tool:**
        ```json
        {
          "type": "object",
          "properties": {
            "query": { 
              "type": "string", 
              "description": "The search query for PubMed." 
            },
            "maxResults": { 
              "type": "number", 
              "description": "Maximum number of results to return (default: 10)." 
            },
            "filterOpenAccess": { 
              "type": "boolean", 
              "description": "Filter for open access articles only (default: true)." 
            }
          },
          "required": ["query"]
        }
        ```

    *   **For `getLatestArticles` tool:**
        ```json
        {
          "type": "object",
          "properties": {
            "topic": { 
              "type": "string", 
              "description": "The topic to search for recent articles." 
            },
            "days": { 
              "type": "number", 
              "description": "How many past days to include (default: 30)." 
            },
            "maxResults": { 
              "type": "number", 
              "description": "Maximum number of results to return (default: 10)." 
            }
          },
          "required": ["topic"]
        }
        ```

2.  **Modify `src/index.ts`:** Update the `ListToolsRequestSchema` handler (code block starting around line 71) to use these JSON Schema literals for the `inputSchema` fields, instead of `SearchArgumentsSchema` and `LatestArticlesSchema`.

## 4. Diagram (Corrected Flow)

```mermaid
sequenceDiagram
    participant Consumer as LibreChat (MCP Consumer)
    participant Server as pubmed-mcp (MCP Server)
    participant Zod
    participant JsonSchema as JSON Schema Literal

    Consumer->>Server: ListTools Request
    Server-->>JsonSchema: Use JSON Schema Literals (Proposed Fix)
    JsonSchema-->>Server: Return JSON Schema Objects
    Server-->>Consumer: Return Tool List with JSON Schema Objects as inputSchema
    Consumer->>Consumer: Validate inputSchema as JSON Schema
    Consumer->>Consumer: Validation Succeeds

    Consumer->>Server: CallTool Request (with args)
    Server->>Zod: Parse args using Zod Schema
    Zod-->>Server: Return parsed args (or validation error)
    Server->>Server: Execute tool logic with parsed args
    Server-->>Consumer: Return Tool Result