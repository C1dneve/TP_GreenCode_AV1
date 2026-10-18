import { restaurarDatas, serializarDados } from "../utils/SerializadorDados";

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
    const normalizados = restaurarDatas(dados);
    return new Movimentacao(
      String(normalizados.id),
      String(normalizados.equipamentoId),
      String(normalizados.origem),
      String(normalizados.destino),
      String(normalizados.responsavel),
      String(normalizados.observacao ?? ""),
      new Date(normalizados.dataHora)
    );
  }

  paraDados(): Record<string, unknown> {
    return serializarDados({
      id: this.id,
      equipamentoId: this.equipamentoId,
      dataHora: this.dataHora,
      origem: this.origem,
      destino: this.destino,
      responsavel: this.responsavel,
      observacao: this.observacao,
    });
  }
}
