# AUTARK

```
          _____                    _____                _____                    _____                    _____                    _____
         /\    \                  /\    \              /\    \                  /\    \                  /\    \                  /\    \
        /::\    \                /::\____\            /::\    \                /::\    \                /::\    \                /::\____\
       /::::\    \              /:::/    /            \:::\    \              /::::\    \              /::::\    \              /:::/    /
      /::::::\    \            /:::/    /              \:::\    \            /::::::\    \            /::::::\    \            /:::/    /
     /:::/\:::\    \          /:::/    /                \:::\    \          /:::/\:::\    \          /:::/\:::\    \          /:::/    /
    /:::/__\:::\    \        /:::/    /                  \:::\    \        /:::/__\:::\    \        /:::/__\:::\    \        /:::/____/
   /::::\   \:::\    \      /:::/    /                   /::::\    \      /::::\   \:::\    \      /::::\   \:::\    \      /::::\    \
  /::::::\   \:::\    \    /:::/    /      _____        /::::::\    \    /::::::\   \:::\    \    /::::::\   \:::\    \    /::::::\____\________
 /:::/\:::\   \:::\    \  /:::/____/      /\    \      /:::/\:::\    \  /:::/\:::\   \:::\    \  /:::/\:::\   \:::\____\  /:::/\:::::::::::\    \
/:::/  \:::\   \:::\____\|:::|    /      /::\____\    /:::/  \:::\____\/:::/  \:::\   \:::\____\/:::/  \:::\   \:::|    |/:::/  |:::::::::::\____\
\::/    \:::\  /:::/    /|:::|____\     /:::/    /   /:::/    \::/    /\::/    \:::\  /:::/    /\::/   |::::\  /:::|____|\::/   |::|~~~|~~~~~
 \/____/ \:::\\/:::/    /  \:::\    \   /:::/    /   /:::/    / \/____/  \/____/ \:::\\/:::/    /  \/____|::::::\\/:::/    /  \/____|::|   |
          \::::::/    /    \:::\    \ /:::/    /   /:::/    /                    \::::::/    /         |:::::::::/    /         |::|   |
           \::::/    /      \:::\    /:::/    /   /:::/    /                      \::::/    /          |::|\\::::/    /          |::|   |
           /:::/    /        \:::\\__/:::/    /    \::/    /                       /:::/    /           |::| \\::/____/           |::|   |
          /:::/    /          \::::::::/    /      \/____/                       /:::/    /            |::|  ~|                 |::|   |
         /:::/    /            \::::::/    /                                    /:::/    /             |::|   |                 |::|   |
        /:::/    /              \::::/    /                                    /:::/    /              \::|   |                 \::|   |
        \::/    /                \::/____/                                     \::/    /                \:|   |                  \:|   |
         \/____/                  ~~                                            \/____/                  \|___|                   \|___|

Decentralized • Immutable • Trustless                                                                         v0.1.0
```

**Decentralized frontend deployment with Safe multisig governance and immutable ENS versioning**

Autark enables trustless, censorship-resistant deployment of frontend applications through:

- **IPFS Storage** - Content-addressed, permanent storage via Storacha
- **ENS Versioning** - Immutable subdomain versions (v0, v1, v2...)
- **Safe Multisig** - Governance and approval workflows
- **Automated Deployments** - Git hooks and CI/CD integration

## Features

- **Immutable Deployments** - Each deployment creates a new versioned subdomain with burned ENS fuses
- **Multisig Governance** - Integration with Safe multisig for team review and approval
- **Automated Workflows** - Git hooks and GitHub Actions for streamlined deployments
- **Two Deployment Modes** - Safe-owns-parent (batched) or Personal-owns-parent (two-step)
- **Version History** - All deployments versioned and accessible forever
- **Cypherpunk CLI** - ASCII art interface with Autark branding

Built at ETHRome Hackathon 2024.

## Quick Start

### Installation

```bash
npm install -g autark
```

Or use locally:

```bash
npm install
npm run build
npm link
```

### Prerequisites

1. **Storacha CLI** - For IPFS uploads
   ```bash
   npm install -g @storacha/client
   storacha login
   ```

2. **Safe Multisig** - Create at [app.safe.global](https://app.safe.global)

3. **ENS Domain** - Wrapped ENS domain on Sepolia or Mainnet

4. **Safe API Key** - Get from [developer.safe.global](https://developer.safe.global)

### Configuration

Initialize configuration:

```bash
autark init
```

This creates `.autarkrc.json`:

```json
{
  "ensDomain": "yourdomain.eth",
  "safeAddress": "0x...",
  "network": "sepolia",
  "rpcUrl": "https://sepolia.infura.io/v3/YOUR_KEY"
}
```

Or use environment variables (create `.env`):

```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SAFE_ADDRESS=0x...
ENS_DOMAIN=yourdomain.eth
OWNER_PRIVATE_KEY=0x...
SAFE_API_KEY=your_safe_api_key
```

### Setup Git Hooks (Optional)

```bash
autark setup
```

This installs a pre-push hook for automatic deployments.

### Deploy

```bash
autark deploy ./dist
```

This will:
1. Upload to IPFS via Storacha
2. Detect next version (e.g., v2)
3. Create Safe transaction to deploy v2.your-domain.eth
4. Set contenthash to IPFS CID

### Check Status

```bash
# View all deployed versions
autark status

# Check specific subdomain
autark status --subdomain v1.yourdomain.eth
```

## CLI Commands

### `autark deploy <directory>`

Deploy a directory to IPFS and ENS via Safe.

**Options:**
- `--ens-domain <domain>` - ENS parent domain
- `--safe-address <address>` - Safe multisig address
- `--owner-private-key <key>` - Private key for Safe signing
- `--rpc-url <url>` - Ethereum RPC URL
- `--safe-api-key <key>` - Safe API key
- `--network <network>` - Network (mainnet, sepolia, goerli)
- `--skip-git-check` - Skip git working directory check
- `--dry-run` - Preview deployment without executing
- `--quiet` - Minimal output
- `--debug` - Debug output

**Example:**

```bash
autark deploy ./dist \
  --ens-domain yourdomain.eth \
  --safe-address 0x... \
  --safe-api-key your-key
```

### `autark status`

Check deployment status and view deployed versions.

**Options:**
- `--subdomain <subdomain>` - Check specific subdomain
- `--ens-domain <domain>` - ENS parent domain
- `--rpc-url <url>` - Ethereum RPC URL
- `--network <network>` - Network (mainnet, sepolia, goerli)
- `--quiet` - Minimal output
- `--debug` - Debug output

**Example:**

```bash
autark status --ens-domain yourdomain.eth
```

### `autark init`

Initialize configuration file.

```bash
secure-deploy init
```

Creates `secure-deploy.config.yaml` template in current directory.

## Configuration Priority

Configuration is loaded with the following priority (highest to lowest):

1. **CLI flags** - `--ens-domain ethrome.eth`
2. **Environment variables** - `SEPOLIA_ENS_DOMAIN=ethrome.eth`
3. **Config file** - `secure-deploy.config.yaml`

## How It Works

### 1. Immutable ENS Versioning

Each deployment creates a new immutable subdomain:

- `v0.your-domain.eth` - First deployment
- `v1.your-domain.eth` - Second deployment
- `v2.your-domain.eth` - Third deployment

Each subdomain has these fuses burned:
- `CANNOT_UNWRAP` - Can't unwrap from NameWrapper
- `CANNOT_SET_RESOLVER` - Can't change resolver
- `PARENT_CANNOT_CONTROL` - Parent can't take control
- `CAN_EXTEND_EXPIRY` - Anyone can extend expiry

This makes the subdomain **permanently immutable** - even the Safe can't modify it.

### 2. Safe Multisig Approval

All deployments go through Safe:

1. Script creates Safe transaction
2. Transaction is sent to Safe Transaction Service
3. Safe signers approve in Safe UI
4. Subdomain is created with contenthash pointing to IPFS

### 3. Git Tracking

Each deployment includes:

```
Git Commit: abc1234
Message: Add new feature
Author: Alice <alice@example.com>
URL: https://github.com/owner/repo/commit/abc1234
```

### 4. Build Verification

Build hash provides integrity verification:

```
Build Hash: 8f4d9e2a...
Files: 42
Size: 2.3 MB
```

Anyone can verify the build by rehashing the files.

## Example Deployment

```bash
$ secure-deploy deploy ./dist --dry-run

🚀 Secure Deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Configuration
  Network              sepolia
  Parent Domain        ethrome.eth
  Safe Address         0x82fF...4C3f
  Build Directory      ./dist

🔐 Step 1: Calculate Build Hash
✓ Build hash: 8f4d9e2a...
  Files: 42, Size: 2.3 MB

🔖 Step 2: Git Commit Info
✓ Commit: abc1234 - Add new feature
  Author: Alice
  URL: https://github.com/owner/repo/commit/abc1234

📦 Step 3: Upload to IPFS
✓ Uploaded to IPFS: bafybeic27fnce5oq3o4pbujufbb3dggrjimfzgi2dxomf6l47hqerx6sri
  URL: https://w3s.link/ipfs/bafybeic27fnce...

🔌 Step 4: Initialize Clients
✓ Public client initialized
✓ Safe client initialized

🔍 Step 5: Detect Next Version
  Existing: v0, v1
✓ Next version: v2
  Full domain: v2.ethrome.eth

📝 Step 6: Create Deployment Plan
✓ Deployment plan created
  Domain: v2.ethrome.eth
  CID: bafybeic27fnce...
  Content-hash: 0xe3011220...

🔍 DRY RUN - Preview

This deployment would:
  1. Create subdomain: v2.ethrome.eth
  2. Set content-hash to: bafybeic27fnce...
  3. Apply immutable fuses

Preview URLs:
  https://v2.ethrome.eth.limo
  https://w3s.link/ipfs/bafybeic27fnce...

Run without --dry-run to execute
```

## Security Model

### Threat Model

**Protected Against:**
- ✅ Compromised deployer keys (requires Safe approval)
- ✅ Malicious ENS parent owner (PARENT_CANNOT_CONTROL)
- ✅ Accidental subdomain deletion (CANNOT_UNWRAP)
- ✅ Resolver changes (CANNOT_SET_RESOLVER)
- ✅ Build tampering (build hash verification)

**Not Protected Against:**
- ❌ All Safe signers compromised
- ❌ Malicious code in the build itself
- ❌ IPFS gateway censorship (use multiple gateways)

### Best Practices

1. **Safe Configuration**
   - Use multi-signature (e.g., 2-of-3, 3-of-5)
   - Keep signer keys on separate devices
   - Use hardware wallets for signers

2. **Deployment Process**
   - Always review Safe transaction in UI
   - Verify Git commit matches what you expect
   - Check build hash in CI/CD
   - Test in staging first

3. **Parent Domain**
   - Burn `CANNOT_UNWRAP` fuse on parent
   - Transfer parent to Safe for full control
   - Keep parent domain long-lived

## Development

### Project Structure

```
src/
  lib/              # Core library (reusable)
    config.ts       # Configuration system
    logger.ts       # Logging utilities
    errors.ts       # Error classes
    ipfs/           # IPFS upload
    ens/            # ENS deployment
    safe/           # Safe client
    git/            # Git integration
    hash/           # Build hashing
  cli/              # CLI interface
    commands/       # CLI commands
      deploy.ts
      status.ts
      init.ts
    index.ts        # CLI entry point
```

### Testing

Run test scripts:

```bash
# Test IPFS upload
npm run test:ipfs

# Test ENS encoding
npm run test:ens

# Check domain status
npm run check:domain

# Full deployment test
npm run test:complete
```

### Building

```bash
npm run build
```

Outputs to `dist/` directory.

## Troubleshooting

### "Safe API key is required"

Get an API key from [developer.safe.global](https://developer.safe.global).

### "OperationProhibited" error

Parent domain needs `CANNOT_UNWRAP` fuse burned:

```bash
npm run burn-parent-fuses -- --execute
```

### "Safe threshold > 1"

The SDK requires additional signers. Approve the transaction in Safe UI.

### "Storacha CLI not found"

Install the Storacha CLI:

```bash
npm install -g @storacha/client
storacha login <your-email>
```

## Roadmap

- [ ] GitHub Actions integration
- [ ] Mainnet support
- [ ] Multiple IPFS gateways
- [ ] Subgraph for version history
- [ ] Browser extension for verification
- [ ] CI/CD plugins

## License

MIT

## Contributors

Built by ETHRome 2024 Hackathon Team

## Acknowledgments

- [Blumen](https://github.com/StauroDEV/blumen) - ENS utilities reference
- [Safe Global](https://safe.global) - Multisig infrastructure
- [Storacha](https://storacha.network) - IPFS storage
- [ENS](https://ens.domains) - Domain name system
