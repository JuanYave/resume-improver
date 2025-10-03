/**
 * Resume Rewrite API Route
 * 
 * This API endpoint takes analysis results and generates an improved
 * version of the résumé based on the diagnostic data.
 * 
 * @module api/rewrite
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisInput, AnalysisPhaseResult, RewritePhaseResult, Provider } from '@/types';
import {
  REWRITE_PHASE_PROMPT,
  PhaseParseError,
  buildRewritePhaseMessage,
  runPhase,
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
 * @returns {Promise<NextResponse<RewritePhaseResult | {error: string}>>} JSON response with improved resume
 * 
 * @throws {Error} When API call fails
 * @throws {SyntaxError} When AI returns invalid JSON
 */

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

    const apiKey = input.provider_api_key ?? null;
    const provider = input.provider;
    const model = input.model;

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

    // Run rewrite phase
    const rewriteMessage = buildRewritePhaseMessage(analysisInput, input.analysis);
    const { data: rewriteData } = await runPhase<RewritePhaseResult>({
      phase: 'rewrite',
      provider,
      model,
      systemPrompt: REWRITE_PHASE_PROMPT,
      userMessage: rewriteMessage,
      apiKey,
    });

    return NextResponse.json(rewriteData);
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

    console.error('Resume rewrite failed', error);

    return NextResponse.json(
      { error: 'Failed to rewrite resume. Please try again.' },
      { status: 500 },
    );
  }
}
