# AI Services (DA/PA Checker)

Python FastAPI service for Domain Authority & Page Authority analysis. Dependencies are installed via **venv** and `requirements.txt`.

---

## Steps to set up and run (local, with venv)

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

### 3. Install dependencies from requirements.txt

With the venv **activated**:

```bash
pip install -r requirements.txt
```

### 4. Run the app

From the **ai-services** folder (so `da-pa-checker` is a subfolder):

```bash
cd da-pa-checker
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from project root:

```bash
cd ai-services/da-pa-checker
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be at **http://localhost:8000**.

### 5. Test the analyze endpoint

**DA/PA analyze (POST):**

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\"}"
```

**Windows (PowerShell):**

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/analyze" -Method POST -ContentType "application/json" -Body '{"url":"https://example.com"}'
```

**Expected response shape:**

```json
{
  "success": true,
  "data": {
    "domain_authority": <number>,
    "page_authority": <number>,
    "label": "Custom Authority Score (Estimated)",
    "domain": "example.com",
    "url": "https://example.com/"
  }
}
```

**Optional — FastAPI docs:**  
http://localhost:8000/docs

---

## One-liner recap (after venv is created and activated)

```bash
cd ai-services
pip install -r requirements.txt
cd da-pa-checker
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then in another terminal: `curl -X POST http://localhost:8000/api/v1/analyze -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`
