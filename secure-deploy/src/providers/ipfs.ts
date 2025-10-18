// IPFS Upload provider - Storacha (w3up)
// Adapted from Blumen: https://github.com/StauroDEV/blumen

import type { CID } from 'multiformats/cid'
import { setup } from './storacha/setup.js'
import { uploadCAR } from './storacha/upload-car.js'

export type UploadOptions = {
  token: string
  proof: string
}

export async function uploadToIPFS(
  car: Blob,
  options: UploadOptions
): Promise<CID> {
  const { token, proof } = options

  if (!token) {
    throw new Error('STORACHA_TOKEN environment variable is required')
  }
  if (!proof) {
    throw new Error('STORACHA_PROOF environment variable is required')
  }

  // Setup the agent and space
  const { agent, space } = await setup({ pk: token, proof })

  if (!space) {
    throw new Error('No Storacha space found')
  }

  const abilities = ['space/blob/add', 'space/index/add', 'upload/add'] as const

  try {
    const cid = await uploadCAR(
      {
        issuer: agent.issuer,
        proofs: agent.proofs(
          abilities.map((can) => ({ can, with: space.did() })),
        ),
        with: space.did(),
      },
      car,
    )

    return cid
  } catch (e) {
    throw new Error(`Failed to upload to IPFS via Storacha: ${(e as Error).message}`, {
      cause: e,
    })
  }
}
