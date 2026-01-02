# Branch Protection & Repository Settings

Recommended settings for your GitHub repository to enforce best practices.

## Branch Protection Rules

### `main` Branch

Go to: **Settings** → **Branches** → **Add rule**

| Setting | Value |
|---------|-------|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ |
| Require approvals | 1 (or more for teams) |
| Require status checks to pass | ✅ |
| Required status checks | `Backend (Java)`, `Frontend Package (@fogui/react)` |
| Require branches to be up to date | ✅ |
| Require conversation resolution | ✅ |
| Do not allow bypassing | ✅ (optional) |

### `develop` Branch (Optional)

Same as `main` but can be less strict for faster iteration.

---

## Required Secrets

Go to: **Settings** → **Secrets and variables** → **Actions**

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `NPM_TOKEN` | npm automation token | npmjs.com → Account → Access Tokens → Generate (Automation) |

> **Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions.

---

## Recommended Repository Settings

### General
- **Default branch**: `main`
- **Automatically delete head branches**: ✅
- **Allow squash merging**: ✅ (recommended as default)
- **Allow merge commits**: ☐ (optional)
- **Allow rebase merging**: ☐ (optional)

### Actions
- **Allow all actions**: ✅
- **Workflow permissions**: Read and write

### Packages
- **Package visibility**: Private (or public if open-source)

---

## Workflow Permissions

Ensure these permissions are enabled for GitHub Actions:

1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

---

## Quick Setup Checklist

- [ ] Add `NPM_TOKEN` secret
- [ ] Enable branch protection on `main`
- [ ] Set required status checks
- [ ] Enable "Automatically delete head branches"
- [ ] Enable workflow write permissions
- [ ] (Optional) Add `develop` branch protection
