# version 1.4.0

* neue Website mit Blog und  Frage / Antwort

* update favorite icon to Zupfnoter logo

    * nur zeigen
        

* removed spinner, progress indicator is again only background-color (reuqested by Karl)

    nur erwähnen

* fixed harpnote-player (no longer relies on last voice, no noise if song starts with rests) (#20)

    * Demo alle meine Entchen hört nicht mehr auf

* countnotes: draw hints how to count close to the notes (#21). Configure by `  "countnotes" : {"voices": [1], "pos": [3, -2]}`

    * Countnotes in Stimme 1 einbauen
    * > zwischen E F einsetzen - Zähler anschauen
    
* fixed position of bars (#16)
    
    * erwähnen: der Taktstrich ist nun viel feiner und genauer positioniert

* refined representation of rests (#16): full rest now has same size as full note

    * Die größe der Puasen ist nun genauer
    * Demonstrieren durch einfügen von Puasen am Anfang
    
* Draw a measure bar on the first note if the first measure is a complete one (#23)

    Ansagen, Länge erste Note verändern, Takt verschwindet
    
* refined layout of jumplines: now considering size of symbol

    Sprunglinie in den beiden Stimmen zeigen, kommt richtig an
    
* notes are shifted left/right if on the border of A3 sheets. This supports printing on A3 sheets (#17)

    Erste note zu zu einem Akkord machen [G,,G,g]
    
* advanced approach to represent variant endings (#10)

    * Variantes Ende einbauen
        * Letzter takt "1"
        * Noten CEG2
        * nach WDH 2 C4 |]
        * zeigen
    * mehr in einem anderen Film

* config menu no longer overrides existing entries with the default values (#25)

    * nur erwähnen

* now have a button to download the abc (#26) 

    * Button drücken
    
* how have keyboard shortcuts

    Cmd-A  selektiert alles
    Cmd-R  render
    Cmd-P  play
    Cmd-S  Speichern
    Cmd-K  Konsole - nur noch auf der Taste
    
* non BWC: unisons are nore connected to their last note (#32); migrate by inverting the unisons

    * Erste Note zu einem Akkord machen
    * zeigen wie sprungline und Flusslinie endet
    
* non BWC: restructure of notebound annotations (#33); migrate by delete notebound configuration and reposition
  \[r:\] needs to start with lowercase letter, all now works per voice only;
  
    * erwähnen
  

* now can print a scalebar with very flexible configuration #18

    *stringnames einfügen
    
* now can print repeatsigns as alternative to jumplines; flowline is now interrupted upon repeat start/end #3
* rearranged config menu, added hints visble on hover #37

    * zeigen

* shape of tuplet slur can now be configured #39 - this is an experimental implementation and subject of changing.

    * Tuplet einbauen Am Anfang [r:t_1](3(CDE
    * Draggable hinzufügen
    * cp1, cp2 einbauen
    * shape einbauen
    
    Bezier_kurven - versteht man eh nicht: einfach rumprobieren
    Ist experimentell - kommt mal noch eine bessere UI
    
    
* play button now plays selection if more than three note are selected #40
    
* shift key now expands the selection #40

    * Extrakt auf 1 stellen
    * nicht selektieren
    * eine Note selektieren
    * mehrere Noten selektieren

* now support !fermata! and !empphasis! decorations #30 
* now place a fingerprint of input on the sheet. Sheets with identical fingerprints stm from the same input. #22

    * zeigen
    
* improved demo mode #43

    * hilfe-menü
    
* config menu now investigates the next free key for lyrics and note #44

    * config-menü neuer Aufbau erwähnen
    * lyrics einfügen





# Ein erster Schritt

## Zupfnoter starten

## neues Stück erstellen


* create ...

### Melodie

* Melodie `CDEFGGAAAAGAAAAGFFFFEEGGGGA`
* Taktstriche

### Begleitung

* Bassnoten `C4 | C4 | F4 | C4 F4 | C4 | F4 | C4 | G4 | C4`
* ein Akkord `C4 | C4 | F4 | C4 F4 | C4 | F4 | C4 | [GBD]4 | C4`

### ein bisschen Groove - shuffle und triolen

`(3CzD (3EzF | G2G2 | (3AzA (3AzA | G4  | AAAA | G4 | FFFF | E2E2 | GGGG | C4`

## Layout und Extrakte

* Extrakt 1
* `config / voices` -    "1" : {"voices": [1]}
* Extrakt 2
* `config / voices` -    "1" : {"voices": [1]}

## flowlines

Extrakt 2 hat zu dünne Linien: `config flowlines` [2] eintragen

## tuning subflowlines

Extrakt 2: 







