import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { SYSTEM_PROMPTS } from './prompts';

/**
 * Configuration options for the manuscript analysis engine.
 */
export interface AnalyzeManuscriptOptions {
  /** The raw text content of the manuscript */
  content: string;
  /** The specific lens through which the AI should review the text */
  mode?: 'critique' | 'summarize';
}

/**
 * Analyzes a manuscript using the designated LLM provider.
 * This function abstracts the provider logic away from the Next.js application.
 *
 * @param options - The manuscript content and the analysis mode.
 * @returns A promise resolving to the AI-generated text response.
 *
 * @example
 * ```ts
 * const summary = await analyzeManuscript({
 * content: "The brutalist architecture of Baghdad...",
 * mode: "summarize"
 * });
 * ```
 */
export async function analyzeManuscript({
  content,
  mode = 'critique',
}: AnalyzeManuscriptOptions): Promise<string> {
  const systemPrompt =
    mode === 'summarize'
      ? SYSTEM_PROMPTS.SUMMARIZER
      : SYSTEM_PROMPTS.LITERARY_CRITIC;

  // We utilize the Gemini Pro model via the edge-compatible Vercel AI SDK
  const { text } = await generateText({
    model: google('models/gemini-1.5-pro-latest'),
    system: systemPrompt,
    prompt: `Please review the following manuscript:\n\n${content}`,
    temperature: 0.4, // Keep it deterministic and academic
  });

  return text;
}
