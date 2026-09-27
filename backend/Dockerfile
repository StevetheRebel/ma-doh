FROM python:3.12-slim
WORKDIR /srv/ma-doh
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
ENV PATH="/srv/ma-doh/.venv/bin:$PATH" PYTHONUNBUFFERED=1
RUN useradd --create-home appuser && chown -R appuser:appuser /srv/ma-doh
USER appuser
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
