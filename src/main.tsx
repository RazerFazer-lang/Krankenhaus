import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Priority = 'Rot' | 'Gelb' | 'Grün';
type PatientStatus = 'Wartebereich' | 'Triage' | 'Diagnostik' | 'Behandlung' | 'OP-Vorbereitung' | 'OP' | 'Stationär' | 'Entlassung';
type Department = 'Notaufnahme' | 'Chirurgie' | 'Innere Medizin' | 'Anästhesie' | 'Intensivstation' | 'Radiologie' | 'Kardiologie' | 'Pädiatrie' | 'Labor';

type Patient = {
  id: number;
  name: string;
  age: number;
  condition: string;
  priority: Priority;
  status: PatientStatus;
  department: Department;
  arrival: number;
  pulse: number;
  systolic: number;
  spo2: number;
  temperature: number;
  pain: number;
  notes: string;
  tests: string[];
};

type Staff = { id: number; name: string; role: string; department: Department; status: 'Im Dienst' | 'Behandlung' | 'OP' | 'Pause'; patient?: number };
type Bed = { id: string; department: Department; patient?: number; status: 'Frei' | 'Belegt' | 'Reinigung' };
type Task = { id: number; label: string; detail: string; done: boolean; priority: Priority };

const now = Date.now();
const initialPatients: Patient[] = [
  { id: 1042, name: 'Patient #1042', age: 67, condition: 'Akutes Koronarsyndrom', priority: 'Rot', status: 'Diagnostik', department: 'Kardiologie', arrival: now - 14 * 60000, pulse: 108, systolic: 92, spo2: 94, temperature: 37.4, pain: 8, notes: 'Druckschmerz retrosternal, seit ca. 35 Minuten. EKG dringend.', tests: ['EKG', 'Troponin'] },
  { id: 1043, name: 'Patient #1043', age: 34, condition: 'Unterarmfraktur', priority: 'Gelb', status: 'Behandlung', department: 'Chirurgie', arrival: now - 31 * 60000, pulse: 88, systolic: 128, spo2: 99, temperature: 36.8, pain: 7, notes: 'Sturz. Deformität am rechten Unterarm.', tests: ['Röntgen Unterarm'] },
  { id: 1044, name: 'Patient #1044', age: 22, condition: 'Synkope', priority: 'Grün', status: 'Wartebereich', department: 'Innere Medizin', arrival: now - 9 * 60000, pulse: 76, systolic: 119, spo2: 99, temperature: 36.7, pain: 1, notes: 'Kurzer Bewusstseinsverlust, aktuell wach und orientiert.', tests: [] },
  { id: 1045, name: 'Patient #1045', age: 6, condition: 'Fieber / Exsikkose', priority: 'Gelb', status: 'Triage', department: 'Pädiatrie', arrival: now - 6 * 60000, pulse: 132, systolic: 101, spo2: 97, temperature: 39.2, pain: 3, notes: 'Kind mit hohem Fieber und reduzierter Trinkmenge.', tests: ['Blutbild'] },
];

const initialStaff: Staff[] = [
  { id: 1, name: 'Dr. Weber', role: 'Oberarzt', department: 'Notaufnahme', status: 'Behandlung', patient: 1042 },
  { id: 2, name: 'Dr. Kaya', role: 'Assistenzarzt', department: 'Innere Medizin', status: 'Im Dienst' },
  { id: 3, name: 'Dr. Lehmann', role: 'Facharzt Chirurgie', department: 'Chirurgie', status: 'Behandlung', patient: 1043 },
  { id: 4, name: 'Dr. Santos', role: 'Anästhesist', department: 'Anästhesie', status: 'Im Dienst' },
  { id: 5, name: 'M. Fischer', role: 'Pflegefachkraft', department: 'Notaufnahme', status: 'Im Dienst' },
  { id: 6, name: 'L. Hahn', role: 'Pflegefachkraft', department: 'Intensivstation', status: 'Im Dienst' },
  { id: 7, name: 'K. Brandt', role: 'MTRA', department: 'Radiologie', status: 'Im Dienst' },
  { id: 8, name: 'J. Vogt', role: 'MTLA', department: 'Labor', status: 'Im Dienst' },
];

const initialBeds: Bed[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `NA-${i + 1}`, department: 'Notaufnahme' as Department, status: i < 4 ? 'Belegt' as const : 'Frei' as const, patient: i === 0 ? 1042 : i === 1 ? 1043 : i === 2 ? 1045 : undefined })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `INT-${i + 1}`, department: 'Innere Medizin' as Department, status: i < 6 ? 'Belegt' as const : 'Frei' as const })),
  ...Array.from({ length: 8 }, (_, i) => ({ id: `CH-${i + 1}`, department: 'Chirurgie' as Department, status: i < 4 ? 'Belegt' as const : 'Frei' as const })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `ITS-${i + 1}`, department: 'Intensivstation' as Department, status: i < 2 ? 'Belegt' as const : 'Frei' as const })),
];

const initialTasks: Task[] = [
  { id: 1, label: 'EKG bei Patient #1042 auswerten', detail: 'Kardiologie · Rot', done: false, priority: 'Rot' },
  { id: 2, label: 'Röntgen Patient #1043 prüfen', detail: 'Radiologie · Gelb', done: false, priority: 'Gelb' },
  { id: 3, label: 'Blutbild Patient #1045 anfordern', detail: 'Labor · Gelb', done: false, priority: 'Gelb' },
  { id: 4, label: 'Freies Bett für Innere Medizin reservieren', detail: 'Station · Planung', done: false, priority: 'Grün' },
];

const departments: { name: Department; type: string; capacity: number }[] = [
  { name: 'Notaufnahme', type: 'Akutversorgung', capacity: 8 },
  { name: 'Chirurgie', type: 'Station / OP', capacity: 8 },
  { name: 'Innere Medizin', type: 'Station', capacity: 10 },
  { name: 'Anästhesie', type: 'OP / Intensiv', capacity: 6 },
  { name: 'Intensivstation', type: 'Intensivmedizin', capacity: 6 },
  { name: 'Radiologie', type: 'Diagnostik', capacity: 4 },
  { name: 'Kardiologie', type: 'Herzmedizin', capacity: 6 },
  { name: 'Pädiatrie', type: 'Kinder', capacity: 6 },
  { name: 'Labor', type: 'Diagnostik', capacity: 3 },
];

const priorityOrder: Record<Priority, number> = { Rot: 0, Gelb: 1, Grün: 2 };

function clock(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function App() {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [beds, setBeds] = useState<Bed[]>(initialBeds);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selected, setSelected] = useState(1042);
  const [section, setSection] = useState('Übersicht');
  const [filter, setFilter] = useState<'Alle' | Priority>('Alle');
  const [events, setEvents] = useState<string[]>([
    '08:52 · Laborauftrag #L-381 gestartet',
    '08:50 · Patient #1045 in Triage aufgenommen',
    '08:47 · Patient #1043 zur Radiologie angekündigt',
    '08:41 · Patient #1042 benötigt sofortige kardiologische Beurteilung',
  ]);
  const [simTime, setSimTime] = useState(Date.now());
  const [message, setMessage] = useState('');

  useEffect(() => {
    const id = window.setInterval(() => setSimTime(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selected), [patients, selected]);
  const visiblePatients = useMemo(() => patients.filter(p => filter === 'Alle' || p.priority === filter).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.arrival - b.arrival), [patients, filter]);
  const freeBeds = beds.filter(b => b.status === 'Frei').length;
  const occupiedBeds = beds.filter(b => b.status === 'Belegt').length;
  const opRunning = patients.filter(p => p.status === 'OP').length;
  const critical = patients.filter(p => p.priority === 'Rot' && p.status !== 'Entlassung').length;

  function log(text: string) {
    setEvents(e => [`${clock()} · ${text}`, ...e].slice(0, 12));
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2600);
  }

  function addPatient() {
    const id = Math.max(...patients.map(p => p.id), 1041) + 1;
    const patient: Patient = { id, name: `Patient #${id}`, age: 49, condition: 'Akuter Notfall', priority: 'Gelb', status: 'Wartebereich', department: 'Notaufnahme', arrival: Date.now(), pulse: 92, systolic: 124, spo2: 98, temperature: 37.1, pain: 4, notes: 'Neu eingetroffener Patient. Anamnese ausstehend.', tests: [] };
    setPatients(p => [patient, ...p]);
    setSelected(id);
    log(`Neuer Patient #${id} in der Notaufnahme aufgenommen`);
  }

  function updateSelected(patch: Partial<Patient>, text: string) {
    if (!selectedPatient) return;
    setPatients(list => list.map(p => p.id === selectedPatient.id ? { ...p, ...patch } : p));
    log(text);
  }

  function orderTest(test: string, department: Department) {
    updateSelected({ tests: [...(selectedPatient?.tests ?? []), test], status: 'Diagnostik', department }, `${test} für ${selectedPatient?.name} angefordert`);
  }

  function admit() {
    if (!selectedPatient) return;
    const target = beds.find(b => b.status === 'Frei' && b.department === selectedPatient.department) ?? beds.find(b => b.status === 'Frei');
    if (!target) return log('Keine freien stationären Betten verfügbar');
    setBeds(list => list.map(b => b.id === target.id ? { ...b, status: 'Belegt', patient: selectedPatient.id } : b));
    updateSelected({ status: 'Stationär', department: target.department }, `${selectedPatient.name} auf ${target.department} aufgenommen · Bett ${target.id}`);
  }

  function prepareOperation() {
    if (!selectedPatient) return;
    updateSelected({ status: 'OP-Vorbereitung', department: 'Chirurgie' }, `${selectedPatient.name} für OP vorbereitet`);
    setTasks(t => [{ id: Date.now(), label: `OP-Vorbereitung ${selectedPatient.name}`, detail: 'Chirurgie / Anästhesie', done: false, priority: selectedPatient.priority }, ...t]);
  }

  function startOperation() {
    if (!selectedPatient) return;
    updateSelected({ status: 'OP', department: 'Chirurgie' }, `${selectedPatient.name}: Operation gestartet`);
    setStaff(list => list.map(s => s.role.includes('Chirurgie') || s.role === 'Anästhesist' ? { ...s, status: 'OP', patient: selectedPatient.id } : s));
  }

  function finishTreatment() {
    if (!selectedPatient) return;
    updateSelected({ status: 'Entlassung', department: 'Notaufnahme' }, `${selectedPatient.name} zur Entlassung freigegeben`);
    setBeds(list => list.map(b => b.patient === selectedPatient.id ? { ...b, patient: undefined, status: 'Reinigung' } : b));
  }

  function toggleTask(id: number) {
    const task = tasks.find(t => t.id === id);
    setTasks(list => list.map(t => t.id === id ? { ...t, done: !t.done } : t));
    if (task) log(`${task.done ? 'Aufgabe wieder geöffnet' : 'Aufgabe abgeschlossen'}: ${task.label}`);
  }

  function callStaff(role: string) {
    const free = staff.find(s => s.role.toLowerCase().includes(role.toLowerCase()) && s.status === 'Im Dienst');
    if (!free) return log(`Kein freier ${role} verfügbar`);
    setStaff(list => list.map(s => s.id === free.id ? { ...s, status: 'Behandlung', patient: selectedPatient?.id } : s));
    log(`${free.name} (${free.role}) wurde in die Behandlung gerufen`);
  }

  const pageTitle = section === 'Übersicht' ? 'Krankenhausleitstand' : section;

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand"><div className="brandmark">+</div><div><strong>KRANKENHAUS</strong><span>Hospital Simulation</span></div></div>
        <div className="topstatus"><span className="live"><i /> LIVE</span><span>{clock(simTime)}</span><span>Schicht 06:00–14:00</span><span className="player">Mehrspieler bereit · 3 Spieler</span></div>
      </header>

      <nav className="nav">
        {['Übersicht', 'Patienten', 'Stationen', 'Diagnostik', 'OP', 'Personal', 'Betten', 'Ereignisse'].map(item => <button className={section === item ? 'active' : ''} onClick={() => setSection(item)} key={item}>{item}</button>)}
      </nav>

      {message && <div className="toast">{message}</div>}

      <section className="content">
        <div className="pagehead"><div><span className="eyebrow">KRANKENHAUS · ZENTRALE</span><h1>{pageTitle}</h1><p>Personal, Patienten und Ressourcen in Echtzeit steuern.</p></div><div className="headactions"><button onClick={addPatient} className="primary">+ Notfallpatient</button><button onClick={() => log('Hausalarm ausgelöst · Alle Abteilungen informiert')}>Hausalarm</button></div></div>

        {section === 'Übersicht' && <>
          <section className="kpis">
            <Kpi label="NOTAUFNAHME" value={patients.filter(p => ['Wartebereich', 'Triage', 'Diagnostik', 'Behandlung'].includes(p.status)).length} hint="aktuelle Patienten" accent="red" />
            <Kpi label="KRITISCH" value={critical} hint="sofortige Aufmerksamkeit" accent="orange" />
            <Kpi label="BETTEN FREI" value={freeBeds} hint={`${occupiedBeds} belegt · ${beds.length} gesamt`} accent="blue" />
            <Kpi label="OP-SÄLE" value={`${opRunning}/4`} hint="Operationen laufend" accent="violet" />
            <Kpi label="PERSONAL" value={`${staff.filter(s => s.status !== 'Pause').length}/${staff.length}`} hint="aktuell im Haus" accent="green" />
          </section>

          <div className="dashboard-grid">
            <section className="panel patientpanel"><div className="paneltitle"><div><span>AKUTBEREICH</span><h2>Patientenübersicht</h2></div><div className="filters">{(['Alle', 'Rot', 'Gelb', 'Grün'] as const).map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div></div><div className="patient-table">{visiblePatients.map(p => <button key={p.id} className={`prow ${selected === p.id ? 'selected' : ''}`} onClick={() => { setSelected(p.id); setSection('Patienten'); }}><span className={`dot ${p.priority.toLowerCase()}`} /><span className="pmain"><strong>{p.name}</strong><small>{p.age} J. · {p.condition}</small></span><span className="pdept">{p.department}</span><span className="pstatus">{p.status}</span><span className="arrive">{Math.max(1, Math.floor((simTime - p.arrival) / 60000))} min</span></button>)}</div></section>
            <section className="panel"><PanelTitle title="Aufgaben" subtitle="Offene Entscheidungen" /><div className="tasklist">{tasks.map(t => <button key={t.id} className={`task ${t.done ? 'done' : ''}`} onClick={() => toggleTask(t.id)}><span className={`dot ${t.priority.toLowerCase()}`} /><span><strong>{t.label}</strong><small>{t.detail}</small></span><b>{t.done ? '✓' : '›'}</b></button>)}</div></section>
            <section className="panel"><PanelTitle title="Abteilungen" subtitle="Auslastung & Status" /><div className="departments">{departments.slice(0, 6).map(d => { const used = beds.filter(b => b.department === d.name && b.status === 'Belegt').length; const total = beds.filter(b => b.department === d.name).length || d.capacity; const percent = Math.min(100, Math.round(used / total * 100)); return <div className="dept" key={d.name}><div><strong>{d.name}</strong><span>{d.type}</span></div><div className="bar"><i style={{ width: `${percent}%` }} /></div><em>{percent}%</em></div>; })}</div></section>
            <section className="panel"><PanelTitle title="Ereignisse" subtitle="Letzte Aktivitäten" /><div className="eventlist">{events.slice(0, 7).map((e, i) => <p key={i}><i />{e}</p>)}</div></section>
          </div>
        </>}

        {section === 'Patienten' && <section className="two-col"><section className="panel"><PanelTitle title="Patientenakte" subtitle="Klinische Übersicht" />{selectedPatient && <div className="patientdetail"><div className="identity"><div className={`bigpriority ${selectedPatient.priority.toLowerCase()}`}>{selectedPatient.priority[0]}</div><div><h2>{selectedPatient.name}</h2><p>{selectedPatient.age} Jahre · {selectedPatient.condition}</p></div><span className={`badge ${selectedPatient.priority.toLowerCase()}`}>{selectedPatient.priority}</span></div><div className="vitals"><Vital n="Puls" v={`${selectedPatient.pulse}`} u="/min" /><Vital n="RR" v={`${selectedPatient.systolic}`} u="mmHg" /><Vital n="SpO₂" v={`${selectedPatient.spo2}`} u="%" /><Vital n="Temp." v={selectedPatient.temperature.toFixed(1)} u="°C" /><Vital n="Schmerz" v={`${selectedPatient.pain}`} u="/10" /></div><div className="info-grid"><Info label="Status" value={selectedPatient.status} /><Info label="Abteilung" value={selectedPatient.department} /><Info label="Aufnahme" value={`${clock(selectedPatient.arrival)} · vor ${Math.max(1, Math.floor((simTime - selectedPatient.arrival) / 60000))} min`} /><Info label="Versicherung" value="Gesetzlich" /></div><div className="notes"><span>ANAMNESE / NOTIZEN</span><p>{selectedPatient.notes}</p></div><div className="actiongrid"><button onClick={() => updateSelected({ status: 'Triage' }, `${selectedPatient.name}: Triage durchgeführt`)}>Triage</button><button onClick={() => callStaff('arzt')}>Arzt rufen</button><button onClick={() => orderTest('Labor', 'Labor')}>Labor</button><button onClick={() => orderTest('Bildgebung', 'Radiologie')}>Bildgebung</button><button onClick={prepareOperation}>OP vorbereiten</button><button onClick={startOperation} className="warning">OP starten</button><button onClick={admit} className="primary">Station aufnehmen</button><button onClick={finishTreatment}>Entlassung</button></div><div className="orders"><h3>Diagnostik & Aufträge</h3>{selectedPatient.tests.length === 0 ? <p className="muted">Noch keine Aufträge.</p> : selectedPatient.tests.map((t, i) => <div key={`${t}-${i}`}><span>{t}</span><em>angefordert · in Arbeit</em></div>)}</div></div>}</section><section className="panel"><PanelTitle title="Patientenliste" subtitle="Auswahl" />{patients.map(p => <button className={`sidepatient ${selected === p.id ? 'selected' : ''}`} key={p.id} onClick={() => setSelected(p.id)}><span className={`dot ${p.priority.toLowerCase()}`} /><div><strong>{p.name}</strong><small>{p.condition}</small></div><em>{p.status}</em></button>)}</section></section>}

        {section === 'Stationen' && <section className="cardgrid">{departments.map(d => <section className="panel station" key={d.name}><div className="station-head"><div><span>{d.type}</span><h2>{d.name}</h2></div><span className="statusdot">● offen</span></div><div className="stationstats"><div><b>{beds.filter(b => b.department === d.name && b.status === 'Belegt').length}</b><span>belegt</span></div><div><b>{beds.filter(b => b.department === d.name && b.status === 'Frei').length}</b><span>frei</span></div><div><b>{staff.filter(s => s.department === d.name).length}</b><span>Personal</span></div></div><div className="bar large"><i style={{ width: `${Math.min(100, beds.filter(b => b.department === d.name && b.status === 'Belegt').length / (beds.filter(b => b.department === d.name).length || 1) * 100)}%` }} /></div><button onClick={() => log(`${d.name}: Stationsübersicht geöffnet`)}>Öffnen</button></section>)}</section>}

        {section === 'Diagnostik' && <section className="diagnostics"><section className="panel"><PanelTitle title="Diagnostikzentrum" subtitle="Aufträge und Geräte" />{['Labor', 'Radiologie', 'EKG / Funktion', 'CT', 'MRT', 'Sonografie'].map((d, i) => <div className="diagrow" key={d}><span className="diagicon">{['L', 'R', 'E', 'C', 'M', 'S'][i]}</span><div><strong>{d}</strong><small>{i === 0 ? '3 Aufträge · 1 in Bearbeitung' : i === 1 ? '2 Aufträge · 1 Gerät frei' : 'Bereit'}</small></div><span className="greencheck">●</span><button onClick={() => log(`${d}: neuer Auftrag geöffnet`)}>Aufträge</button></div>)}</section><section className="panel"><PanelTitle title="Befunde" subtitle="Zu prüfen" />{patients.filter(p => p.tests.length).map(p => <div className="result" key={p.id}><div><strong>{p.name}</strong><small>{p.tests.join(' · ')}</small></div><button onClick={() => { setSelected(p.id); setSection('Patienten'); }}>Patientenakte</button></div>)}</section></section>}

        {section === 'OP' && <section className="opgrid">{[1, 2, 3, 4].map(n => { const p = patients.find(x => x.status === 'OP' && x.id % 4 === n - 1); return <section className="panel oroom" key={n}><div className="roomhead"><div><span>OP-Saal</span><h2>OP {n}</h2></div><span className={p ? 'statusbusy' : 'statusfree'}>{p ? 'IN BETRIEB' : 'BEREIT'}</span></div>{p ? <><div className="oppatient"><strong>{p.name}</strong><span>{p.condition}</span></div><div className="opprogress"><div className="bar large"><i style={{ width: '58%' }} /></div><span>58% · laufende Operation</span></div><button onClick={() => { setSelected(p.id); finishTreatment(); }}>OP abschließen</button></> : <div className="emptyroom">Saal frei<br /><small>Anästhesie und OP-Team verfügbar</small></div>}</section>})}</section>}

        {section === 'Personal' && <section className="two-col"><section className="panel"><PanelTitle title="Personalübersicht" subtitle="Schicht 06:00–14:00" />{staff.map(s => <div className="staffrow" key={s.id}><div className="avatar">{s.name.split(' ').map(x => x[0]).join('').slice(0,2)}</div><div><strong>{s.name}</strong><small>{s.role} · {s.department}</small></div><span className={`staffstatus ${s.status.toLowerCase().replace(' ', '-')}`}>{s.status}</span><em>{s.patient ? `#${s.patient}` : '—'}</em></div>)}</section><section className="panel"><PanelTitle title="Personalanforderung" subtitle="Interne Disposition" />{['Arzt', 'Pflegefachkraft', 'MTRA', 'MTLA', 'Anästhesist'].map(r => <button className="callrow" key={r} onClick={() => callStaff(r)}><span>+</span><div><strong>{r}</strong><small>Verfügbarkeit prüfen und anfordern</small></div><b>›</b></button>)}</section></section>}

        {section === 'Betten' && <section className="panel"><PanelTitle title="Bettenverwaltung" subtitle="Belegung, Reinigung und Verfügbarkeit" /><div className="bedstats"><Kpi label="GESAMT" value={beds.length} hint="Betten" accent="blue" /><Kpi label="BELEGT" value={occupiedBeds} hint="stationär" accent="red" /><Kpi label="FREI" value={freeBeds} hint="sofort nutzbar" accent="green" /><Kpi label="REINIGUNG" value={beds.filter(b => b.status === 'Reinigung').length} hint="Wiederaufbereitung" accent="orange" /></div><div className="bedtable">{beds.map(b => <div key={b.id} className="bedrow"><strong>{b.id}</strong><span>{b.department}</span><span className={`bedstatus ${b.status.toLowerCase()}`}>{b.status}</span><em>{b.patient ? `Patient #${b.patient}` : '—'}</em>{b.status === 'Reinigung' && <button onClick={() => { setBeds(list => list.map(x => x.id === b.id ? { ...x, status: 'Frei' } : x)); log(`Bett ${b.id} ist wieder verfügbar`); }}>Freigeben</button>}</div>)}</div></section>}

        {section === 'Ereignisse' && <section className="two-col"><section className="panel"><PanelTitle title="Ereignisprotokoll" subtitle="Server- und Klinikereignisse" />{events.concat(['08:36 · Schichtübergabe abgeschlossen', '08:30 · Station Innere Medizin meldet 4 freie Betten']).map((e, i) => <div className="logrow" key={`${e}-${i}`}><span>{e.slice(0, 5)}</span><div><strong>{e.slice(7)}</strong><small>Systemereignis · gespeichert</small></div></div>)}</section><section className="panel"><PanelTitle title="Simulation" subtitle="Aktuelle Umgebung" /><div className="simstate"><Info label="Datum" value={new Date(simTime).toLocaleDateString('de-DE')} /><Info label="Zeit" value={clock(simTime)} /><Info label="Schicht" value="Frühdienst" /><Info label="Server" value="Online · autoritativ" /><Info label="Spieler" value="3 im Krankenhaus" /><Info label="Eskalationen" value={`${critical} kritisch`} /></div><button className="danger" onClick={() => log('Test-Ereignis ausgelöst · Alle beteiligten Abteilungen erhalten Meldung')}>Test-Ereignis auslösen</button></section></section>}
      </section>
    </main>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="paneltitle"><div><span>{subtitle}</span><h2>{title}</h2></div></div>; }
function Kpi({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint: string; accent: string }) { return <div className={`kpi ${accent}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
function Vital({ n, v, u }: { n: string; v: string; u: string }) { return <div><span>{n}</span><strong>{v}</strong><small>{u}</small></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
