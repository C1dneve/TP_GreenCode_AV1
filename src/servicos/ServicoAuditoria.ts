import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import * as fs from "fs";
import * as path from "path";
import { CriptografiaArquivo } from "../persistencia/CriptografiaArquivo";
import { RegistroJournal } from "../persistencia/JournalTransacao";
import { ServicoAutorizacao } from "./ServicoAutorizacao";

export interface FiltrosAuditoria {
  usuario?: string;
  entidade?: string;
  de?: Date;
  ate?: Date;
}

/** Consulta somente leitura do journal atual e de todos os arquivos rotacionados. */
export class ServicoAuditoria {
  constructor(
    private readonly diretorioBase: string,
    private readonly chave: string,
    private readonly autorizacao: ServicoAutorizacao,
    private readonly criptografia = new CriptografiaArquivo()
  ) {}

  listar(filtros: FiltrosAuditoria, usuarioResponsavel: string): RegistroJournal[] {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "auditoria listar");
    if (filtros.de && filtros.ate && filtros.de > filtros.ate) {
      throw new Error("A data inicial não pode ser posterior à data final.");
    }
    const nomes = fs.existsSync(this.diretorioBase)
      ? fs.readdirSync(this.diretorioBase)
          .filter((nome) => nome === ARQUIVOS.JOURNAL || nome.startsWith(ARQUIVOS.JOURNAL_ROTACIONADO_PREFIXO))
          .sort((a, b) => {
            if (a === ARQUIVOS.JOURNAL) return 1;
            if (b === ARQUIVOS.JOURNAL) return -1;
            return a.localeCompare(b);
          })
      : [];
    const registros: RegistroJournal[] = [];
    for (const nome of nomes) {
      const arquivo = path.join(this.diretorioBase, nome);
      const linhas = fs.readFileSync(arquivo, "utf8").split(/\r?\n/).filter(Boolean);
      for (let indice = 0; indice < linhas.length; indice++) {
        try {
          const registro = JSON.parse(this.criptografia.decifrar(linhas[indice], this.chave)) as RegistroJournal;
          if (filtros.usuario && registro.usuarioResponsavel !== filtros.usuario) continue;
          if (filtros.entidade && !registro.entidade.toLowerCase().includes(filtros.entidade.toLowerCase())) continue;
          const instante = new Date(registro.timestamp);
          if (filtros.de && instante < filtros.de) continue;
          if (filtros.ate && instante > filtros.ate) continue;
          registros.push(registro);
        } catch (erro) {
          throw new Error(`Falha ao ler o journal ${nome}, linha ${indice + 1}: ${(erro as Error).message}`);
        }
      }
    }
    return registros.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
