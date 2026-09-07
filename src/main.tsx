import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Patient = {
  id: number;
  name: string;
  age: number;
  condition: string;
  priority: 'Rot' | 'Gelb' | 'Grün';
  status: string;
};

const initialPatients: Patient[] = [
  { id: 1, name: 'Patient #1042', age: 67, condition: 'Thoraxschmerz', priority: 'Rot', status: 'Aufnahme' },
  { id: 2, name: 'Patient #1043', age: 34, condition: 'Unterarmfraktur', priority: 'Gelb', status: 'Diagnostik' },
  { id: 3, name: 'Patient #1044', age: 22, condition: 'Kreislaufbeschwerden', priority: 'Grün', status: 'Wartebereich' }
];

function App() {
  const [patients, setPatients] = useState(initialPatients);
  const [selected, setSelected] = useState<number | null>(1);
  const [beds, setBeds] = useState(12);
  const [events, setEvents] = useState<string[]>(['08:41 RTW 12/83-1 an der Notaufnahme eingetroffen', '08:39 Laborauftrag #A381 gestartet']);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selected), [patients, selected]);

  function admitPatient() {
    if (!selectedPatient || beds <= 0) return;
    setBeds(v => v - 1);
    setPatients(list => list.map(p => p.id === selected ? { ...p, status: 'Stationär aufgenommen' } : p));
    setEvents(e => [`${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} ${selectedPatient.name} stationär aufgenommen`, ...e]);
  }

  function addEmergency() {
    const id = Math.max(...patients.map(p => p.id), 0) + 1;
    const patient: Patient = { id, name: `Patient #${1041 + id}`, age: 51, condition: 'Akuter Notfall', priority: 'Rot', status: 'Neu eingetroffen' };
    setPatients(list => [patient, ...list]);
    setSelected(id);
    setEvents(e => [`${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Neuer Notfallpatient eingetroffen`, ...e]);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div><strong>KRANKENHAUS</strong><span> Leitstellen-Verbund Simulation</span></div>
        <div className="online"><i /> Multiplayer bereit</div>
      </header>

      <section className="stats">
        <div><small>NOTAUFNAHME</small><b>{patients.length}</b><span>Patienten aktuell</span></div>
        <div><small>FREIE BETTEN</small><b>{beds}</b><span>stationär verfügbar</span></div>
        <div><small>PERSONAL</small><b>18 / 22</b><span>im Dienst</span></div>
        <div><small>OPERATIONEN</small><b>2</b><span>laufend</span></div>
      </section>

      <section className="layout">
        <aside className="panel patients">
          <div className="panelhead"><h2>Notaufnahme</h2><button onClick={addEmergency}>+ Notfall</button></div>
          {patients.map(p => (
            <button className={`patient ${selected === p.id ? 'selected' : ''}`} key={p.id} onClick={() => setSelected(p.id)}>
              <span className={`priority ${p.priority.toLowerCase()}`} />
              <span><strong>{p.name}</strong><small>{p.age} Jahre · {p.condition}</small></span>
              <em>{p.status}</em>
            </button>
          ))}
        </aside>

        <section className="panel detail">
          {selectedPatient ? <>
            <div className="panelhead"><div><small>PATIENTENAKTE</small><h1>{selectedPatient.name}</h1></div><span className={`badge ${selectedPatient.priority.toLowerCase()}`}>{selectedPatient.priority}</span></div>
            <div className="patientgrid">
              <div><label>Alter</label><strong>{selectedPatient.age} Jahre</strong></div>
              <div><label>Aufnahmegrund</label><strong>{selectedPatient.condition}</strong></div>
              <div><label>Status</label><strong>{selectedPatient.status}</strong></div>
              <div><label>Versicherung</label><strong>Gesetzlich</strong></div>
            </div>
            <h3>Behandlung</h3>
            <div className="actions">
              <button>Vitalwerte erfassen</button><button>Labor anfordern</button><button>Bildgebung</button><button>Arzt zuweisen</button><button onClick={admitPatient}>Station aufnehmen</button>
            </div>
          </> : <p>Patient auswählen.</p>}
        </section>

        <aside className="panel events"><div className="panelhead"><h2>Leitstellen-Log</h2></div>{events.map((e, i) => <p key={i}>{e}</p>)}<hr /><h3>Abteilungen</h3><p>Notaufnahme <b>● offen</b></p><p>Chirurgie <b>● offen</b></p><p>Radiologie <b>● offen</b></p><p>Intensivstation <b>● offen</b></p></aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
