import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import { filtrarPorPeriodo } from "../utils/FiltrarPorPeriodo";
import { exigirEncontrado } from "../utils/ExigirEncontrado";
import { Lote } from "../models/Lote";
import { Equipamento } from "../models/Equipamento";
import { StatusLote } from "../models/enums/StatusLote";
import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { ValidadorDataEntrada } from "../models/ValidadorDataEntrada";
import { registrarJournal as registrarTransacaoJournal } from "../persistencia/registrarJournal";
import { RepositorioArquivos } from "../persistencia/RepositorioArquivos";
import { ServicoAutorizacao } from "./ServicoAutorizacao";

interface DadosLote {
  id: string;
  organizacaoId: string;
  notaFiscal: string;
  transportadora: string;
  observacoes?: string;
  dataEntrada?: Date;
}

export class ServicoLote {
  private repositorio: RepositorioArquivos;
  private validadorDataEntrada: ValidadorDataEntrada;
  private diretorioBase: string;
  private chave: string;

  constructor(
    repositorio: RepositorioArquivos,
    diretorioBase: string,
    chave: string,
    private readonly autorizacao: ServicoAutorizacao
  ) {
    this.repositorio = repositorio;
    this.validadorDataEntrada = new ValidadorDataEntrada();
    this.diretorioBase = diretorioBase;
    this.chave = chave;
  }

  criarLote(dados: DadosLote, usuarioResponsavel: string): Lote {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote criar");
    const dataEntrada = dados.dataEntrada
      ? new Date(dados.dataEntrada)
      : new Date();

    if (!this.validadorDataEntrada.validar(dataEntrada)) {
      throw new Error(this.validadorDataEntrada.obterMensagemErro());
    }

    const organizacao = this.repositorio.carregarEntidade(ARQUIVOS.ORGANIZACOES, dados.organizacaoId);
    if (!organizacao || organizacao.ativo === false) throw new Error("Organização não encontrada ou desativada.");
    if (this.repositorio.carregarEntidade(ARQUIVOS.LOTES, dados.id)) {
      throw new Error("Já existe um lote com este identificador.");
    }

    const lote = new Lote(
      dados.id,
      dados.organizacaoId,
      dados.notaFiscal,
      dados.transportadora,
      dados.observacoes ?? "",
      dataEntrada
    );
    const entidade = lote.paraDados();

    this.registrarJournal("CRIAR", ARQUIVOS.LOTES, null, entidade, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, entidade);
    return lote;
  }

  adicionarEquipamentoLote(
    loteId: string,
    equipamento: Equipamento,
    usuarioResponsavel: string
  ): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "equip cadastrar");
    const lote = this.carregarLote(loteId);
    if (!lote.ativo) throw new Error("Não é possível adicionar equipamento a um lote desativado.");
    if (lote.statusProcessamento === StatusLote.FINALIZADO) throw new Error("Não é possível alterar um lote finalizado.");
    if (!equipamento.ativo) throw new Error("Não é possível adicionar um equipamento desativado ao lote.");
    const organizacao = this.repositorio.carregarEntidade(ARQUIVOS.ORGANIZACOES, lote.organizacaoId);
    if (!organizacao || organizacao.ativo === false) throw new Error("A organização do lote não existe ou está desativada.");
    if (this.repositorio.carregarEntidade(ARQUIVOS.EQUIPAMENTOS, equipamento.id)) {
      throw new Error("Já existe um equipamento com este identificador.");
    }

    const antes = lote.paraDados();
    lote.adicionarEquipamento(equipamento);
    const depois = lote.paraDados();

    const dadosEquipamento = equipamento.paraDados();

    this.registrarJournal(
      "ATUALIZAR",
      ARQUIVOS.LOTES,
      antes,
      depois,
      usuarioResponsavel
    );
    this.registrarJournal(
      "CRIAR",
      ARQUIVOS.EQUIPAMENTOS,
      null,
      dadosEquipamento,
      usuarioResponsavel
    );

    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depois);
    this.repositorio.salvarEntidade(ARQUIVOS.EQUIPAMENTOS, dadosEquipamento);

  }

  processarTriagem(loteId: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote triagem");
    const lote = this.carregarLote(loteId);
    if (!lote.ativo) throw new Error("Não é possível processar a triagem de um lote desativado.");
    if (lote.statusProcessamento === StatusLote.FINALIZADO) throw new Error("Não é possível processar a triagem de um lote finalizado.");
    const antesLote = lote.paraDados();

    if (lote.equipamentos.length === 0) {
      throw new Error("Não é possível concluir a triagem de um lote sem equipamentos.");
    }

    lote.statusProcessamento = StatusLote.EM_TRIAGEM;

    const equipamentosAtualizados: any[] = [];
    for (const equipamento of lote.equipamentos) {
      const dadosAntes = equipamento.paraDados();
      equipamento.atualizarStatus(
        StatusRastreamento.EM_TRIAGEM,
        "Início da triagem do lote"
      );
      equipamento.atualizarStatus(
        StatusRastreamento.AGUARDANDO_DESMONTE,
        "Triagem concluída para encaminhamento"
      );
      equipamentosAtualizados.push({ dadosAntes, dadosDepois: equipamento.paraDados() });
    }

    lote.statusProcessamento = StatusLote.TRIAGEM_CONCLUIDA;
    const depoisLote = lote.paraDados();

    this.registrarJournal(
      "ATUALIZAR",
      ARQUIVOS.LOTES,
      antesLote,
      depoisLote,
      usuarioResponsavel
    );

    for (const item of equipamentosAtualizados) {
      this.registrarJournal(
        "ATUALIZAR",
        ARQUIVOS.EQUIPAMENTOS,
        item.dadosAntes,
        item.dadosDepois,
        usuarioResponsavel
      );
    }

    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depoisLote);
    for (const item of equipamentosAtualizados) {
      this.repositorio.salvarEntidade(ARQUIVOS.EQUIPAMENTOS, item.dadosDepois);
    }
  }

  encaminharLote(loteId: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote encaminhar");
    const lote = this.carregarLote(loteId);
    if (!lote.ativo) throw new Error("Não é possível encaminhar um lote desativado.");
    if (lote.statusProcessamento !== StatusLote.TRIAGEM_CONCLUIDA) {
      throw new Error("Somente um lote com triagem concluída pode ser encaminhado.");
    }
    const antes = lote.paraDados();
    lote.statusProcessamento = StatusLote.ENCAMINHADO;
    const depois = lote.paraDados();
    this.registrarJournal("ENCAMINHAR", ARQUIVOS.LOTES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depois);
  }

  finalizarLote(loteId: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote finalizar");
    const lote = this.carregarLote(loteId);
    if (!lote.ativo) throw new Error("Não é possível finalizar um lote desativado.");
    if (lote.statusProcessamento !== StatusLote.ENCAMINHADO) {
      throw new Error("Somente um lote encaminhado pode ser finalizado.");
    }
    const antes = lote.paraDados();
    lote.statusProcessamento = StatusLote.FINALIZADO;
    const depois = lote.paraDados();
    this.registrarJournal("FINALIZAR", ARQUIVOS.LOTES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depois);
  }

  consultarLotePorPeriodo(dataInicio: Date, dataFim: Date, usuarioResponsavel: string): Lote[] {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote consultar-periodo");
    return this.listarLotesPorPeriodo(dataInicio, dataFim);
  }

  /** Leitura interna usada por relatórios após a autorização do próprio relatório. */
  listarLotesPorPeriodo(dataInicio: Date, dataFim: Date): Lote[] {
    const lotesAtivos = this.repositorio
      .listarEntidades(ARQUIVOS.LOTES)
      .filter((item) => item.ativo !== false);

    return filtrarPorPeriodo(
      lotesAtivos,
      (item) => new Date(item.dataEntrada),
      dataInicio,
      dataFim
    ).map((item) => Lote.deDados(item));
  }


  obterLote(id: string, usuarioResponsavel: string): Lote {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote buscar");
    return this.carregarLote(id);
  }

  listarLotes(usuarioResponsavel: string, incluirInativos = false): Lote[] {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote listar");
    return this.repositorio.listarEntidades(ARQUIVOS.LOTES)
      .filter((item) => incluirInativos || item.ativo !== false)
      .map((item) => Lote.deDados(item));
  }

  atualizarLote(id: string, campos: Partial<Pick<Lote, "notaFiscal" | "transportadora" | "observacoes">>, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote atualizar");
    const lote = this.carregarLote(id);
    if (!lote.ativo) throw new Error("Não é permitido atualizar um lote desativado.");
    if (lote.statusProcessamento === StatusLote.FINALIZADO) throw new Error("Não é permitido atualizar um lote finalizado.");
    const antes = lote.paraDados();
    for (const campo of ["notaFiscal", "transportadora", "observacoes"] as const) {
      const valor = campos[campo];
      if (valor !== undefined) {
        if (campo !== "observacoes" && !valor.trim()) throw new Error(`O campo ${campo} não pode ser vazio.`);
        lote[campo] = valor.trim();
      }
    }
    const depois = lote.paraDados();
    this.registrarJournal("ATUALIZAR", ARQUIVOS.LOTES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depois);
  }

  desativarLote(id: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote desativar");
    const lote = this.carregarLote(id);
    if (!lote.ativo) throw new Error("O lote já está desativado.");
    const antes = lote.paraDados();
    lote.desativar();
    const depois = lote.paraDados();
    this.registrarJournal("DESATIVAR", ARQUIVOS.LOTES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depois);
  }

  ativarLote(id: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote ativar");
    const lote = this.carregarLote(id);
    if (lote.ativo) throw new Error("O lote já está ativo.");
    const antes = lote.paraDados();
    lote.ativar();
    const depois = lote.paraDados();
    this.registrarJournal("ATIVAR", ARQUIVOS.LOTES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depois);
  }

  removerEquipamento(loteId: string, equipamentoId: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "lote remover-equipamento");
    const lote = this.carregarLote(loteId);
    if (!lote.ativo) throw new Error("Não é possível alterar um lote desativado.");
    if (lote.statusProcessamento === StatusLote.FINALIZADO) throw new Error("Não é possível alterar um lote finalizado.");
    const equipamentoRepo = exigirEncontrado(
      this.repositorio.carregarEntidade(ARQUIVOS.EQUIPAMENTOS, equipamentoId),
      "Equipamento"
    );
    const antesLote = lote.paraDados();
    const equipamentoAntes = Equipamento.deDados(equipamentoRepo).paraDados();
    if (!lote.removerEquipamento(equipamentoId)) throw new Error("O equipamento não está vinculado a este lote.");
    const equipamento = Equipamento.deDados(equipamentoRepo);
    equipamento.loteId = "";
    equipamento.posicaoNoLote = -1;
    const depoisLote = lote.paraDados();
    const depoisEquipamento = equipamento.paraDados();
    this.registrarJournal("REMOVER_VINCULO", ARQUIVOS.LOTES, antesLote, depoisLote, usuarioResponsavel);
    this.registrarJournal("ATUALIZAR", ARQUIVOS.EQUIPAMENTOS, equipamentoAntes, depoisEquipamento, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.LOTES, depoisLote);
    this.repositorio.salvarEntidade(ARQUIVOS.EQUIPAMENTOS, depoisEquipamento);
  }

  private carregarLote(loteId: string): Lote {
    const dados = exigirEncontrado(
      this.repositorio.carregarEntidade(ARQUIVOS.LOTES, loteId),
      "Lote"
    );
    return Lote.deDados(dados);
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
