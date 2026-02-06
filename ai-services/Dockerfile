# Byelow AI Service (DA/PA checker) — FastAPI
FROM python:3.12-slim

WORKDIR /app

# Create venv and install dependencies into it
COPY requirements.txt .
RUN python -m venv /app/venv && \
    . /app/venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

# Copy DA/PA checker app
COPY da-pa-checker ./da-pa-checker
WORKDIR /app/da-pa-checker

ENV PATH="/app/venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
