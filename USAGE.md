# Usage Guide

Quick guide for using secure-deploy CLI.

## Prerequisites

1. **Storacha CLI** installed and configured
2. **Safe multisig** created at [app.safe.global](https://app.safe.global)
3. **ENS domain** wrapped on Sepolia
4. **Safe API key** from [developer.safe.global](https://developer.safe.global)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Storacha

```bash
# Install Storacha CLI globally
npm install -g @storacha/client

# Login
storacha login your-email@example.com
```

### 3. Set Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Required
SEPOLIA_ENS_DOMAIN=ethrome.eth
SEPOLIA_OWNER_PK=0x...
SEPOLIA_OWNER_ADDRESS=0x...
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
SAFE_ADDRESS=0x82fFc43E48dA420bC4F3DeddB49f0b27d4424C3f
SAFE_API_KEY=your-api-key

# Optional (if using Storacha Node library instead of CLI)
KEY=...
PROOF=...
```

## Commands

### Deploy

Deploy a directory to IPFS and ENS:

```bash
# Dry run (preview only)
npm run cli -- deploy ./dist --dry-run

# Execute deployment
npm run cli -- deploy ./dist

# With custom ENS domain
npm run cli -- deploy ./dist --ens-domain my-domain.eth
```

**What happens:**
1. ✅ Build hash calculated
2. ✅ Git commit info extracted
3. ✅ Directory uploaded to IPFS
4. ✅ Next version detected (v0, v1, v2...)
5. ✅ Safe transaction created
6. ✅ Subdomain created with immutable fuses
7. ✅ Contenthash set to IPFS CID

### Check Status

View deployed versions:

```bash
# Show all versions
npm run cli -- status

# Check specific subdomain
npm run cli -- status --subdomain v1.ethrome.eth
```

### Initialize Config

Create config file template:

```bash
npm run cli -- init
```

Creates `secure-deploy.config.yaml` in current directory.

## Deployment Workflow

### First-Time Setup

1. **Wrap Parent Domain** (if not wrapped)
   ```bash
   # Use ENS Manager UI
   https://app.ens.domains/your-domain.eth
   ```

2. **Burn Parent Fuses** (required once)
   ```bash
   npm run burn-parent-fuses -- --execute
   ```

3. **Check Domain Status**
   ```bash
   npm run check:domain
   ```

### Regular Deployment

1. **Build Your Frontend**
   ```bash
   npm run build  # Creates ./dist
   ```

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "Update frontend"
   ```

3. **Preview Deployment**
   ```bash
   npm run cli -- deploy ./dist --dry-run
   ```

4. **Execute Deployment**
   ```bash
   npm run cli -- deploy ./dist
   ```

5. **Approve in Safe UI**
   - Go to [app.safe.global](https://app.safe.global)
   - View transaction queue
   - Review transaction details
   - Approve with required signers

6. **Verify Deployment**
   ```bash
   npm run cli -- status
   ```

## Debugging

### Enable Debug Output

```bash
npm run cli -- deploy ./dist --debug
```

### Check Subdomain Ownership

```bash
npx tsx src/test/check-subdomain.ts v1.ethrome.eth
```

### View Safe Queue

```bash
# Open Safe UI
https://app.safe.global/transactions/queue?safe=sep:0x82fFc43E48dA420bC4F3DeddB49f0b27d4424C3f
```

## Common Issues

### "Missing required configuration"

Make sure `.env` file exists and has all required vars:
- `SEPOLIA_ENS_DOMAIN`
- `SEPOLIA_OWNER_PK`
- `SEPOLIA_RPC_URL`
- `SAFE_ADDRESS`
- `SAFE_API_KEY`

### "OperationProhibited" error

Parent domain needs `CANNOT_UNWRAP` fuse burned:

```bash
npm run burn-parent-fuses -- --execute
```

### "Storacha CLI not found"

Install globally:

```bash
npm install -g @storacha/client
storacha login your-email@example.com
```

### "Safe threshold > 1"

Transaction requires approval in Safe UI. Additional signers must approve.

## Tips

1. **Always preview first** with `--dry-run`
2. **Commit before deploying** for accurate Git tracking
3. **Use meaningful commit messages** - they appear in Safe transaction
4. **Test on Sepolia first** before mainnet
5. **Keep Safe API key secure** - don't commit to git

## Example Full Flow

```bash
# 1. Build frontend
cd my-app
npm run build

# 2. Commit changes
git add .
git commit -m "Add new landing page"

# 3. Preview deployment
cd ../secure-deploy
npm run cli -- deploy ../my-app/dist --dry-run

# 4. Execute
npm run cli -- deploy ../my-app/dist

# 5. Check status
npm run cli -- status

# Output:
# Total versions: 3
# Latest: v2.ethrome.eth
# Next version: v3.ethrome.eth

# 6. Approve in Safe UI
# Go to app.safe.global and approve transaction

# 7. View deployment
# https://v2.ethrome.eth.limo
```

## Advanced

### Custom Network

```bash
npm run cli -- deploy ./dist --network mainnet --rpc-url https://eth.llamarpc.com
```

### Skip Git Check

```bash
npm run cli -- deploy ./dist --skip-git-check
```

### Quiet Mode

```bash
npm run cli -- deploy ./dist --quiet
```

## Next Steps

After successful deployment:

1. **Test the deployment** at https://vX.your-domain.eth.limo
2. **Verify in ENS Manager** at https://app.ens.domains
3. **Share the URL** with your team
4. **Update DNS** to point to latest version (optional)

## Resources

- [Safe Documentation](https://docs.safe.global)
- [ENS Documentation](https://docs.ens.domains)
- [Storacha Documentation](https://docs.storacha.network)
- [GitHub Repository](https://github.com/MihRazvan/ETHRome_hackathon)
