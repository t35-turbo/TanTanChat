export type Messages = {
   id: string;
   role: "user" | "system" | "assistant";
   chatId: string;
   senderId: string;
   message: string;
   createdAt: Date;
}[]

export async function newMessage(messages: Messages) {
  let uuid = crypto.randomUUID();

  newCompletion(uuid, messages)
  subscriber(uuid);

  return uuid;
}

async function newCompletion(id: string, messages: Messages) {

}

async function subscriber(id: string) {

}