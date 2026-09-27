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

export const COMANDOS_POR_PAPEL: Record<PapelUsuario, string[]> = {
  [PapelUsuario.ADMINISTRADOR]: [
    "usuario criar", "org criar", "org listar", "org renovar-contrato",
    "lote criar", "lote triagem", "lote consultar-periodo",
    "equip mover", "equip codigo-barras", "equip rastrear",
    "relatorio organizacao", "relatorio status", "relatorio financeiro",
  ],
  [PapelUsuario.OPERADOR_CADASTRO]: ["org criar", "org listar", "org renovar-contrato"],
  [PapelUsuario.GESTOR_ALMOXARIFADO]: [
    "lote criar", "lote triagem", "lote consultar-periodo",
    "equip mover", "equip codigo-barras",
  ],
  [PapelUsuario.AUDITOR]: ["equip rastrear", "relatorio organizacao", "relatorio status", "relatorio financeiro"],
};

const COMANDOS_GERAIS = ["ajuda", "logout"];

export function interpretarComando(entrada: string): {
  entidade: string;
  acao: string;
  flags: Record<string, string>;
} {
  const partes = entrada.trim().split(/\s+/).filter(Boolean);
  const entidade = partes[0] ?? "";
  const acao = partes[1] ?? "";
  const flags: Record<string, string> = {};

  for (let i = 2; i < partes.length; i++) {
    if (partes[i].startsWith("--")) {
      const chave = partes[i].slice(2);
      flags[chave] = partes[i + 1] ?? "";
      i++;
    }
  }

  return { entidade, acao, flags };
}

const CAMINHO_HISTORICO = path.join(process.cwd(), "data", ".greencode_history");

export class CLIInterface {
  private autenticacao: ServicoAutenticacao;
  private organizacao?: ServicoOrganizacao;
  private lote?: ServicoLote;
  private equipamento?: ServicoEquipamentos;
  private relatorio?: ServicoRelatorios;
  private sessaoAtual: Sessao | null = null;
  private rl?: readline.Interface;

  constructor(autenticacao: ServicoAutenticacao) {
    this.autenticacao = autenticacao;
  }

  async iniciarLoop(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: (linha: string) => this.autocompletar(linha),
      history: this.carregarHistorico(),
      historySize: 200,
    } as readline.ReadLineOptions);

    if (!this.autenticacao.estaProvisionado()) {
      await this.executarProvisionamento();
    }
    this.montarServicosDeNegocio();
    await this.fazerLogin();

    this.rl.setPrompt("greencode> ");
    this.rl.prompt();

    this.rl.on("line", (entrada) => {
      this.processarComando(entrada);
      if (this.sessaoAtual) {
        this.salvarHistorico();
        this.rl?.prompt();
      }
    });

    this.rl.on("close", () => {
      console.log("\nEncerrando o greencode. Até mais!");
      process.exit(0);
    });
  }

  private async executarProvisionamento(): Promise<void> {
    console.log("Nenhuma configuração encontrada — iniciando provisionamento inicial.");
    const senha = await this.perguntar("Defina a senha do administrador: ");
    this.autenticacao.provisionarInicial(senha, "admin");
    console.log("Provisionamento concluído. Faça login com o usuário 'admin'.\n");
  }

  private montarServicosDeNegocio(): void {
    const repositorio = this.autenticacao.obterRepositorio()!;
    const chave = this.autenticacao.obterChave()!;
    const diretorioBase = this.autenticacao.obterDiretorioBase();

    this.organizacao = new ServicoOrganizacao(repositorio, diretorioBase, chave);
    this.lote = new ServicoLote(repositorio, diretorioBase, chave);
    this.equipamento = new ServicoEquipamentos(repositorio, diretorioBase, chave);
    this.relatorio = new ServicoRelatorios(this.lote, this.equipamento);
  }

  private async fazerLogin(): Promise<void> {
    while (!this.sessaoAtual) {
      const usuario = await this.perguntar("Usuário: ");
      const senha = await this.perguntar("Senha: ");
      try {
        this.sessaoAtual = this.autenticacao.login(usuario, senha);
        console.log(`\nBem-vindo(a), ${usuario}!`);
        this.exibirMenuPorPapel(this.sessaoAtual.obterPapel());
      } catch (erro) {
        console.log(`Falha no login: ${(erro as Error).message}\n`);
      }
    }
  }

  exibirMenuPorPapel(papel: PapelUsuario): void {
    console.log(`Comandos disponíveis para ${papel}:`);
    for (const comando of [...COMANDOS_POR_PAPEL[papel], ...COMANDOS_GERAIS]) {
      console.log(`  - ${comando}`);
    }
    console.log("");
  }

  processarComando(entradaBruta: string): void {
    const entrada = entradaBruta.trim();
    if (!entrada) return;

    if (!this.sessaoAtual) {
      console.log("Nenhuma sessão ativa.");
      return;
    }

    if (!this.autenticacao.validarToken(this.sessaoAtual.obterToken())) {
      console.log("Sessão expirada. Encerrando.");
      this.sessaoAtual = null;
      this.rl?.close();
      return;
    }

    const { entidade, acao, flags } = interpretarComando(entrada);
    const comando = `${entidade} ${acao}`.trim();

    if (comando === "ajuda") {
      this.exibirMenuPorPapel(this.sessaoAtual.obterPapel());
      return;
    }
    if (comando === "logout") {
      this.autenticacao.logout(this.sessaoAtual.obterToken());
      console.log("Sessão encerrada. Até logo!");
      this.sessaoAtual = null;
      this.rl?.close();
      return;
    }

    const papel = this.sessaoAtual.obterPapel();
    if (!COMANDOS_POR_PAPEL[papel].includes(comando)) {
      console.log(`[ERRO] Comando "${comando}" não permitido para o papel ${papel}.`);
      return;
    }

    try {
      this.executarAcaoDeNegocio(comando, flags);
    } catch (erro) {
      console.log(`[ERRO] ${(erro as Error).message}`);
    }
  }

  private executarAcaoDeNegocio(comando: string, flags: Record<string, string>): void {
    const usuarioAtual = this.sessaoAtual!.obterUsuario();

    switch (comando) {
        case "usuario criar": {
            const credencial = this.autenticacao.criarUsuario(
                flags.usuario ?? "",
                flags.senha ?? "",
                flags.papel as PapelUsuario,
                usuarioAtual
            );
            console.log(`[OK] Usuário criado: ${credencial.obterUsuario()} (${flags.papel})`);
            return;
        }
      case "org criar": {
        const organizacao = this.organizacao!.cadastrarOrganizacao(
          {
            id: flags.id ?? `org-${Date.now()}`,
            razaoSocial: flags.razao ?? "",
            cnpj: flags.cnpj ?? "",
            inscricaoEstadual: flags.ie ?? "",
            enderecoCompleto: flags.endereco ?? "",
            telefone: flags.telefone ?? "",
            email: flags.email ?? "",
          },
          usuarioAtual
        );
        console.log(`[OK] Organização criada: ${organizacao.id} — ${organizacao.razaoSocial}`);
        return;
      }
      case "org listar": {
        this.organizacao!.listarOrganizacoesAtivas().forEach((org) =>
          console.log(`  ${org.id} — ${org.razaoSocial}`)
        );
        return;
      }
      case "org renovar-contrato": {
        this.organizacao!.renovarContrato(flags.id ?? "", new Date(flags.data ?? Date.now()), usuarioAtual);
        console.log("[OK] Contrato renovado.");
        return;
      }
      case "lote criar": {
        const lote = this.lote!.criarLote(
          { id: flags.id ?? `lote-${Date.now()}`, organizacaoId: flags.org ?? "", notaFiscal: flags.nf ?? "", transportadora: flags.transp ?? "" },
          usuarioAtual
        );
        console.log(`[OK] Lote criado: ${lote.id}`);
        return;
      }
      case "lote triagem": {
        this.lote!.processarTriagem(flags.id ?? "", usuarioAtual);
        console.log("[OK] Triagem processada.");
        return;
      }
      case "lote consultar-periodo": {
        this.lote!
          .consultarLotePorPeriodo(new Date(flags.inicio ?? 0), new Date(flags.fim ?? Date.now()))
          .forEach((l) => console.log(`  ${l.id} — NF ${l.notaFiscal}`));
        return;
      }
      case "equip mover": {
        this.equipamento!.registrarMovimentacao(flags.id ?? "", flags.destino ?? "", usuarioAtual, flags.obs ?? "");
        console.log("[OK] Movimentação registrada.");
        return;
      }
      case "equip codigo-barras": {
        const codigo = this.equipamento!.gerarCodigoBarras(flags.tipo as TipoEquipamento, Number(flags.seq ?? 1));
        console.log(`[OK] Código gerado: ${codigo}`);
        return;
      }
      case "equip rastrear": {
        const historico = this.equipamento!.rastrearEquipamento(flags.id ?? "");
        console.log(`[OK] ${historico.equipamento.id}: ${historico.movimentacoes.length} movimentação(ões) registrada(s).`);
        return;
      }
      case "relatorio organizacao": {
        console.log(this.relatorio!.gerarRelatorioPorOrganizacao(flags.org ?? "", { inicio: new Date(flags.inicio ?? 0), fim: new Date(flags.fim ?? Date.now()) }));
        return;
      }
      case "relatorio status": {
        console.log(this.relatorio!.gerarRelatorioPorStatus(flags.status as StatusRastreamento));
        return;
      }
      case "relatorio financeiro": {
        console.log(this.relatorio!.gerarRelatorioFinanceiro({ inicio: new Date(flags.inicio ?? 0), fim: new Date(flags.fim ?? Date.now()) }));
        return;
      }
    }
  }

  private autocompletar(linha: string): [string[], string] {
    const papel = this.sessaoAtual?.obterPapel();
    const opcoes = papel ? [...COMANDOS_POR_PAPEL[papel], ...COMANDOS_GERAIS] : COMANDOS_GERAIS;
    const correspondencias = opcoes.filter((c) => c.startsWith(linha));
    return [correspondencias.length ? correspondencias : opcoes, linha];
  }

  private carregarHistorico(): string[] {
    if (!fs.existsSync(CAMINHO_HISTORICO)) return [];
    return fs.readFileSync(CAMINHO_HISTORICO, "utf8").split("\n").filter(Boolean);
  }

  private salvarHistorico(): void {
    const historico: string[] = (this.rl as unknown as { history: string[] })?.history ?? [];
    fs.mkdirSync(path.dirname(CAMINHO_HISTORICO), { recursive: true });
    fs.writeFileSync(CAMINHO_HISTORICO, historico.join("\n"), "utf8");
  }

  private perguntar(pergunta: string): Promise<string> {
    return new Promise((resolve) => this.rl!.question(pergunta, resolve));
  }
}