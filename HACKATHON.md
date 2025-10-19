# ETHRome 2024 Hackathon Project

## Secure Deploy - Frontend Deployment with Safe + Immutable ENS

**Team:** Solo Hackathon Project
**Track:** Infrastructure / Tooling
**Demo:** [Video Link TBD]

## Problem Statement

Current frontend deployment practices have critical security gaps:

1. **Single Point of Failure** - One compromised key can deploy malicious code
2. **No Transparency** - Users can't verify what code is deployed
3. **Mutable History** - Previous versions can be modified or lost
4. **No Audit Trail** - No record of who deployed what and when

## Solution

**Secure Deploy** combines three Web3 primitives to create a secure deployment pipeline:

### 🔐 Safe Multisig
- Requires multiple approvals for deployments
- Prevents single-key compromise
- Provides human verification step

### 🛡️ ENS Immutable Fuses
- Each deployment creates a new immutable subdomain
- Fuses prevent modification or deletion
- Version history is permanent and on-chain

### 📦 IPFS Content Addressing
- Decentralized hosting via Storacha
- Content-addressed (CID) prevents tampering
- Globally accessible without centralized servers

## What We Built

### CLI Tool

A production-ready command-line tool:

```bash
secure-deploy deploy ./dist --ens-domain ethrome.eth
```

**Features:**
- ✅ Automatic version detection (v0, v1, v2...)
- ✅ IPFS upload via Storacha
- ✅ Git commit tracking
- ✅ Build hash calculation (SHA-256)
- ✅ Safe transaction creation
- ✅ ENS subdomain deployment
- ✅ Immutable fuse application
- ✅ Enhanced Safe metadata

### Architecture

```
Developer              Safe Multisig           ENS + IPFS
    |                       |                       |
    |-- npm run deploy ---->|                       |
    |                       |                       |
    |   Build Hash          |                       |
    |   Git Commit          |                       |
    |   IPFS Upload --------|-----> Storacha        |
    |                       |                       |
    |   Safe TX --------->  |                       |
    |                       |                       |
    |                   Approval(s)                 |
    |                       |                       |
    |                       |-- Create Subdomain -->|
    |                       |   (v2.domain.eth)     |
    |                       |                       |
    |                       |-- Set Contenthash --->|
    |                       |   (IPFS CID)          |
    |                       |                       |
    |                       |-- Burn Fuses -------->|
    |                       |   (Immutable)         |
```

### Security Model

**Deployment Requirements:**
1. ✅ Build must be committed to git
2. ✅ Build hash must match
3. ✅ Safe signers must approve (e.g., 2-of-3)
4. ✅ Transaction must execute on-chain

**Immutability Guarantees:**
- ✅ Subdomains can't be unwrapped (CANNOT_UNWRAP)
- ✅ Resolver can't be changed (CANNOT_SET_RESOLVER)
- ✅ Parent can't take control (PARENT_CANNOT_CONTROL)
- ✅ Even Safe signers can't modify deployed versions

## Technical Implementation

### Technology Stack

- **TypeScript** - Type-safe development
- **Viem** - Ethereum interactions
- **Safe SDK** - Safe transaction creation
- **Storacha** - IPFS storage (w3up protocol)
- **Commander** - CLI framework
- **Ora/Chalk** - Beautiful terminal output

### Project Structure

```
src/
  lib/              # Core library
    config.ts       # Configuration system
    logger.ts       # CLI logging
    errors.ts       # Custom errors
    ipfs/          # IPFS upload
    ens/           # ENS deployment
    safe/          # Safe client
    git/           # Git integration
    hash/          # Build hashing
  cli/             # CLI interface
    commands/
      deploy.ts    # Deploy command
      status.ts    # Status command
      init.ts      # Init command
    index.ts       # Entry point
```

### Key Features

#### 1. Configuration System

Three-level priority:
```
CLI flags > Environment variables > Config file
```

Supports:
- YAML config files
- `.env` files
- Command-line arguments

#### 2. Version Management

Automatic version detection:
```typescript
v0.ethrome.eth  // First deployment
v1.ethrome.eth  // Second deployment
v2.ethrome.eth  // Third deployment (automatic)
```

#### 3. Enhanced Safe Metadata

Each Safe transaction includes:
```
🚀 Deploy v2.ethrome.eth

📦 IPFS Deployment
CID: bafybeic27fnce...
Preview: https://w3s.link/ipfs/bafybeic27fnce...

🔖 Git Commit
Hash: abc1234
Message: Add new feature
Author: Alice <alice@example.com>
URL: https://github.com/owner/repo/commit/abc1234

🔐 Build Verification
Hash: 8f4d9e2a...
Files: 42
Size: 2.3 MB

🛡️ Security
✓ Immutable ENS fuses
✓ Safe-owned subdomain
✓ Content-addressable IPFS
```

#### 4. Git Integration

Automatic commit tracking:
- Commit hash (full + short)
- Commit message
- Author name and email
- Timestamp
- GitHub URL (if available)

#### 5. Build Verification

SHA-256 hash of entire build:
- Deterministic (same files = same hash)
- Includes all files
- Sorted for consistency
- Anyone can verify

## Demo

### Live Deployments

1. **v0.ethrome.eth** - First test deployment
   - Owner: Personal wallet
   - CID: `bafybeic27fnce...`
   - URL: https://v0.ethrome.eth.limo

2. **v1.ethrome.eth** - Safe-owned deployment
   - Owner: Safe (0x82fF...4C3f)
   - CID: `bafybeic27fnce...`
   - URL: https://v1.ethrome.eth.limo
   - Fuses: 327689 (IMMUTABLE)

### Test Flow

```bash
# 1. Check current status
npm run cli -- status
# Shows: v0, v1 deployed, next is v2

# 2. Preview deployment
npm run cli -- deploy ./dist --dry-run
# Shows: Complete deployment plan

# 3. Execute deployment
npm run cli -- deploy ./dist
# Creates Safe transaction

# 4. Approve in Safe
# Go to app.safe.global, approve with 2 signers

# 5. Verify deployment
npm run cli -- status
# Shows: v2 deployed successfully
```

## Innovation

### Novel Combinations

1. **Safe + ENS Fuses** - First tool to combine Safe multisig with ENS NameWrapper immutability
2. **Git Tracking in Safe** - Enhanced Safe metadata with full git commit context
3. **Build Hash Verification** - SHA-256 hash of entire build for integrity

### Developer Experience

- **Zero Config** - Works with just `.env` file
- **Smart Defaults** - Auto-detects versions, git info
- **Beautiful Output** - Clear, informative CLI
- **Dry Run Mode** - Preview before executing
- **Error Messages** - Helpful, actionable errors

### Security Benefits

Compared to traditional deployment:

| Traditional | Secure Deploy |
|------------|---------------|
| Single deployer key | Multi-signature required |
| No audit trail | Full git history on-chain |
| Mutable history | Immutable version history |
| No verification | Build hash + Git commit |
| Centralized hosting | Decentralized IPFS |

## Challenges Overcome

### 1. ENS Fuse Complexity

**Challenge:** ENS NameWrapper fuses are complex - owner-controlled vs parent-controlled

**Solution:**
- Studied ENS contracts deeply
- Created helper functions for fuse combinations
- Documented IMMUTABLE_FUSES pattern

### 2. Safe SDK Integration

**Challenge:** Safe SDK v3 lacks documentation, threshold handling unclear

**Solution:**
- Read SDK source code
- Tested multiple approaches (direct execution, SDK, Transaction Service)
- Created abstraction layer in `src/lib/safe/`

### 3. Storacha Dependency Issues

**Challenge:** @storacha/client npm package had broken dependencies

**Solution:**
- Switched to Storacha CLI approach
- Used `execSync` to shell out to CLI
- More reliable, no dependency conflicts

### 4. IPFS Upload Performance

**Challenge:** Large builds slow to upload

**Solution:**
- Show progress spinner
- Cache CID in `.last-cid`
- Support providing existing CID with `--cid` flag

## Future Work

### Short Term
- [ ] GitHub Actions integration
- [ ] Mainnet deployment
- [ ] Additional tests
- [ ] Performance optimization

### Medium Term
- [ ] Web UI for Safe approvals
- [ ] Subgraph for version history
- [ ] Multiple IPFS gateways
- [ ] Rollback functionality

### Long Term
- [ ] Browser extension for verification
- [ ] CI/CD platform plugins
- [ ] ENS subdomain marketplace
- [ ] Governance integration

## Impact

### For Teams
- **Security** - Multi-sig prevents single-key compromise
- **Transparency** - Full audit trail on-chain
- **Reliability** - Immutable version history

### For Users
- **Trust** - Can verify what's deployed
- **Permanence** - Versions can't be modified
- **Accessibility** - IPFS ensures uptime

### For Ecosystem
- **Best Practice** - Demonstrates secure deployment pattern
- **Composability** - Library can be integrated in other tools
- **Education** - Shows power of ENS + Safe + IPFS

## Conclusion

**Secure Deploy** demonstrates that Web3 primitives can solve real-world security problems. By combining:

- 🔐 Safe (multi-signature)
- 🛡️ ENS (immutable versioning)
- 📦 IPFS (content addressing)

We created a deployment pipeline that is:
- **More secure** than traditional methods
- **More transparent** with on-chain audit trail
- **More reliable** with immutable history

All packaged in a beautiful, easy-to-use CLI tool.

## Links

- **GitHub:** https://github.com/MihRazvan/ETHRome_hackathon
- **Demo Video:** [TBD]
- **Live Deployment:** https://v1.ethrome.eth.limo
- **ENS Domain:** https://app.ens.domains/ethrome.eth?chainId=11155111

## Thank You

Built with ❤️ for ETHRome 2024

---

**Technologies Used:**
Safe Global • ENS • IPFS/Storacha • Viem • TypeScript • Commander.js

**Deployed On:**
Ethereum Sepolia Testnet

**License:**
MIT
