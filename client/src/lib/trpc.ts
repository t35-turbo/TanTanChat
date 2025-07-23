import { createTRPCContext, createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { createTRPCClient, httpBatchLink, httpLink, isNonJsonSerializable, splitLink } from "@trpc/client";
import type { AppRouter } from "../../../src/index";
import { QueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";

export const queryClient = new QueryClient();

export const url = "/trpc";
export const __client = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => isNonJsonSerializable(op.input),
      true: httpLink({
        url,
        transformer: {
          serialize: (data) => data,
          deserialize: superjson.deserialize,
        },
      }),
      false: httpBatchLink({
        url,
        transformer: superjson,
      }),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: __client,
  queryClient,
});

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

// Type exports
export type { AppRouter } from "../../../src/index";
export type RouterOutput = inferRouterOutputs<AppRouter>;
export type Chat = RouterOutput["chats"]["listThreads"][0];
export type Message = RouterOutput["chats"]["threadHistory"][0];
