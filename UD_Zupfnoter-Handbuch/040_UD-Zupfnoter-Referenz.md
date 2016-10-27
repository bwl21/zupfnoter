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
get" - Sytemen werden also die Unterlegnoten nicht direkt bearbeiten
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
    Note bzw. dem Taktstrich auf den sie sich
    beziehen.\index{Zusatz!Prinzipien}

    Für die Erstellung und Bearbeitung der "Zusätze" gibt es eine
    grafische Benutzerführung durch Bildschirmmasken (Siehe
    Kapitel \ref{masken-fuer-zusaetze}
    [Zusätze](#masken-fuer-zusaetze)).

-   **Konfiguration** - Zupfnoter gewinnt seine Leistungsfähigkit und
    \index{Konfiguration} Flexibilität durch vielfältige
    Einstellmöglichkeiten - genannt Konfigurationsparameter. Diese
    Konfigurationsparameter wirken auf die Erstellung der
    Unterlegnotenblätter und steuern z.B:

    -   Stimmen, die augesgeben werden; Stimmen durch
        Synchronisiationslinien verbunden werden usw.
    -   Größe von Notenelementen, Liniendicken
    -   Beschriftungen

    Die Konfigurationsparameter sind thematisch hierarchisiert (z.B.
    `extract.0.layout` `extract.0.printer`). Eine Referenz und
    Erläuterung zu den Konfigurationsparametern findst du in
    \ref{konfiguration} [Konfiguration](#konfiguration).

    Für die Bearbeitung der Konfigurationsmparameter gibt es
    Bildschirmmasken (siehe
    Kapitel \ref{konfigurationsmasken}[Konfigurationsmasken](#konfigurationsmasken))

    Zupfnoter speichert die Konfigurationsparameter in einem Abschnitt
    nach der ABC-Notation, der durch

    `%%%%zupfnoter.config`

    abgesetzt ist.

\needspace{15cm}

## Elemente der von Zupfnoter erstellten Unterlegnoten

![Zupfnoter Elemente](../ZAUX_images/3015_reference_sheet_doc_a3.pdf) 

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
    > Sprunglinien. Ihre Ausgabe hängt von der aktuellen Konfiguration
    > ab (siehe Kapitel \ref{extract.0.repeatsigns}
    > [`repeatsigns`](#extract.0.repeatsigns)).

-   **(27) part note - Bezeichnung von Abschnitten im Musikstück**: Man
    kann ein Musikstück in Abschnitte aufteilen. Die Abschnitte können
    bezeichnet werden, z.B. als "Teil 1". Der Abschnitt unterbricht auch
    die Flusslinien. Dieses Element wird häufig genutzt, um Abfolgen von
    Abschnitten beim Spielen festzulegen.

    Ein Abschnitt entsteht, wenn in der ABC-Notation der ersten Note des
    neuen Abschnittes z.B. die Zeichenfolge "`[P:Teil 1]`" vorangestellt
    wird. Hier ist "Teil 1" die Bezeichnung des Abschnitts.

-   **(28) countnotes - Zählhilfen**: Zupfnoter kann die Noten
    automatisch mit Zählhilfen beschriften. Diese Ausgabe ist
    konfigurationsabhängig. Die Zählweise ergibt sich aus der
    Taktangabe. Beispiel siehe Abbildung [Zupfnoter Elemente].

-   **(29) barnumbers - Taktnummer**: Zupfnoter kann die Takte
    automatisch durchnummerieren. Damit kann bei gemeinsamem Spiel auch
    mitten im Musikstück wieder aufsetzen. Diese Ausgabe ist
    konfigurationsabhängig.

### Darstellung von Verbindungslinien

Um auf den Unterlegenoten die Zusammenhänge zwischen Noten darzustellen,
gibt es folgende Elemente:

-   **(25) jumpline for repeat - Sprungline für Wiederholungen**: Eine
    Wiederholung entsteht durch Beifügen eines Doppelpunktes an die
    Taktstriche in der ABC-Notation z.B. "`|: C4 :|`".

    > **Hinweis** Wiederholungszeichen sind eine Alternative zu
    > Sprunglinien. Ihre Ausgabe hängt von der aktuellen Konfiguration
    > ab (siehe Kapitel \ref{extract.0.repeatsigns}
    > [`repeatsigns`](#extract.0.repeatsigns)).

-   **(26) synchline for unison - Synchronisationslinie für Mehrklang**:
    siehe (21) in Kapitel \ref{darstellung-notenbezogener-elemente}:
    [Darstellung notenbezogener
    Elemente](#darstellung-notenbezogener-elemente)

-   **(31) flowline - Flusslinie**: Die Flußlinie verbindet die Noten
    **einer** Stimme und markiert so die Führung innerhalb dieser
    **einen** Stimme. Standardmäßig stellt Zupfnoter die Flußline in der
    ersten und dritten Stimme dar.

    > **Hinweis**: Manchmal wird die Flußlinie auch als Melodielinie
    > bezeichnet. Dies ist aber nur korrekt, wenn es sich um die
    > Flußlinie der Melodiestimme handelt.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Flußlinien für die jeweiligen Stimmen eingestellt
    > werden ([extract.0.flowlines](#extract.0.flowlines)).

-   **(32) synchline - Synchronisationslinie**: Die
    Synchronisationslinien verbinden Noten aus zwei **verschiedenen
    Stimmen**, die zum gleichen Zeitöpunt gespielt werden. Standardmäßig
    stellt Zupfnoter die Synchronisationslinie zwischen den Stimmen
    *eins und zwei* sowie *drei und vier* dar.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Synchronisationslinien eingestellt werden
    > ([extract.0.synchlines](#extract.0.synchlines)).

-   **(33) subflowline - Unterflusslinie**: Die Unterflusslinie
    verbindet innerhalb einer Stimme ohne Flußlinie diejenigen Noten,
    die nicht über eine Synchronisationslinie (32) mit einer anderen
    Stimme verbunden sind.

    > **Hinweis** Über die [Einstellungen in der Konfiguration] kann die
    > Ausgabe von Unterflußlinien für die jeweiligen Stimmen eingestellt
    > werden ([extract.0.subflowlines](#extract.0.subflowlines).

-   **(50) variant ending - variante Enden**: Wo Wiederholungen
    unterschiedlich enden, bezeichnet man das als variante Enden. In der
    ABC-Notation schreibt man hierfür Ziffern (z.B. 1 und 2) unmittelbar
    hinter den Taktstrich.

    Zupfnoter stellt diese varianten Enden als eine Menge von
    Sprunglinien dar:

    -   Eingangslinie (im Beispiel links)
    -   Ausgangslinie (im Beispiel rechts)

    Mehr Einzelheiten siehe Kapitel [Handhabung variante Enden].

### Elemente für das gesamte Musikstück bzw. Unterlegnotenblatt

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
    [extract.x.title](#extract.0.title) bzw. Kapitel
    \ref{auszuege}[Auszüge](#auszuege)).

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
    > eingestellt werden (siehe [extract.x.lyrics](#extract.0.lyrics))

-   **(37) stringnames - Saitennamen**: Zupfnoter kann die Namen der
    Saiten auf den Unterlegnoten ausgeben.

    > **Hinweis**: Über die [Einstellungen in der Konfiguration] kann
    > die Ausgabe von Saitennamen eingestellt werden
    > ([extract.0.stringnames](#extract.0.stringnames)).

-   **(38) marks - Saitenmarke** Die Saitenmarken sind eine Hilfe zum
    korrekten Einlegen der Unterlegnoten in die Tischharfe. Das Blatt
    muss so in die Tischharfe eingelegt werden, dass die Marken unter
    den G-Saiten liegen.

    > **Hinweis:** Über die [Einstellungen in der Konfiguration] kann
    > die Ausgabe der Saitenmarken beeinflußt werden
    > ([extract.0.stringnames.marks](#extract.0.stringnames.marks)).

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

-   **{73} fingerprint - Fingerabdruck**: Diese Nummer ist wie ein
    Fingerabdruck der ABC-Datei. Dies bedeutet, dass Unterlegnoten (z.b.
    verschiedene Auszüge) mit dem selben Fingerabdruck auch aus einer
    identischen Quelle stammen und somit zuverlässig zusammen passen.

    > **Hinweis:** Der Fingarabdruck wird nicht auf den herkömmlichen
    > Noten ausgegeben. Der Fingerabdruck wird aus dem ABC-Text errechet
    > und ist daher nicht im ABC-Text enthalten.

### Beschriftungen

Zupfnoter hat vielfältige Möglichkeiten, das Beschriftungen einzufügen.
Auf den Unterlegnoten sind diese nicht leider nicht immer zu
unterscheiden:

-   **Standardbeschriftungen** siehe "Elemente für das gesamte
    Musikstück

-   **Notenbeschriftung**

    Die Notenbeschriftung ist mit einer einzelnen Note verbunden und
    verschiebt sich ggf. wenn die Tonhöhe oder der Zeitbezug dieser Note
    verändert wird. Die Notenbeschriftung wird über einen
    "Zusatz"\index{Zusatz} direkt in die ABC-Notation eingefügt.

    Für wiederkehrende Texte bzw. längere und mehrzeilige Texte in der
    Konfiguration eine Notenbeschriftungsvorlage [annotations]
    \index{Notenbeschriftungsvorlage} mit Positionsangabe anlegen und
    über einen Zusatz ("Ref. Notenbeschriftung") daraus eine
    Notenbeschrifung erstellen.

    > **Hinweis**: Zupfnoter kennt standardmäßig die
    > Noptenbeschriftungsvorlagen `vl` `vt`, `vr`. Damoit kann man
    > einfach ein "Abdämpfungszeichen" anbringen.
    > [^040_UD-Zupfnoter-Referenz.md_1].

    Im Zusatz kann eine Position mit angegeben angegeben werden. Damit
    bleibt die Position der Notenbeschriftung erhalten, auch wenn der
    Zeitbezug der Note geändert wird.

    > **Hinweis** Wenn man die Notenbeschriftung mit der Maus
    > verschiebt, wirkt nur noch diese Verschiebung ud die Angabe im
    > Zusatz wird ignoriert. Diese Verschiebung wird in der
    > Konfiguration gespeichert und ist an die die Startzeit der Note
    > gebunden, solange keine Verschiebemarke \index{Verschiebemarke} in
    > der ABC-Notation eingefügt ist
    > ([extract.x.notebound.annotation.v\_{voice}.{time}]).

-   **Seitenbeschriftung**

    Die Seitenbeschriftungen werden ausschliesslich über die
    Konfiguration hinzugefügt [extract.x.notes]. Ihre Anordnung bezieht
    sich auf den Seitenrand. Der Schriftstil kann gewählt werden.

-   **Liedtexte**

    Liedtexte werden in den `W:` - Zeilen in der ABC-Notation erfasst
    und über die Konfiguration auf dem Blatt positioniert
    [extract.x.lyrics.x]

## Genereller Bildschirmaufbau

Die Benutzungsoberfläche von Zupfnoter ist aus folgenden Elementen
aufgebaut:

-   Drei Fenster
    -   links: **Eigabe** zum Eingeben der ABC-Notation bzw. der
        Konfiguration
    -   rechts oben: **Notenvorschau** zur Kontrolle des Musikstücks
    -   rechts unten **Unterlegnotenvorschau**
        [^040_UD-Zupfnoter-Referenz.md_2]
-   **Statusleiste**: für Syteminformationen (erreichbar mit rechte
    Maustaste)
-   Bedienelemente in den Fenstern
    -   **Reiter** zum Auswählen verschiedener Ansichten
    -   **Werkzeugleiste** Leiste für Schaltflächen und Menüs
    -   **Kontextmenü**: zur speziellen Bearbeitung von Elementen

![Zupfnoter
Bildschirmaufbau](../ZAUX_Images/040_030_Bildschirmaufbau.pdf) 

### Fenster

Zupfnoter kennt drei Hauptfenster:

-   Das **linke Fenster** zeigt die Eingabemöglichkeiten über drei
    Reiter

    -   `ABC`- Der Texteidtor für die ABC-Notation sowie die
        Zupfnoter-Einstellungen angezeigt. Für die ABC-Notation gibt es
        eine separate Anleitung im Menü `Hilfe`.

    -   `Liedtextexte` für die Erfassung der Liedtexte

    -   `Konfiguration` für die formulargeführte Bearbeitung der
        Zupfnoter-Konfiguration.

    Mit Hilfe der ABC-Notation und der im gleichen Fenster sichtbaren
    Zupfnoter-Konfiguration wird das Notenbild für die Tischharfen
    generiert.

-   Im **rechten oberen Fenster** wird in der herkömmlichen Notenschrift
    das Musikstück gezeigt. Die Darstellung in herkömmlicher
    Notenschrift kann mehrstimmig erfolgen.

-   Im **rechten unteren Fenster** werden die Unterlegnoten angezeigt.
    Diese entsprechen inhaltlich der herkömmlichen Notenschrift im
    rechten oberen Fenster.

    Über die Reiter können verschiedene Zoom-Stufen eingestellt werden.

    > **Hinweis**: Da die Berechnung der Unterlegnoten einige Sekunden
    > dauert, wird dieses Fenster nur durch `Rendern` aktualisiert.

### Werkzeugleiste für Schaltflächen und Menüs

Die Zupfnoter - Werkzeugleiste, ist immer sichtbar und ersteckt sich
über aller Fenster. In ihr befinden sich Schaltflächen und Menüs die man
während der Erstellung von Unterlegnoten benötigt. Nach einem Klick auf
die Schaltflächen führt der Zupfnoter bestimmte Aktivitäten aus.

Einige Funktionen sind auch über Shortcuts erreichbar (siehe Kapitel
\ref{shortcuts} [Shortcuts](#shortcuts))

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
    Bildschirmaufbau des Zupfnoter gestaltet sein soll. Einige Fesnter
    können so ausgeblendet werden, um mehr Platz zu schaffen.

    -   Die Einstellung **Alle Fenster** ist der
        Standardbildschirmaufbau mit allen drei Fenstern (ABC-Notation,
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

    -   Mit der Einstellung **Noten** sieht man nur die herkömmlichen
        Noten. Dies ist hilfreich zu Kontrolle des Musikstückes durch
        einen Lektor.

    -   Mit der Einstellung **Harfennoten** (Harfe) sieht man nur eine
        Vorschau der Unterlegnoten. Diese Einstellugn ist hilfreich zur
        endgültigen Prüfung der erstellten Unterlegnoten z.B. durch
        einen Lektor.

        > **Hinweis:** Im Gegensatz zur Druckvorschau werden in dieser
        > Ansicht die abgespielten Noten rot dargestellt.

-   Schaltfläche **Auszug** wählt den aktiven Auszug. Damit wird
    bestimmt,
    -   welcher Auszug in Unterlegnotenvorschau dargestellt wird. Für
        Details zu Auszügen (siehe Kapitel \ref{auszuege} [Erstellung
        von Auszügen](#auszuege)).
    -   welcher Auszug in den Konfigurationsmasken bearbeitet wird
        (siehe Kapitel \ref{konfigurationsmasken}
        [Konfigurationsmasken](#konfigurationsmasken)).

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

### Fenster links: Eingabe

Das Eingeabefenster enthält seinerseits

-   eine eigene Werkzeugleiste zu Ansteuerung von Bearbeitungsfunktionen
-   verschiedene Bearbeitungsansichten, welche über Kartei reiter
    ausgewählt werden.

#### Werkzeugleiste des Eingabefensters

-   Menü **Konfig. einfügen**

    Über dieses Menü kannst du Konfigurationsparameter (Einstellungen)
    zur Gestaltung der Unterlegnoten **einfügen**.

    Die Reihenfolge der Menüpunkte entspricht der Bearbeitungsabfolge,
    wobei Menüpunkte auch übersprungen werden dürfen. Die Erstellung der
    ABC-Notation sollte abgeschlossen sein, bevor man mit der Gestaltung
    der Unterlegnoten beginnt.

    Die Menüpunkte sind im Kapitel
    [Grundlegende-Blatteinstellungen](#grundlegende-blatteinstellungen)
    beschrieben

    > **Hinweis**: Grundsätzlich bildet Zupfnoter für jeden
    > Konfigurationsparameter einen Wert in folgender Reihenfolge
    >
    > 1.  Der Wert im aktuellen Auszug bzw. im Musikstück (für Parameter
    >     die nicht pro Auszug gesetzt werden können)
    > 2.  wenn der aktuelle Auszug keinen Wert enthält: der Wert im
    >     Auszug 0
    > 3.  wenn auch der Auszug 0 keinen Wert enthält: der systeminterne
    >     Vorgabewert

-   Menü **Konfig. bearbeiten**

    Über dieses Menü kannst du die Konfigurationsparameter
    **bearbeiten**. Dazu werden entprechende Bildschirmmasken
    aufgerufen. Weitere Informationen findest du im\
    Kapitel \ref{konfigurationsmasken}:
    "[Konfigurationsmasken](#konfigurationsmasken)"

-   Menü **Zusatz einfügen**

    \index{Zusatz!einfügen|textbf}Über dieses Menü können
    Zupfnoter-spezifische Zusätze an eine Note bzw. an einen Taktstrich
    eingefügt werden. Zupfnoter verwendet spzifische Zusätze, um z.b.
    die Position von Sprunglinien anzugeben, oder Notengebundene
    Anmerkungen zu erfassen. Diese Zusätze sind an eine Note bzw. an
    einen Taktstrich gebunden und werden in Form einer ABC-Anmerkung
    notiert (z.B.`"^@@3" :|` für die Lage einer Sprungline für eine
    Wiederholung).

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
    [Texteditor](#texteditor))
-   Konfigurationsmasken (siehe Kapitel \ref{konfigurationsmasken}
    [Konfigurationsmasken](#konfigurationsmasken))

### Fenster rechts oben: Notenvorschau

Die Notenvorschau zeigt das Musikstück in herkömmlichen Noten an. Damit
kann man sich bei der Erfassung auf die musikalischen Aspekte
konzentrieren.

Wenn man auf Elemente in der Notenvorschau klickt, werden diese auch im
Texteditor und in der Unterlegnotenvorschau hervorgehoben.

> **Hinweis::** Wenn man zunächst eine Note, und dann mit gedrückter
> "Shift"-Taste ("Umschalttaste") eine zweite Note anklickt, dann werden
> die dazwischen liegenden Noten selektiert. Damit kannst du z.B. einen
> Auschnitt aus einer bestimmten Stimme über die Notenvorschaut
> auswählen und anschließend abspielen lassen.

### Fenster rechts unten: Unterlegnotenvorschau

Die Unterlegnotenvorschau zeigt die erzeugten Unterlegnoten. Über den
Reiter "Zoom" kann man die Anzeige vergrößern oder verkleinern.

Über die Scrollbalken kann man den angezeigten Ausschnitt wählen.

Durch Ziehen/Ablegen kann man Elemente auf dem Notenblatt verschieben.
Wenn du die Maus über ein verschiebbares Element bewegst, wird der
Mauszeiger zu einer "Hand". Das Ergebnis der Verschiebung wird in den
Konfigurationsparametern abgespeichert (siehe TODO)

Über ein Kontextmenü (klick mit rechter Maustaste) kannst du erweiterte
Einstellungen vornehmen (Konfigurationsparameter setzen)

> **Hinweis:** Die Konfigurationsparameter werden im Texteditor des
> Eingabebereiches abgelegt. Der Name der betroffenen
> Konfigurationsparameters erscheint rechts unten in der Statuszeile,
> wenn man mit der Maus über ein Element fährt.

### Statusleiste am unteren Bildschirmrand

Am unteren Bildschirmrand gibt es eine Statusleiste mit folgenden
Einträgen

-   Position der Schreibmarke im Editor
-   Bedeutung des Symbols links von der Schreibmarke (Syntax Token)
-   Pfad zur Dropbox
-   Aktives Filter für Loglevel (am besten auf "Error" eingestellt)
-   Name des Konfigurationsparameters für das Element unter dem
    Mauszeiger

### Konsole {#konsole-fenster}

Die Konsole ist nur sichtbar, wenn sie mit `cmd-K` eingeschaltet wurde.
Sie stellt die letzten Meldungen von Zupfnoter dar. Experten können in
der Konsole auch weitere Befehle eingeben, die Zupfnoter direkt steuern.
Mehr mit dem Befehl "Hilfe".

> **Hinweis**: Die Zupfnoter-Menüs lösen letztendlich solche
> Konsolenbefehle aus. Daher werden selbst Experten diese Befehle in der
> Regel nicht brauchen.

## Tastenkombinationen (Shortcuts) {#shortcuts}

Für eine flüssige Bedienung stellt Zupfnoter folgende
Tastenkombinationen (Shiortcuts) zur Verfügung:

-   "cmd - s": Speichern
-   "cmd - k": Konsole
-   "cmd - s": Rendern
-   "cmd - p": Play

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
> -   Die Unterlegnotenvorschau wird erst durch die Funktion `Rendern`
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

### Masken für Zupfnoter-spezifische Zusätze {#masken-fuer-zusaetze}

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

### Darstellung der Konfigurationsparameter im Texteditor

Nach der ABC-Notation kommen die Zupfnoter-Einstellungen. Diese werden
durch den Kommentar

    `%%%%zupfnoter.config`

von der ABC-Notation abgetrennt. Die ABC-Notation und die
Zupfnoter-Einstellungen dürfen nicht gemischt werden.

Die Zupfnoter-Einstellungen sind in der ABC-Datei in einem
standardisierten Textformat abgelegt, welches leicht lesbar und mit
etwas Übung auch bearbeitbar ist (sog. JSON-Format). Dieses Format sieht
eine Gruppierung und Hierarchisierung zusammenhängender Einstellungen
vor.

> **Hinweis**: Zupfnoter bietet eine komfortable Benutzerführung über
> Bildschirmmasken zur Bearbeitung der Konfigurationsparameter, so dass
> die dierekte Bearbeitung im Texteditor nur noch in besonderen Fällen
> notwendig ist (siehe Kapitel \ref{konfigurationsmasken}
> [Konfigurationsmasken](#konfigurationsmasken)).

Über die Zupfnoter-Einstellungen wird das Design der Unterlegnoten
verfeinert. So können zum Beispiel repeat lines (Wiederholungslinien)
besser positioniert werden oder string names (Saitennamen) eingefügt
werden. Die Zupfnoter-Einstellungen können manuell eingegeben werden
oder über das Menü sheet config (Blattkonfiguration) erzeugt werden.
Weitere Informationen zu den Zupfnoter-Einstellungen stehen im
Kapitel \ref{konfiguration} "[Konfiguration](#konfiguration)".

> **Hinweis**: Wichtig ist, nach einer Änderung in der Menüleiste immer
> auf auf `Rendern` (ausführen) zu drücken, damit die Unterlegnoten
> aktualisiert werden.

> **Hinweis**: Wenn man im Vorschaufenster Elemente mit der Maus
> verschiebt wird diese Änderung sofort in den Konfigurationsparametern
> im Textfenster gespeichert. Eine andere Ablage gibt es nicht. Daher
> kann man mit "Undo" (cmd/ctrl-Z) im Texteditor solche Änderungen auch
> wieder rückgängig machen. Das gilt auch für die Bearbeitung der
> Konfigurationsparameter über die Bildschirmmasken.

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

## Editor für Liedtexte

\index{Liedtexte}Liedtexte werden in der ABC-Notation in den Kopfpzeilen
`W:` erfasst. Zur Vereinfachung der Eingabe bietet Zupfnoter auch einen
Liedtext-Editor Dieser ist über den Reiter `Liedtexte` erreichbar.

> ![Liedtexteditor](../ZAUX_Images/040-070_lyricseditor.jpg) 

Die Texte werden beim Klick auf den Reiter `Liedtexte` aus dem
Texteditor für ABC-Notation entnommen. Bei jeder Änderung werden werden
die Texte sofort in den Textedtior zurückgeführt. Daher kann man die
Änderungen an Texten sofort in der Notenvorschau sehen und auch aus dem
Liedtexteditor `Rendern` aufrufen, um sie in der Unterlegnotenvorschau
zu sehen.

> **Hinweis**: Die Anordnung der Liedtexte wird über die Konfiguration
> bestimmt (siehe Kapitel \ref{extract.0.lyrics}
> [extract.0.lyrics](#extract.0.lyrics)

## Konfigurationsmasken

Zupfnoter bezieht seine Leisutngsfähigkeit und Flexibil

Zupfnoter bietet eine komfortable Barbeitung der Konfigurationsparameter
über Bildschirmmasken. Diese Masken werden über das Menu "**Konfig.
bearbeiten**" aufgerufen. Die Masken wirken dann auf den aktuell
eingestellten Auszug.

> **Hinweis**: Grundsätzlich bildet Zupfnoter für jeden
> Konfigurationsparameter einen Wert in folgender Reihenfolge
>
> 1.  Der Wert im aktuellen Auszug bzw. im Musikstück (für Parameter die
>     nicht pro Auszug gesetzt werden können)
> 2.  wenn der aktuelle Auszug keinen Wert enthält: der Wert im Auszug 0
> 3.  wenn auch der Auszug 0 keinen Wert enthält: der systeminterne
>     Vorgabewert

Dabei gibt es zwei Arten von Masken

-   vordefinierte Masken mit einem festen Aufbau. Diese zeigen
    Eingabefelder für Parameter auch dann, wenn sie im Musikstück noch
    nicht vorhanden sind. Wichtigstes Beispiel ist die Maske
    "Grundeinstellungen"
-   dynamische Masken, welche nur die Parameter zeigen, die im
    Musikstück auch wirklich vorhanden sind. Prominentestes Beispiel
    hierfür ist die Maske "Liedtexte"

    > **Hinweis**: Es kann durchaus sinnvoll sein, über das Menü
    > "**Konfig. einfügen**" zusätzliche Parameter hinzuzufügen, während
    > man in einer dynamischen Maske arbeitet.

Da wie gesagt, die Konfigurationsparameter an verschiedenen Stellen
gesucht werden, muss auch das Einfügen / Löschen von
Konfigurationsparametern über die Masken möglich sein. Daher gibt es in
den Konfigurtionsmasken pro Parameter je eine Zeile mit den folgenden
Elementen:

-   `Löschen` - Löscht den Paramter aus der Konfiguration

    > **Hinweis**: Diese Taste kann ggf. einen ganzen Auszug löschen
    > (wenn man die `Löschen` - Button an einem Auszug drückt. Also
    > bitte vorsichtig.

-   `Füllen` - Diese Taste füllt den Parameter mit den Vorgabewerten.
    Falls noch nicht vorhanden wird er auch in die in die Konfiguration
    eingefügt (Ggf. werden auch Unterparameter mit eingefügt, z.B. bei
    "Layout").
-   `Name` - die Beschriftung des Parameters
-   `Eingabefeld` - hier kann der Wert eingegeben werden. Bei
    Gruppierungen gibt es kein Eingeabefeld, da hier die Werte in die
    Unterparameter eingetragen werden.
-   `Hilfe` - zeigt eine spezifische Hilfe für diesen Parameter an
-   `aktuell wirksamer Wert` - zeigt den Wert an, der für den Paramter
    gerade gültig ist.

    > **Hinweis**: Hier wird ggf. der Wert aus `extract.0` angezeigt
    > falls im aktuellen Auszug noch kein Wert vorhanden ist.
    >
    > Mit Klick auf den Knopf `Füllen` wird der Parameter in den
    > aktuellen Auszug eingefügt und mit dem wirksamen Wert befüllt. Der
    > Wert kann dann ggf. für diesen Auszug angepasst werden.

    > **Hinweis**: Wenn ein neuer Wert im Eingabefeld eingegebn, das
    > Eingabefeld aber noch nicht verlassen wurde, Zeit "aktuell
    > wirksamer Wert" noch den alten Wert an. Du musst das Eingabefeld
    > verlassen (z.b. mit der "Tab" - Taste) um die Eingabe des Wertes
    > abzuschließen.

> ![Konfigurationsmaske](../ZAUX_Images/040-040_Konfigurationsmasken.pdf) 

Für die Bedienung der Masken ist noch wichtig

-   Schaltfläche `Refresh`: Um sicher zu gehen, dass die
    Konfigurationsmaske wirklich die aktuellen Werte zeigt, kann mit
    `Refresh` die Maske neu aufgebaut werden. Dies ist z.B. dann
    notwendigWenn der Konfigurationsparameer außerhalb der Maske
    geändert wird (z.B. im Texteditor).
-   Schalltfläche `Neuer Eintrag`: Diese Taste fügt eine neue Intanz
    eines Parameters ein. Sie ist nur vorhanden, wenn es für einen
    Parameter mehrere Instanzen geben kann (z.B.
    \index{Liedtexte}Liedtexte [lyrics.x],
    \index{Seitenbeschriftung}Seitenbeschrifung [notes.x])
-   Feldeingabe mit der "TAB"-Taste bestätigen
-   `Rendern` nicht vergessen

<!-- -->

[^040_UD-Zupfnoter-Referenz.md_1]: longnote Leider gibt es keine
    entsprechende Dekoration im ABC-Standard

[^040_UD-Zupfnoter-Referenz.md_2]: Es gibt noch ein weiteres Fenster,
    die Konsole, welche nur bei Bedarf von Experten genutzt wird (siehe
    Kapitel \ref{konsole-fenster} [Konsole](#konsole-fenster)).
