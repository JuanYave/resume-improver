# Quick Start Guide - Resume Analyzer Prototype

This guide helps you validate the Resume Analyzer prompt v2.0 by building and testing the prototype.

## 📋 Prerequisites

- Node.js 18+ installed ([Download](https://nodejs.org/))
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Terminal/Command line access

## 🚀 Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd /Users/juanherrera/code/resume-improver
npm install
```

Expected output: `added XXX packages in XXs`

### Step 2: Configure API Key

```bash
# Copy the example env file
cp .env.example .env

# Open .env and add your OpenAI API key
# Replace sk-your-api-key-here with your actual key
```

Your `.env` file should look like:
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview
```

### Step 3: Start Development Server

```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in XXXms
```

### Step 4: Open Browser

Navigate to: **http://localhost:3000**

You should see the Resume Analyzer interface.

## 🧪 Test the Prompt

### Test 1: Minimal Technical Resume (5 min)

**Purpose**: Validate that the system identifies gaps and suggests improvements for sparse résumés.

1. **Copy the test resume:**
   ```bash
   cat test-samples/minimal-technical.txt
   ```

2. **In the app:**
   - Paste the resume text
   - Select Perspective: **Technical / Engineering**
   - Language: **English**
   - Region: **USA**
   - Click **Analyze Resume**

3. **Expected Results:**
   - ✅ Low scores (4-6 range) for Impact and Role Fit
   - ✅ Gaps identified: Missing metrics, vague bullets, no tech complexity shown
   - ✅ Recommendations to quantify impact (e.g., "add performance metrics")
   - ✅ Improved resume has placeholders like `<add QPS>`, `<verify metric>`
   - ✅ Changelog shows bullet transformations

### Test 2: Sales Resume with Job Description (7 min)

**Purpose**: Validate keyword helper functionality.

1. **Copy the test resume:**
   ```bash
   cat test-samples/sales-with-jd.txt
   ```

2. **In the app:**
   - Paste everything BEFORE the "---" line into **Resume Text**
   - Paste everything AFTER "JOB DESCRIPTION TO MATCH:" into **Job Description**
   - Select Perspective: **Sales Specialist**
   - Language: **English**
   - Region: **USA**
   - Click **Analyze Resume**

3. **Expected Results:**
   - ✅ Keyword Helper is **enabled**
   - ✅ Missing keywords identified: "quota %", "enterprise", "$100K+", "MEDDICC", "B2B", "pipeline"
   - ✅ Integration suggestions provided for each missing keyword
   - ✅ Improved resume incorporates keywords truthfully or uses placeholders
   - ✅ Next steps mention tailoring for enterprise sales

### Test 3: Spanish Resume - LATAM Format (5 min)

**Purpose**: Validate bilingual support and regional formatting.

1. **Copy the test resume:**
   ```bash
   cat test-samples/spanish-latam.txt
   ```

2. **In the app:**
   - Paste the resume text
   - Select Perspective: **Technical / Engineering** 
   - Language: **Spanish (Español)**
   - Region: **LATAM (Mexico)**
   - Click **Analyze Resume**

3. **Expected Results:**
   - ✅ All output text is in **Spanish**
   - ✅ Dates formatted for LATAM (MM/AAAA acceptable)
   - ✅ Recommendations in professional Spanish tone
   - ✅ Improved resume uses Spanish action verbs
   - ✅ Metric placeholders in Spanish (e.g., `<agregar métrica>`)

### Test 4: Edge Cases (Optional)

**Test Invalid Input:**
- Enter only 50 characters → Should show error "Too short"
- Enter 20,000 characters → Should show error "Too long"

**Test Without Job Description:**
- Analyze resume without JD → keyword_helper should show "disabled" with message

## 🔍 Validation Checklist

After running tests, verify:

- [ ] **JSON Output Valid**: No parsing errors in browser console
- [ ] **Scores in Range**: All scores between 0.0-10.0
- [ ] **No Fabrication**: Improved resume doesn't invent employers/dates/numbers
- [ ] **Placeholders Used**: Missing data marked with `<add metric>` or `<verify>`
- [ ] **Language Correct**: Spanish output when language=es
- [ ] **Region Format**: USA format excludes personal data, LATAM uses appropriate tone
- [ ] **Keyword Helper**: Works when JD provided, disabled when not
- [ ] **Changelog Present**: Shows what changed and why
- [ ] **Download Works**: Can copy/download improved resume

## 📊 Performance Benchmarks

Monitor these metrics during testing:

| Metric | Target | How to Check |
|--------|--------|-------------|
| Response Time | <15s | Watch loading spinner duration |
| Token Usage | <4000 output | Check OpenAI dashboard usage |
| Cost per Analysis | $0.15-0.25 | OpenAI dashboard → Usage → Costs |
| Error Rate | <5% | Should succeed on valid inputs |

## 🐛 Troubleshooting

### Error: "Invalid API Key"
- Check `.env` file has correct `OPENAI_API_KEY`
- Restart dev server: `npm run dev`

### Error: "Model not found"
- Change model in `.env`: `OPENAI_MODEL=gpt-3.5-turbo` (cheaper alternative)

### Empty Response
- Check OpenAI dashboard for rate limits
- Verify account has credits

### JSON Parse Error
- The model might not be following JSON format strictly
- Try adding `response_format: { type: 'json_object' }` to API call (already included)

### Slow Response (>30s)
- Large résumé (>10k chars) takes longer
- Check network connection
- Consider using streaming for better UX

## 📈 Next Steps After Validation

Once tests pass:

1. **Deploy to Vercel:**
   ```bash
   npm i -g vercel
   vercel
   # Add OPENAI_API_KEY in Vercel dashboard
   ```

2. **Optimize Costs:**
   - Use `gpt-3.5-turbo` for cheaper analysis ($0.03-0.05 per request)
   - Cache responses for identical inputs
   - Add request deduplication

3. **Enhance Features:**
   - Add PDF upload with text extraction
   - Implement response streaming for progress updates
   - Add user feedback collection
   - Create resume templates library

4. **Monitor Production:**
   - Set up error tracking (Sentry)
   - Monitor API costs (OpenAI dashboard)
   - Track user analytics (PostHog, Mixpanel)

## 💡 Tips for Testing

- **Test different perspectives**: Each should focus on relevant metrics (leadership → budgets, technical → stack)
- **Try various resume lengths**: 1 page vs 3 pages to see summarization
- **Test edge cases**: No experience, career gaps, career changers
- **Check bias**: Ensure gender-neutral language in outputs
- **Verify ATS compliance**: No tables, clean markdown, standard sections

## 📞 Support

If you encounter issues:

1. Check browser console for errors (F12 → Console)
2. Check terminal logs for server errors
3. Verify `.env` configuration
4. Review OpenAI API status: https://status.openai.com
5. Test with minimal example from `test-samples/minimal-technical.txt`

---

**Happy Testing! 🎉**

The prototype validates the Resume Analyzer v2.0 prompt and demonstrates all core features.
