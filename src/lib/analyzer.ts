import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import type {
  AnalysisInput,
  Provider,
  AnalysisPhaseResult,
  RewritePhaseResult,
} from '@/types';

function getOpenAIClient(apiKey?: string | null) {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('Missing OpenAI API key');
  }
  return new OpenAI({ apiKey: key });
}

function getGeminiClient(apiKey?: string | null) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Missing Google Gemini API key');
  }
  return new GoogleGenAI({ apiKey: key });
}

export function isGeminiModel(model: string): boolean {
  return model.startsWith('gemini');
}

export const ANALYSIS_PHASE_PROMPT = `# Resume Analyzer – Analysis Phase v2.0

You evaluate résumés and produce a succinct diagnostic JSON. Focus on accuracy and ATS alignment.

## Output JSON (analysis phase)
{
  "meta": {
    "language": "es | en | en-GB",
    "perspective": "string",
    "region": "usa | latam_mx | uk",
    "schema_version": "2.0",
    "warnings": ["string"],
    "errors": ["string"]
  },
  "extracted_profile": {
    "headline": "string",
    "summary": "string",
    "skills": ["string"],
    "experience": [{"title":"", "company":"", "dates":"MM/YYYY - MM/YYYY", "bullets":["string (≤28 words)"]}],
    "education": [{"degree":"", "institution":"", "dates":""}],
    "certifications": ["string"],
    "achievements": ["string"]
  },
  "diagnostic": {
    "scores": {
      "clarity": 0.0,
      "impact": 0.0,
      "ats_alignment": 0.0,
      "readability": 0.0,
      "role_fit": 0.0
    },
    "score_explanation": "string",
    "strengths": ["string"],
    "gaps": ["string"],
    "risks": ["string"]
  },
  "keyword_helper": {
    "enabled": false,
    "message": "string",
    "missing_keywords": ["string"],
    "integration_suggestions": ["string"]
  },
  "recommendations": {
    "global": ["string"],
    "by_section": {
      "summary": ["string"],
      "skills": ["string"],
      "experience": ["string"],
      "education": ["string"],
      "achievements": ["string"]
    },
    "rewrite_criteria": {
      "tone": "string",
      "length": "string",
      "style": "string"
    }
  }
}

## Rules
- Never fabricate information; prefer placeholders like <add metric>.
- Limit arrays to the most impactful 5-7 items.
- Keep bullets ≤28 words and use action verbs.
- Respect language, region, and perspective constraints.
- Return raw JSON only (no markdown fences).
`;

export const REWRITE_PHASE_PROMPT = `# Resume Analyzer – Rewrite Phase v2.0

You craft improved résumés based on diagnostics already produced. Focus on clarity, impact, and ATS compliance.

## Output JSON (rewrite phase)
{
  "improved_resume_markdown": "string (complete résumé in markdown)",
  "changelog": [
    {
      "section": "string",
      "change_type": "added | removed | modified | restructured",
      "description": "string",
      "original": "string",
      "improved": "string"
    }
  ],
  "next_steps": ["string"]
}

## Rules
- Preserve factual accuracy; use placeholders for missing data.
- Markdown must be ATS-friendly: no tables, use headings and bullet lists.
- Align tone and style with the provided rewrite criteria.
- Return raw JSON only (no markdown fences).
`;

export type AnalysisPhaseResponse = AnalysisPhaseResult;
export type RewritePhaseResponse = RewritePhaseResult;

export type PhaseLabel = 'analysis' | 'rewrite';

export class PhaseParseError extends Error {
  phase: PhaseLabel;
  provider: Provider;
  raw: string;
  cleaned: string;
  originalError: Error;

  constructor(params: { phase: PhaseLabel; provider: Provider; raw: string; cleaned: string; originalError: Error }) {
    super(`Failed to parse ${params.phase} phase response: ${params.originalError.message}`);
    this.name = 'PhaseParseError';
    this.phase = params.phase;
    this.provider = params.provider;
    this.raw = params.raw;
    this.cleaned = params.cleaned;
    this.originalError = params.originalError;
  }
}

interface CompletionContext {
  model: string;
  userMessage: string;
  systemPrompt: string;
}

async function getChatCompletionsResult({
  model,
  userMessage,
  systemPrompt,
  apiKey,
}: CompletionContext & { apiKey?: string | null }): Promise<string | null> {
  const client = getOpenAIClient(apiKey);
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });
  return completion.choices[0]?.message?.content ?? null;
}

async function getResponsesApiResult({
  model,
  userMessage,
  systemPrompt,
  apiKey,
}: CompletionContext & { apiKey?: string | null }): Promise<string | null> {
  const client = getOpenAIClient(apiKey);
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: systemPrompt }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: userMessage }],
      },
    ],
    max_output_tokens: 8000,
  });

  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  const contentBlocks = Array.isArray(response.output)
    ? response.output.flatMap((item: unknown) => (typeof item === 'object' && item !== null ? (item as { content?: unknown }).content ?? [] : []))
    : [];

  const textBlock = contentBlocks.find?.((block) => {
    if (typeof (block as { text?: unknown })?.text === 'string') {
      return true;
    }

    if (
      typeof (block as { type?: unknown })?.type === 'string' &&
      typeof (block as { text?: unknown }).text === 'string'
    ) {
      return true;
    }

    return false;
  });

  if (textBlock && typeof (textBlock as { text?: unknown }).text === 'string') {
    return (textBlock as { text: string }).text;
  }

  if (textBlock && typeof (textBlock as { text?: unknown }).text === 'string') {
    return (textBlock as { text: string }).text;
  }

  return null;
}

async function runOpenAIAnalysis(
  model: string,
  userMessage: string,
  systemPrompt: string,
  apiKey?: string | null
): Promise<string | null> {
  const usesResponsesApi = /^gpt-(4\.1|5)/.test(model);

  return usesResponsesApi
    ? getResponsesApiResult({ model, userMessage, systemPrompt, apiKey })
    : getChatCompletionsResult({ model, userMessage, systemPrompt, apiKey });
}

async function runGeminiAnalysis(
  model: string,
  userMessage: string,
  systemPrompt: string,
  apiKey?: string | null
): Promise<string | null> {
  const client = getGeminiClient(apiKey);

  const combinedPrompt = `${systemPrompt}\n\n${userMessage}`;

  const response = await client.models.generateContent({
    model,
    contents: combinedPrompt,
  });

  const text = response.text;

  return typeof text === 'string' ? text : null;
}

async function invokeModel(
  provider: Provider,
  model: string,
  userMessage: string,
  systemPrompt: string,
  apiKey?: string | null
): Promise<{ text: string | null; provider: Provider }> {
  if (provider === 'gemini' || isGeminiModel(model)) {
    const text = await runGeminiAnalysis(model, userMessage, systemPrompt, apiKey);
    return { text, provider: 'gemini' };
  }

  const text = await runOpenAIAnalysis(model, userMessage, systemPrompt, apiKey);
  return { text, provider: 'openai' };
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

function repairOpenAIJson(text: string): string {
  try {
    JSON.parse(text);
    return text;
  } catch (error) {
    console.log('JSON parse failed, attempting repair...');
  }

  const trimmed = text.trim();
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    console.warn('Response appears truncated - missing closing brace');
    return text;
  }

  return trimmed;
}

function normalizePhaseResponse(provider: Provider, rawText: string): string {
  if (!rawText) {
    return rawText;
  }

  if (provider === 'gemini') {
    return cleanJsonResponse(rawText);
  }

  if (provider === 'openai') {
    return repairOpenAIJson(rawText);
  }

  return rawText.trim();
}

interface RunPhaseParams {
  phase: PhaseLabel;
  provider: Provider;
  model: string;
  systemPrompt: string;
  userMessage: string;
  apiKey?: string | null;
}

export async function runPhase<TPhaseResult>(params: RunPhaseParams): Promise<{ data: TPhaseResult; provider: Provider }> {
  const { phase, provider, model, systemPrompt, userMessage, apiKey } = params;

  const { text, provider: actualProvider } = await invokeModel(provider, model, userMessage, systemPrompt, apiKey);

  if (!text) {
    throw new Error(`Empty ${phase} phase response from ${actualProvider}`);
  }

  const cleaned = normalizePhaseResponse(actualProvider, text);

  try {
    const parsed = JSON.parse(cleaned) as TPhaseResult;
    return { data: parsed, provider: actualProvider };
  } catch (error) {
    if (error instanceof Error) {
      throw new PhaseParseError({
        phase,
        provider: actualProvider,
        raw: text,
        cleaned,
        originalError: error,
      });
    }

    throw error;
  }
}

export function buildAnalysisPhaseMessage(input: AnalysisInput): string {
  const payload = {
    resume_text: input.resume_text,
    perspective: input.perspective,
    language: input.language,
    region: input.region,
    target_role: input.target_role ?? null,
    job_description: input.job_description ?? null,
  };

  return `Analyze the following résumé and produce the analysis phase JSON. Keep the response concise and strictly follow the schema.\n\n${JSON.stringify(payload, null, 2)}`;
}

export function buildRewritePhaseMessage(
  input: AnalysisInput,
  analysis: AnalysisPhaseResponse
): string {
  const context = {
    perspective: input.perspective,
    language: input.language,
    region: input.region,
    target_role: input.target_role ?? null,
    rewrite_criteria: analysis.recommendations.rewrite_criteria,
    diagnostic: analysis.diagnostic,
    extracted_profile: analysis.extracted_profile,
    recommendations: analysis.recommendations,
  };

  return `Using the existing diagnostic data, craft the improved résumé in markdown and document a changelog. Preserve factual accuracy and use placeholders for missing data.\n\n## Diagnostic JSON\n${JSON.stringify(context, null, 2)}\n\n## Original Résumé\n${input.resume_text}`;
}
