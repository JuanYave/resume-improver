'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UILanguage = 'es' | 'en';
type Theme = 'light' | 'dark';

interface AppContextType {
  uiLanguage: UILanguage;
  setUILanguage: (lang: UILanguage) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const translations: Record<UILanguage, Record<string, string>> = {
  es: {
    // Header
    'app.title': 'Analizador y Optimizador de Currículum',
    'app.subtitle': 'Obtén retroalimentación optimizada para ATS (Análisis con IA) y una versión mejorada de tu currículum desde múltiples perspectivas profesionales',
    'app.feature.ai': 'Análisis con IA',
    'app.feature.perspectives': 'Múltiples Perspectivas',
    'app.feature.regions': 'LATAM (México), USA y UK',
    'app.feature.languages': 'Español (México), Inglés (US/UK)',
    
    // Sections
    'section.input': 'Entrada',
    'section.results': 'Resultados',
    
    // Input Form
    'input.resume.label': 'Texto del Currículum / CV',
    'input.resume.placeholder': 'Pega aquí tu currículum (texto plano o markdown)...',
    'input.resume.chars': 'caracteres',
    'input.resume.min': 'mín',
    'input.resume.tooShort': 'Muy corto',
    'input.resume.tooLong': 'Muy largo',
    'input.provider.label': 'Proveedor de IA',
    'input.model.label': 'Modelo Preferido',
    'input.model.updated': 'Modelo actualizado para coincidir con el proveedor seleccionado.',
    'input.apikey.label': 'Tu Propia API Key (Opcional)',
    'input.apikey.placeholder.openai': 'Ingresa tu API key de OpenAI para usar en lugar de la predeterminada',
    'input.apikey.placeholder.gemini': 'Ingresa tu API key de Google Gemini para usar en lugar de la predeterminada',
    'input.apikey.help': 'Las claves no se almacenan — solo se envían con esta solicitud. Dejar en blanco para usar la clave configurada en el servidor.',
    'input.perspective.label': 'Perspectiva de Análisis',
    'input.language.label': 'Idioma',
    'input.region.label': 'Región',
    'input.targetRole.label': 'Puesto Objetivo (Opcional)',
    'input.targetRole.placeholder': 'ej., Ingeniero de Software Senior',
    'input.jobDesc.label': 'Descripción del Puesto (Opcional - habilita análisis de palabras clave)',
    'input.jobDesc.placeholder': 'Pega aquí la descripción del puesto para obtener análisis de coincidencia de palabras clave...',
    'input.tone.label': 'Tono',
    'input.analyze.button': 'Analizar Currículum',
    'input.analyzing.button': 'Analizando Currículum...',
    
    // Results
    'results.empty': 'Los resultados de tu análisis aparecerán aquí',
    'results.empty.hint': 'Llena el formulario y haz clic en "Analizar Currículum"',
    'results.analyzing': 'Analizando tu currículum...',
    'results.analyzing.hint': 'Esto puede tomar un minuto',
    'results.error': 'Error',
    
    // Footer
    'footer.disclaimer.title': '⚠️ Aviso Importante: Siempre revisa y verifica el contenido generado por IA',
    'footer.disclaimer.text': 'Esta herramienta utiliza inteligencia artificial para generar sugerencias. Es tu responsabilidad revisar, validar y ajustar todo el contenido antes de usarlo. No incluyas información falsa o inexacta en tu currículum.',
    'footer.info': 'Impulsado por IA • No se almacenan datos • Análisis que preserva la privacidad',
    
    // Perspectives
    'perspective.general': 'General / Holístico',
    'perspective.general.desc': 'Evaluación equilibrada en todas las dimensiones',
    'perspective.leadership': 'Liderazgo / Gestión',
    'perspective.leadership.desc': 'Enfoque en impacto organizacional, presupuestos, estrategia',
    'perspective.technical': 'Técnico / Ingeniería',
    'perspective.technical.desc': 'Stack tecnológico, rendimiento, escalabilidad',
    'perspective.sales': 'Especialista en Ventas',
    'perspective.sales.desc': 'Cumplimiento de cuotas, pipeline, tasas de éxito',
    'perspective.hr': 'Recursos Humanos',
    'perspective.hr.desc': 'Reclutamiento, retención, HRIS',
    'perspective.legal': 'Especialista Legal',
    'perspective.legal.desc': 'Áreas de práctica, cumplimiento, riesgos',
    'perspective.customer_service': 'Servicio al Cliente / CX',
    'perspective.customer_service.desc': 'CSAT, NPS, métricas de resolución',
    'perspective.product': 'Gestión de Producto',
    'perspective.product.desc': 'Roadmap, adopción, experimentos',
    'perspective.marketing': 'Marketing / Marca',
    'perspective.marketing.desc': 'Campañas, CAC/LTV, métricas de embudo',
    'perspective.finance': 'Finanzas / FP&A',
    'perspective.finance.desc': 'Presupuestación, pronósticos, optimización de costos',
    'perspective.operations': 'Operaciones / PMO',
    'perspective.operations.desc': 'Eficiencia de procesos, entrega, Lean/Six Sigma',
    
    // Tones
    'tone.professional': 'Profesional',
    'tone.concise': 'Conciso',
    'tone.friendly': 'Amigable',
    
    // Languages
    'lang.es': 'Español',
    'lang.en': 'Inglés (English - US)',
    'lang.en-GB': 'Inglés (English - UK)',
    
    // Regions
    'region.latam_mx': 'LATAM (México)',
    'region.usa': 'Estados Unidos',
    'region.uk': 'Reino Unido',
    
    // Results Display
    'results.tab.overview': 'Resumen y Puntuaciones',
    'results.tab.recommendations': 'Recomendaciones',
    'results.tab.improved': 'Currículum Mejorado',
    'results.tab.canva': 'Exportar a Canva',
    'results.notices': 'Avisos',
    'results.scores': 'Puntuaciones de Diagnóstico',
    'results.strengths': 'Fortalezas',
    'results.gaps': 'Áreas de Mejora',
    'results.risks': 'Riesgos',
    'results.keywords': 'Análisis de Palabras Clave',
    'results.keywords.missing': 'Palabras Clave Faltantes:',
    'results.keywords.suggestions': 'Sugerencias de Integración:',
    'results.recommendations.top': 'Principales Recomendaciones',
    'results.recommendations.section': 'Mejoras por Sección',
    'results.changelog': 'Qué Cambió',
    'results.nextsteps': 'Siguientes Pasos',
    'results.copy': 'Copiar al Portapapeles',
    'results.copied': '¡Copiado!',
    'results.download': 'Descargar Markdown',
    'results.improved': 'Currículum Mejorado',
    'results.score.excellent': 'Excelente',
    'results.score.good': 'Bueno',
    'results.score.fair': 'Aceptable',
    'results.score.poor': 'Deficiente',
    
    // Canva Export
    'canva.title': 'Guía de Diseño para Canva',
    'canva.subtitle': 'Sigue estas instrucciones para crear un CV profesional en Canva',
    'canva.loading': 'Generando guía de diseño...',
    'canva.generate': 'Generar Guía de Canva',
    'canva.template.title': '📋 Plantilla Recomendada',
    'canva.template.search': 'Busca en Canva:',
    'canva.template.keywords': '"Currículum Moderno ATS" o "Currículum Profesional Minimalista"',
    'canva.section.title': 'Sección {number}: {name}',
    'canva.copy.section': 'Copiar Sección',
    'canva.copied': '¡Copiado!',
    'canva.design.tips': '💡 Consejos de Diseño',
    'canva.colors.title': 'Colores Recomendados',
    'canva.colors.professional': 'Azul oscuro (#1e3a8a) + Gris (#64748b)',
    'canva.colors.creative': 'Verde azulado (#0d9488) + Naranja (#ea580c)',
    'canva.fonts.title': 'Fuentes Recomendadas',
    'canva.fonts.heading': 'Encabezados: Montserrat Bold o Poppins SemiBold',
    'canva.fonts.body': 'Cuerpo: Open Sans o Roboto (11-12pt)',
    'canva.layout.title': 'Diseño y Espaciado',
    'canva.layout.margins': 'Márgenes: 1.5-2cm en todos los lados',
    'canva.layout.spacing': 'Espaciado entre secciones: 0.5-0.8cm',
    'canva.ats.warning': '⚠️ Importante para ATS',
    'canva.ats.tip1': 'Usa un diseño simple de 1 columna',
    'canva.ats.tip2': 'Evita tablas, gráficos complejos e imágenes con texto',
    'canva.ats.tip3': 'Exporta como PDF con texto seleccionable (no imagen)',
  },
  en: {
    // Header
    'app.title': 'Resume Analyzer & Optimizer',
    'app.subtitle': 'Get ATS-optimized feedback (AI Analysis) and an improved version of your resume from multiple professional perspectives',
    'app.feature.ai': 'AI-Powered Analysis',
    'app.feature.perspectives': 'Multiple Perspectives',
    'app.feature.regions': 'LATAM (Mexico), USA & UK',
    'app.feature.languages': 'Spanish (Mexico), English (US/UK)',
    
    // Sections
    'section.input': 'Input',
    'section.results': 'Results',
    
    // Input Form
    'input.resume.label': 'Resume / CV Text',
    'input.resume.placeholder': 'Paste your resume here (plain text or markdown)...',
    'input.resume.chars': 'characters',
    'input.resume.min': 'min',
    'input.resume.tooShort': 'Too short',
    'input.resume.tooLong': 'Too long',
    'input.provider.label': 'AI Provider',
    'input.model.label': 'Preferred Model',
    'input.model.updated': 'Model updated to match the selected provider.',
    'input.apikey.label': 'BYO API Key (Optional)',
    'input.apikey.placeholder.openai': 'Enter your OpenAI API key to override server default',
    'input.apikey.placeholder.gemini': 'Enter your Google Gemini API key to override server default',
    'input.apikey.help': 'Keys are not stored — sent only with this request. Leave blank to use the server-configured key.',
    'input.perspective.label': 'Analysis Perspective',
    'input.language.label': 'Language',
    'input.region.label': 'Region',
    'input.targetRole.label': 'Target Role (Optional)',
    'input.targetRole.placeholder': 'e.g., Senior Software Engineer',
    'input.jobDesc.label': 'Job Description (Optional - enables keyword analysis)',
    'input.jobDesc.placeholder': 'Paste the job description to get keyword matching analysis...',
    'input.tone.label': 'Tone',
    'input.analyze.button': 'Analyze Resume',
    'input.analyzing.button': 'Analyzing Resume...',
    
    // Results
    'results.empty': 'Your analysis results will appear here',
    'results.empty.hint': 'Fill in the form and click "Analyze Resume"',
    'results.analyzing': 'Analyzing your resume...',
    'results.analyzing.hint': 'This may take a minute',
    'results.error': 'Error',
    
    // Footer
    'footer.disclaimer.title': '⚠️ Important Notice: Always review and verify AI-generated content',
    'footer.disclaimer.text': 'This tool uses artificial intelligence to generate suggestions. It is your responsibility to review, validate, and adjust all content before using it. Do not include false or inaccurate information in your resume.',
    'footer.info': 'Powered by AI • No data stored • Privacy-preserving analysis',
    
    // Perspectives
    'perspective.general': 'General / Holistic',
    'perspective.general.desc': 'Balanced assessment across all dimensions',
    'perspective.leadership': 'Leadership / Management',
    'perspective.leadership.desc': 'Focus on org impact, budgets, strategy',
    'perspective.technical': 'Technical / Engineering',
    'perspective.technical.desc': 'Technology stack, performance, scalability',
    'perspective.sales': 'Sales Specialist',
    'perspective.sales.desc': 'Quota attainment, pipeline, win rates',
    'perspective.hr': 'Human Resources',
    'perspective.hr.desc': 'Recruiting, retention, HRIS',
    'perspective.legal': 'Legal Specialist',
    'perspective.legal.desc': 'Practice areas, compliance, risk',
    'perspective.customer_service': 'Customer Service / CX',
    'perspective.customer_service.desc': 'CSAT, NPS, resolution metrics',
    'perspective.product': 'Product Management',
    'perspective.product.desc': 'Roadmap, adoption, experiments',
    'perspective.marketing': 'Marketing / Brand',
    'perspective.marketing.desc': 'Campaigns, CAC/LTV, funnel metrics',
    'perspective.finance': 'Finance / FP&A',
    'perspective.finance.desc': 'Budgeting, forecasting, cost optimization',
    'perspective.operations': 'Operations / PMO',
    'perspective.operations.desc': 'Process efficiency, delivery, Lean/Six Sigma',
    
    // Tones
    'tone.professional': 'Professional',
    'tone.concise': 'Concise',
    'tone.friendly': 'Friendly',
    
    // Languages
    'lang.es': 'Spanish (Español)',
    'lang.en': 'English (US)',
    'lang.en-GB': 'English (UK)',
    
    // Regions
    'region.latam_mx': 'LATAM (Mexico)',
    'region.usa': 'United States',
    'region.uk': 'United Kingdom',
    
    // Results Display
    'results.tab.overview': 'Overview & Scores',
    'results.tab.recommendations': 'Recommendations',
    'results.tab.improved': 'Improved Resume',
    'results.tab.canva': 'Export to Canva',
    'results.notices': 'Notices',
    'results.scores': 'Diagnostic Scores',
    'results.strengths': 'Strengths',
    'results.gaps': 'Gaps',
    'results.risks': 'Risks',
    'results.keywords': 'Keyword Analysis',
    'results.keywords.missing': 'Missing Keywords:',
    'results.keywords.suggestions': 'Integration Suggestions:',
    'results.recommendations.top': 'Top Recommendations',
    'results.recommendations.section': 'Section-Specific Improvements',
    'results.changelog': 'What Changed',
    'results.nextsteps': 'Next Steps',
    'results.copy': 'Copy to Clipboard',
    'results.copied': 'Copied!',
    'results.download': 'Download Markdown',
    'results.improved': 'Improved Resume',
    'results.score.excellent': 'Excellent',
    'results.score.good': 'Good',
    'results.score.fair': 'Fair',
    'results.score.poor': 'Poor',
    
    // Canva Export
    'canva.title': 'Canva Design Guide',
    'canva.subtitle': 'Follow these instructions to create a professional CV in Canva',
    'canva.loading': 'Generating design guide...',
    'canva.generate': 'Generate Canva Guide',
    'canva.template.title': '📋 Recommended Template',
    'canva.template.search': 'Search in Canva:',
    'canva.template.keywords': '"Modern ATS Resume" or "Professional Minimalist Resume"',
    'canva.section.title': 'Section {number}: {name}',
    'canva.copy.section': 'Copy Section',
    'canva.copied': 'Copied!',
    'canva.design.tips': '💡 Design Tips',
    'canva.colors.title': 'Recommended Colors',
    'canva.colors.professional': 'Dark Blue (#1e3a8a) + Gray (#64748b)',
    'canva.colors.creative': 'Teal (#0d9488) + Orange (#ea580c)',
    'canva.fonts.title': 'Recommended Fonts',
    'canva.fonts.heading': 'Headings: Montserrat Bold or Poppins SemiBold',
    'canva.fonts.body': 'Body: Open Sans or Roboto (11-12pt)',
    'canva.layout.title': 'Layout & Spacing',
    'canva.layout.margins': 'Margins: 1.5-2cm on all sides',
    'canva.layout.spacing': 'Spacing between sections: 0.5-0.8cm',
    'canva.ats.warning': '⚠️ Important for ATS',
    'canva.ats.tip1': 'Use a simple 1-column layout',
    'canva.ats.tip2': 'Avoid tables, complex graphics, and images with text',
    'canva.ats.tip3': 'Export as PDF with selectable text (not image)',
  },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [uiLanguage, setUILanguage] = useState<UILanguage>('es');
  const [theme, setTheme] = useState<Theme>('light');

  // Load preferences from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('uiLanguage') as UILanguage;
    const savedTheme = localStorage.getItem('theme') as Theme;
    
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setUILanguage(savedLang);
    }
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
    }
  }, []);

  // Save and apply language preference
  useEffect(() => {
    localStorage.setItem('uiLanguage', uiLanguage);
  }, [uiLanguage]);

  // Save and apply theme preference
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const t = (key: string): string => {
    return translations[uiLanguage][key] || key;
  };

  return (
    <AppContext.Provider value={{ uiLanguage, setUILanguage, theme, setTheme, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
