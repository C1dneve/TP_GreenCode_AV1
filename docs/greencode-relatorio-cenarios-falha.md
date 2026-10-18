# GreenCode — Relatório de Cenários de Falha

> Registro dos cenários de erro, segurança, integridade e robustez executados no GreenCode. Os resultados abaixo distinguem testes automatizados, testes manuais e o comportamento observado na validação final em Windows.

## 1. Falhas de validação de negócio

| Cenário | Entrada / condição | Resultado |
|---|---|---|
| CNPJ inválido | CNPJ com dígito verificador incorreto | Rejeitado pelo `ValidadorCNPJ`. |
| CNPJ com todos os dígitos iguais | `11111111111111` | Rejeitado. |
| CNPJ duplicado | Organização com CNPJ já cadastrado | Rejeitado pelo serviço de organizações. |
| Data de lote futura | `dataEntrada` posterior a hoje | Rejeitado pelo `ValidadorDataEntrada`. |
| Data de lote antiga | `dataEntrada` anterior a 90 dias | Rejeitado. |
| Desmonte sem triagem | Equipamento direcionado ao desmonte antes da triagem | Bloqueado pela regra de negócio. |
| Queda de estado físico sem justificativa | Queda de 2 ou mais categorias | Rejeitado e exige justificativa. |
| Flag obrigatória ausente | Ex.: `lote criar --nf NF-ERRO --transp TransRapida` | Rejeitado com indicação da flag `--org`. |
| Flag obrigatória vazia | Ex.: `lote criar --org --nf NF-ERRO --transp TransRapida` | Rejeitado com indicação da flag `--org`. |
| Enum inválido | `relatorio status --status INVALIDO` | Rejeitado com indicação dos valores válidos. |
| Papel inválido | `usuario criar --usuario usuario_x --papel PAPEL_INEXISTENTE` | Rejeitado antes da persistência. |
| Data em formato inválido | `27/09/2026` | Rejeitada; formato aceito é `YYYY-MM-DD`. |
| Data de calendário inválida | `2026-99-99` | Rejeitada. |

## 2. Falhas de autenticação e sessão

| Cenário | Resultado |
|---|---|
| Usuário inexistente | Rejeitado com `Falha no login: Usuário ou senha inválidos.` |
| Senha incorreta | Mesma mensagem genérica do usuário inexistente. |
| Sessão expirada | Sessão invalidada e comando posterior rejeitado. |
| Token invalidado por logout | Token deixa de ser aceito. |
| Alteração de senha | Nova senha usada no login seguinte; senha anterior deixa de ser válida. |

A sessão expira após 30 minutos de inatividade.

## 3. Falhas e controles de RBAC

| Cenário | Resultado |
|---|---|
| `OPERADOR_CADASTRO` tentando criar lote | Rejeitado por permissão. |
| `OPERADOR_CADASTRO` tentando criar usuário | Rejeitado por permissão. |
| `GESTOR_ALMOXARIFADO` tentando `equip rastrear` | Rejeitado por permissão. |
| `GESTOR_ALMOXARIFADO` tentando criar organização | Rejeitado por permissão. |
| `AUDITOR` tentando criar usuário | Rejeitado por permissão. |
| `AUDITOR` tentando criar organização | Rejeitado por permissão. |
| `AUDITOR` tentando criar lote/equipamento | Rejeitado por permissão. |
| `AUDITOR` tentando alterar equipamento | Rejeitado por permissão. |
| Comando não listado no menu, mas digitado manualmente | Continua sujeito à autorização e é rejeitado quando fora da matriz. |
| Chamada direta ao serviço por usuário sem permissão | Rejeitada por `ServicoAutorizacao`. |

A proteção existe tanto na `CLIInterface` quanto nos serviços de negócio.

## 4. Persistência e integridade

| Cenário | Resultado / evidência |
|---|---|
| Escrita atômica | Implementada com arquivo temporário + `rename`; cobertura existente nos testes automatizados. |
| Arquivo `.enc` adulterado | **PASSOU em 27/09/2026.** O ciphertext adulterado foi rejeitado pelo AES-256-GCM. |
| Arquivo de dados ausente | Tratado pelo repositório como lista vazia até a primeira gravação. |
| Configuração mestre ausente | **PASSOU manualmente.** O sistema entrou no provisionamento inicial. |
| Transação com falha/reversão | Coberta pelos testes automatizados de `JournalTransacao`. |
| Journal > 10 MB | **PASSOU.** O journal rotacionou e o novo arquivo ativo foi criado. |
| Log da rotação | **PASSOU.** A mensagem `[INFO] Journal atingiu o limite. Rotacionando arquivo...` foi emitida. |

## 5. Entrada de senha mascarada

Durante a auditoria foi encontrado inicialmente um problema de interação entre `readline` e o modo raw da senha: uma senha digitada podia ser interpretada também pelo parser da CLI.

O problema foi corrigido em `src/cli/CLIInterface.ts`.

Após a correção, foram validados:

```text
123
Abc123!@#
```

e também o fluxo de duas senhas em `senha alterar`.

### Resultado final

- senha aparece como `*`;
- senha não aparece em texto puro;
- senha não é interpretada como comando;
- `ajuda` funciona imediatamente depois da senha;
- não ocorre `ERR_USE_AFTER_CLOSE`.

## 6. Categorização das mensagens

Respostas de erro de comandos de negócio passam pela camada da CLI e são exibidas com:

```text
[ERRO]
```

Respostas de operações bem-sucedidas usam:

```text
[OK]
```

A rotação do journal usa:

```text
[INFO]
```

## 7. Cenários de falha validados na segunda auditoria

### Validação de entrada

- flags obrigatórias ausentes;
- flags vazias;
- enum inválido;
- papel inválido;
- datas em formato incorreto;
- datas de calendário inválidas.

Todos passaram conforme esperado.

### Autenticação

- login correto;
- senha incorreta;
- usuário inexistente;
- alteração de senha;
- login com nova senha;
- logout;
- sessão expirada.

Todos passaram conforme esperado.

### RBAC

Os quatro papéis foram exercitados manualmente em ambiente Windows:

- `ADMINISTRADOR`;
- `OPERADOR_CADASTRO`;
- `GESTOR_ALMOXARIFADO`;
- `AUDITOR`.

As operações previstas para cada papel funcionaram e os comandos fora da responsabilidade de cada perfil foram rejeitados.

## 8. Testes finais realizados em Windows — 27/09/2026

```text
npm ci               PASSOU
npm run build        PASSOU
npx tsc --noEmit     PASSOU
npm test             PASSOU
npm start            PASSOU
```

`npm test` executou:

```text
test1
test2
test3
test4
```

Todos terminaram com sucesso.

A instalação apresentou somente um aviso do npm relacionado à política de scripts do `esbuild`; não houve impacto na compilação, nos testes ou na execução final.

## 9. Observação sobre o que não foi reclassificado

A interrupção física real de uma escrita em disco não foi simulada novamente como processo morto. A escrita atômica permanece implementada e coberta pelos testes existentes, mas este relatório não a marca como um cenário manual reproduzido nesta última rodada apenas por causa da implementação.

## 10. Estado final

Os dois cenários que estavam anteriormente pendentes — adulteração de `.enc` e journal acima de 10 MB — foram validados.

A auditoria final também confirmou:

- Factory;
- RBAC centralizado e nos serviços;
- senha mascarada;
- validação de flags;
- validação de datas;
- autenticação e sessão;
- testes dos quatro papéis;
- fluxo integrado CLI → serviços → persistência.

Não foram identificados bloqueios funcionais na validação final.


## 9. Adendo Fase 5 — regressões estruturais e resultado da validação

| Área | Caso a cobrir | Resultado esperado | Estado nesta entrega |
|---|---|---|---|
| Serialização | Organização com contrato e lote com equipamento/movimentação após JSON round-trip | Campos de data retornam como objetos `Date`; valores ISO são preservados | Teste `test14` aprovado na pipeline `npm test` do Windows, conforme registro de 18/10/2026 |
| Período | Filtrar registros num intervalo válido | Só os registros dentro do intervalo são retornados | Coberto por `test14`; regressão da CLI permanece também em `test9` |
| Período inválido | Data inicial posterior à data final | Exceção/mensagem padronizada, sem seguir com o filtro | Coberto por `test14` e pelos testes já existentes |
| Entidade ausente | Buscar entidade inexistente | Erro compreensível indicando a entidade | Coberto por `test14`; helper aplicado a serviços de lote/equipamento/organização |
| Nome de arquivo | Acessar arquivo de persistência/journal | Nomes físicos mantidos e consultados via `ARQUIVOS` | Refatorado; `test14` verifica valores representativos |
| Ambiente de testes | Criar ambiente descartável e autenticar papel | Dados isolados por diretório temporário; login segue convenção do helper | Helpers extraídos para `testUtils.ts`; `test4`/`test5` usam o helper |

Atualização de 18/10/2026: o usuário confirmou `npm ci`, `npm run build`, `npx tsc --noEmit` e `npm test`, com `test1`–`test14` aprovados no Windows. A pipeline de Linux é uma verificação separada e permanece pendente.
