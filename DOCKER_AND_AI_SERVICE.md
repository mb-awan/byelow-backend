# Docker + AI Service (DA/PA Checker)

This doc describes the dockerized setup (API + AI service), how to run the AI service, how to test, and a summary of what was updated.

---

## Prerequisites

- **Docker** and **Docker Compose** installed and running.
- **Cloud Redis** — Redis is not run in Docker. Set in `.env.production`:
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (if required), etc.
- **MongoDB** — DB is not dockerized. Set `MONGO_URL` in `.env.production`.
- **`.env.production`** — Copy from `.env.example` and fill:
  - `MONGO_URL`, `JWT_SECRET_KEY`, `REDIS_*`, `AI_SERVICE_URL=http://ai-service:8000` (for Docker).

---

## How to start with Docker

1. Ensure `.env.production` exists and includes:
   - `AI_SERVICE_URL=http://ai-service:8000` (so the API calls the AI container).
   - Cloud Redis: `REDIS_HOST`, `REDIS_PORT`, etc.
   - `MONGO_URL` for MongoDB.

2. From the project root:

   ```bash
   docker compose -f docker-compose.yml up -d
   ```

   Or:

   ```bash
   npm run start-docker:prod
   ```

3. This starts:
   - **byelow-api-server** (Express) on port **4000**
   - **byelow-ai-service** (FastAPI DA/PA checker) on port **8000**

4. Stop:

   ```bash
   docker compose -f docker-compose.yml down
   npm run stop-docker:prod
   ```

---

## How to start the AI service (without full Docker)

If you run the Express API locally and want the AI service separately:

1. **Option A — Python locally**

   ```bash
   cd ai-services
   pip install -r requirements.txt
   cd da-pa-checker
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Then in `.env.development` (or your env file) set:

   ```env
   AI_SERVICE_URL=http://localhost:8000
   ```

2. **Option B — Only AI service in Docker**

   ```bash
   docker compose -f docker-compose.yml up -d ai-service
   ```

   Then set `AI_SERVICE_URL=http://localhost:8000` if the API runs on the host, or `http://ai-service:8000` if the API runs in Docker on the same compose network.

---

## Ways to test

### 1. Health check (API)

```bash
curl -s http://localhost:4000/api/health-check
```

### 2. AI service directly (DA/PA analyze)

```bash
curl -s -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' | jq
```

Expected shape: `{ "success": true, "data": { "domain_authority": ..., "page_authority": ..., "domain": "...", "url": "..." } }`.

### 3. Express DA/PA endpoint (with auth)

- Get a JWT (e.g. sign in via `POST /api/auth/signin`).
- Call:

```bash
curl -s -X POST http://localhost:4000/api/da-pa-checker/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"domain":"example.com","forceRefresh":false}' | jq
```

- With `AI_SERVICE_URL` set, the API uses the AI service, caches results in Redis + MongoDB, and returns the same DTO (with `metrics.da`, `metrics.pa`, etc.).

### 4. Cache behavior

- First request for a domain: hits AI (or DataForSEO if AI not configured), then cache is written.
- Second request with same domain and `forceRefresh: false`: should hit Redis or MongoDB cache (check logs for "cache hit (Redis)" or "cache hit (MongoDB)").
- With `forceRefresh: true`: bypasses cache and calls AI again.

### 5. API docs

- Express: http://localhost:4000/api/docs
- AI service (FastAPI): http://localhost:8000/docs (if enabled)

---

## Summary of what was updated

| Area           | What changed                                                                                                                                                                                                                                                    | Why                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docker**     | **docker-compose.yml** now runs only **api-server** and **ai-service**. Redis, DB, worker, and schedulers were removed from compose.                                                                                                                            | Redis and DB are external (cloud); job services (worker, posts-scheduler, status-update-scheduler) are not present in the repo, so they were removed to avoid broken containers. |
| **AI service** | New **ai-services/Dockerfile** and **ai-service** in compose. FastAPI app runs on port 8000.                                                                                                                                                                    | So the DA/PA AI service is dockerized and reachable by the API.                                                                                                                  |
| **Env**        | **AI_SERVICE_URL** added to env config and `.env.example`. In Docker, set to `http://ai-service:8000`.                                                                                                                                                          | So the Express app knows where to call the AI DA/PA API.                                                                                                                         |
| **DA/PA flow** | **domainAnalysis.service** checks cache (Redis → MongoDB), then if **AI_SERVICE_URL** is set calls the AI service, maps response to the existing DTO, and caches in Redis + MongoDB. If AI_SERVICE_URL is not set, existing DataForSEO + internal calc is used. | To attach the AI service to the Express DA/PA checker and reuse the same caching and response shape.                                                                             |
| **Caching**    | AI results are stored in **Redis** and **MongoDB** (same TTL as before).                                                                                                                                                                                        | Good performance and consistency with existing DA/PA caching.                                                                                                                    |
| **Model**      | **AnalyzeDomainResult** supports `source: 'ai-service'` and optional **rawSnapshot.ai** (and optional dataforseo/internal).                                                                                                                                     | To persist AI results in the same collection with a clear source.                                                                                                                |
| **New file**   | **src/common/services/aiService.client.ts** — HTTP client for `POST /api/v1/analyze`.                                                                                                                                                                           | Single place to call the AI service from Express.                                                                                                                                |

---

## Troubleshooting

- **API exits with Redis error:** Ensure `.env.production` has valid cloud Redis settings and the server can reach Redis.
- **DA/PA returns 500 when using AI:** Check that the AI container is up (`docker ps`), that `AI_SERVICE_URL=http://ai-service:8000` is set when both run in Docker, and that `curl` to `http://localhost:8000/api/v1/analyze` works.
- **No AI, only DataForSEO:** Leave `AI_SERVICE_URL` empty or unset; the service will use the existing DataForSEO + internal calculation path.
