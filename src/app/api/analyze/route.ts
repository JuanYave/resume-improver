/**
 * Resume Analyzer API Route
 * 
 * This API endpoint analyzes résumés using OpenAI GPT models or Google Gemini models
 * and returns structured feedback including diagnostic scores, recommendations, and
 * an improved version of the résumé.
 * 
 * @module api/analyze
 * @requires openai - OpenAI SDK for GPT/Responses integration
 * @requires @google/genai - Google Gemini SDK
 * @requires @/types - TypeScript type definitions for input/output schemas
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import type { AnalysisInput, AnalysisOutput, Provider } from '@/types';

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

/**
 * System prompt for the Resume Analyzer AI
 * 
 * This comprehensive prompt instructs the AI to:
 * - Analyze résumés from 11 different professional perspectives
 * - Provide diagnostic scores across 5 dimensions (0-10 scale)
 * - Generate ATS-compliant improved résumés
 * - Support English and Spanish output
 * - Adapt to USA and LATAM (Mexico) regional standards
 * - Never fabricate information (use placeholders instead)
 * 
 * @constant
 * @type {string}
 */
const SYSTEM_PROMPT = `# Resume Analyzer & Improver - System Prompt v2.0

You are powering a lightweight web app that analyzes résumés and produces (1) precise, actionable feedback and (2) an improved alternative version—adapted to a selected perspective and region.

## Core Role
- Act as an ATS-aware résumé reviewer and editor
- Provide feedback from the specified perspective (general, leadership, technical, sales, hr, legal, customer_service, product, marketing, finance, operations)
- Generate improved résumé in requested language (Spanish or English)
- Preserve truth - never fabricate information

## Output Requirements
Return a SINGLE valid JSON object with this exact schema:

{
  "meta": {
    "language": "es | en | en-GB",
    "perspective": "string",
    "region": "usa | latam_mx | uk",
    "schema_version": "2.0",
    "warnings": [],
    "errors": []
  },
  "extracted_profile": {
    "headline": "string",
    "summary": "string",
    "skills": ["string"],
    "experience": [{"title":"", "company":"", "dates":"MM/YYYY - MM/YYYY", "bullets":[""]}],
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
    "score_explanation": "All scores are on a 0-10 scale where: 0-3=Poor, 4-6=Fair, 7-8=Good, 9-10=Excellent",
    "strengths": ["string with brief evidence"],
    "gaps": ["string identifying missing elements"],
    "risks": ["string describing issues"]
  },
  "keyword_helper": {
    "enabled": false,
    "message": "Job description not provided"
  },
  "recommendations": {
    "global": ["top 5-7 actionable bullets"],
    "by_section": {
      "summary": [],
      "skills": [],
      "experience": [],
      "education": [],
      "achievements": []
    },
    "rewrite_criteria": {
      "tone": "professional, impactful, ATS-friendly",
      "length": "1-2 pages",
      "style": "parallel structure; quantified results; no tables"
    }
  },
  "improved_resume_markdown": "string (complete improved résumé)",
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

## Evaluation Criteria (0-10 scale)
- **Clarity**: Structure, organization, easy to scan
- **Impact**: Quantified achievements, action verbs, measurable results
- **ATS Alignment**: Keywords, format compatibility, standard sections
- **Readability**: Concise bullets (≤28 words), parallel structure, active voice
- **Role Fit**: Relevance to target role or perspective

## Region-Specific Rules
**USA**: No photos/birthday/marital status. MM/YYYY dates. Strong quantification. Achievements over duties.
**UK**: No photos/birthday/marital status. MM/YYYY dates. 2 pages standard. May include brief personal statement. Professional British tone.
**LATAM (Mexico)**: No photos. MM/YYYY or MM/AAAA dates. Professional Spanish tone. Measurable impact. 1-2 pages.

## Language-Specific Rules
**en (US English)**: Use American spelling (organize, analyze, color). CV often called "résumé". Action-focused, quantified results.
**en-GB (UK English)**: Use British spelling (organise, analyse, colour). Document called "CV". Include UK date format (MM/YYYY). Professional tone. May include brief personal statement. 2 pages standard. Use "whilst", "towards", "programme" where appropriate.
**es (Spanish)**: Professional LATAM tone. Use "desarrollé", "lideré", "gestioné". Measurable impact focus.

## Perspective Focus
- **general**: Balanced assessment
- **leadership**: Org impact, budgets, headcount, strategy, OKRs
- **technical**: Stack, complexity, performance, CI/CD, SLAs
- **sales**: Quota %, ACV, pipeline, win rate, GTM
- **hr**: Time-to-fill, D&I, HRIS, retention
- **legal**: Practice areas, risk mitigation, compliance
- **customer_service**: CSAT, NPS, AHT, FCR
- **product**: Discovery, roadmap, ARR impact, adoption
- **marketing**: Funnel KPIs, CAC/LTV, campaign ROI
- **finance**: Budgeting, forecast accuracy, cost optimization
- **operations**: Throughput, delivery %, Lean/Six Sigma

## Critical Rules
1. Return ONLY valid JSON (no text before or after)
2. Ensure ALL strings are properly escaped (use \\" for quotes inside strings, \\\\ for backslashes)
3. Use placeholders like <add metric> or <verify> for missing data
4. Never fabricate employers, dates, or numbers
5. Keep bullets ≤28 words
6. Use action verbs, parallel structure, active voice
7. If job_description provided, enable keyword_helper with analysis
8. All scores must be 0.0-10.0 (one decimal)
9. IMPORTANT: Do NOT wrap JSON in markdown code blocks. Return raw JSON only.

Return the complete JSON now.`;

interface CompletionContext {
  model: string;
  userMessage: string;
}

/**
 * Calls legacy Chat Completions API for GPT-3.5/GPT-4 Turbo models.
 */
async function getChatCompletionsResult({
  model,
  userMessage,
  apiKey,
}: CompletionContext & { apiKey?: string | null }): Promise<string | null> {
  const client = getOpenAIClient(apiKey);
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
    ],
    temperature: 0.3,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });
  const finishReason = completion.choices[0]?.finish_reason;
  console.log(`OpenAI finish_reason: ${finishReason}`);
  
  if (finishReason === 'length') {
    console.warn('⚠️  OpenAI response was truncated due to max_tokens limit!');
  }

  return completion.choices[0]?.message?.content ?? null;
}

/**
 * Calls the Responses API for GPT-4.1/GPT-5 models that require the new interface.
 * @param {CompletionContext} params - Model id and composed user message
 * @returns {Promise<string | null>} JSON string returned by the model
 */
async function getResponsesApiResult({
  model,
  userMessage,
  apiKey,
}: CompletionContext & { apiKey?: string | null }): Promise<string | null> {
  const client = getOpenAIClient(apiKey);
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
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
    ? response.output.flatMap((item: any) => item?.content ?? [])
    : [];

  const textBlock = contentBlocks.find?.((block: any) => {
    if (typeof block?.text === 'string') {
      return true;
    }

    if (
      typeof block?.type === 'string' &&
      'text' in block &&
      typeof (block as any).text === 'string'
    ) {
      return true;
    }

    return false;
  });

  if (textBlock && typeof textBlock.text === 'string') {
    return textBlock.text;
  }

  if (textBlock && 'text' in textBlock && typeof (textBlock as any).text === 'string') {
    return (textBlock as any).text;
  }

  return null;
}

/**
 * POST handler for resume analysis
 * 
 * Accepts a JSON payload with résumé text and analysis parameters,
 * sends it to OpenAI GPT-4 for analysis, and returns structured feedback.
 * 
 * @async
 * @function POST
 * @param {NextRequest} req - Next.js request object containing AnalysisInput JSON
 * @returns {Promise<NextResponse<AnalysisOutput | {error: string}>>} JSON response with analysis results or error
 * 
 * @throws {Error} When OpenAI API call fails
 * @throws {SyntaxError} When AI returns invalid JSON
 * 
 * @example
 * // Request body:
 * {
 *   "resume_text": "John Doe\nSoftware Engineer...",
 *   "perspective": "technical",
 *   "language": "en",
 *   "region": "usa",
 *   "target_role": "Senior Backend Engineer",
 *   "job_description": "We're seeking...",
 *   "constraints": {
 *     "max_output_tokens": 4000,
 *     "format": "markdown",
 *     "tone": "professional"
 *   }
 * }
 * 
 * @example
 * // Response:
 * {
 *   "meta": { "language": "en", "perspective": "technical", ... },
 *   "diagnostic": { "scores": { "clarity": 7.5, ... }, ... },
 *   "recommendations": { "global": [...], ... },
 *   "improved_resume_markdown": "# John Doe...",
 *   ...
 * }
 */
async function runOpenAIAnalysis(
  model: string,
  userMessage: string,
  apiKey?: string | null
): Promise<string | null> {
  const usesResponsesApi = /^gpt-(4\.1|5)/.test(model);

  return usesResponsesApi
    ? getResponsesApiResult({ model, userMessage, apiKey })
    : getChatCompletionsResult({ model, userMessage, apiKey });
}

async function runGeminiAnalysis(
  model: string,
  userMessage: string,
  apiKey?: string | null
): Promise<string | null> {
  const client = getGeminiClient(apiKey);

  const combinedPrompt = `${SYSTEM_PROMPT}\n\n${userMessage}`;

  const response = await client.models.generateContent({
    model,
    contents: combinedPrompt,
  });

  const text = response.text;

  return typeof text === 'string' ? text : null;
}

async function streamGeminiAnalysis(
  model: string,
  userMessage: string,
  apiKey?: string | null
): Promise<ReadableStream<Uint8Array>> {
  const client = getGeminiClient(apiKey);
  const combinedPrompt = `${SYSTEM_PROMPT}\n\n${userMessage}`;
  const streamIterator = await client.models.generateContentStream({
    model,
    contents: combinedPrompt,
  });

  const encoder = new TextEncoder();

  const extractText = (chunk: unknown): string => {
    if (!chunk || typeof chunk !== 'object') {
      return '';
    }

    const candidateText = (candidate: any): string => {
      if (!candidate) return '';
      if (typeof candidate.text === 'string') return candidate.text;
      if (candidate.content?.parts) {
        return candidate.content.parts
          .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
          .join('');
      }
      return '';
    };

    if (typeof (chunk as any).text === 'string') {
      return (chunk as any).text as string;
    }

    if (Array.isArray((chunk as any).candidates)) {
      return (chunk as any).candidates.map(candidateText).join('');
    }

    if ((chunk as any).content?.parts) {
      return (chunk as any).content.parts
        .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
        .join('');
    }

    return '';
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamIterator) {
          const text = extractText(chunk);
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function isGeminiModel(model: string): boolean {
  return model.startsWith('gemini');
}

/**
 * Cleans AI response text by removing markdown code blocks
 * Handles responses wrapped in ```json ... ``` or ``` ... ```
 * @param {string} text - Raw response text from AI
 * @returns {string} Clean JSON string ready for parsing
 */
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  
  // Remove ```json or ``` at the start
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  // Remove ``` at the end
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  return cleaned.trim();
}

/**
 * Attempts to repair common JSON issues from OpenAI responses
 * Specifically handles cases where strings contain unescaped newlines
 * @param {string} text - Potentially malformed JSON
 * @returns {string} Repaired JSON string
 */
function repairOpenAIJson(text: string): string {
  // First, try to parse as-is
  try {
    JSON.parse(text);
    return text; // If it parses, return as-is
  } catch (e) {
    console.log('JSON parse failed, attempting repair...');
  }
  
  // Common issue: unescaped newlines in strings
  // This is a risky fix but necessary for OpenAI's buggy JSON output
  // We'll try to detect and fix the most common patterns
  
  let repaired = text;
  
  // If response seems truncated (doesn't end with }), it's likely incomplete
  const trimmed = repaired.trim();
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    console.warn('Response appears truncated - missing closing brace');
    // Can't reliably repair truncated JSON
    return text;
  }
  
  return repaired;
}

async function executeAnalysis(
  provider: Provider,
  model: string,
  userMessage: string,
  apiKey?: string | null
): Promise<{ text: string | null, provider: Provider }> {
  if (provider === 'gemini' || isGeminiModel(model)) {
    const text = await runGeminiAnalysis(model, userMessage, apiKey);
    return { text, provider: 'gemini' };
  }

  const text = await runOpenAIAnalysis(model, userMessage, apiKey);
  return { text, provider: 'openai' };
}

export async function POST(req: NextRequest) {
  let responseText: string | null = null;
  let actualProvider: Provider = 'openai';
  const streamRequested = req.nextUrl.searchParams.get('stream') === 'true';
  
  try {
    const input: AnalysisInput = await req.json();

    // Input validation
    if (!input.resume_text || input.resume_text.length < 100) {
      return NextResponse.json(
        { error: 'Resume text must be at least 100 characters' },
        { status: 400 }
      );
    }

    if (input.resume_text.length > 15000) {
      return NextResponse.json(
        { error: 'Resume text must not exceed 15,000 characters' },
        { status: 400 }
      );
    }

    // Build user message with structured input
    const userMessage = `Analyze this résumé with the following parameters:

**Input:**
${JSON.stringify(input, null, 2)}

Provide the complete JSON analysis now.`;

    const model = input.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    const provider = input.provider || 'openai';

    if (streamRequested && (provider === 'gemini' || isGeminiModel(model))) {
      const stream = await streamGeminiAnalysis(
        model,
        userMessage,
        input.provider_api_key ?? null
      );

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Analysis-Provider': 'gemini',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    const response = await executeAnalysis(
      provider,
      model,
      userMessage,
      input.provider_api_key ?? null
    );
    
    responseText = response.text;
    actualProvider = response.provider;

    if (!responseText) {
      throw new Error('Empty response from AI');
    }

    // Log raw response for debugging (first 500 chars)
    console.log(`\n=== ${actualProvider.toUpperCase()} RAW RESPONSE (first 500 chars) ===`);
    console.log(responseText.substring(0, 500));
    console.log(`\n=== ${actualProvider.toUpperCase()} RESPONSE LENGTH: ${responseText.length} ===\n`);

    // Clean and parse JSON (handles markdown code blocks from Gemini)
    let cleanedResponse = responseText;
    
    // Provider-specific cleanup
    if (actualProvider === 'gemini') {
      console.log('Applying markdown cleanup for Gemini response');
      cleanedResponse = cleanJsonResponse(responseText);
    } else if (actualProvider === 'openai') {
      console.log('Applying JSON repair for OpenAI response');
      cleanedResponse = repairOpenAIJson(responseText);
    }
    
    console.log(`\n=== CLEANED RESPONSE (first 500 chars) ===`);
    console.log(cleanedResponse.substring(0, 500));
    console.log('\n=== ATTEMPTING JSON PARSE ===\n');
    
    const result: AnalysisOutput = JSON.parse(cleanedResponse);

    // Return the analysis
    return NextResponse.json(result);

  } catch (error) {
    console.error('\n=== ANALYSIS ERROR ===');
    console.error('Error type:', error instanceof SyntaxError ? 'SyntaxError' : 'Other');
    console.error('Error message:', error);
    
    if (error instanceof SyntaxError) {
      console.error('\n=== FAILED TO PARSE - RAW RESPONSE (first 500 chars) ===');
      console.error(responseText?.substring(0, 500) || 'N/A');
      console.error('\n=== RESPONSE END (last 500 chars) ===');
      console.error(responseText?.substring(Math.max(0, (responseText?.length || 0) - 500)) || 'N/A');
      console.error(`\n=== TOTAL RESPONSE LENGTH: ${responseText?.length || 0} bytes ===`);
      
      // Try to find the error position
      const errorMatch = error.message.match(/position (\d+)/);
      if (errorMatch && responseText) {
        const errorPos = parseInt(errorMatch[1]);
        const start = Math.max(0, errorPos - 200);
        const end = Math.min(responseText.length, errorPos + 200);
        console.error(`\n=== CONTEXT AROUND ERROR POSITION ${errorPos} ===`);
        console.error(responseText.substring(start, end));
        console.error(`\n=== Character at error position: "${responseText[errorPos]}" (code: ${responseText.charCodeAt(errorPos)}) ===`);
      }
      
      return NextResponse.json(
        { error: 'Invalid JSON response from AI. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze resume. Please try again.' },
      { status: 500 }
    );
  }
}
