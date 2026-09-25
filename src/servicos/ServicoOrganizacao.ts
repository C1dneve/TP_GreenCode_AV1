import * as path from "path";
import { Contrato } from "../models/Contrato";
import { Organizacao } from "../models/Organizacao";
import { ValidadorCNPJ } from "../models/ValidadorCNPJ";
import { JournalTransacao } from "../persistencia/JournalTransacao";
import { RepositorioArquivos } from "../persistencia/RepositorioArquivos";

interface DadosOrganizacao {
  id: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  enderecoCompleto: string;
  telefone: string;
  email: string;
  contrato?: {
    id: string;
    dataVencimento: Date;
    valorMensal: number;
    clausulas?: string[];
    renovacaoAutomatica?: boolean;
  };
}

export class ServicoOrganizacao {
  private repositorio: RepositorioArquivos;
  private validadorCNPJ: ValidadorCNPJ;
  private journal: (operacao: string, entidade: string, antes: any, depois: any, usuario: string) => void;

  constructor(
    repositorio: RepositorioArquivos,
    diretorioBase: string = path.dirname(repositorio.obterCaminho("organizacoes.enc")),
    chave: string = "",
  ) {
    this.repositorio = repositorio;
    this.validadorCNPJ = new ValidadorCNPJ();

    this.journal = (operacao, entidade, antes, depois, usuario) => {
      const transacao = new JournalTransacao(
        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        operacao,
        entidade,
        antes,
        depois,
        usuario,
        diretorioBase,
        chave,
        repositorio
      );
      transacao.registrar();
    };
  }

  cadastrarOrganizacao(dados: DadosOrganizacao, usuarioResponsavel = "sistema"): Organizacao {
    if (!this.validadorCNPJ.validar(dados.cnpj)) {
      throw new Error(this.validadorCNPJ.obterMensagemErro());
    }

    const existentes = this.repositorio.listarEntidades("organizacoes.enc");
    const cnpjNormalizado = dados.cnpj.replace(/\D/g, "");

    if (existentes.some((item) => String(item.cnpj).replace(/\D/g, "") === cnpjNormalizado)) {
      throw new Error("Já existe uma organização cadastrada com este CNPJ.");
    }

    const organizacao = new Organizacao(
      dados.id,
      dados.razaoSocial,
      cnpjNormalizado,
      dados.inscricaoEstadual,
      dados.enderecoCompleto,
      dados.telefone,
      dados.email
    );

    if (dados.contrato) {
      organizacao.contratoVigente = new Contrato(
        dados.contrato.id,
        organizacao.id,
        new Date(dados.contrato.dataVencimento),
        dados.contrato.valorMensal,
        dados.contrato.clausulas ?? [],
        dados.contrato.renovacaoAutomatica ?? false
      );
    }

    const entidade = organizacao.paraDados();
    this.journal("CRIAR", "organizacoes.enc", null, entidade, usuarioResponsavel);
    this.repositorio.salvarEntidade("organizacoes.enc", entidade);
    return organizacao;
  }

  buscarOrganizacao(id: string): Organizacao {
    const dados = this.repositorio.carregarEntidade("organizacoes.enc", id);
    if (!dados) {
      throw new Error("Organização não encontrada.");
    }

    return Organizacao.deDados(dados);
  }

  listarOrganizacoesAtivas(): Organizacao[] {
    return this.repositorio
      .listarEntidades("organizacoes.enc")
      .filter((item) => item.ativo)
      .map((item) => Organizacao.deDados(item));
  }

  renovarContrato(
    organizacaoId: string,
    novoVencimento: Date,
    usuarioResponsavel = "sistema"
  ): void {
    const organizacao = this.buscarOrganizacao(organizacaoId);
    if (!organizacao.contratoVigente) {
      throw new Error("A organização não possui contrato vigente para renovar.");
    }

    const antes = organizacao.paraDados();
    organizacao.contratoVigente.renovar(novoVencimento);
    const depois = organizacao.paraDados();

    this.journal(
      "ATUALIZAR",
      "organizacoes.enc",
      antes,
      depois,
      usuarioResponsavel
    );
    this.repositorio.salvarEntidade("organizacoes.enc", depois);
  }
}
