import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { io, type Socket } from 'socket.io-client';
import type { ClientAction, Department, HospitalState, Patient, PlayerRole, Staff } from './types';
import './styles3d.css';

type AppSocket = Socket;
const roles: PlayerRole[] = ['Ärztlicher Dienst', 'Pflegedienst', 'OP-Team', 'Aufnahme', 'Verwaltung'];
const departmentSlots: Record<Department, [number, number]> = {
  Notaufnahme: [-18, 9], Chirurgie: [-6, 9], Radiologie: [7, 9], Kardiologie: [-18, -1], 'Innere Medizin': [-7, -1], Intensivstation: [7, -1],
  Pädiatrie: [-18, -11], Labor: [-8, -11], Apotheke: [0, -11], Anästhesie: [8, -11], Hygiene: [16, -11],
};

function priorityColor(priority: Patient['priority']): number {
  return priority === 'Rot' ? 0xf0525f : priority === 'Gelb' ? 0xe6ad3f : 0x45c784;
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function clock(ts: number) { return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.07; this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }
  toggle() { this.enabled = !this.enabled; if (this.enabled) this.ensure(); return this.enabled; }
  beep(freq = 760, duration = 0.08, type: OscillatorType = 'sine') {
    const ctx = this.ensure(); if (!ctx || !this.master) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(ctx.currentTime + duration + 0.01);
  }
  monitor() { this.beep(860, 0.055, 'sine'); }
  notification() { this.beep(520, 0.12, 'triangle'); window.setTimeout(() => this.beep(740, 0.15, 'triangle'), 90); }
  alarm() { [0, 170, 340, 510].forEach(offset => window.setTimeout(() => this.beep(430, 0.16, 'sawtooth'), offset)); }
}

function makeTextSprite(text: string, color = '#dcecff') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d'); if (!ctx) return new THREE.Sprite();
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.font = '700 34px Inter, Arial, sans-serif'; ctx.fillStyle = 'rgba(5,12,19,.82)'; ctx.roundRect(8, 12, 496, 90, 16); ctx.fill();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 58);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material); sprite.scale.set(5.4, 1.35, 1); return sprite;
}

function HospitalScene({ state, onPickPatient, onPickDepartment, muted, sound }: { state: HospitalState; onPickPatient: (p: Patient) => void; onPickDepartment: (d: Department) => void; muted: boolean; sound: SoundEngine }) {
  const mount = useRef<HTMLDivElement | null>(null);
  const selectedPulse = useRef<Record<number, THREE.Object3D>>({});
  const dragging = useRef(false); const last = useRef({ x: 0, y: 0 }); const target = useRef({ x: 0, y: 0, zoom: 30, tilt: 0.9 });
  const objects = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    if (!mount.current) return;
    const host = mount.current;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x071018); scene.fog = new THREE.Fog(0x071018, 24, 72);
    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 200); camera.position.set(0, 25, 22);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(host.clientWidth, host.clientHeight); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xbfe9ff, 0x0a111a, 2.0); scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-20, 34, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key);
    const fill = new THREE.PointLight(0x66c6ff, 20, 40); fill.position.set(0, 10, 7); scene.add(fill);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 55), new THREE.MeshStandardMaterial({ color: 0x0d1a24, roughness: 0.98, metalness: 0.02 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(60, 30, 0x27465a, 0x18303f); grid.position.y = 0.02; scene.add(grid);

    const base = new THREE.Group(); scene.add(base); objects.current = [];
    const roomMap = new Map<Department, THREE.Group>();
    const makeRoom = (department: Department) => {
      const [x, z] = departmentSlots[department]; const group = new THREE.Group(); group.position.set(x, 0, z); group.userData.department = department; roomMap.set(department, group); base.add(group); objects.current.push(group);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(9.5, 3.0, 7.2), new THREE.MeshStandardMaterial({ color: 0x142736, roughness: 0.82, transparent: true, opacity: 0.92 })); shell.position.y = 1.5; shell.castShadow = true; shell.receiveShadow = true; group.add(shell);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.25, 7.5), new THREE.MeshStandardMaterial({ color: 0x1d3a4d, roughness: 0.72 })); roof.position.y = 3.1; group.add(roof);
      const label = makeTextSprite(department, department === 'Notaufnahme' ? '#70e7ff' : '#d8e9f5'); label.position.set(0, 4.2, 0); group.add(label);
      const windows = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.0, 0.08), new THREE.MeshStandardMaterial({ color: 0x3a7890, emissive: 0x153d4a, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.3 })); windows.position.set(0, 2.0, 3.58); group.add(windows);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.15, 5.5), new THREE.MeshStandardMaterial({ color: 0x14212b, roughness: 1 })); inner.position.y = 0.12; group.add(inner);
      group.traverse(o => { if (o instanceof THREE.Mesh) o.userData.department = department; });
    };
    Object.keys(departmentSlots).forEach(d => makeRoom(d as Department));

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x111c24, roughness: 1 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(58, 0.2, 5), roadMat); road.position.set(0, 0.05, 19); road.receiveShadow = true; scene.add(road);
    const helipad = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.25, 48), new THREE.MeshStandardMaterial({ color: 0x263a46, roughness: 0.88 })); helipad.position.set(18, 0.16, 17); helipad.receiveShadow = true; scene.add(helipad);
    const h = makeTextSprite('H', '#73e0ff'); h.position.set(18, 0.5, 17); h.scale.set(3.0, 2.0, 1); scene.add(h);

    const createBed = (room: THREE.Group, index: number, patient?: Patient) => {
      const angle = (index % 2) * Math.PI; const offsetX = (index % 3 - 1) * 2.4; const offsetZ = (Math.floor(index / 3) - 0.5) * 2.2;
      const g = new THREE.Group(); g.position.set(offsetX, 0.2, offsetZ); room.add(g);
      if (patient) g.userData.patientId = patient.id;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.75), new THREE.MeshStandardMaterial({ color: patient ? priorityColor(patient.priority) : 0x4c6676, roughness: 0.7 })); frame.castShadow = true; frame.userData.patientId = patient?.id; g.add(frame);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.85), new THREE.MeshStandardMaterial({ color: 0xb8c5cf, roughness: 0.85 })); head.position.set(-0.9, 0.35, 0); head.userData.patientId = patient?.id; g.add(head);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.7), new THREE.MeshStandardMaterial({ color: 0xe4edf2, roughness: 1 })); pillow.position.set(-0.55, 0.35, 0); pillow.userData.patientId = patient?.id; g.add(pillow);
      g.rotation.y = angle; if (patient) { const tag = makeTextSprite(`#${patient.id} · ${patient.name}`, patient.priority === 'Rot' ? '#ff9098' : '#dcecff'); tag.position.set(0, 1.25, 0); tag.scale.set(2.8, 0.7, 1); tag.userData.patientId = patient.id; g.add(tag); const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshBasicMaterial({ color: priorityColor(patient.priority) })); pulse.position.set(0, 1.55, 0.4); pulse.userData.patientId = patient.id; g.add(pulse); selectedPulse.current[patient.id] = pulse; }
    };

    departmentOrderForRooms.forEach((department) => {
      const room = roomMap.get(department); if (!room) return;
      const roomPatients = state.patients.filter(p => p.department === department && p.status !== 'Entlassung').slice(0, 6); for (let i = 0; i < 6; i++) createBed(room, i, roomPatients[i]);
      const staffHere = state.staff.filter(s => s.department === department && s.status !== 'Abwesend').slice(0, 2);
      staffHere.forEach((s, idx) => { const ped = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.6, 5, 12), new THREE.MeshStandardMaterial({ color: 0x7ccfff, emissive: 0x14384d, emissiveIntensity: 0.35 })); ped.position.set((idx ? 1 : -1) * 2.0, 0.75, 2.1); ped.castShadow = true; ped.userData.staffId = s.id; room.add(ped); });
    });

    const walkLights = new THREE.Group(); scene.add(walkLights); for (let i = -24; i <= 24; i += 4) { const p = new THREE.PointLight(0x66c6ff, 1.7, 5); p.position.set(i, 2.5, 15.5); walkLights.add(p); }
    const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => { dragging.current = true; last.current = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = () => { dragging.current = false; };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return; const dx = event.clientX - last.current.x; const dy = event.clientY - last.current.y; last.current = { x: event.clientX, y: event.clientY }; target.current.x -= dx * 0.04; target.current.y -= dy * 0.04; target.current.x = clamp(target.current.x, -12, 12); target.current.y = clamp(target.current.y, -12, 12);
    };
    const onWheel = (event: WheelEvent) => { event.preventDefault(); target.current.zoom = clamp(target.current.zoom + event.deltaY * 0.02, 18, 44); };
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect(); mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(mouse, camera); const hits = raycaster.intersectObjects(base.children, true);
      const patientHit = hits.find(hh => hh.object.userData.patientId !== undefined); if (patientHit) { const patient = state.patients.find(p => p.id === Number(patientHit.object.userData.patientId)); if (patient) { onPickPatient(patient); sound.notification(); return; } }
      const picked = hits.find(hh => hh.object.userData.department); if (!picked) return; const dept = picked.object.userData.department as Department; onPickDepartment(dept); sound.notification();
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown); renderer.domElement.addEventListener('pointerup', onPointerUp); renderer.domElement.addEventListener('pointerleave', onPointerUp); renderer.domElement.addEventListener('pointermove', onPointerMove); renderer.domElement.addEventListener('wheel', onWheel, { passive: false }); renderer.domElement.addEventListener('click', onClick);

    let raf = 0; let lastT = performance.now();
    const tickScene = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; void dt;
      const desiredY = 10 + target.current.zoom * Math.sin(target.current.tilt); const desiredZ = target.current.zoom * Math.cos(target.current.tilt); camera.position.x += ((target.current.x) - camera.position.x) * 0.08; camera.position.y += (desiredY - camera.position.y) * 0.08; camera.position.z += ((target.current.y + desiredZ) - camera.position.z) * 0.08; camera.lookAt(target.current.x * 0.35, 0, target.current.y * 0.35);
      base.children.forEach((room, idx) => { room.rotation.y = Math.sin(now * 0.00025 + idx) * 0.002; });
      Object.entries(selectedPulse.current).forEach(([id, obj], idx) => { const patient = state.patients.find(p => p.id === Number(id)); if (!patient || patient.status === 'Entlassung') return; const s = 1 + Math.sin(now * 0.005 + idx) * 0.25; obj.scale.setScalar(s); obj.position.y = 1.55 + Math.sin(now * 0.003 + idx) * 0.05; });
      fill.intensity = 17 + Math.sin(now * 0.001) * 2; walkLights.children.forEach((o, idx) => { if (o instanceof THREE.PointLight) o.intensity = 1.4 + Math.sin(now * 0.002 + idx) * 0.3; });
      renderer.render(scene, camera); raf = requestAnimationFrame(tickScene);
    }; raf = requestAnimationFrame(tickScene);

    const resize = () => { if (!host.clientWidth || !host.clientHeight) return; camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.domElement.removeEventListener('pointerdown', onPointerDown); renderer.domElement.removeEventListener('pointerup', onPointerUp); renderer.domElement.removeEventListener('pointerleave', onPointerUp); renderer.domElement.removeEventListener('pointermove', onPointerMove); renderer.domElement.removeEventListener('wheel', onWheel); renderer.domElement.removeEventListener('click', onClick); renderer.dispose(); host.innerHTML = ''; };
  }, [state, onPickPatient, onPickDepartment, muted, sound]);
  return <div ref={mount} className="scene-host" aria-label="3D-Krankenhaus" />;
}

const departmentOrderForRooms: Department[] = ['Notaufnahme', 'Chirurgie', 'Radiologie', 'Kardiologie', 'Innere Medizin', 'Intensivstation', 'Pädiatrie', 'Labor', 'Apotheke', 'Anästhesie', 'Hygiene'];

function App() {
  const [socket] = useState<AppSocket>(() => io(window.location.origin, { autoConnect: false }));
  const [state, setState] = useState<HospitalState | null>(null); const [name, setName] = useState('Spieler'); const [role, setRole] = useState<PlayerRole>('Ärztlicher Dienst'); const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false); const [notice, setNotice] = useState(''); const [selected, setSelected] = useState<Patient | null>(null); const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const sound = useMemo(() => new SoundEngine(), []); const lastEventCount = useRef(0);
  useEffect(() => { const onState = (next: HospitalState) => { if (lastEventCount.current && next.events.length > lastEventCount.current && next.events[0]?.type === 'critical') sound.alarm(); else if (lastEventCount.current && next.events.length > lastEventCount.current) sound.monitor(); lastEventCount.current = next.events.length; setState(next); }; const onNotice = (message: string) => { setNotice(message); sound.notification(); window.setTimeout(() => setNotice(''), 2600); }; const onError = (message: string) => setNotice(`Fehler: ${message}`); socket.on('state', onState); socket.on('notice', onNotice); socket.on('error', onError); return () => { socket.off('state', onState); socket.off('notice', onNotice); socket.off('error', onError); socket.disconnect(); }; }, [socket, sound]);
  const join = () => { sound.beep(620, 0.16, 'triangle'); socket.connect(); socket.emit('join', { name: name.trim().slice(0, 32) || 'Spieler', role }); setJoined(true); };
  const act = (action: ClientAction) => { socket.emit('action', action); sound.beep(700, 0.08); };
  if (!joined || !state) return <div className="login3d"><div className="login3d-card"><div className="logo3d">✚</div><span>IMMERSIVE HOSPITAL</span><h1>Krankenhaus · 3D</h1><p>Begehbare Klinikansicht mit Echtzeit-Patienten, Personal und räumlichem Klinikbetrieb.</p><label>Spielername<input value={name} onChange={e => setName(e.target.value)} maxLength={32} /></label><label>Rolle<select value={role} onChange={e => setRole(e.target.value as PlayerRole)}>{roles.map(r => <option key={r}>{r}</option>)}</select></label><button onClick={join}>3D-Klinik betreten →</button><a href="/">← Zur 2D-Klinik</a></div></div>;
  const critical = state.patients.filter(p => p.priority === 'Rot' && p.status !== 'Entlassung').length; const freeBeds = state.beds.filter(b => b.status === 'Frei').length;
  return <div className="shell3d"><header className="hud"><div className="hud-brand"><b>✚ KRANKENHAUS</b><span>3D IMMERSIVE SIMULATION</span></div><div className="hud-stats"><span className="live"><i /> LIVE</span><span>TAG {state.day}</span><span>{clock(state.time)}</span><span>{state.weather}</span><span>€ {Math.round(state.money).toLocaleString('de-DE')}</span></div><div className="hud-actions"><button onClick={() => { const on = sound.toggle(); setMuted(!on); }}>{muted ? '🔇' : '🔊'}</button><button className="danger" onClick={() => { act({ type: 'houseAlarm' }); sound.alarm(); }}>⚠ Hausalarm</button><a href="/">2D</a></div></header><div className="world"><HospitalScene state={state} onPickPatient={p => setSelected(p)} onPickDepartment={d => setSelectedDepartment(d)} muted={muted} sound={sound} /><div className="legend3d"><span><i className="dot3d red" />kritisch</span><span><i className="dot3d yellow" />priorisiert</span><span><i className="dot3d green" />stabil</span><span>🩺 Personal</span></div><div className="mission"><b>LEITSTAND</b><span>{critical} kritische Patienten</span><small>{freeBeds} freie Betten · {state.players.length} Spieler online</small></div></div>{selected && <div className="drawer3d"><button className="close" onClick={() => setSelected(null)}>×</button><span>PATIENTENAKTE #{selected.id}</span><h2>{selected.name}</h2><p>{selected.age} Jahre · {selected.condition}</p><strong className={`prio ${selected.priority === 'Rot' ? 'red' : selected.priority === 'Gelb' ? 'yellow' : 'green'}`}>{selected.priority}</strong><div className="vitals3d"><b>Puls {selected.vitals.pulse}</b><b>RR {selected.vitals.systolic}/{selected.vitals.diastolic}</b><b>SpO₂ {selected.vitals.spo2}%</b><b>GCS {selected.vitals.consciousness}/15</b></div><p>{selected.notes}</p><button onClick={() => act({ type: 'treatment', patientId: selected.id, treatment: '3D-Leitstand: Behandlung dokumentiert' })}>Behandlung dokumentieren</button></div>}{selectedDepartment && <div className="drawer3d department"><button className="close" onClick={() => setSelectedDepartment(null)}>×</button><span>ABTEILUNG</span><h2>{selectedDepartment}</h2><p>Patienten: {state.patients.filter(p => p.department === selectedDepartment && p.status !== 'Entlassung').length}</p><p>Personal: {state.staff.filter(s => s.department === selectedDepartment && s.status !== 'Abwesend').length}</p><button onClick={() => act({ type: 'toggleDepartment', department: selectedDepartment, open: !(state.departments.find(d => d.name === selectedDepartment)?.open ?? true) })}>Abteilung öffnen/schließen</button></div>}{notice && <div className="notice3d">{notice}</div>}</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
