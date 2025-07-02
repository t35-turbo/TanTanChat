export type Book = {
    id: number;
    title: string;
    authors: any[];
};

/**
 * Search for books in the Project Gutenberg catalogue that match the provided search terms.
 *
 * @param searchTerms - An array of keywords to search for (e.g. ['dickens', 'great']).
 * @returns A list of matching books with their basic metadata.
 */
export default async function searchGutenbergBooks(searchTerms: string[]): Promise<Book[]> {
    const searchQuery = searchTerms.join(" ");
    const url = "https://gutendex.com/books";

    const response = await fetch(`${url}?search=${encodeURIComponent(searchQuery)}`);
    if (!response.ok) {
        throw new Error(`Gutenberg search failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.results.map((book: any) => ({
        id: book.id,
        title: book.title,
        authors: book.authors,
    }));
}

// -------------------- OpenAI Tool Definition --------------------
export const definition = {
    type: "function" as const,
    function: {
        name: "searchGutenbergBooks",
        description:
            "Search for books in the Project Gutenberg library based on specified search terms",
        parameters: {
            type: "object",
            properties: {
                search_terms: {
                    type: "array",
                    items: { type: "string" },
                    description:
                        "List of search terms to find books in the Gutenberg library (e.g. ['dickens', 'great'] to search for books by Dickens with 'great' in the title)",
                },
            },
            required: ["search_terms"],
        },
    },
} as const; 