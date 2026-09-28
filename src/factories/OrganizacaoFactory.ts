import { Contrato } from "../models/Contrato";
import { Organizacao } from "../models/Organizacao";

export interface DadosOrganizacaoFactory {
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

export class OrganizacaoFactory {
  static criar(dados: DadosOrganizacaoFactory): Organizacao {
    const organizacao = new Organizacao(
      dados.id,
      dados.razaoSocial,
      dados.cnpj,
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

    return organizacao;
  }
}
