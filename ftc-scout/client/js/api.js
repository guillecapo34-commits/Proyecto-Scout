const SEASON = 2025;

export async function getTeam(number) {
    const res = await fetch(`/api/teams/${parseInt(number, 10)}`);
    if (!res.ok) throw new Error('Team not found');
    return res.json();
}
export async function getTeamAllianceData(number) {
  const res = await fetch(`/api/teams/${number}/alliance-stats?season=${SEASON}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getTeamStats(number) {
    const res = await fetch(`/api/teams/${number}/stats?season=${SEASON}`);
    if (!res.ok) return null;
    return res.json();
}
/**
 * Fetch all matches for a team.
 * @param {number|string} number
 * @param {number} season
 * @returns {Promise<Array>}
 */
export async function getTeamMatches(number) {
  const res = await fetch(`/api/teams/${number}/matches?season=${SEASON}`);
  if (!res.ok) return [];
  return res.json();
}
export async function predict(red, blue) {
  const res = await fetch('/api/teams/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ red, blue })
  });
  if (!res.ok) return null;
  return res.json();
}