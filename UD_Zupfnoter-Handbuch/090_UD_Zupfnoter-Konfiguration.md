# Konfiguration der Ausgabe {#konfiguration}

Dieses Kapitel beschreibt die Konfiguration der Erstellung der
Unterlegnotenblätter. Das Kapitel ist als Referenz aufgebaut. Die
einzelnen Konfigurationsparameter werden in alphabetischer Reihenfolge
aufgeführt. Bei den einzelnen Parametern wird der Text der Online-Hilfe,
sowie die Voreinstellungen des Systems dargestellt.

> **Hinweis**: Auch wenn in den Bildschirmmasken die Namen der
> Konfigurationsparameter übersetzt sind, so basiert diese Referenz den
> englischen Namen.

> **Hinweis**: Manche Konfigurationsparameter können mehrfach auftreten
> (z.B. `extract`). In diesem Kapitel wird dann immer die Instanz mit
> der Nr. 0 (z.B. `extract.0`) beschrieben.

## `annotations` - Beschriftungsvorlagen {#annotations}

Hier kannst du eine Liste von Beschriftungsvorlagen angeben.

Zupfnoter bringt einige solcher Definitionen bereits mit.

Diese Beschriftungsvorlagen kannst du über "Zusatz einfügen" mit einer
Note verbinden (Notenbeschriftung).

        "annotations": {
          "vl" : {"pos": [-1, -5], "text": "v"},
          "vr" : {"pos": [2, -5], "text": "v"},
          "vt" : {"pos": [-5, -5], "text": "v"}
        }
          

## `annotations.vl` - 'V' links {#annotations.vl}

Hier siehst du ein Beispiel für eine Notenbeschriftung (hier mit dem
Namen `vl`).\
Diese dient dazu ein "V" an die Harfennote zu drucken um anzudeuten,
dass die Saite nach Ablauf des Notenwertes abgedämpft werden soll.

        "vl": {"pos": [-1, -5], "text": "v"}
          

## `annotations.vl.pos` - Position {#annotations.vl.pos}

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

        "pos": [-1, -5]
          

## `annotations.vl.text` - Text {#annotations.vl.text}

Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann
auch mehrzeilig sein

        "text": "v"
          

## `annotations.vr` - 'V' rechts {#annotations.vr}

TODO: Helptext für annotations.vr einfügen

        "vr": {"pos": [2, -5], "text": "v"}
          

## `annotations.vr.pos` - Position {#annotations.vr.pos}

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

        "pos": [2, -5]
          

## `annotations.vr.text` - Text {#annotations.vr.text}

Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann
auch mehrzeilig sein

        "text": "v"
          

## `annotations.vt` - 'V' oben {#annotations.vt}

TODO: Helptext für annotations.vt einfügen

        "vt": {"pos": [-5, -5], "text": "v"}
          

## `annotations.vt.pos` - Position {#annotations.vt.pos}

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

        "pos": [-5, -5]
          

## `annotations.vt.text` - Text {#annotations.vt.text}

Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann
auch mehrzeilig sein

        "text": "v"
          

## `extract` - Auszug {#extract}

Hier kannst du Auszüge für deine Unterlegnoten definieren. Das ist
besonders bei mehrstimmigen Sätzen sinnvoll (Siehe Kapitel "Auszüge").

> **Hinweis**: Einstellungen im Auszug 0 wirken auf die anderen Auszüge,
> sofern sie dort nicht überschrieben werden.

`extract.0` spezifiziert den Auszug 0; `extract.1` spezifiziert den
Auszug 1 usw.

        "extract": {
          "0" : {
            "title"        : "alle Stimmen",
            "voices"       : [1, 2, 3, 4],
            "flowlines"    : [1, 3],
            "subflowlines" : [2, 4],
            "synchlines"   : [[1, 2], [3, 4]],
            "jumplines"    : [1, 3],
            "repeatsigns"  : {
              "voices" : [],
              "left"   : {"pos": [-7, -2], "text": "|:", "style": "bold"},
              "right"  : {"pos": [5, -2], "text": ":|", "style": "bold"}
            },
            "layoutlines"  : [1, 2, 3, 4],
            "barnumbers"   : {
              "voices"  : [],
              "pos"     : [6, -4],
              "style"   : "small_bold",
              "autopos" : false,
              "prefix"  : ""
            },
            "countnotes"   : {
              "voices"  : [],
              "pos"     : [3, -2],
              "style"   : "smaller",
              "autopos" : false
            },
            "legend"       : {"pos": [320, 20], "spos": [320, 27]},
            "notes"        : {},
            "lyrics"       : {},
            "nonflowrest"  : false,
            "layout"       : {
              "limit_a3"     : true,
              "LINE_THIN"    : 0.1,
              "LINE_MEDIUM"  : 0.3,
              "LINE_THICK"   : 0.5,
              "ELLIPSE_SIZE" : [3.5, 1.7],
              "REST_SIZE"    : [4, 2]
            },
            "stringnames"  : {
              "vpos"  : [],
              "text"  : "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
              "style" : "small",
              "marks" : {"hpos": [43, 55, 79], "vpos": [11]}
            },
            "filenamepart" : null,
            "printer"      : {
              "a3_offset"   : [0, 0],
              "a4_offset"   : [-5, 0],
              "show_border" : true
            },
            "startpos"     : 15
          },
          "1" : {
            "title"        : "Sopran, Alt",
            "voices"       : [1, 2],
            "filenamepart" : null
          },
          "2" : {
            "title"        : "Tenor, Bass",
            "voices"       : [3, 4],
            "filenamepart" : null
          }
        }
          

## `extract.0.barnumbers` - Taktnummern {#extract.0.barnumbers}

Hier kannst du angeben, wie Taktnummern in deinem Unterlegnotenblatt
ausgegeben werden sollen.

        "barnumbers": {
          "voices"  : [],
          "pos"     : [6, -4],
          "style"   : "small_bold",
          "autopos" : false,
          "prefix"  : ""
        }
          

## `extract.0.barnumbers.autopos` - automatisch positionieren {#extract.0.barnumbers.autopos}

Hier kannst du die automatische Positionierung einschalten. Dabei werden
Zählmarken bzw. Taktnummern abhängig von der Größe der Noten platziert.
Wenn diese Option ausgeschaltet, gelten die Werte von `pos`. Dies kann
bei manchen Stücken eine sinnvollere Einstellugn sein.

Die Zählmarken/Taktnummer lassen sich weiterhin mit der Maus
verschieben.

        "autopos": false
          

## `extract.0.barnumbers.pos` - Position {#extract.0.barnumbers.pos}

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

        "pos": [6, -4]
          

## `extract.0.barnumbers.prefix` - Präfix {#extract.0.barnumbers.prefix}

Hier kannst du einen Text angeben, der z.B. vor der Taktnummeer
ausgegeben werden soll (Präfix).

        "prefix": ""
          

## `extract.0.barnumbers.style` - Stil {#extract.0.barnumbers.style}

Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl
aus vordefinierten Stilen.

        "style": "small_bold"
          

## `extract.0.barnumbers.voices` - Stimmen {#extract.0.barnumbers.voices}

Hier kannst du eine Liste der Stimmen angeben, die Taktnummern bekommen
sollen.

        "voices": []
          

## `extract.0.countnotes` - Zählmarken {#extract.0.countnotes}

Hier kannst du angeben, ob und wie Zählmarken in deinem
Unterlegnotenblatt ausgegeben werden sollen.

Zählmarken sind hilfreich, um sich ein Stück erarbeiten. Sie geben
Hilfestellung beim einhalten der vorgegebenen Notenweret.

        "countnotes": {
          "voices"  : [],
          "pos"     : [3, -2],
          "style"   : "smaller",
          "autopos" : false
        }
          

## `extract.0.countnotes.autopos` - automatisch positionieren {#extract.0.countnotes.autopos}

Hier kannst du die automatische Positionierung einschalten. Dabei werden
Zählmarken bzw. Taktnummern abhängig von der Größe der Noten platziert.
Wenn diese Option ausgeschaltet, gelten die Werte von `pos`. Dies kann
bei manchen Stücken eine sinnvollere Einstellugn sein.

Die Zählmarken/Taktnummer lassen sich weiterhin mit der Maus
verschieben.

        "autopos": false
          

## `extract.0.countnotes.pos` - Position {#extract.0.countnotes.pos}

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

        "pos": [3, -2]
          

## `extract.0.countnotes.style` - Stil {#extract.0.countnotes.style}

Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl
aus vordefinierten Stilen.

        "style": "smaller"
          

## `extract.0.countnotes.voices` - Stimmen {#extract.0.countnotes.voices}

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, die Zählmarken bekommen sollen.

        "voices": []
          

## `extract.0.filenamepart` - Filename-Zusatz {#extract.0.filenamepart}

Hier kannst du einen Zusatz angeben, um welchen der Filename der
PDF-Dateien für diesen Auszug ergänzt werden soll. Auf diese Weise wird
jeder Auszug in einer eigenen Datei wiedergegeben.

Wenn das Feld fehlt, dann wird der Filename aus dem Inhalt von
`extract.0.title` gebildet.

> **Hinweis**: Bitte achte darauf, daß jeder Auszug einen eindeutigen
> Filename-Zusatz oder Titel hat. Sonst werden mehrere Auszüge in die
> gleiche Datei geschrieben (und nur der letzte bleibt übrig).

        "filenamepart": null
          

## `extract.0.flowlines` - Flußlinien {#extract.0.flowlines}

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, für die Flußlinien eingezeichnet werden sollen.

        "flowlines": [1, 3]
          

## `extract.0.jumplines` - Sprunglinien {#extract.0.jumplines}

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, für die Sprunglinien eingezeichnet werden sollen.

        "jumplines": [1, 3]
          

## `extract.0.layout` - Layout {#extract.0.layout}

Hier kannst du die Parameter für das Layout eintsllen. Damit lässt das
Notenbild gezielt optimieren.

        "layout": {
          "limit_a3"     : true,
          "LINE_THIN"    : 0.1,
          "LINE_MEDIUM"  : 0.3,
          "LINE_THICK"   : 0.5,
          "ELLIPSE_SIZE" : [3.5, 1.7],
          "REST_SIZE"    : [4, 2]
        }
          

## `extract.0.layout.ELLIPSE_SIZE` - Notengröße {#extract.0.layout.ELLIPSE_SIZE}

Hier kannst du die Größe der ganzen Noten einstellen. Sinnvolle Werte
sind [2-4, 1.2-2].

> **Hinweis**: Die Größe der anderen Noten werden ausgehend von diesem
> Wert berechnet.
>
> Da die Noten auch mit der dicken Linie umrandet werden, kann auch die
> "Linienstärke `dick`" reeduziert werden, um ein filigraneres Notenbild
> zu erhalten.

        "ELLIPSE_SIZE": [3.5, 1.7]
          

## `extract.0.layout.LINE_MEDIUM` - Linienstärke mittel {#extract.0.layout.LINE_MEDIUM}

Hier stellst du die Breite (in mm) von mittelstarken Linien ein.

        "LINE_MEDIUM": 0.3
          

## `extract.0.layout.LINE_THICK` - Linienstärke dick {#extract.0.layout.LINE_THICK}

Hier stellst du die Breite (in mm) von dicken Linien ein.

        "LINE_THICK": 0.5
          

## `extract.0.layout.LINE_THIN` - Linienstärke dünn {#extract.0.layout.LINE_THIN}

Hier stellst du die Breite (in mm) von dünnen Linien ein.

        "LINE_THIN": 0.1
          

## `extract.0.layout.REST_SIZE` - Pausengröße {#extract.0.layout.REST_SIZE}

Hier kannst du die Größe der Pausen einstellen. Sinnvolle Werte sind
[2-4, 1.2-2]

> **Hinweis**:Bitte beachte, dass nur die Angabe der Höhe von
> berücksichtigt wird, da das Pausensymbol nicht verzerrt werden darf.

        "REST_SIZE": [4, 2]
          

## `extract.0.layout.limit_a3` - Begrenzung auf A3 {#extract.0.layout.limit_a3}

Diese Funktion verschiebt Noten am A3-Blattrand nach innen. Da das
Unterlegnotenblatt etwas größer ist als A3 würde sonst die Note
angeshnitten.

        "limit_a3": true
          

## `extract.0.layoutlines` - Stimmen für Layout {#extract.0.layoutlines}

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, die zur die Berechnung des vertikalen Anordnugn der Noten
(Layout) herangezogen werden sollen.

Üblicherweise werden alle Stimmen für die Berechnung des Layouts
herangezogen. Bei langen Stücken kann es aber sinnvoll sein, nur die
dargstellten Stimmmen zur Berechnung des Layouts zu berücksichtigen, um
ein ausgwogeneres Notenbild zu bekommen.

> **Hineis**: Auch wenn der Parameter `layoutlines` heißt, bewirkt er
> nicht, dass irgendwelche Linien eingezeichnet werden.

        "layoutlines": [1, 2, 3, 4]
          

## `extract.0.legend` - Legende {#extract.0.legend}

Hier kannst du die Darstellung der Legende konfigurieren. Dabei wird
unterschieden zwischen \* `pos` - Position des Titels des
Musikstückes \* `spos` - Position der Sublegende, d.h. der weiteren
Angaben zum Musikstück

> **Hinewis**: Die Legende wird vorzugsweise durch Verschieben mit der
> Maus positioniert. Für eine genaue positionierung kann jedoch die
> Eingabe über die Bildschirmmaske sinnvol sein.

        "legend": {"pos": [320, 20], "spos": [320, 27]}
          

## `extract.0.legend.pos` - Position {#extract.0.legend.pos}

Hier kannst du die Darstellung des Titels des Musikstückes angeben. Die
Angabe erfolgt in mm als kommagetrennte Liste von horizontaler /
vertikaler Position.

        "pos": [320, 20]
          

## `extract.0.legend.spos` - Position Sublegende {#extract.0.legend.spos}

Hier kannst du die Darstellung der weiteren Angaben (Sublegende) des
Musikstückes angeben. Die Angabe erfolgt in mm als kommagetrennte Liste
von horizontaler / vertikaler Position.

        "spos": [320, 27]
          

## `extract.0.lyrics` - Liedtexte {#extract.0.lyrics}

Hier steuerst du die Positionierung der Liedtexte. Dabei kannst du den
Liedtext auf mehrer Blöcke aufteilen.

Ein einzelner Block listet die Strophen auf, die er enthält, und die
gemeinsam poitioniert werden.

        "lyrics": {}
          

## `extract.0.nonflowrest` - Begleitpausen {#extract.0.nonflowrest}

Hier kannst du einstellen, ob in den Begleitstimmen ebenfalls die Pausen
dargestellt werden sollen. Eine Stimme wird dann Begleitstimme
betrachtet, wenn sie keine Flußlinie hat.

Normalerweise ist es nicht sinnvoll, in den Begleitstimmen Pausen
darzustellen, da der Spieler sich ja an den Pausen in der Flußlinie
orientiert.

        "nonflowrest": false
          

## `extract.0.notes` - Seitenbeschriftungen {#extract.0.notes}

Hier kannst du eine Seitenbeschriftungen hinzufügen. Beim Einfügen einer
Seitenbeschriftung vergibt Zupfnoter eine Nummer anstelle der `.0`. Es
kann aber auch sinnvoll sein eine sprechende Bezeichnung für die
Beschriftung manuell vorzugeben um ihrer spezifische Verwendung
hervorzuheben z.B. `notes.T_Copyright`. Das ist allerdings nur in der
Textansicht möglich.

        "notes": {}
          

## `extract.0.printer` - Drucker {#extract.0.printer}

Hier kannst du das Druckbild auf deine Drucher-Umgebung anpassen.

> **Hinweis:** Durch Verwendung dieser Funktion passen die erstellten
> PDF-Dateien eventuell nicht mehr auf andere Umgebungen. Bitte verwende
> die Funktion also erst, wenn du keine geeigneten Einstellungen in
> deinem Druckdialog findest.

        "printer": {
          "a3_offset"   : [0, 0],
          "a4_offset"   : [-5, 0],
          "show_border" : true
        }
          

## `extract.0.printer.a3_offset` - Offset für A3 {#extract.0.printer.a3_offset}

Hier defnierst du, wie das Druckbild beim Ausdruck auf A3-Papier
verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler /
vertikaler Position.

> **Hinweis**: Wenn ein Unterlegnotenblatt für eine 25 saitige Harfe auf
> ein A3-Blatt gedruckt wird, ist es sinnvoll, das Druckbild um 10 mm
> nach links zu verschieben. Dadurch werden die Noten vom Drucker nicht
> mehr angeschnitten.
>
> In diesem Fall kann es auch sinnvoll sein, `limit-A3` auszuschalten.

        "a3_offset": [0, 0]
          

## `extract.0.printer.a4_offset` - Offset für A4 {#extract.0.printer.a4_offset}

Hier defnierst du, wie das Druckbild beim Ausdruck auf A3-Papier
verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler /
vertikaler Position.

        "a4_offset": [-5, 0]
          

## `extract.0.printer.show_border` - Blattbegrenzg. zeichnen {#extract.0.printer.show_border}

Hier kannst du einstellen, ob die Blattbegrenzung gedruckt werden soll.
Die Blattbegrenzung liegt eigntlich ausserhalb des Bereiches, den der
Drucker auf dem Papier bedrucken kann. Wenn der Drucker das Druckbild
auf dem Papier zentriert, ist die Blattbegrenzung nicht sichtbar. Ihre
Darstellung auf der Druckvorschau kann trotzdem hilfreich sein.

Manche Drucker positionieren das Druckbild aber nicht zentriert auf dem
Papier. Dadurch wird die Blattbegrenzung gedruckt, dafür fehlen dann
unten ca. 10 mm.

Versuche in diesem Fall, ob das Ausschalten der Blattbegrenzung die
Situation verbessert.

        "show_border": true
          

## `extract.0.repeatsigns` - Wiederholungszeichen {#extract.0.repeatsigns}

Hier kannst du die Darstellung der Wiederholungszeichen steuern. Dabei
wird angegeben, für welche Stimmen Wiederholgungszeichen gedruckt
werden, wie die Wiederholungszeichen gedruckt werden, und wie sie
positioniert werden.

        "repeatsigns": {
          "voices" : [],
          "left"   : {"pos": [-7, -2], "text": "|:", "style": "bold"},
          "right"  : {"pos": [5, -2], "text": ":|", "style": "bold"}
        }
          

## `extract.0.repeatsigns.left` - links {#extract.0.repeatsigns.left}

Hier kannst du die Darstellung des linken Wiederholungszeichen steuern.

        "left": {"pos": [-7, -2], "text": "|:", "style": "bold"}
          

## `extract.0.repeatsigns.left.pos` - Position {#extract.0.repeatsigns.left.pos}

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

        "pos": [-7, -2]
          

## `extract.0.repeatsigns.left.style` - Stil {#extract.0.repeatsigns.left.style}

Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl
aus vordefinierten Stilen.

        "style": "bold"
          

## `extract.0.repeatsigns.left.text` - Text {#extract.0.repeatsigns.left.text}

Hier gibst du den Text an, der als linkes Wiederholungszeichen
ausgegeben werden soll.

        "text": "|:"
          

## `extract.0.repeatsigns.right` - rechts {#extract.0.repeatsigns.right}

Hier kannst du die Darstellung des rechten Wiederholungszeichen steuern.

        "right": {"pos": [5, -2], "text": ":|", "style": "bold"}
          

## `extract.0.repeatsigns.right.pos` - Position {#extract.0.repeatsigns.right.pos}

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

        "pos": [5, -2]
          

## `extract.0.repeatsigns.right.style` - Stil {#extract.0.repeatsigns.right.style}

Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl
aus vordefinierten Stilen.

        "style": "bold"
          

## `extract.0.repeatsigns.right.text` - Text {#extract.0.repeatsigns.right.text}

Hier gibst du den Text an, der als rechtes Wiederholungszeichen
ausgegeben werden soll.

        "text": ":|"
          

## `extract.0.repeatsigns.voices` - Stimmen {#extract.0.repeatsigns.voices}

Hier gibst du eine Liste (durch Komma getrenn) der Stimmen and, für
welche Wiederholungszeichen anstelle von Sprunglinine ausgegeben werden.

> Hinweis: Zupnoter stellt für die hier aufgelisteten Stimmen keine
> Sprunglinien mehr dar.

        "voices": []
          

## `extract.0.startpos` - Startposition {#extract.0.startpos}

Hier kannst du die Position von oben angeben, an welcher die Harfennoten
beinnen. Damit kannst du ein ausgewogeneres Bild erhalten.

> **Hinweis**:Durch diese Funktion wird auch der Bereich verkleinert, in
> dem die Noten dargestellt werden. Sie ist daher vorzugsweise bei
> kurzen Stücken anzuwenden, die sonst oben auf der Seite hängen.

        "startpos": 15
          

## `extract.0.stringnames` - Saitennamen {#extract.0.stringnames}

Hier kannst du stueern, ob und wie Saitennamen auf das
Unterlegnotenblatt gedruckt werden.

        "stringnames": {
          "vpos"  : [],
          "text"  : "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
          "style" : "small",
          "marks" : {"hpos": [43, 55, 79], "vpos": [11]}
        }
          

## `extract.0.stringnames.marks` - Saitenmarken {#extract.0.stringnames.marks}

Hier kannst du angeben, ob und wo Saitenmarken gedruckt werden.

        "marks": {"hpos": [43, 55, 79], "vpos": [11]}
          

## `extract.0.stringnames.marks.hpos` - horizontale Position {#extract.0.stringnames.marks.hpos}

Hier gibst du die horizontale Position der Saitenmarken an. Die Angabe
ist eine durch Komma getrennte liste von Midi-Pitches.

Die Angabe `[43, 55, 79]` druckt Saitenmarken bei `G, G, g'`. also bei
den äußeren G-Saiten der 25-saitigen bzw. der 37-saitigen Tischharfe.

        "hpos": [43, 55, 79]
          

## `extract.0.stringnames.marks.vpos` - vertikale Position {#extract.0.stringnames.marks.vpos}

Hier gibst du einen Abstand vom oberen Blattrand. Die Angabe erfolgt in
mm.

        "vpos": [11]
          

## `extract.0.stringnames.style` - Stil {#extract.0.stringnames.style}

Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl
aus vordefinierten Stilen.

        "style": "small"
          

## `extract.0.stringnames.text` - Text {#extract.0.stringnames.text}

Hier gibst du die Liste der Saitennamen getrennt druch Leerzeichen an.
Die Liste wird so oft zusamengefügt, dass alle Saiten einen Nanen
bekommen.

In der Regel reicht es also, die Saitennamen für eine Oktave anzugeben.

**Beispiel:**

-   `+ -` erzeugt `+ - +  + - + -`
-   \`C C

        "text": "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G"

## `extract.0.stringnames.vpos` - vertikale Position {#extract.0.stringnames.vpos}

Hier gibst du einen Abstand vom oberen Blattrand. Die Angabe erfolgt in
mm.

        "vpos": []
          

## `extract.0.subflowlines` - Hilfsmelodielinien {#extract.0.subflowlines}

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, für die Unterflußlinien eingezeichnet werden sollen.

        "subflowlines": [2, 4]
          

## `extract.0.synchlines` - Synchronisationslinien {#extract.0.synchlines}

Hier kannst du angeben, welche Stimmenpaare über Synchronisationslinien
verbunden werden sollen.

Die Angabe erfolgt in der Bildschirmmaske als eine durch Komma
separierte Liste von Stimmenpaaren (darin die Stimmen durch "-"
getrennt).

Die Angabe "`1-2, 3-4`" bedeutet beispielsweise, dass zwischen den
Stimmen 1 und 2 bzw. den Stimmen 3 und 4 eine Synchronisationslinie
gezeichnet werden soll.

> **Hinweis**:In der Texteingabe wird das als eine Liste von
> zweiwertigen Listen dargestellt.

        "synchlines": [[1, 2], [3, 4]]
          

## `extract.0.title` - Titel {#extract.0.title}

Hier spezifizierst du den Titel des Auszuges. Er wird in der Legende mit
ausgegeben.

> **Hinweis**: Der Titel des Auszuges wird an die Angabe in der Zeile
> "F:" angehängt, falls nicht noch ein `extract.0.filenamepart`
> spezifiziert ist.

        "title": "alle Stimmen"
          

## `extract.0.voices` - Stimmen {#extract.0.voices}

Hier gibst du eine Liste von Sstimmen als (durch Komma getrennte) Liste
von Nummern an. Die Nummer ergibt sich aus der Reihnfolge in der
`%%score` - Anweisung in der ABC-Notation.

        "voices": [1, 2, 3, 4]
          

## `produce` - Auszüge {#produce}

Hier kannst du eine Liste der Auszuüge angeben, für welche eine
PDF-DAtei mit erzeugt werden soll.

> **Hinweis:** Manchmal ist es sinnvoll, Auszüge nur zur Bearbeitung
> anzulegen, diese aber nicht zu drucken. Es kommt auch vor, dass Auszug
> 0 nur verwendet wird, um Vorgaben für die anderen Auszüge zu machen,
> nicht aber um ihn wirklich auszudrucken.

        "produce": [0]
          

## `restposition` - Position der Pausen {#restposition}

Hier kannst du angeben an welcher Tonhöhe die Pausen eingetragenw werden
sollen. Pausen haben an sich keine Tonhöhe, daher ist es nicht
eindeutig, wie sie im Umterlegnotenblatt positioniert werden sollen.

-   `center` positioniert die Pause zwischen die vorherige und die
    nächste Note
-   `next` positioniert die Pause auf die gleiche Tonhöhe wie die
    nächste Note
-   `default` übernimmt den Vorgabewert

        "restposition": {
          "default"     : "center",
          "repeatstart" : "next",
          "repeatend"   : "default"
        }

## `restposition.default` - Vorgabewert {#restposition.default}

Hier kannst den Vorgabewert für die Pausenposition angeben.

> **Hinweis**: `default` als Vorgabewert nimmt den intenrn Vorgabewert
> `center`.

        "default": "center"
          

## `restposition.repeatend` - Wiederholungsende {#restposition.repeatend}

Hier kannst du die Pausenposition nach einer Wiederholung einstellen.

        "repeatend": "default"
          

## `restposition.repeatstart` - Wiederholungsanfang {#restposition.repeatstart}

Hier kannst du die Pausenposition vor einer Wiederholung einstellen.

        "repeatstart": "next"
          

## `templates` - Vorlagen {#templates}

Dieser Parameter kann nicht vom Benutzer gesetzt werden sondern liefert
die Vorlagen beim Einfügugen neuer Liedtext-Blöcke bzw.
Seitenbeschriftungen etc.

Er ist hier aufgeführt, um die Vorlagen selbst zu dokumentieren.

        "templates": {
          "notes"  : {"pos": [320, 6], "text": "ENTER_NOTE", "style": "large"},
          "lyrics" : {
            "verses" : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "pos"    : [350, 70]
          },
          "tuplet" : {"cp1": [5, 2], "cp2": [5, -2], "shape": ["c"]}
        }
          

## `templates.lyrics` - Liedtexte {#templates.lyrics}

Hier steuerst du die Positionierung der Liedtexte. Dabei kannst du den
Liedtext auf mehrer Blöcke aufteilen.

Ein einzelner Block listet die Strophen auf, die er enthält, und die
gemeinsam poitioniert werden.

        "lyrics": {
          "verses" : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          "pos"    : [350, 70]
        }
          

## `templates.lyrics.pos` - Position {#templates.lyrics.pos}

Dies ist die Vorgabe für Position, an welcher der Liedtext-Block
ausgegeben werden soll. Angabe erfolgt in mm als kommagetrennte Liste
von horizontaler / vertikaler Position.

        "pos": [350, 70]
          

## `templates.lyrics.verses` - Strophen {#templates.lyrics.verses}

Dies ist die Vorgabe für die Liste der Strophen die im Liedtext-Block
ausgegeben werden.

        "verses": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
          

## `templates.notes` - Seitenbeschriftungen {#templates.notes}

Hier kannst du eine Seitenbeschriftungen hinzufügen. Beim Einfügen einer
Seitenbeschriftung vergibt Zupfnoter eine Nummer anstelle der `.0`. Es
kann aber auch sinnvoll sein eine sprechende Bezeichnung für die
Beschriftung manuell vorzugeben um ihrer spezifische Verwendung
hervorzuheben z.B. `notes.T_Copyright`. Das ist allerdings nur in der
Textansicht möglich.

        "notes": {"pos": [320, 6], "text": "ENTER_NOTE", "style": "large"}
          

## `templates.notes.pos` - Position {#templates.notes.pos}

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

        "pos": [320, 6]
          

## `templates.notes.style` - Stil {#templates.notes.style}

Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl
aus vordefinierten Stilen.

        "style": "large"
          

## `templates.notes.text` - Text {#templates.notes.text}

Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann
auch mehrzeilig sein

        "text": "ENTER_NOTE"
          

## `templates.tuplet` - Tuplet {#templates.tuplet}

Hier kannst du die Darstellung von Triolen (genauer gesagt, von Tuplets)
steuern.

        "tuplet": {"cp1": [5, 2], "cp2": [5, -2], "shape": ["c"]}
          

## `templates.tuplet.cp1` - Kontrollpunkt 1 {#templates.tuplet.cp1}

Hier gibst du den Kontrollpunkt für die erste Note an.

        "cp1": [5, 2]
          

## `templates.tuplet.cp2` - Kontrollpunkt 2 {#templates.tuplet.cp2}

Hier gibst du den Kontrollpunkt für die letzte Note an.

        "cp2": [5, -2]
          

## `templates.tuplet.shape` - Linienform {#templates.tuplet.shape}

Hier gibst du eine Liste von Linienformen für das Tuplet an.

-   `c`: Kurve
-   `l`: Linie

> **Hinweis**: Mit der Linienform `l` kann man die Lage der
> Kontrollpunkte (als Ecken im Linienzug) sehen.

        "shape": ["c"]
          

## `wrap` - wrap {#wrap}

Hier kannst du angeben, in welcher Spalte der Zeilenumbruch im
Konfigurationsabschnitt erfolgen soll. Das kann bei komplexen
Konfigurationen sinnvoll sein, um die Übersichtlichkeit zu erhöhen.

        "wrap": 60
