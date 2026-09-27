import { ServicoAutenticacao } from "./servicos/ServicoAutenticacao";
import { CLIInterface } from "./cli/CLIInterface";

const autenticacao = new ServicoAutenticacao();
const cli = new CLIInterface(autenticacao);

cli.iniciarLoop().catch((erro) => {
  console.error("Erro fatal ao iniciar o greencode:", erro);
  process.exit(1);
});