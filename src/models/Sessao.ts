import { Autenticavel } from "./Autenticavel";
import { PapelUsuario } from "./enums/PapelUsuario";
import * as crypto from "crypto";

export class Sessao implements Autenticavel {
  private token: string;
  private usuario: string;
  private papel: PapelUsuario;
  private criacao: Date;
  private expiracao: Date;

  constructor(usuario: string, papel: PapelUsuario) {
    this.usuario = usuario;
    this.papel = papel;
    this.criacao = new Date();
    this.token = this.geraToken();

    this.expiracao = new Date();
    this.expiracao.setMinutes(this.criacao.getMinutes() + 30);
  }

  private geraToken(): string {
    return crypto.randomBytes(24).toString("hex");
  }

  isValida(): boolean {
    return new Date() < this.expiracao;
  }

  renova(): void {
    this.expiracao = new Date();
    this.expiracao.setMinutes(new Date().getMinutes() + 30);
  }

  autentica(usuario: string, senha: string): boolean {
    return usuario === this.usuario && this.isValida();
  }

  renovaToken(): string {
    this.renova();
    this.token = this.geraToken();
    return this.token;
  }
}