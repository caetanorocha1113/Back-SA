import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.ts";

const MESES = 24;

const DESCRICOES = {
  Alimentação: ["Supermercado", "Padaria", "Restaurante", "iFood", "Feira"],
  Transporte: ["Combustível", "Uber", "Estacionamento", "Manutenção do carro", "Passagem de ônibus"],
  Saúde: ["Farmácia", "Consulta médica", "Exames laboratoriais", "Plano odontológico"],
  Lazer: ["Cinema", "Streaming", "Viagem de fim de semana", "Show", "Livraria"],
  Contas: ["Conta de luz", "Conta de água", "Internet", "Celular"],
};

function aleatorio(semente) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gerarTransacoes(usuarioId) {
  const random = aleatorio(20251);
  const sortear = (lista) => lista[Math.floor(random() * lista.length)];
  const valor = (min, max) => Math.round((min + random() * (max - min)) * 100) / 100;
  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const lista = [];

  const adicionar = (data, tipo, categoria, descricao, quantia) => {
    if (data.getTime() > hojeUtc) return;
    const diasAtras = (hojeUtc - data.getTime()) / 86400000;
    lista.push({
      usuarioId,
      data,
      descricao,
      categoria,
      tipo,
      valor: quantia,
      status: diasAtras <= 20 && random() < 0.18 ? "pendente" : "concluida",
    });
  };

  for (let atras = MESES - 1; atras >= 0; atras -= 1) {
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() - atras;
    const dia = (d) => new Date(Date.UTC(ano, mes, d));
    const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    const diaQualquer = () => dia(1 + Math.floor(random() * diasNoMes));
    const mesDoAno = dia(1).getUTCMonth();

    adicionar(dia(5), "receita", "Salário", "Salário mensal", 7800);
    if (random() < 0.65) adicionar(diaQualquer(), "receita", "Freelance", "Projeto freelance", valor(700, 2600));
    adicionar(dia(15), "receita", "Investimentos", "Rendimento CDB", valor(120, 420));
    if (random() < 0.25) adicionar(diaQualquer(), "receita", "Outros", "Reembolso", valor(50, 350));
    if (mesDoAno === 11) adicionar(dia(20), "receita", "Salário", "13º salário", 7800);

    adicionar(dia(10), "despesa", "Moradia", "Aluguel", 1950);
    adicionar(dia(10), "despesa", "Moradia", "Condomínio", 480);
    adicionar(dia(8), "despesa", "Educação", "Curso de inglês", 420);
    DESCRICOES.Contas.forEach((d) => adicionar(diaQualquer(), "despesa", "Contas", d, valor(60, 260)));

    const qtdAlimentacao = 8 + Math.floor(random() * 6);
    for (let i = 0; i < qtdAlimentacao; i += 1) adicionar(diaQualquer(), "despesa", "Alimentação", sortear(DESCRICOES.Alimentação), valor(25, 420));
    const qtdTransporte = 4 + Math.floor(random() * 4);
    for (let i = 0; i < qtdTransporte; i += 1) adicionar(diaQualquer(), "despesa", "Transporte", sortear(DESCRICOES.Transporte), valor(18, 280));
    const qtdLazer = 2 + Math.floor(random() * 4);
    for (let i = 0; i < qtdLazer; i += 1) adicionar(diaQualquer(), "despesa", "Lazer", sortear(DESCRICOES.Lazer), valor(30, 650));
    if (random() < 0.6) adicionar(diaQualquer(), "despesa", "Saúde", sortear(DESCRICOES.Saúde), valor(40, 520));
  }

  return lista.sort((a, b) => a.data - b.data);
}

async function criarUsuario({ nome, email, senha, perfil }) {
  const hash = await bcrypt.hash(senha, 10);
  return prisma.usuario.upsert({
    where: { email },
    update: { nome, senha: hash, perfil },
    create: { nome, email, senha: hash, perfil },
  });
}

const admin = await criarUsuario({ nome: "Administrador", email: "admin@email.com", senha: "admin123", perfil: "admin" });
const nicole = await criarUsuario({ nome: "Nicole da Silva", email: "nicole@email.com", senha: "123467", perfil: "usuario" });

await prisma.transacao.deleteMany({ where: { usuarioId: nicole.id } });
const { count } = await prisma.transacao.createMany({ data: gerarTransacoes(nicole.id) });

console.log(`Usuários: ${admin.email} (admin) e ${nicole.email}`);
console.log(`${count} transações criadas para ${nicole.nome}`);

await prisma.$disconnect();
