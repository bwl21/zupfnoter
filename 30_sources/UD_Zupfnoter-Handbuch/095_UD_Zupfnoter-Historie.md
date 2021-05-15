\cleardoublepage

# Änderungsgeschichte

## V 1.15 Mai 2021

### Erweiterung

-   Menüanordnung umgstellt
-   Dekorationen \#30
-   experimnteller Harmonieassistent \#298
-   Help Menu hat nun einen Link auf die Support-Seit
-   upgrade to abc2svg - besseree Untersützung des ABC standards
-   Flußlilninen können nun unterbrochen werden durch !breath!, and bar
    types `||` `|]` \#301
-   Mehr details in Zählmarken bei punktierten Noten \#297
-   Fehlermeldungen verbessert
-   verbesserte Behnanldung von Duplikaten in Filename\_zusatz
-   verbesserte Behnaldung von tempo
-   verbesserte Erkennung fehlender Tonartmodi

### fix

-   Behoben: Absturz wenn eine einzelne Note wiederholt wird
-   Behoben: Absturz bei klick auf elemente, die nicht in ABC vorkommen
    (z.B. Debug-Grid)
-   Behoben: Absturz "M:" \#300
-   Behoben: Absturz Editor, wenn kein Harfennoten erzeugt werden
    konnten
-   Behoben: font color

## V 1.14 Februar 2021

### fix

-   refine alignment of stringnames \#281
-   Problem with bars within measures with repeat variant ending offbeat
    \#284
-   filter mor unicdoce characters \#292
-   sharp chord symbols like F\# now work in transposed pieces \#295
-   now we can control the style of title \#294

## V 1.13 Dezember 2019

### fix

-   Ausrichtung von Saitennamen verfeinert \#281

### enhancement

-   Harfenvorschau kann unn auch PDF anzeigen \#281
-   Taktnummern, Zählmarken, Anmerkungen unterbrechen nun Flusslinen
    \#279
-   experimenteller Packer Nr. 3
-   Unterstützung für Akkordzither und beliebig gestimmte
    Instrumente\#289
-   Liedtexte an Zählnummern anfügen \#290
-   Weitere Bearbeitung von Akkorden im ABC-Code
-   "Offene" Sprunglinien \#285
-   PDF-Tab in Harfenvorschau \#281

## V 1.12 August 2019

### Fehlerbehebung

-   Verarbeitung unsichtbarer Pausen in Unterflusslinien korrigiert
    \#265
-   Fehlermeldung in der Konsole wen unsichtbare Noten gespielt werden
    \#262
-   Probleme mit Grafiken \#278

### Erweiterung

-   beliebig vile Auszüge \#268
-   Konfiguration von Legende und Liedtexten verbessert
-   Unterstützung für offene Sprunglinien \#268
-   Mehrklänge können refaktoriert werden \#272
-   Unterflusslinien können nun auch bearbeitet werden \#276
-   Sichtbarkeit von Überbindungen verbessert \#276
-   Taktzahlen, Zählmarken und notenbezogene Anmerkungen haben nun einen
    weißen Hintergrund \#279
-   Beschriftung von Abschntten und standardmässig fett gedruckt \#280

### Kompatibilität

-   keine Standardkonfiguration für auszug 1 .. auszug 5

## V 1.11 18.4.2019

### fix

-   Meldung "Cannot read property '\$first' of undefined" behoben \#251
-   Dialog für "Zusätze" schliesst nun wieder \#249
-   Hilfsemlodielienen sind nun gestrichelt mit 1.5mm,
    Synchronistaionslienien mit 3mm \#247
-   Bei "aufwärs spielen" und "notenhälse" wird nun die korrekte
    Zeichenfläche benutzt \#257
-   editconf extract.0.lyrics.1.pos bringt keine Fehlermeldung mehr
    \#256
-   Warunung wenn die Taktarkt innerhalb eines Taktes geändert wird
    \#217

### enhancement

-   Menü für die bisher benutzten Dropbox-Pfade in der Statuszeile \#252
-   Ein- / Aufklappen von Abschnitten in der Konfigurationsmaske \#254
-   Kompaktere Darstellung der Konfigurationsmaske \#254
-   Anzeige der jspdf version \#241
-   Ausrichtung (linksbündig, rechtsbündig) für Titel und Beschriftungen
    \#237
-   Platzhalter {{current\_year}} \#223
-   In der Konfigurationsmaske kann man nun suchen\# 248
-   Weitere Verbesserung der Platzierung von Taknummer/Zählmarken \#226
-   Unterstützung von Darteivorlagen \#253
-   Menü verkleinert, Zurpnoger-Versionanzeige nun hinter einer kleinen
    Home-Taste verborgen \#253

## V.1.10 Nov 2018

### fix

-   Pausen in n-tolen \#240
-   "Abschnitt in allen Stimmen auswählen" funktionier tauch mit
    Ziernoten im ABC\#243
-   mehr Sonderzeichen ersetzt (z.b. aus Word) \#238
-   XML-Import funktioniert nun auch wenn keine Vorlage definiert ist
    \#239

### enhancement

-   BWC: Taktnummern und Zählmarken können nun an der Notenmitte
    ausgerichtet werden \#237
-   Performance: Notenvorschau und Harfennvorschau können nun im
    Hintergrund gerechnet werden \#241
-   Einige Menü-Einträge von "Extras" in die Statusleiste unten verlegt
    \#242
-   Dialog "Es gibt neue Informationen" verbessert \#244

### Kompatibilität

-   "Konfig. bearb." / "Taknummern und Zählmarken" , Schnelleinstellung
    "an der Mitte der Note verankern"

## V 1.9.2

### Fehlerbehbungen

-   Sichtbarkeit von punktierungen verbessert \#224
-   Position von Liedtexten nun gleich in Vorschau bzw. Ausdruck \#235
-   Notenvorschau wurde zu oft berechnet \#223
-   Verbesserung beim Umschalten von Ansichten \#230
-   Bessere Darstellung der Konfigurationsbuttons in chrome / firefox
-   Geschwindikgeitsverbesserungen \#225

### Erweiterungen

-   die zu speichenden Dateien können nun eingestellt werden
    (seaveformat) \#229
-   Konfiguration von Beschriftungen verbessert \#227
-   Wiederholungszeichen können individuell konfiguriert werden \#232
-   Aktuelles Template wird beim import einer xml-Datei angewandt
-   Parameter können nun von und nach Auzug 0 kopiert werden \#228

### experimental

-   modify configuration when generating pdf with cli - eg. for
    watermark \#231

### Kompatibilität

-   BWC Position und Größe von Liedtexten könnte sich geringfügig ändern
    \#235

## v.1.9.1

internal release

## v 1.9.0

### Fehlerbehebungen

-   Taktstrich bei Wiederholungsgrenzen innerhalb eines Takts sind nun
    unterdrückt \#216

### Erweiterungen

-   Sprunglinien für Variationen können einzeln konfiguriert werden
    \#215
-   Voreinstellung für Basis von Taktnummernpoistionen verändert
    ap\_base \#218
-   Anzeige der klingenden Töne für einen Zeitpunkt in der Statusleiste
    \#220
-   Sprunglinien können per Konfiguration unterdrückt werden (Pos: 0)
    \#222
-   automaitsches Scrollen kann abgeschaltet werden \#221
-   Platzhalter in Seitenbeschriftungen, so dass manche Werte nicht
    mehrfach eingegeben werden müssen \#223

### Kompatibilität

-   Voreinstellung für Basis von Taktnummernpoistionen verändert
    ap\_base \#218
-   Konfiguration der Sprunglinien für Variationen wird von führeren
    Zupfnoter-Versionen nicht erkannt

## v 1.8

### Fehlerbehebungen

-   Druckvorschau löscht nicht mehr die Nicht-Speicherungsanzeige \#176
-   Update auf abc2svg 1.14
    -   Absturz bei fehlerhafter Transponierung
    -   fehlerhafte Tonhöhen bei überbundenen Noten in Wiederholung
    -   Vorzeichen nicht korrekt gelöscht am Taktende
-   verbessertes Fermatensymbol in pdf \#178
-   Absturz, wenn die Konfiguration auf eine nicht vorhandene Stimme
    verweist \#179
-   verbesserte Lokalisierung \#182
-   Fehlerfenster hat jetzt eine ok-Taste \#183
-   verbesserte Meldung "kein ABC gefunden" \#184
-   Verbesserte Fehlerberichterstattung im Kontext der Dropbox \#185
-   Absturz bei fehlerhaftem K-Header \#172
-   Verbesserung der Importe von Xml mit nicht spielbaren Teilen \#187
-   fixed "blues with accidentals" \#188
-   Korrektur der Behandlung von Fingerabdrücken mit abc2svg 1.15.5
    \#195
-   vertaal ist nicht mehr begrenzt durch :\|\[ \#192
-   Größe des Auswahlbereichs verkleinern, um Überschneidungen mit
    Barnummer etc. zu vermeiden \#197
-   verbesserter Spieler \#210

### Erweiterungen

-   linear arbeitenden packer \#194
-   Menü zum Importieren von der lokalen Platte \#177\
-   Unterstützung für 25saitige Bassharfe \#180
-   Angabe =Dauer am Takt wird entfernt "M:3/4 4/4 4/4 =3/4" \#181
-   Unterstützung bei der Arbeit mit Dateivorlagen \#71
-   Kein initiales Rendern nach einem Absturz in der vorherigen Sitzung
    \#103
-   anderer Spieler, mit gesampelten Sounds \#126
-   der neue Spieler kann auch mit Wiederholungen und Varianten spielen
    \#126
-   Auswahl (rot) und gespielte Noten (blau) unterschiedlich
    hervorgehoben \#126
-   Verbessertes Umschalten der Wiedergabetaste \#126
-   Widergabegeschwindigkeit einstellbar \#126
-   umgestaltetes Layout-Formular \#189
-   Warnung bei nicht unterstütztem Browser \#186
-   BWC: Layout von Taktnummern und Zählmarken verbessert \#199
    -   Taktnummern weiter weg von der Note
    -   neue Algorithmus berücksichtigt den Verlauf der Flusslinie
-   Name einiger Layout-Schnelleinstellungen geändert \#196
-   Selektion auf alle Stimmen erweiterbar, um Takte im gesamten Stück
    zu löschen/einzufügen. \#202
-   Symbolleiste im linken Bereich neu angeordnet \#202
-   Unterstützung der Variation innerhalb des Taktes ohne Taktstrich
    \#204
-   Das Config-Formular zeigt nun an, ob es spezifisch für eine
    bestimmten Auszug ist \#189
-   Unterstützung von Undo/Redo für Config \#201
-   verbesserte Shortcuts (z.B. cmd-L zum Umschalten des Vollbilds,
    cmd-0 für Auszug 0)

### Experimentelles

-   weitere diatonische Instrumente (z.B. OKON-Harfe) \#196
-   Layout von unten nach oben \#196
-   Notendarstellung mit Fähnchen \#196
-   Noten in der aktuellen Auswahl zur Harmonisierung anzeigen \#190
-   heuristische Erkennung von Überschneidungen von Anmerkungen \#200
-   Unterstützung für Illustrationen \#198
-   Menü "Extras" \#71

### Kompatibilität

-   es kann sein, dass manuelle Positionierung von notenbeozgenen
    Elementen überarbeitet werden muss. \#199

## v 1.7.1

### fix

-   improved fermata symbol in pdf \#178
-   turnoff flowconf edit for pdf. This avoids noise around very short
    vertical flowlines \#167
-   print preview no longer clears unsaved indicator \#176

## v 1.7

### fix

-   tuplet lines are now correct in pdf (\#139)
-   no longer have unexpected subflowlines to unisons (\#140)
-   fixed size of smaall notes (\#143)
-   player also plays until end of tied notes (\#147)
-   decorations now also work on rests (\#127)
-   shift now also works on unisons (\#107)
-   abc2svg settings no longer necessary in tunes (removed from
    Template) (\#71)
-   BWC Default for "filenamepart" is now as it was in 1.5 (\#155)
-   Config form is refreshed after loading another song (\#156)
-   printer offset is no longer broken if user enters only one value
    (\#157)
-   Dropbox-Path can now also have digits (\#162)
-   Printer window show pdf on Chrome 60 (\#160)
-   now invisible rests are supressed even on flowline (\#166)
-   now handle multi measure rests (\#166)
-   fix predefined annotations vt and vr
-   BWC: move Tuplet configuration to notebounds (\#168)
-   Multiple notebound annotations can now be dragged individually
    (\#170)
-   BWC: no longer show (Original in ) in case of transpositions (\#174)

### enhancement

-   jumplines can now be configured by drag & drop (\#136)
-   tuplets can now be sculptured by drag & drop (\#138)
-   improved performance of configuration (\#115)
-   improved performance of harpnote preview (\#87)
-   improved performance of vertical packer (\#87, \#89)
-   editor collapses config parameters by default (\#144)
-   now can print a sortmark on top of the sheet (\#145)
-   the anchor of jumplines can now be configured (\#150)
-   now have variant parts appear in grey (\#151)
-   now menu supports extract 0 to extract 5 (\#153)
-   now menu also shows title of extracts (\#153)
-   ctrl-alt 'F' now toggles harp preview
-   rearranged "Edit Configuration" Menu to improve configuration
    workflow (\#171)
-   now suppoert tilde as non braeking space in lyrics, stringnames,
    annotations \#113
-   now suppoert quoted tilde as non braeking space in lyrics,
    stringnames, annotations \#113
-   layoutlines is now the combination of voices and layoutlines
    (\#175).

### internal stuff

-   updated to abc2svg 1.13.7 (\#163)

### experimental feature

-   implemented a collision based packer (\#89)
-   implemented validation of config parameters (\#85) with result form
-   Shape of Flowlines can be configured (\#167)

### backwards compatibility issues

-   layoutlines is now the combination of voices and layoutlines. It is
    no longer possible to show voices without considering them in the
    layout (\#175)
-   Default for "filenamepart" is now as it was in 1.5 (\#155)
-   tuplet configuration is now under 'notebound': meed to rework in the
    sheets - sorry! (\#168)
-   transposititions are no longer exposed in legend (\#174)

### known issues

Dragging of jumpline does not work properly on Saitenspiel \#158

## V 1.6.1 2017-05-17

### Fehlerbehebungen

-   Drag und Drop funktioniert nun auch in Firefox
-   Sektieren von Noten in der Notenvorschau verbessert.
-   non BWC: Oktavierte Notenschlüssel werden nun beachtet
-   Schneidemarken werden nur auch bei A4-Ausddruck ausgegeben
-   Beschriftungen für Variante Enden werden unterddrückt, wenn keine
    Sprunglinien ausgegeben werden
-   Taktnummern und Zählhinweise werden für unterdrückte Pause nicht
    mehr dargestellt
-   Unsynchronisierte Pausen in Begleitstimmen werden nun dargestellt
-   Bessere Fehlermeldung für nicht existierende Auszüge
-   non BWC: Automaitsche Positionierung von Taktnummern und
    Zählhinweisen deutlich verbessert
-   Notengröße und Gestalt der Einlegemarken korrigiert
-   MXL-dateien aus Musescor können nun auch importiert werden (Bislang
    nur solce, die von musescore.org heruntergeladen wurden)
-   Verbesserung der ABC 2.2 Unterstützung
-   Verbesserte Darstellung bei überlapenden Synchroniationslinien
-   Konfigurationsmasken deutlich beschleunigts
-   Tonarmodus (dur, moll) beibt bei Transponierung erhalten
-   Referenz erzeugt nun keine Fehlermehr

### Erweiterung

-   In Liedtexten kann man mit `\~` feste Leerzeichen erzwingen
-   Unterlegnotenvorschau wird vor dem Rendern gelöscht
-   Der Fingerabdruck erscheint nun auch auf der Notenvorschau
-   Die Ausgabe von Triolen (n-tolen) in Begleitstimmen kann über die
    Konfigurtion unterdrückt werden
-   verbesserte ABC 2.2 Unterstützung
-   Anpassung auf neue Dropbox-Schnittstelle 2.0
-   für Dropbox gibt es nun eine eigenes Menü
-   verbesserte Fehlermeldungen bei Problemen mit Dropbox
-   Struktur des Konfigurationsmenüs verbessert
-   ABC-Tutorial von Gerd Schacherl verlinkt
-   Menüs zum Speichern, Öffnen sind inaktiv im Demo modus

### Experimentelle Erweiterungen

-   Man kann nun sein eigenes Template anlegen und einrichten
-   Man kann den vertikalen Abstand von Noten korrigieren.

### inkompatible Änderungen - notwendige Anpassungen

-   Oktavierte Schlüssel: Wenn man bei einer Stimme z.B. clef=treble-8
    angibt, wird eine kleine 8 unter den Violinschlüssel geschrieben.
    Ihr müsst also die "-8" rauslöschen, damit es wieder so ist, wie
    vorher.Leider hat das Template in Zupfnoter dieses "-8" eingefügt.
-   Transponierungen innerhalb einer Stimme muss angepsasst werden
-   Taknummern und Zählhinwese werden nun automatisch positioniert, ggf.
    ausschalten.
-   Bei mehreren aufeinanderfolgenden `[P:]` bzw `[r:]` wirkt nur die
    letzte
-   Fehlermeldung, wenn F: - zeile fehlt
-   Fehlermeldung der F: - Zeile Leerzeichen oder Sonderzeichen enthält

## V 1.5

### backward compatibility issues

-   filenames are now trimmed - this might lead to slightly different
    filenames in dropbox
-   we now have a filenamepart per extract. It allows to change titles
    without changing the filenames. Future releases might introduce a
    default value. So better adapt this parameter now.
-   you need first to invoke "login" in Zupfnoter before you can use the
    "open"
-   the fingerprint on a page might change as we now have 2 decimal
    digits in configuration \#95

### Fix

-   adjusted German language also for error messages \#47
-   communication with Dropbox (error handling etc.) \#77
-   improved auto positioning of barnumbers and counthints \#81
-   builtin sheet annotation no longer claims a copyright \#69
-   optimized position of cutmarks \#74
-   fix whitespace handling in lyrics and filenames \#54
-   report multiple F and T lines \#54
-   non BWC trim filename addendum \#54
-   Jumpline end are now correct in case of a full rest \#50
-   no longer shift name first and last string in the stringnames \#18
-   Editor no longer hangs if harpnotes could not be created \#86
-   abc2svg titletrim now turned off \#88
-   browser now consider zupfnoter as secure site again \#90
-   Now also use ctrl/cmd-RETURN for render
-   Now yield 1.50 instead of 1.49999999 to minimize rounding effects
    \#95

### Enhancement

-   now we have configuration parameters for printer optimimization \#82
-   now have forms based configuration \#67
-   now have forms based editing of snippets (now called addons) \#83
-   now have a lyrics editor tab \#8
-   more styles for annotations \#70
-   now have a parameter "filenamepart" per extract to determine the
    filename addendum for the extract \#72
-   now raise a popup if an error occurs on render or save \#76
-   now have a button to toggle harpnote preview \#93
-   now have foundation for optimized packer, and an experimental packer
    \#89
-   now show information of the day \#98
-   now have quick settings for some configuration \#97

## V 1.4.2

### Fix

-   barnumbers are small\_bold again \#60
-   optimized placement of cutmarks \#74
-   fixed tempo note for e.g. 3/8= 120 \#79
-   fix countnotes \#78

## V 1.4.2

### Fix

-   remove copyright note from sheet annotation \#69

### enhancement

-   add textstyles: italic, small\_bold, small\_italic

## V 1.4.1

### enhancment

-   suppress measure bar if repetition starts within measure \#42

### fixes

-   force reading dropped abc-files as utf-8 \#66
-   annotation template now works

## V 1.4.0

-   fixed harpnote-player (no longer relies on last voice, no noise if
    song starts with rests) (\#20)
-   countnotes: draw hints how to count close to the notes (\#21).
    Configure by `"countnotes" : {"voices": [1], "pos": [3, -2]}`
-   fixed position of bars (\#16)
-   refined representation of rests (\#16): full rest now has same size
    as full note
-   refined layout of jumplines: now considering size of symbol
-   Draw a measure bar on the first note if the first measure is a
    complete one (\#23)
-   notes are shifted left/right if on the border of A3 sheets. This
    supports printing on A3 sheets (\#17)
-   removed spinner, progress indicator is again only background-color
    (reuqested by Karl)
-   advanced approach to represent variant endings (\#10)
-   config menu no longer overrides existing entries with the default
    values (\#25)
-   now have a button to download the abc (\#26)
-   how have keyboard shortcuts cmd-P, cmd-R, cmd-S \#37
-   non BWC: unisons are nore connected to their last note (\#32);
    migrate by inverting the unisons
-   non BWC: restructure of notebound annotations (\#33); migrate by
    delete notebound configuration and reposition \[r:\] needs to start
    with lowercase letter, all now works per voice only;
-   update favorite icon to Zupfnoter logo
-   now can print a scalebar with very flexible configuration \#18
-   now can print repeatsigns as alternative to jumplines; flowline is
    now interrupted upon repeat start/end \#3
-   rearranged config menu, added hints visble on hove \#37
-   console is now on cmd-K - only \#37
-   shape of tuplet slur can now be configured \#39 - this is an
    experimental implementation and subject of changing.
-   play button now plays: \#40
-   if nothing is selected: the entire song in all voices
-   if one note is selected: the song from selection, only voices of
    current extract
-   if more than one notes are selected: the selection only
-   shift key now expands the selection \#40
-   now support !fermata! and !empphasis! decorations \#30
-   now place a fingerprint of input on the sheet. Sheets with identical
    fingerprints stm from the same input. \#22
-   improved demo mode \#43
-   config menu now investigates the next free key for lyrics and note
    \#44
-   initial version of localization \#47
-   non BWC: algorithm for horizontal position of rests can now be
    configured. Default is different thatn in 1.3 Configuration menu
    provides an entry to switch to 1.3 behavior. \#58
-   Now generate a HTML-Page with the music notes for tune preview -
    also saves the html in Dropbox \#59
-   prevent automatic processing after initialization by adding ?debug
    to the url \#61
-   Now generate bar numers \#60
-   improve adjustment of zoom levels \#62

## V 1.3.1 2016-05-17

-   initial support of voice overlays (bars do not always show up)
-   raise an alert before unloading Zupfnoter
-   indicate draggable text by "pointer" cursors
-   notebound annotations can be dragged if the note has an \[r:\]
    remark which serves as note-id.
-   config menu now injects some layout options

-   no error message on \[r:\] - remarks
-   some refactorings (abc2svg-json)
-   update to abc2svg 1.5.22

## V 1.2.2

-   slowed down activity animation

## V 1.2.1

## V 1.2.0 2016-04-21

-   upgrade to abc2svg 1.5.14 ( Crash on some cases of ties since 1.5.6)
-   let "play" call "render" before playing if necessary
-   now use green animation (flying notes) for progress indicator

## V 1.1.1 2016-04-05

-   patched version number

## V 1.1.0 2016-04-05

-   refinements of toolbar: login, new, open, save
-   add a dialog for create and login
-   invoke render\_previews on new, open, drag
-   Improved report of coordinates for dragging annotations

## V 1.0.0 2016-04-03

-   first official release
