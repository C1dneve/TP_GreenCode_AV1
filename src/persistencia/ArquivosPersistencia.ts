/** Nomes de arquivos persistidos pelo GreenCode; centralizados para evitar divergências. */
export const ARQUIVOS = Object.freeze({
  CONFIGURACAO_MESTRE: "config.mestre.json",
  CREDENCIAIS: "credenciais.enc",
  ORGANIZACOES: "organizacoes.enc",
  LOTES: "lotes.enc",
  EQUIPAMENTOS: "equipamentos.enc",
  PARAMETROS_GLOBAIS: "parametros_globais.enc",
  JOURNAL: "journal.transacoes",
  JOURNAL_ROTACIONADO_PREFIXO: "journal.transacoes.",
});
