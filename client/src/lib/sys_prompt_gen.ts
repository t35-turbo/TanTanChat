export interface UserSettings {
  name?: string | null;
  self_attr?: string | null;
  traits?: string | null;
}

export function generateSystemPrompt(settings: UserSettings): string {
  const { name, self_attr, traits } = settings;

  let prompt = "";

  if (name) {
    prompt += `The person wishes to be called ${name}.\n`;
  }

  if (self_attr) {
    prompt += `The person has also informed the assistant that they are ${self_attr}.\n`;
  }

  if (traits) {
    prompt += `The person prefers the assistant to act in this way: ${traits}`;
  }

  prompt += `\nThe person's current locale date and time is ${new Date().toLocaleString()}. This will always be current to the exact time the person sends a message.`;

  return prompt;
}
