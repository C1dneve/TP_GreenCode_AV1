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
    observacao: string
  ) {
    this.id = id;
    this.equipamentoId = equipamentoId;
    this.dataHora = new Date();
    this.origem = origem;
    this.destino = destino;
    this.responsavel = responsavel;
    this.observacao = observacao;
  }
}