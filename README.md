# Krankenhaus

Eigenständige Multiplayer-Krankenhaus-Simulation. Die Krankenhauslogik wird zunächst vollständig separat entwickelt; eine Anbindung an eine Leitstelle oder ein externes Rettungsdienst-Spiel ist **nicht Bestandteil der aktuellen Entwicklung**.

## Aktueller Stand

Die Web-App enthält bereits einen spielbaren Krankenhausleitstand mit:

- zentralem Krankenhaus-Dashboard
- Notaufnahme und Patientenübersicht
- Triage mit Rot/Gelb/Grün
- Patientenakte mit Vitalwerten, Anamnese und klinischem Status
- Behandlungs- und Dispositionsaktionen
- Diagnostikaufträge für Labor, Radiologie, EKG, CT, MRT und Sonografie
- Patientenaufnahme und stationärer Bettendisposition
- OP-Vorbereitung, laufenden Operationen und OP-Abschluss
- Stationen für Notaufnahme, Chirurgie, Innere Medizin, Anästhesie, Intensivstation, Radiologie, Kardiologie, Pädiatrie und Labor
- Personalübersicht mit Ärzten, Pflege, MTRA, MTLA und Anästhesie
- Personalanforderung innerhalb des Krankenhauses
- zentrale Bettenverwaltung mit frei/belegt/Reinigung
- Aufgabenliste und interne Prioritäten
- Ereignis- und Simulationsprotokoll
- laufende Uhr und Schichtdarstellung
- responsive Oberfläche für Desktop und kleinere Displays

## Geplante Krankenhaus-Simulation

Die nächsten Ausbaustufen bleiben vollständig auf das Krankenhaus konzentriert:

1. serverseitig autoritative Multiplayer-Simulation für mehrere Krankenhausspieler
2. Rollen und Berechtigungen innerhalb des Krankenhauses, z. B. Ärztlicher Dienst, Pflege, Leitung/Disposition und Diagnostik
3. echte Echtzeit-Synchronisation zwischen Spielern
4. persistente Patienten-, Personal-, Bett- und Stationszustände
5. realistischere Krankheitsbilder, Diagnostik, Behandlungspfade und Verschlechterungen
6. Stations- und Zimmerlogik mit Betten, Isolation, Reinigung und Verlegung
7. OP-Planung mit Saal, Team, Anästhesie und Operationsfortschritt
8. Personalplanung, Qualifikationen, Pausen, Ausfälle und Arbeitsbelastung
9. Ressourcen wie Medikamente, Blutprodukte, Verbrauchsmaterial und Geräte
10. innerklinische Notfälle, Reanimationen, Brände, technische Störungen und Massenanfall im Krankenhaus
11. Aufnahmen, Entlassungen und innerklinische Transporte
12. Statistik, Wirtschaft, Qualität, Auslastung und Tages-/Schichtauswertung

## Bewusste Abgrenzung

Keine Leitstellen-Spielerrolle, kein externer Leitstellen-Workflow und keine Abhängigkeit vom Leitstellen-Verbund in dieser Phase. Das Krankenhaus soll zuerst als eigenständiges, funktionierendes Multiplayer-Spiel stehen.

## Technische Basis

- React
- Vite
- TypeScript

Der aktuelle Git-Stand ist ein Frontend-Simulationskern. Netzwerk- und persistente Serverlogik werden als nächste technische Ausbaustufe ergänzt und sind noch nicht als fertig produktiv getestet.
