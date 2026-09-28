# GreenCode — Documentação da Arquitetura de Segurança

> Este documento registra as decisões de segurança implementadas no `greencode` e as validações realizadas na auditoria final.

## 1. Criptografia de dados em repouso

O projeto utiliza **AES-256 em modo GCM** (`aes-256-gcm`), implementado em `CriptografiaArquivo`.

O AES-256 atende ao requisito de criptografia simétrica. O modo GCM também fornece autenticação do ciphertext por meio de uma tag, permitindo detectar adulterações no conteúdo cifrado.

Isso se aplica aos arquivos de persistência utilizados pelo sistema, incluindo credenciais, organizações, lotes, equipamentos, movimentações e journal.

### Chave mestra

A chave de 256 bits é gerada no provisionamento inicial por `ServicoAutenticacao.provisionarInicial` e armazenada em `data/config.mestre.json`.

Os arquivos `.enc` não armazenam a chave mestra. O conteúdo cifrado contém os dados necessários para decifração e validação de integridade, mas depende da chave para ser aberto.

### Evidência

Em 27/09/2026 foi realizado um teste de adulteração real:

1. um arquivo cifrado válido foi criado;
2. uma cópia foi feita;
3. um nibble do ciphertext foi alterado manualmente;
4. a cópia adulterada foi processada pelo fluxo `ServicoEquipamentos -> RepositorioArquivos -> CriptografiaArquivo`.

O sistema rejeitou o arquivo adulterado por falha de decifração/validação de integridade, enquanto o arquivo válido continuou utilizável.

---

## 2. Hash de senhas

As senhas não são armazenadas em texto puro.

`Credencial` utiliza:

- **SHA-256**;
- salt aleatório de 16 bytes por credencial.

A verificação refaz o hash da senha informada usando o salt armazenado e compara o resultado.

A alteração de senha cria um novo hash/salt; a senha anterior não é recuperada.

---

## 3. Entrada de senha na CLI

As senhas são solicitadas de forma interativa e mascaradas quando a entrada é um terminal (`TTY`).

Isso ocorre em:

- provisionamento inicial;
- login;
- `usuario criar`;
- `senha alterar`.

As senhas não devem ser fornecidas por flags. A CLI rejeita tentativas como:

```text
usuario criar --usuario teste --papel AUDITOR --senha 123
```

e:

```text
senha alterar --antiga 123 --nova 456
```

### Correção de segurança/robustez da entrada mascarada

Durante a auditoria foi identificado um problema de interação entre `readline` e a leitura mascarada: o caractere digitado para a senha podia chegar também ao parser normal da CLI.

A correção ficou restrita a `CLIInterface`:

- estado `lendoSenha` impede o processamento normal de linhas durante a leitura;
- listeners de `keypress` do `readline` são temporariamente removidos;
- apenas o listener da senha recebe as teclas durante o modo raw;
- os listeners são restaurados ao final;
- o modo raw anterior é restaurado;
- o `readline` volta ao processamento normal depois da senha.

O problema foi reproduzido e corrigido. Na validação final, senhas `123` e `Abc123!@#` foram aceitas sem serem interpretadas como comandos, e não ocorreu `ERR_USE_AFTER_CLOSE`.

---

## 4. Autenticação e sessão

Todo login bem-sucedido cria uma `Sessao` com:

- token aleatório de 32 bytes;
- validade de 30 minutos de inatividade.

A expiração é verificada a cada comando por `ServicoAutenticacao.validarToken`.

Quando a sessão expira, ela é invalidada e a CLI encerra a sessão.

### Proteção contra enumeração de contas

Falhas de login para:

- usuário inexistente;
- usuário existente com senha incorreta;

retornam a mesma mensagem:

```text
Falha no login: Usuário ou senha inválidos.
```

---

## 5. Controle de acesso por papel (RBAC)

Os quatro papéis são:

```text
ADMINISTRADOR
OPERADOR_CADASTRO
GESTOR_ALMOXARIFADO
AUDITOR
```

A matriz de permissões está centralizada em:

```text
src/servicos/ServicoAutorizacao.ts
```

### Matriz

| Papel | Permissões de negócio |
|---|---|
| `ADMINISTRADOR` | todas as operações de usuário, organização, lote, equipamento e relatórios previstas na matriz |
| `OPERADOR_CADASTRO` | organização e contratos |
| `GESTOR_ALMOXARIFADO` | lotes e operações de equipamentos, exceto rastreamento |
| `AUDITOR` | rastreamento e relatórios, sem operações de escrita |

Todos os usuários autenticados também possuem:

```text
ajuda
logout
senha alterar
```

### Dupla camada de autorização

A autorização não depende apenas do menu da CLI.

1. `CLIInterface` verifica o comando antes do despacho.
2. Os serviços de negócio recebem `ServicoAutorizacao` e verificam a autorização antes de executar as operações correspondentes.

Assim, um usuário não pode contornar o RBAC apenas digitando manualmente um comando que não aparece em `ajuda`.

Na auditoria final, um `AUDITOR` tentando executar `org criar` diretamente pelo serviço também foi rejeitado.

---

## 6. Validação de entradas na CLI

A CLI passou a tratar explicitamente:

- flags obrigatórias ausentes;
- flags obrigatórias sem valor;
- valores inválidos de enums;
- datas com formato inválido;
- datas de calendário inválidas.

### Datas

O formato aceito é:

```text
YYYY-MM-DD
```

Exemplos:

```text
2026-09-27
```

é aceito.

```text
27/09/2026
2026-99-99
data-invalida
```

são rejeitados.

### Papéis

`ServicoAutenticacao.criarUsuario` também valida o `PapelUsuario` antes da persistência.

---

## 7. Persistência atômica e recuperação de falhas

### Escrita atômica

`RepositorioArquivos` escreve primeiro em um arquivo temporário (`.tmp`) e só depois substitui o arquivo definitivo por `rename`.

Isso evita deixar o arquivo definitivo parcialmente gravado em uma interrupção durante a escrita.

### Journal

`JournalTransacao` registra a operação, entidade, dados anteriores, dados posteriores e usuário responsável.

`reverter()` utiliza o registro para restaurar ou remover a entidade conforme a operação.

### Retenção e rotação

O journal:

- possui retenção mínima de 180 dias;
- rotaciona ao ultrapassar 10 MB;
- registra uma mensagem informativa no momento da rotação.

Mensagem produzida:

```text
[INFO] Journal atingiu o limite. Rotacionando arquivo...
```

### Evidência

O cenário foi executado com transações de grande porte. A rotação ocorreu e o novo arquivo ativo foi criado corretamente. O teste automatizado também reproduz esse cenário em diretório temporário.

---

## 8. Proteção do caminho dos arquivos

`RepositorioArquivos.obterCaminho()` utiliza `path.basename()` para sanitizar nomes de arquivos antes de montar caminhos dentro do diretório de dados.

Isso reduz o risco de traversal por nomes como `../arquivo`.

---

## 9. Provisionamento inicial

Quando `data/config.mestre.json` não existe:

1. o sistema entra em modo de provisionamento;
2. solicita a senha do administrador;
3. gera a chave AES-256;
4. cria a credencial `admin`;
5. cria as dependências de persistência;
6. segue para o login.

Esse fluxo foi validado manualmente no Windows durante a auditoria final.

---

## 10. Evidências de segurança na validação final — 27/09/2026

| Cenário | Resultado |
|---|---|
| Login correto | PASSOU |
| Senha incorreta | PASSOU |
| Usuário inexistente | PASSOU |
| Senha mascarada | PASSOU |
| Senha com símbolos | PASSOU |
| Alteração de senha | PASSOU |
| Logout | PASSOU |
| Sessão expirada | PASSOU |
| Comando fora do papel | PASSOU — rejeitado |
| RBAC no serviço | PASSOU — rejeitado |
| Papel inválido | PASSOU — rejeitado |
| Flags ausentes/vazias | PASSOU |
| Datas inválidas | PASSOU |
| Arquivo `.enc` adulterado | PASSOU — rejeitado |
| Journal > 10 MB | PASSOU — rotação observada |

Nenhuma alteração de hash, salt, criptografia ou regra de negócio foi necessária para corrigir o problema de entrada mascarada de senha.
