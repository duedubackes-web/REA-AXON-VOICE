import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { externalReadiness } from '../lib/workflows.ts';
export default defineTool({
  description: 'Consultar estado dos conectores. API documentada não significa conexão ativa.',
  inputSchema: z.object({}).strict(),
  execute() { return externalReadiness(); },
});
