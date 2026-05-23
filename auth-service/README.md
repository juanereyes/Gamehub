# GameHub Auth Service

This service owns GameHub username/password authentication. It is intentionally separate from the static site so authentication can evolve independently from game behavior.

## Endpoints

- `GET /health`
- `POST /register`
- `POST /login`
- `GET /me`
- `POST /logout`
- `DELETE /account`

Registration and login accept JSON:

```json
{
  "username": "player_one",
  "password": "use-a-long-password"
}
```

Successful registration and login return a bearer token:

```json
{
  "token": "session-token",
  "expiresAt": "2026-05-26T12:00:00Z",
  "user": {
    "id": 1,
    "username": "player_one",
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

## Security Notes

- Passwords are never stored directly.
- Password hashes use PBKDF2-HMAC-SHA256 with per-user random salts.
- Session tokens are stored as SHA-256 hashes.
- SQLite is stored at `/data/auth.sqlite3` inside the container by default.
- Deleting an account removes the user row and cascades related sessions.

This is a first authentication slice. Future iterations should add HTTPS-aware deployment settings, stricter CORS, CSRF strategy if cookie sessions are introduced, rate limiting, account recovery, and tests for security-sensitive behavior.
