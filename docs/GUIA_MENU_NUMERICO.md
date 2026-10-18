# Guia de uso — menu numérico do GreenCode
> **Confirmações de operações críticas:** no uso interativo, ações que alteram dados pedem confirmação (`s/N`) e Enter equivale a cancelar. Chamadas programáticas/testes que invocam `processarComando` sem `readline` não abrem um prompt.


## Navegação básica

Depois do login, o GreenCode mostra um menu principal numerado. As categorias são montadas conforme o papel do usuário: categorias sem operações autorizadas não são exibidas.

1. Use `↑` e `↓` para percorrer as opções. O prompt mostra a opção atualmente selecionada; pressione Enter para escolhê-la.
2. Os atalhos numéricos continuam disponíveis: digite o número da categoria e, no submenu, o número da operação desejada. Cada operação é acompanhada por sua descrição.
3. O assistente guiado apresenta os campos necessários. Campos obrigatórios precisam ser preenchidos; pressione Enter para ignorar campos opcionais.
4. Quando uma lista de opções numeradas é apresentada, digite o número correspondente. Também é aceito o valor exato mostrado na lista. Para perguntas sim/não, use `1` para sim ou `2` para não.
5. Digite `!cancelar` em um campo do assistente para voltar sem executar a operação.
6. Em terminais sem suporte a TTY, a navegação por setas não é ativada; os números e comandos digitados continuam disponíveis.

## Voltar, ajuda e modo direto

- `0` dentro de um submenu: volta ao menu principal.
- `0` no menu principal: ativa o modo de comandos diretos. Nesse modo, continue escrevendo o comando completo como `org listar`.
- `menu`: volta ao menu numérico de qualquer modo.
- A opção **Ajuda e lista de comandos** exibe também os comandos e suas descrições.
- **Encerrar sessão** fecha a sessão atual; o comando `logout` permanece disponível no modo direto.

## Segurança e limites

O menu é uma camada de usabilidade, não um mecanismo de segurança. Mesmo se um usuário tentar executar por texto um comando que não aparece no menu, a autorização é verificada antes da execução. A validação de dados específica continua sendo responsabilidade dos serviços de domínio. Senhas são solicitadas por prompt e não devem ser incluídas em flags nem compartilhadas em relatórios de auditoria.

## Exemplo guiado — criação de usuário

1. No menu de Administrador, selecione **Usuários**.
2. Selecione **usuario criar**.
3. Informe o nome de usuário e nome completo.
4. Para papel, escolha o número exibido ao lado de `OPERADOR_CADASTRO`, `GESTOR_ALMOXARIFADO`, `AUDITOR` ou `ADMINISTRADOR`.
5. Digite a senha no prompt mascarado.
6. Confirme a mensagem `[OK] Usuário criado...` e use o menu principal para continuar.


## Recursos entregues na Fase 4

- **Resumo operacional:** escolha a opção `Resumo operacional` no menu principal ou digite `resumo`. O painel respeita as permissões dos serviços e informa quando um indicador não está disponível ao perfil atual.
- **Ajuda contextual:** digite `ajuda <comando>` para consultar descrição, perfil, campos conhecidos e exemplo. `ajuda` sem argumento mantém a listagem geral.
- **Confirmação:** ações que alteram dados pedem confirmação (`s/N`); somente `s`/`sim` confirma. Qualquer outra resposta cancela.
- **Assistente:** ao concluir os campos, o CLI mostra um resumo antes de executar. `!cancelar` continua cancelando o preenchimento.
- **Navegação por teclado (Fase 4.1):** implementada com seleção circular, indicador no prompt e Enter, preservando atalhos numéricos e o modo direto. A captura é limitada ao menu interativo em TTY; prompts guiados, senha e linha de comando digitada não são tratados como navegação de menu. Consulte `docs/RELATORIO_FASE4_1_NAVEGACAO.md` para evidências e limites de homologação.
- **Pesquisa e filtros (Fase 4.7.2):** `usuario listar` aceita `--busca` e `--papel`; `org listar` aceita `--busca`; `contrato listar --org <id>` aceita `--status ativo|cancelado`, `--de` e `--ate` para vencimento; `lote listar` aceita `--busca`, `--org` e `--status`; `equip listar` aceita `--busca` além de `--lote`, `--status` e `--tipo`. Os filtros podem ser combinados e continuam sujeitos às permissões do serviço. Texto com espaços deve ser passado entre aspas duplas, por exemplo `org listar --busca "GreenCode Teste"`. Use `ajuda <comando>` para exemplos.
- **Pendências abertas:** parte das mensagens ainda não usa o helper de cores (Fase 4.2); detalhes sob demanda e possível paginação continuam fora do escopo da Fase 4.7.2. A bateria npm da versão que contém `test9` ainda deve ser repetida no Windows; consulte `docs/RELATORIO_AUDITORIA_FASE4.md`.
