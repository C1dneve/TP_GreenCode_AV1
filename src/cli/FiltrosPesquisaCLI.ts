/** Utilitários pequenos e puros para pesquisas consistentes nas listagens da CLI. */
export function normalizarTextoPesquisa(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function obterBuscaCLI(valor: string | undefined, nomeFlag = "busca"): string | undefined {
  if (valor === undefined) return undefined;
  const consulta = valor.trim();
  if (!consulta) throw new Error(`O parâmetro --${nomeFlag} exige um texto não vazio.`);
  return normalizarTextoPesquisa(consulta);
}

export function correspondeBuscaCLI(consultaNormalizada: string | undefined, ...campos: Array<string | undefined | null>): boolean {
  if (consultaNormalizada === undefined) return true;
  const texto = campos.filter((campo): campo is string => campo !== undefined && campo !== null).map(String).join(" ");
  return normalizarTextoPesquisa(texto).includes(consultaNormalizada);
}

export function tituloComFiltrosCLI(titulo: string, filtros: Array<string | undefined | null | false>): string {
  const aplicados = filtros.filter((filtro): filtro is string => typeof filtro === "string" && filtro.length > 0);
  return aplicados.length ? `${titulo} (filtros: ${aplicados.join(", ")})` : titulo;
}
