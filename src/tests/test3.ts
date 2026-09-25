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

  console.log("Teste do ServicoAutenticacao ...");
  const autenticacao = new ServicoAutenticacao(diretorioTeste);
  autenticacao.provisionarInicial("senha-admin", "admin");
  const sessao = autenticacao.login("admin", "senha-admin");
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
    chaveDominio
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
  assertEqual(servicoOrganizacao.listarOrganizacoesAtivas().length, 1);

  const servicoLote = new ServicoLote(
    repoDominio,
    diretorioDominio,
    chaveDominio
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
    chaveDominio
  );
  const equipamento = new Equipamento(
    "equip-1",
    servicoEquipamentos.gerarCodigoBarras(TipoEquipamento.NOTEBOOK, 1),
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

  const rastreio = servicoEquipamentos.rastrearEquipamento("equip-1");
  assertEqual(rastreio.movimentacoes.length > 0, true);

  const servicoRelatorios = new ServicoRelatorios(
    servicoLote,
    servicoEquipamentos
  );
  const relatorio = servicoRelatorios.gerarRelatorioPorStatus(
    StatusRastreamento.AGUARDANDO_DESMONTE
  );
  assertEqual(relatorio.includes("Quantidade de equipamentos: 1"), true);

  console.log("Servicos de negócio ok👍");
  console.log("\nTeste 3: tudo certinho");
} finally {
  fs.rmSync(diretorioTeste, { recursive: true, force: true });
}
