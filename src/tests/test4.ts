import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { assertEqual, criarAmbiente, logarComo } from "./testUtils";
import { interpretarComando, COMANDOS_POR_PAPEL } from "../cli/CLIInterface";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao";
import { CLIInterface } from "../cli/CLIInterface";

console.log("Testando interpretarComando ...");

const comando1 = interpretarComando("lote criar --org BR001 --nf 123456 --transp TransRapida");
assertEqual(comando1.entidade, "lote");
assertEqual(comando1.acao, "criar");
assertEqual(comando1.flags.org, "BR001");
assertEqual(comando1.flags.nf, "123456");
assertEqual(comando1.flags.transp, "TransRapida");

const comando2 = interpretarComando("org listar");
assertEqual(comando2.entidade, "org");
assertEqual(comando2.acao, "listar");
assertEqual(Object.keys(comando2.flags).length, 0);

const comando3 = interpretarComando("  equip   rastrear   --id  equip-1  ");
assertEqual(comando3.entidade, "equip");
assertEqual(comando3.acao, "rastrear");
assertEqual(comando3.flags.id, "equip-1");

const comandoVazio = interpretarComando("");
assertEqual(comandoVazio.entidade, "");
assertEqual(comandoVazio.acao, "");
console.log("interpretarComando ok👍");

console.log("Testando COMANDOS_POR_PAPEL ...");

const verbosDeEscrita = ["criar", "triagem", "mover", "renovar-contrato"];
const comandosAuditor = COMANDOS_POR_PAPEL[PapelUsuario.AUDITOR];
assertEqual(comandosAuditor.every((cmd) => !verbosDeEscrita.some((v) => cmd.includes(v))), true);

const comandosOperador = COMANDOS_POR_PAPEL[PapelUsuario.OPERADOR_CADASTRO];
assertEqual(comandosOperador.every((cmd) => !cmd.startsWith("lote") && !cmd.startsWith("equip")), true);

const comandosGestor = COMANDOS_POR_PAPEL[PapelUsuario.GESTOR_ALMOXARIFADO];
assertEqual(comandosGestor.every((cmd) => !cmd.startsWith("org")), true);
console.log("COMANDOS_POR_PAPEL ok👍");

console.log("\nDia 5 (automatizado): tudo certinho");
console.log("Testando fluxo integrado CLI -> serviços -> persistência ...");
const diretorioE2E = fs.mkdtempSync(path.join(os.tmpdir(), "greencode-cli-e2e-"));

try {
  const autenticacao = new ServicoAutenticacao(diretorioE2E);
  autenticacao.provisionarInicial("senha-admin", "admin");
  const sessao = autenticacao.login("admin", "senha-admin");
  const cli = new CLIInterface(autenticacao);

  // O loop readline não é necessário para testar a cadeia de negócio.
  // A sessão real e os serviços reais continuam sendo usados.
  (cli as any).montarServicosDeNegocio();
  (cli as any).sessaoAtual = sessao;

  cli.processarComando(
    "org criar --id org-e2e --razao GreenE2E --cnpj 11222333000181 --ie 123 --endereco RuaE2E --telefone 12999999999 --email e2e@example.com --contrato-id ctr-e2e --contrato-vencimento 2030-12-31 --contrato-valor 1000"
  );
  cli.processarComando(
    "lote criar --id lote-e2e --org org-e2e --nf NF-E2E --transp TransRapida"
  );
  cli.processarComando(
    "equip cadastrar --id equip-e2e --tipo NOTEBOOK --marca Dell --modelo Latitude --ano 2024 --estado NOVO --peso 1.8 --lote lote-e2e --seq 1"
  );
  cli.processarComando("lote triagem --id lote-e2e");
  cli.processarComando("equip rastrear --id equip-e2e");

  const equipamento = autenticacao
    .obterRepositorio()!
    .carregarEntidade(ARQUIVOS.EQUIPAMENTOS, "equip-e2e");
  const organizacao = autenticacao
    .obterRepositorio()!
    .carregarEntidade(ARQUIVOS.ORGANIZACOES, "org-e2e");

  assertEqual(organizacao?.contratoVigente?.id, "ctr-e2e");
  assertEqual(equipamento?.statusRastreamento, "AGUARDANDO_DESMONTE");
  assertEqual(Array.isArray(equipamento?.historicoMovimentacao), true);
  console.log("Fluxo integrado CLI ok👍");
} finally {
  fs.rmSync(diretorioE2E, { recursive: true, force: true });
}

async function executarEObterSaida(cli: CLIInterface, entrada: string): Promise<string> {
  const saida: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => saida.push(args.map(String).join(" "));
  try {
    await cli.processarComando(entrada);
  } finally {
    console.log = originalLog;
  }
  return saida.join("\n");
}

async function testeFinalRBAC(): Promise<void> {
  console.log("\nSegunda auditoria: RBAC, flags, datas, sessão e autenticação ...");
  const ambiente = criarAmbiente("greencode-final-", "senha-admin-final");
  const diretorioAuditoria = ambiente.diretorio;

  try {
    const auth = ambiente.autenticacao;

    const papeis = [
      PapelUsuario.ADMINISTRADOR,
      PapelUsuario.OPERADOR_CADASTRO,
      PapelUsuario.GESTOR_ALMOXARIFADO,
      PapelUsuario.AUDITOR,
    ];

    const casos = [
      {
        papel: PapelUsuario.ADMINISTRADOR,
        permitido: "org listar",
        proibido: "comando inexistente",
        sensivel: "usuario criar",
      },
      {
        papel: PapelUsuario.OPERADOR_CADASTRO,
        permitido: "org listar",
        proibido: "lote consultar-periodo",
        sensivel: "usuario criar",
      },
      {
        papel: PapelUsuario.GESTOR_ALMOXARIFADO,
        permitido: "lote consultar-periodo",
        proibido: "org criar",
        sensivel: "usuario criar",
      },
      {
        papel: PapelUsuario.AUDITOR,
        permitido: "relatorio status --status AGUARDANDO_TRIAGEM",
        proibido: "equip atualizar-estado --id equipamento-inexistente --estado NOVO",
        sensivel: "usuario criar",
      },
    ];

    for (const caso of casos) {
      const usuario = caso.papel === PapelUsuario.ADMINISTRADOR
        ? "admin"
        : `usuario-${caso.papel}`;
      const senha = caso.papel === PapelUsuario.ADMINISTRADOR
        ? "senha-admin-final"
        : `senha-${caso.papel}`;

      let senhaInvalidaRejeitada = false;
      try {
        auth.login(usuario, "senha-incorreta");
      } catch {
        senhaInvalidaRejeitada = true;
      }
      assertEqual(senhaInvalidaRejeitada, true, `Senha incorreta deveria ser rejeitada para ${caso.papel}`);

      let usuarioInexistenteRejeitado = false;
      try {
        auth.login(`nao-existe-${caso.papel}`, senha);
      } catch {
        usuarioInexistenteRejeitado = true;
      }
      assertEqual(usuarioInexistenteRejeitado, true, `Usuário inexistente deveria ser rejeitado para ${caso.papel}`);

      const sessao = logarComo(auth, caso.papel, senha);
      assertEqual(auth.validarToken(sessao.obterToken()), true);
      auth.logout(sessao.obterToken());
      assertEqual(auth.validarToken(sessao.obterToken()), false);

      assertEqual(auth.alterarSenha(usuario, senha, `${senha}-nova`), true);
      const sessaoNova = auth.login(usuario, `${senha}-nova`);
      auth.logout(sessaoNova.obterToken());
      assertEqual(auth.validarToken(sessaoNova.obterToken()), false);
    }

    const authAdmin = new ServicoAutenticacao(diretorioAuditoria);
    const cli = new CLIInterface(authAdmin);
    (cli as any).montarServicosDeNegocio();
    (cli as any).sessaoAtual = logarComo(authAdmin, PapelUsuario.ADMINISTRADOR, "senha-admin-final-nova");

    const ajudaAdmin = await executarEObterSaida(cli, "ajuda");
    assertEqual(ajudaAdmin.includes("usuario criar"), true);
    assertEqual(ajudaAdmin.includes("equip rastrear"), true);

    const faltaFlag = await executarEObterSaida(cli, "lote criar --nf NF --transp TransRapida");
    assertEqual(faltaFlag.includes("exige o parâmetro --org"), true);

    const flagVazia = await executarEObterSaida(cli, "lote criar --org --nf NF --transp TransRapida");
    assertEqual(flagVazia.includes("exige o parâmetro --org"), true);

    const statusInvalido = await executarEObterSaida(cli, "relatorio status --status INVALIDO");
    assertEqual(statusInvalido.includes("Valor inválido para --status"), true);

    const dataAceita = await executarEObterSaida(
      cli,
      "relatorio financeiro --inicio 2026-09-27 --fim 2026-09-27"
    );
    assertEqual(dataAceita.includes("Relatório financeiro"), true);

    for (const valor of ["27/09/2026", "data-invalida", "2026-99-99"]) {
      const saida = await executarEObterSaida(
        cli,
        `relatorio financeiro --inicio ${valor}`
      );
      assertEqual(saida.includes("--inicio"), true, `Data inválida não foi rejeitada: ${valor}`);
    }

    for (const caso of casos) {
      const papel = caso.papel;
      const usuario = papel === PapelUsuario.ADMINISTRADOR ? "admin" : `usuario-${papel}`;
      const senha = papel === PapelUsuario.ADMINISTRADOR
        ? "senha-admin-final-nova"
        : `senha-${papel}-nova`;

      (cli as any).sessaoAtual = logarComo(authAdmin, papel, senha);
      const permitido = await executarEObterSaida(cli, caso.permitido);
      assertEqual(
        permitido.includes(`[ERRO] Comando`),
        false,
        `Comando permitido foi rejeitado para ${papel}: ${caso.permitido}`
      );

      const proibido = await executarEObterSaida(cli, caso.proibido);
      assertEqual(
        proibido.includes("não permitido para o papel"),
        true,
        `Comando proibido não foi rejeitado para ${papel}: ${caso.proibido}`
      );

      const sensivel = await executarEObterSaida(cli, caso.sensivel);
      if (papel === PapelUsuario.ADMINISTRADOR) {
        assertEqual(sensivel.includes("não permitido para o papel"), false);
      } else {
        assertEqual(sensivel.includes("não permitido para o papel"), true);
      }

      const ajuda = await executarEObterSaida(cli, "ajuda");
      assertEqual(ajuda.includes(caso.permitido.split(" ")[0]), true);

      const logout = await executarEObterSaida(cli, "logout");
      assertEqual(logout.includes("Sessão encerrada"), true);
      assertEqual((cli as any).sessaoAtual, null);
    }

    const servicoOrganizacao = (cli as any).organizacao;
    let escritaDiretaBloqueada = false;
    try {
      servicoOrganizacao.cadastrarOrganizacao(
        {
          id: "org-rbac-direto",
          razaoSocial: "Tentativa não autorizada",
          cnpj: "11222333000181",
          inscricaoEstadual: "1",
          enderecoCompleto: "Rua",
          telefone: "1",
          email: "x@example.com",
        },
        "usuario-AUDITOR"
      );
    } catch {
      escritaDiretaBloqueada = true;
    }
    assertEqual(escritaDiretaBloqueada, true);

    const sessaoExpiravel = logarComo(authAdmin, PapelUsuario.ADMINISTRADOR, "senha-admin-final-nova");
    (sessaoExpiravel as any).expiracao = new Date(Date.now() - 1000);
    (cli as any).sessaoAtual = sessaoExpiravel;
    const expiracao = await executarEObterSaida(cli, "ajuda");
    assertEqual(expiracao.includes("Sessão expirada"), true);
    assertEqual(authAdmin.validarToken(sessaoExpiravel.obterToken()), false);

    console.log("RBAC + autenticação + sessão + validação de entrada ok👍");
  } finally {
    ambiente.limpar();
  }
}

testeFinalRBAC().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
