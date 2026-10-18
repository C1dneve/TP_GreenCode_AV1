import { JournalTransacao } from "./JournalTransacao";
import { RepositorioArquivos } from "./RepositorioArquivos";

/** Único ponto de criação/registro de transações de auditoria para serviços de negócio. */
export function registrarJournal(
  dados: { operacao: string; entidade: string; antes: unknown; depois: unknown; usuario: string },
  contexto: { diretorioBase: string; chave: string; repositorio?: RepositorioArquivos }
): void {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  new JournalTransacao(
    id,
    dados.operacao,
    dados.entidade,
    dados.antes,
    dados.depois,
    dados.usuario,
    contexto.diretorioBase,
    contexto.chave,
    contexto.repositorio
  ).registrar();
}
