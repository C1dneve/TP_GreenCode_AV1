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

  atualizaStatus(novoStatus: StatusRastreamento, justificativa: string): void {
    if (!justificativa || justificativa.trim().length === 0) {
      throw new Error(
        'É obrigatório informar uma justificativa para alterar o status de rastreamento.'
      );
    }
    this.statusRastreamento = novoStatus;
  }

  registraMovimentacao(destino: string, responsavel: string, observacao: string = ''): void {
    const ultima = this.historicoMovimentacao[this.historicoMovimentacao.length - 1];
    const origem = ultima ? ultima.destino : this.loteId;
    const idMovimentacao = `${this.id}-mov-${this.historicoMovimentacao.length + 1}`;
    const movimentacao = new Movimentacao(idMovimentacao, this.id, origem, destino, responsavel, observacao);
    this.historicoMovimentacao.push(movimentacao);
  }

  calculaDepreciacao(): number {
    const TAXA_DEPRECIACAO_ANUAL = 0.15;
    const anoAtual = new Date().getFullYear();
    const idadeAnos = Math.max(0, anoAtual - this.anoFabricacao);
    const fatorRestante = Math.max(0, 1 - TAXA_DEPRECIACAO_ANUAL * idadeAnos);
    return fatorRestante; 
  }
}