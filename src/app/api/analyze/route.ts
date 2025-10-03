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
import type { AnalysisInput, AnalysisPhaseResult } from '@/types';
import {
  ANALYSIS_PHASE_PROMPT,
  PhaseParseError,
  buildAnalysisPhaseMessage,
  runPhase,
} from '@/lib/analyzer';

/**
 * POST handler for resume analysis
 * 
 * Accepts a JSON payload with résumé text and analysis parameters,
 * sends it to the configured AI provider for analysis, and returns structured feedback.
 * 
 * @async
 * @function POST
 * @param {NextRequest} req - Next.js request object containing AnalysisInput JSON
 * @returns {Promise<NextResponse<AnalysisPhaseResult | {error: string}>>} JSON response with analysis phase results
 * 
 * @throws {Error} When API call fails
 * @throws {SyntaxError} When AI returns invalid JSON
 */

export async function POST(req: NextRequest) {
  const streamRequested = req.nextUrl.searchParams.get('stream') === 'true';

  try {
    if (streamRequested) {
      return NextResponse.json(
        { error: 'Streaming is not available for multi-phase analysis yet.' },
        { status: 501 }
      );
    }

    const input: AnalysisInput = await req.json();

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
    const apiKey = input.provider_api_key ?? null;
    const provider = input.provider;
    const model = input.model;

    // Run analysis phase only
    const analysisMessage = buildAnalysisPhaseMessage(input);
    const { data: analysisData } = await runPhase<AnalysisPhaseResult>({
      phase: 'analysis',
      provider,
      model,
      systemPrompt: ANALYSIS_PHASE_PROMPT,
      userMessage: analysisMessage,
      apiKey,
    });

    return NextResponse.json(analysisData);
  } catch (error) {
    if (error instanceof PhaseParseError) {
      console.error(`${error.phase} phase parse failure`, {
        phase: error.phase,
        provider: error.provider,
        message: error.originalError.message,
      });

      return NextResponse.json(
        { error: `The ${error.phase} response was invalid JSON. Please retry.` },
        { status: 502 },
      );
    }

    console.error('Resume analysis failed', error);

    return NextResponse.json(
      { error: 'Failed to analyze resume. Please try again.' },
      { status: 500 },
    );
  }
}
