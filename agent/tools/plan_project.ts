import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { briefSchema, createProject, emptyWorkspace } from '../lib/workflows.ts';
import { ownerIdentity, workspace } from '../lib/workspace.ts';
export default defineTool({
  description: 'Criar projeto e tarefas nesta sessão; não gera mídia nem faz chamadas externas. Reutilize operationKey ao repetir o mesmo pedido.',
  inputSchema: z.object({ operationKey: z.string().min(1).max(160), brief: briefSchema }).strict(),
  execute({ operationKey, brief }, ctx) {
    const owner = ownerIdentity(ctx.session.auth.current);
    const result = createProject(workspace.get() ?? emptyWorkspace(owner), owner, operationKey, brief);
    workspace.update(() => result.state);
    return { project: result.project, reused: result.reused, externalActions: 0 };
  },
});
