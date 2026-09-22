import { Validador } from "./Validador";

export class ValidadorCNPJ extends Validador {
  private mensagemErro: string = "";

  validar(cnpj: string): boolean {
    const digitos = cnpj.replace(/\D/g, "");

    if (digitos.length !== 14) {
      this.mensagemErro = "CNPJ deve conter 14 dígitos.";
      return false;
    }

    if (/^(\d)\1{13}$/.test(digitos)) {
      this.mensagemErro = "CNPJ inválido (dígitos iguais).";
      return false;
    }

    const pesoPrimeiroDigito = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const primeiroDigito = this.calculaDigitoVerificador(
      digitos.slice(0, 12),
      pesoPrimeiroDigito
    );

    const pesoSegundoDigito = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const baseSegundoDigito = digitos.slice(0, 12) + primeiroDigito;
    const segundoDigito = this.calculaDigitoVerificador(
      baseSegundoDigito,
      pesoSegundoDigito
    );

    const digitosCalculados = `${primeiroDigito}${segundoDigito}`;
    const digitosInformados = digitos.slice(12);

    if (digitosCalculados !== digitosInformados) {
      this.mensagemErro = "CNPJ inválido (dígito não confere).";
      return false;
    }

    return true;
  }

  private calculaDigitoVerificador(base: string, pesos: number[]): number {
    let soma = 0;

    for (let i = 0; i < base.length; i++) {
      const numero = Number(base[i]);
      const peso = pesos[i];
      soma = soma + numero * peso;
    }

    const resto = soma % 11;

    if (resto < 2) {
      return 0;
    } else {
      return 11 - resto;
    }
  }

  obterMensagemErro(): string {
    return this.mensagemErro;
  }
}
