# Krankenhaus · 3D Multiplayer Simulation

Eigenständige immersive Krankenhaus-Simulation. Das Projekt läuft ausschließlich als 3D-Spiel mit Three.js und Socket.IO.

## ▶ Spiel starten

[**🏥 Krankenhaus in GitHub Codespaces starten**](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=RazerFazer-lang%2FKrankenhaus)

Codespaces startet die vorbereitete Umgebung und stellt Port 3001 als anklickbaren Browser-Link bereit.

## 3D-Spielumfang

- immersive 3D-Klinik mit Räumen, Betten, Patienten und Personal
- Kamera mit Zoom, Pan und räumlicher Klickauswahl
- dynamische Beleuchtung, Schatten, Nebel, animierte Marker und Außenbereich
- Helipad und Klinikzufahrt
- serverautoritatives Multiplayer-Spiel mit Echtzeit-Synchronisation
- Patientenneuaufnahmen, Triage, Vitalwerte, Diagnostik, Behandlung und stationäre Aufnahme
- OP-Vorbereitung, OP-Team und OP-Ablauf
- Betten-, Stations-, Personal- und Aufgabenverwaltung
- Live-Ereignisse, kritische Patienten und Hausalarm
- prozedurales Web-Audio für Monitor, Hinweise und Alarm
- zusätzliche immersive Control-Deck-Funktionen
- Vollbild, Wettereffekt Regen und Nachtmodus
- Tastenkürzel: `N` Aufnahme, `H` Hausalarm, `M` Sound, `F` Vollbild, `R` Regen, `F8` kompakte Anzeige

## Lokal starten

```bash
npm install
npm run dev:full
```

Der Multiplayer-Server läuft auf Port 3001. Für den Produktionsstart:

```bash
npm run build
npm start
```

## Tests

GitHub Actions prüft automatisch Installation, TypeScript, Produktions-Build, Vitest und den laufenden Server inklusive `/health` und `/api/state`.
