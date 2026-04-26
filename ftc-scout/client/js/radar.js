const TOTAL_TEAMS = 8000;
const MAX = { opr: 450, auto: 75, dc: 200, eg: 30 };
let radarChart = null;

function normalize(value, max) {
  return value != null ? Math.min(Math.round((value / max) * 100), 100) : 0;
}

function rankVal(rank) {
  return rank != null ? Math.round((1 - rank / TOTAL_TEAMS) * 100) : 0;
}

export function renderRadar(teamName, s) {
  if (radarChart) radarChart.destroy();

  radarChart = new Chart(document.getElementById('radar'), {
    type: 'radar',
    data: {
      labels: ['OPR', 'Auto', 'Teleop', 'Endgame', 'Auto Rank', 'Teleop Rank'],
      datasets: [{
        label: teamName,
        data: [
          normalize(s.tot?.value,  MAX.opr),
          normalize(s.auto?.value, MAX.auto),
          normalize(s.dc?.value,   MAX.dc),
          normalize(s.eg?.value,   MAX.eg),
          rankVal(s.auto?.rank),
          rankVal(s.dc?.rank)
        ],
        borderColor: '#4a90d9',
        backgroundColor: 'rgba(74,144,217,0.15)',
        pointBackgroundColor: '#4a90d9',
        borderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { display: false },
          grid: { color: 'rgba(0,0,0,0.08)' },
          angleLines: { color: 'rgba(0,0,0,0.08)' },
          pointLabels: { font: { size: 13 } }
        }
      }
    }
  });
}

const miniCharts = {};

export function renderMiniRadar(canvasId, teamName, s) {
  if (miniCharts[canvasId]) miniCharts[canvasId].destroy();

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  miniCharts[canvasId] = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: ['OPR', 'Auto', 'Teleop', 'EG', 'Auto Rank', 'DC Rank'],
      datasets: [{
        label: teamName,
        data: [
          normalize(s.tot?.value,  MAX.opr),
          normalize(s.auto?.value, MAX.auto),
          normalize(s.dc?.value,   MAX.dc),
          normalize(s.eg?.value,   MAX.eg),
          rankVal(s.auto?.rank),
          rankVal(s.dc?.rank)
        ],
        borderColor: '#4a90d9',
        backgroundColor: 'rgba(74,144,217,0.15)',
        pointBackgroundColor: '#4a90d9',
        borderWidth: 1.5,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { display: false },
          grid: { color: 'rgba(0,0,0,0.08)' },
          angleLines: { color: 'rgba(0,0,0,0.08)' },
          pointLabels: { font: { size: 10 } }
        }
      }
    }
  });
}