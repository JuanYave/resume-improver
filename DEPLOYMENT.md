# Deployment Guide

This guide covers deploying the Resume Analyzer to various hosting platforms.

## 🚀 Vercel (Recommended - Easiest)

### Prerequisites
- GitHub account
- Vercel account (free tier available)

### Option 1: Deploy via Vercel Dashboard (No CLI)

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Resume Analyzer v1.0"
   git branch -M main
   git remote add origin https://github.com/yourusername/resume-analyzer.git
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to https://vercel.com/new
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables:**
   - In the import screen, expand "Environment Variables"
   - Add: `OPENAI_API_KEY` = `sk-your-actual-key`
   - Optionally add: `OPENAI_MODEL` = `gpt-4-turbo-preview`

4. **Deploy:**
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your app is live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? resume-analyzer
# - Directory? ./
# - Override settings? N

# Add environment variable
vercel env add OPENAI_API_KEY

# Paste your API key when prompted

# Deploy to production
vercel --prod
```

### Custom Domain (Optional)

```bash
# Add domain in Vercel dashboard or via CLI
vercel domains add yourdomain.com
```

---

## 🌐 Netlify

### Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod

# Add environment variables in Netlify dashboard:
# Site settings → Environment Variables → Add variable
# Key: OPENAI_API_KEY
# Value: sk-your-key
```

### Deploy via Git

1. Push to GitHub (see Vercel steps above)
2. Go to https://app.netlify.com/start
3. Click "Import from Git"
4. Select repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables in Site Settings
7. Deploy

---

## 🐳 Docker

### Build and Run Locally

```bash
# Build image
docker build -t resume-analyzer .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  resume-analyzer

# Access at http://localhost:3000
```

### Deploy to Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag image
docker tag resume-analyzer yourusername/resume-analyzer:latest

# Push
docker push yourusername/resume-analyzer:latest
```

### Deploy to Cloud Run (Google Cloud)

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/resume-analyzer

# Deploy to Cloud Run
gcloud run deploy resume-analyzer \
  --image gcr.io/YOUR_PROJECT_ID/resume-analyzer \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=sk-your-key
```

---

## ☁️ AWS (Amplify or EC2)

### AWS Amplify

1. Push to GitHub
2. Go to AWS Amplify Console
3. Connect repository
4. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
5. Add environment variables in Amplify console
6. Deploy

### AWS EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Clone repository
git clone https://github.com/yourusername/resume-analyzer.git
cd resume-analyzer

# Install dependencies
npm install

# Create .env file
echo "OPENAI_API_KEY=sk-your-key" > .env

# Build
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start app
pm2 start npm --name "resume-analyzer" -- start

# Save PM2 config
pm2 save
pm2 startup
```

---

## 🔧 Environment Variables Reference

All platforms require these environment variables:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI API key | `sk-proj-xxx...` |
| `OPENAI_MODEL` | No | Model to use | `gpt-4-turbo-preview` |
| `NODE_ENV` | Auto | Environment | `production` |

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] **API Key Security**
  - [ ] Never commit `.env` to git (check `.gitignore`)
  - [ ] Use environment variables on hosting platform
  - [ ] Rotate API keys periodically

- [ ] **Rate Limiting**
  - [ ] Implement per-IP rate limiting (10 req/min recommended)
  - [ ] Add CAPTCHA for public deployments
  - [ ] Monitor API usage in OpenAI dashboard

- [ ] **HTTPS**
  - [ ] Ensure SSL/TLS enabled (auto on Vercel/Netlify)
  - [ ] Use custom domain with SSL certificate

- [ ] **Input Validation**
  - [ ] Verify character limits enforced (100-15000)
  - [ ] Sanitize input for prompt injection

- [ ] **Monitoring**
  - [ ] Set up error tracking (Sentry, LogRocket)
  - [ ] Monitor API costs
  - [ ] Track response times

---

## 💰 Cost Optimization

### Use Cheaper Models

Update `.env`:
```bash
# GPT-3.5 Turbo (80% cheaper)
OPENAI_MODEL=gpt-3.5-turbo

# GPT-4 Turbo (balanced)
OPENAI_MODEL=gpt-4-turbo-preview

# GPT-4 (most expensive but best quality)
OPENAI_MODEL=gpt-4
```

### Implement Caching

Add response caching for identical inputs:

```typescript
// In api/analyze/route.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Generate cache key
const cacheKey = `analysis:${hashInput(input)}`;

// Check cache
const cached = await redis.get(cacheKey);
if (cached) return NextResponse.json(cached);

// ... make API call ...

// Cache for 1 hour
await redis.setex(cacheKey, 3600, result);
```

### Set Usage Limits

In OpenAI dashboard:
- Set monthly budget cap
- Enable usage notifications
- Set hard limits per API key

---

## 📊 Monitoring & Analytics

### Error Tracking (Sentry)

```bash
npm install @sentry/nextjs

npx @sentry/wizard@latest -i nextjs
```

Add to `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### Analytics (Vercel Analytics)

```bash
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🧪 Production Testing

Before launching:

1. **Load Test:**
   ```bash
   # Install autocannon
   npm install -g autocannon
   
   # Test API endpoint
   autocannon -c 10 -d 30 https://your-domain.com/api/analyze
   ```

2. **Security Scan:**
   ```bash
   npm audit
   npm audit fix
   ```

3. **Accessibility Check:**
   - Run Lighthouse in Chrome DevTools
   - Target: 90+ scores in all categories

4. **Mobile Testing:**
   - Test on iOS Safari
   - Test on Android Chrome
   - Verify responsive design

---

## 🚨 Rollback Plan

If deployment fails:

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Netlify
```bash
# List deploys
netlify deploy:list

# Restore specific deploy
netlify deploy:restore [deploy-id]
```

### Docker
```bash
# Pull previous version
docker pull yourusername/resume-analyzer:previous-tag

# Restart with old image
docker run -p 3000:3000 yourusername/resume-analyzer:previous-tag
```

---

## 📞 Support

**Issues during deployment?**

1. Check build logs for errors
2. Verify environment variables are set
3. Test locally first: `npm run build && npm start`
4. Check platform status pages:
   - Vercel: https://www.vercel-status.com
   - Netlify: https://www.netlifystatus.com
   - OpenAI: https://status.openai.com

**Need help?** Open an issue on GitHub with:
- Platform being deployed to
- Error messages from logs
- Steps already tried
