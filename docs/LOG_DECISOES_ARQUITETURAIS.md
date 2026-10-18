# Log de decisões arquiteturais — Fase 0 e Fase 1

## D-001 — Usar o ZIP como baseline
- **Decisão:** trabalhar sobre uma cópia extraída do ZIP entregue, sem alterar o repositório remoto nem fazer push.
- **Alternativas:** editar diretamente o GitHub; criar outro repositório.
- **Motivo:** manter a cópia original intacta e tornar as alterações auditáveis.

## D-002 — Registro declarativo de comandos
- **Decisão:** adicionar `src/cli/RegistroComandos.ts` como catálogo de comandos, descrições, papéis autorizados e flags obrigatórias.
- **Alternativas:** manter listas duplicadas em CLI e serviço de autorização; introduzir framework CLI externo.
- **Motivo:** reduzir divergência entre menu, autocomplete, autorização e validação, sem dependência adicional nem mudança de sintaxe.
- **Impacto esperado:** alterações de permissões e parâmetros podem partir de uma definição central.

## D-003 — Preservar despacho de negócio existente
- **Decisão:** manter o `switch` de execução em `CLIInterface` nesta fase.
- **Alternativas:** mover cada caso para handler independente agora.
- **Motivo:** reduzir risco de alterar regras de negócio durante uma refatoração estrutural limitada. A extração por handler fica como evolução futura, se necessária.

## D-004 — Centralizar a criação do journal de serviços
- **Decisão:** introduzir `src/persistencia/registrarJournal.ts` e encaminhar os serviços de organização, lote e equipamento por esse helper.
- **Alternativas:** duplicar construção de `JournalTransacao` em cada serviço; redesenhar o journal inteiro.
- **Motivo:** unificar geração de ID e chamada de registro, preservando o formato cifrado e a classe `JournalTransacao`.
- **Limite conhecido:** o fluxo de autenticação conserva seu caminho próprio nesta etapa, pois mantém uma instância de transação para reversão e injeta a implementação de criptografia. Não foi alterado para evitar regressão sem testes executáveis.

## D-005 — Não alterar regras funcionais
- **Decisão:** não alterar validações de domínio, permissões efetivas intencionais, persistência cifrada, retenção/rotação do journal ou comandos disponíveis.
- **Motivo:** o objetivo desta fase é estrutural; mudanças funcionais exigem testes de regressão com dependências instaladas.

## D-006 — Baseline de testes bloqueado pelo ambiente
- **Decisão:** registrar os comandos e resultados reais, sem marcar testes como aprovados quando não executaram.
- **Motivo:** `npm ci` excedeu o tempo limite do ambiente; `npm run build` falhou por ausência de tipos Node instalados e `npm test` falhou porque o executável `tsx` não estava disponível.

## Decisões adicionais — Fases 2 e 3 (17/10/2026)

| Decisão | Alternativas consideradas | Justificativa |
|---|---|---|
| Desativação lógica de credenciais, organizações, lotes e equipamentos | Exclusão física; desativação lógica | A desativação conserva IDs e trilhas para auditoria e evita quebrar referências históricas. |
| Registros legados sem `ativo` são tratados como ativos | Tratar como inativos; falhar ao carregar | Mantém compatibilidade do repositório preexistente sem ocultar registros antigos. |
| Equipamento antigo sem valor de aquisição recebe `0` | Estimar valor por marca/ano; falhar na migração | Não inventa dados financeiros. O valor real deve ser preenchido pelo operador autorizado. |
| Alíquota inicial de imposto é `0%` | Fixar alíquota fiscal arbitrária | A aplicação não conhece o regime tributário do contrato/organização; zero explícito evita fingir precisão fiscal. |
| Taxa de depreciação global inicia em `15%` | Usar uma taxa nova arbitrária | Preserva a taxa anual anteriormente adotada na aplicação e permite configuração administrativa. |
| Pesquisa de auditoria é de leitura e inclui arquivos rotacionados | Só pesquisar arquivo atual; exibir todos os dados do evento | Auditoria precisa consultar o histórico; a CLI expõe metadados do evento e evita imprimir `antes/depois` sensíveis. |
| Dados globais são armazenados em `parametros_globais.enc` | Misturar parâmetros a uma entidade de negócio; arquivo em texto simples | Segue o mecanismo de persistência cifrada existente e isola configuração global. |
| Relatório financeiro apresenta estimativa de receita mensal, não soma mensal × meses do intervalo | Apresentar um total acumulado sem base de faturamento mensal | Evita sugerir receita histórica acumulada sem uma regra de faturamento/suspensão pro rata definida. |
| O ciclo do lote inclui comandos `encaminhar` e `finalizar` | Alterar status diretamente; adicionar atalhos que pulam estados | Garante que a condição de desativação da organização possa ser alcançada pela interface pública e preserva a sequência do ciclo de vida. |
| `GREEN_CODE_DATA_DIR` permite escolher pasta de dados para execução | Usar sempre `./data` | Viabiliza testes manuais reprodutíveis em diretório temporário sem tocar nos dados usuais. |


## Adendo — interface numérica (17/10/2026)

- **Problema observado:** a lista de operações cresceu e obrigava a memorizar/teclar comandos completos.
- **Decisão:** menu numérico por áreas, submenus numerados por papel e assistente para preencher parâmetros; manter digitação direta como modo avançado.
- **Alternativas consideradas:** substituir definitivamente os comandos por escolhas numéricas (descartado por remover a interface existente e dificultar automação); manter apenas autocomplete (descartado por continuar exigindo memorização); usar menu único com dezenas de linhas (descartado por excesso de rolagem).
- **Motivo:** reduzir carga de memória, preservar compatibilidade, manter acessibilidade às operações avançadas e centralizar a apresentação no catálogo já existente.
- **Segurança:** as permissões continuam verificadas no serviço de autorização antes da execução; ocultar uma opção no menu não é tratado como controle de segurança suficiente.


## Decisão — 2026-10-17 — formatador compartilhado para listagens (Fase 4.7.1)

- **Decisão:** introduzir `src/cli/FormatadorListaCLI.ts` para uniformizar título, estado vazio e contagem nas listagens da CLI.
- **Alternativas consideradas:** reescrever consultas e saídas de cada serviço; adotar uma abstração genérica de consulta; uniformizar somente apresentação.
- **Motivo:** reduzir o risco de regressão preservando filtros, ordenação implícita, consultas, modelos, autorização e serviços existentes.
- **Escopo:** usuários, organizações, contratos, lotes, consulta de lotes por período, equipamentos e auditoria.
- **Limites:** novos filtros/pesquisas, detalhes sob demanda e paginação permanecem na Fase 4.7.2 ou etapa posterior. A implementação só será considerada homologada após `npm run build`, `npx tsc --noEmit`, `npm test` incluindo `test7`, e verificação manual das listagens.


## Decisão — 2026-10-17 — navegação por teclado isolada (Fase 4.1)

- **Decisão:** acrescentar `src/cli/NavegacaoMenuCLI.ts` com funções puras para seleção circular e manter o despacho atual por meio de `processarEscolhaNumerica`. A integração do teclado atua somente no prompt principal/submenu quando há TTY, sessão ativa e linha vazia.
- **Alternativas consideradas:** reescrever o ciclo da CLI para uma biblioteca de menus; trocar a CLI persistente por prompts temporários; integrar setas diretamente ao processamento de comandos sem camada isolada.
- **Motivo:** permitir ↑/↓ e Enter sem introduzir dependência externa e sem substituir os atalhos numéricos ou o modo de comandos diretos.
- **Compatibilidade:** os comandos digitados quando a linha já contém texto seguem o fluxo normal do `readline`; assistente guiado e senha não ativam a navegação do menu; em execução sem TTY, números e comandos permanecem disponíveis.
- **Evidência inicial:** `test8` cobre a lógica de seleção; pseudo-TTY Linux validou setas, Enter, submenu, atalho `0`, retorno `menu` e comando direto `resumo`.
- **Atualização de homologação em 17/10/2026:** o usuário executou no Windows o pipeline `npm ci`, `npm run build`, `npx tsc --noEmit` e `npm test` com `test1`–`test9`; tudo passou. O usuário também confirmou os fluxos manuais centrais de menu, modo direto e retorno ao menu. Permanece pendente o pipeline completo no Linux.


## Decisão — 2026-10-17 — filtros progressivos após autorização (Fase 4.7.2)

- **Decisão:** implementar `src/cli/FiltrosPesquisaCLI.ts` como conjunto de funções puras para normalização de texto (case/acento-insensitive), pesquisa em campos concatenados e rótulos de filtros; adicionar filtros opcionais ao comando `listar` das entidades sem mudar os métodos de persistência.
- **Alternativas consideradas:** acrescentar filtros em serviços de domínio de imediato; criar uma query layer genérica e paginação nesta etapa; aplicar a pesquisa na CLI após a consulta autorizada dos serviços.
- **Motivo:** minimizar a superfície de regressão, preservar interfaces de serviço e autorização, e permitir testar as combinações por comando. O serviço continua autorizando a leitura antes de a CLI filtrar o conjunto permitido.
- **Filtros adicionados:** usuários (`--busca`, `--papel`), organizações (`--busca`), contratos (`--status`, `--de`, `--ate`), lotes (`--busca`, `--org`, `--status`) e equipamentos (`--busca`, mantendo os filtros antigos).
- **Contrato de entrada:** valores textuais com espaços devem ser escritos entre aspas duplas; ajuda e testes trazem exemplos dessa convenção existente.
- **Limites:** paginação e detalhes sob demanda continuam fora desta etapa. A homologação com dependências do lockfile precisa ser repetida no Windows para o pacote com `test9`.


## Decisões — Fase 5, etapas 1 e 2 (17/10/2026)

### D-F5-001 — Conversão compartilhada de datas e dados
- **Decisão:** centralizar a conversão de `Date` para ISO e a restauração de campos datados em `src/utils/SerializadorDados.ts`. Os nomes dos campos conhecidos ficam em `CAMPOS_DATA`; a caminhada recursiva cobre arrays e objetos aninhados.
- **Alternativas:** manter lógica repetida por modelo; delegar toda persistência a uma nova dependência.
- **Motivo:** reduzir duplicação e tornar explícito o contrato de serialização sem mudar o formato JSON usado pelos arquivos existentes.
- **Impacto e cautela:** os modelos mantêm os métodos públicos `paraDados`/`deDados`; `test14` cobre organização/contrato e lote/equipamento/movimentação.

### D-F5-002 — Catálogo dos nomes de arquivos
- **Decisão:** declarar nomes e prefixo do journal em `src/persistencia/ArquivosPersistencia.ts` (`ARQUIVOS`).
- **Alternativas:** conservar strings espalhadas pelos serviços e testes; mudar os nomes físicos dos arquivos.
- **Motivo:** reduzir erros de digitação e manter os nomes físicos existentes, inclusive o prefixo de arquivos rotacionados.

### D-F5-003 — Helpers pequenos para período e entidade ausente
- **Decisão:** compartilhar `filtrarPorPeriodo`/`validarPeriodo` e `exigirEncontrado` em `src/utils`.
- **Alternativas:** duplicar validação de datas e mensagens em cada serviço.
- **Motivo:** padronizar o comportamento e manter a regra de período inclusivo definida pelo chamador (o comando de contrato ainda ajusta o final do dia antes de chamar o helper).

### D-F5-004 — Ambiente de teste descartável e RBAC tabular
- **Decisão:** `src/tests/testUtils.ts` fornece `criarAmbiente` e `logarComo`; o teste de autorização usa casos declarados em uma tabela de papel, comando permitido, comando proibido e comando sensível.
- **Alternativas:** recriar diretórios, provisionamento e login em cada teste; manter casos de autorização em blocos separados e duplicados.
- **Motivo:** simplificar os testes sem compartilhar diretório de dados entre execuções.

### D-F5-005 — Homologação em duas etapas
- **Decisão:** o relatório da Fase 5 distingue validação local limitada (compilação com tipos disponíveis e teste `test14`) da nova pipeline npm e TTY a serem executados pelo usuário no Windows.
- **Motivo:** não atribuir à cópia modificada resultados que foram observados na versão imediatamente anterior. Linux segue pendente até uma execução real nesse ambiente.

### D-F5-006 — Registro explícito das divergências em relação ao diagrama fornecido

- **Base:** `docs/diagrama_classes.png` é o diagrama original da AV1 e foi preservado como referência; a implementação acumulou requisitos e utilitários desde essa versão.
- **Divergências aditivas no código:** foram adicionados utilitários de apoio que não aparecem no diagrama original (`SerializadorDados`, `FiltrarPorPeriodo`, `ExigirEncontrado` e `ArquivosPersistencia`) e módulos de CLI já introduzidos nas fases anteriores (catálogo de comandos, navegação, prompt híbrido, formatação de listagens, cores e filtros). Eles organizam responsabilidades transversais, sem substituir o papel de `CLIInterface` ou dos serviços representados no diagrama.
- **Dados de domínio ampliados conforme os requisitos:** `Credencial` passou a armazenar o nome completo e o estado ativo; organização mantém histórico de contratos além da referência ao contrato vigente; lote/equipamento usam desativação lógica; equipamento armazena valor de aquisição; os serviços de parâmetros e auditoria complementam as lacunas do enunciado.
- **Decisão:** não editar a imagem original fornecida nem renomear métodos públicos apenas para forçar igualdade literal com o diagrama. Registrar as diferenças aqui e nos relatórios técnicos, mantendo métodos públicos e comportamento já usado pelos testes.
- **Motivo:** o diagrama representa a estrutura inicial da AV1, mas não contém todas as necessidades de CRUD, histórico, auditoria, menu e manutenção que foram implementadas nas etapas seguintes. A documentação explicita essa evolução em vez de ocultá-la.
- **Limite:** este registro descreve as divergências conhecidas relevantes à Fase 5; não é uma reconstrução completa do diagrama UML nem declara que todos os elementos do sistema estão desenhados.


### D-F5-007 — Registro final da homologação Windows (18/10/2026)
- **Evidência confirmada pelo usuário:** `npm ci`, `npm run build`, `npx tsc --noEmit` e `npm test` foram executados no Windows; `test1`–`test14` passaram.
- **Smoke test manual:** login, menu/submenu, navegação por setas, comandos guiados, `resumo`, modo de comandos diretos e opção 11 (encerrar sessão) foram confirmados.
- **Observação:** a seleção por setas redesenha repetidamente o cabeçalho e pode exibir `... N opções acima`; o usuário verificou que a navegação e o encerramento permanecem funcionais. O efeito fica registrado como observação visual, sem bloqueio funcional identificado no teste.
- **Limite:** esta homologação se aplica ao Windows. A pipeline completa em Linux permanece pendente.
