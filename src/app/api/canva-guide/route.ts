import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

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

async function generateCanvaGuide(
  provider: 'openai' | 'gemini',
  model: string,
  resumeMarkdown: string,
  language: string,
  apiKey?: string | null
): Promise<string | null> {
  const userMessage = `Generate a Canva design guide for this resume (output language: ${language}):\n\n${resumeMarkdown}`;

  if (provider === 'gemini') {
    const client = getGeminiClient(apiKey);
    const response = await client.models.generateContent({
      model,
      contents: `${CANVA_PROMPT}\n\n${userMessage}`,
    });
    return typeof response.text === 'string' ? response.text : null;
  } else {
    const client = getOpenAIClient(apiKey);
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: CANVA_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content ?? null;
  }
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

export async function POST(req: NextRequest) {
  try {
    const input: CanvaGuideRequest = await req.json();

    if (!input.improved_resume_markdown) {
      return NextResponse.json(
        { error: 'Resume markdown is required' },
        { status: 400 }
      );
    }

    const model = input.model || (input.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4-turbo-preview');
    
    let responseText = await generateCanvaGuide(
      input.provider,
      model,
      input.improved_resume_markdown,
      input.language,
      input.provider_api_key
    );

    if (!responseText) {
      throw new Error('Empty response from AI');
    }

    // Clean markdown code blocks if present (mainly for Gemini)
    if (input.provider === 'gemini') {
      responseText = cleanJsonResponse(responseText);
    }

    const result: CanvaGuideOutput = JSON.parse(responseText);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Canva guide generation error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON response from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate Canva guide. Please try again.' },
      { status: 500 }
    );
  }
}
