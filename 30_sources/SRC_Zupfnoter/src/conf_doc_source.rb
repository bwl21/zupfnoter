require 'redcarpet'
require 'json'
require './neatjson'

class ConfDocProvider


  def initialize
    @renderer = Redcarpet::Markdown.new(Redcarpet::Render::HTML, autolink: true, tables: true)
    @entries_md = {}
    @entries_html = {}
  end

  def insert (key, markdown)
    @entries_md[key] = markdown
    @entries_html[key] = @renderer.render(markdown)
  end

  def to_json
    JSON.neat_generate(@entries_html)
  end

end


a=ConfDocProvider.new

a.insert('extract', %Q{

Spezifiziert Auszüge für deine Unterlegnoten Bitte beachte

* Auszug 0 vererbt an folgende
* Auszug hat Struktur:
  *  bla fasel

})

a.insert('extract.0', %Q{

Spezifiziert einen konkreten Auszug für deine Unterlegnoten

})



a.insert('autopos', %Q{
Schaltet die automatische positionierungn ein. Wenn ausgeschaltet, gelten die Werte von pos.
})

a.insert('extract.0.barnumbers.voices', %Q{
Liste von  Stimmen, die Taktnummern bekommen sollen
})

a.insert('extract.0.countnotes.voices', %Q{
Liste von Stimmen, die Zählhilfen bekommmen sollen
})


a.insert('layout', %Q{
Hier kannst du die Parameter für das Layout eintsllen.
Damit lässt das Notenbild gezielt optimieren.
})

a.insert('layout.limit_a3', %Q{
Diese Funktion verschibt Noten am A3-Blattrand
nach innen. Da das Unterlegnotenblatt etwas
größer ist als A3 würde sonst die Note angeshnitten.
})

a.inset('layout.LINE_THIN', %Q{Stellt die Breite von dünnen Linien ein.})
a.inset('laoyut.LINE_MEDIUM', %Q{Stellt die Breite von mittleren Linien ein (z.B. Flußline})
a.inset('', %Q{})
a.inset('', %Q{})
a.inset('', %Q{})


a.insert('lyrics', %Q{
Hier wird die Positionierung der Liedtexte gesteuert.
Man kann die Liedtexte auf mehrer Blöcke aufteilen.
Ein einzelner Block listet die Strophen auf, die er enthält,
und die gemeinsam poitioniert werden.
})


a.insert('lyrics.0', %Q{
## Liedtextblock

Ein einzelner Block von Liedtexten.
})

a.insert('lyrics.0.pos', %Q{
Position (angeben als x,y) an welcher der Liedtext-Block ausgegeben werden soll.
})


a.insert('lyrics.0.verses', %Q{
Liste der Strophen die im Liedtext-Block ausgegeben werden.
})

a.insert('notes.0.pos', %Q{
Position (angeben als x,y) der Seitenbeschriftung
})


a.insert('pos', %Q{
Position (angeben als x,y)
})


a.insert('printer', %Q{
Hier kannst du das Druckbild auf deine Umrebung anpassen.

>**Hinweis** Durch Verwendung dieser Funktion passen die erstellten
>PDF-Dateien eventuell nicht mehr auf andere Umgebungen. Bitte
>verwende die Funktion also erst, wenn du keine geeigneten Einstellungen
>in deinem Druckdialog findest.
})

a.insert('printer.a3_offset', %Q{
Verschiebt das Druckbild beim Ausdruck auf A3-Papier.
Angabe als x, y in mm.

Dies ist sinnvoll, wenn ein Unterlegnotenblatt für
eine 25 saitige Harfe auf ein A3-Blatt gedruckt wird.

In diesem Fall kann es auch sinnvoll sein, "limit-A3" auzuschalten.
})

a.insert('printer.a4_offset', %Q{
Verschiebt das Druckbild beim Ausdruck auf A4-Papier.
Angabe als x, y in mm.
})

a.insert('printer.show_border', %Q{
Steuert, ob die Blattbegrenzung gedruckt werden soll.
Die Blattbegrenzung liegt eigntlich ausserhalb
des Bereiches, den der Drucker auf dem Papier
bedrucken kann. Wenn das Druckbild auf dem Papier
zentriert wird, ist die Blattbegrenzung nicht sichtbar.

Manche Drucker positionieren das Druckbild aber nicht zentriert auf dem Papier.
Dadurch wird die Blattbegrenzung gedruckt, dafür fehlen
unten ca. 10 mm.

Versuche ob das Ausschalten der Blattbegrenzung die Situation
verbessert.
})

a.insert('repeatsigns.voices', %Q{
Liste der Stimmen für die Wiederholungszeichen anstelle von Sprunglinine ausgegeben werden.
})

a.insert('stringnames.text', %Q{
Liste der Saitennamen getrennt druch Leerzeichen.
Die Liste wird so oft zusamengefügt, dass alle Saiten einen Nanen bekommen.

In der Regel reicht es also, die Saitennamen für eine Oktave anzugeben.

##Beispiel##

* `+ -` erzeugt `+ - +  + - + -`
* `C C# D C# E F F# G G# A A# Bb B` erzeugt die regulären Saitennamen
})


a.insert('style', %Q{
Formatstil für den Text.
})



a.insert('text', %Q{
Text, der ausgegeben werden soll. Kann auch mehrzeilig sein
})

a.insert('voices', %Q{
Nummern der Stimmen für diesen Auszug.
Die Nummer ergibt sich aus der Reihnfolge in der %%score - Aweisung.
})

a.insert('vpos', %Q{
Vertikaler Abstand vom oberen Blattrand in mm
})


File.open("../public/locale/conf-help_de-de.json", "w") do |f|
  f.puts a.to_json
end