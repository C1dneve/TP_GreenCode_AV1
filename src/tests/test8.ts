import { moverSelecaoMenu, numeroDaOpcaoSelecionada } from "../cli/NavegacaoMenuCLI";
import { assertEqual } from "./testUtils";

console.log("Fase 4.1 — testes das operações de seleção do menu interativo...");
assertEqual(moverSelecaoMenu(0, 1, 4), 1, "seta para baixo avança uma opção");
assertEqual(moverSelecaoMenu(3, 1, 4), 0, "seta para baixo faz wrap no fim");
assertEqual(moverSelecaoMenu(0, -1, 4), 3, "seta para cima faz wrap no início");
assertEqual(moverSelecaoMenu(2, -1, 4), 1, "seta para cima recua uma opção");
assertEqual(moverSelecaoMenu(8, 1, 0), -1, "menu vazio não possui seleção");
assertEqual(moverSelecaoMenu(-1, 1, 3), 0, "índice inválido é normalizado");
assertEqual(numeroDaOpcaoSelecionada(1, [1, 2, 0]), 2, "índice selecionado mantém o atalho numérico");
assertEqual(numeroDaOpcaoSelecionada(2, [1, 2, 0]), 0, "seleção do item voltar/modo direto mantém o atalho especial");
assertEqual(numeroDaOpcaoSelecionada(3, [1, 2, 0]), undefined, "índice fora da lista é rejeitado");
console.log("Navegação do menu ok👍");
