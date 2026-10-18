# GreenCode — Sistema CLI de Logística Reversa de Resíduos Eletrônicos

Projeto acadêmico (Avaliação Individual 1) desenvolvido para a disciplina do prof. Eng. Dr. Gerson Penha, na Fatec — DSM.

## Sobre o projeto

O `greencode` é o núcleo operacional de uma plataforma de logística reversa de resíduos eletrônicos: conecta organizações que descartam equipamentos a um fluxo de recebimento, triagem e rastreabilidade até o destino final de cada item. A primeira entrega é uma aplicação de linha de comando (CLI), sem interface gráfica.

## Stack

- **Node.js** + **TypeScript**
- Persistência em arquivos com:
  - criptografia simétrica **AES-256-GCM**;
  - **journal** de transações, com possibilidade de rollback;
  - escrita atômica por arquivo temporário + renomeação.
- Autenticação com hash **SHA-256 + salt** e expiração de sessão de 30 minutos.
- CLI via `readline`, com menu por área navegável por setas ↑/↓ e Enter em TTY, atalhos numéricos, assistente guiado, comandos diretos, autocompletar e histórico persistente entre sessões.
- Senhas interativas mascaradas no terminal.
- Autorização RBAC centralizada em `ServicoAutorizacao` e também aplicada nos serviços de negócio.

## Papéis do sistema (RBAC)

- **Administrador:** administra usuários, organizações, contratos, lotes, equipamentos, parâmetros e relatórios.
- **Operador de Cadastro:** gerencia organizações e contratos e consulta dados permitidos desse domínio.
- **Gestor de Almoxarifado:** gerencia lotes e equipamentos e acompanha o fluxo operacional.
- **Auditor:** consulta organizações, lotes, equipamentos, parâmetros, journal e relatórios, sem executar alterações de negócio.

A lista exata de operações autorizadas é mantida no catálogo `src/cli/RegistroComandos.ts` e aplicada por `ServicoAutorizacao`. O menu numérico oculta categorias sem comandos autorizados para o papel atual, mas a autorização também é validada antes da execução e nos serviços de negócio.

Após o login, selecione uma categoria pelo número e depois uma operação no submenu. O assistente pede os campos, mostra opções numeradas para enumerações e permite cancelar com `!cancelar`. Também é possível digitar um comando diretamente no prompt; a opção `0` do menu principal ativa o modo direto e o comando `menu` retorna à interface numérica. Consulte [Guia do Menu Numérico](docs/GUIA_MENU_NUMERICO.md).

## Documentação

Toda a documentação do projeto está na pasta [`docs/`](./docs):

- [Visão Geral do Projeto](docs/greencode-documentacao-projeto.md) — contexto, requisitos técnicos, modelo de classes e decisões finais.
- [Épicos e User Stories](docs/greencode-epicos-USs.md) — material complementar.
- [Roteiro de Testes](docs/greencode-roteiro-testes.md) — suíte e jornada de validação.
- [Guia Direto para Testes do Professor](docs/guia-testes-professor.md) — comandos práticos para reproduzir os principais testes por papel.
- [Relatório de Cenários de Falha](docs/greencode-relatorio-cenarios-falha.md) — falhas, respostas e evidências.
- [Arquitetura de Segurança](docs/greencode-arquitetura-seguranca.md) — criptografia, autenticação, sessão, RBAC e persistência.
- [Guia do Menu Numérico](docs/GUIA_MENU_NUMERICO.md) — navegação por número, assistente guiado e modo de comandos diretos.
- [Relatório das Fases 2 e 3](docs/RELATORIO_FASE2_FASE3.md) — CRUD, parâmetros globais, auditoria e relatório financeiro.
- [Bateria de Auditoria das Fases 2 e 3](docs/BATERIA_TESTES_AUDITORIA_FASE2_FASE3.md) — comandos de teste e critérios de aceitação, com registro atualizado da suíte automatizada no Windows.
- [Relatório final da Fase 4](docs/RELATORIO_AUDITORIA_FASE4.md) — escopo entregue, causa/correção do `test4`, evidências de validação e backlog explicitamente aberto.
- [Relatório da Fase 4.7.1](docs/RELATORIO_FASE4_7_1.md) — padronização de listagens e evidências de homologação da versão dedicada.
- [Relatório da Fase 4.1](docs/RELATORIO_FASE4_1_NAVEGACAO.md) — implementação de setas e Enter, compatibilidade, testes pseudo-TTY e homologação Windows registrada.
- [Bateria de testes da Fase 4.7.2](docs/BATERIA_TESTES_FASE4_7_2.md) — busca textual, filtros combinados, intervalos de vencimento e validação de entrada.
- [Relatório da Fase 4.7.2](docs/RELATORIO_FASE4_7_2.md) — escopo implementado, arquivos, testes e histórico da homologação.
- [Relatório da Fase 5 — Etapas 1 e 2](docs/RELATORIO_FASE5_ETAPA1_2.md) — refatorações P4–P7, documentação atualizada, métricas prévias e checklist de validação final.
- [Registro de homologação final da AV1 no Windows](docs/RELATORIO_HOMOLOGACAO_AV1_WINDOWS.md) — pipeline `test1`–`test14`, smoke test manual, observação do seletor e limite Linux.
- [Auditoria Final](docs/greencode-auditoria-final.md) — consolidação da auditoria e validação final em ambiente Windows.
- [Diagrama de Classes](docs/diagrama_classes.png) (UML) — fornecido pelo professor.

## Estado de entrega — 18/10/2026

- **Fases 0–3:** mantidas como concluídas no histórico da correção da AV1.
- **Fase 4:** homologada manualmente pelo usuário no Windows; as evidências históricas de navegação, comandos, permissões e filtros permanecem nos relatórios específicos.
- **Fase 5 — Etapas 1 e 2:** refatorações P4–P7 e documentação incluídas nesta cópia. `test14` cobre serialização de datas aninhadas, filtro de período, helper de entidade e constantes de arquivo.
- **Pipeline Windows desta cópia:** o usuário confirmou `npm ci`, `npm run build`, `npx tsc --noEmit` e `npm test`, com `test1`–`test14` passando.
- **Smoke test manual Windows:** login, menu e submenu, navegação por setas, comandos guiados, `resumo`, modo de comandos diretos e opção 11 para encerrar a sessão foram confirmados. A atualização visual repete cabeçalhos durante o movimento das setas, mas o seletor permaneceu funcional; isso fica registrado como observação visual, não como bloqueador funcional conhecido.
- **Limite de homologação:** Linux ainda não foi testado nesta revisão. A aprovação Windows não deve ser apresentada como validação em Linux.

Consulte `docs/RELATORIO_FASE5_ETAPA1_2.md` e `docs/RELATORIO_HOMOLOGACAO_AV1_WINDOWS.md` para o registro detalhado.

## Como rodar

### Pré-requisitos

- **Node.js 18 ou superior**.
- **npm**.

### Instalação

Na raiz do projeto:

```bash
npm ci
```

### Executar a aplicação

```bash
npm start
```

Na primeira execução, caso `data/config.mestre.json` não exista, o sistema inicia o provisionamento, solicita a senha do administrador e cria os arquivos de persistência. Depois, solicita o login.

Durante a entrada interativa, as senhas são mascaradas no terminal.

### Executar a suíte de testes

A suíte completa:

```bash
npm test
```

Os testes individuais continuam disponíveis (`test1`–`test14`):

```bash
npm run test:test1
npm run test:test2
npm run test:test3
npm run test:test4
npm run test:test5
npm run test:test6
npm run test:test7
npm run test:test8
npm run test:test9
npm run test:test10
npm run test:test11
npm run test:test12
npm run test:test13
npm run test:test14
```

Para validar somente a tipagem:

```bash
npx tsc --noEmit
```

### Build

```bash
npm run build
```

### Observações importantes

- A pasta `data/` é criada em tempo de execução e está no `.gitignore`.
- `npm start` executa `src/index.ts` por meio de `tsx`.
- Os comandos da CLI seguem o formato `entidade ação --flag valor`.
- Flags obrigatórias ausentes ou vazias são rejeitadas com mensagem indicando o comando e o parâmetro esperado.
- Enums usados pela CLI são validados antes da execução.
- Datas informadas em comandos que aceitam datas usam `YYYY-MM-DD`; formatos inválidos e datas de calendário inválidas são rejeitados.
- Senhas de `usuario criar` e `senha alterar` não devem ser passadas por flag; o sistema solicita a senha de forma mascarada.
- `data/config.mestre.json` é necessário para as execuções seguintes ao provisionamento inicial.

## Compatibilidade

- Windows 10+
- Linux Ubuntu 24.04+ e derivados

## Validação da versão anterior realizada em 27/09/2026

No ambiente Windows utilizado para a validação final:

```text
npm ci               PASSOU
npm run build        PASSOU
npx tsc --noEmit     PASSOU
npm test             PASSOU
npm start            PASSOU
```

A instalação exibiu apenas um aviso do npm relacionado à política de scripts do `esbuild`; isso não impediu instalação, compilação, testes ou execução.

Também foram validados manualmente os quatro papéis (`ADMINISTRADOR`, `OPERADOR_CADASTRO`, `GESTOR_ALMOXARIFADO` e `AUDITOR`), incluindo comandos permitidos, comandos proibidos e tentativas de bypass.

Os cenários de adulteração de `.enc`, rotação do journal acima de 10 MB, autenticação, senha mascarada, validação de flags e validação de datas também foram validados. Veja os documentos de testes e segurança para os detalhes.


## Nota histórica — cores e menu híbrido da Fase 4

A implementação usa `picocolors` para mensagens de status e `@inquirer/core` para a interação de seleção com setas. O usuário posteriormente homologou no Windows a versão que inclui `test1`–`test13` e confirmou os fluxos manuais de navegação, submenus, comandos diretos, assistentes e filtros. Portanto, as notas antigas de homologação pendente em relatórios intermediários devem ser lidas como registros do estado anterior à homologação, não como o status atual da Fase 4.

A homologação de Linux continua pendente. A cópia de trabalho da Fase 5 acrescenta `test14`; a nova versão só será considerada validada depois da execução da pipeline atualizada descrita no relatório da Fase 5.
