import { PapelUsuario } from "../models/enums/PapelUsuario";

/** Fonte declarativa para menu, autocomplete, autorização e flags obrigatórias. */
export interface DefinicaoComando {
  comando: string;
  descricao: string;
  papeis: readonly PapelUsuario[];
  flagsObrigatorias?: readonly string[];
}

const ADMIN = [PapelUsuario.ADMINISTRADOR] as const;
const OPERADOR = [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO] as const;
const GESTOR = [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO] as const;
const LEITURA_ORG = [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.AUDITOR] as const;
const LEITURA_LOTE_EQUIP = [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR] as const;
const RELATORIO = [PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR] as const;

export const COMANDOS_REGISTRADOS: readonly DefinicaoComando[] = [
  { comando: "usuario criar", descricao: "Cria usuário; exige --usuario e --papel, aceita --nome; a senha é solicitada no prompt.", papeis: ADMIN, flagsObrigatorias: ["usuario", "papel"] },
  { comando: "usuario listar", descricao: "Lista usuários; filtros --busca (nome/usuário) e --papel; --todos inclui desativados.", papeis: ADMIN },
  { comando: "usuario buscar", descricao: "Consulta usuário por --usuario.", papeis: ADMIN, flagsObrigatorias: ["usuario"] },
  { comando: "usuario atualizar", descricao: "Atualiza --nome e --papel de --usuario.", papeis: ADMIN, flagsObrigatorias: ["usuario", "nome", "papel"] },
  { comando: "usuario desativar", descricao: "Desativa usuário sem apagar seu histórico; exige --usuario.", papeis: ADMIN, flagsObrigatorias: ["usuario"] },
  { comando: "usuario ativar", descricao: "Reativa usuário; exige --usuario.", papeis: ADMIN, flagsObrigatorias: ["usuario"] },
  { comando: "usuario redefinir-senha", descricao: "Redefine a senha por prompt; exige --usuario.", papeis: ADMIN, flagsObrigatorias: ["usuario"] },
  { comando: "senha alterar", descricao: "Altera a senha do usuário atual pelo prompt.", papeis: [] },

  { comando: "org criar", descricao: "Cadastra organização.", papeis: OPERADOR },
  { comando: "org listar", descricao: "Lista organizações; --busca pesquisa ID, razão social, CNPJ e contatos; --todos inclui inativas.", papeis: LEITURA_ORG },
  { comando: "org buscar", descricao: "Consulta organização por --id.", papeis: LEITURA_ORG, flagsObrigatorias: ["id"] },
  { comando: "org atualizar", descricao: "Atualiza razão social, IE, endereço, telefone ou e-mail por --id.", papeis: OPERADOR, flagsObrigatorias: ["id"] },
  { comando: "org desativar", descricao: "Desativa organização se não houver lotes não finalizados; exige --id.", papeis: OPERADOR, flagsObrigatorias: ["id"] },
  { comando: "org ativar", descricao: "Reativa organização; exige --id.", papeis: OPERADOR, flagsObrigatorias: ["id"] },
  { comando: "org renovar-contrato", descricao: "Renova contrato de organização; exige --id e aceita --data.", papeis: OPERADOR, flagsObrigatorias: ["id"] },
  { comando: "contrato listar", descricao: "Lista contratos da organização (obrigatório --org); filtros --status ativo|cancelado, --de e --ate para vencimento.", papeis: LEITURA_ORG, flagsObrigatorias: ["org"] },
  { comando: "contrato buscar", descricao: "Consulta contrato por --org e --id.", papeis: LEITURA_ORG, flagsObrigatorias: ["org", "id"] },
  { comando: "contrato criar", descricao: "Cria contrato para --org com --id, --vencimento e --valor.", papeis: OPERADOR, flagsObrigatorias: ["org", "id", "vencimento", "valor"] },
  { comando: "contrato atualizar", descricao: "Atualiza vencimento, valor mensal, cláusulas ou renovação automática de contrato ativo.", papeis: OPERADOR, flagsObrigatorias: ["org", "id"] },
  { comando: "contrato cancelar", descricao: "Cancela contrato atual sem apagar o histórico; exige --org.", papeis: OPERADOR, flagsObrigatorias: ["org"] },

  { comando: "lote criar", descricao: "Cadastra lote.", papeis: GESTOR, flagsObrigatorias: ["org", "nf", "transp"] },
  { comando: "lote listar", descricao: "Lista lotes; filtros --busca (ID/NF/transportadora), --org e --status; --todos inclui inativos.", papeis: LEITURA_LOTE_EQUIP },
  { comando: "lote buscar", descricao: "Consulta lote por --id.", papeis: LEITURA_LOTE_EQUIP, flagsObrigatorias: ["id"] },
  { comando: "lote atualizar", descricao: "Atualiza NF, transportadora e/ou observações; exige --id e ao menos um campo.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "lote remover-equipamento", descricao: "Desvincula equipamento do lote preservando entidade e histórico; exige --id e --equipamento.", papeis: GESTOR, flagsObrigatorias: ["id", "equipamento"] },
  { comando: "lote desativar", descricao: "Desativa lote sem exclusão física; exige --id.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "lote ativar", descricao: "Reativa lote; exige --id.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "lote triagem", descricao: "Processa triagem de lote.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "lote encaminhar", descricao: "Encaminha lote após triagem concluída.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "lote finalizar", descricao: "Finaliza lote encaminhado; permite desativar sua organização quando não houver outros lotes pendentes.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "lote consultar-periodo", descricao: "Consulta lotes por --inicio e --fim.", papeis: LEITURA_LOTE_EQUIP },

  { comando: "equip cadastrar", descricao: "Cadastra equipamento em lote; aceita --valor-aquisicao.", papeis: GESTOR, flagsObrigatorias: ["lote", "tipo", "estado"] },
  { comando: "equip listar", descricao: "Lista equipamentos; filtros --busca (ID/código/marca/modelo), --lote, --status, --tipo e --todos.", papeis: LEITURA_LOTE_EQUIP },
  { comando: "equip buscar", descricao: "Consulta equipamento por --id.", papeis: LEITURA_LOTE_EQUIP, flagsObrigatorias: ["id"] },
  { comando: "equip atualizar", descricao: "Atualiza marca, modelo, ano, peso e/ou valor de aquisição; exige --id e ao menos um campo.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "equip desativar", descricao: "Desativa equipamento sem apagar rastreabilidade; exige --id.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "equip ativar", descricao: "Reativa equipamento; exige --id.", papeis: GESTOR, flagsObrigatorias: ["id"] },
  { comando: "equip mover", descricao: "Registra movimentação de equipamento.", papeis: GESTOR, flagsObrigatorias: ["id", "destino"] },
  { comando: "equip codigo-barras", descricao: "Gera código de barras interno.", papeis: GESTOR, flagsObrigatorias: ["tipo"] },
  { comando: "equip rastrear", descricao: "Consulta histórico de um equipamento.", papeis: LEITURA_LOTE_EQUIP, flagsObrigatorias: ["id"] },
  { comando: "equip atualizar-estado", descricao: "Atualiza estado físico com regras de justificativa.", papeis: GESTOR, flagsObrigatorias: ["id", "estado"] },

  { comando: "parametro listar", descricao: "Consulta alíquota de imposto e taxa anual de depreciação.", papeis: RELATORIO },
  { comando: "parametro definir", descricao: "Define --nome aliquotaImpostoPercentual ou taxaDepreciacaoAnualPercentual e --valor (0 a 100).", papeis: ADMIN, flagsObrigatorias: ["nome", "valor"] },
  { comando: "auditoria listar", descricao: "Consulta journal atual e rotacionado; filtros --usuario, --entidade, --de e --ate.", papeis: RELATORIO },
  { comando: "relatorio organizacao", descricao: "Gera relatório por organização.", papeis: RELATORIO, flagsObrigatorias: ["org"] },
  { comando: "relatorio status", descricao: "Gera relatório por status.", papeis: RELATORIO, flagsObrigatorias: ["status"] },
  { comando: "relatorio financeiro", descricao: "Gera valores de aquisição/residuais e resumo de contratos em reais.", papeis: RELATORIO },
];

export const COMANDOS_GERAIS = ["ajuda", "logout", "senha alterar"];

export function obterComandosPorPapel(): Record<PapelUsuario, string[]> {
  const resultado = {} as Record<PapelUsuario, string[]>;
  for (const papel of Object.values(PapelUsuario)) {
    resultado[papel] = COMANDOS_REGISTRADOS.filter((item) => item.papeis.includes(papel)).map((item) => item.comando);
  }
  return resultado;
}

export function validarFlagsDoComando(comando: string, flags: Record<string, string>): void {
  const definicao = COMANDOS_REGISTRADOS.find((item) => item.comando === comando);
  for (const nome of definicao?.flagsObrigatorias ?? []) {
    if (!flags[nome]?.trim()) throw new Error(`O comando "${comando}" exige o parâmetro --${nome} <valor>.`);
  }
}
