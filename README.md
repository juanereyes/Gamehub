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
- `styles.css` for the visual design.
- `assets/cyber-game-hub-hero.png` for the homepage hero artwork.

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

## Running Locally

For now, open `index.html` directly in a browser. Once the project adds a build tool, backend, or authentication service, this section should be updated with the development server commands.
