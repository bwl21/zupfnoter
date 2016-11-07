## annotations

Hier kannst du eine Liste von Beschriftungsvorlagen angeben.

Zupfnoter bringt einige solcher Definitionen bereits mit.

Diese Beschriftungsvorlagen kannst du über "Zusatz einfügen" mit einer
Note verbinden (Notenbeschriftung).

## annotations.vl

Hier siehst du ein Beispiel für eine Notenbeschriftung (hier mit dem
Namen `vl`).\
Diese dient dazu ein "V" an die Harfennote zu drucken um anzudeuten,
dass die Saite nach Ablauf des Notenwertes abgedämpft werden soll.

## ELLIPSE_SIZE

Hier kannst du die Größe der ganzen Noten einstellen. Sinnvolle Werte
sind [2-4, 1.2-2].

> **Hinweis**: Die Größe der anderen Noten werden ausgehend von diesem
> Wert berechnet.
>
> Da die Noten auch mit der dicken Linie umrandet werden, kann auch die
> "Linienstärke `dick`" reeduziert werden, um ein filigraneres Notenbild
> zu erhalten.

## extract

Hier kannst du Auszüge für deine Unterlegnoten definieren. Das ist
besonders bei mehrstimmigen Sätzen sinnvoll (Siehe Kapitel "Auszüge").

> **Hinweis**: Einstellungen im Auszug 0 wirken auf die anderen Auszüge,
> sofern sie dort nicht überschrieben werden.

`extract.0` spezifiziert den Auszug 0; `extract.1` spezifiziert den
Auszug 1 usw.

## extract.0.filenamepart

Hier kannst du einen Zusatz angeben, um welchen der Filename der
PDF-Dateien für diesen Auszug ergänzt werden soll. Auf diese Weise wird
jeder Auszug in einer eigenen Datei wiedergegeben.

Wenn das Feld fehlt, dann wird der Filename aus dem Inhalt von
`extract.0.title` gebildet.

> **Hinweis**: Bitte achte darauf, daß jeder Auszug einen eindeutigen
> Filename-Zusatz oder Titel hat. Sonst werden mehrere Auszüge in die
> gleiche Datei geschrieben (und nur der letzte bleibt übrig).

## extract.0.layoutlines

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, die zur die Berechnung des vertikalen Anordnugn der Noten
(Layout) herangezogen werden sollen.

Üblicherweise werden alle Stimmen für die Berechnung des Layouts
herangezogen. Bei langen Stücken kann es aber sinnvoll sein, nur die
dargstellten Stimmmen zur Berechnung des Layouts zu berücksichtigen, um
ein ausgwogeneres Notenbild zu bekommen.

> **Hineis**: Auch wenn der Parameter `layoutlines` heißt, bewirkt er
> nicht, dass irgendwelche Linien eingezeichnet werden.

## extract.0.legend

Hier kannst du die Darstellung der Legende konfigurieren. Dabei wird
unterschieden zwischen \* `pos` - Position des Titels des
Musikstückes \* `spos` - Position der Sublegende, d.h. der weiteren
Angaben zum Musikstück

> **Hinweis**: Die Legende wird vorzugsweise durch Verschieben mit der
> Maus positioniert. Für eine genaue positionierung kann jedoch die
> Eingabe über die Bildschirmmaske sinnvol sein.

## extract.0.legend.pos

Hier kannst du die Darstellung des Titels des Musikstückes angeben. Die
Angabe erfolgt in mm als kommagetrennte Liste von horizontaler /
vertikaler Position.

## extract.0.legend.spos

Hier kannst du die Darstellung der weiteren Angaben (Sublegende) des
Musikstückes angeben. Die Angabe erfolgt in mm als kommagetrennte Liste
von horizontaler / vertikaler Position.

## extract.0.title

Hier spezifizierst du den Titel des Auszuges. Er wird in der Legende mit
ausgegeben.

> **Hinweis**: Der Titel des Auszuges wird an die Angabe in der Zeile
> "F:" angehängt, falls nicht noch ein `extract.0.filenamepart`
> spezifiziert ist.

## autopos

Hier kannst du die automatische Positionierung einschalten. Dabei werden
Zählmarken bzw. Taktnummern abhängig von der Größe der Noten platziert.
Wenn diese Option ausgeschaltet, gelten die Werte von `pos`. Dies kann
bei manchen Stücken eine sinnvollere Einstellugn sein.

Die Zählmarken/Taktnummer lassen sich weiterhin mit der Maus
verschieben.

## extract.0.barnumbers

Hier kannst du angeben, wie Taktnummern in deinem Unterlegnotenblatt
ausgegeben werden sollen.

## extract.0.barnumbers.voices

Hier kannst du eine Liste der Stimmen angeben, die Taktnummern bekommen
sollen.

## extract.0.countnotes

Hier kannst du angeben, ob und wie Zählmarken in deinem
Unterlegnotenblatt ausgegeben werden sollen.

Zählmarken sind hilfreich, um sich ein Stück erarbeiten. Sie geben
Hilfestellung beim einhalten der vorgegebenen Notenweret.

## extract.0.countnotes.voices

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, die Zählmarken bekommen sollen.

## extract.0.flowlines

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, für die Flußlinien eingezeichnet werden sollen.

## extract.0.jumplines

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, für die Sprunglinien eingezeichnet werden sollen.

## extract.0.subflowlines

Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen
angeben, für die Unterflußlinien eingezeichnet werden sollen.

## extract.0.synchlines

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

## layout

Hier kannst du die Parameter für das Layout eintsllen. Damit lässt das
Notenbild gezielt optimieren.

## layout.limit_a3

Diese Funktion verschiebt Noten am A3-Blattrand nach innen. Da das
Unterlegnotenblatt etwas größer ist als A3 würde sonst die Note
angeshnitten.

## layout.LINE_THIN

Hier stellst du die Breite (in mm) von dünnen Linien ein.

## layout.LINE_MEDIUM

Hier stellst du die Breite (in mm) von mittelstarken Linien ein.

## layout.LINE_THICK

Hier stellst du die Breite (in mm) von dicken Linien ein.

## lyrics

Hier steuerst du die Positionierung der Liedtexte. Dabei kannst du den
Liedtext auf mehrer Blöcke aufteilen.

Ein einzelner Block listet die Strophen auf, die er enthält, und die
gemeinsam poitioniert werden.

## lyrics.0

Hier definierst du einen einzelnen Block von Liedtexten.

## lyrics.0.pos

Hier gibst du die Position an, an welcher der Liedtext-Block ausgegeben
werden soll. Angabe erfolgt in mm als kommagetrennte Liste von
horizontaler / vertikaler Position.

## lyrics.pos

Dies ist die Vorgabe für Position, an welcher der Liedtext-Block
ausgegeben werden soll. Angabe erfolgt in mm als kommagetrennte Liste
von horizontaler / vertikaler Position.

## lyrics.0.verses

Hier gibst du die Liste der Strophen an die im Liedtext-Block ausgegeben
werden. Gib eine kommaseparierte Liste von Versnummern an.

> **Hinweis**: Die Nummern der Strophen ergibt sich aus der Reihenfolge,
> nicht aus etwa vorhandener Nummer im Text der Strophe.
>
> **Hinweis**: negative Nummern zählen von hinten. Daher gibt z.B. `-1`
> die letzte Strophe aus. `0` gibt gar keine Strophe aus.

## lyrics.verses

Dies ist die Vorgabe für die Liste der Strophen die im Liedtext-Block
ausgegeben werden.

## nonflowrest

Hier kannst du einstellen, ob in den Begleitstimmen ebenfalls die Pausen
dargestellt werden sollen. Eine Stimme wird dann Begleitstimme
betrachtet, wenn sie keine Flußlinie hat.

Normalerweise ist es nicht sinnvoll, in den Begleitstimmen Pausen
darzustellen, da der Spieler sich ja an den Pausen in der Flußlinie
orientiert.

## notes

Hier kannst du eine Seitenbeschriftungen hinzufügen. Beim Einfügen einer
Seitenbeschriftung vergibt Zupfnoter eine Nummer anstelle der `.0`. Es
kann aber auch sinnvoll sein eine sprechende Bezeichnung für die
Beschriftung manuell vorzugeben um ihrer spezifische Verwendung
hervorzuheben z.B. `notes.T_Copyright`. Das ist allerdings nur in der
Textansicht möglich.

## notes.0.pos

Hier gibst du die Position der Seitenbeschriftung an, an welcher der
Liedtext-Block ausgegeben werden soll. Angabe erfolgt in mm als
kommagetrennte Liste von horizontaler / vertikaler Position.

## pos

Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte
Liste von horizontaler / vertikaler Position.

## prefix

Hier kannst du einen Text angeben, der z.B. vor der Taktnummeer
ausgegeben werden soll (Präfix).

## produce

Hier kannst du eine Liste der Auszuüge angeben, für welche eine
PDF-DAtei mit erzeugt werden soll.

> **Hinweis:** Manchmal ist es sinnvoll, Auszüge nur zur Bearbeitung
> anzulegen, diese aber nicht zu drucken. Es kommt auch vor, dass Auszug
> 0 nur verwendet wird, um Vorgaben für die anderen Auszüge zu machen,
> nicht aber um ihn wirklich auszudrucken.

## printer

Hier kannst du das Druckbild auf deine Drucher-Umgebung anpassen.

> **Hinweis:** Durch Verwendung dieser Funktion passen die erstellten
> PDF-Dateien eventuell nicht mehr auf andere Umgebungen. Bitte verwende
> die Funktion also erst, wenn du keine geeigneten Einstellungen in
> deinem Druckdialog findest.

## printer.a3_offset

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

## printer.a4_offset

Hier defnierst du, wie das Druckbild beim Ausdruck auf A3-Papier
verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler /
vertikaler Position.

## printer.show_border

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

## repeatsigns

Hier kannst du die Darstellung der Wiederholungszeichen steuern. Dabei
wird angegeben, für welche Stimmen Wiederholgungszeichen gedruckt
werden, wie die Wiederholungszeichen gedruckt werden, und wie sie
positioniert werden.

## repeatsigns.left

Hier kannst du die Darstellung des linken Wiederholungszeichen steuern.

## repeatsigns.voices

Hier gibst du eine Liste (durch Komma getrenn) der Stimmen and, für
welche Wiederholungszeichen anstelle von Sprunglinine ausgegeben werden.

> Hinweis: Zupnoter stellt für die hier aufgelisteten Stimmen keine
> Sprunglinien mehr dar.

## repeatsigns.left.text

Hier gibst du den Text an, der als linkes Wiederholungszeichen
ausgegeben werden soll.

## repeatsigns.right

Hier kannst du die Darstellung des rechten Wiederholungszeichen steuern.

## repeatsigns.right.text

Hier gibst du den Text an, der als rechtes Wiederholungszeichen
ausgegeben werden soll.

## restposition

Hier kannst du angeben an welcher Tonhöhe die Pausen eingetragenw werden
sollen. Pausen haben an sich keine Tonhöhe, daher ist es nicht
eindeutig, wie sie im Umterlegnotenblatt positioniert werden sollen.

-   `center` positioniert die Pause zwischen die vorherige und die
    nächste Note
-   `next` positioniert die Pause auf die gleiche Tonhöhe wie die
    nächste Note
-   `default` übernimmt den Vorgabewert

## restposition.default

Hier kannst den Vorgabewert für die Pausenposition angeben.

> **Hinweis**: `default` als Vorgabewert nimmt den intenrn Vorgabewert
> `center`.

## restposition.repeatstart

Hier kannst du die Pausenposition vor einer Wiederholung einstellen.

## restposition.repeatend

Hier kannst du die Pausenposition nach einer Wiederholung einstellen.

## REST_SIZE

Hier kannst du die Größe der Pausen einstellen. Sinnvolle Werte sind
[2-4, 1.2-2]

> **Hinweis**:Bitte beachte, dass nur die Angabe der Höhe von
> berücksichtigt wird, da das Pausensymbol nicht verzerrt werden darf.

## startpos

Hier kannst du die Position von oben angeben, an welcher die Harfennoten
beinnen. Damit kannst du ein ausgewogeneres Bild erhalten.

> **Hinweis**:Durch diese Funktion wird auch der Bereich verkleinert, in
> dem die Noten dargestellt werden. Sie ist daher vorzugsweise bei
> kurzen Stücken anzuwenden, die sonst oben auf der Seite hängen.

## stringnames

Hier kannst du stueern, ob und wie Saitennamen auf das
Unterlegnotenblatt gedruckt werden.

## stringnames.marks

Hier kannst du angeben, ob und wo Saitenmarken gedruckt werden.

## stringnames.marks.hpos

Hier gibst du die horizontale Position der Saitenmarken an. Die Angabe
ist eine durch Komma getrennte liste von Midi-Pitches.

Die Angabe `[43, 55, 79]` druckt Saitenmarken bei `G, G, g'`. also bei
den äußeren G-Saiten der 25-saitigen bzw. der 37-saitigen Tischharfe.

## stringnames.text

Hier gibst du die Liste der Saitennamen getrennt druch Leerzeichen an.
Die Liste wird so oft zusamengefügt, dass alle Saiten einen Nanen
bekommen.

In der Regel reicht es also, die Saitennamen für eine Oktave anzugeben.

**Beispiel:**

-   `+ -` erzeugt `+ - +  + - + -`
-   `C C# D C# E F F# G G# A A# Bb B` erzeugt die regulären Saitennamen

## style

Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl
aus vordefinierten Stilen.

## templates

Dieser Parameter kann nicht vom Benutzer gesetzt werden sondern liefert
die Vorlagen beim Einfügugen neuer Liedtext-Blöcke bzw.
Seitenbeschriftungen etc.

Er ist hier aufgeführt, um die Vorlagen selbst zu dokumentieren.

## tuplet

Hier kannst du die Darstellung von Triolen (genauer gesagt, von Tuplets)
steuern.

## tuplet.0

Hier kannst du die Darstellung einer Triole (genauer gesagt, eines
Tuplets) steuern.

## cp1

Hier gibst du den Kontrollpunkt für die erste Note an.

## cp2

Hier gibst du den Kontrollpunkt für die letzte Note an.

## shape

Hier gibst du eine Liste von Linienformen für das Tuplet an.

-   `c`: Kurve
-   `l`: Linie

> **Hinweis**: Mit der Linienform `l` kann man die Lage der
> Kontrollpunkte (als Ecken im Linienzug) sehen.

## text

Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann
auch mehrzeilig sein

## voices

Hier gibst du eine Liste von Sstimmen als (durch Komma getrennte) Liste
von Nummern an. Die Nummer ergibt sich aus der Reihnfolge in der
`%%score` - Anweisung in der ABC-Notation.

## vpos

Hier gibst du einen Abstand vom oberen Blattrand. Die Angabe erfolgt in
mm.

## wrap

Hier kannst du angeben, in welcher Spalte der Zeilenumbruch im
Konfigurationsabschnitt erfolgen soll. Das kann bei komplexen
Konfigurationen sinnvoll sein, um die Übersichtlichkeit zu erhöhen.
