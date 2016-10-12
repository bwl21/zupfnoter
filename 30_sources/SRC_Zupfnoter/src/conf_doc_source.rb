$:.unshift File.dirname(__FILE__)
require 'redcarpet'
require 'json'

require 'neatjson'
require 'i18n'
require 'init_conf'
require 'confstack'

class ConfDocProvider

  attr_reader :entries_html, :entries_md

  def initialize
    @renderer     = Redcarpet::Markdown.new(Redcarpet::Render::HTML, autolink: true, tables: true)
    @entries_md   = {}
    @entries_html = {}
  end

  def insert (key, markdown)
    @entries_md[key]   = markdown
    @entries_html[key] = @renderer.render(markdown)
  end

  def to_json
    JSON.neat_generate(@entries_html)
  end

end


class Document
  def self.ready?

  end
end


def get_example(conf, key)
  neatjson_options = {wrap:          60, aligned: true, after_comma: 1, after_colon_1: 1, after_colon_n: 1, before_colon_n: 1, sorted: true,
                      explicit_sort: [[:produce, :annotations, :restposition, :default, :repeatstart, :repeatend, :extract,
                                       :title, :voices, :flowlines, :subflowlines, :synchlines, :jumplines, :repeatsigns, :layoutlines, :barnumbers, :countnotes, :legend, :notes, :lyrics, :nonflowrest, :tuplet, :layout,
                                       :annotation, :partname, :variantend, :countnote, :stringnames, # sort within notebound
                                       :limit_a3, :LINE_THIN, :LINE_MEDIUM, :LINE_THICK, :ELLIPSE_SIZE, :REST_SIZE, # sort within laoyut
                                       "0", "1", "2", "3", "4", "5", "6", :verses, # extracts
                                       :cp1, :cp2, :shape, :pos, :hpos, :vpos, :spos, :text, :style, :marks # tuplets annotations
                                      ],
                                      []],
  }
  k                = key.split(".").last
  %Q{
"#{k}": #{JSON.neat_generate(conf[key], neatjson_options)}
  }.split("\n").map { |l| "        #{l}" }.join("\n")
end

ignore_patterns  = [/^neatjson/, /abc_parser^*/, /^extract\.[235].*/, /^defaults.*/, /^templates.*/, /^annotations.*/, /^extract\.[1234]/,
                    /^layout.*/
]
produce_patterns = [/annotations\.vl/, /^templates\.tuplets/]

a=ConfDocProvider.new

a.insert('annotations', %Q{
Hier kannst du eine Liste von vordefinierten notenbezogenen Anmerkiungen angeben.

Zupfnoter bringt einige solcher Definitionen bereits mit.

Diese notenbezogenen Beschriftungen kannst du über "Zusatz einfügen" mit einer Note
verbinden.
})

a.insert('annotations.vl', %Q{
Hier siehst du ein Beispiel für eine notenbezogenen Anmerkung (hier mit dem Namen 'vl').
Diese dient dazu ein "V" an die Harfennote zu drucken um anzudeuten, dass die Saite nach
Ablauf des Notenwertes abgedämpft werden soll.
})

a.insert('ELLIPSE_SIZE', %Q{
Hier kannst du die Größe der ganzen Noten einstellen. Sinnvolle Werte sind [2-4, 1.2-2].

>**Hinweis**: Die Größe der anderen Noten werden ausgehend von diesem Wert berechnet.
>
>Da die Noten auch mit der dicken Linie umrandet werden, kann auch die "Linienstärke 'dick'" reeduziert werden,
>um ein filigraneres Notenbild zu erhalten.
})

a.insert('extract', %Q{

Hier kannst du Auszüge für deine Unterlegnoten definieren. Das ist besonders bei mehrstimmigen Sätzen sinnvoll (Siehe Kapitel "Auszüge").

>**Hinweis**: Einstellungen im Auszug 0 wirken auf die anderen Auszüge, sofern sie dort nicht überschrieben werden.

`extract.0` spezifiziert den Auszug 0; `extract.1` spezifiziert den Auszug 1  usw.

})

a.insert('extract.0.filenamepart', %Q{
Hier kannst du einen Zusatz angeben, um welchen der Filename der PDF-Dateien für diesen Auszug ergänzt werden soll.
Auf diese Weise wird jeder Auszug in einer eigenen Datei wiedergegeben.

Wenn das Feld fehlt, dann wird der Filename aus dem Inhalt von 'extract.0.title' gebildet.

>**Hinweis**: Bitte achte darauf, daß jeder Auszug einen eindeutigen Filename-Zusatz oder Titel hat. Sonst
>überschreiben sich die Auszüge ggf. in dieselbe Datei geschrieben.

})

a.insert('extract.0.layoutlines', %Q{
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, die zur die Berechnung
des vertikalen Anordnugn der Noten (Layout) herangezogen werden sollen.

Üblicherweise werden alle Stimmen für die Berechnung des Layouts herangezogen. Bei langen Stücken kann es aber sinnvoll
sein, nur die dargstellten Stimmmen zur Berechnung des Layouts zu berücksichtigen, um ein ausgwogeneres Notenbild zu
bekommen.

>**Hineis**: Auch wenn der Parameter `layoutlines` heißt, bewirkt er nicht, dass irgendwelche Linien eingezeichnet werden.
})

a.insert('extract.0.legend', %Q{
Hier kannst du die Darstellung der Legende konfigurieren. Dabei wird unterschieden zwischen
* `pos` - Position des Titels des Musikstückes
* 'spos' - Position der Sublegende, d.h. der weiteren Angaben zum Musikstück

>**Hinewis**: Die Legende wird vorzugsweise durch Verschieben mit der Maus positioniert. Für eine genaue positionierung
kann jedoch die Eingabe über die Bildschirmmaske sinnvol sein.

})

a.insert('extract.0.legend.pos', %Q{
Hier kannst du die Darstellung des Titels des Musikstückes angeben. Die Angabe  erfolgt in mm als kommagetrennte Liste
von horizontaler / vertikaler Position.
})

a.insert('extract.0.legend.spos', %Q{
Hier kannst du die Darstellung der weiteren Angaben (Sublegende) des Musikstückes angeben. Die Angabe erfolgt in mm als kommagetrennte Liste
von horizontaler / vertikaler Position.
})

a.insert('extract.0.title', %Q{
Hier pezifizierst du den Titel des Auszuges. Er wird in der Legende mit ausgegeben.

>**Hinweis**: Der Titel des Auszuges wird an die Angabe in der Zeile "F:" angehängt, falls nicht noch ein 'extract.0.filenamepart' spezifiziert ist.

})

a.insert('autopos', %Q{
Hier kannst du die  automatische Positionierung einschalten. Dabei werden Zählmarken bzw. Taktnummern abhängig von der Größe der Noten platziert.
Wenn diese Option ausgeschaltet, gelten die Werte von `pos`. Dies kann bei manchen Stücken eine sinnvollere Einstellugn sein.

Die Zählmarken/Taktnummer lassen sich weiterhin mit der Maus verschieben.
})

a.insert('extract.0.barnumbers', %Q{
Hier kannst du angeben, wie Taktnummern in deinem Unterlegnotenblatt ausgegeben werden sollen.
})

a.insert('extract.0.barnumbers.voices', %Q{
Hier kannst du  eine Liste der Stimmen angeben, die Taktnummern bekommen sollen.
})

a.insert('extract.0.countnotes', %Q{
Hier kannst du angeben, ob und wie Zählmarken in deinem Unterlegnotenblatt ausgegeben werden sollen.

Zählmarken sind hilfreich, um sich ein Stück erarbeiten. Sie geben Hilfestellung beim einhalten
der vorgegebenen Notenweret.
})

a.insert('extract.0.countnotes.voices', %Q{
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, die Zählmarken bekommen sollen.
})

a.insert('extract.0.flowlines', %Q{
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, für die Flußlinien eingezeichnet werden sollen.
})

a.insert('extract.0.jumplines', %Q{
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, für die Sprunglinien eingezeichnet werden sollen.
})

a.insert('extract.0.subflowlines', %Q{
Hier kannst du du eine Liste - getrennt durch Komma - der Stimmen angeben, für die Unterflußlinien eingezeichnet werden sollen.
})

a.insert('extract.0.synchlines', %Q{
Hier kannst du angeben, welche Stimmenpaare über Synchronisationslinien verbunden werden sollen.

Die Angabe erfolgt in der Bildschirmmaske als eine durch Komma separierte Liste
von Stimmenpaaren (darin die Stimmen durch "-" getrennt).

Die Angabe `1-2, 3-4` bedeutet beispielsweise, dass zwischen den Stimmen 1 und 2 bzw. den Stimmen 3 und 4
eine Synchronisationslinie gezeichnet werden soll.

>**Hinweis**:In der Texteingabe wird das als eine Liste von zweiwerteingen Listen dargestellt.
})



a.insert('layout', %Q{
Hier kannst du die Parameter für das Layout eintsllen.
Damit lässt das Notenbild gezielt optimieren.
})

a.insert('layout.limit_a3', %Q{
Diese Funktion verschiebt Noten am A3-Blattrand
nach innen. Da das Unterlegnotenblatt etwas
größer ist als A3 würde sonst die Note angeshnitten.
})

a.insert('layout.LINE_THIN', %Q{Hier stellst du die Breite (in mm) von dünnen Linien ein.})
a.insert('layout.LINE_MEDIUM', %Q{Hier stellst du die Breite (in mm) von mittelstarken Linien ein.})
a.insert('layout.LINE_THICK', %Q{Hier stellst du die Breite (in mm) von dicken Linien ein.})

a.insert('lyrics', %Q{
Hier steuerst du die Positionierung der Liedtexte. Dabei kannst du den Liedtext
auf mehrer Blöcke aufteilen.

Ein einzelner Block listet die Strophen auf, die er enthält,
und die gemeinsam poitioniert werden.
})


a.insert('lyrics.0', %Q{
## Liedtextblock

Hier definierst du einen einzelner Block von Liedtexten.
})

a.insert('lyrics.0.pos', %Q{
Hier gibst du die Position an, an welcher der Liedtext-Block ausgegeben werden soll.
Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.
})

a.insert('lyrics.pos', %Q{
Dies ist die Vorgabe für Position, an welcher der Liedtext-Block ausgegeben werden soll.
Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.
})


a.insert('lyrics.0.verses', %Q{
Hier gibst du die Liste der Strophen an die im Liedtext-Block ausgegeben werden.
})

a.insert('lyrics.verses', %Q{
Dies ist die Vorgabe für die Liste der Strophen die im Liedtext-Block ausgegeben werden.
})


a.insert('nonflowrest', %Q{
Hier kannst du einstellen, ob in den Begleitstimmen ebenfalls die Pausen dargestellt werden sollen. Eine Stimme
wird dann Begleitstimme betrachtet, wenn sie keine Flußlinie hat.

Normalerweise ist es nicht sinnvoll, in den Begleitstimmen Pausen darzustellen, da der Spieler sich ja an
den Pausen in der Flußlinie orientiert.
})

a.insert('notes', %Q{
Hier kannst du eine Seitenbeschriftungen hinzufügen. Beim Einfügen einer Seitenbeschriftung vergibt Zupfnoter
eine Nummer anstelle der '.0'. Es kann aber auch sinnvoll sein eine sprechende Bezeichnung für die Beschriftung
manuell vorzugeben um ihrer spezifische Verwendung hervorzuheben z.B. `notes.T_Copyright`. Das
ist allerdings nur in der Textansicht möglich.
})


a.insert('notes.0.pos', %Q{
Hier gibst du die Position der Seitenbeschriftung an, an welcher der Liedtext-Block ausgegeben werden soll.
Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.
})


a.insert('pos', %Q{
Hier gibst du die Position an.
Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.
})

a.insert('prefix', %Q{
Hier kannst du einen Text angeben, der z.B. vor der Taktnummeer ausgegeben werden soll (Präfix).
})

a.insert('produce', %Q{
Hier kannst du eine Liste der Auszuüge angeben, für welche eine PDF-DAtei mit erzeugt werden soll.

>**Hinweis:**
>Manchmal ist es sinnvoll, Auszüge nur zur Bearbeitung anzulegen, diese aber nicht zu drucken.
>Es kommt auch vor, dass Auszug 0 nur verwendet wird, um Vorgaben für die anderen Auszüge zu machen,
>nicht aber um ihn wirklich auszudrucken.
})

a.insert('printer', %Q{
Hier kannst du das Druckbild auf deine Drucher-Umgebung anpassen.

>**Hinweis:** Durch Verwendung dieser Funktion passen die erstellten
>PDF-Dateien eventuell nicht mehr auf andere Umgebungen. Bitte
>verwende die Funktion also erst, wenn du keine geeigneten Einstellungen
>in deinem Druckdialog findest.
})

a.insert('printer.a3_offset', %Q{
Hier defnierst du, wie das Druckbild beim Ausdruck auf A3-Papier verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.

>**Hinweis**: Wenn ein Unterlegnotenblatt für
>eine 25 saitige Harfe auf ein A3-Blatt gedruckt wird,
>ist es sinnvoll, das Druckbild um 10 mm nach links zu verschieben.
>Dadurch werden die Noten vom Drucker nicht mehr angeschnitten.
>
>In diesem Fall kann es auch sinnvoll sein, `limit-A3 auzuschalten.
})

a.insert('printer.a4_offset', %Q{
Hier defnierst du, wie das Druckbild beim Ausdruck auf A3-Papier verschoben werden soll.

Angabe erfolgt in mm als kommagetrennte Liste von horizontaler / vertikaler Position.
})

a.insert('printer.show_border', %Q{
Hier kannst du einstellen, ob die Blattbegrenzung gedruckt werden soll.
Die Blattbegrenzung liegt eigntlich ausserhalb
des Bereiches, den der Drucker auf dem Papier
bedrucken kann. Wenn der Drucker das Druckbild auf dem Papier
zentriert, ist die Blattbegrenzung nicht sichtbar.
Ihre Darstellung auf der Druckvorschau kann trotzdem hilfreich sein.

Manche Drucker positionieren das Druckbild aber nicht zentriert auf dem Papier.
Dadurch wird die Blattbegrenzung gedruckt, dafür fehlen dann
unten ca. 10 mm.

Versuche in diesem Fall, ob das Ausschalten der Blattbegrenzung die Situation
verbessert.
})

a.insert('repeatsigns', %Q{
Hier kannst du die Darstellung der Wiederholungszeichen steuern. Dabei wird angegeben,
für welche Stimmen Wiederholgungszeichen gedruckt werden, wie die Wiederholungszeichen gedruckt werden,
und wie sie positioniert werden.
})

a.insert('repeatsigns.left', %Q{
Hier kannst du die Darstellung des linken Wiederholungszeichen steuern.
})

a.insert('repeatsigns.voices', %Q{
Hier gibst du eine Liste (durch Komma getrenn) der Stimmen and, für welche Wiederholungszeichen anstelle von Sprunglinine ausgegeben werden.

>Hinweis: Zupnoter stellt für die hier aufgelisteten Stimmen keine Sprunglinien mehr dar.
})

a.insert('repeatsigns.left.text', %Q{
Hier gibst du den Text an, der als linkes Wiederholungszeichen ausgegeben werden soll.
})

a.insert('repeatsigns.right', %Q{
Hier kannst du die Darstellung des rechten Wiederholungszeichen steuern.
})


a.insert('repeatsigns.right.text', %Q{
Hier gibst du den Text an, der als rechtes Wiederholungszeichen ausgegeben werden soll.
})

a.insert('restposition', %Q{
Hier kannst du angeben an welcher Tonhöhe die Pausen eingetragenw werden sollen. Pausen
haben an sich keine Tonhöhe, daher ist es nicht eindeutig, wie sie im Umterlegnotenblatt
positioniert werden sollen.

* `center` positioniert die Pause zwischen die vorherige und die nächste Note
* `next` positioniert die Pause auf die gleiche Tonhöhe wie die nächste Note
* `default` übernimmt den Vorgabewert.
})

a.insert('restposition.default', %Q{
Hier kannst den Vorgabewert für die Pausenposition angeben.

>**Hinweis**: `default` als Vorgabewert nimmt den intenrn Vorgabewert `center`.
})


a.insert('restposition.repeatstart', %Q{
Hier kannst du die Pausenposition vor einer Wiederholung einstellen.
})

a.insert('restposition.repeatend', %Q{
Hier kannst du die Pausenposition nach einer Wiederholung einstellen.
})

a.insert('REST_SIZE', %Q{
Hier kannst du die Größe der Pausen einstellen. Sinnvolle Werte sind [2-4, 1.2-2]

>**Hinweis**:Bitte beachte, dass im Grund nur die Angabe der Hähe von Bedeutung ist, da das Pausensymbol nicht verzert wird.
})

a.insert('startpos', %Q{
Hier kannst du die Position von oben angeben, an welcher die
Harfennoten beinnen. Damit kannst du ein ausgewogeneres Bild erhalten.

>**Hinweis**:Durch diese Funktion wird auch der Bereich verkleinert, in dem
die Noten dargestellt werden. Sie ist daher vorzugsweise bei kurzen Stücken
>anzuwenden, die sonst oben auf der Seite hängen.
})

a.insert('stringnames', %Q{
Hier kannst du stueern, ob und wie Saitennamen auf das Unterlegnotenblatt
gedruckt werden.
})

a.insert('stringnames.marks', %Q{
Hier kannst du angeben, ob und wo Saitenmarken gedruckt werden.
})

a.insert('stringnames.marks.hpos', %Q{
Hier gibst du die horizontale Position der Saitenmarken an. Die Angabe ist eine
durch Komma getrennte liste von Midi-Pitches.

Die Angabe `[43, 55, 79]` druckt Saitenmarken bei `G, G, g'`. also bei den
äußeren G-Saiten der 25-saitigen bzw. der 37-saitigen Tischharfe.
})


a.insert('stringnames.text', %Q{
Hier gibst du die Liste der Saitennamen getrennt druch Leerzeichen an.
Die Liste wird so oft zusamengefügt, dass alle Saiten einen Nanen bekommen.

In der Regel reicht es also, die Saitennamen für eine Oktave anzugeben.

##Beispiel##

* `+ -` erzeugt `+ - +  + - + -`
* `C C# D C# E F F# G G# A A# Bb B` erzeugt die regulären Saitennamen
})


a.insert('style', %Q{
Hier kannst du den Stil für den Text einstellen. Du hast eine Auswahl aus vordefinierten Stilen.
})

a.insert('templates', %Q{
Dieser Parameter kann nicht vom Benutzer gesetzt werden sondern liefert die Vorlagen beim Einfügugen
neuer Liedtext-Blöcke bzw. Seitenbeschriftungen etc.

Er ist hier aufgeführt, um die Vorlagen selbst zu dokumentieren.
})

a.insert('tuplet', %Q{
Hier kannst du die Darstellung von Triolen (genauer gesagt, von Tuplets) steuern.
})


a.insert('tuplet.0', %Q{
Hier kannst du die Darstellung einer Triole (genauer gesagt, eines Tuplets) steuern.
})

a.insert('cp1', %Q{
Hier gibst du den Kontrollpunkt für die erste Note an.
})

a.insert('cp2', %Q{
Hier gibst du den Kontrollpunkt für die letzte Note an.
})

a.insert('shape', %Q{
Hier gibst du eine Liste von Linienformen für das Tuplet an.

* `c`: Kurve
* `l`: Linie

>**Hinweis**: Mit der Linienform `l` kann man die Lage der kontrollpunkte sehen.

})


a.insert('text', %Q{
Hier gibst du den Text, der ausgegeben werden soll. Dieser Text kann auch mehrzeilig sein
})

a.insert('voices', %Q{
Hier gibst du eine Liste von Sstimmen als (durch Komma getrennte) Liste von Nummern an.
Die Nummer ergibt sich aus der Reihnfolge in der `%%score` - Anweisung in der ABC-Notation.
})

a.insert('vpos', %Q{
Hier gibst du einen Abstand vom oberen Blattrand. Die Angabe erfolgt in mm.
})

a.insert('wrap', %Q{
Hier kannst du angeben, in welcher Spalte der Zeilenumbruch im Konfigurationsabschnitt erfolgen soll.
Das kann bei komplexen Konfigurationen sinnvoll sein, um die Übersichtlichkeit zu erhöhen.
})


#-- generate helptexts

File.open("../public/locale/conf-help_de-de.json", "w") do |f|
  f.puts a.to_json
end



#-- generate configuration doc

$conf_helptext = a.entries_html

ignore_patterns  = [/^neatjson.*/, /abc_parser.*/, /^extract\.[235].*/, /^defaults.*/, /^templates.*/, /^annotations.*/, /^extract\.[1234]/,
                    /^layout.*/, /^extract\.0$/
]
produce_patterns = [/annotations\.vl/, /^templates\.tuplets/, /^extract$/,  /^templates/]



locale = JSON.parse(File.read('../public/locale/de-de.json'))

$conf = Confstack.new(false)
$conf.push(JSON.parse(InitConf.init_conf.to_json))

ignore_keys  = $conf.keys.select { |k| ignore_patterns.select { |ik| k.match(ik) }.count > 0 }
produce_keys = $conf.keys.select { |k| produce_patterns.select { |ik| k.match(ik) }.count > 0 }
show_keys    = ($conf.keys - ignore_keys + produce_keys).uniq.sort_by{|k| k.gsub('templates', 'extract.0')}

mdhelp = []
show_keys.each do |key|
  show_key = key#.gsub(/^templates\.([a-z]+)(\.)/){|m| "extract.0.#{$1}.0."}

  candidate_keys = I18n.get_candidate_keys(key)
  candidates     = candidate_keys.map { |c| a.entries_md[c.join('.')] }

  helptext = candidates.compact.first || %Q{TODO: Helptext für #{key} einfügen }

  result = %Q{

## `#{show_key}` - #{locale['phrases'][key.split(".").last]}

  #{helptext}

#{get_example($conf, key)}
}
  mdhelp.push result
end

File.open("xxx.md", "w") do |f|
  f.puts "# Konfiguration der Ausgabe"
  f.puts  %Q{

Dieses Kapitel beschreibt die Konfiguration der Erstellung der Unterlegnotenblätter. Das Kapitel ist als Referenz aufgebaut.
Die einzelnen Konfigurationsparameter werden in alphabetischer Reihenfolge aufgeführt. Bei den einzelnen Parametern
wird der Text der Online-Hilfe, sowie die Voreinstellungen des Systems dargestellt.

>**Hinweis**: Auch wenn in den Bildschirmmasken die Namen der Konfigurationsparameter übersetzt sind, so basiert
>diese Referenz den englischen Namen.

>**Hinweis**: Manche Konfigurationsparameter treten können mehrfach auftreten (z.B. `extract`). In diesem Kapitel wird
>dann immer die Instanz mit der Nr. 0 (z.B. `extract.0`) beschrieben.
          }
  f.puts mdhelp
end


# ---- generate missing locales


require './controller.rb'
require './confstack.rb'
require './neatjson.rb'


a = InitConf.init_conf
b = Confstack.new(false)
b.push(JSON.parse(a.to_json))

knownkeys = JSON.parse(File.read("../public/locale/de-de.json"))
keys      = []
Dir['user-interface.js'].each do |file|
  File.read(file).scan(/(caption|text|tooltip):\s*["']([^'"]*)["']/) do |clazz, key|
    key = key.gsub("\\n", "\n")
    keys.push(key) unless knownkeys['phrases'].has_key? key
  end
  File.read(file).scan(/(w2utils\.lang\()["']([^'"]*)["']\)/) do |clazz, key|
    key = key.gsub("\\n", "\n")
    keys.push(key) unless knownkeys['phrases'].has_key? key
  end
end

Dir['*.rb'].each do |file|
  File.read(file).scan(/(I18n\.t)\(['"]([^'"]+)['"]/) do |clazz, key|
    key = key.gsub("\\n", "\n")
    keys.push(key) unless knownkeys['phrases'].has_key? key
  end
end

b.keys.each do |key|
  key.split(".").each do |key|
    keys.push(key) unless knownkeys['phrases'].has_key? key
  end
end

File.open("x.locales.template", "w") do |f|
  f.puts keys.to_a.map { |v| %Q{"#{v}": "**--#{v}"} }.uniq.sort_by{|i|i.upcase}.join(",\n")
end
