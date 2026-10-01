export const getRank = (elo: number) => {
  if (elo < 1100) return { name: 'Bürünc', color: 'text-amber-600', icon: '🥉' };
  if (elo < 1400) return { name: 'Gümüş', color: 'text-slate-400', icon: '🥈' };
  if (elo < 1800) return { name: 'Qızıl', color: 'text-yellow-400', icon: '🥇' };
  if (elo < 2200) return { name: 'Almaz', color: 'text-cyan-400', icon: '💎' };
  return { name: 'Qrossmeyster', color: 'text-fuchsia-500', icon: '👑' };
};
