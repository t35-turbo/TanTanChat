import { allowedRoles } from "./db";

export function normaliseToolCalls(tool_calls?: any[] | null) {
    if (!tool_calls) return null;
    return tool_calls.map((tc) => ({
        ...tc,
        function: {
            ...tc.function,
            arguments:
                typeof tc.function.arguments === "string"
                    ? tc.function.arguments
                    : JSON.stringify(tc.function.arguments),
        },
    }));
}

export function safeRole(role: string): (typeof allowedRoles)[number] {
    const idx = (allowedRoles as readonly string[]).indexOf(role);
    if (idx !== -1) {
        return allowedRoles[idx];
    }
    console.warn(`Invalid role: ${role}, defaulting to 'assistant'`);
    return "assistant";
} 