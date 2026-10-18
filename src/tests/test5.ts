import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import { criarAmbiente } from "./testUtils";
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Equipamento } from "../models/Equipamento";
import { Organizacao } from "../models/Organizacao";
import { StatusLote } from "../models/enums/StatusLote";
import { EstadoFisico } from "../models/enums/EstadoFisico";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { TipoEquipamento } from "../models/enums/TipoEquipamento";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao";
import { ServicoAutorizacao } from "../servicos/ServicoAutorizacao";
import { ServicoOrganizacao } from "../servicos/ServicoOrganizacao";
import { ServicoLote } from "../servicos/ServicoLote";
import { ServicoEquipamentos } from "../servicos/ServicoEquipamentos";
import { ServicoParametros } from "../servicos/ServicoParametros";
import { ServicoAuditoria } from "../servicos/ServicoAuditoria";
import { ServicoRelatorios } from "../servicos/ServicoRelatorios";
import { CLIInterface, interpretarComando } from "../cli/CLIInterface";

function deveFalhar(acao: () => unknown, mensagem: RegExp): void {
  let erro: unknown;
  try { acao(); } catch (e) { erro = e; }
  assert.ok(erro instanceof Error, "A operação deveria falhar.");
  assert.match((erro as Error).message, mensagem);
}

async function capturarSaida(acao: () => Promise<void>): Promise<string> {
  const linhas: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => linhas.push(args.map(String).join(" "));
  try { await acao(); } finally { console.log = original; }
  return linhas.join("\n");
}

async function main(): Promise<void> {
  console.log("Fase 2/3 — CRUD, permissões, parâmetros, auditoria e financeiro...");
  const ambiente = criarAmbiente("greencode-fase23-", "senha-admin", false);
  const diretorio = ambiente.diretorio;
  try {
    const auth = ambiente.autenticacao;
    auth.criarUsuario("operador", "senha-operador", PapelUsuario.OPERADOR_CADASTRO, "admin", "Operador de Teste");
    auth.criarUsuario("gestor", "senha-gestor", PapelUsuario.GESTOR_ALMOXARIFADO, "admin", "Gestor de Teste");
    auth.criarUsuario("auditor", "senha-auditor", PapelUsuario.AUDITOR, "admin", "Auditor de Teste");

    const repositorio = auth.obterRepositorio()!;
    const chave = auth.obterChave()!;
    const autorizacao = new ServicoAutorizacao(auth);
    const organizacoes = new ServicoOrganizacao(repositorio, diretorio, chave, autorizacao);
    const lotes = new ServicoLote(repositorio, diretorio, chave, autorizacao);
    const equipamentos = new ServicoEquipamentos(repositorio, diretorio, chave, autorizacao);
    const parametros = new ServicoParametros(repositorio, diretorio, chave, autorizacao);
    const auditoria = new ServicoAuditoria(diretorio, chave, autorizacao);
    const relatorios = new ServicoRelatorios(lotes, equipamentos, autorizacao, organizacoes, parametros);

    assert.equal(auth.buscarUsuario("operador", "admin").obterNome(), "Operador de Teste");
    auth.atualizarUsuario("operador", "Operador Atualizado", PapelUsuario.OPERADOR_CADASTRO, "admin");
    assert.equal(auth.buscarUsuario("operador", "admin").obterNome(), "Operador Atualizado");

    const org = organizacoes.cadastrarOrganizacao({
      id: "org-fase23", razaoSocial: "Empresa de Teste", cnpj: "11222333000181",
      inscricaoEstadual: "123", enderecoCompleto: "Rua de Teste, 1", telefone: "11999999999",
      email: "teste@example.com", contrato: {
        id: "ctr-fase23", dataVencimento: new Date("2035-12-31T00:00:00.000Z"), valorMensal: 1000,
      },
    }, "admin");
    assert.equal(org.ativo, true);
    const organizacaoLegada = Organizacao.deDados({
      id: "org-legada", razaoSocial: "Legada", cnpj: "11222333000181",
      inscricaoEstadual: "", enderecoCompleto: "Rua Antiga", telefone: "", email: "",
      dataCadastro: "2020-01-01T00:00:00.000Z", contratoVigente: null,
    });
    assert.equal(organizacaoLegada.ativo, true, "Organizações antigas sem ativo devem continuar ativas.");
    organizacoes.atualizarOrganizacao(org.id, { email: "financeiro@example.com" }, "admin");
    assert.equal(organizacoes.buscarOrganizacao(org.id).email, "financeiro@example.com");

    const lote = lotes.criarLote({ id: "lote-fase23", organizacaoId: org.id, notaFiscal: "NF-23", transportadora: "TransTeste" }, "admin");
    const equipamento = new Equipamento("equip-fase23", "GC-NOTE-000023", TipoEquipamento.NOTEBOOK, "Marca", "Modelo", 2024, EstadoFisico.NOVO, 2.5, 2500);
    lotes.adicionarEquipamentoLote(lote.id, equipamento, "admin");
    const loteRemocao = lotes.criarLote({ id: "lote-remocao", organizacaoId: org.id, notaFiscal: "NF-R", transportadora: "TransTeste" }, "admin");
    const equipamentoRemocao = new Equipamento("equip-remocao", "GC-NOTE-000024", TipoEquipamento.NOTEBOOK, "Marca", "Modelo", 2024, EstadoFisico.NOVO, 1);
    lotes.adicionarEquipamentoLote(loteRemocao.id, equipamentoRemocao, "admin");
    assert.equal(equipamentos.obterEquipamento(equipamento.id).valorAquisicao, 2500);
    assert.equal(equipamentos.listarEquipamentosComFiltros("auditor").length, 2);
    deveFalhar(() => lotes.criarLote({ id: "lote-negado", organizacaoId: org.id, notaFiscal: "NF", transportadora: "T" }, "operador"), /não permitido|Comando/);

    // A organização não pode ser desativada enquanto houver um lote não finalizado.
    deveFalhar(() => organizacoes.desativarOrganizacao(org.id, "admin"), /lote.*não finalizado/i);

    lotes.atualizarLote(lote.id, { notaFiscal: "NF-23-ATUALIZADA", observacoes: "Atualizado em teste" }, "admin");
    lotes.desativarLote(lote.id, "admin");
    assert.equal(repositorio.carregarEntidade(ARQUIVOS.LOTES, lote.id).ativo, false);
    assert.equal(lotes.listarLotes("admin").some((item) => item.id === lote.id), false);
    lotes.ativarLote(lote.id, "admin");
    assert.equal(lotes.listarLotes("admin").some((item) => item.id === lote.id), true);
    lotes.desativarLote(loteRemocao.id, "admin");
    deveFalhar(() => organizacoes.desativarOrganizacao(org.id, "admin"), /lote.*não finalizado/i);
    lotes.ativarLote(loteRemocao.id, "admin");

    equipamentos.atualizarEquipamento(equipamento.id, { marca: "Marca Nova", valorAquisicao: 3000 }, "admin");
    equipamentos.desativarEquipamento(equipamento.id, "admin");
    assert.ok(repositorio.carregarEntidade(ARQUIVOS.EQUIPAMENTOS, equipamento.id), "Desativação não pode excluir fisicamente o equipamento.");
    assert.equal(equipamentos.listarEquipamentosComFiltros("admin").some((item) => item.id === equipamento.id), false);
    const loteComEquipamentoInativo = repositorio.carregarEntidade(ARQUIVOS.LOTES, lote.id);
    assert.equal(loteComEquipamentoInativo.equipamentos.find((item: any) => item.id === equipamento.id).ativo, false, "Cópia embutida do equipamento deve sincronizar o estado inativo.");
    equipamentos.ativarEquipamento(equipamento.id, "admin");
    const loteComEquipamentoAtivo = repositorio.carregarEntidade(ARQUIVOS.LOTES, lote.id);
    assert.equal(loteComEquipamentoAtivo.equipamentos.find((item: any) => item.id === equipamento.id).ativo, true, "Reativação deve sincronizar a cópia embutida do equipamento.");
    lotes.removerEquipamento(loteRemocao.id, equipamentoRemocao.id, "admin");
    assert.equal(equipamentos.obterEquipamento(equipamentoRemocao.id).loteId, "");
    assert.ok(equipamentos.obterEquipamento(equipamentoRemocao.id).historicoMovimentacao);

    parametros.definir("aliquotaImpostoPercentual", 10, "admin");
    parametros.definir("taxaDepreciacaoAnualPercentual", 20, "admin");
    const parametrosSalvos = parametros.listar("auditor");
    assert.equal(parametrosSalvos.aliquotaImpostoPercentual, 10);
    assert.equal(parametrosSalvos.taxaDepreciacaoAnualPercentual, 20);
    deveFalhar(() => parametros.definir("aliquotaImpostoPercentual", 101, "admin"), /entre 0 e 100/);
    deveFalhar(() => parametros.definir("aliquotaImpostoPercentual", 25, "auditor"), /não permitido/);
    const arquivoParametros = fs.readFileSync(path.join(diretorio, ARQUIVOS.PARAMETROS_GLOBAIS), "utf8");
    assert.equal(arquivoParametros.includes("aliquotaImpostoPercentual"), false, "Parâmetros devem ser persistidos cifrados.");
    const authReiniciada = new ServicoAutenticacao(diretorio);
    const parametrosReabertos = new ServicoParametros(authReiniciada.obterRepositorio()!, diretorio, authReiniciada.obterChave()!, new ServicoAutorizacao(authReiniciada));
    assert.equal(parametrosReabertos.listar("admin").aliquotaImpostoPercentual, 10, "Os parâmetros devem persistir após reiniciar os serviços.");
    const financeiro = relatorios.gerarRelatorioFinanceiro({ inicio: new Date("2020-01-01T00:00:00.000Z"), fim: new Date("2036-01-01T00:00:00.000Z") }, "admin");
    assert.match(financeiro, /Valor total de aquisição:.*3\.000,00/);
    assert.match(financeiro, /Valor residual estimado:.*1\.800,00/);
    assert.match(financeiro, /Receita mensal bruta de contratos.*1\.000,00/);
    assert.match(financeiro, /Impostos estimados.*100,00/);
    assert.match(financeiro, /Receita mensal estimada após impostos.*900,00/);

    const registrosAntes = auditoria.listar({ usuario: "admin", entidade: ARQUIVOS.ORGANIZACOES }, "auditor");
    assert.ok(registrosAntes.length >= 2, "A consulta deve encontrar registros filtrados do journal.");
    const journalAtual = path.join(diretorio, ARQUIVOS.JOURNAL);
    const journalRotacionado = path.join(diretorio, `${ARQUIVOS.JOURNAL_ROTACIONADO_PREFIXO}2026-10-01T00-00-00-000Z`);
    fs.copyFileSync(journalAtual, journalRotacionado);
    const comRotacao = auditoria.listar({ usuario: "admin" }, "auditor");
    assert.ok(comRotacao.length >= registrosAntes.length * 2, "A pesquisa deve ler journal atual e rotacionado.");

    organizacoes.cancelarContrato(org.id, "admin");
    const orgDepoisContrato = organizacoes.buscarOrganizacao(org.id);
    assert.equal(orgDepoisContrato.contratoVigente, null);
    assert.ok(orgDepoisContrato.contratos.some((item) => item.id === "ctr-fase23" && item.ativo === false), "Contrato cancelado deve continuar no histórico.");

    const sessaoOperador = auth.login("operador", "senha-operador");
    auth.desativarUsuario("operador", "admin");
    assert.equal(auth.validarToken(sessaoOperador.obterToken()), false, "A sessão do usuário desativado deve ser invalidada imediatamente.");
    deveFalhar(() => auth.login("operador", "senha-operador"), /inválidos/i);
    auth.ativarUsuario("operador", "admin");
    assert.equal(auth.login("operador", "senha-operador").obterUsuario(), "operador");
    deveFalhar(() => auth.desativarUsuario("admin", "admin"), /próprio usuário/i);

    const parse = interpretarComando('usuario atualizar --usuario operador --nome "Maria Silva" --papel OPERADOR_CADASTRO');
    assert.equal(parse.flags.nome, "Maria Silva", "A CLI precisa preservar valores entre aspas com espaços.");
    const cli = new CLIInterface(auth);
    (cli as any).montarServicosDeNegocio();
    (cli as any).sessaoAtual = auth.login("admin", "senha-admin");
    const ajuda = await capturarSaida(() => cli.processarComando("ajuda"));
    assert.match(ajuda, /auditoria listar/);
    assert.match(ajuda, /parametro definir/);

    // Exercise command dispatch through the real CLI interpreter as well as services.
    (cli as any).perguntarSenha = async () => "senha-cli-novo";
    const criacaoUsuario = await capturarSaida(() => cli.processarComando(
      'usuario criar --usuario cli-operador --nome "CLI Tester" --papel OPERADOR_CADASTRO'
    ));
    assert.match(criacaoUsuario, /Usuário criado: cli-operador/);
    assert.equal(auth.buscarUsuario("cli-operador", "admin").obterNome(), "CLI Tester");

    const atualizarOrgCli = await capturarSaida(() => cli.processarComando(
      'org atualizar --id org-fase23 --razao "Empresa Atualizada"'
    ));
    assert.match(atualizarOrgCli, /Organização atualizada/);
    assert.equal(organizacoes.buscarOrganizacao("org-fase23").razaoSocial, "Empresa Atualizada");

    const atualizarLoteCli = await capturarSaida(() => cli.processarComando(
      'lote atualizar --id lote-fase23 --nf "NF FINAL"'
    ));
    assert.match(atualizarLoteCli, /Lote atualizado/);

    const atualizarEquipCli = await capturarSaida(() => cli.processarComando(
      'equip atualizar --id equip-fase23 --marca "Marca com Espaço"'
    ));
    assert.match(atualizarEquipCli, /Equipamento atualizado/);

    const definirParametroCli = await capturarSaida(() => cli.processarComando(
      "parametro definir --nome aliquotaImpostoPercentual --valor 12"
    ));
    assert.match(definirParametroCli, /Parâmetro atualizado/);
    const parametrosCli = await capturarSaida(() => cli.processarComando("parametro listar"));
    assert.match(parametrosCli, /12\.00%/);

    const listagemOrganizacoesCli = await capturarSaida(() => cli.processarComando("org listar"));
    assert.match(listagemOrganizacoesCli, /=== Organizações ===/);
    assert.match(listagemOrganizacoesCli, /org-fase23/);
    assert.match(listagemOrganizacoesCli, /Total: \d+/);

    const listagemVaziaEquipamentosCli = await capturarSaida(() => cli.processarComando("equip listar --lote lote-inexistente"));
    assert.match(listagemVaziaEquipamentosCli, /=== Equipamentos/);
    assert.match(listagemVaziaEquipamentosCli, /Nenhum equipamento encontrado com os filtros informados\./);
    assert.match(listagemVaziaEquipamentosCli, /Total: 0/);

    const auditoriaCli = await capturarSaida(() => cli.processarComando(
      "auditoria listar --usuario admin --entidade organizacoes.enc --de 2020-01-01 --ate 2036-01-01"
    ));
    assert.match(auditoriaCli, /=== Auditoria \(filtros: usuário=admin, entidade=organizacoes\.enc, de=2020-01-01, até=2036-01-01\) ===/);
    assert.match(auditoriaCli, /organizacoes\.enc/);

    const criarContratoCli = await capturarSaida(() => cli.processarComando(
      "contrato criar --org org-fase23 --id ctr-cli --vencimento 2035-12-30 --valor 125"
    ));
    assert.match(criarContratoCli, /Contrato criado/);
    const listarContratosCli = await capturarSaida(() => cli.processarComando("contrato listar --org org-fase23"));
    assert.match(listarContratosCli, /=== Contratos da organização org-fase23 ===/);
    assert.match(listarContratosCli, /ctr-cli/);
    assert.match(listarContratosCli, /Total: \d+/);
    const buscarContratoCli = await capturarSaida(() => cli.processarComando("contrato buscar --org org-fase23 --id ctr-cli"));
    assert.match(buscarContratoCli, /Contrato ctr-cli/);
    const atualizarContratoCli = await capturarSaida(() => cli.processarComando("contrato atualizar --org org-fase23 --id ctr-cli --valor 150"));
    assert.match(atualizarContratoCli, /Contrato atualizado/);
    assert.equal(organizacoes.obterContrato("org-fase23", "ctr-cli", "admin").valorMensal, 150);
    const cancelarContratoCli = await capturarSaida(() => cli.processarComando("contrato cancelar --org org-fase23"));
    assert.match(cancelarContratoCli, /Contrato cancelado/);
    deveFalhar(() => organizacoes.atualizarContrato("org-fase23", "ctr-cli", { valorMensal: 200 }, "admin"), /cancelado/i);

    // Exercise the real lot lifecycle; no test fixture forces the FINALIZADO state.
    const equipamentoFinal = new Equipamento("equip-remocao-final", "GC-NOTE-000025", TipoEquipamento.NOTEBOOK, "Marca", "Modelo", 2024, EstadoFisico.NOVO, 1);
    lotes.adicionarEquipamentoLote(loteRemocao.id, equipamentoFinal, "admin");
    for (const idLote of [lote.id, loteRemocao.id]) {
      lotes.processarTriagem(idLote, "admin");
      lotes.encaminharLote(idLote, "admin");
      lotes.finalizarLote(idLote, "admin");
      assert.equal(lotes.obterLote(idLote, "admin").statusProcessamento, StatusLote.FINALIZADO);
    }
    organizacoes.desativarOrganizacao(org.id, "admin");
    assert.equal(organizacoes.buscarOrganizacao(org.id).ativo, false);
    organizacoes.ativarOrganizacao(org.id, "admin");
    assert.equal(organizacoes.buscarOrganizacao(org.id).ativo, true);

    console.log("CRUD, CLI, ciclo do lote, soft delete, invalidação de sessão, parâmetros, journal e financeiro ok👍");
  } finally {
    ambiente.limpar();
  }
}

main().catch((erro) => {
  console.error("Falha no teste de regressão Fase 2/3:", erro);
  process.exitCode = 1;
});
