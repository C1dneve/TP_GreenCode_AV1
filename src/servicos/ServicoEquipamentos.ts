import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import { exigirEncontrado } from "../utils/ExigirEncontrado";
import { Equipamento } from "../models/Equipamento";
import { Lote } from "../models/Lote";
import { EstadoFisico } from "../models/enums/EstadoFisico";
import { TipoEquipamento } from "../models/enums/TipoEquipamento";
import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { registrarJournal as registrarTransacaoJournal } from "../persistencia/registrarJournal";
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
    if (!equipamento.ativo) throw new Error("Não é permitido alterar o estado de um equipamento desativado.");
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
    this.registrarJournal("ATUALIZAR", ARQUIVOS.EQUIPAMENTOS, antes, depoisComHistorico, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.EQUIPAMENTOS, depoisComHistorico);
    this.sincronizarNoLote(equipamento, usuarioResponsavel);

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
    if (!equipamento.ativo) throw new Error("Não é permitido movimentar um equipamento desativado.");
    const antes = equipamento.paraDados();

    equipamento.registrarMovimentacao(destino, responsavel, observacao);
    const depois = equipamento.paraDados();

    this.registrarJournal("ATUALIZAR", ARQUIVOS.EQUIPAMENTOS, antes, depois, responsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.EQUIPAMENTOS, depois);
    this.sincronizarNoLote(equipamento, responsavel);
  }

  listarEquipamentos(usuarioResponsavel: string): Equipamento[] {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "relatorio status");
    return this.repositorio
      .listarEntidades(ARQUIVOS.EQUIPAMENTOS)
      .filter((item) => item.ativo !== false)
      .map((item) => Equipamento.deDados(item));
  }


  listarEquipamentosComFiltros(usuarioResponsavel: string, filtros: { lote?: string; status?: StatusRastreamento; tipo?: TipoEquipamento; incluirInativos?: boolean } = {}): Equipamento[] {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "equip listar");
    return this.repositorio.listarEntidades(ARQUIVOS.EQUIPAMENTOS)
      .filter((item) => filtros.incluirInativos || item.ativo !== false)
      .map((item) => Equipamento.deDados(item))
      .filter((item) => !filtros.lote || item.loteId === filtros.lote)
      .filter((item) => !filtros.status || item.statusRastreamento === filtros.status)
      .filter((item) => !filtros.tipo || item.tipo === filtros.tipo);
  }

  atualizarEquipamento(id: string, campos: Partial<Pick<Equipamento, "marca" | "modelo" | "anoFabricacao" | "pesoQuilogramas" | "valorAquisicao">>, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "equip atualizar");
    const equipamento = this.carregarEquipamento(id);
    if (!equipamento.ativo) throw new Error("Não é permitido atualizar um equipamento desativado.");
    const antes = equipamento.paraDados();
    if (campos.marca !== undefined) { if (!campos.marca.trim()) throw new Error("A marca não pode ser vazia."); equipamento.marca = campos.marca.trim(); }
    if (campos.modelo !== undefined) { if (!campos.modelo.trim()) throw new Error("O modelo não pode ser vazio."); equipamento.modelo = campos.modelo.trim(); }
    if (campos.anoFabricacao !== undefined) {
      const anoAtual = new Date().getFullYear();
      if (!Number.isInteger(campos.anoFabricacao) || campos.anoFabricacao < 1900 || campos.anoFabricacao > anoAtual) throw new Error(`O ano de fabricação deve estar entre 1900 e ${anoAtual}.`);
      equipamento.anoFabricacao = campos.anoFabricacao;
    }
    if (campos.pesoQuilogramas !== undefined) { if (!Number.isFinite(campos.pesoQuilogramas) || campos.pesoQuilogramas < 0) throw new Error("O peso deve ser um número não negativo."); equipamento.pesoQuilogramas = campos.pesoQuilogramas; }
    if (campos.valorAquisicao !== undefined) { if (!Number.isFinite(campos.valorAquisicao) || campos.valorAquisicao < 0) throw new Error("O valor de aquisição deve ser um número não negativo."); equipamento.valorAquisicao = campos.valorAquisicao; }
    const depois = equipamento.paraDados();
    this.registrarJournal("ATUALIZAR", ARQUIVOS.EQUIPAMENTOS, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.EQUIPAMENTOS, depois);
    this.sincronizarNoLote(equipamento, usuarioResponsavel);
  }

  desativarEquipamento(id: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "equip desativar");
    const equipamento = this.carregarEquipamento(id);
    if (!equipamento.ativo) throw new Error("O equipamento já está desativado.");
    const antes = equipamento.paraDados();
    equipamento.ativo = false;
    const depois = equipamento.paraDados();
    this.registrarJournal("DESATIVAR", ARQUIVOS.EQUIPAMENTOS, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.EQUIPAMENTOS, depois);
    this.sincronizarNoLote(equipamento, usuarioResponsavel);
  }

  ativarEquipamento(id: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "equip ativar");
    const equipamento = this.carregarEquipamento(id);
    if (equipamento.ativo) throw new Error("O equipamento já está ativo.");
    const antes = equipamento.paraDados();
    equipamento.ativo = true;
    const depois = equipamento.paraDados();
    this.registrarJournal("ATIVAR", ARQUIVOS.EQUIPAMENTOS, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.EQUIPAMENTOS, depois);
    this.sincronizarNoLote(equipamento, usuarioResponsavel);
  }

  obterEquipamento(id: string): Equipamento {
    return this.carregarEquipamento(id);
  }

  private carregarEquipamento(id: string): Equipamento {
    const dados = exigirEncontrado(
      this.repositorio.carregarEntidade(ARQUIVOS.EQUIPAMENTOS, id),
      "Equipamento"
    );
    return Equipamento.deDados(dados);
  }

  /** Mantém a cópia embutida no lote sincronizada com o registro canônico do equipamento. */
  private sincronizarNoLote(equipamento: Equipamento, usuarioResponsavel: string): void {
    if (!equipamento.loteId) return;
    const dadosLote = this.repositorio.carregarEntidade(ARQUIVOS.LOTES, equipamento.loteId);
    if (!dadosLote) return;
    const lote = Lote.deDados(dadosLote);
    const indice = lote.equipamentos.findIndex((item) => item.id === equipamento.id);
    if (indice < 0) return;
    const antes = lote.paraDados();
    const posicao = lote.equipamentos[indice].posicaoNoLote;
    const atualizado = Equipamento.deDados(equipamento.paraDados());
    atualizado.posicaoNoLote = posicao;
    lote.equipamentos[indice] = atualizado;
    const depois = lote.paraDados();
    this.registrarJournal("ATUALIZAR", ARQUIVOS.LOTES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depois);
  }

  private registrarJournal(
    operacao: string,
    entidade: string,
    dadosAntes: any,
    dadosDepois: any,
    usuarioResponsavel: string
  ): void {
    registrarTransacaoJournal(
      { operacao, entidade, antes: dadosAntes, depois: dadosDepois, usuario: usuarioResponsavel },
      { diretorioBase: this.diretorioBase, chave: this.chave, repositorio: this.repositorio }
    );
  }
}
