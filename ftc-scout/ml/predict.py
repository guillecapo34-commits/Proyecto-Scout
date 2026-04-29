import pickle
import numpy as np
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

with open('model_classifier.pkl', 'rb') as f:
    clf = pickle.load(f)
with open('model_regressor.pkl', 'rb') as f:
    reg = pickle.load(f)

def team_to_features(t):
    s = t.get('stats') or {}
    return [
        s.get('tot',  {}).get('value') or 0,
        s.get('auto', {}).get('value') or 0,
        s.get('dc',   {}).get('value') or 0,
        s.get('eg',   {}).get('value') or 0,
    ]

def alliance_features(teams):
    f1 = team_to_features(teams[0])
    f2 = team_to_features(teams[1])
    return [f1[i] + f2[i] for i in range(4)]

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    red  = data.get('red',  [])
    blue = data.get('blue', [])

    if len(red) < 2 or len(blue) < 2:
        return jsonify({'error': 'Need 2 teams per alliance'}), 400

    red_feat  = alliance_features(red)
    blue_feat = alliance_features(blue)
    print('red_feat:', red_feat)
    print('blue_feat:', blue_feat)
    features  = np.array([red_feat + blue_feat])

    red_win_prob = float(clf.predict_proba(features)[0][1])
    blue_win_prob = 1 - red_win_prob

    scores = reg.predict(features)[0]
    red_score  = round(float(scores[0]))
    blue_score = round(float(scores[1]))

    red_opr  = sum(t.get('stats', {}).get('tot', {}).get('value') or 0 for t in red)
    blue_opr = sum(t.get('stats', {}).get('tot', {}).get('value') or 0 for t in blue)

    strategies = []
    if red_feat[1] > blue_feat[1]:
        strategies.append('Red has stronger Auto — focus on maximizing autonomous points early.')
    else:
        strategies.append('Blue has stronger Auto — counter by improving your autonomous consistency.')

    if red_feat[2] > blue_feat[2]:
        strategies.append('Red dominates Teleop — Blue should focus on defense and disruption.')
    else:
        strategies.append('Blue dominates Teleop — Red should play fast and aggressive in driver control.')

    if abs(red_opr - blue_opr) < 20:
        strategies.append('Alliances are closely matched — endgame execution will likely decide the winner.')
    elif red_opr > blue_opr:
        strategies.append('Red has a significant OPR advantage — maintain consistency and avoid penalties.')
    else:
        strategies.append('Blue has a significant OPR advantage — Red needs to force errors and capitalize on penalties.')

    return jsonify({
        'redWinProb':  round(red_win_prob  * 100, 1),
        'blueWinProb': round(blue_win_prob * 100, 1),
        'redScore':    red_score,
        'blueScore':   blue_score,
        'strategies':  strategies
    })

@app.route('/health')
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0',port=port, debug=False)
