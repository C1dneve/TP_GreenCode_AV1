# GreenCode — Relatório de Cenários de Falha

> Este relatório cobre os cenários de falha que testamos e como o sistema reagiu em cada um. É um complemento ao `greencode-roteiro-testes.md` — aqui o foco são os caminhos de erro, não os de sucesso.

## 1. Falhas de validação de negócio

| Cenário | Entrada | Resposta do sistema |
|---|---|---|
| CNPJ com dígito verificador incorreto | `org criar --cnpj 11222333000182` (dígito errado) | Rejeitado pelo `ValidadorCNPJ`: "CNPJ inválido (dígito verificador não confere)." |
| CNPJ com todos os dígitos iguais | `11111111111111` | Rejeitado antes mesmo de calcular o dígito: "CNPJ inválido (todos os dígitos iguais)." |
| CNPJ duplicado | Cadastrar organização com CNPJ já existente | `ServicoOrganizacao` rejeita e avisa que já existe |
| Data de lote no futuro | `dataEntrada` posterior a hoje | Rejeitado pelo `ValidadorDataEntrada`: "Data de entrada não pode ser futura." |
| Data de lote muito antiga | `dataEntrada` anterior a 90 dias | Rejeitado: "Data de entrada não pode ser anterior a 90 dias." |
| Desmonte sem triagem prévia | Tentar mover equipamento direto pra `EM_DESMONTE` sem triagem | Bloqueado no `ServicoLote`/`ServicoEquipamentos` |
| Queda de estado físico sem justificativa | `atualizarEstadoFisico` com queda de 2+ categorias e `justificativa` vazia | `ServicoEquipamentos.atualizarEstadoFisico` rejeita e pede a justificativa |

## 2. Falhas de autenticação e sessão

| Cenário | Entrada | Resposta do sistema |
|---|---|---|
| Usuário inexistente | Login com usuário não cadastrado | "Usuário ou senha inválidos." — mensagem propositalmente genérica, pra não dar pista se o erro foi no usuário ou na senha (evita enumeração de contas) |
| Senha incorreta | Login com senha errada num usuário existente | Mesma mensagem genérica de cima |
| Sessão expirada | Comando enviado depois de 30 min sem atividade | A sessão cai sozinha e o sistema exige login de novo antes de aceitar qualquer coisa |
| Token inválido/já encerrado | `validarToken` num token de sessão já finalizada (logout) | Retorna `false`; qualquer comando depois disso é bloqueado |

## 3. Falhas de controle de acesso (RBAC)

| Cenário | Entrada | Resposta do sistema |
|---|---|---|
| Comando fora do papel do usuário | Usuário `AUDITOR` tentando `org criar` | Bloqueado antes de chegar em qualquer serviço de negócio: "Comando 'org criar' não permitido para o papel AUDITOR." Testei isso na mão pra garantir. |
| Comando inexistente | Comando digitado errado ou não reconhecido | Nada quebra — o sistema ignora ou sugere digitar "ajuda", dependendo do caso |

## 4. Falhas de persistência e integridade

| Cenário | Entrada | Resposta do sistema |
|---|---|---|
| Interrupção durante escrita em disco | Simulação de falha no meio de `salvarEntidade` | Escrita atômica (arquivo temporário + rename) garante que o arquivo definitivo nunca fica corrompido; na pior hipótese sobra um `.tmp` pra descartar |
| Arquivo cifrado adulterado | Byte alterado manualmente num `.enc` | `CriptografiaArquivo.decifrar()` lança erro, porque a tag de autenticação do AES-256-GCM não bate — dado adulterado não passa |
| Arquivo de dados ausente | Carregar uma entidade cujo arquivo ainda não existe | `RepositorioArquivos` trata como lista vazia em vez de dar erro; a primeira gravação cria o arquivo normalmente |
| Configuração mestre ausente | Iniciar o sistema pela primeira vez | O sistema detecta e entra em modo de provisionamento, em vez de simplesmente falhar |
| Transação com falha no meio da aplicação | `JournalTransacao.reverter()` chamado depois de uma operação malsucedida | O estado anterior (`dadosAntes`) é restaurado, desfazendo a mudança parcial |

## 5. Categorização das mensagens

Toda resposta de erro sai com o prefixo `[ERRO]` na CLI (`CLIInterface.processarComando`), separando visualmente de `[OK]` — isso cobre o requisito do enunciado sobre mensagens de sucesso/erro categorizadas por severidade.

## Uma ressalva sobre este relatório

A maior parte dos cenários acima foi de fato exercitada — seja pelos testes automatizados (`test1.ts` a `test4.ts`), seja manualmente durante o desenvolvimento. As duas exceções são os itens de adulteração de arquivo e interrupção de escrita simulada, na seção 4: a lógica está implementada e eu revisei o código, mas não cheguei a rodar os dois cenários de ponta a ponta. Vale confirmar isso manualmente antes de entregar — está detalhado no `greencode-roteiro-testes.md`.