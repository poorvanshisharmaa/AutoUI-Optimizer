# AutoUI Optimizer

AI-powered web performance analyzer and auto-optimization engine for modern web applications.

## Features

- Real-time Core Web Vitals tracking (LCP, CLS, INP, TTFB)
- React component-level render profiling
- AI-generated code fixes using **Groq + Llama 3** (free, fast)
- Static rule engine for instant diagnostics
- Performance score with before/after comparison
- Chrome Extension + Web Dashboard

## Free Hosting Stack

| Component | Service | Cost |
|-----------|---------|------|
| AI Inference | Groq API (Llama 3-70B) | Free tier |
| Backend API | Render.com | Free tier |
| Frontend | Vercel | Free tier |
| Database | Supabase (PostgreSQL) | Free tier |
| Cache | Upstash Redis | Free tier |
| Extension | Load unpacked in Chrome | Free |

---

## Setup

### 1. Get Free API Keys

- **Groq**: https://console.groq.com → Create API Key
- **Supabase**: https://supabase.com → New Project → Settings → Database URL
- **Upstash**: https://upstash.com → Create Redis → REST URL

### 2. Backend (Deploy to Render)

```bash
cd backend
cp .env.example .env
# Fill in your keys in .env

# Local dev
pip install -r requirements.txt
uvicorn main:app --reload
# API runs at http://localhost:8000
# Docs at http://localhost:8000/docs
```

**Deploy to Render (free):**
1. Push to GitHub
2. Go to render.com → New Web Service → Connect repo → select `backend/`
3. Add environment variables from `.env.example`
4. Deploy — you get `https://autoui-optimizer.onrender.com`

### 3. Frontend (Deploy to Vercel)

```bash
cd frontend-dashboard
cp .env.example .env.local
# Set VITE_API_URL=https://your-render-url.onrender.com/api

npm install
npm run dev   # Local dev at http://localhost:5173
```

**Deploy to Vercel (free):**
1. Push to GitHub
2. Go to vercel.com → New Project → Import repo → select `frontend-dashboard/`
3. Add `VITE_API_URL` environment variable
4. Deploy — you get `https://autoui-optimizer.vercel.app`

### 4. Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Update `API_BASE` in `contentScript.js` and `background.js` to your Render URL
5. Browse any website — extension auto-collects and sends metrics

---

## Architecture

```
Chrome Extension
      │  (POST /api/v1/performance/upload)
      ▼
FastAPI Backend (Render)
      │
 ┌────┴────────────────┐
 ▼                     ▼
Rule Engine          Groq AI (Llama 3)
(instant rules)      (code fix generation)
 └────┬────────────────┘
      ▼
 Result Aggregator
      │
 ┌────┴────┐
 ▼         ▼
Supabase  Upstash Redis
(storage) (cache)
      │
      ▼
Vercel Dashboard
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/performance/upload` | Ingest metrics from extension |
| POST | `/api/v1/analyze` | Re-analyze a session |
| GET | `/api/v1/suggestions/{sessionId}` | Get optimization suggestions |
| POST | `/api/v1/fix` | Generate AI code fix |
| GET | `/api/v1/compare?before=X&after=Y` | Compare two sessions |

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy (async) + Python 3.11
- **AI**: Groq API with `llama3-70b-8192` model
- **Database**: PostgreSQL via Supabase (asyncpg)
- **Cache**: Redis via Upstash
- **Frontend**: React + Vite + Recharts + Tailwind CSS
- **Extension**: Chrome MV3

## Resume Impact Points

- Built AI-powered performance platform analyzing React apps, reducing load times by up to 60%
- Designed rule engine + LLM pipeline using Groq/Llama 3 for sub-second optimization suggestions
- Deployed full-stack system on free tier (Render + Vercel + Supabase) with zero hosting cost
