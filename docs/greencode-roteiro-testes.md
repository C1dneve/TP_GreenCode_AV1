# GreenCode — Roteiro de Testes

> Roteiro de validação automatizada e manual do GreenCode. Para uma execução rápida por outra pessoa, consulte também `docs/guia-testes-professor.md`.

## 1. Suíte automatizada

### Instalação e compilação

```bash
npm ci
npm run build
npx tsc --noEmit
```

### Suíte completa

```bash
npm test
```

A suíte agregada atual executa `test1` a `test14` pelo script `npm test`. A lista abaixo é o histórico de cobertura inicial deste roteiro; para a descrição completa dos novos testes, confira os scripts `test:testN` no `package.json` e `src/tests/test5.ts` até `src/tests/test14.ts`.

### Testes individuais

```bash
npm run test:test1
npm run test:test2
npm run test:test3
npm run test:test4
```

| Arquivo | Cobertura |
|---|---|
| `test1.ts` | enums e validadores |
| `test2.ts` | entidades de domínio |
| `test3.ts` | persistência, criptografia, journal, autenticação, Factory e serviços |
| `test4.ts` | CLI, parsing, RBAC, flags, datas, sessão e fluxo integrado |

## 2. Cenários de segurança e persistência

### 2.1 Adulteração de `.enc`

`test3.ts` cria uma cópia de arquivo cifrado, altera seu ciphertext e confirma que o AES-256-GCM rejeita a adulteração.

**Resultado final:** PASSOU em 27/09/2026.

### 2.2 Journal acima de 10 MB

`test3.ts` grava transações grandes até provocar a rotação.

**Resultado final:** PASSOU em 27/09/2026.

A implementação registra:

```text
[INFO] Journal atingiu o limite. Rotacionando arquivo...
```

## 3. Fluxo integrado

`test4.ts` executa um fluxo real:

```text
CLI
 -> autenticação
 -> autorização
 -> serviços
 -> persistência
```

O fluxo validado inclui:

```text
organização + contrato
lote
equipamento
triagem
rastreamento
```

**Resultado final:** PASSOU.

## 4. Teste manual dos quatro papéis

### ADMINISTRADOR


```text
ajuda
org listar
lote consultar-periodo --inicio 2026-09-01 --fim 2026-09-30
lote triagem --id lote-manual-final
equip rastrear --id equip-manual-final
equip mover --id equip-manual-final --destino Estoque-A --obs Teste manual
equip atualizar-estado --id equip-manual-final --estado BOM_ESTADO
relatorio organizacao --org org-manual-final --inicio 2026-09-01 --fim 2026-09-30
relatorio status --status AGUARDANDO_DESMONTE
relatorio financeiro --inicio 2026-09-01 --fim 2026-09-30
```

Também foram criados usuários de teste para os outros papéis.

**Resultado:** PASSOU.

### OPERADOR_CADASTRO

Comandos permitidos:

```text
ajuda
org listar
org criar
org renovar-contrato
```

Também foram testados comandos fora da função do papel, incluindo operações de lote, equipamento, relatório e criação de usuário.

**Resultado:** PASSOU.

### GESTOR_ALMOXARIFADO

Comandos permitidos:

```text
ajuda
lote consultar-periodo
lote criar
equip cadastrar
equip codigo-barras
equip mover
equip atualizar-estado
lote triagem
```

Tentativa proibida:

```text
equip rastrear
```

Resultado observado:

```text
[ERRO] Comando "equip rastrear" não permitido para o papel GESTOR_ALMOXARIFADO.
```

Também foram testadas operações administrativas/cadastro fora do papel.

**Resultado:** PASSOU.

### AUDITOR

Comandos permitidos:

```text
ajuda
equip rastrear --id equip-manual-final
relatorio organizacao --org org-manual-final --inicio 2026-09-01 --fim 2026-09-30
relatorio status --status AGUARDANDO_DESMONTE
relatorio financeiro --inicio 2026-09-01 --fim 2026-09-30
```

Resultados observados na validação final:

```text
equip-manual-final: 2 movimentação(ões) registrada(s).
Lotes encontrados: 2
Equipamentos encontrados: 2
Peso total: 5.3 kg
Quantidade de equipamentos em AGUARDANDO_DESMONTE: 2
Equipamentos considerados no financeiro: 2
```

Também foram tentadas operações de escrita:

```text
usuario criar
org criar
lote criar
equip cadastrar
equip atualizar-estado
equip mover
```

Todas foram rejeitadas por permissão.

**Resultado:** PASSOU.

## 5. Bypass RBAC

Para cada papel, foi digitado manualmente um comando que não pertence à matriz de permissões.

O resultado esperado e observado foi:

```text
[ERRO] Comando "..." não permitido para o papel ...
```

A proteção também existe nos serviços de negócio, não apenas no menu.

## 6. Autenticação e sessão

### Login

- senha correta: PASSOU;
- senha incorreta: PASSOU;
- usuário inexistente: PASSOU.

### Senha mascarada

Foram testadas:

```text
123
Abc123!@#
```

Resultado:

- caracteres mascarados;
- nenhuma senha interpretada como comando;
- criação de usuário funcionando;
- `senha alterar` funcionando;
- login com a nova senha funcionando.

### Logout

PASSOU.

### Sessão expirada

Teste automatizado controlado confirmou a expiração e rejeição do comando após o vencimento.

## 7. Validação de entrada

### Flags

Testados:

```text
lote criar --nf NF-ERRO --transp TransRapida
lote criar --org --nf NF-ERRO --transp TransRapida
relatorio status --status INVALIDO
usuario criar --usuario usuario_x --papel PAPEL_INEXISTENTE
```

Todos rejeitados com mensagem de erro específica.

### Datas

Testados:

```text
2026-09-27
27/09/2026
data-invalida
2026-99-99
```

Somente a data válida foi aceita.

## 8. Matriz de comandos

| Papel | Negócio permitido |
|---|---|
| `ADMINISTRADOR` | usuário, organização, lote, equipamento e relatórios |
| `OPERADOR_CADASTRO` | organização e contratos |
| `GESTOR_ALMOXARIFADO` | lotes e equipamentos, exceto rastreamento |
| `AUDITOR` | rastreamento e relatórios |

Todos os perfis autenticados possuem:

```text
ajuda
logout
senha alterar
```

## 9. Checklist final

```text
[ ] npm ci
[ ] npm run build
[ ] npx tsc --noEmit
[ ] npm test
[ ] npm start
[ ] ADMINISTRADOR
[ ] OPERADOR_CADASTRO
[ ] GESTOR_ALMOXARIFADO
[ ] AUDITOR
[ ] Bypass RBAC
[ ] Login e senha
[ ] Alteração de senha
[ ] Logout
[ ] Flags inválidas
[ ] Datas inválidas
[ ] .enc adulterado
[ ] Journal > 10 MB
```




## 10. Fase 5 — refatorações P4–P7 e regressão

Na pasta raiz, executar na ordem: `npm ci`, `npm run build`, `npx tsc --noEmit`, `npm test`. A suíte desta revisão inclui `test14`. Para conferir isoladamente os helpers desta etapa, execute `npm run test:test14`.

O `test14` valida: datas de organização e contrato após serialização JSON, datas aninhadas de lote/equipamento/movimentação, conversão Date↔ISO, filtro inclusivo por período, rejeição de intervalo invertido, exceção de `exigirEncontrado` e constantes `ARQUIVOS`.

Depois de a suíte passar, execute `npm start` e faça um smoke test no terminal: login, `org listar`, `lote listar`, `equip listar`, `auditoria listar --usuario admin`, `resumo`, retorno ao menu e logout. Use uma pasta de dados temporária conforme o roteiro de auditoria quando desejar isolamento. Não reutilize senhas reais em evidências.

**Estado desta revisão:** o usuário deve confirmar a pipeline atualizada no Windows. A execução completa em Linux não foi realizada nesta entrega.


## 6. Homologação final Windows — 18/10/2026

O usuário confirmou nesta revisão `npm ci`, `npm run build`, `npx tsc --noEmit` e `npm test`, com `test1`–`test14` aprovados. O smoke test por `npm start` confirmou login, menu, navegação por setas, submenu, listagem em ambiente vazio, `resumo`, modo de comandos diretos e logout pela opção 11. O redesenho repetido do cabeçalho quando se pressionam as setas foi observado, mas não impediu a navegação nem o encerramento da sessão. A validação em Linux permanece pendente.
