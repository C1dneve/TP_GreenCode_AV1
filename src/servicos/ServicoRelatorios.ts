import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { filtrarPorPeriodo } from "../utils/FiltrarPorPeriodo";
import { Equipamento } from "../models/Equipamento";
import { ServicoEquipamentos } from "./ServicoEquipamentos";
import { ServicoLote } from "./ServicoLote";
import { ServicoAutorizacao } from "./ServicoAutorizacao";
import { ServicoOrganizacao } from "./ServicoOrganizacao";
import { ServicoParametros } from "./ServicoParametros";

export class ServicoRelatorios {
  constructor(
    private readonly servicoLote: ServicoLote,
    private readonly servicoEquipamentos: ServicoEquipamentos,
    private readonly autorizacao: ServicoAutorizacao,
    private readonly servicoOrganizacao?: ServicoOrganizacao,
    private readonly servicoParametros?: ServicoParametros
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
    const filtrados = filtrarPorPeriodo(
      equipamentos,
      (equipamento) => {
        const ultima = equipamento.historicoMovimentacao[equipamento.historicoMovimentacao.length - 1];
        return ultima?.dataHora ?? periodo.inicio;
      },
      periodo.inicio,
      periodo.fim
    );
    const parametros = this.servicoParametros?.listar(usuarioResponsavel) ?? {
      aliquotaImpostoPercentual: 0,
      taxaDepreciacaoAnualPercentual: 15,
    };
    const valorAquisicaoTotal = filtrados.reduce((total, equipamento) => total + equipamento.valorAquisicao, 0);
    const valorResidualTotal = filtrados.reduce(
      (total, equipamento) => total + equipamento.valorAquisicao * equipamento.calcularDepreciacao(parametros.taxaDepreciacaoAnualPercentual / 100),
      0
    );
    let receitaMensalBruta = 0;
    if (this.servicoOrganizacao) {
      const organizacoes = this.servicoOrganizacao.listarOrganizacoes(usuarioResponsavel, false);
      for (const organizacao of organizacoes) {
        for (const contrato of organizacao.contratos) {
          const dataAssinatura = contrato.dataAssinatura;
          const dataVencimento = contrato.dataVencimento;
          const dataCancelamento = contrato.dataCancelamento;
          const estavaAtivoNoPeríodo = !dataCancelamento || dataCancelamento >= periodo.inicio;
          if (estavaAtivoNoPeríodo && dataAssinatura <= periodo.fim && dataVencimento >= periodo.inicio) {
            receitaMensalBruta += contrato.valorMensal;
          }
        }
      }
    }
    const impostosEstimados = receitaMensalBruta * parametros.aliquotaImpostoPercentual / 100;
    const receitaMensalLiquida = receitaMensalBruta - impostosEstimados;
    const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return [
      "Relatório financeiro",
      `Período: ${periodo.inicio.toISOString()} até ${periodo.fim.toISOString()}`,
      `Equipamentos considerados: ${filtrados.length}`,
      `Valor total de aquisição: ${moeda(valorAquisicaoTotal)}`,
      `Valor residual estimado: ${moeda(valorResidualTotal)}`,
      `Taxa de depreciação anual configurada: ${parametros.taxaDepreciacaoAnualPercentual.toFixed(2)}%`,
      `Receita mensal bruta de contratos no período: ${moeda(receitaMensalBruta)}`,
      `Alíquota de imposto configurada: ${parametros.aliquotaImpostoPercentual.toFixed(2)}%`,
      `Impostos estimados sobre a receita mensal: ${moeda(impostosEstimados)}`,
      `Receita mensal estimada após impostos: ${moeda(receitaMensalLiquida)}`,
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
