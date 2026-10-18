import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao";
import { ServicoOrganizacao } from "../servicos/ServicoOrganizacao";
import { ServicoLote } from "../servicos/ServicoLote";
import { ServicoEquipamentos } from "../servicos/ServicoEquipamentos";
import { ServicoRelatorios } from "../servicos/ServicoRelatorios";
import { Sessao } from "../models/Sessao";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { TipoEquipamento } from "../models/enums/TipoEquipamento";
import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { EstadoFisico } from "../models/enums/EstadoFisico";
import { Equipamento } from "../models/Equipamento";
import { ServicoAutorizacao, COMANDOS_POR_PAPEL, COMANDOS_GERAIS } from "../servicos/ServicoAutorizacao";
import { COMANDOS_REGISTRADOS, validarFlagsDoComando } from "./RegistroComandos";
import { ServicoParametros, ParametrosGlobais } from "../servicos/ServicoParametros";
import { ServicoAuditoria } from "../servicos/ServicoAuditoria";
import { formatarListagemCLI } from "./FormatadorListaCLI";
import { moverSelecaoMenu, numeroDaOpcaoSelecionada } from "./NavegacaoMenuCLI";
import { solicitarMenuHibrido } from "./PromptMenuHibrido";
import { estilizarTerminal, formatarMensagemTerminal } from "../utils/CoresTerminal";
import { correspondeBuscaCLI, obterBuscaCLI, tituloComFiltrosCLI } from "./FiltrosPesquisaCLI";
import { filtrarPorPeriodo } from "../utils/FiltrarPorPeriodo";
import { StatusLote } from "../models/enums/StatusLote";

export { COMANDOS_POR_PAPEL };


interface CampoMenuNumerico {
  flag: string;
  pergunta: string;
  obrigatorio?: boolean;
  opcoes?: string[];
  booleano?: boolean;
  incluirSomenteSeSim?: boolean;
}

interface CategoriaMenuNumerico {
  id: string;
  titulo: string;
  comandos: string[];
}

const CAMPOS_MENU_NUMERICO: Record<string, CampoMenuNumerico[]> = {
  "usuario criar": [
    { flag: "usuario", pergunta: "Nome de usuário", obrigatorio: true },
    { flag: "nome", pergunta: "Nome completo" },
    { flag: "papel", pergunta: "Papel", obrigatorio: true, opcoes: Object.values(PapelUsuario) },
  ],
  "usuario listar": [
    { flag: "busca", pergunta: "Buscar por nome ou usuário" },
    { flag: "papel", pergunta: "Filtrar por papel", opcoes: Object.values(PapelUsuario) },
    { flag: "todos", pergunta: "Incluir usuários inativos?", booleano: true, incluirSomenteSeSim: true },
  ],
  "usuario buscar": [{ flag: "usuario", pergunta: "Nome de usuário", obrigatorio: true }],
  "usuario atualizar": [
    { flag: "usuario", pergunta: "Nome de usuário que será atualizado", obrigatorio: true },
    { flag: "nome", pergunta: "Novo nome", obrigatorio: true },
    { flag: "papel", pergunta: "Novo papel", obrigatorio: true, opcoes: Object.values(PapelUsuario) },
  ],
  "usuario desativar": [{ flag: "usuario", pergunta: "Nome de usuário", obrigatorio: true }],
  "usuario ativar": [{ flag: "usuario", pergunta: "Nome de usuário", obrigatorio: true }],
  "usuario redefinir-senha": [{ flag: "usuario", pergunta: "Nome de usuário", obrigatorio: true }],
  "senha alterar": [],
  "org criar": [
    { flag: "id", pergunta: "Identificador (gerado automaticamente se vazio)" },
    { flag: "razao", pergunta: "Razão social" },
    { flag: "cnpj", pergunta: "CNPJ", obrigatorio: true },
    { flag: "ie", pergunta: "Inscrição estadual" },
    { flag: "endereco", pergunta: "Endereço completo" },
    { flag: "telefone", pergunta: "Telefone" },
    { flag: "email", pergunta: "E-mail" },
  ],
  "org listar": [
    { flag: "busca", pergunta: "Buscar por ID, razão social, CNPJ ou contato" },
    { flag: "todos", pergunta: "Incluir organizações inativas?", booleano: true, incluirSomenteSeSim: true },
  ],
  "org buscar": [{ flag: "id", pergunta: "ID da organização", obrigatorio: true }],
  "org atualizar": [
    { flag: "id", pergunta: "ID da organização", obrigatorio: true },
    { flag: "razao", pergunta: "Nova razão social (opcional)" },
    { flag: "ie", pergunta: "Nova inscrição estadual (opcional)" },
    { flag: "endereco", pergunta: "Novo endereço (opcional)" },
    { flag: "telefone", pergunta: "Novo telefone (opcional)" },
    { flag: "email", pergunta: "Novo e-mail (opcional)" },
  ],
  "org desativar": [{ flag: "id", pergunta: "ID da organização", obrigatorio: true }],
  "org ativar": [{ flag: "id", pergunta: "ID da organização", obrigatorio: true }],
  "org renovar-contrato": [
    { flag: "id", pergunta: "ID da organização", obrigatorio: true },
    { flag: "data", pergunta: "Nova data de vencimento (AAAA-MM-DD)" },
  ],
  "contrato listar": [
    { flag: "org", pergunta: "ID da organização", obrigatorio: true },
    { flag: "status", pergunta: "Filtrar por situação", opcoes: ["ativo", "cancelado"] },
    { flag: "de", pergunta: "Vencimento a partir de (AAAA-MM-DD)" },
    { flag: "ate", pergunta: "Vencimento até (AAAA-MM-DD)" },
  ],
  "contrato buscar": [
    { flag: "org", pergunta: "ID da organização", obrigatorio: true },
    { flag: "id", pergunta: "ID do contrato", obrigatorio: true },
  ],
  "contrato criar": [
    { flag: "org", pergunta: "ID da organização", obrigatorio: true },
    { flag: "id", pergunta: "ID do novo contrato", obrigatorio: true },
    { flag: "vencimento", pergunta: "Data de vencimento (AAAA-MM-DD)", obrigatorio: true },
    { flag: "valor", pergunta: "Valor mensal em reais (ex.: 1200.50)", obrigatorio: true },
    { flag: "clausulas", pergunta: "Cláusulas separadas por vírgula" },
    { flag: "renovacao-automatica", pergunta: "Renovação automática? (sim/não)", booleano: true },
  ],
  "contrato atualizar": [
    { flag: "org", pergunta: "ID da organização", obrigatorio: true },
    { flag: "id", pergunta: "ID do contrato ativo", obrigatorio: true },
    { flag: "vencimento", pergunta: "Novo vencimento (AAAA-MM-DD)" },
    { flag: "valor", pergunta: "Novo valor mensal (opcional)" },
    { flag: "clausulas", pergunta: "Novas cláusulas separadas por vírgula" },
    { flag: "renovacao-automatica", pergunta: "Renovação automática? (sim/não)", booleano: true },
  ],
  "contrato cancelar": [{ flag: "org", pergunta: "ID da organização", obrigatorio: true }],
  "lote criar": [
    { flag: "id", pergunta: "ID do lote (gerado automaticamente se vazio)" },
    { flag: "org", pergunta: "ID da organização", obrigatorio: true },
    { flag: "nf", pergunta: "Número da nota fiscal", obrigatorio: true },
    { flag: "transp", pergunta: "Transportadora", obrigatorio: true },
  ],
  "lote listar": [
    { flag: "busca", pergunta: "Buscar por ID, NF ou transportadora" },
    { flag: "org", pergunta: "Filtrar por ID da organização" },
    { flag: "status", pergunta: "Filtrar por status do processamento", opcoes: Object.values(StatusLote) },
    { flag: "todos", pergunta: "Incluir lotes inativos?", booleano: true, incluirSomenteSeSim: true },
  ],
  "lote buscar": [{ flag: "id", pergunta: "ID do lote", obrigatorio: true }],
  "lote atualizar": [
    { flag: "id", pergunta: "ID do lote", obrigatorio: true },
    { flag: "nf", pergunta: "Nova nota fiscal (opcional)" },
    { flag: "transp", pergunta: "Nova transportadora (opcional)" },
    { flag: "observacoes", pergunta: "Novas observações (opcional)" },
  ],
  "lote remover-equipamento": [
    { flag: "id", pergunta: "ID do lote", obrigatorio: true },
    { flag: "equipamento", pergunta: "ID do equipamento", obrigatorio: true },
  ],
  "lote desativar": [{ flag: "id", pergunta: "ID do lote", obrigatorio: true }],
  "lote ativar": [{ flag: "id", pergunta: "ID do lote", obrigatorio: true }],
  "lote triagem": [{ flag: "id", pergunta: "ID do lote", obrigatorio: true }],
  "lote encaminhar": [{ flag: "id", pergunta: "ID do lote", obrigatorio: true }],
  "lote finalizar": [{ flag: "id", pergunta: "ID do lote", obrigatorio: true }],
  "lote consultar-periodo": [
    { flag: "inicio", pergunta: "Data inicial (AAAA-MM-DD)" },
    { flag: "fim", pergunta: "Data final (AAAA-MM-DD)" },
  ],
  "equip cadastrar": [
    { flag: "id", pergunta: "ID do equipamento (gerado automaticamente se vazio)" },
    { flag: "lote", pergunta: "ID do lote", obrigatorio: true },
    { flag: "tipo", pergunta: "Tipo do equipamento", obrigatorio: true, opcoes: Object.values(TipoEquipamento) },
    { flag: "estado", pergunta: "Estado físico", obrigatorio: true, opcoes: Object.values(EstadoFisico) },
    { flag: "marca", pergunta: "Marca" },
    { flag: "modelo", pergunta: "Modelo" },
    { flag: "ano", pergunta: "Ano de fabricação" },
    { flag: "peso", pergunta: "Peso em kg" },
    { flag: "valor-aquisicao", pergunta: "Valor de aquisição em reais" },
  ],
  "equip listar": [
    { flag: "busca", pergunta: "Buscar por ID, código de barras, marca ou modelo" },
    { flag: "lote", pergunta: "Filtrar por ID do lote" },
    { flag: "status", pergunta: "Filtrar por status", opcoes: Object.values(StatusRastreamento) },
    { flag: "tipo", pergunta: "Filtrar por tipo", opcoes: Object.values(TipoEquipamento) },
    { flag: "todos", pergunta: "Incluir equipamentos inativos?", booleano: true, incluirSomenteSeSim: true },
  ],
  "equip buscar": [{ flag: "id", pergunta: "ID do equipamento", obrigatorio: true }],
  "equip atualizar": [
    { flag: "id", pergunta: "ID do equipamento", obrigatorio: true },
    { flag: "marca", pergunta: "Nova marca" },
    { flag: "modelo", pergunta: "Novo modelo" },
    { flag: "ano", pergunta: "Novo ano de fabricação" },
    { flag: "peso", pergunta: "Novo peso em kg" },
    { flag: "valor-aquisicao", pergunta: "Novo valor de aquisição em reais" },
  ],
  "equip desativar": [{ flag: "id", pergunta: "ID do equipamento", obrigatorio: true }],
  "equip ativar": [{ flag: "id", pergunta: "ID do equipamento", obrigatorio: true }],
  "equip mover": [
    { flag: "id", pergunta: "ID do equipamento", obrigatorio: true },
    { flag: "destino", pergunta: "Destino da movimentação", obrigatorio: true },
    { flag: "obs", pergunta: "Observação" },
  ],
  "equip codigo-barras": [
    { flag: "tipo", pergunta: "Tipo do equipamento", obrigatorio: true, opcoes: Object.values(TipoEquipamento) },
    { flag: "seq", pergunta: "Número sequencial (padrão 1)" },
  ],
  "equip rastrear": [{ flag: "id", pergunta: "ID do equipamento", obrigatorio: true }],
  "equip atualizar-estado": [
    { flag: "id", pergunta: "ID do equipamento", obrigatorio: true },
    { flag: "estado", pergunta: "Novo estado físico", obrigatorio: true, opcoes: Object.values(EstadoFisico) },
    { flag: "justificativa", pergunta: "Justificativa (quando necessária)" },
  ],
  "parametro listar": [],
  "parametro definir": [
    { flag: "nome", pergunta: "Parâmetro", obrigatorio: true, opcoes: ["aliquotaImpostoPercentual", "taxaDepreciacaoAnualPercentual"] },
    { flag: "valor", pergunta: "Novo percentual (0 a 100)", obrigatorio: true },
  ],
  "auditoria listar": [
    { flag: "usuario", pergunta: "Filtrar por usuário" },
    { flag: "entidade", pergunta: "Filtrar por entidade" },
    { flag: "de", pergunta: "Data inicial (AAAA-MM-DD)" },
    { flag: "ate", pergunta: "Data final (AAAA-MM-DD)" },
  ],
  "relatorio organizacao": [
    { flag: "org", pergunta: "ID da organização", obrigatorio: true },
    { flag: "inicio", pergunta: "Data inicial (AAAA-MM-DD)" },
    { flag: "fim", pergunta: "Data final (AAAA-MM-DD)" },
  ],
  "relatorio status": [{ flag: "status", pergunta: "Status", obrigatorio: true, opcoes: Object.values(StatusRastreamento) }],
  "relatorio financeiro": [
    { flag: "inicio", pergunta: "Data inicial (AAAA-MM-DD)" },
    { flag: "fim", pergunta: "Data final (AAAA-MM-DD)" },
  ],
};

const GRUPOS_MENU_NUMERICO: Array<{ id: string; titulo: string; prefixos: string[] }> = [
  { id: "usuarios", titulo: "Usuários", prefixos: ["usuario "] },
  { id: "organizacoes", titulo: "Organizações e contratos", prefixos: ["org ", "contrato "] },
  { id: "lotes", titulo: "Lotes", prefixos: ["lote "] },
  { id: "equipamentos", titulo: "Equipamentos", prefixos: ["equip "] },
  { id: "parametros", titulo: "Parâmetros globais", prefixos: ["parametro "] },
  { id: "auditoria", titulo: "Auditoria / journal", prefixos: ["auditoria "] },
  { id: "relatorios", titulo: "Relatórios", prefixos: ["relatorio "] },
  { id: "conta", titulo: "Minha conta", prefixos: ["senha alterar"] },
];

/** Verifica que o assistente não esqueceu comandos nem flags obrigatórias do catálogo. */
export function validarIntegridadeAssistenteNumerico(): void {
  const comandosSemAssistente = COMANDOS_REGISTRADOS
    .filter((definicao) => !Object.prototype.hasOwnProperty.call(CAMPOS_MENU_NUMERICO, definicao.comando))
    .map((definicao) => definicao.comando);

  if (comandosSemAssistente.length) {
    throw new Error(`Comandos sem definição para o menu numérico: ${comandosSemAssistente.join(", ")}.`);
  }

  for (const definicao of COMANDOS_REGISTRADOS) {
    const campos = CAMPOS_MENU_NUMERICO[definicao.comando];
    const flagsAusentes = (definicao.flagsObrigatorias ?? []).filter((flag) =>
      !campos.some((campo) => campo.flag === flag && campo.obrigatorio)
    );
    if (flagsAusentes.length) {
      throw new Error(`O assistente de "${definicao.comando}" não marca como obrigatórias as flags: ${flagsAusentes.join(", ")}.`);
    }
  }
}



export function interpretarComando(entrada: string): {
  entidade: string;
  acao: string;
  flags: Record<string, string>;
} {
  const partes = (entrada.trim().match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\S+/g) ?? [])
    .map((parte) => parte.replace(/^(?:"(.*)"|'(.*)')$/, (_match, aspasDuplas, aspasSimples) => aspasDuplas ?? aspasSimples));
  const entidade = partes[0] ?? "";
  const acao = partes[1] ?? "";
  const flags: Record<string, string> = {};

  for (let i = 2; i < partes.length; i++) {
    if (partes[i].startsWith("--")) {
      const chave = partes[i].slice(2);
      const proximo = partes[i + 1];
      if (!proximo || proximo.startsWith("--")) {
        flags[chave] = "";
        continue;
      }
      flags[chave] = proximo.replace(/^(["'])(.*)\1$/, "$2");
      i++; 
    }
  }

  return { entidade, acao, flags };
}

const CAMINHO_HISTORICO = path.join(
  process.env.GREEN_CODE_DATA_DIR ? path.resolve(process.env.GREEN_CODE_DATA_DIR) : path.resolve(process.cwd(), "data"),
  ".greencode_history"
);

export class CLIInterface {
  private autenticacao: ServicoAutenticacao;
  private autorizacao: ServicoAutorizacao;
  private organizacao?: ServicoOrganizacao;
  private lote?: ServicoLote;
  private equipamento?: ServicoEquipamentos;
  private relatorio?: ServicoRelatorios;
  private parametros?: ServicoParametros;
  private auditoria?: ServicoAuditoria;
  private sessaoAtual: Sessao | null = null;
  private rl?: readline.Interface;

  private lendoSenha = false;
  private modoComandoDireto = false;
  private categoriaMenuAtual: CategoriaMenuNumerico | null = null;
  private indiceMenuSelecionado = 0;
  private menuTecladoAtivo = false;
  private promptMenuEmAndamento = false;
  private manipuladorTeclaRegistrado = false;

  private readonly manipuladorTeclaMenu = (_caractere: string, tecla: readline.Key): void => {
    if (this.promptMenuEmAndamento || !this.menuTecladoAtivo || !this.sessaoAtual || !this.rl || this.modoComandoDireto
      || this.lendoSenha || !process.stdin.isTTY || this.rl.line.trim() !== "") {
      return;
    }

    if (tecla?.name !== "up" && tecla?.name !== "down") return;
    const opcoes = this.obterOpcoesMenuTeclado();
    if (!opcoes.length) return;

    // Persistimos o histórico antes que o readline possa usar ↑/↓ para navegar
    // pelo próprio histórico, pois neste estado as teclas pertencem ao menu.
    this.salvarHistorico();
    // A primeira seta transfere o controle do readline do GreenCode para o prompt
    // Inquirer; não desenhamos seletor no prompt normal nem duplicamos menus.
    const direcao = tecla.name === "up" ? -1 : 1;
    this.indiceMenuSelecionado = moverSelecaoMenu(this.indiceMenuSelecionado, direcao, opcoes.length);
    this.promptMenuEmAndamento = true;
    this.menuTecladoAtivo = false;
    setImmediate(() => { void this.abrirMenuHibrido(); });
  };

  private readonly manipuladorLinha = (entrada: string): void => {
    if (this.lendoSenha || this.promptMenuEmAndamento) return;

    this.menuTecladoAtivo = false;
    void this.processarEntrada(entrada).then(() => {
      if (this.sessaoAtual && this.rl) {
        this.salvarHistorico();
        this.atualizarPrompt();
        this.menuTecladoAtivo = !this.modoComandoDireto;
        this.rl.prompt();
      }
    }).catch((erro) => {
      this.mensagem("erro", (erro as Error).message);
      if (this.sessaoAtual && this.rl) {
        this.atualizarPrompt();
        this.menuTecladoAtivo = !this.modoComandoDireto;
        this.rl.prompt();
      }
    });
  };

  constructor(autenticacao: ServicoAutenticacao) {
    this.autenticacao = autenticacao;
    this.autorizacao = new ServicoAutorizacao(autenticacao);
  }

  async iniciarLoop(): Promise<void> {
    // O listener global só inicia o prompt customizado após a primeira seta.
    // No restante do tempo o readline persistente do GreenCode controla stdin.
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.on("keypress", this.manipuladorTeclaMenu);
      this.manipuladorTeclaRegistrado = true;
    }

    this.criarReadline();

    if (!this.autenticacao.estaProvisionado()) {
      await this.executarProvisionamento();
    }
    this.montarServicosDeNegocio();
    await this.fazerLogin();

    this.atualizarPrompt();
    this.rl!.on("line", this.manipuladorLinha);
    this.menuTecladoAtivo = Boolean(this.sessaoAtual && !this.modoComandoDireto);
    this.rl!.prompt();

  }

  private async executarProvisionamento(): Promise<void> {
    console.log(formatarMensagemTerminal("info", "Nenhuma configuração encontrada — iniciando provisionamento inicial."));
    const senha = await this.perguntarSenha("Defina a senha do administrador: ");
    this.autenticacao.provisionarInicial(senha, "admin");
    console.log(formatarMensagemTerminal("ok", "Provisionamento concluído. Faça login com o usuário 'admin'.") + "\n");
  }

  private montarServicosDeNegocio(): void {
    const repositorio = this.autenticacao.obterRepositorio()!;
    const chave = this.autenticacao.obterChave()!;
    const diretorioBase = this.autenticacao.obterDiretorioBase();

    this.organizacao = new ServicoOrganizacao(repositorio, diretorioBase, chave, this.autorizacao);
    this.lote = new ServicoLote(repositorio, diretorioBase, chave, this.autorizacao);
    this.equipamento = new ServicoEquipamentos(repositorio, diretorioBase, chave, this.autorizacao);
    this.parametros = new ServicoParametros(repositorio, diretorioBase, chave, this.autorizacao);
    this.auditoria = new ServicoAuditoria(diretorioBase, chave, this.autorizacao);
    this.relatorio = new ServicoRelatorios(this.lote, this.equipamento, this.autorizacao, this.organizacao, this.parametros);
  }

  private async fazerLogin(): Promise<void> {
    while (!this.sessaoAtual) {
      const usuario = await this.perguntar("Usuário: ");
      const senha = await this.perguntarSenha("Senha: ");
      try {
        this.sessaoAtual = this.autenticacao.login(usuario, senha);
        console.log("\n" + formatarMensagemTerminal("ok", `Bem-vindo(a), ${usuario}!`));
        this.modoComandoDireto = false;
        this.categoriaMenuAtual = null;
        this.exibirMenuPrincipal();
      } catch (erro) {
        console.log(formatarMensagemTerminal("erro", `Falha no login: ${(erro as Error).message}`) + "\n");
      }
    }
  }

  private atualizarPrompt(): void {
    if (!this.rl) return;
    // Um único prompt compacto; o seletor só aparece na renderização Inquirer
    // depois que a pessoa efetivamente pressiona ↑/↓.
    this.rl.setPrompt("<GreenCode> ");
  }

  private criarReadline(anexarManipuladorLinha = false): readline.Interface {
    const novaInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: (linha: string) => this.autocompletar(linha),
      history: this.carregarHistorico(),
      historySize: 200,
    } as readline.ReadLineOptions);
    this.rl = novaInterface;
    if (anexarManipuladorLinha) novaInterface.on("line", this.manipuladorLinha);
    novaInterface.on("close", () => {
      // Fechar a interface antiga para transferir stdin ao Inquirer não deve sair do processo.
      if (this.rl !== novaInterface) return;
      if (this.manipuladorTeclaRegistrado) {
        process.stdin.off("keypress", this.manipuladorTeclaMenu);
        this.manipuladorTeclaRegistrado = false;
      }
      console.log("\n" + estilizarTerminal("titulo", "Encerrando o greencode. Até mais!"));
      process.exit(0);
    });
    return novaInterface;
  }

  private async abrirMenuHibrido(): Promise<void> {
    const interfaceAnterior = this.rl;
    if (!interfaceAnterior || !this.sessaoAtual || !process.stdin.isTTY) {
      this.promptMenuEmAndamento = false;
      this.menuTecladoAtivo = Boolean(this.sessaoAtual && !this.modoComandoDireto);
      return;
    }

    try {
      // Apaga a linha de histórico que o readline normal pode ter inserido como
      // resposta à primeira seta; a seleção inicia no item calculado pela tecla.
      if (interfaceAnterior.line) interfaceAnterior.write(null, { ctrl: true, name: "u" });
      interfaceAnterior.removeListener("line", this.manipuladorLinha);
      this.rl = undefined;
      interfaceAnterior.close();
      process.stdout.write("\u001b[2J\u001b[H");

      const titulo = this.categoriaMenuAtual
        ? `GREENCODE | ${this.categoriaMenuAtual.titulo.toLocaleUpperCase("pt-BR")}`
        : "GREENCODE | MENU PRINCIPAL";
      const resultado = await solicitarMenuHibrido({
        titulo,
        opcoes: this.obterOpcoesMenuTeclado(),
        indiceInicial: this.indiceMenuSelecionado,
        autocompletar: (linha) => this.autocompletar(linha),
      });

      if (resultado.tipo === "entrada") this.registrarHistoricoExterno(resultado.texto);
      // Recria a interface original antes de executar ações: assistente, senha,
      // confirmação s/N, histórico e autocomplete continuam usando o mesmo contrato.
      this.criarReadline(false);
      this.promptMenuEmAndamento = false;

      if (resultado.tipo === "selecao") {
        this.indiceMenuSelecionado = resultado.indice;
        await this.processarEscolhaTeclado();
      } else if (resultado.tipo === "entrada") {
        await this.processarEntrada(resultado.texto);
      } else if (resultado.tipo === "cancelado" || resultado.tipo === "vazio") {
        if (this.sessaoAtual) {
          if (this.categoriaMenuAtual) this.exibirSubmenuNumerico(this.categoriaMenuAtual);
          else this.exibirMenuPrincipal();
        }
      }
    } catch (erro) {
      // A falha do prompt não deve deixar stdin sem leitor nem encerrar a CLI.
      this.mensagem("erro", `Falha no menu interativo: ${(erro as Error).message}`);
      if (!this.rl) this.criarReadline(false);
      this.promptMenuEmAndamento = false;
      if (this.sessaoAtual) {
        if (this.categoriaMenuAtual) this.exibirSubmenuNumerico(this.categoriaMenuAtual);
        else this.exibirMenuPrincipal();
      }
    } finally {
      if (this.rl && this.sessaoAtual) {
        this.rl.removeListener("line", this.manipuladorLinha);
        this.rl.on("line", this.manipuladorLinha);
        this.atualizarPrompt();
        this.menuTecladoAtivo = !this.modoComandoDireto;
        this.rl.prompt();
      }
      this.promptMenuEmAndamento = false;
    }
  }

  private registrarHistoricoExterno(entrada: string): void {
    const valor = entrada.trim();
    if (!valor) return;
    const anterior = this.carregarHistorico().filter((item) => item !== valor);
    const novo = [valor, ...anterior].slice(0, 200);
    fs.mkdirSync(path.dirname(CAMINHO_HISTORICO), { recursive: true });
    fs.writeFileSync(CAMINHO_HISTORICO, novo.join("\n"), "utf8");
  }

  private obterOpcoesMenuTeclado(): Array<{ titulo: string; numero: number }> {
    if (!this.sessaoAtual) return [];

    if (this.categoriaMenuAtual) {
      return [
        ...this.categoriaMenuAtual.comandos.map((comando, indice) => ({ titulo: comando, numero: indice + 1 })),
        { titulo: "Voltar ao menu principal", numero: 0 },
      ];
    }

    const categorias = this.obterCategoriasMenu();
    return [
      ...categorias.map((categoria, indice) => ({ titulo: categoria.titulo, numero: indice + 1 })),
      { titulo: "Resumo operacional", numero: categorias.length + 1 },
      { titulo: "Ajuda e lista de comandos", numero: categorias.length + 2 },
      { titulo: "Encerrar sessão", numero: categorias.length + 3 },
      { titulo: "Modo de comandos diretos", numero: 0 },
    ];
  }

  private async processarEscolhaTeclado(): Promise<void> {
    const opcoes = this.obterOpcoesMenuTeclado();
    const numero = numeroDaOpcaoSelecionada(this.indiceMenuSelecionado, opcoes.map((opcao) => opcao.numero));
    if (numero === undefined) {
      this.mensagem("aviso", "Nenhuma opção de menu está selecionada.");
      return;
    }
    await this.processarEscolhaNumerica(numero);
  }

  private redesenharPromptTerminal(): void {
    if (!this.rl || !process.stdout.isTTY) return;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    this.rl.prompt(true);
  }

  private obterComandosPermitidosNaCli(): string[] {
    const papel = this.sessaoAtual!.obterPapel();
    return this.autorizacao.obterComandosPermitidos(papel);
  }

  private obterCategoriasMenu(): CategoriaMenuNumerico[] {
    const permitidos = new Set(this.obterComandosPermitidosNaCli());
    return GRUPOS_MENU_NUMERICO.map((grupo) => ({
      id: grupo.id,
      titulo: grupo.titulo,
      comandos: [...COMANDOS_REGISTRADOS]
        .filter((definicao) => permitidos.has(definicao.comando)
          && grupo.prefixos.some((prefixo) => definicao.comando.startsWith(prefixo)))
        .map((definicao) => definicao.comando),
    })).filter((grupo) => grupo.comandos.length > 0);
  }

  private exibirMenuPrincipal(): void {
    if (!this.sessaoAtual) return;
    this.categoriaMenuAtual = null;
    this.indiceMenuSelecionado = 0;
    const categorias = this.obterCategoriasMenu();
    console.log("\n" + estilizarTerminal("titulo", "========== GREENCODE | MENU PRINCIPAL =========="));
    for (const [indice, categoria] of categorias.entries()) {
      console.log(`  ${indice + 1}. ${categoria.titulo}`);
    }
    console.log(`  ${categorias.length + 1}. Resumo operacional`);
    console.log(`  ${categorias.length + 2}. Ajuda e lista de comandos`);
    console.log(`  ${categorias.length + 3}. Encerrar sessão`);
    console.log("  0. Modo de comandos diretos");
    console.log("Use ↑/↓ para ativar o seletor; número + Enter ou comando digitado continuam disponíveis.");
  }

  private exibirSubmenuNumerico(categoria: CategoriaMenuNumerico): void {
    this.categoriaMenuAtual = categoria;
    this.indiceMenuSelecionado = 0;
    console.log("\n" + estilizarTerminal("titulo", `========== ${categoria.titulo.toLocaleUpperCase("pt-BR")} ==========`));
    for (const [indice, comando] of categoria.comandos.entries()) {
      const descricao = COMANDOS_REGISTRADOS.find((item) => item.comando === comando)?.descricao;
      console.log(`  ${indice + 1}. ${comando}${descricao ? ` — ${descricao}` : ""}`);
    }
    console.log("  0. Voltar ao menu principal");
    console.log("Use ↑/↓ para ativar o seletor; número + Enter ou comando digitado continuam disponíveis.");
  }

  private async processarEntrada(entradaBruta: string): Promise<void> {
    const entrada = entradaBruta.trim();
    if (!entrada) return;

    if (entrada.toLocaleLowerCase("pt-BR") === "menu") {
      this.modoComandoDireto = false;
      this.exibirMenuPrincipal();
      return;
    }

    if (!this.modoComandoDireto && /^\d+$/.test(entrada)) {
      await this.processarEscolhaNumerica(Number(entrada));
      return;
    }

    const estavaNoMenu = !this.modoComandoDireto;
    await this.processarComando(entrada);
    if (estavaNoMenu && this.sessaoAtual) {
      this.exibirMenuPrincipal();
    }
  }

  private async processarEscolhaNumerica(numero: number): Promise<void> {
    if (!this.sessaoAtual) return;

    if (this.modoComandoDireto) {
      if (numero === 0) {
        this.modoComandoDireto = false;
        this.exibirMenuPrincipal();
      } else {
        console.log(formatarMensagemTerminal("info", "No modo direto, digite um comando ou use 'menu' para voltar à navegação numérica."));
      }
      return;
    }

    if (this.categoriaMenuAtual) {
      if (numero === 0) {
        this.exibirMenuPrincipal();
        return;
      }
      const comando = this.categoriaMenuAtual.comandos[numero - 1];
      if (!comando) {
        console.log(formatarMensagemTerminal("aviso", "Opção inválida. Escolha um número exibido no menu."));
        this.exibirSubmenuNumerico(this.categoriaMenuAtual);
        return;
      }
      this.categoriaMenuAtual = null;
      await this.executarComandoGuiado(comando);
      if (this.sessaoAtual) this.exibirMenuPrincipal();
      return;
    }

    const categorias = this.obterCategoriasMenu();
    if (numero === 0) {
      this.modoComandoDireto = true;
      this.categoriaMenuAtual = null;
      console.log(formatarMensagemTerminal("info", "Modo de comandos diretos ativado. Digite 'menu' para voltar à navegação numérica."));
      return;
    }
    if (numero >= 1 && numero <= categorias.length) {
      this.exibirSubmenuNumerico(categorias[numero - 1]);
      return;
    }
    if (numero === categorias.length + 1) {
      this.exibirResumo();
      this.exibirMenuPrincipal();
      return;
    }
    if (numero === categorias.length + 2) {
      this.exibirMenuPorPapel(this.sessaoAtual.obterPapel());
      this.exibirMenuPrincipal();
      return;
    }
    if (numero === categorias.length + 3) {
      await this.processarComando("logout");
      return;
    }
    console.log(formatarMensagemTerminal("aviso", "Opção inválida. Escolha um número exibido no menu."));
    this.exibirMenuPrincipal();
  }

  private async executarComandoGuiado(comando: string): Promise<void> {
    const permitidos = this.obterComandosPermitidosNaCli();
    if (!permitidos.includes(comando)) {
      console.log(formatarMensagemTerminal("erro", `Comando "${comando}" não permitido para o seu papel.`));
      return;
    }

    const campos = CAMPOS_MENU_NUMERICO[comando] ?? (COMANDOS_REGISTRADOS
      .find((definicao) => definicao.comando === comando)?.flagsObrigatorias ?? [])
      .map((flag) => ({ flag, pergunta: `Valor para --${flag}`, obrigatorio: true }));
    const flags: Record<string, string> = {};
    console.log(`\nAssistente: ${comando}. Pressione Enter nos campos opcionais para ignorá-los; digite !cancelar para voltar.`);

    for (const campo of campos) {
      const detalheOpcoes = campo.opcoes
        ? `\n    ${campo.opcoes.map((opcao, indice) => `${indice + 1}. ${opcao}`).join("\n    ")}\n    Digite o número ou o valor exato.`
        : campo.booleano ? "\n    1. Sim\n    2. Não" : "";
      const sufixo = campo.obrigatorio ? " (obrigatório)" : " (opcional; Enter para pular)";
      let valor = "";
      while (true) {
        valor = (await this.perguntar(`${campo.pergunta}${sufixo}${detalheOpcoes}: `)).trim();
        if (valor.toLocaleLowerCase("pt-BR") === "!cancelar") {
          console.log(formatarMensagemTerminal("info", "Operação cancelada; nenhum comando foi executado."));
          return;
        }
        if (campo.booleano) {
          if (!valor && !campo.obrigatorio) break;
          const normalizado = valor.toLocaleLowerCase("pt-BR");
          if (["s", "sim", "y", "yes", "true", "1"].includes(normalizado)) {
            valor = "true";
            break;
          }
          if (["n", "não", "nao", "no", "false", "2"].includes(normalizado)) {
            valor = "false";
            break;
          }
          console.log(formatarMensagemTerminal("aviso", "Informe 1 para sim ou 2 para não."));
          continue;
        }
        if (campo.obrigatorio && !valor) {
          console.log(formatarMensagemTerminal("aviso", "Este campo é obrigatório."));
          continue;
        }
        if (!valor) break;
        if (campo.opcoes) {
          if (/^\d+$/.test(valor)) {
            const selecionada = campo.opcoes[Number(valor) - 1];
            if (!selecionada) {
              console.log(formatarMensagemTerminal("aviso", `Escolha um número entre 1 e ${campo.opcoes.length}.`));
              continue;
            }
            valor = selecionada;
          } else if (!campo.opcoes.includes(valor)) {
            console.log(formatarMensagemTerminal("aviso", `Valor inválido. Escolha o número correspondente ou um destes valores: ${campo.opcoes.join(", ")}.`));
            continue;
          }
        }
        break;
      }
      if (!valor) continue;
      if (campo.incluirSomenteSeSim && valor !== "true") continue;
      flags[campo.flag] = valor;
    }

    console.log("\nConfira os dados informados:");
    if (Object.keys(flags).length === 0) console.log("  (nenhum campo adicional)");
    for (const [chave, valor] of Object.entries(flags)) console.log(`  --${chave}: ${valor}`);
    const partes = [comando];
    for (const [chave, valor] of Object.entries(flags)) {
      const escapado = valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      partes.push(`--${chave}`, `"${escapado}"`);
    }
    await this.processarComando(partes.join(" "));
  }

  // --- Lista de comandos para ajuda e modo direto ---
  exibirMenuPorPapel(papel: PapelUsuario): void {
    console.log(`Comandos disponíveis para ${papel}:`);
    console.log("  resumo — painel operacional com indicadores autorizados ao seu perfil");
    console.log("  ajuda <comando> — detalhes, campos e exemplo de um comando");
    for (const comando of [...COMANDOS_POR_PAPEL[papel], ...COMANDOS_GERAIS]) {
      const descricao = COMANDOS_REGISTRADOS.find((item) => item.comando === comando)?.descricao;
      console.log(`  - ${comando}${descricao ? ` — ${descricao}` : ""}`);
    }
    console.log("");
  }

  // --- Processamento de comando ---
  async processarComando(entradaBruta: string): Promise<void> {
    const entrada = entradaBruta.trim();
    if (!entrada) return;

    if (!this.sessaoAtual) {
      console.log(formatarMensagemTerminal("erro", "Nenhuma sessão ativa."));
      return;
    }

    if (!this.autenticacao.validarToken(this.sessaoAtual.obterToken())) {
      console.log(formatarMensagemTerminal("erro", "Sessão expirada. Encerrando."));
      this.sessaoAtual = null;
      this.rl?.close();
      return;
    }

    const { entidade, acao, flags } = interpretarComando(entrada);
    const comando = `${entidade} ${acao}`.trim();

    if (comando === "ajuda" || entidade === "ajuda") {
      const alvo = entrada.replace(/^ajuda\s*/i, "").trim();
      if (alvo) this.exibirAjudaComando(alvo);
      else this.exibirMenuPorPapel(this.sessaoAtual.obterPapel());
      return;
    }
    if (comando === "resumo") {
      this.exibirResumo();
      return;
    }
    if (comando === "logout") {
      this.autenticacao.logout(this.sessaoAtual.obterToken());
      console.log(formatarMensagemTerminal("info", "Sessão encerrada. Até logo!"));
      this.sessaoAtual = null;
      this.rl?.close();
      return;
    }

    const papel = this.sessaoAtual.obterPapel();
    try {
      this.autorizacao.exigirPermissaoPorPapel(papel, comando);
      // A confirmação é uma interação da CLI real. Chamadas programáticas a
      // processarComando (por exemplo, testes de integração) não possuem
      // readline; nesse contexto não devemos tentar ler uma resposta de um
      // prompt inexistente. A aplicação interativa sempre cria `this.rl` em
      // iniciarLoop(), portanto mantém a confirmação negativa por padrão.
      if (this.rl && this.acaoExigeConfirmacao(comando)) {
        const confirmacao = (await this.perguntar(`Confirma a operação "${comando}"? (s/N): `)).trim().toLocaleLowerCase("pt-BR");
        if (!["s", "sim", "y", "yes"].includes(confirmacao)) {
          this.mensagem("info", "Operação cancelada; nenhuma alteração foi feita.");
          return;
        }
      }
      await this.executarAcaoDeNegocio(comando, flags);
    } catch (erro) {
      this.mensagem("erro", (erro as Error).message);
    }
  }

  private readonly comandosCriticos = new Set([
    "usuario criar", "usuario atualizar", "usuario desativar", "usuario ativar", "usuario redefinir-senha",
    "org criar", "org atualizar", "org desativar", "org ativar", "org renovar-contrato",
    "contrato criar", "contrato atualizar", "contrato cancelar", "lote criar", "lote atualizar",
    "lote remover-equipamento", "lote desativar", "lote ativar", "lote triagem", "lote encaminhar", "lote finalizar",
    "equip cadastrar", "equip atualizar", "equip desativar", "equip ativar", "equip mover", "equip atualizar-estado",
    "parametro definir"
  ]);

  private acaoExigeConfirmacao(comando: string): boolean {
    return this.comandosCriticos.has(comando);
  }

  private mensagem(tipo: "ok" | "erro" | "aviso" | "info", texto: string): void {
    console.log(formatarMensagemTerminal(tipo, texto));
  }

  private exibirAjudaComando(alvo: string): void {
    const comando = COMANDOS_REGISTRADOS.find((item) => item.comando === alvo || item.comando.startsWith(`${alvo} `));
    if (!comando) {
      const sugestoes = COMANDOS_REGISTRADOS.filter((item) => item.comando.includes(alvo)).slice(0, 5);
      this.mensagem("aviso", `Comando não encontrado: ${alvo}.`);
      if (sugestoes.length) console.log(`Sugestões: ${sugestoes.map((item) => item.comando).join(", ")}`);
      console.log(formatarMensagemTerminal("info", "Use 'ajuda' para ver os comandos permitidos para seu perfil."));
      return;
    }
    const campos = CAMPOS_MENU_NUMERICO[comando.comando] ?? [];
    console.log(`\n${estilizarTerminal("titulo", comando.comando)}\n${comando.descricao}`);
    console.log(`Perfil(s): ${comando.papeis.join(", ") || "conforme regra de autorização"}`);
    if (campos.length) console.log(`Campos do assistente: ${campos.map((campo) => `--${campo.flag}${campo.obrigatorio ? " (obrigatório)" : ""}`).join(", ")}`);
    const exemplos: Record<string, string> = {
      "usuario listar": 'usuario listar --busca "Ana Silva" --papel OPERADOR_CADASTRO',
      "org listar": 'org listar --busca "GreenCode Teste"',
      "org criar": 'org criar --id org-exemplo --razao "GreenCode Teste" --cnpj 11222333000181',
      "contrato listar": 'contrato listar --org org-exemplo --status ativo --de 2026-01-01 --ate 2026-12-31',
      "lote listar": 'lote listar --busca "NF 2026" --org org-exemplo --status RECEBIDO',
      "equip listar": 'equip listar --busca "Dell Latitude" --tipo NOTEBOOK --status AGUARDANDO_TRIAGEM',
    };
    console.log(`Exemplo: ${exemplos[comando.comando] ?? `${comando.comando}${(comando.flagsObrigatorias ?? []).map((flag) => ` --${flag} <valor>`).join("")}`}`);
    console.log('Valores de texto com espaços devem ficar entre aspas duplas, por exemplo --razao "GreenCode Teste".');
    console.log("No menu, selecione a categoria e a operação para preencher os campos passo a passo. Use !cancelar durante o assistente.");
  }

  private exibirResumo(): void {
    const usuario = this.sessaoAtual!.obterUsuario();
    console.log("\n" + estilizarTerminal("titulo", "========== GREENCODE | RESUMO OPERACIONAL =========="));
    console.log(`Perfil: ${this.sessaoAtual!.obterPapel()} | Usuário: ${usuario}`);
    let viuDados = false;
    try {
      const equipamentos = this.equipamento!.listarEquipamentosComFiltros(usuario);
      viuDados = true;
      console.log(`\nEquipamentos ativos: ${equipamentos.length}`);
      for (const status of Object.values(StatusRastreamento)) {
        const quantidade = equipamentos.filter((item) => item.statusRastreamento === status).length;
        if (quantidade) console.log(`  ${status}: ${quantidade}`);
      }
      console.log(`Peso total cadastrado: ${equipamentos.reduce((total, item) => total + item.pesoQuilogramas, 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`);
    } catch { console.log(formatarMensagemTerminal("aviso", "Equipamentos: não disponíveis para este perfil.")); }
    try {
      const lotes = this.lote!.listarLotes(usuario).filter((lote) => lote.statusProcessamento !== "FINALIZADO");
      viuDados = true;
      console.log(`Lotes pendentes de finalização: ${lotes.length}`);
      for (const lote of lotes.slice(0, 5)) console.log(`  ${lote.id} — ${lote.statusProcessamento} — NF ${lote.notaFiscal}`);
      if (lotes.length > 5) console.log(`  ... e mais ${lotes.length - 5} lote(s)`);
    } catch { console.log(formatarMensagemTerminal("aviso", "Lotes: não disponíveis para este perfil.")); }
    try {
      const organizacoes = this.organizacao!.listarOrganizacoes(usuario, false);
      viuDados = true;
      const hoje = new Date();
      const limite = new Date(hoje); limite.setDate(limite.getDate() + 30);
      const contratos = organizacoes.flatMap((org) => org.contratos.map((contrato) => ({ org, contrato })))
        .filter(({ contrato }) => contrato.ativo && contrato.dataVencimento >= hoje && contrato.dataVencimento <= limite)
        .sort((a, b) => a.contrato.dataVencimento.getTime() - b.contrato.dataVencimento.getTime());
      console.log(`Contratos vencendo em até 30 dias: ${contratos.length}`);
      for (const { org, contrato } of contratos.slice(0, 5)) console.log(`  ${org.razaoSocial} — ${contrato.id} — vence ${contrato.dataVencimento.toISOString().slice(0, 10)}`);
    } catch { console.log(formatarMensagemTerminal("aviso", "Contratos: não disponíveis para este perfil.")); }
    if (!viuDados) console.log(formatarMensagemTerminal("info", "Nenhum indicador de negócio disponível para as permissões deste perfil."));
    console.log("\nDica: use 'ajuda <comando>' para ver descrição, campos e exemplo.");
  }

  private async executarAcaoDeNegocio(comando: string, flags: Record<string, string>): Promise<void> {
    const usuarioAtual = this.sessaoAtual!.obterUsuario();

    this.validarFlagsObrigatorias(comando, flags);

    switch (comando) {
      case "usuario criar": {
        if (flags.senha !== undefined) {
          throw new Error("Por segurança, não informe a senha diretamente em flags. Use o prompt de senha.");
        }

        const credencial = this.autenticacao.criarUsuario(
          flags.usuario ?? "",
          await this.perguntarSenha("Senha do novo usuário: "),
          flags.papel as PapelUsuario,
          usuarioAtual,
          flags.nome ?? flags.usuario ?? ""
        );
        console.log(formatarMensagemTerminal("ok", `Usuário criado: ${credencial.obterUsuario()} (${flags.papel})`));
        return;
      }

      case "usuario listar": {
        const busca = obterBuscaCLI(flags.busca);
        const papel = flags.papel !== undefined ? this.obterValorEnum(flags.papel, "papel", PapelUsuario) : undefined;
        const usuarios = this.autenticacao.listarUsuarios(usuarioAtual)
          .filter((usuario) => flags.todos !== undefined || usuario.estaAtiva())
          .filter((usuario) => correspondeBuscaCLI(busca, usuario.obterUsuario(), usuario.obterNome()))
          .filter((usuario) => !papel || usuario.obterPapel() === papel);
        const filtros = [
          busca ? `busca=${flags.busca.trim()}` : undefined,
          papel ? `papel=${papel}` : undefined,
          flags.todos !== undefined ? "inativos incluídos" : undefined,
        ];
        console.log(formatarListagemCLI(
          tituloComFiltrosCLI("Usuários", filtros),
          usuarios,
          (usuario) => `${usuario.obterUsuario()} — ${usuario.obterNome()} — ${usuario.obterPapel()} — ${usuario.estaAtiva() ? "ATIVO" : "INATIVO"}`,
          flags.todos !== undefined
            ? "Nenhum usuário encontrado com os filtros informados."
            : "Nenhum usuário ativo encontrado com os filtros informados. Use --todos para incluir usuários inativos."
        ));
        return;
      }

      case "usuario buscar": {
        const usuario = this.autenticacao.buscarUsuario(flags.usuario ?? "", usuarioAtual);
        console.log(`${usuario.obterUsuario()} — ${usuario.obterNome()} — ${usuario.obterPapel()} — ${usuario.estaAtiva() ? "ATIVO" : "INATIVO"}`);
        return;
      }

      case "usuario atualizar": {
        this.autenticacao.atualizarUsuario(flags.usuario ?? "", flags.nome ?? "", flags.papel as PapelUsuario, usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Usuário atualizado."));
        return;
      }

      case "usuario desativar": {
        this.autenticacao.desativarUsuario(flags.usuario ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Usuário desativado; sessões existentes invalidadas."));
        return;
      }

      case "usuario ativar": {
        this.autenticacao.ativarUsuario(flags.usuario ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Usuário ativado."));
        return;
      }

      case "usuario redefinir-senha": {
        if (flags.senha !== undefined) throw new Error("Por segurança, não informe a senha em uma flag. Use o prompt de senha.");
        const senha = await this.perguntarSenha("Nova senha do usuário: ");
        this.autenticacao.redefinirSenha(flags.usuario ?? "", senha, usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Senha redefinida; sessões anteriores invalidadas."));
        return;
      }

      case "senha alterar": {
        if (flags.antiga !== undefined || flags.nova !== undefined) {
          throw new Error("Por segurança, não informe senhas diretamente como flags. Use: senha alterar");
        }

        const senhaAntiga = await this.perguntarSenha("Senha atual: ");
        const senhaNova = await this.perguntarSenha("Nova senha: ");
        const sucesso = this.autenticacao.alterarSenha(usuarioAtual, senhaAntiga, senhaNova);
        if (!sucesso) {
          throw new Error("Senha antiga incorreta ou usuário não encontrado.");
        }
        console.log(formatarMensagemTerminal("ok", "Senha alterada com sucesso."));
        return;
      }

      case "org criar": {

        const contrato = flags["contrato-id"]
          ? {
              id: flags["contrato-id"],
              dataVencimento: this.obterData(flags["contrato-vencimento"], "contrato-vencimento") ?? new Date(),
              valorMensal: Number(flags["contrato-valor"] ?? 0),
              clausulas: flags["contrato-clausulas"]?.split(",") ?? [],
              renovacaoAutomatica: flags["contrato-renovacao-automatica"] === "true",
            }
          : undefined;

        const organizacao = this.organizacao!.cadastrarOrganizacao(
          {
            id: flags.id ?? `org-${Date.now()}`,
            razaoSocial: flags.razao ?? "",
            cnpj: flags.cnpj ?? "",
            inscricaoEstadual: flags.ie ?? "",
            enderecoCompleto: flags.endereco ?? "",
            telefone: flags.telefone ?? "",
            email: flags.email ?? "",
            contrato,
          },
          usuarioAtual
        );
        console.log(formatarMensagemTerminal("ok", `Organização criada: ${organizacao.id} — ${organizacao.razaoSocial}`));
        return;
      }

      case "org listar": {
        const busca = obterBuscaCLI(flags.busca);
        const organizacoes = this.organizacao!.listarOrganizacoes(usuarioAtual, flags.todos !== undefined)
          .filter((org) => correspondeBuscaCLI(busca, org.id, org.razaoSocial, org.cnpj, org.inscricaoEstadual, org.enderecoCompleto, org.telefone, org.email));
        const filtros = [
          busca ? `busca=${flags.busca.trim()}` : undefined,
          flags.todos !== undefined ? "inativas incluídas" : undefined,
        ];
        console.log(formatarListagemCLI(
          tituloComFiltrosCLI("Organizações", filtros),
          organizacoes,
          (org) => `${org.id} — ${org.razaoSocial} — ${org.ativo ? "ATIVA" : "INATIVA"}`,
          flags.todos !== undefined
            ? "Nenhuma organização encontrada com os filtros informados."
            : "Nenhuma organização ativa encontrada com os filtros informados. Use --todos para incluir organizações inativas."
        ));
        return;
      }

      case "org buscar": {
        const org = this.organizacao!.obterOrganizacao(flags.id ?? "", usuarioAtual);
        console.log(`Organização ${org.id} — ${org.razaoSocial} — ${org.ativo ? "ATIVA" : "INATIVA"}`);
        console.log(`CNPJ: ${org.cnpj} | IE: ${org.inscricaoEstadual} | Endereço: ${org.enderecoCompleto}`);
        console.log(`Telefone: ${org.telefone} | E-mail: ${org.email}`);
        console.log(`Contrato atual: ${org.contratoVigente ? `${org.contratoVigente.id} — R$ ${org.contratoVigente.valorMensal.toFixed(2)} — vence ${org.contratoVigente.dataVencimento.toISOString().slice(0,10)}` : "nenhum"}`);
        console.log(`Contratos no histórico: ${org.contratos.length}`);
        return;
      }

      case "org atualizar": {
        const campos: Record<string, string> = {};
        if (flags.razao !== undefined) campos.razaoSocial = flags.razao;
        if (flags.ie !== undefined) campos.inscricaoEstadual = flags.ie;
        if (flags.endereco !== undefined) campos.enderecoCompleto = flags.endereco;
        if (flags.telefone !== undefined) campos.telefone = flags.telefone;
        if (flags.email !== undefined) campos.email = flags.email;
        if (Object.keys(campos).length === 0) throw new Error("Informe ao menos um campo: --razao, --ie, --endereco, --telefone ou --email.");
        this.organizacao!.atualizarOrganizacao(flags.id ?? "", campos as any, usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Organização atualizada."));
        return;
      }

      case "org desativar": {
        this.organizacao!.desativarOrganizacao(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Organização desativada."));
        return;
      }

      case "org ativar": {
        this.organizacao!.ativarOrganizacao(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Organização ativada."));
        return;
      }

      case "org renovar-contrato": {
        this.organizacao!.renovarContrato(flags.id ?? "", this.obterData(flags.data, "data") ?? new Date(), usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Contrato renovado."));
        return;
      }

      case "contrato listar": {
        const statusRaw = flags.status?.trim().toLocaleLowerCase("pt-BR");
        if (flags.status !== undefined && !["ativo", "cancelado"].includes(statusRaw ?? "")) {
          throw new Error("O parâmetro --status de contrato aceita apenas ativo ou cancelado.");
        }
        const de = this.obterData(flags.de, "de");
        const ate = this.obterData(flags.ate, "ate");
        const ateInclusivo = ate ? new Date(ate.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;
        const contratosPorStatus = this.organizacao!.listarContratos(flags.org ?? "", usuarioAtual)
          .filter((contrato) => !statusRaw || (statusRaw === "ativo" ? contrato.ativo : !contrato.ativo));
        const contratos = filtrarPorPeriodo(
          contratosPorStatus,
          (contrato) => contrato.dataVencimento,
          de,
          ateInclusivo,
          "O parâmetro --de não pode ser posterior ao parâmetro --ate."
        );
        const filtros = [
          statusRaw ? `status=${statusRaw}` : undefined,
          flags.de ? `vencimento a partir de=${flags.de}` : undefined,
          flags.ate ? `vencimento até=${flags.ate}` : undefined,
        ];
        console.log(formatarListagemCLI(
          tituloComFiltrosCLI(`Contratos da organização ${flags.org ?? ""}`, filtros),
          contratos,
          (contrato) => `${contrato.id} — ${contrato.ativo ? "ATIVO" : "CANCELADO"} — ${this.formatarMoeda(contrato.valorMensal)}/mês — vence ${contrato.dataVencimento.toISOString().slice(0, 10)}${contrato.dataCancelamento ? ` — cancelado ${contrato.dataCancelamento.toISOString().slice(0, 10)}` : ""}`,
          "Nenhum contrato encontrado com os filtros informados para esta organização."
        ));
        return;
      }

      case "contrato buscar": {
        const contrato = this.organizacao!.obterContrato(flags.org ?? "", flags.id ?? "", usuarioAtual);
        console.log(`Contrato ${contrato.id} — ${contrato.ativo ? "ATIVO" : "CANCELADO"}`);
        console.log(`Organização: ${contrato.organizacaoId} | Valor mensal: ${this.formatarMoeda(contrato.valorMensal)}`);
        console.log(`Assinatura: ${contrato.dataAssinatura.toISOString().slice(0, 10)} | Vencimento: ${contrato.dataVencimento.toISOString().slice(0, 10)}`);
        console.log(`Renovação automática: ${contrato.renovacaoAutomatica ? "sim" : "não"} | Cláusulas: ${contrato.clausulas.join(", ") || "nenhuma"}`);
        console.log(`Data de cancelamento: ${contrato.dataCancelamento?.toISOString().slice(0, 10) ?? "—"}`);
        return;
      }

      case "contrato criar": {
        const vencimento = this.obterData(flags.vencimento, "vencimento");
        if (!vencimento) throw new Error("Informe --vencimento YYYY-MM-DD.");
        const valor = Number(flags.valor);
        this.organizacao!.criarContrato(flags.org ?? "", {
          id: flags.id ?? "", dataVencimento: vencimento, valorMensal: valor,
          clausulas: flags.clausulas?.split(",").map((item) => item.trim()).filter(Boolean),
          renovacaoAutomatica: flags["renovacao-automatica"] === "true",
        }, usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Contrato criado e vinculado à organização."));
        return;
      }

      case "contrato atualizar": {
        const campos: { dataVencimento?: Date; valorMensal?: number; clausulas?: string[]; renovacaoAutomatica?: boolean } = {};
        if (flags.vencimento !== undefined) {
          const vencimento = this.obterData(flags.vencimento, "vencimento");
          if (!vencimento) throw new Error("Informe --vencimento YYYY-MM-DD.");
          campos.dataVencimento = vencimento;
        }
        if (flags.valor !== undefined) campos.valorMensal = Number(flags.valor);
        if (flags.clausulas !== undefined) campos.clausulas = flags.clausulas.split(",").map((item) => item.trim()).filter(Boolean);
        if (flags["renovacao-automatica"] !== undefined) {
          if (!["true", "false"].includes(flags["renovacao-automatica"])) throw new Error("--renovacao-automatica deve ser true ou false.");
          campos.renovacaoAutomatica = flags["renovacao-automatica"] === "true";
        }
        if (!Object.keys(campos).length) throw new Error("Informe ao menos um campo: --vencimento, --valor, --clausulas ou --renovacao-automatica.");
        this.organizacao!.atualizarContrato(flags.org ?? "", flags.id ?? "", campos, usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Contrato atualizado."));
        return;
      }

      case "contrato cancelar": {
        this.organizacao!.cancelarContrato(flags.org ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Contrato cancelado; histórico preservado."));
        return;
      }

      case "lote criar": {
        const lote = this.lote!.criarLote(
          {
            id: flags.id ?? `lote-${Date.now()}`,
            organizacaoId: flags.org ?? "",
            notaFiscal: flags.nf ?? "",
            transportadora: flags.transp ?? "",
          },
          usuarioAtual
        );
        console.log(formatarMensagemTerminal("ok", `Lote criado: ${lote.id}`));
        return;
      }

      case "lote listar": {
        const busca = obterBuscaCLI(flags.busca);
        const status = flags.status !== undefined ? this.obterValorEnum(flags.status, "status", StatusLote) : undefined;
        const lotes = this.lote!.listarLotes(usuarioAtual, flags.todos !== undefined)
          .filter((lote) => correspondeBuscaCLI(busca, lote.id, lote.notaFiscal, lote.transportadora, lote.organizacaoId))
          .filter((lote) => !flags.org || lote.organizacaoId === flags.org)
          .filter((lote) => !status || lote.statusProcessamento === status);
        const filtros = [
          busca ? `busca=${flags.busca.trim()}` : undefined,
          flags.org ? `organização=${flags.org}` : undefined,
          status ? `status=${status}` : undefined,
          flags.todos !== undefined ? "inativos incluídos" : undefined,
        ];
        console.log(formatarListagemCLI(
          tituloComFiltrosCLI("Lotes", filtros),
          lotes,
          (lote) => `${lote.id} — org ${lote.organizacaoId} — NF ${lote.notaFiscal} — ${lote.statusProcessamento} — ${lote.ativo ? "ATIVO" : "INATIVO"}`,
          flags.todos !== undefined
            ? "Nenhum lote encontrado com os filtros informados."
            : "Nenhum lote ativo encontrado com os filtros informados. Use --todos para incluir lotes inativos."
        ));
        return;
      }

      case "lote buscar": {
        const lote = this.lote!.obterLote(flags.id ?? "", usuarioAtual);
        console.log(`Lote ${lote.id} — ${lote.ativo ? "ATIVO" : "INATIVO"} — ${lote.statusProcessamento}`);
        console.log(`Organização: ${lote.organizacaoId} | NF: ${lote.notaFiscal} | Transportadora: ${lote.transportadora}`);
        console.log(`Entrada: ${lote.dataEntrada.toISOString()} | Equipamentos: ${lote.equipamentos.length} | Peso: ${lote.calcularPesoTotal()} kg`);
        console.log(`Observações: ${lote.observacoes}`);
        return;
      }

      case "lote atualizar": {
        const campos: Record<string, string> = {};
        if (flags.nf !== undefined) campos.notaFiscal = flags.nf;
        if (flags.transp !== undefined) campos.transportadora = flags.transp;
        if (flags.observacoes !== undefined) campos.observacoes = flags.observacoes;
        if (!Object.keys(campos).length) throw new Error("Informe ao menos um campo: --nf, --transp ou --observacoes.");
        this.lote!.atualizarLote(flags.id ?? "", campos as any, usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Lote atualizado."));
        return;
      }

      case "lote remover-equipamento": {
        this.lote!.removerEquipamento(flags.id ?? "", flags.equipamento ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Equipamento desvinculado; cadastro e histórico preservados."));
        return;
      }

      case "lote desativar": {
        this.lote!.desativarLote(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Lote desativado."));
        return;
      }

      case "lote ativar": {
        this.lote!.ativarLote(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Lote ativado."));
        return;
      }

      case "lote triagem": {
        this.lote!.processarTriagem(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Triagem processada."));
        return;
      }

      case "lote encaminhar": {
        this.lote!.encaminharLote(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Lote encaminhado."));
        return;
      }

      case "lote finalizar": {
        this.lote!.finalizarLote(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Lote finalizado."));
        return;
      }

      case "lote consultar-periodo": {
        const lotes = this.lote!.consultarLotePorPeriodo(
          this.obterData(flags.inicio, "inicio") ?? new Date(0),
          this.obterData(flags.fim, "fim") ?? new Date(),
          usuarioAtual
        );
        console.log(formatarListagemCLI(
          "Lotes no período informado",
          lotes,
          (lote) => `${lote.id} — NF ${lote.notaFiscal}`,
          "Nenhum lote encontrado no período informado."
        ));
        return;
      }

      case "equip cadastrar": {

        const equipamento = new Equipamento(
          flags.id ?? `equip-${Date.now()}`,
          flags.codigo ?? this.equipamento!.gerarCodigoBarras(this.obterValorEnum(flags.tipo, "tipo", TipoEquipamento), Number(flags.seq ?? 1), usuarioAtual),
          this.obterValorEnum(flags.tipo, "tipo", TipoEquipamento),
          flags.marca ?? "",
          flags.modelo ?? "",
          Number(flags.ano ?? new Date().getFullYear()),
          this.obterValorEnum(flags.estado, "estado", EstadoFisico),
          Number(flags.peso ?? 0),
          Number(flags["valor-aquisicao"] ?? 0)
        );

        this.lote!.adicionarEquipamentoLote(flags.lote ?? "", equipamento, usuarioAtual);
        console.log(formatarMensagemTerminal("ok", `Equipamento cadastrado: ${equipamento.id} (código ${equipamento.codigoBarrasInterno}), vinculado ao lote ${flags.lote}.`));
        return;
      }

      case "equip listar": {
        const busca = obterBuscaCLI(flags.busca);
        const tipo = flags.tipo !== undefined ? this.obterValorEnum(flags.tipo, "tipo", TipoEquipamento) : undefined;
        const status = flags.status !== undefined ? this.obterValorEnum(flags.status, "status", StatusRastreamento) : undefined;
        const equipamentos = this.equipamento!.listarEquipamentosComFiltros(usuarioAtual, {
          lote: flags.lote, tipo, status, incluirInativos: flags.todos !== undefined,
        }).filter((equip) => correspondeBuscaCLI(
          busca, equip.id, equip.codigoBarrasInterno, equip.tipo, equip.marca, equip.modelo, equip.loteId, equip.statusRastreamento
        ));
        const filtros = [
          busca ? `busca=${flags.busca.trim()}` : undefined,
          flags.lote ? `lote=${flags.lote}` : undefined,
          tipo ? `tipo=${tipo}` : undefined,
          status ? `status=${status}` : undefined,
          flags.todos !== undefined ? "inativos incluídos" : undefined,
        ];
        console.log(formatarListagemCLI(
          tituloComFiltrosCLI("Equipamentos", filtros),
          equipamentos,
          (equip) => `${equip.id} — ${equip.tipo} — ${equip.marca} ${equip.modelo} — ${equip.statusRastreamento} — lote ${equip.loteId || "sem vínculo"} — ${equip.ativo ? "ATIVO" : "INATIVO"} — aquisição ${this.formatarMoeda(equip.valorAquisicao)}`,
          "Nenhum equipamento encontrado com os filtros informados."
        ));
        return;
      }

      case "equip buscar": {
        this.autorizacao.exigirPermissao(usuarioAtual, "equip buscar");
        const equip = this.equipamento!.obterEquipamento(flags.id ?? "");
        console.log(`Equipamento ${equip.id} — ${equip.ativo ? "ATIVO" : "INATIVO"}`);
        console.log(`Código: ${equip.codigoBarrasInterno} | Tipo: ${equip.tipo} | Marca/modelo: ${equip.marca} ${equip.modelo}`);
        console.log(`Ano: ${equip.anoFabricacao} | Estado: ${equip.estadoFisico} | Peso: ${equip.pesoQuilogramas} kg | Aquisição: ${this.formatarMoeda(equip.valorAquisicao)}`);
        console.log(`Lote: ${equip.loteId || "sem vínculo"} | Status: ${equip.statusRastreamento} | Movimentações: ${equip.historicoMovimentacao.length}`);
        return;
      }

      case "equip atualizar": {
        const campos: Record<string, number | string> = {};
        if (flags.marca !== undefined) campos.marca = flags.marca;
        if (flags.modelo !== undefined) campos.modelo = flags.modelo;
        if (flags.ano !== undefined) campos.anoFabricacao = Number(flags.ano);
        if (flags.peso !== undefined) campos.pesoQuilogramas = Number(flags.peso);
        if (flags["valor-aquisicao"] !== undefined) campos.valorAquisicao = Number(flags["valor-aquisicao"]);
        if (!Object.keys(campos).length) throw new Error("Informe ao menos um campo: --marca, --modelo, --ano, --peso ou --valor-aquisicao.");
        this.equipamento!.atualizarEquipamento(flags.id ?? "", campos as any, usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Equipamento atualizado."));
        return;
      }

      case "equip desativar": {
        this.equipamento!.desativarEquipamento(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Equipamento desativado; histórico preservado."));
        return;
      }

      case "equip ativar": {
        this.equipamento!.ativarEquipamento(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Equipamento ativado."));
        return;
      }

      case "equip mover": {
        this.equipamento!.registrarMovimentacao(flags.id ?? "", flags.destino ?? "", usuarioAtual, flags.obs ?? "");
        console.log(formatarMensagemTerminal("ok", "Movimentação registrada."));
        return;
      }

      case "equip codigo-barras": {
        const codigo = this.equipamento!.gerarCodigoBarras(this.obterValorEnum(flags.tipo, "tipo", TipoEquipamento), Number(flags.seq ?? 1), usuarioAtual);
        console.log(formatarMensagemTerminal("ok", `Código gerado: ${codigo}`));
        return;
      }

      case "equip rastrear": {
        const historico = this.equipamento!.rastrearEquipamento(flags.id ?? "", usuarioAtual);
        console.log(formatarMensagemTerminal("ok", `${historico.equipamento.id}: ${historico.movimentacoes.length} movimentação(ões) registrada(s).`));
        return;
      }

      case "equip atualizar-estado": {

        this.equipamento!.atualizarEstadoFisico(
          flags.id ?? "",
          this.obterValorEnum(flags.estado, "estado", EstadoFisico),
          flags.justificativa ?? "",
          usuarioAtual
        );
        console.log(formatarMensagemTerminal("ok", `Estado físico atualizado para ${flags.estado}.`));
        return;
      }

      case "parametro listar": {
        const parametros = this.parametros!.listar(usuarioAtual);
        console.log(`aliquotaImpostoPercentual: ${parametros.aliquotaImpostoPercentual.toFixed(2)}%`);
        console.log(`taxaDepreciacaoAnualPercentual: ${parametros.taxaDepreciacaoAnualPercentual.toFixed(2)}%`);
        return;
      }

      case "parametro definir": {
        const nomes: (keyof ParametrosGlobais)[] = ["aliquotaImpostoPercentual", "taxaDepreciacaoAnualPercentual"];
        if (!nomes.includes(flags.nome as keyof ParametrosGlobais)) throw new Error(`Nome inválido. Use: ${nomes.join(", ")}.`);
        const atualizados = this.parametros!.definir(flags.nome as keyof ParametrosGlobais, Number(flags.valor), usuarioAtual);
        console.log(formatarMensagemTerminal("ok", "Parâmetro atualizado."));
        console.log(`aliquotaImpostoPercentual: ${atualizados.aliquotaImpostoPercentual.toFixed(2)}%`);
        console.log(`taxaDepreciacaoAnualPercentual: ${atualizados.taxaDepreciacaoAnualPercentual.toFixed(2)}%`);
        return;
      }

      case "auditoria listar": {
        const de = this.obterData(flags.de, "de");
        const ate = this.obterData(flags.ate, "ate");
        if (ate) ate.setUTCHours(23, 59, 59, 999);
        const registros = this.auditoria!.listar({ usuario: flags.usuario, entidade: flags.entidade, de, ate }, usuarioAtual);
        const filtros = [
          flags.usuario ? `usuário=${flags.usuario}` : undefined,
          flags.entidade ? `entidade=${flags.entidade}` : undefined,
          flags.de ? `de=${flags.de}` : undefined,
          flags.ate ? `até=${flags.ate}` : undefined,
        ].filter((filtro): filtro is string => Boolean(filtro));
        console.log(formatarListagemCLI(
          filtros.length ? `Auditoria (filtros: ${filtros.join(", ")})` : "Auditoria",
          registros,
          (registro) => `${registro.timestamp} | ${registro.usuarioResponsavel} | ${registro.operacao} | ${registro.entidade} | ${registro.id}`,
          "Nenhum registro de auditoria encontrado com os filtros informados."
        ));
        return;
      }

      case "relatorio organizacao": {
        console.log(
          this.relatorio!.gerarRelatorioPorOrganizacao(flags.org ?? "", {
            inicio: this.obterData(flags.inicio, "inicio") ?? new Date(0),
            fim: this.obterData(flags.fim, "fim") ?? new Date(),
          },
          usuarioAtual
        )
        );
        return;
      }

      case "relatorio status": {
        console.log(this.relatorio!.gerarRelatorioPorStatus(this.obterValorEnum(flags.status, "status", StatusRastreamento), usuarioAtual));
        return;
      }

      case "relatorio financeiro": {
        console.log(
          this.relatorio!.gerarRelatorioFinanceiro({
            inicio: this.obterData(flags.inicio, "inicio") ?? new Date(0),
            fim: this.obterData(flags.fim, "fim") ?? new Date(),
          },
          usuarioAtual
        )
        );
        return;
      }
    }
  }

  private formatarMoeda(valor: number): string {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  private validarFlagsObrigatorias(comando: string, flags: Record<string, string>): void {
    validarFlagsDoComando(comando, flags);
  }

  private obterData(valor: string | undefined, nomeFlag: string): Date | undefined {
    if (valor === undefined || !valor.trim()) {
      return undefined;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      throw new Error(`O parâmetro --${nomeFlag} deve usar o formato YYYY-MM-DD.`);
    }

    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    const valida =
      data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes - 1 &&
      data.getUTCDate() === dia;

    if (!valida) {
      throw new Error(`O parâmetro --${nomeFlag} contém uma data inválida.`);
    }

    return data;
  }

  private obterValorEnum<T extends string>(
    valor: string | undefined,
    nomeFlag: string,
    enumeracao: Record<string, T>
  ): T {
    if (!valor?.trim()) {
      throw new Error(`O parâmetro --${nomeFlag} é obrigatório.`);
    }

    const valores = Object.values(enumeracao) as T[];
    if (!valores.includes(valor as T)) {
      throw new Error(`Valor inválido para --${nomeFlag}. Valores aceitos: ${valores.join(", ")}.`);
    }

    return valor as T;
  }

  // --- Autocomplete  ---
  private autocompletar(linha: string): [string[], string] {
    const papel = this.sessaoAtual?.obterPapel();
    const opcoes = papel ? [...COMANDOS_POR_PAPEL[papel], ...COMANDOS_GERAIS] : COMANDOS_GERAIS;
    const correspondencias = opcoes.filter((c) => c.startsWith(linha));
    return [correspondencias.length ? correspondencias : opcoes, linha];
  }

  // --- Histórico persistente entre sessões ---
  private carregarHistorico(): string[] {
    if (!fs.existsSync(CAMINHO_HISTORICO)) return [];
    return fs.readFileSync(CAMINHO_HISTORICO, "utf8").split("\n").filter(Boolean);
  }

  private salvarHistorico(): void {
    const historico: string[] = (this.rl as unknown as { history: string[] })?.history ?? [];
    fs.mkdirSync(path.dirname(CAMINHO_HISTORICO), { recursive: true });
    fs.writeFileSync(CAMINHO_HISTORICO, historico.join("\n"), "utf8");
  }

  private perguntarSenha(pergunta: string): Promise<string> {
    const stdin = process.stdin;

    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      return this.perguntar(pergunta);
    }

    return new Promise((resolve, reject) => {
      const rawAnterior = Boolean(stdin.isRaw);
      const listenersKeypress = stdin.listeners("keypress");
      this.lendoSenha = true;
      this.rl?.pause();

      for (const listener of listenersKeypress) {
        stdin.off("keypress", listener);
      }

      readline.emitKeypressEvents(stdin);
      stdin.setRawMode(true);
      stdin.resume();
      process.stdout.write(pergunta);

      let senha = "";

      const finalizar = (erro?: Error) => {
        stdin.off("keypress", aoPressionar);
        stdin.setRawMode(rawAnterior);
        for (const listener of listenersKeypress) {
          stdin.on("keypress", listener);
        }
        this.lendoSenha = false;
        this.rl?.resume();
        process.stdout.write("\n");
        if (erro) {
          reject(erro);
        } else {
          resolve(senha);
        }
      };

      const aoPressionar = (tecla: string, teclaInfo: readline.Key) => {
        if (teclaInfo?.ctrl && teclaInfo.name === "c") {
          finalizar(new Error("Entrada de senha cancelada."));
          return;
        }

        if (teclaInfo?.name === "return" || teclaInfo?.name === "enter" || tecla === "\r" || tecla === "\n") {
          finalizar();
          return;
        }

        if (teclaInfo?.name === "backspace" || tecla === "\x7f" || tecla === "\b") {
          if (senha.length > 0) {
            senha = senha.slice(0, -1);
            process.stdout.write("\b \b");
          }
          return;
        }

        if (tecla && !teclaInfo?.ctrl && !teclaInfo?.meta) {
          senha += tecla;
          process.stdout.write("*");
        }
      };

      stdin.on("keypress", aoPressionar);
    });
  }

  private perguntar(pergunta: string): Promise<string> {
    return new Promise((resolve) => this.rl!.question(pergunta, resolve));
  }
}
