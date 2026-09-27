import { assertEqual } from "./testUtils";
import { interpretarComando, COMANDOS_POR_PAPEL } from "../cli/CLIInterface";
import { PapelUsuario } from "../models/enums/PapelUsuario";

console.log("Testando interpretarComando ...");

const comando1 = interpretarComando("lote criar --org BR001 --nf 123456 --transp TransRapida");
assertEqual(comando1.entidade, "lote");
assertEqual(comando1.acao, "criar");
assertEqual(comando1.flags.org, "BR001");
assertEqual(comando1.flags.nf, "123456");
assertEqual(comando1.flags.transp, "TransRapida");

const comando2 = interpretarComando("org listar");
assertEqual(comando2.entidade, "org");
assertEqual(comando2.acao, "listar");
assertEqual(Object.keys(comando2.flags).length, 0);

const comando3 = interpretarComando("  equip   rastrear   --id  equip-1  ");
assertEqual(comando3.entidade, "equip");
assertEqual(comando3.acao, "rastrear");
assertEqual(comando3.flags.id, "equip-1");

const comandoVazio = interpretarComando("");
assertEqual(comandoVazio.entidade, "");
assertEqual(comandoVazio.acao, "");
console.log("interpretarComando ok👍");

console.log("Testando COMANDOS_POR_PAPEL ...");

const verbosDeEscrita = ["criar", "triagem", "mover", "renovar-contrato"];
const comandosAuditor = COMANDOS_POR_PAPEL[PapelUsuario.AUDITOR];
assertEqual(comandosAuditor.every((cmd) => !verbosDeEscrita.some((v) => cmd.includes(v))), true);

const comandosOperador = COMANDOS_POR_PAPEL[PapelUsuario.OPERADOR_CADASTRO];
assertEqual(comandosOperador.every((cmd) => !cmd.startsWith("lote") && !cmd.startsWith("equip")), true);

const comandosGestor = COMANDOS_POR_PAPEL[PapelUsuario.GESTOR_ALMOXARIFADO];
assertEqual(comandosGestor.every((cmd) => !cmd.startsWith("org")), true);
console.log("COMANDOS_POR_PAPEL ok👍");

console.log("\nDia 5 (automatizado): tudo certinho");