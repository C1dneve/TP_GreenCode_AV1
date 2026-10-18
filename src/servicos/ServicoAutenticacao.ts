import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import { exigirEncontrado } from "../utils/ExigirEncontrado";
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

    if (!credencial || !credencial.estaAtiva() || !credencial.autenticar(usuario, senha)) {
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

  obterPapelUsuario(usuario: string): PapelUsuario {
    this.exigirSistemaProvisionado();
    this.carregarCredenciais();

    const credencial = this.credenciais.find(
      (item) => item.obterUsuario() === usuario
    );

    if (!credencial || !credencial.estaAtiva()) {
      throw new Error("Usuário não encontrado ou desativado.");
    }

    return credencial.obterPapel();
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
      ARQUIVOS.CREDENCIAIS,
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
    responsavel: string,
    nome: string = usuario
  ): Credencial {
    this.exigirSistemaProvisionado();
    this.carregarCredenciais();

    if (this.obterPapelUsuario(responsavel) !== PapelUsuario.ADMINISTRADOR) {
      throw new Error("Somente o papel ADMINISTRADOR pode criar usuários.");
    }

    if (this.credenciais.some((item) => item.obterUsuario() === usuario)) {
      throw new Error("O usuário informado já está cadastrado.");
    }

    if (!Object.values(PapelUsuario).includes(papel)) {
      throw new Error("Papel de usuário inválido.");
    }

    if (!usuario.trim() || !senha.trim()) {
      throw new Error("Usuário e senha não podem ser vazios.");
    }
    const credencial = new Credencial(usuario.trim(), senha, papel, nome);
    this.registrarJournal(
      "CRIAR",
      ARQUIVOS.CREDENCIAIS,
      null,
      credencial.paraDados(),
      responsavel
    );
    this.credenciais.push(credencial);
    this.salvarCredenciais();
    return credencial;
  }

  listarUsuarios(responsavel: string): Credencial[] {
    this.exigirAdministrador(responsavel);
    this.carregarCredenciais();
    return this.credenciais.map((item) => Credencial.deDados(item.paraDados()));
  }

  buscarUsuario(usuario: string, responsavel: string): Credencial {
    this.exigirAdministrador(responsavel);
    this.carregarCredenciais();
    const encontrado = this.exigirCredencial(usuario);
    return Credencial.deDados(encontrado.paraDados());
  }

  atualizarUsuario(usuario: string, nome: string, papel: PapelUsuario, responsavel: string): void {
    this.exigirAdministrador(responsavel);
    this.carregarCredenciais();
    const credencial = this.exigirCredencial(usuario);
    if (usuario === responsavel && papel !== PapelUsuario.ADMINISTRADOR) {
      throw new Error("O administrador não pode remover de si próprio o papel ADMINISTRADOR.");
    }
    if (credencial.estaAtiva() && credencial.obterPapel() === PapelUsuario.ADMINISTRADOR && papel !== PapelUsuario.ADMINISTRADOR &&
        this.credenciais.filter((item) => item.estaAtiva() && item.obterPapel() === PapelUsuario.ADMINISTRADOR).length <= 1) {
      throw new Error("Não é permitido remover o papel do último administrador ativo.");
    }
    const antes = credencial.paraDados();
    const papelAnterior = credencial.obterPapel();
    credencial.atualizarDados(nome, papel);
    const depois = credencial.paraDados();
    this.registrarJournal("ATUALIZAR", ARQUIVOS.CREDENCIAIS, antes, depois, responsavel);
    this.salvarCredenciais();
    if (papelAnterior !== papel) this.invalidarSessoesDoUsuario(usuario);
  }

  desativarUsuario(usuario: string, responsavel: string): void {
    this.exigirAdministrador(responsavel);
    if (usuario === responsavel) throw new Error("Não é permitido desativar o próprio usuário.");
    this.carregarCredenciais();
    const credencial = this.exigirCredencial(usuario);
    if (!credencial.estaAtiva()) throw new Error("O usuário já está desativado.");
    if (credencial.obterPapel() === PapelUsuario.ADMINISTRADOR &&
        this.credenciais.filter((item) => item.estaAtiva() && item.obterPapel() === PapelUsuario.ADMINISTRADOR).length <= 1) {
      throw new Error("Não é permitido desativar o último administrador ativo.");
    }
    const antes = credencial.paraDados();
    credencial.desativar();
    const depois = credencial.paraDados();
    this.registrarJournal("DESATIVAR", ARQUIVOS.CREDENCIAIS, antes, depois, responsavel);
    this.salvarCredenciais();
    this.invalidarSessoesDoUsuario(usuario);
  }

  ativarUsuario(usuario: string, responsavel: string): void {
    this.exigirAdministrador(responsavel);
    this.carregarCredenciais();
    const credencial = this.exigirCredencial(usuario);
    if (credencial.estaAtiva()) throw new Error("O usuário já está ativo.");
    const antes = credencial.paraDados();
    credencial.ativar();
    const depois = credencial.paraDados();
    this.registrarJournal("ATIVAR", ARQUIVOS.CREDENCIAIS, antes, depois, responsavel);
    this.salvarCredenciais();
  }

  redefinirSenha(usuario: string, novaSenha: string, responsavel: string): void {
    this.exigirAdministrador(responsavel);
    if (!novaSenha.trim()) throw new Error("A nova senha não pode ser vazia.");
    this.carregarCredenciais();
    const credencial = this.exigirCredencial(usuario);
    const antes = credencial.paraDados();
    credencial.alterarSenha(novaSenha);
    const depois = credencial.paraDados();
    this.registrarJournal("REDEFINIR_SENHA", ARQUIVOS.CREDENCIAIS, antes, depois, responsavel);
    this.salvarCredenciais();
    this.invalidarSessoesDoUsuario(usuario);
  }

  private exigirCredencial(usuario: string): Credencial {
    return exigirEncontrado(
      this.credenciais.find((item) => item.obterUsuario() === usuario),
      "Usuário",
      "Usuário não encontrado."
    );
  }

  private exigirAdministrador(responsavel: string): void {
    if (this.obterPapelUsuario(responsavel) !== PapelUsuario.ADMINISTRADOR) {
      throw new Error("Somente o papel ADMINISTRADOR pode gerenciar usuários.");
    }
  }

  private invalidarSessoesDoUsuario(usuario: string): void {
    this.sessoesAtivas = this.sessoesAtivas.filter((sessao) => sessao.obterUsuario() !== usuario);
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

    const dados = this.repositorio.listarEntidades(ARQUIVOS.CREDENCIAIS);
    this.credenciais = dados.map((item) => Credencial.deDados(item));
  }

  private salvarCredenciais(): void {
    if (!this.repositorio) {
      throw new Error("O sistema ainda não foi provisionado.");
    }

    this.repositorio.restaurarLista(
      ARQUIVOS.CREDENCIAIS,
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
    return path.join(this.diretorioBase, ARQUIVOS.CONFIGURACAO_MESTRE);
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
