import { Autenticavel } from "./Autenticavel";
import { PapelUsuario } from "./enums/PapelUsuario";
import * as crypto from "crypto";

export class Credencial implements Autenticavel {
  private usuario: string;
  private hashSenha: string;
  private salt: string;
  private ultimoAcesso: Date;
  private papel: PapelUsuario;

  constructor(usuario: string, senha: string, papel: PapelUsuario) {
    this.usuario = usuario;
    this.papel = papel;
    this.ultimoAcesso = new Date();

    this.salt = crypto.randomBytes(16).toString("hex");
    this.hashSenha = this.geraHash(senha, this.salt);
  }

  private geraHash(senha: string, salt: string): string {
    return crypto.createHash("sha256").update(senha + salt).digest("hex");
  }

  verificaSenha(senhaPlana: string): boolean {
    return this.geraHash(senhaPlana, this.salt) === this.hashSenha;
  }

  atualizarUltimoAcesso(): void {
    this.ultimoAcesso = new Date();
  }

  autentica(usuario: string, senha: string): boolean {
    return usuario === this.usuario && this.verificaSenha(senha);
  }

  renovaToken(): string {
    return "";
  }
}