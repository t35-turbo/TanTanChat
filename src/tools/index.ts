import * as searchWebModule from "./searchWeb";
import * as getSiteContents from "./getSiteContents";

// -------------------- OpenAI Tool Definitions --------------------
export const tools = [searchWebModule.definition, getSiteContents.definition];

// -------------------- Runtime Mapping --------------------
export const TOOL_MAPPING = {
  searchWeb: searchWebModule.toolFunction,
  getSiteContents: getSiteContents.toolFunction,
} as const;

// -------------------- Runtime Execution Helper --------------------
export async function executeTool(toolName: string, args: any): Promise<any> {
  switch (toolName) {
    case "searchWeb":
      return TOOL_MAPPING.searchWeb(args);
    case "getSiteContents":
      return TOOL_MAPPING.getSiteContents(args);
    default:
      throw new Error(`Unknown tool function: ${toolName}`);
  }
}
