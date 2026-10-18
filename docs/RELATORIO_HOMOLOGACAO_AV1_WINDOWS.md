# GreenCode — Registro de homologação final da AV1 (Windows)

**Data de atualização:** 18/10/2026
**Plataforma validada:** Windows / PowerShell
**Estado:** homologada para o escopo testado no Windows

## Pipeline automatizada

O usuário confirmou a execução com sucesso dos comandos abaixo na cópia integrada da Fase 5:

```powershell
npm ci
npm run build
npx tsc --noEmit
npm test
```

O script `npm test` executou `test1` a `test14`, todos aprovados.

## Smoke test manual

| Fluxo | Resultado |
|---|---|
| Login do administrador | Aprovado |
| Exibição e navegação do menu principal | Aprovado |
| Navegação por setas e submenu | Aprovado |
| Listagem de organizações no ambiente vazio | Aprovado; nenhuma organização ativa é resultado esperado nesse estado |
| Resumo operacional | Aprovado; contadores zerados são esperados no ambiente vazio |
| Modo de comandos diretos | Aprovado |
| Comando `resumo` no modo direto | Aprovado |
| Opção 11 — encerrar sessão | Aprovado |

## Observação visual do seletor

Durante o movimento das setas, o terminal repete o cabeçalho do menu e pode exibir linhas como `... 8 opções acima`. O usuário confirmou que isso não impede a navegação, que o seletor continua funcional e que a opção 11 encerra a sessão corretamente. Assim, não foi tratado como bloqueador funcional neste fechamento. Não é uma afirmação de que a renderização esteja visualmente ideal.

## Limites e status final

- **AV1:** correções encerradas para o escopo validado em Windows.
- **Linux:** não homologado nesta revisão; não inferir aprovação Linux a partir dos resultados Windows.
- **AV2:** não faz parte desta homologação nem foi implementada pelo simples fechamento da AV1.

Este documento registra as evidências confirmadas pelo usuário, não afirma que a mesma pipeline foi executada em outro sistema operacional.
