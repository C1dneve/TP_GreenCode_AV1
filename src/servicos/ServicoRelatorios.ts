import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { Equipamento } from "../models/Equipamento";
import { ServicoEquipamentos } from "./ServicoEquipamentos";
import { ServicoLote } from "./ServicoLote";
import { ServicoAutorizacao } from "./ServicoAutorizacao";

export class ServicoRelatorios {
  constructor(
    private readonly servicoLote: ServicoLote,
    private readonly servicoEquipamentos: ServicoEquipamentos,
    private readonly autorizacao: ServicoAutorizacao
  ) {}

  gerarRelatorioPorOrganizacao(
    organizacaoId: string,
    periodo: { inicio: Date; fim: Date },
    usuarioResponsavel: string
  ): string {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "relatorio organizacao");
    const lotes = this.servicoLote.listarLotesPorPeriodo(
      periodo.inicio,
      periodo.fim
    ).filter((lote) => lote.organizacaoId === organizacaoId);

    const equipamentos = lotes.flatMap((lote) => lote.equipamentos);
    const pesoTotal = equipamentos.reduce(
      (total, equipamento) => total + equipamento.pesoQuilogramas,
      0
    );

    return [
      `Relatório por organização: ${organizacaoId}`,
      `Período: ${periodo.inicio.toISOString()} até ${periodo.fim.toISOString()}`,
      `Lotes encontrados: ${lotes.length}`,
      `Equipamentos encontrados: ${equipamentos.length}`,
      `Peso total: ${pesoTotal} kg`,
    ].join("\n");
  }

  gerarRelatorioPorStatus(status: StatusRastreamento, usuarioResponsavel: string): string {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "relatorio status");
    const equipamentos = this.servicoEquipamentos.listarEquipamentos(usuarioResponsavel);
    const filtrados = equipamentos.filter(
      (equipamento) => equipamento.statusRastreamento === status
    );

    return [
      `Relatório por status: ${status}`,
      `Quantidade de equipamentos: ${filtrados.length}`,
      ...this.resumirEquipamentos(filtrados),
    ].join("\n");
  }

  gerarRelatorioFinanceiro(periodo: { inicio: Date; fim: Date }, usuarioResponsavel: string): string {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "relatorio financeiro");
    const equipamentos = this.servicoEquipamentos.listarEquipamentos(usuarioResponsavel);
    const filtrados = equipamentos.filter((equipamento) => {
      const movimentacoes = equipamento.historicoMovimentacao;
      const ultima = movimentacoes[movimentacoes.length - 1];
      const dataReferencia = ultima?.dataHora ?? periodo.inicio;
      return dataReferencia >= periodo.inicio && dataReferencia <= periodo.fim;
    });

    const fatorMedio = filtrados.length
      ? filtrados.reduce(
          (total, equipamento) => total + equipamento.calcularDepreciacao(),
          0
        ) / filtrados.length
      : 0;

    return [
      "Relatório financeiro",
      `Período: ${periodo.inicio.toISOString()} até ${periodo.fim.toISOString()}`,
      `Equipamentos considerados: ${filtrados.length}`,
      `Fator médio de valor remanescente: ${(fatorMedio * 100).toFixed(2)}%`,
    ].join("\n");
  }

  private resumirEquipamentos(equipamentos: Equipamento[]): string[] {
    const porTipo = new Map<string, number>();

    for (const equipamento of equipamentos) {
      porTipo.set(
        equipamento.tipo,
        (porTipo.get(equipamento.tipo) ?? 0) + 1
      );
    }

    return [...porTipo.entries()].map(
      ([tipo, quantidade]) => `- ${tipo}: ${quantidade}`
    );
  }
}
