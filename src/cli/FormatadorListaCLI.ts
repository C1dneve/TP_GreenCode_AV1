/**
 * Formata a apresentação de uma listagem da CLI sem alterar os dados recebidos.
 * A autorização, a consulta e os filtros continuam sob responsabilidade dos serviços
 * e de cada comando; este módulo trata apenas o texto mostrado ao usuário.
 */
export function formatarListagemCLI<T>(
  titulo: string,
  registros: readonly T[],
  formatarRegistro: (registro: T) => string,
  mensagemVazia = "Nenhum registro encontrado para os filtros informados."
): string {
  const tituloNormalizado = titulo.trim();
  if (!tituloNormalizado) {
    throw new Error("A listagem precisa de um título.");
  }

  const linhas = [`\n=== ${tituloNormalizado} ===`];
  if (registros.length === 0) {
    linhas.push(`  ${mensagemVazia}`);
  } else {
    for (const registro of registros) {
      linhas.push(`  ${formatarRegistro(registro)}`);
    }
  }
  linhas.push(`Total: ${registros.length}`);
  return linhas.join("\n");
}
