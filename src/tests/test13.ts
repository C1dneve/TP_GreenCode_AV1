import { calcularIndiceAposSeta, calcularJanelaOpcoes } from "../cli/PromptMenuHibrido";

function assert(condicao: boolean, mensagem: string): void {
  if (!condicao) throw new Error(`Falhou: ${mensagem}`);
}

console.log("Fase 4 — regressão da navegação por setas no menu...");
const opcoes = Array.from({ length: 13 }, (_, indice) => ({ id: indice }));
let indice = 12;
indice = calcularIndiceAposSeta(indice, "up", opcoes.length);
assert(indice === 11, "seta para cima move um índice, sem alterar o tipo do estado");
let janela = calcularJanelaOpcoes(opcoes, indice, 4);
assert(janela.length === 4 && janela.some((item) => item.indiceGlobal === indice), "a opção selecionada continua visível ao mover para cima perto do fim");
indice = calcularIndiceAposSeta(indice, "up", opcoes.length);
assert(indice === 10, "movimentos sucessivos para cima continuam numéricos");
janela = calcularJanelaOpcoes(opcoes, indice, 4);
assert(janela.length === 4 && janela.some((item) => item.indiceGlobal === indice), "a janela não desaparece ao mover novamente para cima");
indice = calcularIndiceAposSeta(indice, "down", opcoes.length);
assert(indice === 11, "seta para baixo recupera o próximo índice");
janela = calcularJanelaOpcoes(opcoes, indice, 4);
assert(janela.length === 4 && janela.some((item) => item.indiceGlobal === indice), "a janela continua visível ao voltar para baixo");
indice = calcularIndiceAposSeta(0, "up", opcoes.length);
assert(indice === opcoes.length - 1, "seta para cima no início percorre circularmente para o fim");
indice = calcularIndiceAposSeta(indice, "down", opcoes.length);
assert(indice === 0, "seta para baixo no fim percorre circularmente para o início");
console.log("Movimentos sucessivos mantêm índice numérico e janela visível ok👍");
