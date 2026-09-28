import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { assertEqual } from "./testUtils";
import { CriptografiaArquivo } from "../persistencia/CriptografiaArquivo";
import { RepositorioArquivos } from "../persistencia/RepositorioArquivos";
import { JournalTransacao } from "../persistencia/JournalTransacao";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao";
import { ServicoOrganizacao } from "../servicos/ServicoOrganizacao";
import { ServicoLote } from "../servicos/ServicoLote";
import { ServicoEquipamentos } from "../servicos/ServicoEquipamentos";
import { ServicoRelatorios } from "../servicos/ServicoRelatorios";
import { PapelUsuario } from "../models/enums/PapelUsuario";
import { TipoEquipamento } from "../models/enums/TipoEquipamento";
import { EstadoFisico } from "../models/enums/EstadoFisico";
import { StatusRastreamento } from "../models/enums/StatusRastreamento";
import { ServicoAutorizacao } from "../servicos/ServicoAutorizacao";
import { Equipamento } from "../models/Equipamento";

const diretorioTeste = fs.mkdtempSync(
  path.join(os.tmpdir(), "greencode-dia4-")
);

try {
  console.log("Teste da CriptografiaArquivo ...");
  const criptografia = new CriptografiaArquivo();
  const chave = criptografia.gerarChave();
  const original = "GreenCode — dado sensível";
  const cifrado = criptografia.cifrar(original, chave);
  assertEqual(criptografia.decifrar(cifrado, chave), original);
  assertEqual(chave.length, 64);
  console.log("CriptografiaArquivo ok👍");

  console.log("Teste do RepositorioArquivos ...");
  const repositorio = new RepositorioArquivos(diretorioTeste, chave);
  repositorio.salvarEntidade("teste.enc", { id: "1", nome: "Primeiro" });
  assertEqual(repositorio.carregarEntidade("teste.enc", "1").nome, "Primeiro");
  repositorio.salvarEntidade("teste.enc", { id: "1", nome: "Atualizado" });
  assertEqual(repositorio.carregarEntidade("teste.enc", "1").nome, "Atualizado");
  repositorio.excluirEntidade("teste.enc", "1");
  assertEqual(repositorio.carregarEntidade("teste.enc", "1"), undefined);
  console.log("RepositorioArquivos ok👍");

  console.log("Teste do JournalTransacao ...");
  const journal = new JournalTransacao(
    "j1",
    "CRIAR",
    "teste.enc",
    null,
    { id: "2", nome: "Journal" },
    "cid",
    diretorioTeste,
    chave,
    repositorio
  );
  journal.registrar();
  assertEqual(journal.listarRegistros().length, 1);
  repositorio.salvarEntidade("teste.enc", { id: "2", nome: "Journal" });
  assertEqual(journal.reverter(), true);
  assertEqual(repositorio.carregarEntidade("teste.enc", "2"), undefined);
  console.log("JournalTransacao ok👍");

  console.log("Teste de adulteração de arquivo cifrado ...");
  repositorio.salvarEntidade("adulterado.enc", { id: "1", nome: "Integro" });
  const caminhoAdulterado = repositorio.obterCaminho("adulterado.enc");
  const conteudoIntegro = fs.readFileSync(caminhoAdulterado, "utf8");
  const partesCifradas = conteudoIntegro.split(":");
  const ultimoNible = partesCifradas[2].slice(-1);
  partesCifradas[2] = partesCifradas[2].slice(0, -1) + (ultimoNible === "0" ? "1" : "0");
  fs.writeFileSync(caminhoAdulterado, partesCifradas.join(":"), "utf8");
  let adulteracaoRejeitada = false;
  try {
    repositorio.listarEntidades("adulterado.enc");
  } catch {
    adulteracaoRejeitada = true;
  }
  assertEqual(adulteracaoRejeitada, true);
  fs.writeFileSync(caminhoAdulterado, conteudoIntegro, "utf8");
  console.log("Adulteração de .enc rejeitada ok👍");

  console.log("Teste de rotação do journal acima de 10 MB ...");
  const diretorioJournal = fs.mkdtempSync(path.join(os.tmpdir(), "greencode-journal-"));
  const repoJournal = new RepositorioArquivos(diretorioJournal, chave);
  const payloadGrande = "x".repeat(220_000);
  for (let indice = 0; indice < 60; indice++) {
    const transacaoGrande = new JournalTransacao(
      `rotacao-${indice}`,
      "CRIAR",
      "teste.enc",
      null,
      { id: `rotacao-${indice}`, payload: payloadGrande },
      "cid",
      diretorioJournal,
      chave,
      repoJournal
    );
    transacaoGrande.registrar();
  }
  const arquivosRotacionados = fs
    .readdirSync(diretorioJournal)
    .filter((arquivo) => /^journal\.transacoes\.\d/.test(arquivo));
  assertEqual(arquivosRotacionados.length > 0, true);
  assertEqual(fs.statSync(path.join(diretorioJournal, "journal.transacoes")).size < 10 * 1024 * 1024, true);
  fs.rmSync(diretorioJournal, { recursive: true, force: true });
  console.log("Rotação do journal ok👍");

  console.log("Teste do ServicoAutenticacao ...");
  const autenticacao = new ServicoAutenticacao(diretorioTeste);
  autenticacao.provisionarInicial("senha-admin", "admin");
  const sessao = autenticacao.login("admin", "senha-admin");
  const autorizacao = new ServicoAutorizacao(autenticacao);
  assertEqual(autenticacao.validarToken(sessao.obterToken()), true);
  assertEqual(
    autenticacao.criarUsuario(
      "auditor",
      "senha-auditor",
      PapelUsuario.AUDITOR,
      "admin"
    ).obterPapel(),
    PapelUsuario.AUDITOR
  );
  let papelInvalidoRejeitado = false;
  try {
    autenticacao.criarUsuario(
      "usuario-invalido",
      "senha",
      "PAPEL_INEXISTENTE" as PapelUsuario,
      "admin"
    );
  } catch {
    papelInvalidoRejeitado = true;
  }
  assertEqual(papelInvalidoRejeitado, true);
  assertEqual(
    autenticacao.alterarSenha("auditor", "senha-auditor", "nova-senha"),
    true
  );
  autenticacao.logout(sessao.obterToken());
  assertEqual(autenticacao.validarToken(sessao.obterToken()), false);
  console.log("ServicoAutenticacao ok👍");


  const diretorioDominio = fs.mkdtempSync(
    path.join(os.tmpdir(), "greencode-dominio-")
  );
  const chaveDominio = criptografia.gerarChave();
  const repoDominio = new RepositorioArquivos(diretorioDominio, chaveDominio);

  console.log("Teste dos serviços de negócio ...");
  const servicoOrganizacao = new ServicoOrganizacao(
    repoDominio,
    diretorioDominio,
    chaveDominio,
    autorizacao
  );
  servicoOrganizacao.cadastrarOrganizacao(
    {
      id: "org-1",
      razaoSocial: "Green Empresa",
      cnpj: "11222333000181",
      inscricaoEstadual: "123",
      enderecoCompleto: "Rua A, 100",
      telefone: "12999999999",
      email: "contato@green.com",
      contrato: {
        id: "ctr-1",
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        valorMensal: 1000,
      },
    },
    "admin"
  );
  assertEqual(servicoOrganizacao.listarOrganizacoesAtivas("admin").length, 1);
  assertEqual(servicoOrganizacao.buscarOrganizacao("org-1").contratoVigente?.id, "ctr-1");

  const servicoLote = new ServicoLote(
    repoDominio,
    diretorioDominio,
    chaveDominio,
    autorizacao
  );
  const lote = servicoLote.criarLote(
    {
      id: "lote-1",
      organizacaoId: "org-1",
      notaFiscal: "NF-123",
      transportadora: "TransRapida",
    },
    "admin"
  );

  const servicoEquipamentos = new ServicoEquipamentos(
    repoDominio,
    diretorioDominio,
    chaveDominio,
    autorizacao
  );
  const equipamento = new Equipamento(
    "equip-1",
    servicoEquipamentos.gerarCodigoBarras(TipoEquipamento.NOTEBOOK, 1, "admin"),
    TipoEquipamento.NOTEBOOK,
    "Dell",
    "Latitude",
    2024,
    EstadoFisico.NOVO,
    1.8
  );

  servicoLote.adicionarEquipamentoLote(lote.id, equipamento, "admin");
  servicoLote.processarTriagem(lote.id, "admin");
  assertEqual(
    servicoEquipamentos.obterEquipamento("equip-1").statusRastreamento,
    StatusRastreamento.AGUARDANDO_DESMONTE
  );

  servicoEquipamentos.atualizarEstadoFisico(
    "equip-1",
    EstadoFisico.USADO_LEVE,
    "A inspeção identificou dois níveis de uso.",
    "admin"
  );

  const rastreio = servicoEquipamentos.rastrearEquipamento("equip-1", "admin");
  assertEqual(rastreio.movimentacoes.length > 0, true);

  const servicoRelatorios = new ServicoRelatorios(
    servicoLote,
    servicoEquipamentos,
    autorizacao
  );
  const relatorio = servicoRelatorios.gerarRelatorioPorStatus(
    StatusRastreamento.AGUARDANDO_DESMONTE,
    "admin"
  );
  assertEqual(relatorio.includes("Quantidade de equipamentos: 1"), true);

  console.log("Servicos de negócio ok👍");
  console.log("\nTeste 3: tudo certinho");
} finally {
  fs.rmSync(diretorioTeste, { recursive: true, force: true });
}
