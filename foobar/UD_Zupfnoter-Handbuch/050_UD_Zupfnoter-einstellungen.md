\cleardoublepage

# Zupfnoter für Experten

## Zupfnoter Einstellungen

### Persönliche Einstellungen

see https://github.com/bwl21/zupfnoter/issues/71

### Grundlegende Blatteinstellungen (Konfiguration) {#grundlegende-blatteinstellungen}

TODO: text überarbeiten

-   **Titel**: [extract.x.title]

    Spezifizert den Titel des Auszugs

    > **Hinweis:** Der Titel des Auszug ist nicht zu verwechseln mit dem
    > Titel des Musikstücks ( ABC-Kopfzeite "´T:\`")

-   **Stimmen**: [extract.x.voices]

    Spezifiziert, welche Stimmen in dem Auszug dargestellt werden.

-   **Flusslinien** [extract.x.flowlines]

    Spezifiziert, welche Stimmen eine Flusslinie erhalten sollen.

-   **Stimmen für layout**: [extract.x.layoutlines]

    Zupfnoter errechnet die vertikale Anordnung der Noten aus den
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

    "`^@@5 :|`" - der vertikale Teil der Sprunglinie liegt fünf
    Halbtonschritte **rechts** von der letzten Note des Abschnittes

    "`^@@-5 :|`" - der vertikale Teil der Sprunglinie liegt fünf
    Halbtonschritte **links** von der letzten Note des Abschnittes

-   **Synchronisationslinien:** (Synchronisationslinie, Querlinie zu
    Begleitnoten) [extract.x.synchlines]

    Diese Einstellung bestimmt, zwischen welchen Stimmen die
    Synchronisiationslinien dargestellt werden.

    **Hinweise:** Synchronisationslinien für Mehrklänge werden immer
    dargestellt.

-   **Legende**: [extract.x.legend]

    Diese Einstellung bestimmt die Position der Legende. Dabei kann die
    Überschrift des Musikstückes und der Informationsblock separat
    positioniert werden.

    **Hinweis:** durch Veschieben der Objekte mit der Maus wird diese
    Einstellung automatisch eingefügt.

-   **Liedtexte:** (Liedtexte) [extract.x.lyrics]

    Diese Einstellung bstimmt, wie die Liedtexte im Unterlegnotenblatt
    positioniert werden.

    > **Hinweis**: Zupfnoter kann nur die Liedtexte aus der Kopfzeile
    > "`W:`" verarbeiten. In der Abc Notation kann man Liedtexte auch im
    > Kopffeld "`w:`" erfassen, um sie innerhalb der Notenzeilen
    > anzuordnen. Mit bestimmten Symbolen werden Wörter oder Silben den
    > herkömmlichen Noten zugeordnet.

-   **Seitenbeschriftung:** [extract.x.notes]

    TODO Sachverhalte: steht für Noten und für Notizen im Zupfnoter.
    Vorschlag hier umbenennen in notice oder comment???.

-   **Begleitpausen:** [extact.x.nonflowrest]

    Generell werden Pausen in den Begleitnoten (Stimmen ohne Flusslinie)
    der herkömmlichen Noten und Tisch-Harfen-Noten unterdrückt. Wenn du
    die Pausen auch in den Begleitstimmen darstellen möchtest, kannst du
    sie mit dieser Einstellung einschalten.

-   **Startposition:** [extract.x.startpos]

    Mit dieser Einstellung kann man die Startposition der Unterlegnoten
    festlegen. Die Angabe erfolgt in Millimeter und wird vom oberen
    Blattrand gemessen.

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

## Zupfnoter-spezifische Zusätze {#zusaetze}

\index{Zusatz}Zupfnoter verwendet "Annotations" der ABC-Notation mit
spezifischen Konventionen. Diese Zusätze stehen vor der Note bzw. dem
Taktstrich auf den sie sich beziehen.

Zupfnoter-Annotations beginnen mit einem der Zeichen `:`, `@`, `!`, `#`,
`<`, `>`. Beispielwesie bedeutets `"^>"` dass das Notensymbol in den
Unterlegnoten nach rechts verschoben werden.

> **Hinweis**: Dieses Zusätze können über Bildschirmmasken komfortabel
> bearbeitet werden (siehe Kapitel \ref{masken-fuer-zusaetze} [Masken
> für Zupfnoter-spezifische Zusätze](#masken-fuer-zusaetze)).

Es gibt folgende Zusätze:

-   **`^:`** - Sprungziel: Damit kannst du ein Ziel festelegen zu dem
    eine Sprunglinie gezeichnet werden kann. Damit kannst du beliebige
    Sprünge darstellen.

-   **`^@`** - Sprung: Damit kannst du eine Sprunglinie erzeugen.
    Beispiele: `@p1@3`, `@@-4`

-   **`^!`** - Notenbeschriftung: Damit kannst du eine Beschriftung an
    eine Note in den Umterlegnoten anbringen

    Beispiel:

    `"^"this is my note@5,2"` schreibt eine Beschriftung 5 mm rechts,
    2mm unter die Note

-   **`^#`** - Ref. Notenbeschriftung: Damit kannst du eine Beschriftung
    mit einem vordefinierten Text (Beschriftungsvorlage) anbringen

-   **`^>`** - Rechtsverschiebung: Verschiebt das Notensymbol in den
    Unterlegnoten nach rechts

-   **`^<`** - Linksverschiebung: Verschiebt das Notensybmol in den
    Unterlegnoten nach links

-   **[r:n_11]** - Verschiebemarke: Das ist eine eingebettete Kopfzeile
    der ABC-Notation. Wenn man mit der Maus Elemente im
    Unterlegnotenblatt verschiebt, wird diese Verschiebung in der
    Konfiguration abgespeichert (`notebound`). Die Referenz wird dann
    über den Namen der Verschiebemarke hergestellt.

    > **Hinweis**: Wenn keine Verschiebemarke vorhanden ist, wird diese
    > Referenz über die Zeitachse hergestellt. Daher geht diese
    > Verbindung eventuell verloren, wenn das Zeitgefüge des
    > Musikstückes verändert wird. Das kann durch Einfügen einer
    > Verschiebemarke verhindert werden.
