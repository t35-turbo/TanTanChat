/**
 * Search the web for information using the Exa search API.
 *
 * @param query - The textual query to search for.
 * @param numResults - Number of top-level results to return.
 * @param links - Number of links to attach to each result.
 * @param includeSubpages - Number of sub-pages to fetch for each result.
 * @param fullPageText - When true, include full page text in the payload.
 * @param imageLinks - Number of image links to retrieve.
 * @param summary - Whether to include a summary of each result.
 *
 * @returns Whatever payload Exa returns – currently the `context` field.
 */
import Exa from "exa-js";
import { z } from "zod/v4";

// -------------------- Types --------------------
export interface SearchWebArgs {
  /** The search query string. */
  query: string;
  /** The number of search results to return (default: 3). */
  numResults?: number;
  /** The number of links to include for each result (default: 1). */
  links?: number;
  /** The number of subpages to include for each result (default: 0). */
  includeSubpages?: number;
  /** Whether to return the full page text of the results (default: false). */
  fullPageText?: boolean;
  /** The number of image links to include for each result (default: 0). */
  imageLinks?: number;
  /** Whether to return a summary of the results (default: false). */
  summary?: boolean;
}

// Zod schema to validate and supply defaults
const searchWebArgsSchema = z.object({
  query: z.string(),
  numResults: z.number().int().positive().max(100).default(3),
  links: z.number().int().nonnegative().default(1),
  includeSubpages: z.number().int().nonnegative().default(0),
  fullPageText: z.boolean().default(false),
  imageLinks: z.number().int().nonnegative().default(0),
  summary: z.boolean().default(false),
});

export async function toolFunction(rawArgs: SearchWebArgs): Promise<any> {
  // Validate and enrich args with defaults
  const {
    query,
    numResults,
    links,
    includeSubpages,
    fullPageText, // @deprecated Use getSiteContents instead
    imageLinks,
    summary,
  } = searchWebArgsSchema.parse(rawArgs);

  const exa = new Exa(process.env.EXASEARCH_API_KEY || "");
  const result = await exa.searchAndContents(query, {
    context: true,
    subpages: includeSubpages,
    numResults,
    extras: {
      links,
      imageLinks,
    },
    summary: summary ? true : undefined,
    text: fullPageText ? true : undefined,
  });

  return result.context;
}

// -------------------- OpenAI Tool Definition --------------------
export const definition = {
  type: "function" as const,
  function: {
    name: "searchWeb",
    description:
      "Searches the web for information using Exa, a powerful search API. Can retrieve summaries, links, full page text, and image links.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query string.",
        },
        numResults: {
          type: "number",
          description: "The number of search results to return (default: 3).",
          default: 3,
        },
        links: {
          type: "number",
          description:
            "The number of links to include for each result (default: 1). If you need more links, set this to a higher number.",
          default: 1,
        },
        includeSubpages: {
          type: "number",
          description: "The number of subpages to include for each result (default: 0).",
          default: 0,
        },
        fullPageText: {
          type: "boolean",
          description:
            "Whether to return the full page text of the results (default: false). Use True if you need full page contents. **DEPRECATED**: Use getSiteContents tool instead for better content retrieval.",
          default: false,
        },
        imageLinks: {
          type: "number",
          description:
            "The number of image links to include for each result (default: 0). If performing image search set this to AT LEAST 5 or more (you are not penalized for doing so), to ensure you grab relevant results",
          default: 0,
        },
        summary: {
          type: "boolean",
          description: "Whether to return a summary of the results (default: false).",
          default: false,
        },
      },
      required: ["query"],
    },
  },
} as const;
