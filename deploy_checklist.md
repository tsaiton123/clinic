# Deploy Checklist

## Staging Minimum

- Set `DATABASE_URL` to managed PostgreSQL
- Set a real `SECRET_KEY`
- Set backend `ALLOWED_ORIGINS` to the deployed frontend URL
- Set frontend `VITE_API_BASE_URL` to the deployed backend URL
- Run migrations with `alembic upgrade head`
- Run seed once if demo accounts are needed
- Confirm `GET /health` returns `200`
- Confirm admin and consultant login both work

## Before Production

- Remove or rotate demo accounts
- Replace default passwords
- Tighten CORS to exact domains only
- Store secrets in platform secret manager
- Enable database backups
- Add error monitoring and request logs
- Add HTTPS custom domains
- Verify archive / restore / notifications / analytics flows on real data
- Define rollback steps for failed deploys

## Smoke Test

1. Open frontend
2. Login as admin
3. Create a client
4. Update stage and add follow-up
5. Send a notification
6. Open analytics and dashboard
7. Login as consultant
8. Confirm assigned client and notification are visible
