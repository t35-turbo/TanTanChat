import { z } from "zod/v4";

// Supported providers
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { FilePart, ImagePart, UserContent } from "ai";
import { BunFile } from "bun";

// Unsupported providers (commented out)
// import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
// import { createCerebras } from "@ai-sdk/cerebras";
// import { createCohere } from "@ai-sdk/cohere";
// import { createDeepInfra } from "@ai-sdk/deeplexity";
// import { createReplicate } from "@ai-sdk/replicate";
// import { createRevai } from "@ai-sdk/revai";
// import { createTogetherAI } from "@ai-sdk/togetherai";
// import { createVercel } from "@ai-sdk/vercel";
// import { createXai } from "@ai-sdk/xai";

// import { createAssemblyAI } from "@ai-sdk/assemblyai";
// import { createDeepgram } from "@ai-sdk/deepgram";
// import { createElevenLabs } from "@ai-sdk/elevenlabs";
// import { createGladia } from "@ai-sdk/gladia";
// import { createLMNT } from "@ai-sdk/lmnt";

const providers = [
  // Supported providers only
  "google",
  "anthropic",
  "openai",
  "openrouter",
  "mistral",
  "deepseek",
  "groq",

  // Unsupported providers (commented out)
  // "amazon-bedrock",
  // "cohere",
  // "google-vertex",
  // "groq",
  // "togetherai",
  // "cerebras",
  // "fireworks",
  // "replicate",
  // "perplexity",
  // "xai",
  // "vercel",
  // "deepinfra",
  // "elevenlabs",
  // "assemblyai",
  // "deepgram",
  // "gladia",
  // "lmnt",
  // "revai",
  // "azure",
  // "fal",
  // "luma",
  // "hume",
] as const;

export type Providers = (typeof providers)[number];

export const providerFriendlyNames: Record<Providers, string> = {
  // Supported providers only
  google: "Google Generative AI",
  anthropic: "Anthropic Claude",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  mistral: "Mistral AI",
  deepseek: "DeepSeek",
  groq: "Groq",

  // Unsupported providers (commented out)
  // "amazon-bedrock": "Amazon Bedrock",
  // cohere: "Cohere",
  // "google-vertex": "Google Vertex AI",
  // groq: "Groq",
  // togetherai: "Together AI",
  // cerebras: "Cerebras",
  // fireworks: "Fireworks AI",
  // replicate: "Replicate",
  // perplexity: "Perplexity",
  // xai: "xAI Grok",
  // vercel: "Vercel AI",
  // deepinfra: "DeepInfra",
  // elevenlabs: "ElevenLabs",
  // assemblyai: "AssemblyAI",
  // deepgram: "Deepgram",
  // gladia: "Gladia",
  // lmnt: "LMNT",
  // revai: "Rev.ai",
  // azure: "Azure OpenAI",
  // fal: "Fal",
  // luma: "Luma AI",
  // hume: "Hume AI",
} as const;

export const ProviderOptions = z.object({
  provider: z.enum(providers),
  baseURL: z.url().optional(),
  apiKey: z.string(),
  name: z.string().optional(),
});

export type ProviderOptions = z.infer<typeof ProviderOptions>;

export function build_provider(opts: ProviderOptions) {
  const commonHeaders = {
    "HTTP-Referer": "http://github.com/t35-turbo/TanTanChat",
    "X-Title": "TanTan Chat",
  };

  switch (opts.provider) {
    case "google":
      return createGoogleGenerativeAI({
        ...opts,
        headers: commonHeaders,
      });

    case "anthropic":
      return createAnthropic({
        ...opts,
        headers: commonHeaders,
      });

    case "openai":
      return createOpenAI({
        ...opts,
        headers: commonHeaders,
      });

    case "openrouter":
      return createOpenRouter({
        ...opts,
        headers: commonHeaders,
      });

    case "mistral":
      return createMistral({
        ...opts,
        headers: commonHeaders,
      });

    case "deepseek":
      return createDeepSeek({
        ...opts,
        headers: commonHeaders,
      });

    case "groq":
      return createGroq({
        ...opts,
        headers: commonHeaders,
      });

    // Unsupported providers (commented out)
    // case "amazon-bedrock":
    //   return createAmazonBedrock({
    //     ...opts,
    //   });

    // case "cohere":
    //   return createCohere({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "google-vertex":
    //   return createVertex({
    //     ...opts,
    //   });

    // case "togetherai":
    //   return createTogetherAI({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "cerebras":
    //   return createCerebras({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "fireworks":
    //   return createFireworks({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "replicate":
    //   return createReplicate({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "perplexity":
    //   return createPerplexity({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "xai":
    //   return createXai({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "vercel":
    //   return createVercel({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "deepinfra":
    //   return createDeepInfra({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // Speech/Audio providers (commented out)
    // case "elevenlabs":
    //   return createElevenLabs({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "assemblyai":
    //   return createAssemblyAI({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "deepgram":
    //   return createDeepgram({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "gladia":
    //   return createGladia({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "lmnt":
    //   return createLMNT({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "revai":
    //   return createRevai({
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "azure":
    //   return createOpenAI({
    //     name: "azure",
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "fal":
    //   return {
    //     name: "fal",
    //     baseURL: opts.baseURL || "https://api.fal.ai/v1",
    //     ...opts,
    //     headers: commonHeaders,
    //   };

    // case "luma":
    //   return createLuma({
    //     name: "luma",
    //     baseURL: opts.baseURL || "https://api.lumalabs.ai/v1",
    //     ...opts,
    //     headers: commonHeaders,
    //   });

    // case "hume":
    //   // Implementation would go here

    default:
      throw new Error(
        `Unsupported provider: ${opts.provider}. Only google, anthropic, openai, openrouter, mistral, deepseek, and groq are currently supported.`,
      );
  }
}

const FileMetadata = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  hash: z.string(),
  mime: z.string(),
  ownedBy: z.string(),
  onS3: z.boolean(),
  fileKey: z.string(),
  createdAt: z.date(),
});
type FileMetadata = z.infer<typeof FileMetadata>;

async function buildFileContent(file: BunFile, metadata: FileMetadata): Promise<UserContent[number]> {
  const buffer = await file.arrayBuffer();

  if (metadata.mime === "application/pdf") {
    return {
      type: "file",
      mediaType: metadata.mime,
      filename: metadata.filename,
      data: buffer,
    };
  } else if (metadata.mime.startsWith("image")) {
    return {
      type: "image",
      mediaType: metadata.mime,
      image: buffer,
    };
  } else if (metadata.mime.startsWith("text")) {
    return {
      type: "text",
      text: `The user uploaded a text file.
<file>
  <filename>${metadata.filename}</filename>
  <file_contents type="${metadata.mime}">
  ${await file.text()}
  </file_contents>
</file>`,
    };
  }
}
