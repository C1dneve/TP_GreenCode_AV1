import { Equipamento } from "../models/Equipamento";
import { EstadoFisico } from "../models/enums/EstadoFisico";
import { TipoEquipamento } from "../models/enums/TipoEquipamento";
import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { JournalTransacao } from "../persistencia/JournalTransacao";
import { RepositorioArquivos } from "../persistencia/RepositorioArquivos";
import { ServicoAutorizacao } from "./ServicoAutorizacao";

export interface HistoricoCompleto {
  equipamento: Equipamento;
  movimentacoes: Equipamento["historicoMovimentacao"];
}

export class ServicoEquipamentos {
  private repositorio: RepositorioArquivos;
  private diretorioBase: string;
  private chave: string;
  private ordemEstado: EstadoFisico[] = [
    EstadoFisico.NOVO,
    EstadoFisico.BOM_ESTADO,
    EstadoFisico.USADO_LEVE,
    EstadoFisico.USADO_MODERADO,
    EstadoFisico.DANIFICADO_LEVE,
    EstadoFisico.DANIFICADO_GRAVE,
    EstadoFisico.INSERVIVEL,
  ];

  constructor(
    repositorio: RepositorioArquivos,
    diretorioBase: string,
    chave: string,
    private readonly autorizacao: ServicoAutorizacao
  ) {
    this.repositorio = repositorio;
    this.diretorioBase = diretorioBase;
    this.chave = chave;
  }

  rastrearEquipamento(id: string, usuarioResponsavel: string): HistoricoCompleto {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "equip rastrear");
    const equipamento = this.carregarEquipamento(id);
    return {
      equipamento,
      movimentacoes: equipamento.historicoMovimentacao,
    };
  }

  atualizarEstadoFisico(
    id: string,
    novoEstado: EstadoFisico,
    justificativa = "",
    usuarioResponsavel: string
  ): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "equip atualizar-estado");
    const equipamento = this.carregarEquipamento(id);
    const indiceAtual = this.ordemEstado.indexOf(equipamento.estadoFisico);
    const indiceNovo = this.ordemEstado.indexOf(novoEstado);

    if (indiceAtual === -1 || indiceNovo === -1) {
      throw new Error("Estado físico inválido.");
    }

    const queda = indiceNovo - indiceAtual;
    if (queda >= 2 && !justificativa.trim()) {
      throw new Error(
        "É obrigatória uma justificativa quando o estado físico cair duas ou mais categorias."
      );
    }

    const antes = equipamento.paraDados();
    equipamento.estadoFisico = novoEstado;
    const depois = equipamento.paraDados();

    const observacao = justificativa.trim() || "Alteração de estado físico";
    equipamento.registrarMovimentacao(
      equipamento.statusRastreamento,
      usuarioResponsavel,
      observacao
    );

    const depoisComHistorico = equipamento.paraDados();
    this.registrarJournal("ATUALIZAR", "equipamentos.enc", antes, depoisComHistorico, usuarioResponsavel);
    this.repositorio.salvarEntidade("equipamentos.enc", depoisComHistorico);

    void depois;
  }

  gerarCodigoBarras(tipo: TipoEquipamento, sequencia: number, usuarioResponsavel: string): string {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "equip codigo-barras");
    if (!Number.isInteger(sequencia) || sequencia < 1) {
      throw new Error("A sequência do código de barras deve ser um inteiro positivo.");
    }

    const prefixo = tipo.substring(0, 4).toUpperCase();
    return `GC-${prefixo}-${String(sequencia).padStart(6, "0")}`;
  }

  registrarMovimentacao(
    id: string,
    destino: string,
    responsavel: string,
    observacao = ""
  ): void {
    this.autorizacao.exigirPermissao(responsavel, "equip mover");
    const equipamento = this.carregarEquipamento(id);
    const antes = equipamento.paraDados();

    equipamento.registrarMovimentacao(destino, responsavel, observacao);
    const depois = equipamento.paraDados();

    this.registrarJournal("ATUALIZAR", "equipamentos.enc", antes, depois, responsavel);
    this.repositorio.salvarEntidade("equipamentos.enc", depois);
  }

  listarEquipamentos(usuarioResponsavel: string): Equipamento[] {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "relatorio status");
    return this.repositorio
      .listarEntidades("equipamentos.enc")
      .map((item) => Equipamento.deDados(item));
  }

  obterEquipamento(id: string): Equipamento {
    return this.carregarEquipamento(id);
  }

  private carregarEquipamento(id: string): Equipamento {
    const dados = this.repositorio.carregarEntidade("equipamentos.enc", id);
    if (!dados) {
      throw new Error("Equipamento não encontrado.");
    }

    return Equipamento.deDados(dados);
  }

  private registrarJournal(
    operacao: string,
    entidade: string,
    dadosAntes: any,
    dadosDepois: any,
    usuarioResponsavel: string
  ): void {
    const transacao = new JournalTransacao(
      `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      operacao,
      entidade,
      dadosAntes,
      dadosDepois,
      usuarioResponsavel,
      this.diretorioBase,
      this.chave,
      this.repositorio
    );
    transacao.registrar();
  }
}
