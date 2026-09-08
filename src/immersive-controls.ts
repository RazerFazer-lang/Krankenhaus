import { io } from 'socket.io-client';

type Priority = 'Rot' | 'Gelb' | 'Grün';
type HospitalState = {
  day: number;
  time: number;
  weather: string;
  money: number;
  reputation: number;
  patients: Array<{ id: number; name: string; priority: Priority; status: string }>;
  beds: Array<{ status: string }>;
  staff: Array<{ status: string }>;
  tasks: Array<{ done: boolean }>;
  players: Array<{ name: string; role: string }>;
  events: Array<{ id: string; type: string; text: string }>;
};
type ClientAction =
  | { type: 'createPatient' }
  | { type: 'houseAlarm' };

const style = document.createElement('style');
style.textContent = `
  #immersive-console{position:fixed;left:14px;bottom:14px;z-index:60;width:min(370px,calc(100vw - 28px));font:12px Inter,system-ui,sans-serif;color:#e7f3fa;pointer-events:none}
  #immersive-console *{box-sizing:border-box}
  .ic-card{pointer-events:auto;background:rgba(5,14,22,.9);border:1px solid rgba(104,170,203,.35);box-shadow:0 18px 55px rgba(0,0,0,.45),0 0 35px rgba(37,172,220,.08);backdrop-filter:blur(12px);border-radius:14px;padding:12px}
  .ic-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px}
  .ic-title{font-weight:800;letter-spacing:.08em;font-size:10px;color:#82dcff}
  .ic-sub{font-size:10px;color:#7893a6}
  .ic-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:9px}
  .ic-metric{background:#0b1720;border:1px solid #223846;border-radius:9px;padding:7px;min-width:0}
  .ic-metric b{display:block;font-size:16px;line-height:1.1}.ic-metric span{display:block;color:#6e8799;font-size:8px;margin-top:3px;text-transform:uppercase;letter-spacing:.1em}
  .ic-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
  .ic-btn{border:1px solid #2a4657;background:#0e1d28;color:#dcecf5;border-radius:8px;padding:8px 6px;font-weight:700;font-size:10px;cursor:pointer}
  .ic-btn:hover{background:#152b3a;border-color:#4c8099}.ic-btn.danger{border-color:#6b3340;color:#ffabb2}.ic-btn.active{border-color:#34c1ef;color:#8fe4ff;box-shadow:inset 0 0 0 1px rgba(52,193,239,.15)}
  .ic-alerts{margin-top:8px;display:none;max-height:100px;overflow:auto;border-top:1px solid #1f3442;padding-top:7px}.ic-alert{padding:5px 6px;border-radius:6px;background:#24161a;margin-top:4px;color:#ffd7db}.ic-alert small{display:block;color:#d6979d;margin-top:2px}
  #ic-rain{position:fixed;inset:0;z-index:45;pointer-events:none;display:none;opacity:.6;overflow:hidden}.ic-drop{position:absolute;top:-40px;width:1px;background:linear-gradient(transparent,#7fdfff);animation:icRain linear infinite}
  @keyframes icRain{to{transform:translate3d(0,110vh,0)}}
  #ic-vignette{position:fixed;inset:0;z-index:44;pointer-events:none;display:none;background:radial-gradient(circle at 50% 45%,transparent 35%,rgba(0,10,18,.42) 100%)}
  @media(max-width:700px){#immersive-console{width:calc(100vw - 20px);left:10px;bottom:10px}.ic-metrics{grid-template-columns:repeat(2,1fr)}}
`;
document.head.appendChild(style);

const socket = io(window.location.origin, { autoConnect: true });
let lastEventId = '';
let soundEnabled = true;
let audio: AudioContext | null = null;
let master: GainNode | null = null;
let ambientTimer = 0;
let rain = false;
let night = false;
let compact = false;

function ensureAudio() {
  if (!soundEnabled) return null;
  if (!audio) {
    audio = new AudioContext();
    master = audio.createGain();
    master.gain.value = 0.055;
    master.connect(audio.destination);
  }
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}
function tone(freq: number, duration: number, type: OscillatorType = 'sine', gainValue = 0.25) {
  const ctx = ensureAudio();
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain); gain.connect(master); osc.start(); osc.stop(ctx.currentTime + duration + 0.02);
}
function monitorSound() { tone(880, 0.05, 'sine', 0.16); }
function notificationSound() { tone(520, 0.08, 'triangle', 0.18); window.setTimeout(() => tone(740, 0.1, 'triangle', 0.16), 80); }
function alarmSound() { [0, 160, 320, 480, 640].forEach(ms => window.setTimeout(() => tone(430, 0.14, 'sawtooth', 0.2), ms)); }

function action(action: ClientAction) {
  socket.emit('action', action);
  notificationSound();
}

function fullscreen() {
  if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
  else void document.exitFullscreen?.();
}

function makeRain() {
  const layer = document.getElementById('ic-rain')!;
  layer.innerHTML = '';
  for (let i = 0; i < 140; i++) {
    const d = document.createElement('i'); d.className = 'ic-drop';
    d.style.left = `${Math.random() * 100}%`; d.style.height = `${8 + Math.random() * 20}px`;
    d.style.opacity = `${0.15 + Math.random() * 0.6}`; d.style.animationDuration = `${0.45 + Math.random() * 0.8}s`;
    d.style.animationDelay = `${Math.random() * 1.4}s`; layer.appendChild(d);
  }
}

function mountUi() {
  if (document.getElementById('immersive-console')) return;
  const rainLayer = document.createElement('div'); rainLayer.id = 'ic-rain'; document.body.appendChild(rainLayer);
  const vignette = document.createElement('div'); vignette.id = 'ic-vignette'; document.body.appendChild(vignette);
  makeRain();

  const root = document.createElement('div'); root.id = 'immersive-console';
  root.innerHTML = `
    <div class="ic-card">
      <div class="ic-head"><div><div class="ic-title">IMMERSIVE CONTROL DECK</div><div class="ic-sub">3D-Klinik · Live Server</div></div><button class="ic-btn" data-a="compact">↕</button></div>
      <div class="ic-metrics">
        <div class="ic-metric"><b data-m="critical">0</b><span>Kritisch</span></div>
        <div class="ic-metric"><b data-m="beds">0</b><span>Betten frei</span></div>
        <div class="ic-metric"><b data-m="players">0</b><span>Online</span></div>
        <div class="ic-metric"><b data-m="tasks">0</b><span>Aufgaben</span></div>
      </div>
      <div class="ic-actions">
        <button class="ic-btn" data-a="patient">＋ Aufnahme</button>
        <button class="ic-btn danger" data-a="alarm">⚠ Alarm</button>
        <button class="ic-btn" data-a="fullscreen">⛶ Vollbild</button>
        <button class="ic-btn" data-a="sound">🔊 Sound</button>
        <button class="ic-btn" data-a="rain">☔ Wetter</button>
        <button class="ic-btn" data-a="night">◐ Nacht</button>
      </div>
      <div class="ic-alerts" data-alerts></div>
    </div>`;
  document.body.appendChild(root);

  root.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-a]');
    if (!button) return;
    const key = button.dataset.a;
    if (key === 'patient') action({ type: 'createPatient' });
    if (key === 'alarm') { action({ type: 'houseAlarm' }); alarmSound(); }
    if (key === 'fullscreen') fullscreen();
    if (key === 'sound') { soundEnabled = !soundEnabled; button.textContent = soundEnabled ? '🔊 Sound' : '🔇 Sound'; if (soundEnabled) notificationSound(); }
    if (key === 'rain') { rain = !rain; rainLayer.style.display = rain ? 'block' : 'none'; button.classList.toggle('active', rain); }
    if (key === 'night') { night = !night; vignette.style.display = night ? 'block' : 'none'; document.documentElement.style.filter = night ? 'brightness(.78) saturate(.8)' : ''; button.classList.toggle('active', night); }
    if (key === 'compact') { compact = !compact; document.querySelector('.ic-metrics')?.toggleAttribute('hidden', compact); button.textContent = compact ? '↕' : '↕'; }
  });
}

function render(state: HospitalState) {
  mountUi();
  const critical = state.patients.filter(p => p.priority === 'Rot' && p.status !== 'Entlassung').length;
  const beds = state.beds.filter(b => b.status === 'Frei').length;
  const tasks = state.tasks.filter(t => !t.done).length;
  document.querySelector('[data-m="critical"]')!.textContent = String(critical);
  document.querySelector('[data-m="beds"]')!.textContent = String(beds);
  document.querySelector('[data-m="players"]')!.textContent = String(state.players.length);
  document.querySelector('[data-m="tasks"]')!.textContent = String(tasks);

  const alerts = document.querySelector<HTMLElement>('[data-alerts]')!;
  const urgent = state.events.filter(e => e.type === 'critical').slice(0, 4);
  alerts.style.display = urgent.length ? 'block' : 'none';
  alerts.innerHTML = urgent.map(e => `<div class="ic-alert">⚠ ${e.text}<small>Live-Ereignis</small></div>`).join('');

  const newest = state.events[0];
  if (newest && newest.id !== lastEventId) {
    lastEventId = newest.id;
    if (newest.type === 'critical') alarmSound(); else monitorSound();
  }
}

socket.on('connect', () => { socket.emit('pingState'); });
socket.on('state', (state: HospitalState) => render(state));
socket.on('notice', () => notificationSound());
socket.on('error', () => tone(250, 0.2, 'square', 0.16));

window.setInterval(() => {
  fetch('/api/state').then(r => r.json() as Promise<HospitalState>).then(render).catch(() => undefined);
}, 3000);

window.setInterval(() => {
  if (!soundEnabled || !document.getElementById('immersive-console')) return;
  if (Math.random() > 0.55) monitorSound();
}, 2600);

window.addEventListener('keydown', event => {
  const tag = (event.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (event.key.toLowerCase() === 'n') action({ type: 'createPatient' });
  if (event.key.toLowerCase() === 'h') { action({ type: 'houseAlarm' }); alarmSound(); }
  if (event.key.toLowerCase() === 'm') { soundEnabled = !soundEnabled; if (soundEnabled) notificationSound(); }
  if (event.key.toLowerCase() === 'f') fullscreen();
  if (event.key.toLowerCase() === 'r') { rain = !rain; document.getElementById('ic-rain')!.style.display = rain ? 'block' : 'none'; }
  if (event.key === 'F8') { compact = !compact; document.querySelector('.ic-metrics')?.toggleAttribute('hidden', compact); }
});

window.setTimeout(mountUi, 600);
