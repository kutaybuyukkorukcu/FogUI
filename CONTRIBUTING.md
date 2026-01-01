# Contributing to GenUI

Thank you for your interest in contributing to GenUI! This document provides guidelines and workflows for contributing.

## Development Workflow

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Auto-deploys to VPS |
| `develop` | Integration branch for features |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `hotfix/*` | Urgent production fixes |

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(transform): add streaming support for large responses
fix(provider): resolve context initialization race condition
docs(readme): update installation instructions
```

## Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes with conventional commits
3. Ensure CI passes (tests, linting, build)
4. Create PR to `develop`
5. Request review from maintainers
6. Squash and merge when approved

## Release Process

### Creating a Release

1. **Via GitHub Actions (Recommended):**
   - Go to Actions → "Release" workflow
   - Click "Run workflow"
   - Enter version number (e.g., `0.2.0`)
   - Select release type (patch/minor/major)

2. **Manual:**
   ```bash
   cd packages/react
   npm version minor  # or patch/major
   git push origin main --follow-tags
   ```

### What Happens on Release

1. Version bumped in `package.json`
2. Git tag created (`v0.2.0`)
3. GitHub Release created with changelog
4. NPM package published automatically
5. Docker image built and pushed to GHCR
6. VPS auto-deploys new image (via Coolify webhook)

## Local Development

### Backend (Java)
```bash
cd backend-java
./mvnw spring-boot:run
```

### Frontend Package
```bash
cd packages/react
npm install
npm run dev  # Watch mode
npm run build  # Production build
```

### Demo Client
```bash
cd client
npm install
npm run dev
```

## Code Quality

- **Backend**: Maven build must pass
- **Frontend**: TypeScript type checking, ESLint
- **All**: CI must be green before merge
