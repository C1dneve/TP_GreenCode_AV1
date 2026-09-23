
export class Contrato {
  id: string;
  organizacaoId: string;
  dataAssinatura: Date;
  dataVencimento: Date;
  clausulas: string[];
  valorMensal: number;
  renovacaoAutomatica: boolean;

  constructor(
    id: string,
    organizacaoId: string,
    dataVencimento: Date,
    valorMensal: number,
    clausulas: string[] = [],
    renovacaoAutomatica: boolean = false
  ) {
    this.id = id;
    this.organizacaoId = organizacaoId;
    this.dataAssinatura = new Date();
    this.dataVencimento = dataVencimento;
    this.clausulas = clausulas;
    this.valorMensal = valorMensal;
    this.renovacaoAutomatica = renovacaoAutomatica;
  }

  Vigente(): boolean {
    return new Date() <= this.dataVencimento;
  }

  renova(novoVencimento: Date): void {
    this.dataVencimento = novoVencimento;
  }
}