import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


DATABASE_PATH = Path(os.getenv("DATABASE_PATH", "/data/auth.sqlite3"))
HOST = os.getenv("AUTH_HOST", "0.0.0.0")
PORT = int(os.getenv("AUTH_PORT", "8001"))
SESSION_DAYS = int(os.getenv("SESSION_DAYS", "7"))
PBKDF2_ITERATIONS = int(os.getenv("PBKDF2_ITERATIONS", "210000"))
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,32}$")
PASSWORD_REQUIREMENT = (
    "Password must be 8-128 characters and include at least one uppercase letter, "
    "one lowercase letter, and one number."
)


def utc_now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat().replace("+00:00", "Z")


def connect():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize_database():
    with connect() as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL,
              username_key TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              salt TEXT NOT NULL,
              iterations INTEGER NOT NULL,
              created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              token_hash TEXT NOT NULL UNIQUE,
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )


def hash_password(password, salt=None, iterations=PBKDF2_ITERATIONS):
    salt_bytes = salt or secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        iterations,
    )
    return {
        "hash": base64.b64encode(password_hash).decode("ascii"),
        "salt": base64.b64encode(salt_bytes).decode("ascii"),
        "iterations": iterations,
    }


def verify_password(password, row):
    salt = base64.b64decode(row["salt"].encode("ascii"))
    candidate = hash_password(password, salt=salt, iterations=row["iterations"])
    return hmac.compare_digest(candidate["hash"], row["password_hash"])


def hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(conn, user_id):
    token = secrets.token_urlsafe(32)
    now = utc_now()
    expires_at = now + timedelta(days=SESSION_DAYS)
    conn.execute(
        """
        INSERT INTO sessions (user_id, token_hash, created_at, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, hash_token(token), iso(now), iso(expires_at)),
    )
    return token, expires_at


def public_user(row):
    return {
        "id": row["id"],
        "username": row["username"],
        "createdAt": row["created_at"],
    }


def parse_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}
    if length > 8192:
        raise ValueError("Request body is too large.")
    raw = handler.rfile.read(length)
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError("Request body must be valid JSON.") from exc


def validate_credentials(data):
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if not USERNAME_PATTERN.fullmatch(username):
        raise ValueError("Username must be 3-32 characters using letters, numbers, underscores, or hyphens.")
    if len(password) < 8 or len(password) > 128:
        raise ValueError(PASSWORD_REQUIREMENT)
    if not any(char.isupper() for char in password):
        raise ValueError(PASSWORD_REQUIREMENT)
    if not any(char.islower() for char in password):
        raise ValueError(PASSWORD_REQUIREMENT)
    if not any(char.isdigit() for char in password):
        raise ValueError(PASSWORD_REQUIREMENT)
    return username, password


class AuthHandler(BaseHTTPRequestHandler):
    server_version = "GameHubAuth/0.1"

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", os.getenv("CORS_ALLOWED_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self.send_json(200, {"status": "ok"})
            return
        if path == "/me":
            self.handle_me()
            return
        self.send_json(404, {"error": "Not found."})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/register":
            self.handle_register()
            return
        if path == "/login":
            self.handle_login()
            return
        if path == "/logout":
            self.handle_logout()
            return
        self.send_json(404, {"error": "Not found."})

    def do_DELETE(self):
        path = urlparse(self.path).path
        if path == "/account":
            self.handle_delete_account()
            return
        self.send_json(404, {"error": "Not found."})

    def handle_register(self):
        try:
            username, password = validate_credentials(parse_json(self))
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
            return

        password_data = hash_password(password)
        now = iso(utc_now())
        try:
            with connect() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO users (username, username_key, password_hash, salt, iterations, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        username,
                        username.lower(),
                        password_data["hash"],
                        password_data["salt"],
                        password_data["iterations"],
                        now,
                    ),
                )
                user_id = cursor.lastrowid
                token, expires_at = create_session(conn, user_id)
                user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        except sqlite3.IntegrityError:
            self.send_json(409, {"error": "Username is already registered."})
            return

        self.send_json(201, {"token": token, "expiresAt": iso(expires_at), "user": public_user(user)})

    def handle_login(self):
        try:
            username, password = validate_credentials(parse_json(self))
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
            return

        with connect() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE username_key = ?",
                (username.lower(),),
            ).fetchone()
            if user is None or not verify_password(password, user):
                self.send_json(401, {"error": "Invalid username or password."})
                return
            token, expires_at = create_session(conn, user["id"])

        self.send_json(200, {"token": token, "expiresAt": iso(expires_at), "user": public_user(user)})

    def bearer_token(self):
        header = self.headers.get("Authorization", "")
        scheme, _, token = header.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return None
        return token

    def current_user(self, conn):
        token = self.bearer_token()
        if token is None:
            return None
        session = conn.execute(
            """
            SELECT users.*
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            """,
            (hash_token(token), iso(utc_now())),
        ).fetchone()
        return session

    def handle_me(self):
        with connect() as conn:
            user = self.current_user(conn)
        if user is None:
            self.send_json(401, {"error": "Missing or invalid session token."})
            return
        self.send_json(200, {"user": public_user(user)})

    def handle_logout(self):
        token = self.bearer_token()
        if token:
            with connect() as conn:
                conn.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(token),))
        self.send_json(200, {"status": "ok"})

    def handle_delete_account(self):
        with connect() as conn:
            user = self.current_user(conn)
            if user is None:
                self.send_json(401, {"error": "Missing or invalid session token."})
                return
            conn.execute("DELETE FROM users WHERE id = ?", (user["id"],))
        self.send_json(200, {"status": "deleted"})


if __name__ == "__main__":
    initialize_database()
    server = ThreadingHTTPServer((HOST, PORT), AuthHandler)
    print(f"Auth service listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()
