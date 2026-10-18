import { moverSelecaoMenu } from "./NavegacaoMenuCLI";
import { estilizarTerminal } from "../utils/CoresTerminal";

export interface OpcaoMenuHibrido {
  titulo: string;
  numero: number;
}

/** Calcula o próximo índice para a tecla recebida, mantendo a seleção circular. */
export function calcularIndiceAposSeta(
  indiceAtual: number,
  tecla: "up" | "down",
  quantidade: number,
): number {
  return moverSelecaoMenu(indiceAtual, tecla === "up" ? -1 : 1, quantidade);
}

export type ResultadoMenuHibrido =
  | { tipo: "selecao"; indice: number }
  | { tipo: "entrada"; texto: string }
  | { tipo: "cancelado" }
  | { tipo: "vazio" };

export interface ConfigPromptMenuHibrido {
  titulo: string;
  opcoes: OpcaoMenuHibrido[];
  indiceInicial: number;
  autocompletar: (linha: string) => [string[], string];
}

type TeclaPrompt = { name?: string; ctrl?: boolean; meta?: boolean; sequence?: string };
type ReadlinePrompt = {
  line: string;
  history?: string[];
  completer?: (linha: string) => [string[], string];
  write: (texto: string | null, tecla?: { ctrl?: boolean; name?: string }) => void;
};
type InquirerCoreApi = {
  createPrompt<T, C>(render: (config: C, done: (valor: T) => void) => string):
    (config: C, contexto?: { clearPromptOnDone?: boolean }) => Promise<T>;
  useState<T>(inicial: T): [T, (valor: T) => void];
  useKeypress(handler: (tecla: TeclaPrompt, rl: ReadlinePrompt) => void): void;
};
type PromptRuntimeConfig = ConfigPromptMenuHibrido & { pageSize: number };

/** Escolhe quais opções cabem na janela sem alterar a ordem/numeracão original. */
export function calcularJanelaOpcoes<T>(itens: readonly T[], indiceAtivo: number, tamanhoPagina: number): Array<{ item: T; indiceGlobal: number }> {
  if (!itens.length) return [];
  const tamanho = Math.max(1, Math.min(itens.length, Math.trunc(tamanhoPagina) || 1));
  // Protege a janela contra NaN/Infinity. Um índice inválido deve voltar ao
  // início da lista, nunca produzir uma janela vazia (slice(NaN, NaN)).
  const indiceFinito = Number.isFinite(indiceAtivo) ? Math.trunc(indiceAtivo) : 0;
  const indice = Math.max(0, Math.min(itens.length - 1, indiceFinito));
  const inicio = Math.max(0, Math.min(indice - Math.floor(tamanho / 2), itens.length - tamanho));
  return itens.slice(inicio, inicio + tamanho).map((item, deslocamento) => ({ item, indiceGlobal: inicio + deslocamento }));
}


/** Corta texto de apresentação para que uma opção ocupe uma única linha física. */
export function limitarLinhaMenu(texto: string, largura: number): string {
  const limite = Math.max(1, Math.trunc(largura) || 1);
  const caracteres = Array.from(texto);
  if (caracteres.length <= limite) return texto;
  if (limite === 1) return "…";
  return `${caracteres.slice(0, limite - 1).join("")}…`;
}

/**
 * Monta um quadro de altura constante. Manter as mesmas linhas em todas as
 * renderizações impede que o screen manager do Inquirer perca a posição do
 * cursor quando a janela começa/termina de mostrar indicadores de paginação.
 */
export function montarLinhasMenuHibrido(
  config: ConfigPromptMenuHibrido,
  indice: number,
  seletorAtivo: boolean,
  entrada: string,
  sugestoes: readonly string[],
  tamanhoPagina: number,
  larguraTerminal: number,
): string[] {
  const pagina = Math.max(1, Math.min(config.opcoes.length || 1, Math.trunc(tamanhoPagina) || 1));
  const largura = Math.max(20, Math.trunc(larguraTerminal) || 80);
  // O índice usado tanto para paginar quanto para desenhar o marcador deve ser
  // finito e normalizado. Isso impede que um estado transitório inválido esconda
  // todas as opções durante o redesenho do prompt.
  const indiceFinito = Number.isFinite(indice) ? Math.trunc(indice) : 0;
  const indiceSeguro = Math.max(0, Math.min(Math.max(config.opcoes.length - 1, 0), indiceFinito));
  const janela = calcularJanelaOpcoes(config.opcoes, indiceSeguro, pagina);
  const primeiraGlobal = janela[0]?.indiceGlobal ?? 0;
  const ultimaGlobal = janela[janela.length - 1]?.indiceGlobal ?? -1;
  const acima = primeiraGlobal;
  const abaixo = Math.max(0, config.opcoes.length - ultimaGlobal - 1);
  const linhas: string[] = [
    estilizarTerminal("titulo", limitarLinhaMenu(`========== ${config.titulo} ==========`, largura)),
    "",
    acima > 0 ? estilizarTerminal("secundario", limitarLinhaMenu(`  ... ${acima} opções acima`, largura)) : "",
  ];

  for (let posicao = 0; posicao < pagina; posicao += 1) {
    const itemJanela = janela[posicao];
    if (!itemJanela) {
      linhas.push("");
      continue;
    }
    const marcada = seletorAtivo && itemJanela.indiceGlobal === indiceSeguro;
    const prefixo = `${marcada ? ">" : " "} ${itemJanela.item.numero.toString().padStart(2, " ")}. `;
    const tituloLimitado = limitarLinhaMenu(itemJanela.item.titulo, Math.max(1, largura - Array.from(prefixo).length));
    const linha = `${prefixo}${tituloLimitado}`;
    linhas.push(marcada ? estilizarTerminal("selecionado", linha) : linha);
  }

  linhas.push(abaixo > 0 ? estilizarTerminal("secundario", limitarLinhaMenu(`  ... ${abaixo} opções abaixo`, largura)) : "");
  linhas.push("");
  linhas.push(estilizarTerminal("secundario", limitarLinhaMenu("↑/↓ mover | Enter escolher | número + Enter direto | comando livre | Esc sair", largura)));
  // Não cortamos a entrada de texto: readline precisa continuar exibindo a linha
  // completa para manter o comportamento normal de edição/comandos longos.
  linhas.push(`greencode> ${entrada}`);
  // Reserva sempre esta linha: Tab não deve alterar a altura do quadro.
  linhas.push(sugestoes.length
    ? estilizarTerminal("secundario", limitarLinhaMenu(`Sugestões: ${sugestoes.join("  ")}`, largura))
    : "");
  return linhas;
}

/** Mantém a distinção: linha numérica/textual é entrada direta; linha vazia escolhe apenas se o seletor estiver ativo. */
export function resolverEntradaMenuHibrido(texto: string, indiceSelecionado: number, seletorAtivo: boolean, quantidadeOpcoes: number): ResultadoMenuHibrido {
  const entrada = texto.trim();
  if (entrada) return { tipo: "entrada", texto: entrada };
  if (seletorAtivo && Number.isInteger(indiceSelecionado) && indiceSelecionado >= 0 && indiceSelecionado < quantidadeOpcoes) {
    return { tipo: "selecao", indice: indiceSelecionado };
  }
  return { tipo: "vazio" };
}

/**
 * Prompt customizado Inquirer. É carregado apenas quando o usuário pressiona uma seta,
 * para manter o readline do GreenCode como proprietário da entrada no restante do tempo.
 */
export async function solicitarMenuHibrido(config: ConfigPromptMenuHibrido): Promise<ResultadoMenuHibrido> {
  let core: InquirerCoreApi;
  try {
    // @inquirer/core é ESM moderno; Node 24 suporta require() de ESM sem top-level await.
    // O require preguiçoso evita inicializar uma segunda leitura do stdin no modo normal.
    core = require("@inquirer/core") as InquirerCoreApi;
  } catch (erro) {
    throw new Error(`Não foi possível carregar @inquirer/core. Execute npm ci e tente novamente. ${(erro as Error).message}`);
  }

  const quantidadeLinhas = typeof process.stdout.rows === "number" ? process.stdout.rows : 24;
  // Reservamos espaço para título, indicadores, instruções e prompt. A janela
  // usa no máximo 8 opções e deixa sempre margens para evitar scroll do terminal.
  const pageSize = Math.max(4, Math.min(8, quantidadeLinhas - 12));
  const executarPrompt = core.createPrompt<ResultadoMenuHibrido, PromptRuntimeConfig>((cfg, done) => {
    const indiceInicialFinito = Number.isFinite(cfg.indiceInicial) ? Math.trunc(cfg.indiceInicial) : 0;
    const indiceInicialSeguro = Math.max(0, Math.min(Math.max(cfg.opcoes.length - 1, 0), indiceInicialFinito));
    const [indice, setIndice] = core.useState(indiceInicialSeguro);
    const [entrada, setEntrada] = core.useState("");
    const [seletorAtivo, setSeletorAtivo] = core.useState(true);
    const [sugestoes, setSugestoes] = core.useState<string[]>([]);

    core.useKeypress((tecla, rl) => {
      const linha = typeof rl.line === "string" ? rl.line : entrada;

      // Tab mantém autocomplete de comandos mesmo dentro da interação híbrida.
      if (tecla.name === "tab") {
        setImmediate(() => {
          const linhaAtual = typeof rl.line === "string" ? rl.line : entrada;
          const [opcoes] = cfg.autocompletar(linhaAtual);
          const correspondencias = [...new Set(opcoes)].filter((item) => item.toLocaleLowerCase("pt-BR").startsWith(linhaAtual.toLocaleLowerCase("pt-BR")));
          const prefixoComum = (valores: string[]): string => {
            if (!valores.length) return linhaAtual;
            let prefixo = valores[0];
            for (const valor of valores.slice(1)) {
              while (prefixo && !valor.toLocaleLowerCase("pt-BR").startsWith(prefixo.toLocaleLowerCase("pt-BR"))) prefixo = prefixo.slice(0, -1);
            }
            return prefixo;
          };
          const completado = prefixoComum(correspondencias);
          if (completado.length > linhaAtual.length) {
            rl.write(null, { ctrl: true, name: "u" });
            rl.write(completado);
            setEntrada(completado);
            setSugestoes([]);
          } else {
            setSugestoes(correspondencias.slice(0, 12));
          }
          setSeletorAtivo(false);
        });
        return;
      }

      if (tecla.ctrl && tecla.name === "c") {
        done({ tipo: "cancelado" });
        return;
      }
      if (tecla.name === "escape") {
        done({ tipo: "cancelado" });
        return;
      }
      if (tecla.name === "return" || tecla.name === "enter") {
        const texto = resolverEntradaMenuHibrido(entrada || linha, indice, seletorAtivo, cfg.opcoes.length);
        done(texto);
        return;
      }
      if ((tecla.name === "up" || tecla.name === "down") && !linha.trim() && !entrada.trim()) {
        setSeletorAtivo(true);
        // Passamos sempre o próximo índice como número explícito. Isso evita
        // depender da semântica de updater funcional entre versões de @inquirer/core
        // e impede que uma função seja armazenada como estado do índice.
        setIndice(calcularIndiceAposSeta(indice, tecla.name === "up" ? "up" : "down", cfg.opcoes.length));
        setSugestoes([]);
        return;
      }
      // Texto ou números digitados passam a ser entrada direta, sem selecionar a opção marcada.
      setEntrada(linha);
      if (linha.trim()) setSeletorAtivo(false);
      setSugestoes([]);
    });

    const larguraTerminal = typeof process.stdout.columns === "number" ? process.stdout.columns : 80;
    const linhas = montarLinhasMenuHibrido(
      cfg,
      indice,
      seletorAtivo,
      entrada,
      sugestoes,
      cfg.pageSize,
      larguraTerminal,
    );
    return linhas.join("\n");
  });

  return executarPrompt({ ...config, pageSize }, { clearPromptOnDone: true });
}
