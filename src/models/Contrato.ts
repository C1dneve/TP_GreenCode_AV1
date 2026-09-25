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
    renovacaoAutomatica: boolean = false,
    dataAssinatura: Date = new Date()
  ) {
    this.id = id;
    this.organizacaoId = organizacaoId;
    this.dataAssinatura = new Date(dataAssinatura);
    this.dataVencimento = new Date(dataVencimento);
    this.clausulas = [...clausulas];
    this.valorMensal = valorMensal;
    this.renovacaoAutomatica = renovacaoAutomatica;
  }

  estaVigente(): boolean {
    return new Date() <= this.dataVencimento;
  }

  renovar(novoVencimento: Date): void {
    if (novoVencimento <= this.dataVencimento) {
      throw new Error("O novo vencimento deve ser posterior ao vencimento atual.");
    }
    this.dataVencimento = new Date(novoVencimento);
  }

  static deDados(dados: Record<string, any>): Contrato {
    return new Contrato(
      String(dados.id),
      String(dados.organizacaoId),
      new Date(dados.dataVencimento),
      Number(dados.valorMensal),
      Array.isArray(dados.clausulas) ? dados.clausulas.map(String) : [],
      Boolean(dados.renovacaoAutomatica),
      new Date(dados.dataAssinatura)
    );
  }

  paraDados(): Record<string, unknown> {
    return {
      id: this.id,
      organizacaoId: this.organizacaoId,
      dataAssinatura: this.dataAssinatura.toISOString(),
      dataVencimento: this.dataVencimento.toISOString(),
      clausulas: [...this.clausulas],
      valorMensal: this.valorMensal,
      renovacaoAutomatica: this.renovacaoAutomatica,
    };
  }
}
