# Decision Log

This file records architectural and implementation decisions using a list format.
2025-04-08 09:11:44 - Log of updates made.

*

## Decision

*   [2025-04-08 09:17:55] - Replace Zod schema objects with standard JSON Schema object literals for the `inputSchema` field in the `ListToolsRequestSchema` handler within `src/index.ts`.

## Rationale

*   The MCP consumer (LibreChat) expects standard JSON Schema for tool definitions, specifically requiring `"type": "object"` at the root of the `inputSchema`. The current implementation uses Zod schema objects directly, causing validation errors (`Invalid literal value, expected "object"`). Using JSON Schema literals ensures compatibility.

## Implementation Details

*   Define two JSON Schema object literals corresponding to `SearchArgumentsSchema` and `LatestArticlesSchema`.
*   Modify the return value of the `ListToolsRequestSchema` handler in `src/index.ts` (lines 71-86) to use these literals for the `inputSchema` properties.
*   Keep using the Zod schemas (`SearchArgumentsSchema`, `LatestArticlesSchema`) for argument parsing within the `CallToolRequestSchema` handler (lines 196, 200).