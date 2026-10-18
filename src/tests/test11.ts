import { calcularJanelaOpcoes, resolverEntradaMenuHibrido } from "../cli/PromptMenuHibrido";

function assert(condicao: boolean, mensagem: string): void {
  if (!condicao) throw new Error(`Falhou: ${mensagem}`);
}

console.log("Fase 4 — estado do prompt híbrido Inquirer...");
const opcoes = Array.from({ length: 25 }, (_, indice) => `opcao-${indice + 1}`);
const janela = calcularJanelaOpcoes(opcoes, 15, 10);
assert(janela.length === 10, "janela respeita limite de paginação");
assert(janela.some((item) => item.indiceGlobal === 15), "janela contém a opção ativa");
assert(janela[0].indiceGlobal > 0, "janela pode rolar para opções anteriores");
assert(janela[janela.length - 1].indiceGlobal < opcoes.length - 1, "janela pode rolar para opções posteriores");
const selecionada = resolverEntradaMenuHibrido("", 2, true, 5);
assert(selecionada.tipo === "selecao" && selecionada.indice === 2, "Enter vazio seleciona só quando seletor está ativo");
const numero = resolverEntradaMenuHibrido("2", 2, true, 5);
assert(numero.tipo === "entrada" && numero.texto === "2", "entrada numérica continua sendo atalho direto");
const comando = resolverEntradaMenuHibrido("org listar", 2, true, 5);
assert(comando.tipo === "entrada" && comando.texto === "org listar", "texto livre vai para o processador de comandos");
assert(resolverEntradaMenuHibrido("", 2, false, 5).tipo === "vazio", "Enter vazio não executa seleção antes de ativar seletor");
assert(resolverEntradaMenuHibrido("", 2, true, 2).tipo === "vazio", "índice inválido não seleciona opção");
console.log("Seleção híbrida, entrada numérica e texto livre ok👍");
