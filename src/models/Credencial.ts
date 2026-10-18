import { createHash, randomBytes } from "crypto";
import { Autenticavel } from "./Autenticavel";
import { PapelUsuario } from "./enums/PapelUsuario";
import { restaurarDatas, serializarDados } from "../utils/SerializadorDados";

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
  private nome: string;
  private ativo: boolean;

  constructor(usuario: string, senha: string, papel: PapelUsuario, nome: string = usuario) {
    this.usuario = usuario;
    this.papel = papel;
    this.nome = nome.trim() || usuario;
    this.ativo = true;
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

  obterNome(): string { return this.nome; }
  estaAtiva(): boolean { return this.ativo; }

  atualizarDados(nome: string, papel: PapelUsuario): void {
    if (!nome.trim()) throw new Error("O nome do usuário não pode ser vazio.");
    if (!Object.values(PapelUsuario).includes(papel)) throw new Error("Papel de usuário inválido.");
    this.nome = nome.trim();
    this.papel = papel;
  }

  desativar(): void { this.ativo = false; }
  ativar(): void { this.ativo = true; }

  obterUltimoAcesso(): Date {
    return new Date(this.ultimoAcesso);
  }

  paraDados(): Record<string, unknown> {
    return serializarDados({
      usuario: this.usuario,
      hashSenha: this.hashSenha,
      salt: this.salt,
      ultimoAcesso: this.ultimoAcesso,
      papel: this.papel,
      nome: this.nome,
      ativo: this.ativo,
    });
  }

  static deDados(dados: Record<string, any>): Credencial {
    const normalizados = restaurarDatas(dados);
    const credencial = Object.create(Credencial.prototype) as Credencial;
    credencial.usuario = String(normalizados.usuario);
    credencial.hashSenha = String(normalizados.hashSenha);
    credencial.salt = String(normalizados.salt);
    credencial.ultimoAcesso = new Date(normalizados.ultimoAcesso);
    credencial.papel = normalizados.papel as PapelUsuario;
    credencial.nome = String(normalizados.nome ?? normalizados.usuario);
    credencial.ativo = normalizados.ativo === undefined ? true : Boolean(normalizados.ativo);
    return credencial;
  }
}
