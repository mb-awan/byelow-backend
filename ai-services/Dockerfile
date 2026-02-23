# Byelow AI Services — DA/PA checker + Website Auditor + Content Optimizer (single app on port 8000)
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN python -m venv /app/venv && \
    . /app/venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY da-pa-checker ./da-pa-checker
COPY website-auditor ./website-auditor
COPY content-optimization-checker ./content-optimization-checker

ENV PATH="/app/venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
