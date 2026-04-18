# AI Health Analytics Platform — System Design Document

> **Purpose of this file:** This is the complete system design reference for the AI Health Analytics Platform. Use this as context when building any part of the project. Read it fully before writing code for any feature.

---

## Project Overview

**Project Name:** AI Health Analytics Platform  
**Goal:** A full-stack web application where users log daily health data and receive AI-powered pattern detection, insights, and predictions.  
**Resume Value:** Demonstrates full-stack development, backend architecture, database design, data analysis, and AI integration.

**Tech Stack:**
- Frontend: Next.js (App Router) + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL (raw SQL, no ORM)
- AI: OpenAI API (gpt-4o-mini)
- PDF Export: pdfkit
- Auth: JWT + bcrypt

---

## Core Features

1. **Authentication** — JWT-based signup/login with bcrypt password hashing
2. **Daily Health Logging** — Mood (1–5), symptoms (checkboxes), sleep hours, food type, exercise, outdoor exposure, notes
3. **Dashboard** — Recent logs, charts (sleep vs symptoms, mood trends), weekly summary
4. **Pattern Detection Engine** — Correlation analysis: sleep vs symptoms, food vs symptoms, exercise vs mood
5. **AI Features** — Natural language Q&A ("Why do I get headaches on Thursdays?") + weekly AI summary
6. **Prediction System** — Symptom risk probability based on past logs
7. **Doctor Export** — PDF with symptom timeline, detected patterns, and summary

---

## 1. High-Level System Architecture

The platform has four layers that communicate in a strict chain. The browser NEVER touches the database directly.

```
[Browser - Next.js]
        |
        | HTTPS / REST + JWT
        v
[Express API Gateway]
  - Auth middleware
  - Rate limiting
  - Request routing
        |
        v
[Services Layer]
  - Auth Service (JWT, bcrypt)
  - Log Service (CRUD, validation)
  - Analytics Service (patterns, predictions, AI prompts)
        |
        v
[Data Layer]
  - PostgreSQL (primary data store)
  - OpenAI API (called only from Analytics Service)
  - pdfkit (called only from PDF Service)
```

**Key architectural rule:** The Analytics Service is the ONLY layer that calls OpenAI. It packages sanitized user data into prompts and returns the text response back up the chain.

**Analytics trigger modes:**
- **Lazy (default):** Analytics run when the user visits the dashboard or insights page. Results are cached in the `insights` table.
- **Eager (optional, build later):** Background job runs after every log save.

---

## 2. Folder Structure

```
ai-health-platform/
├── frontend/                        # Next.js App Router
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.jsx
│   │   │   └── signup/page.jsx
│   │   ├── dashboard/page.jsx
│   │   ├── log/page.jsx             # Daily log form
│   │   ├── insights/page.jsx        # Pattern results
│   │   ├── ask/page.jsx             # AI Q&A interface
│   │   └── layout.jsx
│   ├── components/
│   │   ├── ui/                      # Reusable: Button, Input, Card
│   │   ├── charts/                  # SleepChart, MoodChart, SymptomHeatmap
│   │   ├── LogForm.jsx
│   │   └── InsightCard.jsx
│   ├── lib/
│   │   ├── api.js                   # Axios instance with auth headers
│   │   └── auth.js                  # Token helpers (get/set/clear)
│   └── middleware.js                # Next.js route protection
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                # pg Pool setup
│   │   │   └── env.js               # Validated env vars (crash on missing)
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification, attaches req.user
│   │   │   ├── validate.js          # Request body validation, 400 on fail
│   │   │   └── errorHandler.js      # Global error handler, consistent JSON
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── logs.routes.js
│   │   │   ├── analytics.routes.js
│   │   │   ├── ai.routes.js
│   │   │   └── export.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── logs.controller.js
│   │   │   ├── analytics.controller.js
│   │   │   ├── ai.controller.js
│   │   │   └── export.controller.js
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── logs.service.js
│   │   │   ├── analytics.service.js
│   │   │   ├── ai.service.js
│   │   │   └── pdf.service.js
│   │   ├── db/
│   │   │   ├── queries/             # SQL strings as named exports by feature
│   │   │   └── migrations/          # Numbered SQL files: 001_create_users.sql
│   │   └── app.js                   # Express app setup (middleware, routes)
│   ├── .env
│   └── server.js                    # Entry point
│
└── README.md
```

---

## 3. Backend Architecture Design

### Three-Layer Pattern: Route → Controller → Service

Each layer has exactly one job. Never skip or merge layers.

```
Request
  → Route       (declares path, method, middlewares, controller)
  → Middleware  (auth check + body validation)
  → Controller  (extract from req, call service, send res)
  → Service     (business logic + SQL queries)
  → Response
```

**Routes** — Only declare path, HTTP method, and which middlewares/controller to use. Zero logic.

**Controllers** — Extract data from `req`, call one service method, send response. No business logic. No SQL. Only `if` statements for HTTP status code decisions.

**Services** — All real logic lives here: SQL queries, calculations, OpenAI calls. Pure functions: input in, result out. Independently testable.

### Middleware Stack (applied in order)

1. `cors` — allow frontend origin
2. `express.json()` — parse request body
3. `auth.js` — verify JWT on protected routes, attach `req.user = { id, email }`
4. `validate.js` — check required fields, reject early with 400 if invalid
5. `errorHandler.js` — catch all thrown errors, return `{ success: false, message: "..." }`

### Error Handling Pattern

Services throw descriptive errors:
```js
throw new Error('Log already exists for this date');
```

Controllers catch and forward:
```js
try {
  const result = await logsService.createLog(data);
  res.status(201).json({ success: true, data: result });
} catch (err) {
  next(err); // Goes to errorHandler middleware
}
```

Global error handler always returns the same shape:
```js
res.status(err.status || 500).json({ success: false, message: err.message });
```

---

## 4. Database Schema Design

### Tables

#### `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);
```

#### `health_logs`
```sql
CREATE TABLE health_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL,
  mood             INT CHECK (mood BETWEEN 1 AND 5),
  sleep_hours      NUMERIC(4,1) CHECK (sleep_hours BETWEEN 0 AND 24),
  food_type        VARCHAR(50), -- 'home', 'outside', 'custom'
  exercised        BOOLEAN DEFAULT FALSE,
  outdoor_exposure BOOLEAN DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, log_date) -- enforce one log per user per day
);
```

#### `symptoms` (lookup / seed table)
```sql
CREATE TABLE symptoms (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- Seed data:
INSERT INTO symptoms (name) VALUES
  ('headache'), ('fatigue'), ('nausea'), ('allergy'), ('focus_issues');
```

#### `log_symptoms` (junction table)
```sql
CREATE TABLE log_symptoms (
  log_id     UUID REFERENCES health_logs(id) ON DELETE CASCADE,
  symptom_id INT REFERENCES symptoms(id),
  PRIMARY KEY (log_id, symptom_id)
);
```

#### `insights` (cache table for analytics + AI results)
```sql
CREATE TABLE insights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL, -- 'pattern', 'weekly_summary', 'prediction'
  content      TEXT NOT NULL,        -- human-readable text
  metadata     JSONB,                -- supporting numbers: { "correlation": 0.72, "sample_size": 14 }
  generated_at TIMESTAMP DEFAULT NOW()
);
```

### Key Indexes
```sql
CREATE INDEX idx_health_logs_user_date ON health_logs(user_id, log_date DESC);
CREATE INDEX idx_insights_user_type ON insights(user_id, type);
```

### Design Reasoning

- **UUID primary keys** — prevent enumeration attacks, safe for distributed systems later
- **`log_date` as DATE** — enforces "one log per day" when combined with the UNIQUE constraint
- **`symptoms` as a lookup table** — never hardcode symptom names in app logic; always query by name
- **`log_symptoms` junction table** — proper many-to-many; composite PK prevents duplicate entries
- **`insights` cache table** — store AI/analytics results so you don't re-run expensive operations on every page load
- **`metadata` as JSONB** — flexible storage for supporting numbers without schema changes
- **Never return `password_hash`** — always SELECT only needed columns in queries

---

## 5. API Design

**Base URL:** `/api/v1`  
**Auth:** All protected routes require header `Authorization: Bearer <token>`  
**Response shape (always):**
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "error description" }
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | — | Register user |
| POST | `/auth/login` | — | Login, receive JWT |
| GET | `/logs` | ✓ | Get recent 30 logs for current user |
| POST | `/logs` | ✓ | Create today's log |
| GET | `/logs/:id` | ✓ | Get single log |
| PUT | `/logs/:id` | ✓ | Update a log |
| GET | `/analytics/patterns` | ✓ | Run pattern detection |
| GET | `/analytics/weekly` | ✓ | Weekly summary statistics |
| GET | `/analytics/predictions` | ✓ | Symptom risk scores |
| POST | `/ai/query` | ✓ | Natural language question |
| GET | `/ai/weekly-summary` | ✓ | AI-generated weekly summary text |
| GET | `/export/pdf` | ✓ | Download full health report PDF |

### Request/Response Examples

**POST /api/v1/logs**
```json
// Request body
{
  "log_date": "2025-04-17",
  "mood": 3,
  "sleep_hours": 5.5,
  "food_type": "outside",
  "exercised": false,
  "outdoor_exposure": true,
  "symptoms": ["headache", "fatigue"],
  "notes": "Felt off all day"
}

// 201 Response
{
  "success": true,
  "data": {
    "id": "a3f1c8...",
    "log_date": "2025-04-17",
    "mood": 3,
    "sleep_hours": 5.5,
    "symptoms": ["headache", "fatigue"]
  }
}
```

**GET /api/v1/analytics/patterns**
```json
// 200 Response
{
  "success": true,
  "data": [
    {
      "pattern": "Headaches occur on 71% of days with less than 6 hours of sleep",
      "correlation_strength": 0.71,
      "sample_size": 14,
      "type": "sleep_vs_symptom"
    },
    {
      "pattern": "Mood averages 4.1 on days with exercise vs 2.8 on days without",
      "correlation_strength": 0.52,
      "sample_size": 21,
      "type": "exercise_vs_mood"
    }
  ]
}
```

**POST /api/v1/ai/query**
```json
// Request body
{ "question": "Why do I get headaches on Thursdays?" }

// 200 Response
{
  "success": true,
  "data": {
    "answer": "Looking at your logs, Thursdays consistently show lower sleep (avg 5.2h vs 7.1h on other days) and higher outdoor exposure. This aligns with your headache pattern where 71% of low-sleep days include a headache."
  }
}
```

---

## 6. Data Flow Explanation

### Full pipeline: User Input → Database → Analytics → AI → UI

```
1. User fills daily log form (browser)
        |
        | POST /logs with JWT
        v
2. Express validates JWT + request body
        |
        | logsService.createLog()
        v
3. PostgreSQL stores:
   - One row in health_logs
   - One row per symptom in log_symptoms
        |
        | (on dashboard/insights page load)
        v
4. analyticsService.getPatterns(userId)
   - Fetches last 90 days of logs with JOIN on log_symptoms
   - Runs conditional frequency analysis in JavaScript
   - Calls ai.service.js with summarized stats (NOT raw data)
   - OpenAI returns natural language summary
   - Results cached in insights table (24h TTL)
        |
        v
5. Controller returns JSON to frontend
   - Dashboard renders charts from logs
   - Insights page renders InsightCards from patterns
   - Ask page sends questions to /ai/query
```

### Caching Logic

```js
// In analytics.service.js
const cached = await getCachedInsight(userId, 'weekly_summary');
if (cached && isWithin24Hours(cached.generated_at)) {
  return cached.content;
}
// Otherwise regenerate and save to insights table
```

---

## 7. Pattern Detection Approach

No ML library needed. This is conditional frequency analysis on small datasets — pure SQL + JavaScript arithmetic.

### Core Technique

For each symptom, calculate: "what fraction of days WITH condition X also had this symptom?"

```js
// Example: sleep vs headache
const logsWithLowSleep = logs.filter(l => l.sleep_hours < 6);
const withHeadache = logsWithLowSleep.filter(l => l.symptoms.includes('headache'));
const rate = withHeadache.length / logsWithLowSleep.length;
// → "Headaches occur on 71% of low-sleep days"
```

### All Combinations to Check

| Factor | Condition A | Condition B | Symptoms to check |
|--------|-------------|-------------|-------------------|
| Sleep | `< 6h` | `>= 6h` | all 5 |
| Food | `outside` | `home` | all 5 |
| Exercise | `false` | `true` | mood + all symptoms |
| Outdoor | `true` | `false` | headache, allergy |

### Reporting Threshold

Only surface a pattern if:
- Sample size (days in condition A) >= 7 days, AND
- Difference between condition A and B rates >= 20 percentage points

This prevents false positives from small samples.

### Prediction System

Once correlation rates are calculated, prediction is just applying rates to today's planned conditions:

```js
// User logs they slept 5 hours
// Look up: headache rate for sleep < 6 = 71%
// Output: "Based on your history, there's a 71% chance of headache today"
```

No model training. No libraries. Just lookup.

---

## 8. AI Integration Plan

### The Golden Rule

**Never send raw log data to OpenAI.** Always send a pre-summarized, anonymized text description. This protects privacy, reduces token costs, and produces better answers.

### Prompt: Weekly Summary

```js
function buildWeeklySummaryPrompt(stats) {
  return `
You are a health analytics assistant. Analyze this weekly health data 
and write a friendly, actionable 3-paragraph summary.

Data for the past 7 days:
- Average mood: ${stats.avgMood}/5
- Average sleep: ${stats.avgSleep} hours
- Days exercised: ${stats.exerciseDays}/7
- Most frequent symptoms: ${stats.topSymptoms.join(', ')}
- Food pattern: ${stats.foodBreakdown}
- Detected correlations: ${stats.patterns.map(p => p.pattern).join('; ')}

Guidelines:
- Be encouraging, not alarming
- Suggest 1-2 concrete lifestyle adjustments
- Keep each paragraph under 60 words
- Do not diagnose or make medical claims
`.trim();
}
```

### Prompt: Natural Language Q&A

```js
function buildQueryPrompt(userQuestion, stats) {
  return `
You are a personal health analytics assistant.
The user has logged ${stats.totalLogs} days of health data.
Here is a statistical summary of their patterns: ${JSON.stringify(stats.patterns)}

The user asks: "${userQuestion}"

Answer in 2-3 sentences based only on the data provided. 
If the data doesn't support a clear answer, say so honestly.
`.trim();
}
```

### API Call Structure (in ai.service.js)

```js
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",    // cheapest capable model
  messages: [{ role: "user", content: prompt }],
  max_tokens: 400,
  temperature: 0.4,        // lower = more consistent responses
});
return response.choices[0].message.content;
```

### Caching Strategy

Store AI responses in the `insights` table. On subsequent requests within 24 hours, return the cached version. Only regenerate if the user has logged new data since the last generation.

---

## 9. Step-by-Step Development Roadmap

Build in this order. Each phase is independently demonstrable.

### Phase 1 — Foundation (Week 1–2)
- Set up frontend and backend repos with folder structure
- Write and run all database migrations
- Build `POST /auth/signup` and `POST /auth/login` with bcrypt + JWT
- Build Next.js login and signup pages
- Test auth flow end-to-end with Postman/Insomnia
- **Milestone:** Can register, log in, receive JWT

### Phase 2 — Core Logging (Week 2–3)
- Build the daily log form on frontend (mood slider, symptom checkboxes, sleep input)
- Build `POST /logs` and `GET /logs` endpoints
- Display last 7 logs in a simple table on the dashboard
- **Milestone:** Can submit and view health logs

### Phase 3 — Dashboard Charts (Week 3–4)
- Integrate Recharts or Chart.js on the frontend
- Build sleep-over-time line chart and mood trend chart
- Build symptom frequency bar chart
- Wire all charts to the `GET /logs` endpoint
- **Milestone:** Dashboard shows visual health history

### Phase 4 — Pattern Detection (Week 4–5)
- Build `GET /analytics/patterns` using conditional frequency logic
- Build the Insights page displaying pattern cards with correlation strength
- Add insights caching logic in the service layer
- **Milestone:** Platform detects and displays correlations

### Phase 5 — AI Features (Week 5–6)
- Add OpenAI SDK to backend
- Build `GET /ai/weekly-summary` endpoint
- Build `POST /ai/query` endpoint
- Build the Ask page on the frontend with Q&A interface
- **Milestone:** Users can ask natural language health questions

### Phase 6 — PDF Export (Week 6–7)
- Build `GET /export/pdf` using pdfkit
- Include symptom timeline table, detected patterns, and recent AI summary
- Add download button on the dashboard
- **Milestone:** Users can export a doctor-ready health report

### Phase 7 — Polish + Deploy (Week 7–8)
- Add thorough input validation on all endpoints
- Handle error states and loading skeletons in the UI
- Write README with screenshots
- Deploy: Frontend → Vercel, Backend → Railway, Database → Supabase (free tier)
- **Milestone:** Live, publicly accessible application

---

## 10. Best Practices

### Security
- Never return `password_hash` in any API response — always SELECT only needed columns
- Validate and sanitize every input field server-side; never trust the frontend
- Rate-limit the `/auth` endpoints to prevent brute-force attacks
- Store tokens securely; prefer `httpOnly` cookies over `localStorage` if possible
- Use parameterized SQL queries everywhere — never concatenate user input into SQL strings

### Code Organization
- Keep SQL strings in `db/queries/` as named exports (`getUserById`, `insertHealthLog`)
- Never write SQL inline in service files
- Name functions after what they return, not how they work: `getRecentLogs(userId)` not `queryDatabase(userId, 'logs')`
- One service per feature domain — never import one service into another; share logic through the DB layer

### Performance
- Add `CREATE INDEX ON health_logs(user_id, log_date DESC)` immediately — prevents full table scans as logs grow
- Cache analytics results in the `insights` table with a 24-hour TTL
- Run analytics lazily (on-demand) until you have enough users to justify a background job

### Error Handling
- Use a single `errorHandler.js` middleware for all errors
- In services, throw descriptive errors: `throw new Error('Log already exists for this date')`
- In controllers, always wrap service calls in try/catch and pass errors to `next(err)`
- Never expose stack traces to the client — log them server-side only

### Environment Variables
- Never hardcode secrets anywhere
- Validate required env vars on startup in `config/env.js` — crash immediately if `JWT_SECRET` or `DATABASE_URL` is missing
- Required vars: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `PORT`, `FRONTEND_URL`

### Git Hygiene
- Commit after each working feature, not after each file
- Use descriptive branch names: `feature/pattern-detection`, `fix/duplicate-log-error`
- Never commit `.env` files — add to `.gitignore` immediately

---

## Environment Variables Reference

### Backend `.env`
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-long-random-secret-min-32-chars
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-...
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## Key Constraints & Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| ORM | None (raw SQL) | Learn real SQL, full query control, resume differentiator |
| AI model | gpt-4o-mini | Cheapest capable model, sufficient for summaries |
| Auth storage | JWT in localStorage (start) | Simpler to build; upgrade to httpOnly cookie later |
| Analytics | On-demand (lazy) | Sufficient for MVP; background jobs add complexity |
| Symptom storage | Junction table | Proper relational design, easy to query |
| Insight caching | 24h TTL in DB | Avoids redundant OpenAI calls, controls cost |
| Pattern detection | Conditional frequency | No ML needed, fully explainable, student-implementable |

---

*Document version: 1.0 — Generated as the initial architecture specification for the AI Health Analytics Platform.*
