// ENS NameWrapper fuse constants and utilities
// Reference: https://docs.ens.domains/wrapper/fuses
// Based on: https://github.com/gskril/immutable-ens-websites

/**
 * ENS NameWrapper fuse constants
 * When burned (set to 1), these fuses remove specific permissions permanently
 */
export const FUSES = {
  /** Cannot unwrap the name back to the registry */
  CANNOT_UNWRAP: 1,

  /** Cannot burn additional fuses */
  CANNOT_BURN_FUSES: 2,

  /** Cannot transfer ownership */
  CANNOT_TRANSFER: 4,

  /** Cannot change the resolver */
  CANNOT_SET_RESOLVER: 8,

  /** Cannot set the TTL */
  CANNOT_SET_TTL: 16,

  /** Cannot create subdomains */
  CANNOT_CREATE_SUBDOMAIN: 32,

  /** Cannot approve operators */
  CANNOT_APPROVE: 64,

  /** Parent cannot take back control */
  PARENT_CANNOT_CONTROL: 65536,

  /** Anyone can extend expiry */
  CAN_EXTEND_EXPIRY: 262144,
} as const

/**
 * Combine fuses for immutable deployment subdomain
 * This prevents any changes to the subdomain after creation:
 * - CANNOT_UNWRAP: Can't unwrap back to registry
 * - CANNOT_SET_RESOLVER: Can't change resolver (which holds the contenthash)
 * - PARENT_CANNOT_CONTROL: Parent can't take control back
 * - CAN_EXTEND_EXPIRY: Anyone can renew to keep it alive
 */
export const IMMUTABLE_FUSES =
  FUSES.CANNOT_UNWRAP |
  FUSES.CANNOT_SET_RESOLVER |
  FUSES.PARENT_CANNOT_CONTROL |
  FUSES.CAN_EXTEND_EXPIRY

/**
 * Combine multiple fuse values using bitwise OR
 */
export function getFuseValue(fuses: number[]): number {
  return fuses.reduce((acc, cur) => acc | cur, 0)
}

/**
 * Check if specific fuses are burned (set)
 */
export function hasFuse(fusesValue: number, fuse: number): boolean {
  return (fusesValue & fuse) === fuse
}
