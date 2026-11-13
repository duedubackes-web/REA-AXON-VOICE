# REA-AXON-VOICE

Engenharia reversa de alvos e plataforma para produção de áudio e vídeo.

## Base de automação

Base independente de agente construída com Eve 1.0.0-rc.10 após investigação pública do Grockbot.
Não é o servidor Grockbot, um clone completo da sua interface ou uma integração autenticada já ativa.

## O que funciona localmente

- Criar projetos com briefing, referências e características a preservar.
- Reutilizar pedidos repetidos com a mesma chave de operação; rejeitar conflitos.
- Preparar manifesto e checklist sem declarar que os arquivos foram verificados.
- Separar tarefas locais concluídas de renderização, revisão e exportação bloqueadas.
- Manter estado por sessão usando o mecanismo de estado do Eve e verificar o dono do workspace nas ferramentas.
- Adaptador de contrato para GET/POST de tarefas no Grockbot, com validação de resposta e transporte autorizado injetado pelo aplicativo hospedeiro.
- Núcleo local de trabalhos e créditos: cotação versionada, reserva, estados, tratamento de timeout e diagnóstico. Não movimenta dinheiro real nem se conecta a um motor de mídia.

O adaptador não está exposto ao modelo até que haja autenticação de servidor e registro persistente de operações. Uma escrita com resposta perdida permanece de resultado desconhecido e não recebe retry automático.

## Executar e validar

Node.js 24 é necessário.

```bash
npm ci
npm test
npm run typecheck
npm run demo
npm run demo:credits
```

A demo cria um projeto com referência fictícia e prepara seu checklist; não usa modelo nem faz chamadas externas.
A demo de créditos simula reserva, timeout, resultado tardio e notificação duplicada. Seus valores são fictícios e não movimentam créditos reais.

Para conversar com o agente, configure acesso ao modelo pelo procedimento de login do Eve e rode `npm run dev`. O modelo do scaffold foi preservado. Credenciais devem ficar na configuração de servidor apropriada, nunca em prompts ou no Git.

```bash
npm run build
npm start -- --host 127.0.0.1 --port 3030
```

Em ambientes que usam proxy HTTP herdado, o Node pode precisar de `NODE_USE_ENV_PROXY=1`. O build de verificação desta investigação usou `--skip-sandbox-prewarm`; foi validado localmente e não equivale a validação de implantação.

## Estado das integrações

Grockbot documenta uma API, mas GET de tarefas e integrações retornou 401 sem autenticação. Ainda é necessário um método de autorização de servidor suportado pelo serviço, validar o contrato de resposta autenticado e conectar o adaptador ao repositório real da plataforma. Não há método Bearer/OAuth presumido nem leitura de sessão do Chrome.

Higgsfield e Flow não estão conectados. `request_render` apenas verifica a prontidão e retorna bloqueio explícito; não pede aprovação de uma operação fictícia, não gera mídia e não cobra créditos. Orçamento real, geração, publicação, notificações, agendamento e projetos compartilhados entre sessões ainda não estão implementados.

O canal padrão preserva autenticação do framework: desenvolvimento local e OIDC quando configurado; não foi habilitado acesso anônimo em produção. Ferramentas genéricas de shell, edição de arquivos e delegação foram desabilitadas no agente de produto.

Veja `docs/INVESTIGACAO-GROCKBOT.md` para fontes, evidências e limites. Não houve teste end-to-end com LLM ou escrita no Grockbot.

O estudo `docs/INVESTIGACAO-HIGGSFIELD.md` cruza evidências REA, relatos públicos e políticas oficiais com prioridades e critérios de aceite. O núcleo `agent/lib/render-jobs.ts` implementa parte desses contratos de forma pura e testável; sua integração com banco transacional, cotação real e callbacks autenticados está pendente.

## Painel comercial do piloto

Interface privada para registrar briefings, preparar propostas com custos e margem, exportar o documento do cliente, informar recebimentos e acompanhar produção, revisão e entrega. Os dados ficam neste navegador e podem ser exportados/importados por backup. Recebimentos são registros manuais; não há cobrança nem verificação bancária.

Fonte em `web/commercial/`. Compile com `npm run build:commercial`; a saída fica em `web/commercial/dist/`. Veja `docs/PILOTO-COMERCIAL.md` para oferta hipotética, roteiro de validação e limites de uso. O backend de agente continua independente dessa interface local; não há sincronização entre os dois nesta etapa.

Painel privado publicado: https://axon-voice-comercial-nov26.sunshinycroissant1.chatgpt.site
