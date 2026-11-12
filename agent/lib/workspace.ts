import { defineState } from 'eve/context';
import { createHash } from 'node:crypto';
import type { Workspace } from './workflows.ts';
export const workspace = defineState<Workspace | null>('creative-platform.workspace.v1', () => null);
// Identity comes from the authenticated channel, never model arguments.
export function ownerIdentity(auth: {
  authenticator: string; principalId: string; principalType: string; issuer?: string;
} | null): string {
  if (!auth?.principalId) throw new Error('authentication_required');
  return createHash('sha256').update(JSON.stringify([
    auth.authenticator, auth.issuer ?? '', auth.principalType, auth.principalId,
  ])).digest('hex');
}
