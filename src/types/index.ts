export type Perspective = 
  | 'general'
  | 'leadership'
  | 'technical'
  | 'sales'
  | 'hr'
  | 'legal'
  | 'customer_service'
  | 'product'
  | 'marketing'
  | 'finance'
  | 'operations';

export type Language = 'es' | 'en' | 'en-GB';
export type Region = 'usa' | 'latam_mx' | 'uk';
export type Tone = 'concise' | 'professional' | 'friendly';
export type Provider = 'openai' | 'gemini';

export interface AnalysisInput {
  resume_text: string;
  perspective: Perspective;
  language: Language;
  region: Region;
  provider: Provider;
  model: string;
  provider_api_key?: string | null;
  target_role?: string | null;
  job_description?: string | null;
  constraints: {
    max_output_tokens: number;
    format: 'markdown';
    tone: Tone;
  };
}

export interface AnalysisPhaseResult {
  meta: AnalysisOutput['meta'];
  extracted_profile: AnalysisOutput['extracted_profile'];
  diagnostic: AnalysisOutput['diagnostic'];
  keyword_helper: AnalysisOutput['keyword_helper'];
  recommendations: AnalysisOutput['recommendations'];
}

export interface RewritePhaseResult {
  improved_resume_markdown: AnalysisOutput['improved_resume_markdown'];
  changelog: AnalysisOutput['changelog'];
  next_steps: AnalysisOutput['next_steps'];
}

export interface ErrorDetail {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface AnalysisOutput {
  meta: {
    language: Language;
    perspective: Perspective;
    region: Region;
    schema_version: string;
    warnings: string[];
    errors: ErrorDetail[];
  };
  extracted_profile: {
    headline: string;
    summary: string;
    skills: string[];
    experience: Array<{
      title: string;
      company: string;
      dates: string;
      bullets: string[];
    }>;
    education: Array<{
      degree: string;
      institution: string;
      dates: string;
    }>;
    certifications: string[];
    achievements: string[];
  };
  diagnostic: {
    scores: {
      clarity: number;
      impact: number;
      ats_alignment: number;
      readability: number;
      role_fit: number;
    };
    score_explanation: string;
    strengths: string[];
    gaps: string[];
    risks: string[];
  };
  keyword_helper: {
    enabled: boolean;
    jd_keywords?: string[];
    resume_keyword_coverage?: Array<{
      keyword: string;
      present: boolean;
      evidence: string;
    }>;
    missing_keywords?: string[];
    weak_keywords?: string[];
    integration_suggestions?: string[];
    message?: string;
  };
  recommendations: {
    global: string[];
    by_section: {
      summary: string[];
      skills: string[];
      experience: string[];
      education: string[];
      achievements: string[];
    };
    rewrite_criteria: {
      tone: string;
      length: string;
      style: string;
    };
  };
  improved_resume_markdown?: string;
  changelog?: Array<{
    section: string;
    change_type: 'added' | 'removed' | 'modified' | 'restructured';
    description: string;
    original?: string;
    improved?: string;
  }>;
  next_steps?: string[];
}

export interface PerspectiveOption {
  value: Perspective;
  label: string;
  description: string;
}

export interface ProviderOption {
  value: Provider;
  label: string;
  description: string;
}

export interface ModelOption {
  value: string;
  label: string;
  provider: Provider;
  description?: string;
}

export interface CanvaGuideSection {
  name: string;
  content: string;
  placement: string;
  fontSize: string;
}

export interface CanvaGuide {
  sections: CanvaGuideSection[];
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
