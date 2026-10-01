# Die Symbolbibliothek bearbeiten

## Bestehendes Symbol ändern

1. Den passenden Funktionsordner unter `bibliothek/symbole/` öffnen.
2. Die SVG beispielsweise mit Inkscape bearbeiten. Die gleichnamige JSON enthält den Namen, Suchbegriffe und die Kategorie.
3. Als einfache SVG speichern. Texte, Klone und Linienkonturen vorher in echte, gefüllte Pfade umwandeln. Keine Hintergrundfläche hinzufügen.
4. `BIBLIOTHEK_PRUEFEN.bat` starten und anschliessend die Browserseite neu laden.

Ein Symbol wird aus derselben SVG für Bibliothek, Label, Spiegelung und 3D-Export erzeugt. Die sichtbaren Konturen werden beim Platzieren automatisch auf ihren linken und oberen Rand normalisiert; leere Ränder im SVG verschieben die Ausrichtung nicht. Elektrische Anschlusskarten beginnen links bündig. Mechanische Symbole werden um ihre Mitte ausgerichtet. `referenceHeight` legt den gemeinsamen Massstab fest; dadurch bleibt ein identischer Anschlussbereich gleich gross, auch wenn der übrige Umriss unterschiedlich hoch ist.

## Neues Symbol ergänzen

Eine bestehende JSON und SVG kopieren oder folgende zwei Dateien anlegen, z. B. in `bibliothek/symbole/connectors/`.

**mein-stecker.json**

```json
{
  "id": "eigen-mein-stecker",
  "name": "Mein Stecker",
  "category": "connectors",
  "keywords": "Stecker Anschluss connector",
  "source": "Eigene Zeichnung",
  "order": 1000,
  "enabled": true,
  "svg": "mein-stecker.svg"
}
```

**mein-stecker.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">
  <path fill="black" fill-rule="evenodd"
        d="M0 1 H12 V9 H0 Z M2 3 H10 V7 H2 Z"/>
  <path fill="black" d="M12 2 H20 V4 H12 Z M12 6 H20 V8 H12 Z"/>
</svg>
```

Danach prüfen und die Seite neu laden. Neue Dateien werden automatisch gefunden; kein Import im JavaScript nötig.

| Feld | Bedeutung |
| --- | --- |
| `id` | Eindeutig und dauerhaft; Buchstaben, Ziffern, Bindestrich oder Unterstrich. Beim Kopieren unbedingt ändern. |
| `name` | Anzeigename in der Bibliothek |
| `category` | Kategorie-ID aus `kategorien.json`; `all` ist nur der Gesamtfilter |
| `keywords` | Weitere Suchwörter, als Text |
| `source` | Herkunft/Lizenzhinweis; erscheint im Tooltip |
| `order` | Kleine Zahlen werden zuerst angezeigt; bei Gleichstand alphabetisch |
| `enabled` | `false` blendet das Symbol aus, ohne die Dateien zu löschen |
| `svg` | Relativer Pfad zur SVG; am einfachsten im selben Ordner |

## SVG-Regeln für verlässliche Druckkonturen

- Gefüllte Pfade verwenden. Unterstützt sind auch Rechtecke, Kreise, Ellipsen und Polygone; Gruppen und Transformationen sind möglich.
- **Alle Ausschnitte nach Even-odd-Prinzip gestalten:** überlappende Unterpfade innerhalb desselben Pfads wechseln zwischen Material und Loch. Für separate, sich überlappende Flächen separate Pfade benutzen.
- Die SVG-Farbe ist unerheblich: Die Farbe wird im Label Studio eingestellt. Ein weisser Pfad ist deshalb **kein Loch**. Ausschnitte als Unterpfade anlegen (wie im Beispiel).
- Keine Texte, Bilder, CSS-Stylesheets, Filter, Masken, Verläufe oder Klone. In Inkscape „Objekt in Pfad“ und „Kontur in Pfad“ verwenden und als „Einfaches SVG“ speichern. Unbenutzte Definitionen/Metadaten bei Bedarf entfernen.
- Pfade schliessen. Selbstüberschneidungen, Nullflächen und extrem feine Details vermeiden. Kurven werden für CAD in Polygone angenähert.
- Maximal 5 MB pro SVG. Im Zweifel zuerst ein einfaches Symbol testen.

Die Prüfung zeigt bei fehlerhaftem JSON, doppelten IDs, unbekannten Kategorien oder nicht unterstützten SVG-Elementen den Dateinamen. Die Browser-Ladeanzeige meldet ebenfalls Fehler. Ein geometrisch ungeeigneter Pfad kann erst beim CAD-Export auffallen: Ein Probeexport und Sichtkontrolle im Slicer gehören zu einer neuen Zeichnung.

## Kategorien ändern

`bibliothek/kategorien.json` ist eine geordnete Liste aus `id` und `name`. Die Reihenfolge entspricht dem Filtermenü. Einen neuen Eintrag hinzufügen, einen Ordner anlegen und die neue ID in den betreffenden Symbol-JSONs als `category` setzen. Die Zuordnung erfolgt über dieses Feld, nicht automatisch über den Ordnernamen. `all` immer beibehalten. IDs bereits genutzter Kategorien nur ändern, wenn die betroffenen Symbole mit angepasst werden.

## Schraubenkonfigurator

`fasteners/mw-fastener.json` aktiviert den Konfigurator. Diese ID beibehalten. Die Konturen in `bibliothek/schrauben/` liegen absichtlich in einem gemeinsamen Koordinatensystem:

- `head-*`: Kopf und Flansch
- `shaft-*`: Schaft und Gewinde
- `driver-*`: Antrieb im Kopf
- `face-*`: separat rechts angezeigter Antrieb aus GitHub

Diese JSON-Dateien enthalten `contours`, also Listen von `[x,y]`-Punkten, teilweise zusätzliche Quelldaten. Bestehende Teile nicht einzeln auf einen neuen Ursprung verschieben: Kopf, Schaft und Antrieb müssen zusammenpassen. Änderungen an diesen Dateien gelten für alle damit konfigurierten Schrauben. Neue Auswahloptionen brauchen zusätzlich Anpassungen an `app/index.html`, `app/screw-config.js`, `app/geometry.js` und `server/start.py`. Für alltägliche neue Symbolzeichnungen die SVG-Bibliothek verwenden.

## Technischer Überblick

`server/start.py` liest Metadaten und SVGs bei jedem `/api/library`-Aufruf. `app/symbol-library.js` wandelt SVG-Pfade mit dem mitgelieferten Three.js-SVGLoader in Konturen um. `app/geometry.js` übernimmt Ausrichtung, Spiegelung, Text und SCAD; `app/mesh.js` und die Worker erzeugen die Druckdateien. Keine Online-Abhängigkeiten oder Build-Werkzeuge nötig.

## Gemeinsamer Massstab und Bezugspunkt (lokale Version 2)

- `referenceHeight`: Bezugsgrösse in SVG-Koordinaten. Die eingestellte Symbolgrösse in mm wird auf diesen Wert abgebildet. Elektrische Anschlüsse verwenden gemeinsam `8`. Dieses Feld nicht automatisch an die jeweilige Gesamthöhe anpassen: Sonst werden gemeinsame Anschlussbereiche wieder unterschiedlich gross.
- `alignment`: `left` für elektrische Anschlüsse und normale Symbole, `center` für mechanische Symbole. Die Bibliotheksausrichtung bestimmt die Darstellung in den Auswahlkarten und die automatische Anordnung. Im freien Editor ist der X-Bezug separat als linke Kante, Mitte oder rechte Kante wählbar; Y bezieht sich bei Symbolen auf die halbe Höhe.
- X/Y werden immer vom oberen linken Labelrand gemessen, nicht vom eingestellten Sicherheitsrand. Die zuschaltbare Bemassung markiert Ursprung und Bezugspunkt.
- Die Vierkantmutter hat dieselbe Schlüsselweite und denselben Bohrungsdurchmesser wie die Sechskantmutter in der symbolischen Darstellung. Dies ist keine massstäbliche Normteilzeichnung.
- Die isolierte Aderendhülse verwendet 16 × 6,4 Quelleinheiten und denselben Bezugswert 8 wie die geschlossenen Anschlüsse.

## Automatisches Layout und Raster

Im automatischen Modus lassen sich Symbol–Text-Abstand, Zeilenabstand sowie vertikale Position von Textblock und Symbol einstellen. Textausrichtung und Symbolseite bleiben in den bisherigen Einstellungen verfügbar. Bei Platzmangel werden Texte weiterhin passend verkleinert.

Im freien Modus rasten Ziehen, Koordinateneingabe, Pfeiltasten und Positions-Presets am Raster ein, sofern die Option aktiviert ist. Bei mechanischen Symbolen rastet die Mitte ein. Eine Rand- oder Mittelposition kann dadurch um bis zu einen Rasterschritt versetzt sein; exakte Rand- oder Mittellage erhältst du durch Ausschalten des Einrastens. Nur Rasterpunkte, bei denen das Element vollständig auf dem Label bleibt, sind zulässig.

Die Bemassung und das Raster sind reine 2D-Hilfen. SVG, STL, 3MF und OpenSCAD enthalten nur das Label. Im automatischen Modus kannst du bei eingeschalteter Bemassung das gemessene Element auswählen; die Koordinaten sind dort schreibgeschützt.

## Aktualisierte Anschlussfamilie (Version 3)

Die sechs elektrischen Symbole – vier offene Anschlüsse und zwei Aderendhülsen – sind alle exakt 16 Quelleinheiten breit. Die Bezugsgrösse bleibt bei allen 8. Ihre tatsächliche Breite im Label ist damit bei gleicher Symbolgrösse identisch (sofern sie wegen Platzmangels nicht zusätzlich verkleinert werden).

Die erste Pfaddefinition der vier offenen Anschluss-SVGs ist absichtlich exakt gleich: der gemeinsame linke Crimpbereich. Unterschiede gehören nur in die zweite Pfaddefinition rechts. Die Aderendhülsen verwenden denselben Aussenumriss und denselben Hülsenbereich; bei der unisolierten Variante ist auch der linke Bereich hohl dargestellt. Die geschlossenen Anschlussvarianten sind entfernt.

Aktive Positions-Presets bleiben pro Element und Label gespeichert. Je ein horizontales und ein vertikales Preset können gleichzeitig aktiv sein. Beim Wechsel des Symbols, Ändern der Grösse oder Labelbreite berechnet sich die Position erneut. Erneutes Anklicken deaktiviert die jeweilige Bindung; Ziehen, Pfeiltasten und direkte Koordinateneingabe lösen die Bindungen des Elements. Das Raster wird weiterhin berücksichtigt.

„Anordnung auf Standard zurücksetzen“ setzt den automatischen Freiraum auf 1,2 mm, den Zeilenabstand auf 0,9 mm, Textblock und Symbol vertikal auf Mitte, Symbolseite auf rechts, Textausrichtung auf links und Rand auf 1,2 mm. Texte, Schriften, Farben und Labelabmessungen bleiben erhalten.

Der „Freiraum zwischen Symbol- und Textbereich“ ist die reservierte Lücke zwischen diesen Layoutbereichen. Bei zentriertem oder rechtsbündigem Text kann der sichtbare Abstand bis zum ersten Buchstaben grösser sein.
