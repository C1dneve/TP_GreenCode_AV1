import assert from "node:assert/strict";
import { formatarListagemCLI } from "../cli/FormatadorListaCLI";

console.log("Fase 4.7.1 — testes do formatador comum de listagens...");

const preenchida = formatarListagemCLI(
  "Organizações",
  [{ id: "org-1", razao: "Empresa Exemplo" }],
  (organizacao) => `${organizacao.id} — ${organizacao.razao}`
);
assert.match(preenchida, /=== Organizações ===/);
assert.match(preenchida, /org-1 — Empresa Exemplo/);
assert.match(preenchida, /Total: 1/);
assert.doesNotMatch(preenchida, /Nenhum registro encontrado/);

const vazia = formatarListagemCLI(
  "Equipamentos",
  [],
  () => "não deve ser chamado",
  "Nenhum equipamento encontrado com os filtros informados."
);
assert.match(vazia, /=== Equipamentos ===/);
assert.match(vazia, /Nenhum equipamento encontrado com os filtros informados\./);
assert.match(vazia, /Total: 0/);

assert.throws(
  () => formatarListagemCLI("   ", [], () => ""),
  /precisa de um título/i,
  "Título vazio precisa ser rejeitado para manter uma listagem identificável."
);

console.log("Formatador comum ok👍");
