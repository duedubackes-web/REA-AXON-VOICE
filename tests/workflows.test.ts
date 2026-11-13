import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, emptyWorkspace, getProject, prepareProject, externalReadiness } from '../agent/lib/workflows.ts';
import { GrockbotClient } from '../agent/lib/grockbot-client.ts';
const brief = { projectName: 'Sloth Du Crazy', objective: 'Preparar cena mantendo o personagem', referenceIds: ['ref-front'], preserve: ['identity', 'wardrobe'] as ('identity' | 'wardrobe')[] };
test('duplicate request reuses project and changed intent conflicts', () => {
  const first = createProject(emptyWorkspace('alice'), 'alice', 'op-1', brief);
  const again = createProject(first.state, 'alice', 'op-1', { ...brief, preserve: ['wardrobe', 'identity', 'identity'] });
  assert.equal(again.reused, true);
  assert.equal(again.state.projects.length, 1);
  assert.equal(again.project.id, first.project.id);
  assert.throws(() => createProject(first.state, 'alice', 'op-1', { ...brief, objective: 'Different' }), /idempotency_conflict/);
});
test('another caller cannot read, write or prepare the workspace', () => {
  const first = createProject(emptyWorkspace('alice'), 'alice', 'op-1', brief);
  assert.throws(() => getProject(first.state, 'bob', first.project.id), /workspace_access_denied/);
  assert.throws(() => createProject(first.state, 'bob', 'op-2', brief), /workspace_access_denied/);
  assert.throws(() => prepareProject(first.state, 'bob', first.project.id), /workspace_access_denied/);
});
test('preparation survives JSON checkpoint without claiming external execution', () => {
  const first = createProject(emptyWorkspace('alice'), 'alice', 'op-1', brief);
  const result = prepareProject(JSON.parse(JSON.stringify(first.state)), 'alice', first.project.id);
  assert.equal(first.state.projects[0].manifest, null);
  assert.equal(result.project.tasks[0].status, 'completed');
  assert.equal(result.project.tasks[1].status, 'blocked');
  assert.equal(result.project.tasks[2].reason, 'awaiting_real_output');
  assert.ok(result.project.manifest?.checks.some(c => c.includes('identity')));
  assert.equal(externalReadiness().grockbot.liveIntegrationVerified, false);
});
test('preparation requires references', () => {
  const first = createProject(emptyWorkspace('alice'), 'alice', 'op-1', { ...brief, referenceIds: [] });
  assert.throws(() => prepareProject(first.state, 'alice', first.project.id), /reference_required/);
});
test('adapter uses documented endpoint and strips unrequested response fields', async () => {
  const calls: { url: string; method: string | undefined; body: string | undefined }[] = [];
  const client = new GrockbotClient(async (url, init) => {
    calls.push({ url: url.toString(), method: init.method, body: init.body as string | undefined });
    return Response.json({ id: 42, title: 'Review', type: 'custom', status: 'pending', extraPrivateField: 'omitted' });
  });
  const task = await client.createTask({ title: 'Review', type: 'custom', description: 'Check output' });
  assert.deepEqual(calls, [{ url: 'https://grockbot.fun/api/tasks', method: 'POST', body: JSON.stringify({ title: 'Review', type: 'custom', description: 'Check output' }) }]);
  assert.equal(task.id, 42);
  assert.equal('extraPrivateField' in task, false);
});
test('401 is not reported as a connected integration', async () => {
  const client = new GrockbotClient(async () => new Response('{}', { status: 401 }));
  await assert.rejects(client.listTasks(), /authentication_required/);
});
test('ambiguous external write is never automatically retried', async () => {
  let calls = 0;
  const client = new GrockbotClient(async () => { calls++; throw new Error('network lost'); });
  await assert.rejects(client.createTask({ title: 'Review', type: 'custom', description: '' }), /outcome_unknown_do_not_retry/);
  assert.equal(calls, 1);
});
test('successful HTTP write with malformed response remains ambiguous', async () => {
  const client = new GrockbotClient(async () => Response.json({ unrelated: true }));
  await assert.rejects(client.createTask({ title: 'Review', type: 'custom', description: '' }), /outcome_unknown_do_not_retry/);
});
