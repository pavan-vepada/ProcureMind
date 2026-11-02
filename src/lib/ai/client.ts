import OpenAI from "openai";

let client: OpenAI | null = null;

/** The only place the app talks to OpenAI. Server-side only; the key never reaches the browser. */
export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing. Add it to .env.local (see .env.example).");
  client ??= new OpenAI({ maxRetries: 2, timeout: 240_000 });
  return client;
}

export const aiModel = () => process.env.AI_MODEL || "gpt-5.5";

export const aiConfigured = () => Boolean(process.env.OPENAI_API_KEY);
