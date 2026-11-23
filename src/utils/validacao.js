import { AppError } from "./AppError.js";

export const TIPOS = ["receita", "despesa"];
export const STATUS = ["concluida", "pendente"];
export const CATEGORIAS = {
  receita: ["Salário", "Freelance", "Investimentos", "Outros"],
  despesa: ["Moradia", "Alimentação", "Transporte", "Contas", "Educação", "Saúde", "Lazer"],
};

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function dataValida(texto) {
  if (!DATA_REGEX.test(String(texto))) return false;
  const data = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

export function validarEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validarUsuario({ nome, email, senha }, { parcial = false } = {}) {
  if (!parcial || nome !== undefined) {
    if (!nome || !String(nome).trim()) throw new AppError("Informe o nome.");
  }
  if (!parcial || email !== undefined) {
    if (!validarEmail(email)) throw new AppError("Informe um e-mail válido.");
  }
  if (!parcial || senha !== undefined) {
    if (!senha || String(senha).length < 6) throw new AppError("A senha deve ter no mínimo 6 caracteres.");
  }
}

export function validarTransacao(body) {
  const { descricao, valor, tipo, categoria, data, status } = body;

  if (!descricao || !String(descricao).trim()) throw new AppError("Informe a descrição.");
  if (String(descricao).trim().length > 100) throw new AppError("A descrição deve ter no máximo 100 caracteres.");

  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) throw new AppError("O valor deve ser maior que zero.");

  if (!TIPOS.includes(tipo)) throw new AppError("O tipo deve ser receita ou despesa.");
  if (!CATEGORIAS[tipo].includes(categoria)) throw new AppError(`Categoria inválida para ${tipo}.`);
  if (!dataValida(data)) throw new AppError("Informe a data no formato AAAA-MM-DD.");

  const situacao = status ?? "concluida";
  if (!STATUS.includes(situacao)) throw new AppError("O status deve ser concluida ou pendente.");

  return {
    descricao: String(descricao).trim(),
    valor: Math.round(numero * 100) / 100,
    tipo,
    categoria,
    data: new Date(`${data}T00:00:00Z`),
    status: situacao,
  };
}
