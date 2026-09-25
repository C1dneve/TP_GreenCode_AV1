import { createHash, randomBytes } from "crypto";
import { Autenticavel } from "./Autenticavel";
import { PapelUsuario } from "./enums/PapelUsuario";

/**
 * Representa uma credencial persistível do sistema.
 *
 * O projeto exige SHA-256 + salt. A implementação abaixo mantém exatamente
 * esse contrato do enunciado. Em uma aplicação real, uma função de derivação
 * de senha resistente a brute force seria preferível.
 */
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
    this.salt = randomBytes(16).toString("hex");
    this.hashSenha = this.gerarHash(senha, this.salt);
  }


  private gerarHash(senha: string, salt: string): string {
    return createHash("sha256").update(`${senha}${salt}`).digest("hex");
  }


  verificarSenha(senhaPlana: string): boolean {
    return this.gerarHash(senhaPlana, this.salt) === this.hashSenha;
  }


  atualizarUltimoAcesso(): void {
    this.ultimoAcesso = new Date();
  }


  alterarSenha(novaSenha: string): void {
    this.salt = randomBytes(16).toString("hex");
    this.hashSenha = this.gerarHash(novaSenha, this.salt);
  }


  autenticar(usuario: string, senha: string): boolean {
    const autenticado = usuario === this.usuario && this.verificarSenha(senha);

    if (autenticado) {
      this.atualizarUltimoAcesso();
    }

    return autenticado;
  }


  renovarToken(): string {
    return randomBytes(24).toString("hex");
  }


  obterUsuario(): string {
    return this.usuario;
  }


  obterPapel(): PapelUsuario {
    return this.papel;
  }

  obterUltimoAcesso(): Date {
    return new Date(this.ultimoAcesso);
  }

  paraDados(): Record<string, unknown> {
    return {
      usuario: this.usuario,
      hashSenha: this.hashSenha,
      salt: this.salt,
      ultimoAcesso: this.ultimoAcesso.toISOString(),
      papel: this.papel,
    };
  }

  static deDados(dados: Record<string, any>): Credencial {
    const credencial = Object.create(Credencial.prototype) as Credencial;
    credencial.usuario = String(dados.usuario);
    credencial.hashSenha = String(dados.hashSenha);
    credencial.salt = String(dados.salt);
    credencial.ultimoAcesso = new Date(dados.ultimoAcesso);
    credencial.papel = dados.papel as PapelUsuario;
    return credencial;
  }
}
