// Utilitário de asserção.
// Criado pra não depender do módulo "assert" do Node, porque tinha dado problema
export function assertEqual(
  atual: unknown,
  esperado: unknown,
  mensagem?: string
): void {
  if (atual !== esperado) {
    throw new Error(
      mensagem ??
        `Falhou: esperado ${JSON.stringify(esperado)}, recebeu ${JSON.stringify(atual)}`
    );
  }
}