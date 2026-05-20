# P4 Schedule Web App

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/wsh1qi/persona-4-calendar)

This is a multi-user schedule website inspired by Persona 4. Each user can register an account, sign in, and manage a separate personal schedule.

## Local Run

1. Install dependencies

```bash
npm install
```

2. Create an environment file

Copy `.env.example` to `.env` and set at least:

```env
PORT=3000
SESSION_SECRET=your-long-random-secret
NODE_ENV=development
```

3. Start the app

```bash
npm start
```

Open `http://localhost:3000`

## Render Free Demo Deployment

This repository is configured for a Render free demo deployment. It can be deployed as a public website and shared by URL.

### One-click Deploy

Use the button above or open:

`https://render.com/deploy?repo=https://github.com/wsh1qi/persona-4-calendar`

### Render Settings

- Plan: `Free`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variable: `NODE_ENV=production`
- Environment Variable: `SESSION_SECRET=<long-random-secret>`

## Important Notes

- This free demo version does not use a persistent disk.
- The app still uses SQLite, but the data is only suitable for demo use.
- Render free services may sleep. After restart, redeploy, or instance rebuild, user accounts and schedule data may be lost.
- For long-term production use, move back to a persistent deployment or switch the database to PostgreSQL.

## Current Features

- User registration
- User login and logout
- Separate schedule data for each account
- Add tasks
- Mark tasks as completed
- Delete tasks
- Persona 4 style animated background
