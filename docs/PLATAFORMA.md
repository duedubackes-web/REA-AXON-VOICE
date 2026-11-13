# Direção do produto

REA-AXON-VOICE reúne criação audiovisual e automação assistida por agente.
Esta primeira implementação contém somente o módulo de planejamento e o adaptador de contrato do Grockbot. Não há editor audiovisual, geração, frontend próprio ou publicação implementados.

## Referências de produto e cobertura

- Higgsfield Genjutsu: observadas abas Motion transfer/Objects swap, referências, seletor de qualidade, presets e instruções públicas. Campos informam 4–30 segundos e até 30 imagens; não foram testados limites reais de upload nem qualidade de saída.
- Flow: observadas páginas públicas e capturas de tela fornecidas pelo usuário com mídias, personagens, cenas, favoritos, biblioteca e assistente lateral. URLs do projeto e do personagem redirecionaram a `/about` no navegador da investigação. Não houve inspeção autenticada do editor. O nome Sloth Du Crazy no cartão não abre uma ficha, conforme correção do usuário; não tratar ficha de personagem como recurso observado.
- Grockbot: documentação e modo demo observados com REA. A API existe na documentação e os GETs não autenticados retornaram 401. Ver investigação específica.

## Fluxo pretendido

Briefing → referências → storyboard → cenas → geração → revisão → exportação.

A base atual cobre planejamento de tarefas e manifesto de referências. As tarefas de mídia permanecem bloqueadas até integração real.

## Próximas implementações

1. Autenticação e projetos persistidos entre sessões com autorização por usuário/workspace.
2. Conector de tarefas Grockbot com autorização suportada, contrato autenticado validado e rastreamento de operações antes do envio.
3. Uploads de referência, leitura validada de metadados e matriz de capacidades por motor.
4. Cotação, teto de gastos, aprovação e reconciliação antes de qualquer renderização.
5. Motor de geração, estados de execução, revisões e exportação de resultados reais.
6. Interface de projeto e estudo de agendamento/notificações, sem declarar integrações de demonstração como ativas.

## Qualidade e economia

Não há benchmark de geração nesta versão. A meta proposta é reduzir custo por entrega aprovada em comparação com uma entrega paga equivalente; não foi demonstrada economia.

Medir custo de todas as tentativas, processamento e entrega dividido por resultados aprovados. Comparar com os mesmos briefs, durações, resoluções e condições comerciais. Usar avaliação cega de identidade, movimento, estabilidade temporal e preservação de conteúdo. Prévias e análise extra somente entram no fluxo quando reduzirem o custo total medido.

Logs de marca, personagens e exemplos dos concorrentes não são assets redistribuídos deste produto. O módulo é uma implementação independente, não código recuperado dos servidores dos alvos.
