# Konzept: Stile für Stimmen (Voice Styles)

## Übersicht

Dieses Feature ermöglicht es, visuelle Stile (Linienbreite, Notengröße, Farbe) als benannte 
Vorlagen zu definieren und diese pro Extrakt den einzelnen Stimmen zuzuordnen. 
In einer zweiten Ausbaustufe soll die Zuordnung auch abschnittsweise innerhalb einer Stimme 
überschrieben werden können.

## Ist-Zustand

### Aktuelle Architektur

Die visuellen Eigenschaften werden aktuell **global pro Extrakt** in `extract.<nr>.layout` festgelegt:

```json
{
  "extract": {
    "0": {
      "layout": {
        "LINE_THIN":     0.1,
        "LINE_MEDIUM":   0.3,
        "LINE_THICK":    0.5,
        "ELLIPSE_SIZE":  [3.5, 1.7],
        "color": {
          "color_default":  "black",
          "color_variant1": "grey",
          "color_variant2": "dimgrey"
        }
      },
      "voices": [1, 2, 3, 4]
    }
  }
}
```

### Wie Stile aktuell angewendet werden

1. **Farbe**: `Drawable#initialize` holt `$conf.get('layout.color.color_default')`. 
   Die Methode `compute_color_by_variant_no` wählt Farbe nach Variante (1./2. Wiederholung), 
   nicht nach Stimme. → **Es gibt keine Farbe pro Stimme.**

2. **Notengröße** (`ELLIPSE_SIZE`): Wird in `compute_ellipse_properties_from_note` aus 
   `$conf.get('layout.ELLIPSE_SIZE')` gelesen – **global für alle Stimmen** im Extrakt.

3. **Linienbreite** (`LINE_THICK`, `LINE_MEDIUM`, `LINE_THIN`): Wird in `layout_note`, 
   `layout_note_flags`, Flowlines etc. direkt aus `$conf` gelesen – ebenfalls **global**.

4. **Layout-Schleife** (`_layout_voices`): Iteriert über `active_voices` und ruft 
   `layout_voice(v, ..., voice_nr: index, ...)` auf. Der `voice_nr` wird durchgereicht, 
   aber **nicht** genutzt, um Stilparameter abzurufen.

## Konzept Stufe 1: Benannte Stile pro Stimme im Extrakt

### 1.1 Neue Konfigurationsstruktur

#### Stil-Definitionen (Top-Level)

Unter einem neuen Top-Level-Schlüssel `voice_styles` werden benannte Stile definiert:

```json
{
  "voice_styles": {
    "melodie_prominent": {
      "LINE_MEDIUM":  0.3,
      "LINE_THICK":   0.7,
      "ELLIPSE_SIZE": [4.0, 2.0],
      "REST_SIZE":    [4, 2],
      "color":        "black"
    },
    "begleitung_dezent": {
      "LINE_MEDIUM":  0.15,
      "LINE_THICK":   0.3,
      "ELLIPSE_SIZE": [2.5, 1.2],
      "REST_SIZE":    [3, 1.2],
      "color":        "grey"
    },
    "bass_mittel": {
      "LINE_MEDIUM":  0.2,
      "LINE_THICK":   0.5,
      "ELLIPSE_SIZE": [3.5, 1.7],
      "REST_SIZE":    [4, 2],
      "color":        "darkblue"
    }
  }
}
```

**Begründung für Top-Level:**
- Stile sind wiederverwendbar über mehrere Extrakte hinweg.
- Analog zu `layout.FONT_STYLE_DEF`, das ebenfalls als Lookup-Table funktioniert.

#### Stil-Zuordnung pro Extrakt

In jedem Extrakt können Stile den Stimmen zugeordnet werden:

```json
{
  "extract": {
    "0": {
      "voices": [1, 2, 3, 4],
      "voice_styles": {
        "1": "melodie_prominent",
        "2": "begleitung_dezent",
        "3": "melodie_prominent",
        "4": "bass_mittel"
      }
    },
    "1": {
      "voices": [1, 2],
      "voice_styles": {
        "1": "melodie_prominent",
        "2": "begleitung_dezent"
      }
    }
  }
}
```

**Wenn keine Zuordnung vorhanden**, gelten die bestehenden globalen Werte aus 
`extract.<nr>.layout` – volle Rückwärtskompatibilität.

### 1.2 Vordefinierte Presets

Die bestehende Preset-Struktur in `init_conf.rb` (`presets.layout`) wird erweitert:

```ruby
presets: {
  voice_styles: {
    'melodie_prominent' => {
      LINE_MEDIUM:  0.3,
      LINE_THICK:   0.7,
      ELLIPSE_SIZE: [4.0, 2.0],
      REST_SIZE:    [4, 2],
      color:        'black'
    },
    'begleitung_dezent' => {
      LINE_MEDIUM:  0.15,
      LINE_THICK:   0.3,
      ELLIPSE_SIZE: [2.5, 1.2],
      REST_SIZE:    [3, 1.2],
      color:        'grey'
    },
    'bass_mittel' => {
      LINE_MEDIUM:  0.2,
      LINE_THICK:   0.5,
      ELLIPSE_SIZE: [3.5, 1.7],
      REST_SIZE:    [4, 2],
      color:        'darkblue'
    }
  }
}
```

### 1.3 Implementierungs-Änderungen

#### a) `init_conf.rb`

- Neuer Top-Level-Schlüssel `voice_styles` mit Standard-Stilen.
- Template für `voice_styles` in Extrakt (leer = keine Überschreibung).
- `explicit_sort` um `:voice_styles` erweitern.

#### b) `harpnotes.rb` – Stil-Auflösung

**Neue Methode `resolve_voice_style(voice_nr, print_variant_nr)`:**

```ruby
def resolve_voice_style(voice_nr, print_variant_nr)
  # 1. Prüfe ob ein Stil-Name für diese Stimme im Extrakt definiert ist
  style_name = @print_options_hash.dig(:voice_styles, voice_nr.to_s)
  
  # 2. Falls ja, hole die Stil-Definition
  if style_name
    style = $conf.get("voice_styles.#{style_name}")
    return style if style
    $log.warning("voice_style '#{style_name}' not found for voice #{voice_nr}")
  end
  
  # 3. Fallback: globale Layout-Werte (bisheriges Verhalten)
  nil
end
```

#### c) `harpnotes.rb` – Anwendung in `_layout_voices`

In der Schleife über `active_voices` (Zeile ~2646) wird der aufgelöste Stil als 
Parameter an `layout_voice` weitergereicht:

```ruby
res_voice_elements = music.voices.each_with_index.map { |v, index|
  if active_voices.include?(index)
    voice_style = resolve_voice_style(index, print_variant_nr)
    
    layout_voice(v, compressed_beat_layout_proc, print_variant_nr,
                 voice_nr:      index,
                 voice_style:   voice_style,   # NEU
                 # ... bestehende Optionen ...
    )
  end
}.flatten.compact
```

#### d) `harpnotes.rb` – Anwendung in `layout_note`, `layout_pause`, Flowlines

Die Stellen, die aktuell `$conf.get('layout.LINE_THICK')`, `$conf.get('layout.ELLIPSE_SIZE')` 
etc. lesen, werden angepasst, um zuerst den Voice-Style zu prüfen:

```ruby
def get_voice_style_value(key, voice_style)
  # Voice-Style hat Vorrang vor globalem Layout
  if voice_style && voice_style[key]
    voice_style[key]
  else
    $conf.get("layout.#{key}")
  end
end
```

Betroffene Methoden:
- `layout_note` → `LINE_THICK`, `ELLIPSE_SIZE`, color
- `layout_pause` → `REST_SIZE`, color
- `layout_note_flags` → `LINE_MEDIUM`, color
- `_layout_voice_flowlines` → `LINE_THIN`, color
- `_layout_voice_subflowlines` → `LINE_THIN`, color
- `_layout_voice_gotos` → `LINE_THICK`, color
- `compute_ellipse_properties_from_note` → `ELLIPSE_SIZE`, `DURATION_TO_STYLE`
- `compute_color_by_variant_no` → muss Voice-Farbe berücksichtigen

**Wichtig:** `show_options[:voice_style]` wird durch alle diese Methoden durchgereicht, 
da `show_options` bereits der zentrale Parameter-Container ist.

#### e) Farbe: Erweiterung von `compute_color_by_variant_no`

```ruby
def compute_color_by_variant_no(variant_no, voice_style = nil)
  if variant_no == 0
    # Voice-Style-Farbe oder globaler Default
    result = (voice_style && voice_style[:color]) || @color_default
  else
    result = variant_no.odd? ? @color_variant1 : @color_variant2
  end
  result
end
```

### 1.4 Betroffene Dateien

| Datei | Änderungen |
|-------|-----------|
| `init_conf.rb` | Neue `voice_styles`-Defaults, Presets, Sort-Einträge |
| `harpnotes.rb` | `resolve_voice_style`, Anpassung von ~10 Layout-Methoden |
| `controller_command_definitions.rb` | Add/Edit-Commands für `voice_styles` |
| `conf_doc_source.rb` / `help_de-de.md` | Dokumentation |
| `config-form.rb` | Typ-Definitionen für neue Konfig-Felder |
| `user-interface.js` | Menüeinträge für Voice-Styles |
| `opal-ajv.rb` | JSON-Schema-Erweiterung |

### 1.5 Datenfluss

```
init_conf.rb                    Nutzerkonfiguration (JSON)
     │                                │
     ▼                                ▼
  $conf (Confstack)  ◄── push ── extract.<nr> Optionen
     │
     ├── voice_styles.melodie_prominent  (Stil-Definition)
     ├── voice_styles.begleitung_dezent
     │
     ▼
  _layout_prepare_options(print_variant_nr)
     │
     ├── @print_options_hash[:voice_styles]["1"] = "melodie_prominent"
     │
     ▼
  _layout_voices()
     │
     ├── für jede Stimme: resolve_voice_style(voice_nr)
     │       │
     │       ▼
     │   voice_style = {LINE_THICK: 0.7, ELLIPSE_SIZE: [4,2], color: "black"}
     │
     ▼
  layout_voice(v, ..., voice_style: voice_style)
     │
     ├── layout_note()       → benutzt voice_style für Größe, Farbe, Linienbreite
     ├── _layout_flowlines() → benutzt voice_style für Linienbreite, Farbe
     └── _layout_gotos()     → benutzt voice_style für Linienbreite, Farbe
```


---

## Konzept Stufe 2: Abschnittsweise Überschreibung

### 2.1 Idee

Innerhalb einer Stimme soll der Stil für bestimmte Takt-Bereiche (Abschnitte) 
überschrieben werden können. Beispiel: In Takt 17–24 soll die Melodie-Stimme 
dezenter dargestellt werden, weil dort eine andere Stimme führt.

### 2.2 Konfigurationsstruktur

```json
{
  "extract": {
    "1": {
      "voices": [1, 2],
      "voice_styles": {
        "1": "melodie_prominent"
      },
      "voice_style_overrides": {
        "1": [
          {
            "from": 17,
            "to":   24,
            "style": "begleitung_dezent"
          },
          {
            "from": 33,
            "to":   40,
            "style": "bass_mittel"
          }
        ]
      }
    }
  }
}
```

- `from` / `to`: Taktnummern (1-basiert, wie in der ABC-Notation).
- `style`: Name eines definierten Stils oder ein Inline-Style-Objekt:

```json
{
  "from": 17,
  "to": 24,
  "style": {
    "LINE_THICK": 0.2,
    "color": "lightgrey"
  }
}
```

### 2.3 Implementierung

#### a) Stil-Auflösung wird kontextabhängig

```ruby
def resolve_voice_style_for_playable(voice_nr, playable, print_variant_nr)
  # 1. Basis-Stil der Stimme
  base_style = resolve_voice_style(voice_nr, print_variant_nr)
  
  # 2. Prüfe auf Abschnitts-Override
  overrides = @print_options_hash.dig(:voice_style_overrides, voice_nr.to_s)
  return base_style unless overrides
  
  measure = playable.measure_count
  override = overrides.find { |o| measure >= o[:from] && measure <= o[:to] }
  return base_style unless override
  
  # 3. Override auflösen (Name oder Inline)
  override_style = if override[:style].is_a?(String)
                     $conf.get("voice_styles.#{override[:style]}")
                   else
                     override[:style]
                   end
  
  # 4. Merge: Override überschreibt Basis-Stil
  merged = (base_style || {}).merge(override_style || {})
  merged
end
```

#### b) Anpassung der Layout-Schleife

In `_layout_voice_playables` wird der Stil **pro Playable** aufgelöst, 
statt einmal pro Voice:

```ruby
def _layout_voice_playables(beat_layout, playables, print_variant_nr, show_options, voice_nr)
  res_playables = playables.map do |playable|
    # Stufe 2: Stil pro Playable auflösen
    current_style = resolve_voice_style_for_playable(voice_nr, playable, print_variant_nr)
    
    result = layout_playable(playable, beat_layout, note_conf_base, current_style)
    # ...
  end
end
```

#### c) Performance-Überlegung

- Die Override-Auflösung ist O(n) mit n = Anzahl Overrides pro Stimme. 
  Bei typisch 1–5 Overrides ist das vernachlässigbar.
- Alternativ: Vorberechnung eines Takt→Stil-Lookups beim Eintritt in `layout_voice`.

### 2.4 Übergänge zwischen Abschnitten

An den Grenzen der Abschnitte ändert sich der Stil abrupt. Für Flowlines, die 
einen Abschnittswechsel überbrücken, wird der Stil des **Ziel-Playables** verwendet 
(der Flowline "fließt hin zum" nächsten Playable).

### 2.5 Visuelle Rückmeldung im Editor

- Im SVG-Preview werden die Abschnittsgrenzen optional als dünne horizontale 
  Markierung angezeigt (analog zu den bestehenden `sortmark`-Elementen).
- Der Konfigurationseditor zeigt die Overrides als Tabelle mit Von/Bis/Stil.


---

## Umsetzungsreihenfolge

### Phase 1: Minimal Viable (Stufe 1 Kern)

1. `voice_styles`-Definitionen in `init_conf.rb` mit 3 Standard-Stilen
2. `resolve_voice_style` in `harpnotes.rb`
3. Durchreichen durch `_layout_voices` → `layout_voice` → `layout_note`
4. Anpassung von `layout_note`, `compute_ellipse_properties_from_note`, `compute_color_by_variant_no`
5. Test mit manuell bearbeiteter JSON-Konfiguration

### Phase 2: Flowlines & Jumplines (Stufe 1 komplett)

6. Anpassung der Flowline/Subflowline/Jumpline-Methoden
7. Anpassung `layout_pause`
8. Presets in `init_conf.rb`

### Phase 3: UI-Integration (Stufe 1 komplett)

9. Commands in `controller_command_definitions.rb`
10. Menüeinträge in `user-interface.js`
11. JSON-Schema in `opal-ajv.rb`
12. Dokumentation / Hilfe

### Phase 4: Abschnittsweise Überschreibung (Stufe 2)

13. `voice_style_overrides`-Konfiguration
14. `resolve_voice_style_for_playable`
15. Anpassung `_layout_voice_playables`
16. UI und Dokumentation


---

## Risiken und offene Fragen

1. **DURATION_TO_STYLE**: Soll die Noten-Größen-Skalierung (`DURATION_TO_STYLE`) auch 
   pro Voice-Style konfigurierbar sein, oder reicht `ELLIPSE_SIZE`? 
   → Empfehlung: Zunächst nur `ELLIPSE_SIZE`, da `DURATION_TO_STYLE` die Proportionen 
   zwischen Notenwerten festlegt und dies stimmenübergreifend konsistent bleiben sollte.

2. **Synchlines**: Welcher Stil gilt für Synchlines, die zwei Stimmen mit 
   unterschiedlichen Stilen verbinden? 
   → Empfehlung: Synchlines behalten den globalen Stil (`layout.LINE_THIN`, default color).

3. **Beams-Modus**: Im Beams-Modus (`layout.beams = true`) wird `DURATION_TO_STYLE` 
   durch `DURATION_TO_BEAMS` ersetzt. Voice-Styles sollten auch hier funktionieren.
   → Empfehlung: Voice-Styles wirken auch im Beams-Modus auf `ELLIPSE_SIZE`, 
   `LINE_*` und `color`.

4. **Variant-Farben vs. Voice-Farben**: Aktuell werden Varianten (1./2. Wiederholung) 
   durch `color_variant1`/`color_variant2` eingefärbt. Wenn eine Stimme per Voice-Style 
   bereits eine eigene Farbe hat, gibt es einen Konflikt. 
   → Empfehlung: Voice-Style-Farbe gilt als `color_default`. Variant-Farben werden 
   weiterhin global verwendet (sie dienen der Unterscheidung innerhalb einer Stimme).

5. **PDF-Export**: Die Stile müssen auch im PDF korrekt gerendert werden. Da `pdf_engine.rb` 
   die Drawable-Objekte mit ihren `color`- und `line_width`-Attributen rendert, sollte 
   dies automatisch funktionieren – die Stilinformationen sind bereits im Drawable hinterlegt.+
