# Code Documentation - Docstrings Guide

This document provides an overview of the docstring documentation added to the Resume Analyzer codebase.

## Documentation Standard

All code files follow **JSDoc** style documentation with TypeScript-specific annotations.

### Format

```typescript
/**
 * Brief description
 * 
 * Detailed explanation of functionality, features, or behavior.
 * Can include multiple paragraphs.
 * 
 * @module module/path (for files)
 * @component (for React components)
 * @param {Type} paramName - Parameter description
 * @returns {ReturnType} Return value description
 * @throws {ErrorType} When error occurs
 * 
 * @example
 * ```tsx
 * <Component prop={value} />
 * ```
 */
```

---

## Documented Files

### 1. API Route: `/src/app/api/analyze/route.ts`

**Module-level documentation:**
- Purpose: Resume analysis API endpoint
- Functionality: OpenAI GPT-4 integration
- Input/output schemas

**Key documented elements:**
- `openai` constant - OpenAI client configuration
- `SYSTEM_PROMPT` constant - Comprehensive AI prompt (v2.0)
- `POST()` function - Main API handler with examples

**Example:**
```typescript
/**
 * POST handler for resume analysis
 * 
 * Accepts a JSON payload with résumé text and analysis parameters,
 * sends it to OpenAI GPT-4 for analysis, and returns structured feedback.
 * 
 * @async
 * @function POST
 * @param {NextRequest} req - Next.js request object containing AnalysisInput JSON
 * @returns {Promise<NextResponse<AnalysisOutput | {error: string}>>}
 */
```

---

### 2. Component: `/src/components/ResumeInput.tsx`

**Module-level documentation:**
- Purpose: Input form for résumé analysis
- Features: Character validation, perspective selection, region/language options
- Validation rules: 100-15000 characters

**Key documented elements:**
- `ResumeInputProps` interface - Component props with descriptions
- `PERSPECTIVES` constant - 11 professional lenses array
- `ResumeInput()` component - Main form with usage example

**Example:**
```typescript
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
```

---

### 3. Component: `/src/components/ResultsDisplay.tsx`

**Module-level documentation:**
- Purpose: Display analysis results in tabbed interface
- Features: 3 tabs (Overview, Recommendations, Improved Resume)
- Interactivity: Copy/download functionality
- Safety: Sanitizes AI markdown to escape unknown HTML-like placeholders before rendering

**Key documented elements:**
- `ResultsDisplayProps` interface - Component props
- `ResultsDisplay()` component - Main display component
- `getScoreColor()` helper - Score badge styling
- `getScoreLabel()` helper - Score text labels
- `sanitizeMarkdownPlaceholders()` helper - Escapes unsupported tags to prevent React errors
- `handleCopy()` handler - Clipboard functionality
- `handleDownload()` handler - File download

**Example:**
```typescript
/**
 * Copies improved résumé markdown to clipboard
 * Shows "Copied!" feedback for 2 seconds
 */
const handleCopy = async () => {
  await navigator.clipboard.writeText(result.improved_resume_markdown);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

---

### 4. Page: `/src/app/page.tsx`

**Module-level documentation:**
- Purpose: Main application page
- Features: Responsive layout, state management, API integration
- Workflow: Input → Analyze → Results

**Key documented elements:**
- Module-level overview - Application workflow
- `Home()` component - Main page component
- `handleAnalyze()` function - API call handler

**Example:**
```typescript
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
```

---

## Type Documentation

### `/src/types/index.ts`

All TypeScript types and interfaces are well-documented with:
- Enum values and their meanings
- Interface properties with descriptions
- Complex nested structures explained

**Key types:**
- `Perspective` - 11 analysis perspectives
- `Language` - en | es
- `Region` - usa | latam_mx
- `AnalysisInput` - Complete input schema
- `AnalysisOutput` - Complete output schema with nested structures
- `PerspectiveOption` - Perspective UI option

---

## Documentation Coverage

### ✅ Fully Documented

| File | Functions | Constants | Interfaces | Components |
|------|-----------|-----------|------------|------------|
| `/src/app/api/analyze/route.ts` | ✅ 1/1 | ✅ 2/2 | - | - |
| `/src/components/ResumeInput.tsx` | ✅ 1/1 | ✅ 1/1 | ✅ 1/1 | ✅ 1/1 |
| `/src/components/ResultsDisplay.tsx` | ✅ 6/6 | ✅ 1/1 | ✅ 1/1 | ✅ 1/1 |
| `/src/app/page.tsx` | ✅ 2/2 | - | - | ✅ 1/1 |
| `/src/types/index.ts` | - | - | ✅ All | - |

**Total Coverage: 100%** ✅

---

## Best Practices Followed

### 1. **Clarity**
- Brief summary in first line
- Detailed explanation follows
- Technical terms explained

### 2. **Completeness**
- All parameters documented
- Return types specified
- Error cases noted
- Examples provided

### 3. **Consistency**
- JSDoc format throughout
- TypeScript type annotations
- Uniform structure across files

### 4. **Practical Examples**
- Real usage examples
- Copy-pasteable code snippets
- Expected input/output shown

### 5. **Maintainability**
- Module-level documentation for context
- Function-level docs for specifics
- Helper functions documented
- Edge cases mentioned

---

## Usage for Developers

### Reading Documentation

**In VS Code:**
1. Hover over any function/component to see docs
2. Use `Ctrl+Space` for IntelliSense with descriptions
3. `F12` (Go to Definition) shows full docstring

**In IDE:**
- Docstrings appear in autocomplete
- Type hints include parameter descriptions
- Examples guide usage

### Generating Documentation

**Using TypeDoc:**
```bash
npm install -g typedoc
typedoc --out docs src/
```

**Using JSDoc:**
```bash
npm install -g jsdoc
jsdoc -c jsdoc.json
```

---

## Maintenance Guidelines

### When Adding New Code

1. **Always add module-level docs** for new files
2. **Document all exported functions/components**
3. **Include @param for all parameters**
4. **Specify @returns type**
5. **Add @example for complex usage**

### When Modifying Existing Code

1. **Update docstrings** if behavior changes
2. **Add new parameters** to @param list
3. **Update examples** if API changes
4. **Keep descriptions accurate**

### Review Checklist

Before committing code, verify:

- [ ] All new functions have docstrings
- [ ] All parameters are documented
- [ ] Return types are specified
- [ ] Examples are provided for public APIs
- [ ] Module-level docs exist for new files
- [ ] No outdated information in docs

---

## Documentation Patterns

### API Routes
```typescript
/**
 * Brief description of endpoint
 * 
 * Detailed explanation of what it does
 * 
 * @async
 * @function METHOD
 * @param {NextRequest} req - Request description
 * @returns {Promise<NextResponse<Type>>} Response description
 * 
 * @throws {Error} When something fails
 * 
 * @example
 * // Request
 * POST /api/endpoint
 * { "field": "value" }
 * 
 * // Response
 * { "result": "data" }
 */
```

### React Components
```typescript
/**
 * Component description
 * 
 * Features and behavior
 * 
 * @component
 * @param {Props} props - Props description
 * @returns {JSX.Element} Rendered component
 * 
 * @example
 * ```tsx
 * <Component prop="value" />
 * ```
 */
```

### Helper Functions
```typescript
/**
 * Function description
 * 
 * @param {Type} param - Parameter description
 * @returns {ReturnType} What it returns
 */
```

### Constants
```typescript
/**
 * Constant description
 * 
 * Purpose and usage notes
 * 
 * @constant
 * @type {Type}
 */
```

---

## External Documentation Links

- **JSDoc**: https://jsdoc.app/
- **TypeScript JSDoc**: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- **TypeDoc**: https://typedoc.org/
- **Next.js Docs**: https://nextjs.org/docs

---

## Questions & Support

For questions about documentation:
1. Check this guide first
2. Review existing docstrings for patterns
3. Refer to JSDoc/TypeScript docs
4. Ask in team chat/PR reviews

---

**Last Updated:** 2025-10-01
**Documentation Standard:** JSDoc with TypeScript
**Coverage:** 100%
