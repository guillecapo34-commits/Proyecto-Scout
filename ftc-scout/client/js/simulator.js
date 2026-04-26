import { getTeam, getTeamStats, predict } from './api.js';
import { renderMiniRadar } from './radar.js';

const teams = {
  'red-1': null, 'red-2': null,
  'blue-1': null, 'blue-2': null
};

document.querySelectorAll('.sim-team-slot').forEach(slot => {
  const slotId = slot.dataset.slot;
  const input  = slot.querySelector('.sim-input');
  const btn    = slot.querySelector('.sim-add-btn');

  async function addTeam() {
    const num = input.value.trim();
    if (!num || isNaN(num)) return;

    btn.disabled = true;
    btn.textContent = '...';

    try {
      const [info, stats] = await Promise.all([getTeam(num), getTeamStats(num)]);
      teams[slotId] = { info, stats };
      renderSlot(slot, slotId, info, stats);
      checkAllTeamsReady();
    } catch(e) {
      renderSlotError(slot);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add';
    }
  }

  btn.addEventListener('click', addTeam);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addTeam(); });
});

function checkAllTeamsReady() {
  const allReady = Object.values(teams).every(t => t !== null);
  const predictBtn = document.getElementById('predict-btn');
  if (predictBtn) predictBtn.disabled = !allReady;
}

function renderSlot(slot, slotId, info, stats) {
  let preview = slot.querySelector('.sim-team-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.className = 'sim-team-preview';
    slot.appendChild(preview);
  }

  const canvasId = `sim-radar-${slotId}`;
  preview.innerHTML = `
    <div class="sim-preview-name">#${info.number} — ${info.name || 'Unknown'}</div>
    ${stats ? `
      <div class="sim-preview-stats">
        <span>OPR <b>${stats.tot?.value?.toFixed(1) ?? '—'}</b></span>
        <span>Auto <b>${stats.auto?.value?.toFixed(1) ?? '—'}</b></span>
        <span>Teleop <b>${stats.dc?.value?.toFixed(1) ?? '—'}</b></span>
        <span>EG <b>${stats.eg?.value?.toFixed(1) ?? '—'}</b></span>
      </div>
      <div class="sim-radar-wrap">
        <canvas id="${canvasId}"></canvas>
      </div>
    ` : '<p class="no-stats">No stats available</p>'}
  `;

  if (stats) setTimeout(() => renderMiniRadar(canvasId, `#${info.number}`, stats), 0);
}

function renderSlotError(slot) {
  let preview = slot.querySelector('.sim-team-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.className = 'sim-team-preview';
    slot.appendChild(preview);
  }
  preview.innerHTML = `<p class="no-stats">Team not found.</p>`;
}

document.getElementById('predict-btn').addEventListener('click', async () => {
  const btn = document.getElementById('predict-btn');
  btn.disabled = true;
  btn.textContent = 'Predicting...';

  const red  = [{stats: teams['red-1'].stats}, {stats: teams['red-2'].stats}];
  const blue = [{stats: teams['blue-1'].stats}, {stats: teams['blue-2'].stats}];

  try {
    const result = await predict(red, blue);
    renderPrediction(result);
  } catch(e) {
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Predict match';
  }
});

function renderPrediction(result) {
  const section = document.getElementById('prediction-section');
  section.style.display = 'block';

  document.getElementById('pred-red-prob').textContent  = `${result.redWinProb}%`;
  document.getElementById('pred-blue-prob').textContent = `${result.blueWinProb}%`;
  document.getElementById('pred-red-score').textContent  = result.redScore;
  document.getElementById('pred-blue-score').textContent = result.blueScore;

  const bar = document.getElementById('pred-bar-red');
  bar.style.width = `${result.redWinProb}%`;

  const list = document.getElementById('pred-strategies');
  list.innerHTML = result.strategies.map(s => `<li>${s}</li>`).join('');
}