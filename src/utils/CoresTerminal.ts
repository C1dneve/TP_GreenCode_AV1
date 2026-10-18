/** Centraliza as mensagens e estilos do terminal sem depender da cor para transmitir significado. */
export type TipoMensagemTerminal = "ok" | "erro" | "aviso" | "info";
export type EstiloTerminal = "titulo" | "selecionado" | "secundario";

type ColorSet = {
  green: (text: string) => string;
  red: (text: string) => string;
  yellow: (text: string) => string;
  cyan: (text: string) => string;
  bold: (text: string) => string;
  dim: (text: string) => string;
  reset?: (text: string) => string;
};
type PicocolorsModule = {
  createColors?: (enabled?: boolean) => ColorSet;
  isColorSupported?: boolean;
} & Partial<ColorSet>;

let picocolorsCache: PicocolorsModule | null | undefined;

function carregarPicocolors(): PicocolorsModule | null {
  if (picocolorsCache !== undefined) return picocolorsCache;
  try {
    // Carregamento preguiçoso mantém testes isolados executáveis antes do npm ci.
    picocolorsCache = require("picocolors") as PicocolorsModule;
  } catch {
    picocolorsCache = null;
  }
  return picocolorsCache;
}

export function coresTerminalHabilitadas(
  ambiente: NodeJS.ProcessEnv = process.env,
  terminalInterativo: boolean = Boolean(process.stdout.isTTY),
): boolean {
  // NO_COLOR tem precedência para que a saída possa ser consumida por scripts.
  if (ambiente.NO_COLOR !== undefined) return false;
  if (ambiente.FORCE_COLOR !== undefined && ambiente.FORCE_COLOR !== "0") return true;
  if (ambiente.TERM === "dumb") return false;
  return terminalInterativo;
}

function aplicarCor(tipo: "green" | "red" | "yellow" | "cyan" | "bold" | "dim", texto: string, habilitar: boolean): string {
  if (!habilitar || !texto) return texto;
  const pc = carregarPicocolors();
  if (pc?.createColors) return pc.createColors(habilitar)[tipo](texto);
  if (pc?.[tipo]) return pc[tipo]!(texto);
  // Fallback de segurança caso a dependência ainda não tenha sido instalada.
  const codigos: Record<typeof tipo, string> = {
    green: "32", red: "31", yellow: "33", cyan: "36", bold: "1", dim: "2",
  };
  return `\u001b[${codigos[tipo]}m${texto}\u001b[0m`;
}

const rotulos: Record<TipoMensagemTerminal, string> = {
  ok: "OK",
  erro: "ERRO",
  aviso: "AVISO",
  info: "INFO",
};
const cores: Record<TipoMensagemTerminal, "green" | "red" | "yellow" | "cyan"> = {
  ok: "green",
  erro: "red",
  aviso: "yellow",
  info: "cyan",
};

export function formatarMensagemTerminal(tipo: TipoMensagemTerminal, texto: string, habilitarCores?: boolean): string {
  const ativa = habilitarCores ?? coresTerminalHabilitadas();
  const prefixo = `[${rotulos[tipo]}]`;
  return `${aplicarCor(cores[tipo], aplicarCor("bold", prefixo, ativa), ativa)} ${texto}`;
}

export function logMensagemTerminal(tipo: TipoMensagemTerminal, texto: string): void {
  console.log(formatarMensagemTerminal(tipo, texto));
}

export function estilizarTerminal(estilo: EstiloTerminal, texto: string, habilitarCores?: boolean): string {
  const ativa = habilitarCores ?? coresTerminalHabilitadas();
  const cor: Record<EstiloTerminal, "cyan" | "bold" | "dim"> = {
    titulo: "cyan",
    selecionado: "cyan",
    secundario: "dim",
  };
  const inicial = aplicarCor(cor[estilo], texto, ativa);
  return estilo === "selecionado" ? aplicarCor("bold", inicial, ativa) : inicial;
}
