@startuml "x.png"

actor Benutzer

database abc

database noten as "Notensytem: 
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


entity pdf
entity screen
entity sound


Benutzer --> abc: Noten eingeben
abc -> noten: umwandeln
noten -> harpnotes: umwandeln
harpnotes --> layout :umwandeln
layout --> pdf
layout --> screen
harpnotes --> player
player --> sound
@enduml