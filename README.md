# GameHub

GameHub is a general web home for browser-based versions of games I like. The project is also intended to reflect my direction as a new grad pursuing cybersecurity work: each game can be fun on its own, while the shared platform becomes a place to practice secure web application design.

## Project Goals

- Build a clean landing page and game library that can grow one game at a time.
- Keep game-specific behavior isolated so each future game can be developed independently.
- Add authentication, authorization, and secure session handling as platform features.
- Use the project as a portfolio piece for secure frontend and backend development.
- Document security decisions clearly enough for recruiters and engineers to understand the thinking behind the implementation.

## Current Status

The project currently contains the first static placeholder page:

- `index.html` for the main page structure.
- `about.html` for the project background and security goals.
- `auth.html` and `auth.js` for the first registration and login UI.
- `styles.css` for the visual design.
- `assets/cyber-game-hub-hero.png` for the homepage hero artwork.
- `auth-service/` for the containerized authentication API.
- `games/liars-dice/client/` for the first isolated game client route.
- `games/liars-dice/server/` for the future isolated Liar's Dice server module.
- `games/flip-7/client/` for the second isolated game client route.
- `games/flip-7/server/` for the future isolated Flip 7 server module.
- `docker-compose.yml` for running the auth service with a SQLite volume.

No specific games are implemented yet.

## Planned Platform Features

- Game library and individual game pages.
- User registration and login.
- Secure password storage.
- Session management.
- Role-based authorization for player and admin workflows.
- Input validation and defensive error handling.
- Rate limiting for sensitive actions.
- Basic logging and audit-friendly project structure.
- Tests for security-sensitive behavior.

## Development Approach

This repository is meant to separate general platform work from game-specific work. General site features, navigation, authentication, shared styling, deployment, and security documentation can be handled here. Individual game behavior can be built separately and integrated back into the shared GameHub shell.

Each game should keep its browser client and backend service in its own game folder. Shared pages can link into a game, but game-specific state, UI behavior, rules, and server validation should stay inside that game's module.

## Running Locally

For the static pages, open `index.html` directly in a browser.

To run the authentication service:

```bash
docker compose up --build auth-service
```

The auth API listens on `http://127.0.0.1:8001` and stores SQLite data in the `auth_data` Docker volume.
