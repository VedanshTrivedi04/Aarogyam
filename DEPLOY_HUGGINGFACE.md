# Hugging Face Deployment Guide (Backend + Frontend)

This repository is prepared to run as a single Docker Space on Hugging Face.

Architecture (single Space):

- The Docker image builds the React frontend and copies the generated `dist` into Django's `STATIC_ROOT`.
- Django (Gunicorn + Uvicorn worker) serves the API and the frontend static files on the same domain.
- External services remain: PostgreSQL on Neon, Redis on Upstash

## 1. Create Space

1. Create a single Space: `aarogyam` (SDK: Docker)

## 2. Backend Deployment

This Space uses the project root. The backend is responsible for building the frontend during image build.

### Runtime summary

- Uses Gunicorn with `uvicorn.workers.UvicornWorker` (ASGI) to support HTTP + WebSocket.
- Workers: 4
- Port: `${PORT:-7860}`

### Backend Hugging Face Variables/Secrets

Set these variables in the Space Settings -> Variables and secrets panel:

Required:

- `SECRET_KEY` = strong random secret
- `DJANGO_SETTINGS_MODULE` = `config.settings.production`
- `DB_HOST` = Neon host
- `DB_PORT` = `5432`
- `DB_NAME` = Neon database name
- `DB_USER` = Neon user
- `DB_PASSWORD` = Neon password
- `REDIS_URL` = Upstash Redis URL (usually `rediss://...`)
- `ALLOWED_HOSTS` = `aarogyam.hf.space` (replace with your actual Space domain)
- `CORS_ALLOWED_ORIGINS` = (since frontend and backend share domain, this can be left empty or set to `https://aarogyam.hf.space`)

Recommended:

- `WAIT_FOR_DB` = `true`
- `WAIT_FOR_REDIS` = `true`
- `RUN_MIGRATIONS` = `true` for first successful deploy only, then set to `false`
- `SENTRY_DSN` = optional

### First backend deploy checklist

1. Push code to backend Space repo
2. Wait for successful build
3. Verify backend URL loads
4. Check migration logs
5. Set `RUN_MIGRATIONS=false` and redeploy

## 2. How the single-space build works

- The Dockerfile performs a multi-stage build: it runs a Node build for the frontend and then copies the `dist` output into Django's `staticfiles` directory. Django's `collectstatic` (run by the entrypoint) collects and serves those files via WhiteNoise.

Because the frontend is served from the same origin as the API, update `frontend/.env` to use a relative API path:

```env
VITE_API_URL=/api/v1
```

You can leave `VITE_GOOGLE_CLIENT_ID` set if you use Google OAuth.

## 3. CORS and Host Configuration

Production settings use `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`. If frontend and backend are on the same domain, you can set both to your Space domain (e.g., `aarogyam.hf.space`).

## 5. Post-deploy Verification

1. Frontend loads with no localhost API references
2. Login/auth API calls work
3. No CORS errors in browser console
4. DB read/write works (Neon)
5. Redis-backed features work (Upstash)
6. Backend logs show Gunicorn serving with 4 workers

## 5. Deploy steps (summary)

1. Create Space `aarogyam` (SDK: Docker)
2. Add Variables/Secrets described above
3. Push repository contents to the Space Git repo (only root is required). Example:

```powershell
git clone https://huggingface.co/spaces/<HF_USERNAME>/aarogyam .\hf-space
Copy-Item -Recurse -Force .\* .\hf-space\
Set-Location .\hf-space
git add .
git commit -m "Deploy aarogyam single-space"
git push
```

4. Wait for build logs. On first successful run with `RUN_MIGRATIONS=true` the container will run migrations and seed data.
5. Set `RUN_MIGRATIONS=false` and restart the Space.

## 6. Notes

- You asked for Unicorn. For Python this is **Gunicorn**.
- ASGI + `uvicorn.workers.UvicornWorker` is used to support WebSockets (already configured).
