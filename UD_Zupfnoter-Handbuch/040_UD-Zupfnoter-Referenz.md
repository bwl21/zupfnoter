\cleardoublepage

# Zupfnoter - Übersicht für Einsteiger und Experten

Zum Verständnis von Zupfnoter sind folgende Themen wichtig:

-   [Elemente der von Zupfnoter erstellten
    Unterlegnoten](#elemente-der-von-zupfnoter-erstellten-unterlegnoten)
-   [Genereller Bildschimaufbau]
-   [Zupfnoter-Prinzipien] (Umwandlung von ABC-Notation in
    Unterlegnoten)

## Elemente der von Zupfnoter erstellten Unterlegnoten

![Zupfnoter
Elemente](../ZAUX_images/3015_reference_sheet_alle-Stimmen_a3.pdf)

Dieses Bild zeigt die Elemente und Merkmale aus denen Zupfnoter ein
Unterlegnotenblatt aufbaut:

### Darstellung der Noten

TODO: Querverweise zur Konfiguration

In der ABC-Notation wird in den Kopfzeilen ein Standardnotenwert
angegeben, z.B. `L:1/4`. Dies bedeutet, daß standardmäßig in
Viertelnoten erfasst wird. Ausgehend von diesem Wert ergibt sich der
Notenwert duch Multplikation mit der angegebenen Länge. Diese
Längenangaben wird an den Notennamen angehängt. TODO: verweise auf
ABC-Kapitel

Im Folgenden wird von **Vierteln als Standardnotenwert** und dem
Notennamen `C` ausgegangen.

-   **(1) full note - ganze Note** entspricht in ABC-Notation: `C4`

-   **(2) half note - halbe Note** entspricht in ABC-Notation: `C2`

-   **(3) quarter note - viertel Note** entspricht in ABC-Notation: `C`
    oder `C1`

-   **(4) eighth note - achtel Note** entspricht in ABC-Notation: `C1/2`
    oder `C/`

-   **(5) sixteenth note - sechzehntel Note** entspricht in
    ABC-Notation: `C1/4` oder `C//`

-   **(6) punctuated half note - punktierte halbe Note** entspricht in
    ABC-Notation: `C3`

-   **(7) punctuated quarter note - punktierte viertel Note** entspricht
    in ABC-Notation: `C3/2` (also drei halbe Viertel :-)

### Darstellung von Pausen

Im Folgenden wird von **Vierteln als Standardnotenwert** ausgegangen.

-   **(11) full rest - ganze Pause** entspricht in ABC-Notation: `z4`

-   **(12) half rest - halbe Pause** entspricht in ABC-Notation: `z2`

-   **(13) quarter rest- viertel Pause** entspricht in ABC-Notation: `z`
    oder `z1`

-   **(14) eighth rest - achtel Pause** entspricht in ABC-Notation:
    `z1/4` oder `z//`

-   **(15) sixteenth rest - sechezhntel Pause** entspricht in
    ABC-Notation: `z1/4` oder `z//`

-   **(16) punctuated half rest - punktierte halbe Pause** entspricht in
    ABC-Notation: `z3`

-   **(17) punctuated quarter rest - punktierte viertel Pause**
    entspricht in ABC-Notation: `z3/2` (also drei halbe Viertel :-)

### Darstellung notenbezogener Elemente

Um auf dern Unterlegnoten einzelnen Noten graphische Elemente oder Texte
hinzuzufügen gibt es bei Zupfnoter Elemente, die fest mit Noten
verbunden sind. Da sie im Kontext von Noten positioniert werden, nennt
man sie "notenbezogene Elemente":

-   **(20) measure bar - Taktstrich**: Der Taktstrich entsteht aus der
    Takteingabe in der ABC-Notation (z.B. `| |]`). Zur Eingabe dieser
    Sonderzeichen siehe Kapitel \ref{dein-erstes-musikstueck-eingeben},
    ([Tastenkombinationen für
    Sonderzeichen](#dein-erstes-musikstueck-eingeben)

-   **(21) unison - Mehrklang**:\
    Ein Mehrklang entsteht, wenn in der ABC-Notation mehrere Noten in
    einer eckigen Klammer eingegeben werden (z.B. `[FA]`). Damit kann
    man innerhalb **einer** Stimme mehrere Noten spielen.

    Die Noten eines Mehrklanges werden automatisch mit einer
    Synchronisationslinie verbunden.

    > **Hinweis**: Dieser Mehrklang sieht in den Unterlegnoten nahezu
    > gleich wie der Zusammenklang von Tönen aus mehreren Stimmen aus.
    > Man kann sie jedoch anhand der Flußlinie unterscheiden und den
    > jeweiligen Stimmen zuordnen.
    >
    > Die Angabe von Akkordsymbolen in ABC-Notation wird für die
    > Unterlegnoten ignoriert.

-   **(22) triplet - Triole**: Bei einer Triole werden drei Noten auf
    zwei Schläge verteilt. Bei einer Triole werden Anfang und Ende einer
    Reihe von Noten mit einem Bogen verbunden. Die Länge der Triole wird
    an den den Bogen geschrieben. Eine Verallgemeinerung der Triole ist
    das Tuplet. Dieses verteilt n Noten auf m Schläge. Zupfnoter kann
    beliebige Tuplets, auch wenn bei Tischharfen meistens nur Triolen
    verwendet werden.

    Ein Tuplet entsteht, wenn in der ABC-Notation den Noten der Tuplets
    eine Klammer mit der Länge des Tupletes vorangestellt wird, z.B:
    "`(3CCC`".

-   **(23) tie - Haltebogen**: Ein Haltebogen verbindet zwei Noten
    gleicher Höhe miteinander. Dabei wird nur die erste Noten
    angeschlagen. Ein Haltebogen entsteht, wenn in der ABC-Notation die
    Noten durch einen Bindestrich verbunden sind, z.B. "`A -|A`".

    > **Hinweis**: Der Haltebogen ist zu unterscheiden vom Bindebogen,
    > welcher in der Notenansicht gleich aussieht, in den Unterlegnoten
    > jedoch nicht ausgegeben wird, da man ihn auf der Tischharfe nicht
    > spielen kann. Der Bindebogen wird in der ABC-Notation durch
    > Einklammern der Noten erstellt, z.B. "`(A|A)`".

-   **(24) repeat signs - Wiederholungszeichen**: Eine Wiederholung
    entsteht durch Beifügen eines Doppelpunktes an die Taktstriche in
    der ABC-Notation, z.B. "`|: C4 :|`".

    > **Hinweis** Wiederholungszeichen sind eine Alternative zu
    > Sprunglinien. Ihre Ausgabe hängt von den [Einstellungen in der
    > Konfiguration](#repeatsigns) ab.

-   **(27) part note - Bezeichnung von Abschnitten im Musikstück**: Man
    kann ein Musikstück in Abschnitte aufteilen. Die Abschnitte können
    bezeichnet werden, z.B. als "Teil 1". Der Abschnitt unterbricht auch
    die Flusslinien. Dieses Element wird häufig genutzt, um Abfolgen von
    Abschnitten beim Spielen festzulegen.

    Ein Abschnitt entsteht, wenn in der ABC-Notation der ersten Note des
    neuen Abschnittes z.B. die Zeichenfolge "`[P:Teil 1]`" vorangestellt
    wird. Hier ist "Teil 1" die Bezeichnung des Abschnitts.

-   **(28) countnotes - Zählhlfen**: Zupfnoter kann die Noten
    automatisch mit Zählhilfen beschriften. Diese Ausgabe ist
    konfigurationsabhängig. Die Zählweise ergibt sich aus der
    Taktangabe. Beispiel siehe Abbildung [Zupfnoter Elemente].

-   **(TODO) barnumbers - Taktnummer**: Zupfnoter kann die Takte
    automatisch durchnummerieren. Damit kann bei gemeinsamem Spiel auch
    mitten im Musikstück wieder aufsetzen. Diese Ausgabe ist
    konfigurationsabhängig.

### Darstellung von Verbindungslinien

Um auf den Unterlegenoten die Zusammenhänge zwischen Noten darzustellen,
gibt es folgende Elemente:

-   **(25) jumpline for repeat - Sprungline für Wiederholungen**: Eine
    Wiederholung entsteht durch Beifügen eines Doppelpunktes an die
    Taktstriche in der ABC-Notation z.B. "`|: C4 :|`".

    > **Hinweis** Sprunglinien sind eine Alternative zu
    > Wiederholungszeichen. Ihre Ausgabe hängt von den [Einstellungen in
    > der Konfiguration](#repeatsigns%20TODO) ab.

-   **(26) synchline for unison - Synchronisationslinie für Mehrklang**:
    siehe (21) in Kapitel \ref{darstellung-notenbezogener-elemente}:
    [Darstellung notenbezogener
    Elemente](#darstellung-notenbezogener-elemente)

-   **(29) variant ending - variante Enden**: Wo Wiederholungen
    unterschiedlich enden, bezeichnet man das als variante Enden. In der
    ABC-Notation schreibt man hierfür Ziffern (z.B. 1 und 2) unmittelbar
    hinter den Taktstrich.

    Zupfnoter stellt diese varianten Enden als eine Menge von
    Sprunglinien dar:

    -   Eingangslinie (im Beispiel links)
    -   Ausgangslinie (im Beispiel rechts)

    Mehr Einzelheiten siehe Kapitel [Handhabung variante Enden].

-   **(31) flowline - Flusslinie oder Melodielinie**: Die Flußlinie
    verbindet die Noten **einer** Stimme und markiert so die Führung
    innerhalb dieser **einen** Stimme. Standardmäßig stellt Zupfnoter
    die Flußline in der ersten und dritten Stimme dar.

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
    Synchronisationslinien verbinden Noten aus zwei **verschiedenen
    Stimmen**, die zum gleichen Zeit gespielt werden. Standardmäßig
    stellt Zupfnoter die Synchronisationslinie zwischen den Stimmen
    *eins und zwei* sowie *drei und vier* dar.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Synchronisationslinien eingestellt werden.
    > [extract.0.sychlines]

### Elemente für das gesamte Musikstück

Um auf den Unterlegnoten Texte und Beschriftungen allgemeiner Art
darstellen zu können, gibt es folgende Elemente:

-   **(34) legend - Legende**: Die Legende enthält die grundsätzlichen
    Informationen über das Musikstück. Die Inhalte der Legende werden
    aus den Kopfzeilen der ABC-Notation übernommen:

    -   Titel des Musikstücks (ABC-Notation Zeile "`T:`")
    -   Titel des Auszugs siehe (35)
    -   Autoren des Musikstücks bzw. Liedes (ABC-Notation Zeile "`C:`")
    -   Takt des Musikstücks (ABC-Notation Zeile "`M:`")
    -   Empfohlene Geschwindigkeit (ABC-Notation Zeile "`Q:`")
    -   Tonart des Musikstücks (ABC-Notation Zeile "`K:`")
    -   Tonart der Druckausgaben falls das Musikstück transponiert wurde
        (ABC-Notation z.B. "`I:transpose=1`")

    Die Legende kann mit der Maus im rechten unteren Fenster auf den
    Unterlegnoten optimal positioniert werden.

-   **(35) extract title in legend - Titel des Auszugs**: Dies
    bezeichnet den Titel des Auszuges (siehe Konfiguration
    [extract.x.title] bzw. Kapitel \ref{auszuege}[Auszüge](#auszuege)).

-   **(36) lyrics - Liedtexte**: Zupfnoter stellt auch Liedtexte dar.
    Diese Liedtexte werden aus aufeinander folgenden Kopfzeilen der
    ABC-Notation entnommen (`W:`) und zu Strophen zusammengefügt.
    Einzelne Strophen trennt man mit einer "Leerzeile" ("`W:`")

        W: Strophe 1 Zeile 1
        W: Strophe 1 Zeile 2
        W:
        W: Strophe 2 Zeile 1
        W: Strophe 2 Zeile 2

    > **Hinweis**: Die Ausgabe der Strophen muß über die Konfiguration
    > eingestellt werden (siehe [extract.x.lyrics])

-   **(37) stringnames - Saitennamen**: Zupfnoter kann die Namen der
    Saiten auf den Unterlegnoten ausgeben.

    > **Hinweis**: Über die [Einstellungen in der Konfiguration] kann
    > die Ausgabe von Saitennamen eingestellt werden.
    > [extract.0.stringnames]

-   **(38) marks - Saitenmarke** Die Saitenmarken sind eine Hilfe zum
    korrekten Einlegen der Unterlegnoten in die Tischharfe. Das Blatt
    muss so in die Tischharfe eingelegt werden, dass die Marken unter
    den G-Saiten liegen.

    > **Hinweis:** Über die [Einstellungen in der Konfiguration] kann
    > die Ausgabe der Saitenmarken beeinflußt werden.
    > [extract.0.stringnames.marks]

-   **(39) cutmarks - Schneidemarken**: Die Schneidemarken sind eine
    Zuschneidehilfe für den Fall, dass die Unterlegnoten auf DIN-A4
    Seiten ausgegeben werden.

-   **(70) input filename - Name der Eingabedatei**: Der Name der
    Eingabedatei hilft, den Ursprung eins ausgedruckten Blattes
    nachzuvollziehen. Er wird immer auf den Unterlegnoten ausgegeben und
    kann nicht unterdrückt werden.

-   **(71) creation note - Ersellungsnotiz**: Die Erstellungsnotiz gibt
    weitere Informationen zum technischen Stand der Erstellung. Diese
    wird immer auf den Unterlegnoten ausgegeben und kann nicht
    unterdrückt werden. Die Erstellungsnotiz hilft beim Nachvollziehen
    von Veränderungen und Sie besteht aus

    -   Zeitpunkt der Erstellung der PDF-Datei (CEST steht für
        "*C*entral *E*urpean *S*ummer *T*ime")
    -   Software-Version der Zupfnoter
    -   Server von welchem der Zupfnoter geladen wurde
-   **(72) reference to zupfnoter website - Referenz auf Zupfnoter
    Website**: Dies ist die Referenz auf Zupfnoter als Werkzeug zur
    Erstellung des Unterlegnotenblattes, also Werbung in eigener Sache.
    Diese wird immer auf den Unterlegnoten ausgegeben und kann nicht
    unterdrückt werden.

-   **{73} fingerprint - Fingerabdruck**: Diese Nummer ist wie ein
    Fingerabdruck der ABC-Datei. Dies bedeutet, dass Unterlegnoten (z.b.
    verschiedene Auszüge) mit dem selben Fingerabdruck auch aus einer
    identischen Quelle stammen und somit zuverlässig zusammen passen.

    > **Hinweis:** Der Fingarabdruck wird nicht auf den herkömmlichen
    > Noten ausgegeben. Der Fingerabdruck wird aus dem ABC-Text errechet
    > und ist daher nicht im ABC-Text enthalten.

## Genereller Bildschirmaufbau

Zupfnoter ist aus folgenden Bedienelementen aufgebaut:

-   Fenster
    -   links: **Editor** zum Eingeben der ABC-Notation
    -   rechts oben: **Notenvorschau** zur Kontrolle des Musikstücks
    -   rechts unten **Unterlegnotenvorschau**
-   Reiter zum Umschalten verschiedener Ansichten
-   **Werkzeugleiste** Leiste für Schaltflächen und Menüs
-   **Statusleiste**: für Syteminformationen
-   **Kontextmenü**: zur speziellen Bearbeitung von Elementen
    (erreichbar mit rechte Maustaste)

![Zupfnoter
Bildschirmaufbau](../ZAUX_Images/040_030_Bildschirmaufbau.pdf)

### Fenster

-   Im **rechten oberen Fenster** wird in der herkömmlichen Notenschrift
    das Musikstück gezeigt. Die Darstellung in herkömmlicher
    Notenschrift kann mehrstimmig erfolgen.

-   Im **rechten unteren Fenster** werden die Unterlegnoten angezeigt.
    Diese entsprechen inhaltlich der herkömmlichen Notenschrift im
    rechten oberen Fenster.

    Über die Reiter können verschiedene Zoom-Stufen eingestellt werden.

    > **Hinweis**: Da die Berechnung der Unterlegnoten einige Sekunden
    > dauert, wird dieses Fenster nur durch "rendern" aktualisiert.

-   Im **linken Fenster** wird die ABC-Notation sowie die
    Zupfnoter-Einstellungen angezeigt. Für die ABC-Notation gibt es eine
    separate Anleitung. Mit Hilfe der ABC-Notation und der
    Zupfnoter-Einstellungen wird das Notenbild für die Tischharfen
    generiert.

    Über die Reiter kann auf die formularbasierte Konfiguration
    umgeschaltet werden.

### WerkzeugleisteLeiste für Schaltflächen und Menüs

In der oberen Werkzeugleiste, die über alle Abschnitte hinweg liegt,
befinden sich Schaltflächen und Menüs die man während der Erstellung von
Unterlegnoten benötigt. Nach einem Klick auf die Schaltflächen führt der
Zupfnoter bestimmte Aktivitäten aus.

Einige Funktionen sind auch über Shortcuts erreichbar (siehe Kapitel
\ref{shortcuts} [Shortcuts](#shortcuts)

> **Hinweis**: Für die Vesion 1.5 wird die Bedienungsoberfläche von
> Zupfnoter verbessert. Daher sind die Informationen in diesem Kapitel
> vorläufig.

-   Schaltfläche **Zupfnoter**: TODO: – Detailinfo als Popup darstellen

-   Schaltfläche **Neu** (erstellen): Es wird ein leerer Bildschirm ohne
    Inhalte erstellt und man kann ein neues Musikstück erstellen.

-   Schaltfläche **Einloggen**: TODO: -
    https://github.com/bwl21/zupfnoter/issues/75

    Über diese Schaltfläche kannst du das Verzeichnis in der Dropbox
    angeben, in die Zupfnoter dein Musikstück speichert.

-   Schaltfläche **DL abc** (Download ABC): Hiermit kann man
    Zwischenstände oder fertige Musikstücke als ABC-Datei auf seinen
    Rechner herunterladen. Abgelegte Dateien können mit der Maus wieder
    in den Zupfnoter in den linken Abschnitt gezogen werden und der
    Inhalt steht zur Bearbeitung im Zupfnoter wieder zur Verfügung.

-   Schaltfläche **Öffnen**: Es öffnet sich ein Dateiauswahlfenster
    deiner Dropbox. Der grüne Hinweis not connect nach der Schaltfläche
    save bedeutet, dass die Dropbox nicht mit dem Zupfnoter verbunden
    ist.

    TODO: anpassen auf kommenden Dialog

    > **Hinweis**: in der Statuszeile wird der Verbindungszustand zur
    > Dropbox und auch das aktuelle Verzeichnis in der Dropbox
    > angezeigt.

-   Schaltfläche **Speichern** (sichern, speichern): Das fertig
    gestellte Musikstück wird in deiner Dropbox gespeichert. Es wird
    eine ABC-Datei, jeweils eine Datei für A3 und A4 für Unterlegnoten
    pro Auszug gespeichert.

    > **Hinweis:** Solange man noch nichts abgespeichert hat, erscheint
    > das Wort "Speichern" in roter Schrift.

-   Menü **Drucken**: Damit kann man Druckvorschauen anzeigen, welche
    auch über die Browser-Funktionen gedruckt werden können (siehe
    Kapitel \ref{musikstueck-drucken} [Muskstück
    drucken](#musikstueck-drucken)).

    -   Schaltfläche **A3**: Es öffnet sich ein Browserfenster mit
        Unterlegnoten im A3 Format als pdf. Dies kann nun ausgedruckt
        werden oder auf dem PC als pdf-Datei abgespeichert werden

    -   Schaltfläche **A4**: Es öffnet sich ein Browserfenster mit
        Unterlegnoten im A4 Hochformat als pdf. Diese Datei enthält dann
        drei Seiten und kann nun ausgedruckt werden oder auf dem PC als
        pdf-Datei abgespeichert werden. Die Schnittmarken auf dem A4
        Papier kennzeichnen, an welcher Stelle die drei A4-Blätter
        zusammen geklebt werden müssen. Entweder klebt man mit einem
        Prittstift oder mit Tesafilm die Blätter zusammen.

    -   Schaltfläche **Noten**: Es öffnet sich ein Browserfenster mit
        den Noten. Dies ist eine HTML - Datei und muss daher über den
        Browser gedruckt werden. Du kannst diese auch abspeichern, aber
        auch dann msus sie über den Bwoeder gedruct werden.

-   Menü **Ansicht** (Ansicht): Hiermit kann man festlegen, wie der
    Bildschirmaufbau des Zupfnoter gestaltet sein soll. Einige
    Abschnitte können so ausgeblendet werden.

    -   Die Einstellung **Alle Fenster** ist der
        Standardbildschirmaufbau mit drei Abschnitten (ABC-Notation,
        herkömmliche Noten, Unterlegnoten). In dieser Enstellung wird
        meistens gearbeitet, weil man eine schnelle Rückmeldung zu den
        Ergebnissen hat.

    -   Die instellung **Noteneingabe** zeigt den Editor (linkes
        Fenster) und die Notenvorachau (Fenster rechts oben). Diese
        Einstellung ist hilfreich, wenn man sich zunächst auf die reine
        Eingabe des Muskstücks konzentrieren will.

    -   Die Einstellung **Harfeneingabe** zeigt den Editor (linkes
        Fenster) und die Harfennotenvorschau (Fenster rechts unten).
        Diese Einstellung ist hilfreich wenn das Musikstück komplett
        erfasst ist, und man das Layout der Unterlegnoten optimieren
        will.

    -   Mit der Einstellung **Notes** (Noten) sieht man nur die
        herkömmlichen Noten.

    -   Mit der Einstellung **Harfennoten** (Harfe) sieht man nur eine
        Vorschau der Unterlegnoten. Diese Einstellugn ist hilfreich zur
        endgültigen Prüfung der erstellten Unterlegnoten.

        **Hinweis:** Im Gegensatz zur Druckvorschau werden in dieser
        Ansicht die abgespielten Noten rot dargestellt.

-   Schaltfläche **Auszug** (nur ein Korb-Symbol) bestimmt, welcher
    Auszug in der Unterlegnotenvorschau dargestellt wird. Für Details zu
    Ausuzügen siehe Kapitel \ref{auszuege} [Erstellung von
    Auszügen](#auszuege).

    Es gibt die Auszüge 0 bis 3. Der Auszug 0 beinhaltet alle Stimmen
    und wird automatisch vom Zupfnoter erstellt. Wenn man einen Auszug
    erstellen möchte, wählt man z.B. Auszug 1 aus und definiert im
    Abschnitt links, was man im Auszug 1 sehen möchte: 1.te und 2.te
    Stimme. Der Auszug 2 könnte dann zur Darstellung der 3.ten und 4.ten
    Stimme dienen.

    TODO: Überarbeiten nach Verbesserung der Bedienung von Auszuügen.

-   Schaltfläche **Rendern** (umwandeln): alternativ `Strg` und `R`

    Nach der Fertigstellung der ABC-Notation wird mit Klick auf diese
    Schaltfläche die Ansicht der Unterlegnoten und die Fehlermeldungen
    im Editor aktualsiert.

    > **Hinweis:** Diese Funktion sollte häufig genutzt werden um immer
    > aktuelle Ergebnisse auf dem Bildschirm zu sehen.

-   Schaltfläche **Play** (Wiedergabe) spielt das Muskitsück ab. Damit
    kann man duch Anhören Fehler in den einegegebenen Noten erkennen.
    Die wiedergebenen Noten werden wie folgt bestimmt:

    -   wenn keine Noten selektiert sind, spielt Zupfnoter alle
        vorhandenen Stimmen. Damit kann man einen Eindruck des
        Gesamtklanges gewinnen.

    -   wenn eine einzelne Note selektiert ist, spielt Zupfnoter nur die
        Stimmen des aktuell eingestellten Auszugs. Damit kann man einen
        Eindruck gewinnen, wie das Stück klingt, wenn nur einzelne
        Stimmen kombiniert werden (z.B. nur Sopran und Alt).

    -   wenn mehrere Noten selektiert sind, spielt Zupfnoter nur genau
        die selektierten Noten. Damit kann man eine Detailkontrolle
        errreichen.

    > **Hinweis:** Bitte beachte:
    >
    > -   Zupfnoter spielt keine Wiederholungen und Sprünge, sondern nur
    >     die Noten von Anfang bis zum Ende.
    >
    > -   Zur Wiedergabe simuliert Zupfnoter einen Tischharfenspieler.
    >     Daher führt er bei Bedarf zunächst die Fuktion "Rendern" aus
    >     um die Unterlegnoten zu aktualisieren.
    >
    > -   Die Geschwindidgkeit der Wiedergabe wird über die Kopfzheile
    >     "`Q:`" bestimmt.
    >
-   Menü **Hilfe** (Hilfe): Hier findet man hilfreiche Links und
    nleitungen

-   Schaltfläche **Console** (Konsole): Mit der Schaltfläche console
    kann man einen Blick auf die Computersprache des Notenzupfers
    werfen. Dieser Befehl sollte nur von Programmierer genutzt werden.
    Die Performance des Computers wird dadurch schlechter.

### Linkes Fenster: Eingabe

Das Eingeabefenster enthält seinerseits

-   eine eigene Werkzeuigleiste zu Ansteuerung von
    Bearbeitungsfunktionen
-   Reiter zur Auswahl verschiedener Ansichten
-   den eigentlichen Bearbeitungsbereich

#### Werkzeugleiste des Eingabefensters

-   Menü **Konfiguration** (Blattkonfiguration):

    Dieses Menü fügt Einstelliugnen zur Gestaltung und dem Design der
    Unterlegnoten ein.

    Die Reihenfolge der Menüpunkte entspricht der Bearbeitungsabfolge,
    wobei Menüpunkte auch übersprungen werden dürfen. Die Erstellung der
    ABC-Notation sollte abgeschlossen sein, bevor man mit der Gestaltung
    der Unterlegnoten beginnt.

    Die Menüpunkte sind im Kapitel
    [Grundlegende-Blatteinstellungen](#grundlegende-blatteinstellungen)
    beschrieben

    **Hinweis**: Die Einstellungen werden in folgender Reiehenfolge
    angewendet:

    1.  in Zupfnoter fest eingebaute Einstellugnen
    2.  Einstellungen aus dem Auszug 0
    3.  Einstellungen aus dem aktiven Auszug
-   Menü **Konfiguraion bearbeiten**

    TODO: beschreiben, wenn fertig implementiert

    Über dieses Menü kommt eine Bildschirmmaske zur Bearbeitung der
    angewählten Einstellung.

#### Eingabebereich und ABC-Notation (Editor)

TODO: überarbeten:

Die ABC-Notation wurde erfunden, um Musikstücke auf Computern
verarbeiten zu können. Computer können die ABC-Notation interpretieren,
um daraus herkömmliche Musiknoten zu generieren oder auch Musikstücke
auf dem Computer abspielen zu können. Unter dem Hilfemenü des Zupfnoters
findet man eine deutsche Anleitung für die ABC-Notation.

Als zusätzliche Information zu dieser Anleitung sei noch erwähnt, dass
der Befehl X: (Liednummer) eine positive Ganzzahl sein muss. Es dürfen
keine Buchstaben, Leerzeichen oder Unterstriche enthalten sein.

> **Hinweis:** Veränderungen in der ABC-Notation wirken unterschiedlich
> auf die beiden anderen Fenster:
>
> -   Die Notenvorschau wird unmittelbar aktualisiert
> -   Die Unterlegnotenvorschau wird erst durch die Funktion "Rendern"
>     aktualisiert

Wenn man mit der Maus eine Note in der ABC-Notation selektiert, wechselt
die Note in der herkömmlichen Notenschrift und in den Unterlegnoten von
schwarz auf Rot. Umgekehrt funktioniert es genauso. Wenn man auf eine
Noten in einer der Vorschauen klickt, wird diese im Eingabebereich
selektiert. So findet man schnell zu einer Stelle, die man ändern möchte
oder wo man was hinzufügen möchte.

> **Hinweis::** Wenn man zunächst eine Note, und dann mit gedrückter
> "Shift"-Taste eine zweite Note anklickt, dann werden die dazwischen
> liegenden Noten selektiert.

Das Ende der ABC-Notation wird mit einer Leerzeile eingeleitet. Sollte
nach einer Leerzeile noch ABC-Notation folgen, wird dies vom Computer
ignoriert.

#### Linker Abschnitt Zupfnoter-Einstellungen

Nach der ABC-Notation kommen die Zupfnoter-Einstellugnen. Diese werden
durch den Kommentar

    `%%%%zupfnoter.config`

von der ABC-Notation abgetrennt. Die ABC-Notation und die
Zupfnoter-Einstellungen dürfen nicht gemischt werden.

Die Zupfnoter-Einstellungen sind im sog. JSON-Format angegeben (siehe
Kapitel \ref(konfiguration} [Konfiguration der Ausgabe](#konfiguration)

Über die Zupfnoter-Einstellungen wird das Design der Unterlegnoten
verfeinert. So können zum Beispiel repeat lines (Wiederholungslinien)
besser positioniert werden oder string names (Saitennamen) eingefügt
werden. Die Zupfnoter-Einstellungen können manuell eingegeben werden
oder über das Menü sheet config (Blattkonfiguration) erzeugt werden.
Weitere Informationen zu den Zupfnoter-Einstellungen stehen im nächsten
Kapitel.

Wichtig ist, immer daran zu denken nach einer Änderung in der Menüleiste
auf render (ausführen) zu drücken, damit die Unterlegnoten aktualisiert
werden.

Mit der Maus können in diesem Teil Textfelder optimal dem Stimmverlauf
angepasst werden. Danach sind die Werte in dem entsprechenden
Zupfnoter-Kommando bzgl. der Positionsparameter angepasst worden.

#### Fehlermarkierung und Fehlermeldung

Zupfnoter zeigt über ein rotes Quadrat mit Kreuz links von den Abc
Notationszeilen oder den Zupfnoter-Einstellungen an, daß in der Zeile
ein Fehler aufgetreten ist. Wenn man mit der Maus auf das rote Quadrat
geht, wird die Fehlermeldung angezeigt, z.B. abc:12:19 error=F-Text. Das
bedeutet in Zeile 12 an Stelle 19 ist der F-Text nicht korrekt.

Es müssen alle Fehler beseitigt werden, ansonsten können keine
herkömmlichen Noten oder Unterlegnoten generiert werden.

> **Hinweis:** Die Position des Cursors (der Schreibmarke) wird als
> Zeile:Spalte ganz links in der Statusleiste angezeigt.

> **Hinweis:** die letzten Fehlermeldungen kann man in der der Konsole
> (mit `ctrl/cmd-K` sehen.

TODO: Hardcopy (snippet) von rotem Quadrat mit Kreuz hier einfügen???

TODO: popup-Fenster für Fehlermeldungen

### Fenster rechts oben : Notenvorschau

TODO:

### Fenster rechts unten : Unterlegnotenvorschau

Die Unterlegnotenvorschau zeigt die erzeugten Unterlegnoten. über den
Reiter "Zoom" kann man die Anzeige vergrößern oder verkleinern.

Über die Scrollbalken kann man den angezeigten Ausschnitt wählen.

Durch Ziehen/Ablegen kann men Elemente auf dem Notenblatt veschieben.
Wenn du mit der Maus über ein veerschieebbares Element fährst, wird der
Mauszeiger zu einer "Hand".

Über ein Kontextmenü kannst du erweiterte Einstellunge vornehmen.

> **Hinweis:** Die Einstellungen werden im Eingabebereich
> (Einstellungen) abgelegt. Der Name der Einstellung erscheint rechts
> unten in der Statuszeile, wenn man mit der Maus über ein Element
> fährt.

## Shortcuts

Für eine flüssige Bedienung stellt Zuüpfnoter folgende Shortcuts zur
Verfügung:

-   "cmd - S": Speichern
-   "cmd - k": Konsole
-   "cmd - R": Rendern
-   "cmd - P": Play

> **Hinweis:** unter Windows / Linux entspricht "cmd" der "ctrl" oder
> "strg" - Taste
