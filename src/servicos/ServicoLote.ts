import { Lote } from "../models/Lote";
import { Equipamento } from "../models/Equipamento";
import { StatusLote } from "../models/enums/StatusLote";
import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { ValidadorDataEntrada } from "../models/ValidadorDataEntrada";
import { JournalTransacao } from "../persistencia/JournalTransacao";
import { RepositorioArquivos } from "../persistencia/RepositorioArquivos";

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
    chave: string
  ) {
    this.repositorio = repositorio;
    this.validadorDataEntrada = new ValidadorDataEntrada();
    this.diretorioBase = diretorioBase;
    this.chave = chave;
  }

  criarLote(dados: DadosLote, usuarioResponsavel = "sistema"): Lote {
    const dataEntrada = dados.dataEntrada
      ? new Date(dados.dataEntrada)
      : new Date();

    if (!this.validadorDataEntrada.validar(dataEntrada)) {
      throw new Error(this.validadorDataEntrada.obterMensagemErro());
    }

    if (this.repositorio.carregarEntidade("lotes.enc", dados.id)) {
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

    this.registrarJournal("CRIAR", "lotes.enc", null, entidade, usuarioResponsavel);
    this.repositorio.salvarEntidade("lotes.enc", entidade);
    return lote;
  }

  adicionarEquipamentoLote(
    loteId: string,
    equipamento: Equipamento,
    usuarioResponsavel = "sistema"
  ): void {
    const lote = this.carregarLote(loteId);
    if (this.repositorio.carregarEntidade("equipamentos.enc", equipamento.id)) {
      throw new Error("Já existe um equipamento com este identificador.");
    }

    const antes = lote.paraDados();
    lote.adicionarEquipamento(equipamento);
    const depois = lote.paraDados();

    const dadosEquipamento = equipamento.paraDados();

    this.registrarJournal(
      "ATUALIZAR",
      "lotes.enc",
      antes,
      depois,
      usuarioResponsavel
    );
    this.registrarJournal(
      "CRIAR",
      "equipamentos.enc",
      null,
      dadosEquipamento,
      usuarioResponsavel
    );

    this.repositorio.salvarEntidade("lotes.enc", depois);
    this.repositorio.salvarEntidade("equipamentos.enc", dadosEquipamento);

  }

  processarTriagem(loteId: string, usuarioResponsavel = "sistema"): void {
    const lote = this.carregarLote(loteId);
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
      "lotes.enc",
      antesLote,
      depoisLote,
      usuarioResponsavel
    );

    for (const item of equipamentosAtualizados) {
      this.registrarJournal(
        "ATUALIZAR",
        "equipamentos.enc",
        item.dadosAntes,
        item.dadosDepois,
        usuarioResponsavel
      );
    }

    this.repositorio.salvarEntidade("lotes.enc", depoisLote);
    for (const item of equipamentosAtualizados) {
      this.repositorio.salvarEntidade("equipamentos.enc", item.dadosDepois);
    }
  }

  consultarLotePorPeriodo(dataInicio: Date, dataFim: Date): Lote[] {
    if (dataInicio > dataFim) {
      throw new Error("A data inicial não pode ser posterior à data final.");
    }

    return this.repositorio
      .listarEntidades("lotes.enc")
      .filter((item) => {
        const dataEntrada = new Date(item.dataEntrada);
        return dataEntrada >= dataInicio && dataEntrada <= dataFim;
      })
      .map((item) => Lote.deDados(item));
  }

  private carregarLote(loteId: string): Lote {
    const dados = this.repositorio.carregarEntidade("lotes.enc", loteId);
    if (!dados) {
      throw new Error("Lote não encontrado.");
    }

    return Lote.deDados(dados);
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
