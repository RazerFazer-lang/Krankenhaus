# Krankenhaus Simulation

Eigenständige Multiplayer-Krankenhaus-Simulation. Das Projekt ist bewusst unabhängig von einer Leitstellen- oder Rettungsdienst-Spielrolle aufgebaut.

## ▶ Spiel starten

**Ohne npm auf deinem PC installieren zu müssen:**

[**🏥 Krankenhaus in GitHub Codespaces starten**](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=RazerFazer-lang%2FKrankenhaus)

Codespaces startet die vorbereitete Umgebung und stellt den Server-Port 3001 als anklickbaren Browser-Link bereit.

### 2D-Klinik

Die normale Klinikoberfläche erreichst du über `/`.

### 3D-Klinik

Die neue immersive Three.js-Version erreichst du über:

[**🎮 3D-Krankenhaus öffnen**](./3d.html)

Die 3D-Version enthält einen räumlichen Klinikgrundriss, 3D-Räume und Betten, Patienten-/Personalobjekte, Kamerasteuerung, dynamische Beleuchtung und Web-Audio-Effekte für Ereignisse, Benachrichtigungen und Hausalarm.

## Enthalten

- Serverautoritatives Echtzeit-Spiel mit Socket.IO
- Mehrere gleichzeitig verbundene Spieler mit Krankenhaus-Rollen
- Persistenter Spielzustand als JSON-Datei
- Notaufnahme und unbegrenzte Patientenliste
- Triage mit Rot/Gelb/Grün
- Patientenakten mit Vitalwerten, Bewusstsein, Schmerz, Allergien und Verlauf
- Dynamische Prognose und Verschlechterung kritischer Patienten
- Diagnostikaufträge für Labor und Radiologie
- Behandlungen und Therapiedokumentation
- Ärztliche und pflegerische Personalzuweisung
- OP-Vorbereitung, OP-Start und OP-Abschluss mit Teamprüfung
- Stationäre Aufnahme und Bettzuweisung
- Bettenzustände: frei, belegt, Reinigung, gesperrt
- Stationen: Notaufnahme, Chirurgie, Innere Medizin, Anästhesie, Intensivstation, Kardiologie, Pädiatrie, Radiologie, Labor, Apotheke und Hygiene
- Abteilungsöffnung/-schließung
- Schichtende und Personalstatus
- Aufgabenverwaltung
- Hausalarm
- Echtzeit-Ereignisprotokoll
- Krankenhaus-Dashboard mit Finanz- und Auslastungsdaten
- Interaktive 2D-Klinikoberfläche
- Immersive 3D-Klinikoberfläche
- Dynamische Web-Audio-Effekte
- TypeScript-Checks, Produktions-Build und Vitest-Regressionstests in GitHub Actions

## Lokal starten

```bash
npm install
npm run dev:full
```

Frontend: `http://localhost:5173`

Server: `http://localhost:3001`

3D: `http://localhost:5173/3d.html`

Healthcheck: `http://localhost:3001/health`

## Produktion

```bash
npm run build
npm run server
```

Der Server lädt bei Start den persistenten Spielstand aus `data/hospital-state.json` und speichert während des Spiels regelmäßig.

## Architektur

Der Server besitzt den autoritativen Zustand. Clients senden Aktionen; der Server validiert und verändert den Zustand und verteilt danach den vollständigen aktuellen Zustand an alle verbundenen Spieler. Dadurch arbeiten alle Spieler im selben Krankenhaus und können sich gegenseitig in Echtzeit sehen.
