import { montarLinhasMenuHibrido, limitarLinhaMenu, calcularJanelaOpcoes } from "../cli/PromptMenuHibrido";

function assert(condicao: boolean, mensagem: string): void {
  if (!condicao) throw new Error(`Falhou: ${mensagem}`);
}

console.log("Fase 4 — renderização estável do seletor do menu...");
const config = {
  titulo: "GREENCODE | LOTES",
  opcoes: Array.from({ length: 12 }, (_, indice) => ({ titulo: `lote comando ${indice + 1}`, numero: indice + 1 })).concat([{ titulo: "Voltar ao menu principal", numero: 0 }]),
  indiceInicial: 0,
  autocompletar: (_linha: string): [string[], string] => [[], ""],
};
const primeira = montarLinhasMenuHibrido(config, 0, true, "", [], 5, 80);
const meio = montarLinhasMenuHibrido(config, 6, true, "", [], 5, 80);
const fim = montarLinhasMenuHibrido(config, 12, true, "", [], 5, 80);
assert(primeira.length === meio.length && meio.length === fim.length, "quadro mantém altura constante ao rolar a janela");
assert(primeira.length === 13, "quadro reserva espaço fixo para título, indicadores, opções, rodapé, sugestões e prompt");
const comSugestoes = montarLinhasMenuHibrido(config, 6, true, "org lis", ["org listar", "org listar --todos"], 5, 80);
assert(comSugestoes.length === meio.length, "exibir ou ocultar sugestões não altera a altura do quadro");
assert(primeira.some((linha) => linha.includes(">  1.")), "primeira opção pode receber marcador");
assert(meio.some((linha) => linha.includes(">  7.")), "opção selecionada continua visível no meio da lista");
assert(fim.some((linha) => linha.includes(">  0.")), "opção de retorno continua selecionável no fim da lista");
const quadroLongo = montarLinhasMenuHibrido({ ...config, opcoes: [{ titulo: "x".repeat(140), numero: 1 }] }, 0, true, "", [], 5, 40);
const linhaOpcao = quadroLongo.find((linha) => linha.includes("1.")) ?? "";
const linhaOpcaoVisivel = linhaOpcao.replace(/\u001b\[[0-9;]*m/g, "");
assert(linhaOpcaoVisivel.length <= 40, "opções são truncadas antes da quebra automática de linha");
assert(limitarLinhaMenu("abcdefgh", 5) === "abcd…", "truncamento preserva indicador de continuação");
const janelaIndiceInvalido = calcularJanelaOpcoes(config.opcoes, Number.NaN, 5);
assert(janelaIndiceInvalido.length === 5, "um índice inválido não pode esvaziar a janela");
assert(janelaIndiceInvalido[0].indiceGlobal === 0, "um índice inválido é recuperado para o início da lista");
const quadroIndiceInvalido = montarLinhasMenuHibrido(config, Number.NaN, true, "", [], 5, 80);
assert(quadroIndiceInvalido.some((linha) => linha.includes(">  1.")), "o renderizador usa índice seguro ao desenhar o marcador");
console.log("Quadro estável, paginação, truncamento e recuperação de índice inválido ok👍");
