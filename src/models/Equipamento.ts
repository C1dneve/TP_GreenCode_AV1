import { TipoEquipamento } from './enums/TipoEquipamento';
import { EstadoFisico } from './enums/EstadoFisico';
import { StatusRastreamento } from './enums/StatusRastreamento';
import { Movimentacao } from './Movimentacao';

export class Equipamento {
  id: string;
  codigoBarrasInterno: string;
  tipo: TipoEquipamento;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  estadoFisico: EstadoFisico;
  pesoQuilogramas: number;
  loteId: string;
  posicaoNoLote: number;
  statusRastreamento: StatusRastreamento;
  historicoMovimentacao: Movimentacao[];

  constructor(
    id: string,
    codigoBarrasInterno: string,
    tipo: TipoEquipamento,
    marca: string,
    modelo: string,
    anoFabricacao: number,
    estadoFisico: EstadoFisico,
    pesoQuilogramas: number
  ) {
    this.id = id;
    this.codigoBarrasInterno = codigoBarrasInterno;
    this.tipo = tipo;
    this.marca = marca;
    this.modelo = modelo;
    this.anoFabricacao = anoFabricacao;
    this.estadoFisico = estadoFisico;
    this.pesoQuilogramas = pesoQuilogramas;
    this.loteId = '';
    this.posicaoNoLote = -1;
    this.statusRastreamento = StatusRastreamento.AGUARDANDO_TRIAGEM;
    this.historicoMovimentacao = [];
  }


  atualizarStatus(novoStatus: StatusRastreamento, justificativa: string): void {
    if (!justificativa.trim()) {
      throw new Error('É obrigatório informar uma justificativa para alterar o status de rastreamento.');
    }

    if (
      novoStatus === StatusRastreamento.EM_DESMONTE &&
      this.statusRastreamento !== StatusRastreamento.AGUARDANDO_DESMONTE
    ) {
      throw new Error(
        'O equipamento só pode entrar em desmonte após a triagem completa.'
      );
    }

    this.statusRastreamento = novoStatus;
  }

  registrarMovimentacao(
    destino: string,
    responsavel: string,
    observacao: string = ''
  ): void {
    const ultimaMovimentacao =
      this.historicoMovimentacao[this.historicoMovimentacao.length - 1];
    const origem = ultimaMovimentacao?.destino ?? this.loteId;
    const idMovimentacao = `${this.id}-mov-${this.historicoMovimentacao.length + 1}`;

    this.historicoMovimentacao.push(
      new Movimentacao(
        idMovimentacao,
        this.id,
        origem,
        destino,
        responsavel,
        observacao
      )
    );
  }

  calcularDepreciacao(): number {
    const TAXA_DEPRECIACAO_ANUAL = 0.15;
    const anoAtual = new Date().getFullYear();
    const idadeAnos = Math.max(0, anoAtual - this.anoFabricacao);
    const fatorRestante = Math.max(0, 1 - TAXA_DEPRECIACAO_ANUAL * idadeAnos);
    return fatorRestante;
  }

  static deDados(dados: Record<string, any>): Equipamento {
    const equipamento = new Equipamento(
      String(dados.id),
      String(dados.codigoBarrasInterno),
      dados.tipo as TipoEquipamento,
      String(dados.marca),
      String(dados.modelo),
      Number(dados.anoFabricacao),
      dados.estadoFisico as EstadoFisico,
      Number(dados.pesoQuilogramas)
    );

    equipamento.loteId = String(dados.loteId ?? '');
    equipamento.posicaoNoLote = Number(dados.posicaoNoLote ?? -1);
    equipamento.statusRastreamento = dados.statusRastreamento as StatusRastreamento;
    equipamento.historicoMovimentacao = Array.isArray(dados.historicoMovimentacao)
      ? dados.historicoMovimentacao.map((item: Record<string, any>) =>
          Movimentacao.deDados(item)
        )
      : [];

    return equipamento;
  }

  paraDados(): Record<string, unknown> {
    return {
      id: this.id,
      codigoBarrasInterno: this.codigoBarrasInterno,
      tipo: this.tipo,
      marca: this.marca,
      modelo: this.modelo,
      anoFabricacao: this.anoFabricacao,
      estadoFisico: this.estadoFisico,
      pesoQuilogramas: this.pesoQuilogramas,
      loteId: this.loteId,
      posicaoNoLote: this.posicaoNoLote,
      statusRastreamento: this.statusRastreamento,
      historicoMovimentacao: this.historicoMovimentacao.map((item) => item.paraDados()),
    };
  }
}
