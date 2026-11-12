import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { assertOwner } from '../lib/workflows.ts';
import { ownerIdentity, workspace } from '../lib/workspace.ts';
export default defineTool({
  description: 'Consultar projetos e tarefas da sessão autenticada atual.',
  inputSchema: z.object({}).strict(),
  execute(_input, ctx) {
    const owner = ownerIdentity(ctx.session.auth.current);
    const state = workspace.get();
    if (!state) return { projects: [] };
    assertOwner(state, owner);
    return { projects: state.projects };
  },
});
