# GreenCode Épicos e User Stories (Material Complementar)

> **Atenção:** este documento é material de estudo complementar, feito por iniciativa própria para praticar quebra de requisitos em épicos/US. **Não é algo que foi pedido para AV1** — os documentos exigidos estão em `greencode-documentacao-projeto.md`


## Épico 1 — Autenticação e Controle de Acesso

- **US1.1** *(de `ServicoAutenticacao.login`)* — Como usuário do sistema, quero fazer login com usuário e senha, para acessar as funcionalidades do meu papel.
- **US1.2** *(da regra de 30 min)* — Como usuário autenticado, quero que minha sessão expire após 30 min de inatividade, para reduzir o risco de acesso indevido se eu esquecer de sair.
- **US1.3** *(de `CLIInterface.exibirMenuPorPapel`)* — Como usuário de um papel específico, quero ver só os comandos permitidos pra mim, para não tentar ações que não tenho permissão de executar.
- **US1.4** *(de `ServicoAutenticacao.alterarSenha`)* — Como usuário, quero alterar minha senha, para manter minha conta segura.
- **US1.5** *(de "administrador... gestão de contas de acesso")* — Como administrador, quero criar e gerenciar contas de outros usuários, para controlar quem acessa o sistema e com qual papel.

---

## Épico 2 — Cadastro de Organizações e Contratos

- **US2.1** *(de `cadastrarOrganizacao` + dígito verificador do CNPJ)* — Como operador de cadastro, quero cadastrar uma organização validando o CNPJ, para garantir que só entrem dados consistentes no sistema.
- **US2.2** *(de `listarOrganizacoesAtivas`)* — Como operador de cadastro, quero listar as organizações ativas, para acompanhar minha carteira de clientes.
- **US2.3** *(de `renovarContrato`)* — Como operador de cadastro, quero renovar um contrato antes do vencimento, para não interromper a coleta de um cliente.
- **US2.4** *(unicidade do CNPJ)* — Como operador de cadastro, quero ser impedido de cadastrar um CNPJ inválido ou duplicado, para não gerar organizações inconsistentes.

---

## Épico 3 — Gestão de Lotes e Equipamentos


- **US3.1** *(de `criarLote` + comando de exemplo do enunciado)* — Como gestor de almoxarifado, quero registrar a chegada de um lote com nota fiscal e transportadora, para dar entrada formal no sistema (ex.: `lote criar --org BR001 --nf 123456 --transp TransRapida`).
- **US3.2** *(de `processarTriagem`)* — Como gestor de almoxarifado, quero realizar a triagem dos equipamentos de um lote, para classificá-los por potencial de reuso/reciclagem/descarte.
- **US3.3** *(desmonte sem triagem)* — Como gestor de almoxarifado, quero ser impedido de mover um equipamento pra desmonte sem triagem prévia, para não pular uma etapa obrigatória do processo.
- **US3.4** *(justificativa obrigatória em queda de 2+ categorias)* — Como gestor de almoxarifado, quero ser obrigado a justificar por texto quando o estado físico de um equipamento cair 2 ou mais categorias, para manter rastreabilidade de decisões críticas.
- **US3.5** *(de `gerarCodigoBarras`)* — Como gestor de almoxarifado, quero que cada equipamento receba um código de barras interno único, para conseguir identificá-lo fisicamente depois.
- **US3.6** *(data do lote fora da janela de 90 dias)* — Como gestor de almoxarifado, quero ser impedido de cadastrar um lote com data de entrada futura ou anterior a mais de noventa dias, para não gerar cadastros inconsistentes.
- **US3.7** *(de `consultarLotePorPeriodo`)* — Como gestor de almoxarifado, quero consultar lotes por período, para obter dados de análise.

---

## Épico 4 — Rastreabilidade e Relatórios

- **US4.1** *(de "consulta de rastreabilidade... após múltiplas movimentações")* — Como auditor, quero consultar o histórico completo de movimentações de um equipamento, para verificar sua trajetória sem poder alterá-la.
- **US4.2** *(de `gerarRelatorioPorOrganizacao`)* — Como auditor, quero gerar um relatório por organização e período, para acompanhar o volume processado de um cliente.
- **US4.3** *(de `gerarRelatorioPorStatus`)* — Como administrador, quero um relatório com a quantidade de equipamentos em cada status de rastreamento, para entender o gargalo operacional do momento.

---

## Épico 5 — Segurança e Persistência de Dados 

- **US5.1** *(exigência de AES-256)* — Como sistema, preciso criptografar todos os arquivos de persistência, para proteger dados sensíveis mesmo se o arquivo for acessado diretamente.
- **US5.2** *(journal + `reverter()`)* — Como sistema, preciso registrar cada transação num journal antes de aplicá-la, para permitir recuperação se algo falhar no meio da escrita.
- **US5.3** *(provisionamento inicial)* — Como administrador do sistema, preciso que o sistema detecte a ausência de configuração e me guie pelo provisionamento, para não depender de configuração manual externa.
- **US5.4** *(escrita atômica — arquivo temporário + renomeação)* — Como sistema, preciso gravar cada entidade de forma atômica (arquivo temporário + renomeação), para evitar que uma interrupção no meio da escrita deixe um arquivo corrompido.
- **US5.5** *(retenção mínima do journal)* — Como sistema, preciso reter o journal de transações por no mínimo 180 dias, para manter o registro histórico das transações desse período.
- **US5.6** *(rotação automática do journal)* — Como sistema, preciso rotacionar automaticamente o arquivo de journal quando este ultrapassar 10 MB, para não sobrecarregar o armazenamento.

---

## Épico 6 — Interface de Linha de Comando 

- **US6.1** *(histórico persistente entre sessões)* — Como usuário do sistema, quero um histórico persistente entre sessões, para não precisar redigitar os mesmos comandos.
- **US6.2** *(autocompletar para comandos comuns)* — Como usuário do sistema, quero que exista autocompletar para comandos comuns, para não precisar redigitar comandos muito utilizados.

---

---

## Épico 7 — Usabilidade da CLI e manutenção da Fase 4/5

- **US7.1 — Navegação por teclado:** como usuário, quero percorrer menus e submenus com ↑/↓ e confirmar com Enter, mantendo atalhos numéricos e o modo direto, para executar operações sem decorar o catálogo inteiro.
- **US7.2 — Assistente guiado:** como usuário, quero que o sistema pergunte campos obrigatórios, valide as respostas e mostre um resumo antes da confirmação, para diminuir erros de sintaxe e permitir cancelar sem persistência.
- **US7.3 — Ajuda contextual e autocomplete:** como usuário, quero consultar a sintaxe, as flags, as permissões e exemplos de cada comando, para descobrir operações sem precisar memorizar nomes.
- **US7.4 — Resumo operacional:** como usuário autorizado, quero consultar contagens e alertas relevantes ao meu papel, para compreender a situação operacional sem executar várias listagens.
- **US7.5 — Busca e filtros combinados:** como usuário autorizado, quero filtrar organizações, contratos, lotes, equipamentos e usuários por texto ou atributos, para localizar registros e identificar resultados vazios sem alterar dados.
- **US7.6 — Auditoria consultável:** como auditor, quero pesquisar o journal atual e rotacionado por usuário, entidade e período, para rastrear operações preservando o acesso somente de leitura.
- **US7.7 — Conversão consistente de datas:** como mantenedor, quero centralizar serialização e restauração de datas em objetos aninhados, para reduzir divergências entre o formato JSON e os modelos de domínio.
- **US7.8 — Testes reproduzíveis por papel:** como mantenedor, quero preparar ambientes descartáveis e autenticar papéis por helpers compartilhados, para testar regras de autorização sem reaproveitar dados entre execuções.
- **US7.9 — Evidência final de correção da AV1:** como responsável pela entrega, quero manter documentação, decisões, roteiro de testes e métricas coerentes com a versão homologada, para justificar a implementação e delimitar com transparência o que foi validado em cada sistema operacional.

> Estas USs descrevem funcionalidades já implementadas nas fases anteriores e atividades de manutenção/documentação da Fase 5; não representam funcionalidades recém-criadas todas nesta etapa.

## Épico 8 — Cobertura dos comandos de CRUD e administração

Este adendo reúne os comandos de negócio adicionados/ampliados nas Fases 2 e 3 que não estavam individualizados de forma suficiente nas US anteriores.

### US8.1 — Administração de contas e papéis
Como administrador, quero listar e buscar usuários, atualizar nome e papel, desativar ou reativar contas e redefinir senhas, para administrar o acesso sem apagar o histórico e preservando as restrições de não desativar a própria conta nem o último administrador ativo.

**Comandos relacionados:** `usuario listar`, `usuario buscar`, `usuario atualizar`, `usuario desativar`, `usuario ativar`, `usuario redefinir-senha`.

### US8.2 — Ciclo de vida de organizações
Como usuário autorizado de cadastro, quero buscar, atualizar, desativar e reativar organizações, para corrigir dados cadastrais e controlar o uso da organização preservando seu histórico. A desativação deve ser bloqueada quando houver lotes não finalizados.

**Comandos relacionados:** `org buscar`, `org atualizar`, `org desativar`, `org ativar`, `org listar --todos`.

### US8.3 — Gestão do contrato atual e histórico
Como usuário autorizado, quero criar, listar, buscar, atualizar, renovar e cancelar contratos, para manter a vigência e os valores contratuais consistentes, preservando contratos cancelados no histórico.

**Comandos relacionados:** `contrato criar`, `contrato listar`, `contrato buscar`, `contrato atualizar`, `contrato cancelar`, `org renovar-contrato`.

### US8.4 — Ciclo administrativo de lotes
Como usuário autorizado de almoxarifado, quero listar, buscar, atualizar e desativar/reativar lotes, e remover o vínculo de um equipamento sem apagar a entidade ou seu histórico, para corrigir o cadastro e preservar a rastreabilidade. O avanço operacional continua passando por triagem, encaminhamento e finalização.

**Comandos relacionados:** `lote listar`, `lote buscar`, `lote atualizar`, `lote remover-equipamento`, `lote desativar`, `lote ativar`, `lote triagem`, `lote encaminhar`, `lote finalizar`, `lote consultar-periodo`.

### US8.5 — Consulta e manutenção de equipamentos
Como usuário autorizado de almoxarifado, quero listar, buscar, atualizar os campos permitidos, desativar/reativar, mover e gerar código de barras de equipamentos, para manter o inventário correto e rastreável. Mudanças de estado físico e de rastreamento continuam restritas aos comandos com suas validações próprias.

**Comandos relacionados:** `equip listar`, `equip buscar`, `equip atualizar`, `equip desativar`, `equip ativar`, `equip mover`, `equip codigo-barras`, `equip rastrear`, `equip atualizar-estado`.

### US8.6 — Parâmetros de cálculo
Como administrador, quero listar e definir parâmetros globais de alíquota e depreciação, para que os relatórios usem configurações explícitas e persistidas, em vez de dependerem exclusivamente de números fixos no código.

**Comandos relacionados:** `parametro listar`, `parametro definir`.

### US8.7 — Consulta do journal
Como auditor, quero filtrar os registros de auditoria por usuário, entidade e período e consultar o journal atual e rotacionado, para investigar operações sem permissão para alterar dados de negócio.

**Comando relacionado:** `auditoria listar`.

### US8.8 — Relatórios por organização, status e finanças
Como usuário autorizado de relatórios, quero consultar volumes por organização e status, além de valores de aquisição, valor residual estimado e estimativas de receita de contratos, para apoiar análise operacional. Valores financeiros são estimativas de sistema e não substituem cálculo contábil/fiscal profissional.

**Comandos relacionados:** `relatorio organizacao`, `relatorio status`, `relatorio financeiro`.

### US8.9 — Busca por critérios combinados
Como usuário autorizado, quero combinar pesquisa textual com filtros de status, organização, tipo, lote ou período, para localizar registros específicos, mantendo a mesma autorização das consultas-base e recebendo mensagem clara quando não houver resultados.

**Comandos relacionados:** filtros de `usuario listar`, `org listar`, `contrato listar`, `lote listar` e `equip listar`.

> Estas histórias são um agrupamento documental de comandos existentes. Não implicam que cada comando foi implementado novamente na Fase 5.
