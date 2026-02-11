# AI Services (DA/PA Checker + Website Auditor)

Single FastAPI app on **port 8000** for:

- **DA/PA checker** — Domain Authority & Page Authority (estimated) analysis
- **Website Auditor** — technical, SEO, performance, security, and accessibility audits

Dependencies: **venv** and `requirements.txt`.

---

## Setup and run (local)

### 1. Go to the ai-services folder

```bash
cd ai-services
```

### 2. Create a virtual environment

**Windows (PowerShell):**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**Mac/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

With the venv **activated**:

```bash
pip install -r requirements.txt
```

### 4. Run the unified app

From the **ai-services** folder:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API is at **http://localhost:8000**.

---

## Endpoints (both under `/api/v1`)

### DA/PA analyze — `POST /api/v1/analyze`

**Body:** `{"url": "https://example.com"}`

**curl (Mac/Linux/Git Bash):**

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\"}"
```

**PowerShell:**

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/analyze" -Method POST -ContentType "application/json" -Body '{"url":"https://example.com"}'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "domain_authority": 42.0,
    "page_authority": 38.5,
    "spam_score": 0.0,
    "referring_domains": 150,
    "backlinks": {
      "total": 1200,
      "dofollow": 900,
      "nofollow": 300
    },
    "domain": "example.com",
    "url": "https://example.com/"
  },
  "error": null
}
```

---

### Website audit — `POST /api/v1/audit`

**Body:** `{"url": "https://example.com"}`

**curl (Mac/Linux/Git Bash):**

```bash
curl -X POST http://localhost:8000/api/v1/audit \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\"}"
```

**PowerShell:**

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/audit" -Method POST -ContentType "application/json" -Body '{"url":"https://example.com"}'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "url": "https://example.com",
      "final_url": "https://example.com/",
      "overall_score": 78.5,
      "overall_label": "Good",
      "total_issues": 5,
      "issues_by_severity": { "high": 0, "medium": 2, "low": 3 }
    },
    "categories": [
      {
        "category": "technical",
        "score": 85.0,
        "label": "Good",
        "earned_points": 17.0,
        "total_points": 20.0,
        "checks": [{ "name": "Valid HTML", "passed": true, "weight": 5.0, "details": "" }],
        "issues": []
      }
    ],
    "all_issues": [
      {
        "name": "Missing meta description",
        "severity": "medium",
        "category": "seo",
        "explanation": "No meta description found.",
        "recommendation": "Add a meta description tag."
      }
    ]
  },
  "error": null
}
```

---

## Docker (single image, port 8000)

From the **ai-services** folder:

```bash
docker build -t byelow-ai-services .
docker run -p 8000:8000 byelow-ai-services
```

---

## Interactive docs

**http://localhost:8000/docs**

---

## One-liner recap (after venv is created and activated)

```bash
cd ai-services
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then:

- DA/PA: `curl -X POST http://localhost:8000/api/v1/analyze -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`
- Audit: `curl -X POST http://localhost:8000/api/v1/audit -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`
