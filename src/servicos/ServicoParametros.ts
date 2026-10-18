import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import { RepositorioArquivos } from "../persistencia/RepositorioArquivos";
import { ServicoAutorizacao } from "./ServicoAutorizacao";
import { registrarJournal } from "../persistencia/registrarJournal";

export interface ParametrosGlobais {
  aliquotaImpostoPercentual: number;
  taxaDepreciacaoAnualPercentual: number;
}

const PARAMETROS_PADRAO: ParametrosGlobais = {
  aliquotaImpostoPercentual: 0,
  taxaDepreciacaoAnualPercentual: 15,
};

/** Configurações globais persistidas em arquivo cifrado separado dos dados mestre. */
export class ServicoParametros {
  constructor(
    private readonly repositorio: RepositorioArquivos,
    private readonly diretorioBase: string,
    private readonly chave: string,
    private readonly autorizacao: ServicoAutorizacao
  ) {}

  listar(usuarioResponsavel: string): ParametrosGlobais {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "parametro listar");
    const dados = this.repositorio.carregarEntidade(ARQUIVOS.PARAMETROS_GLOBAIS, "global");
    return dados
      ? {
          aliquotaImpostoPercentual: Number(dados.aliquotaImpostoPercentual ?? 0),
          taxaDepreciacaoAnualPercentual: Number(dados.taxaDepreciacaoAnualPercentual ?? 15),
        }
      : { ...PARAMETROS_PADRAO };
  }

  definir(nome: keyof ParametrosGlobais, valor: number, usuarioResponsavel: string): ParametrosGlobais {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "parametro definir");
    if (!(nome in PARAMETROS_PADRAO)) throw new Error("Parâmetro global desconhecido.");
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      throw new Error("O parâmetro percentual deve ser um número entre 0 e 100.");
    }
    const antes = this.repositorio.carregarEntidade(ARQUIVOS.PARAMETROS_GLOBAIS, "global") ?? null;
    const atual = this.listarSemAutorizacao();
    const depois = { id: "global", ...atual, [nome]: valor };
    registrarJournal(
      { operacao: "DEFINIR_PARAMETRO", entidade: ARQUIVOS.PARAMETROS_GLOBAIS, antes, depois, usuario: usuarioResponsavel },
      { diretorioBase: this.diretorioBase, chave: this.chave, repositorio: this.repositorio }
    );
    this.repositorio.salvarEntidade(ARQUIVOS.PARAMETROS_GLOBAIS, depois);
    return { aliquotaImpostoPercentual: depois.aliquotaImpostoPercentual, taxaDepreciacaoAnualPercentual: depois.taxaDepreciacaoAnualPercentual };
  }

  private listarSemAutorizacao(): ParametrosGlobais {
    const dados = this.repositorio.carregarEntidade(ARQUIVOS.PARAMETROS_GLOBAIS, "global");
    return dados
      ? {
          aliquotaImpostoPercentual: Number(dados.aliquotaImpostoPercentual ?? 0),
          taxaDepreciacaoAnualPercentual: Number(dados.taxaDepreciacaoAnualPercentual ?? 15),
        }
      : { ...PARAMETROS_PADRAO };
  }
}
