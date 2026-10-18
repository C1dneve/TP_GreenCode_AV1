/** Retorna um valor localizado ou encerra o fluxo com uma mensagem consistente. */
export function exigirEncontrado<T>(
  valor: T | null | undefined,
  entidade: string,
  mensagem = `${entidade} não encontrado.`
): T {
  if (valor === null || valor === undefined) {
    throw new Error(mensagem);
  }
  return valor;
}
