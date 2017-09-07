\cleardoublepage

# Änderungshistorie von Zupfnoter

## V 1.7.0 2017-09-08

# v 1.7

## Fehlerkorrekturen

-   Tuplet-Linien sind jetzt korrekt in pdf (\#139)
-   keine unerwarteten Subflowlinien mehr zu Unisons (\#140)
-   kleine Noten sind nun auch korrekt (\#143)
-   Wiedergabe spielt nun bis zum Ende der gebundenen Noten (\#147)
-   Dekorationen funktionieren nun auch bei Pausen (\#127)
-   shift funktioniert jetzt auch auf unisons (\#107)
-   abc2svg-Einstellungen nicht mehr nötig (aus Template entfernt)
    (\#71)
-   BWC Voreinstellung für "filenamepart" ist jetzt wie in 1.5 (\#155)
-   Config-Formular wird nach dem Laden eines anderen Stückes
    aktualisiert (\#156)
-   Drucker offset wird nicht mehr zerstört, wenn der Benutzer nur einen
    Wert der geforderten zwei Werten (\#157) eingibt.
-   Dropbox-Pfad kann jetzt auch Ziffern haben (\#162)
-   Druckerfenster zeigt pdf auf Chrome 60 wieder an (\#160)
-   jetzt werden auch auf Flowline zu unsichtbaren Pausen unterdrückt
    (\#166)
-   Pausen über mehrere Takte funktionieren nun `Z` (\#166)
-   vt und vr vordefinierte Annotationen korrigiert
-   BWC: Tuplet-Konfiguration in Notebounds verschoben (\#168)
-   Mehrere Anmerkungen an einer Note können jetzt einzeln gezogen
    werden (\#170)
-   BWC: Originaltonart (Original in) wird bei bei Transpositionen nicht
    mehr angezeigt (\#174)
-   BWC: Layoutlines ist nun die Kombination von Stimmen und
    Layoutlines. (\#175)

## Erweiterungen

-   Sprunglinien können jetzt per Drag & Drop konfiguriert werden
    (\#136)
-   Tuplets können jetzt per Drag & Drop modelliert werden (\#138)
-   verbesserte Geschwindigkeit der Konfiguration (\#115)
-   verbesserte Geschwindigkeit der Harfennote-Vorschau (\#87)
-   verbesserte Geschwindigkeit des Vertikalpackers (\#87, \#89)
-   Editor klappt Konfigurationsparameter standardmäßig zu (\#144)
-   man kann jetzt einee Sortmark auf den Bogen drucken (\#145)
-   der Anker von Sprunglinien kann nun konfiguriert werden (\#150)
-   Variantenteile jetzt in Grau (\#151)
-   Menü unterstützt nun Extrakt 0 bis Extrakt 5 (\#153)
-   Menü zeigt jetzt auch Titel, Auszugsnummer und Ausgabesatatus von
    Auszügen an (\#153)
-   Strg-Alt' F' schaltet jetzt Harfenvorschau um
-   Menü "Konfiguration bearbeiten" neu geordnet, um den
    Konfigurations-Workflow zu verbessern (\#171)
-   jetzt kann die tilde als festes Leerzeichen in Liedtexten,
    Saitnnamen, Anmerkungen etc. verwendet werden (\#113)
-   die Tilde kann nun maskiert werden `\\~`, so dass sie als Tile
    ausgegeben wird (\#113)

## Interne Änderungen

-   aktualisiert auf abc2svg 1.13.7 (\#163)

## Experimentelle Funktion

-   kollisionsbasierten Packer (\#89)
-   Validierung der Konfigurationsparameter (\#85) mit Ergebnisformular
    implementiert
-   Form der Flußlinien konfigurierbar (\#167)

## Inkompatibile Änderungen zur Vorversion

-   Layoutlines ist nun die Kombination von Stimmen und Layoutlines. Es
    ist nicht mehr möglich, Stimmen anzuzeigen, ohne sie im Layout zu
    berücksichtigen. (\#175)
-   Default für "filenamepart" ist jetzt wie in 1.5 (\#155)
-   Tuplet-Konfiguration ist jetzt unter' notebound': muss also neu
    gemacht werden (\#168)
-   BWC: Originaltonart (Original in) wird bei bei Transpositionen nicht
    mehr angezeigt (\#174) \# bekannte Probleme

-   verschieben vonSprunglinien bei Saitenspiel funktioniert nicht
    richtig (\#158)

## V 1.6.1 2017-05-17

### Fehlerbehebungen

-   Drag und Drop funktioniert nun auch in Firefox
-   Sektieren von Noten in der Notenvorschau verbessert.
-   non BWC: Oktavierte Notenschlüssel werden nun beachtet
-   Schneidemarken werden nur auch bei A4-Ausddruck ausgegeben
-   Beschrifungen für Variante Enden werden unterddrückt, wenn keine
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

-   now we have configuration paramters for printer optimimization \#82
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

-   barnumbers are small_bold again \#60
-   optimized placement of cutmarks \#74
-   fixed tempo note for e.g. 3/8= 120 \#79
-   fix countnotes \#78

## V 1.4.2

### Fix

-   remove copyright note from sheet annotation \#69

### enhancement

-   add textstyles: italic, small_bold, small_italic

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
    delete notebound configuration and reposition [r:] needs to start
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
-   notebound annotations can be dragged if the note has an [r:] remark
    which serves as note-id.
-   config menu now injects some layout options

-   no error message on [r:] - remarks
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
-   invoke render_previews on new, open, drag
-   Improved report of coordinates for dragging annotations

## V 1.0.0 2016-04-03

-   first official release
