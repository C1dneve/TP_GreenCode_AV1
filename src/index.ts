import { ServicoAutenticacao } from "./servicos/ServicoAutenticacao";
import { CLIInterface } from "./cli/CLIInterface";
import * as path from "path";

const diretorioDados = process.env.GREEN_CODE_DATA_DIR
  ? path.resolve(process.env.GREEN_CODE_DATA_DIR)
  : undefined;
const autenticacao = new ServicoAutenticacao(diretorioDados);
const cli = new CLIInterface(autenticacao);

cli.iniciarLoop().catch((erro) => {
  console.error("Erro fatal ao iniciar o greencode:", erro);
  process.exit(1);
});