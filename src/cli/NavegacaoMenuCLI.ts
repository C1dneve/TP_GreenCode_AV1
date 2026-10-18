/** Operações puras para seleção circular do menu interativo da CLI. */
export function moverSelecaoMenu(indiceAtual: number, direcao: -1 | 1, quantidade: number): number {
  if (!Number.isInteger(quantidade) || quantidade <= 0) return -1;
  if (!Number.isFinite(indiceAtual)) return 0;

  const indiceNormalizado = ((Math.trunc(indiceAtual) % quantidade) + quantidade) % quantidade;
  return (indiceNormalizado + direcao + quantidade) % quantidade;
}

/** Converte o índice destacado no número legado executado pelo menu. */
export function numeroDaOpcaoSelecionada(indice: number, numeros: readonly number[]): number | undefined {
  if (!Number.isInteger(indice) || indice < 0 || indice >= numeros.length) return undefined;
  return numeros[indice];
}
