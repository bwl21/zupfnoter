~~~~ {.plantuml}

@startuml "../ZGEN_uml/model_flow.png"

actor Benutzer

database abc

database noten as "Notensystem: 
Takt 
Note 
Akkord"

database harpnotes as "Harfennoten:
Noten
Melodie
Sprung
Anmerkung"


database layout as "Layout:
Ellipse
Linie
Zeichen
Text"

database player as "Player:
Zeit
Tonhoehe
Dauer"

entity musicxml
entity pdf as "Druck"
entity screen as "Bildschirm"
entity sound as "Abspielen"


Benutzer --> abc: Noten eingeben
abc -> noten: umwandeln
musicxml --> abc: importieren
noten -> harpnotes: umwandeln
harpnotes --> layout :umwandeln
layout --> pdf : Druck A3
layout --> pdf : Druck A4
layout --> screen
harpnotes --> player
player --> sound
@enduml
~~~~


~~~~ {.plantuml}
@startuml ../ZGEN_uml/zn_komponenten.png

package textinput {
[EditorArea] <<textarea>>
[Editor] <<class>>
}

Editor -> textChange : provide
Editor -> selectionChange : provide

[MidiDevice] <<class>>


[ABCParser] <<class>>

[NoteDisplay] <<class>>

[HarpDisplay] <<class>>


[UiController]

[Controller] <<class>>

[ABCModel] <<class>>

Editor -> Controller : selectionChanged
Editor -> Controller : textChanged
Controller -> MidiDevice : playSelection

Controller -> ABCParser : convertModel
Controller -> NoteDisplay : loadModel
Controller -> HarpDisplay : loadModel

NoteDisplay -> Controller : selectionChanged
Controller -> MidiDevice : playSelection




@enduml

~~~~

~~~~ {.plantuml}
@startuml ../ZGEN_uml/zn_setup.png

Actor User

== Setup ==

Controller -> Editor : new(contoller)
activate Editor
Controller -> Editor : register(text_listener)
Editor -> Controller : register(text_listener)

Controller ->MidiDisplay : new(contoller)
activate MidiDisplay
Controller ->MidiDisplay :  register(abc_listener)
MidiDisplay -> Controller : register(abc_listener)

Controller ->NoteDisplay : new(contoller)
activate NoteDisplay
NoteDisplay -> Controller : register(abc_listener)
Controller ->NoteDisplay : register(abc_listener)

== Enter ABC text ==

User -> Editor : enterText

Editor -> Controller : [text, selection] = text_listener.textChanged

Controller -> ABCParser : abc_model = parse(text, selection)

Controller -> MidiDisplay : abc_listener.load(abc_model)
Controller -> MidiDisplay : abc_listener.select(selection)
Controller -> MidiDisplay : abc_listener.playSelection

Controller -> NoteDisplay : abc_listener.load(abc_model)

== user selects a range in Editor ==

User -> Editor : select
Editor -> Controller : [text, selection] = text_listener.textChanged
Controller -> ABCParser : abc_model = parse(text, selection)
Controller -> MidiDisplay : abc_listener.load(abc_model)
Controller -> MidiDisplay : abc_listener.select(selection)
Controller -> MidiDisplay : abc_listener.playSelection
loop for every note
MidiDisplay -> Controller : abc_listener.select(currentNote)
Controller -> NoteDisplay : abc_listner.select(selection)
end
MidiDisplay -> controller : abc_listener.select(selection)

== user wants to hear the selection ==

User -> Controller : playCurrentSelection
Controller -> MidiDisplay : abc_listener.playSelection

== user wants to hear all ==

User -> Controller : playAll
Controller -> MidiDisplay : abc_listener.playAll

== user clicks a Note ==


User -> NoteDisplay : click
NoteDisplay -> Controller : abc_listener.selectionChanged
Controller -> MidiDisplay : abc_listener.select(note)
Controller -> NoteDisplay : abc_listener.select(note)
Controller -> Editor : text_listener.select(note)
Controller -> MidiDisplay : abc_listener.playSelection



@enduml

~~~~

