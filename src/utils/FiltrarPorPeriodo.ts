/** Valida um intervalo opcional sem mudar a precisão temporal informada pelo chamador. */
export function validarPeriodo(
  inicio?: Date,
  fim?: Date,
  mensagemErro = "A data inicial não pode ser posterior à data final."
): void {
  if (inicio && fim && inicio.getTime() > fim.getTime()) {
    throw new Error(mensagemErro);
  }
}

/** Aplica limites inclusivos a uma lista usando a data relevante de cada item. */
export function filtrarPorPeriodo<T>(
  itens: readonly T[],
  obterData: (item: T) => Date,
  inicio?: Date,
  fim?: Date,
  mensagemErroPeriodo?: string
): T[] {
  validarPeriodo(inicio, fim, mensagemErroPeriodo);
  return itens.filter((item) => {
    const data = obterData(item);
    return (!inicio || data.getTime() >= inicio.getTime()) &&
      (!fim || data.getTime() <= fim.getTime());
  });
}
