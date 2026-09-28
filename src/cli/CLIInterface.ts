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

export { COMANDOS_POR_PAPEL };


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

const CAMINHO_HISTORICO = path.join(process.cwd(), "data", ".greencode_history");

export class CLIInterface {
  private autenticacao: ServicoAutenticacao;
  private autorizacao: ServicoAutorizacao;
  private organizacao?: ServicoOrganizacao;
  private lote?: ServicoLote;
  private equipamento?: ServicoEquipamentos;
  private relatorio?: ServicoRelatorios;
  private sessaoAtual: Sessao | null = null;
  private rl?: readline.Interface;

  private lendoSenha = false;

  private readonly manipuladorLinha = (entrada: string): void => {
    if (this.lendoSenha) {
      return;
    }

    void this.processarComando(entrada).then(() => {
      if (this.sessaoAtual) {
        this.salvarHistorico();
        this.rl?.prompt();
      }
    });
  };

  constructor(autenticacao: ServicoAutenticacao) {
    this.autenticacao = autenticacao;
    this.autorizacao = new ServicoAutorizacao(autenticacao);
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

    this.rl.on("line", this.manipuladorLinha);

    this.rl.on("close", () => {
      console.log("\nEncerrando o greencode. Até mais!");
      process.exit(0);
    });
  }

  private async executarProvisionamento(): Promise<void> {
    console.log("Nenhuma configuração encontrada — iniciando provisionamento inicial.");
    const senha = await this.perguntarSenha("Defina a senha do administrador: ");
    this.autenticacao.provisionarInicial(senha, "admin");
    console.log("Provisionamento concluído. Faça login com o usuário 'admin'.\n");
  }

  private montarServicosDeNegocio(): void {
    const repositorio = this.autenticacao.obterRepositorio()!;
    const chave = this.autenticacao.obterChave()!;
    const diretorioBase = this.autenticacao.obterDiretorioBase();

    this.organizacao = new ServicoOrganizacao(repositorio, diretorioBase, chave, this.autorizacao);
    this.lote = new ServicoLote(repositorio, diretorioBase, chave, this.autorizacao);
    this.equipamento = new ServicoEquipamentos(repositorio, diretorioBase, chave, this.autorizacao);
    this.relatorio = new ServicoRelatorios(this.lote, this.equipamento, this.autorizacao);
  }

  private async fazerLogin(): Promise<void> {
    while (!this.sessaoAtual) {
      const usuario = await this.perguntar("Usuário: ");
      const senha = await this.perguntarSenha("Senha: ");
      try {
        this.sessaoAtual = this.autenticacao.login(usuario, senha);
        console.log(`\nBem-vindo(a), ${usuario}!`);
        this.exibirMenuPorPapel(this.sessaoAtual.obterPapel());
      } catch (erro) {
        console.log(`Falha no login: ${(erro as Error).message}\n`);
      }
    }
  }

  // --- Menu dinâmico por papel  ---
  exibirMenuPorPapel(papel: PapelUsuario): void {
    console.log(`Comandos disponíveis para ${papel}:`);
    for (const comando of [...COMANDOS_POR_PAPEL[papel], ...COMANDOS_GERAIS]) {
      console.log(`  - ${comando}`);
    }
    console.log("");
  }

  // --- Processamento de comando ---
  async processarComando(entradaBruta: string): Promise<void> {
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
    try {
      this.autorizacao.exigirPermissaoPorPapel(papel, comando);
      await this.executarAcaoDeNegocio(comando, flags);
    } catch (erro) {
      console.log(`[ERRO] ${(erro as Error).message}`);
    }
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
          usuarioAtual
        );
        console.log(`[OK] Usuário criado: ${credencial.obterUsuario()} (${flags.papel})`);
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
        console.log("[OK] Senha alterada com sucesso.");
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
        console.log(`[OK] Organização criada: ${organizacao.id} — ${organizacao.razaoSocial}`);
        return;
      }

      case "org listar": {
        this.organizacao!.listarOrganizacoesAtivas(usuarioAtual).forEach((org) =>
          console.log(`  ${org.id} — ${org.razaoSocial}`)
        );
        return;
      }

      case "org renovar-contrato": {
        this.organizacao!.renovarContrato(flags.id ?? "", this.obterData(flags.data, "data") ?? new Date(), usuarioAtual);
        console.log("[OK] Contrato renovado.");
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
          .consultarLotePorPeriodo(
            this.obterData(flags.inicio, "inicio") ?? new Date(0),
            this.obterData(flags.fim, "fim") ?? new Date(),
            usuarioAtual
          )
          .forEach((l) => console.log(`  ${l.id} — NF ${l.notaFiscal}`));
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
          Number(flags.peso ?? 0)
        );

        this.lote!.adicionarEquipamentoLote(flags.lote ?? "", equipamento, usuarioAtual);
        console.log(`[OK] Equipamento cadastrado: ${equipamento.id} (código ${equipamento.codigoBarrasInterno}), vinculado ao lote ${flags.lote}.`);
        return;
      }

      case "equip mover": {
        this.equipamento!.registrarMovimentacao(flags.id ?? "", flags.destino ?? "", usuarioAtual, flags.obs ?? "");
        console.log("[OK] Movimentação registrada.");
        return;
      }

      case "equip codigo-barras": {
        const codigo = this.equipamento!.gerarCodigoBarras(this.obterValorEnum(flags.tipo, "tipo", TipoEquipamento), Number(flags.seq ?? 1), usuarioAtual);
        console.log(`[OK] Código gerado: ${codigo}`);
        return;
      }

      case "equip rastrear": {
        const historico = this.equipamento!.rastrearEquipamento(flags.id ?? "", usuarioAtual);
        console.log(`[OK] ${historico.equipamento.id}: ${historico.movimentacoes.length} movimentação(ões) registrada(s).`);
        return;
      }

      case "equip atualizar-estado": {

        this.equipamento!.atualizarEstadoFisico(
          flags.id ?? "",
          this.obterValorEnum(flags.estado, "estado", EstadoFisico),
          flags.justificativa ?? "",
          usuarioAtual
        );
        console.log(`[OK] Estado físico atualizado para ${flags.estado}.`);
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

  private validarFlagsObrigatorias(comando: string, flags: Record<string, string>): void {
    const obrigatorias: Record<string, string[]> = {
      "usuario criar": ["usuario", "papel"],
      "org renovar-contrato": ["id"],
      "lote criar": ["org", "nf", "transp"],
      "lote triagem": ["id"],
      "equip cadastrar": ["lote", "tipo", "estado"],
      "equip mover": ["id", "destino"],
      "equip codigo-barras": ["tipo"],
      "equip rastrear": ["id"],
      "equip atualizar-estado": ["id", "estado"],
      "relatorio organizacao": ["org"],
      "relatorio status": ["status"],
    };

    for (const nome of obrigatorias[comando] ?? []) {
      if (!flags[nome]?.trim()) {
        throw new Error(`O comando "${comando}" exige o parâmetro --${nome} <valor>.`);
      }
    }
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
