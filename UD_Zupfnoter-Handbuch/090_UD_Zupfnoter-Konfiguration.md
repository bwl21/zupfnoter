# Konfiguration der Ausgabe

details zu layout ist [hier](#extract.0.layout)

### `annotations.vl`{#hugo.annotations.vl}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "vl": {"pos": [-1, -5], "text": "v"}

### `annotations.vl.pos`{#annotations.vl.pos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "pos": [-1, -5]

### `annotations.vl.text`{#annotations.vl.text}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "text": "v"

## `extract`{#extract}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "extract": {
          "0" : {
            "title"        : "alle Stimmen",
            "voices"       : [1, 2, 3, 4],
            "flowlines"    : [1, 3],
            "subflowlines" : [2, 4],
            "synchlines"   : [[1, 2], [3, 4]],
            "jumplines"    : [1, 3],
            "repeatsigns"  : {
              "voices" : [],
              "left"   : {"pos": [-7, -2], "text": "|:", "style": "bold"},
              "right"  : {"pos": [5, -2], "text": ":|", "style": "bold"}
            },
            "layoutlines"  : [1, 2, 3, 4],
            "barnumbers"   : {
              "voices" : [],
              "pos"    : [6, -4],
              "style"  : "small_bold",
              "prefix" : ""
            },
            "countnotes"   : {"voices": [], "pos": [3, -2]},
            "legend"       : {"pos": [320, 20], "spos": [320, 27]},
            "notes"        : {},
            "lyrics"       : {},
            "nonflowrest"  : false,
            "layout"       : {
              "limit_a3"     : true,
              "LINE_THIN"    : 0.1,
              "LINE_MEDIUM"  : 0.3,
              "LINE_THICK"   : 0.5,
              "ELLIPSE_SIZE" : [3.5, 1.7],
              "REST_SIZE"    : [4, 2]
            },
            "stringnames"  : {
              "vpos"  : [],
              "text"  : "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
              "style" : "small",
              "marks" : {"hpos": [43, 55, 79], "vpos": [11]}
            },
            "startpos"     : 15
          },
          "1" : {"title": "Sopran, Alt", "voices": [1, 2]},
          "2" : {"title": "Tenor, Bass", "voices": [3, 4]}
        }

### `extract.0`{#extract.0}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "0": {
          "title"        : "alle Stimmen",
          "voices"       : [1, 2, 3, 4],
          "flowlines"    : [1, 3],
          "subflowlines" : [2, 4],
          "synchlines"   : [[1, 2], [3, 4]],
          "jumplines"    : [1, 3],
          "repeatsigns"  : {
            "voices" : [],
            "left"   : {"pos": [-7, -2], "text": "|:", "style": "bold"},
            "right"  : {"pos": [5, -2], "text": ":|", "style": "bold"}
          },
          "layoutlines"  : [1, 2, 3, 4],
          "barnumbers"   : {
            "voices" : [],
            "pos"    : [6, -4],
            "style"  : "small_bold",
            "prefix" : ""
          },
          "countnotes"   : {"voices": [], "pos": [3, -2]},
          "legend"       : {"pos": [320, 20], "spos": [320, 27]},
          "notes"        : {},
          "lyrics"       : {},
          "nonflowrest"  : false,
          "layout"       : {
            "limit_a3"     : true,
            "LINE_THIN"    : 0.1,
            "LINE_MEDIUM"  : 0.3,
            "LINE_THICK"   : 0.5,
            "ELLIPSE_SIZE" : [3.5, 1.7],
            "REST_SIZE"    : [4, 2]
          },
          "stringnames"  : {
            "vpos"  : [],
            "text"  : "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
            "style" : "small",
            "marks" : {"hpos": [43, 55, 79], "vpos": [11]}
          },
          "startpos"     : 15
        }

### `extract.0.barnumbers`{#extract.0.barnumbers}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "barnumbers": {
          "voices" : [],
          "pos"    : [6, -4],
          "style"  : "small_bold",
          "prefix" : ""
        }

### `extract.0.barnumbers.pos`{#extract.0.barnumbers.pos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "pos": [6, -4]

### `extract.0.barnumbers.prefix`{#extract.0.barnumbers.prefix}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "prefix": ""

### `extract.0.barnumbers.style`{#extract.0.barnumbers.style}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "style": "small_bold"

### `extract.0.barnumbers.voices`{#extract.0.barnumbers.voices}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "voices": []

### `extract.0.countnotes`{#extract.0.countnotes}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "countnotes": {"voices": [], "pos": [3, -2]}

### `extract.0.countnotes.pos`{#extract.0.countnotes.pos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "pos": [3, -2]

### `extract.0.countnotes.voices`{#extract.0.countnotes.voices}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "voices": []

### `extract.0.flowlines`{#extract.0.flowlines}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "flowlines": [1, 3]

### `extract.0.jumplines`{#extract.0.jumplines}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "jumplines": [1, 3]

### `extract.0.layout`{#extract.0.layout}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "layout": {
          "limit_a3"     : true,
          "LINE_THIN"    : 0.1,
          "LINE_MEDIUM"  : 0.3,
          "LINE_THICK"   : 0.5,
          "ELLIPSE_SIZE" : [3.5, 1.7],
          "REST_SIZE"    : [4, 2]
        }

### `extract.0.layout.ELLIPSE_SIZE`{#extract.0.layout.ELLIPSE_SIZE}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "ELLIPSE_SIZE": [3.5, 1.7]

### `extract.0.layout.LINE_MEDIUM`{#extract.0.layout.LINE_MEDIUM}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "LINE_MEDIUM": 0.3

### `extract.0.layout.LINE_THICK`{#extract.0.layout.LINE_THICK}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "LINE_THICK": 0.5

### `extract.0.layout.LINE_THIN`{#extract.0.layout.LINE_THIN}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "LINE_THIN": 0.1

### `extract.0.layout.REST_SIZE`{#extract.0.layout.REST_SIZE}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "REST_SIZE": [4, 2]

### `extract.0.layout.limit_a3`{#extract.0.layout.limit_a3}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "limit_a3": true

### `extract.0.layoutlines`{#extract.0.layoutlines}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "layoutlines": [1, 2, 3, 4]

### `extract.0.legend`{#extract.0.legend}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "legend": {"pos": [320, 20], "spos": [320, 27]}

### `extract.0.legend.pos`{#extract.0.legend.pos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "pos": [320, 20]

### `extract.0.legend.spos`{#extract.0.legend.spos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "spos": [320, 27]

### `extract.0.lyrics`{#extract.0.lyrics}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "lyrics": {}

### `extract.0.nonflowrest`{#extract.0.nonflowrest}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "nonflowrest": false

### `extract.0.notes`{#extract.0.notes}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "notes": {}

### `extract.0.repeatsigns`{#extract.0.repeatsigns}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "repeatsigns": {
          "voices" : [],
          "left"   : {"pos": [-7, -2], "text": "|:", "style": "bold"},
          "right"  : {"pos": [5, -2], "text": ":|", "style": "bold"}
        }

### `extract.0.repeatsigns.left`{#extract.0.repeatsigns.left}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "left": {"pos": [-7, -2], "text": "|:", "style": "bold"}

### `extract.0.repeatsigns.left.pos`{#extract.0.repeatsigns.left.pos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "pos": [-7, -2]

### `extract.0.repeatsigns.left.style`{#extract.0.repeatsigns.left.style}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "style": "bold"

### `extract.0.repeatsigns.left.text`{#extract.0.repeatsigns.left.text}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "text": "|:"

### `extract.0.repeatsigns.right`{#extract.0.repeatsigns.right}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "right": {"pos": [5, -2], "text": ":|", "style": "bold"}

### `extract.0.repeatsigns.right.pos`{#extract.0.repeatsigns.right.pos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "pos": [5, -2]

### `extract.0.repeatsigns.right.style`{#extract.0.repeatsigns.right.style}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "style": "bold"

### `extract.0.repeatsigns.right.text`{#extract.0.repeatsigns.right.text}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "text": ":|"

### `extract.0.repeatsigns.voices`{#extract.0.repeatsigns.voices}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "voices": []

### `extract.0.startpos`{#extract.0.startpos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "startpos": 15

### `extract.0.stringnames`{#extract.0.stringnames}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "stringnames": {
          "vpos"  : [],
          "text"  : "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
          "style" : "small",
          "marks" : {"hpos": [43, 55, 79], "vpos": [11]}
        }

### `extract.0.stringnames.marks`{#extract.0.stringnames.marks}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "marks": {"hpos": [43, 55, 79], "vpos": [11]}

### `extract.0.stringnames.marks.hpos`{#extract.0.stringnames.marks.hpos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "hpos": [43, 55, 79]

### `extract.0.stringnames.marks.vpos`{#extract.0.stringnames.marks.vpos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "vpos": [11]

### `extract.0.stringnames.style`{#extract.0.stringnames.style}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "style": "small"

### `extract.0.stringnames.text`{#extract.0.stringnames.text}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "text": "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G"

### `extract.0.stringnames.vpos`{#extract.0.stringnames.vpos}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "vpos": []

### `extract.0.subflowlines`{#extract.0.subflowlines}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "subflowlines": [2, 4]

### `extract.0.synchlines`{#extract.0.synchlines}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "synchlines": [[1, 2], [3, 4]]

### `extract.0.title`{#extract.0.title}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "title": "alle Stimmen"

### `extract.0.voices`{#extract.0.voices}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "voices": [1, 2, 3, 4]

## `produce`{#produce}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "produce": [0]

## `restposition`{#restposition}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "restposition": {
          "default"     : "center",
          "repeatstart" : "next",
          "repeatend"   : "default"
        }

### `restposition.default`{#restposition.default}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "default": "center"

### `restposition.repeatend`{#restposition.repeatend}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "repeatend": "default"

### `restposition.repeatstart`{#restposition.repeatstart}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "repeatstart": "next"

## `wrap`{#wrap}

erklaerung_kommt_noch

-   Struktur:

-   Beispiel:

        "wrap": 60
