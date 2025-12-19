# Tennisot Land - Tennis Tournament Management System

A WeChat Mini Program based system for managing tennis tournaments, tracking scores, and player rankings.

## Architecture

- **Frontend**: Vue.js 3 + UniApp (Cross-platform for WeChat Mini Program, H5, App)
- **Backend**: Node.js (Express) + TypeScript
- **Database**: MySQL 8.0 (managed via Prisma ORM)

## Project Structure

```
.
├── backend/          # Node.js API Server
│   ├── prisma/       # Database Schema & Migrations
│   └── src/          # Source Code (Controllers, Routes)
├── frontend/         # UniApp Vue 3 Frontend
└── docker-compose.yml # MySQL Database Service
```

## Getting Started

### 1. Database Setup

Ensure you have Docker installed.

```bash
# Start MySQL
docker-compose up -d
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup Database Schema
npx prisma db push

# Start Server
npm run dev
```
The API will run at `http://localhost:3000`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run in Development Mode (H5)
npm run dev
```

To build for WeChat Mini Program:
1. Open the `frontend` directory in **HBuilderX** or run `npm run dev:mp-weixin`.
2. Open WeChat Developer Tools and import the `dist/dev/mp-weixin` folder.

## API Documentation

### Auth
- `POST /api/auth/login`: Login with WeChat Code (Mock implementation).

### Matches
- `GET /api/matches`: List all tournaments.
- `POST /api/matches`: Create a new tournament.
  - Body: `{ name, location, startTime, rules }`
- `PUT /api/matches/:id`: Update tournament info.
- `POST /api/matches/:id/results`: Submit match results.
  - Body: `{ results: [{ playerId, rank }] }`

### Rankings
- `GET /api/matches/rankings`: Get player leaderboard based on points.

## Deployment

1. **Backend**: Dockerize the Node.js app or deploy to a standard Node.js environment (PM2).
2. **Database**: Use a managed MySQL service (RDS/Cloud SQL) or persistent Docker volume.
3. **Frontend**: Build using `npm run build:mp-weixin` and upload via WeChat Developer Tools.

## Testing
- Backend tests can be added using Jest.
- Frontend E2E tests can be done using UniAutomator.
