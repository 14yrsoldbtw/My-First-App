const reactionZone = document.querySelector('#reaction-zone');
const startButton = document.querySelector('#start-button');
const zoneTitle = document.querySelector('#zone-title');
const zoneHint = document.querySelector('#zone-hint');
const signalIcon = document.querySelector('#signal-icon');
const latestScore = document.querySelector('#latest-score');
const averageScore = document.querySelector('#average-score');
const bestScore = document.querySelector('#best-score');
const scoreList = document.querySelector('#score-list');
const sessionCount = document.querySelector('#session-count');
const roundLabel = document.querySelector('#round-label');
const reactionMode = document.querySelector('#reaction-mode');
const targetMode = document.querySelector('#target-mode');
const cursorMode = document.querySelector('#cursor-mode');
const eyebrow = document.querySelector('#eyebrow');
const introCopy = document.querySelector('#intro-copy');
const panelTitle = document.querySelector('#panel-title');
const scoreLabel = document.querySelector('#score-label');
const scoreUnit = document.querySelector('#score-unit');
const averageLabel = document.querySelector('#average-label');
const bestLabel = document.querySelector('#best-label');
const footerCopy = document.querySelector('#footer-copy');
const paceControl = document.querySelector('#pace-control');
const difficultyControl = document.querySelector('#difficulty-control');
const targetHud = document.querySelector('#target-hud');
const targetProgress = document.querySelector('#target-progress');
const targetClock = document.querySelector('#target-clock');
const targetDot = document.querySelector('#target-dot');
const cursorOrb = document.querySelector('#cursor-orb');
const paceOptions = document.querySelectorAll('.pace-option');
const difficultyOptions = document.querySelectorAll('.difficulty-option');

const totalRounds = 5;
const totalTargets = 10;
let state = 'idle';
let gameMode = 'reaction';
let pace = 'fast';
let difficulty = 'easy';
let round = 0;
let scores = [];
let startTime = 0;
let timeoutId;
let timerId;
let targetsLeft = totalTargets;
let bestEver = Number(localStorage.getItem('quick-reflex-best')) || null;
let targetBest = Number(localStorage.getItem('quick-reflex-target-best')) || null;
let cursorBest = Number(localStorage.getItem('quick-reflex-cursor-best')) || null;
const cursorTimeLimits = { easy: 20, focused: 12, expert: 7 };

function setText(title, hint) {
  zoneTitle.textContent = title;
  zoneHint.textContent = hint;
}

function updateStats() {
  latestScore.textContent = scores.length ? scores[scores.length - 1] : '—';
  averageScore.textContent = scores.length
    ? gameMode === 'target'
      ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)
      : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : '—';
  bestScore.textContent = (gameMode === 'reaction' ? bestEver : gameMode === 'target' ? targetBest : cursorBest) || '—';
  sessionCount.textContent = `${scores.length} / ${totalRounds}`;
  roundLabel.textContent = `round ${Math.min(round + 1, totalRounds)} / ${totalRounds}`;
  scoreList.innerHTML = scores.length
    ? scores.map((score, index) => `<div class="score-item"><span>run ${index + 1}</span><strong>${score}${gameMode === 'reaction' ? ' ms' : gameMode === 'target' ? ' s' : ' hits'}</strong></div>`).join('')
    : '<div class="empty-score">Your results will<br>land here.</div>';
}

function resetZone() {
  reactionZone.className = 'reaction-zone';
  signalIcon.style.animation = '';
  targetDot.className = 'target-dot';
  targetDot.setAttribute('aria-hidden', 'true');
  cursorOrb.className = 'cursor-orb';
}

function updateInterface() {
  const targetGame = gameMode === 'target';
  const cursorGame = gameMode === 'cursor';
  reactionMode.classList.toggle('active', !targetGame && !cursorGame);
  targetMode.classList.toggle('active', targetGame);
  cursorMode.classList.toggle('active', cursorGame);
  reactionMode.setAttribute('aria-pressed', String(!targetGame && !cursorGame));
  targetMode.setAttribute('aria-pressed', String(targetGame));
  cursorMode.setAttribute('aria-pressed', String(cursorGame));
  document.body.classList.toggle('target-game', targetGame || cursorGame);
  eyebrow.textContent = cursorGame ? 'A test of movement and focus' : targetGame ? 'A rapid-fire accuracy test' : 'A tiny test of a big instinct';
  document.querySelector('#page-title').innerHTML = cursorGame ? 'Move with<br><em>intent.</em>' : targetGame ? 'Find them<br><em>all.</em>' : 'How quick<br><em>are you?</em>';
  introCopy.innerHTML = cursorGame ? 'No clicks.<br>Just chase the circle.' : targetGame ? 'Ten targets.<br>One clean run.' : 'Wait for the signal.<br>Click as fast as you can.';
  panelTitle.textContent = cursorGame ? 'your flow' : targetGame ? 'your run' : 'your session';
  scoreLabel.textContent = cursorGame ? 'latest hit count' : targetGame ? 'latest clear time' : 'latest reaction';
  scoreUnit.textContent = cursorGame ? 'targets reached' : targetGame ? 'seconds' : 'milliseconds';
  averageLabel.textContent = cursorGame ? 'average hits' : targetGame ? 'run average' : 'session average';
  bestLabel.textContent = cursorGame ? 'most hits' : targetGame ? 'best clear time' : 'best ever';
  footerCopy.textContent = cursorGame ? 'Move, do not click.' : targetGame ? 'Ten targets. Three paces.' : 'Five rounds. One average.';
  paceControl.hidden = !targetGame;
  difficultyControl.hidden = !cursorGame;
  targetHud.hidden = !(targetGame || cursorGame);
  targetHud.querySelector('span').textContent = cursorGame ? ' hits' : ' targets left';
  updateStats();
}

function startRound() {
  if (state === 'waiting' || state === 'go' || state === 'target-go' || state === 'cursor-go') return;
  if (gameMode === 'target') return startTargetRun();
  if (gameMode === 'cursor') return startCursorRun();
  if (round >= totalRounds) {
    round = 0;
    scores = [];
    updateStats();
  }
  state = 'waiting';
  resetZone();
  reactionZone.classList.add('waiting');
  setText('Stay ready...', 'The signal will appear at any moment');
  startButton.querySelector('span').textContent = 'Watching...';
  const delay = 1400 + Math.random() * 3000;
  timeoutId = setTimeout(() => {
    state = 'go';
    startTime = performance.now();
    reactionZone.className = 'reaction-zone go';
    setText('CLICK!', 'Now is the moment');
  }, delay);
}

function startCursorRun() {
  if (round >= totalRounds) {
    round = 0;
    scores = [];
  }
  state = 'cursor-go';
  targetsLeft = 0;
  startTime = performance.now();
  reactionZone.className = 'reaction-zone cursor-go';
  reactionZone.dataset.difficulty = difficulty;
  targetProgress.textContent = '0';
  targetClock.textContent = `${cursorTimeLimits[difficulty].toFixed(1)}s`;
  setText('', 'Move your cursor into each circle');
  targetDot.setAttribute('aria-hidden', 'false');
  cursorOrb.classList.add('visible');
  placeTarget();
  startButton.querySelector('span').textContent = 'Flow in progress...';
  timerId = setInterval(() => {
    const remaining = Math.max(0, cursorTimeLimits[difficulty] - (performance.now() - startTime) / 1000);
    targetClock.textContent = `${remaining.toFixed(1)}s`;
    if (!remaining) finishCursorRun();
  }, 50);
}

function registerCursorHit(event) {
  event.stopPropagation();
  if (state !== 'cursor-go') return;
  targetsLeft += 1;
  targetProgress.textContent = targetsLeft;
  targetDot.classList.add('target-hit');
  setTimeout(() => {
    if (state !== 'cursor-go') return;
    targetDot.classList.remove('target-hit');
    placeTarget();
  }, 520);
}

function finishCursorRun() {
  if (state !== 'cursor-go') return;
  clearInterval(timerId);
  scores.push(targetsLeft);
  round += 1;
  if (!cursorBest || targetsLeft > cursorBest) {
    cursorBest = targetsLeft;
    localStorage.setItem('quick-reflex-cursor-best', String(cursorBest));
  }
  state = 'idle';
  targetDot.className = 'target-dot';
  cursorOrb.className = 'cursor-orb';
  reactionZone.className = 'reaction-zone cursor-done';
  setText(`${targetsLeft} hits`, round === totalRounds ? 'Flow complete' : 'Time. Ready for another?');
  startButton.querySelector('span').textContent = round === totalRounds ? 'Run it again' : 'Next flow';
  updateStats();
}

function startTargetRun() {
  if (round >= totalRounds) {
    round = 0;
    scores = [];
  }
  state = 'target-ready';
  targetsLeft = totalTargets;
  resetZone();
  reactionZone.classList.add('target-ready');
  targetHud.hidden = false;
  targetProgress.textContent = targetsLeft;
  targetClock.textContent = '0.0s';
  setText('Clear the field', `${pace} pace · click every target`);
  startButton.querySelector('span').textContent = 'Start target rush';
}

function launchTargetRun() {
  state = 'target-go';
  startTime = performance.now();
  reactionZone.className = 'reaction-zone target-go';
  reactionZone.dataset.pace = pace;
  setText('', '');
  targetDot.setAttribute('aria-hidden', 'false');
  placeTarget();
  timerId = setInterval(() => {
    targetClock.textContent = `${((performance.now() - startTime) / 1000).toFixed(1)}s`;
  }, 50);
}

function placeTarget() {
  const margin = 13;
  targetDot.style.left = `${margin + Math.random() * (100 - margin * 2)}%`;
  targetDot.style.top = `${margin + Math.random() * (100 - margin * 2)}%`;
}

function registerTargetClick(event) {
  event.stopPropagation();
  if (state === 'target-ready') return launchTargetRun();
  if (state !== 'target-go') return;
  targetsLeft -= 1;
  targetProgress.textContent = targetsLeft;
  targetDot.classList.add('target-hit');
  if (!targetsLeft) return finishTargetRun();
  setTimeout(() => {
    targetDot.classList.remove('target-hit');
    placeTarget();
  }, 90);
}

function registerTargetMiss() {
  if (state !== 'target-go') return;
  clearInterval(timerId);
  state = 'idle';
  targetDot.className = 'target-dot';
  reactionZone.className = 'reaction-zone target-miss';
  setText('Missed.', 'Click the target, then restart the run');
  startButton.querySelector('span').textContent = 'Restart target rush';
}

function finishTargetRun() {
  clearInterval(timerId);
  const score = Number(((performance.now() - startTime) / 1000).toFixed(2));
  scores.push(score);
  round += 1;
  if (!targetBest || score < targetBest) {
    targetBest = score;
    localStorage.setItem('quick-reflex-target-best', String(targetBest));
  }
  state = 'idle';
  targetDot.className = 'target-dot';
  reactionZone.className = 'reaction-zone target-done';
  setText(`${score}s`, round === totalRounds ? 'Run complete' : 'Clean sweep. Ready for another?');
  startButton.querySelector('span').textContent = round === totalRounds ? 'Run it again' : 'Next target rush';
  updateStats();
}

function registerFalseStart() {
  clearTimeout(timeoutId);
  state = 'idle';
  reactionZone.className = 'reaction-zone too-soon';
  setText('Too soon.', 'Wait for the coral signal');
  startButton.querySelector('span').textContent = 'Try again';
}

function registerScore() {
  const score = Math.round(performance.now() - startTime);
  scores.push(score);
  round += 1;
  if (!bestEver || score < bestEver) {
    bestEver = score;
    localStorage.setItem('quick-reflex-best', String(bestEver));
  }
  state = 'idle';
  reactionZone.className = 'reaction-zone done';
  setText(`${score} ms`, round === totalRounds ? 'Session complete' : 'Nice. Ready for the next one?');
  startButton.querySelector('span').textContent = round === totalRounds ? 'Run it again' : 'Next round';
  updateStats();
}

function handleZoneClick(event) {
  if (gameMode === 'cursor') return;
  if (gameMode === 'target') {
    if (state === 'target-ready') return launchTargetRun();
    return registerTargetMiss();
  }
  if (state === 'waiting') registerFalseStart();
  else if (state === 'go') registerScore();
}

function switchMode(nextMode) {
  if (state === 'waiting' || state === 'go' || state === 'target-go' || state === 'cursor-go') return;
  clearTimeout(timeoutId);
  clearInterval(timerId);
  gameMode = nextMode;
  round = 0;
  scores = [];
  state = 'idle';
  resetZone();
  startButton.querySelector('span').textContent = gameMode === 'target' ? 'Start target rush' : gameMode === 'cursor' ? 'Start cursor flow' : 'Start test';
  updateInterface();
}

startButton.addEventListener('click', startRound);
reactionZone.addEventListener('click', handleZoneClick);
reactionZone.addEventListener('pointermove', (event) => {
  if (gameMode !== 'cursor' || state !== 'cursor-go') return;
  const bounds = reactionZone.getBoundingClientRect();
  cursorOrb.style.left = `${event.clientX - bounds.left}px`;
  cursorOrb.style.top = `${event.clientY - bounds.top}px`;
});
reactionZone.addEventListener('pointerleave', () => cursorOrb.classList.remove('visible'));
reactionZone.addEventListener('pointerenter', () => {
  if (gameMode === 'cursor' && state === 'cursor-go') cursorOrb.classList.add('visible');
});
targetDot.addEventListener('click', registerTargetClick);
targetDot.addEventListener('pointerenter', registerCursorHit);
reactionMode.addEventListener('click', () => switchMode('reaction'));
targetMode.addEventListener('click', () => switchMode('target'));
cursorMode.addEventListener('click', () => switchMode('cursor'));
paceOptions.forEach((option) => option.addEventListener('click', () => {
  if (state === 'target-ready' || state === 'target-go') return;
  pace = option.dataset.pace;
  paceOptions.forEach((paceOption) => paceOption.classList.toggle('active', paceOption === option));
}));
 difficultyOptions.forEach((option) => option.addEventListener('click', () => {
  if (state === 'cursor-go') return;
  difficulty = option.dataset.difficulty;
  difficultyOptions.forEach((difficultyOption) => difficultyOption.classList.toggle('active', difficultyOption === option));
}));
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat) return;
  event.preventDefault();
  if (state === 'go' || state === 'waiting' || state === 'target-ready') handleZoneClick(event);
  else startRound();
});

updateStats();
updateInterface();
