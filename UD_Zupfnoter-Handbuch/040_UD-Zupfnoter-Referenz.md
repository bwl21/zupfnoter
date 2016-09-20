\cleardoublepage

# Zupfnoter - Übersicht für Einsteiger und Experten

Zum Verständnis von Zupfnoter ist es wichtig zu verstehen:

-   [Elemente der von Zupfnoter erstellten
    Unterlegnoten](#elemente-der-von-zupfnoter-erstellten-unterlegnoten)
-   [Genereller Bildschrirmaufbau]
-   [Zupfnoter-Prinzipien] (gezielte Umwandlung von ABC-Notation in
    Unterlegnoten)

## Elemente der von Zupfnoter erstellten Unterlegnoten

![Zupfnoter
elemente](../ZAUX_images/3015_reference_sheet_alle-Stimmen_a3.pdf)

Dieses Bild zeigt die Elemente und Merkmale aus denen Zupfnoter ein
Unterlegnotenblatt aufbaut:

### Darstellung der Noten

TODO: Querverweise zur Konfiguration

In der ABC-Notation wird in den Kopfzeilen ein Standardnotenwenwert
angegeben, z.B. `L:1/4`. Dies bedeutet, daß standarardmäßig in
Viertelnoten geschrieben wird. Ausge von diesem Wert ergibt sich der
Notenwert duch Multplikation mit der angegebenen Länge. Diese
Längenangaben wird an den Notennamen angehängt. TODO: verweise auf
ABC-Kapitel

Im Folgenden wird von Vierteln als Standardnotenwert und dem Notennamen
`C` ausgegangen.

-   **(1) full note - ganze Note** entspricht in ABC-Notation: `C4`

-   **(2) half note - halbe Note** entspricht in ABC-Notation: `C2`

-   **(3) quarter note - viertel Note** entspricht in ABC-Notation: `C`
    oder `C1`

-   **(4) eighth note - achtel Note** entspricht in ABC-Notation: `C1/2`
    oder `C/`

-   **(5) sixteenth note - sechzehntel Note** entspricht in
    ABC-Notation: `C1/4` oder `C//`

-   **(6) punctuated half note - punktierte halbe** entspricht in
    ABC-Notation: `C3`

-   **(7) punctuated quarter note - punktierte viertel** entspricht in
    ABC-Notation: `C3/2` (Also drei halbe viertel :-)

### Darstellung von Pausen

-   **(11) full rest** entspricht in ABC-Notation: `z4`

-   **(12) half rest** entspricht in ABC-Notation: `z2`

-   **(13) quarter rest** entspricht in ABC-Notation: `z` oder `z1`

-   **(14) eighth rest** entspricht in ABC-Notation: `z1/4` oder `z//`

-   **(15) sixteenth rest** entspricht in ABC-Notation: `z1/4` oder
    `z//`

-   **(16) punctuated half rest** entspricht in ABC-Notation: `z3`

-   **(17) punctuated quarter rest** entspricht in ABC-Notation: `z3/2`
    (Also drei halbe viertel :-)

### Darstellung notenbezogener Elemente

-   **(20) measure bar - Taktstrich**: Der Taktstrich entseht aus der
    Takteingabe in der ABC-Notation (z.B. `| |]`). Zur Eingabe dieser
    Zeichen siehe ([Tastenkombinationen für
    Sonderzeichen](#tastenkombinationen-für-sonderzeichen))

-   **(21) unison - Mehrklang**:\
    Ein Mehrklang entsteht, wenn in der ABC-Notation mehrere Noten in
    einer eckigen Klammer eingegeben werden (z.B. `[FA]`). Damit kann
    man innerhalb **einer** Stimme mehrere Noten spielen.

    Die Noten eines Mehrklanges werden automatisch mit einer
    Synchronisationslinie verbunden (siehe (26)).

    > **Hinweis**: Dieser Mehrklang sieht in den Unterlegnoten nahezu
    > gleich aus - wie der Zusammenklang von Tönen aus mehrerer Stimmen.
    > Man kann sie jedoch anhand der Flußlinie unterscheiden und den
    > jeweiligen Stimmen zuordnen.
    >
    > Die Angabe von Akkordsymbolen in ABC-Notation wird für die
    > Unterlegnoten ignoriert.

-   **(22) triplet - Triole**: Eine Triole verbindet Anfang und Ende mit
    einem Bogen und schreibt die Länge der Triole an den Bogen.
    Zupfnoter kann beliebige Tuplets, auch wenn bei Tischharfen meistens
    nur Triolen verwendet werden.

    Ein Triole entsteht, wenn in der ABC-Notation den Noten der Triole
    eine Klammer mit der Länge der Triole vorangestellt wird (z.B:
    `(3CCC`).

-   **(23) tie - Haltebogen**: Ein Haltebogen verbindet zwei Noten
    gleicher Höhe miteinander. Dabei wird nur die erste Noten
    angeschlagen. Ein Haltebogen entsteht, wenn in der ABC-Notation die
    Noten durch einen Bindestrich verbunden sind, (z.B. `A -|A`).

    > **Hinweis**: Der Haltebogen ist zu unterscheiden vom Bindebogen,
    > welcher in der Notenansicht gleich aussieht, in den Unterlegnoten
    > jedoch nicht ausgegeben wird, da man ihn auf der Tischharfe nicht
    > spielen kann. Der Bindebogen wird in der ABC-Notation durch
    > Einklammern der Noten erstellt, (z.B. `(A|A)`).

-   **(24) repeat signs - Wiederholungszeichen**: Eine Wiederholung
    entsteht durch Beifügen eines Doppelpunktes an Taktstriche in der
    ABC-Notation (z.b. `|: C4 :|`).

    > **Hinweis** Wiederholungszeichen sind eine Alternative zu
    > Sprunglinien. Ihre Ausgabe hängt von den [Einstellungen in der
    > Konfiguration](#repeatsigns) ab.

-   **(27) part note - Bezeichnung von Abschnitten im Musikstück**: Man
    kann ein Musikstück in Abschnitte aufteilen. Die Abschnitte können
    bezeichnet werden, z.B. als "Teil 1". Der Abschnitt unterbricht auch
    die Flusslinien.

    Ein Abschnitt entsteht, wenn in der ABC-Notation der ersten Note des
    neuen Abschnittes die Zeichenfolge z.B. `[P:Teil 1]` vorangestellt
    wird.

-   **(28) countnotes - Zählnotizen**: Zupfnoter kann die Noten
    automatisch mit Zählhilfen beschriften. Diese Ausgabe ist
    konfigurationsabhängig. Die Zählweise ergibt sich aus der
    Taktangabe. Beispiel siehe Abbildung [Zupfnoter elemente].

-   **(TODO) barnumbers - Taktnummer**: Zupfnoter kann die Takte
    automatisch durchnummerieren. Damit kann bei gemeinsamem Spiel auch
    mitten im Musikstück wieder aufsetzen. Diese Ausgabe ist
    konfigurationsabhängig.

### Darstellung von Verbindungslinien

-   **(25) jumpline for repeat - Sprungline für Wiederholungen**: Eine
    Wiederholung entsteht durch Beifügen eines Doppelpunktes an
    Taktstriche in der ABC-Notation (z.b. `|: C4 :|`).

    > **Hinweis** Sprunglinien sind eine Alternative zu
    > Wiederholungszeichen. Ihre Ausgabe hängt von den [Einstellungen in
    > der Konfiguration](#repeatsigns%20TODO) ab.

-   **(26) synchline for unison- Synchronisationslinie für Mehrklang**
    siehe (21)

-   **(29) variant ending - Variante Enden**: Wo Wiederholungen
    unterschiedlich enden, bezeichnet man das als variante Enden. In der
    ABC-Notation schreibt man hierfür Ziffern (z.B. 1 und 2) unmittelbar
    hinter den Taktstrich.

    Zupfnoter stellt diese varianten Enden als eine Menge von
    Sprunglinien dar:

    -   Eingangslinie (im Beispiel links)
    -   Ausgangslinie (im Beispiel rechts)

    Mehr Einzelheiten siehe Kapitel [Handhabung Variante Enden].

-   **(31) flowline - Flusslinie oder Melodielinie**: Die Flußlinie
    verbindet die Noten einer Stimme. Standardmäßig stellt Zupfnoter die
    Flußline in der ersten und dritten Stimme dar.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Flußlinien für die jeweiligen Stimmen eingestellt
    > werden. [extract.0.flowlines]

-   **(33) subflowline - Unterflusslinie**: Die Unterflusslinie
    verbindet innerhalb einer Stimme ohne Flußline diejenigen Noten, die
    nicht über eine Synchronisationslinie (32) mit einer anderen Stimme
    verbunden sind.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Unterflußlinien für die jeweiligen Stimmen eingestellt
    > werden. [extract.0.subflowlines]

-   **(32) synchline - Synchronisationslinie**: Die
    Synchronisationslinien verbinden Noten aus zwei unterschiedlichen
    Stimmen, die zum gleichen Zeit gespielt werden. Standardmäßig stellt
    Zupfnoter die Synchronisationslinie zwischen den Stimmen *eins und
    zwei* sowie *drei und vier* dar.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Synchronisationslinien eingestellt werden.
    > [extract.0.sychlines]

### Elemente für das gesamte Musikstück

-   **(34) legend - Legende** Die Legende ist die grundsätzliche
    Information über das Musikstück. Die Inhalte der Legende werden aus
    den Kopfzeilen der ABC-Notation übernommen:

    -   Titel des Musikstücks (ABC-Notation Zeile `T:`)
    -   Titel des Auszugs siehe (35)
    -   Autoren des Musikstücks bzw. Liedes (ABC-Notation Zeile `C:`)
    -   Takt des Musikstücks (ABC-Notation Zeile `M:`)
    -   Empfohlene Geschwindigkeit (ABC-Notation Zeile `Q:`
    -   Tonart des Musikstücks (ABC-Notation Zeile `K:`)
    -   Tonart der Druckausgaben falls das Musikstück transponiert wurde
        (ABC-Notation z.B. `I:transpose=1`)

    Die Legende kann mit Maus optimal positioniert werden.

-   **(35) extract title in legend - Titel des Auszugs** Dies bezeichnet
    den Titel des Auszuges (siehe Konfiguration [extract.x.title]).

-   **(36) lyrics - Liedtexte** Zupfnoter stellt auch Liedtexte dar.
    Diese Liedtexte werden aus aufeinander folgenden Kopfzeilen der
    ABC-Notation entnommen (`W:`) und zu Strophen zusammengefügt.

        W: Strophe 1 Zeile 1
        W: Strophe 1 Zeile 2
        W:
        W: Strophe 2 Zeile 1
        W: Strophe 2 Zeile 2

    > **Hinweis** Die Ausgabe der Strophen muß über die Konfiguration
    > eingestellt werden (siehe [extract.x.lyrics])

-   **(37) stringnames - Saitennamen** Zupfnoter kann die Namen der
    Saiten auf den Unterlegnoten ausgeben.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Saitennamen eingestellt werden.
    > [extract.0.stringnames]

-   **(TODO) marks - Blattpositionierungsmarke** Die
    Blattpositionierungsmarken sind Hilfe zum korrekten Einlegen der
    Unterlegnoten in die Tischharfe. Das Blatt muss eingelegt werden,
    dass die Markten unter den G-Saiten liegen.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Blattpositionierungsmarke beeinflußt werden.
    > [extract.0.stringnames.marks]

-   **(TODO) cutmarks - Schneidemarken** Die Schneidemarken sind eine
    Zuschenidehilfe für den Fall, dass die Unterlegnoten auf Din-A4
    Seiten ausgegeben werden.

-   **(TODO) Ausgabeinformation** Die Ausgabeinformation hilft, den
    Ursprung eins ausgedruckten Blattes nachzuvollziehen. Sie besteht
    aus

    -   Dateiname der ABC-Datei
    -   Zeipunkt der Erstellung der PDF-Datei (CEST steht für Central
        Eurpean Summer Time)
    -   Version von Zupfnoter
    -   Server von welchem der Zupfnoter geladen wurde
-   **(TODO) Referenz auf Zupfnoter** Dies ist die Referenz auf
    Zupfnoter als Werkzeug zur Erstellung des Unterlegnotenblattes.

-   **{TODO} Fingerabdruck** Diese Nummer ist wie ein Fingerabdruck der
    ABC-Datei. Dies bedetuet, dass Blätter mit dem selben Fingerabdruck
    auch aus einer identischen Quelle stammen und somit zuverlässig
    zusammen passen.

## Genereller Bildschirmaufbau

-   Fenster
    -   Reiter
    -   Leiste für Schaltflächen und Menüse
    -   Kontextmenüs (rechte Maustaste)
-   Zupfnoter Werkzeugleiste / Toolbar / Leiste für Schaltflächen und
    Menüs(deutsch ...) oben
-   Zupfnoter Statusleiste (

Im rechten oberen Abschnitt wird in der herkömmlichen Notenschrift das
Musikstück. Die Darstellung in herkömmlicher Notenschrift kann
mehrstimmig erfolgen.

Im rechten unteren Abschnitt werden die Tisch-Harfen-Noten angezeigt.
Diese entsprechen 1 zu 1 der herkömmlichen Notenschrift im rechten
oberen Abschnitt. Es gibt bei der Darstellung von Pausen in den
Tisch-Harfen-Noten eine Besonderheit: Ganze und halbe Pausen werden
nicht in der herkömmlichen Weise dargestellt, sondern als große oder
kleine Rechtecke.

Im linken Abschnitt werden die ABC-Notation und die Zupfnoter-Kommandos
angezeigt. Für die ABC-Notation gibt es eine separate Anleitung. Mit
Hilfe der ABC-Notation und der Zupfnoter-Kommandos wird das Notenbild
für die Tischharfen generiert.

In der oberen Leiste, die über alle Abschnitte hinweg liegt, können
einzelne Schaltflächen ausgeführt oder Menüs angezeigt werden.

TODO Hardcopy des Bildschirmes hier einfügen???

### Leiste für Schaltflächen und Menüs

In der oberen Leiste über den 3 Abschnitten befinden sich Schaltflächen
und Menüs die man während der Erstellung von Tisch-Harfen-Noten
benötigt. Durch Drücken der Schaltflächen führt der Computer bestimmte
Aktivitäten aus. Die Menüs dienen dazu, die Tisch-Harfen-Noten zu
gestalten.

-   Schaltfläche **Zupfnoter**: TODO: – Detailinfo als Popup darstellen

-   Schaltfläche **login** (anmelden): TODO: -
    https://github.com/bwl21/zupfnoter/issues/75

-   Schaltfläche **create** (erstellen): Es wird ein leerer Bildschirm
    ohne Inhalte erstellt und man kann ein neues Musikstück erstellen.

-   Schaltfläche **open** (öffnen): Es öffnet sich die eigene Dropbox.
    Der grüne Hinweis not connect nach der Schaltfläche save bedeutet,
    dass die Dropbox nicht mit dem Zupfnoter verbunden ist.

-   Schaltfläche **save** (sichern, speichern): Das fertig gestellte
    Musikstück wird in die eigene Dropbox gespeichert. Es wird eine
    Abc-Datei, eine Datei mit Tisch-Harfen-Noten in A3 und eine Datei
    mit Tisch-Harfen-Noten in A4 gespeichert. Solange man noch nichts
    abgespeichert hat, erscheint das Wort save in roter Schrift.

-   Schaltfläche **A3**: Es öffnet sich ein Fenster mit
    Tisch-Harfen-Noten im A3 Format als pdf. Dies kann nun ausgedruckt
    werden oder auf dem PC als pdf-Datei abgespeichert werden. Vor dem
    Drucken bitte in den Druckereigenschaften randlos einstellen und
    über vergrößern/verkleinern den richtigen Wert für den jeweiligen
    Drucker ermitteln. Für jeden Druckertyp können diese Werte anders
    sein.

-   Schaltfläche **A4**: Es öffnet sich ein Fenster mit
    Tisch-Harfen-Noten im A4 Hochformat als pdf. Dies kann nun
    ausgedruckt werden oder auf dem PC als pdf-Datei abgespeichert
    werden. Die Kreuze auf dem A4 Papier kennzeichnen, an welcher Stelle
    die drei A4-Blätter zusammen geklebt werden müssen. Entweder klebt
    man mit einem Prittstift oder mit Tesafilm die Blätter zusammen.

-   Schaltfläche **Console** (Konsole): Mit der Schaltfläche console
    kann man einen Blick auf die Computersprache des Notenzupfers
    werfen. Dieser Befehl sollte nur von Programmierer genutzt werden.
    Die Performance des Computers wird dadurch schlechter.

-   Schaltfläche **zoom** (Fernglas): Hiermit kann man die Inhalte der
    rechten Abschnitte mit den herkömmlichen Noten und
    Tisch-Harfen-Noten vergrößern oder verkleinern. Als Standrad ist
    medium (mittel) vorgegeben. Es kann auf large (groß) und small
    (klein) gewechselt werden.

-   Schaltfläche **Perspective** (Ansicht): Hiermit kann man festlegen,
    wie der Bildschirmaufbau des Zupfnoter gestaltet sein soll. Einige
    Abschnitte können so ausgeblendet werden.

    -   Mit der Einstellung **All** (alles) ist der
        Standardbildschirmaufbau mit drei Abschnitten (ABC-Notation,
        herkömmliche Noten, Tisch-Harfen-Noten).

    -   Mit der Einstellung **Enter Notes** (Erweiterte Noten) sieht man
        die Abschnitte der ABC-Notation und der herkömmlichen Noten.

    -   Mit der Einstellung **Enter Harp** (Erweiterte Harfennoten)
        sieht man die Abschnitte ABC-Notation und Tisch-Harfen-Noten.

    -   Mit der Einstellung **Notes** (Noten) sieht man nur noch den
        Abschnitt der herkömmlichen Noten.

    -   Mit der Einstellung **Harp** (Harfe) sieht man nur den Abschnitt
        mit den Tisch-Harfen-Noten.

    Um das herkömmlichen Notenbild drucken zu können, geht man auf Notes
    (Noten) und verkleinert das Fenster, dann rechts am Rand mit dem
    Mauszeiger kleiner ziehen, bis ein Seitenwechsel durchgeführt wird,
    danach den Druck anstoßen.

-   Schaltfläche **Korb** (Auszug): entspricht dem Zupfnoter-Kommando
    extract Es gibt die Auszüge 0 bis 3. Der Auszug 0 beinhaltet alle
    Stimmen und wird automatisch vom Zupfnoter erstellt. Wenn man einen
    Auszug erstellen möchte, wählt man z.B. Auszug 1 aus und definiert
    im Abschnitt links, was man im Auszug 1 sehen möchte: 1.te und 2.te
    Stimme. Der Auszug 2 könnte dann zur Darstellung der 3.ten und 4.ten
    Stimme dienen.

-   Schaltfläche **render** (ausführen): alternativ `Strg` und `R`

    Nach der Fertigstellung der ABC-Notation wird mit diesem Befehl die
    Ansicht der Tisch-Harfen-Noten erstellt. Danach wird das Design der
    Tisch-Harfen-Noten anhand der Zupfnoter-Kommandos erstellt und zur
    Kontrolle regelmäßig der Befehl ausgeführt, um die
    Tisch-Harfen-Noten zu aktualisieren.

-   Schaltfläche **play** (spielen): Hiermit spielt man den Auszug 0 mit
    allen vorhandenen Stimmen auf dem Computer ab, um evtl. Fehler in
    den Notenwerten oder Notennamen entdecken zu können. Es werden keine
    Wiederholungen abgespielt, sondern nur die Noten von oben nach unten
    durchgespielt.

-   Schaltfläche **help** (Hilfe): Hier findet man Anleitungen zum
    Andrucken, die einem helfen den Zupfnoter zu verstehen.

-   Schaltfläche **sheet config** (Blattkonfiguration):

    Dieses Menü dient der Gestaltung und dem Design der
    Tisch-Harfen-Noten. Jeder Menüpunkt erzeugt eine ABC-Notationszeile
    oder ein Zupfnoter-Kommando für den linken Bildschirm-Abschnitt.

    Die Reihenfolge der Menüpunkte entspricht der Bearbeitungsabfolge,
    wobei Menüpunkte auch übersprungen werden dürfen. Die Erstellung der
    ABC-Notation sollte abgeschlossen, bevor man mit der Gestaltung der
    Tisch-Harfen-Noten beginnt.

    Die Menüpunkte sind im Kapitel
    [Grundlegende-Blatteinstellungen](#grundlegende-blatteinstellungen)
    beschrieben

    TODO: Die Menüpunkte müssen pro Auszug ausgeführt werden. Hardcopy
    (snippet) des Menüs hier einfügen???

-   Schaltfläche **dl_abc** dlabc ist eine Abkürzung für download
    ABC-Notation (inkl. Einstellungen.)

    Hiermit kann man Zwischenstände oder fertige Musikstücke als
    ABC-Datei auf seinen Rechner herunterladen. Abgelegte Dateien können
    mit der Maus wieder in den Zupfnoter in den linken Abschnitt gezogen
    werden und der Inhalt steht zur Bearbeitung im Zupfnoter wieder zur
    Verfügung.

### Linkes Fenster: Eingabe

#### ABC-Notation

Die ABC-Notation wurde erfunden, um Musikstücke auf Computern
verarbeiten zu können. Computer können die ABC-Notation interpretieren,
um daraus herkömmliche Musiknoten zu generieren oder auch Musikstücke
auf dem Computer abspielen zu können. Unter dem Hilfemenü des Zupfnoters
findet man eine deutsche Anleitung für die ABC-Notation.

Als zusätzliche Information zu dieser Anleitung sei noch erwähnt, dass
der Befehl X: (Liednummer) eine positive Ganzzahl sein muss. Es dürfen
keine Buchstaben, Leerzeichen oder Unterstriche enthalten sein.

Veränderungen in der ABC-Notation im linken Abschnitt führen sofort zu
einer Änderungen des rechten oberen Abschnitts der herkömmlichen
Notenschrift. Veränderungen in der ABC-Notation führen nicht automatisch
zu einer Veränderung der Tisch-Harfen-Noten im linken unteren Abschnitt.
Um dies zu bewirken muss man in der Menüleiste auf "render" (umwandeln)
drücken. Nach dem Drücken von render (umwandeln) wird die ABC-Notation
in das Design der Tisch-Harfen-Noten umgewandelt und in der Vorschau
angezeigt.

Das Ende der ABC-Notation wird mit einer Leerzeile eingeleitet. Sollte
nach einer Leerzeile noch ABC-Notation folgen, wird dies vom Computer
ignoriert. Die Zupfnoter-Kommandos fangen mit dem Kommentar
%%%%zupfnoter.config an. Die ABC-Notation und die Zupfnoter-Kommandos
dürfen nicht gemischt werden.

Wenn man mit der Maus eine Note in der ABC-Notation anklickt, wechselt
die Note in der herkömmlichen Notenschrift und in den Tisch-Harfen-Noten
von schwarz auf Rot. Umgekehrt funktioniert es genauso. So findet man
schnell zu einer Stelle, die man ändern möchte oder wo man was
hinzufügen möchte.

Die ABC-Notation kann man anhand der Anleitung im Hilfemenü manuell
eingeben oder man sucht das gewünschte Stück im Internet auf einer
Musikseite raus und lädt sich das Musikstück im xml-Format herunter.
Danach wird die xml-Datei per Maus in den Zupfnoter in den linken
Abschnitt gezogen. Der Zupfnoter übersetzt das xml-Format in Abc
Notation. Bei der Auswahl eines Musikstückes im xml-Format sollte man 30
Takte nicht überschreiten und den Schwerpunkt auf Klaviernoten legen.
Ausserdem sollte man auf die Bandbreite der Noten achten, die
Tisch-Harfen mit 25 Saiten haben eine Bandbreite g bis g‘‘.

#### Linker Abschnitt Zupfnoter-Einstellungen

Über die Zupfnoter-Kommandos wird das Design der Tisch-Harfen-Noten
verfeinert. So können zum Beispiel repeat lines (Wiederholungslinien)
besser positioniert werden oder string names (Saitennamen) eingefügt
werden. Die Zupfnoter-Kommandos können manuell eingegeben werden oder
über das Menü sheet config (Blattkonfiguration) erzeugt werden. Weitere
Informationen zu den Zupfnoter-Kommandos stehen im nächsten Kapitel.

Wichtig ist, immer daran zu denken nach einer Änderung in der Menüleiste
auf render (ausführen) zu drücken, damit die Tisch-Harfen-Noten
aktualisiert werden.

Mit der Maus können in diesem Teil Textfelder optimal dem Stimmverlauf
angepasst werden. Danach sind die Werte in dem entsprechenden
Zupfnoter-Kommando bzgl. der Positionsparameter angepasst worden.

#### Fehlermarkierung und Fehlermeldung

Der Zupfnoter zeigt über ein rotes Quadrat mit Kreuz links vor den Abc
Notationszeilen oder den Zupfnoter-Kommandos an, daß in der Zeile ein
Fehler vorhanden ist. Wenn man mit der Maus auf das rote Quadrat geht,
wird die Fehlermeldung angezeigt, z.B. abc:12:19 error=F-Text. Das
bedeutet in Zeile 12 an Stelle 19 ist der F-Text nicht korrekt.

Es müssen alle Fehler beseitigt werden, ansonsten können keine
herkömmlichen Noten oder Tisch-Harfen-Noten generiert werden.

TODO: Hardcopy (snippet) von rotem Quadrat mit Kreuz hier einfügen???

TODO: popup-Fenster für Fehlermeldungen

### Fenster rechts oben : Notenvorschau

TODO:

### Fenster rechts unten : Harfenvorschau
