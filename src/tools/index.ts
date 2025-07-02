import * as searchWebModule from "./searchWeb";

// -------------------- OpenAI Tool Definitions --------------------
export const tools = [
    searchWebModule.definition,
];

// -------------------- Runtime Mapping --------------------
export const TOOL_MAPPING = {
    searchWeb: searchWebModule.toolFunction,
} as const;

// -------------------- Runtime Execution Helper --------------------
export async function executeTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
        case "searchWeb":
            return TOOL_MAPPING.searchWeb(args);
        default:
            throw new Error(`Unknown tool function: ${toolName}`);
    }
}
