import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

interface CanvaGuideRequest {
  improved_resume_markdown: string;
  language: 'es' | 'en' | 'en-GB';
  provider: 'openai' | 'gemini';
  model?: string;
  provider_api_key?: string | null;
}

interface CanvaSection {
  name: string;
  content: string;
  placement: string;
  fontSize: string;
}

export interface CanvaGuideOutput {
  sections: CanvaSection[];
  templateKeywords: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  fontRecommendations: {
    heading: string;
    body: string;
  };
}

const CANVA_PROMPT = `You are a professional CV designer helping users create beautiful, ATS-friendly resumes in Canva.

Given an improved resume in markdown format, generate a structured Canva design guide with:

1. **Sections**: Break down the resume into copy-paste sections for Canva
2. **Template Keywords**: Suggest 3-4 search terms for finding good Canva templates
3. **Color Scheme**: Recommend professional color palette (hex codes)
4. **Font Recommendations**: Suggest Canva-available fonts for headings and body

**IMPORTANT REQUIREMENTS:**
- Each section should be ready to copy-paste into Canva
- Include placement instructions (e.g., "Place at top center", "Below header")
- Include font size recommendations (e.g., "24-28pt", "11-12pt")
- Keep design ATS-friendly (simple layout, no complex graphics)
- Use fonts available in Canva (Montserrat, Poppins, Open Sans, Roboto, etc.)

Return ONLY valid JSON with this exact structure:
{
  "sections": [
    {
      "name": "Header / Contact Info",
      "content": "[formatted text ready to paste]",
      "placement": "Top center of page",
      "fontSize": "Name: 24-28pt, Contact: 10-11pt"
    }
  ],
  "templateKeywords": ["Modern ATS Resume", "Professional Minimalist CV"],
  "colorScheme": {
    "primary": "#1e3a8a",
    "secondary": "#64748b",
    "accent": "#3b82f6"
  },
  "fontRecommendations": {
    "heading": "Montserrat Bold or Poppins SemiBold",
    "body": "Open Sans Regular or Roboto (11-12pt)"
  }
}`;

export const maxDuration = 300;

/**
 * Streams Canva design guide generation using the configured LLM provider.
 * The response is returned as an SSE stream compatible with `useEffect`/`fetch` consumers.
 */
export async function POST(req: NextRequest) {
  try {
    const input: CanvaGuideRequest = await req.json();

    if (!input.improved_resume_markdown) {
      return NextResponse.json(
        { error: 'Resume markdown is required' },
        { status: 400 }
      );
    }

    const provider = input.provider;
    const modelId = input.model || (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
    const apiKey =
      input.provider_api_key ??
      (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY) ??
      null;

    if (!apiKey) {
      return NextResponse.json(
        { error: `Missing ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key` },
        { status: 400 }
      );
    }

    const userPrompt = `Generate a Canva design guide for this resume (output language: ${input.language}):\n\n${input.improved_resume_markdown}`;

    const model =
      provider === 'openai'
        ? createOpenAI({ apiKey })(modelId)
        : createGoogleGenerativeAI({ apiKey })(modelId);

    const response = streamText({
      model,
      system: CANVA_PROMPT,
      prompt: userPrompt,
      temperature: 0.2,
      maxOutputTokens: 4000,
    });

    return response.toTextStreamResponse({
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Canva guide generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate Canva guide. Please try again.' },
      { status: 500 }
    );
  }
}
