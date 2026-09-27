# GreenCode — Roteiro de Testes

> Roteiro pedido no enunciado, simulando a jornada completa do usuário — do provisionamento inicial até a consulta de rastreabilidade depois de várias movimentações. Organizado pelos épicos do `greencode-epicos-USs.md`, com cada passo apontando pro teste automatizado (`src/tests/testN.ts`) ou pro passo manual correspondente.

## Rodando a suíte automatizada

```bash
npm run test:test4    # e os scripts equivalentes pra test1, test2, test3
npx tsc --noEmit       # confirma que o projeto todo compila sem erro de tipo
```

Os quatro arquivos cobrem, juntos, do Dia 2 ao Dia 5:

| Arquivo | Camada testada |
|---|---|
| `test1.ts` | Enums e validadores (`ValidadorCNPJ`, `ValidadorDataEntrada`) |
| `test2.ts` | Entidades de domínio (`Credencial`, `Sessao`, `Movimentacao` e o resto das classes do Dia 3) |
| `test3.ts` | Integração da camada de persistência e serviços — criptografia, repositório atômico, journal, autenticação, organizações, lotes, equipamentos e relatórios |
| `test4.ts` | Camada de CLI — parsing de comandos (`interpretarComando`) e permissões por papel (`COMANDOS_POR_PAPEL`) |

## Jornada completa (Épico 1 → Épico 6)

### 1. Provisionamento inicial
| Passo | Ação | Resultado esperado | Verificado em |
|---|---|---|---|
| 1.1 | Rodar `npx tsx src/index.ts` sem `data/config.mestre.json` | Sistema percebe que não tem config e pede senha de admin | Testei na mão, nesta máquina |
| 1.2 | Informar a senha do administrador | Chave AES-256 gerada, credencial `admin` criada com papel `ADMINISTRADOR` | `test3.ts` + manual |

### 2. Autenticação e sessão (Épico 1)
| Passo | Ação | Resultado esperado | Verificado em |
|---|---|---|---|
| 2.1 | Login com usuário/senha corretos | Sessão criada, token gerado, menu do papel aparece | `test3.ts` + manual |
| 2.2 | Login com senha errada | Rejeitado com "Usuário ou senha inválidos" (mensagem genérica, não entrega qual campo errou) | Testei na mão |
| 2.3 | Comando digitado depois de 30 min parado | Sessão cai sozinha, sistema pede login de novo | `test3.ts` (checagem de expiração) |
| 2.4 | Admin cria novo usuário (`usuario criar`) | Nova credencial salva com o papel informado | Testei na mão |

### 3. Cadastro de organizações (Épico 2)
| Passo | Ação | Resultado esperado | Verificado em |
|---|---|---|---|
| 3.1 | Cadastrar organização com CNPJ válido | Organização criada e salva | `test3.ts` + manual |
| 3.2 | CNPJ com dígito verificador errado | Rejeitado, mensagem do `ValidadorCNPJ` | `test1.ts` (validador isolado) |
| 3.3 | CNPJ já existente | Rejeitado por duplicidade | `test3.ts` |
| 3.4 | Listar organizações ativas | Só retorna as com `ativo: true` | `test3.ts` |

### 4. Gestão de lotes e equipamentos (Épico 3)
| Passo | Ação | Resultado esperado | Verificado em |
|---|---|---|---|
| 4.1 | Criar lote com data de entrada válida | Lote criado | `test3.ts` |
| 4.2 | Data futura ou anterior a 90 dias | Rejeitado pelo `ValidadorDataEntrada` | `test1.ts` (validador isolado) |
| 4.3 | Processar triagem de um lote | Status vai pra `TRIAGEM_CONCLUIDA` | `test3.ts` |
| 4.4 | Mover pra desmonte sem triagem prévia | Bloqueado | `test3.ts` |
| 4.5 | Queda de 2+ categorias no estado físico, sem justificativa | Rejeitado, pede justificativa | `test3.ts` (`ServicoEquipamentos.atualizarEstadoFisico`) |
| 4.6 | Gerar código de barras interno | Código único no formato `PRE-000001` | `test3.ts` |

### 5. Rastreabilidade e relatórios (Épico 4)
| Passo | Ação | Resultado esperado | Verificado em |
|---|---|---|---|
| 5.1 | Registrar várias movimentações de um equipamento | Histórico acumula, nunca sobrescreve | `test3.ts` |
| 5.2 | Consultar rastreabilidade do equipamento | Retorna tudo em ordem | `test3.ts` + manual (`equip rastrear`) |
| 5.3 | Relatório por organização e período | Dados agregados do período pedido | `test3.ts` |
| 5.4 | Relatório por status | Contagem de equipamentos naquele status | Testei na mão (`relatorio status`) |

### 6. Persistência e journaling (Épico 5 — técnico)
| Passo | Ação | Resultado esperado | Verificado em |
|---|---|---|---|
| 6.1 | Interromper uma escrita simuladamente | Arquivo definitivo continua íntegro (sobra só o `.tmp`) | `test3.ts` (escrita atômica) |
| 6.2 | Alterar um byte manualmente num `.enc` | `decifrar()` lança erro (tag GCM não bate) | Ainda não testei ao vivo — ver ressalva abaixo |
| 6.3 | Journal passa de 10 MB | Rotação automática do arquivo | Lógica implementada; não validei com carga real por falta de tempo |

### 7. Interface de linha de comando (Épico 6)
| Passo | Ação | Resultado esperado | Verificado em |
|---|---|---|---|
| 7.1 | Comando de um papel tentado por outro | Rejeitado, mensagem categorizada | Testei na mão (`joao`/AUDITOR tentando `org criar`) |
| 7.2 | Tab em comando parcial | Sugere os comandos do papel atual que batem com o prefixo | Testei na mão |
| 7.3 | Histórico entre execuções | Comando de execução anterior aparece na seta pra cima | Testei na mão |

## O que ainda falta confirmar antes de entregar

Os passos 6.2 e 6.3 têm a lógica pronta e revisada, mas eu não cheguei a rodar os dois na prática — adulterar um arquivo e forçar 10 MB de journal dão mais trabalho pra simular rápido. Se sobrar um tempinho antes da entrega, vale a pena rodar os dois pelo menos uma vez, só pra poder dizer com certeza que foram testados e não só implementados.