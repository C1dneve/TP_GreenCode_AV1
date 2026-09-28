import { PapelUsuario } from "../models/enums/PapelUsuario";
import { ServicoAutenticacao } from "./ServicoAutenticacao";

export const COMANDOS_POR_PAPEL: Record<PapelUsuario, string[]> = {
  [PapelUsuario.ADMINISTRADOR]: [
    "usuario criar",
    "org criar",
    "org listar",
    "org renovar-contrato",
    "lote criar",
    "lote triagem",
    "lote consultar-periodo",
    "equip cadastrar",
    "equip mover",
    "equip codigo-barras",
    "equip rastrear",
    "equip atualizar-estado",
    "relatorio organizacao",
    "relatorio status",
    "relatorio financeiro",
  ],
  [PapelUsuario.OPERADOR_CADASTRO]: [
    "org criar",
    "org listar",
    "org renovar-contrato",
  ],
  [PapelUsuario.GESTOR_ALMOXARIFADO]: [
    "lote criar",
    "lote triagem",
    "lote consultar-periodo",
    "equip cadastrar",
    "equip mover",
    "equip codigo-barras",
    "equip atualizar-estado",
  ],
  [PapelUsuario.AUDITOR]: [
    "equip rastrear",
    "relatorio organizacao",
    "relatorio status",
    "relatorio financeiro",
  ],
};

export const COMANDOS_GERAIS = ["ajuda", "logout", "senha alterar"];

/**
 * Centraliza a decisão de autorização por papel.
 * A CLI usa este serviço antes de despachar qualquer ação de negócio,
 * evitando que o menu seja a única fonte da regra de acesso.
 */
export class ServicoAutorizacao {
  constructor(private readonly autenticacao: ServicoAutenticacao) {}

  obterComandosPermitidos(papel: PapelUsuario): string[] {
    return [...COMANDOS_POR_PAPEL[papel], ...COMANDOS_GERAIS];
  }

  estaPermitido(papel: PapelUsuario, comando: string): boolean {
    return this.obterComandosPermitidos(papel).includes(comando);
  }

  exigirPermissao(usuario: string, comando: string): void {
    const papel = this.autenticacao.obterPapelUsuario(usuario);
    if (!this.estaPermitido(papel, comando)) {
      throw new Error(`Comando "${comando}" não permitido para o papel ${papel}.`);
    }
  }

  exigirPermissaoPorPapel(papel: PapelUsuario, comando: string): void {
    if (!this.estaPermitido(papel, comando)) {
      throw new Error(`Comando "${comando}" não permitido para o papel ${papel}.`);
    }
  }
}
