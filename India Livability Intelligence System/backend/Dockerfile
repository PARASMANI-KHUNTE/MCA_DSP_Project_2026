FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=600 \
    PIP_RETRIES=30

WORKDIR /app

# Only the API runtime deps are installed here. All have prebuilt wheels,
# so no apt-get / build-essential step (and its network fragility) is needed.
# The pip cache is mounted so interrupted downloads resume on rebuild.
COPY backend/requirements.txt ./backend/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r backend/requirements.txt

# Application code
COPY backend/ ./backend/
COPY src/ ./src/

# Data required at startup
COPY data/processed/ ./data/processed/
COPY data/raw/source_register.csv ./data/raw/source_register.csv
COPY models/ ./models/

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
