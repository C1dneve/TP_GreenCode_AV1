/**
 * Conversão compartilhada entre entidades de domínio e dados JSON.
 * Os nomes dos campos que representam datas são declarados uma única vez;
 * a conversão percorre arrays e objetos aninhados (por exemplo, organização/contrato
 * e lote/equipamento/histórico de movimentação).
 */
const CAMPOS_DATA = new Set([
  "dataAssinatura",
  "dataVencimento",
  "dataCancelamento",
  "ultimoAcesso",
  "dataHora",
  "dataEntrada",
  "dataCadastro",
]);

function percorrer(valor: unknown, restaurar: boolean, chave?: string): unknown {
  if (restaurar && chave && CAMPOS_DATA.has(chave)) {
    if (valor === null || valor === undefined || valor instanceof Date) {
      return valor;
    }
    if (typeof valor === "string" || typeof valor === "number") {
      return new Date(valor);
    }
  }

  if (valor instanceof Date) {
    return restaurar ? new Date(valor) : valor.toISOString();
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => percorrer(item, restaurar));
  }

  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([nome, item]) => [
        nome,
        percorrer(item, restaurar, nome),
      ])
    );
  }

  return valor;
}

/** Transforma Date em ISO 8601 sem modificar o objeto original. */
export function serializarDados<T extends Record<string, unknown>>(dados: T): Record<string, unknown> {
  return percorrer(dados, false) as Record<string, unknown>;
}

/** Reconstrói os campos de data conhecidos também dentro de estruturas aninhadas. */
export function restaurarDatas<T extends Record<string, any>>(dados: T): T {
  return percorrer(dados, true) as T;
}
