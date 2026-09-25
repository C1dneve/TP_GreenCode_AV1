import { Equipamento } from './Equipamento';
import { StatusLote } from './enums/StatusLote';

export class Lote {
  id: string;
  dataEntrada: Date;
  organizacaoId: string;
  notaFiscal: string;
  transportadora: string;
  equipamentos: Equipamento[];
  statusProcessamento: StatusLote;
  observacoes: string;

  constructor(
    id: string,
    organizacaoId: string,
    notaFiscal: string,
    transportadora: string,
    observacoes: string = '',
    dataEntrada: Date = new Date()
  ) {
    this.id = id;
    this.dataEntrada = new Date(dataEntrada);
    this.organizacaoId = organizacaoId;
    this.notaFiscal = notaFiscal;
    this.transportadora = transportadora;
    this.equipamentos = [];
    this.statusProcessamento = StatusLote.RECEBIDO;
    this.observacoes = observacoes;
  }

  adicionarEquipamento(equipamento: Equipamento): void {
    equipamento.loteId = this.id;
    equipamento.posicaoNoLote = this.equipamentos.length;
    this.equipamentos.push(equipamento);
  }

  removerEquipamento(equipamentoId: string): boolean {
    const indice = this.equipamentos.findIndex((equipamento) => equipamento.id === equipamentoId);
    if (indice === -1) {
      return false;
    }

    this.equipamentos.splice(indice, 1);
    this.reorganizarPosicoes();
    return true;
  }

  private reorganizarPosicoes(): void {
    this.equipamentos.forEach((equipamento, indice) => {
      equipamento.posicaoNoLote = indice;
    });
  }

  calcularPesoTotal(): number {
    return this.equipamentos.reduce(
      (total, equipamento) => total + equipamento.pesoQuilogramas,
      0
    );
  }

  gerarRelatorioTriagem(): string {
    const contagemPorStatus = new Map<string, number>();

    for (const equipamento of this.equipamentos) {
      const chave = equipamento.statusRastreamento;
      contagemPorStatus.set(chave, (contagemPorStatus.get(chave) ?? 0) + 1);
    }

    const linhas = [
      `Relatório de triagem do lote ${this.id}`,
      `Total de equipamentos: ${this.equipamentos.length}`,
      `Peso total: ${this.calcularPesoTotal()} kg`,
      'Distribuição por status de rastreamento:',
    ];

    for (const [status, quantidade] of contagemPorStatus) {
      linhas.push(`  - ${status}: ${quantidade}`);
    }

    return linhas.join('\n');
  }

  static deDados(dados: Record<string, any>): Lote {
    const lote = new Lote(
      String(dados.id),
      String(dados.organizacaoId),
      String(dados.notaFiscal),
      String(dados.transportadora),
      String(dados.observacoes ?? ''),
      new Date(dados.dataEntrada)
    );

    lote.statusProcessamento = dados.statusProcessamento as StatusLote;
    lote.equipamentos = Array.isArray(dados.equipamentos)
      ? dados.equipamentos.map((item: Record<string, any>) => Equipamento.deDados(item))
      : [];

    return lote;
  }

  paraDados(): Record<string, unknown> {
    return {
      id: this.id,
      dataEntrada: this.dataEntrada.toISOString(),
      organizacaoId: this.organizacaoId,
      notaFiscal: this.notaFiscal,
      transportadora: this.transportadora,
      equipamentos: this.equipamentos.map((equipamento) => equipamento.paraDados()),
      statusProcessamento: this.statusProcessamento,
      observacoes: this.observacoes,
    };
  }
}
