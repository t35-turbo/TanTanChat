import { db } from "../db";

type MessageSendParams = {
  type: "email";
  to: string;
  subject: string;
  message: string; // HTML string
};

/**
 * Central router for email or text etc sending
 */
export async function sendMessage(params: MessageSendParams): Promise<boolean> {
  const { email_provider } = (await db.query.system_settings.findFirst({ columns: { email_provider: true } })) ?? {
    email_provider: "none",
  };

  switch (email_provider) {
    case "none":
      return await noEmail(params);
    default:
      throw new Error(`Unknown email provider: ${email_provider}`);
  }
}

async function noEmail(_params: MessageSendParams) {
  return true;
}
