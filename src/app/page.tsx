/**
 * Resume Analyzer Home Page
 * 
 * Main application page that orchestrates the résumé analysis workflow:
 * 1. User inputs résumé text and selects analysis parameters
 * 2. Form submits to /api/analyze endpoint
 * 3. Results displayed in tabbed interface
 * 
 * Features:
 * - Responsive 2-column layout (input | results)
 * - Real-time input validation
 * - Loading states with spinner
 * - Error handling and display
 * - No data persistence (privacy-first)
 * 
 * @module app/page
 */

'use client';

import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import ResumeInput from '@/components/ResumeInput';
import ResultsDisplay from '@/components/ResultsDisplay';
import Header from '@/components/Header';
import { useApp } from '@/contexts/AppContext';
import type { AnalysisInput, AnalysisOutput } from '@/types';

function cleanModelJson(text: string): string {
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

async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        result += decoder.decode(value, { stream: true });
      }
    }

    result += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return result;
}

function parseAnalysisOutputPayload(raw: string): AnalysisOutput {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error('Empty response from AI');
  }

  try {
    return JSON.parse(trimmed) as AnalysisOutput;
  } catch (initialError) {
    try {
      const cleaned = cleanModelJson(trimmed);
      return JSON.parse(cleaned) as AnalysisOutput;
    } catch (secondaryError) {
      throw initialError instanceof Error ? initialError : secondaryError;
    }
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  const bodyText = await response.text();

  if (!bodyText) {
    return 'Analysis failed';
  }

  try {
    const parsed = JSON.parse(bodyText);
    if (parsed && typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch (error) {
    return bodyText;
  }

  return bodyText;
}

/**
 * Home Page Component
 * 
 * Main application entry point that manages:
 * - Analysis input state
 * - API call to analyze endpoint
 * - Loading and error states
 * - Results display
 * 
 * @component
 * @returns {JSX.Element} Main application page
 */
export default function Home() {
  const { t } = useApp();
  
  const [input, setInput] = useState<AnalysisInput>({
    resume_text: '',
    perspective: 'general',
    language: 'es',
    region: 'latam_mx',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    provider_api_key: null,
    target_role: null,
    job_description: null,
    constraints: {
      max_output_tokens: 4000,
      format: 'markdown',
      tone: 'professional',
    },
  });

  const [result, setResult] = useState<AnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles résumé analysis submission
   * 
   * Sends POST request to /api/analyze with input data,
   * manages loading/error states, and updates results.
   * 
   * @async
   * @function handleAnalyze
   * @returns {Promise<void>}
   */
  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/analyze?stream=${input.provider === 'gemini' ? 'true' : 'false'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...input,
          provider_api_key: input.provider_api_key || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      let payload: AnalysisOutput;

      if (response.body && response.headers.get('X-Analysis-Provider') === 'gemini') {
        const rawText = await readStreamToString(response.body);
        payload = parseAnalysisOutputPayload(rawText);
      } else {
        payload = await response.json();
      }

      const data: AnalysisOutput = payload;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <Header />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-primary-600 dark:text-primary-400 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('app.title')}</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('app.subtitle')}
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <Sparkles className="w-4 h-4 mr-1" />
              {t('app.feature.ai')}
            </span>
            <span>•</span>
            <span>{t('app.feature.perspectives')}</span>
            <span>•</span>
            <span>{t('app.feature.regions')}</span>
            <span>•</span>
            <span>{t('app.feature.languages')}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('section.input')}</h2>
            <ResumeInput
              input={input}
              onInputChange={setInput}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column - Results */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('section.results')}</h2>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-400 font-medium">{t('results.error')}</p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="animate-spin h-12 w-12 text-primary-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 dark:text-gray-300 font-medium">{t('results.analyzing')}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{t('results.analyzing.hint')}</p>
              </div>
            )}

            {!isLoading && !error && !result && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('results.empty')}</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">{t('results.empty.hint')}</p>
              </div>
            )}

            {result && <ResultsDisplay result={result} />}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center space-y-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-3xl mx-auto">
            <p className="text-sm text-yellow-900 dark:text-yellow-400 font-medium">
              {t('footer.disclaimer.title')}
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
              {t('footer.disclaimer.text')}
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('footer.info')}
          </p>
        </div>
      </div>
    </main>
  );
}
