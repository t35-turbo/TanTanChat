import searchGutenbergBooks, { definition as searchGutenbergBooksDefinition } from "./searchGutenbergBooks";
import testSearch, { definition as testSearchDefinition } from "./testSearch";
import searchWeb, { definition as searchWebDefinition } from "./searchWeb";

// -------------------- OpenAI Tool Definitions --------------------
export const tools = [
    searchGutenbergBooksDefinition,
    testSearchDefinition,
    searchWebDefinition,
] as const;

// -------------------- Runtime Mapping --------------------
export const TOOL_MAPPING = {
    searchGutenbergBooks,
    testSearch,
    searchWeb,
} as const;
