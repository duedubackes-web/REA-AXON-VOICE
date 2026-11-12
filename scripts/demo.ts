import { createProject, emptyWorkspace, prepareProject } from '../agent/lib/workflows.ts';
const planned = createProject(emptyWorkspace('local-example'), 'local-example', 'sloth-example-v1', {
  projectName: 'Sloth Du Crazy',
  objective: 'Planejar cena mantendo identidade, figurino e movimento.',
  referenceIds: ['reference-image-placeholder'],
  preserve: ['identity', 'wardrobe', 'motion'],
});
const prepared = prepareProject(planned.state, 'local-example', planned.project.id);
console.log(JSON.stringify({
  notice: 'Demonstração local de planejamento. Não abre o Flow nem gera mídia.',
  project: prepared.project,
  chargedCredits: 0,
  externalActions: 0,
}, null, 2));
