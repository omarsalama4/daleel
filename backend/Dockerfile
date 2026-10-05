FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY backend/requirements.lock /app/requirements.lock
RUN pip install --no-cache-dir -r requirements.lock && python -m playwright install --with-deps chromium
COPY backend /app
RUN pip install --no-deps . && useradd -m -u 10001 daleel && mkdir -p /app/data && chown -R daleel /app/data
USER daleel
EXPOSE 8080
CMD ["sh", "-c", "uvicorn daleel.main:app --host 0.0.0.0 --port ${PORT:-8080} --no-access-log"]
