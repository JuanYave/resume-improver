/**
 * Resume Rewrite API Route
 * 
 * This API endpoint takes analysis results and generates an improved
 * version of the résumé based on the diagnostic data.
 * 
 * @module api/rewrite
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { AnalysisInput, AnalysisPhaseResult, Provider } from '@/types';
import {
  REWRITE_PHASE_PROMPT,
  buildRewritePhaseMessage,
} from '@/lib/analyzer';

interface RewriteInput {
  resume_text: string;
  analysis: AnalysisPhaseResult;
  perspective: AnalysisInput['perspective'];
  language: AnalysisInput['language'];
  region: AnalysisInput['region'];
  provider: Provider;
  model: string;
  provider_api_key?: string | null;
  target_role?: string | null;
}

/**
 * POST handler for resume rewrite
 * 
 * Accepts analysis results and generates an improved résumé in markdown format.
 * 
 * @async
 * @function POST
 * @param {NextRequest} req - Next.js request object containing RewriteInput JSON
 * @returns {Promise<Response>} Streaming response with improved resume markdown JSON
 * 
 * @throws {Error} When API call fails
 * @throws {SyntaxError} When AI returns invalid JSON
 */

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const input: RewriteInput = await req.json();

    if (!input.resume_text || input.resume_text.length < 100) {
      return NextResponse.json(
        { error: 'Resume text must be at least 100 characters' },
        { status: 400 }
      );
    }

    if (!input.analysis) {
      return NextResponse.json(
        { error: 'Analysis data is required' },
        { status: 400 }
      );
    }

    const provider = input.provider;
    const modelId = input.model;
    const apiKey = input.provider_api_key
      ?? (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY)
      ?? null;

    if (!apiKey) {
      return NextResponse.json(
        { error: `Missing ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key` },
        { status: 400 },
      );
    }

    // Build input object for rewrite phase
    const analysisInput: AnalysisInput = {
      resume_text: input.resume_text,
      perspective: input.perspective,
      language: input.language,
      region: input.region,
      provider: input.provider,
      model: input.model,
      provider_api_key: input.provider_api_key,
      target_role: input.target_role,
      job_description: null,
      constraints: {
        max_output_tokens: 8000,
        format: 'markdown',
        tone: 'professional',
      },
    };

    const rewriteMessage = buildRewritePhaseMessage(analysisInput, input.analysis);

    const model = provider === 'openai'
      ? createOpenAI({ apiKey })(modelId)
      : createGoogleGenerativeAI({ apiKey })(modelId);

    const response = streamText({
      model,
      system: REWRITE_PHASE_PROMPT,
      prompt: rewriteMessage,
      temperature: 0.2,
      maxOutputTokens: analysisInput.constraints?.max_output_tokens ?? 8000,
    });

    return response.toTextStreamResponse({
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Resume rewrite failed', error);

    return NextResponse.json(
      { error: 'Failed to rewrite resume. Please try again.' },
      { status: 500 },
    );
  }
}
