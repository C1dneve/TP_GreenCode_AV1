import * as fs from "fs";
import * as path from "path";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { Credencial } from "../models/Credencial";
import { Sessao } from "../models/Sessao";
import { CriptografiaArquivo } from "../persistencia/CriptografiaArquivo";
import { JournalTransacao } from "../persistencia/JournalTransacao";
import { RepositorioArquivos } from "../persistencia/RepositorioArquivos";

interface ConfiguracaoMestre {
  chaveCriptografia: string;
  usuarioAdministrador: string;
}

export class ServicoAutenticacao {
  private credenciais: Credencial[] = [];
  private sessoesAtivas: Sessao[] = [];
  private repositorio?: RepositorioArquivos;
  private journal?: JournalTransacao;
  private diretorioBase: string;
  private chave?: string;
  private readonly criptografia = new CriptografiaArquivo();

  constructor(diretorioBase: string = path.resolve(process.cwd(), "data")) {
    this.diretorioBase = diretorioBase;
    fs.mkdirSync(this.diretorioBase, { recursive: true });
    this.carregarConfiguracaoMestre();
    this.carregarCredenciais();
  }

  provisionarInicial(senhaAdministrador: string, usuarioAdministrador = "admin"): void {
    if (this.chave) {
      throw new Error("O sistema já possui uma configuração mestre.");
    }

    if (!senhaAdministrador.trim()) {
      throw new Error("A senha inicial do administrador não pode ser vazia.");
    }

    this.chave = this.criptografia.gerarChave();
    this.recriarPersistencia();

    const credencial = new Credencial(
      usuarioAdministrador,
      senhaAdministrador,
      PapelUsuario.ADMINISTRADOR
    );
    this.credenciais = [credencial];
    this.salvarCredenciais();

    const configuracao: ConfiguracaoMestre = {
      chaveCriptografia: this.chave,
      usuarioAdministrador,
    };

    fs.writeFileSync(
      this.obterCaminhoConfiguracao(),
      JSON.stringify(configuracao, null, 2),
      "utf8"
    );

    this.criarDependenciasPersistencia();
  }

  login(usuario: string, senha: string): Sessao {
    this.exigirSistemaProvisionado();
    this.carregarCredenciais();

    const credencial = this.credenciais.find(
      (item) => item.obterUsuario() === usuario
    );

    if (!credencial || !credencial.autenticar(usuario, senha)) {
      throw new Error("Usuário ou senha inválidos.");
    }

    this.salvarCredenciais();

    const sessao = new Sessao(usuario, credencial.obterPapel());
    this.sessoesAtivas.push(sessao);
    return sessao;
  }

  logout(token: string): void {
    this.sessoesAtivas = this.sessoesAtivas.filter(
      (sessao) => sessao.obterToken() !== token
    );
  }

  validarToken(token: string): boolean {
    const sessao = this.sessoesAtivas.find(
      (item) => item.obterToken() === token
    );

    if (!sessao || !sessao.isValida()) {
      if (sessao) {
        this.logout(token);
      }
      return false;
    }

    sessao.registrarAtividade();
    return true;
  }

  alterarSenha(
    usuario: string,
    senhaAntiga: string,
    senhaNova: string
  ): boolean {
    this.exigirSistemaProvisionado();
    this.carregarCredenciais();

    const credencial = this.credenciais.find(
      (item) => item.obterUsuario() === usuario
    );

    if (!credencial || !credencial.verificarSenha(senhaAntiga)) {
      return false;
    }

    const dadosAntes = credencial.paraDados();
    credencial.alterarSenha(senhaNova);
    const dadosDepois = credencial.paraDados();

    this.registrarJournal(
      "ATUALIZAR",
      "credenciais.enc",
      dadosAntes,
      dadosDepois,
      usuario
    );
    this.salvarCredenciais();
    return true;
  }

  criarUsuario(
    usuario: string,
    senha: string,
    papel: PapelUsuario,
    responsavel: string
  ): Credencial {
    this.exigirSistemaProvisionado();
    this.carregarCredenciais();

    if (this.credenciais.some((item) => item.obterUsuario() === usuario)) {
      throw new Error("O usuário informado já está cadastrado.");
    }

    const credencial = new Credencial(usuario, senha, papel);
    this.registrarJournal(
      "CRIAR",
      "credenciais.enc",
      null,
      credencial.paraDados(),
      responsavel
    );
    this.credenciais.push(credencial);
    this.salvarCredenciais();
    return credencial;
  }

  private carregarConfiguracaoMestre(): void {
    const caminho = this.obterCaminhoConfiguracao();
    if (!fs.existsSync(caminho)) {
      this.chave = undefined;
      return;
    }

    const configuracao = JSON.parse(
      fs.readFileSync(caminho, "utf8")
    ) as ConfiguracaoMestre;

    this.chave = configuracao.chaveCriptografia;
    this.criarDependenciasPersistencia();
  }

  private criarDependenciasPersistencia(): void {
    if (!this.chave) {
      return;
    }

    this.repositorio = new RepositorioArquivos(
      this.diretorioBase,
      this.chave,
      this.criptografia
    );
    this.journal = new JournalTransacao(
      "",
      "",
      "",
      null,
      null,
      "",
      this.diretorioBase,
      this.chave,
      this.repositorio,
      this.criptografia
    );
  }

  private carregarCredenciais(): void {
    if (!this.repositorio) {
      return;
    }

    const dados = this.repositorio.listarEntidades("credenciais.enc");
    this.credenciais = dados.map((item) => Credencial.deDados(item));
  }

  private salvarCredenciais(): void {
    if (!this.repositorio) {
      throw new Error("O sistema ainda não foi provisionado.");
    }

    this.repositorio.restaurarLista(
      "credenciais.enc",
      this.credenciais.map((item) => item.paraDados())
    );
  }

  private registrarJournal(
    operacao: string,
    entidade: string,
    dadosAntes: any,
    dadosDepois: any,
    usuarioResponsavel: string
  ): void {
    if (!this.journal || !this.chave) {
      throw new Error("O journal ainda não foi configurado.");
    }

    const transacao = new JournalTransacao(
      `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      operacao,
      entidade,
      dadosAntes,
      dadosDepois,
      usuarioResponsavel,
      this.diretorioBase,
      this.chave,
      this.repositorio,
      this.criptografia
    );
    transacao.registrar();
  }

  private exigirSistemaProvisionado(): void {
    if (!this.chave || !this.repositorio) {
      throw new Error(
        "Sistema não provisionado. Execute o provisionamento inicial do administrador."
      );
    }
  }

  private recriarPersistencia(): void {
    this.repositorio = undefined;
    this.journal = undefined;
    this.criarDependenciasPersistencia();
  }

  private obterCaminhoConfiguracao(): string {
    return path.join(this.diretorioBase, "config.mestre.json");
  }

   obterRepositorio(): RepositorioArquivos | undefined {
    return this.repositorio;
  }

  obterChave(): string | undefined {
    return this.chave;
  }

  obterDiretorioBase(): string {
    return this.diretorioBase;
  }

  estaProvisionado(): boolean {
    return Boolean(this.chave && this.repositorio);
  }

}
