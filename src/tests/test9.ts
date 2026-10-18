import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CLIInterface, interpretarComando } from "../cli/CLIInterface";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao";

async function capturarSaida(operacao: () => Promise<void>): Promise<string> {
  const saida: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => saida.push(args.map(String).join(" "));
  try {
    await operacao();
  } finally {
    console.log = originalLog;
  }
  return saida.join("\n");
}

async function main(): Promise<void> {
  console.log("Fase 4.7.2 — pesquisa e filtros progressivos nas listagens...");
  const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), "greencode-fase472-"));
  try {
    const auth = new ServicoAutenticacao(diretorio);
    auth.provisionarInicial("senha-admin-f472", "admin");
    auth.criarUsuario("operador-pesquisa", "senha-operador", PapelUsuario.OPERADOR_CADASTRO, "admin", "Ana Silva");
    const cli = new CLIInterface(auth);
    (cli as any).montarServicosDeNegocio();
    (cli as any).sessaoAtual = auth.login("admin", "senha-admin-f472");

    const parse = interpretarComando('org criar --razao "GreenCode Pesquisa LTDA" --endereco "Rua Teste 100"');
    assert.equal(parse.flags.razao, "GreenCode Pesquisa LTDA", "Valores com espaços dentro de aspas devem ser preservados.");
    assert.equal(parse.flags.endereco, "Rua Teste 100");

    await cli.processarComando(
      'org criar --id org-pesquisa --razao "GreenCode Pesquisa LTDA" --cnpj 52998296000185 --ie 123 --endereco "Rua Pesquisa 100" --telefone 12999999999 --email pesquisa@example.com --contrato-id ctr-pesquisa --contrato-vencimento 2030-12-31 --contrato-valor 900'
    );
    await cli.processarComando('lote criar --id lote-pesquisa --org org-pesquisa --nf NF-PESQUISA-2026 --transp "Trans Pesquisa"');
    await cli.processarComando('equip cadastrar --id equip-pesquisa --tipo NOTEBOOK --marca Dell --modelo Latitude --ano 2024 --estado NOVO --peso 1.5 --lote lote-pesquisa');

    const usuario = await capturarSaida(() => cli.processarComando('usuario listar --busca "ana silva" --papel OPERADOR_CADASTRO'));
    assert.match(usuario, /filtros: busca=ana silva, papel=OPERADOR_CADASTRO/i);
    assert.match(usuario, /operador-pesquisa — Ana Silva/);
    assert.match(usuario, /Total: 1/);

    const organizacao = await capturarSaida(() => cli.processarComando('org listar --busca "greencode pesquisa"'));
    assert.match(organizacao, /filtros: busca=greencode pesquisa/i);
    assert.match(organizacao, /org-pesquisa — GreenCode Pesquisa LTDA/);
    assert.match(organizacao, /Total: 1/);

    const organizacaoVazia = await capturarSaida(() => cli.processarComando('org listar --busca inexistente'));
    assert.match(organizacaoVazia, /Nenhuma organização ativa encontrada com os filtros informados/);
    assert.match(organizacaoVazia, /Total: 0/);

    const contratoAtivo = await capturarSaida(() => cli.processarComando(
      'contrato listar --org org-pesquisa --status ativo --de 2030-01-01 --ate 2031-01-01'
    ));
    assert.match(contratoAtivo, /status=ativo/);
    assert.match(contratoAtivo, /ctr-pesquisa — ATIVO/);
    assert.match(contratoAtivo, /Total: 1/);

    const lote = await capturarSaida(() => cli.processarComando('lote listar --busca "nf-pesquisa" --org org-pesquisa --status RECEBIDO'));
    assert.match(lote, /busca=nf-pesquisa/);
    assert.match(lote, /organização=org-pesquisa/);
    assert.match(lote, /status=RECEBIDO/);
    assert.match(lote, /lote-pesquisa/);
    assert.match(lote, /Total: 1/);

    const equipamento = await capturarSaida(() => cli.processarComando('equip listar --busca "dell lati" --tipo NOTEBOOK --status AGUARDANDO_TRIAGEM'));
    assert.match(equipamento, /busca=dell lati/);
    assert.match(equipamento, /equip-pesquisa — NOTEBOOK — Dell Latitude/);
    assert.match(equipamento, /Total: 1/);

    const equipamentoVazio = await capturarSaida(() => cli.processarComando('equip listar --busca "não existe"'));
    assert.match(equipamentoVazio, /Nenhum equipamento encontrado com os filtros informados/);
    assert.match(equipamentoVazio, /Total: 0/);

    const statusInvalido = await capturarSaida(() => cli.processarComando('contrato listar --org org-pesquisa --status pendente'));
    assert.match(statusInvalido, /aceita apenas ativo ou cancelado/i);
    const intervaloInvalido = await capturarSaida(() => cli.processarComando('contrato listar --org org-pesquisa --de 2031-01-01 --ate 2030-01-01'));
    assert.match(intervaloInvalido, /--de não pode ser posterior ao parâmetro --ate/);
    const buscaVazia = await capturarSaida(() => cli.processarComando('org listar --busca ""'));
    assert.match(buscaVazia, /--busca exige um texto não vazio/);

    await cli.processarComando('contrato cancelar --org org-pesquisa');
    const contratoCancelado = await capturarSaida(() => cli.processarComando('contrato listar --org org-pesquisa --status cancelado'));
    assert.match(contratoCancelado, /ctr-pesquisa — CANCELADO/);
    assert.match(contratoCancelado, /Total: 1/);

    console.log("Pesquisa de texto, filtros combinados, períodos, entradas inválidas e aspas ok👍");
  } finally {
    fs.rmSync(diretorio, { recursive: true, force: true });
  }
}

main().catch((erro) => {
  console.error("Falha nos testes de pesquisa/filtros da Fase 4.7.2:", erro);
  process.exitCode = 1;
});
