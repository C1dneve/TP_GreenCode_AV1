import { randomBytes } from "crypto";
import { Autenticavel } from "./Autenticavel";
import { PapelUsuario } from "./enums/PapelUsuario";

export class Sessao implements Autenticavel {
  private token: string;
  private usuario: string;
  private papel: PapelUsuario;
  private criacao: Date;
  private expiracao: Date;

  private static readonly TEMPO_INATIVIDADE_MINUTOS = 30;

  constructor(usuario: string, papel: PapelUsuario) {
    this.usuario = usuario;
    this.papel = papel;
    this.criacao = new Date();
    this.token = this.gerarToken();
    this.expiracao = this.calcularNovaExpiracao();
  }

  private gerarToken(): string {
    return randomBytes(32).toString("hex");
  }

  private calcularNovaExpiracao(): Date {
    const novaExpiracao = new Date();
    novaExpiracao.setMinutes(
      novaExpiracao.getMinutes() + Sessao.TEMPO_INATIVIDADE_MINUTOS
    );
    return novaExpiracao;
  }

  isValida(): boolean {
    return new Date() < this.expiracao;
  }

  renovar(): void {
    this.expiracao = this.calcularNovaExpiracao();
  }

  registrarAtividade(): void {
    this.renovar();
  }

  autenticar(usuario: string, _senha: string): boolean {
    return usuario === this.usuario && this.isValida();
  }

  renovarToken(): string {
    this.renovar();
    this.token = this.gerarToken();
    return this.token;
  }

  obterToken(): string {
    return this.token;
  }

  obterUsuario(): string {
    return this.usuario;
  }

  obterPapel(): PapelUsuario {
    return this.papel;
  }

  obterCriacao(): Date {
    return new Date(this.criacao);
  }

  obterExpiracao(): Date {
    return new Date(this.expiracao);
  }
}
