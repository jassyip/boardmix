export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const pick = array => array[Math.floor(Math.random() * array.length)];
export const shuffle = array => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const PREF_KEY = 'boardmix-prefs-v32';
export function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); }
  catch { return {}; }
}
export function savePrefs(prefs) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }
  catch { /* private mode may reject storage */ }
}

let soundEnabled = loadPrefs().soundEnabled !== false;
let audioContext = null;
export function setSound(enabled) { soundEnabled = enabled; }
export function getSound() { return soundEnabled; }
export function tone(frequency = 440, duration = 0.07, type = 'sine', volume = 0.035) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* audio is optional */ }
}
export const clickTone = () => tone(540, 0.045, 'sine', 0.028);
export const moveTone = () => tone(360, 0.055, 'triangle', 0.026);
export function winTone() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.05), i * 105)); }
export function boomTone() { tone(92, 0.28, 'sawtooth', 0.07); setTimeout(() => tone(64, 0.2, 'square', 0.035), 65); }

export function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 1900);
}

export function openModal(html, onReady) {
  const modal = $('#modal');
  $('#modalContent').innerHTML = html;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  onReady?.($('#modalContent'));
}
export function closeModal() {
  const modal = $('#modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  $('#modalContent').innerHTML = '';
}

export function setThinking(id, visible, text) {
  const node = document.getElementById(id);
  if (!node) return;
  if (text) node.textContent = text;
  node.classList.toggle('hidden', !visible);
}

export function playerTypeLabel(type, level) {
  return type === 'cpu' ? `电脑${level}级` : '真人';
}

export const difficultyOptions = (selected = 3) => [1,2,3,4,5]
  .map(level => `<option value="${level}" ${level === Number(selected) ? 'selected' : ''}>${level}级 · ${['启蒙','简单','普通','困难','大师'][level-1]}</option>`).join('');

export const typeOptions = selected => `
  <option value="human" ${selected === 'human' ? 'selected' : ''}>真人</option>
  <option value="cpu" ${selected === 'cpu' ? 'selected' : ''}>电脑</option>`;

export function bindTypeLevel(container) {
  $$('.player-type', container).forEach(select => {
    const sync = () => {
      const level = container.querySelector(`[data-level-for="${select.dataset.player}"]`);
      if (level) level.disabled = select.value !== 'cpu';
    };
    select.addEventListener('change', sync);
    sync();
  });
}
