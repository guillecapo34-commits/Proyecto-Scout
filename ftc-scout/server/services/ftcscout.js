import fetch from 'node-fetch';

const BASE_GQL = 'https://api.ftcscout.org/graphql';
const BASE_REST = 'https://api.ftcscout.org/rest/v1';

async function gql(query, retries = 2) {
  try {
    const res = await fetch(BASE_GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) throw new Error(`FTCScout GQL HTTP error: ${res.status}`);

    const json = await res.json();

    if (json.errors) {
      console.error('[GQL errors]', JSON.stringify(json.errors));
      throw new Error(`FTCScout GQL error: ${json.errors[0].message}`);
    }

    return json.data;
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return gql(query, retries - 1);
    }
    throw e;
  }
}

export async function fetchTeamInfo(number) {
  const data = await gql(`{
    teamByNumber(number: ${number}) {
      number
      name
      schoolName
      rookieYear
      location { city state country }
    }
  }`, 1);

  return data?.teamByNumber ?? null;
}

export async function fetchTeamStats(number, season = 2025) {
  const res = await fetch(`${BASE_REST}/teams/${number}/quick-stats?season=${season}`, {
    signal: AbortSignal.timeout(15000)
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`FTCScout REST error: ${res.status}`);

  return res.json();
}

export async function fetchTeamMatches(number, season = 2025) {
  const data = await gql(`{
    teamByNumber(number: ${number}) {
      matches(season: ${season}) {
        alliance
        station
        match {
          id
          matchNum
          tournamentLevel
          teams {
            teamNumber
            alliance
          }
          scores {
            ... on MatchScores2025 {
              red { totalPoints autoPoints dcPoints }
              blue { totalPoints autoPoints dcPoints }
            }
          }
        }
      }
    }
  }`);

  return data?.teamByNumber?.matches ?? [];
}

export async function searchTeams(searchText = '', limit = 50) {
  const data = await gql(`{
    teamsSearch(searchText: "${searchText}", limit: ${limit}) {
      number
      name
      location { city state country }
    }
  }`);

  return data?.teamsSearch ?? [];
}

let featuredCache = null;
let featuredCacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export async function fetchFeaturedMatch() {
  const eventCodes = [
    'ARCMP', 'AUWOQ', 'BRBHQ', 'AUSYQ1', 'AUSYQ2',
    'AUBRQ1', 'AUBRQ2', 'AUCMP', 'BRCMP', 'BRCAQ', 'AUADQ'
  ];

  // mezclar aleatoriamente
  const shuffled = eventCodes.sort(() => Math.random() - 0.5);

  for (const code of shuffled) {
    console.log('[featured-match] trying event:', code);
    try {
      const res = await fetch(BASE_GQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `{
          eventByCode(season: 2025, code: "${code}") {
            name
            matches {
              id matchNum tournamentLevel
              scores {
                ... on MatchScores2025 {
                  red { totalPoints autoPoints dcPoints }
                  blue { totalPoints autoPoints dcPoints }
                }
              }
              teams { teamNumber alliance station }
            }
          }
        }` }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) continue;
      const json = await res.json();
      const event = json.data?.eventByCode;
      if (!event) continue;

      const matches = event.matches.filter(m => m.scores?.red && m.scores?.blue);
      if (!matches.length) continue;

      const match = matches[Math.floor(Math.random() * matches.length)];
      console.log('[featured-match] cached:', event.name);
      return { eventName: event.name, match };
    } catch (e) {
      continue;
    }
  }

  return null;
}