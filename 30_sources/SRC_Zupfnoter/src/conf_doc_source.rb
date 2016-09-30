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

Spezifiziert einen Auszug. Bitte beachte

* Auszug 0 vererbt an folgende
* Auszug hat Struktur


})


a.insert('autopos', %Q{
Schalet die automatische positionierungn ein. Wenn ausgeschaltet, gelten die werte von pos.
})

a.insert('barnumbers.voices', %Q{
Nummern der STimmen, die Taktnummern bekommen sollen
})

a.insert('countnotes.voices', %Q{
Nummern der Stimmen, die Zählhilfen bekommmen sollen
})

a.insert('lyrics.1', %Q{
Positionierung der Liedtexte auf den Unterlegnoeten.
})

a.insert('lyrics.1.verses', %Q{
Liste der Strophen die im aktuellen Block ausgegeben werden.
})



a.insert('pos', %Q{
Position als x, y - Kordinate
})

a.insert('repeatsigns.voices', %Q{
Position als x, y - Kordinate
})



a.insert('stringnames.text', %Q{
Liste der Saitennamen getrennt druch Leerzeichen.
Die Liste wird so oft zusamengefügt, dass alle Saiten einen Nanen bekommen.

##Beispiel##

* `+ -` erzeugt `+ - +  + - + -`
})


a.insert('style', %Q{
Stil für den Text
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