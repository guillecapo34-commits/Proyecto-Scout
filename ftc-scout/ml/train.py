import json
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error

with open('matches_raw.json') as f:
    raw = json.load(f)

matches    = raw['matches']
team_stats = raw['team_stats']

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

X_clf, y_clf = [], []
X_reg, y_reg = [], []

skipped = 0
for m in matches:
    red  = m['red_teams']
    blue = m['blue_teams']

    if len(red) < 2 or len(blue) < 2:
        skipped += 1
        continue

    red_feat  = alliance_features(red)
    blue_feat = alliance_features(blue)
    features  = red_feat + blue_feat

    red_score  = m['red_score']
    blue_score = m['blue_score']

    if red_score == 0 and blue_score == 0:
        skipped += 1
        continue

    red_won = 1 if red_score > blue_score else 0

    X_clf.append(features)
    y_clf.append(red_won)

    X_reg.append(features)
    y_reg.append([red_score, blue_score])

print(f'Samples: {len(X_clf)} (skipped {skipped})')

X_clf = np.array(X_clf)
y_clf = np.array(y_clf)
X_reg = np.array(X_reg)
y_reg = np.array(y_reg)

X_train, X_test, yc_train, yc_test = train_test_split(X_clf, y_clf, test_size=0.2, random_state=42)
_, _, yr_train, yr_test             = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)

print('Training classifier...')
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, yc_train)
acc = accuracy_score(yc_test, clf.predict(X_test))
print(f'Classifier accuracy: {acc:.2%}')

print('Training regressor...')
reg = RandomForestRegressor(n_estimators=100, random_state=42)
reg.fit(X_train, yr_train)
mae = mean_absolute_error(yr_test, reg.predict(X_test))
print(f'Regressor MAE: {mae:.1f} pts')

with open('model_classifier.pkl', 'wb') as f:
    pickle.dump(clf, f)
with open('model_regressor.pkl', 'wb') as f:
    pickle.dump(reg, f)

print('Models saved.')