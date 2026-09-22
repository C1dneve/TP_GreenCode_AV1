# GreenCode — Sistema CLI de Logística Reversa de Resíduos Eletrônicos

Projeto acadêmico (Avaliação Individual 1) desenvolvido para a disciplina do prof. Eng. Dr. Gerson Penha, na Fatec — DSM.

## Sobre o projeto

O `greencode` é o núcleo operacional de uma plataforma de logística reversa de resíduos eletrônicos: conecta organizações que descartam equipamentos (bancos, hospitais, redes de varejo) a um fluxo de recebimento, triagem e rastreabilidade completa até o destino final de cada item. Implementado como uma aplicação de linha de comando (CLI), sem interface gráfica 

## Stack

- **Node.js** + **TypeScript**
- Persistência em arquivos de texto, com:
  - Criptografia simétrica **AES-256** em todos os arquivos
  - **Journaling** de transações (log imutável, com possibilidade de rollback)
  - Escrita atômica (arquivo temporário + renomeação)
- Autenticação com hash **SHA-256 + salt** e expiração de sessão (30 min)
- CLI via `readline`, com autocompletar e histórico persistente entre sessões

## Papéis do sistema (RBAC)

| Papel | Responsabilidade |
|---|---|
| Administrador | Gerencia contas de acesso e parâmetros globais |
| Operador de Cadastro | Cadastra organizações clientes e contratos |
| Gestor de Almoxarifado | Registra lotes, triagem e códigos de barras |
| Auditor | Consulta histórico e gera relatórios (somente leitura) |

## Documentação

Toda a documentação do projeto está na pasta [`docs/`](./docs):

- [Visão Geral do Projeto](docs/greencode-documentacao-projeto.md) — contexto, requisitos técnicos, modelo de classes e ordem de implementação
- [Épicos e User Stories](docs/greencode-epicos-USs.md) — material complementar 
- [Diagrama de Classes](docs/diagrama_classes.png) (UML) — fornecido pelo professor


## Como rodar

_Instruções de instalação e execução serão adicionadas depois._

## Compatibilidade

Windows 10+ e Linux Ubuntu 24.04+ (e derivados).
