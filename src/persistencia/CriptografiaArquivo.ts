import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export class CriptografiaArquivo {
  private static readonly TAMANHO_CHAVE = 32;
  private static readonly TAMANHO_IV = 12;

  gerarChave(): string {
    return randomBytes(CriptografiaArquivo.TAMANHO_CHAVE).toString("hex");
  }

  cifrar(dados: string, chave: string): string {
    const chaveBuffer = this.converterChave(chave);
    const iv = randomBytes(CriptografiaArquivo.TAMANHO_IV);
    const cifra = createCipheriv("aes-256-gcm", chaveBuffer, iv);

    const conteudoCifrado = Buffer.concat([
      cifra.update(Buffer.from(dados, "utf8")),
      cifra.final(),
    ]);
    const tag = cifra.getAuthTag();

    return [
      iv.toString("hex"),
      tag.toString("hex"),
      conteudoCifrado.toString("hex"),
    ].join(":");
  }

  decifrar(dadosCifrados: string, chave: string): string {
    const partes = dadosCifrados.split(":");
    if (partes.length !== 3) {
      throw new Error("Conteúdo criptografado inválido.");
    }

    const [ivHex, tagHex, conteudoHex] = partes;
    const chaveBuffer = this.converterChave(chave);
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const conteudo = Buffer.from(conteudoHex, "hex");

    const decifra = createDecipheriv("aes-256-gcm", chaveBuffer, iv);
    decifra.setAuthTag(tag);

    try {
      const dadosDecifrados = Buffer.concat([
        decifra.update(conteudo),
        decifra.final(),
      ]);
      return dadosDecifrados.toString("utf8");
    } catch {
      throw new Error("Não foi possível decifrar o arquivo ou validar sua integridade.");
    }
  }

  private converterChave(chave: string): any {
    const chaveBuffer = /^[0-9a-fA-F]+$/.test(chave)
      ? Buffer.from(chave, "hex")
      : Buffer.from(chave, "base64");

    if (chaveBuffer.length !== CriptografiaArquivo.TAMANHO_CHAVE) {
      throw new Error("A chave de criptografia deve conter exatamente 256 bits.");
    }

    return chaveBuffer;
  }
}
