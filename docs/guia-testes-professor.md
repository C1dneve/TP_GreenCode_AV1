# GreenCode — Guia Direto de Testes para o Professor

> Guia curto para reproduzir os principais testes do projeto em uma máquina Windows. Execute os comandos na ordem e substitua somente os valores indicados quando necessário.

## 1. Preparação

Na raiz:

```powershell
npm ci
npm run build
npx tsc --noEmit
npm test
npm start
```

Na primeira execução, informe uma senha temporária para `admin`.

## 2. Criar dados de teste como ADMINISTRADOR

### Organização

```text
org criar --id org-manual-final --razao GreenCode Teste Manual --cnpj 11222333000181 --ie 123 --endereco Rua Teste 100 --telefone 12999999999 --email greencode.manual@example.com --contrato-id ctr-manual-final --contrato-vencimento 2030-12-31 --contrato-valor 1000 --contrato-clausulas coleta,triagem --contrato-renovacao-automatica false
```

Esperado:

```text
[OK] Organização criada: org-manual-final — GreenCode
```

### Listar

```text
org listar
```

### Lote

```text
lote criar --id lote-manual-final --org org-manual-final --nf NF-MANUAL-FINAL --transp TransRapida
```

### Consulta de lote

```text
lote consultar-periodo --inicio 2026-09-01 --fim 2026-09-30
```

### Equipamento

```text
equip cadastrar --id equip-manual-final --tipo NOTEBOOK --marca Dell --modelo Latitude --ano 2024 --estado NOVO --peso 1.8 --lote lote-manual-final --seq 1
```

### Código de barras

```text
equip codigo-barras --tipo NOTEBOOK --seq 1
```

Use nos próximos testes:

```text
Organização: org-manual-final
Lote: lote-manual-final
Equipamento: equip-manual-final
Código: GC-NOTE-000001
```

## 3. Testar ADMINISTRADOR

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

Esperado: todos funcionam.

### Criar usuários de teste

```text
usuario criar --usuario teste_operador --papel OPERADOR_CADASTRO
usuario criar --usuario teste_gestor --papel GESTOR_ALMOXARIFADO
usuario criar --usuario teste_auditor --papel AUDITOR
```

Durante a senha, os caracteres devem aparecer como `*`.

## 4. Testar OPERADOR_CADASTRO

Saia e entre novamente:

```text
logout
```

```powershell
npm start
```

Login:

```text
teste_operador
```

### Permitidos

```text
ajuda
org listar
org criar --id org-operador-final --razao GreenCode Operador Teste --cnpj 52998296000185 --ie 456 --endereco Rua Operador 200 --telefone 12988887777 --email operador2@example.com
org renovar-contrato --id org-manual-final --data 2032-12-31
```

### Proibidos

Execute um por vez:

```text
lote criar --org org-manual-final --nf NF-OP --transp TransRapida
equip mover --id equip-manual-final --destino Estoque-B
equip rastrear --id equip-manual-final
relatorio status --status AGUARDANDO_DESMONTE
usuario criar --usuario operador_nao_permitido --papel AUDITOR
```

Esperado: os permitidos funcionam; os proibidos retornam `[ERRO] ... não permitido para o papel OPERADOR_CADASTRO`.

## 5. Testar GESTOR_ALMOXARIFADO

```text
logout
```

```powershell
npm start
```

Login:

```text
teste_gestor
```

### Permitidos

```text
ajuda
lote consultar-periodo --inicio 2026-09-01 --fim 2026-09-30
lote criar --id lote-gestor-final --org org-manual-final --nf NF-GESTOR-FINAL --transp TransRapida
equip cadastrar --id equip-gestor-final --tipo MONITOR --marca Dell --modelo P2419 --ano 2023 --estado BOM_ESTADO --peso 3.5 --lote lote-gestor-final --seq 2
equip codigo-barras --tipo MONITOR --seq 2
equip mover --id equip-gestor-final --destino Estoque-Gestor --obs Teste
equip atualizar-estado --id equip-gestor-final --estado USADO_LEVE
lote triagem --id lote-gestor-final
```

### Proibidos

```text
equip rastrear --id equip-gestor-final
org criar --id org-nao-permitida --razao ForaDoEscopo --cnpj 11222333000181 --ie 1 --endereco Rua --telefone 1 --email fora@example.com
usuario criar --usuario gestor_admin_nao_permitido --papel ADMINISTRADOR
relatorio financeiro --inicio 2026-09-01 --fim 2026-09-30
```

Esperado: os quatro comandos proibidos são rejeitados.

## 6. Testar AUDITOR

```text
logout
```

```powershell
npm start
```

Login:

```text
teste_auditor
```

### Permitidos

```text
ajuda
equip rastrear --id equip-manual-final
relatorio organizacao --org org-manual-final --inicio 2026-09-01 --fim 2026-09-30
relatorio status --status AGUARDANDO_DESMONTE
relatorio financeiro --inicio 2026-09-01 --fim 2026-09-30
```

### Proibidos

Execute um por vez:

```text
usuario criar --usuario auditor_nao_permitido --papel OPERADOR_CADASTRO
org criar --id org-auditor-nao-permitida --razao Auditor ForaDoEscopo --cnpj 11222333000181 --ie 1 --endereco Rua --telefone 1 --email auditor@example.com
lote criar --id lote-auditor-nao-permitido --org org-manual-final --nf NF-AUD --transp TransRapida
equip cadastrar --id equip-auditor-nao-permitido --tipo NOTEBOOK --estado NOVO --lote lote-manual-final
equip atualizar-estado --id equip-manual-final --estado USADO_LEVE
equip mover --id equip-manual-final --destino Auditor-ForaDoEscopo
```

Esperado: todos são rejeitados por RBAC.

## 7. Bypass

Digite manualmente um comando que não aparece no `ajuda`.

Exemplos:

### Operador

```text
lote consultar-periodo --inicio 2026-09-01 --fim 2026-09-30
```

### Gestor

```text
equip rastrear --id equip-gestor-final
```

### Auditor

```text
org criar --id org-auditor-bypass --razao Auditor Bypass --cnpj 98765432000198 --ie 1 --endereco Rua --telefone 1 --email bypass@example.com
```

Esperado: todos devem ser recusados.

## 8. Autenticação e senha

Teste com um usuário de teste:

```text
logout
```

Entre novamente com senha errada.

Esperado:

```text
Falha no login: Usuário ou senha inválidos.
```

Teste usuário inexistente.

Esperado: mesma mensagem.

### Alteração de senha

```text
senha alterar
```

Informe a senha atual e uma nova senha.

Depois:

```text
logout
```

Entre novamente com a senha nova.

Esperado: login aceito.

## 9. Flags inválidas

Como administrador:

```text
lote criar --nf NF-ERRO --transp TransRapida
```

```text
lote criar --org --nf NF-ERRO --transp TransRapida
```

```text
relatorio status --status INVALIDO
```

```text
usuario criar --usuario usuario_invalido --papel PAPEL_INEXISTENTE
```

Esperado: cada comando é rejeitado com mensagem clara.

## 10. Datas

```text
relatorio financeiro --inicio 2026-09-27 --fim 2026-09-27
```

Esperado: funciona.

```text
relatorio financeiro --inicio 27/09/2026
```

Esperado: rejeita.

```text
relatorio financeiro --inicio data-invalida
```

Esperado: rejeita.

```text
relatorio financeiro --inicio 2026-99-99
```

Esperado: rejeita.

## 11. Integridade e journal

Esses cenários já estão automatizados em `test3`.

Execute:

```powershell
npm run test:test3
```

Verifique:

```text
Adulteração de .enc rejeitada ok👍
Rotação do journal ok👍
```

Durante a rotação pode aparecer:

```text
[INFO] Journal atingiu o limite. Rotacionando arquivo...
```

## 12. Encerramento

```text
logout
```

Depois, na raiz do projeto:

```powershell
npm ci
npm run build
npx tsc --noEmit
npm test
```

## Resultado esperado da demonstração

```text
npm ci               PASSOU
npm run build        PASSOU
npx tsc --noEmit     PASSOU
npm test             PASSOU
ADMINISTRADOR        PASSOU
OPERADOR_CADASTRO    PASSOU
GESTOR_ALMOXARIFADO  PASSOU
AUDITOR              PASSOU
BYPASS RBAC          PASSOU — bloqueado
SENHA MASCARADA      PASSOU
FLAGS                 PASSOU
DATAS                 PASSOU
ENC ADULTERADO         PASSOU — rejeitado
JOURNAL > 10 MB       PASSOU — rotacionado
```
