import type { BetterAuthClientPlugin } from "better-auth/client";
import type { customAdmin } from "../../../src/lib/admin-plugin";

export const customAdminClient = () => {
  return {
    id: "custom-admin",
    $InferServerPlugin: {} as ReturnType<typeof customAdmin>,
  } satisfies BetterAuthClientPlugin;
};