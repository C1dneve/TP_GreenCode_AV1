import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao";

export interface AmbienteTeste {
  diretorio: string;
  autenticacao: ServicoAutenticacao;
  limpar(): void;
}

/** Utilitário de asserção compartilhado pelos testes. */
export function assertEqual(
  atual: unknown,
  esperado: unknown,
  mensagem?: string
): void {
  if (atual !== esperado) {
    throw new Error(
      mensagem ??
        `Falhou: esperado ${JSON.stringify(esperado)}, recebeu ${JSON.stringify(atual)}`
    );
  }
}

/** Prepara um diretório descartável, provisiona o administrador e, opcionalmente, os quatro papéis. */
export function criarAmbiente(
  prefixo = "greencode-teste-",
  senhaAdministrador = "senha-admin",
  criarPapeis = true
): AmbienteTeste {
  const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), prefixo));
  const autenticacao = new ServicoAutenticacao(diretorio);
  autenticacao.provisionarInicial(senhaAdministrador, "admin");

  if (criarPapeis) {
    for (const papel of Object.values(PapelUsuario)) {
      if (papel === PapelUsuario.ADMINISTRADOR) continue;
      autenticacao.criarUsuario(
        `usuario-${papel}`,
        `senha-${papel}`,
        papel,
        "admin",
        `Usuário ${papel}`
      );
    }
  }

  return {
    diretorio,
    autenticacao,
    limpar: () => fs.rmSync(diretorio, { recursive: true, force: true }),
  };
}

/** Faz login de teste segundo a convenção definida por criarAmbiente. */
export function logarComo(
  autenticacao: ServicoAutenticacao,
  papel: PapelUsuario,
  senha?: string
) {
  const usuario = papel === PapelUsuario.ADMINISTRADOR ? "admin" : `usuario-${papel}`;
  const senhaPadrao = papel === PapelUsuario.ADMINISTRADOR ? "senha-admin" : `senha-${papel}`;
  return autenticacao.login(usuario, senha ?? senhaPadrao);
}
