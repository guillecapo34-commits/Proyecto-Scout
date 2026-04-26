import { getTeam, getTeamStats, getTeamMatches } from './api.js';
import { renderRadar } from './radar.js';
import { renderMatchList, hideEmptyState } from './ui.js';
const input    = document.getElementById('tinput');
const err      = document.getElementById('err');
const card     = document.getElementById('card');
const statsGrid = document.getElementById('stats-grid');
const radarWrap = document.getElementById('radar-wrap');

async function searchTeam() {
    const num = input.value.trim();
    err.textContent = '';
    card.style.display = 'none';
    statsGrid.style.display = 'none';
    radarWrap.style.display = 'none';
    document.getElementById('matches-wrap').style.display = 'none';
    if (!num || isNaN(num)) {
        err.textContent = 'Please enter a valid team number.';
        return;
    }

    err.innerHTML = '<span class="spin"></span>Searching...';

    try {
        const t = await getTeam(num);

        err.textContent = '';
        document.getElementById('c-name').textContent    = `#${t.number} — ${t.name || `Team ${num}`}`;
        document.getElementById('c-sub').textContent     = [t.location?.city, t.location?.state, t.location?.country].filter(Boolean).join(', ') || 'Location unknown';
        document.getElementById('c-full').textContent    = t.schoolName || '—';
        document.getElementById('c-country').textContent = t.location?.country ?? '—';
        document.getElementById('c-state').textContent   = t.location?.state ?? '—';
        document.getElementById('c-city').textContent    = t.location?.city ?? '—';
        document.getElementById('c-rookie').textContent  = t.rookieYear ?? '—';
        card.style.display = 'block';

        const s = await getTeamStats(num);
        if (s) {
            document.getElementById('s-opr').textContent  = s.tot?.value  != null ? s.tot.value.toFixed(1)  : '—';
            document.getElementById('s-auto').textContent = s.auto?.value != null ? s.auto.value.toFixed(1) : '—';
            document.getElementById('s-dc').textContent   = s.dc?.value   != null ? s.dc.value.toFixed(1)   : '—';
            document.getElementById('s-eg').textContent   = s.eg?.value   != null ? s.eg.value.toFixed(1)   : '—';
            statsGrid.style.display = 'grid';

            radarWrap.style.display = 'block';
            renderRadar(t.name || `Team ${num}`, s);
        }
        const matches = await getTeamMatches(num);
        renderMatchList(matches);

    } catch(e) {
        console.error(e);
        err.textContent = 'Team not found. Check the number and try again.';
    }
}

document.querySelector('button').addEventListener('click', searchTeam);
input.addEventListener('keydown', e => { if (e.key === 'Enter') searchTeam(); });
const params = new URLSearchParams(window.location.search);
const teamParam = params.get('team');
if (teamParam) {
  document.getElementById('tinput').value = teamParam;
  searchTeam();
}
async function loadFeaturedMatch() {
  try {
    const res = await fetch('/api/teams/featured-match');
    if (!res.ok) return;
    const { eventName, match } = await res.json();

    const red  = match.teams.filter(t => t.alliance === 'Red');
    const blue = match.teams.filter(t => t.alliance === 'Blue');

    document.getElementById('feat-event').textContent      = `${eventName} — ${match.tournamentLevel} #${match.matchNum}`;
    document.getElementById('feat-red-score').textContent  = match.scores.red.totalPoints;
    document.getElementById('feat-blue-score').textContent = match.scores.blue.totalPoints;
    document.getElementById('feat-red-teams').textContent  = red.map(t => `#${t.teamNumber}`).join(' · ');
    document.getElementById('feat-blue-teams').textContent = blue.map(t => `#${t.teamNumber}`).join(' · ');
    document.getElementById('feat-red-stats').innerHTML    = `Auto <b>${match.scores.red.autoPoints}</b> · Teleop <b>${match.scores.red.dcPoints}</b>`;
    document.getElementById('feat-blue-stats').innerHTML   = `Auto <b>${match.scores.blue.autoPoints}</b> · Teleop <b>${match.scores.blue.dcPoints}</b>`;

    document.getElementById('featured-match').style.display = 'block';

    // Cargar stats de los 4 equipos
    const allTeams = [...red, ...blue];
    const statsResults = await Promise.all(
      allTeams.map(t => fetch(`/api/teams/${t.teamNumber}/stats`).then(r => r.ok ? r.json() : null))
    );

    const redStats  = statsResults.slice(0, 2);
    const blueStats = statsResults.slice(2, 4);

    renderFeaturedRadar('feat-radar-red',  red,  redStats,  '#e74c3c');
    renderFeaturedRadar('feat-radar-blue', blue, blueStats, '#2471a3');

    const redWon = match.scores.red.totalPoints > match.scores.blue.totalPoints;
    document.querySelector('.featured-alliance.red-bg').classList.toggle('featured-winner', redWon);
    document.querySelector('.featured-alliance.blue-bg').classList.toggle('featured-winner', !redWon);

  } catch(e) {
    console.error(e);
  }
}

function renderFeaturedRadar(canvasId, teams, statsArr, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const TOTAL = 8000;
  const MAX = { opr: 450, auto: 75, dc: 200, eg: 30 };
  const norm = (v, max) => v != null ? Math.min(Math.round((v / max) * 100), 100) : 0;
  const rank = (r) => r != null ? Math.round((1 - r / TOTAL) * 100) : 0;

  const colors = [color, color === '#e74c3c' ? '#c0392b' : '#1a5276'];

  const datasets = teams.map((t, i) => {
    const s = statsArr[i];
    const c = colors[i];
    return {
      label: `#${t.teamNumber}`,
      data: s ? [
        norm(s.tot?.value,  MAX.opr),
        norm(s.auto?.value, MAX.auto),
        norm(s.dc?.value,   MAX.dc),
        norm(s.eg?.value,   MAX.eg),
        rank(s.auto?.rank),
        rank(s.dc?.rank),
      ] : [0, 0, 0, 0, 0, 0],
      borderColor: c,
      backgroundColor: `${c}22`,
      pointBackgroundColor: c,
      borderWidth: 1.5,
      pointRadius: 3,
    };
  });

  new Chart(canvas, {
    type: 'radar',
    data: {
      labels: ['OPR', 'Auto', 'Teleop', 'EG', 'Auto Rank', 'DC Rank'],
      datasets,
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true, labels: { font: { size: 11 } } } },
      scales: {
        r: {
          beginAtZero: true, max: 100,
          ticks: { display: false },
          grid: { color: 'rgba(0,0,0,0.06)' },
          angleLines: { color: 'rgba(0,0,0,0.06)' },
          pointLabels: { font: { size: 10 } }
        }
      }
    }
  });
}

loadFeaturedMatch();