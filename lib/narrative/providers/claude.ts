import Anthropic from '@anthropic-ai/sdk';
import type { NarrativeProvider } from '../provider';
import type { NarrativeInput } from '../types';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompts/recommendation-narrative.v2';

/**
 * Model choice: this is a narrow, closed-input phrasing task — not
 * reasoning — so a fast, inexpensive model is the right fit rather than
 * the largest available one. If tone quality ever proves insufficient,
 * this is a one-line change (Executive Intelligence Platform, "Model
 * Selection is invisible to the user") — never a re-architecture, because
 * everything downstream only depends on the NarrativeProvider interface.
 */
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 400;
const TIMEOUT_MS = 8_000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured.');
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS });
  }
  return client;
}

/** Strips a stray ```json fence if the model adds one despite instructions not to. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

export const claudeNarrativeProvider: NarrativeProvider = {
  id: 'claude:' + MODEL,
  async generate(input: NarrativeInput): Promise<unknown> {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
    if (!textBlock) {
      throw new Error('Narrative provider returned no text content.');
    }

    return JSON.parse(stripCodeFence(textBlock.text));
  },
};
