import { assertEqual } from "./testUtils";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { StatusLote } from "../models/enums/StatusLote";
import { TipoEquipamento } from "../models/enums/TipoEquipamento";
import { EstadoFisico } from "../models/enums/EstadoFisico";
import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { ValidadorDataEntrada } from "../models/ValidadorDataEntrada";
import { ValidadorCNPJ } from "../models/ValidadorCNPJ";

console.log("Test dos enums ...");
assertEqual(PapelUsuario.ADMINISTRADOR, "ADMINISTRADOR");
assertEqual(StatusLote.EM_TRIAGEM, "EM_TRIAGEM");
assertEqual(TipoEquipamento.NOTEBOOK, "NOTEBOOK");
assertEqual(EstadoFisico.NOVO, "NOVO");
assertEqual(StatusRastreamento.BAIXA_DEFINITIVA, "BAIXA_DEFINITIVA");
console.log("enums ok👍");

console.log("Test do ValidadorDataEntrada ...");
const validadorData = new ValidadorDataEntrada();

assertEqual(validadorData.validar(new Date()), true);

const amanha = new Date();
amanha.setDate(amanha.getDate() + 1);
assertEqual(validadorData.validar(amanha), false);
assertEqual(
  validadorData.obterMensagemErro(),
  "Data de entrada não pode ser futura."
);

const cemDiasAtras = new Date();
cemDiasAtras.setDate(cemDiasAtras.getDate() - 100);
assertEqual(validadorData.validar(cemDiasAtras), false);
assertEqual(
  validadorData.obterMensagemErro(),
  "Data de entrada não pode ser anterior a 90 dias."
);
console.log("ValidadorDataEntrada ok👍");

console.log("Test do ValidadorCNPJ ...");
const validadorCnpj = new ValidadorCNPJ();

assertEqual(validadorCnpj.validar("11.222.333/0001-81"), true);
assertEqual(validadorCnpj.validar("11.222.333/0001-82"), false);
assertEqual(
  validadorCnpj.obterMensagemErro(),
  "CNPJ inválido (dígito não confere)."
);
assertEqual(validadorCnpj.validar("123"), false);
assertEqual(validadorCnpj.validar("11111111111111"), false);
console.log("ValidadorCNPJ ok👍");

console.log("\nTeste 1: tudo certinho ");