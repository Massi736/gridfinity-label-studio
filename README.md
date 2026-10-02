# Gridfinity Label Studio – lokal

Gleiche Oberfläche wie die Online-Version, mit lokaler Symbolbibliothek und lokaler Speicherung deiner Schraubenvorlagen. 3D-Vorschau, mehrere Labels, STL/3MF/SVG/OpenSCAD, Schriftwahl pro Zeile, Spiegelung, konfigurierbare Schrauben und das Raster mit einstellbarer U-Breite sind enthalten.

## Start auf Windows

1. Das **gesamte ZIP entpacken**, beispielsweise nach `Dokumente\Gridfinity-Label-Studio-Lokal`. Nicht direkt im ZIP starten.
2. Einmalig **Python 3.10 oder neuer** installieren, falls noch nicht vorhanden. Download: https://www.python.org/downloads/windows/ – beim Installer „Add python.exe to PATH“ aktivieren.
3. **STARTEN.bat doppelklicken.** Der Browser öffnet `http://127.0.0.1:8765`.
4. Das Konsolenfenster während der Nutzung geöffnet lassen. Zum Beenden dort **Strg+C** drücken.

Empfohlen: ein aktueller Chrome-, Edge- oder Firefox-Browser mit WebGL. Auf macOS/Linux: Python 3.10+ installieren und im entpackten Ordner `sh STARTEN.sh` ausführen.

Nach Installation von Python ist **kein Internet erforderlich**. Alle Symbole, mitgelieferten Schriften und die 3D-Engine liegen im Paket. Die Quellenlinks öffnen externe Webseiten nur beim Anklicken. Keine Anmeldung, kein npm und kein Build-Schritt erforderlich.

Falls sich der Browser nicht automatisch öffnet, die angezeigte Adresse manuell öffnen. `app/index.html` nicht direkt doppelklicken: WebAssembly, Schriften und Speicherung brauchen den mitgelieferten lokalen Server. Ist Port 8765 belegt, in einem Terminal `python server/start.py --port 8766` starten. Unter Windows funktioniert alternativ `py -3 server/start.py --port 8766`.

## Ordner und Zuständigkeiten

| Ordner/Datei | Inhalt |
| --- | --- |
| `bibliothek/symbole/` | Symbole nach Funktion, jeweils eine SVG und eine kleine JSON-Datei |
| `bibliothek/kategorien.json` | Anzeigenamen und Reihenfolge der Kategorien |
| `bibliothek/schrauben/` | Einzelteile für den Schraubenkonfigurator; gemeinsame Koordinaten beibehalten |
| `anleitungen/SYMBOLBIBLIOTHEK.md` | Anleitung und Beispiel zum Bearbeiten/Ergänzen |
| `daten/label-studio.sqlite3` | Schraubenvorlagen, Anordnungsprofile und Projekte; wird beim ersten Start erzeugt |
| `app/` | Oberfläche, Layout, CAD-Exporte, Schriften und mitgelieferte Browserbibliotheken |
| `server/start.py` | Lokaler Webserver, Bibliotheksprüfung und SQLite-Speicherung |
| `BIBLIOTHEK_PRUEFEN.bat` | Prüft JSON, Kategorien, IDs und unterstützte SVG-Inhalte |

## Eigene Anpassungen

Für Symbole nur in `bibliothek/` arbeiten; Details in der Anleitung. Änderungen werden beim **Neuladen der Seite** übernommen, ohne Neustart oder Kompilierung. Vorher offene Labels exportieren: Die Label-Liste lässt sich als Projekt speichern und später wieder öffnen.

Die mitgelieferte Bibliothek enthält 145 Einträge inklusive Schraubenkonfigurator. Gleichwertige GitHub-Symbole wurden bevorzugt; zusätzliche Aderendhülsen und die übrigen Ergänzungen sind enthalten.

8 Schriftfamilien mit 26 Schnitten sind mitgeliefert. Eine eigene Arial-TTF/OTF kann über den bestehenden Schriftimport geladen werden; Arial wird aus Lizenzgründen nicht beigelegt. Verwendete importierte Schriften werden beim Speichern eines Projekts lokal mitgesichert. Ohne Projektspeicherung gelten sie nur für die aktuelle Sitzung.

## Sichern und Umziehen

Den Server beenden und den gesamten entpackten Ordner kopieren. Besonders wichtig sind `bibliothek/` und `daten/`. Auf dem neuen PC Python installieren und wieder `STARTEN.bat` verwenden. Lokal gespeicherte Schrauben bleiben auch nach dem Schliessen des Browsers und nach einem Server-Neustart erhalten. Bereits online gespeicherte Schraubenvorlagen sind nicht automatisch im lokalen Paket enthalten.

Der Server lauscht ausschliesslich auf dem eigenen PC (`127.0.0.1`). Die SQLite-Datei wird nicht als Webseite ausgeliefert.

## Entwicklung und Lizenzen

Es gibt keine gebauten Bundles: Änderungen an `app/*.js` oder `app/style.css` sind direkt aktiv. Die Originalquellen und Lizenzen sind in der Oberfläche unter „Quellen & Lizenzen“ verlinkt; ihre Texte liegen vollständig im Paket. Fremdkomponenten behalten ihre jeweiligen Lizenzen. Anpassungen dieser lokalen Fassung und eigene Symbole siehe `LIZENZEN.md`.

## Aktualisierung vom 09.09.2026

Zuschaltbare X/Y-Bemassung, konfigurierbare automatische Anordnung, einheitlicher Anschlussmassstab, angepasste Aderendhülse, Rastereinrasten für Positions-Presets, gemeinsame Mitte für mechanische Symbole und neu proportionierte Vierkantmutter. Details in `anleitungen/SYMBOLBIBLIOTHEK.md`.

**Von der bisherigen lokalen Version umziehen:** Den alten Server beenden. Das neue ZIP in einen neuen Ordner entpacken. Den bisherigen Ordner `daten/` in den neuen Anwendungsordner kopieren, um Schraubenvorlagen mitzunehmen. Eigene zusätzliche Symboldateien gezielt übernehmen; den neuen Bibliotheksordner nicht vollständig durch den alten ersetzen, sonst gehen die aktualisierten Grössenangaben verloren. Bei selbst geänderten mitgelieferten Symbolen SVG und Metadaten vergleichen.

## Lokale Version 3 – Projekte, Profile und getrennte Farben

Alle zehn Punkte dieser Erweiterung sind enthalten. Die vier geschlossenen Anschlussvarianten wurden entfernt. Die vier offenen Anschlüsse besitzen denselben Crimpbereich und sind genau wie beide Aderendhülsen 16 Quelleinheiten breit, mit gemeinsamer Bezugsgrösse 8.

**Projekte:** Oberhalb der Label-Liste einen Namen vergeben und „Projekt speichern“ wählen. „Neues Projekt“ startet eine eigene Label-Sammlung. Über die Liste und „Projekt öffnen“ weiterarbeiten. Beim Wechsel werden ungespeicherte Änderungen zuerst gespeichert; bei einem Speicherfehler bleibt das aktuelle Projekt geöffnet. „Als Kopie speichern“ legt eine unabhängige Kopie an. Vor dem Schliessen speichern; der Browser weist auf ungespeicherte Änderungen hin. Kein zeitgesteuertes Autospeichern während der Bearbeitung.

**Anordnungsprofile:** In der Vorschau „Anordnungsprofile“ öffnen, Namen vergeben und „Als neues Profil speichern“ wählen. Ein Profil kann später angewendet oder ausdrücklich aktualisiert werden. Es speichert Format, Grössen, Positionen, aktive Presets, Bezugspunkt, Ausrichtung, Zeichen- und Zeilenabstände sowie Rastereinstellungen. Texte, Symbolauswahl, Schriftfamilien/-stile und Farben werden beim Anwenden nicht ersetzt. Profile sind projektübergreifend verfügbar.

**Farben:** Jede Textzeile hat eine eigene Farbauswahl; unter „Symbol & Farbe“ wird die Symbolfarbe gewählt. 2D, 3D, SVG und 3MF berücksichtigen die getrennten Farben. Mehrfarbige STL-Ausgaben enthalten separate Teile als ZIP, denn STL selbst speichert keine Farben. Alle Teile eines Labels im Slicer gemeinsam importieren. Bei vertieften Labels wird Material ausgeschnitten; die Vertiefung erhält kein separates Farbteil.

Weitere Details: `anleitungen/PROJEKTE_UND_PROFILE.md`. Die Datenbank wird beim ersten Start automatisch um die neuen Tabellen ergänzt. Bereits gespeicherte Schrauben bleiben erhalten. Den alten Server vor dem Kopieren von `daten/` beenden.


## 2D-Zoom und gemeinsame Projektübersicht

Die 2D-Vorschau lässt sich mit dem Mausrad oder den Plus-/Minus-Tasten zoomen (50–800 %). Am Hintergrund ziehen verschiebt die Ansicht; mit ↺ oder einem Doppelklick auf den Hintergrund wird sie zurückgesetzt. Im Rastermodus bleiben die Label-Elemente direkt verschiebbar, auch bei vergrösserter Ansicht. Der Zoom verändert nur die Ansicht, nicht die Abmessungen oder Exporte.

«Projekte & Labels» vereint Projektverwaltung und Label-Liste. Unter «Schraube konfigurieren» sind die gespeicherten Vorlagen und der Speichern-Knopf bündig mit den übrigen Eingaben.


## Profile direkt auswählen, Projekte ordnen und Farbkästchen

Unter **Anordnung** stehen neben «Automatisch» und «Frei am Raster» jetzt auch deine gespeicherten Profile. Das Profil wird beim Auswählen angewendet. Für ein eigenes Profil die Anordnung einstellen, «Anordnung als Profil speichern» aufklappen, einen Namen eingeben und speichern. Änderungen an einem ausgewählten Profil werden als «angepasst» angezeigt; mit «Profil überschreiben» aktualisierst du es ausdrücklich. Texte, Symbolauswahl, Schriftfamilien und Farben bleiben beim Anwenden erhalten.

In **Projekte & Labels** kannst du Ordner und Unterordner anlegen. Die Pfadleiste navigiert zurück zu übergeordneten Ordnern; darunter erscheinen Unterordner und die Projekte des aktuellen Ordners. Mit **Speicherordner** und «Projekt speichern» lässt sich ein neues oder bestehendes Projekt in einen beliebigen Ordner ablegen bzw. verschieben. Bereits gespeicherte Projekte liegen zunächst im Hauptordner. Alle Ordner bleiben zusammen mit den Projekten in `daten/label-studio.sqlite3` erhalten.

Alle vier Farbauswahlen öffnen eine Palette mit **Designfarben**, **Standardfarben** und **zuletzt verwendeten Farben**. Ein Klick auf ein Farbkästchen übernimmt die Farbe. Eigene Farben lassen sich als HEX-Code eingeben; die Pfeiltasten wechseln zwischen Kästchen und Escape schliesst die Palette. Gespeicherte Projekte behalten ihre bisherigen Farben.

Entwicklungsprüfungen: `python -m unittest discover -s tests -v` und `node --test tests/profiles-and-colors.test.mjs`.


## Explorer, Löschen und geschützte Profile

Die Projektübersicht besitzt jetzt einen aufklappbaren **Ordnerbaum** links und eine **Dateiliste** mit Name, Typ und Änderungsdatum rechts. Einfach anklicken wählt einen Eintrag aus; Doppelklick oder Enter öffnet einen Ordner bzw. ein Projekt. Mit ↑ oder der Pfadleiste wechselst du zum übergeordneten Ordner.

Ein ausgewähltes Projekt lässt sich mit **Projekt löschen** entfernen. Beim Löschen des aktuell geöffneten Projekts wird nach Bestätigung ein leeres neues Projekt angezeigt; ungespeicherte Änderungen dieses Projekts werden verworfen. Andere Projekte und Ordner bleiben erhalten. Ein eigenes Anordnungsprofil wählst du zuerst unter «Anordnung» aus und löschst es unter «Anordnung als Profil speichern» mit **Profil löschen**. Das Löschen eines Profils verändert keine gespeicherten Labels. Löschvorgänge werden bestätigt und prüfen die Speicherversion, damit Änderungen aus anderen Fenstern nicht unbemerkt verloren gehen.

Eigene Profile werden zunächst **ohne Raster und Positionsgriffe** angezeigt. Positions-, Grössen- und Symboländerungen sind gesperrt; Texte und Farben bleiben bearbeitbar. **Profil bearbeiten** entsperrt die Anordnung. Bei einem freien Rasterprofil öffnet sich dabei die 2D-Ansicht. Mit **Profil speichern** aktualisierst du das Profil und beendest den Bearbeitungsmodus. «Bearbeitung beenden» sperrt die aktuelle Anordnung ohne automatisches Überschreiben des gespeicherten Profils.

Alle JavaScript-Prüfungen: `node --test tests/*.test.mjs`.


### Wenn ein gelöschter Eintrag sichtbar bleibt

Nach einer bestätigten Löschantwort entfernt die Oberfläche den Eintrag sofort aus ihrer Liste. Das anschliessende Zurücksetzen der Label-Ansicht kann den gelöschten Eintrag nicht wieder sichtbar machen. API-Anfragen verwenden keine zwischengespeicherten Antworten.

Wenn nach einem Update noch der alte Python-Server läuft, erscheint ein Hinweis: Das STARTEN-Konsolenfenster mit **Strg+C** beenden und anschliessend **STARTEN.bat** bzw. **STARTEN.sh** erneut starten. Nur die Browserseite neu zu laden aktualisiert den laufenden Python-Server nicht.
