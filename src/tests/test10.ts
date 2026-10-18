import { formatarMensagemTerminal, estilizarTerminal, coresTerminalHabilitadas } from "../utils/CoresTerminal";

function assert(condicao: boolean, mensagem: string): void {
  if (!condicao) throw new Error(`Falhou: ${mensagem}`);
}

console.log("Fase 4 — cores e mensagens centralizadas...");
assert(formatarMensagemTerminal("ok", "Teste", false) === "[OK] Teste", "modo sem cor mantém o rótulo legível");
assert(formatarMensagemTerminal("erro", "Entrada inválida", false) === "[ERRO] Entrada inválida", "erro mantém o prefixo textual");
assert(formatarMensagemTerminal("aviso", "Atenção", false) === "[AVISO] Atenção", "aviso mantém o prefixo textual");
assert(formatarMensagemTerminal("info", "Detalhe", false) === "[INFO] Detalhe", "informação mantém o prefixo textual");
assert(estilizarTerminal("selecionado", "Escolhido", false) === "Escolhido", "estilo é neutro quando cores estão desligadas");
assert(/\u001b\[[0-9;]*m/.test(formatarMensagemTerminal("ok", "Teste", true)), "modo de cores explícito aplica sequência ANSI");
assert(/\u001b\[[0-9;]*m/.test(estilizarTerminal("selecionado", "Escolhido", true)), "estilo selecionado aplica sequência ANSI quando ativado");
assert(!coresTerminalHabilitadas({ NO_COLOR: "1", FORCE_COLOR: "1" }, true), "NO_COLOR tem precedência");
assert(coresTerminalHabilitadas({ FORCE_COLOR: "1" }, false), "FORCE_COLOR ativa a cor explicitamente");
assert(!coresTerminalHabilitadas({ TERM: "dumb" }, true), "TERM=dumb desativa cores automáticas");
console.log("Cores e fallback legível ok👍");
