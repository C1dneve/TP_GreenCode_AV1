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
    observacoes: string = ''
  ) {
    this.id = id;

    this.dataEntrada = new Date();
    this.organizacaoId = organizacaoId;
    this.notaFiscal = notaFiscal;
    this.transportadora = transportadora;
    this.equipamentos = [];

    this.statusProcessamento = StatusLote.RECEBIDO;
    this.observacoes = observacoes;
  }

  adicionaEquipamento(equip: Equipamento): void {
    equip.loteId = this.id;
    equip.posicaoNoLote = this.equipamentos.length;
    this.equipamentos.push(equip);
  }

  removeEquipamento(equipId: string): boolean {
    const indice = this.equipamentos.findIndex((e) => e.id === equipId);
    if (indice === -1) {
      return false;
    }
    this.equipamentos.splice(indice, 1);
    return true;
  }

  calculaPesoTotal(): number {
    return this.equipamentos.reduce((total, e) => total + e.pesoQuilogramas, 0);
  }

  geraRelatorioTriagem(): string {
    const totalEquipamentos = this.equipamentos.length;
    const pesoTotal = this.calculaPesoTotal();

    const contagemPorStatus = new Map<string, number>();
    for (const equip of this.equipamentos) {
      const chave = equip.statusRastreamento;
      contagemPorStatus.set(chave, (contagemPorStatus.get(chave) ?? 0) + 1);
    }

    const linhas = [
      `Relatório de triagem do lote ${this.id}`,
      `Total de equipamentos: ${totalEquipamentos}`,
      `Peso total: ${pesoTotal} kg`,
      'Distribuição por status de rastreamento:',
    ];
    for (const [status, quantidade] of contagemPorStatus) {
      linhas.push(`  - ${status}: ${quantidade}`);
    }

    return linhas.join('\n');
  }
}