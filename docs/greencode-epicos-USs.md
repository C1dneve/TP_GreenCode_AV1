# GreenCode Épicos e User Stories (Material Complementar)

> **Atenção:** este documento é material de estudo complementar, feito por iniciativa própria para praticar quebra de requisitos em épicos/US. **Não é uma entrega oficial pedida no enunciado da AV1** — os documentos exigidos estão listados em `greencode-documentacao-projeto.md`


## Épico 1 — Autenticação e Controle de Acesso

- **US1.1** *(de `ServicoAutenticacao.login`)* — Como usuário do sistema, quero fazer login com usuário e senha, para acessar as funcionalidades do meu papel.
- **US1.2** *(da regra de 30 min)* — Como usuário autenticado, quero que minha sessão expire após 30 min de inatividade, para reduzir o risco de acesso indevido se eu esquecer de sair.
- **US1.3** *(de `CLInterface.exibirMenuPorPapel`)* — Como usuário de um papel específico, quero ver só os comandos permitidos pra mim, para não tentar ações que não tenho permissão de executar.
- **US1.4** *(de `ServicoAutenticacao.alterarSenha`)* — Como usuário, quero alterar minha senha, para manter minha conta segura.
- **US1.5** *(de "administrador... gestão de contas de acesso")* — Como administrador, quero criar e gerenciar contas de outros usuários, para controlar quem acessa o sistema e com qual papel.

---

## Épico 2 — Cadastro de Organizações e Contratos

- **US2.1** *(de `cadastrarOrganizacao` + dígito verificador do CNPJ)* — Como operador de cadastro, quero cadastrar uma organização validando o CNPJ, para garantir que só entrem dados consistentes no sistema.
- **US2.2** *(de `listarOrganizacoesAtivas`)* — Como operador de cadastro, quero listar as organizações ativas, para acompanhar minha carteira de clientes.
- **US2.3** *(de `renovarContrato`)* — Como operador de cadastro, quero renovar um contrato antes do vencimento, para não interromper a coleta de um cliente.
- **US2.4** *(caminho negativo — unicidade do CNPJ)* — Como operador de cadastro, quero ser impedido de cadastrar um CNPJ inválido ou duplicado, para não gerar organizações inconsistentes.

---

## Épico 3 — Gestão de Lotes e Equipamentos


- **US3.1** *(de `criarLote` + comando de exemplo do enunciado)* — Como gestor de almoxarifado, quero registrar a chegada de um lote com nota fiscal e transportadora, para dar entrada formal no sistema (ex.: `lote criar --org BR001 --nf 123456 --transp TransRapida`).
- **US3.2** *(de `processarTriagem`)* — Como gestor de almoxarifado, quero realizar a triagem dos equipamentos de um lote, para classificá-los por potencial de reuso/reciclagem/descarte.
- **US3.3** *(caminho negativo — desmonte sem triagem)* — Como gestor de almoxarifado, quero ser impedido de mover um equipamento pra desmonte sem triagem prévia, para não pular uma etapa obrigatória do processo.
- **US3.4** *(justificativa obrigatória em queda de 2+ categorias)* — Como gestor de almoxarifado, quero ser obrigado a justificar por texto quando o estado físico de um equipamento cair 2 ou mais categorias, para manter rastreabilidade de decisões críticas.
- **US3.5** *(de `gerarCodigoBarras`)* — Como gestor de almoxarifado, quero que cada equipamento receba um código de barras interno único, para conseguir identificá-lo fisicamente depois.
- **US3.6** *(caminho negativo — data do lote fora da janela de 90 dias)* — Como gestor de almoxarifado, quero ser impedido de cadastrar um lote com data de entrada futura ou anterior a mais de noventa dias, para não gerar cadastros inconsistentes.
- **US3.7** *(de `consultarLotePorPeriodo`)* — Como gestor de almoxarifado, quero consultar lotes por período, para obter dados de análise.

---

## Épico 4 — Rastreabilidade e Relatórios

- **US4.1** *(de "consulta de rastreabilidade... após múltiplas movimentações")* — Como auditor, quero consultar o histórico completo de movimentações de um equipamento, para verificar sua trajetória sem poder alterá-la.
- **US4.2** *(de `gerarRelatorioPorOrganizacao`)* — Como auditor, quero gerar um relatório por organização e período, para acompanhar o volume processado de um cliente.
- **US4.3** *(de `gerarRelatorioPorStatus`)* — Como administrador, quero um relatório com a quantidade de equipamentos em cada status de rastreamento, para entender o gargalo operacional do momento.

---

## Épico 5 — Segurança e Persistência de Dados (épico técnico)

- **US5.1** *(exigência de AES-256)* — Como sistema, preciso criptografar todos os arquivos de persistência, para proteger dados sensíveis mesmo se o arquivo for acessado diretamente.
- **US5.2** *(journal + `reverter()`)* — Como sistema, preciso registrar cada transação num journal antes de aplicá-la, para permitir recuperação se algo falhar no meio da escrita.
- **US5.3** *(provisionamento inicial)* — Como administrador do sistema, preciso que o sistema detecte a ausência de configuração e me guie pelo provisionamento, para não depender de configuração manual externa.
- **US5.4** *(escrita atômica — arquivo temporário + renomeação)* — Como sistema, preciso gravar cada entidade de forma atômica (arquivo temporário + renomeação), para evitar que uma interrupção no meio da escrita deixe um arquivo corrompido.
- **US5.5** *(retenção mínima do journal)* — Como sistema, preciso reter o journal de transações por no mínimo 180 dias, para manter o registro histórico das transações desse período.
- **US5.6** *(rotação automática do journal)* — Como sistema, preciso rotacionar automaticamente o arquivo de journal quando este ultrapassar 10 MB, para não sobrecarregar o armazenamento.

---

## Épico 6 — Interface de Linha de Comando (autocompletar e histórico)

- **US6.1** *(histórico persistente entre sessões)* — Como usuário do sistema, quero um histórico persistente entre sessões, para não precisar redigitar os mesmos comandos.
- **US6.2** *(autocompletar para comandos comuns)* — Como usuário do sistema, quero que exista autocompletar para comandos comuns, para não precisar redigitar comandos muito utilizados.

> Nota: usa "usuário do sistema" porque autocompletar e histórico persistente têm o mesmo comportamento e o mesmo valor para os 4 papéis do RBAC — não há variação de necessidade entre papéis que justifique separar por papel (diferente, por exemplo, do Épico 1, onde cada papel vê um menu diferente).

---

## Resumo do raciocínio

Cada épico veio de um agrupamento real (uma classe de serviço do diagrama, ou do enunciado com múltiplas ações). Cada User Story veio de um método específico ou de uma regra de negócio explícita. Casos de erro ou rejeição também foram tratados como US próprias, e o épico de segurança/persistência foi tratado como épico técnico, com o sistema como sujeito das histórias.