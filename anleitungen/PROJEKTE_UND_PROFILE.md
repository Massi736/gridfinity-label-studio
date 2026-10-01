# Projekte und Anordnungsprofile

## Ein Projekt aufbauen und später weiterbearbeiten

1. Unter „Meine Projekte“ einen Namen eingeben, z. B. „Schublade Elektrik“.
2. Darunter mit „Neues Label“, „Duplizieren“ oder der Textserie mehrere Labels hinzufügen.
3. Für jedes Label Texte, Symbol, Format, Farben, Anzahl und Anordnung einstellen.
4. „Projekt speichern“ drücken und die Speicherbestätigung abwarten.
5. Nach einem Neustart das Projekt in der Liste auswählen und „Projekt öffnen“ drücken.

Die Exportauswahl „Alle Labels“ bezieht sich immer auf das aktuell geöffnete Projekt. „Aktuelles Label“ exportiert nur das ausgewählte Label.

Beim Wechsel oder Erstellen eines neuen Projekts speichert die Anwendung ungespeicherte Änderungen am bisherigen Projekt zuerst. Scheitert das Speichern, wird der Wechsel abgebrochen und eine Fehlermeldung angezeigt. Zum Beenden immer zuerst speichern. Eine Browserwarnung schützt vor versehentlichem Schliessen mit Änderungen; sie ersetzt kein Speichern.

„Als Kopie speichern“ erstellt eine neue Projekt-ID mit den aktuellen Labels. Änderungen an der Kopie verändern das Original nicht. Einen anderen Namen kannst du vorher im Namensfeld eingeben. Gleichnamige Projekte sind möglich; eindeutige Namen erleichtern die Auswahl.

## Was wird gespeichert?

Pro Projekt werden die Label-Liste, Kopien, Texte, Farben, Format, Schraubenkonfiguration, Symbol-IDs, aktive Positions-Presets, freie Positionen, Bezugspunkte, Raster und automatische Layoutoptionen gespeichert. Verwendete selbst importierte Schriftdateien werden mitgesichert. Das Projekt darf inklusive dieser Dateien bis zu 40 MB gross sein; höchstens 100 Labelvorlagen mit je 1 bis 50 Kopien. Pro Druckexport gilt weiterhin die Begrenzung auf 200 Kopien.

Die Symbolbibliothek ist gemeinsam für alle Projekte. Geänderte SVG-Dateien verändern auch die Darstellung bereits gespeicherter Projekte, die diese Symbole verwenden. Fehlt eine Symbol-ID oder benötigte Schrift, wird das Öffnen mit einem Hinweis abgebrochen, statt Inhalte still zu ersetzen.

## Anordnungsprofile

Ein Profil ist eine wiederverwendbare Anordnung für ein einzelnes Label. Unter der Vorschau „Anordnungsprofile“ aufklappen, Namen vergeben und als neues Profil speichern. Über die Auswahl ein gespeichertes Profil anwenden. Für Änderungen an einem vorhandenen Profil „Gewähltes Profil aktualisieren“ wählen.

Enthalten sind Breite/Höhe, Rand, Text- und Symbolgrössen, Positionen, Bezugspunkt, aktive Ausrichtungen, Raster, automatische Abstände und Ausrichtungen. Textinhalt, Symbolauswahl, Schriftfamilien/-stile und Farben bleiben beim Anwenden erhalten. Die tatsächlichen Positionen aktiver Presets werden für das aktuelle Symbol erneut berechnet.

## Sicherung und Umzug

Server beenden und `daten/label-studio.sqlite3` zusammen mit der eigenen `bibliothek/` sichern. Noch einfacher: den gesamten Anwendungsordner kopieren. Die Datenbank enthält Schraubenvorlagen, Projekte und Anordnungsprofile. Die Speicherfunktion benötigt keinen Internetzugang.

Beim Update die neue Anwendung in einen neuen Ordner entpacken und `daten/` aus der bisherigen Version übernehmen. Die neuen Symbol-Dateien beibehalten; eigene Ergänzungen gezielt hinzukopieren. Neue Datenbanktabellen werden automatisch angelegt, ohne Schraubenvorlagen zu entfernen.

Wenn dasselbe Projekt in zwei Fenstern bearbeitet wird, verhindert eine Versionsprüfung das versehentliche Überschreiben eines neueren Speicherstands. Die zweite Fassung kann als Kopie gespeichert werden.
