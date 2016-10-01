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