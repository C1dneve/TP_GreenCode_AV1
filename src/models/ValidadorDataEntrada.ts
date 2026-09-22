import { Validador } from "./Validador";

export class ValidadorDataEntrada extends Validador {
  private mensagemErro: string = "";

  validar(data: Date): boolean {
    const hoje = new Date();
    const noventaDiasAtras = new Date();
    noventaDiasAtras.setDate(hoje.getDate() - 90);

    if (data > hoje) {
      this.mensagemErro = "Data de entrada não pode ser futura.";
      return false;
    }
    if (data < noventaDiasAtras) {
      this.mensagemErro = "Data de entrada não pode ser anterior a 90 dias.";
      return false;
    }
    return true;
  }

  obterMensagemErro(): string {
    return this.mensagemErro;
  }
}