# GreenCode — Documentação do Projeto (AV1)

> Documento da visão geral criado para organizar o desenvolvimento, seguindo o que foi pedido na AV1 e no diagrama de classes UML.

## 1. Contexto do problema 

Uma startup que atua como **intermediária de logística reversa de resíduos eletrônicos**: conecta empresas que descartam equipamentos (bancos, hospitais, redes de varejo) a operadores logísticos, especialistas em desmontagem e compradores de matéria-prima reciclada. O valor do negócio vem de **rastrear cada equipamento** do recebimento até o destino final, gerando dados de rastreabilidade, relatórios e conformidade ambiental.

A primeira entrega é um **sistema CLI**, construído em **Node.js + TypeScript**, com persistência em arquivos de texto.

## 2. Papéis do sistema (RBAC)

| Papel | Pode fazer |
|---|---|
| **Administrador** | Gerencia contas de acesso e parâmetros globais (impostos, depreciação) |
| **Operador de Cadastro** | Cadastra organizações clientes e contratos de coleta |
| **Gestor de Almoxarifado** | Registra chegada de lotes, triagem, códigos de barras internos |
| **Auditor** | Só consulta histórico e gera relatórios — nenhuma escrita |

## 3. Requisitos técnicos

**Segurança**
- Senhas com hash SHA-256 + salt por usuário (armazenados em arquivo separado — ver classe `Credencial`)
- Arquivos de persistência com criptografia simétrica AES-256
- Sessão expira após 30 min de inatividade

**Persistência**
- Escrita atômica: arquivo temporário + rename (evita corrupção em queda de energia)
- Journal de transações imutável (retém no mínimo 180 dias, rotaciona ao passar de 10 MB)
- Provisionamento inicial: se não existir config mestre, pedir senha do admin e gerar a chave de criptografia

**Validações de negócio**
- CNPJ único, com dígitos verificadores calculados
- Data de entrada do lote: não pode ser futura nem anterior a mais de 90 dias
- Equipamento só pode ir para "desmonte" depois de triagem completa
- Justificativa textual obrigatória se o estado físico cair 2+ categorias

**CLI**
- `readline` com autocompletar e histórico persistente entre sessões
- Menu dinâmico por papel do usuário logado
- Comandos no padrão `entidade ação --flag valor` (ex.: `lote criar --org BR001 --nf 123456 --transp TransRapida`)

**Compatibilidade**
- Windows 10+ e Ubuntu 24.04+ (e derivados)

## 4. Modelo de classes

| Camada | Classes |
|---|---|
| Interface | `CLIInterface` |
| Serviços | `ServicoAutenticacao`, `ServicoOrganizacao`, `ServicoLote`, `ServicoEquipamento`, `ServicoRelatorio` |
| Persistência | `RepositorioArquivo`, `CriptografiaArquivo`, `JournalTransacao` |
| Entidades | `Organizacao`, `Contrato`, `Lote`, `Equipamento`, `Credencial`, `Sessao`, `Movimentacao` |
| Validação | `Validador` (abstrata), `ValidadorCNPJ`, `ValidadorDataEntrada` |
| Enums | `PapelUsuario`, `StatusLote`, `TipoEquipamento`, `EstadoFisico`, `StatusRastreamento` |

## 5. Documentos exigidos

- Código-fonte funcional (`greencode`)
- Diagrama de Classes UML (recebido do professor)
- Documentação da Arquitetura de Segurança
- Roteiro de Testes (jornada completa do usuário)
- Relatório de Cenários de Falha
- Manual de Comandos (README)

