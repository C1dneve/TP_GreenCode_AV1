export interface Autenticavel {
  autentica(usuario: string, senha: string): boolean;
  renovaToken(): string;
}