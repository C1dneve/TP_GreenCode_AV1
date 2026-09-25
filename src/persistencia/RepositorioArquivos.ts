import * as fs from "fs";
import * as path from "path";
import { CriptografiaArquivo } from "./CriptografiaArquivo";

export class RepositorioArquivos {
  private diretorioBase: string;
  private criptografia: CriptografiaArquivo;
  private chave: string;

  constructor(
    diretorioBase: string = path.resolve(process.cwd(), "data"),
    chave: string,
    criptografia: CriptografiaArquivo = new CriptografiaArquivo()
  ) {
    this.diretorioBase = diretorioBase;
    this.chave = chave;
    this.criptografia = criptografia;
    this.garantirDiretorioBase();
  }

  salvarEntidade(nomeArquivo: string, entidade: any): void {
    if (!entidade || typeof entidade.id !== "string" || !entidade.id) {
      throw new Error("Toda entidade persistida deve possuir um id textual.");
    }

    const entidades = this.listarEntidades(nomeArquivo);
    const indice = entidades.findIndex((item) => item.id === entidade.id);

    if (indice >= 0) {
      entidades[indice] = entidade;
    } else {
      entidades.push(entidade);
    }

    this.gravarListaAtomica(nomeArquivo, entidades);
  }

  carregarEntidade(nomeArquivo: string, id: string): any {
    return this.listarEntidades(nomeArquivo).find((entidade) => entidade.id === id);
  }

  listarEntidades(nomeArquivo: string): any[] {
    const caminho = this.obterCaminho(nomeArquivo);

    if (!fs.existsSync(caminho)) {
      return [];
    }

    const conteudoCifrado = fs.readFileSync(caminho, "utf8").trim();
    if (!conteudoCifrado) {
      return [];
    }

    try {
      const conteudo = this.criptografia.decifrar(conteudoCifrado, this.chave);
      const entidades = JSON.parse(conteudo);

      if (!Array.isArray(entidades)) {
        throw new Error("O arquivo de persistência não contém uma lista.");
      }

      return entidades;
    } catch (erro) {
      if (erro instanceof Error) {
        throw new Error(`Falha ao carregar ${nomeArquivo}: ${erro.message}`);
      }
      throw new Error(`Falha ao carregar ${nomeArquivo}.`);
    }
  }

  excluirEntidade(nomeArquivo: string, id: string): void {
    const entidades = this.listarEntidades(nomeArquivo);
    const novasEntidades = entidades.filter((entidade) => entidade.id !== id);

    if (novasEntidades.length === entidades.length) {
      return;
    }

    this.gravarListaAtomica(nomeArquivo, novasEntidades);
  }

  obterCaminho(nomeArquivo: string): string {
    const nomeSeguro = path.basename(nomeArquivo);
    return path.join(this.diretorioBase, nomeSeguro);
  }

  restaurarLista(nomeArquivo: string, entidades: any[]): void {
    this.gravarListaAtomica(nomeArquivo, entidades);
  }

  private garantirDiretorioBase(): void {
    fs.mkdirSync(this.diretorioBase, { recursive: true });
  }

  private gravarListaAtomica(nomeArquivo: string, entidades: any[]): void {
    const caminho = this.obterCaminho(nomeArquivo);
    const temporario = `${caminho}.${process.pid}.${Date.now()}.tmp`;
    const dados = JSON.stringify(entidades, null, 2);
    const dadosCifrados = this.criptografia.cifrar(dados, this.chave);

    try {
      fs.writeFileSync(temporario, dadosCifrados, "utf8");
      fs.renameSync(temporario, caminho);
    } catch (erro) {
      if (fs.existsSync(temporario)) {
        fs.unlinkSync(temporario);
      }
      throw erro;
    }
  }
}
