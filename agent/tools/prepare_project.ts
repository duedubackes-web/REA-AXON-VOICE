import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { prepareProject } from '../lib/workflows.ts';
import { ownerIdentity, workspace } from '../lib/workspace.ts';
export default defineTool({
  description: 'Preparar manifesto e checklist. Não verifica arquivos e não envia referências a provedores.',
  inputSchema: z.object({ projectId: z.string().min(1) }).strict(),
  execute({ projectId }, ctx) {
    const owner = ownerIdentity(ctx.session.auth.current);
    const state = workspace.get();
    if (!state) throw new Error('project_not_found');
    const result = prepareProject(state, owner, projectId);
    workspace.update(() => result.state);
    return { project: result.project, externalActions: 0 };
  },
});
