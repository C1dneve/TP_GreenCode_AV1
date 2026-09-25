export class Movimentacao {
  readonly id: string;
  readonly equipamentoId: string;
  readonly dataHora: Date;
  readonly origem: string;
  readonly destino: string;
  readonly responsavel: string;
  readonly observacao: string;

  constructor(
    id: string,
    equipamentoId: string,
    origem: string,
    destino: string,
    responsavel: string,
    observacao: string,
    dataHora: Date = new Date()
  ) {
    this.id = id;
    this.equipamentoId = equipamentoId;
    this.dataHora = new Date(dataHora);
    this.origem = origem;
    this.destino = destino;
    this.responsavel = responsavel;
    this.observacao = observacao;
  }

  static deDados(dados: Record<string, any>): Movimentacao {
    return new Movimentacao(
      String(dados.id),
      String(dados.equipamentoId),
      String(dados.origem),
      String(dados.destino),
      String(dados.responsavel),
      String(dados.observacao ?? ""),
      new Date(dados.dataHora)
    );
  }

  paraDados(): Record<string, unknown> {
    return {
      id: this.id,
      equipamentoId: this.equipamentoId,
      dataHora: this.dataHora.toISOString(),
      origem: this.origem,
      destino: this.destino,
      responsavel: this.responsavel,
      observacao: this.observacao,
    };
  }
}
