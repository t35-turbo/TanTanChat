export interface UserSettings {
  name?: string;
  selfAttr?: string;
  traits?: string;
}

export function generateSystemPrompt(settings: UserSettings): string {
  const { name, selfAttr, traits } = settings;

  let prompt = "";

  if (name) {
    prompt += `The person wishes to be called ${name}.\n`;
  }

  if (selfAttr) {
    prompt += `The person has also informed the assistant that they are ${selfAttr}.\n`;
  }

  if (traits) {
    prompt += `The person perfers the assistant to act in this way: ${traits}`;
  }

  prompt += `\nThe person's date and time is ${new Date().toLocaleString()}. This will always be current to the exact time the person sends a message.`;

  return prompt;
}
