/**
 * Simple test function to verify tool-call mechanics.
 * Returns a static message with a current timestamp.
 */
export default async function testSearch(): Promise<{ message: string; timestamp: string }> {
    return {
        message: "This is a test search function",
        timestamp: new Date().toISOString(),
    };
}

// -------------------- OpenAI Tool Definition --------------------
export const definition = {
    type: "function" as const,
    function: {
        name: "testSearch",
        description: "A test function that returns a simple test message with timestamp",
        parameters: {
            type: "object",
            properties: {},
            required: [],
        },
    },
} as const; 