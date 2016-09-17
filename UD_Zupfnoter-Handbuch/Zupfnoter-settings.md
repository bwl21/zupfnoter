# Zupfnoter für Experten

## Erstellung von Auszügen

TODO: Konzept der Auszüge beschreiben

## Zupfnoter Einstellungen

### Persönliche Einstellungen

see https://github.com/bwl21/zupfnoter/issues/71

### Grundlegende Blatteinstellungen

TODO: text überarbeiten

-   title (Titel) [extract.x.title]

    Es wird die Abc Notationszeile für den Titel (T:) des Musikstückes
    generiert.

-   voices (Stimmen) [extract.x.voices]

    Es wird die Abc Notationszeile für die einzelne Stimme (V:) des
    Musikstückes generiert.

-   flowlines (Melodielinie oder Hauptlinie) [extract.x.flowlines]

    Wenn der Auszug 0 mehrere Stimmen enthält und man einen Auszug 1 mit
    der Bass-Stimme und der ersten Stimme erstellt hat, möchte man die
    Hauptlinie in der Bass-Stimme haben und die Noten der ersten Stimme
    sollen dann die Begleittöne zur Bass-Stimme werden und keine
    Melodielinie mehr enthalten. Für diesen Zweck wird ein
    Zupfnoter-Kommando generiert.

-   layoutlines (Layout-Linien) [extract.x.layoutlines]

    Dieses Zupfnoter-Kommando wird benötigt, wenn Tisch-Harfen-Noten
    sich vertikal überlappen oder übereinander gelegt wurden. Mit dem
    Zupfnoter-Kommando definiert man die Abstände zwischen zwei Noten.

-   jumplines (Wiederholungslinien, Sprunglinien) [extract.x.jumplines]

    Wiederholungszeichen in den herkömmlichen Noten werden in den
    Tisch-Harfen-Noten als Wiederholungslinie dargestellt. In der Regel
    muss der vertikale Teil der Wiederholungslinie nach rechts
    verschoben werden, damit er rechts von den Noten liegt und nicht
    mitten durch das Notenbild der Tisch-Harfen-Noten geht. Dieses
    Zupfnoter-Kommando wird benötigt, um den vertikalen Teil der
    Wiederholungslinie horizontal (nach rechts oder links) verschieben
    zu können.

-   synchlines (Synchronisationslinie, Querlinie zu Begleitnoten)
    [extract.x.synchlines]

    Dieses Zupfnoter-Kommando wird benötigt, wenn Querlinien zu
    Begleitnoten erscheinen sollen oder wenn zum Beispiel Noten der
    ersten Stimme mit Noten der zweiten Stimme durch eine Querlinie
    verbunden werden sollen.

-   legend (Legende) [extract.x.legend]

-   notes (Blattbeschriftung) [extract.x.notes]

    todo: Sachverhalte: steht für Noten und für Notizen im Zupfnoter.
    Vorschlag hier umbenennen in notice oder comment???.

-   lyrics (Liedtexte) [extract.x.lyrics]

    In der Abc Notation werden Liedertexte im Kopffeld W:

    erfasst und mit bestimmten Symbolen werden Wörter oder Silben den
    herkömmlichen Noten zugeordnet. Diese Liedertexte können nicht für
    die Tisch-Harfen-Noten genutzt werden. Deshalb muss man die
    Liedertexte für die Tisch-Harfen-Noten über dieses
    Tisch-Harfen-Noten erstellen. Es bietet sich an, pro Strophe ein
    Zupfnoter-Kommando (durchnumerieren) zu erstellen, damit man die
    verschiedenen Strophen besser auf dem Blatt der Tisch-Harfen-Noten
    verteilen kann.

    todo: unterschied zwischen `w:` und `W:`

-   nonflowrest (Ablauf ohne Pausen) [extact.x.nonflowrest]

    Generell werden Pausen in den Begleitnoten der herkömmlichen Noten
    und Tisch-Harfen-Noten unterdrückt. Wenn man einzelne Pausen sehen
    möchte, erzeugt man diese über die Abc Notation mit dem Buchstaben
    z.  Wenn man alle Pausen sehen möchte, benutzt man dieses
        Zupfnoter-Kommando um die Standardeinstellung zu deaktivieren.
-   startpos (Startposition) [extract.x.startpos]

-   subflowlines (Unterablauflinien oder Teilabschnittslinien)
    [extract.x.subflowlines]

    Dieses Zupfnoter-Kommando wird benötigt, wenn man einzelne Noten
    ausserhalb der Stimmen mit Linien verbinden möchte. Dies kann
    sinnvoll bei Begleitnoten sein, die in der Melodie keiner Note
    zugeordnet werden können oder bei Verzierungsnoten.

-   produce (produzieren) [produce]

    Nur bestimmte Auszüge erzeugen für einzelne

    Stimmen (Auszug 0 beinhaltet 100 %)

-   layout (Gestaltung oder Anordnung) [extract.x.layout]

-   countnotes oder beat time (Takt zählen)

    Es werden unter jeder Note, abhängig von der Taktart, Zahlen
    zugeordnet, die die Zählung des Taktes darstellen. Bei einem 4/4
    Takt kann das also (1 2 3 4) oder (1 und 2 und 3 und 4 und) sein.
