# Zupfnoter für Experten

## Erstellung von Auszügen {#auszuege}

TODO: Konzept der Auszüge beschreiben

## Zupfnoter Einstellungen

### Persönliche Einstellungen

see https://github.com/bwl21/zupfnoter/issues/71

### Grundlegende Blatteinstellungen

TODO: text überarbeiten

-   **Titel**: [extract.x.title]

    Spezifizert den Titel des Auszugs

    **Hinweis:** Der Titel des Auszug ist nicht zu verwechseln mit dem
    Titel des Musktistücks ( ABC-Kopfzeite "´T:\`")

-   "Stimmen": [extract.x.voices]

    Spezifiziert, welche Stimmen im dem Auszug dargestellt werden.

-   **Flusslinien** [extract.x.flowlines]

    Spezifizert, welche Stimmen eine Flusslinie erhalten sollen.

-   **Stimmen für layout**: [extract.x.layoutlines]

    Zupfnoter errechnet die vertkale Anordnung der Noten aus den
    einzelnen Notenlängen. Über diese Einstellung wird bestimmt, welche
    Stimmen in die Berechnung eingehen.

    > **Hinweis:** man kann sogar eine eigene "Stimme" schreiben, welche
    > nur zur Berechung des Layouts herangezogen, aber nicht auf den
    > Unterlegnoten dargestellt wird. Auf diese Weise kann man man das
    > layout vollständig manuell steuern.

-   **Sprunglinien:** [extract.x.jumplines]

    Diese Einstellung wird bestimmt, für welche Stimmen die Sprunglinien
    dargestellt werden.

    Wiederholungszeichen in den herkömmlichen Noten werden in den
    Tisch-Harfen-Noten als Wiederholungslinie dargestellt. In der Regel
    muss der vertikale Teil der Wiederholungslinie nach rechts
    verschoben werden, damit er rechts von den Noten liegt und nicht
    mitten durch das Notenbild der Tisch-Harfen-Noten geht. Die
    horizontale Position der Sprunglinie wird über die ABC-Notation
    eingestellt. Dazu wird vor dem entsprechenden Taktstrich z.B.
    eingegeben:

    "`^@5 :|`" - der Vertikale Teil der Sprunglinie liegt fünf
    Halbtonschritte rechts von der letzten Note des Abschnittes

-   **Synchnronisationslinien:** (Synchronisationslinie, Querlinie zu
    Begleitnoten) [extract.x.synchlines]

    Diese Einstellung bestimmt, zwischen welchen Stimmen die
    Synchronisiationslinien dargestellt werden.

    **Hinweise:** Synchronisationsliniem für Mehrklänge werden immer
    dargestellt.

-   **Legende**: [extract.x.legend]

    Diese Einstellung bestimmt die Position der Legende. Dabei kann die
    Überschrift des Musikstückes und der Informationsbloock separat
    poitioniert werden.

    **Hinweis:** durch Veschieben der Objekte mit der Maus wird diese
    Einstellung automatisch eingefügt.

-   **Liedtexte:** (Liedtexte) [extract.x.lyrics]

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

-   **Seitenbeschriftung:** [extract.x.notes]

    TODO Sachverhalte: steht für Noten und für Notizen im Zupfnoter.
    Vorschlag hier umbenennen in notice oder comment???.

-   **Begleitpausen:** [extact.x.nonflowrest]

    Generell werden Pausen in den Begleitnoten (Stimmen ohne Flusslinie)
    der herkömmlichen Noten und Tisch-Harfen-Noten unterdrückt. Wenn die
    Pausen auch in den Begleitstimmen sehen möchte, kann msn sie mit
    dier Einstellung einschalten.

-   **Startposition:** [extract.x.startpos]

    Mit dieser Einstellung kann man die Startposition der Unterlegnoten
    festlegen. Die Angabe erfolgt in mm und wird vom oberen Blattrand
    gemessen.

-   **Unterflusslinien**: [extract.x.subflowlines]

    Diese Einstellung bestimmt, für welche Stimmen die Unterflusslinien
    ausgegeben werden. Dies kann sinnvoll bei Begleitnoten sein, die in
    der Melodie keiner Note zugeordnet werden können oder bei
    Verzierungsnoten.

-   **Ausgabe:** [produce]

    Diese Einstellung bestimmt, welche Auszüge gedruckt werden sollen.
    Oft wird z.B. der Auszug 0 nur zur Bearbeitung verwendet, aber nicht
    gedruckt.

    Stimmen (Auszug 0 beinhaltet 100 %)

-   **Layout:** (Gestaltung oder Anordnung) [extract.x.layout]

-   **Zählmarken:** [extraxt.x.coountnotes]

    Es werden unter jeder Note, abhängig von der Taktart, Zahlen
    zugeordnet, die die Zählung des Taktes darstellen. Bei einem 4/4
    Takt kann das also (1 2 3 4) oder (1 und 2 und 3 und 4 und) sein.

-   **Taktnummern:** [extract.x.barnumbers]

    Diese Einstellung bestimmt, an welchen Stimmen die Takte numeriert
    werden. Ebenso wird Position und Darstellung bestimmt.
