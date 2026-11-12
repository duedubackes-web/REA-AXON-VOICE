# Grockbot: investigação e integração inicial

Data: 12/11/2026. Alvo: https://grockbot.fun/. Método: navegação pública com REA 6.9.0, leitura de documentação e do bundle distribuído, sem sessão autenticada.

## Evidências

| Evidência REA | Conteúdo |
|---|---|
| ev_13c3f72d16ec39e8477c0f50efdf7ebfbd6ed74a4e620b7ecc81f91a44902a49 | Entrada na demonstração; chat desabilitado e convite ao cadastro |
| ev_e0c7ae2becf62da976113a80499cfd8b12873ffe95e9a0ecbe2cbe4287db65d9 | Abas Tasks, Integrations e Settings; operações desabilitadas e dados de demonstração |
| ev_0ffc992bad17a0d1e899821d27498a8a84d1220f2078c4b0e432fa6ad18e926f | Documentação com arquitetura declarada e referência REST |

As capturas brutas estão na pasta de pesquisa separada deste projeto, `work/grockbot` do workspace da investigação. Não são parte do runtime nem um clone do servidor.

API anunciada na documentação pública:

- GET/POST `/api/conversations`.
- POST `/api/conversations/:id/messages` com streaming SSE.
- GET/POST/PATCH/DELETE `/api/tasks`; o cliente distribuído referencia IDs nas operações PATCH/DELETE.
- GET/PATCH `/api/integrations`.
- GET/POST `/api/settings`.

Verificações de leitura realizadas com ferramentas HTTP comuns, não apresentadas como evidência REA: GET `/api/tasks` e GET `/api/integrations` responderam 401 com `Authentication required`. Nenhuma mutação externa foi executada.

## Limitações

- A documentação declara React/TypeScript/Vite, Express, Grok via OpenRouter e armazenamento em memória. Isso é uma declaração da página, não auditoria do backend atual.
- A indicação Connected da demo não prova acesso real a Calendar, Discord, Telegram ou Email.
- Não foi testada uma chamada de escrita autenticada. O contrato de resposta do adaptador é uma hipótese tipada baseada nos campos exibidos; precisa ser validado com a API autenticada.
- Não foram encontrados nas páginas examinadas um fluxo de autorização de servidor completo, OpenAPI publicada ou garantia de idempotência. Isso não prova que não existam em outra documentação.
- A análise estática REA do bundle completo atingiu o orçamento de 60 segundos e reteve observação parcial; não há alegação de reconstrução estática completa.
- O primeiro cenário foi recusado pelo registro de service worker; a execução válida passou a declarar a observação com service_workers=allow. Um seletor inicial de aba foi corrigido para o data-testid observado antes da captura válida.
- A busca no registro Eve por Grockbot retornou zero itens. Isso não estabelece ausência de outros SDKs ou integrações externas.

## Aplicação ao produto

Implementação independente, sem reutilizar marca, robô ou código proprietário do alvo:

1. Projetos e tarefas preparados pelo agente, com referências e preservação explicitadas.
2. Repetição do mesmo pedido reutiliza o projeto; alteração do conteúdo com a mesma chave é conflito.
3. Identidade derivada do canal autenticado, nunca de um campo fornecido ao modelo.
4. Manifesto e checklist locais são distintos de geração, revisão e exportação de mídia.
5. Estado mantido por sessão pelo Eve; integração com banco e projetos entre sessões ainda pendente.
6. Adaptador Grockbot para listar/criar tarefas, com transporte autenticado fornecido pelo aplicativo hospedeiro. Não registra token ou cookie no modelo.
7. Escrita com resultado ambíguo é sinalizada para reconciliação; não há retry automático nem garantia de exactly-once no serviço externo.

## Próxima fronteira de integração

É necessário o repositório real da plataforma e um método de autorização de servidor suportado pelo Grockbot. Antes de ativar escrita: verificar respostas reais, dono/escopo da conta, aprovação de ações externas e registro persistente da operação antes do envio. Para vídeo: implementar cotação real, limite de orçamento e reconciliação com o motor contratado. Chat com modelo também exige acesso configurado; não foi executado um teste com LLM nesta etapa.
