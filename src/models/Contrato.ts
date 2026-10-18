import { restaurarDatas, serializarDados } from "../utils/SerializadorDados";

export class Contrato {
  id: string;
  organizacaoId: string;
  dataAssinatura: Date;
  dataVencimento: Date;
  clausulas: string[];
  valorMensal: number;
  renovacaoAutomatica: boolean;
  ativo: boolean;
  dataCancelamento: Date | null;

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
    this.ativo = true;
    this.dataCancelamento = null;
  }

  estaVigente(): boolean {
    return this.ativo && new Date() <= this.dataVencimento;
  }

  cancelar(): void {
    if (!this.ativo) throw new Error("O contrato já está cancelado.");
    this.ativo = false;
    this.dataCancelamento = new Date();
  }

  renovar(novoVencimento: Date): void {
    if (novoVencimento <= this.dataVencimento) {
      throw new Error("O novo vencimento deve ser posterior ao vencimento atual.");
    }
    this.dataVencimento = new Date(novoVencimento);
  }

  static deDados(dados: Record<string, any>): Contrato {
    const normalizados = restaurarDatas(dados);
    const contrato = new Contrato(
      String(normalizados.id),
      String(normalizados.organizacaoId),
      new Date(normalizados.dataVencimento),
      Number(normalizados.valorMensal),
      Array.isArray(normalizados.clausulas) ? normalizados.clausulas.map(String) : [],
      Boolean(normalizados.renovacaoAutomatica),
      new Date(normalizados.dataAssinatura)
    );
    contrato.ativo = normalizados.ativo === undefined ? true : Boolean(normalizados.ativo);
    contrato.dataCancelamento = normalizados.dataCancelamento ? new Date(normalizados.dataCancelamento) : null;
    return contrato;
  }

  paraDados(): Record<string, unknown> {
    return serializarDados({
      id: this.id,
      organizacaoId: this.organizacaoId,
      dataAssinatura: this.dataAssinatura,
      dataVencimento: this.dataVencimento,
      clausulas: [...this.clausulas],
      valorMensal: this.valorMensal,
      renovacaoAutomatica: this.renovacaoAutomatica,
      ativo: this.ativo,
      dataCancelamento: this.dataCancelamento,
    });
  }
}
