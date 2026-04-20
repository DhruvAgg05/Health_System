# AI Health Analytics Backend

Initial Node.js and Express backend scaffold with PostgreSQL connection setup using `pg`.

## Project Structure

```text
src/
  app.js
  server.js
  config/
    db.js
  routes/
    auth.routes.js
    healthRoutes.js
  controllers/
    auth.controller.js
    healthController.js
  services/
    auth.service.js
    healthService.js
  middleware/
    auth.middleware.js
    errorHandler.js
    notFound.js
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Make sure you have a `.env` file in the project root with:

   ```env
   PORT=4000
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=ai_health_analytics
   DB_PASSWORD=your_password
   DB_PORT=5432
   JWT_SECRET=replace_with_a_secure_secret
   JWT_EXPIRES_IN=1d
   ```

## Run

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server runs on `http://localhost:4000`.

## Test Route

`GET /api/v1/health` returns:

```text
OK
```

## Authentication Routes

`POST /api/v1/auth/signup`

Request body:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "strongpassword123"
}
```

`POST /api/v1/auth/login`

Request body:

```json
{
  "email": "jane@example.com",
  "password": "strongpassword123"
}
```

Both auth endpoints return a JWT token and basic user info on success.

## Daily Health Logs

Protected routes require the header:

```text
Authorization: Bearer <jwt_token>
```

`POST /api/v1/logs`

Request body:

```json
{
  "mood": 4,
  "sleep_hours": 7.5,
  "food_type": "Balanced",
  "exercised": true,
  "outdoor_exposure": false,
  "notes": "Felt steady today",
  "symptoms": ["headache", "fatigue"]
}
```

`GET /api/v1/logs`

Returns the last 30 logs for the logged-in user.

## Pattern Analytics

`GET /api/v1/analytics/patterns`

Protected route. Optional query param:

```text
days=30 to 90
```

Example response:

```json
{
  "patterns": [
    "Headache occurs 80% of days with less than 6 hours sleep (12/15 days).",
    "Mood is higher on days with exercise by 100% on average (4 vs 2)."
  ]
}
```

`GET /api/v1/analytics/predictions`

Protected route. Optional query param:

```text
days=30 to 90
```

Example response:

```json
{
  "predictions": [
    { "type": "headache", "risk": "70%" },
    { "type": "allergy", "risk": "40%" },
    { "type": "fatigue", "risk": "50%" }
  ]
}
```

## AI Query

`POST /api/v1/ai/query`

Protected route. Request body:

```json
{
  "question": "What habits seem most connected to better days for me?"
}
```

Example response:

```json
{
  "response": "Exercise appears to be one of the strongest positive signals in your logs...",
  "model": "llama-3.1-8b-instant"
}
```

The service uses Groq via the `groq-sdk` package and summarizes the user's health data before sending it upstream.

## Weekly AI Summary

`GET /api/v1/ai/weekly-summary`

Protected route. Example response:

```json
{
  "response": "This week your sleep was low and headaches were frequent...",
  "model": "llama-3.1-8b-instant"
}
```

The service summarizes the last 7 days of logs, including average mood, average sleep, common symptoms, and exercise frequency, before sending that summary to Groq.

## PDF Export

`GET /api/v1/export/pdf`

Protected route. Returns a downloadable PDF report containing:

- A timeline of recent health logs
- Detected health patterns
- An AI-generated weekly summary

The response is returned as an `application/pdf` attachment generated with `pdfkit`.
