import * as assert from "assert";
import { Contrato } from "../models/Contrato";
import { Equipamento } from "../models/Equipamento";
import { EstadoFisico } from "../models/enums/EstadoFisico";
import { TipoEquipamento } from "../models/enums/TipoEquipamento";
import { Lote } from "../models/Lote";
import { Organizacao } from "../models/Organizacao";
import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import { exigirEncontrado } from "../utils/ExigirEncontrado";
import { filtrarPorPeriodo } from "../utils/FiltrarPorPeriodo";
import { restaurarDatas, serializarDados } from "../utils/SerializadorDados";

function executar(): void {
  console.log("Fase 5 — serialização, helpers compartilhados e constantes de persistência...");

  const dataCadastro = new Date("2025-01-02T03:04:05.000Z");
  const dataAssinatura = new Date("2025-02-03T04:05:06.000Z");
  const dataVencimento = new Date("2030-12-31T23:59:59.000Z");
  const organizacao = new Organizacao(
    "org-p4", "Empresa P4", "11222333000181", "ISENTO", "Rua de Teste", "11999999999", "p4@example.test", dataCadastro
  );
  organizacao.adicionarContrato(new Contrato(
    "ctr-p4", organizacao.id, dataVencimento, 1250, ["Cláusula de teste"], true, dataAssinatura
  ));

  const dadosOrganizacao = JSON.parse(JSON.stringify(organizacao.paraDados()));
  assert.strictEqual(typeof dadosOrganizacao.dataCadastro, "string");
  assert.strictEqual(typeof dadosOrganizacao.contratos[0].dataVencimento, "string");
  const organizacaoRestaurada = Organizacao.deDados(dadosOrganizacao);
  assert.ok(organizacaoRestaurada.dataCadastro instanceof Date);
  assert.ok(organizacaoRestaurada.contratoVigente?.dataAssinatura instanceof Date);
  assert.ok(organizacaoRestaurada.contratoVigente?.dataVencimento instanceof Date);
  assert.strictEqual(organizacaoRestaurada.contratoVigente?.dataVencimento.toISOString(), dataVencimento.toISOString());

  const lote = new Lote("lote-p4", organizacao.id, "NF-P4", "Transportadora P4", "", dataCadastro);
  const equipamento = new Equipamento(
    "equip-p4", "GC-NOTE-P4", TipoEquipamento.NOTEBOOK, "Dell", "Latitude", 2024, EstadoFisico.NOVO, 2.5, 1000
  );
  lote.adicionarEquipamento(equipamento);
  equipamento.registrarMovimentacao("destino-teste", "admin", "movimentação de teste");
  const dadosLote = JSON.parse(JSON.stringify(lote.paraDados()));
  assert.strictEqual(typeof dadosLote.equipamentos[0].historicoMovimentacao[0].dataHora, "string");
  const loteRestaurado = Lote.deDados(dadosLote);
  assert.ok(loteRestaurado.dataEntrada instanceof Date);
  assert.ok(loteRestaurado.equipamentos[0].historicoMovimentacao[0].dataHora instanceof Date);

  const dataAvulsa = new Date("2026-01-01T00:00:00.000Z");
  const serializado = serializarDados({ dataEntrada: dataAvulsa, aninhado: { dataHora: dataAvulsa } });
  assert.strictEqual(serializado.dataEntrada, dataAvulsa.toISOString());
  const restaurado = restaurarDatas(JSON.parse(JSON.stringify(serializado)));
  assert.ok(restaurado.dataEntrada instanceof Date);
  assert.ok((restaurado.aninhado as Record<string, unknown>).dataHora instanceof Date);

  const registros = [
    { data: new Date("2026-01-01T00:00:00.000Z"), id: "antes" },
    { data: new Date("2026-01-15T00:00:00.000Z"), id: "dentro" },
    { data: new Date("2026-02-01T00:00:00.000Z"), id: "depois" },
  ];
  assert.deepStrictEqual(
    filtrarPorPeriodo(registros, (item) => item.data, new Date("2026-01-10T00:00:00.000Z"), new Date("2026-01-20T00:00:00.000Z")).map((item) => item.id),
    ["dentro"]
  );
  assert.throws(() => filtrarPorPeriodo(registros, (item) => item.data, new Date("2026-02-01"), new Date("2026-01-01")), /data inicial não pode ser posterior/i);
  assert.strictEqual(exigirEncontrado("registro", "Lote"), "registro");
  assert.throws(() => exigirEncontrado(null, "Lote"), /Lote não encontrado/i);
  assert.strictEqual(ARQUIVOS.ORGANIZACOES, "organizacoes.enc");
  assert.strictEqual(ARQUIVOS.JOURNAL_ROTACIONADO_PREFIXO, "journal.transacoes.");

  console.log("Serialização aninhada, datas, filtro por período, helper de entidade e ARQUIVOS ok👍");
}

executar();
