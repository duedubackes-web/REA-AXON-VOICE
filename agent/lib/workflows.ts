import { createHash } from 'node:crypto';
import { z } from 'zod';

export const briefSchema = z.object({
  projectName: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(4000),
  referenceIds: z.array(z.string().trim().min(1).max(300)).max(30),
  preserve: z.array(z.enum(['identity', 'camera', 'background', 'wardrobe', 'motion', 'audio'])).max(6),
}).strict();
export type Brief = z.infer<typeof briefSchema>;
export interface Task { id: string; title: string; status: 'pending' | 'completed' | 'blocked'; reason?: string }
export interface Project {
  id: string; operationKey: string; fingerprint: string; brief: Brief; tasks: Task[];
  manifest: { brief: Brief; checks: string[] } | null;
}
export interface Workspace { owner: string; projects: Project[] }
export function assertOwner(state: Workspace, owner: string) {
  if (!owner || state.owner !== owner) throw new Error('workspace_access_denied');
}
export function emptyWorkspace(owner: string): Workspace {
  if (!owner) throw new Error('authentication_required');
  return { owner, projects: [] };
}
export function getProject(state: Workspace, owner: string, projectId: string) {
  assertOwner(state, owner);
  const project = state.projects.find(p => p.id === projectId);
  if (!project) throw new Error('project_not_found');
  return structuredClone(project);
}
export function createProject(state: Workspace, owner: string, operationKey: string, raw: Brief) {
  assertOwner(state, owner);
  if (!operationKey.trim() || operationKey.length > 160) throw new Error('invalid_operation_key');
  const brief = briefSchema.parse(raw);
  brief.referenceIds = [...new Set(brief.referenceIds)].sort();
  brief.preserve = [...new Set(brief.preserve)].sort();
  const fingerprint = createHash('sha256').update(JSON.stringify(brief)).digest('hex');
  const prior = state.projects.find(p => p.operationKey === operationKey);
  if (prior) {
    if (prior.fingerprint !== fingerprint) throw new Error('idempotency_conflict');
    return { state: structuredClone(state), project: structuredClone(prior), reused: true };
  }
  const id = 'project_' + createHash('sha256').update(JSON.stringify([owner, operationKey])).digest('hex').slice(0, 24);
  const project: Project = {
    id, operationKey, fingerprint, brief, manifest: null,
    tasks: [
      { id: 'prepare', title: 'Preparar briefing e checklist', status: 'pending' },
      { id: 'render', title: 'Gerar mídia com provedor autorizado', status: 'blocked', reason: 'media_connector_not_configured' },
      { id: 'review', title: 'Revisar resultado gerado', status: 'blocked', reason: 'awaiting_real_output' },
      { id: 'export', title: 'Exportar versão aprovada', status: 'blocked', reason: 'awaiting_approved_output' },
    ],
  };
  return { state: { ...structuredClone(state), projects: [...structuredClone(state.projects), project] }, project: structuredClone(project), reused: false };
}
export function prepareProject(state: Workspace, owner: string, projectId: string) {
  const project = getProject(state, owner, projectId);
  if (!project.brief.referenceIds.length) throw new Error('reference_required');
  project.manifest = {
    brief: project.brief,
    checks: [
      'Verificar acesso e adequação de cada referência antes de enviá-la ao provedor.',
      'Consultar capacidades, duração e resolução suportadas pelo provedor.',
      ...project.brief.preserve.map(item => `Avaliar preservação de ${item}.`),
      'Confirmar modelo, canal, resolução, duração, custo e validade da cotação antes de aprovar mídia.',
      'Explicar reserva de créditos, cobrança e liberação em caso de falha antes de gerar.',
      'Revisar estabilidade temporal, identidade e aderência ao briefing.',
      'Manter logos, preços e textos em camadas editáveis quando aplicável.',
    ],
  };
  project.tasks[0] = { ...project.tasks[0], status: 'completed' };
  return { state: { ...structuredClone(state), projects: state.projects.map(p => p.id === projectId ? project : structuredClone(p)) }, project };
}
export function externalReadiness() {
  return {
    grockbot: { status: 'authentication_required', publicApiDocumented: true, liveIntegrationVerified: false },
    higgsfield: { status: 'not_configured', liveIntegrationVerified: false },
    flow: { status: 'not_configured', liveIntegrationVerified: false },
  } as const;
}
