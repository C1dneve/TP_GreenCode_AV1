import { assertEqual } from "./testUtils";
import { Credencial } from "../models/Credencial";
import { Sessao } from "../models/Sessao";
import { Movimentacao } from "../models/Movimentacao";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { EstadoFisico } from "../models/enums/EstadoFisico";
import { Equipamento } from "../models/Equipamento";
import { TipoEquipamento } from "../models/enums/TipoEquipamento";

console.log("Teste da Credencial ...");
const credencial = new Credencial("cid", "senha123", PapelUsuario.ADMINISTRADOR);
assertEqual(credencial.verificarSenha("senha123"), true);
assertEqual(credencial.verificarSenha("senhaErrada"), false);
assertEqual(credencial.autenticar("cid", "senha123"), true);
assertEqual(credencial.autenticar("outroUsuario", "senha123"), false);
console.log("Credencial ok👍");

console.log("Teste da Sessao ...");
const sessao = new Sessao("cid", PapelUsuario.ADMINISTRADOR);
assertEqual(sessao.isValida(), true);
assertEqual(sessao.autenticar("cid", ""), true);
const tokenAntigo = sessao.obterToken();
const tokenNovo = sessao.renovarToken();
assertEqual(typeof tokenAntigo, "string");
assertEqual(typeof tokenNovo, "string");
assertEqual(tokenAntigo === tokenNovo, false);
console.log("Sessao ok👍");

console.log("Teste da Movimentacao ...");
const mov = new Movimentacao("m1", "equip1", "Estoque A", "Triagem", "Cid", "teste");
assertEqual(mov instanceof Movimentacao, true);
console.log("Movimentacao ok👍");

console.log("Teste da Equipamento ...");
const equipamento = new Equipamento(
  "e1",
  "GC-NOTE-000001",
  TipoEquipamento.NOTEBOOK,
  "Dell",
  "Latitude",
  2024,
  EstadoFisico.NOVO,
  1.8
);
equipamento.registrarMovimentacao("Triagem", "Cid");
assertEqual(equipamento.historicoMovimentacao.length, 1);
assertEqual(typeof equipamento.calcularDepreciacao(), "number");
console.log("Equipamento ok👍");

console.log("\nTeste 2: tudo certinho");
