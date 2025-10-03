# Resume Analyzer & Improver

A lightweight, AI-powered web application that analyzes résumés/CVs and provides (1) precise, actionable feedback and (2) an improved alternative version—adapted to a selected **perspective** and **region**.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991)

## ✨ Key Features

- **Multi-Perspective Analysis**: Choose from 11 professional perspectives (General, Leadership, Technical, Sales, HR, Legal, Customer Service, Product, Marketing, Finance, Operations)
- **ATS-Aware**: Optimized for Applicant Tracking Systems with keyword analysis
- **Bilingual**: Support for English and Spanish résumés
- **Regional Adaptation**: Formatted for USA or LATAM (Mexico) standards
- **Keyword Helper**: Compares résumé against job descriptions and suggests truthful integrations
- **Diagnostic Scores**: 5-dimensional evaluation (Clarity, Impact, ATS Alignment, Readability, Role Fit)
- **Safe Markdown Rendering**: Escapes unknown AI placeholders so React displays them as text without runtime warnings
- **Privacy-Preserving**: No data storage, client-side processing where possible
- **Bias-Aware**: Gender-neutral language, no demographic inferences

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- OpenAI API key (or compatible LLM provider)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd resume-improver

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Add your OpenAI API key to .env
# OPENAI_API_KEY=sk-your-api-key-here

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📋 Usage

1. **Paste Resume**: Enter your résumé text (plain text or markdown)
2. **Select Perspective**: Choose the professional lens for analysis
3. **Choose Language**: English or Spanish
4. **Select Region**: USA or LATAM (Mexico)
5. **Optional**: Add target role and job description for keyword analysis
6. **Analyze**: Click the button and wait a minute
7. **Review Results**: View scores, recommendations, and improved résumé
8. **Download/Copy**: Save the improved version

## 🧪 Test Cases

### Test Case 1: Minimal Resume (Technical Perspective)

**Input:**
```
John Doe
Software Engineer

Experience:
Acme Corp (2020-2023)
- Worked on backend systems
- Fixed bugs
- Attended meetings

Skills: Python, JavaScript
```

**Expected Output:**
- Low scores on impact (generic bullets), ATS alignment (missing keywords)
- Recommendations to quantify impact, add technical depth
- Improved résumé with placeholders like "Architected microservices handling <add QPS> requests"

### Test Case 2: With Job Description (Sales Perspective)

**Input Resume:**
```
Jane Smith
Sales Representative

ABC Company (2021-2023)
- Managed client accounts
- Increased revenue
- Built relationships

Skills: Salesforce, Negotiation
```

**Input Job Description:**
```
Seeking Senior Account Executive with proven track record of exceeding quota.
Must have experience with enterprise sales, SaaS, and MEDDICC methodology.
```

**Expected Output:**
- Keyword helper identifies missing: quota %, enterprise, SaaS, MEDDICC, ACV
- Recommendations to add quantified metrics
- Integration suggestions for missing keywords

### Test Case 3: Spanish Resume (LATAM Region)

**Input:**
```
María García
Ingeniera de Software

Experiencia:
Tech Solutions (2019-2023)
- Desarrollé aplicaciones web
- Trabajé con el equipo
- Resolví problemas técnicos

Habilidades: React, Node.js, Python
```

**Expected Output:**
- Spanish language output
- LATAM formatting (MM/AAAA dates acceptable)
- Professional Spanish tone recommendations
- Metrics placeholders in Spanish

## 📊 Output Structure

The API returns a comprehensive JSON object with:

- **meta**: Language, perspective, region, schema version, warnings/errors
- **extracted_profile**: Parsed sections (headline, summary, skills, experience, education, certifications, achievements)
- **diagnostic**: Scores (0-10 scale), strengths, gaps, risks
- **keyword_helper**: JD keywords, coverage analysis, missing keywords, integration suggestions (if JD provided)
- **recommendations**: Global and section-specific improvements
- **improved_resume_markdown**: Complete rewritten résumé
- **changelog**: What changed and why
- **next_steps**: Tailoring tips

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/analyze/route.ts    # OpenAI API integration
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page
│   └── globals.css              # Global styles
├── components/
│   ├── ResumeInput.tsx          # Input form
│   └── ResultsDisplay.tsx       # Results display
└── types/
    └── index.ts                 # TypeScript interfaces
```

## 🔧 Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `OPENAI_MODEL`: Model to use (default: `gpt-4-turbo-preview`)

### Constraints

- **Min Resume Length**: 100 characters
- **Max Resume Length**: 15,000 characters
- **Output Tokens**: 4,000 max
- **Temperature**: 0.3 (for consistency)
- **Rate Limit**: 10 requests/minute recommended

## 💰 Cost Estimation

**Per Analysis:**
- Input tokens: ~2,000-3,000
- Output tokens: ~3,000-4,000
- **OpenAI GPT-4**: ~$0.15-0.25 per analysis
- **Anthropic Claude**: ~$0.10-0.20 per analysis

**Pilot Budget:**
- 100 analyses: $15-25
- 500 analyses: $75-125

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Settings > Environment Variables > OPENAI_API_KEY
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Add environment variables in Netlify dashboard
```

### Docker

```bash
# Build image
docker build -t resume-analyzer .

# Run container
docker run -p 3000:3000 -e OPENAI_API_KEY=your-key resume-analyzer
```

## 🔒 Security & Privacy

- **No Data Storage**: Résumés are not saved or logged
- **No Tracking**: User sessions not tracked beyond rate limiting
- **Input Sanitization**: Protects against prompt injection and escapes unrecognized HTML-like tags in generated markdown
- **API Key Security**: Keys stored in environment variables only
- **HTTPS**: Enforce SSL/TLS in production

## 🎨 Customization

### Add New Perspective

1. Add to `src/types/index.ts`:
```typescript
export type Perspective = 
  | 'general'
  | 'your_new_perspective';
```

2. Add to perspective list in `src/components/ResumeInput.tsx`

3. Update system prompt in `src/app/api/analyze/route.ts` with evaluation criteria

### Extend to More Languages

1. Add language to type: `export type Language = 'es' | 'en' | 'fr';`
2. Update validation in API route
3. Add to language dropdown in ResumeInput component

### Change LLM Provider

Replace OpenAI with Anthropic Claude:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 4000,
  messages: [{ role: 'user', content: userMessage }],
  system: SYSTEM_PROMPT,
});
```

## 📈 Roadmap

- [ ] PDF upload with text extraction
- [ ] DOCX file support
- [ ] More regional formats (Canada, EU, APAC)
- [ ] Additional languages (French, Portuguese, German)
- [ ] A/B testing different prompts
- [ ] User feedback collection
- [ ] Batch processing
- [ ] LinkedIn profile import
- [ ] Resume templates gallery

## 🧪 Testing

Run the development server and test with sample résumés in `test-samples/` directory.

### Quality Benchmarks

- ✅ 90%+ of rewrites improve at least 3 of 5 scores by ≥1 point
- ✅ Zero fabricated information
- ✅ 100% valid JSON output
- ✅ <15s response time for typical résumés

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with Next.js, TypeScript, and Tailwind CSS
- Powered by OpenAI GPT-4
- Icons by Lucide React
- Markdown rendering by markdown-to-jsx

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**⚠️ Disclaimer**: This tool provides AI-generated suggestions. Users should review all changes and verify accuracy before using the improved résumé. The tool does not provide legal, immigration, or professional career advice.
