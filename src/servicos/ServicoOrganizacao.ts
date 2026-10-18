import { ARQUIVOS } from "../persistencia/ArquivosPersistencia";
import { exigirEncontrado } from "../utils/ExigirEncontrado";
import * as path from "path";
import { OrganizacaoFactory } from "../factories/OrganizacaoFactory";
import { Organizacao } from "../models/Organizacao";
import { ValidadorCNPJ } from "../models/ValidadorCNPJ";
import { Contrato } from "../models/Contrato";
import { StatusLote } from "../models/enums/StatusLote";
import { registrarJournal } from "../persistencia/registrarJournal";
import { RepositorioArquivos } from "../persistencia/RepositorioArquivos";
import { ServicoAutorizacao } from "./ServicoAutorizacao";

type DadosOrganizacao = import("../factories/OrganizacaoFactory").DadosOrganizacaoFactory;

export class ServicoOrganizacao {
  private repositorio: RepositorioArquivos;
  private validadorCNPJ: ValidadorCNPJ;
  private journal: (operacao: string, entidade: string, antes: any, depois: any, usuario: string) => void;

  constructor(
    repositorio: RepositorioArquivos,
    diretorioBase: string = path.dirname(repositorio.obterCaminho(ARQUIVOS.ORGANIZACOES)),
    chave: string = "",
    private readonly autorizacao: ServicoAutorizacao
  ) {
    this.repositorio = repositorio;
    this.validadorCNPJ = new ValidadorCNPJ();

    this.journal = (operacao, entidade, antes, depois, usuario) =>
      registrarJournal({ operacao, entidade, antes, depois, usuario }, { diretorioBase, chave, repositorio });
  }

  cadastrarOrganizacao(dados: DadosOrganizacao, usuarioResponsavel: string): Organizacao {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "org criar");
    if (!this.validadorCNPJ.validar(dados.cnpj)) {
      throw new Error(this.validadorCNPJ.obterMensagemErro());
    }

    const existentes = this.repositorio.listarEntidades(ARQUIVOS.ORGANIZACOES);
    if (existentes.some((item) => item.id === dados.id)) {
      throw new Error("Já existe uma organização com este identificador.");
    }
    if (dados.contrato) {
      if (!dados.contrato.id.trim()) throw new Error("O identificador do contrato não pode ser vazio.");
      if (existentes.some((item) => item.contratoVigente?.id === dados.contrato!.id || (item.contratos ?? []).some((contrato: any) => contrato.id === dados.contrato!.id))) {
        throw new Error("Já existe um contrato com este identificador.");
      }
      if (!(dados.contrato.dataVencimento instanceof Date) || Number.isNaN(dados.contrato.dataVencimento.getTime()) || dados.contrato.dataVencimento <= new Date()) {
        throw new Error("O vencimento do contrato inicial deve ser uma data futura válida.");
      }
      if (!Number.isFinite(dados.contrato.valorMensal) || dados.contrato.valorMensal < 0) {
        throw new Error("O valor mensal do contrato deve ser um número não negativo.");
      }
    }
    const cnpjNormalizado = dados.cnpj.replace(/\D/g, "");

    if (existentes.some((item) => String(item.cnpj).replace(/\D/g, "") === cnpjNormalizado)) {
      throw new Error("Já existe uma organização cadastrada com este CNPJ.");
    }

    const organizacao = OrganizacaoFactory.criar({
      ...dados,
      cnpj: cnpjNormalizado,
    });

    const entidade = organizacao.paraDados();
    this.journal("CRIAR", ARQUIVOS.ORGANIZACOES, null, entidade, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.ORGANIZACOES, entidade);
    return organizacao;
  }

  buscarOrganizacao(id: string): Organizacao {
    const dados = exigirEncontrado(
      this.repositorio.carregarEntidade(ARQUIVOS.ORGANIZACOES, id),
      "Organização",
      "Organização não encontrada."
    );
    return Organizacao.deDados(dados);
  }

  listarOrganizacoesAtivas(usuarioResponsavel: string): Organizacao[] {
    return this.listarOrganizacoes(usuarioResponsavel, false);
  }

  listarOrganizacoes(usuarioResponsavel: string, incluirInativas = false): Organizacao[] {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "org listar");
    return this.repositorio.listarEntidades(ARQUIVOS.ORGANIZACOES)
      .filter((item) => incluirInativas || item.ativo !== false)
      .map((item) => Organizacao.deDados(item));
  }

  obterOrganizacao(id: string, usuarioResponsavel: string): Organizacao {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "org buscar");
    return this.buscarOrganizacao(id);
  }

  atualizarOrganizacao(id: string, campos: Partial<Pick<Organizacao, "razaoSocial" | "inscricaoEstadual" | "enderecoCompleto" | "telefone" | "email">>, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "org atualizar");
    const organizacao = this.buscarOrganizacao(id);
    if (organizacao.ativo === false) throw new Error("Não é permitido atualizar uma organização desativada.");
    const antes = organizacao.paraDados();
    for (const campo of ["razaoSocial", "inscricaoEstadual", "enderecoCompleto", "telefone", "email"] as const) {
      const valor = campos[campo];
      if (valor !== undefined) {
        if (campo === "razaoSocial" || campo === "enderecoCompleto") {
          if (!valor.trim()) throw new Error(`O campo ${campo} não pode ser vazio.`);
        }
        organizacao[campo] = valor.trim();
      }
    }
    const depois = organizacao.paraDados();
    this.journal("ATUALIZAR", ARQUIVOS.ORGANIZACOES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.ORGANIZACOES, depois);
  }

  desativarOrganizacao(id: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "org desativar");
    const organizacao = this.buscarOrganizacao(id);
    if (!organizacao.ativo) throw new Error("A organização já está desativada.");
    const lotesPendentes = this.repositorio.listarEntidades(ARQUIVOS.LOTES).filter((lote) =>
      lote.organizacaoId === id && lote.statusProcessamento !== StatusLote.FINALIZADO
    );
    if (lotesPendentes.length) {
      throw new Error(`Não é possível desativar a organização: existem ${lotesPendentes.length} lote(s) não finalizado(s). Finalize-os antes.`);
    }
    const antes = organizacao.paraDados();
    organizacao.desativar();
    const depois = organizacao.paraDados();
    this.journal("DESATIVAR", ARQUIVOS.ORGANIZACOES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.ORGANIZACOES, depois);
  }

  ativarOrganizacao(id: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "org ativar");
    const organizacao = this.buscarOrganizacao(id);
    if (organizacao.ativo) throw new Error("A organização já está ativa.");
    const antes = organizacao.paraDados();
    organizacao.ativar();
    const depois = organizacao.paraDados();
    this.journal("ATIVAR", ARQUIVOS.ORGANIZACOES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.ORGANIZACOES, depois);
  }

  criarContrato(organizacaoId: string, dados: { id: string; dataVencimento: Date; valorMensal: number; clausulas?: string[]; renovacaoAutomatica?: boolean }, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "contrato criar");
    const organizacao = this.buscarOrganizacao(organizacaoId);
    if (!organizacao.ativo) throw new Error("Não é possível criar contrato para organização desativada.");
    if (!dados.id.trim()) throw new Error("O identificador do contrato não pode ser vazio.");
    if (!Number.isFinite(dados.valorMensal) || dados.valorMensal < 0) throw new Error("O valor mensal do contrato deve ser um número não negativo.");
    if (dados.dataVencimento <= new Date()) throw new Error("O vencimento do contrato deve ser uma data futura.");
    const duplicado = this.repositorio.listarEntidades(ARQUIVOS.ORGANIZACOES).some((item) =>
      (item.contratos ?? []).some((contrato: any) => contrato.id === dados.id) || item.contratoVigente?.id === dados.id
    );
    if (duplicado) throw new Error("Já existe um contrato com este identificador.");
    const antes = organizacao.paraDados();
    const contrato = new Contrato(dados.id, organizacaoId, dados.dataVencimento, dados.valorMensal, dados.clausulas ?? [], dados.renovacaoAutomatica ?? false);
    organizacao.adicionarContrato(contrato);
    const depois = organizacao.paraDados();
    this.journal("CRIAR_CONTRATO", ARQUIVOS.ORGANIZACOES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.ORGANIZACOES, depois);
  }

  listarContratos(organizacaoId: string, usuarioResponsavel: string): Contrato[] {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "contrato listar");
    const organizacao = this.buscarOrganizacao(organizacaoId);
    return organizacao.contratos.map((contrato) => Contrato.deDados(contrato.paraDados()));
  }

  obterContrato(organizacaoId: string, contratoId: string, usuarioResponsavel: string): Contrato {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "contrato buscar");
    const organizacao = this.buscarOrganizacao(organizacaoId);
    const contrato = organizacao.contratos.find((item) => item.id === contratoId);
    if (!contrato) throw new Error("Contrato não encontrado nesta organização.");
    return Contrato.deDados(contrato.paraDados());
  }

  atualizarContrato(
    organizacaoId: string,
    contratoId: string,
    campos: { dataVencimento?: Date; valorMensal?: number; clausulas?: string[]; renovacaoAutomatica?: boolean },
    usuarioResponsavel: string
  ): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "contrato atualizar");
    const organizacao = this.buscarOrganizacao(organizacaoId);
    if (!organizacao.ativo) throw new Error("Não é possível alterar contrato de organização desativada.");
    const contrato = organizacao.contratos.find((item) => item.id === contratoId);
    if (!contrato) throw new Error("Contrato não encontrado nesta organização.");
    if (!contrato.ativo) throw new Error("Não é permitido atualizar um contrato cancelado.");
    if (campos.dataVencimento !== undefined) {
      if (!(campos.dataVencimento instanceof Date) || Number.isNaN(campos.dataVencimento.getTime()) || campos.dataVencimento <= new Date()) {
        throw new Error("O vencimento do contrato deve ser uma data futura válida.");
      }
    }
    if (campos.valorMensal !== undefined && (!Number.isFinite(campos.valorMensal) || campos.valorMensal < 0)) {
      throw new Error("O valor mensal do contrato deve ser um número não negativo.");
    }
    const antes = organizacao.paraDados();
    if (campos.dataVencimento !== undefined) contrato.dataVencimento = new Date(campos.dataVencimento);
    if (campos.valorMensal !== undefined) contrato.valorMensal = campos.valorMensal;
    if (campos.clausulas !== undefined) contrato.clausulas = [...campos.clausulas];
    if (campos.renovacaoAutomatica !== undefined) contrato.renovacaoAutomatica = campos.renovacaoAutomatica;
    const depois = organizacao.paraDados();
    this.journal("ATUALIZAR_CONTRATO", ARQUIVOS.ORGANIZACOES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.ORGANIZACOES, depois);
  }

  cancelarContrato(organizacaoId: string, usuarioResponsavel: string): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "contrato cancelar");
    const organizacao = this.buscarOrganizacao(organizacaoId);
    const antes = organizacao.paraDados();
    organizacao.cancelarContrato();
    const depois = organizacao.paraDados();
    this.journal("CANCELAR_CONTRATO", ARQUIVOS.ORGANIZACOES, antes, depois, usuarioResponsavel);
    this.repositorio.salvarEntidade(ARQUIVOS.ORGANIZACOES, depois);
  }

  renovarContrato(
    organizacaoId: string,
    novoVencimento: Date,
    usuarioResponsavel: string
  ): void {
    this.autorizacao.exigirPermissao(usuarioResponsavel, "org renovar-contrato");
    const organizacao = this.buscarOrganizacao(organizacaoId);
    if (!organizacao.contratoVigente) {
      throw new Error("A organização não possui contrato vigente para renovar.");
    }

    const antes = organizacao.paraDados();
    organizacao.contratoVigente.renovar(novoVencimento);
    const depois = organizacao.paraDados();

    this.journal(
      "ATUALIZAR",
      ARQUIVOS.ORGANIZACOES,
      antes,
      depois,
      usuarioResponsavel
    );
    this.repositorio.salvarEntidade(ARQUIVOS.ORGANIZACOES, depois);
  }
}
