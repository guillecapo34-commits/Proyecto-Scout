import requests
import json
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

GQL = 'https://api.ftcscout.org/graphql'
SEASON = 2025
OUTPUT = 'matches_raw.json'

session = requests.Session()
retry = Retry(total=3, backoff_factor=1)
adapter = HTTPAdapter(max_retries=retry)
session.mount('https://', adapter)

def gql(query):
    res = session.post(GQL, json={'query': query}, timeout=30)
    if not res.ok:
        print(f'  Response body: {res.text[:500]}')
    res.raise_for_status()
    data = res.json()
    if 'errors' in data:
        raise Exception(data['errors'][0]['message'])
    return data['data']

def fetch_events():
    data = gql(f'''{{
        eventsSearch(season: {SEASON}) {{
            code
            name
        }}
    }}''')
    return data['eventsSearch']

def fetch_event_matches(event_code):
    data = gql(f'''{{
        eventByCode(code: "{event_code}", season: {SEASON}) {{
            matches {{
                id
                matchNum
                teams {{
                    teamNumber
                    alliance
                }}
                scores {{
                    ... on MatchScores2025 {{
                        red {{ totalPoints autoPoints dcPoints totalPointsNp }}
                        blue {{ totalPoints autoPoints dcPoints totalPointsNp }}
                    }}
                }}
            }}
        }}
    }}''')
    return data.get('eventByCode', {}).get('matches', [])

def fetch_team_stats(team_number):
    data = gql(f'''{{
        teamByNumber(number: {team_number}) {{
            quickStats(season: {SEASON}) {{
                tot  {{ value rank }}
                auto {{ value rank }}
                dc   {{ value rank }}
                eg   {{ value rank }}
            }}
        }}
    }}''')
    return data.get('teamByNumber', {}).get('quickStats', None)

def main():
    print('Fetching events...')
    events = fetch_events()
    print(f'Found {len(events)} events')

    all_matches = []

    for i, event in enumerate(events[:30]):
        print(f'[{i+1}/30] {event["name"]}')
        try:
            matches = fetch_event_matches(event['code'])
            for m in matches:
                scores = m.get('scores')
                if not scores:
                    continue
                teams = m.get('teams', [])
                red_teams  = [t['teamNumber'] for t in teams if t['alliance'] == 'Red']
                blue_teams = [t['teamNumber'] for t in teams if t['alliance'] == 'Blue']
                if len(red_teams) < 2 or len(blue_teams) < 2:
                    continue
                all_matches.append({
                    'match_id':      m['id'],
                    'red_teams':     red_teams,
                    'blue_teams':    blue_teams,
                    'red_score':     scores['red']['totalPoints'],
                    'blue_score':    scores['blue']['totalPoints'],
                    'red_auto':      scores['red']['autoPoints'],
                    'blue_auto':     scores['blue']['autoPoints'],
                    'red_dc':        scores['red']['dcPoints'],
                    'blue_dc':       scores['blue']['dcPoints'],
                    'red_score_np':  scores['red']['totalPointsNp'],
                    'blue_score_np': scores['blue']['totalPointsNp'],
                })
            time.sleep(0.3)
        except Exception as e:
            import traceback
            print(f'  Error: {e}')
            traceback.print_exc()
            continue

    print(f'\nCollected {len(all_matches)} matches')
    print('Fetching team stats...')

    team_numbers = set()
    for m in all_matches:
        team_numbers.update(m['red_teams'])
        team_numbers.update(m['blue_teams'])

    print(f'Unique teams: {len(team_numbers)}')

    team_stats = {}
    for j, num in enumerate(team_numbers):
        try:
            stats = fetch_team_stats(num)
            if stats:
                team_stats[str(num)] = stats
            if j % 50 == 0:
                print(f'  {j}/{len(team_numbers)} teams...')
            time.sleep(0.1)
        except Exception as e:
            print(f'  Error team {num}: {e}')

    output = { 'matches': all_matches, 'team_stats': team_stats }
    with open(OUTPUT, 'w') as f:
        json.dump(output, f, indent=2)

    print(f'\nDone. Saved {len(all_matches)} matches and {len(team_stats)} teams to {OUTPUT}')

if __name__ == '__main__':
    main()