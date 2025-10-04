/**
 * Resume Input Component
 * 
 * This component provides the input form for résumé analysis, including:
 * - Résumé text textarea with character validation (100-15000 chars)
 * - Provider and model selection (OpenAI or Google Gemini)
 * - BYOK (Bring Your Own Key) field to override default credentials per request
 * - Perspective selection (11 professional lenses)
 * - Language selection (English/Spanish)
 * - Region selection (USA/LATAM Mexico)
 * - Optional target role and job description inputs
 * - Tone selection (professional/concise/friendly)
 * 
 * @module components/ResumeInput
 */

'use client';

import { FileText, Globe, Briefcase, MapPin, Cpu, KeyRound } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type {
  AnalysisInput,
  Perspective,
  Language,
  Region,
  Tone,
  PerspectiveOption,
  Provider,
  ProviderOption,
  ModelOption,
} from '@/types';

/**
 * Props for the ResumeInput component
 * @interface ResumeInputProps
 */
interface ResumeInputProps {
  /** Current analysis input state */
  input: AnalysisInput;
  /** Callback fired when input changes */
  onInputChange: (input: AnalysisInput) => void;
  /** Callback fired when user clicks Analyze button */
  onAnalyze: () => void;
  /** Loading state for async analysis */
  isLoading: boolean;
}

/**
 * Available analysis perspectives with descriptions
 * 
 * Each perspective focuses on different aspects of the résumé:
 * - general: Balanced holistic assessment
 * - leadership: Organizational impact, budgets, strategy
 * - technical: Stack, performance, scalability
 * - sales: Quota, pipeline, win rates
 * - And 7 more specialized perspectives
 * 
 * @constant
 * @type {PerspectiveOption[]}
 */
const PERSPECTIVES: PerspectiveOption[] = [
  { value: 'general', label: 'General / Holístico', description: 'Evaluación equilibrada en todas las dimensiones' },
  { value: 'leadership', label: 'Liderazgo / Gestión', description: 'Enfoque en impacto organizacional, presupuestos, estrategia' },
  { value: 'technical', label: 'Técnico / Ingeniería', description: 'Stack tecnológico, rendimiento, escalabilidad' },
  { value: 'sales', label: 'Especialista en Ventas', description: 'Cumplimiento de cuotas, pipeline, tasas de éxito' },
  { value: 'hr', label: 'Recursos Humanos', description: 'Reclutamiento, retención, HRIS' },
  { value: 'legal', label: 'Especialista Legal', description: 'Áreas de práctica, cumplimiento, riesgos' },
  { value: 'customer_service', label: 'Servicio al Cliente / CX', description: 'CSAT, NPS, métricas de resolución' },
  { value: 'product', label: 'Gestión de Producto', description: 'Roadmap, adopción, experimentos' },
  { value: 'marketing', label: 'Marketing / Marca', description: 'Campañas, CAC/LTV, métricas de embudo' },
  { value: 'finance', label: 'Finanzas / FP&A', description: 'Presupuestación, pronósticos, optimización de costos' },
  { value: 'operations', label: 'Operaciones / PMO', description: 'Eficiencia de procesos, entrega, Lean/Six Sigma' },
];

const PROVIDERS: ProviderOption[] = [
  {
    value: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini 2.5 Flash/Pro con salida estructurada JSON',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o Mini',
  },
];

const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini (OpenAI)',
    provider: 'openai',
    description: 'Modelo beta más reciente con API Responses',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (Google)',
    provider: 'gemini',
    description: 'Respuestas rápidas con fidelidad JSON',
  },
  // {
  //   value: 'gemini-2.0-pro-latest',
  //   label: 'Gemini 2.0 Pro (Google)',
  //   provider: 'gemini',
  //   description: 'Highest quality Gemini model',
  // },
];

/**
 * Resume Input Form Component
 * 
 * Renders a comprehensive input form for résumé analysis with real-time validation.
 * Prevents submission when résumé text is outside 100-15000 character range.
 * 
 * @component
 * @param {ResumeInputProps} props - Component props
 * @returns {JSX.Element} Rendered input form
 * 
 * @example
 * ```tsx
 * <ResumeInput
 *   input={analysisInput}
 *   onInputChange={setInput}
 *   onAnalyze={handleAnalyze}
 *   isLoading={false}
 * />
 * ```
 */
export default function ResumeInput({ input, onInputChange, onAnalyze, isLoading }: ResumeInputProps) {
  const { t } = useApp();
  const charCount = input.resume_text.length;
  const isValid = charCount >= 100 && charCount <= 15000;
  const availableModels = MODEL_OPTIONS.filter((option) => option.provider === input.provider);
  const selectedModelExists = availableModels.some((option) => option.value === input.model);

  const handleProviderChange = (provider: Provider) => {
    const fallbackModel = MODEL_OPTIONS.find((option) => option.provider === provider)?.value ?? '';
    onInputChange({
      ...input,
      provider,
      model: fallbackModel,
      provider_api_key: input.provider === provider ? input.provider_api_key ?? null : null,
    });
  };
  
  // Dynamic perspectives with translations
  const perspectives: PerspectiveOption[] = PERSPECTIVES.map(p => ({
    value: p.value,
    label: t(`perspective.${p.value}`),
    description: t(`perspective.${p.value}.desc`),
  }));

  return (
    <div className="space-y-6">
      {/* Resume Text Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FileText className="inline-block w-4 h-4 mr-2" />
          {t('input.resume.label')} *
        </label>
        <textarea
          className="textarea-field"
          rows={12}
          value={input.resume_text}
          onChange={(e) => onInputChange({ ...input, resume_text: e.target.value })}
          placeholder={t('input.resume.placeholder')}
        />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className={charCount < 100 || charCount > 15000 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
            {charCount.toLocaleString()} / 15,000 {t('input.resume.chars')} ({t('input.resume.min')}: 100)
          </span>
          {!isValid && charCount > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {charCount < 100 ? t('input.resume.tooShort') : t('input.resume.tooLong')}
            </span>
          )}
        </div>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Cpu className="inline-block w-4 h-4 mr-2" />
          {t('input.provider.label')}
        </label>
        <select
          className="select-field"
          value={input.provider}
          onChange={(e) => handleProviderChange(e.target.value as Provider)}
        >
          {PROVIDERS.map((provider) => (
            <option key={provider.value} value={provider.value}>
              {provider.label} — {provider.description}
            </option>
          ))}
        </select>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('input.model.label')}
        </label>
        <select
          className="select-field"
          value={selectedModelExists ? input.model : availableModels[0]?.value}
          onChange={(e) => onInputChange({ ...input, model: e.target.value })}
        >
          {availableModels.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label} — {model.description}
            </option>
          ))}
        </select>
        {!selectedModelExists && availableModels.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{t('input.model.updated')}</p>
        )}
      </div>

      {/* Provider API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <KeyRound className="inline-block w-4 h-4 mr-2" />
          {t('input.apikey.label')}
        </label>
        <input
          type="password"
          className="input-field"
          value={input.provider_api_key ?? ''}
          onChange={(e) => onInputChange({ ...input, provider_api_key: e.target.value || null })}
          placeholder={t(input.provider === 'openai' ? 'input.apikey.placeholder.openai' : 'input.apikey.placeholder.gemini')}
          autoComplete="off"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('input.apikey.help')}
        </p>
      </div>

      {/* Perspective Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Briefcase className="inline-block w-4 h-4 mr-2" />
          {t('input.perspective.label')}
        </label>
        <select
          className="select-field"
          value={input.perspective}
          onChange={(e) => onInputChange({ ...input, perspective: e.target.value as Perspective })}
        >
          {perspectives.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label} - {p.description}
            </option>
          ))}
        </select>
      </div>

      {/* Language & Region */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Globe className="inline-block w-4 h-4 mr-2" />
            {t('input.language.label')}
          </label>
          <select
            className="select-field"
            value={input.language}
            onChange={(e) => onInputChange({ ...input, language: e.target.value as Language })}
          >
            <option value="es">{t('lang.es')}</option>
            <option value="en">{t('lang.en')}</option>
            <option value="en-GB">{t('lang.en-GB')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <MapPin className="inline-block w-4 h-4 mr-2" />
            {t('input.region.label')}
          </label>
          <select
            className="select-field"
            value={input.region}
            onChange={(e) => onInputChange({ ...input, region: e.target.value as Region })}
          >
            <option value="latam_mx">{t('region.latam_mx')}</option>
            <option value="usa">{t('region.usa')}</option>
            <option value="uk">{t('region.uk')}</option>
          </select>
        </div>
      </div>

      {/* Optional Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('input.targetRole.label')}
        </label>
        <input
          type="text"
          className="input-field"
          value={input.target_role || ''}
          onChange={(e) => onInputChange({ ...input, target_role: e.target.value || null })}
          placeholder={t('input.targetRole.placeholder')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('input.jobDesc.label')}
        </label>
        <textarea
          className="textarea-field"
          rows={6}
          value={input.job_description || ''}
          onChange={(e) => onInputChange({ ...input, job_description: e.target.value || null })}
          placeholder={t('input.jobDesc.placeholder')}
        />
      </div>

      {/* Tone Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('input.tone.label')}
        </label>
        <select
          className="select-field"
          value={input.constraints.tone}
          onChange={(e) => onInputChange({ 
            ...input, 
            constraints: { ...input.constraints, tone: e.target.value as Tone }
          })}
        >
          <option value="professional">{t('tone.professional')}</option>
          <option value="concise">{t('tone.concise')}</option>
          <option value="friendly">{t('tone.friendly')}</option>
        </select>
      </div>

      {/* Analyze Button */}
      <button
        className="btn-primary w-full py-3 text-lg font-semibold"
        onClick={onAnalyze}
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('input.analyzing.button')}
          </span>
        ) : (
          t('input.analyze.button')
        )}
      </button>
    </div>
  );
}
