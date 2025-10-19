# Git Hooks - Automatic Deployment

Enable automatic deployments triggered by `git push` using secure-deploy's built-in git hooks.

## Quick Start

```bash
# In your project directory
npx secure-deploy setup

# Follow the prompts:
# - Which branch? [staging]
# - Build directory? [dist]
# - Install hooks? [y]

# Done! Now deployments happen automatically:
git push origin staging  # Auto-deploys! 🚀
```

## How It Works

When you run `secure-deploy setup`, it installs a **pre-push git hook** that:

1. ✅ Detects when you push to the deployment branch (e.g., `staging`)
2. 🏗️ Runs your build if needed
3. 📦 Uploads to IPFS
4. 🔐 Creates Safe proposal (batched transaction)
5. 📤 Completes the push
6. 🔗 Shows Safe URL in terminal for approval

**All output appears in your terminal - no hidden CI/CD!**

## Setup Options

### Interactive Setup (Recommended)

```bash
npx secure-deploy setup
```

Prompts you for:
- **Deployment branch**: Which branch triggers deployments (default: `staging`)
- **Build directory**: Where your built files are (default: `dist`)

### Non-Interactive Setup

```bash
# Specify branch via flag
npx secure-deploy setup --branch main

# Force overwrite existing hook
npx secure-deploy setup --force
```

## Example Workflows

### Development → Staging → Production

```bash
# Feature development
git checkout -b feature/new-ui
git commit -m "Add new UI"
git push origin feature/new-ui  # No deployment

# Merge to staging - auto-deploys!
git checkout staging
git merge feature/new-ui
git push origin staging  # 🚀 Deployment triggered!

# After Safe approval, promote to production
git checkout main
git merge staging
git push origin main  # 🚀 Production deployment!
```

### Output Example

```bash
$ git push origin staging

🚀 secure-deploy: Auto-deploying staging branch...

📦 Step 3: Upload to IPFS
✔ Uploaded: bafybei...

🔍 Step 7: Detect Deployment Mode
✓ Mode: Safe-owns-parent (batched deployment)

✅ Step 9: Execute Deployment
✔ Batch transaction submitted to Safe
  Safe TX Hash: 0x1a2b...

🎉 Deployment Proposal Created!
   Approve in Safe UI: https://app.safe.global/...

Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
To github.com:yourname/yourproject.git
   a7f9c2e..b3d5f1a  staging -> staging
```

## Hook Details

### What Gets Installed

The hook is installed at:
```
.git/hooks/pre-push
```

It only runs when you push to your configured deployment branch.

### Hook Behavior

- **Runs before push**: Deployment happens before your code reaches remote
- **Fails safely**: If deployment fails, push is cancelled
- **Branch-specific**: Only triggers on configured branch
- **Build detection**: Auto-runs `npm run build` if needed
- **Terminal output**: All logs visible in your terminal

### Customizing the Hook

You can manually edit the hook:

```bash
# View the hook
cat .git/hooks/pre-push

# Edit it
nano .git/hooks/pre-push

# Or regenerate it
npx secure-deploy setup --force
```

## Managing Hooks

### View Installed Hook

```bash
cat .git/hooks/pre-push
```

### Temporarily Disable

```bash
# Skip hooks for one push
git push origin staging --no-verify

# Or rename the hook
mv .git/hooks/pre-push .git/hooks/pre-push.disabled
```

### Re-enable

```bash
mv .git/hooks/pre-push.disabled .git/hooks/pre-push
```

### Completely Remove

```bash
rm .git/hooks/pre-push
```

### Reinstall

```bash
npx secure-deploy setup --force
```

## Multiple Branches

Want different branches to deploy to different domains?

```bash
# Option 1: Multiple hooks (manual)
# Edit .git/hooks/pre-push to check multiple branches

# Option 2: Use separate repos/branches
# staging repo → staging.yourproject.eth
# main repo → yourproject.eth
```

Example multi-branch hook:

```bash
#!/bin/bash
branch=$(git symbolic-ref --short HEAD 2>/dev/null)

if [[ "$branch" == "staging" ]]; then
  npx secure-deploy deploy dist --ens-domain staging.yourproject.eth
elif [[ "$branch" == "main" ]]; then
  npx secure-deploy deploy dist --ens-domain yourproject.eth
fi
```

## Troubleshooting

### Hook doesn't run

**Check if hook is executable:**
```bash
ls -la .git/hooks/pre-push
# Should show: -rwxr-xr-x

# If not, make it executable:
chmod +x .git/hooks/pre-push
```

**Check if you're pushing the right branch:**
```bash
git branch --show-current
```

### Build fails

The hook runs `npm run build` if the build directory doesn't exist.

**Make sure you have a build script:**
```json
{
  "scripts": {
    "build": "vite build"  // or your build command
  }
}
```

### Deployment fails but push continues

This shouldn't happen! The hook should cancel the push if deployment fails.

**Check hook exit code:**
```bash
# The hook should have:
if [ $? -ne 0 ]; then
  exit 1  # This cancels the push
fi
```

### Want to skip deployment once

```bash
git push origin staging --no-verify
```

## Team Collaboration

### Sharing Hooks with Team

Git hooks are **not** committed to the repository by default. To share with your team:

**Option 1: Document in README**
```markdown
## Setup
1. npm install
2. npx secure-deploy setup
```

**Option 2: Add to package.json postinstall**
```json
{
  "scripts": {
    "postinstall": "npx secure-deploy setup --branch staging --force"
  }
}
```

**Option 3: Use a hook manager**
- [Husky](https://typicode.github.io/husky/)
- [Lefthook](https://github.com/evilmartians/lefthook)

## vs. GitHub Actions

| Feature | Git Hooks (Local) | GitHub Actions (Remote) |
|---------|------------------|------------------------|
| **Runs where** | Your machine | GitHub servers |
| **Sees output** | Terminal | Actions tab |
| **Requires** | Git + Node | GitHub repo |
| **Speed** | Immediate | Waits for runner |
| **Cost** | Free | Free (with limits) |
| **Team approval** | Manual setup | Automatic |

**Use both!**
- **Git hooks**: Fast local deployments for devs
- **GitHub Actions**: Automated deployments for team

## Advanced: Post-Commit vs Pre-Push

Currently, secure-deploy uses **pre-push** hooks. Here's why:

**Pre-Push (Current)**
- ✅ Runs before code reaches remote
- ✅ Can cancel push if deployment fails
- ✅ Deploy only when sharing code
- ❌ Slower pushes

**Post-Commit (Alternative)**
- ✅ Faster commits
- ✅ Deploy immediately after committing
- ❌ Can't cancel commit if deployment fails
- ❌ Deploys even if you don't push

Want post-commit instead? Manually create:
```bash
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
branch=$(git symbolic-ref --short HEAD)
if [[ "$branch" == "staging" ]]; then
  npx secure-deploy deploy dist
fi
EOF
chmod +x .git/hooks/post-commit
```

## Security Considerations

**Git hooks run locally**, so they:
- ✅ Use your `.env` file (private keys secure)
- ✅ Run with your permissions
- ✅ Only execute on your machine
- ⚠️ Not shared with team by default

**Never commit:**
- `.env` file
- Private keys
- Safe credentials

## Summary

```bash
# One-time setup
npx secure-deploy setup

# Then deploy anytime with:
git push origin staging

# View proposal in terminal
# Approve in Safe UI
# Done! 🎉
```

**Perfect for:**
- ⚡ Fast iteration during development
- 👁️ Visibility into deployment process
- 🔐 Secure local execution
- 🎯 Branch-specific deployments

**Questions?** Check the [main README](../README.md) or [open an issue](https://github.com/yourrepo/issues)!
