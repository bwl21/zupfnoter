#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2.5cm, right: 2.5cm),
  header: [
    #grid(
      columns: (auto, 1fr, auto),
      align: (left, center, right),
      [♪],
      [Zupfnoter-Handbuch (review)],
      [2 EINFÜHRUNG]
    )
    #line(length: 100%, stroke: 0.5pt)
  ],
  footer: [
    #line(length: 100%, stroke: 0.5pt)
    #context [
      #grid(
        columns: (1fr, auto, 1fr),
        [www.zupfnoter.de],
        [#counter(page).display()],
        align: right,
        [February 28, 2026]
      )
    ]
  ]
)

#set text(font: "Libertinus Serif", size: 11pt, lang: "de")
#set par(justify: true, leading: 0.65em)
#set columns(2, gutter: 1.5cm)
#set heading(numbering: "1.")

#show heading: it => {
  set text(weight: "bold")
  if it.level == 1 {
    text(size: 16pt, it)
  } else {
    it
  }
}

#let blockquote(body) = {
  block(
    fill: luma(240),
    inset: 1em,
    radius: 0.5em,
    [#body]
  )
}

#show raw.where(block: true): it => {
  block(
    fill: luma(245),
    inset: 0.8em,
    radius: 0.3em,
    stroke: 0.5pt + luma(200),
    text(font: "Courier New", size: 9pt, it)
  )
}

#blockquote[
#blockquote[
   #image("../ZAUX_Images/000_frontimage.jpg")  
]
]

Version v1.17.1

```
© 2026 https://www.zupfnoter.de
```

= Über dieses Handbuch
#label("über-dieses-handbuch")
Du siehst dieses Handbuch und bist schockiert, dass es über 120 Seiten hat. Aber wie sagt man doch so schön: "keine Panik!". Ersteller einfacher Unterlegnoten kommen mit den ersten Kapiteln schon auf die Erfolgsstraße.

Dieses Handbuch richtet sich an alle, die Zupfnoter verwenden und sich selbst in den Zupfnoter einarbeiten wollen. Dabei haben wir folgende Zielgruppen im Blick:

-  #strong[Ersteller einfacher Unterlegnoten]: Der Einsteiger erstellt Musikstücke mit einer Stimme und ggf. Texten. Hierzu gehört auch der Import vorhandener Stücke über die Dateiformate MusicXml (.xml, .mxl) oder ABC-Notation (.abc).

-  #strong[Ersteller anspruchsvoller Unterlegnoten]: Der Experte erstellt komplexe Musikstücke mit vielen Stimmen, detaillierter Anordnung, mehreren Auszügen, Transponierungen usw. Diese Zielgruppe nutzt mehr und mehr die vielfältigen Möglichkeiten von Zupfnoter und ist im Wesentlichen durch die Größe des Instrumentes und die eigene Phantasie begrenzt.

Dieses Handbuch wurde von Verena Hinzmann und Bernhard Weichel erstellt.

#blockquote[
#strong[Hinweis]: Dieses Handbuch ist noch nicht fertig; Kapitel 5 ff. sind nur rudimentär. Wir veröffentlichen daher die Vorabversionen mit TODOs und Zeilennummern.

Das Handbuch wird während der Weiterentwicklung von Zupfnoter laufend aktualisiert.

Für Hinweise auf Fehler oder Verbesserungsmöglichkeiten sind wir sehr dankbar.

"Do not complain about this manual, be glad that there are page numbers :-)"
]

TODO: markieren, für welche Zielgruppe welche Textabschnitte relevant sind.

TODO: Screenshots aktualisieren

= Einführung
#label("einführung")
Zupfnoter ist ein freies Programm, um selbst Unterlegnoten für Tischharfen zu erstellen. Die mit Zupfnoter erstellten Unterlegnoten eignen sich für alle gängigen Tischharfen (Zauberharfe, Veeh-Harfe®, Tischharfen von \"Instrumentenbau Franz Bauer\"). Somit kannst du alles auf deiner Tischharfe spielen, was du willst.

Zupfnoter ist so flexibel, dass man Noten für alle chromatischen Instrumente erstellen kann, die von oben nach unten gespielt werden, egal welche Form, wieviele Saiten und welchen Saitenabstand sie haben. Insbesondere kann der Saitenabstand individuell eingestellt werden, so dass Zupfnoter auch für Instumente mit einem Saitenabstand ungleich 11,5 mm geeignet ist.

Der Zupfnoter wird über die Homepage #link("https://www.zupfnoter.de") aufgerufen und kann ohne die Installation einer Software auf deinem PC sofort angewendet werden. Er läuft unabhängig vom Betriebssystem des PC’s und ist für Mac, Linux und sogar für Windows geeignet.

Zupfnoter unterstützt vier grundlegende Schritte zur Erstellung von Unterlegnoten:

-  #strong[Noten eingeben]

  Zupfnoter erfasst die Musikstücke#super[1] in der Standard-ABC-Notation. Diese kann man selbst eingeben oder vorhandene ABC-Dateien verwenden.

  Über die Music-XML-Schnittstelle können Noten aus vielen Musik-Programmen importiert werden (z.B. aus dem ebenfalls freien Programm Musescore).

-  #strong[Prüfen]

  Zupfnoter stellt die Musikstücke in ABC-Notation, in regulären Noten und auch als Unterlegnotenvorschau auf dem Bildschirm dar.

  Zupfnoter spielt die Musikstücke auch ab und zeigt während des Abspielens den Ablauf in den beiden Notenansichten an. Die eingegebenen Noten können so einfach überprüft und korrigiert werden.

  Taktfehler können in den regulären Noten leicht erkannt werden.

-  #strong[Gestalten]

  Zupfnoter setzt die Unterlegnoten für die Tischharfe automatisch. Man hat dabei sehr flexible Gestaltungsmöglichkeiten und kann einzelne Stimmen beliebig für die Ausgabe zusammenstellen (Auszüge).

  Für die Stimmen gibt es wählbare Dekorationen wie Melodielinien, Zählmarken, Synchronisationslinien. Sogar die Größe der Noten ist einstellbar.

-  #strong[Drucken]

  Zupfnoter erstellt PDF-Dateien im Format A3 oder A4, die direkt ausgedruckt werden können.

  Bei Ausgabe im DIN-A4-Format teilt Zupfnoter das Notenblatt auf drei Seiten auf. Anhand der aufgedruckten Schnittmarken kann anschließend das Notenblatt geschnitten und zusammengefügt werden.

  Als Web-Anwendung speichert Zupfnoter die erstellten Musikstücke per Download auf dem lokalen Rechner oder in der Cloud (Dropbox).

= Erste Schritte mit Zupfnoter
#label("erste-schritte-mit-zupfnoter")
Mit dem Zupfnoter kannst du ganz schnell einfache Musikstücke eingeben und als Unterlegnoten darstellen. Mit der Zeit wirst du immer mehr Funktionen und Möglichkeiten von Zupfnoter erobern, um auch komplexe Musikstücke zu bearbeiten bzw. die Unterlegnoten im Detail nach deinen Wünschen zu gestalten.

== Zupfnoter starten
#label("zupfnoter-starten")
Starte nun Zupfnoter in folgenden Schritten:

+  öffne deinen Web-Browser (vorzugsweise Chrome)

+  gehe zu "https://www.zupfnoter.de"

+  drücke auf die Schaltfläche "Zupfnoter Starten"

  #image("../ZAUX_Images/030-010_einfuehrung-zupfnoter-starten.jpg") 

  Hinweis: Wer lieber erst die Einführungsvideos anschaut, kann natürlich auch auf die Schaltfläche "Tutorials" klicken :-).

Beim ersten Aufruf des Zupfnoter erscheint ein beispielhaftes Musikstück. Mit diesem Beispiel kannst du in die Grundlagen des Zupfnoters einsteigen.

Anhand der schriftlichen Anleitungen unter dem Hilfemenü und mit den mündlichen Unterweisungen in den Tutorial-Videos (Selbstlerneinheiten) lassen sich gut die einzelnen Schritte für die Erstellung "Alle meine Entchen" nachvollziehen.

== Dein erstes Musikstück eingeben
#label("dein-erstes-musikstueck-eingeben")
Zupfnoter erfasst das Musikstück in der so genannten ABC-Notation. Diese wurde (unabhängig von Zupfnoter) erfunden, um Musikstücke auf Computern verarbeiten zu können. Computer können die ABC-Notation interpretieren, um daraus herkömmliche Musiknoten zu generieren oder auch Musikstücke auf dem Computer abspielen zu können. Unter dem Hilfemenü des Zupfnoters findet man eine deutsche Anleitung für die ABC-Notation.

+  klicke auf Schaltfläche "Neu", es erscheint ein Eingabeformular

+  gib die Liednummer (X:) und den Titel in das ein (z.B.; X: "1", Titel: "Alle meine Entchen") und bestätige mit der Schaltfläche "Ok".

  #blockquote[
  #blockquote[
  #blockquote[
  #image("../ZAUX_Images/030-015_create-new-sheet.jpg") 
  ]
  ]
  ]

  Im linken Fenster erscheint die Nummer in Zeile 1 und der Titel in Zeile 3. Zeile 2 zeigt den Dateinamen den Zupfnoter aus Nummer und Titel gebildet hat.

  #blockquote[
  #strong[Hinweis]: Der Wert von `X:` (Liednummer) muss eine positive Ganzzahl sein. Es dürfen keine Buchstaben, Leerzeichen oder Unterstriche enthalten sein.
  ]

+  klicke im linken Fenster in Zeile 12

+  gib die folgenden Notennamen und Notenwerte ein:

  `CDEF |  G2G2 | AAAA | G4 | AAAA  | G4 |  FFFF | E2E2 | GGGG  | C4 |]`

  Da du zunächst nur eine Stimme eingegeben hast, kannst du in Zeile 10 die "2" am Ende löschen. Dann wird nur die erste Stimme dargestellt.

+  klicke auf Schaltfläche "Rendern", um die Unterlegnoten zu erzeugen und die Meldungen im linken Fenster zu aktualisieren.

+  im Fenster rechts unten siehst du nun eine Vorschau der Unterlegnoten:

  #image("../ZAUX_Images/030-020_einfuehrung-erste-schritte.jpg") 

#strong[Herzlichen Glückwunsch!] Du hast dein erstes Musikstück mit Zupfnoter erstellt.

#blockquote[
#strong[Hinweis:] Um Taktstriche ("#strong[`|`]"), Wiederholungszeichen ("#strong[`|: :|`]") und Schlussstriche ("#strong[`]`]") darstellen zu können, benötigt man folgende Tastenkombinationen zur Erstellung des senkrechten Striches (vertical bar) bzw. der eckigen Klammer:

siehe auch #link("http://www.die-tastenkombination.de/")

#strong[Windows]

-  `|` erzeugt man mit der Taste AltGr und der Taste links vom Y
-  `[` erzeugt man mit der Taste `AltGr` und der Taste `8`
-  `]` erzeugt man mit der Taste `AltGr` und der Taste `9`
-  `~` erzeugt man mit der Taste `AltGr` der Taste `+`
-  `©` erzeugt man mit der Taste `Alt`und der Tastefolge 069 auf dem Ziffernblock
]

#blockquote[
#strong[Mac]

-  `|` erzeugt man mit der Taste `Alt` und der Taste `7`
-  `[` erzeugt man mit der Taste `Alt` und der Taste `5`
-  `]` erzeugt man mit der Taste `Alt` und der Taste `6`
-  `~` erzeugt man mit der Taste `Alt` der Taste `n`
-  `©` erzeugt man mit der Taste `Alt`und der Taste `G`
]

== Dein Musikstück prüfen
#label("dein-musikstück-prüfen")
Du möchtest nun prüfen, ob die Noten auch korrekt sind. Dazu kannst du es einfach mal anhören:

+  klicke auf die Schaltfläche "Play"

  Zupfnoter spielt "Alle meine Entchen" von Beginn an.

+  klicke auf die erste ganze Note im Fenster rechts oben (das sollte ein "G" sein). Diese wird dadurch ausgewählt und in allen Fenstern markiert.

  #blockquote[
  #strong[Hinweis]: Die Note ist nun auch im linken Fenster selektiert. Auf diese Weise kann einfach in der ABC-Notation navigiert werden.
  ]

+  klicke wieder auf die Schaltfläche "Play"

  Zupfnoter spielt "Alle meine Entchen" ab der ausgewählten Note.

== Die Unterlegnoten gestalten
#label("musikstueck-gestalten")
Als nächstes kannst du die Unterlegnoten gestalten. Zupfnoter bietet eine sehr große Vielfalt an Gestaltungsmöglichkeiten. Als einfaches Beispiel kannst du zunächst einen Liedtext hinzufügen:

+  klicke im linken Fenster auf den Reiter `Liedtexte`

+  füge nun die folgendenden Zeilen ein

  ```
  Alle meine Entchen
  schwimmen auf dem See
  schwimmen auf dem See

  Köpfchen in das Wasser
  Schwänzchen in die Höh
  ```

  #image("../ZAUX_Images/030-025_erfassung-liedtext.jpg") 

  Dieser Text erscheint sofort in dem Fenster rechts oben (der Notenvorschau), nicht jedoch in den Unterlegnoten. Dort erscheint der Liedtext erst, wenn die Einstellungen zur Gestaltung und Positionierung von Liedtexten eingefügt worden sind.

  #blockquote[
  #strong[Hinweis:] Leerzeichen in den Liedtexten werden komprimiert, d.h. zu einem Leerzeichen zusammengefasst. Leerzeichen am Anfang einer Zeile (führende Leerzeichen) werden ignoriert. Du kannst aber die Ausgabe eines Leerzeichens erzwingen, wenn du die Tilde (~) anstelle eines Leerzeichens verwendest.
  ]

  #blockquote[
  #strong[Hinweis]: Wenn du zurück gehst auf den den Reiter `ABC` siehst du in Zeile 15, (also in die Zeile nach dem "C,") nun die folgenden zeilen (dies ist die Darstellung von Liedtexten in der ABC-Notation):

  ```
     W: alle meine Entchen
     W: schwimmen auf dem See
     W: schwimmen auf dem See
     W:
     W: Köpfchen in ds Wasser
     W: Schwänzchen in die Höh
  ```
  ]

+  klicke auf die Schaltfläche "Konfig. bearbeiten". Dadurch öffnet sich das Menü zum Einfügen von "Konfiguration" in das Musikstück.

+  klicke auf den Eintrag "Liedtexte", um die Maske für Einstellungen für Liedtexte aufzurufen.

+  Klicke auf die Schaltfläche "Neuer Eintrag" um einen neuen Liedtextblock hinzuzufügen#super[2]

+  Trage im Feld "Strophen" ein: "`1, 2`", und bestätige die Eingabe durch Drücken der "Tab" - Taste.

  Das bedeutet, dass in dem neuen Liedtextblock die Strophen 1 und 2 ausgegeben werden.

  #image("../ZAUX_Images/030-026_konfiguration-liedtext.jpg") 

  Dadurch wird im linken Fenster folgendes eingefügt (zunächst musst du hier nichts tun. Wenn du einst ein Profi im Zupfnoter sein wirst, wirst du diese Zeilen schätzen lernen):

  "extract" : { "0" : {"lyrics": {"1": {"verses": \[1, 2\], "pos": \[350, 70\]}}} },

+  klicke auf die Schaltfläche "Rendern", um die Unterlegnoten zu aktualisieren.

  Nun erscheinen die Liedtexte:

  #image("../ZAUX_Images/030-027_erste-schritte-lyrics.jpg") 

+  Verschiebe mit der Maus die Liedtexte in der Vorschau der Unterlegnoten (Fenster rechts unten) an die Position, die dir gefällt.

  #blockquote[
  #strong[Hinweis:] Der Liedtext ist nun rot, um bei nahe an einander liegenden Texten anzuzeigen, welcher Text verschoben wurde. Durch klicken auf die Schaltfläche "Rendern" wird er wieder schwarz.
  ]

== Dein Musikstück drucken
#label("musikstueck-drucken")
Wenn das Musikstück fertig gestaltet ist, willst du es natürlich auch drucken:

+  klicke auf die Schaltfläche "Drucken"

+  klicke auf "A4" (oder auf "A3", wenn du einen Din-A3 Drucker hast)

  Es erscheint eine Druckvorschau des Unterlegnotenblattes.

+  klicke auf das Druckersymbol oben rechts.

  Es öffnet sich der Druckdialog deines Browsers.

  #blockquote[
  #strong[Hinweis]: bitte konfiguriere die Druckereinstellung so, dass der Ausdruck #strong[nicht vergößert oder verkleinert] wird (100%, 1:1, evtl. 'randlos' …).
  ]

  #image("../ZAUX_IMAGES/030-030_A4-schneiden.pdf") 

  Schneide alle ausgedruckten Blätter an den linken Schnittmarken (die kleinen "x" oben und unten am Blatt) mittig im "x" durch und klebe die Blätter so zusammen, dass die Schnittmarken wieder genau ein "x" ergeben.

Wenn du dein Musikstück als herkömmliche Noten ausdrucken willst:

+  gehe zurück zum Zupfnoter und klicke erneut auf die Schaltfläche "Drucken"

+  klicke auf Menüeintrag "Noten"

  Es erscheint ein neuer Reiter in deinem Browser mit einer Vorschau der herkömmlichen Noten.

+  Wähle in deinem Browser zum Drucken die Druckfunktion aus.

== Dein Musikstück speichern
#label("dein-musikstück-speichern")
Du hast vielleicht schon bemerkt, dass Zupfnoter bei einem Neustart immer das #strong[zuletzt bearbeitete] Musikstück wieder geladen hat.

Da du aber nicht nur ein Musikstück schreiben willst, solltest du natürlich dein Musikstück auf deinem Rechner so abspeichern, dass du es später wieder laden und weiter bearbeiten kannst.

Zupfnoter bietet dazu zwei Möglichkeiten:

-  Speichern per Download: Das läuft vollkommen lokal, ist aber nicht sehr komfortabel
-  Speichern in der Cloud (per Dropbox): Das nutzt die Cloud-Dienste, hat aber wesentliche Vorteile

=== Speichern per Download
#label("speichern-per-download")
Zum Speichern per Download führe folgende Schritte aus:

+  klicke auf die Schaltfläche "Dl abc"

+  dein Musikstück wird auf deinem Computer in deinem "Download-Ordner" abgelegt. Zupfnoter bildet den Dateinamen aus der Information in Zeile 2:

  aus "`F: 1_Alle-meine-Entchen`" entsteht "`1_Alle-meine-Entchen.abc`"

Bei Bedarf kannst du die Unterlegnoten als PDF herunterladen (z.B. um diese weiter zu geben):

+  klicke auf die Schaltfläche "Drucken"

+  klicke auf "A4" (oder auf "A3", wenn du einen Din-A3 Drucker hast)

  Es erscheint eine Druckvorschau des Unterlegnotenblattes.

+  klicke auf das Downloadsymbol oben rechts

+  Wähle den Speicherort

  Zupfnoter bildet auch hier den Dateinamen aus der Information in Zeile 2:

  aus "`F: 1_Alle-meine-Entchen`" entsteht "`1_Alle-meine-Entchen_alle-Stimmen.pdf`"

=== Speichern in der Dropbox
#label("speichern-in-der-dropbox")
Wenn du regelmäßig mit Zupfnoter arbeiten willst, bietet es sich an, zum Speichern der Muskstücke die Dropbox zu benutzen. Eine Dropbox ist ein Speicher außerhalb deines Rechners (in der "Cloud"). Mit der Dropbox hast du viele Vorteile bei Zupfnoter:

-  Zupfnoter speichert abc, pdf und Noten eines Musikstücks mit nur einem Klick

-  du hast alle deine Musikstücke zentral abgelegt und kannst sie mit einem Klick wieder in den Zupfnoter laden

  #blockquote[
  #strong[Hinweis]: Beim Laden von Muskstücken in Zupfnoter, wird der Anfang des Dateinamens bis zum ersten "\_" herangezogen. Daher muss pro Dropbox-Ordner diese Nummer eindeutig sein.
  ]

-  Dropbox speichert frühere Versionen, so dass du bei Problemen darauf zurück greifen kannst und den Verlauf deiner Änderungen nachvollziehen kannst.

-  Über die Dropbox kannst du deine Dateien mit anderen teilen, um gemeinsam an einem Musikstück zu arbeiten

-  Selbst, wenn du nicht online bist, hast du jeweils eine Kopie aller deiner Musikstücke (auch der PDFs) auf deiner lokalen Platte #super[3].

Zur Einrichtung einer Dropbox gehst du auf #link("https://www.dropbox.com/de"). Wenn du dich bei Dropbox angemeldet hast, findest du dort ein deutschsprachiges Benutzerhandbuch.

#blockquote[
#strong[Hinweis]: Dropbox speichert seine Daten nicht in Deutschland #super[4].
]

Wenn du ein Konto bei Dropbox hast, musst du Zupfnoter #strong[einmalig pro verwendetem Browser] mit diesem Dropbox-Konto verbinden:

-  klicke auf Schaltfläche "Einloggen" bzw. wähle das Menü "Dropbox \> Einloggen"

-  es erscheint der Zupfnoter - Dialog "Einloggen" - gib dort bitte ein Verzeichnis aus deiner Dropbox ein, in welcher du dein Musikstück speichern möchtest

  #blockquote[
  #blockquote[
  #blockquote[
  #image("../ZAUX_Images/030-041_Dropbox-step-01.jpg") 
  ]
  ]
  ]

-  klicke dann auf "OK"

-  Um das Anmeldefenster der Dropbox zu erreichen, muss Zupfnoter kurzeitig verlassen werden. Diesen Vorgang musst du bestätigen:

  #blockquote[
  #blockquote[
  #blockquote[
  #image("../ZAUX_Images/030-042_Dropbox-step-02.jpg") 
  ]
  ]
  ]

-  es erscheint das Anmeldefenster der #strong[Dropbox] falls du nicht schno bei Dropobox eingeloggt bist

-  gib dort Email-Adresse und Kennwort ein um dich bei Dropbox auszuweisen

  #blockquote[
  #blockquote[
  #blockquote[
  #image("../ZAUX_Images/030-043_Dropbox-step-03.jpg") 
  ]
  ]
  ]

-  Dropbox fragt nun nach deiner Zustimmung, dass Zupfnoter auf Dateien in deiner Dropbox zugreifen kann. Bitte bestätige das.

  #blockquote[
  #blockquote[
  #blockquote[
  #image("../ZAUX_Images/030-044_Dropbox-step-04.jpg") 
  ]
  ]
  ]

-  Dropbox kehrt nun zu Zupfnoter zurück. Zupfnoter ist nun mit der Dropbox verbunden.

-  Drücke nun im Zupfnoter auf "Speichern", (bzw. wähle das Menü "Dropbox \> Speichern" )um dein Musikstück und die Auszüge als PDF-Dateien in deiner Dropbox zu speichern.

  #blockquote[
  #strong[Hinweis]: Zupfnoter speichert in dem Verzeichnis, welches beim Einloggen angegeben wurde. Fall das Verzeichnis nicht existiert, wird es angelegt. Bitte achte auf also die richtige Schreibweise
  ]

Zupfnoter hat nun im Prinzip Zugriff alle Dateien in deiner Dropbox. Zupfnoter verwendet jedoch nur folgende Dateitypen in deiner Dropbox:

-  schreibt "abc", "pdf", "html"\"
-  liest "abc"

#blockquote[
#strong[Hinweis zur Sicherheit] z.B. bei Verwendung fremder Computer (z.B. im Internet-Cafe):

-  Solange du mit deinem Browser bei Dropbox angemeldet bist, hat der Browser Zugriff auf alle deine Dateien#super[5]. Daher musst du dich in #strong[unbedingt in #emph[allen] Browser-Fenstern von der Dropbox] abmelden, wenn du an einem fremden Computer arbeitest.

  Es ist auf jeden Fall sinnvoll, an fremden Computern im "inkognito - Modus" des Browsers zu arbeiten.

-  Dropbox-Anwendungen speichern ein geheime Zeichenkette (auch "Accesstoken" genannt) auf deinem lokalen Rechner. Wenn du vermutest, das dieses Token kompromittiert wurde, kannst du auf der Website von Dropbox die Verbindung zu Zupfnoter löschen. Dadurch wird bei der nächsten Anmeldung ein neues Token erzeugt.

  Gehe dazu auf #link("https://www.dropbox.com/account#security")[https://www.dropbox.com/account\#security]. Dort kannst du sehen, welche Anwendungen bzw. welche Sitzungen mit deiner Dropbox verbunden sind. Diese kannst du hier auch löschen.

-  Dropbox sendet dir eine E-Mail, wenn immer du eine Anwendung mit deiner Dropbox verbindest.

-  Im Menu "Dropbox \> Ausloggen" kannst du Zupfnoter von deiner Dropbox trennen. Das Accesstoken wird dabei auch bei Dropbox gelöscht. Du musst dich ggf. neu anmelden um wieder mit Dropbox arbeiten zu können.
]

== Musikstück aus Dropbox laden
#label("musikstück-aus-dropbox-laden")
Um das Musikstück wieder zu laden, klicke auf "Öffnen" bzw. wähle das Menü "Dropbox \> Öffnen". Es erscheint ein Datei-Auswahl-Dialog von Dropbox. Dort ist oben ein Suchfeld. Dort kannst du einen Teil des Dateinamens eingeben, um die gewünschte Datei zu suchen.

#blockquote[
#strong[Hinweis]: Wenn du im Suchfeld die Zeichenkette "abc" voanstellst, dann werden nur noch ABC-Datien angezeigt. Wenn du zum Beispiel im Suchfeld eingibst: `abc ent`, dann werden alle Dateien gesucht, in deren Namen die Worte 'abc' vorkomment und mit 'ent' beginnen
]

#blockquote[
#blockquote[
#blockquote[
#image("../ZAUX_Images/030-045_Dropbox-step-05.jpg") 
]
]
]

#blockquote[
#strong[Hinweis]: Zupfnoter loggt sich in das Verzeichnis der zuletzt geöffneten Datei ein. Du kannst am unteren Rand vo Zupfnoter sehen, in welches Dropbox-Verzeichnis Zupfnoter speichert.
]

== Musikstück importieren
#label("musikstück-importieren")
Falls du schon ein anderes Musikprogramm verwendest (z.B. Musescore #link("https://www.musescore.com")) kannst du deine Musikstücke in den Zupfnoter importieren, wenn dein anderes Musikprogramm das Dateiformat "MusicXml" (#link("https://www.musicxml.com/de/")) exportieren kann.

Es gibt auch Webseiten, die frei zugängliche Musikstücke in den Dateiformaten "MusicXML (.xml)" oder "ABC-Notation (.abc)" zum Download anbieten#super[6].

#blockquote[
#strong[Hinweis] MuseScore ist sowohl der Name eines Musikprogrammes als auch er Name einer Website, welche Musikstücke zum Downlaod anbietet. Du kannst hier auch die "komprimierten XML-Dateien" mit der Endung ".mxl" verwenden.
]

Um ABC oder MusicXML zu importieren, kannst du einfach die Datei aus deinem Rechner (Windows: Datei-Explorer oder Mac: Finder) in den Zupfnoter ziehen. Zupfnoter übersetzt dann das XML-Format in Abc Notation.

Bei der Auswahl eines Musikstückes im xml-Format sollte man 30 Takte nicht überschreiten. Am besten eignen sich Klaviernoten für den Import. Ausserdem sollte man auf die Bandbreite der Noten achten, die Tisch-Harfen mit 25 Saiten haben einen Tonumfang von zwei Oktaven (G bis g).

In der Regel ist etwas Nacharbeit erforderlich, um das importierte Musikstück für die Tischharfe anzupassen.

#blockquote[
#strong[Hinweis]: bitte achte darauf, dass du die Zeile "F:" ggf. von Hand hinzufügst, damit Zupfnoter den Dateinamen kennt unter welchem er das Musikstück speichern soll.
]

= Zupfnoter - Übersicht für Einsteiger und Experten
#label("zupfnoter---übersicht-für-einsteiger-und-experten")
Zum Verständnis von Zupfnoter sind folgende Themen wichtig:

-  #link("#zupfnoter-prinzipien")[Zupfnoter-Prinzipien] (Kapitel )
-  #link("#elemente-der-von-zupfnoter-erstellten-unterlegnoten")[Elemente der von Zupfnoter erstellten Unterlegnoten] (Kapitel )
-  #link("#genereller-bildschirmaufbau")[Bildschimaufbau] (Kapitel )
-  #link("#auszuege")[Erstellung von Auszügen] (Kapitel )

== Zupfnoter Prinzipien
#label("zupfnoter-prinzipien")
Zupfnoter arbeitet nach dem Prinzip der Umwandlung von ABC-Notation in Unterlegnoten. Im Gegensatz zu so genanten "what you see is what you get" - Systemen werden also die Unterlegnoten nicht direkt bearbeiter, sondern entstehen automatisch durch Umwandlung aus einem Modell des Musikstückes.

Dieses Modell ist allgemeiner und präziser als die Unterlegnoten und basiert auf der ABC-Notation als ein de-facto Standard. Wie du siehst kann aus diesem Modell (der ABC-Notation) ja auch ein herkömmliches Notenblatt erstellt werden. In diesem Sinne sind die Unterlegnoten lediglich eine von mehreren grafischen Darstellungen des Musikstückes.

Andererseits gibt es im Gengensatz zur den herkömmlichen Noten in den Unterlegnoten spezifische Sachverhalte, deren Darstellung in der ABC-Notation nicht standardisiert sind. Daher verwendet Zupfnoter zusätzlich zwei spezifische Darstellungen (Konventionen) innerhalb der ABC-Notation:

-  #strong[Zusätze] zu Noten und Taktstrichen: Hier werden die "Annotations" der ABC-Notation mit spezifischen Formaten verwendet. Diese Zusätze stehen vor der Note bzw. dem Taktstrich auf den sie sich beziehen.

  Für die Erstellung und Bearbeitung dieser "Zusätze" gibt es eine grafische Benutzerführung durch Bildschirmmasken (Siehe Kapitel  #link("#masken-fuer-zusaetze")[Zusätze]).

-  #strong[Konfiguration] der Unterlegnoten: Zupfnoter gewinnt seine Leistungsfähigkeit und Flexibilität durch vielfältige Einstellmöglichkeiten - genannt Konfigurationsparameter. Diese Konfigurationsparameter wirken auf die Erstellung der Unterlegnotenblätter und steuern z.B:

  -  Stimmen, die ausgegeben werden; Stimmen durch Synchronisationslinien verbunden werden usw.
  -  Größe von Notenelementen, Liniendicken
  -  Beschriftungen

  Die Konfigurationsparameter sind thematisch hierarchisiert (z.B. `extract.0.layout` `extract.0.printer`). Eine Referenz und Erläuterung zu den Konfigurationsparametern findst du in #link("#konfiguration")[Konfiguration].

  Für die Bearbeitung der Konfigurationsmparameter gibt es Bildschirmmasken (siehe Kapitel  #link("#konfigurationsmasken")[Konfigurationsmasken])

  Zupfnoter speichert die Konfigurationsparameter im so genannten JSON-Format in einem Abschnitt nach der ABC-Notation, der durch

  `%%%%zupfnoter.config`

  abgesetzt ist.

#figure([#image("../ZAUX_images/3015_reference_sheet_doc_a3.pdf")],
  caption: [
    Zupfnoter Elemente
  ]
)

== Elemente der von Zupfnoter erstellten Unterlegnoten
#label("elemente-der-von-zupfnoter-erstellten-unterlegnoten")
Das Bild auf der vorigen Seite zeigt die Elemente und Merkmale aus denen Zupfnoter ein Unterlegnotenblatt aufbaut. In den nachfolgenden Unterkapiteln werden die einzelnen Elemente und Merkmale dieser Darstellung erläutert. Als Referenz dient die Nummer in dieser Abbildung.

Bei manchen Elementen ist auch eine Konfiguration notwendig. Die nachfolgende Beschreibung enthält auch einen verweise auf den (internen) Namen des entsprechenden Kongigurationsparameters.

#blockquote[
#strong[Hinweis]: In dieser Darstellung sind die englischen Begriffe aufgelistet. Für diese Auflistung wurde die Funktion "Liedtexte" verwendet.
]

=== Darstellung der Noten
#label("darstellung-der-noten")
In der ABC-Notation wird in den Kopfzeilen ein Standardnotenwert angegeben, z.B. `L:1/4`. Dies bedeutet, daß standardmäßig in Viertelnoten erfasst wird. Ausgehend von diesem Wert ergibt sich der Notenwert durch Multiplikation mit der angegebenen Länge. Diese Längenangaben wird an den Notennamen angehängt.

TODO: verweise auf ABC-Kapitel

Im Folgenden wird von #strong[Vierteln als Standardnotenwert] und dem Notennamen #strong[`C`] ausgegangen.

-  #strong[(1) full note - ganze Note] entspricht in ABC-Notation: `C4`

-  #strong[(2) half note - halbe Note] entspricht in ABC-Notation: `C2`

-  #strong[(3) quarter note - viertel Note] entspricht in ABC-Notation: `C` oder `C1`

-  #strong[(4) eighth note - achtel Note] entspricht in ABC-Notation: `C1/2` oder `C/`

-  #strong[(5) sixteenth note - sechzehntel Note] entspricht in ABC-Notation: `C1/4` oder `C//`

-  #strong[(6) punctuated half note - punktierte halbe Note] entspricht in ABC-Notation: `C3`

-  #strong[(7) punctuated quarter note - punktierte viertel Note] entspricht in ABC-Notation: `C3/2` (also drei halbe Viertel :-)

=== Darstellung von Pausen
#label("darstellung-von-pausen")
Im Folgenden wird von #strong[Vierteln als Standardnotenwert] ausgegangen.

-  #strong[(11) full rest - ganze Pause] entspricht in ABC-Notation: `z4`

-  #strong[(12) half rest - halbe Pause] entspricht in ABC-Notation: `z2`

-  #strong[(13) quarter rest- viertel Pause] entspricht in ABC-Notation: `z` oder `z1`

-  #strong[(14) eighth rest - achtel Pause] entspricht in ABC-Notation: `z1/2` oder `z/`

-  #strong[(15) sixteenth rest - sechzehntel Pause] entspricht in ABC-Notation: `z1/4` oder `z//`

-  #strong[(16) punctuated half rest - punktierte halbe Pause] entspricht in ABC-Notation: `z3`

-  #strong[(17) punctuated quarter rest - punktierte viertel Pause] entspricht in ABC-Notation: `z3/2` (also drei halbe Viertel :-)

=== Darstellung notenbezogener Elemente
#label("darstellung-notenbezogener-elemente")
Um auf den Unterlegnoten einzelnen Noten graphische Elemente oder Texte hinzuzufügen gibt es bei Zupfnoter Elemente, die fest mit Noten verbunden sind. Da sie im Kontext von Noten positioniert werden, nennt man sie "notenbezogene Elemente":

-  #strong[(20) measure bar - Taktstrich]: Der Taktstrich entsteht aus der Takteingabe in der ABC-Notation (z.B. `|` `|]`). Zur Eingabe dieser Sonderzeichen siehe Kapitel  #link("#dein-erstes-musikstueck-eingeben")[Tastenkombinationen für Sonderzeichen]

-  #strong[(21) unison - Mehrklang]: \
  Ein Mehrklang entsteht, wenn in der ABC-Notation mehrere Noten in einer eckigen Klammer eingegeben werden (z.B. `[FA]`). Damit kann man innerhalb #strong[einer] Stimme mehrere Noten spielen.

  Die Noten eines Mehrklanges werden automatisch mit einer Synchronisationslinie verbunden.

  #blockquote[
  #strong[Hinweis]: Dieser Mehrklang sieht in den Unterlegnoten nahezu gleich wie der Zusammenklang von Tönen aus mehreren Stimmen aus. Man kann sie jedoch anhand der Flußlinie unterscheiden und den jeweiligen Stimmen zuordnen.

  #strong[Hinweis]: Die Angabe von Akkordsymbolen in der ABC-Notation wird für die Unterlegnoten ignoriert.
  ]

  Meist ist es so, dass bei Mehrklängen die höchste Note die Melodieführung übernimmt. Daher wird bei einem Mehrklang die Flußlinie and die letzte Note geführt.

  #blockquote[
  #strong[Hinweis]: Wenn man das anders haben möchte, muss man die Reihenfolge der Noten in der ABC-Notation verändern oder doe "Führungsnote" als letzte Note wiederholen. Beispiel:

  -  `[CEG]` - Die Flußlinie geht an `G`
  -  `[GEC]` - Die Flußlinie geht an `C`
  -  `[CEGC]` - Die Flußlinie geht an `C`
  ]

-  #strong[(22) triplet - Triole]: Bei einer Triole werden drei Noten auf zwei Schläge verteilt. Bei einer Triole werden Anfang und Ende einer Reihe von Noten mit einem Bogen verbunden. Die Länge der Triole wird an den Bogen geschrieben. Eine Verallgemeinerung der Triole ist das Tuplet. Dieses verteilt n Noten auf m Schläge. Zupfnoter kann beliebige Tuplets, auch wenn bei Tischharfen meistens nur Triolen verwendet werden.

  Ein Tuplet entsteht, wenn in der ABC-Notation den Noten der Tuplets eine Klammer mit der Länge des Tuplets vorangestellt wird, z.B: "`(3CCC`".

-  #strong[(23) tie - Haltebogen]: Ein Haltebogen verbindet zwei Noten gleicher Höhe miteinander. Dabei wird nur die erste Noten angeschlagen. Ein Haltebogen entsteht, wenn in der ABC-Notation die Noten durch einen Bindestrich verbunden sind, z.B. "`A -|A`".

  #blockquote[
  #strong[Hinweis]: Der Haltebogen ist zu unterscheiden vom Bindebogen, welcher in der Notenansicht gleich aussieht, in den Unterlegnoten jedoch nicht ausgegeben wird, da man ihn auf der Tischharfe nicht spielen kann. Der Bindebogen wird in der ABC-Notation durch Einklammern der Noten erstellt, z.B. "`(A|A)`".
  ]

-  #strong[(24) repeat signs - Wiederholungszeichen]: Eine Wiederholung entsteht durch Beifügen eines Doppelpunktes an die Taktstriche in der ABC-Notation, z.B. "`|: C4 :|`".

  #blockquote[
  #strong[Hinweis] Wiederholungszeichen sind eine Alternative zu Sprunglinien. Ihre Ausgabe hängt von der aktuellen Konfiguration ab (siehe Kapitel  #link("#extract.0.repeatsigns")[`repeatsigns`]).
  ]

-  (25), (26) siehe nächster Abschnitt

-  #strong[(27) part note - Bezeichnung von Abschnitten im Musikstück]: Man kann ein Musikstück in Abschnitte aufteilen. Die Abschnitte können bezeichnet werden, z.B. als "Teil 1". Der Abschnitt unterbricht auch die Flusslinien. Dieses Element wird häufig genutzt, um Abfolgen von Abschnitten beim Spielen festzulegen.

  Ein Abschnitt entsteht, wenn in der ABC-Notation der ersten Note des neuen Abschnittes z.B. die Zeichenfolge "`[P:Teil 1]`" vorangestellt wird. Hier ist "Teil 1" die Bezeichnung des Abschnitts.

  #blockquote[
  #strong[Hinweis:] Die Aufteilung in Abschnitte gilt für das gesamte Musikstück. daher muss die Bezeichnung von Abschnitten in der #strong[ersten Stimme] erfolgen. Sie wirkt dann auf alle Stimmen. Abschnittsbezeichnungen in den folgenden Stimmen werden ignoriert.
  ]

-  #strong[(28) countnotes - Zählhilfen]: Zupfnoter kann die Noten automatisch mit Zählhilfen beschriften. Die Zählweise ergibt sich aus der Taktangabe. Beispiel siehe Abbildung \[Zupfnoter Elemente\]. Diese Ausgabe (für welche Stimmen, Position) ist konfigurationsabhängig (`extract.0.countnotes`).

  #blockquote[
  #strong[Hinweis] die Zählhilfen sind so gesataltet, dass man während des Spiels die Zeitachse durchzählt. Bei Noten mit mehreren Schlägen beginnt die Zählhilfe immer mit der Nummer des ersten Schlages (z.B. 2-3 ist eine Note, die bei Schlag 2 beginnt und zwei Schläge lang gespielt wird, d.h. während diese Note klingt, zählt man 2 - 3)
  ]

-  #strong[(29) barnumbers - Taktnummer]: Zupfnoter kann die Takte automatisch durchnummerieren. Damit kann bei gemeinsamem Spiel auch mitten im Musikstück wieder eingesetzt werden. Diese Ausgabe ist konfigurationsabhängig (`extract.0.barnumbers`.

-  #strong[(30) decoration - Dekoration]: Zupfnoter kann einzelne Dekorationen (Stand Version 1.5 nur die Fermate) darstellen. Für diese Dekorationen werden die Eingaben der ABC-Notation verwendet (z.B. für die Fermate : "`!fermata!`" oder "`H`").

=== Darstellung von Verbindungslinien
#label("darstellung-von-verbindungslinien")
Um auf den Unterlegenoten die Zusammenhänge zwischen Noten darzustellen, gibt es folgende Elemente:

-  #strong[(25) jumpline for repeat - Sprunglinie für Wiederholungen]: Eine Wiederholung entsteht durch Beifügen eines Doppelpunktes an die Taktstriche in der ABC-Notation z.B. "`|: C4 :|`".

  #blockquote[
  #strong[Hinweis] Wiederholungszeichen sind eine Alternative zu Sprunglinien. Ihre Ausgabe hängt von der aktuellen Konfiguration ab (siehe Kapitel  #link("#extract.0.repeatsigns")[`extract.0.repeatsigns`]).
  ]

-  #strong[(26) synchline for unison - Synchronisationslinie für Mehrklang]: siehe (21) in Kapitel  #link("#darstellung-notenbezogener-elemente")[Darstellung notenbezogener Elemente]

-  #strong[(31) flowline - Flusslinie]: Die Flußlinie#super[7] verbindet die Noten #strong[einer] Stimme und markiert so die Führung innerhalb dieser #strong[einen] Stimme. Standardmäßig stellt Zupfnoter die Flußlinie in der ersten und dritten Stimme dar.

  Die Ausgabe von Flusslinien für die einzelnen Stimmen hängt von der aktuellen Konfiguration (siehe Kapitel  #link("#extract.0.flowlines")[extract.0.flowlines]) ab.

-  #strong[(32) synchline - Synchronisationslinie]: Die Synchronisationslinien verbinden Noten aus zwei #strong[verschiedenen Stimmen], die zum gleichen Zeitöpunt gespielt werden. Standardmäßig stellt Zupfnoter die Synchronisationslinie zwischen den Stimmen #emph[eins und zwei] sowie #emph[drei und vier] dar.

  Die Ausgabe von Synchronisationslinien für die einzelnen Stimmen hängt von der aktuellen Konfiguration (siehe Kapitel  #link("#extract.0.synchlines")[extract.0.synchlines]) ab.

-  #strong[(33) subflowline - Unterflusslinie]: Die Unterflusslinie verbindet innerhalb einer Stimme ohne Flußlinie diejenigen Noten, die nicht über eine Synchronisationslinie (32) mit einer anderen Stimme verbunden sind.

  Die Ausgabe von Unterlusslinien für die einzelnen Stimmen hängt von der aktuellen Konfiguration (siehe Kapitel  #link("#extract.0.subflowlines")[extract.0.subflowlines]) ab.

-  (34), (35), (36) siehe Kapitel  #link("#elemente-fuer-das-ganze-blatt")[Elemente für das gesamte Musikstück]

-  #strong[(50) variant ending - variante Enden - Volten]: Wo mehrfach gespielte Abschnitte unterschiedlich enden, bezeichnet man das als variante Enden. In der ABC-Notation schreibt man hierfür Ziffern (z.B. 1 und 2) unmittelbar hinter den Taktstrich bei dem die Variation beginnt.

  Zupfnoter stellt diese varianten Enden als eine Menge von Sprunglinien dar:

  -  #strong[(51) Eingangslinie] (im Beispiel links): Es gibt pro Variation eine Linie, welche zum Anfang der Variation führt

  -  #strong[(52) Ausgangslinie] (im Beispiel rechts): Es gibt pro Variation eine Ausgangslinie, welche zur nächsten Note nach der letzten Variation führt.

    #blockquote[
    #strong[Hinweis]: Wenn die Varianten am Ende einer Wiederholung stehen, entfällt die Ausgangslinie. Stattdessen wird eine normale #strong[(25) Sprunglinie für Wiederholung] verwendet. Die Positionsangabe der Ausgangslinie wird in diesem Fall ignoriert und die Positionsangabe der Sprunglinie am Ende der Wiederholung verwendet.
    ]

  -  #strong[(53) Folgelinie] ist die Ausgangslinie der letzten Variation. Diese kann separat positioniert werden, um das gewünschte Notenbild zu erreichen.

  Die Positionen dieser Linien werden als Zusatz vor den Taktstrich der ersten Variation geschrieben (Schaltfläche "Zusatz einfügen" bzw. "Zusatz bearbeiten").

  #blockquote[
  #strong[Hinweis:] Ab Zupfnoter 1.7 können diese Linien mit der Maus verschoben werden. Diese Verschiebungen werden in der Konfiguration gespeichert und von älteren Zupfnoter-Versionen nicht verarbeitet. Die Konfiguration über Zusätze ist aus Kompatibilitätsgründen noch vorhanden.
  ]

  #blockquote[
  #strong[Hinweis:] Zupfnoter stellt die Noten der verschiedenen Variationen in unterschiedlichen Grautönen dar. Die Farben können in der Konfigurationsmaske `Layout` über eine Schnelleinstellung ausgewählt werden (siehe Konfiguration #link("#extract.0.layout.color")[extract.x.layout.color]).
  ]

=== Elemente für das gesamte Musikstück bzw. Unterlegnotenblatt
#label("elemente-fuer-das-ganze-blatt")
Um auf den Unterlegnoten Texte und Beschriftungen allgemeiner Art darstellen zu können, gibt es folgende Elemente:

-  #strong[(34) legend - Legende]: Die Legende enthält die grundsätzlichen Informationen über das Musikstück. Die Inhalte der Legende werden aus den Kopfzeilen der ABC-Notation übernommen:

  -  Titel des Musikstücks (ABC-Notation Zeile "`T:`")
  -  Titel des Auszugs siehe (35)
  -  Autoren des Musikstücks bzw. Liedes (ABC-Notation Zeile "`C:`")
  -  Takt des Musikstücks (ABC-Notation Zeile "`M:`")
  -  Empfohlene Geschwindigkeit (ABC-Notation Zeile "`Q:`")
  -  Tonart des Musikstücks (ABC-Notation Zeile "`K:`")
  -  Tonart der Druckausgaben falls das Musikstück transponiert wurde

  Die Legende kann mit der Maus im rechten unteren Fenster auf den Unterlegnoten optimal positioniert werden.

-  #strong[(35) extract title in legend - Titel des Auszugs]: Dies bezeichnet den Titel des Auszuges (siehe Konfiguration #link("#extract.0.title")[extract.x.title] bzw. Kapitel  #link("#auszuege")[Auszüge]).

-  #strong[(36) lyrics - Liedtexte]: Zupfnoter stellt auch Liedtexte dar. Diese Liedtexte (siehe auch Kapitel ) werden aus aufeinander folgenden Kopfzeilen der ABC-Notation entnommen (`W:`) und zu Strophen zusammengefügt. Einzelne Strophen trennt man mit einer "Leerzeile" ("`W:`")

  ```
  W: Strophe 1 Zeile 1
  W: Strophe 1 Zeile 2
  W:
  W: Strophe 2 Zeile 1
  W: Strophe 2 Zeile 2
  ```

  #blockquote[
  #strong[Hinweis]: Die Ausgabe der Strophen muß über die Konfiguration eingestellt werden (siehe Kapitel  #link("#extract.0.lyrics")[extract.x.lyrics]).
  ]

  #blockquote[
  #strong[Hinweis]: In der ABC-Notation kann man Liedtexte mit sowohl mit Kopfzeile `W:`(Großbuchstaben) als auch mit Kopfzeile `w:` (Kleinbuchstaben) eingeben. Die Variante mit Kleinbuchstaben wird verwendet, um die Liedtexte direkt in die Notensysteme zu schreiben. Zupfnoter ignoriert diese Liedtexte in den Notenlinien
  ]

  #blockquote[
  #strong[Hinweis]: Auch wenn die ABC-Notation es erlaubt, die Kopfzeilen `W:` im ganzen ABC-Text zu verteilen ist es wichtig, die Liedtexte dennoch in einem Block zusammenzufassen. Sonst meldet Zupfnoter, dass es mehrere Liedtexte gibt. Der Editor fasst sie alle zusammen, löscht aber die anderen Blöcke nicht. Das muss manuell korrigiert werden.
  ]

  #blockquote[
  #strong[Hinweis]: Zupfnoter ignoriert Leerzeichen am Anfang von Liedtexten. Manchmal möchte man aber den Liedtext in bestimmten Zeilen etwas einrücken um den Text um eine Note im Unterlegnotenblatt herumfließen zu lassen. Wenn also eine Textzeile mit einer Reihe Tilde (`~`) - Zeichen beginnt, werden diese in den Unterlegnoten als Leerraum ausgegeben und so der Textbeginn nach rechts verschoben.
  ]

  ```
          W: Strophe 1 Zeile 1
          W: ~Strophe 1 Zeile 2
          W: ~~Strophe 1 Zeile 2
          W: ~~~Strophe 1 Zeile 2
  ```

=== Elemente zur Handhabung des Unterlegnotenblattes
#label("elemente-zur-handhabung-des-unterlegnotenblattes")
Zupfnoter druckt Elemente auf das Unterlegnotenblatt, um das Zuschneiden und das Einelgen in das Instrument zu vereinfachen:

-  #strong[(37) stringnames - Saitennamen]: Zupfnoter kann die Namen der Saiten auf den Unterlegnoten ausgeben.

  #blockquote[
  #strong[Hinweis]: Über die \[Einstellungen in der Konfiguration\] kann die Ausgabe von Saitennamen eingestellt werden (siehe Kapitel #link("#extract.0.stringnames")[extract.0.stringnames]).
  ]

  #blockquote[
  #strong[Hinweis]: Wenn einzelne Saiten nicht beschriftet werden sollen, kann als Saitenname eine Tilde (’~) angegeben werden. Diese erscheint dann als festes Leerzeichen.
  ]

-  #strong[(38) marks - Saitenmarke] Die Saitenmarken sind eine Hilfe zum korrekten Einlegen der Unterlegnoten in die Tischharfe. Das Blatt muss so in die Tischharfe eingelegt werden, dass die Marken unter den G-Saiten liegen.

  #blockquote[
  #strong[Hinweis:] Über die \[Einstellungen in der Konfiguration\] kann die Ausgabe der Saitenmarken beeinflusst werden (siehe Kapitel #link("#extract.0.stringnames.marks")[extract.0.stringnames.marks]).
  ]

-  #strong[(39) cutmarks - Schneidemarken]: Die Schneidemarken sind eine Zuschneidehilfe für den Fall, dass die Unterlegnoten auf DIN-A4 Seiten ausgegeben werden (Siehe Kapitel #link("#musikstueck-drucken")[Musikstück drucken]).

=== Elemente zur Organisation von Unterlegnoten
#label("elemente-zur-organisation-von-unterlegnoten")
-  #strong[(70) input filename - Name der Eingabedatei]: Der Name der Eingabedatei hilft, den Ursprung eines ausgedruckten Blattes nachzuvollziehen. Er wird immer auf den Unterlegnoten ausgegeben und kann nicht unterdrückt werden.

-  #strong[(71) creation note - Erstellungsnotiz]: Die Erstellungsnotiz gibt weitere Informationen zum technischen Stand der Erstellung. Diese wird immer auf den Unterlegnoten ausgegeben und kann nicht unterdrückt werden. Die Erstellungsnotiz hilft beim Nachvollziehen von Veränderungen und besteht aus

  -  Zeitpunkt der Erstellung der PDF-Datei (CEST steht für "#emph[C]entral #emph[E]uropean #emph[S]ummer #emph[T]ime")
  -  Software-Version von Zupfnoter
  -  Server von welchem der Zupfnoter geladen wurde

-  #strong[(72) reference to zupfnoter website - Referenz auf Zupfnoter Website]: Dies ist die Referenz auf Zupf- \
  noter als Werkzeug zur Erstellung des Unterlegnotenblattes, also Werbung in eigener Sache. Diese wird immer auf den Unterlegnoten ausgegeben und kann nicht unterdrückt werden.

-  #strong[(73) fingerprint - Fingerabdruck]: Diese Nummer ist wie ein Fingerabdruck der ABC-Datei. Dies bedeutet, dass Unterlegnoten (z.b. verschiedene Auszüge) mit dem selben Fingerabdruck auch aus einer identischen Quelle stammen und somit zuverlässig zusammen passen.

  #blockquote[
  #strong[Hinweis:] Der Fingerabdruck wird aus dem ABC-Text errechnet und ist daher nicht im ABC-Text enthalten.
  ]

=== Vordefinierte Seitenbeschriftungen
#label("vordefinierte-seitenbeschriftungen")
Zupfnoter bietet eine Reihe von Vorlagen für die Seitenbeschriftungen. Damit lässt sich ein einheitliches Vorgehen bei der Beschriftung der Unterlegnoten erreichen. Diese können in der Konfigurationsmaske "Seitenbeschriftung" eingegeben werden. Zupfnoter hat geeignete Vorgabewerte für die Position und Schriftart dieser Beschriftungen.

-  #strong[(34) T05 legend - Legende]: Hier kann eine Legende eingefügt werden, welche mal selbst gestalten kann.

  #blockquote[
  #strong[Hinweis:] Wenn dieser Eintrag vorhanden ist, wird die in Zupfnoter eingebaute Legende unterdrückt.

  Für eine eigenen Legende ist es sinnvoll mit Platzhaltern zu arbeiten. Die Schnelleinstellung in der Seitenbeschriftung fügt eine Legende ein, gleich aussieht wie die in Zupfnoter eingebaute version. Sie ist daher ein guter Startpunkt für eine selbst gestaltete Legende.
  ]

-  #strong[(74) T04 to order - zu beziehen bei]: Hier kann man angeben, über welche Adresse das Unterlegnotenblatt bezogen werden kann (Konfiguration siehe Kapitel #link("#presets.notes.T04_to_order")[presets.notes.T04\_to\_order]). Das ist natürlich nur sinnvoll, wenn es für die erstellen Unterlegnoten einen Vertriebsweg gibt.

-  #strong[(75) T02 Copryright music - Urheberrechte für das Stück]: Hier kann mam die Urheberrechte für das Musikstück angeben (Konfiguration siehe Kapitel #link("#presets.notes.T02_copyright_music")[presets.notes.T02\_copyright\_music]). Es wird empfohlen, diese Rechte immer anzugeben und den Satz "Privatkopie" hinzuzufügen, wenn mit dem Rechteinhaber keine Vereinbarung geschlossen wurde.

  #blockquote[
  #strong[Hinweis:] In diesem Fall darf das Unterlegnotenblatt natürliche auch nicht verteilt oder vertrieben werden, sondern wird nur zum persönlichen Gebrauch erstellt (sog. Privatkopie)
  ]

-  #strong[(76) T03 Coppyright harpnotes - Rechte am Notenbild]: Unabhängig von den Urheberrechten am Stück entsteht auch ein Urheberrecht an den erstellen Unterlegnoten. Hier kannst du diese Rechte beanspruchen (Konfiguration siehe Kapitel #link("#presets.notes.T03_copyright_harpnotes")[extract.0.synchlines]).

-  #strong[(77) T99 do not copy - Bitte nicht kopieren]: Diese Beschriftung soll den Blick dafür schärfen, das die erstellen Unterlegnoten nicht einfach wild kopiert werden dürfen, sondern die Urheberrechte zu bachten sind (Konfiguration siehe Kapitel #link("#presets.notes.T99_do_not_copy")[presets.notes.T99\_do\_not\_copy]).

-  #strong[(78) T01 Number - Nummer]: Hier kannst du eine Nummer angeben, welche das Unterlegnotenblatt eindeutig und schnell identifizierbar macht(Konfiguration siehe Kapitel #link("#presets.notes.T01_number")[presets.notes.T01\_number]). Im Grunde ist das wie eine Bestellnummer. Es wird empfohlen, die Nummer nach folgendem Schema zu gestalten:

  `XXX-999` darin ist

  -  `XXX` ist ein Kürzel für den Herausgeber, z.B. RBW für Ruth und Bernhard Weichel, ZNR - für Zupfnoter #super[8]

  -  `999` eine Nummer für das Blatt

  Z.B. ist dann `RBW-320` das Blatt 320 aus der Werkstatt von Ruth und Bernhard Weichel.

-  #strong[(79) T01 Number extract - Kürzel für den Auszug]: Hier kannst du ein Kürzel für den Auszug angebeen (Konfiguration siehe Kapitel #link("#presets.notes.T01_number_extract")[presets.notes.T01\_number\_extract])

=== Zusammenfassung der Beschriftungen in Zupfnoter
#label("zusammenfassung-der-beschriftungen-in-zupfnoter")
Zupfnoter hat vielfältige Möglichkeiten, das Beschriftungen einzufügen. Auf den Unterlegnoten sind diese nicht leider nicht immer zu unterscheiden. Daher wird hier noch einmal eine Zusammenfassung gegeben:

-  #strong[Standardbeschriftungen] (siehe Kapitel #link("#elemente-fuer-das-ganze-blatt")[Elemente für das gesamte Musikstück])

  Die Standardbeschriftung wird aus der Kopfzeilen der ABC-Notation entnommen, sie erscheint auch auf den herkömmlichen Noten.

-  #strong[Notenbeschriftung]

  Die Notenbeschriftung ist mit einer einzelnen Note verbunden und verschiebt sich ggf. wenn die Tonhöhe oder der Zeitbezug dieser Note verändert wird. Die Notenbeschriftung wird über einen "Zusatz" direkt in die ABC-Notation eingefügt (siehe Kapitel #link("#darstellung-notenbezogener-elemente")[Darstellung notenbezogener Elemente]).

  Für wiederkehrende Texte bzw. längere und mehrzeilige Texte in der Konfiguration eine Notenbeschriftungsvorlage (Kapitel #link("#annotations")[annotations] mit Positionsangabe anlegen und über einen Zusatz (Schaltfläche "Ref. Notenbeschriftung") daraus eine Notenbeschriftung erstellen.

  #blockquote[
  #strong[Hinweis]: Zupfnoter kennt standardmäßig die Notenbeschriftungsvorlagen `vl` `vt`, `vr`, `vb`, 'rit'. Damit kann man einfach ein "Abdämpfungszeichen" bzw. ein "Ritardando" anbringen. #super[9].
  ]

  Im Zusatz kann eine Position mit angegeben angegeben werden. Damit bleibt die Position der Notenbeschriftung erhalten, auch wenn der Zeitbezug der Note geändert wird.

  #blockquote[
  #strong[Hinweis] Wenn man die Notenbeschriftung mit der Maus verschiebt, wirkt nur noch diese Verschiebung und die Angabe im Zusatz wird ignoriert. Diese Verschiebung wird in der Konfiguration gespeichert und ist an die die Startzeit der Note gebunden, solange keine Verschiebemarke in der ABC-Notation eingefügt ist (\[extract.x.notebound.annotation.v\_{voice}.{time}\]).
  ]

-  #strong[Seitenbeschriftung]

  Die Seitenbeschriftungen werden ausschliesslich über die Konfiguration hinzugefügt (Kapitel #link("#extract.0.notes")[extract.x.notes]. Ihre Anordnung bezieht sich auf den Seitenrand. Der Schriftstil kann gewählt werden (siehe auch Kapitel #link("#elemente-fuer-das-ganze-blatt")[Elemente für das gesamte Musikstück]).

  #blockquote[
  #strong[Hinweis] In den Seitenbeschrifungen können Informationen eingefügt werden, welche in Zupfnoter schon vorhanden sind. Hierzu werden Platzhalter eingefügt, welche bei der Ausgabe durch die entsprechende Information ersetzt werden. Die möglichen Platzhalter findest du in der Hilfe zu den Parametern.
  ]

-  #strong[Liedtexte]

  Liedtexte werden in den `W:` - Zeilen in der ABC-Notation erfasst und über die Konfiguration (Kapitel #link("#templates.lyrics")[extract.x.lyrics.x]) auf dem Blatt positioniert.

  Für weitere Einzelheiten siehe auch Kapitel #link("#elemente-fuer-das-ganze-blatt")[Elemente für das ganze Blatt].

== Zupfnoter Bildschirmaufbau
#label("genereller-bildschirmaufbau")
Die Benutzungsoberfläche von Zupfnoter ist aus folgenden Elementen aufgebaut:

-  Fenster (Eingabe, Notenvorschau, Unterlegnotenvorschau) (Kapitel #link("#fensteraufbau")[Fensteraufbau]) mit mit Reitern, Werkzueugleisten und Kontextmenüs
-  Werkzeugleiste (Kapitel #link("#menues-im-hauptfenster")[Menüs im Hauptfenster])
-  Statusleiste (Kapitel #link("#statusleiste")[Statusleiste]

#image("../ZAUX_Images/040_030_Bildschirmaufbau.pdf") 

=== Fensteraufbau
#label("fensteraufbau")
Zupfnoter kennt drei Fenster#super[10]:

-  Das #strong[linken Fenster] zeigt die Eingabemöglichkeiten über drei Reiter (Kapitel #link("#eingabefenster-details")[Eingabe]):

  -  `ABC`- Der Texteditor für die ABC-Notation
  -  `Liedtexte` für die Erfassung der Liedtexte
  -  `Konfiguration` für die formulargeführte Bearbeitung der Zupfnoter-Konfiguration.

-  Im #strong[rechten oberen Fenster] (Kapitel #link("#notenvorschau")[Eingabe]) wird in der herkömmlichen Notenschrift das Musikstück gezeigt, und kann somit musikalisch überprüft wreden.

  Die Darstellung in herkömmlicher Notenschrift kann mehrstimmig erfolgen (gesteuert über die `%%score` - Anweisung in der ABC-Notation). Wenn das Musikstück Texte enthält (also ein Lied ist), werden diese Texte auch in der Notenvorschau angezeigt.

-  Im #strong[rechten unteren Fenster] werden die Unterlegnoten angezeigt. Diese entsprechen inhaltlich der herkömmlichen Notenschrift im rechten oberen Fenster (Kapitel #link("#unterlegnotenvorschau")[Eingabe]).

  Über die Reiter können verschiedene Zoom-Stufen eingestellt werden.

  #blockquote[
  #strong[Hinweis]: Da die Berechnung der Unterlegnoten einige Sekunden dauert, wird dieses Fenster nur durch `Rendern` aktualisiert.
  ]

Die Anordnung dieser Fenster ist in Zupfnoter fest vorgegeben. Man kann aber während der Arbeit folgende Einstellungen vornehmen, um den aktuellen Arbeitsschritt besser zu unterstützen:

-  Fenstergröße verstellen: Die Trennlinien zwischen den Fenstern können mit der Maus verschoben werden, um Platz für die aktuell wichtigen Elemente zu schaffen
-  Über das Menü #strong["`Ansicht`"] kann man einzelne Fenster ausblenden so dass die anderen Fenster größer werden (Siehe Kapitel #link("#menues-im-hauptfenster")[Werkzeugleiste für Schaltflächen und Menüs])

Innerhalb dieser Fenster gibt es weitere #strong[Bedienelemente]:

-  #strong[Reiter] zum Auswählen verschiedener Ansichten
-  #strong[Werkzeugleiste] Leiste für Schaltflächen und Menüs
-  #strong[Kontextmenü]: zur speziellen Bearbeitung von Elementen (erreichbar mit rechte Maustaste)

Über die drei festen Fenster hinaus gibt es #strong[Dialoge]. Das sind Fenster die aufscheinen, um bestimmte Informationen einzugeben bzw. zu ändern (z.B. Dialog im Kapitel #link("#dein-erstes-musikstueck-eingeben")[Dein erstes Musikstück eingeben]).

#blockquote[
#strong[Hinweis]: Der Begriff "Fenster" wird sowohl für die Fenster des Betriebssystems als auch die Fenster innerhalb Zupfnoter verwendet.
]

=== Werkzeugleiste für Schaltflächen und Menüs
#label("menues-im-hauptfenster")
Die Zupfnoter - Werkzeugleiste ist immer sichtbar (also auch in allen Ansichten) und erstreckt sich über aller Fenster. In ihr befinden sich Schaltflächen und Menüs die man während der Erstellung von Unterlegnoten benötigt. Nach einem Klick auf die Schaltflächen führt der Zupfnoter bestimmte Aktivitäten aus.

Einige Funktionen sind auch über Tastenkombinationen (Shortcuts) erreichbar (siehe Kapitel #link("#shortcuts")[Shortcuts])

#blockquote[
#strong[Hinweis]: Für die Version 1.5 wird die Bedienungsoberfläche von Zupfnoter verbessert. Daher sind die Informationen in diesem Kapitel vorläufig.
]

-  Schaltfläche #strong[Zupfnoter]: TODO: – Detailinfo als Popup darstellen

-  Schaltfläche #strong[Neu] (erstellen): Es wird ein leerer Bildschirm ohne Inhalte erstellt und man kann ein neues Musikstück erstellen (siehe Kapitel #link("#dein-erstes-musikstueck-eingeben")[Dein erstes Musikstück eingeben]).

-  Schaltfläche #strong[Einloggen]: TODO: - https://github.com/bwl21/zupfnoter/issues/75

  Über diese Schaltfläche kannst du das Speicherort in der Dropbox angeben, in die Zupfnoter dein Musikstück speichern soll.

  #blockquote[
  #strong[Hinweis:] Wenn du in dem Eingabefeld etwas eingibst, zeigt Dropbox passende Speicherorte an, die zu zuletzt verwendet hast.
  ]

  #blockquote[
  #strong[Hinweis:] Du kannst den Speicherort auch in der Statuszeile auswählen. Dort wird der aktuelle Speicherort angegeben. Rechts davon ist eine Menüknopf, der die zuletzt verwendeten Speicherorte aufrufbar macht.
  ]

-  Schaltfläche #strong[DL abc] (Download ABC): Hiermit kann man Zwischenstände oder fertige Musikstücke als ABC-Datei auf seinen Rechner herunterladen. Abgelegte Dateien können mit der Maus wieder in den Zupfnoter in den linken Abschnitt gezogen werden und der Inhalt steht zur Bearbeitung im Zupfnoter wieder zur Verfügung.

-  Schaltfläche #strong[Öffnen]: Es öffnet sich ein Dateiauswahlfenster deiner Dropbox. Dort kannst du eine Datei auswählen und zur Bearbeitung im Zupfnoter öffnen.

  #blockquote[
  #strong[Hinweis]: in der Statuszeile wird der Verbindungszustand zur Dropbox und auch das aktuelle Verzeichnis in der Dropbox angezeigt. "Not connected" bedeutet, das Zupfnoter nicht mit deiner Dropbox verbunden ist.
  ]

-  Schaltfläche #strong[Speichern] (sichern): Das fertig gestellte Musikstück wird in deiner Dropbox gespeichert. Es wird eine ABC-Datei, jeweils eine Datei für A3 und A4 für Unterlegnoten pro Auszug gespeichert.

  #blockquote[
  #strong[Hinweis:] Solange man noch nichts abgespeichert hat, erscheint das Wort "Speichern" in roter Schrift.
  ]

-  Menü #strong["`Drucken`"]: Damit kann man Druckvorschauen anzeigen, welche auch über die Browser-Funktionen gedruckt werden können (siehe Kapitel #link("#musikstueck-drucken")[Musikstück drucken]).

  -  Schaltfläche #strong[A3]: Es öffnet sich ein Browserfenster mit Unterlegnoten im A3-Querformat als pdf. Dies kann nun ausgedruckt werden oder auf dem PC als pdf-Datei abgespeichert werden.

  -  Schaltfläche #strong[A4]: Es öffnet sich ein Browserfenster mit Unterlegnoten im A4 Hochformat als pdf. Diese Datei enthält dann drei Seiten und kann nun ausgedruckt werden oder auf dem PC als pdf-Datei abgespeichert werden. Die Schnittmarken auf dem A4 Papier kennzeichnen, an welcher Stelle die drei A4-Blätter zusammen geklebt werden müssen.

  -  Schaltfläche #strong[Noten]: Es öffnet sich ein Browserfenster mit den herkömmlichen Noten. Dies ist eine HTML - Datei und muss daher über den Browser gedruckt werden. Du kannst diese auch abspeichern, aber auch dann muss sie über den Browser gedruckt werden.

    #blockquote[
    #strong[Hinweis]: Wenn du eine PDF - Datei davon haben möchtest, musst diese mit "Bordmitteln" deines PC erstellen. Du kannst auch eines der gängigen ABC-Programme verwenden (z.B. Easy-ABC) um die Noten zu drucken.
    ]

-  Menü #strong[Ansicht] (Ansicht): Hiermit kann man festlegen, wie der Bildschirmaufbau des Zupfnoter gestaltet sein soll. Einige Fesnter können so ausgeblendet werden, um mehr Platz für einzelne Fenster zu schaffen.

  -  Die Einstellung #strong[Alle Fenster] ist der Standardbildschirmaufbau mit allen drei Fenstern (Eingabe, herkömmliche Noten, Unterlegnoten). In dieser Einstellung wird meistens gearbeitet, weil man eine schnelle Rückmeldung zu den Ergebnissen hat.

  -  Die Einstellung #strong[Noteneingabe] zeigt das Eingabefenster (linkes Fenster) und die Notenvorschau (Fenster rechts oben). Diese Einstellung ist hilfreich, wenn man sich zunächst auf die reine Eingabe des Musikstücks konzentrieren will.

  -  Die Einstellung #strong[Harfeneingabe] zeigt das Eingabefenster (linkes Fenster) und die Harfennotenvorschau (Fenster rechts unten). Diese Einstellung ist hilfreich wenn das Musikstück komplett erfasst ist, und man das Layout der Unterlegnoten optimieren will.

  -  Mit der Einstellung #strong[Noten] sieht man nur die herkömmlichen Noten. Dies ist hilfreich zu Kontrolle des Musikstückes durch einen Lektor.

    #blockquote[
    #strong[Hinweis:] In dieser Ansicht werden die abgespielten Noten rot dargestellt.
    ]

  -  Mit der Einstellung #strong[Harfennoten] (Harfe) sieht man nur eine Vorschau der Unterlegnoten. Diese Einstellung ist hilfreich zur endgültigen Prüfung der erstellten Unterlegnoten z.B. durch einen Lektor.

    #blockquote[
    #strong[Hinweis:] Im Gegensatz zur Druckvorschau werden in dieser Ansicht die abgespielten Noten rot dargestellt.
    ]

-  Schaltfläche #strong[Auszug]: Hierüber wählt man den aktiven Auszug. Damit wird bestimmt,

  -  welcher Auszug in der Unterlegnotenvorschau dargestellt wird. Für Details zu Auszügen (siehe Kapitel #link("#auszuege")[Erstellung von Auszügen]).
  -  welcher Auszug in den Konfigurationsmasken bearbeitet wird (siehe Kapitel  #link("#konfigurationsmasken")[Konfigurationsmasken]).

  Es gibt standardmässig die Auszüge 0 bis 3. Der Auszug 0 beinhaltet alle Stimmen und wird automatisch vom Zupfnoter erstellt. Wenn man einen Auszug erstellen möchte, wählt man z.B. Auszug 1 aus und definiert im Abschnitt links, was man im Auszug 1 sehen möchte: z.B. 1.te und 2.te Stimme. Der Auszug 2 könnte dann z.B. zur Darstellung der 3.ten und 4.ten Stimme dienen.

  TODO: Überarbeiten nach Verbesserung der Bedienung von Auszügen.

-  Schaltfläche #strong[Rendern] (umwandeln): (alternativ Tastenkombination `cmd/ctrl - R` bzw. `cmd/ctrl - RETURN`.

  Mit Klick auf diese Schaltfläche werden die Ansicht der Unterlegnoten und die Fehlermeldungen im Texteditor des Eingabefensters aktualisiert.

  #blockquote[
  #strong[Hinweis:] Diese Funktion sollte häufig genutzt werden, um immer aktuelle Ergebnisse auf dem Bildschirm zu sehen.
  ]

-  Schaltfläche #strong[Play] (Wiedergabe) spielt das Musikstück ab. Damit kann man durch Anhören Fehler in den eingegebenen Noten erkennen. Die wiedergegebenen Noten werden wie folgt ausgewählt:

  -  wenn keine Noten selektiert sind, spielt Zupfnoter alle vorhandenen Stimmen. Damit kann man einen Eindruck des Gesamtklanges gewinnen.

    #blockquote[
    #strong[Hinweis:] Dabei wird mit einem Klavierklang gepsielt. Die Wiedergabe umfasst berücksichtigt auch Wiedrholungen und variante Enden.
    ]

  -  wenn eine einzelne Note selektiert ist, spielt Zupfnoter nur die Stimmen des aktuell eingestellten Auszugs. Damit kann man einen Eindruck gewinnen, wie das Stück klingt, wenn nur einzelne Stimmen kombiniert werden (z.B. nur Sopran und Alt).

    #blockquote[
    #strong[Hinweis:] Dabei wird mit einem Harfenähnlichen Klang gespielt. Die Wiedergabe läuft einfch durch, ohne Wiederholungen und vairante Enden.
    ]

  -  wenn mehrere Noten selektiert sind, spielt Zupfnoter nur genau die selektierten Noten. Damit kann man eine Detailkontrolle erreichen.

  #blockquote[
  #strong[Hinweis:] Bitte beachte:

  -  Zupfnoter spielt keine Wiederholungen und Sprünge, sondern nur die Noten von Anfang bis zum Ende.

  -  Zur Wiedergabe simuliert Zupfnoter einen Tischharfenspieler. Daher führt er bei Bedarf zunächst die Funktion "Rendern" aus, um die Unterlegnoten zu aktualisieren.

  -  Die Geschwindigkeit der Wiedergabe wird über die Kopfzeile "`Q:`" bestimmt.
  ]

-  Menü #strong[Hilfe] (Hilfe): Hier findet man hilfreiche Links und Anleitungen

  #blockquote[
  #strong[Hinweis]’: Über das Hilfe Menü kann man auch Beispiele aufrufen. Diese öffnen ein neues Zupfnoter-Fenster im Demo - Modus. In desem Modus kann man nicht speichern oder öffnen. Die entsprechenden Menüpunkte sind inaktiv.

  Der aktuelle Modus wird in der Statuszeile angezeigt.
  ]

=== Fenster links: Eingabe
#label("eingabefenster")
Das Eingabefenster enthält seinerseits

-  eine eigene Werkzeugleiste zu Ansteuerung von Bearbeitungsfunktionen
-  verschiedene Bearbeitungsansichten, welche über Karteireiter ausgewählt werden.

==== Werkzeugleiste des Eingabefensters
#label("werkzeugleiste-des-eingabefensters")
-  Menü #strong[Konfig. einfügen]

  Über dieses Menü kannst du Konfigurationsparameter (Einstellungen) zur Gestaltung der Unterlegnoten einfügen.

  #blockquote[
  #strong[Hinweis] über dieses Menü werden Konfigurationsparameter mit Standardwerten eingefügt. Das Menü ist auch dann verfügbar, wenn der Karteireiter "Konfiguration" aktiv ist. Damit können Parameter hinzugefügt werden, die in der Maske noch nicht dargestellt werden, da sie in der Konfiguration noch nicht vorhanden sind.

  Die Werte der eingefügten Parameter können dann über die Konfigurationsmasken oder im Texteditor geändert werden.
  ]

  Die Reihenfolge der Menüpunkte entspricht der Bearbeitungsabfolge, wobei Menüpunkte auch übersprungen werden dürfen. Die Erstellung der ABC-Notation sollte abgeschlossen sein, bevor man mit der Gestaltung der Unterlegnoten beginnt.

  Die Menüpunkte sind im Kapitel #link("#grundlegende-blatteinstellungen")[Grundlegende-Blatteinstellungen] beschrieben

  #blockquote[
  #strong[Hinweis]: Grundsätzlich sucht Zupfnoter für jeden Konfigurationsparameter einen Wert an folgenden Stellen:

  +  Der Wert im aktuellen Auszug bzw. im Musikstück (für Parameter die nicht pro Auszug gesetzt werden können)
  +  wenn der aktuelle Auszug keinen Wert enthält: der Wert im Auszug 0
  +  wenn auch der Auszug 0 keinen Wert enthält: der systeminterne Vorgabewert
  ]

-  Menü #strong[Konfig. bearbeiten]

  Über dieses Menü kannst du die Konfigurationsparameter bearbeiten. Dazu werden entprechende Bildschirmmasken aufgerufen. Weitere Informationen findest du im \
  Kapitel  #link("#konfigurationsmasken")[Konfigurationsmasken].

-  Menü #strong[Zusatz einfügen]

  Über dieses Menü können Zupfnoter-spezifische Zusätze an eine Note bzw. an einen Taktstrich eingefügt werden. Zupfnoter verwendet spezifische Zusätze, um z.B. die Position von Sprunglinien anzugeben oder notengebundene Anmerkungen zu erfassen. Diese Zusätze sind an eine Note bzw. an einen Taktstrich gebunden und werden in Form einer ABC-Anmerkung notiert (z.B.`"^@@3" :|` für die Lage einer Sprunglinie für eine Wiederholung).

  #blockquote[
  #strong[Hinweis]: Dieses Menü wird daher erst dann aktiv, wenn die Schreibmarke (Cursor) zwischen einem Leerzeichen und einer Note/bzw. einem Taktstrich steht. Man erkennt das auch in der Statusleiste links unten: dort sollte das Wort `editable.before` erscheinen, dann ist die Schaltfläche aktiv.

  Einzelne Unterpunkte des Menüs sind nur aktiv, wenn die Schreibmarke (Cursor) vor einer Note steht.
  ]

  Über das Menü können Fenster aufgerufen werden, um diese Zusätze einzufügen.

-  Schaltfläche #strong[Zusatz bearbeiten]

  Über diese Schaltfläche kann man die Bearbeitungsmasken für vorhandene Zusätze erneut aufrufen.

  #blockquote[
  #strong[Hinweis]: Diese Schaltfläche ist erst aktiv, wenn die Schreibmarke (Cursor) in einem solchen Zusatz steht. Man erkennt das auch in der Statusleiste links unten: dort sollte das Wort `editable` erscheinen, dann ist die Schaltfläche aktiv.
  ]

==== Bearbeitungsansichten des Eingabefensters
#label("bearbeitungsansichten-des-eingabefensters")
 

Über die Karteireiter kann man zwischen den verschiedenen Bearbeitungsansichten umschalten:

-  `ABC`: Texteditor zur Bearbeitung der ABC-Notation (siehe Kapitel  #link("#texteditor")[Texteditor])
-  `Liedtexte`: Texteditor zur Bearbietung der Liedtexte \
-  `Konfiguration`: Masken zur Bearbeitung der Konfigurationsparameterwerte (siehe Kapitel  #link("#konfigurationsmasken")[Konfigurationsmasken])

=== Fenster rechts oben: Notenvorschau
#label("notenvorschau")
Die Notenvorschau zeigt das Musikstück in herkömmlichen Noten an. Damit kann man sich bei der Erfassung auf die musikalischen Aspekte konzentrieren.

Wenn man auf Elemente in der Notenvorschau klickt, werden diese auch im Texteditor der Eingabe und in der Unterlegnotenvorschau hervorgehoben.

#blockquote[
#strong[Hinweis::] Wenn man zunächst eine Note anklickt, und dann mit gedrückter "Shift"-Taste ("Umschalttaste") eine zweite Note anklickt, dann werden die dazwischen liegenden Noten selektiert. Damit kannst du z.B. einen Ausschnitt aus einer bestimmten Stimme über die Notenvorschau auswählen und anschließend abspielen lassen.
]

=== Fenster rechts unten: Unterlegnotenvorschau
#label("unterlegnotenvorschau")
Die Unterlegnotenvorschau zeigt die erzeugten Unterlegnoten. Über den Reiter "Zoom" kann man die Anzeige vergrößern oder verkleinern.

Über die Scrollbalken kann man den angezeigten Ausschnitt wählen.

Durch Ziehen/Ablegen kann man Elemente auf dem Notenblatt verschieben. Wenn du die Maus über ein verschiebbares Element bewegst, wird der Mauszeiger zu einer "Hand". Das Ergebnis der Verschiebung wird in den entsprechenden Konfigurationsparametern abgespeichert.

Über ein Kontextmenü (klick mit rechter Maustaste) kannst du erweiterte Einstellungen vornehmen (Konfigurationsparameter setzen)

#blockquote[
#strong[Hinweis:] Die Konfigurationsparameter werden im Texteditor des Eingabebereiches abgelegt. Der Name der betroffenen Konfigurationsparameters erscheint rechts unten in der Statuszeile, wenn man mit der Maus über ein Element fährt.
]

=== Statusleiste am unteren Bildschirmrand
#label("statusleiste")
Am unteren Bildschirmrand gibt es eine Statusleiste mit folgenden Einträgen

-  Position der Schreibmarke im Editor
-  Bedeutung des Symbols links von der Schreibmarke (Syntax Token)
-  Speicherort in der Dropbox - Das ist ein Menü über welches du die letzten Pfade wieder aufrufen kannst, um schnell den Speicherort für deine Stücke auszuwählen.
-  Aktiver Filter für Meldungen in der Konsole (Loglevel). Das Filter kann über deen Eingebbefehl`loglevel error` in der Konsole umgestellt werden #super[11].
-  Aktueller Modus von Zupfnoter. Hier gibt es `work` und `demo`. im Demo-Modus sind einge Menüpunkte nicht aktiv.
-  Menü zur Auswahl der Papierformate beim Speichern
-  Menü zur Auswahl der Meldungen (Fehler / Warnung / Info) \
-  Menü zur Auswahl von Auto-Render \
-  Button zum Ein- Ausblenden der Konsole
-  Name des Konfigurationsparameters für das Element unter dem Mauszeiger falls dieses mit der Maus verschoben werden kann oder über das Kontext-Menü konfiguriert werden kann.

=== Konsole
#label("konsole-fenster")
Die Konsole ist nur sichtbar, wenn sie mit der Tastenkombination `cmd/ctrl-K` (bzw. durch klick auf den Button `>_` in der Statusleiste) eingeschaltet wurde. Sie stellt die letzten Meldungen von Zupfnoter dar. Experten können in der Konsole auch weitere Befehle eingeben, die Zupfnoter direkt steuern. Die möglichen Befehle kann man mit dem Befehl `help` in der Konsole anzeigen.

#blockquote[
#strong[Hinweis]: Die Zupfnoter-Menüs lösen letztendlich solche Konsolenbefehle aus. Daher werden selbst Experten diese Befehle in der Regel nicht brauchen.
]

#blockquote[
#strong[Hinweis]: Diese Funktionen können teilweise über das Menü `Extras` erreicht werden.
]

Andererseits gibt es gerade in der Konsole manche experimentelle Zusatzfunktion, die noch nicht an die grafische Oberfläche angeschlossen ist.

Folgende Befehle steuern, welche Files in der Dropbox gespeichert werden:

-  `saveformat A3` - Es werden nur die A3-Druckdateien gespeichert
-  `saveformat A4` - Es werden nur die A4-Druckdateien gespeichert
-  `saveformat A3-A4` - Es werden die A3 und A4-Druckdateien gespeichert

#blockquote[
#strong[Hinweis:] Diese Einstellung wird in der Statusleiste angezeigt. Duch klicken auf diese Anzeige kann die einstellung einfach geändert werden.
]

Folgende Befehle dienen zum Arbeiten mit voreingestellen Auszügen bzw. Beschriftungen

-  `setstdnotes`: kopiert dem aktuellen Stück die Konfiguration der Blattbeschriftungen usw um sie auf ein anderes Stück zu übertragen.

-  `stdnotes`: überträgt die zuletzt kopierte Konfiguration der Blattbeschriftungen auf das aktuelle Stück in den aktuellen Auszug.

-  `setstdextract`: kopiert aus dem aktuellen Stück die Konfiguration der Auszüge, um sie auf ein anderes Stück zu übertragen. \> #strong[Hinweis]: diese Anwweisung wird auch ausgeführt bei `settemplate`

-  `stdectract`: überträgt die zuletzt kopierte Konfiguration der Auszüge auf das aktuelle Stück

  #blockquote[
  #strong[Hinweis]: Diese Befehle sind hilfreich um schnell die Konfiguration eines aus MusicXml importierten Stückes einzustellen. 'stdextract' wird automatisch beim import aus MusicXml ausgeführt.
  ]

-  `settemplate`: Damit wird der aktuelle Editor-Inhalt als Vorlage hinterlegt (siehe Kapitel  #link("#filetemplates")[Arbeiten mit Dateivorlagen]).

Über folgende Befehle kann eingestellt werden, ob die Vorschaufenster zur aktuellen Note scrollen bzw. der Wiedergabe folgen

-  `setsetting autoscroll true` - Vorschaufenster scrollen automatisch
-  `setsetting autoscroll false` - Vorschaufenster scrollen nicht
-  `setsetting follow true` - Vorschaufenster folgen der Wiedergabe
-  `setsetting follow false` - Vorschaufenster folgen der Wiedergabe #strong[nicht mehr]

Weitere Laufzeiteinstellungen sind:

-  `setsetting watermark "text"` - Damit kann ein Text eingestellt werden, welcher über den Platzhalter `{{watermark}}` in die Seitenbeschriftung eingefügt werden kann. Damit kann man z.b. für ein bestimmtest Projekt Anmerkungen einfügen, ohne den ABC-Code zu ändern.

Über folgende Befehle können Flußlinien gestaltet werden:

-  `setsetting flowconf edit`: Mit dieser Einstellung werden die Flußlinien bearbeitbar, d.h. man kann die Flußlinien mit der Maus verformen, (sozusagen verbiegen).

-  `setsetting flowconf none`: Mit dieser Einstellung werden die Flußlinien nicht mehr bearbeitbar. Bearbeitete Flußlinien bleiben weiterhin "verbogen".

  #blockquote[
  #strong[Hinweis:] Wenn die Bearbeitung der Flußlinien eingeschaltet ist, wird Zupfnoter deutlich langsamer. Daher wird diese Einstellung beim Neuladen von Zupfnoter zurückgesetzt.
  ]

Selbst wenn Zupfnoter die Eingabe fehlerhafter Konfigurationsparameter eigentlich verhindern soll, so kann es trotzdem vorkommen. Wenn also schwer verständliche Meldungen erscheinen kann man eine erweiterte Prüfung der Konfigurationsparameter vornehmen:

-  `setsetting validate true`: Diese Einstellung bewirkt eine extra Prüfung/Validierung der Konfigurationsparameter.

-  `setsetting validate false`: Diese Einstellung beendet eine extra Prüfung/Validierung der Konfigurationsparameter.

-  `editconf errors`: Damit werden die fehlerhaften Konfigurationsparameter in den Konfigurationseditor geladen.

  #blockquote[
  #strong[Hinweis:] Diese Prüfungen sind noch nicht ausgereift und daher standardmässig ausgeschaltet. Auch zeigt der Editor noch nicht die Fehler noch nicht genau genug an.
  ]

Folgende Befehle sind für die Arbeit mit Dateivorlagen:

-  `editconf template`: Damit kann man die Eigenschaften für ein File-Template einstellen. Im Wesentlichen ist das der Dateiname.
-  `edittemplate`: Damit wird die aktuelle Dateivorlage zur Bearbeitung geladen ()

#blockquote[
#strong[Hinweis:] Weitere Informationen hierzu siehe #link("#filetemplates")[Arbeiten mit Dateivorlagen]
]

Weiterhin zeigt die Konsole einige Meldungen, die für die Fehleranalyse hilfreich sind. Insbesondere, wenn der "debug" - Modus eingestellt ist.

-  `loglevel debug` - schaltet ausführlichere Fehlermeldungen ein. Zupfnoter wird dadurch zwar deutlich langsammer, aber für den Zupfnoter-Entweickler sind die Ausgaben hilfreich um die Ursache von Problemen einzukreisen
-  `loglevel error` - Es werden nur noch schwerwiegende Fehler gemeldet. Das ist für die normale Anwendung ausreichend.
-  `loglevel warning` - Es werden Fehler und Warnungen gemeldet. In Einzelfällen kann man mit Warnungen leben. Ein Beispiel für eine Warnung ist die Meldung `Beschriftungen zu dicht beieinander`
-  `loglevel info` - Es werden Fehler, Warnungen und Informationsmeldungen angezeigt. Informationsmeldungen betreffen Versionsnummern und Laufzeitmessungen.

Die Konsole kann auch für eine bessere Fehlersuche in der Konfiguration verwendet werden. Selbst wenn Zupfnoter die Eingabe fehlerhafter Konfigurationsparameter eigentlich verhindern soll, so kann es trotzdem vorkommen. Wenn also schwer verständliche Meldungen erscheinen kann man den `loglevel debug` einschalten. Dann kann man in der Konsole mit

-  `editconf errors` - die fehlerhaften Konfigurationsparameter als Formular bearbeiten.

#blockquote[
#strong[Hinweis]: Diese Funktion ist noch experimentell (1.7). Wenn es sich bewährt, wird sie in in die Menüs integriert.
]

Eine Übersicht der Befehle für die Konsole gibt der Befehl

-  `help <thema>` - z.B. `help std` gibt aus

  ```
  stdnotes  : configure extract with template from localstore
  stdextract  : configure with template from localstore
  setstdnotes  : configure stdnotes in localstore
  setstdextract  : configure stdc onfig in localstore
  ```

Über folgende Befehle kann die Wiedergabe gesteuert werden.

-  `p ff` - Wiedergabe des aktuellen Auszuges ab der selektierte Note. Wenn keine Note selektiert ist, dann wirkt der Befehl wie `p all`

-  `p sel` - Wiedergabe der ausgewählten Noten

-  `p all` - Wiedergabe des kompletten Stückes mit alle Stimmen die im ABC code angelegt sind. Dabei werden Wiederholungen und varianten Enden ausgespielt. Mit dieser Funktion kan man sich einen Gesamteindruck verschaffen.

-  `p auto` - Wiedergabe

  -  ab der ausgewählten Note wie `p ff`
  -  der ausgewählten Noten wie `p sel` - falls mehrere Noten ausgewählt sind
  -  des kompletten Stückes wie `p all` - falls keine Note ausgewählt ist

`stop` - hält die Wiedergabe an

-  `speed {factor>}` - damit kann man die Wiedergabegeschwindigkeit verändern, ohne den ABC-Code ändern zu müssen.

  #blockquote[
  Hinweis: Die Einstellung bleibt über mehrere Abspielvorgänge erhalten. Sie kann auch währende des Abspielens verändert werden.

  Hinweis: um sicher mit der Einstellung aus dem ABC-Code abzuspielen sollte `speed 1` angegeben werden.
  ]

== Tastenkombinationen (Shortcuts)
#label("shortcuts")
Für eine flüssige Bedienung stellt Zupfnoter folgende Tastenkombinationen (Shortcuts) zur Verfügung:

-  'cmd + s': Speichern in der Dropbox
-  'cmd + k': Konsole anzeigen
-  'cmd + r': Rendern (aktualisieren der Unterlegnoten)
-  'cmd + p': Play (abspielen)
-  'cmd + l': Large - schaltet zwischen Ansicht "Harfennoten" hin und her. Gut für eine schnelle Kontrolle
-  'cmd + 0' .. cmd \# '9': Schalte auf Ansicht 0 .. 9

#blockquote[
#strong[Hinweis:] unter Windows / Linux entspricht "cmd" der "ctrl" oder "strg" - Taste
]

Im ABC-Editor gelten (nur die häufigsten Tasten …)

-  'cmd + z': letzte Eingabe rückgänig
-  'shift cmd + z': letzte Eingabe wiederholen
-  'cmd + f': Suchen
-  'cmd + shift + f': Suchen / Ersetzen

mehr unter #link("https://ace.c9.io/demo/keyboard_shortcuts.html")[https://ace.c9.io/demo/keyboard\_shortcuts.html] (das ist aber wirklich nur für die IT-Profis)

#blockquote[
#strong[Hinweis:] 'cmd + alt + f' bedeutet, dass die Tasten 'cmd', 'alt', 'f' gleichzeitig gedrückt werden.
]

== Eingabe
#label("eingabefenster-details")
Im Fenster "Eingabe", (linkes Fenster) kannst du folgende Eingabemöglichkeiten nutze:

-  `ABC`- Der Texteditor für die ABC-Notation sowie die Konfiguration der Unterlegnoten (im JSON-Format) angezeigt und bearbeitet (siehe Kapitel #link("#texteditor")[Texteditor]). Für die ABC-Notation gibt es eine separate Anleitung im Menü #strong[`Hilfe`]

-  `Liedtextexte` für die Erfassung der Liedtexte (siehe Kapitel #link("#liedtexteditor")[Liedtexteditor])

-  `Konfiguration` für die formulargeführte Bearbeitung der Zupfnoter-Konfiguration. Die hier gemachten Eingaben werden sofort in den Texteeditor zurückgeführt. Es gibt daher zwei Bearbeitungsmöglichkeiten für die Konfiguration.

  #blockquote[
  Hinweis: bei komplexen Konfigurationen kann diese Rückführung einige Sekunden dauern. Die formulargeführte Konfiguration ist jedoch reobuster als die direkte Bearbeitung im Texteditor, bietet integrierte Hilfe und Prüfungen.
  ]

=== Erfassung der ABC-Notation im Texteditor
#label("texteditor")
Im Texteditor kannst du die ABC-Notation bearbeiten. Darüberhinaus kannst du die Konfigurationsparameter sehen und ggf. direkt (d.h. ohne Bildschirmmasken) sehen und ggf. korrigieren (für Experten).

Im Texteditor kannst du die ABC-Notation erfassen. Elemente werden entsprechend ihrer Bedeutung farblich hervorgehoben (Syntax-Coloring). In der Statusleiste links unten zeigt Zupfnoter auch Hinweise über die Bedeutung des Elementes links von der aktuellen Schreibmarke an.

#blockquote[
#strong[Hinweis]: Diese Anzeige ist noch sehr technisch, in manchen Fällen aber dennoch hilfreich. Sie steuert z.B. die Verfügbarkeit der Schaltflächen für die Zusätze.
]

#blockquote[
#strong[Hinweis:] Veränderungen in der ABC-Notation wirken unterschiedlich auf die beiden anderen Fenster:

-  Die Notenvorschau wird unmittelbar aktualisiert
-  Die Unterlegnotenvorschau wird erst durch die Funktion `Rendern` aktualisiert
]

Der Texteditor ist mit den anderen Fenstern synchronisiert. Wenn man mit der Maus eine Note in der ABC-Notation selektiert, wechselt die Note in der herkömmlichen Notenschrift und in den Unterlegnoten von schwarz auf Rot. Umgekehrt funktioniert es genauso: wenn du auf eine Noten in einer der Vorschauen klickst, wird diese im Eingabebereich selektiert. So findest du schnell zu einer Stelle, die du ändern möchtest oder wo du etwas hinzufügen möchtest.

#blockquote[
#strong[Hinweis]: Wenn man zunächst eine Note, und dann mit gedrückter "Shift"-Taste eine zweite Note anklickt, dann werden die dazwischen liegenden Noten selektiert.
]

#blockquote[
#strong[Hinweis]: Das Ende der ABC-Notation wird mit einer Leerzeile eingeleitet. Sollte nach einer Leerzeile noch ABC-Notation folgen, wird dies von Zupfnoter ignoriert.
]

#blockquote[
#strong[Hinweis]: Auch wenn der Texteditor die Zusätze, die Liedtexte und die Konfigurationsparameter anzeigt ist es doch besser, die grafischen Barbeitungsmöglichkeiten zu nutzen:

-  (Kapitel #link("#liedtexteditor")[Masken für Zusätze])
-  (Kapitel #link("#masken-fuer-zusaetze")[Masken für Zusätze])
-  (Kapitel #link("#konfigurationsmasken")[Konfigurationsmasken])
]

==== Anzeige von Fehlern im Texteditor
#label("anzeige-von-fehlern-im-texteditor")
Zupfnoter zeigt im Texteditor über ein rotes Quadrat mit Kreuz links von den ABC-Notationszeilen oder den Zupfnoter-Einstellungen an, daß in der Zeile ein Fehler aufgetreten ist. Wenn man mit der Maus auf das rote Quadrat geht, wird die Fehlermeldung angezeigt, z.B. abc:12:11 Error:Bad character '2'.

#blockquote[
#blockquote[
#blockquote[
#image("../ZAUX_Images/040-080_texteditor-fehleranzeige.jpg") 
]
]
]

Das bedeutet in Zeile 12 an Stelle 11 ist das Zeichen '2' fehlerhaft ist. Im vorliegenden Fall ist ein Leerzeichen zwischen der Tonhöhe und dem Notenwert.

Es sollten alle Fehler beseitigt werden, ansonsten können unter Umständen keine herkömmlichen Noten oder Unterlegnoten generiert werden.

#blockquote[
#strong[Hinweis]: Die Position des Cursors (der Schreibmarke) wird im Format Zeile:Spalte (z.B. 12:11) ganz links in der Statusleiste angezeigt.
]

#blockquote[
#strong[Hinweis]: Die letzten Fehlermeldungen kann man in der Konsole (mit `cmd/ctrl - K`) sehen. Nach wichtigen Befehlen zeigt Zupfnoter auch ein Fenster mit den letzten Fehlermeldungen an.
]

==== Darstellung der Konfigurationsparameter im Texteditor
#label("darstellung-der-konfigurationsparameter-im-texteditor")
Nach der ABC-Notation kommen die Zupfnoter-Einstellungen. Diese werden durch den Kommentar

```
%%%%zupfnoter.config
```

von der ABC-Notation abgetrennt. Die ABC-Notation und die Zupfnoter-Einstellungen dürfen nicht gemischt werden.

Die Zupfnoter-Einstellungen sind in der ABC-Datei in einem standardisierten Textformat abgelegt, welches leicht lesbar und mit etwas Übung auch bearbeitbar ist (sog. JSON-Format). Dieses Format sieht eine Gruppierung und Hierarchisierung zusammenhängender Einstellungen vor.

#blockquote[
#strong[Hinweis]: Zupfnoter bietet eine komfortable Benutzerführung über Bildschirmmasken zur Bearbeitung der Konfigurationsparameter, so dass die dierekte Bearbeitung im Texteditor nur noch in besonderen Fällen notwendig ist (siehe Kapitel #link("#konfigurationsmasken")[Konfigurationsmasken]).

Dazu muss die ABC-Datei mit einem Texteditor ausserhalb von Zupfnoter geöffnet und bearbeitet werden.
]

Über die Zupfnoter-Einstellungen wird das Design der Unterlegnoten verfeinert. So können zum Beispiel repeat lines (Wiederholungslinien) besser positioniert werden oder string names (Saitennamen) eingefügt werden. Die Zupfnoter-Einstellungen können manuell eingegeben werden oder über das Menü sheet config (Blattkonfiguration) erzeugt werden. Weitere Informationen zu den Zupfnoter-Einstellungen stehen im Kapitel  #link("#konfiguration")[Konfiguration].

#blockquote[
#strong[Hinweis]: Wichtig ist, nach einer Änderung in der Menüleiste immer auf auf `Rendern` (ausführen) zu drücken, damit die Unterlegnoten aktualisiert werden.
]

=== Editor für Liedtexte
#label("liedtexteditor")
Liedtexte werden in der ABC-Notation in den Kopfpzeilen `W:` erfasst. Zur Vereinfachung der Eingabe bietet Zupfnoter auch einen Liedtext-Editor Dieser ist über den Reiter `Liedtexte` erreichbar.

#blockquote[
#image("../ZAUX_Images/040-070_lyricseditor.jpg") 
]

Die Texte werden beim Klick auf den Reiter `Liedtexte` aus dem Texteditor für ABC-Notation entnommen. Bei jeder Änderung werden werden die Texte sofort in den Textedtior zurückgeführt. Daher kann man die Änderungen an Texten sofort in der Notenvorschau sehen und auch aus dem Liedtexteditor `Rendern` aufrufen, um sie in der Unterlegnotenvorschau zu sehen.

#blockquote[
#strong[Hinweis]: Die Anordnung der Liedtexte wird über die Konfiguration bestimmt (siehe Kapitel  #link("#templates.lyrics")[extract.0.lyrics]).
]

=== Konfigurationsmasken
#label("konfigurationsmasken")
Zupfnoter bietet eine komfortable Barbeitung der Konfigurationsparameter über Bildschirmmasken. Diese Masken werden über das Menu "#strong[Konfig. bearbeiten]" aufgerufen. Die Masken wirken dann auf den aktuell eingestellten Auszug.

#blockquote[
#strong[Hinweis]: Grundsätzlich bildet Zupfnoter für jeden Konfigurationsparameter einen Wert in folgender Reihenfolge

+  Der Wert im aktuellen Auszug bzw. im Musikstück (für Parameter die nicht pro Auszug gesetzt werden können)
+  wenn der aktuelle Auszug keinen Wert enthält: der Wert im Auszug 0
+  wenn auch der Auszug 0 keinen Wert enthält: der systeminterne Vorgabewert
]

Dabei gibt es verschiedene Arten von Masken

-  #strong[vordefinierte Masken] mit einem festen Aufbau. Diese zeigen Eingabefelder für Parameter auch dann, wenn sie im Musikstück noch nicht vorhanden sind. Wichtigstes Beispiel ist die Maske "Grundeinstellungen". Diese Masken verändern ihren Aufbau nicht.
-  #strong[dynamische Masken], welche nur die Parameter zeigen, die im Musikstück auch wirklich vorhanden sind. Prominentestes Beispiel hierfür ist die Maske "Liedtexte". Diese Maske verändern ihren Aufbau, je nach dem, welche Paramter im Musikstück wirklich vorhanden sind.
-  #strong[Auzugsbezogene Masken]: Diese Masken bearbeiten den aktuell eingestellten Auszug. Dieser wird in der Maskenüberschrift links angezeigt (z.B. `Grundeinstellungen [Auszug 2]`). Sie passen sich an, wenn der aktuelle Auszug gewechselt wird.

Da die Konfigurationsparameter an verschiedenen Stellen gesucht werden, muss auch das Einfügen / Löschen von Konfigurationsparametern über die Masken möglich sein. Daher gibt es in den Konfigurationsmasken pro Parameter je eine Zeile mit den folgenden Elementen:

-  `Löschen` - Löscht den Parameter aus der Konfiguration

  #blockquote[
  #strong[Hinweis]: Diese Taste kann ggf. einen ganzen Auszug löschen (wenn man die `Löschen` - Button an einem Auszug drückt. Also sei bitte vorsichtig.
  ]

-  `Füllen` - Diese Taste füllt den Parameter mit den Vorgabewerten. Falls noch nicht vorhanden wird er auch in die in die Konfiguration eingefügt (Ggf. werden auch Unterparameter mit eingefügt, z.B. bei "Layout").

-  `Name` - die Beschriftung des Parameters

-  `Eingabefeld` - hier kann der Wert eingegeben werden. Bei Gruppierungen gibt es kein Eingabefeld, da hier die Werte in die Unterparameter eingetragen werden.

-  `Hilfe` - zeigt eine spezifische Hilfe für diesen Parameter an

-  `aktuell wirksamer Wert` - zeigt den Wert an, der für den Parameter gerade gültig ist.

  #blockquote[
  #strong[Hinweis]: Hier wird ggf. der Wert aus `extract.0` angezeigt falls im aktuellen Auszug noch kein Wert vorhanden ist.

  Mit Klick auf den Knopf `Füllen` wird der Parameter in den aktuellen Auszug eingefügt und mit dem wirksamen Wert befüllt. Der Wert kann dann ggf. für diesen Auszug angepasst werden.
  ]

  #blockquote[
  #strong[Hinweis]: Wenn ein neuer Wert im Eingabefeld eingegebn, das Eingabefeld aber noch nicht verlassen wurde, Zeit "aktuell wirksamer Wert" noch den alten Wert an. Du musst das Eingabefeld verlassen (z.b. mit der "Tab" - Taste) um die Eingabe des Wertes abzuschließen.
  ]

#blockquote[
#image("../ZAUX_Images/040-040_Konfigurationsmasken.pdf") 
]

Für die Bedienung der Masken ist noch wichtig

-  In der Kopfzeile der Konfigurationsmaske gibt es ein Eingabefeld "Suche". Wenn du dort etwas eingbist, dann sucht Zupfnoter nach passenden Konfigurationsparametern. Dieses Suchfeld ist hilfreich, um schnell einen Parameter zu finden. Z.B. führt die Eingeabe des Wortes `Farbe` zu einer Maske in der alle Parameter angezeigt werden, die etwas mit "Farbe" zu tun haben.
-  Schaltfläche `Refresh`: Um sicher zu gehen, dass die Konfigurationsmaske wirklich die aktuellen Werte zeigt, kann mit `Refresh` die Maske neu aufgebaut werden. Dies ist z.B. dann notwendigWenn der Konfigurationsparameer außerhalb der Maske geändert wird (z.B. im Texteditor).
-  Schaltfläche `Neuer Eintrag`: Diese Taste fügt eine neue Instanz eines Parameters ein. Sie ist nur aktiv, wenn es für einen Parameter mehrere Instanzen geben kann (z.B. Liedtexte \[lyrics.x\], Seitenbeschriftung \[notes.x\])
-  Schaltfläche `Schnelleinst.`: Diese Taste (Schnelleinstellungen) öffnet ein Menü, aus dem du für die aktuelle Maske eine e Voreinstellung auswählen kannst. Eine solche Voreinstellung ist eine sinnvolle Kombination von Parametern für einen bestimmten Fall (z.B. für ein "kompaktes Layout"). Diese Schaltfläche ist nur für solche Masken aktiv, für die es auch Voreinstellungen gibt.
-  Feldeingabe mit der "TAB"-Taste bestätigen
-  `Rendern` nicht vergessen (#strong[In der Maske drücke erst TAB, dann geht auch das "Rendern" ab])

=== Dekorationen
#label("dekorationen")
Zupfnoter verarbeitet eine Reihe von Dekorationen (Fermate, ritardando usw.). Diese werden im ABC-Text vor die Noten eingefügt, und sind dort in Ausrufezeichen eingefasst. Dafür gibt es im Editor ein eigenes Menü.

Allerdings wird im Unterlegnotenblatt für dieses optimiert und weicht daher von der Standard-Notendarstellung ab.

#blockquote[
#strong[Hinweis]: Für Ritardando und Abdämpfung gibt es im ABC leider keine standardisiert dekoratiion. Daher wird diese als notenbezogene Anmerkung eingefügt, erscheinen im ABC text also in Anführungszeichen.
]

=== Masken für Zupfnoter-spezifische Zusätze
#label("masken-fuer-zusaetze")
Um notenbezogene Zusatzinformation für Zupfnoter direkt zu erfassen, verwendetZupfnoter "Annotations" der ABC-Notation mit spezifischen Konventionen. Diese Zusätze stehen vor der Note bzw. dem Taktstrich auf den sie sich beziehen. Beispiel für solche Zusätze sind

-  Positionierung von Sprunglinien `"^@da cape@10" C` oder `"@@4" :|`

-  Verschiebung von Noten nach links/rechts `"^>!" C`

  #strong[Hinweis]: diese Methode ist veraltet. Stattdessen verwende bitte die über das Kontextmenü in der Harfenvorschau erreichbare notenbezogene Konfiguration `notebound.nconf` bzw. `nshift`.

-  Notenbeschriftung `"^!fine@1,1"`

-  Sprungziele `"^:fine"`

-  Verschiebemarken `[r: hugo]`

Zupfnoter unterstützt die Pflege diese Zusätze über Bildschirmmasken. Diese kannst du über Schaltflächen bzw. Menüs in der Werkzeugleiste des Eingabefensters aufrufen (siehe Kapitel  #link("#werkzeugleiste-des-eingabefensters")[Werkzeugleiste des Eingabefensters]).

#blockquote[
#strong[Hinweis]: Der Aufruf von "Zusatz einfügen" und "Zusatz bearbeiten" liegt auf unterschiedlichen Schaltflächen, da beim "Einfügen" ein Menü erscheint über welches ausgewählt wird, "was" eingefügt werden soll. Beim Bearbeiten ist diese Auswahl nicht mehr notwendig. Daher wird "bearbeiten" über eine Schaltfläche direkt aufgerufen.
]

#blockquote[
#blockquote[
#blockquote[
#image("../ZAUX_Images/040-050_Menue-fuer-zusaetze.jpg") 
]
]
]

Es erscheint eine Maske nach folgendem Beispiel:

#blockquote[
#blockquote[
#image("../ZAUX_Images/040-060_Maske-fuer-zusatz.jpg") 
]
]

=== Einfügen von Bildern zur Illustration des Notenblattes
#label("einfügen-von-bildern-zur-illustration-des-notenblattes")
Zupfnoter kann Bilder in das Unterlegnotenblatt einfügen.

#blockquote[
#strong[Hinweis]: Bitte achte darauf dass die eingefügten Bilder insgesamt nicht zu groß werden (getestet bis zu 600 kB). Sonst funktioniert ggf. die Druckvorschau nicht mehr. Normalerweise hat man ein höchstens zwei Bilder auf dem Blatt. Dann sollte diese Begrenzung kein Problem darstellen. Man muss aber wissen, dass Lade - und Speichervorgänge deutlich länger brauchen.
]

Um Bilder zu verwenden geht man folgende Schritte:

+  Das Bild muss im "JPG" - Format vorliegen. Da Zupfnoter keine Bildbearbeitungsfunktionen hat muss mit einem externen Programm das Bild aufbereitet werden.

+  das Bild wird dann über `Datei / importieren` in den Zupfnoter importiert.

#blockquote[
#strong[Hinweis]: Die Bilddatei kann auch in das Zupfnoter-Fenster hineingezogen werden.
]

#block[
#set enum(numbering: "1.", start: 3)
+  In der Konfigurationsmenü `Konfig bearbeiten / Bilder` können nun die Bilder auf dem Blatt positioniert werden. Dabei kann man Anzeige, Höhe und Position des Bildes angeben.

  #blockquote[
  #strong[Hinweis]: Bitte lege alle Bilder zunächst im Auszug 0 an. Der Konfigurationseditor zeigt in den anderen Auszügen nur Einträge an, die auch im Auszug 0 vorhanden sind.
  ]

  #blockquote[
  #image("../ZAUX_Images/040-044_Configuration-images.jpg") 
  ]

  #blockquote[
  #strong[Hinweis]: Du kannst das Bild auch mit der Maus positionieren.
  ]

  In dieser Konfigurationsmaske kann man oben im Abschnitt `$ Ressourcen` auch sehen, welche Bilder bereits vorhenden sind. Durch Klick auf den kleinen Papierkorb kannst du Bilder auch wieder aus der Datei entfernen. Klick auf den Hilfe-Button zeigt eine kleine Vorschau des Bildes.
]

== mit der Maus konfigurieren
#label("mit-der-maus-konfigurieren")
Einstellungen, welche die Position und Gestalt von Element im Unterlegnotenblatt betreffen, lassen sich auch mit der Maus vornehmen:

-  Positionierung von Texten und Bildern (Titel, Legende, Beschriftung usw.)
-  Anordnung von Sprunglinien
-  Gestalt der Triolenbogen (Tuplet)
-  Gestalt der Flußlinien (experimentell)

Für die grundsätzliche Bedienung gilt:

-  Wenn du den Mauszeiger über ein solches Element bewegst, ändert dieser seine Form. Darüber hinaus zeigt die Statusleiste rechts unten, welcher Konfigurationsparameter verändert wird.
-  Bei solchen Elementen ruft das Kontextmenü #strong[`Edit config`] den entsprechenden Konfigurationseditor auf.
-  Nach dem Bearbeiten des Elementes mit der Maus wird das Element rot. Bitte führe einen "Render" aus um die Unterlegnotenvorschau zu aktualisieren.

#blockquote[
#strong[Hinweis]: Bitte beachte, dass manche Einstellungen am Zeitbezug der Note hängen. Wenn du also dein Stück so überarbeitest, dass sich der Zeitbezug einer Note ändert, musst du ggf. die Konfiguration erneut durchführen.
]

#blockquote[
#strong[Hinweis]: Bitte beachte, dass Einstellungen von Dekorationen und notenbezogenen Anmerkungen and der Reihenfolge im ABC code hängen. Wenn du also z.b. von zwei aufeinanderfolgenden Anmerkungen die erste löschst, dann wird die verbleibende Anmerkung an die Position der gelöschten Anmerkung verschoben.
]

#blockquote[
#strong[Hinweis]: Es kann sein, dass beim Verändern deines Stückes nicht mehr genutzte Konfigurationen übrig bleiben. Diese werden nicht entfernt und könnten später zu unerwarteten Effekten führen. In diesem Fall ist es am besten mit der rechten Maustaste in der Harfennotenvorschau die entsprechende Konfiguration aufzurufen, zu löschen und neu zu erstellen.
]

=== Texte und Bilder verschieben
#label("texte-und-bilder-verschieben")
Du kannst Titel, Legende, Notenbeschriftungen, Blattbeschriftungen, Taktnummern, Zählhinweise, Variantenbezeichner, Bezeichner von Parts sowie Bilder mit der Maus verschieben.

=== Sprunglinien verschieben
#label("sprunglinien-verschieben")
Du kannst horizontale Lage der Sprunglinien mit der Maus einstellen. Die Linen rasten beim ziehen mit der Maus zwischen den Saiten ein.

#blockquote[
#strong[Hinweis]: Bei varianten Enden wirkt der selbe Konfigurationsparameter ggf. auf mehrere Sprunglinien. Bitte drücke daher auf `Render` um das Endergebnis zu sehen. Danach sind auch die Pfeile an den Sprunglinien wieder korrekt.
]

#blockquote[
#strong[Hinweis]: man kann Sprunglinien unterdrücken, indem man im Kontext-Menü Kontextmenü #strong[`Edit config`] wählt, und dann den paramteter auf `0` stellt. Die linie verschwindet dann, und kann nur schwer wieder sichtbar gemacht werden: `Konfig.Bearb / Notenbeezogen`, dann den Parameter suchen (`p_begin`, `p_end`, `p_follow`, `p_repeat`) und den Wert auf ungleich 0 setzen.
]

=== Triolenbogen gestalten
#label("triolenbogen-gestalten")
Das Gestalten von Triolenbogen ist etwas vom komplexesten, was Zupfnoter zu bieten hat :-). Aber mit der Maus geht es ganz einfach:

#image("../ZAUX_Images/040-090_drag-drop-tuplet.pdf") 

-  wenn man genau hinschaut, dann siehst du an den Triolenbögen zwei kleine Griffe. Wenn du die Maus darüber bewegst, kann due diese mit gedrückter Maustaste bewegen.
-  wenn du die Maus bewegst, ändert sich das Bild zu einem Trapez. Der entstehende Bogen wird durch zwei Kontrollpunkte (die oberen Ecken des Trapezes) gestaltet. Im vorstehenden Bild wurde der linke Griff (d.h. der linke Kontrollpunkt) bewegt.

#blockquote[
#strong[Hinweis]: Am besten experimentierst du ein bisschen, um Erfahrung zu sammeln. Es würde zu weit führen, hier alle Möglichkeiten darzustellen.
]

#blockquote[
#strong[Hinweis]: Es kann vorkommen, dass die Griffe von Noten verdeckt und daher mit der Maus nicht erreichbar sind. In diesem Fall kannst du an der Triolenbeschriftung oder an einem andere Griff `Edit Cconfig` aufrufen und den Kontrollpunkt so ändern, dass er wieder sichtbar wird.
]

=== Flußlinien gestalten
#label("flowconf")
Bei manchen Stücken kommt es vor, dass die Flußlinie einer Stimme durch die Begleintnoten verläuft. In diesem Fall muss man ggf. die Flußlinie um die Begleitnonten "herumbiegen". Da zu gibt es eine experimentelle Möglichkeit die Flußlinie mit der Maus zu gestalten, ähnlich wie die Triolenbögen.

Die Bearbeitungsmöglichkeiten müssen in der #link("#konsole-fenster")[Konsole] bzw. im Menü `Extras` eingeschaltet werden.

#blockquote[
#strong[Hinweis:] Wenn die Bearbeitung der Flußlinien eingeschaltet ist, wird Zupfnoter deutlich langsamer.
]

Die Flußlinie wird unterbrochen

-  vor und nach einer Wiederholung
-  bei einem Taktstrich `||` bzw. `|]`
-  bei eienmm Abschnitt (Part) mit `[P:]`
-  pro Stimme mit der Dekoration !breath!

== Erstellung von Auszügen
#label("auszuege")
=== Funktionsweise von Auszügen
#label("funktionsweise-von-auszügen")
Zupfnoter erfasst zunächst #strong[alle Stimmen] eines Musikstückes als umfassendes Modell. Aus diesem kompletten Modell können Auszüge erstellt werden, welche spezifische Elemente darstellen. Damit kannst du Blätter für verschiedene Zielgruppen erstellen, z.B.:

-  Gesamtansicht für Lektoren
-  Einzelstimmen für Anfänger (z.B. nur die erste Stimme, Zählhilfen)
-  Beliebige Kombinationen von Stimmen für Leiter und Fortgeschrittene (z.B. zwei Stimmen, aber keine Zählhilfen mehr)
-  verschiedene Hilfsinformationen (Zählhilfen, Taktnummern etc.)
-  Sonstige Einstellungen (z.B. Druckeroptimierung usw.)

Für jeden Auszug gibt es einen Satz von Konfigurationsparameetern (`extract.0`, `extract.1`) usw. welcher den Inhalt des jeweiligen Auszuges bestimmt. Über die Schaltfläche `Auszug` kannst aktuell aktiven Auuszug einstellen. Der aktive Auszug bestimmt,

-  was in der Unterlegnotenvorschau angezeigt wird
-  auf welchen Auszug die Konfigurationsmasken wirken.

Die Auszüge werden durchnummeriert#super[12].

Der Auszug mit der #strong[Nummer 0] hat eine besondere Rolle: Er gilt als Vorgabe für die anderen Auszüge. Die im Auszug 0 angegebenen Werte für die Konfigurationsparameter wirken also auf die Auszüge mit höherer Nummer solange sie dort nicht überschrieben werden.

Damit kannst du im Auszug 0 die grundlegenden Einstellungen vornehmen und in den höheren Auszügen spezifische Anforderungen erfüllen.

Einstellungen, die auch im Auszug 0 nicht definiert sind, belegt Zupfnoter mit programminternen Voreinstellungen. Diese Vorgabewerte sind so, dass folgende Auszüge definiert entstehen.

-  Auszug 0: Alle Stimmen
-  Auszug 1: Sopran, Alt
-  Auszug 2: Tenor, Bass

Dabei wird von einem vierstimmigen Satz ausgegangen und Flusslinien, Synchronisationslinien, Stimmenauswahl etc. darauf abgestimmt.

Die folgende Abbildung illustriert das Konzept der Auszüge:

#image("../ZAUX_Images/040-035_extracts.pdf") 

In diesem Beispiel kannst du die Zusammenhänge sehen:

-  Auszug 0 ist hier so konfiguriert

  -  alle Stimmen (1,2,3,4)
  -  Wiederholungszeichen statt Sprunglinien
  -  Aufteilung der Liedtexte auf zwei Blöcke
    -  Block 1: Strophe 1 und 2
    -  Block 2: Strophe 3 und 4

-  Auszug 1 hat gegenüber Auszug 0:

  -  nur Stimme 1 und 2
  -  andere Position der Liedtexte

-  Auszug 2 gat gegenüber Auszug 0:

  -  nur Stimme 3 und 4 Voreinstellung in Zupfnoter entspricht.)
  -  andere Positionierung der Legende
  -  andere Aufteilung der Liedtexte:
    -  Alle Strophen in einem Block (Angabe `"verses": [1,2,3,4]`)
    -  Liedtextblock 2 enthält keine Strophen mehr (Angabe `"verses" : [0]`). Diese Angabe ist notwendig, weil sonst die in Auszug 0 definerten Strophen wirksam bleben. `extract.0.lyrics.2`

#blockquote[
#strong[Hinweis]: Die Angaben der auszugebenden Stimmen könnte an sich entfallen, da da sie der Voreinstellung in Zupfnoter entsprechen. Sie sind hir nur zur Illustration aufgeführt.
]

=== Praktisches Vorgehen bei der Erstellung von Auszügen
#label("bestPracticeExtract")
Das Konzept der Auszüge in Zupfnoter ist ein mächtiges Werkzeug. Mächtige Werkzeuge müssen aber mit Bedacht eingesetzt werden, wenn man Verwirrung vermeiden will.

Daher ist folgendes Reihenfolge zu empfehlen:

+  #strong[Planung der Auszüge]: Die Konzeption der Auszüge hängt von der Anzahl der Stimmen, der Überlagerungen (wie laufen die Stimmen in einander) der Stimmen und den unterstützten Instrumenten ab. Die in Zupfnoter eingebaute Voreinstellung ist:

  -  #strong[0 Alle Stimmen]: Stimmen 1,2,3,4; Auszgsnummer -S
  -  #strong[1 Sopran Alt]: Stimmen 1,2; Auszugsnummer -A
  -  #strong[2 Tenor Bass]: Stimmen 3,4; Auszugsnummer -B
  -  #strong[3 Melodie]: Stimme 1; Auszugsnummer -M

  #blockquote[
  #strong[Hinweis:] Bei Verwendung von Platzhalten in den Seitenbeschriftungen ist es sinnvoll die Auszugsnummer im Parameter "extract.\*.filenamepart" einzutragen. Der Eintrag kann über den Plathalter `{{extract_filename}}` dann die Seitenbeschriftungen eingetragen werden. Der Plathalter `{{printed_extracts}}` entnimmt die auszugsbezeichnungen ebenfalls aus "extract.\*.filenamepart".

  Auf diese Weise wird erreicht, dass die Filenamen der Auzüge und die Blattbeschrifungen für die Auszüge konsistent sind.
  ]

+  #strong[Anlegen der Auszüge]: Ausgehend von der Planung sollte unter dem Menü #strong[`Konfig. bearbeiten / Auszugsbeschriftung`] alle geplanten Auszüge angelegt werden. Dabei sollte "Titel", "Auszugsnummer", "Filenamezusatz" festgelegt werden. Der eingegebenen Titel wird nun auch für das Menü zur Einstellung des Auszuges verwendet.

  #image("../ZAUX_Images/040-041_Auszugsbeschriftung.jpg") 

+  #strong[Bearbeitung der gemeinsamen Anteile]: Nun kannst du über das Menü `Konfig. bearbeiten / Grundeinstellungen` die Maske für die Grundeinstellungen aufrufen. Die hier gesetzten Einstellungen wirke #strong[auf alle nachfolgenden] Auszüge. Daher ist es sinnvoll, z.b. Flusslinien, Synchronisationslinien, Wiederholungen usw. für alle Stimmen zu konfigurieren. Am besten konfiguriert man so weit, dass das Blatt gut aussieht, d.h. Position der Legende und Liedtexte sollte möglichst auf Auszug 0 erfolgen.

  Auch die Sprunglinien sollten weitgehend in Auszug 0 konfiguriert werden. Nur in Ausnahmefällen ist eine weitere Positionierung in anderen Auszügen notwendig.

  Als Faustregel gilt, so viel wie möglich auf Auszug 0 zu konfigurieren, so dass man im Grunde bei den Folgeauszügen nur noch die Stimmen auswählen muss.

+  #strong[Bearbeitung der folgenden Auszüge]: Wenn Auszug 0 gut konfiguriert ist, dann kann man sich den anderen Auszügen zuwenden. Dazu wird der zu bearbeitende Auszug im Menü rechts oben eingestellt. Die Konfigurationsmasken und Einstellungen mit der Maus wirken nun auf den eingestellten Auszug.

  #blockquote[
  #strong[Hinweis]: Es ist eine häufige Fehlerquelle, dass man nicht den richtigen Auszug eingestellt hat. Daher ist es wichtig den eingestellten Auszug immer wieder zu überprüfen. #image("../ZAUX_Images/040-042_Pruefen-Auszug-Grundeinstellungen.jpg")  Im vorliegenden Fall wird Auszug 0 konfiguriert.
  ]

  In den weiteren Auszügen kann man sich konzentrieren auf:

  -  Auswahl der Stimmen
  -  Auszugsnummer
  -  Feinjustierung der Liedtexte und sonstigen Beschriftungen
  -  Einstellung von Instrumentenspezifika, wenn aus der gleichen Stück, Auszüge für verschiedene Instrumente (z.b. 18 Saiten, Saitenspiel) erstellt werden sollen

=== Instrumentenspezifika
#label("instrumentenspezifika")
Die flexible Konfiguration von Zupfnoter erlaubt die Anpassung der Auasgabe auf viele verschiedene Instrumente. Allerdings führt hier meist eine Kombination verschiedener Parameter zu Ziel. Zur Vereinfachung sind diese Kombinationen für gebräuchliche Instrumente als "Schnelleinstellung" hinterlegt.

Wähle das Menü #strong["`Konfig. bearbeiten > Instrument spez.`"]. Es erscheint eine Maske mit den Parametern deren Zusammenspiel die Ausgabe für diverse Instrumente optimiert.

In dieser Maske kannst du aus den `Schnelleinstellungen` das gewünschte Instrument auswählen.

#image("../ZAUX_Images/040-043_Instrument-specific.jpg") 

#blockquote[
#strong[Hinweis]: Bitte beachte, dass es auch einen Parameter "Instrument" gibt. Dieser ist nicht zu verwechseln mit der Schnelleinstellung, auch wenn er zum Teil dieselben Bezeichnungen verwendet. Der Parameter `Instrument` veränderte programminterne Abläufe welche sich nicht über Konfiguration ausdrücken lassen (z.b. diatonische Stimmung bei Saitenspiel bzw. OKON-Harfe)
]

#blockquote[
#strong[Hinweis]: Für Tischharfen mit Halbton-Klappen (z.B. OKON-Harfe) muss man zuächst die Schnelleinstellung für das Instrument aufrufen. Mit dem Paramter "Instrument" wählt man dann die Tonart aus, auf welche die Harfe eingestellt werden soll. Dann kann Zupfnoter die Tonhöhen den entsprechenden Saiten zuordnen und auch am unteren Rand anzeigen, welche Klappen aktiviert (bzw. welche Saiten einen Halbton hochgestimmt) werden sollen.
]

== Sonstige Hinweise
#label("sonstige-hinweise")
=== Wenn Zupfnoter beim Start hängen bleibt
#label("wenn-zupfnoter-beim-start-hängen-bleibt")
Was ist heute schon perfekt - auch bei Zupfnoter kann es Probleme geben. In seltenen Fällen kann es vorkommen, dass die ABC-Noten oder die Konfiguration so fehlerhaft ist, dass Zupfnoter beim Start sofort in den gleichen Fehler läuft und keine Bearbeitung mehr möglich ist.

In diesem Fall kannst du beim Aufruf von Zupfnoter `/?debug` anhängen, z.B.

```
https://zupfnoter.weichel21.de/?debug
```

Dann startet Zupfnoter, versucht aber nicht gleich ein "Rendern" . Damit kannst dann die Eingaben korrigieren bis "Rendern" wieder funktioniert.

#blockquote[
#strong[Hinweis]: Zupfnoter erkennt selbständig, dass beim letzten Rendern ein Problem aufgetreten war und startet dann ohne automatisches Rendern. Daher sollte diese Schalter nicht mehr notwendig sein.
]

=== Transponieren
#label("transponieren")
Wenn das Musikstück nicht auf die Harfe passt, kann man es ggf. durch transponieren zurecht schieben. Dazu gibt man in der ABC-Notation z.B. die folgende Kopfzeile ein. Diese verschiebt das Stück drei Halbtöne nach unten (in den Unterlegnoten also nach links).

#blockquote[
#strong[Hinweis]: Zupfnoter gibt die Transponierung der ersten Stimme im Unterlegnotenblatt aus. Abweichende Transponierungen in den anderen Stimmen werden zwar ausgeführt, aber nicht vermerkt.
]

Dazu gibt es mit ABC 2.2 eine standardisierte Spezifikation, die ab Zupfnoter 1.6 auch umgesetzt ist.

Es würde zu weit führen hier alle Möglichkeiten darzustellen (und es sind wirklich sehr viele). Sie sind in #link("http://abcnotation.com/wiki/abc:standard:v2.2#voice_modifiers_-_clefs_and_transposition")[http://abcnotation.com/wiki/abc:standard:v2.2\#voice\_modifiers\_-\_clefs\_and\_transposition] zu finden.

-  Transponierungen können nun an den Kopfzeilen `K:` und `V:`angegeben werden.
-  Angaben zur Transponierung ersetzen die vorherigen Angaben

Die Angaben erfolgen über den parameter `shift=<note1><note2>`, zum Beispiel

```
V:1 shift=cd
K:c shift=cd
```

Das intervall für die Transponierung wird durch zwei Noten, `<note1>` `<note2>` angegeben. Hier bezieht sich `<note1>` auf den transkribierten abc-Code und `<note2>` bezieht sich auf die gerenderte Ausgabe.

#blockquote[
#strong[Hinweis]: ABC-Notation kennt noch weitere Schlüsselworte zum Transponieren (score, sound, instrument). Es wirken sich nur die Angaben aus `shift` auf die Unterlegnoten aus, weil die Tischharfe kein transponierendes Instrument ist.
]

Beispiel: Im Folgenden wird die Setzpartitur von C nach G transponiert.

```
K:C shift=CG
CDE
```

is äquivalent zu

```
K:G
GAB
```

=== wechselnde Taktlängen
#label("wechselnde-taktlängen")
Es gibt Stück, mit wechslenden Taktlängen. Bei einzelnen Takten kanns du dasd mit einer eingebetteten Kopfnzeile machen `[M:3/2]`. Bei häufigen Taktwechwseln ist das aber recht umständlich. In diesem Fall kannst du z.B. die Kopfzeile so angeben:

```
M: 2/2 3/2=2/2
```

Damit werden alle im Stück auftretenden Taktlängen angegeben. Nach dem Gleichheitszeichen kann die kürzeste Taktlänge angegeben werden. Die Notenvorschau schreibt nur dann eine Taktnummer, wenn der Takt ausgefüllt ist. Mit der Angabe der kürzesten Taktlänge bekommst du an allen Takten eine Nummer.

=== Variante Enden mitten im Takt
#label("variante-enden-mitten-im-takt")
Wenn eine Variation mitten in einem Takt beginnen soll, dann muss als "Taktstrich" eine rechte eckige Klammer (z.b. `]1` ) geschrieben werden. Zupfnoter stellt dann weder in der Notenvorschau noch in den Unterlegnoten einen Taktstrich dar. Auch die Zählung der Takte kommt nicht durcheinander.

=== Wenn Takte nicht synchron sind
#label("wenn-takte-nicht-synchron-sind")
Zupfnoter prüft nicht, ob die Takte in allen Stimmen synchron sind. Wenn die Takte in den Stimmen nicht synchron sind, kommt es zu unterschiedlichen Zeilenumbrüchen und fehlerhaften Unterlegnoten.

Die Takte kann man am besten prüfen, wenn jede Stimme eine eigene Notenzeile im Notensystem hat.

Dies erreicht man mit

`%%score 1 2 3 4`

Das bewirkt ein Notensystem mit einer Notenzeile pro Stimme. Weitere Einzelheiten im nächsten Kapitel.

In diesem Zusammenhang ist es auch hilfreich, die Taktnummern einzuschalten.

Taktnummern in den Noten sind standardmässig eingeschaltet. Um diese auszuschalten dient die Kopfzeile

```
I:measurenb 0
```

#blockquote[
#strong[Hinweis] Bei zu kurzen Takten erscheint die Taktnummer nicht korrekt.
]

=== Änderung der Takte im Stück
#label("änderung-der-takte-im-stück")
Die ABC-Notation erlaubt es, in einem Stück die Takte zu ändern. Hierfür empfiehlt sich folgende Vorgehensweise:

+  in der `M:` - Kopfzeile werden alle Taktarten aufgeführt, die im Stük vorkommen. Die Start-Taktart wird als erstes geschrieben.

  ```
  M:4/4 3/4 =4/4
  ```

Die Angabe `=4/4` wird zur Berechung des ersten Taktstriches herangezogen

#block[
#set enum(numbering: "1.", start: 2)
+  in der Stimme kann nun eine eingebettete Kopfzeile zur Taktumschaltung eingefügt werden. Soll die Taktänderung auch im Blatt erscheinen, dann muss sie als notenbezogene Anmerkung hinzugefügt werden.

  ```
  M:3/4] "^!Takt: 3/4" f
  ```
]

#blockquote[
#strong[Hinweis]: Die manuelle Erzeugung der notenbezogenen Anmerkung zum Taktwechsel ist flexibler als eine eventuelle Automatik. Daher bietet Zupfnoter diese Automatik nicht an.
]

=== Mehrere Stimmen in ABC-Notation
#label("mehrere-Stimmen-in-abc")
Da das Zupfnoter-tutorial dieses Thema eher knapp behandelt ist gibt es hier weitere Informationen.

Die Kopfzeile `V:` The V: erlaubt die Erfassung mehrstimmiger Stücke. Dabei wird das Stück in Stimmen aufgeteilt. Jede Stimme beginnt mit einer `V:` - Kopfzeile. Alle Noten die dieser Zeile folgen bis zur nächsten `V:` - Kopfzeile oder dem Ende des Stückes gehören zu dieser Stimme.

Die `V:` Zeile definiert auch die Eigenschaften der Stimme mit folgendem Aufbau

#blockquote[
`V:<ID> [clef=]<clef name> [octave=<number>]"`
]

Darin ist

-  `<ID>` eine Identifikation der Stimme, sie wird in der `%%score` - Anweisung referenziert. Es empfiehlt sich hier einfach ganze Zahlen zu verwenden un die Stimme so durchzunumerieren.

-  `[clef=]<clef name>` optionale Angabe des Notenschlüssels. Name ist

  -  `treble` `treble+8` `treble-8` Violinschlüssel (+8 bzw. -8 verschiebt Unterlegnoten um eine Oktave)
  -  `bass` `bass+8` `bass-8` Bass-Schlüssel (+8 bzw. -8) verschiebt die Unterlegnoten um eine Oktave)

-  `octave=<number>` optionale Angabe einer Oktavierung. Positive Zahlen transponieren eine Oktave noch oben, negative Zahlen um eine Oktave nach unten.

-  `shift=<note1><note2>` Transponiert die Stimme (siehe Kapitel #link("#transponieren")[Transponieren]).

  #blockquote[
  #strong[Hinweis]: Auf den Unterlegnoten wird nur die Transponierung angegeben, die auf die erste Stimme wirkt.
  ]

Die Darstellung der Stimmen im Notensystem wird durch die `%%score` - Anweisung bestimmt. Hier einfach zwei im Zusammenhang von Zupfnoter relevante Beispiele

-  `%%score 1 2 3 4` - Stimme 1,2,3,4 jeweils in einer eigenen Notenzeile
-  `%%score (1 2) (3 4)` - Stimme 1, 2 bzw. 3,4 zusammengefasst in in einer Notenzeile

#blockquote[
#strong[Hinweis]: In einigen Konfigurationseinstellungen von Zupfnoter werden Stimmen über eine Stimmen-Nummer angegeben. Die dabei relevante Nummerierung der Stimmem ergibt sich aus der Reihenfolge der Stimmen in der `%%score` - Anweisung im ABC-Notation (nicht zu verwechseln mit der Identifikation der Stimme in der `V:` - Zeile.
]

#blockquote[
#strong[Hinweis]: Die ABC-Notation erlaubt mehrere `%%score` - Anweisungen. Bitte vermeide das, weil Zupfnoter dafür nicht ausgelegt ist und das Verhalten noch nicht ausgetestet ist.
]

=== Harmonieassistent
#label("harmonieassistent")
Zupfnoter enthält einen rudimentären Assistent zum Umgang mit Harmonien. Dieser befindet sich am oberen Rand der Notenvorschau und bietet folgende Funktionen:

+  Anzeige der Töne in der aktuellen Selektion

  Wenn man in der Notenvorschau oder in der Harfenvorschau eine oder mehrere Noten auswählt, dann erscheinen alle Noten dieser Auswahl rechts oben im der Notenvorschau. Damit kann man - Kenntnisse der Harmonielehre - vorausgestzt, passende Begleittöne finden.

+  Anzeige passender Akkorde

  Wenn du auf die Anzeige der aktuellen Noten klickst, werden diese in die Akkordsuche (mittleres Eingabefeld) übernommen. Du kannst natürlich auch auch einzelne Töne eingeben. Die passenden Akkorde werden laufend angezeigt.

  Wenn du auf einen der angezeigten Akkorde klickst, wird er in das Eingabefeld der Akkordauflösung eingefügt und du kannst die Töne sehen, die zu dem Akkord gehören.

+  Anzeige von Tönen in einem Akkord

  Wenn du ein Stück mit Akkordsymbolen erfasst, kannst du die Auflösung der Akkorde in Einzeltöne ermitteln. Bitte gib dazu das Akkordsymbol im linken Eingabefeld ein. Die Töne dieses Akkordes werden dann abgespielt und angezeigt.

#blockquote[
Hinweis: in allen Feldern werden die Töne als Buchtabe mit ggf. angehängtem Versetzungszeichen eingegeben bzw. dargestellt z.B. `C C# Ab Bb`.

Hinweis: man kann die Töne noch einmal abspielen, wenn man eine beliebige Taste (z.b. die Großschreibtaste) drückt, solange das entsprechnede Eingabefeld aktiv ist.
]

=== Bearbeiten von Takten in allen Stimmen
#label("bearbeiten-von-takten-in-allen-stimmen")
Wenn man im das gesamte Musiktück Takte einfügen bzw. löschen will, ist es notwendig, an mehreren Stellen im ABC-Code zu editieren.

Das ist eigentlich der Moment in dem man das Stück in ein Notensatzprogramm z.B. Musescore übernimmt, bearbeitet und dann in den Zupfnoter zurückbringt.

Zupfnoter kann diesen Anwendungfall auch abdecken:

+  wähle einen Abchnitt in der ersten Stimme

+  Benutze das Menü "Bearbeiten / Abschnitt in allen Stimmen auswählen"

+  Im ABC-Fenster siehst du nun, dass mehrere, nicht zusammen hängende Abschnitte selektiert sind.

  #image("../ZAUX_Images/040-055_select-multiple-measures.jpg") 

+  mit der Taste "Löschen" kannst du nu die gesamte Auswahl löschen. Damit werden die ausgewählten Takte in allen Stimmen gelöscht.

+  mit der Taste "\<-" (Pfeiltaste nach links) kannst du die Schreibmarke an den Anfang der Auswahl stellen und weitere Takte eingeben.

  #blockquote[
  #strong[Hinweis:] Es ist sinnvoll, hier zunächst Takte mit ganzen Noten einzugeben. Danach lassen sich neuen Takten in den einzelnen Stimmen bearbeiten.
  ]

#blockquote[
#strong[Hinweis:] das Verfahren ist etwas fragil und solte mit entsprechender Vorsicht angewandt werden

+  Das Verfahren funktioniert nur, jede Stimme in einem eigenen Block (mit genau einem "V:" pro Stimme) angegeben wird.
+  Das Verfahren basiert auf dem Zeitbezug der Noten. Dabei wird ein Taktstrich der folgenden Note zugeordnet. Wenn also die Auswahl mit einem Taktstich endet, dann wird die folgende Note in die Auswahl mit einbezogen.
+  Die Grenze der ursprünglichen Auswahl muss in allen Stimmen auch vorhanden sein. Wird z.B. eine #strong[viertel] Note ausgewählt, in einer anderen Stimme fällt deren Ende aber in eine #strong[halbe Note], dann ist die Auswahl in den Stimmen nicht zeitsynchron und es kann zu Fehlern kommen.
+  Das Verfahren erfordert, dass die Harfennoten aktuell sind (d.h. seit dem letzten Rendern keine Bearbeitung mehr gemacht wurde),
]

=== Wenn die vertikale Anordnung optimiert werden soll
#label("wenn-die-vertikale-anordnung-optimiert-werden-soll")
Zupfnoter errechnet die vertikale Anordnung der Noten selbständig und erreicht auch gute Ergebnisse. In Grenzsituationen (z.B. bei langen Stücken) ist eine manuelle Korrektur sinnvoll. Diese Optimierungen sollten in folgender Reihenfolge ausgeführt werden.

+  in `extract.0.layoutlines` über die Grundeinstellungen eine `0` eintragen. Diese führt dazu, dass nur noch die Stimmen, die auf dem Blatt dargestellt werden, auch für die Berechnung vertikalen Anordnung berücksichtigt werden. Damit entstehen keine scheinbar unmotivierten Vorschübe.

+  Synchronisationslinien abschalten (das Feld im Edior löschen oder '0-1' eintragen). Bei sehr vollen Blättern verwirren die Synchronisationslinien mehr als sie helfen.

+  im Konfigurationsmenü `Layout` mit den Schnelleinstellungen `Noten klein` bzw. `Packer kompakt` die beste Einstellung suchen

+  ggf. gebundene Noten zu einer Note zusammenfassen

+  Den vertikalen Vorschub manuell steuern. Die Möglichkeiten dazu sind in Kapitel  #link("#extract.0.notebound.minc")[`minc`] beschrieben.

+  Die Flußlinie gestalten (siehe Kapitel #link("#flowconf")[Flußlinien gestalten])

+  Positionierung von Taktnummern und Zählmarken optimieren

=== Positionierung von Taktnummern und Zählmarken optimieren
#label("barnumberautopos")
#blockquote[
#strong[Hinweis:] die feste, d.h. nicht automatisierte Positionierung kann man zwar in der Konfiguration noch einstellen. Diese Möglichkeit führt jedoch in der Praxis nicht zu befriedigenden Ergebnissen und wird also bald entfernt.
]

Die automatische Positionierung der Taktnummern bzw. Zählmarken geschieht wie folgt:

+  Taktnummern stehen am Anfang der Note in Spielrichtung (also oben bei spiel von oben nach unten)

+  Zählmarken stehen am Ende der Noten in Spielrichtung (also unten bei Spiel von oben nach unten)

+  die horziontale Position errechnet sich aus dem Verlauf der Flussinien. Man kann aber über das Kontextmenü für jede Taktnummer / Zählmarke einstellen, ob sie links oder rechts von der Note platziert wird.

+  Man kann einstellen, ob die Taktnummern / Zählmarken bezogen auf die #strong[Notenmitte oder den Notenrand] positioniert werden (Kapitel  #link("#extract.0.barnumbers.apanchor")[`extract.0.barnumbers.apanchor`] bzw.  #link("#extract.0.barnumbers.apbasera")[`extract.0.barnumbers.apbase`] )

+  Man kann einstellen, wie weit entfgernt Taktnummern / Zählmarken bezogen auf die #strong[Notenmitte oder den Notenrand] positioniert werden (Kapitel  #link("#extract.0.barnumbers.apbase")[`extract.0.barnumbers.apbase`] bzw.  #link("#extract.0.countnotes.apbase")[`extract.0.barnumbers.apbase`] )

#blockquote[
#strong[Hinweis]: Die Positionierung der Taktnummern / Zählmarken kann für jede einzeln über die rechte Maustaste beeinflusst werden.

-  `Konfig bearb.` Da kann man einige Parameter in der Notenbezogenen Konfiguration einstellen
-  `... rechts` Nummer wird rechts von der Note geschrieben. Sie wird dadurch linksbündig.
-  `... links` Nummer wird links von der Note geschrieben. Sie wird dadurch rechtsbündig.
-  verschieben mit der Maus

Zunächst sollte man versuchen, die Nummer auf die andere Seite der Note zu schieben. Damit ergibt sich immer noch eine exakte Ausrichtung und ein bessers Notenbild. Erst dann ist eine manuelle Positionierung mit der Maus sinnvoll.
]

#blockquote[
#strong[Hinweis]: Auch beim manuellen Verschieben wird die Anodnung der Nummer (links/rechts der Note) berücksichtigt und die Ausrichtung (linksbündig/rechtsbündig) entsprechend errechnet. Damit können die Nummern auch bei unterschiedlicher Länge sehr präzise positioniert werden.
]

=== Warnung: "Beschriftung zu dicht beieinander"
#label("warnung-beschriftung-zu-dicht-beieinander")
Diese Warnungen sind experimentell. Sie kommen nur wenn `loglevel warning` eingestellt ist.

#blockquote[
#strong[Hinweis] Noch werden nicht alle Kollisionen sicher erkannt. Es kann auch sein dass Kollisionen gemeldet werden, die gerade noch gehen würden. Das liegt daran dass Zupfnoter die Größe der Texte nicht genau abschätzen kann.
]

Wenn man eine solche Warnung beseitigen will, geht man am besten folgende Schritte:

+  Situation feststellen - dazu selektiert man im Eingabefenster die Note, die rot untertrichen ist.
+  In der Unterlegnotenvorschau wirde die betroffene Note rot hervorgehoben.
+  Dann sieht man auch schon die Kollision. Zunächst sollte man versuchen, über das Kontextmenü die Beschreiftung auf die andere Seite der Note zu schieben. Dann kann man dann durch Verschieben von einer der beteiligten Beschriftungen mit der Maus bereinigen.

#blockquote[
#strong[Hinweis:] Man kann zunächst versuchen die Basis für die Positionierung von Taktnummern / Zählmarken zu verändern. Manchmal lässt sich dadurch die Anzahl der Warnungen zu reduzieren (siehe Kapitel  #link("#barnumberautopos")[Positionierung von Taktnummern und Zählmarken optimieren])
]

=== feste Leerzeichen in Texten
#label("feste-leerzeichen-in-texten")
Zupfnoter wandelt eine Tilde ('~') in Texten in feste Leerzeichen um. Anwendungsfälle hierfür sind:

-  Einrückungen in Liedtexten, so dass Noten ggf. in den Text ragen können
-  Besondere Saitenbeschriftungen, welche Leerzeichen enthalten sollen

#blockquote[
#strong[Hinweis]: Sollte je doch eine Tilde benötigt werden kann diese mit maskiert werden, z.B. '`das\~ist`' ergibt '`das~ist`'.
]

=== Extra Einstellungen für die Notenvorschau
#label("extra-einstellungen-für-die-notenvorschau")
Die Notenvorschau kann durch I: oder "%%" - Zeilen beeinflusst werden. Einhelheiten siehe #link("http://moinejf.free.fr/abcm2ps-doc/index.html")

Häufige Einstellungen bei Zupfnoter sind:

-  `I:measurenb 1` - schreibt Taktnummern in die Notenvorschau. Die Anzeigt ist nur dann korrekt, wenn die Takte die korrekte Länge haben.
-  `I:contbarnb 1` - schreibt fortlaufende Taktnummern auch für Variante Enden. Dies wirkt auch auf die Unterlegnoten
-  `I:staffnonote 2` - zeigt auch leere Notenlinien in der Notenvorschau
-  `I:linewarn 0` - unterdrückt Meldungen über nicht gefüllte oder zu volle Zeilen in der Notenvorschau

Zupfnoter verwendet von sich aus die folgenden Einstellungen:

```
I:titletrim 0
I:measurenb 1
I:contbarnb 1
I:linewarn 0
I:staffnonote 2
```

=== Arbeiten mit Dateivorlagen (Templates)
#label("filetemplates")
Erstellt man über das Menü "Neu" ein neues Stück, fügt Zupfnoter eine Vorlage ein. Standardmäßig ist das die Vorlage für ein vierstimmiges Stück. Dieses legt auch die Konfiguration an welche in Kapitel #link("#bestPracticeExtract")[Praktisches Vorgehen bei der Erstellung von Auszügen] beschrieben ist.

Wenn man z.B. für eine Notenmappe mehrere Stücke mit ähnlichen Einstellungen schreiben will, ist es sinnvoll, die eingebaute Vorlage durch eine projektspezifische Vorlage zu ersetzen, in der schon einige Parameter (z.B. Blattbeschriftungen) vorausgefüllt sind.

Eine Dateivorlage ist eine normale ABC-Datei in der einige Platzhalter eingefügt sind, welche beim erstellen eines neuen Stückes anhand der Benutzereingaben aufgelöst bzw. ausgefüllt werden. Folgende Platzhalter sind verfügbar:

/ `{{song_id}}`: #block[
Das ist die Identifikationsnummer des Stückes `{{filename}}`
Das ist die Basis für den Dateinamen `{{song_title}}`
Das ist der Titel des Stückes.
]

#blockquote[
#strong[Hinweis:] In den Seitenbeschrifungen gibt es weitere Platzhalter, welche jedoch erst bei der Erzeugung der Unterlegnoten aufgelöst werden. Die möglichen Platzhalter werden in der Hilfe bei den Konfigurationsparametern angezeigt.
]

Es gibt in der Statuszeile ein Vorlagenmenü. Dieses ist beschriftet mit der aktuell eingestellten Vorlage.

Für Projektarbeit mit Vorlagen wird folgendes Vorgehen empfohlen:

+  Erstelle ein Beispielstück mit der gewünschen Konfiguration.

  #blockquote[
  #strong[Hinweis]: Verwende für die Seitenbeschriftung die Platzhalter
  ]

+  Konvertiere das Beispielstück in eine Vorlage. Dazu gibt es in Vorlagenmenü der Statuszeile eine Funktion (beschriftet mit der aktuellen Vorlage).

  Dabei werden die Kopfzeilen X: F: T: durch Platzhalter ersetzt. Weiterhin wird das Konfigurationsmaske für die Vorlage aufgerufen. Dort musst du einen Dateinamen für die Vorlage eintragen.

+  Speichere nun die Vorlage über `Speichern`

  #blockquote[
  #strong[Hinweis]: Dabei ist es wichtig, dass die Kopfzeile `F:` einen Platzhalter - Zeichen `{{` enthält. Dadurch wird im "Vorlagen - modus" gespeichert, d.h. der Dateiname wird nicht aus der `F:` - Zeile entnommen sondern aus dem Konfigurationsparameter `template.filebase`.
  ]

+  Aktiviere die so erstellte Vorlage nun über das Vorlagenmenü der Statuszeile.

  #blockquote[
  #strong[Hinweis] Wenn due die Vorlage im Verzeichnis des neuen Projektes speicherst, kannst du in einem Schitt die Vorlage wieder laden und den aktuellen Speicherort auf das Projektverzeichniss stellen. So kannst du einfach zwischen den Projekten wechseln
  ]

+  Wenn du nun ein neues Stück erstellst oder eine XML-Datei importierst, werden die Einstellungen der Vorlage automatisch übernommen.

+  Du kannst die aktuelle Vorlage auch auf ein vorhandenes Stück anwenden. Dazu gibt es im Vorlagenmenü der Statuszeile den Menüeintrag `Auszüge aus Vorlage übernehmen`

+  Du kannst die aktuelle Vorlage auch auf die Zupfnoter-Voreinstellung zurücksetzen.

#blockquote[
#strong[Hinweis]: Die Konfigurationsparameter `template.filebase` werden auch in die neuen Stücke kopiert, haben dort aber keine Wirkung mehr weil die `F:` - zeile nun keinen Platzhalter mehr enthält. Sie sind jedoch als Dokumentation hilfreich, welche Vorlage bei der Erstellung des Stückes verwendet wurde.
]

=== Auflösen von Akkorden
#label("auflösen-von-akkorden")
Manchmal bekommt man XML-Dateien bei denen Mehrklänge nicht auf einzelne Stimmen aufgeteilt sind, ondern in Mehrklängen dargestellt werden. Für Tischharfen kann es vorteilhaft sein, diese Mehrklänge aufzulösen. Hierfür ist folgendes Vorgehen sinnvoll:

+  Die Stimme mit den Mehrklängen kopieren, neu Einfügen und eine neue Stimmnummer vergeben.

+  Alle Noten der neuen Stimme selektieren

+  Im Menü `Bearbeiten / Mehrklang zu erster Note` bzw. `Bearbeiten / Mehrklang zu letzter Note` aufrufen.

Es kann auch sein, dass die Flusslinie bei Mehrklängen am "falschen Ende" anschließt. Bei Sopran sollte die Flußlinie an der höchsten Noten anschließen. Bei den Bass-Stimmen möchte man dagegen dass die Flußlinie and der tiefsten Noten anschließt. Mit folgenden Schritten kann man die erste und letzte Note eines Mehrklanges vertauschen:

#block[
#set enum(numbering: "1.", start: 2)
+  Alle Noten der Stimme selektieren

+  Im Menü `Bearbeiten / Noten` in Mehrklang tauschen\` aufrufen.
]

=== Parameter in der Zupfnoter-URL
#label("parameter-in-der-zupfnoter-url")
In der Adressleiste des Browsers können Parameter übergeben wreden. Das ist für den Benutzer meist nicht erforderlich. Die Parameter werden hier zur Vollständigkeit aufgeführt.

-  `?mode={demo | work}`
-  `?debug`

= Notwendige Änderungen beim Übergang von Zupfnoter 1.xx nach Zupfnoter 2.xx
#label("notwendige-änderungen-beim-übergang-von-zupfnoter-1.xx-nach-zupfnoter-2.xx")
Wenn sich bei einem Programm die erste Stelle der Versionsnummer ändert, muss man ggf. die ABC-Dateien ändern. Auch wenn wir versuchen, diese Änderungen so gering wir möglich zu halten, so sind sie doch nicht zu vermeiden. Manche diese Änderungen stammen aus einer genaueren Interpretation des ABC-Standards.

== Transponieren
#label("transponieren-1")
In Zupfnoter 1.x funktioniert manchmal das `%%transpose` noch. Zupfnoter wirft nun aber einen Fehler.

== Haltebogen
#label("haltebogen")
== Angabe der Geschwindigkeit (Q:)
#label("angabe-der-geschwindigkeit-q")
= Zupfnoter für Experten
#label("zupfnoter-für-experten")
== Zupfnoter Einstellungen
#label("zupfnoter-einstellungen")
=== Persönliche Einstellungen
#label("persönliche-einstellungen")
see https://github.com/bwl21/zupfnoter/issues/71

=== Grundlegende Blatteinstellungen (Konfiguration)
#label("grundlegende-blatteinstellungen")
TODO: text überarbeiten

-  #strong[Titel]: \[extract.x.title\]

  Spezifizert den Titel des Auszugs

  #blockquote[
  #strong[Hinweis:] Der Titel des Auszug ist nicht zu verwechseln mit dem Titel des Musikstücks ( ABC-Kopfzeite "´T:\`")
  ]

-  #strong[Stimmen]: \[extract.x.voices\]

  Spezifiziert, welche Stimmen in dem Auszug dargestellt werden.

-  #strong[Flusslinien] \[extract.x.flowlines\]

  Spezifiziert, welche Stimmen eine Flusslinie erhalten sollen.

-  #strong[Stimmen für layout]: \[extract.x.layoutlines\]

  Zupfnoter errechnet die vertikale Anordnung der Noten aus den einzelnen Notenlängen. Über diese Einstellung wird bestimmt, welche Stimmen in die Berechnung eingehen.

  #blockquote[
  #strong[Hinweis:] man kann sogar eine eigene "Stimme" schreiben, welche nur zur Berechung des Layouts herangezogen, aber nicht auf den Unterlegnoten dargestellt wird. Auf diese Weise kann man man das layout vollständig manuell steuern.
  ]

-  #strong[Sprunglinien:] \[extract.x.jumplines\]

  Diese Einstellung wird bestimmt, für welche Stimmen die Sprunglinien dargestellt werden.

  Wiederholungszeichen in den herkömmlichen Noten werden in den Tisch-Harfen-Noten als Wiederholungslinie dargestellt. In der Regel muss der vertikale Teil der Wiederholungslinie nach rechts verschoben werden, damit er rechts von den Noten liegt und nicht mitten durch das Notenbild der Tisch-Harfen-Noten geht. Die horizontale Position der Sprunglinie wird über die ABC-Notation eingestellt. Dazu wird vor dem entsprechenden Taktstrich z.B. eingegeben:

  "`^@@5 :|`" - der vertikale Teil der Sprunglinie liegt fünf Halbtonschritte #strong[rechts] von der letzten Note des Abschnittes

  "`^@@-5 :|`" - der vertikale Teil der Sprunglinie liegt fünf Halbtonschritte #strong[links] von der letzten Note des Abschnittes

-  #strong[Synchronisationslinien:] (Synchronisationslinie, Querlinie zu Begleitnoten) \[extract.x.synchlines\]

  Diese Einstellung bestimmt, zwischen welchen Stimmen die Synchronisationslinien dargestellt werden.

  #strong[Hinweise:] Synchronisationslinien für Mehrklänge werden immer dargestellt.

-  #strong[Legende]: \[extract.x.legend\]

  Diese Einstellung bestimmt die Position der Legende. Dabei kann die Überschrift des Musikstückes und der Informationsblock separat positioniert werden.

  #strong[Hinweis:] durch Verschieben der Objekte mit der Maus wird diese Einstellung automatisch eingefügt.

-  #strong[Liedtexte:] (Liedtexte) \[extract.x.lyrics\]

  Diese Einstellung bstimmt, wie die Liedtexte im Unterlegnotenblatt positioniert werden.

  #blockquote[
  #strong[Hinweis]: Zupfnoter kann nur die Liedtexte aus der Kopfzeile "`W:`" verarbeiten. In der Abc Notation kann man Liedtexte auch im Kopffeld "`w:`" erfassen, um sie innerhalb der Notenzeilen anzuordnen. Mit bestimmten Symbolen werden Wörter oder Silben den herkömmlichen Noten zugeordnet.
  ]

-  #strong[Seitenbeschriftung:] \[extract.x.notes\]

  TODO Sachverhalte: steht für Noten und für Notizen im Zupfnoter. Vorschlag hier umbenennen in notice oder comment???.

-  #strong[Begleitpausen:] \[extact.x.nonflowrest\]

  Generell werden Pausen in den Begleitnoten (Stimmen ohne Flusslinie) der herkömmlichen Noten und Tisch-Harfen-Noten unterdrückt. Wenn du die Pausen auch in den Begleitstimmen darstellen möchtest, kannst du sie mit dieser Einstellung einschalten.

-  #strong[Startposition:] \[extract.x.startpos\]

  Mit dieser Einstellung kann man die Startposition der Unterlegnoten festlegen. Die Angabe erfolgt in Millimeter und wird vom oberen Blattrand gemessen.

-  #strong[Unterflusslinien]: \[extract.x.subflowlines\]

  Diese Einstellung bestimmt, für welche Stimmen die Unterflusslinien ausgegeben werden. Dies kann sinnvoll bei Begleitnoten sein, die in der Melodie keiner Note zugeordnet werden können oder bei Verzierungsnoten.

-  #strong[Ausgabe:] \[produce\]

  Diese Einstellung bestimmt, welche Auszüge gedruckt werden sollen. Oft wird z.B. der Auszug 0 nur zur Bearbeitung verwendet, aber nicht gedruckt.

  Stimmen (Auszug 0 beinhaltet 100 %)

-  #strong[Layout:] (Gestaltung oder Anordnung) \[extract.x.layout\]

-  #strong[Zählmarken:] \[extraxt.x.coountnotes\]

  Es werden unter jeder Note, abhängig von der Taktart, Zahlen zugeordnet, die die Zählung des Taktes darstellen. Bei einem 4/4 Takt kann das also (1 2 3 4) oder (1 und 2 und 3 und 4 und) sein.

-  #strong[Taktnummern:] \[extract.x.barnumbers\]

  Diese Einstellung bestimmt, an welchen Stimmen die Takte numeriert werden. Ebenso wird Position und Darstellung bestimmt.

== Zupfnoter-spezifische Zusätze
#label("zusaetze")
Zupfnoter verwendet "Annotations" der ABC-Notation mit spezifischen Konventionen. Diese Zusätze stehen vor der Note bzw. dem Taktstrich auf den sie sich beziehen.

Zupfnoter-Annotations beginnen mit einem der Zeichen `:`, `@`, `!`, `#`, `<`, `>`. Beispielsweise bedeutet `"^>"` dass das Notensymbol in den Unterlegnoten nach rechts verschoben werden.

#blockquote[
#strong[Hinweis]: Dieses Zusätze können über Bildschirmmasken komfortabel bearbeitet werden (siehe Kapitel  #link("#masken-fuer-zusaetze")[Masken für Zupfnoter-spezifische Zusätze]).
]

Es gibt folgende Zusätze:

-  #strong[`^:`] - Sprungziel: Damit kannst du ein Ziel festlegen zu dem eine Sprunglinie gezeichnet werden kann. Damit kannst du beliebige Sprünge darstellen.

-  #strong[`^@`] - Sprung: Damit kannst du eine Sprunglinie erzeugen. Beispiele: `@p1@3`, `@@-4`

-  #strong[`^!`] - Notenbeschriftung: Damit kannst du eine Beschriftung an eine Note in den Umterlegnoten anbringen

  Beispiel:

  `"^"this is my note@5,2"` schreibt eine Beschriftung 5 mm rechts, 2mm unter die Note

-  #strong[`^#`] - Ref. Notenbeschriftung: Damit kannst du eine Beschriftung mit einem vordefinierten Text (Beschriftungsvorlage) anbringen

-  #strong[`^>`] - Rechtsverschiebung: Verschiebt das Notensymbol in den Unterlegnoten nach rechts

-  #strong[`^<`] - Linksverschiebung: Verschiebt das Notensybmol in den Unterlegnoten nach links

-  #strong[\[r:n\_11\]] - Verschiebemarke: Das ist eine eingebettete Kopfzeile der ABC-Notation. Wenn man mit der Maus Elemente im Unterlegnotenblatt verschiebt, wird diese Verschiebung in der Konfiguration abgespeichert (`notebound`). Die Referenz wird dann über den Namen der Verschiebemarke hergestellt.

  #blockquote[
  #strong[Hinweis]: Wenn keine Verschiebemarke vorhanden ist, wird diese Referenz über die Zeitachse hergestellt. Daher geht diese Verbindung eventuell verloren, wenn das Zeitgefüge des Musikstückes verändert wird. Das kann durch Einfügen einer Verschiebemarke verhindert werden.
  ]

= Best practice
#label("best-practice")
TODO: stay tunend

-  guter ton der harfennoten
-  Zusammenarbeitsmodelle
-  bewährte Auszüge
-  Legende
  -  Vorname, Nachname, Jahresangaben von Komponist, Teexter
-  Abdrucksrechte
-  Hinweis: bitte nicht kopieren …

= ABC Tutorial
#label("abc-tutorial")
todo Penzing

= Konfiguration der Ausgabe
#label("konfiguration")
Dieses Kapitel beschreibt die Konfiguration der Erstellung der Unterlegnotenblätter. Das Kapitel ist als Referenz aufgebaut. Die einzelnen Konfigurationsparameter werden in alphabetischer Reihenfolge aufgeführt. Bei den einzelnen Parametern wird der Text der Online-Hilfe, sowie die Voreinstellungen des Systems dargestellt.

#blockquote[
#strong[Hinweis]: Auch wenn in den Bildschirmmasken die Namen der Konfigurationsparameter übersetzt sind, so basiert diese Referenz den englischen Namen.
]

#blockquote[
#strong[Hinweis]: Manche Konfigurationsparameter können mehrfach auftreten (z.B. `extract`). In diesem Kapitel wird dann immer die Instanz mit der Nr. 0 (z.B. `extract.0`) beschrieben.
]

== `annotations` - Notenbeschriftungsvorlagen
#label("annotations")
Hier kannst du eine Liste von Beschriftungsvorlagen angeben.

Zupfnoter bringt einige solcher Definitionen bereits mit.

Diese Beschriftungsvorlagen kannst du über "Zusatz einfügen" mit einer Note verbinden (Notenbeschriftung).

```
    "annotations": {
      "rit" : {"pos": [2, -5], "style": "italic", "text": "rit"},
      "vb"  : {"pos": [-1, 2], "text": "v"},
      "vl"  : {"pos": [-5, -5], "text": "v"},
      "vr"  : {"pos": [2, -5], "text": "v"},
      "vt"  : {"pos": [-1, -5], "text": "v"}
    }
      
```

== `annotations.rit` - rit
#label("annotations.rit")
TODO: Helptext für annotations.rit einfügen

```
    "rit": {"pos": [2, -5], "style": "italic", "text": "rit"}
      
```

== `annotations.rit.pos` - Position
#label("annotations.rit.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [2, -5]
      
```

== `annotations.rit.style` - Stil
#label("annotations.rit.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "italic"
      
```

== `annotations.rit.text` - Text
#label("annotations.rit.text")
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-  `{{composer}}`: Komponist aus `C:` Zeilen

-  `{{current_year}}`: das aktuelle Jahr

-  `{{key}}`: Tonart aus `K:` Zeile

-  `{{meter}}`: Taktart aus `M:` Zeile

-  `{{number}}`: Nummer aus `X:` Zeile

-  `{{o_key}}`: Originaltonart

-  `{{tempo}}`: Tempo aus `Q:`Zeile

-  `{{title}}`: Titel aus `T:` Zeilen

-  `{{extract_title}}`: titel des auszgs aus "extract.\*.title",

-  `{{extract_filename}}`: Filenamenszusatz aus "extract.\*.filenamepart"},

-  `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden die entsprechneden Filenamenzusätze ausgegeben.

-  `{{watermark}}`: Wasserzeichen (mit `setsettings wartermark "wasserzeichen"` eingestellt)

  ```
  "text": "rit"
  ```

== `annotations.vb` - Dämpfer unter der Note
#label("annotations.vb")
TODO: Helptext für annotations.vb einfügen

```
    "vb": {"pos": [-1, 2], "text": "v"}
      
```

== `annotations.vb.pos` - Position
#label("annotations.vb.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [-1, 2]
      
```

== `annotations.vb.text` - Text
#label("annotations.vb.text")
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-  `{{composer}}`: Komponist aus `C:` Zeilen

-  `{{current_year}}`: das aktuelle Jahr

-  `{{key}}`: Tonart aus `K:` Zeile

-  `{{meter}}`: Taktart aus `M:` Zeile

-  `{{number}}`: Nummer aus `X:` Zeile

-  `{{o_key}}`: Originaltonart

-  `{{tempo}}`: Tempo aus `Q:`Zeile

-  `{{title}}`: Titel aus `T:` Zeilen

-  `{{extract_title}}`: titel des auszgs aus "extract.\*.title",

-  `{{extract_filename}}`: Filenamenszusatz aus "extract.\*.filenamepart"},

-  `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden die entsprechneden Filenamenzusätze ausgegeben.

-  `{{watermark}}`: Wasserzeichen (mit `setsettings wartermark "wasserzeichen"` eingestellt)

  ```
  "text": "v"
  ```

== `annotations.vl` - 'V' links
#label("annotations.vl")
Hier siehst du ein Beispiel für eine Notenbeschriftung (hier mit dem Namen `vl`). \
Diese dient dazu ein "V" an die Harfennote zu drucken um anzudeuten, dass die Saite nach Ablauf des Notenwertes abgedämpft werden soll.

```
    "vl": {"pos": [-5, -5], "text": "v"}
      
```

== `annotations.vl.pos` - Position
#label("annotations.vl.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [-5, -5]
      
```

== `annotations.vl.text` - Text
#label("annotations.vl.text")
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-  `{{composer}}`: Komponist aus `C:` Zeilen

-  `{{current_year}}`: das aktuelle Jahr

-  `{{key}}`: Tonart aus `K:` Zeile

-  `{{meter}}`: Taktart aus `M:` Zeile

-  `{{number}}`: Nummer aus `X:` Zeile

-  `{{o_key}}`: Originaltonart

-  `{{tempo}}`: Tempo aus `Q:`Zeile

-  `{{title}}`: Titel aus `T:` Zeilen

-  `{{extract_title}}`: titel des auszgs aus "extract.\*.title",

-  `{{extract_filename}}`: Filenamenszusatz aus "extract.\*.filenamepart"},

-  `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden die entsprechneden Filenamenzusätze ausgegeben.

-  `{{watermark}}`: Wasserzeichen (mit `setsettings wartermark "wasserzeichen"` eingestellt)

  ```
  "text": "v"
  ```

== `annotations.vr` - 'V' rechts
#label("annotations.vr")
```
    "vr": {"pos": [2, -5], "text": "v"}
      
```

== `annotations.vr.pos` - Position
#label("annotations.vr.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [2, -5]
      
```

== `annotations.vr.text` - Text
#label("annotations.vr.text")
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-  `{{composer}}`: Komponist aus `C:` Zeilen

-  `{{current_year}}`: das aktuelle Jahr

-  `{{key}}`: Tonart aus `K:` Zeile

-  `{{meter}}`: Taktart aus `M:` Zeile

-  `{{number}}`: Nummer aus `X:` Zeile

-  `{{o_key}}`: Originaltonart

-  `{{tempo}}`: Tempo aus `Q:`Zeile

-  `{{title}}`: Titel aus `T:` Zeilen

-  `{{extract_title}}`: titel des auszgs aus "extract.\*.title",

-  `{{extract_filename}}`: Filenamenszusatz aus "extract.\*.filenamepart"},

-  `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden die entsprechneden Filenamenzusätze ausgegeben.

-  `{{watermark}}`: Wasserzeichen (mit `setsettings wartermark "wasserzeichen"` eingestellt)

  ```
  "text": "v"
  ```

== `annotations.vt` - 'V' oben
#label("annotations.vt")
```
    "vt": {"pos": [-1, -5], "text": "v"}
      
```

== `annotations.vt.pos` - Position
#label("annotations.vt.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [-1, -5]
      
```

== `annotations.vt.text` - Text
#label("annotations.vt.text")
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-  `{{composer}}`: Komponist aus `C:` Zeilen

-  `{{current_year}}`: das aktuelle Jahr

-  `{{key}}`: Tonart aus `K:` Zeile

-  `{{meter}}`: Taktart aus `M:` Zeile

-  `{{number}}`: Nummer aus `X:` Zeile

-  `{{o_key}}`: Originaltonart

-  `{{tempo}}`: Tempo aus `Q:`Zeile

-  `{{title}}`: Titel aus `T:` Zeilen

-  `{{extract_title}}`: titel des auszgs aus "extract.\*.title",

-  `{{extract_filename}}`: Filenamenszusatz aus "extract.\*.filenamepart"},

-  `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden die entsprechneden Filenamenzusätze ausgegeben.

-  `{{watermark}}`: Wasserzeichen (mit `setsettings wartermark "wasserzeichen"` eingestellt)

  ```
  "text": "v"
  ```

== `extract` - Auszug
#label("extract")
Hier kannst du Auszüge für deine Unterlegnoten definieren. Das ist besonders bei mehrstimmigen Sätzen sinnvoll.

#blockquote[
#strong[Hinweis]: Einstellungen im Auszug 0 wirken auf die anderen Auszüge, sofern sie dort nicht überschrieben werden.
]

`extract.0` spezifiziert den Auszug 0; `extract.1` spezifiziert den Auszug 1 usw.

```
    "extract": {
      "0" : {
        "barnumbers"   : {
          "apanchor" : "box",
          "apbase"   : [1, 1],
          "autopos"  : true,
          "pos"      : [6, -4],
          "prefix"   : "",
          "style"    : "small_bold",
          "voices"   : []
        },
        "chords"       : {
          "apanchor" : "box",
          "apbase"   : [1, -0.5],
          "autopos"  : true,
          "pos"      : [3, -2],
          "style"    : "large",
          "voices"   : []
        },
        "countnotes"   : {
          "apanchor" : "box",
          "apbase"   : [1, -0.5],
          "autopos"  : true,
          "pos"      : [3, -2],
          "style"    : "smaller",
          "voices"   : []
        },
        "flowlines"    : [1, 3],
        "images"       : {},
        "jumplines"    : [1, 3],
        "layout"       : {
          "DRAWING_AREA_SIZE" : [400, 282],
          "ELLIPSE_SIZE"      : [3.5, 1.7],
          "LINE_MEDIUM"       : 0.3,
          "LINE_THICK"        : 0.5,
          "LINE_THIN"         : 0.1,
          "PITCH_OFFSET"      : -43,
          "REST_SIZE"         : [4, 2],
          "X_OFFSET"          : 2.8,
          "X_SPACING"         : 11.5,
          "beams"             : false,
          "bottomup"          : false,
          "color"             : {
            "color_default"  : "black",
            "color_variant1" : "grey",
            "color_variant2" : "dimgrey"
          },
          "instrument"        : "37-strings-g-g",
          "jumpline_anchor"   : [3, 1],
          "limit_a3"          : true,
          "packer"            : {
            "pack_max_spreadfactor" : 2,
            "pack_method"           : 0,
            "pack_min_increment"    : 0.2
          },
          "tuning"            : "fixed"
        },
        "layoutlines"  : [1, 2, 3, 4],
        "legend"       : {
          "align"  : "r",
          "pos"    : [320, 7],
          "spos"   : [320, 27],
          "style"  : "regular",
          "tstyle" : "large"
        },
        "lyrics"       : {},
        "nonflowrest"  : false,
        "notes"        : {},
        "printer"      : {
          "a3_offset"   : [0, 0],
          "a4_offset"   : [-5, 0],
          "a4_pages"    : [0, 1, 2],
          "show_border" : false
        },
        "repeatsigns"  : {
          "left"   : {"pos": [-7, -2], "style": "bold", "text": "|:"},
          "right"  : {"pos": [5, -2], "style": "bold", "text": ":|"},
          "voices" : []
        },
        "sortmark"     : {"fill": true, "show": false, "size": [2, 4]},
        "startpos"     : 15,
        "stringnames"  : {
          "marks" : {"hpos": [43, 55, 79], "vpos": [11]},
          "style" : "small",
          "text"  : "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
          "vpos"  : []
        },
        "subflowlines" : [2, 4],
        "synchlines"   : [[1, 2], [3, 4]],
        "title"        : "alle Stimmen",
        "tuplets"      : {"text": "{{tuplet}}"},
        "voices"       : [1, 2, 3, 4]
      },
      "1" : {"title": "Sopran, Alt", "voices": [1, 2]},
      "2" : {"title": "Tenor, Bass", "voices": [3, 4]},
      "3" : {"title": "Melodie", "voices": [1]}
    }
      
```

== `extract.0.barnumbers` - Taktnummern
#label("extract.0.barnumbers")
Hier kannst du angeben, wie Taktnummern in deinem Unterlegnotenblatt ausgegeben werden sollen.

```
    "barnumbers": {
      "apanchor" : "box",
      "apbase"   : [1, 1],
      "autopos"  : true,
      "pos"      : [6, -4],
      "prefix"   : "",
      "style"    : "small_bold",
      "voices"   : []
    }
      
```

== `extract.0.barnumbers.apanchor` - autom. pos. Anker
#label("extract.0.barnumbers.apanchor")
Hier kannst du die vertikale Verankerung der Taktnummer an der Note einstellen.

-  `center`: die Taktnummer wird an der Mitte der Note verankert
-  `box`: die Taktnummer wird am unteren Rand der Note verankert

#blockquote[
#strong[Hinweise]:

-  Dieser Parameter wirkt nur bei automatischer Positionierung der Taktnummern.

-  Die horizontale Verankerung der Taktnummer wird automatisch so berechet, dass die Taktnummer gegenüber der eingehenden Flusslinie steht.
]

```
    "apanchor": "box"
      
```

== `extract.0.barnumbers.apbase` - autom. pos. Basis
#label("extract.0.barnumbers.apbase")
Hier kannst du die Grundlage für die automatische Positionierung von Taktnummern einstellen.

Es werden zwei Werte erwartet: horizontal, vertikal.

-  Positive Werte schieben die Taktnummer #strong[weiter] von der Note weg.
-  Negative Werte schieben die Taktnummer #strong[näher] an die Note heran.

#blockquote[
#strong[Hinweise]: Die horizontale Verankerung der Taktnummer wird automatisch so berechet, dass die Taktnummer gegenüber der ausgehenden Flusslinie steht.

Eine bewährte Eingabe ist:

-  `center`: `1,0`
-  `box`: `1,-1`
]

```
    "apbase": [1, 1]
      
```

== `extract.0.barnumbers.autopos` - autom. pos.
#label("extract.0.barnumbers.autopos")
Hier kannst du die automatische Positionierung einschalten. Dabei werden Zählmarken bzw. Taktnummern abhängig von der Größe der Noten platziert. Wenn diese Option ausgeschaltet, gelten die Werte von `pos`. Dies kann bei manchen Stücken eine sinnvollere Einstellugn sein.

Die Zählmarken/Taktnummer lassen sich weiterhin mit der Maus verschieben.

```
    "autopos": true
      
```

== `extract.0.barnumbers.pos` - Position
#label("extract.0.barnumbers.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [6, -4]
      
```

== `extract.0.barnumbers.prefix` - Präfix
#label("extract.0.barnumbers.prefix")
Hier kannst du einen Text angeben, der z.B. vor der Taktnummeer ausgegeben werden soll (Präfix).

```
    "prefix": ""
      
```

== `extract.0.barnumbers.style` - Stil
#label("extract.0.barnumbers.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "small_bold"
      
```

== `extract.0.barnumbers.voices` - Stimmen
#label("extract.0.barnumbers.voices")
Hier kannst du eine Liste der Stimmen angeben, die Taktnummern bekommen sollen.

```
    "voices": []
      
```

== `extract.0.chords` - Akkordsymbole
#label("extract.0.chords")
Hier kannst du die Darstellung von Akkordsymbolen einstellen. Akkordsymbole werden aus den Akkorden im ABC-code abgeleitet. Diese Funktion ist in erster Linie für Akkordzithern gedacht.

```
    "chords": {
      "apanchor" : "box",
      "apbase"   : [1, -0.5],
      "autopos"  : true,
      "pos"      : [3, -2],
      "style"    : "large",
      "voices"   : []
    }
      
```

== `extract.0.chords.apanchor` - autom. pos. Anker
#label("extract.0.chords.apanchor")
Hier kannst du die vertikale Verankerung der eines notenbezogenen Objektes an der Note einstellen.

-  `center`: das Objekt wird an der Mitte der Note verankert

-  `box`: das Objekt wird am unteren Rand der Note verankert

  ```
  "apanchor": "box"
  ```

== `extract.0.chords.apbase` - autom. pos. Basis
#label("extract.0.chords.apbase")
Hier kannst du die Grundlage für die automatische Positionierung von notenbezogenen Objekten einstellen.

Es werden zwei Werte erwartet: horizontal, vertikal.

-  Positive Werte schieben das Objekt #strong[weiter] von der Note weg.

-  Negative Werte schieben das Objekt #strong[näher] an die Note heran.

  ```
  "apbase": [1, -0.5]
  ```

== `extract.0.chords.autopos` - autom. pos.
#label("extract.0.chords.autopos")
Hier kannst du die automatische Positionierung einschalten. Dabei werden Zählmarken bzw. Taktnummern abhängig von der Größe der Noten platziert. Wenn diese Option ausgeschaltet, gelten die Werte von `pos`. Dies kann bei manchen Stücken eine sinnvollere Einstellugn sein.

Die Zählmarken/Taktnummer lassen sich weiterhin mit der Maus verschieben.

```
    "autopos": true
      
```

== `extract.0.chords.pos` - Position
#label("extract.0.chords.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [3, -2]
      
```

== `extract.0.chords.style` - Stil
#label("extract.0.chords.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "large"
      
```

== `extract.0.chords.voices` - Stimmen
#label("extract.0.chords.voices")
Hier gibst du eine Liste von Sstimmen als (durch Komma getrennte) Liste von Nummern an. Die Nummer ergibt sich aus der Reihnfolge in der `%%score` - Anweisung in der ABC-Notation.

```
    "voices": []
      
```

== `extract.0.countnotes` - Zählmarken
#label("extract.0.countnotes")
Hier kannst du angeben, ob und wie Zählmarken in deinem Unterlegnotenblatt ausgegeben werden sollen.

Zählmarken sind hilfreich, um sich ein Stück erarbeiten. Sie geben Hilfestellung beim einhalten der vorgegebenen Notenweret.

```
    "countnotes": {
      "apanchor" : "box",
      "apbase"   : [1, -0.5],
      "autopos"  : true,
      "pos"      : [3, -2],
      "style"    : "smaller",
      "voices"   : []
    }
      
```

== `extract.0.countnotes.apanchor` - autom. pos. Anker
#label("extract.0.countnotes.apanchor")
Hier kannst du die vertikale Verankerung der Zählmarke an der Note einstellen.

-  `center`: die Zählmarke wird an der Mitte der Note verankert
-  `box`: die Zählmarke wird am unteren Rand der Note verankert

#blockquote[
#strong[Hinweise]:

-  Dieser Parameter wirkt nur bei automatischer Positionierung der Zählmarken.
-  Die horizontale Verankerung der Zählmarke wird automatisch so berechet, dass die Zählmarke gegenüber der eingehenden Flusslinie steht.
]

```
    "apanchor": "box"
      
```

== `extract.0.countnotes.apbase` - autom. pos. Basis
#label("extract.0.countnotes.apbase")
Hier kannst du die Grundlage für die automatische Positionierung von Zählmarken einstellen.

Es werden zwei Werte erwartet: horizontal, vertikal.

-  Positive Werte schieben die Zählmarke #strong[weiter] von der Note weg.
-  Negative Werte schieben die Zählmarke #strong[näher] an die Note heran.

#blockquote[
#strong[Hinweise]: Die horizontale Verankerung der Zählmarke wird automatisch so berechet, dass die Zählmarke gegenüber der eingehenden Flusslinie steht.

Eine bewährte Eingabe ist:

-  `center`: `1,0`
-  `box`: `1,-0.5`
]

```
    "apbase": [1, -0.5]
      
```

== `extract.0.countnotes.autopos` - autom. pos.
#label("extract.0.countnotes.autopos")
Hier kannst du die automatische Positionierung einschalten. Dabei werden Zählmarken bzw. Taktnummern abhängig von der Größe der Noten platziert. Wenn diese Option ausgeschaltet, gelten die Werte von `pos`. Dies kann bei manchen Stücken eine sinnvollere Einstellugn sein.

Die Zählmarken/Taktnummer lassen sich weiterhin mit der Maus verschieben.

```
    "autopos": true
      
```

== `extract.0.countnotes.pos` - Position
#label("extract.0.countnotes.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [3, -2]
      
```

== `extract.0.countnotes.style` - Stil
#label("extract.0.countnotes.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "smaller"
      
```

== `extract.0.countnotes.voices` - Stimmen
#label("extract.0.countnotes.voices")
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, die Zählmarken bekommen sollen.

```
    "voices": []
      
```

== `extract.0.flowlines` - Flußlinien
#label("extract.0.flowlines")
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, für die Flußlinien eingezeichnet werden sollen.

```
    "flowlines": [1, 3]
      
```

== `extract.0.images` - Bilder
#label("extract.0.images")
Hier kannst du einstellen, welche Bilder auf dem Notenblatt erscheinen sollen.

```
    "images": {}
      
```

== `extract.0.jumplines` - Sprunglinien
#label("extract.0.jumplines")
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, für die Sprunglinien eingezeichnet werden sollen.

```
    "jumplines": [1, 3]
      
```

== `extract.0.layout` - Layout
#label("extract.0.layout")
Hier kannst du die Parameter für das Layout eintsllen. Damit lässt das Notenbild gezielt optimieren.

```
    "layout": {
      "DRAWING_AREA_SIZE" : [400, 282],
      "ELLIPSE_SIZE"      : [3.5, 1.7],
      "LINE_MEDIUM"       : 0.3,
      "LINE_THICK"        : 0.5,
      "LINE_THIN"         : 0.1,
      "PITCH_OFFSET"      : -43,
      "REST_SIZE"         : [4, 2],
      "X_OFFSET"          : 2.8,
      "X_SPACING"         : 11.5,
      "beams"             : false,
      "bottomup"          : false,
      "color"             : {
        "color_default"  : "black",
        "color_variant1" : "grey",
        "color_variant2" : "dimgrey"
      },
      "instrument"        : "37-strings-g-g",
      "jumpline_anchor"   : [3, 1],
      "limit_a3"          : true,
      "packer"            : {
        "pack_max_spreadfactor" : 2,
        "pack_method"           : 0,
        "pack_min_increment"    : 0.2
      },
      "tuning"            : "fixed"
    }
      
```

== `extract.0.layout.DRAWING_AREA_SIZE` - Zeichenfl.Größe
#label("extract.0.layout.DRAWING_AREA_SIZE")
Hier gibst du die Größe der Zeichenfläche an. Die Größe wird als #emph[breite], #emph[höhe] angegeben.

```
    "DRAWING_AREA_SIZE": [400, 282]
      
```

== `extract.0.layout.ELLIPSE_SIZE` - Notengröße
#label("extract.0.layout.ELLIPSE_SIZE")
Hier kannst du die Größe der ganzen Noten einstellen. Sinnvolle Werte sind \[2-4, 1.2-2\].

#blockquote[
#strong[Hinweis]: Die Größe der anderen Noten werden ausgehend von diesem Wert berechnet.

Da die Noten auch mit der dicken Linie umrandet werden, kann auch die "Linienstärke `dick`" reeduziert werden, um ein filigraneres Notenbild zu erhalten.
]

```
    "ELLIPSE_SIZE": [3.5, 1.7]
      
```

== `extract.0.layout.LINE_MEDIUM` - Linienstärke mittel
#label("extract.0.layout.LINE_MEDIUM")
Hier stellst du die Breite (in mm) von mittelstarken Linien ein.

```
    "LINE_MEDIUM": 0.3
      
```

== `extract.0.layout.LINE_THICK` - Linienstärke dick
#label("extract.0.layout.LINE_THICK")
Hier stellst du die Breite (in mm) von dicken Linien ein.

```
    "LINE_THICK": 0.5
      
```

== `extract.0.layout.LINE_THIN` - Linienstärke dünn
#label("extract.0.layout.LINE_THIN")
Hier stellst du die Breite (in mm) von dünnen Linien ein.

```
    "LINE_THIN": 0.1
      
```

== `extract.0.layout.PITCH_OFFSET` - PitchOffset
#label("extract.0.layout.PITCH_OFFSET")
Dieser Paramter justiert das Verhältnis von Tonhöhe und Position auf dem Blatt. Die Angabe ist der negative MIDI-Wert der Note, die am linken Blattrand dargestellt wird.

#blockquote[
#strong[Hinweis] Bei #strong[chromatischen] Instrumenten wird die Stimmung der Saiten von Zupfnoter berechnet. Daher sorgt der Wert -43 dafür, dass das G der Oktave 3 am linken Blattrand erscheint.

Die Midi-Codes findest du auf #link("http://www.electronics.dit.ie/staff/tscarff/Music_technology/midi/midi_note_numbers_for_octaves.htm")[hier]

Bei #strong[diatonischen] Instrumenten muss der Wert ggf. durch Ausprobieren ermittelt werden, da dort die Stimmung der Saiten fest verdrahtet ist. Üblicherweise ist er 0. Man könnte aber durch Werte von -12 bzw. +12 eine Art "Transponierung" errreichen. Das ist dann sinnvoll, wenn die selben Eingabenoten für verschiedene Instrumente verwendet werden sollen.
]

```
    "PITCH_OFFSET": -43
      
```

== `extract.0.layout.REST_SIZE` - Pausengröße
#label("extract.0.layout.REST_SIZE")
Hier kannst du die Größe der Pausen einstellen. Sinnvolle Werte sind \[2-4, 1.2-2\]

#blockquote[
#strong[Hinweis]:Bitte beachte, dass nur die Angabe der Höhe von berücksichtigt wird, da das Pausensymbol nicht verzerrt werden darf.
]

```
    "REST_SIZE": [4, 2]
      
```

== `extract.0.layout.X_OFFSET` - X - Offset
#label("extract.0.layout.X_OFFSET")
Hier gibst du an, wie weit das Druckbild auf dem A3-Blatt von links nach rechts geschoben werden soll.

#blockquote[
Hinweis: es gibt zusätzliche Möglichkeiten, das Blatt auf dem Drucker zu verschieben `extract.0.printer`
]

```
    "X_OFFSET": 2.8
      
```

== `extract.0.layout.X_SPACING` - Saitenabstand
#label("extract.0.layout.X_SPACING")
Hier gibst du den Saitenabstand in mm an. Normalerweise ist das 11.5 mm.

```
    "X_SPACING": 11.5
      
```

== `extract.0.layout.beams` - Notenhälse
#label("extract.0.layout.beams")
Hier kannst du einstellen, ob die Noten mit Notenhälsen dargestellt werden. Noten mit Notenhälsen orientieren sich mehr an der traditionellen Notenschrift, brauchen aber mehr Plat. Alle Noten werden gleich groß dargeestellt.

```
    "beams": false
      
```

== `extract.0.layout.bottomup` - Spiel aufwärts
#label("extract.0.layout.bottomup")
Hier kannst du einstellen, ob die Noten von unten nach oben geschrieben werden. Manche Spieler (Spieler der Okon-Harfe) bevorzugen diese Darstellung, weil dabei die Hand nicht mehr die nächsten Noten verdeckt.

#blockquote[
#strong[Hinweis] Die Taktstriche werden weiterhin oberhalb der Noten gezeichnet. Aber die Position von Taktnummern und Zählmarken wird angepasst.
]

```
    "bottomup": false
      
```

== `extract.0.layout.color` - Farbeinstellung
#label("extract.0.layout.color")
Hier kannst du die Farbe für verschiedene Elemente einstellen.

#blockquote[
#strong[Hinweis] Die Farbe werden über die "HTML" - Namen angegegeben. Dort ist `grey` ist dunkler als `darkgrey` :-)
]

#blockquote[
#strong[Hinweis] Die Farbe von varianten Abnschnitten alterniert zwischen variant1 und variant2. Wenn du beide gleich einstellst, dann werden die varianten Abschnitte gleichermassen eingefärbt.

Wenn du beide auf den gleichen wert wie "default" stellst, dann werden variante Abschnitte nicht mehr durch Farbe abgesetzt.
]

```
    "color": {
      "color_default"  : "black",
      "color_variant1" : "grey",
      "color_variant2" : "dimgrey"
    }
      
```

== `extract.0.layout.color.color_default` - Sonstiges
#label("extract.0.layout.color.color_default")
Hier wählst die Grundfarbe für die Ausgabe. Diese Farbe wird bei allen Elementen verwendet, die keine spzeifische Farbeinstellung haben.

```
    "color_default": "black"
      
```

== `extract.0.layout.color.color_variant1` - Variante1
#label("extract.0.layout.color.color_variant1")
Hier wählst du die Farbe in der variante Abschnitte 1, 3, 5 etc. dargestellt werden.

#blockquote[
#strong[Hinweis] Die Farbe von varianten Abnschnitten alterniert zwischen variant1 und variant2. Wenn du beide gleich einstellst, dann werden die varianten Abschnitte gleichermassen eingefärbt.

Wenn du beide auf den gleichen wert wie "default" stellst, dann werden variante Abschnitte nicht mehr durch Farbe abgesetzt.
]

```
    "color_variant1": "grey"
      
```

== `extract.0.layout.color.color_variant2` - Variante2
#label("extract.0.layout.color.color_variant2")
Hier wählst du die Farbe in der variante Abschnitte 2,4,6 etc. dargestellt werden.

#blockquote[
#strong[Hinweis] Die Farbe von varianten Abnschnitten alterniert zwischen variant1 und variant2. Wenn du beide gleich einstellst, dann werden die varianten Abschnitte gleichermassen eingefärbt.

Wenn du beide auf den gleichen wert wie "default" stellst, dann werden variante Abschnitte nicht mehr durch Farbe abgesetzt.
]

```
    "color_variant2": "dimgrey"
      
```

== `extract.0.layout.instrument` - Instrument
#label("extract.0.layout.instrument")
Hier gibst du den Namen des Instrumentes an. Die Angabe bewirkt spezifische Verarbeitungen, z.B. die Anpassung der Tonhöhe zur Saite (bei `saitenspiel` als diatonischem Instrument ist das nicht linear).

Es gibt folgende Einstellungen:

-  #strong[`37-string-g-g`]: das ist die 37-saitige Harfe

-  #strong[`25-string-g-g`]: das ist die 25-saitige Harfe

-  #strong[`18-string-b-e`]: das ist die 18-saitige Harfe gestimmt von B bis e

-  #strong[`saitenspiel`]: das ist ein diatonisch gestimmtes Saitenspiel mit einer G-Bass-Saite

-  #strong[`Zipino`]: das ist ein diatonisch gestimmtes Saitenspiel mit einer G-Bass-Saite

-  #strong[`okon-*`]: Tischharfe von okon-guitar.de. Dieses Instrument hat Klappen für die Anpassung der Tonart. Daher gibt es hier veschiedene varianten

-  #strong[`Akkordzither`]: Für die Akkordzither gibt es verschiedene Varianten und Stimmungen. Bitte experimentieren Sie mit den Saitennamen.

-  #strong[`klein-a4`] ein Instrument bei dem die Unterlegnonten auf ein A4-Blatt passen.

  ```
  "instrument": "37-strings-g-g"
  ```

== `extract.0.layout.jumpline_anchor` - Sprungl.Anker
#label("extract.0.layout.jumpline_anchor")
Hier stellst du ein, wie die Sprunglinien an den entsprechenden Noten verankert werden. Bitte gib zwei Werte (X, Y) getrennt durch ein Komma an. Die Angabe erfolgt in mm und bezieht sich auf den Rand (genauer gesagt, das umhüllende Rechteck) der entsprechende Note.

```
    "jumpline_anchor": [3, 1]
      
```

== `extract.0.layout.limit_a3` - Begrenzung auf A3
#label("extract.0.layout.limit_a3")
Diese Funktion verschiebt Noten am A3-Blattrand nach innen. Da das Unterlegnotenblatt etwas größer ist als A3 würde sonst die Note angeshnitten.

```
    "limit_a3": true
      
```

== `extract.0.layout.packer` - Packer
#label("extract.0.layout.packer")
Hier kannst du weitere Einzelheiten für die vertikale Anordnung der Noten konfigurieren. Es sind subtile Feinheiten, welche den Unterschied ausmachen. Daher sind diese Funktionen noch experimentell.

```
    "packer": {
      "pack_max_spreadfactor" : 2,
      "pack_method"           : 0,
      "pack_min_increment"    : 0.2
    }
      
```

== `extract.0.layout.packer.pack_max_spreadfactor` - max. Spreizung
#label("extract.0.layout.packer.pack_max_spreadfactor")
Nach der Berechnung des maximal komprimierten Layouts versucht Zufpnoter, dieses so weit zu spreizen, dass die Zeichenfläche voll ausgefüllt wird.

Dieser Faktor bestimmt, wie weit das maximal komprimierte Layout in der Vertikalen gespreizt werden soll. Das wirkt sich bei kurzen Stücken aus, welche das Blatt nicht vollständig ausfüllen.

Bei sehr kurzen Stücken ist es sinnvoll, die Spreizung zu begrenzen, weil sonst die Noten sehr weit auseinander liegen.

```
    "pack_max_spreadfactor": 2
      
```

== `extract.0.layout.packer.pack_method` - Packmethode
#label("extract.0.layout.packer.pack_method")
Hier kannst du die pack-Methode auswählen

-  #strong[0] : Die bisherige Methode: diese geht nach jedem Schritt um die Höhe der größten Note weiter

-  #strong[1] : Kopmpakt: diese geht nur dann weiter, wenn

  -  ein Richtungswechsel der Melodie vorliegt
  -  Noten übereinander gezeichnet würden

  Das bedeutet dass bei monotonen Melodien die Noten enger gesetzt werden.

  #blockquote[
  #strong[Hinweis]: Diese Methode eignet sich am besten für lange, einstimmige Stücke. Die Platzeinsparung geht bei mehrstimmmigen Stücken schnell verloren.

  Bei dieser Methode sind die Synchronisiationslinien zwischen den Stimmen nicht immer gut sichtbar weil die Flusslinien ggf. sehr flach sind.
  ]

-  #strong[2] : linear: die Zeitachse wird linear auf das Blatt verteilt. Bei kurzen Stücken entspricht der Abstand der Noten dann auch dem Notenwert. Manche Spieler empfinden das als hilfreich. Es wird aber am meisten Platz verbraucht.

  Es wird auch kein extra Raum für Parts, Taktstriche und manuelle Vorschübe erstellt.

  ```
  "pack_method": 0
  ```

== `extract.0.layout.packer.pack_min_increment` - min. Inkrement
#label("extract.0.layout.packer.pack_min_increment")
Dieser Faktor bestimmt, wie weit pro Note auf jeden Fall weiter gerückt wird. Pro Note wird mindestens um diesen Anteil einer Maximalnote weiter geschaltet.

#strong[Beispiele]:

-  #strong[0.0]: es entstehen horizontale Flußlinien

-  #strong[1.0]: es wird mindests um eine ganze Note weiter geschaltet

-  #strong[0.2]: es wird um 20% einer ganzen Note weiter geschaltet. Dies liefert angenehme Ergebnisse.

  ```
  "pack_min_increment": 0.2
  ```

== `extract.0.layout.tuning` - Stimmung
#label("extract.0.layout.tuning")
Hier kannst du einstellen, ob dein Instrument umgestimmt wurde. Diese Umstimmung erfolgt entweder durch verstimmung der Saiten oder durch umlegen einer Klappe (z.b. bei Okon-Harfe). Es gibt zwei Einträge

#strong[feste stimmung: `fixed`]

Mit dieser Einstellung ist die Stimmung des Instrumentes fest vorgegegeben.

#strong[offene Stimmung: `open`]

Wenn der Parameter `tuning` auf den Wert `offen` gesetzt ist, wird die Stimmung der Saiten aus den Saitennamen abgeleitet.

Dabei gelten folgende Regeln.

-  `C,` `C` `c` `c'` spannt vier Oktaven auf

-  Saitennamen sind:

  -  `C *C C# CIS`
  -  `D *D D# DIS DES DB`
  -  `E EB ES`
  -  `F  *F F# FIS`
  -  `G *G G# GIS GES GB`
  -  `A *A A#  AIS AS AB`
  -  `H B HB BB *HB *BB`

-  ein nachgestelltes `#` bzw’ `b` stellt ein Vorzeichen dar

-  ein vorangestelltes `*` markiert eine Klappe, die Saite gilt dann auch als einen Halbton höher gestimmt.

  ```
  "tuning": "fixed"
  ```

== `extract.0.layoutlines` - Stimmen für Layout
#label("extract.0.layoutlines")
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, die #strong[zusätzlich] zu den dargestellten Stimmen zur die Berechnung des vertikalen Anordnung der Noten (Layout) herangezogen werden sollen.

Üblicherweise werden nur die dargestellten Stimmen für die Berechnung des Layouts herangezogen. Es kann aber sinnvoll sein, weitere Stimmmen zur Berechnung des Layouts zu berücksichtigen, um in allen Auszügen ein ein gleichartiges Notenbild zu bekommen.

#blockquote[
#strong[Hinweis]: Auch wenn der Parameter `layoutlines` heißt, bewirkt er nicht, dass irgendwelche Linien eingezeichnet werden.
]

```
    "layoutlines": [1, 2, 3, 4]
      
```

== `extract.0.legend` - Legende
#label("extract.0.legend")
Hier kannst du die Darstellung der Legende konfigurieren. Dabei wird unterschieden zwischen

-  `pos` - Position des Titels des Musikstückes
-  'tstyle - Stil des titels'
-  `spos` - Position der Sublegende, d.h. der weiteren Angaben zum Musikstück

#blockquote[
#strong[Hinweis]: Die Legende wird vorzugsweise durch Verschieben mit der Maus positioniert. Für eine genaue positionierung kann jedoch die Eingabe über die Bildschirmmaske sinnvol sein.
]

```
    "legend": {
      "align"  : "r",
      "pos"    : [320, 7],
      "spos"   : [320, 27],
      "style"  : "regular",
      "tstyle" : "large"
    }
      
```

== `extract.0.legend.align` - Ausrichtung
#label("extract.0.legend.align")
Hier kannst du die Ausrichtung des Titels ausweählen:

-  `l`: der Text steht links vom Bezugspunkt (und ist daher rechtsbündig)

-  `r`: der Text steht rechts vom Bezugspunkt (und ist daher linksbündig)

-  `auto`: wie `l`

  ```
  "align": "r"
  ```

== `extract.0.legend.pos` - Position
#label("extract.0.legend.pos")
Hier kannst du die Position des Titels des Musikstückes angeben. Die Angabe erfolgt in mm als durch Kommas getrennt Liste von horizontaler / vertikaler Position.

```
    "pos": [320, 7]
      
```

== `extract.0.legend.spos` - Pos. Subleg.
#label("extract.0.legend.spos")
Hier kannst du die Darstellung der weiteren Angaben (Sublegende) des Musikstückes angeben. Die Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "spos": [320, 27]
      
```

== `extract.0.legend.style` - Stil
#label("extract.0.legend.style")
Hier kannst du den Stil für die Legende einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "regular"
      
```

== `extract.0.legend.tstyle` - Stil f. Titel
#label("extract.0.legend.tstyle")
Hier kannst du die Darstellung des Titels des Musikstückes angeben. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "tstyle": "large"
      
```

== `extract.0.lyrics` - Liedtexte
#label("extract.0.lyrics")
Hier steuerst du die Positionierung der Liedtexte. Dabei kannst du den Liedtext auf mehrer Blöcke aufteilen.

Ein einzelner Block listet die Strophen auf, die er enthält, und die gemeinsam poitioniert werden.

```
    "lyrics": {}
      
```

== `extract.0.nonflowrest` - Begleitpausen
#label("extract.0.nonflowrest")
Hier kannst du einstellen, ob in den Begleitstimmen ebenfalls die Pausen dargestellt werden sollen. Eine Stimme wird dann Begleitstimme betrachtet, wenn sie keine Flußlinie hat.

Normalerweise ist es nicht sinnvoll, in den Begleitstimmen Pausen darzustellen, da der Spieler sich ja an den Pausen in der Flußlinie orientiert.

```
    "nonflowrest": false
      
```

== `extract.0.notebound.minc` - extra Vorschub
#label("extract.0.notebound.minc")
Hier kannst du manuelle Korrekturen im vertikalen Layout vornehmen:

#blockquote[
#strong[Hinweis]: Diese Funktion ist nun wirklich für die ganzen Experten. Bitte verwende sie also nur, wenn du weißt, was du tust. Anwendungsfälle für diese Funktion:

-  Linien (z.B. Sprunglinien) gehen unglücklich durch andere Noten oder Beschriftungen
-  Bei sehr dichten Layouts gehen Taktstriche in die vorherige Note
-  Man hat sehr viele Noten, könnte aber einen Teil in eine freie Fläche schieben. In diesem fall würde die Flusslinie teilweise nach oben gehen.
]

Dieser Parameter enthält eine Liste von manuellen Korrekturen. Jeder Eintrag ändert den Vorschub für einen durch seinen Schlüssel bestimmten Zeitpunkt.

… kein Beispiel verfügbar …

== `extract.0.notebound.minc.x.minc_f` - Faktor
#label("extract.0.notebound.minc.x.minc_f")
Hier gibst du den Korrekturfaktor für den vertikalen Voreschub an.

Die Angabe bestimmt, welcher Anteil am errechneten vertikalen Abstand als extra Abstand #strong[hinzugefügt] wird. (`a = (a + minc_f * a`))

Im Beispiel

```
    "minc" : {
       "2304": {"minc_f": 1}, 
       "4224": {"minc_f": -0.25}
       }
```

-  bei 2304 wird der Abstand verdoppelt. Mit derm Faktor 1 wird ein Normalabstand wird hinugefügt.
-  bei 4224 wird der abstand um 25% reduziert. Mit dem Faktor -0.25 wird ein Viertel des Maximalabstandes abgezogen

#strong[Beispiele]:

-  `-1.0` würde den Vorschub um eine ganze Note zurück setzen
-  `0` ändert nichts am Vorschub. Damit kann man den Wert zurücksetzen, falls er im Auszug 0 gesetzt wurde.
-  `0.5` vergrößert den Vorschub um die Hälfte einer ganzen Note.

… kein Beispiel verfügbar …

== `extract.0.notebound.tuplet` - n-Tole
#label("extract.0.notebound.tuplet")
Hier kannst du die Darstellung von Triolen (genauer gesagt, von n-Tolen) steuern.

#blockquote[
#strong[Hinweis]:

Wenn du mehrere n-Tolen gemeinsam konfigurieren möchtest, ist es notwendig, eine "Verschiebemarke" vor die betroffene n-Tole zu setzen. Dabei ist es möglich, mehrere Tuplets gemeinsam zu konfigurieren wenn man die Verschiebemarken gleich benennt.

Z.B. kann man eine Verschiebemarke `tpl_links` an alle tuplets schreiben, deren Bogen links von der FLußlineie liegen soll. Diese können dann über den parameter `extract.0.tuplet.tpl_links` gemeinsam konfiguriert werden
]

… kein Beispiel verfügbar …

== `extract.0.notes` - Seitenbeschriftungen
#label("extract.0.notes")
Hier kannst du eine Seitenbeschriftungen hinzufügen. Beim Einfügen einer Seitenbeschriftung vergibt Zupfnoter eine Nummer anstelle der `.0`.

#blockquote[
#strong[Hinweis]: Es kann aber auch sinnvoll sein eine sprechende Bezeichnung für die Beschriftung manuell vorzugeben um ihrer spezifische Verwendung hervorzuheben z.B. `notes.T_Copyright`. Das ist allerdings nur in der Textansicht möglich.
]

```
    "notes": {}
      
```

== `extract.0.printer` - Drucker
#label("extract.0.printer")
Hier kannst du das Druckbild auf deine Drucher-Umgebung anpassen.

#blockquote[
#strong[Hinweis:] Durch Verwendung dieser Funktion passen die erstellten PDF-Dateien eventuell nicht mehr auf andere Umgebungen. Bitte verwende die Funktion also erst, wenn du keine geeigneten Einstellungen in deinem Druckdialog findest.
]

```
    "printer": {
      "a3_offset"   : [0, 0],
      "a4_offset"   : [-5, 0],
      "a4_pages"    : [0, 1, 2],
      "show_border" : false
    }
      
```

== `extract.0.printer.a3_offset` - Offset für A3
#label("extract.0.printer.a3_offset")
Hier definierst du, wie das Druckbild beim Ausdruck auf A3-Papier verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

#blockquote[
#strong[Hinweis]: Wenn ein Unterlegnotenblatt für eine 25 saitige Harfe auf ein A3-Blatt gedruckt wird, ist es sinnvoll, das Druckbild um 10 mm nach links zu verschieben. Dadurch werden die Noten vom Drucker nicht mehr angeschnitten.

In diesem Fall kann es auch sinnvoll sein, `limit-A3` auszuschalten.
]

```
    "a3_offset": [0, 0]
      
```

== `extract.0.printer.a4_offset` - Offset für A4
#label("extract.0.printer.a4_offset")
Hier defnierst du, wie das Druckbild beim Ausdruck auf A3-Papier verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "a4_offset": [-5, 0]
      
```

== `extract.0.printer.a4_pages` - Seiten bei A4
#label("extract.0.printer.a4_pages")
Hier gibst du eine kommagetrennte Liste von Seiten an, die bei A4 ausgedruckt werden sollen. Die Zählung beginnt bei 0! Standardeinstellung ist `0,1,2`.

Bei manchen Instrumenten passt das gesamte Notenbild auf eine Seite. Bei 25-saitigen Instrumenten reicht es beispielsweise, die Seite 1, 2 auszugeben, und Seite 0 wegzulassen.

```
    "a4_pages": [0, 1, 2]
      
```

== `extract.0.printer.show_border` - Blattbegr. zeich.
#label("extract.0.printer.show_border")
Hier kannst du einstellen, ob die Blattbegrenzung gedruckt werden soll. Die Blattbegrenzung liegt eigntlich ausserhalb des Bereiches, den der Drucker auf dem Papier bedrucken kann. Wenn der Drucker das Druckbild auf dem Papier zentriert, ist die Blattbegrenzung nicht sichtbar. Ihre Darstellung auf der Druckvorschau kann trotzdem hilfreich sein.

Manche Drucker positionieren das Druckbild aber nicht zentriert auf dem Papier. Dadurch wird die Blattbegrenzung gedruckt, dafür fehlen dann unten ca. 10 mm.

Versuche in diesem Fall, ob das Ausschalten der Blattbegrenzung die Situation verbessert.

```
    "show_border": false
      
```

== `extract.0.repeatsigns` - Wiederholungszeichen
#label("extract.0.repeatsigns")
Hier kannst du die Darstellung der Wiederholungszeichen steuern. Dabei wird angegeben, für welche Stimmen Wiederholgungszeichen gedruckt werden, wie die Wiederholungszeichen gedruckt werden, und wie sie positioniert werden.

```
    "repeatsigns": {
      "left"   : {"pos": [-7, -2], "style": "bold", "text": "|:"},
      "right"  : {"pos": [5, -2], "style": "bold", "text": ":|"},
      "voices" : []
    }
      
```

== `extract.0.repeatsigns.left` - links
#label("extract.0.repeatsigns.left")
Hier kannst du die Darstellung des linken Wiederholungszeichen steuern.

```
    "left": {"pos": [-7, -2], "style": "bold", "text": "|:"}
      
```

== `extract.0.repeatsigns.left.pos` - Position
#label("extract.0.repeatsigns.left.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [-7, -2]
      
```

== `extract.0.repeatsigns.left.style` - Stil
#label("extract.0.repeatsigns.left.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "bold"
      
```

== `extract.0.repeatsigns.left.text` - Text
#label("extract.0.repeatsigns.left.text")
Hier gibst du den Text an, der als linkes Wiederholungszeichen ausgegeben werden soll.

```
    "text": "|:"
      
```

== `extract.0.repeatsigns.right` - rechts
#label("extract.0.repeatsigns.right")
Hier kannst du die Darstellung des rechten Wiederholungszeichen steuern.

```
    "right": {"pos": [5, -2], "style": "bold", "text": ":|"}
      
```

== `extract.0.repeatsigns.right.pos` - Position
#label("extract.0.repeatsigns.right.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [5, -2]
      
```

== `extract.0.repeatsigns.right.style` - Stil
#label("extract.0.repeatsigns.right.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "bold"
      
```

== `extract.0.repeatsigns.right.text` - Text
#label("extract.0.repeatsigns.right.text")
Hier gibst du den Text an, der als rechtes Wiederholungszeichen ausgegeben werden soll.

```
    "text": ":|"
      
```

== `extract.0.repeatsigns.voices` - Stimmen
#label("extract.0.repeatsigns.voices")
Hier gibst du eine Liste (durch Komma getrennt) der Stimmen an, für welche Wiederholungszeichen anstelle einer Sprunglinie ausgegeben werden.

#blockquote[
Hinweis: Zupnoter stellt für die hier aufgelisteten Stimmen keine Sprunglinien mehr dar.
]

```
    "voices": []
      
```

== `extract.0.sortmark` - Sortiermarke
#label("extract.0.sortmark")
Hier konfigurierst du die Ausgabe einer Sortiermarke. Die Sortiermarke wird am oberen Blattrand gedruckt. Ihre horiozontale Position entspricht einer alphabetischen Sortierung der Titel. In einem nach Titel sortierten Stapel von Notenblättern bewegt sich die Sortiermarke also von links nach rechts. Damit kann man beim durchblättern gleich sehen, ob der Stapel sortiert ist.

#blockquote[
#strong[Hinweis]: Leider kann auf haushaltsüblichen Druckern nicht bis zum Rand gedrukht werden. Daher muss man die Sortiermake mit einem Filzstift bis zum Rand verlängern, dann kann man die Sortierung eiens Stapels kontrollieren, in dem man auf die Schnittkante des Stapels schaut.
]

```
    "sortmark": {"fill": true, "show": false, "size": [2, 4]}
      
```

== `extract.0.sortmark.fill` - ausfüllen
#label("extract.0.sortmark.fill")
Hier gibst du an, ob die Sortiermarke gefüllt werden soll. Die gefüllte Sortiermarke ist besser zu erkennen, könnte aber auch als störender empfunden werden.

```
    "fill": true
      
```

== `extract.0.sortmark.show` - anzeigen
#label("extract.0.sortmark.show")
Hier gibst du an, ob eine Sortiermarke ausgegeben werden soll.

```
    "show": false
      
```

== `extract.0.sortmark.size` - Größe
#label("extract.0.sortmark.size")
Hier gibst du die Gräße der Sortiermarke an. Die Voreinstallung von \[2,4\] hat sich als praktikabel erwiesen.

```
    "size": [2, 4]
      
```

== `extract.0.startpos` - Startposition
#label("extract.0.startpos")
Hier kannst du die Position von oben angeben, an welcher die Harfennoten beinnen. Damit kannst du ein ausgewogeneres Bild erhalten.

#blockquote[
#strong[Hinweis]:Durch diese Funktion wird auch der Bereich verkleinert, in dem die Noten dargestellt werden. Sie ist daher vorzugsweise bei kurzen Stücken anzuwenden, die sonst oben auf der Seite hängen.
]

```
    "startpos": 15
      
```

== `extract.0.stringnames` - Saitennamen
#label("extract.0.stringnames")
Hier kannst du stueern, ob und wie Saitennamen auf das Unterlegnotenblatt gedruckt werden.

```
    "stringnames": {
      "marks" : {"hpos": [43, 55, 79], "vpos": [11]},
      "style" : "small",
      "text"  : "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
      "vpos"  : []
    }
      
```

== `extract.0.stringnames.marks` - Saitenmarken
#label("extract.0.stringnames.marks")
Hier kannst du angeben, ob und wo Saitenmarken gedruckt werden.

```
    "marks": {"hpos": [43, 55, 79], "vpos": [11]}
      
```

== `extract.0.stringnames.marks.hpos` - horiz. Position
#label("extract.0.stringnames.marks.hpos")
Hier gibst du die horizontale Position der Saitenmarken an. Die Angabe ist eine durch Komma getrennte liste von Midi-Pitches.

Die Angabe `[43, 55, 79]` druckt Saitenmarken bei `G, G, g'`. also bei den äußeren G-Saiten der 25-saitigen bzw. der 37-saitigen Tischharfe.

```
    "hpos": [43, 55, 79]
      
```

== `extract.0.stringnames.marks.vpos` - vert. Position
#label("extract.0.stringnames.marks.vpos")
Hier gibst du einen Abstand vom oberen Blattrand. Die Angabe erfolgt in mm.

```
    "vpos": [11]
      
```

== `extract.0.stringnames.style` - Stil
#label("extract.0.stringnames.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "small"
      
```

== `extract.0.stringnames.text` - Text
#label("extract.0.stringnames.text")
Hier gibst du die Liste der Saitennamen getrennt druch Leerzeichen an.

#blockquote[
#strong[Hinweis:] Dieses Feld wird bei einer #strong[offenen] Stimmung besonders interpretiert. Siehe auch parameter `layout.tuning`.
]

Die Liste der Saitennamen wird so oft zusamengefügt, dass alle Saiten einen Namen bekommen. In der Regel reicht es also, die Saitennamen für eine Oktave anzugeben.

#strong[Beispiel:]

-  `+ -` erzeugt `+ - +  + - + -`

-  `C Cis D Dis E F Fis G Gis A Aia Bb B` erzeugt die regulären Saitennamen

  ```
  "text": "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G"
  ```

== `extract.0.stringnames.vpos` - vert. Position
#label("extract.0.stringnames.vpos")
Hier gibst du einen Abstand vom oberen Blattrand. Die Angabe erfolgt in mm.

```
    "vpos": []
      
```

== `extract.0.subflowlines` - Hilfsmelodielinien
#label("extract.0.subflowlines")
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, für die Unterflußlinien eingezeichnet werden sollen.

```
    "subflowlines": [2, 4]
      
```

== `extract.0.synchlines` - Synchronisationslinien
#label("extract.0.synchlines")
Hier kannst du angeben, welche Stimmenpaare über Synchronisationslinien verbunden werden sollen.

Die Angabe erfolgt in der Bildschirmmaske als eine durch Komma separierte Liste von Stimmenpaaren (darin die Stimmen durch "-" getrennt).

Die Angabe "`1-2, 3-4`" bedeutet beispielsweise, dass zwischen den Stimmen 1 und 2 bzw. den Stimmen 3 und 4 eine Synchronisationslinie gezeichnet werden soll.

#blockquote[
#strong[Hinweis]:In der Texteingabe wird das als eine Liste von zweiwertigen Listen dargestellt.
]

```
    "synchlines": [[1, 2], [3, 4]]
      
```

== `extract.0.title` - Titel
#label("extract.0.title")
Hier spezifizierst du den Titel des Auszuges. Er wird in der Legende mit ausgegeben.

#blockquote[
#strong[Hinweis]: Der Titel des Auszuges wird an die Angabe in der Zeile "F:" angehängt, falls nicht noch ein `extract.0.filenamepart` spezifiziert ist.
]

```
    "title": "alle Stimmen"
      
```

== `extract.0.tuplets` - n-Tolen
#label("extract.0.tuplets")
Hier kannst du die generelle Darstellung von n-Tolen konfigurieren.

```
    "tuplets": {"text": "{{tuplet}}"}
      
```

== `extract.0.tuplets.text` - Text
#label("extract.0.tuplets.text")
Hier kannst du die Darstellung der n-Tolen - Nummer konfigurieren. Der Wert ist ein Text, in welchem der Platzhalter `{{tuplet}}` durch die n-Tolen - Nummer ersetzt wird.

So wird beispielsweise mit `- {{tuplet}} -` die n-Tolen - Nummer als `- 3 -` dargestellt.

```
    "text": "{{tuplet}}"
      
```

== `extract.0.voices` - Stimmen
#label("extract.0.voices")
Hier gibst du eine Liste von Sstimmen als (durch Komma getrennte) Liste von Nummern an. Die Nummer ergibt sich aus der Reihnfolge in der `%%score` - Anweisung in der ABC-Notation.

```
    "voices": [1, 2, 3, 4]
      
```

== `presets.barnumbers_countnotes.countnotes_with_lyrics.countnotes` - Zählmarken
#label("presets.barnumbers_countnotes.countnotes_with_lyrics.countnotes")
TODO: Helptext für presets.barnumbers\_countnotes.countnotes\_with\_lyrics.countnotes einfügen

```
    "countnotes": {
      "cntextleft"  : "{lyrics} {countnote}",
      "cntextright" : "{countnote} {lyrics}"
    }
      
```

== `presets.barnumbers_countnotes.countnotes_with_lyrics.countnotes.cntextleft` - Text rechte Zählmarke
#label("presets.barnumbers_countnotes.countnotes_with_lyrics.countnotes.cntextleft")
Hier kannst du ein Textmuster für die Zählmarken #strong[links] von der Note angegben. Dabei kannst du die entsprechneden Silben aus den Liedtexten im Notensysstem (angelegt mit `w:` Zeilen ) einfügen.

Hierfür gibt es auch die Schnelleinstellung `Zählmarken mit Text`.

#blockquote[
#strong[Hinweis]: in ABC gibt es ja die Möglichkeit Liedtexte nach den Noten einzufügen mit `W:` (groß) - Zeilen. Das sind die Texte die Zupfnoter über die Konfiguration `Liedtexte` auf dem Blatt positioniert.

Es gibt aber auch Liedtexte, die silbengnau den Noten zugeordnet werden as sind `w:` (klein) - Zeilen innerhalb einer Stimme. Diese Texte können an die Zählmarken angefügt wrerden.
]

Damit kannst du den Rythmus über das "Sprechen" unterstützen, oder gar eine eigene Rythmussprache (z.b. nach Zoltan-Kodaly) verwenden.

Dabei gibt es die Platzhalter

-  `{countnote}`
-  `{lyrics}`

Beispiel: `{lyrics} - {countnote}`

```
    "cntextleft": "{lyrics} {countnote}"
      
```

== `presets.barnumbers_countnotes.countnotes_with_lyrics.countnotes.cntextright` - Text linke Zählmarke
#label("presets.barnumbers_countnotes.countnotes_with_lyrics.countnotes.cntextright")
Hier kannst du ein Textmuster für die Zählmarken #strong[rechts] von der Note angegben. Dabei kannst du die entsprechneden Silben aus den Liedtexten im Notensysstem (angelegt mit `w:` Zeilen ) einfügen.

Hierfür gibt es auch die Schnelleinstellung `Zählmarken mit Text`.

#blockquote[
#strong[Hinweis]: in ABC gibt es ja die Möglichkeit Liedtexte nach den Noten einzufügen mit `W:` (groß) - Zeilen. Das sind die Texte die Zupfnoter über die Konfiguration `Liedtexte` auf dem Blatt positioniert.

Es gibt aber auch Liedtexte, die silbengnau den Noten zugeordnet werden as sind `w:` (klein) - Zeilen innerhalb einer Stimme. Diese Texte können an die Zählmarken angefügt wrerden.
]

Damit kannst du den Rythmus über das "Sprechen" unterstützen, oder gar eine eigene Rythmussprache (z.b. nach Zoltan-Kodaly) verwenden.

Dabei gibt es die Platzhalter

-  `{countnote}`
-  `{lyrics}`

Beispiel: `{countnote} - {lyrics}`

```
    "cntextright": "{countnote} {lyrics}"
      
```

== `presets.notes` - Seitenbeschriftungen
#label("presets.notes")
Hier kannst du eine Seitenbeschriftungen hinzufügen. Beim Einfügen einer Seitenbeschriftung vergibt Zupfnoter eine Nummer anstelle der `.0`.

#blockquote[
#strong[Hinweis]: Es kann aber auch sinnvoll sein eine sprechende Bezeichnung für die Beschriftung manuell vorzugeben um ihrer spezifische Verwendung hervorzuheben z.B. `notes.T_Copyright`. Das ist allerdings nur in der Textansicht möglich.
]

```
    "notes": {
      "T01_T99"                  : {"value": {}},
      "T01_number"               : {
        "value" : {
          "align" : "l",
          "pos"   : [410, 17],
          "style" : "bold",
          "text"  : "XXX-{{number}}"
        }
      },
      "T01_number_extract"       : {
        "value" : {
          "pos"   : [411, 17],
          "style" : "bold",
          "text"  : "{{extract_filename}}"
        }
      },
      "T01_number_extract_value" : {
        "key"   : "T01_number_extract",
        "value" : {"text": "{{extract_filename}}"}
      },
      "T02_copyright_music"      : {
        "value" : {
          "pos"   : [340, 251],
          "style" : "small",
          "text"  : "© 2026\n"
        }
      },
      "T03_copyright_harpnotes"  : {
        "value" : {
          "pos"   : [340, 260],
          "style" : "small",
          "text"  : "© 2026 Notenbild: zupfnoter.de"
        }
      },
      "T04_to_order"             : {
        "value" : {"pos": [340, 242], "style": "small", "text": null}
      },
      "T05_printed_extracts"     : {
        "value" : {
          "align" : "l",
          "pos"   : [410, 22],
          "style" : "smaller",
          "text"  : "{{printed_extracts}}"
        }
      },
      "T06_legend"               : {
        "value" : {
          "pos"   : [360, 30],
          "style" : "small",
          "text"  : "{{extract_title}}\n{{composer}}\nTakt: {{meter}} ({{tempo}})\nTonart: {{key}}"
        }
      },
      "T99_do_not_copy"          : {
        "value" : {"pos": [380, 284], "style": "small_bold", "text": null}
      }
    }
      
```

== `presets.notes.T01_T99` - T01 .. T99 Alle ..
#label("presets.notes.T01_T99")
TODO: Helptext für presets.notes.T01\_T99 einfügen

```
    "T01_T99": {"value": {}}
      
```

== `presets.notes.T01_number` - T01 Nummer
#label("presets.notes.T01_number")
Dies fügt Nummer im Notenblatt ein. Damit kannst du deine eigenen Ordnungskriterien realiseren.

Das vorgesehene Numernschema setzt sich aus zwei Blöcken zusammen

-  3 Zeichen für den Urheber, sozusagen die Unterlegnotenmanufaktur
-  3 Zeichen für eine fortlaufende Nummer. Es ist sinnvoll diese Nummer mit führenden Nullen zu schreiben.

Beispiel: `BWL-001` - Bernhard Weichel - Blatt 001

```
    "T01_number": {
      "value" : {
        "align" : "l",
        "pos"   : [410, 17],
        "style" : "bold",
        "text"  : "XXX-{{number}}"
      }
    }
      
```

== `presets.notes.T01_number_extract` - T01 Auszug-Nummer
#label("presets.notes.T01_number_extract")
Dies fügt eine Kennzeichung des Auszuges am Ende der Nummer ein.

Ein sinnvolles schema ist:

-  `-A` - Sopran Alt - per default Auszug 1

-  `-B` - Tenor Bass - per default Auszug 2

-  `-M` - Nur Melodie - am besten Auszug 3 - ist aber nicht per default konfiguriert

-  `-S` - Alle Stimmen - per default Auszug 0; dieser wird in der Regel aber nicht gedruckt, sondern nur zur Bearbeitung verwendet.

  ```
  "T01_number_extract": {
    "value" : {
      "pos"   : [411, 17],
      "style" : "bold",
      "text"  : "{{extract_filename}}"
    }
  }
  ```

== `presets.notes.T02_copyright_music` - T02 Copyright Musik
#label("presets.notes.T02_copyright_music")
Dies fügt einen Copyrightvermerk für die Musik ein. Hier wird das Copyright auf die Komposition angegeben.

```
    "T02_copyright_music": {
      "value" : {"pos": [340, 251], "style": "small", "text": "© 2026\n"}
    }
      
```

== `presets.notes.T03_copyright_harpnotes` - T03 Copyright Unterlegnoten
#label("presets.notes.T03_copyright_harpnotes")
Dies fügt einen Copyrightvermerk für das Unterlgnotenbild ein. Damit reklamierst du ein Copyright für die Umsetzung auf die Tischharfe

```
    "T03_copyright_harpnotes": {
      "value" : {
        "pos"   : [340, 260],
        "style" : "small",
        "text"  : "© 2026 Notenbild: zupfnoter.de"
      }
    }
      
```

== `presets.notes.T04_to_order` - T04 zu beziehen bei
#label("presets.notes.T04_to_order")
Dies fügt eine Notiz ein wo man das Unterlegnotenblatt beziehen kann. Das ist sinnvoll, wenn die Unterlegoten in irgendeiner Weise vertrieben werden.

```
    "T04_to_order": {
      "value" : {"pos": [340, 242], "style": "small", "text": null}
    }
      
```

== `presets.notes.T05_printed_extracts` - T05 verfügbare Auszüge
#label("presets.notes.T05_printed_extracts")
Dies fügt einen Hinweis im Notenblatt ein, welche Auszüge insgesamt zur Verfügung stehen. Das hilft festzustellen, ob alle verfügbaren Stimmen bzw. Auszüge vorliegen.

```
    "T05_printed_extracts": {
      "value" : {
        "align" : "l",
        "pos"   : [410, 22],
        "style" : "smaller",
        "text"  : "{{printed_extracts}}"
      }
    }
      
```

== `presets.notes.T06_legend` - T06 Legende
#label("presets.notes.T06_legend")
Hier kannst du eine eigene Legende gestalten. Dadurch wird die von Zupfnoter generierte Standard-Legende überschrieben.

Die Voreinstellungn entspricht der Standardlegende von Zupfnoter.

```
    "T06_legend": {
      "value" : {
        "pos"   : [360, 30],
        "style" : "small",
        "text"  : "{{extract_title}}\n{{composer}}\nTakt: {{meter}} ({{tempo}})\nTonart: {{key}}"
      }
    }
      
```

== `presets.notes.T99_do_not_copy` - T99 bitte nicht kopieren
#label("presets.notes.T99_do_not_copy")
Dies fügt eine Notiz ein, die darauf hinweist, dass das Blatt nicht ohne Erlaubnis kopiert werden darf.

```
    "T99_do_not_copy": {
      "value" : {"pos": [380, 284], "style": "small_bold", "text": null}
    }
      
```

== `produce` - PDF für Auszüge
#label("produce")
Hier kannst du eine Liste der Auszuüge angeben, für welche eine PDF-DAtei mit erzeugt werden soll.

#blockquote[
#strong[Hinweis:] Manchmal ist es sinnvoll, Auszüge nur zur Bearbeitung anzulegen, diese aber nicht zu drucken. Es kommt auch vor, dass Auszug 0 nur verwendet wird, um Vorgaben für die anderen Auszüge zu machen, nicht aber um ihn wirklich auszudrucken.
]

```
    "produce": [0]
      
```

== `restposition` - Position der Pausen
#label("restposition")
Hier kannst du angeben an welcher Tonhöhe die Pausen eingetragenw werden sollen. Pausen haben an sich keine Tonhöhe, daher ist es nicht eindeutig, wie sie im Umterlegnotenblatt positioniert werden sollen.

-  `center` positioniert die Pause zwischen die vorherige und die nächste Note

-  `next` positioniert die Pause auf die gleiche Tonhöhe wie die nächste Note

-  `default` übernimmt den Vorgabewert

  ```
  "restposition": {
    "default"     : "center",
    "repeatend"   : "default",
    "repeatstart" : "next"
  }
  ```

== `restposition.default` - Vorgabewert
#label("restposition.default")
Hier kannst den Vorgabewert für die Pausenposition angeben.

#blockquote[
#strong[Hinweis]: `default` als Vorgabewert nimmt den intenrn Vorgabewert `center`.
]

```
    "default": "center"
      
```

== `restposition.repeatend` - Wiederholungsende
#label("restposition.repeatend")
Hier kannst du die Pausenposition nach einer Wiederholung einstellen.

```
    "repeatend": "default"
      
```

== `restposition.repeatstart` - Wiederholungsanfang
#label("restposition.repeatstart")
Hier kannst du die Pausenposition vor einer Wiederholung einstellen.

```
    "repeatstart": "next"
      
```

== `template` - Dateivorlage
#label("template")
Hier kannst du spezifische Eigenschaften des Template anpassen. Das ist nur relevant, wenn du ein Template bearbeitest.

#blockquote[
#strong[Hinweis] Diese Eigenschaften werden auch in abc dateien geschrieben welche auf Basis des vorhandenen Templates erstellt werden. Damit kann mnan feststellen, welches termplate der aktuell geöffnteten ABC - datei zu Grunde liegt.
]

```
    "template": {"filebase": "-no-template-", "title": "- no template -"}
      
```

== `template.filebase` - Filename-Basis
#label("template.filebase")
Hier kannst du den Dateinamen (ohne Erweiterung) des Templates angeben. Wenn die F-Kopfzeile eine Platzhalter-Startsquenz (`{{`) enthält, wird der in diesem Parameter angegebenen Name zum Speichern verwendet

```
    "filebase": "-no-template-"
      
```

== `template.title` - Titel
#label("template.title")
Hier kannst du einen informativen Titel für die Vorlage angeben. Damit kannst du die Vorlage identifizieren.

```
    "title": "- no template -"
      
```

== `templates` - Vorlagen
#label("templates")
Dieser Parameter kann nicht vom Benutzer gesetzt werden sondern liefert die Vorlagen beim Einfügugen neuer Liedtext-Blöcke bzw. Seitenbeschriftungen etc.

Er ist hier aufgeführt, um die Vorlagen selbst zu dokumentieren.

```
    "templates": {
      "annotations" : {"pos": [-5, -6], "text": "_vorlage_"},
      "extracts"    : {
        "filenamepart" : "-",
        "notes"        : {"T01_number_extract": {"text": "{{extract_filename}}"}},
        "title"        : ""
      },
      "images"      : {
        "height"    : 100,
        "imagename" : "",
        "pos"       : [10, 10],
        "show"      : true
      },
      "lyrics"      : {"pos": [350, 70], "style": "regular", "verses": [1]},
      "notes"       : {"pos": [320, 6], "style": "large", "text": "ENTER_NOTE"},
      "tuplet"      : {
        "cp1"   : [5, 2],
        "cp2"   : [5, -2],
        "shape" : ["c"],
        "show"  : true
      }
    }
      
```

== `templates.annotations` - Notenbeschriftungsvorlagen
#label("templates.annotations")
Hier kannst du eine Liste von Beschriftungsvorlagen angeben.

Zupfnoter bringt einige solcher Definitionen bereits mit.

Diese Beschriftungsvorlagen kannst du über "Zusatz einfügen" mit einer Note verbinden (Notenbeschriftung).

```
    "annotations": {"pos": [-5, -6], "text": "_vorlage_"}
      
```

== `templates.annotations.pos` - Position
#label("templates.annotations.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [-5, -6]
      
```

== `templates.annotations.text` - Text
#label("templates.annotations.text")
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-  `{{composer}}`: Komponist aus `C:` Zeilen

-  `{{current_year}}`: das aktuelle Jahr

-  `{{key}}`: Tonart aus `K:` Zeile

-  `{{meter}}`: Taktart aus `M:` Zeile

-  `{{number}}`: Nummer aus `X:` Zeile

-  `{{o_key}}`: Originaltonart

-  `{{tempo}}`: Tempo aus `Q:`Zeile

-  `{{title}}`: Titel aus `T:` Zeilen

-  `{{extract_title}}`: titel des auszgs aus "extract.\*.title",

-  `{{extract_filename}}`: Filenamenszusatz aus "extract.\*.filenamepart"},

-  `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden die entsprechneden Filenamenzusätze ausgegeben.

-  `{{watermark}}`: Wasserzeichen (mit `setsettings wartermark "wasserzeichen"` eingestellt)

  ```
  "text": "_vorlage_"
  ```

== `templates.extracts` - Auszüge
#label("templates.extracts")
```
    "extracts": {
      "filenamepart" : "-",
      "notes"        : {"T01_number_extract": {"text": "{{extract_filename}}"}},
      "title"        : ""
    }
      
```

== `templates.extracts.filenamepart` - Filename-Zusatz
#label("templates.extracts.filenamepart")
Hier kannst du einen Zusatz angeben, um welchen der Filename der PDF-Dateien für diesen Auszug ergänzt werden soll. Auf diese Weise wird jeder Auszug in einer eigenen Datei wiedergegeben.

Wenn das Feld fehlt, dann wird der Filename aus dem Inhalt von `extract.0.title` gebildet.

#blockquote[
#strong[Hinweis]: Bitte achte darauf, daß jeder Auszug einen eindeutigen Filename-Zusatz oder Titel hat. Sonst werden mehrere Auszüge in die gleiche Datei geschrieben (und nur der letzte bleibt übrig).
]

```
    "filenamepart": "-"
      
```

== `templates.extracts.notes` - Seitenbeschriftungen
#label("templates.extracts.notes")
Hier kannst du eine Seitenbeschriftungen hinzufügen. Beim Einfügen einer Seitenbeschriftung vergibt Zupfnoter eine Nummer anstelle der `.0`.

#blockquote[
#strong[Hinweis]: Es kann aber auch sinnvoll sein eine sprechende Bezeichnung für die Beschriftung manuell vorzugeben um ihrer spezifische Verwendung hervorzuheben z.B. `notes.T_Copyright`. Das ist allerdings nur in der Textansicht möglich.
]

```
    "notes": {"T01_number_extract": {"text": "{{extract_filename}}"}}
      
```

== `templates.extracts.notes.T01_number_extract` - T01 Auszug-Nummer
#label("templates.extracts.notes.T01_number_extract")
Dies fügt eine Kennzeichung des Auszuges am Ende der Nummer ein.

Ein sinnvolles schema ist:

-  `-A` - Sopran Alt - per default Auszug 1

-  `-B` - Tenor Bass - per default Auszug 2

-  `-M` - Nur Melodie - am besten Auszug 3 - ist aber nicht per default konfiguriert

-  `-S` - Alle Stimmen - per default Auszug 0; dieser wird in der Regel aber nicht gedruckt, sondern nur zur Bearbeitung verwendet.

  ```
  "T01_number_extract": {"text": "{{extract_filename}}"}
  ```

== `templates.extracts.notes.T01_number_extract.text` - Text
#label("templates.extracts.notes.T01_number_extract.text")
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-  `{{composer}}`: Komponist aus `C:` Zeilen

-  `{{current_year}}`: das aktuelle Jahr

-  `{{key}}`: Tonart aus `K:` Zeile

-  `{{meter}}`: Taktart aus `M:` Zeile

-  `{{number}}`: Nummer aus `X:` Zeile

-  `{{o_key}}`: Originaltonart

-  `{{tempo}}`: Tempo aus `Q:`Zeile

-  `{{title}}`: Titel aus `T:` Zeilen

-  `{{extract_title}}`: titel des auszgs aus "extract.\*.title",

-  `{{extract_filename}}`: Filenamenszusatz aus "extract.\*.filenamepart"},

-  `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden die entsprechneden Filenamenzusätze ausgegeben.

-  `{{watermark}}`: Wasserzeichen (mit `setsettings wartermark "wasserzeichen"` eingestellt)

  ```
  "text": "{{extract_filename}}"
  ```

== `templates.extracts.title` - Titel
#label("templates.extracts.title")
```
    "title": ""
      
```

== `templates.images` - Bilder
#label("templates.images")
Hier kannst du einstellen, welche Bilder auf dem Notenblatt erscheinen sollen.

```
    "images": {
      "height"    : 100,
      "imagename" : "",
      "pos"       : [10, 10],
      "show"      : true
    }
      
```

== `templates.images.height` - Bildhöhe
#label("templates.images.height")
```
    "height": 100
      
```

== `templates.images.imagename` - Bildname
#label("templates.images.imagename")
Hier kannst du das Bild auswählen, welches eingefügt werden soll. Die Auswahlliste zeigt die Zupfnoter-internen Namen an. Es werden nur Bilder gelistet, die dem ABC-File hinzugefügt wurde.

```
    "imagename": ""
      
```

== `templates.images.pos` - Position
#label("templates.images.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [10, 10]
      
```

== `templates.images.show` - anzeigen
#label("templates.images.show")
Dieser Eisntellung steuert, ob das Objekt (z.B. das Bild) in der Ausgabe angezeigt werden soll.

```
    "show": true
      
```

== `templates.lyrics` - Liedtexte
#label("templates.lyrics")
Hier steuerst du die Positionierung der Liedtexte. Dabei kannst du den Liedtext auf mehrer Blöcke aufteilen.

Ein einzelner Block listet die Strophen auf, die er enthält, und die gemeinsam poitioniert werden.

```
    "lyrics": {"pos": [350, 70], "style": "regular", "verses": [1]}
      
```

== `templates.lyrics.pos` - Position
#label("templates.lyrics.pos")
Dies ist die Vorgabe für Position, an welcher der Liedtext-Block ausgegeben werden soll. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [350, 70]
      
```

== `templates.lyrics.style` - Stil
#label("templates.lyrics.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "regular"
      
```

== `templates.lyrics.verses` - Strophen
#label("templates.lyrics.verses")
Dies ist die Vorgabe für die Liste der Strophen die im Liedtext-Block ausgegeben werden.

```
    "verses": [1]
      
```

== `templates.notes` - Seitenbeschriftungen
#label("templates.notes")
Hier kannst du eine Seitenbeschriftungen hinzufügen. Beim Einfügen einer Seitenbeschriftung vergibt Zupfnoter eine Nummer anstelle der `.0`.

#blockquote[
#strong[Hinweis]: Es kann aber auch sinnvoll sein eine sprechende Bezeichnung für die Beschriftung manuell vorzugeben um ihrer spezifische Verwendung hervorzuheben z.B. `notes.T_Copyright`. Das ist allerdings nur in der Textansicht möglich.
]

```
    "notes": {"pos": [320, 6], "style": "large", "text": "ENTER_NOTE"}
      
```

== `templates.notes.pos` - Position
#label("templates.notes.pos")
Hier gibst du die Position an. Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

```
    "pos": [320, 6]
      
```

== `templates.notes.style` - Stil
#label("templates.notes.style")
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.

```
    "style": "large"
      
```

== `templates.notes.text` - Text
#label("templates.notes.text")
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein. Folgende Platzhalter kannst du verwenden:

-  `{{composer}}`: Komponist aus `C:` Zeilen

-  `{{current_year}}`: das aktuelle Jahr

-  `{{key}}`: Tonart aus `K:` Zeile

-  `{{meter}}`: Taktart aus `M:` Zeile

-  `{{number}}`: Nummer aus `X:` Zeile

-  `{{o_key}}`: Originaltonart

-  `{{tempo}}`: Tempo aus `Q:`Zeile

-  `{{title}}`: Titel aus `T:` Zeilen

-  `{{extract_title}}`: titel des auszgs aus "extract.\*.title",

-  `{{extract_filename}}`: Filenamenszusatz aus "extract.\*.filenamepart"},

-  `{{printed_extracts}}`: erstellte Auszüge aus "produce". Es werden die entsprechneden Filenamenzusätze ausgegeben.

-  `{{watermark}}`: Wasserzeichen (mit `setsettings wartermark "wasserzeichen"` eingestellt)

  ```
  "text": "ENTER_NOTE"
  ```

== `templates.tuplet` - n-Tole
#label("templates.tuplet")
Hier kannst du die Darstellung von Triolen (genauer gesagt, von n-Tolen) steuern.

#blockquote[
#strong[Hinweis]:

Wenn du mehrere n-Tolen gemeinsam konfigurieren möchtest, ist es notwendig, eine "Verschiebemarke" vor die betroffene n-Tole zu setzen. Dabei ist es möglich, mehrere Tuplets gemeinsam zu konfigurieren wenn man die Verschiebemarken gleich benennt.

Z.B. kann man eine Verschiebemarke `tpl_links` an alle tuplets schreiben, deren Bogen links von der FLußlineie liegen soll. Diese können dann über den parameter `extract.0.tuplet.tpl_links` gemeinsam konfiguriert werden
]

```
    "tuplet": {
      "cp1"   : [5, 2],
      "cp2"   : [5, -2],
      "shape" : ["c"],
      "show"  : true
    }
      
```

== `templates.tuplet.cp1` - cp1
#label("templates.tuplet.cp1")
Hier gibst du den Kontrollpunkt für die erste Note an.

```
    "cp1": [5, 2]
      
```

== `templates.tuplet.cp2` - cp2
#label("templates.tuplet.cp2")
Hier gibst du den Kontrollpunkt für die letzte Note an.

```
    "cp2": [5, -2]
      
```

== `templates.tuplet.shape` - Linienform
#label("templates.tuplet.shape")
Hier gibst du eine Liste von Linienformen für die n-tole an.

-  `c`: Kurve
-  `l`: Linie

#blockquote[
#strong[Hinweis]: Mit der Linienform `l` kann man die Lage der Kontrollpunkte (als Ecken im Linienzug) sehen.
]

```
    "shape": ["c"]
      
```

== `templates.tuplet.show` - anzeigen
#label("templates.tuplet.show")
Hier gibst du an, ob die n-Tole ausgegeben werden soll.

```
    "show": true
      
```

== `wrap` - wrap
#label("wrap")
Hier kannst du angeben, in welcher Spalte der Zeilenumbruch im Konfigurationsabschnitt erfolgen soll. Das kann bei komplexen Konfigurationen sinnvoll sein, um die Übersichtlichkeit zu erhöhen.

```
    "wrap": 60
```

= Glossar
#label("glossar")
Musikstück

Lied

Volten

Voltenklammer

= Änderungsgeschichte
#label("änderungsgeschichte")
== kommend
#label("kommend")
-  support dotted whole notes \#317

== V 1.17.1 Februar 2025
#label("v-1.17.1-februar-2025")
=== Fix
#label("fix")
-  Behoben: Dropbox SDK XMLHttpRequest blob response bug
-  Behoben: Token-Refresh bei abgelaufenem Access Token
-  Verbesserte Fehlerbehandlung bei Dropbox API Calls

== V 1.17 März 2025
#label("v-1.17-märz-2025")
=== Erweiterung
#label("erweiterung")
-  Dropbox OAuth2 PKCE Flow für sicherere Authentifizierung
-  Unterstützung für Offline-Zugriff mit Refresh Tokens
-  Token-Refresh-Mechanismus für erweiterte Session-Dauer (kein 4-Stunden-Timeout mehr)
-  Automatische Migration alter Token-Formate beim Login

=== Fix
#label("fix-1")
-  Behoben: Dropbox API v2 SDK-Initialisierung
-  Behoben: Login-Flow mit Authorization Code
-  Behoben: filesDownload API Response-Handling
-  Behoben: Soundfont-Pfade bei Deployment
-  Verbesserte Token-Speicherung und Verwaltung

== V 1.16 März 2021
#label("v-1.16-märz-2021")
-  Support für 15-saitige Zupfharfe
-  Unterstützung offener Stimmungen überall möglich

== V 1.15 Mai 2021
#label("v-1.15-mai-2021")
=== Erweiterung
#label("erweiterung-1")
-  Menüanordnung umgstellt
-  Dekorationen \#30
-  experimnteller Harmonieassistent \#298
-  Help Menu hat nun einen Link auf die Support-Seit
-  upgrade to abc2svg - besseree Untersützung des ABC standards
-  Flußlilninen können nun unterbrochen werden durch !breath!, and bar types `||` `|]` \#301
-  Mehr details in Zählmarken bei punktierten Noten \#297
-  Fehlermeldungen verbessert
-  verbesserte Behnanldung von Duplikaten in Filename\_zusatz
-  verbesserte Behnaldung von tempo
-  verbesserte Erkennung fehlender Tonartmodi

=== fix
#label("fix-2")
-  Behoben: Absturz wenn eine einzelne Note wiederholt wird
-  Behoben: Absturz bei klick auf elemente, die nicht in ABC vorkommen (z.B. Debug-Grid)
-  Behoben: Absturz "M:" \#300
-  Behoben: Absturz Editor, wenn kein Harfennoten erzeugt werden konnten
-  Behoben: font color

== V 1.14 Februar 2021
#label("v-1.14-februar-2021")
=== fix
#label("fix-3")
-  refine alignment of stringnames \#281
-  Problem with bars within measures with repeat variant ending offbeat \#284
-  filter mor unicdoce characters \#292
-  sharp chord symbols like F\# now work in transposed pieces \#295
-  now we can control the style of title \#294

== V 1.13 Dezember 2019
#label("v-1.13-dezember-2019")
=== fix
#label("fix-4")
-  Ausrichtung von Saitennamen verfeinert \#281

=== enhancement
#label("enhancement")
-  Harfenvorschau kann unn auch PDF anzeigen \#281
-  Taktnummern, Zählmarken, Anmerkungen unterbrechen nun Flusslinen \#279
-  experimenteller Packer Nr. 3
-  Unterstützung für Akkordzither und beliebig gestimmte Instrumente\#289
-  Liedtexte an Zählnummern anfügen \#290
-  Weitere Bearbeitung von Akkorden im ABC-Code
-  "Offene" Sprunglinien \#285
-  PDF-Tab in Harfenvorschau \#281

== V 1.12 August 2019
#label("v-1.12-august-2019")
=== Fehlerbehebung
#label("fehlerbehebung")
-  Verarbeitung unsichtbarer Pausen in Unterflusslinien korrigiert \#265
-  Fehlermeldung in der Konsole wen unsichtbare Noten gespielt werden \#262
-  Probleme mit Grafiken \#278

=== Erweiterung
#label("erweiterung-2")
-  beliebig vile Auszüge \#268
-  Konfiguration von Legende und Liedtexten verbessert
-  Unterstützung für offene Sprunglinien \#268
-  Mehrklänge können refaktoriert werden \#272
-  Unterflusslinien können nun auch bearbeitet werden \#276
-  Sichtbarkeit von Überbindungen verbessert \#276
-  Taktzahlen, Zählmarken und notenbezogene Anmerkungen haben nun einen weißen Hintergrund \#279
-  Beschriftung von Abschntten und standardmässig fett gedruckt \#280

=== Kompatibilität
#label("kompatibilität")
-  keine Standardkonfiguration für auszug 1 .. auszug 5

== V 1.11 18.4.2019
#label("v-1.11-18.4.2019")
=== fix
#label("fix-5")
-  Meldung "Cannot read property '\$first' of undefined" behoben \#251
-  Dialog für "Zusätze" schliesst nun wieder \#249
-  Hilfsemlodielienen sind nun gestrichelt mit 1.5mm, Synchronistaionslienien mit 3mm \#247
-  Bei "aufwärs spielen" und "notenhälse" wird nun die korrekte Zeichenfläche benutzt \#257
-  editconf extract.0.lyrics.1.pos bringt keine Fehlermeldung mehr \#256
-  Warunung wenn die Taktarkt innerhalb eines Taktes geändert wird \#217

=== enhancement
#label("enhancement-1")
-  Menü für die bisher benutzten Dropbox-Pfade in der Statuszeile \#252
-  Ein- / Aufklappen von Abschnitten in der Konfigurationsmaske \#254
-  Kompaktere Darstellung der Konfigurationsmaske \#254
-  Anzeige der jspdf version \#241
-  Ausrichtung (linksbündig, rechtsbündig) für Titel und Beschriftungen \#237
-  Platzhalter {{current\_year}} \#223
-  In der Konfigurationsmaske kann man nun suchen\# 248
-  Weitere Verbesserung der Platzierung von Taknummer/Zählmarken \#226
-  Unterstützung von Darteivorlagen \#253
-  Menü verkleinert, Zurpnoger-Versionanzeige nun hinter einer kleinen Home-Taste verborgen \#253

== V.1.10 Nov 2018
#label("v.1.10-nov-2018")
=== fix
#label("fix-6")
-  Pausen in n-tolen \#240
-  "Abschnitt in allen Stimmen auswählen" funktionier tauch mit Ziernoten im ABC\#243
-  mehr Sonderzeichen ersetzt (z.b. aus Word) \#238
-  XML-Import funktioniert nun auch wenn keine Vorlage definiert ist \#239

=== enhancement
#label("enhancement-2")
-  BWC: Taktnummern und Zählmarken können nun an der Notenmitte ausgerichtet werden \#237
-  Performance: Notenvorschau und Harfennvorschau können nun im Hintergrund gerechnet werden \#241
-  Einige Menü-Einträge von "Extras" in die Statusleiste unten verlegt \#242
-  Dialog "Es gibt neue Informationen" verbessert \#244

=== Kompatibilität
#label("kompatibilität-1")
-  "Konfig. bearb." / "Taknummern und Zählmarken" , Schnelleinstellung "an der Mitte der Note verankern"

== V 1.9.2
#label("v-1.9.2")
=== Fehlerbehbungen
#label("fehlerbehbungen")
-  Sichtbarkeit von punktierungen verbessert \#224
-  Position von Liedtexten nun gleich in Vorschau bzw. Ausdruck \#235
-  Notenvorschau wurde zu oft berechnet \#223
-  Verbesserung beim Umschalten von Ansichten \#230
-  Bessere Darstellung der Konfigurationsbuttons in chrome / firefox
-  Geschwindikgeitsverbesserungen \#225

=== Erweiterungen
#label("erweiterungen")
-  die zu speichenden Dateien können nun eingestellt werden (seaveformat) \#229
-  Konfiguration von Beschriftungen verbessert \#227
-  Wiederholungszeichen können individuell konfiguriert werden \#232
-  Aktuelles Template wird beim import einer xml-Datei angewandt
-  Parameter können nun von und nach Auzug 0 kopiert werden \#228

=== experimental
#label("experimental")
-  modify configuration when generating pdf with cli - eg. for watermark \#231

=== Kompatibilität
#label("kompatibilität-2")
-  BWC Position und Größe von Liedtexten könnte sich geringfügig ändern \#235

== v.1.9.1
#label("v.1.9.1")
internal release

== v 1.9.0
#label("v-1.9.0")
=== Fehlerbehebungen
#label("fehlerbehebungen")
-  Taktstrich bei Wiederholungsgrenzen innerhalb eines Takts sind nun unterdrückt \#216

=== Erweiterungen
#label("erweiterungen-1")
-  Sprunglinien für Variationen können einzeln konfiguriert werden \#215
-  Voreinstellung für Basis von Taktnummernpoistionen verändert ap\_base \#218
-  Anzeige der klingenden Töne für einen Zeitpunkt in der Statusleiste \#220
-  Sprunglinien können per Konfiguration unterdrückt werden (Pos: 0) \#222
-  automaitsches Scrollen kann abgeschaltet werden \#221
-  Platzhalter in Seitenbeschriftungen, so dass manche Werte nicht mehrfach eingegeben werden müssen \#223

=== Kompatibilität
#label("kompatibilität-3")
-  Voreinstellung für Basis von Taktnummernpoistionen verändert ap\_base \#218
-  Konfiguration der Sprunglinien für Variationen wird von führeren Zupfnoter-Versionen nicht erkannt

== v 1.8
#label("v-1.8")
=== Fehlerbehebungen
#label("fehlerbehebungen-1")
-  Druckvorschau löscht nicht mehr die Nicht-Speicherungsanzeige \#176
-  Update auf abc2svg 1.14
  -  Absturz bei fehlerhafter Transponierung
  -  fehlerhafte Tonhöhen bei überbundenen Noten in Wiederholung
  -  Vorzeichen nicht korrekt gelöscht am Taktende
-  verbessertes Fermatensymbol in pdf \#178
-  Absturz, wenn die Konfiguration auf eine nicht vorhandene Stimme verweist \#179
-  verbesserte Lokalisierung \#182
-  Fehlerfenster hat jetzt eine ok-Taste \#183
-  verbesserte Meldung "kein ABC gefunden" \#184
-  Verbesserte Fehlerberichterstattung im Kontext der Dropbox \#185
-  Absturz bei fehlerhaftem K-Header \#172
-  Verbesserung der Importe von Xml mit nicht spielbaren Teilen \#187
-  fixed "blues with accidentals" \#188
-  Korrektur der Behandlung von Fingerabdrücken mit abc2svg 1.15.5 \#195
-  vertaal ist nicht mehr begrenzt durch :|\[ \#192
-  Größe des Auswahlbereichs verkleinern, um Überschneidungen mit Barnummer etc. zu vermeiden \#197
-  verbesserter Spieler \#210

=== Erweiterungen
#label("erweiterungen-2")
-  linear arbeitenden packer \#194
-  Menü zum Importieren von der lokalen Platte \#177 \
-  Unterstützung für 25saitige Bassharfe \#180
-  Angabe \=Dauer am Takt wird entfernt "M:3/4 4/4 4/4 \=3/4" \#181
-  Unterstützung bei der Arbeit mit Dateivorlagen \#71
-  Kein initiales Rendern nach einem Absturz in der vorherigen Sitzung \#103
-  anderer Spieler, mit gesampelten Sounds \#126
-  der neue Spieler kann auch mit Wiederholungen und Varianten spielen \#126
-  Auswahl (rot) und gespielte Noten (blau) unterschiedlich hervorgehoben \#126
-  Verbessertes Umschalten der Wiedergabetaste \#126
-  Widergabegeschwindigkeit einstellbar \#126
-  umgestaltetes Layout-Formular \#189
-  Warnung bei nicht unterstütztem Browser \#186
-  BWC: Layout von Taktnummern und Zählmarken verbessert \#199
  -  Taktnummern weiter weg von der Note
  -  neue Algorithmus berücksichtigt den Verlauf der Flusslinie
-  Name einiger Layout-Schnelleinstellungen geändert \#196
-  Selektion auf alle Stimmen erweiterbar, um Takte im gesamten Stück zu löschen/einzufügen. \#202
-  Symbolleiste im linken Bereich neu angeordnet \#202
-  Unterstützung der Variation innerhalb des Taktes ohne Taktstrich \#204
-  Das Config-Formular zeigt nun an, ob es spezifisch für eine bestimmten Auszug ist \#189
-  Unterstützung von Undo/Redo für Config \#201
-  verbesserte Shortcuts (z.B. cmd-L zum Umschalten des Vollbilds, cmd-0 für Auszug 0)

=== Experimentelles
#label("experimentelles")
-  weitere diatonische Instrumente (z.B. OKON-Harfe) \#196
-  Layout von unten nach oben \#196
-  Notendarstellung mit Fähnchen \#196
-  Noten in der aktuellen Auswahl zur Harmonisierung anzeigen \#190
-  heuristische Erkennung von Überschneidungen von Anmerkungen \#200
-  Unterstützung für Illustrationen \#198
-  Menü "Extras" \#71

=== Kompatibilität
#label("kompatibilität-4")
-  es kann sein, dass manuelle Positionierung von notenbeozgenen Elementen überarbeitet werden muss. \#199

== v 1.7.1
#label("v-1.7.1")
=== fix
#label("fix-7")
-  improved fermata symbol in pdf \#178
-  turnoff flowconf edit for pdf. This avoids noise around very short vertical flowlines \#167
-  print preview no longer clears unsaved indicator \#176

== v 1.7
#label("v-1.7")
=== fix
#label("fix-8")
-  tuplet lines are now correct in pdf (\#139)
-  no longer have unexpected subflowlines to unisons (\#140)
-  fixed size of smaall notes (\#143)
-  player also plays until end of tied notes (\#147)
-  decorations now also work on rests (\#127)
-  shift now also works on unisons (\#107)
-  abc2svg settings no longer necessary in tunes (removed from Template) (\#71)
-  BWC Default for "filenamepart" is now as it was in 1.5 (\#155)
-  Config form is refreshed after loading another song (\#156)
-  printer offset is no longer broken if user enters only one value (\#157)
-  Dropbox-Path can now also have digits (\#162)
-  Printer window show pdf on Chrome 60 (\#160)
-  now invisible rests are supressed even on flowline (\#166)
-  now handle multi measure rests (\#166)
-  fix predefined annotations vt and vr
-  BWC: move Tuplet configuration to notebounds (\#168)
-  Multiple notebound annotations can now be dragged individually (\#170)
-  BWC: no longer show (Original in ) in case of transpositions (\#174)

=== enhancement
#label("enhancement-3")
-  jumplines can now be configured by drag & drop (\#136)
-  tuplets can now be sculptured by drag & drop (\#138)
-  improved performance of configuration (\#115)
-  improved performance of harpnote preview (\#87)
-  improved performance of vertical packer (\#87, \#89)
-  editor collapses config parameters by default (\#144)
-  now can print a sortmark on top of the sheet (\#145)
-  the anchor of jumplines can now be configured (\#150)
-  now have variant parts appear in grey (\#151)
-  now menu supports extract 0 to extract 5 (\#153)
-  now menu also shows title of extracts (\#153)
-  ctrl-alt 'F' now toggles harp preview
-  rearranged "Edit Configuration" Menu to improve configuration workflow (\#171)
-  now suppoert tilde as non braeking space in lyrics, stringnames, annotations \#113
-  now suppoert quoted tilde as non braeking space in lyrics, stringnames, annotations \#113
-  layoutlines is now the combination of voices and layoutlines (\#175).

=== internal stuff
#label("internal-stuff")
-  updated to abc2svg 1.13.7 (\#163)

=== experimental feature
#label("experimental-feature")
-  implemented a collision based packer (\#89)
-  implemented validation of config parameters (\#85) with result form
-  Shape of Flowlines can be configured (\#167)

=== backwards compatibility issues
#label("backwards-compatibility-issues")
-  layoutlines is now the combination of voices and layoutlines. It is no longer possible to show voices without considering them in the layout (\#175)
-  Default for "filenamepart" is now as it was in 1.5 (\#155)
-  tuplet configuration is now under 'notebound': meed to rework in the sheets - sorry! (\#168)
-  transposititions are no longer exposed in legend (\#174)

=== known issues
#label("known-issues")
Dragging of jumpline does not work properly on Saitenspiel \#158

== V 1.6.1 2017-05-17
#label("v-1.6.1-2017-05-17")
=== Fehlerbehebungen
#label("fehlerbehebungen-2")
-  Drag und Drop funktioniert nun auch in Firefox
-  Sektieren von Noten in der Notenvorschau verbessert.
-  non BWC: Oktavierte Notenschlüssel werden nun beachtet
-  Schneidemarken werden nur auch bei A4-Ausddruck ausgegeben
-  Beschriftungen für Variante Enden werden unterddrückt, wenn keine Sprunglinien ausgegeben werden
-  Taktnummern und Zählhinweise werden für unterdrückte Pause nicht mehr dargestellt
-  Unsynchronisierte Pausen in Begleitstimmen werden nun dargestellt
-  Bessere Fehlermeldung für nicht existierende Auszüge
-  non BWC: Automaitsche Positionierung von Taktnummern und Zählhinweisen deutlich verbessert
-  Notengröße und Gestalt der Einlegemarken korrigiert
-  MXL-dateien aus Musescor können nun auch importiert werden (Bislang nur solce, die von musescore.org heruntergeladen wurden)
-  Verbesserung der ABC 2.2 Unterstützung
-  Verbesserte Darstellung bei überlapenden Synchroniationslinien
-  Konfigurationsmasken deutlich beschleunigts
-  Tonarmodus (dur, moll) beibt bei Transponierung erhalten
-  Referenz erzeugt nun keine Fehlermehr

=== Erweiterung
#label("erweiterung-3")
-  In Liedtexten kann man mit `\~` feste Leerzeichen erzwingen
-  Unterlegnotenvorschau wird vor dem Rendern gelöscht
-  Der Fingerabdruck erscheint nun auch auf der Notenvorschau
-  Die Ausgabe von Triolen (n-tolen) in Begleitstimmen kann über die Konfigurtion unterdrückt werden
-  verbesserte ABC 2.2 Unterstützung
-  Anpassung auf neue Dropbox-Schnittstelle 2.0
-  für Dropbox gibt es nun eine eigenes Menü
-  verbesserte Fehlermeldungen bei Problemen mit Dropbox
-  Struktur des Konfigurationsmenüs verbessert
-  ABC-Tutorial von Gerd Schacherl verlinkt
-  Menüs zum Speichern, Öffnen sind inaktiv im Demo modus

=== Experimentelle Erweiterungen
#label("experimentelle-erweiterungen")
-  Man kann nun sein eigenes Template anlegen und einrichten
-  Man kann den vertikalen Abstand von Noten korrigieren.

=== inkompatible Änderungen - notwendige Anpassungen
#label("inkompatible-änderungen---notwendige-anpassungen")
-  Oktavierte Schlüssel: Wenn man bei einer Stimme z.B. clef\=treble-8 angibt, wird eine kleine 8 unter den Violinschlüssel geschrieben. Ihr müsst also die "-8" rauslöschen, damit es wieder so ist, wie vorher.Leider hat das Template in Zupfnoter dieses "-8" eingefügt.
-  Transponierungen innerhalb einer Stimme muss angepsasst werden
-  Taknummern und Zählhinwese werden nun automatisch positioniert, ggf. ausschalten.
-  Bei mehreren aufeinanderfolgenden `[P:]` bzw `[r:]` wirkt nur die letzte
-  Fehlermeldung, wenn F: - zeile fehlt
-  Fehlermeldung der F: - Zeile Leerzeichen oder Sonderzeichen enthält

== V 1.5
#label("v-1.5")
=== backward compatibility issues
#label("backward-compatibility-issues")
-  filenames are now trimmed - this might lead to slightly different filenames in dropbox
-  we now have a filenamepart per extract. It allows to change titles without changing the filenames. Future releases might introduce a default value. So better adapt this parameter now.
-  you need first to invoke "login" in Zupfnoter before you can use the "open"
-  the fingerprint on a page might change as we now have 2 decimal digits in configuration \#95

=== Fix
#label("fix-9")
-  adjusted German language also for error messages \#47
-  communication with Dropbox (error handling etc.) \#77
-  improved auto positioning of barnumbers and counthints \#81
-  builtin sheet annotation no longer claims a copyright \#69
-  optimized position of cutmarks \#74
-  fix whitespace handling in lyrics and filenames \#54
-  report multiple F and T lines \#54
-  non BWC trim filename addendum \#54
-  Jumpline end are now correct in case of a full rest \#50
-  no longer shift name first and last string in the stringnames \#18
-  Editor no longer hangs if harpnotes could not be created \#86
-  abc2svg titletrim now turned off \#88
-  browser now consider zupfnoter as secure site again \#90
-  Now also use ctrl/cmd-RETURN for render
-  Now yield 1.50 instead of 1.49999999 to minimize rounding effects \#95

=== Enhancement
#label("enhancement-4")
-  now we have configuration parameters for printer optimimization \#82
-  now have forms based configuration \#67
-  now have forms based editing of snippets (now called addons) \#83
-  now have a lyrics editor tab \#8
-  more styles for annotations \#70
-  now have a parameter "filenamepart" per extract to determine the filename addendum for the extract \#72
-  now raise a popup if an error occurs on render or save \#76
-  now have a button to toggle harpnote preview \#93
-  now have foundation for optimized packer, and an experimental packer \#89
-  now show information of the day \#98
-  now have quick settings for some configuration \#97

== V 1.4.2
#label("v-1.4.2")
=== Fix
#label("fix-10")
-  barnumbers are small\_bold again \#60
-  optimized placement of cutmarks \#74
-  fixed tempo note for e.g. 3/8\= 120 \#79
-  fix countnotes \#78

== V 1.4.2
#label("v-1.4.2-1")
=== Fix
#label("fix-11")
-  remove copyright note from sheet annotation \#69

=== enhancement
#label("enhancement-5")
-  add textstyles: italic, small\_bold, small\_italic

== V 1.4.1
#label("v-1.4.1")
=== enhancment
#label("enhancment")
-  suppress measure bar if repetition starts within measure \#42

=== fixes
#label("fixes")
-  force reading dropped abc-files as utf-8 \#66
-  annotation template now works

== V 1.4.0
#label("v-1.4.0")
-  fixed harpnote-player (no longer relies on last voice, no noise if song starts with rests) (\#20)
-  countnotes: draw hints how to count close to the notes (\#21). Configure by `"countnotes" : {"voices": [1], "pos": [3, -2]}`
-  fixed position of bars (\#16)
-  refined representation of rests (\#16): full rest now has same size as full note
-  refined layout of jumplines: now considering size of symbol
-  Draw a measure bar on the first note if the first measure is a complete one (\#23)
-  notes are shifted left/right if on the border of A3 sheets. This supports printing on A3 sheets (\#17)
-  removed spinner, progress indicator is again only background-color (reuqested by Karl)
-  advanced approach to represent variant endings (\#10)
-  config menu no longer overrides existing entries with the default values (\#25)
-  now have a button to download the abc (\#26)
-  how have keyboard shortcuts cmd-P, cmd-R, cmd-S \#37
-  non BWC: unisons are nore connected to their last note (\#32); migrate by inverting the unisons
-  non BWC: restructure of notebound annotations (\#33); migrate by delete notebound configuration and reposition \[r:\] needs to start with lowercase letter, all now works per voice only;
-  update favorite icon to Zupfnoter logo
-  now can print a scalebar with very flexible configuration \#18
-  now can print repeatsigns as alternative to jumplines; flowline is now interrupted upon repeat start/end \#3
-  rearranged config menu, added hints visble on hove \#37
-  console is now on cmd-K - only \#37
-  shape of tuplet slur can now be configured \#39 - this is an experimental implementation and subject of changing.
-  play button now plays: \#40
-  if nothing is selected: the entire song in all voices
-  if one note is selected: the song from selection, only voices of current extract
-  if more than one notes are selected: the selection only
-  shift key now expands the selection \#40
-  now support !fermata! and !empphasis! decorations \#30
-  now place a fingerprint of input on the sheet. Sheets with identical fingerprints stm from the same input. \#22
-  improved demo mode \#43
-  config menu now investigates the next free key for lyrics and note \#44
-  initial version of localization \#47
-  non BWC: algorithm for horizontal position of rests can now be configured. Default is different thatn in 1.3 Configuration menu provides an entry to switch to 1.3 behavior. \#58
-  Now generate a HTML-Page with the music notes for tune preview - also saves the html in Dropbox \#59
-  prevent automatic processing after initialization by adding ?debug to the url \#61
-  Now generate bar numers \#60
-  improve adjustment of zoom levels \#62

== V 1.3.1 2016-05-17
#label("v-1.3.1-2016-05-17")
-  initial support of voice overlays (bars do not always show up)

-  raise an alert before unloading Zupfnoter

-  indicate draggable text by "pointer" cursors

-  notebound annotations can be dragged if the note has an \[r:\] remark which serves as note-id.

-  config menu now injects some layout options

-  no error message on \[r:\] - remarks

-  some refactorings (abc2svg-json)

-  update to abc2svg 1.5.22

== V 1.2.2
#label("v-1.2.2")
-  slowed down activity animation

== V 1.2.1
#label("v-1.2.1")
== V 1.2.0 2016-04-21
#label("v-1.2.0-2016-04-21")
-  upgrade to abc2svg 1.5.14 ( Crash on some cases of ties since 1.5.6)
-  let "play" call "render" before playing if necessary
-  now use green animation (flying notes) for progress indicator

== V 1.1.1 2016-04-05
#label("v-1.1.1-2016-04-05")
-  patched version number

== V 1.1.0 2016-04-05
#label("v-1.1.0-2016-04-05")
-  refinements of toolbar: login, new, open, save
-  add a dialog for create and login
-  invoke render\_previews on new, open, drag
-  Improved report of coordinates for dragging annotations

== V 1.0.0 2016-04-03
#label("v-1.0.0-2016-04-03")
-  first official release

= Bearbeitungsnotizen
#label("bearbeitungsnotizen")
== Grundaufbau
#label("grundaufbau")
-  Zielgruppen

  -  Ersteller einfacher Unterlegnoten
  -  Ersteller anspruchsvoller Unterlegnoten
  -  Lektoren

-  Einführung

  -  was ist zupfnoter
  -  sehr abstrakt
  -  grobe Abläufe

-  Zupfnoter starten

-  Zupfnoter - was ist was?

  -  Genereller Bildschirmaufbau

  -  Elemente der erzeugten Unterlegnoten

  -  Einstellungen

    -  Generelle Blatteinstellungen
      -  Grundinstellungen
      -  Experten
    -  Persönliche Einstellungen

-  Zupfnoter benutzen

-  Best Practice

-  ABC-Tutorial

-  Zupfnoter Bedienelemente

-  Blatteinstellungen im Detail

= Rund um die Dropbox Cloud
#label("rund-um-die-dropbox-cloud")
in welchem Land stehen die Server,

Name des Eigentümers eigener Speicher, Kosten, Speicherplatzgröße

einmalig einrichten - beschreiben wie Vorschlag Ordnerstruktur \= Privatgebrauch (wg. Rechte), öffentlich (ohne Rechte), Rechte geklärt

Ordner-Freigabe für lesen oder schreiben, Ordner von anderen einsehen, Ordner löschen, Dateien löschen, Dateitypen erklären, Ordner von anderen einsehen

Zupfnoten speichern, löschen, ändern… eindeutiger Schlüssel pro Ordner (TOOD: ? )ist in der Abc Notation Nummer \= X: Dateiname ist Abc Notation Nummer plus Name \= F: Beim Runterladen in den Zupfnoter wird mit dem Inhalt von X: z.B. 99999 gesucht, damit erhält man alle F: Dateien , die mit 99999 beginnen.

TODO: Was passiert bei doppeltem Schlüssel und doppeltem Dateiname? Datensicherung per download aus der Dropbox auf den eigenen PC

= Der gute Ton für Unterlegnoten
#label("der-gute-ton-für-unterlegnoten")
Bei der Erstellung von Noten sollte man einige wenige Regeln beherzigen. Wer seine Unterlegnoten nie aus der Hand gibt und nur zu Hause musiziert, braucht diese Formalitäten nicht. Allen anderen möchten wir nahe legen, zum Schutz Dritter, den guten Ton zu wahren.

-  Auf jeder Unterlegnote (auch den Auszügen) sollten folgende Inhalte stehen:

  -  Titel
  -  Vorname und Nachname des Komponisten mit Angabe der Lebensdaten
  -  Vorname und Nachname des Komponisten pro Stimme mit Angabe der Lebensdaten
  -  Vorname und Nachname des Liedertextautor mit Angabe der Lebensdaten Name,
  -  Adresse und Telefon des Erstellers der Tisch-Harfen-Noten / herkömmlichen Noten
  -  Eingeholte Abdruckrechte pro Stimme \
  -  Eingeholte Abdruckrechte für Liedertexte
  -  Wenn keine Abdruckrechte eingeholt wurden: deutliche Kennzeichnung "Privatnutzung"

-  Wenn keine Lebensdaten angegeben werden, ist davon auszugehen, dass die Person noch lebt und Leistungsansprüche geltend machen kann. Musikstücke und Liedertexte die älter als 70 Jahre sind (Todesdatum plus 70 Jahre plus Zeitraum bis zum Jahresende 31.12) sind frei von Leistungsansprüchen.

-  Für die kostenlose Bereitstellung und Nutzung des Zupfnoters würden wir uns darüber freuen, wenn ein Hinweis auf den Tisch-Harfen-Noten / herkömmlichen Noten in Form von www.zupfnoter.de erscheint.

-  Wer als Hersteller von Noten den guten Ton bewahrt, wird durch die Angabe der eigenen Daten durch andere auf seine Fehler aufmerksam gemacht und kann diese korrigieren. Es gehört dann auch zum guten Ton (bzw. Reklamationsrecht), Notenblätter für die man Geld erhalten hat, kostenlos inkl. Porto auszutauschen.

-  Die Angabe der Lebensdaten von Komponisten und Textern schützt den Notenlaien bei öffentlichen Auftritten vor Fehlverhalten gegenüber der Gema.

-  Sollte eine Person Noten anderer Personen in seinem Namen verkaufen, bitten wir um eine kurzen Hinweis.

-  Notenlaien freuen sich besonders über Notenblätter, auf denen jede erste Note eines jeden Taktes (Querstrich oder Querlinien) gekennzeichnet ist. Einige Notenblätter am Markt enthalten nur den Taktbeginn. Besonders hervorzuheben ist, dass der Zupfnoter die Takte an die Noten schreiben kann, was für Notenlaien sehr hilfreich sein kann.

-  In Deutschland gibt es viele Tischharfen-Gruppen. Es kommt immer wieder vor, das Notenblätter korrigiert werden müssen und man in der Gruppe mit verschiedenen Versionen eines Notenblattes spielt. Über eine Versionsnummer könnte mal schnell identifizieren, wer ein neues Notenblatt in welcher Version benötigt.

-  Für die Tischharfen-Gruppen, die nicht nur 25 saitige Tischharfen in der Gruppe haben, sondern auch 21 saitige Tisch-Harfen, wäre es besonders kundenfreundlich, wenn die Notenblätter oder auf Notenübersichten bzw. Mappenübersichten gekennzeichnet wäre, ob die Melodielinie sich zwischen a – f‘‘ befindet. So können alle in der Gruppe die Melodie spielen und keiner wird ausgeschlossen.

  Das soll aber im Umkehrschluss nicht heißen, dass alle Melodielinien zwischen a – f‘‘ liegen müssen. In diesem Fall können die GruppenleiterInnen evtl. Ersatznoten vorschlagen.

= nicht in der Anleitung
#label("nicht-in-der-anleitung")
todo:

-  Menü snippets (Schnipsel) über die Tastenkombination `Strg` und `Leerzeichentaste`

  -  zupfnoter.dragable - ziehen
  -  zupfnoter.annotation – Vermerk pro Note
  -  zupfnoter.annotationref
  -  zupfnoter.goto
  -  zupfnoter.target

-  Zeichensatz für Notengröße plus individuelle Skalierung

-  unten links newscore

= Offene Punkte im Handbuch
#label("offene-punkte-im-handbuch")
== Kapitelstruktur
#label("kapitelstruktur")
```
* Einführung
* Darstellung der Noten
* Ablauf der Erstellung
* Genereller Bildschirmaufbau
    * Schaltflächenleiste (Toolbar)
    * Eingeabepanel 2.1 ABC-Notation und Konfiguration
    * Notenvorschau
    * Harfenvorschau

* Fehlermeldung
```

== Fehlermeldungen
#label("fehlermeldungen")
== Verwaltiung
#label("verwaltiung")
todo: klären ob separates repository
