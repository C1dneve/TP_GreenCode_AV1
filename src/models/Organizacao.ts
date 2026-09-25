import { Contrato } from './Contrato';

export class Organizacao {
  id: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  enderecoCompleto: string;
  telefone: string;
  email: string;
  dataCadastro: Date;
  ativo: boolean;
  contratoVigente: Contrato | null;

  constructor(
    id: string,
    razaoSocial: string,
    cnpj: string,
    inscricaoEstadual: string,
    enderecoCompleto: string,
    telefone: string,
    email: string,
    dataCadastro: Date = new Date()
  ) {
    this.id = id;
    this.razaoSocial = razaoSocial;
    this.cnpj = cnpj;
    this.inscricaoEstadual = inscricaoEstadual;
    this.enderecoCompleto = enderecoCompleto;
    this.telefone = telefone;
    this.email = email;
    this.dataCadastro = new Date(dataCadastro);
    this.ativo = true;
    this.contratoVigente = null;
  }

  alterarEndereco(novoEndereco: string): void {
    if (!novoEndereco.trim()) {
      throw new Error("O endereço não pode ser vazio.");
    }
    this.enderecoCompleto = novoEndereco;
  }

  desativar(): void {
    this.ativo = false;
  }

  static deDados(dados: Record<string, any>): Organizacao {
    const organizacao = new Organizacao(
      String(dados.id),
      String(dados.razaoSocial),
      String(dados.cnpj),
      String(dados.inscricaoEstadual ?? ""),
      String(dados.enderecoCompleto ?? ""),
      String(dados.telefone ?? ""),
      String(dados.email ?? ""),
      new Date(dados.dataCadastro)
    );

    organizacao.ativo = Boolean(dados.ativo);
    organizacao.contratoVigente = dados.contratoVigente
      ? Contrato.deDados(dados.contratoVigente)
      : null;

    return organizacao;
  }

  paraDados(): Record<string, unknown> {
    return {
      id: this.id,
      razaoSocial: this.razaoSocial,
      cnpj: this.cnpj,
      inscricaoEstadual: this.inscricaoEstadual,
      enderecoCompleto: this.enderecoCompleto,
      telefone: this.telefone,
      email: this.email,
      dataCadastro: this.dataCadastro.toISOString(),
      ativo: this.ativo,
      contratoVigente: this.contratoVigente?.paraDados() ?? null,
    };
  }
}
