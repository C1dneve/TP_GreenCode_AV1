import { assertEqual } from "./testUtils";
import { Credencial } from "../models/Credencial";
import { Sessao } from "../models/Sessao";
import { Movimentacao } from "../models/Movimentacao";
import { PapelUsuario } from "../models/enums/PapelUsuario";

console.log("Test da Credencial ...");
const credencial = new Credencial("cid", "senha123", PapelUsuario.ADMINISTRADOR);
assertEqual(credencial.verificaSenha("senha123"), true);
assertEqual(credencial.verificaSenha("senhaErrada"), false);
assertEqual(credencial.autentica("cid", "senha123"), true);
assertEqual(credencial.autentica("outroUsuario", "senha123"), false);
console.log("Credencial ok👍");

console.log("Test da Sessao ...");
const sessao = new Sessao("cid", PapelUsuario.ADMINISTRADOR);
assertEqual(sessao.isValida(), true);
assertEqual(sessao.autentica("cid", ""), true);
const tokenAntigo = sessao.renovaToken();
assertEqual(typeof tokenAntigo, "string");
console.log("Sessao ok👍");

console.log("Test daMovimentacao ...");
const mov = new Movimentacao("m1", "equip1", "Estoque A", "Triagem", "Cid", "teste");
assertEqual(mov instanceof Movimentacao, true);
console.log("Movimentacao ok👍");

console.log("\nDia 3 (parcial): tudo certinho");