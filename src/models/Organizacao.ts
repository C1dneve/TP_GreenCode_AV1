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
    email: string
  ) {
    this.id = id;
    this.razaoSocial = razaoSocial;

    this.cnpj = cnpj;
    this.inscricaoEstadual = inscricaoEstadual;
    this.enderecoCompleto = enderecoCompleto;
    this.telefone = telefone;
    this.email = email;
    this.dataCadastro = new Date();
    this.ativo = true;

    this.contratoVigente = null;
  }

  alteraEndereco(novoEndereco: string): void {
    this.enderecoCompleto = novoEndereco;
  }

  desativa(): void {
    this.ativo = false;
  }
}