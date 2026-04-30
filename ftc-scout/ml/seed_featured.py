import requests
import json
import psycopg2
import os
import random

GQL = 'https://api.ftcscout.org/graphql'
DATABASE_URL = 'postgresql://postgres:rLGFTpvYzLyZGOcHarOdRgWMezAwarvb@switchyard.proxy.rlwy.net:16687/railway'  # copiala de Railway Variables

EVENT_CODES = ['ARCMP', 'AUWOQ', 'BRBHQ', 'AUSYQ1', 'AUSYQ2', 'AUBRQ1', 'AUBRQ2', 'AUCMP', 'BRCMP']

def fetch_featured():
    random.shuffle(EVENT_CODES)
    for code in EVENT_CODES:
        try:
            res = requests.post(GQL, json={'query': f'''{{
                eventByCode(season: 2025, code: "{code}") {{
                    name
                    matches {{
                        id matchNum tournamentLevel
                        scores {{
                            ... on MatchScores2025 {{
                                red {{ totalPoints autoPoints dcPoints }}
                                blue {{ totalPoints autoPoints dcPoints }}
                            }}
                        }}
                        teams {{ teamNumber alliance station }}
                    }}
                }}
            }}'''}, timeout=30)
            data = res.json()
            event = data['data']['eventByCode']
            if not event: continue
            matches = [m for m in event['matches'] if m.get('scores', {}).get('red') and m.get('scores', {}).get('blue')]
            if not matches: continue
            match = random.choice(matches)
            print(f'Found: {event["name"]}')
            return {'eventName': event['name'], 'match': match}
        except Exception as e:
            print(f'{code} failed: {e}')
            continue
    return None

def seed():
    featured = fetch_featured()
    if not featured:
        print('No featured match found')
        return

    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS featured_match (
            id SERIAL PRIMARY KEY,
            data JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ''')
    cur.execute('DELETE FROM featured_match')
    cur.execute('INSERT INTO featured_match (data) VALUES (%s)', [json.dumps(featured)])
    conn.commit()
    cur.close()
    conn.close()
    print('Seeded successfully')

if __name__ == '__main__':
    seed()