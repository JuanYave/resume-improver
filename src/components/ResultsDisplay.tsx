/**
 * Results Display Component
 * 
 * This component displays the analysis results in a tabbed interface with:
 * - Overview tab: Diagnostic scores, strengths, gaps, risks, keyword analysis
 * - Recommendations tab: Global and section-specific improvements, changelog, next steps
 * - Improved Resume tab: Rendered markdown with copy/download functionality
 * 
 * @module components/ResultsDisplay
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Copy, CheckCircle, AlertCircle, TrendingUp, FileText, Sparkles } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import { useApp } from '@/contexts/AppContext';
import type { AnalysisOutput, CanvaGuide, CanvaGuideSection } from '@/types';

const ALLOWED_HTML_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]);

const SHOW_DIAGNOSTIC_SCORES =
  (process.env.NEXT_PUBLIC_ANALYZER_SHOW_DIAGNOSTIC_SCORES ?? 'true').toLowerCase() === 'true';
/**
 * Escapes AI-generated placeholder tags (e.g., <porcentaje>) so they render safely as text.
 * Known HTML tags remain untouched to preserve intentional markup.
 */
function sanitizeMarkdownPlaceholders(markdown: string): string {
  return markdown.replace(/<\/?([a-zA-Z][\w-]*)([^>]*)>/g, (match) => {
    const tagNameMatch = match.match(/^<\/?([a-zA-Z][\w-]*)/);
    const tagName = tagNameMatch?.[1]?.toLowerCase();

    if (tagName && ALLOWED_HTML_TAGS.has(tagName)) {
      return match;
    }

    return match.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  });
}

function cleanModelJsonPayload(payload: string): string {
  let cleaned = payload.trim();

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

function normalizeStreamPayload(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith('data:') ? line.slice(5).trim() : line))
    .filter((line) => line && line !== '[DONE]')
    .join('\n');
}

function extractJsonObjectContainingKey(source: string, key: string): string | null {
  const keyToken = `"${key}"`;
  const keyIndex = source.indexOf(keyToken);

  if (keyIndex === -1) {
    return null;
  }

  let start = keyIndex;
  while (start >= 0 && source[start] !== '{') {
    start -= 1;
  }

  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseStreamedJsonResponse<T>(raw: string, key: string): T {
  const payload = normalizeStreamPayload(raw) || raw;
  const cleanedCandidate = cleanModelJsonPayload(payload);
  const jsonString = extractJsonObjectContainingKey(cleanedCandidate, key) ?? cleanedCandidate;

  try {
    return JSON.parse(jsonString) as T;
  } catch (_error) {
    throw new Error('Unable to parse streamed JSON payload');
  }
}

function parseStreamedRewriteResponse(raw: string): string {
  const parsed = parseStreamedJsonResponse<{ improved_resume_markdown?: string }>(
    raw,
    'improved_resume_markdown'
  );

  if (typeof parsed.improved_resume_markdown !== 'string') {
    throw new Error('Rewrite payload missing improved resume content');
  }

  return parsed.improved_resume_markdown;
}

function parseStreamedCanvaGuideResponse(raw: string): CanvaGuide {
  return parseStreamedJsonResponse<CanvaGuide>(raw, 'sections');
}

/**
 * Props for the ResultsDisplay component
 * @interface ResultsDisplayProps
 */
interface ResultsDisplayProps {
  /** Analysis output from the API */
  result: AnalysisOutput;
  /** Original resume text */
  resumeText: string;
  /** Provider used for analysis */
  provider: string;
  /** Model used for analysis */
  model: string;
  /** Optional API key */
  apiKey?: string | null;
}

type TabId = 'overview' | 'recommendations' | 'improved' | 'canva';

/**
 * Results Display Component
 * 
 * Renders analysis results in three tabs with interactive features:
 * - Color-coded diagnostic scores (0-10 scale)
 * - Expandable sections for strengths, gaps, and risks
 * - Keyword analysis when job description provided
 * - Copy to clipboard and download functionality for improved résumé
 * - Safe markdown rendering that escapes unsupported AI placeholders before React renders them
 * 
 * @component
 * @param {ResultsDisplayProps} props - Component props
 * @returns {JSX.Element} Rendered results display with tabs
 * 
 * @example
 * ```
 */
export default function ResultsDisplay({ result, resumeText, provider, model, apiKey }: ResultsDisplayProps) {
  const { t } = useApp();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [copied, setCopied] = useState(false);
  const [canvaGuide, setCanvaGuide] = useState<CanvaGuide | null>(null);
  const [canvaLoading, setCanvaLoading] = useState(false);
  const [canvaError, setCanvaError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<number | null>(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [rewriteMarkdown, setRewriteMarkdown] = useState<string | null>(
    result.improved_resume_markdown ?? null
  );

  const hasImprovedResume = Boolean(rewriteMarkdown?.trim());
  const hasCanvaTab = hasImprovedResume;

  const tabs = useMemo(() => {
    const base: Array<{ id: TabId; label: string }> = [
      { id: 'overview', label: t('results.tab.overview') },
      { id: 'recommendations', label: t('results.tab.recommendations') },
      { id: 'improved', label: t('results.tab.improved') },
      { id: 'canva', label: t('results.tab.canva') },
    ];

    return hasCanvaTab ? base : base.filter((tab) => tab.id !== 'canva');
  }, [t, hasCanvaTab]);

  useEffect(() => {
    if (!hasCanvaTab && activeTab === 'canva') {
      setActiveTab('overview');
    }
  }, [hasCanvaTab, activeTab]);

  const overviewScores = useMemo(() => {
    if (!SHOW_DIAGNOSTIC_SCORES || !result.diagnostic.scores) {
      return [];
    }

    return Object.entries(result.diagnostic.scores).map(([key, value]) => ({
      key,
      value,
      label: t(`results.scores.${key}`),
    }));
  }, [result.diagnostic.scores, t]);

  const safeImprovedMarkdown = useMemo(() => {
    if (!rewriteMarkdown) return '';
    return sanitizeMarkdownPlaceholders(rewriteMarkdown);
  }, [rewriteMarkdown]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-blue-100 text-blue-800';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return t('results.score.excellent');
    if (score >= 7) return t('results.score.good');
    if (score >= 4) return t('results.score.fair');
    return t('results.score.poor');
  };

  /**
   * Copies improved résumé markdown to clipboard
   * Shows "Copied!" feedback for 2 seconds
   */
  const handleCopy = async () => {
    if (!rewriteMarkdown) return;
    try {
      await navigator.clipboard.writeText(rewriteMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy improved resume', error);
    }
  };

  /**
   * Downloads improved résumé as markdown file
   * Creates blob and triggers browser download
   */
  const handleDownload = () => {
    if (!rewriteMarkdown) return;
    const blob = new Blob([rewriteMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'improved-resume.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Generates improved resume (lazy loaded)
   */
  const generateImprovedResume = async () => {
    if (rewriteMarkdown) return; // Already generated
    
    setRewriteLoading(true);
    setRewriteError(null);

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_text: resumeText,
          analysis: result,
          perspective: result.meta.perspective,
          language: result.meta.language,
          region: result.meta.region,
          provider,
          model,
          provider_api_key: apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate improved resume');
      }

      const raw = await response.text();
      const markdown = parseStreamedRewriteResponse(raw);
      setRewriteMarkdown(markdown);
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRewriteLoading(false);
    }
  };

  /**
   * Generates Canva design guide (lazy loaded)
   */
  const generateCanvaGuide = async () => {
    if (canvaGuide) return; // Already loaded
    
    setCanvaLoading(true);
    setCanvaError(null);

    try {
      const response = await fetch('/api/canva-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          improved_resume_markdown: rewriteMarkdown,
          language: result.meta.language,
          provider: 'gemini', // Use Gemini for faster/cheaper response
          model: 'gemini-2.5-flash',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate Canva guide');
      }

      const raw = await response.text();
      const data = parseStreamedCanvaGuideResponse(raw);
      setCanvaGuide(data);
    } catch (err) {
      setCanvaError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCanvaLoading(false);
    }
  };

  /**
   * Copies a specific section to clipboard
   */
  const handleCopySection = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(index);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  /**
   * Downloads Canva guide as markdown file
   */
  const handleDownloadCanvaGuide = () => {
    if (!canvaGuide) return;

    let markdown = `# ${t('canva.title')}\n\n`;
    markdown += `${t('canva.subtitle')}\n\n`;
    
    // Template recommendations
    markdown += `## ${t('canva.template.title')}\n\n`;
    markdown += `${t('canva.template.search')}\n`;
    canvaGuide.templateKeywords.forEach((kw: string) => {
      markdown += `- ${kw}\n`;
    });
    markdown += '\n';
    
    // Sections
    canvaGuide.sections.forEach((section: CanvaGuideSection, idx: number) => {
      markdown += `## Section ${idx + 1}: ${section.name}\n\n`;
      markdown += `**Placement:** ${section.placement}\n\n`;
      markdown += `**Font Size:** ${section.fontSize}\n\n`;
      markdown += `\`\`\`\n${section.content}\n\`\`\`\n\n`;
    });
    
    // Design tips
    markdown += `## ${t('canva.design.tips')}\n\n`;
    markdown += `### ${t('canva.colors.title')}\n`;
    markdown += `- Primary: ${canvaGuide.colorScheme.primary}\n`;
    markdown += `- Secondary: ${canvaGuide.colorScheme.secondary}\n`;
    if (canvaGuide.colorScheme.accent) {
      markdown += `- Accent: ${canvaGuide.colorScheme.accent}\n`;
    }
    markdown += '\n';
    
    markdown += `### ${t('canva.fonts.title')}\n`;
    markdown += `- Heading: ${canvaGuide.fontRecommendations.heading}\n`;
    markdown += `- Body: ${canvaGuide.fontRecommendations.body}\n\n`;
    
    markdown += `### ${t('canva.layout.title')}\n`;
    markdown += `- ${t('canva.layout.margins')}\n`;
    markdown += `- ${t('canva.layout.spacing')}\n\n`;
    
    // ATS warnings
    markdown += `## ${t('canva.ats.warning')}\n\n`;
    markdown += `- ${t('canva.ats.tip1')}\n`;
    markdown += `- ${t('canva.ats.tip2')}\n`;
    markdown += `- ${t('canva.ats.tip3')}\n`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canva-design-guide.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Metadata & Warnings */}
      {(result.meta.warnings.length > 0 || result.meta.errors.length > 0) && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">{t('results.notices')}</h3>
              {result.meta.warnings.map((warning, idx) => (
                <p key={idx} className="text-sm text-yellow-800 dark:text-yellow-300">{warning}</p>
              ))}
              {result.meta.errors.map((error, idx) => (
                <p key={idx} className="text-sm text-yellow-800 dark:text-yellow-300">
                  [{error.code}] {error.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Scores */}
          {overviewScores.length > 0 && (
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                <TrendingUp className="w-5 h-5 mr-2" />
                {t('results.scores')}
              </h3>
              {result.diagnostic.score_explanation && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {result.diagnostic.score_explanation}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {overviewScores.map((score) => (
                  <div key={score.key} className="text-center">
                    <div className={`score-badge ${getScoreColor(score.value)} mb-2`}>
                      {score.value.toFixed(1)}
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {score.key.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{getScoreLabel(score.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
              {t('results.strengths')}
            </h3>
            <ul className="space-y-2">
              {result.diagnostic.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps & Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                {t('results.gaps')}
              </h3>
              <ul className="space-y-2">
                {result.diagnostic.gaps.map((gap, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-yellow-600 dark:text-yellow-400 mr-2">⚠</span>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{gap}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                <AlertCircle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                {t('results.risks')}
              </h3>
              <ul className="space-y-2">
                {result.diagnostic.risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-red-600 dark:text-red-400 mr-2">✕</span>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Keyword Helper */}
          {result.keyword_helper.enabled && (
            <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-300">{t('results.keywords')}</h3>
              
              {result.keyword_helper.missing_keywords && result.keyword_helper.missing_keywords.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">{t('results.keywords.missing')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.keyword_helper.missing_keywords.map((kw, idx) => (
                      <span key={idx} className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-3 py-1 rounded-full text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.keyword_helper.integration_suggestions && (
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">{t('results.keywords.suggestions')}</h4>
                  <ul className="space-y-1">
                    {result.keyword_helper.integration_suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-blue-900 dark:text-blue-200">• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Global Recommendations */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('results.recommendations.top')}</h3>
            <ul className="space-y-3">
              {result.recommendations.global.map((rec, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section-Specific Recommendations */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('results.recommendations.section')}</h3>
            {Object.entries(result.recommendations.by_section).map(([section, recs]) => (
              recs.length > 0 && (
                <div key={section} className="mb-4 last:mb-0">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2 capitalize">{section}</h4>
                  <ul className="space-y-1 ml-4">
                    {recs.map((rec, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-300">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>

          {/* Improved résumé generation guidance now happens in the Improved tab */}
        </div>
      )}

      {/* Improved Resume Tab */}
      {activeTab === 'improved' && (
        <div className="space-y-4">
          {/* Generate Button (shown when not yet generated) */}
          {!rewriteMarkdown && !rewriteLoading && !rewriteError && (
            <div className="card dark:bg-gray-800 dark:border-gray-700 text-center py-12">
              <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('results.improved.generate.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {t('results.improved.generate.subtitle')}
              </p>
              <button
                onClick={generateImprovedResume}
                className="btn-primary px-8 py-3 text-lg font-semibold"
              >
                {t('results.improved.generate.button')}
              </button>
            </div>
          )}

          {rewriteLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin h-12 w-12 text-primary-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600 dark:text-gray-300 font-medium">{t('results.improved.loading')}</p>
            </div>
          )}

          {rewriteError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-400 font-medium">{t('results.error')}</p>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">{rewriteError}</p>
              <button
                onClick={generateImprovedResume}
                className="btn-primary mt-4"
              >
                {t('results.improved.retry')}
              </button>
            </div>
          )}

          {rewriteMarkdown && (
            <>
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={handleCopy} className="btn-primary flex items-center">
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('results.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      {t('results.copy')}
                    </>
                  )}
                </button>
                <button onClick={handleDownload} className="btn-secondary flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  {t('results.download')}
                </button>
              </div>

              {/* Resume Preview */}
              <div className="card dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <FileText className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('results.improved')}</h3>
                </div>
                <div className="prose prose-sm max-w-none bg-gray-50 dark:bg-gray-900 p-6 rounded-lg dark:prose-invert">
                  <Markdown>{safeImprovedMarkdown}</Markdown>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Canva Export Tab */}
      {activeTab === 'canva' && hasCanvaTab && (
        <div className="space-y-6">
          {/* Generate Button (shown when not yet generated) */}
          {!canvaGuide && !canvaLoading && !canvaError && (
            <div className="card dark:bg-gray-800 dark:border-gray-700 text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('canva.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {t('canva.subtitle')}
              </p>
              <button
                onClick={generateCanvaGuide}
                className="btn-primary px-8 py-3 text-lg font-semibold"
              >
                {t('canva.generate')}
              </button>
            </div>
          )}

          {canvaLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin h-12 w-12 text-primary-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600 dark:text-gray-300 font-medium">{t('canva.loading')}</p>
            </div>
          )}

          {canvaError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-400 font-medium">{t('results.error')}</p>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">{canvaError}</p>
              <button
                onClick={generateCanvaGuide}
                className="btn-primary mt-4"
              >
                {t('canva.generate')}
              </button>
            </div>
          )}

          {canvaGuide && (
            <>
              {/* Header with Download Button */}
              <div className="card dark:bg-gray-800 dark:border-gray-700 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('canva.title')}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{t('canva.subtitle')}</p>
                <button onClick={handleDownloadCanvaGuide} className="btn-secondary inline-flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  {t('results.download')}
                </button>
              </div>

              {/* Template Recommendation */}
              <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-300">{t('canva.template.title')}</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  <strong>{t('canva.template.search')}</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {canvaGuide.templateKeywords.map((keyword: string, idx: number) => (
                    <span key={idx} className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sections */}
              {canvaGuide.sections.map((section: CanvaGuideSection, idx: number) => (
                <div key={idx} className="card dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('canva.section.title').replace('{number}', String(idx + 1)).replace('{name}', section.name)}
                    </h3>
                    <button
                      onClick={() => handleCopySection(section.content, idx)}
                      className="btn-primary flex items-center text-sm"
                    >
                      {copiedSection === idx ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t('canva.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          {t('canva.copy.section')}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-3">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                      {section.content}
                    </pre>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">📍 Placement:</strong> {section.placement}
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">🔤 Font Size:</strong> {section.fontSize}
                    </div>
                  </div>
                </div>
              ))}

              {/* Design Tips */}
              <div className="card bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold mb-4 text-green-900 dark:text-green-300">{t('canva.design.tips')}</h3>
                
                <div className="space-y-4">
                  {/* Colors */}
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">{t('canva.colors.title')}</h4>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: canvaGuide.colorScheme.primary }}
                        ></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{canvaGuide.colorScheme.primary}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: canvaGuide.colorScheme.secondary }}
                        ></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{canvaGuide.colorScheme.secondary}</span>
                      </div>
                      {canvaGuide.colorScheme.accent && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-300"
                            style={{ backgroundColor: canvaGuide.colorScheme.accent }}
                          ></div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{canvaGuide.colorScheme.accent}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fonts */}
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">{t('canva.fonts.title')}</h4>
                    <p className="text-sm text-green-900 dark:text-green-200">
                      <strong>{t('canva.fonts.heading')}</strong> {canvaGuide.fontRecommendations.heading}
                    </p>
                    <p className="text-sm text-green-900 dark:text-green-200">
                      <strong>{t('canva.fonts.body')}</strong> {canvaGuide.fontRecommendations.body}
                    </p>
                  </div>

                  {/* Layout */}
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">{t('canva.layout.title')}</h4>
                    <ul className="text-sm text-green-900 dark:text-green-200 space-y-1">
                      <li>• {t('canva.layout.margins')}</li>
                      <li>• {t('canva.layout.spacing')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* ATS Warning */}
              <div className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-lg font-semibold mb-3 text-yellow-900 dark:text-yellow-300">{t('canva.ats.warning')}</h3>
                <ul className="text-sm text-yellow-900 dark:text-yellow-200 space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{t('canva.ats.tip1')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{t('canva.ats.tip2')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{t('canva.ats.tip3')}</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
