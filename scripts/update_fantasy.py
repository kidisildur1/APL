"""Fetch public Sports.ru Fantasy data for the static GitHub Pages site."""
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
IDS = {'denis': '598822', 'dima': '611237', 'ilya': '611230'}
ENDPOINT = 'https://www.sports.ru/gql/graphql/'


def query(document):
    request = Request(ENDPOINT + '?' + urlencode({'query': document}), headers={'Accept': 'application/json'})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=25) as response:
                payload = json.load(response)
            if payload.get('errors'):
                raise RuntimeError('; '.join(e['message'] for e in payload['errors']))
            if not payload.get('data', {}).get('fantasyQueries'):
                raise RuntimeError('Missing Fantasy response')
            payload.pop('extensions', None)
            return payload
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def main():
    fields = '''id name score averageScore season { id tournament { webName } }
        seasonScoreInfo(leagueID:"44945") { place score scoreForLastTour }
        currentTourInfo { tour { name } scoreInfo { score } }'''
    aliases = ' '.join(f'{user}: squads(input:{{squadID:"{sid}"}}){{{fields}}}' for user, sid in IDS.items())
    payload = query('{fantasyQueries{tournament(id:"england",source:HRU){currentSeason{id currentTour{id} tours{id name status}}} ' + aliases + '}}')
    data = payload['data']['fantasyQueries']
    season = data['tournament']['currentSeason']
    for user, sid in IDS.items():
        teams = data[user]
        if len(teams) != 1 or teams[0]['id'] != sid or teams[0]['season']['id'] != season['id'] or teams[0]['season']['tournament']['webName'] != 'england' or teams[0]['seasonScoreInfo'] is None:
            raise RuntimeError(f'Wrong or unavailable league team: {user}')
    stamp = datetime.now(timezone.utc).isoformat()
    pending = {'fantasy.json': payload}
    fields = '''tour { id name status } players { isCaptain isViceCaptain isStarting substitutePriority
        tourScore { score } seasonPlayer { id name role team { name } } }'''
    for tour in season['tours']:
        if tour['status'] == 'NOT_STARTED':
            continue
        aliases = ' '.join(f'{user}: squadTourInfo(input:{{squadID:"{sid}",tourID:"{tour["id"]}"}}){{{fields}}}' for user, sid in IDS.items())
        tour_data = query('{fantasyQueries{' + aliases + '}}')['data']['fantasyQueries']
        for user, sid in IDS.items():
            pending[f'squads/{sid}-{tour["id"]}.json'] = {'data': {'fantasyQueries': {'squadTourInfo': tour_data[user]}}}
    # Only update the snapshot after every request succeeds.
    for name, document in pending.items():
        document['updatedAt'] = stamp
        path = ROOT / 'data' / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(document, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Updated {len(pending)} files from Sports.ru')


if __name__ == '__main__':
    main()
