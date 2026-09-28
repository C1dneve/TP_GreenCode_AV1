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
- CLI via `readline`, com autocompletar e histórico persistente entre sessões.
- Senhas interativas mascaradas no terminal.
- Autorização RBAC centralizada em `ServicoAutorizacao` e também aplicada nos serviços de negócio.

## Papéis do sistema (RBAC)

| Papel | Comandos de negócio permitidos |
|---|---|
| `ADMINISTRADOR` | `usuario criar`, `org criar`, `org listar`, `org renovar-contrato`, `lote criar`, `lote triagem`, `lote consultar-periodo`, `equip cadastrar`, `equip mover`, `equip codigo-barras`, `equip rastrear`, `equip atualizar-estado`, `relatorio organizacao`, `relatorio status`, `relatorio financeiro` |
| `OPERADOR_CADASTRO` | `org criar`, `org listar`, `org renovar-contrato` |
| `GESTOR_ALMOXARIFADO` | `lote criar`, `lote triagem`, `lote consultar-periodo`, `equip cadastrar`, `equip mover`, `equip codigo-barras`, `equip atualizar-estado` |
| `AUDITOR` | `equip rastrear`, `relatorio organizacao`, `relatorio status`, `relatorio financeiro` |

Além dos comandos acima, todo usuário autenticado possui:

```text
ajuda
logout
senha alterar
```

A matriz de permissões fica centralizada em `src/servicos/ServicoAutorizacao.ts`. A CLI utiliza essa matriz para montar o menu e bloquear comandos antes do despacho. Os serviços de negócio também verificam a autorização, portanto ocultar um comando no menu não é a única barreira.

## Documentação

Toda a documentação do projeto está na pasta [`docs/`](./docs):

- [Visão Geral do Projeto](docs/greencode-documentacao-projeto.md) — contexto, requisitos técnicos, modelo de classes e decisões finais.
- [Épicos e User Stories](docs/greencode-epicos-USs.md) — material complementar.
- [Roteiro de Testes](docs/greencode-roteiro-testes.md) — suíte e jornada de validação.
- [Guia Direto para Testes do Professor](docs/guia-testes-professor.md) — comandos práticos para reproduzir os principais testes por papel.
- [Relatório de Cenários de Falha](docs/greencode-relatorio-cenarios-falha.md) — falhas, respostas e evidências.
- [Arquitetura de Segurança](docs/greencode-arquitetura-seguranca.md) — criptografia, autenticação, sessão, RBAC e persistência.
- [Auditoria Final](docs/greencode-auditoria-final.md) — consolidação da auditoria e validação final em ambiente Windows.
- [Diagrama de Classes](docs/diagrama_classes.png) (UML) — fornecido pelo professor.

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

Os testes individuais continuam disponíveis:

```bash
npm run test:test1
npm run test:test2
npm run test:test3
npm run test:test4
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

## Validação final realizada em 27/09/2026

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
