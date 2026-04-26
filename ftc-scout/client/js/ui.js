import { getTeamAllianceData } from './api.js';
import { renderMiniRadar } from './radar.js';

export function renderMatchList(matches) {
  const container = document.getElementById('match-list');
  container.innerHTML = '';

  if (!matches.length) {
    container.innerHTML = '<p style="color:#888;font-size:13px">No matches found.</p>';
    document.getElementById('matches-wrap').style.display = 'block';
    return;
  }

  matches.forEach((m, i) => {
    const alliance = m.alliance.toLowerCase();
    const scores   = m.match.scores;
    const myScore  = scores?.[alliance];
    const oppScore = scores?.[alliance === 'red' ? 'blue' : 'red'];
    const won      = myScore && oppScore ? myScore.totalPoints > oppScore.totalPoints : null;

    // --- fila del match ---
    const item = document.createElement('div');
    item.className = 'match-item';
    item.innerHTML = `
      <span class="match-label">${m.match.tournamentLevel} #${m.match.matchNum}</span>
      <span class="match-alliance ${alliance}">${m.alliance} · ${m.station}</span>
      <span class="match-result ${won === null ? '' : won ? 'win' : 'loss'}">
        ${won === null ? '—' : won ? 'W' : 'L'}
        ${myScore ? myScore.totalPoints : '—'}–${oppScore ? oppScore.totalPoints : '—'}
      </span>
      <span class="match-chevron">▼</span>
    `;

    // --- panel expandible ---
    const panel = document.createElement('div');
    panel.className = 'match-panel';
    panel.style.display = 'none';
    panel.innerHTML = `<div class="panel-loading"><span class="spin"></span> Loading alliance data…</div>`;

    let loaded = false;

    item.addEventListener('click', async () => {
      const isOpen = panel.style.display === 'block';

      // cerrar todos los paneles abiertos
      document.querySelectorAll('.match-panel').forEach(p => p.style.display = 'none');
      document.querySelectorAll('.match-item').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.match-chevron').forEach(el => el.textContent = '▼');

      if (isOpen) return; // toggle: si ya estaba abierto, lo cierra

      panel.style.display = 'block';
      item.classList.add('active');
      item.querySelector('.match-chevron').textContent = '▲';

      if (loaded) return; // ya fue cargado antes
      loaded = true;

      try {
        await renderAlliancePanel(panel, m);
      } catch (e) {
        panel.innerHTML = `<p class="panel-err">Failed to load alliance data.</p>`;
      }
    });

    container.appendChild(item);
    container.appendChild(panel);
  });

  document.getElementById('matches-wrap').style.display = 'block';
}

async function renderAlliancePanel(panel, m) {
  const scores = m.match.scores;

  const alliances = [
    { color: 'red',  scores: scores?.red  },
    { color: 'blue', scores: scores?.blue },
  ];

  // Extraer números de equipo de cada alianza desde los teams del match
  // FTCScout no devuelve los team numbers dentro de matches directamente,
  // así que mostramos lo que tenemos y buscamos el equipo propio
  const redTeams  = m.match.teams?.filter(t => t.alliance === 'Red')  ?? [];
  const blueTeams = m.match.teams?.filter(t => t.alliance === 'Blue') ?? [];

  const teamsMap = { red: redTeams, blue: blueTeams };

  let html = `<div class="alliance-grid">`;

  for (const { color, scores: allianceScore } of alliances) {
    html += `
      <div class="alliance-col ${color}">
        <div class="alliance-header ${color}-bg">
          ${color.toUpperCase()} — ${allianceScore?.totalPoints ?? '—'} pts
          <span class="alliance-sub">Auto: ${allianceScore?.autoPoints ?? '—'} · DC: ${allianceScore?.dcPoints ?? '—'}</span>
        </div>
        <div class="alliance-teams" id="teams-${color}-${m.match.id}">
          <div class="panel-loading"><span class="spin"></span></div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  panel.innerHTML = html;

  // Cargar equipos de cada alianza
  for (const { color } of alliances) {
    const teamsList = teamsMap[color];
    const container = document.getElementById(`teams-${color}-${m.match.id}`);

    if (!teamsList.length) {
      container.innerHTML = `<p class="no-teams">Team data unavailable</p>`;
      continue;
    }

    const teamCards = await Promise.all(
      teamsList.map(t => buildTeamCard(t.teamNumber, m.match.id, color))
    );

    container.innerHTML = teamCards.join('');

    // Renderizar radars
    for (const t of teamsList) {
      const canvasId = `mini-radar-${t.teamNumber}-${m.match.id}`;
      const canvas   = document.getElementById(canvasId);
      if (canvas && canvas.dataset.stats) {
        const stats = JSON.parse(canvas.dataset.stats);
        renderMiniRadar(canvasId, `#${t.teamNumber}`, stats);
      }
    }
  }
}

async function buildTeamCard(teamNumber, matchId, color) {
  const data = await getTeamAllianceData(teamNumber);
  const info  = data?.info;
  const stats = data?.stats;

  const canvasId  = `mini-radar-${teamNumber}-${matchId}`;
  const statsData = stats ? JSON.stringify(stats).replace(/"/g, '&quot;') : '';

  return `
    <div class="mini-team-card">
      <div class="mini-team-header">
        <span class="mini-team-number">#${teamNumber}</span>
        <span class="mini-team-name">${info?.name ?? '—'}</span>
      </div>
      ${stats ? `
        <div class="mini-stats">
          <span>OPR <b>${stats.tot?.value?.toFixed(1) ?? '—'}</b></span>
          <span>Auto <b>${stats.auto?.value?.toFixed(1) ?? '—'}</b></span>
          <span>Teleop <b>${stats.dc?.value?.toFixed(1) ?? '—'}</b></span>
          <span>EG <b>${stats.eg?.value?.toFixed(1) ?? '—'}</b></span>
        </div>
        <div class="mini-radar-wrap">
          <canvas id="${canvasId}" data-stats="${statsData}"></canvas>
        </div>
      ` : `<p class="no-stats">No stats available</p>`}
    </div>
  `;
}
export function hideEmptyState() {
  const empty = document.getElementById('empty-state');
  if (empty) empty.style.display = 'none';
}