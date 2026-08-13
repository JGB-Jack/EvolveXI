export type SessionPlayerRow = {
  players: { first_name: string; last_name: string }[] | null;
};

export function playerNamesSummary(sessionPlayers: SessionPlayerRow[], max = 3): string {
  const names = sessionPlayers
    .flatMap((sp) => sp.players ?? [])
    .map((p) => p.first_name);
  if (names.length === 0) return "No players";
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}

export function playerNamesFull(sessionPlayers: SessionPlayerRow[]): string {
  return sessionPlayers
    .flatMap((sp) => sp.players ?? [])
    .map((p) => `${p.first_name} ${p.last_name}`)
    .join(", ");
}
