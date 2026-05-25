const keyboardBtn = document.querySelector('#keyboardBtn');
const pointerBtn = document.querySelector('#pointerBtn');
const startBtn = document.querySelector('#startBtn');
const unlockBtn = document.querySelector('#unlockBtn');
const statusPill = document.querySelector('#statusPill');
const timerSelect = document.querySelector('#timerSelect');
const countdown = document.querySelector('#countdown');
const alertBox = document.querySelector('#alert');
const toast = document.querySelector('#toast');

let state = {
  keyboardBlocked: false,
  pointerBlocked: false,
  helperReady: false,
  error: null
};

let unlockTimer = null;
let unlockDeadline = 0;
let toastTimer = null;

function setAlert(message) {
  alertBox.hidden = !message;
  alertBox.textContent = message || '';
}

function showToast(message) {
  if (toastTimer) window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;

  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
    toast.textContent = '';
    toastTimer = null;
  }, 2600);
}

function render(nextState) {
  state = { ...state, ...nextState };

  keyboardBtn.setAttribute('aria-pressed', String(state.keyboardBlocked));
  keyboardBtn.textContent = state.keyboardBlocked ? 'Unblock keyboard' : 'Block keyboard';

  pointerBtn.setAttribute('aria-pressed', String(state.pointerBlocked));
  pointerBtn.textContent = state.pointerBlocked ? 'Unblock touchpad' : 'Block touchpad';

  const active = state.keyboardBlocked || state.pointerBlocked;
  statusPill.classList.toggle('active', active);
  statusPill.textContent = active ? 'Locked' : state.helperReady ? 'Ready' : 'Starting helper';

  setAlert(state.error);

  if (!active) clearAutoUnlock();
}

function clearAutoUnlock() {
  if (unlockTimer) window.clearInterval(unlockTimer);
  unlockTimer = null;
  unlockDeadline = 0;
  countdown.hidden = true;
  countdown.textContent = '';
}

function startAutoUnlock(seconds) {
  clearAutoUnlock();
  if (!seconds) return;

  unlockDeadline = Date.now() + seconds * 1000;
  countdown.hidden = false;

  const tick = async () => {
    const remaining = Math.max(0, Math.ceil((unlockDeadline - Date.now()) / 1000));
    countdown.textContent = `Auto-unlock in ${remaining} second${remaining === 1 ? '' : 's'}.`;

    if (remaining <= 0) {
      clearAutoUnlock();
      await window.cleaner.unlockAll();
    }
  };

  tick();
  unlockTimer = window.setInterval(tick, 250);
}

keyboardBtn.addEventListener('click', async () => {
  await window.cleaner.setKeyboard(!state.keyboardBlocked);
});

pointerBtn.addEventListener('click', async () => {
  await window.cleaner.setPointer(!state.pointerBlocked);
});

startBtn.addEventListener('click', async () => {
  await window.cleaner.setKeyboard(true);
  await window.cleaner.setPointer(true);
  startAutoUnlock(Number(timerSelect.value));
});

unlockBtn.addEventListener('click', async () => {
  clearAutoUnlock();
  await window.cleaner.unlockAll();
});

window.cleaner.onStatus(render);
window.cleaner.onShortcutUnlocked(() => {
  clearAutoUnlock();
  showToast('Unlocked with Ctrl + Alt + U');
});

window.cleaner.getStatus().then(render);
