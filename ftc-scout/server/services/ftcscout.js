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
  }`);

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

export async function fetchFeaturedMatch() {
  const eventCodes = ['ARCMP', 'AUADQ', 'AUBRQ1', 'AUBRQ2', 'AUCMP', 'AUSYQ1', 'AUSYQ2', 'AUWOQ', 'BRCMP', 'BRBHQ', 'BRCAQ'];

  for (let i = 0; i < eventCodes.length; i++) {
    const code = eventCodes[Math.floor(Math.random() * eventCodes.length)];
    console.log('[featured-match] trying event:', code);

    try {
      const data = await gql(`{
        eventByCode(season: 2025, code: "${code}") {
          name
          matches {
            id
            matchNum
            tournamentLevel
            scores {
              ... on MatchScores2025 {
                red { totalPoints autoPoints dcPoints }
                blue { totalPoints autoPoints dcPoints }
              }
            }
            teams {
              teamNumber
              alliance
              station
            }
          }
        }
      }`);

      const event = data?.eventByCode;
      console.log('[featured-match] event:', event?.name, 'matches:', event?.matches?.length);

      if (!event) continue;

      const matches = event.matches.filter(m => m.scores?.red && m.scores?.blue);
      console.log('[featured-match] valid matches:', matches.length);
      if (!matches.length) continue;

      const match = matches[Math.floor(Math.random() * matches.length)];
      return { eventName: event.name, match };
    } catch (e) {
      console.log('[featured-match]', e.message);
      continue;
    }
  }

  return null;
}