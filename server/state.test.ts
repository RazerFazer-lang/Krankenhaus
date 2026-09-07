import { describe, expect, it } from 'vitest';
import { applyAction, getState, tick } from './state';

describe('Krankenhaus-Simulation', () => {
  it('hat eine initiale Patienten- und Bettenstruktur', () => {
    const state = getState();
    expect(state.patients.length).toBeGreaterThanOrEqual(4);
    expect(state.beds.length).toBeGreaterThan(30);
    expect(state.departments.length).toBeGreaterThan(5);
  });

  it('nimmt einen neuen Patienten serverseitig auf', () => {
    const before = getState().patients.length;
    applyAction({ type: 'createPatient' });
    expect(getState().patients.length).toBe(before + 1);
  });

  it('ändert die Triage eines vorhandenen Patienten', () => {
    const p = getState().patients[0];
    applyAction({ type: 'triage', patientId: p.id, priority: 'Rot' });
    expect(getState().patients.find(x => x.id === p.id)?.priority).toBe('Rot');
  });

  it('entwickelt kritische Patienten bei Zeitfortschritt weiter', () => {
    const p = getState().patients[0];
    p.priority = 'Rot';
    p.status = 'Diagnostik';
    const before = p.prognosis;
    tick(60_000);
    expect(getState().patients.find(x => x.id === p.id)?.prognosis ?? before).toBeLessThanOrEqual(before);
  });

  it('verhindert eine OP ohne Vorbereitung bzw. Team', () => {
    const p = getState().patients[1];
    expect(() => applyAction({ type: 'startOperation', patientId: p.id })).toThrow();
  });
});
