# FogUI Dashboard

> Web dashboard for managing API keys, usage, and account settings

## Tech Stack

- **Vite** - Fast build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React Router** - Routing
- **Zustand** - State management (with persist)

## Getting Started

### Prerequisites

- Node.js 18+
- Backend running on `http://localhost:5001`

### Installation

```bash
cd dashboard
npm install
```

### Development

```bash
npm run dev
```

Dashboard will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

Output will be in `dist/` folder, ready for production deployment.

## Project Structure

```
dashboard/
├── src/
│   ├── api/
│   │   └── client.ts       # API client with types
│   ├── components/
│   │   └── Layout.tsx      # Main layout with nav
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ApiKeysPage.tsx
│   │   └── SettingsPage.tsx
│   ├── store/
│   │   └── authStore.ts    # Auth state with Zustand
│   ├── App.tsx             # Router setup
│   ├── main.tsx            # Entry point
│   └── index.css           # Tailwind imports
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Features

### ✅ Implemented (MVP Complete)

- **Authentication**
  - Login with email/password
  - Register new accounts
  - JWT token management (persisted)
  - Auto-redirect to login if unauthenticated

- **API Keys**
  - Create new API keys
  - List all keys with status
  - Revoke keys
  - Copy newly created keys

- **Usage & Quota**
  - Display current period transforms
  - Show remaining quota
  - Usage history table

- **Settings**
  - View profile information
  - Update email address

### 📋 Backlog

See [BACKLOG.md](../docs/BACKLOG.md) for full roadmap.

## Backend Integration

The dashboard expects these endpoints:

| Endpoint | Method | Status |
|----------|--------|--------|
| `/auth/login` | POST | ✅ Implemented |
| `/auth/register` | POST | ✅ Implemented |
| `/api/keys` | GET | ✅ Implemented |
| `/api/keys` | POST | ✅ Implemented |
| `/api/keys/:id` | DELETE | ✅ Implemented |
| `/api/usage/stats` | GET | ✅ Implemented |
| `/api/user/profile` | GET | ✅ Implemented |
| `/api/user/profile` | PUT | ✅ Implemented |

## Deployment

### Docker

```bash
# Build
docker build -t fogui-dashboard .

# Run
docker run -p 3000:80 \
  -e VITE_API_URL=https://api.virtuoapps.com \
  fogui-dashboard
```

### Environment Variables

- `VITE_API_URL` - Backend API URL (used in production build)

In development, Vite proxy handles routing to localhost:5001.

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally with `npm run dev`
4. Build with `npm run build`
5. Submit PR
