import { PapelUsuario } from "../models/enums/PapelUsuario";
import { ServicoAutenticacao } from "./ServicoAutenticacao";
import { COMANDOS_GERAIS, obterComandosPorPapel } from "../cli/RegistroComandos";

export { COMANDOS_GERAIS };
export const COMANDOS_POR_PAPEL: Record<PapelUsuario, string[]> = obterComandosPorPapel();

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
