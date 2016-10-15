\cleardoublepage

# Zupfnoter - Übersicht für Einsteiger und Experten

Zum Verständnis von Zupfnoter sind folgende Themen wichtig:

-   [Zupfnoter-Prinzipien](#zupfnoter-prinzipien)
-   [Elemente der von Zupfnoter erstellten
    Unterlegnoten](#elemente-der-von-zupfnoter-erstellten-unterlegnoten)
-   [Genereller Bildschimaufbau](#genereller-bildschirmaufbau)

## Zupfnoter Prinzipien

Zupfnoter arbeitet nach dem Prinzip der Umwandlung von ABC-Notation in
Unterlegnoten. Im Gegensatz zu so genanten "What You See is What you
get" - Sytemen werden also die Unterlegnoten nicht direkt bearbeitetn
sondern entstehen automatisch durch Umwandlung aus einem Modell des
Musikstückes.

Dieses Modell ist allgemeiner und präziser als die Unterlegnoten und
basiert auf der ABC-Notation als ein de-facto Standard. Wie du siehst
kann aus diesem Modell ja auch ein herkömmliches Notenblatt erstellt
werden. In diesem Sinne sind die Unterlegnoten lediglich eine von
mehreren grafischen Darstellungen des Musikstückes.

Andererseits gibt es in den Unterlegnoten spezifische Sachverhalte,
welche durch die ABC-Notation standardmäßig nicht dargestellt werden
können. Daher verwendet Zupfnoter zwei Konventionen innerhalb der
ABC-Notation:

-   **Zusätze**: Hier werden die "Annotations" der ABC-Notation mit
    spezifischen Konventionen verwendet. Diese Zusätze stehen vor der
    Note bzw. dem Taktstrich auf den sie sich beziehen.

    Weitere Details findest du in Kapitel \ref{masken-fuer-zusaetze}
    [Zusätze](#masken-fuer-zusaetze).

-   **Konfiguration** - dies ist ein eigener Block im so genannten
    JSON - Format welcher nach der eigentlichen ABC-Notation steht und
    von diesem durch mindestens eine Leerzeile gefolgt von

    `%%%%zupfnoter.config`

    abgesetzt ist. Weitere Details findest du in
    Kapitel \ref{konfiguration} [Konfiguration](#konfiguration) bzw.
    Kapitel \ref{#konfigurationsmasken}
    [Konfigurationsmasken](#konfigurationsmasken)

Für beide Konventionen bietet Zupfnoter eine grafische Benutzerführung.

## Elemente der von Zupfnoter erstellten Unterlegnoten

![Zupfnoter
Elemente](../ZAUX_images/3015_reference_sheet_alle-Stimmen_a3.pdf)

TODO: Bild aktualisieren

Dieses Bild zeigt die Elemente und Merkmale aus denen Zupfnoter ein
Unterlegnotenblatt aufbaut:

### Darstellung der Noten

TODO: Querverweise zur Konfiguration

In der ABC-Notation wird in den Kopfzeilen ein Standardnotenwert
angegeben, z.B. `L:1/4`. Dies bedeutet, daß standardmäßig in
Viertelnoten erfasst wird. Ausgehend von diesem Wert ergibt sich der
Notenwert duch Multplikation mit der angegebenen Länge. Diese
Längenangaben wird an den Notennamen angehängt.

TODO: verweise auf ABC-Kapitel

\needspace{5cm}

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

\needspace{5cm}

### Darstellung von Pausen

Im Folgenden wird von **Vierteln als Standardnotenwert** ausgegangen.

-   **(11) full rest - ganze Pause** entspricht in ABC-Notation: `z4`

-   **(12) half rest - halbe Pause** entspricht in ABC-Notation: `z2`

-   **(13) quarter rest- viertel Pause** entspricht in ABC-Notation: `z`
    oder `z1`

-   **(14) eighth rest - achtel Pause** entspricht in ABC-Notation:
    `z1/2` oder `z/`

-   **(15) sixteenth rest - sechzehntel Pause** entspricht in
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

-   **(31) flowline - Flusslinie**: Die Flußlinie verbindet die Noten
    **einer** Stimme und markiert so die Führung innerhalb dieser
    **einen** Stimme. Standardmäßig stellt Zupfnoter die Flußline in der
    ersten und dritten Stimme dar.

    > **Hinweis**: Manchmal wird die Flußlinie auch als Melodielinie
    > bezeichnet. Dies ist aber nur korrekt, wenn es sich um die
    > Flußlinie der Melodiestimme handelt.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Flußlinien für die jeweiligen Stimmen eingestellt
    > werden. [extract.0.flowlines]

-   **(32) synchline - Synchronisationslinie**: Die
    Synchronisationslinien verbinden Noten aus zwei **verschiedenen
    Stimmen**, die zum gleichen Zeitöpunt gespielt werden. Standardmäßig
    stellt Zupfnoter die Synchronisationslinie zwischen den Stimmen
    *eins und zwei* sowie *drei und vier* dar.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Synchronisationslinien eingestellt werden.
    > [extract.0.sychlines]

-   **(33) subflowline - Unterflusslinie**: Die Unterflusslinie
    verbindet innerhalb einer Stimme ohne Flußlinie diejenigen Noten,
    die nicht über eine Synchronisationslinie (32) mit einer anderen
    Stimme verbunden sind.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Unterflußlinien für die jeweiligen Stimmen eingestellt
    > werden. [extract.0.subflowlines]

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

-   **(71) creation note - Ertsellungsnotiz**: Die Erstellungsnotiz gibt
    weitere Informationen zum technischen Stand der Erstellung. Diese
    wird immer auf den Unterlegnoten ausgegeben und kann nicht
    unterdrückt werden. Die Erstellungsnotiz hilft beim Nachvollziehen
    von Veränderungen und besteht aus

    -   Zeitpunkt der Erstellung der PDF-Datei (CEST steht für
        "*C*entral *E*uropean *S*ummer *T*ime")
    -   Software-Version der Zupfnoter
    -   Server von welchem der Zupfnoter geladen wurde
-   **(72) reference to zupfnoter website - Referenz auf Zupfnoter
    Website**: Dies ist die Referenz auf Zupf-\
    noter als Werkzeug zur Erstellung des Unterlegnotenblattes, also
    Werbung in eigener Sache. Diese wird immer auf den Unterlegnoten
    ausgegeben und kann nicht unterdrückt werden.

    TODO: Silbentrennung

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
    -   links: **Eignabe** zum Eingeben der ABC-Notation bzw. der
        Konfiguration
    -   rechts oben: **Notenvorschau** zur Kontrolle des Musikstücks
    -   rechts unten **Unterlegnotenvorschau**
-   Reiter zum Auswählen verschiedener Ansichten
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
    > dauert, wird dieses Fens-\
    > ter nur durch "rendern" aktualisiert.

    TODO:Trennung

-   Im **linken Fenster** wird die ABC-Notation sowie die
    Zupfnoter-Einstellungen angezeigt. Für die ABC-Notation gibt es eine
    separate Anleitung. Mit Hilfe der ABC-Notation und der
    Zupfnoter-Einstellungen wird das Notenbild für die Tischharfen
    generiert.

    Über die Reiter kann auf die formularbasierte Konfiguration
    umgeschaltet werden.

### Werkzeugleiste für Schaltflächen und Menüs

In der oberen Werkzeugleiste, die über alle Abschnitte hinweg liegt,
befinden sich Schaltflächen und Menüs die man während der Erstellung von
Unterlegnoten benötigt. Nach einem Klick auf die Schaltflächen führt der
Zupfnoter bestimmte Aktivitäten aus.

Einige Funktionen sind auch über Shortcuts erreichbar (siehe Kapitel
\ref{shortcuts} [Shortcuts](#shortcuts)

> **Hinweis**: Für die Vesrion 1.5 wird die Bedienungsoberfläche von
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
    "speichern" bedeutet, dass die Dropbox nicht mit dem Zupfnoter
    verbunden ist.

    TODO: anpassen auf kommenden Dialog

    > **Hinweis**: in der Statuszeile wird der Verbindungszustand zur
    > Dropbox und auch das aktuelle Verzeichnis in der Dropbox
    > angezeigt.

-   Schaltfläche **Speichern** (sichern): Das fertig gestellte
    Musikstück wird in deiner Dropbox gespeichert. Es wird eine
    ABC-Datei, jeweils eine Datei für A3 und A4 für Unterlegnoten pro
    Auszug gespeichert.

    > **Hinweis:** Solange man noch nichts abgespeichert hat, erscheint
    > das Wort "Speichern" in roter Schrift.

-   Menü **Drucken**: Damit kann man Druckvorschauen anzeigen, welche
    auch über die Browser-Funktionen gedruckt werden können (siehe
    Kapitel \ref{musikstueck-drucken} [Musikstück
    drucken](#musikstueck-drucken)).

    -   Schaltfläche **A3**: Es öffnet sich ein Browserfenster mit
        Unterlegnoten im A3 Format als pdf. Dies kann nun ausgedruckt
        werden oder auf dem PC als pdf-Datei abgespeichert werden

    -   Schaltfläche **A4**: Es öffnet sich ein Browserfenster mit
        Unterlegnoten im A4 Hochformat als pdf. Diese Datei enthält dann
        drei Seiten und kann nun ausgedruckt werden oder auf dem PC als
        pdf-Datei abgespeichert werden. Die Schnittmarken auf dem A4
        Papier kennzeichnen, an welcher Stelle die drei A4-Blätter
        zusammen geklebt werden müssen.

    -   Schaltfläche **Noten**: Es öffnet sich ein Browserfenster mit
        den Noten. Dies ist eine HTML - Datei und muss daher über den
        Browser gedruckt werden. Du kannst diese auch abspeichern, aber
        auch dann muss sie über den Browser gedruckt werden.

-   Menü **Ansicht** (Ansicht): Hiermit kann man festlegen, wie der
    Bildschirmaufbau des Zupfnoter gestaltet sein soll. Einige
    Abschnitte können so ausgeblendet werden.

    -   Die Einstellung **Alle Fenster** ist der
        Standardbildschirmaufbau mit drei Abschnitten (ABC-Notation,
        herkömmliche Noten, Unterlegnoten). In dieser Enstellung wird
        meistens gearbeitet, weil man eine schnelle Rückmeldung zu den
        Ergebnissen hat.

    -   Die Einstellung **Noteneingabe** zeigt den Editor (linkes
        Fenster) und die Notenvorschau (Fenster rechts oben). Diese
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
    Auszügen siehe Kapitel \ref{auszuege} [Erstellung von
    Auszügen](#auszuege).

    Es gibt standardmässig die Auszüge 0 bis 3. Der Auszug 0 beinhaltet
    alle Stimmen und wird automatisch vom Zupfnoter erstellt. Wenn man
    einen Auszug erstellen möchte, wählt man z.B. Auszug 1 aus und
    definiert im Abschnitt links, was man im Auszug 1 sehen möchte: 1.te
    und 2.te Stimme. Der Auszug 2 könnte dann zur Darstellung der 3.ten
    und 4.ten Stimme dienen.

    TODO: Überarbeiten nach Verbesserung der Bedienung von Auszuügen.

-   Schaltfläche **Rendern** (umwandeln): alternativ `Strg` und `R`

    Nach der Fertigstellung der ABC-Notation wird mit Klick auf diese
    Schaltfläche die Ansicht der Unterlegnoten und die Fehlermeldungen
    im Editor aktualsiert.

    > **Hinweis:** Diese Funktion sollte häufig genutzt werden um immer
    > aktuelle Ergebnisse auf dem Bildschirm zu sehen.

-   Schaltfläche **Play** (Wiedergabe) spielt das Musikstück ab. Damit
    kann man durch Anhören Fehler in den eingegebenen Noten erkennen.
    Die wiedergegebenen Noten werden wie folgt ausgewählt:

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
    >     Daher führt er bei Bedarf zunächst die Funktion "Rendern" aus,
    >     um die Unterlegnoten zu aktualisieren.
    >
    > -   Die Geschwindigkeit der Wiedergabe wird über die Kopfzeile
    >     "`Q:`" bestimmt.
    >
-   Menü **Hilfe** (Hilfe): Hier findet man hilfreiche Links und
    Anleitungen

### Linkes Fenster: Eingabe

Das Eingeabefenster enthält seinerseits

-   eine eigene Werkzeugleiste zu Ansteuerung von Bearbeitungsfunktionen
-   verschiedene Bearbeitungsansichten, welche über Karteilreiter
    ausgewählt werden.

#### Werkzeugleiste des Eingabefensters

-   Menü **Konfig. einfügen** (Blattkonfiguration):

    Über dieses Menü kannst du Konfigurationsparameter (Einstellungen)
    zur Gestaltung der Unterlegnoten **einfügen**.

    Die Reihenfolge der Menüpunkte entspricht der Bearbeitungsabfolge,
    wobei Menüpunkte auch übersprungen werden dürfen. Die Erstellung der
    ABC-Notation sollte abgeschlossen sein, bevor man mit der Gestaltung
    der Unterlegnoten beginnt.

    Die Menüpunkte sind im Kapitel
    [Grundlegende-Blatteinstellungen](#grundlegende-blatteinstellungen)
    beschrieben

    > **Hinweis**: Die Einstellungen werden in folgender Reihenfolge
    > angewendet:
    >
    > 1.  in Zupfnoter fest eingebaute Einstellungen
    > 2.  Einstellungen aus dem Auszug 0
    > 3.  Einstellungen aus dem aktiven Auszug

-   Menü **Konfig. bearbeiten**

    Über dieses Menü kannst du die Konfigurationsparameter
    **bearbeiten**. Dazu werden entprechende Bildschirmmasken
    aufgerufen. Weitere Informationen findest du im
    Kapitel \ref(konfigurationsmasken)":
    [Konfigurationsmasken](#konfigurationsmasken)"

-   Menü **Zusatz einfügen**

    \index{Zusatz}Über dieses Menü können Zupfnoter-spezifische Zusätze
    an eine Note bzw. an einen Taktstrich eingefügt werden. Zupfnoter
    verwendet spzifische Zusätze, um z.b. die Position von Sprunglinien
    anzugeben, oder Notengebundene Anmerkungen zu erfassen. Diese
    Zusätze sind an eine Note bzw. an einen Taktstrich gebunden und
    werden in Form einer ABC-Anmerkung notiert (z.B.`"^@@3" :|` für die
    Lage einer Sprungline für eine Wiederholung).

    > **Hinweis**: Dieses Menü wird daher erst dann aktiv, wenn die
    > Schreibmarke (Cursor) zwischen einem Leerzeichen und einer
    > Note/bzw. einem Taktstrich steht. Man erkennt das auch in der
    > Statusleiste links unten: dort sollte das wort `editable.before`
    > erscheinen, dann ist die Schaltfläche aktiv.
    >
    > Einzelne Unterpunkte des Menüs sind nur aktiv, wenn die
    > Schreibmarke vor einer Note steht.

    Über das Menü können Fenster aufgerufen werden, um diese Zusaätze
    einzufügen.

-   Schaltfläche **Zusatz bearbeiten**

    Über diese Schalzfläche kann man die Bearbeitungsmasken für
    vorhandene Zusätze erneut aufrufen.

    > **Hinweis**: Diese Schaltfläche ist erst aktiv, wenn die
    > Schreibmarke in einem solchen Zusatz steht. Man erkennt das auch
    > in der Statusleiste links unten: dort sollte das wort `editable`
    > erscheinen, dann ist die Schaltfläche aktiv.

#### Bearbeitungsansichten des Eingabefensters

Über die Karteireiter kann man zwischen den verschiedenen
Bearbeitungsansichten umschalten:

-   Texteditor (siehe Kapitel \ref{texteditor}
    "[Texteditor](#texteditor)")
-   Konfigurationsmasken Kapitel \ref(konfigurationsmasken)
    "[Konfigurationsmasken](#konfigurationsmasken)"

### Fenster rechts oben : Notenvorschau

TODO: ergänzen

Die Notenvorschau zeigt das Musikstück in herkömmlichen Noten an. Damit
kann man sich bei der Erfassung auf die musikalischen Aspekte
konzentrieren.

Wenn man auf Elemente in der Notenvorschau klickt, werden diese auch im
Texteditor und in der Unterlegnotenvorschau hervorgehoben.

> **Hinweis::** Wenn man zunächst eine Note, und dann mit gedrückter
> "Shift"-Taste eine zweite Note anklickt, dann werden die dazwischen
> liegenden Noten selektiert. Damit kannst du z.B. einen Auschnitt aus
> einer bestimmten Stimme über die Notenvorschaut auswählen und
> anschließend abspielen lassen.

### Fenster rechts unten : Unterlegnotenvorschau

Die Unterlegnotenvorschau zeigt die erzeugten Unterlegnoten. Über den
Reiter "Zoom" kann man die Anzeige vergrößern oder verkleinern.

Über die Scrollbalken kann man den angezeigten Ausschnitt wählen.

Durch Ziehen/Ablegen kann man Elemente auf dem Notenblatt verschieben.
Wenn du die Maus über ein verschiebbares Element bewegst, wird der
Mauszeiger zu einer "Hand".

Über ein Kontextmenü (klick mit rechter Maustaste) kannst du erweiterte
Einstellungen vornehmen.

> **Hinweis:** Die Einstellungen werden im Eingabebereich
> (Einstellungen) abgelegt. Der Name der Einstellung erscheint rechts
> unten in der Statuszeile, wenn man mit der Maus über ein Element
> fährt.

### Statusleiste am unteren Bildschirmrand

Am unteren Bildschirmrand gibt es eine Statusleiste mit folgenden
Einträgen

-   Position der Schreibmarke im Editor
-   Bedeutung des Symbols links von der Schreibmarke (Syntax Token)
-   Pfad zur Dropbox
-   Aktives Filter für Loglevel (am besten auf "Error" eingestellt)

### Konsole

Die Konsole ist nur sichtbar, wenn sie mit `cmd-K` eingeschaltet wurde.
Sie stellt die letzten Meldungen von Zupfnoter dar. Experten können in
der Konsole auch weitere Befehle eingeben, die Zupfnoter direkt steuern.
Mehr mit dem Befehl "Hilfe".

> **Hinweis**: Die Zupfnoter-Menüs lösen letztendlich solche
> Konsolenbefehle aus. Daher werden selbst Experten diese Befehle in der
> Regel nicht brauchen.

## Tastenkombinationen (Shortcuts)

Für eine flüssige Bedienung stellt Zupfnoter folgende
Tastenkombinationen (Shiortcuts) zur Verfügung:

-   "cmd - S": Speichern
-   "cmd - k": Konsole
-   "cmd - R": Rendern
-   "cmd - P": Play

> **Hinweis:** unter Windows / Linux entspricht "cmd" der "ctrl" oder
> "strg" - Taste

## Texteditor

Im Teexteditor kannst du die ABC-Notation bearbeiten. Darüberhinaus
kannst du die Konfigurationsparameter sehen und ggf. direkt (d.h. ohne
Bildschirmmasken) sehen und ggf. korrigieren (für Experten).

### Erfassung der ABC-Notation im Texteditor

Im Texteditor kannst du die ABC-Notation erfassen. Elemente werden
entsprechend ihrer Bedetung farblich hervorgehoben (Syntax-Coloring). In
der Statusleiste links unten zeigt Zupfnoter auch Hinweise über die
Bedeutung des Elementes links von der aktuellen Schreibmarke an.

> **Hinweis**: Diese Anzeige ist noch sehr technisch, in manchen Fällen
> aber dennoch hilfreich. Sie steuert z.B. die verfügbarkeit der
> Schaltflächen für die Zusätze.

> **Hinweis:** Veränderungen in der ABC-Notation wirken unterschiedlich
> auf die beiden anderen Fenster:
>
> -   Die Notenvorschau wird unmittelbar aktualisiert
> -   Die Unterlegnotenvorschau wird erst durch die Funktion "Rendern"
>     aktualisiert

Der Texteditor ist mit den anderen Fenstern synchronisiert. Wenn man mit
der Maus eine Note in der ABC-Notation selektiert, wechselt die Note in
der herkömmlichen Notenschrift und in den Unterlegnoten von schwarz auf
Rot. Umgekehrt funktioniert es genauso. Wenn man auf eine Noten in einer
der Vorschauen klickt, wird diese im Eingabebereich selektiert. So
findet man schnell zu einer Stelle, die man ändern möchte oder wo man
was hinzufügen möchte.

> **Hinweis::** Wenn man zunächst eine Note, und dann mit gedrückter
> "Shift"-Taste eine zweite Note anklickt, dann werden die dazwischen
> liegenden Noten selektiert.

Das Ende der ABC-Notation wird mit einer Leerzeile eingeleitet. Sollte
nach einer Leerzeile noch ABC-Notation folgen, wird dies vom Computer
ignoriert.

Du kannst die \index{Liedtexte}Liedtexte schnell efassen, indem du
zunächst den Text (von der ABC-Notation durch eine Leerzeile getrennt)
eingibst. Danach kannst du mit folgenden Schritten den Text um
entsprechende ABC-Notation für Liedtexte `W:` ergänzen:

1.  Stelle die Schreibmarke in die erste Zeile des Liedtextes
2.  Halte gleichzeitig die Taten `Alt` und `Ctrl` gedrückt und
3.  bewege die Schreibmarke mit den Pfieltasten an das Ende des
    Liedtextes.
4.  Du siehst nun eine dünne schwarze Linie an den Zeilenanfängen. Nun
    gib die Zeichen `W:`ein. Diese Zeichenkette wird nun an allen Zeilen
    des Liedtextes vorangestellt.

### Darstellung der Konfigurationsparameter als JSON

Nach der ABC-Notation kommen die Zupfnoter-Einstellugnen. Diese werden
durch den Kommentar

    `%%%%zupfnoter.config`

von der ABC-Notation abgetrennt. Die ABC-Notation und die
Zupfnoter-Einstellungen dürfen nicht gemischt werden.

> **Hinweis**: zur komfortablen Bearbeitung der Konfigurationsparameter
> gibt es Bildschirmmasken (siehe Kapitel \ref{konfigurationsmasken}:
> "[Konfigurationsmasken](#konfigurationsmasken)").

Die Zupfnoter-Einstellungen sind im sog. JSON-Format angegeben (siehe
Kapitel \ref(konfiguration} [Konfiguration der Ausgabe](#konfiguration)

Über die Zupfnoter-Einstellungen wird das Design der Unterlegnoten
verfeinert. So können zum Beispiel repeat lines (Wiederholungslinien)
besser positioniert werden oder string names (Saitennamen) eingefügt
werden. Die Zupfnoter-Einstellungen können manuell eingegeben werden
oder über das Menü sheet config (Blattkonfiguration) erzeugt werden.
Weitere Informationen zu den Zupfnoter-Einstellungen stehen im
Kapitel \ref{konfiguration} "[Konfiguration](#konfiguration)".

> **Hinweis**: Wichtig ist, nach einer Änderung in der Menüleiste immer
> auf auf "Rendern" (ausführen) zu drücken, damit die Unterlegnoten
> aktualisiert werden.

Mit der Maus können in diesem Teil Textfelder optimal dem Stimmverlauf
angepasst werden. Danach sind die Werte in dem entsprechenden
Zupfnoter-Kommando bzgl. der Positionsparameter angepasst worden.

### Fehlermarkierung und Fehlermeldung im Texteditor

\index{Fehlermeldung}Zupfnoter zeigt über ein rotes Quadrat mit Kreuz
links von den Abc Notationszeilen oder den Zupfnoter-Einstellungen an,
daß in der Zeile ein Fehler aufgetreten ist. Wenn man mit der Maus auf
das rote Quadrat geht, wird die Fehlermeldung angezeigt, z.B. abc:12:19
error=F-Text. Das bedeutet in Zeile 12 an Stelle 19 ist der F-Text nicht
korrekt.

Es müssen alle Fehler beseitigt werden, ansonsten können keine
herkömmlichen Noten oder Unterlegnoten generiert werden.

> **Hinweis:** Die Position des Cursors (der Schreibmarke) wird als
> Zeile:Spalte ganz links in der Statusleiste angezeigt.

> **Hinweis:** die letzten Fehlermeldungen kann man in der der Konsole
> (mit `ctrl/cmd-K` sehen. Nach wichtigen Befehlen zeigt Zupfnoter auch
> ein Fenster mit den letzten Fehlermeldungen an.

TODO: Hardcopy (snippet) von rotem Quadrat mit Kreuz hier einfügen???

## Konfigurationsmasken

TODO:

-   Konfigurationsmasken vordefiniert oder dynamisch erzeugt, daher nur
    ein Beispiel
    -   vordefinierte haben konstanten Grundaufbau
    -   dynamische zeigen nur Parameter, die im Musikstück vorhanden
        sind
-   Aufbau
    -   Löschknopf
    -   Einfügeknopf
    -   -   label
    -   Eingabefeld
    -   Hilfe-Taste
    -   Vorgabe

-   Maske ggf mit Refresh aktualisieren
-   Feldeingabe mit "TAB" Beenden
-   "Rendern" nicht vergessen

> ![Konfigurationsmaske](../ZAUX_Images/040-040_Konfigurationsmasken.jpg) 

## Masken für Zupfnoter-spezifische Zusätze {#masken-zusaetze}

\index{Zusatz}Zupfnoter verwendet "Annotations" der ABC-Notation mit
spezifischen Konventionen. Diese Zusätze stehen vor der Note bzw. dem
Taktstrich auf den sie sich beziehen.

Zupfnoter unterstützt die Pflege diese Zusätze über eine
Bildschirmmaske. Diese wird über Schaltflächen bzw. Menüs in der
Werkzeugleiste des Eingabefensters aufgerufen (siehe
Kapitel \ref{werkzeugleiste-des-eingabefensters} [Werkzeugleiste des
Eingabefensters](#werkzeugleiste-des-eingabefensters)).

> **Hinweis**: Der Aufruf von "einfügen" und "bearbeiten" liegt auf
> unterschiedlichen Schaltflächen, da beim "Einfügen" ein Menü erscheint
> über welches ausgewählt wird, "was" eingefügt weden soll. Beim
> Bearbeiten ist diese Auswahl nicht mehr notwendig. Daher wird
> "bearbeiten" über eine Schaltflcähe direkt aufgerufen.

> > > ![](../ZAUX_Images/040-050_Menue-fuer-zusaetze.jpg) 

Es erscheint eine Maske nach folgendem Beispiel:

> > ![](../ZAUX_Images/040-060_Maske-fuer-zusatz.jpg) 

<!-- -->
