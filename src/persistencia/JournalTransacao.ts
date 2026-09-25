import * as fs from "fs";
import * as path from "path";
import { CriptografiaArquivo } from "./CriptografiaArquivo";
import { RepositorioArquivos } from "./RepositorioArquivos";

export interface RegistroJournal {
  id: string;
  timestamp: string;
  operacao: string;
  entidade: string;
  dadosAntes: any;
  dadosDepois: any;
  usuarioResponsavel: string;
}

export class JournalTransacao {
  private id: string;
  private timestamp: Date;
  private operacao: string;
  private entidade: string;
  private dadosAntes: any;
  private dadosDepois: any;
  private usuarioResponsavel: string;

  private diretorioBase: string;
  private arquivoJournal: string;
  private chave: string;
  private criptografia: CriptografiaArquivo;
  private repositorio?: RepositorioArquivos;

  private static readonly LIMITE_BYTES = 10 * 1024 * 1024;
  private static readonly RETENCAO_DIAS = 180;

  constructor(
    id: string,
    operacao: string,
    entidade: string,
    dadosAntes: any,
    dadosDepois: any,
    usuarioResponsavel: string,
    diretorioBase: string,
    chave: string,
    repositorio?: RepositorioArquivos,
    criptografia: CriptografiaArquivo = new CriptografiaArquivo()
  ) {
    this.id = id;
    this.timestamp = new Date();
    this.operacao = operacao;
    this.entidade = entidade;
    this.dadosAntes = dadosAntes;
    this.dadosDepois = dadosDepois;
    this.usuarioResponsavel = usuarioResponsavel;
    this.diretorioBase = diretorioBase;
    this.arquivoJournal = path.join(diretorioBase, "journal.transacoes");
    this.chave = chave;
    this.repositorio = repositorio;
    this.criptografia = criptografia;

    fs.mkdirSync(this.diretorioBase, { recursive: true });
  }

  registrar(): void {
    const registro = this.criarRegistro();
    const linha = this.criptografia.cifrar(
      JSON.stringify(registro),
      this.chave
    );
    const linhaComQuebra = `${linha}\n`;

    this.rotacionarSeNecessario(linhaComQuebra);
    fs.appendFileSync(this.arquivoJournal, linhaComQuebra, "utf8");
    this.removerJournalsAntigos();
  }

  reverter(): boolean {
    if (!this.repositorio) {
      return false;
    }

    switch (this.operacao.toUpperCase()) {
      case "CRIAR":
      case "CADASTRAR":
      case "CREATE":
        if (this.dadosDepois?.id) {
          this.repositorio.excluirEntidade(this.entidade, String(this.dadosDepois.id));
          return true;
        }
        return false;

      case "ATUALIZAR":
      case "UPDATE":
      case "EXCLUIR":
      case "DELETE":
        if (this.dadosAntes?.id) {
          this.repositorio.salvarEntidade(this.entidade, this.dadosAntes);
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  private criarRegistro(): RegistroJournal {
    return {
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      operacao: this.operacao,
      entidade: this.entidade,
      dadosAntes: this.dadosAntes,
      dadosDepois: this.dadosDepois,
      usuarioResponsavel: this.usuarioResponsavel,
    };
  }

  private rotacionarSeNecessario(novaLinha: string): void {
    if (!fs.existsSync(this.arquivoJournal)) {
      return;
    }

    const tamanhoAtual = fs.statSync(this.arquivoJournal).size;
    const tamanhoFinal = tamanhoAtual + Buffer.byteLength(novaLinha, "utf8");

    if (tamanhoFinal <= JournalTransacao.LIMITE_BYTES) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const arquivoRotacionado = path.join(
      this.diretorioBase,
      `journal.transacoes.${timestamp}`
    );

    fs.renameSync(this.arquivoJournal, arquivoRotacionado);
  }

  private removerJournalsAntigos(): void {
    const agora = Date.now();
    const limite = JournalTransacao.RETENCAO_DIAS * 24 * 60 * 60 * 1000;
    const arquivos = fs.readdirSync(this.diretorioBase);

    for (const arquivo of arquivos) {
      if (!arquivo.startsWith("journal.transacoes")) {
        continue;
      }

      const caminho = path.join(this.diretorioBase, arquivo);
      const dataModificacao = fs.statSync(caminho).mtimeMs;

      if (agora - dataModificacao > limite) {
        fs.unlinkSync(caminho);
      }
    }
  }

  listarRegistros(): RegistroJournal[] {
    if (!fs.existsSync(this.arquivoJournal)) {
      return [];
    }

    const linhas = fs
      .readFileSync(this.arquivoJournal, "utf8")
      .split(/\r?\n/)
      .filter(Boolean);

    return linhas.map((linha: string) =>
      JSON.parse(this.criptografia.decifrar(linha, this.chave)) as RegistroJournal
    );
  }
}
