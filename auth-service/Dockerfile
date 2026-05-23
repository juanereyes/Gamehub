FROM python:3.12-slim

WORKDIR /app

COPY app.py /app/app.py

RUN mkdir -p /data

EXPOSE 8001

ENV AUTH_PORT=8001
ENV DATABASE_PATH=/data/auth.sqlite3

CMD ["python", "app.py"]
