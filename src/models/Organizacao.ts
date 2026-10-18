import { Contrato } from './Contrato';
import { restaurarDatas, serializarDados } from '../utils/SerializadorDados';

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
  contratos: Contrato[];

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
    this.contratos = [];
  }

  alterarEndereco(novoEndereco: string): void {
    if (!novoEndereco.trim()) {
      throw new Error("O endereço não pode ser vazio.");
    }
    this.enderecoCompleto = novoEndereco;
  }

  desativar(): void { this.ativo = false; }
  ativar(): void { this.ativo = true; }

  adicionarContrato(contrato: Contrato): void {
    if (this.contratoVigente?.estaVigente()) throw new Error("A organização já possui um contrato vigente.");
    this.contratos = this.contratos.filter((item) => item.id !== contrato.id);
    this.contratos.push(contrato);
    this.contratoVigente = contrato;
  }

  cancelarContrato(): Contrato {
    if (!this.contratoVigente) throw new Error("A organização não possui contrato para cancelar.");
    const contrato = this.contratoVigente;
    contrato.cancelar();
    this.contratoVigente = null;
    if (!this.contratos.some((item) => item.id === contrato.id)) this.contratos.push(contrato);
    return contrato;
  }

  static deDados(dados: Record<string, any>): Organizacao {
    const normalizados = restaurarDatas(dados);
    const organizacao = new Organizacao(
      String(normalizados.id),
      String(normalizados.razaoSocial),
      String(normalizados.cnpj),
      String(normalizados.inscricaoEstadual ?? ""),
      String(normalizados.enderecoCompleto ?? ""),
      String(normalizados.telefone ?? ""),
      String(normalizados.email ?? ""),
      new Date(normalizados.dataCadastro)
    );

    organizacao.ativo = normalizados.ativo === undefined ? true : Boolean(normalizados.ativo);
    const contratosDados = Array.isArray(normalizados.contratos) ? normalizados.contratos : [];
    organizacao.contratos = contratosDados.map((item: Record<string, any>) => Contrato.deDados(item));
    const contratoLegado = normalizados.contratoVigente ? Contrato.deDados(normalizados.contratoVigente) : null;
    if (contratoLegado) {
      const historico = organizacao.contratos.find((item) => item.id === contratoLegado.id);
      organizacao.contratoVigente = historico ?? contratoLegado;
      if (!historico) organizacao.contratos.push(contratoLegado);
    } else {
      organizacao.contratoVigente = null;
    }

    return organizacao;
  }

  paraDados(): Record<string, unknown> {
    return serializarDados({
      id: this.id,
      razaoSocial: this.razaoSocial,
      cnpj: this.cnpj,
      inscricaoEstadual: this.inscricaoEstadual,
      enderecoCompleto: this.enderecoCompleto,
      telefone: this.telefone,
      email: this.email,
      dataCadastro: this.dataCadastro,
      ativo: this.ativo,
      contratoVigente: this.contratoVigente?.paraDados() ?? null,
      contratos: [
        ...this.contratos.filter((contrato) => contrato.id !== this.contratoVigente?.id).map((contrato) => contrato.paraDados()),
        ...(this.contratoVigente ? [this.contratoVigente.paraDados()] : []),
      ],
    });
  }
}
