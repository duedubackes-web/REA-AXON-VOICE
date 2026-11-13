# Higgsfield: produto, reclamações e prioridades para REA-AXON-VOICE

Consulta: 12 de novembro de 2026. Pesquisa qualitativa de páginas públicas, relatos e políticas; não é um ranking estatístico de reclamações nem uma auditoria de contas ou cobranças de terceiros.

## O que aproveitar

Preservar a conveniência de vários modelos no mesmo projeto, referências reutilizáveis, controles de câmera, presets e exemplos que mostram como um resultado foi construído. A navegação pública do Higgsfield e o estudo anterior de Genjutsu sustentam essa direção de experiência. A qualidade de vídeo anunciada ainda não foi medida por nós.

O estudo deve melhorar previsibilidade e continuidade do trabalho, e não simplesmente reproduzir a quantidade de botões do concorrente.

## Fontes e tratamento das evidências

| ID | Fonte | Uso e limite |
|---|---|---|
| S1 | [Trustpilot](https://www.trustpilot.com/review/higgsfield.ai) | Avaliações com experiências positivas e negativas; catálogo, demora e entendimento de planos. Não usar o resumo automático ou a nota como taxa de satisfação da população. |
| S2 | [BBB: reclamações e respostas](https://www.bbb.org/us/ca/san-francisco/profile/artificial-intelligence/higgsfield-ai-1116-977987/complaints) | Disputas de trial/renovação, mudança de plano e expiração promocional. São alegações com respostas da empresa; há também um caso recente em que o reclamante confirmou reembolso e resolução. |
| S3 | [Relato de saída e retorno ao produto](https://www.reddit.com/r/HiggsfieldAI/comments/1s8qmxi/got_burned_by_higgsfields_unlimited_plan/) | Relata confusão comercial e inconsistência de resultados, mas também melhora de suporte e gestão da assinatura e valor nos controles criativos. Experiência individual; não reproduzida. |
| S4 | [Outro relato de uso](https://www.reddit.com/r/generativeAI/comments/1rvaj50/my_honest_experience_with_higgsfield_after_4/) | Relata restrições percebidas no ilimitado, cobrança e suporte. As explicações sobre intenção da empresa são opinião do autor, não conclusões desta investigação. |
| S5 | [Como funcionam os créditos](https://higgsfield.ai/creator-hub/help-center/credits/how-credits-work) | Declara custo antes da geração, modalidades de crédito, expiração e extrato. Benefícios gratuitos/Unlimited do site não se aplicam a MCP, CLI, Canvas e Supercomputer. Não orçar automação com benefícios da assinatura web. |
| S6 | [Geração presa ou com falha](https://higgsfield.ai/creator-hub/help-center/troubleshooting/generation-is-stuck-or-failed) | Distingue etapas, filas e cancelamento; descreve devolução em falhas com exceção para Grok. Isso é política publicada, não execução testada em nossa conta. |
| S7 | [Créditos adicionais após cancelamento](https://higgsfield.ai/creator-hub/help-center/credits/top-up-credits-expire) | Distingue validade e tipos de crédito. Verificar a coerência entre texto principal, FAQ e a condição efetivamente aplicada à conta. |
| S8 | [Auto-Refill](https://higgsfield.ai/creator-hub/help-center/credits/how-does-auto-refill-work) | A documentação diz ser opcional e desligado por padrão. Não afirmar que o recurso é automaticamente ligado para todos. |
| S9 | [Termos oficiais](https://higgsfield.ai/terms-of-use-agreement) | Referência para verificar condições comerciais e versão aplicável, sem inferir o resultado de uma disputa individual. |

Foram excluídos do papel de fonte independente textos promocionais do próprio fornecedor e páginas de terceiros com aparência de site oficial. Relatos históricos não comprovam que o mesmo fluxo continue vigente. Não há afirmação de fraude, de pior qualidade geral ou de prevalência medida das queixas.

## Matriz de decisões

Prioridades propostas por impacto no usuário e recorrência qualitativa nas fontes, não por contagem representativa.

| Prioridade | Problema ou risco | Nossa resposta | Critério de aceite | Estado |
|---|---|---|---|---|
| P0 | Custo e elegibilidade difíceis de prever (S1–S5) | Cotação com modelo, canal, resolução, duração, créditos, validade e política | Valor ou parâmetros alterados invalidam a aprovação anterior; cotação web não pode virar API silenciosamente | Contrato e testes locais; cotação real e tela pendentes |
| P0 | Falha, fila e cobrança confundidas (S1, S5, S6) | Separar saldo disponível, reservado e capturado; estados de trabalho explícitos | Falha confirmada libera uma vez; timeout mantém reserva e exige reconciliação; retorno tardio não duplica captura | Núcleo local implementado; banco e provedores pendentes |
| P0 | Trial, upgrade e cancelamento mal compreendidos (S2–S4) | Mostrar total devido agora, período, próxima renovação e consequência para cada saldo antes da decisão | Mudança mensal/anual exige escolha explícita; cancelamento gera comprovante e data de efeito | Especificação; assinatura/checkout não implementados |
| P1 | Espera sem previsibilidade (S1, S6) | Estado de fila, concorrência contratada e estimativa baseada em telemetria, não em contador fictício | Diferenciar reservado, envio, fila, processamento, desconhecido e terminal; expor quando cancelamento depende do provedor | Estados no núcleo; estimativa e cancelamento real pendentes |
| P1 | Suporte sem contexto (S2–S4) | Diagnóstico por trabalho, histórico de crédito e política vigente, com opção de atendimento humano | Ticket contém ID, motor, estado e eventos relevantes, sem anexar prompt ou credenciais por padrão | Snapshot local implementado; suporte operacional pendente |
| P1 | Resultado varia entre tentativas (S3) | Guardar parâmetros, referências e versão do motor quando disponível; comparação de versões e avaliação cega | Medir consistência temporal, identidade, aderência e tentativas por entrega aprovada | Protocolo definido; geração e benchmark pendentes |
| P2 | Aprendizado e reutilização dispersos | Templates por tarefa e referências por projeto, preservando acesso ao processo de criação | Reabrir template mantém configurações e indica recursos indisponíveis | Planejamento inicial; editor pendente |

O concorrente já documenta custo prévio e extrato. Nosso diferencial deve ser clareza, consistência e execução verificadas dessas promessas, não afirmar que inventamos funcionalidades que ele já oferece.

Observação direta sobre consistência de informação: em S7, o texto principal afirma que créditos adicionais permanecem acessíveis no plano gratuito até expirar; ao abrir a FAQ de cancelamento, a resposta diz que ficam indisponíveis até reativar. O REA capturou os dois textos na mesma página. Isso comprova uma divergência documental no estado observado, não determina qual regra o backend aplica. Para o nosso produto, FAQ, checkout e extrato devem derivar de uma política versionada comum.

## Evidências REA desta rodada

CLI REA 6.9.0, Chromium, navegador sem autenticação. `capture_browser_scenario` navegou para as páginas e capturou DOM, acessibilidade e URL. Nenhuma geração, compra ou operação em conta foi executada.

| Página | Evidência |
|---|---|
| Home | ev_6240811abd3a8e3c42e0ecad7867ac2f04c42c19b55e01bb42a31366a1e463b8 |
| Pricing | ev_033242f9f6a1638d1c33862e8f74ed6319f681b8c3b0bb2d657e52a15aa9bb08 |
| Créditos | ev_a074fce08042dd49d44ab34ad5ba4d1afa74aef754b04a89744e818bf0f22009 |
| Falhas | ev_c20059e0cb81afca23eb485e46d76610db7a3a337c5cf1abe635dce19aa2cb22 |
| Cancelamento/top-ups | ev_180e5d4f80988d0ef2419549d8424bb5b87a29a1c9604ae19fe1de106a23e16e |
| FAQ de cancelamento aberta | ev_2906ad76e62223e1657c2b496fb0f9b219b2bcbfd79526b42d51dd77cf66bb7e |

As capturas declaram completude global incompleta, com seção de eventos ausente; não foram usadas para afirmar completude de rede ou ausência de endpoints. A captura de pricing mostrou apenas estrutura e navegação, sem tabela de planos: preços atuais não foram validados nesta rodada. Reutilizar capturas anteriores como se fossem preços atuais seria incorreto.

Os arquivos brutos permanecem no workspace de investigação, separados do runtime e das credenciais. O exemplo em `research/higgsfield.scenario.example.json` permite repetir uma captura pública com um executável Chromium já instalado; os IDs de evidência dependem da execução e do conteúdo observado.

## Implementação e limites financeiros

`agent/lib/render-jobs.ts` é um redutor puro de domínio para reserva e estados de um trabalho. Não é uma carteira em produção, um processador de pagamento ou integração ativa com Higgsfield. O aplicativo hospedeiro precisa autenticar usuários e eventos, validar cotação e consentimento no servidor e salvar cada transição em uma transação por conta. Não foram implementados callbacks reais, polling de reconciliação, cobrança de cartão, assinatura ou estorno monetário.

O ID e o fingerprint da cotação vinculam os parâmetros ao consentimento registrado pelo servidor. Esses campos não são, sozinhos, prova de consentimento autenticado. Reserva deve ser persistida antes de enviar ao motor; `dispatching` antes da chamada; eventos terminais precisam de confirmação autorizada e validação do artefato.

Duplicatas e resultados ambíguos têm testes locais. Uma falha de rede não é tratada como fracasso nem como estorno automático. Cancelamento em processamento não promete interrupção imediata. Sucesso técnico também não significa aprovação criativa do resultado.

## Validação de produto e preço

Antes de anunciar superioridade, executar o piloto de 30 briefs com três tentativas por fluxo e avaliação cega. Relatar qualidade, aprovação criativa, latência P50/P95, falhas, tentativas e custo total por entrega aprovada; não usar métricas do laboratório como garantia universal.

Para decidir preço, somar todas as tentativas, custos de falhas cobradas pelo motor, processamento, armazenamento, transferência e atendimento. Reservar margem e comparar entregas equivalentes. Não há comprovação de que nossa plataforma seja mais barata ou superior. Custos distintos de API/MCP e exceções do provedor precisam entrar na cotação; não repassar um benefício de web que não existe no canal automatizado.

Primeiro marco: provar que o usuário entende o custo antes de gerar, vê onde estão seus créditos e consegue resolver uma falha sem perder o contexto. Sem esses testes e integrações, não declarar as reclamações resolvidas em produção.
