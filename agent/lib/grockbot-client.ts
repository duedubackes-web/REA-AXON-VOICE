import { z } from 'zod';
export const remoteTaskInput = z.object({
  title: z.string().trim().min(1).max(300),
  type: z.enum(['reminder', 'email', 'calendar', 'custom']),
  description: z.string().max(4000),
}).strict();
const taskSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
  title: z.string(), type: z.string(), status: z.string(),
});
export type RemoteTask = z.infer<typeof taskSchema>;
export type AuthorizedTransport = (url: URL, init: RequestInit) => Promise<Response>;
export class GrockbotError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}
/** Contract adapter. The host must supply an authorized server-side transport.
 * No guessed auth scheme or session export. No automatic retries of writes:
 * public Grockbot documentation does not establish an idempotency contract.
 */
export class GrockbotClient {
  private readonly transport: AuthorizedTransport;
  constructor(transport: AuthorizedTransport) { this.transport = transport; }
  private async request(method: 'GET' | 'POST', body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.transport(new URL('/api/tasks', 'https://grockbot.fun'), {
        method, redirect: 'error',
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new GrockbotError(method === 'POST' ? 'outcome_unknown_do_not_retry' : 'transport_unavailable');
    }
    if (response.status === 401 || response.status === 403) throw new GrockbotError('authentication_required');
    if (!response.ok) throw new GrockbotError(method === 'POST' ? 'outcome_unknown_do_not_retry' : 'provider_error');
    try { return await response.json(); }
    catch { throw new GrockbotError(method === 'POST' ? 'outcome_unknown_do_not_retry' : 'invalid_provider_response'); }
  }
  async listTasks(): Promise<RemoteTask[]> {
    const parsed = z.array(taskSchema).safeParse(await this.request('GET'));
    if (!parsed.success) throw new GrockbotError('invalid_provider_response');
    return parsed.data;
  }
  async createTask(input: z.infer<typeof remoteTaskInput>): Promise<RemoteTask> {
    const parsed = taskSchema.safeParse(await this.request('POST', remoteTaskInput.parse(input)));
    if (!parsed.success) throw new GrockbotError('outcome_unknown_do_not_retry');
    return parsed.data;
  }
}
