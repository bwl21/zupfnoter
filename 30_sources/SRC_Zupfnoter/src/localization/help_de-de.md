## align

Hier kannst du die Anordnung des Textes bezogen auf den Bezugspunkt,
(z.B. die Note) vorgeben. Wenn dieser Parameter fehlt, wird die
Anordnung automatisch errechnet

-   `l`: der Text steht links vom Bezugspunkt (und ist daher
    rechtsbündig)
-   `r`: der Text steht rechts vom Bezugspunkt (und ist daher
    linksbündig)
-   `auto`: die Ausrichtung wird automatisch errechnet

> **Hinweis**: Auch beim manuellen Verschieben wird die Anordnung der
> Nummer (links/rechts der Note) berücksichtigt und die Ausrichtung
> (linksbündig/rechtsbündig) entsprechend errechnet. Damit können die
> Nummern auch bei unterschiedlicher Länge sehr präzise positioniert
> werden.

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

## DRAWING\_AREA\_SIZE

Hier kannst du die Größe der Zeichenfläche einstellen. Allerdings hat
aktuell nur die vertikale Größe einen Einfluss. Damit kann man bei
großen Stücken noch ein bisschen mehr Platz ausreizen.

## ELLIPSE\_SIZE

Hier kannst du die Größe der ganzen Noten einstellen. Sinnvolle Werte
sind \[2-4, 1.2-2\].

> **Hinweis**: Die Größe der anderen Noten werden ausgehend von diesem
> Wert berechnet.
>
> Da die Noten auch mit der dicken Linie umrandet werden, kann auch die
> "Linienstärke `dick`" reeduziert werden, um ein filigraneres Notenbild
> zu erhalten.

## extract

Hier kannst du Auszüge für deine Unterlegnoten definieren. Das ist
besonders bei mehrstimmigen Sätzen sinnvoll.

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
angeben, die **zusätzlich** zu den dargestellten Stimmen zur die
Berechnung des vertikalen Anordnung der Noten (Layout) herangezogen
werden sollen.

Üblicherweise werden nur die dargestellten Stimmen für die Berechnung
des Layouts herangezogen. Es kann aber sinnvoll sein, weitere Stimmmen
zur Berechnung des Layouts zu berücksichtigen, um in allen Auszügen ein
ein gleichartiges Notenbild zu bekommen.

> **Hinweis**: Auch wenn der Parameter `layoutlines` heißt, bewirkt er
> nicht, dass irgendwelche Linien eingezeichnet werden.

## extract.0.legend

Hier kannst du die Darstellung der Legende konfigurieren. Dabei wird
unterschieden zwischen

-   `pos` - Position des Titels des Musikstückes
-   `spos` - Position der Sublegende, d.h. der weiteren Angaben zum
    Musikstück

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

## bar

## barnumbers.apanchor

Hier kannst du die vertikale Verankerung der Taktnummer an der Note
einstellen.

-   `center`: die Taktnummer wird an der Mitte der Note verankert
-   `box`: die Taktnummer wird am unteren Rand der Note verankert

> **Hinweise**:
>
> -   Dieser Parameter wirkt nur bei automatischer Positionierung der
>     Taktnummern.
>
> -   Die horizontale Verankerung der Taktnummer wird automatisch so
>     berechet, dass die Taktnummer gegenüber der eingehenden Flusslinie
>     steht.
>
> <!-- -->
>
> ## barnumbers.apbase

Hier kannst du die Grundlage für die automatische Positionierung von
Taktnummern einstellen.

Es werden zwei Werte erwartet: horizontal, vertikal.

-   Positive Werte schieben die Taktnummer **weiter** von der Note weg.
-   Negative Werte schieben die Taktnummer **näher** an die Note heran.

> **Hinweise**: Die horizontale Verankerung der Taktnummer wird
> automatisch so berechet, dass die Taktnummer gegenüber der ausgehenden
> Flusslinie steht.
>
> Eine bewährte Eingabe ist:
>
> -   `center`: `1,0`
> -   `box`: `1,-1`

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

## countnotes.apanchor

Hier kannst du die vertikale Verankerung der Zählmarke an der Note
einstellen.

-   `center`: die Zählmarke wird an der Mitte der Note verankert
-   `box`: die Zählmarke wird am unteren Rand der Note verankert

> **Hinweise**:
>
> -   Dieser Parameter wirkt nur bei automatischer Positionierung der
>     Zählmarken.
> -   Die horizontale Verankerung der Zählmarke wird automatisch so
>     berechet, dass die Zählmarke gegenüber der eingehenden Flusslinie
>     steht.

## countnotes.apbase

Hier kannst du die Grundlage für die automatische Positionierung von
Zählmarken einstellen.

Es werden zwei Werte erwartet: horizontal, vertikal.

-   Positive Werte schieben die Zählmarke **weiter** von der Note weg.
-   Negative Werte schieben die Zählmarke **näher** an die Note heran.

> **Hinweise**: Die horizontale Verankerung der Zählmarke wird
> automatisch so berechet, dass die Zählmarke gegenüber der eingehenden
> Flusslinie steht.
>
> Eine bewährte Eingabe ist:
>
> -   `center`: `1,0`
> -   `box`: `1,-0.5`

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

## images.0.height

Hier gibst du die Höhe des Objektes (z.b. des Bildes) in mm an.

## instrument

Hier gibst du den Namen des Instrumentes an. Die Angabe bewirkt
spezifische Verarbeitungen, z.B. die Anpassung der Tonhöhe zur Saite
(bei `saitenspiel` als diatonischem Instrument ist das nicht linear).

Es gibt folgende Einstellunge:

-   **`37-string-g-g`**: das ist die 37-saitige Harfe
-   **`25-string-g-g`**: das ist die 25-saitige Harfe
-   **`18-string-b-e`**: das ist die 18-saitige Harfe gestimmt von B bis
    e
-   **`saitenspiel`**: das ist ein diatonisch gestimmtes Saitenspiel mit
    einer G-Bass-Saite

## imagename

Hier kannst du das Bild auswählen, welches eingefügt werden soll. Die
Auswahlliste zeigt die Zupfnoter-internen Namen an. Es werden nur Bilder
gelistet, die dem ABC-File hinzugefügt wurde.

## layout

Hier kannst du die Parameter für das Layout eintsllen. Damit lässt das
Notenbild gezielt optimieren.

## layout.color

Hier kannst du die Farbe für verschiedene Elemente einstellen.

> **Hinweis** Die Farbe werden über die "HTML" - Namen angegegeben. Dort
> ist `grey` ist dunkler als `darkgrey` :-)

> **Hinweis** Die Farbe von varianten Abnschnitten alterniert zwischen
> variant1 und variant2. Wenn du beide gleich einstellst, dann werden
> die varianten Abschnitte gleichermassen eingefärbt.
>
> Wenn du beide auf den gleichen wert wie "default" stellst, dann werden
> variante Abschnitte nicht mehr durch Farbe abgesetzt.

## layout.color.color\_default

Hier wählst die Grundfarbe für die Ausgabe. Diese Farbe wird bei allen
Elementen verwendet, die keine spzeifische Farbeinstellung haben.

## layout.color.color\_variant1

Hier wählst du die Farbe in der variante Abschnitte 1, 3, 5 etc.
dargestellt werden.

> **Hinweis** Die Farbe von varianten Abnschnitten alterniert zwischen
> variant1 und variant2. Wenn du beide gleich einstellst, dann werden
> die varianten Abschnitte gleichermassen eingefärbt.
>
> Wenn du beide auf den gleichen wert wie "default" stellst, dann werden
> variante Abschnitte nicht mehr durch Farbe abgesetzt.

## layout.color.color\_variant2

Hier wählst du die Farbe in der variante Abschnitte 2,4,6 etc.
dargestellt werden.

> **Hinweis** Die Farbe von varianten Abnschnitten alterniert zwischen
> variant1 und variant2. Wenn du beide gleich einstellst, dann werden
> die varianten Abschnitte gleichermassen eingefärbt.
>
> Wenn du beide auf den gleichen wert wie "default" stellst, dann werden
> variante Abschnitte nicht mehr durch Farbe abgesetzt.

## layout.jumpline\_anchor

Hier stellst du ein, wie die Sprunglinien an den entsprechenden Noten
verankert werden. Bitte gib zwei Werte (X, Y) getrennt durch ein Komma
an. Die Angabe erfolgt in mm und bezieht sich auf den Rand (genauer
gesagt, das umhüllende Rechteck) der entsprechende Note.

## layout.jumpline\_vcut

Hier kannst du die Länge der vertikalen Sprungslinienandeutung
einstellen. Der wert wird in mm gerechnet.

**Hinweis:** wenn du den Wert "0" angibst, wird die Sprunglinie komplett
gezeichnet.

## layout.limit\_a3

Diese Funktion verschiebt Noten am A3-Blattrand nach innen. Da das
Unterlegnotenblatt etwas größer ist als A3 würde sonst die Note
angeshnitten.

## layout.LINE\_THIN

Hier stellst du die Breite (in mm) von dünnen Linien ein.

## layout.LINE\_MEDIUM

Hier stellst du die Breite (in mm) von mittelstarken Linien ein.

## layout.LINE\_THICK

Hier stellst du die Breite (in mm) von dicken Linien ein.

## notebound

Hier stehen alle Konfigurationsparameter, welche an den **Zeitpunkt**
einer Note gebunden sind (z.B für Taktzahlen, Triolen usw.)

> **Hinweis:** Wenn das Musikstück so bearbeitet wird, dass das
> Zeitschema verändert wird (z.b. Noten einfügen) kann es sinnvoll sein,
> diesen Zweig komplett zu löschen und neu aufzubauen.

## notebound.minc

Hier kannst du manuelle Korrekturen im vertikalen Layout vornehmen:

> **Hinweis**: Diese Funktion ist nun wirklich für die ganzen Experten.
> Bitte verwende sie also nur, wenn du weißt, was du tust.
> Anwendungsfälle für diese Funktion:
>
> -   Linien (z.B. Sprunglinien) gehen unglücklich durch andere Noten
>     oder Beschriftungen
> -   Bei sehr dichten Layouts gehen Taktstriche in die vorherige Note
> -   Man hat sehr viele Noten, könnte aber einen Teil in eine freie
>     Fläche schieben. In diesem fall würde die Flusslinie teilweise
>     nach oben gehen.

Dieser Parameter enthält eine Liste von manuellen Korrekturen. Jeder
Eintrag ändert den Vorschub für einen durch seinen Schlüssel bestimmten
Zeitpunkt.

## minc\_f

Hier gibst du den Korrekturfaktor für den vertikalen Voreschub an.

Die Angabe bestimmt, welcher Anteil am errechneten vertikalen Abstand
als extra Abstand **hinzugefügt** wird. (`a = (a + minc_f * a`))

Im Beispiel

        "minc" : {
           "2304": {"minc_f": 1}, 
           "4224": {"minc_f": -0.25}
           }

-   bei 2304 wird der Abstand verdoppelt. Mit derm Faktor 1 wird ein
    Normalabstand wird hinugefügt.
-   bei 4224 wird der abstand um 25% reduziert. Mit dem Faktor -0.25
    wird ein Viertel des Maximalabstandes abgezogen

**Beispiele**:

-   `-1.0` würde den Vorschub um eine ganze Note zurück setzen
-   `0` ändert nichts am Vorschub. Damit kann man den Wert zurücksetzen,
    falls er im Auszug 0 gesetzt wurde.
-   `0.5` vergrößert den Vorschub um die Hälfte einer ganzen Note.

## nconf

Hier kannst du die Darstellung einer einzelnen Note konfigurieren.

## nshift

Hier kannst du konfigieren, wie die Note/Pause horizontal verschobnen
wird. Die Angabe ist ein Fakter der mit der Notenbreite multipliziert
wird.

-   `+1.0` verschiebt die Note um eine Notenbreite nach rechts
-   `-1.0` verschiebt die Note um eine Notenbreite nach links

> **Hinweis**: diese Konfiguration überschreibt eventuell vorhandene
> Verschiebungen über `Zusätze`.

## layout.bottomup

Hier kannst du einstellen, ob die Noten von unten nach oben geschrieben
werden. Manche Spieler (Spieler der Okon-Harfe) bevorzugen diese
Darstellung, weil dabei die Hand nicht mehr die nächsten Noten verdeckt.

> **Hinweis** Die Taktstriche werden weiterhin oberhalb der Noten
> gezeichnet. Aber die Position von Taktnummern und Zählmarken wird
> angepasst.

## layout.beams

Hier kannst du einstellen, ob die Noten mit Notenhälsen dargestellt
werden. Noten mit Notenhälsen orientieren sich mehr an der
traditionellen Notenschrift, brauchen aber mehr Plat. Alle Noten werden
gleich groß dargeestellt.

## layout.packer

Hier kannst du weitere Einzelheiten für die vertikale Anordnung der
Noten konfigurieren. Es sind subtile Feinheiten, welche den Unterschied
ausmachen. Daher sind diese Funktionen noch experimentell.

## layout.packer.pack\_method

Hier kannst du die pack-Methode auswählen

-   **0** : Die bisherige Methode: diese geht nach jedem Schritt um die
    Höhe der größten Note weiter

-   **1** : Kopmpakt: diese geht nur dann weiter, wenn

    -   ein Richtungswechsel der Melodie vorliegt
    -   Noten übereinander gezeichnet würden

    Das bedeutet dass bei monotonen Melodien die Noten enger gesetzt
    werden.

    > **Hinweis**: Diese Methode eignet sich am besten für lange,
    > einstimmige Stücke. Die Platzeinsparung geht bei mehrstimmmigen
    > Stücken schnell verloren.
    >
    > Bei dieser Methode sind die Synchronisiationslinien zwischen den
    > Stimmen nicht immer gut sichtbar weil die Flusslinien ggf. sehr
    > flach sind.

-   **2** : linear: die Zeitachse wird linear auf das Blatt verteilt.
    Bei kurzen Stücken entspricht der Abstand der Noten dann auch dem
    Notenwert. Manche Spieler empfinden das als hilfreich. Es wird aber
    am meisten Platz verbraucht.

    Es wird auch kein extra Raum für Parts, Taktstriche und manuelle
    Vorschübe erstellt.

## layout.packer.pack\_min\_increment

Dieser Faktor bestimmt, wie weit pro Note auf jeden Fall weiter gerückt
wird. Pro Note wird mindestens um diesen Anteil einer Maximalnote weiter
geschaltet.

**Beispiele**:

-   **0.0**: es entstehen horizontale Flußlinien
-   **1.0**: es wird mindests um eine ganze Note weiter geschaltet
-   **0.2**: es wird um 20% einer ganzen Note weiter geschaltet. Dies
    liefert angenehme Ergebnisse.

## layout.packer.pack\_max\_spreadfactor

Nach der Berechnung des maximal komprimierten Layouts versucht
Zufpnoter, dieses so weit zu spreizen, dass die Zeichenfläche voll
ausgefüllt wird.

Dieser Faktor bestimmt, wie weit das maximal komprimierte Layout in der
Vertikalen gespreizt werden soll. Das wirkt sich bei kurzen Stücken aus,
welche das Blatt nicht vollständig ausfüllen.

Bei sehr kurzen Stücken ist es sinnvoll, die Spreizung zu begrenzen,
weil sonst die Noten sehr weit auseinander liegen.

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
Seitenbeschriftung vergibt Zupfnoter eine Nummer anstelle der `.0`.

> **Hinweis**: Es kann aber auch sinnvoll sein eine sprechende
> Bezeichnung für die Beschriftung manuell vorzugeben um ihrer
> spezifische Verwendung hervorzuheben z.B. `notes.T_Copyright`. Das ist
> allerdings nur in der Textansicht möglich.

## notes.0.T01\_number

Dieses Template fügt eine Nummer im Notenblatt ein. Damit kannst du
deine eigenen Ordnungskriterien realiseren.

Das vorgesehene Numernschema setzt sich aus zwei Blöcken zusammen

-   3 Zeichen für den Urheber, sozusagen die Unterlegnotenmanufaktur
-   3 Zeichen für eine fortlaufende Nummer. Es ist sinnvoll diese Nummer
    mit führenden Nullen zu schreiben.

Beispiel: `BWL-001` - Bernhard Weichel - Blatt 001

## notes.T01\_number\_extract

Dieses Template fügt zwei Zeichem am Ende der Nummer an. Damit kann man
den jeweiligen Auszug kennzeichen.

Ein sinnvolles schema ist:

-   `-A` - Sopran Alt - per default Auszug 1
-   `-B` - Tenor Bass - per default Auszug 2
-   `-M` - Nur Melodie - am besten Auszug 3 - ist aber nicht per default
    konfiguriert
-   `-S` - Alle Stimmen - per default Auszug 0; dieser wird in der Regel
    aber nicht gedruckt, sondern nur zur Bearbeitung verwendet.

## notes.T02\_copyright\_music

Dieses Template fügt einen Copyrightvermerk für die Musik ein. Hier wird
das Copyright auf die Komposition angegeben.

## notes.T03\_copyright\_harpnotes

Dieses Template fügt einen Copyrightvermerk für das Unterlgnotenbild
ein. Damit reklamierst du ein Copyright für die Umsetzung auf die
Tischharfe

## notes.T04\_to\_order

Dieses Template fügt eine Notiz ein wo man das Unterlegnotenblatt
beziehen kann. Das ist sinnvoll, wenn die Unterlegoten in irgendeiner
Weise vertrieben werden.

## notes.T09\_do\_not\_copy

Dieses Template fügt eine Notiz ein, die darauf hinweist, dass das Blatt
nicht ohne Erlaubnis kopiert werden darf.

## notes.0.pos

Hier gibst du die Position der Seitenbeschriftung an, an welcher der
Liedtext-Block ausgegeben werden soll. Angabe erfolgt in mm als
kommagetrennte Liste von horizontaler / vertikaler Position.

## PITCH\_OFFSET

Dieser Paramter justiert das Verhältnis von Tonhöhe und Position auf dem
Blatt. Die Angabe ist der negative MIDI-Wert der Note, die am linken
Blattrand dargestellt wird.

> **Hinweis** Bei **chromatischen** Instrumenten wird die Stimmung der
> Saiten von Zupfnoter berechnet. Daher sorgt der Wert -43 dafür, dass
> das G der Oktave 3 am linken Blattrand erscheint.
>
> Die Midi-Codes findest du auf
> [hier](http://www.electronics.dit.ie/staff/tscarff/Music_technology/midi/midi_note_numbers_for_octaves.htm)
>
> Bei **diatonischen** Instrumenten muss der Wert ggf. durch
> Ausprobieren ermittelt werden, da dort die Stimmung der Saiten fest
> verdrahtet ist. Üblicherweise ist er 0. Man könnte aber durch Werte
> von -12 bzw. +12 eine Art "Transponierung" errreichen. Das ist dann
> sinnvoll, wenn die selben Eingabenoten für verschiedene Instrumente
> verwendet werden sollen.

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

## printer.a3\_offset

Hier definierst du, wie das Druckbild beim Ausdruck auf A3-Papier
verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler /
vertikaler Position.

> **Hinweis**: Wenn ein Unterlegnotenblatt für eine 25 saitige Harfe auf
> ein A3-Blatt gedruckt wird, ist es sinnvoll, das Druckbild um 10 mm
> nach links zu verschieben. Dadurch werden die Noten vom Drucker nicht
> mehr angeschnitten.
>
> In diesem Fall kann es auch sinnvoll sein, `limit-A3` auszuschalten.

## printer.a4\_offset

Hier defnierst du, wie das Druckbild beim Ausdruck auf A3-Papier
verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler /
vertikaler Position.

## printer.a4\_pages

Hier gibst du eine kommagetrennte Liste von Seiten an, die bei A4
ausgedruckt werden sollen. Die Zählung beginnt bei 0!
Standardeinstellung ist `0,1,2`.

Bei manchen Instrumenten passt das gesamte Notenbild auf eine Seite. Bei
25-saitigen Instrumenten reicht es beispielsweise, die Seite 1, 2
auszugeben, und Seite 0 wegzulassen.

## printer.show\_border

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

Hier gibst du eine Liste (durch Komma getrennt) der Stimmen an, für
welche Wiederholungszeichen anstelle einer Sprunglinie ausgegeben
werden.

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

## REST\_SIZE

Hier kannst du die Größe der Pausen einstellen. Sinnvolle Werte sind
\[2-4, 1.2-2\]

> **Hinweis**:Bitte beachte, dass nur die Angabe der Höhe von
> berücksichtigt wird, da das Pausensymbol nicht verzerrt werden darf.

## show

Dieser Eisntellung steuert, ob das Objekt (z.B. das Bild) in der Ausgabe
angezeigt werden soll.

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
-   `C Cis D Dis E F Fis G Gis A Aia Bb B` erzeugt die regulären
    Saitennamen

## style

Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl
aus vordefinierten Stilen.

## templates

Dieser Parameter kann nicht vom Benutzer gesetzt werden sondern liefert
die Vorlagen beim Einfügugen neuer Liedtext-Blöcke bzw.
Seitenbeschriftungen etc.

Er ist hier aufgeführt, um die Vorlagen selbst zu dokumentieren.

## template

Hier kannst du spezifische Eigenschaften des Template anpassen. Das ist
nur relevant, wenn du ein Template bearbeitest.

> **Hinweis** Diese Eigenschaften werden auch in abc dateien geschrieben
> welche auf Basis des vorhandenen Templates erstellt werden. Damit kann
> mnan feststellen, welches termplate der aktuell geöffnteten ABC -
> datei zu Grunde liegt.

## template.filebase

Hier kannst du den Dateinamen (ohne Erweiterung) des Templates angeben.
Wenn die F-Kopfzeile eine Platzhalter-Startsquenz (`{{`) enthält, wird
der in diesem Parameter angegebenen Name zum Speichern verwendet

## template.title

Hier kannst du einen informativen Titel für die Vorlage angeben. Damit
kannst du die Vorlage identifizieren.

## tuplet

Hier kannst du die Darstellung von Triolen (genauer gesagt, von n-Tolen)
steuern.

> **Hinweis**:
>
> Wenn du mehrere n-Tolen gemeinsam konfigurieren möchtest, ist es
> notwendig, eine "Verschiebemarke" vor die betroffene n-Tole zu setzen.
> Dabei ist es möglich, mehrere Tuplets gemeinsam zu konfigurieren wenn
> man die Verschiebemarken gleich benennt.
>
> Z.B. kann man eine Verschiebemarke `tpl_links` an alle tuplets
> schreiben, deren Bogen links von der FLußlineie liegen soll. Diese
> können dann über den parameter `extract.0.tuplet.tpl_links` gemeinsam
> konfiguriert werden

## tuplet.0

Hier kannst du die Darstellung einer Triole (genauer gesagt, einer
n-tole) steuern.

## tuplets

Hier kannst du die generelle Darstellung von n-Tolen konfigurieren.

## tuplets.text

Hier kannst du die Darstellung der n-Tolen - Nummer konfigurieren. Der
Wert ist ein Text, in welchem der Platzhalter `{{tuplet}}` durch die
n-Tolen - Nummer ersetzt wird.

So wird beispielsweise mit `- {{tuplet}} -` die n-Tolen - Nummer als
`- 3 -` dargestellt.

## cp1

Hier gibst du den Kontrollpunkt für die erste Note an.

## cp2

Hier gibst du den Kontrollpunkt für die letzte Note an.

## shape

Hier gibst du eine Liste von Linienformen für die n-tole an.

-   `c`: Kurve
-   `l`: Linie

> **Hinweis**: Mit der Linienform `l` kann man die Lage der
> Kontrollpunkte (als Ecken im Linienzug) sehen.

## tuplet.show

Hier gibst du an, ob die n-Tole ausgegeben werden soll.

## text

Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann
auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-   `{{composer}}`: Komponist aus `C:` Zeilen
-   `{{current_year}}`: das aktuelle Jahr
-   `{{key}}`: Tonart aus `K:` Zeile
-   `{{meter}}`: Taktart aus `M:` Zeile
-   `{{number}}`: Nummer aus `X:` Zeile
-   `{{o_key}}`: Originaltonart
-   `{{tempo}}`: Tempo aus `Q:`Zeile
-   `{{title}}`: Titel aus `T:` Zeilen
-   `{{extract_title}}`: titel des auszgs aus "extract.\*.title",
-   `{{extract_filename}}`: Filenamenszusatz aus
    "extract.\*.filenamepart"},
-   `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden
    die entsprechneden Filenamenzusätze ausgegeben.
-   `{{watermark}}`: Wasserzeichen (mit
    `setsettings wartermark "wasserzeichen"` eingestellt)

## sortmark

Hier konfigurierst du die Ausgabe einer Sortiermarke. Die Sortiermarke
wird am oberen Blattrand gedruckt. Ihre horiozontale Position entspricht
einer alphabetischen Sortierung der Titel. In einem nach Titel
sortierten Stapel von Notenblättern bewegt sich die Sortiermarke also
von links nach rechts. Damit kann man beim durchblättern gleich sehen,
ob der Stapel sortiert ist.

> **Hinweis**: Leider kann auf haushaltsüblichen Druckern nicht bis zum
> Rand gedrukht werden. Daher muss man die Sortiermake mit einem
> Filzstift bis zum Rand verlängern, dann kann man die Sortierung eiens
> Stapels kontrollieren, in dem man auf die Schnittkante des Stapels
> schaut.

## sortmark.fill

Hier gibst du an, ob die Sortiermarke gefüllt werden soll. Die gefüllte
Sortiermarke ist besser zu erkennen, könnte aber auch als störender
empfunden werden.

## sortmark.size

Hier gibst du die Gräße der Sortiermarke an. Die Voreinstallung von
\[2,4\] hat sich als praktikabel erwiesen.

## sortmark.show

Hier gibst du an, ob eine Sortiermarke ausgegeben werden soll.

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

## X\_SPACING

Hier gibst du den Saitenabstand in mm an. Normalerweise ist das 11.5 mm.

## \$resources

Hier siehst du eine Liste alle Bilder, die du geladen hast.

-   Du kannst sie löschen indem du auf den Papierkorb klickst.
-   Du kannst eine kleine Vorschau sehen wenn du auf Hilfe (?) klickst.

> **Hinweis**: Bitte beachte, dass die Bilder erst dann auf deinem Blatt
> erscheinen, wenn du sie im entsprechenden Auszug anlegst.

> **Hinweis**: Du kannst Bilder im JPG-Format hinzufügen über das Menü
> `Datei / Import`. Alternativ kannst du eine JPG Datei in Zupfnoter
> hineinziehen.
