# GreenCode — Documentação da Arquitetura de Segurança

> Este documento explica e justifica as decisões de segurança do `greencode` (AV1): algoritmo de criptografia, esquema de hash de senhas e política de expiração de sessão, conforme pedido no enunciado.

## 1. Criptografia de dados em repouso

Escolhi **AES-256 em modo GCM** (`aes-256-gcm`), implementado em `CriptografiaArquivo`.

AES-256 porque é o algoritmo simétrico que o enunciado pede, e é o padrão de mercado pra criptografia de dados em repouso, com chave de 256 bits. A parte mais interessante é o modo GCM: diferente de algo como CBC, o GCM é autenticado — além de cifrar, ele gera uma tag de autenticação (`getAuthTag()`) que garante integridade. Ou seja, se alguém adulterar um `.enc` na mão (por exemplo, tentando editar um saldo ou status direto no arquivo), o `decifrar()` percebe que a tag não bate e lança erro, em vez de aceitar um dado corrompido ou forjado sem questionar. Isso cobre confidencialidade (que é o que o enunciado pede) e de quebra também integridade, que não é exigida explicitamente mas é meio óbvio que qualquer sistema com dados sensíveis deveria ter.

Isso é aplicado em todos os arquivos de persistência: `credenciais.enc`, `organizacoes.enc`, lotes, equipamentos, movimentações e o próprio `journal.transacoes`.

Sobre a chave: a chave mestra (256 bits) é gerada uma única vez no provisionamento inicial (`ServicoAutenticacao.provisionarInicial`) e fica guardada em `config.mestre.json`. Ela nunca vai parar nos arquivos de dados — cada arquivo cifrado carrega só o IV e a tag de autenticação, que são necessários pra decifrar mas não servem de nada sem a chave mestra.

## 2. Hash de senhas

Usei **SHA-256 com salt por credencial**, em `Credencial`.

Cada `Credencial` gera um salt aleatório de 16 bytes na hora da criação, guardado junto com o hash mas separado dele. A senha nunca fica salva em texto puro, nem dá pra "recuperar" a partir do hash — a verificação (`verificarSenha`) refaz o processo (senha + salt → SHA-256) e compara os hashes, nunca as senhas em si.

O salt é importante porque SHA-256 puro, sem ele, é vulnerável a rainbow table (tabelas pré-computadas de hashes de senhas comuns). Com um salt único por usuário, dois usuários com a mesma senha nunca vão gerar o mesmo hash, e um atacante teria que quebrar credencial por credencial em vez de atacar o sistema inteiro de uma vez.

## 3. Controle de sessão

Todo login bem-sucedido cria uma `Sessao`, com token aleatório de 24 bytes e validade de 30 minutos, como pedido no enunciado.

A expiração é checada a cada comando (`ServicoAutenticacao.validarToken`, chamado dentro de `CLIInterface.processarComando`), não só no login — isso é o que faz a regra ser "expira após 30 min de inatividade" e não "30 min a partir do login". Quando expira, a sessão é invalidada automaticamente (tipo um logout interno) e o usuário precisa logar de novo.

## 4. Controle de acesso por papel (RBAC)

Os quatro papéis (`PapelUsuario`) têm as permissões mapeadas em `COMANDOS_POR_PAPEL`, dentro de `CLIInterface.ts` — usado tanto pra montar o menu quanto pra validar cada comando antes de executar.

Um comando que não está na lista do papel atual é rejeitado com mensagem de erro categorizada, mesmo que o usuário conheça a sintaxe exata. A restrição acontece no sistema, não depende do menu simplesmente esconder a opção.

## 5. Persistência atômica e recuperação de falhas

- **Escrita atômica** (`RepositorioArquivos`): toda gravação passa primeiro por um arquivo temporário (`.tmp`); só depois que a escrita termina o arquivo definitivo é substituído (`rename`). Se algo interromper no meio (queda de energia, processo morto), o arquivo definitivo nunca fica pela metade.
- **Journaling** (`JournalTransacao`): cada escrita é registrada antes de ser aplicada, com o estado anterior (`dadosAntes`) e o novo (`dadosDepois`). Isso dá pra reverter uma transação problemática (`reverter()`), voltando pro estado anterior.
- **Retenção e rotação**: o journal fica guardado por no mínimo 180 dias e roda automaticamente quando passa de 10 MB, como pedido.

## 6. Prevenção de acesso indevido a arquivos

`RepositorioArquivos.obterCaminho()` sanitiza qualquer nome de arquivo com `path.basename()` antes de montar o caminho final em disco. Isso evita que um nome malformado (com `../`, por exemplo) escape do diretório de dados configurado. Não é algo que o enunciado pede explicitamente, mas é boa prática básica de manipulação de arquivo e não custava nada implementar.