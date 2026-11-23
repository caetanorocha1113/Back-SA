export const arredondar = (valor) => Math.round(Number(valor) * 100) / 100;

export const dataTexto = (data) => data.toISOString().slice(0, 10);

export function inicioDoMes(mesesAtras) {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1));
}

export function formatarTransacao(t) {
  return {
    id: t.id,
    data: dataTexto(t.data),
    descricao: t.descricao,
    categoria: t.categoria,
    tipo: t.tipo,
    valor: Number(t.valor),
    status: t.status,
  };
}

export function formatarUsuario(u) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
  };
}

export function somaPorTipo(grupos) {
  const total = (tipo) => arredondar(grupos.find((g) => g.tipo === tipo)?._sum.valor ?? 0);
  return { receitas: total("receita"), despesas: total("despesa") };
}
