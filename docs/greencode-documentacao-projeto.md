# GreenCode — Documentação do Projeto (AV1)

> Documento da visão geral do projeto, requisitos técnicos, modelo de classes e decisões consolidadas após a auditoria final.

## 1. Contexto do problema

Uma startup atua como intermediária de logística reversa de resíduos eletrônicos, conectando organizações que descartam equipamentos a operadores logísticos, especialistas em desmontagem e compradores de matéria-prima reciclada. O valor do negócio está em rastrear cada equipamento do recebimento ao destino final, produzindo dados de rastreabilidade, relatórios e conformidade ambiental.

A primeira entrega é um sistema **CLI**, construído em **Node.js + TypeScript**, com persistência em arquivos.

## 2. Papéis do sistema (RBAC)

| Papel | Responsabilidade |
|---|---|
| **Administrador** | Gerencia contas e possui as operações administrativas, operacionais e de relatórios previstas na matriz de permissões. |
| **Operador de Cadastro** | Cadastra organizações e renova contratos. |
| **Gestor de Almoxarifado** | Registra lotes, realiza triagem e executa operações de equipamentos. |
| **Auditor** | Consulta rastreabilidade e relatórios, sem operações de escrita. |

A matriz final de autorização está centralizada em `ServicoAutorizacao`.

## 3. Requisitos técnicos e implementação final

### Segurança

- Senhas com SHA-256 + salt por credencial.
- Arquivos de persistência com AES-256-GCM.
- Sessão com expiração após 30 minutos de inatividade.
- Entrada interativa de senha mascarada.
- Login com mensagem genérica para usuário inexistente ou senha incorreta.
- RBAC centralizado e aplicado na CLI e nos serviços de negócio.
- Validação de papel antes da criação de usuários.
- Validação explícita de flags, enums e datas.

### Persistência

- Escrita atômica por arquivo temporário + `rename`.
- Journal de transações com dados antes/depois e usuário responsável.
- Retenção mínima de 180 dias.
- Rotação automática ao ultrapassar 10 MB.
- Mensagem `[INFO]` quando a rotação acontece.
- Recuperação por `reverter()` para operações suportadas.
- Nomes de arquivos sanitizados com `path.basename()`.

### CLI

- `readline` com autocompletar.
- Histórico persistente entre sessões.
- Menu dinâmico por papel.
- Comandos no padrão `entidade ação --flag valor`.
- Flags obrigatórias ausentes ou vazias rejeitadas.
- Datas no formato `YYYY-MM-DD`.
- Senhas não aceitas por flags e solicitadas de forma mascarada.

## 4. Modelo de classes

| Camada | Classes principais |
|---|---|
| Interface | `CLIInterface` |
| Serviços | `ServicoAutenticacao`, `ServicoAutorizacao`, `ServicoOrganizacao`, `ServicoLote`, `ServicoEquipamentos`, `ServicoRelatorios` |
| Persistência | `RepositorioArquivos`, `CriptografiaArquivo`, `JournalTransacao` |
| Entidades | `Organizacao`, `Contrato`, `Lote`, `Equipamento`, `Credencial`, `Sessao`, `Movimentacao` |
| Factory | `OrganizacaoFactory` |
| Validação | `Validador`, `ValidadorCNPJ`, `ValidadorDataEntrada` |
| Enums | `PapelUsuario`, `StatusLote`, `TipoEquipamento`, `EstadoFisico`, `StatusRastreamento` |

## 5. Documentos do projeto

- Código-fonte funcional (`greencode`)
- Diagrama de Classes UML
- Documentação da Arquitetura de Segurança
- Roteiro de Testes
- Guia Direto para Testes do Professor
- Relatório de Cenários de Falha
- Auditoria Final
- Manual de Comandos (`README`)

## 6. Decisões finais da auditoria

### 6.1 Factory

Foi criada `OrganizacaoFactory` em:

```text
src/factories/OrganizacaoFactory.ts
```

Ela centraliza a criação de `Organizacao` e, quando informado, de `Contrato` associado.

`ServicoOrganizacao.cadastrarOrganizacao` utiliza a Factory para manter a composição do objeto em um único ponto.

A Factory foi validada nos testes de serviços e no fluxo integrado.

### 6.2 Triagem e histórico de movimentação

`ServicoLote.processarTriagem` continua responsável pela mudança de status do lote e dos equipamentos.

A triagem:

1. altera o status do lote;
2. atualiza o status de rastreamento dos equipamentos;
3. persiste os novos estados;
4. registra a transação no journal.

Ela não gera automaticamente uma `Movimentacao`.

Essa separação foi mantida porque `atualizarStatus` representa uma transição de status de rastreamento, enquanto `registrarMovimentacao` representa uma movimentação física explícita de origem/destino.

### 6.3 Validação de papel

`ServicoAutenticacao.criarUsuario` valida o papel informado contra `PapelUsuario` antes da persistência.

Valores inválidos não criam credenciais.

### 6.4 RBAC na camada de negócio

Foi criada `ServicoAutorizacao` como fonte única da matriz `COMANDOS_POR_PAPEL`.

A CLI usa o autorizador antes do despacho.

Além disso, `ServicoOrganizacao`, `ServicoLote`, `ServicoEquipamentos` e `ServicoRelatorios` recebem o autorizador e validam o papel nas operações correspondentes.

Isso garante que a autorização não dependa apenas da lista exibida por `ajuda`.

### 6.5 Robustez da CLI

Foram implementados:

- mensagens explícitas para flags ausentes/vazias;
- validação de enums;
- validação de datas;
- rejeição de senhas por flags;
- entrada mascarada de senha.

Durante a auditoria foi encontrado um conflito entre o `readline` e o listener de senha. A correção passou a suspender temporariamente o processamento de `keypress` do `readline` durante a senha e restaurá-lo ao final.

O cenário foi repetido com senhas simples e com símbolos, sem interpretação da senha como comando.

### 6.6 Suite de testes

`npm test` agrega:

```text
test1
test2
test3
test4
```

`test3` cobre novamente:

- criptografia;
- integridade de `.enc`;
- journal;
- rotação acima de 10 MB;
- autenticação;
- Factory;
- serviços.

`test4` cobre:

- parsing;
- matriz de permissões;
- integração CLI → serviços → persistência;
- RBAC;
- flags;
- datas;
- autenticação;
- sessão.

## 7. Resultado da validação final em Windows — 27/09/2026

A validação final foi executada em ambiente Windows e confirmou:

```text
npm ci               PASSOU
npm run build        PASSOU
npx tsc --noEmit     PASSOU
npm test             PASSOU
npm start            PASSOU
```

Também foram executados manualmente os fluxos dos quatro papéis:

- `ADMINISTRADOR`: operações administrativas, organização, lote, equipamento e relatórios;
- `OPERADOR_CADASTRO`: operações de organização e rejeição de comandos de outras áreas;
- `GESTOR_ALMOXARIFADO`: lotes, equipamentos, triagem e rejeição de `equip rastrear`;
- `AUDITOR`: rastreamento, relatórios e rejeição de operações de escrita.

Os comandos fora do papel foram rejeitados mesmo quando digitados diretamente na CLI.

Os cenários de adulteração de `.enc`, journal > 10 MB, senha mascarada, alteração de senha, autenticação, sessão, flags e datas também foram validados.

## 8. Estado final

Não foram identificados bloqueios funcionais na validação final.

As melhorias implementadas nesta rodada permanecem de baixo impacto e estão concentradas em:

- segurança;
- autorização;
- robustez da CLI;
- observabilidade do journal;
- cobertura de testes;
- documentação.
