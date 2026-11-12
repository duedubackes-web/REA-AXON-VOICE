import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { getProject } from '../lib/workflows.ts';
import { ownerIdentity, workspace } from '../lib/workspace.ts';
export default defineTool({
  description: 'Verificar solicitação de renderização. Sem motor conectado, retorna bloqueio sem gerar nem cobrar.',
  inputSchema: z.object({ projectId: z.string().min(1) }).strict(),
  execute({ projectId }, ctx) {
    const owner = ownerIdentity(ctx.session.auth.current);
    const state = workspace.get();
    if (!state) throw new Error('project_not_found');
    const project = getProject(state, owner, projectId);
    if (!project.manifest) throw new Error('prepare_project_first');
    return { status: 'blocked', reason: 'media_connector_not_configured', chargedCredits: 0, externalActions: 0 };
  },
});
