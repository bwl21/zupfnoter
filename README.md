# zupfnoter

Free Web based editor for Tableharp notations based on abc notation.
Please have a look on the credits below. Zupfnoter would not exist
without inspiratio and help from others.

## getting started

-   goto https://zupfnoter.weichel21.de
-   you should see the demo song
-   watch tunes showing up
-   click on `render` to update harp notes
-   click on `play` to listen to the tune
-   feel free to ask if there are questions (too many features to
    describe here)
-   have a drobox-account if you want to save your work

## Key features

-   creates sheets for table harps (Veeh-Harfe®, Zauberharfe etc.)
-   draw notes, flowlines, subflowlines, synchlines, tuplets,
    annotations, lyrics ...
-   print flexible exctracts on A3, A4
-   full ABC support
-   MusicXml import
-   runs in Webbrowser
-   load and save to dropbox

# Zupfnoter User Interface

Zupfnoter has a self explaning user interface. Few things are important
to know:

## Drag and Drop

-   You can drag the borders of the panes to adjust it to your needs
-   You can drag and drop the text annotations in the harpnote preview
    to reposition the same
-   You can drag some note bound annotations if the related note has a
    dragmark [r:id|
-   you can drag Files to Zupfnoter editor pane. The following formats
    are supported

    -   abc
    -   mxl (musescore Music XML files
    -   xml (Music XML files)

## Keyboard shortcuts

-   Ctrl / cmd - R : Render the tunes
-   ctrl / cmd - P : play (depending on the selection)
-   ctrl / cmd - K : open the Zupfnoter console to see more messages
-   ctrl / cmd - S : save

## saving your work

You can save your work in

-   dropbox: you have to login and specify the path in your dropbox. You
    can also open files in dropbox with the menu `open`. Note the the
    numeric identifier in the file name must be unique.
    
    Files in dropbox are named as 
    
    `id_Title.abc` ID following the conventions of X: line in ABC
    
-   download as abc

# Zupfnoter conventions in abc code

## Zupfnoter abc conventions

Zupfnoter tries to use ABC as close as possible. It does not add new
syntax but applies to some conventions. These conventions reflect to

### Basic structure

A Zupfnoter sheet basically has two sections

-   the abc section
-   the configuration section. This is a JSON fragment separated from
    the abc section by

        %%%%zupfnoter.config

### annotations

Annotations are entered as `"^..."`

Annotations starting with one of `:`, `@`, `!`, `#`, `<`, `>` have a
specific interpretation (for example `"^>"` shifts the note symbol
right)

`:`
:   Target of a jump

`@`
:   Jump

`!`
:   Regular annotation which is printed immediately close to the note

    Example:

    `"^"this is my note@5,5"` yields an annotation 5 mm right, 5mm below
    the note

`#`
:   referenced annotation

`\>'
:   shift note symbol right by half string distance. This supports the
    case that two voices have the same note.

`\<'
:   shift note symbol left by half string distance. This supports the
    case that two voices have the same note.

If you want to move a note bound annotation with the mouse, you need to
enter a `[r:`id]\` before the note with the annotation. This also
applies to partnotes and Variation ids. For example

    C,C,C,C, |"^@@-2,3,2"[1 [r:n_11]D,D,D,E, "^@@3":|2 [r:11]C,4 || D,4 | D,4 

Here you see the [r:n_11] which makes the variation ids draggable.

note: in future we might implement this feature bound to the beat such
that every note bound annotation is draggable. As an experiment this is
already impelmented for count notes.

### Jumps and repetitions

This is done using anotations which is text in double quotes before a
note. The target of the "jump" is denoted as `"^:target"`, while the
"jump" is dentoed as `"^@target"`. Of course the same target can be part
of multple jumps.

You can control the position of the goto-line by adding a distance in
halftones, e.g. `"^@target@3"`, `"^@target@-3"`

### Repetitions

Repetitions can also be controlled by chords on the right repeat bar. In
this case target is left empty. For example

    "^@@-3" :| 

places the repetition line 3 halftones left of the end of the
repetition.

### Variant endings

For variant endings are represented by a bunch of jumplines

-   startlines - from the last note before the variant ending to the
    first note of the variant parts
-   endlines - from the last note of variant parts to the beginning of
    the repetition
-   followuplines - from the last note of the last variant to the the
    first note after the variant part

The vertical position of this is specified before the very first variant
part as

    "^@@,-2,2,-2" |1

## Multi level configuration profiles

Zupfnoter uses a sophisticated configuration system to control any
adjustable item in the produced harpnote sheets such as

-   sheet dimensions
-   line style
-   size of notes
-   annotations
-   position of legend and lyrics

The configuration is represented as a hierarchy of key/value entities
(Hiearchy of hashes). These entities can be defined / redefined on
various levels:

-   the builtin defaults
-   music level
-   extract level

Configuration is appended to the abc - code separated by

    %%%%zupfnoter.config

If the configuration section is missing, it is automatically inserted on
first render. The configuration section is reformatted on every render
action.

You can use the config menu to inject fragments of configuration. Note
that the menu injects the fragment to the currently active extract.

\`\``JSON`

%%%%zupfnoter.config

{ "produce": ["1", "2"] } \`\`\`

This indicates that extract "1" and extract "2" shall be produced. The
details of these views are taken from the default.

An more complex example is as follows:

~~~~ {.JSON}

%%%%zupfnoter.config

{
  "produce"     : [1,2],
  "annotations" : {
    "refn" : {
      "pos"  : [20, 10],
      "text" : "referenced note",
      "id"   : "refn"
    }
  },
  "extract"     : {
    "0" : {"legend": {"pos": [283, 2], "spos": [322, 34]}},
    "1" : {
      "title"  : "Nur Sopran",
      "voices" : [1],
      "legend" : {"spos": [200, 28]}
    }
  },
  "$schema"     : "https://zupfnoter.weichel21.de/schema/zupfnoter-config_1.0.json",
  "$version"    : "1.0.0"
}
~~~~

In this case we specifiy

-   produce extract 1 and 2
-   configure the position of legend and sublegend on extract 0
-   change title, displayed voices and position of legend for extract 1

### configuration of an extract

the following fields apply to an extract:

-   title -\> string

    The title of the print, shown in the sublegend

-   voices -\> array of numbers

    List of voices to be shown (it is an array of integer) from 1 to n
    denoting the voice index. Note that the voice index is basically the
    sequence of voices in the note preview. Therefore the %%score
    directive also influcnces the voice index.

-   synchlines -\> array of array of numbers

    List of synchlines to be shown. It is an array of array integers
    denoting the voice pairs for which synchlines shall be drawn.

    example

    ~~~~ {.JSON}
        "synchlines": [[1, 2], [3, 4]]
    ~~~~

-   flowlines - \>array of numbers

    List of flowlines to be shown. It is an array of integers

-   subflowlines -\> array of numbers

    List of subflowlins to be shown. It is an array of intenters.
    Subflowlines are flowlines connecting notes which otherwise have no
    corresponding note in other displayed voices and therefore would
    appear as single notes lost in space (without anny connection).

-   startpos -\> number

    the vertical position to start with the first note. It is an
    integer.

-   jumplines -\> array of numbers

    List of jumplines to be shown. It is an array of integers

-   layoutlines -\> array of numbers

    List of voices to consider for vertical layout optimization.
    Defaults to the List specified by `voices`

-   notes -\> array of hashes (placeable text)

    Hash of notes to be drawn on the output. Each note is a placeable
    text. the key is to be mantained manually.

    ~~~~ {.JSON}
        "notes"        : {
          "1" : {"pos": [320, 0], "text": "", "style": "large"}
        },
    ~~~~

-   nonflowrest -\> boolean

    if true: show rests in voices without flowlines

-   layout

    This allows to change the layout parameters on the level of an
    extract

### the default configuration

~~~~ {.JSON}
{
    "produce"     : [0],
    "layout"      : {
      "grid"              : false,
      "SHOW_SLUR"         : false,
      "LINE_THIN"         : 0.1,
      "LINE_MEDIUM"       : 0.3,
      "LINE_THICK"        : 0.5,
      "ELLIPSE_SIZE"      : [3.5, 1.7],
      "REST_SIZE"         : [4, 2],
      "X_SPACING"         : 11.5,
      "X_OFFSET"          : 2.8,
      "Y_SCALE"           : 4,
      "DRAWING_AREA_SIZE" : [400, 282],
      "BEAT_RESOLUTION"   : 192,
      "SHORTEST_NOTE"     : 64,
      "BEAT_PER_DURATION" : 3,
      "PITCH_OFFSET"      : -43,
      "FONT_STYLE_DEF"    : {
        "smaller" : {
          "text_color" : [0, 0, 0],
          "font_size"  : 6,
          "font_style" : "normal"
        },
        "small"   : {
          "text_color" : [0, 0, 0],
          "font_size"  : 9,
          "font_style" : "normal"
        },
        "regular" : {
          "text_color" : [0, 0, 0],
          "font_size"  : 12,
          "font_style" : "normal"
        },
        "large"   : {
          "text_color" : [0, 0, 0],
          "font_size"  : 20,
          "font_style" : "bold"
        }
      },
      "MM_PER_POINT"      : 0.3,
      "DURATION_TO_STYLE" : {
        "err" : [2, "filled", false],
        "d64" : [1, "empty", false],
        "d48" : [0.75, "empty", true],
        "d32" : [0.75, "empty", false],
        "d24" : [0.75, "filled", true],
        "d16" : [0.75, "filled", false],
        "d12" : [0.5, "filled", true],
        "d8"  : [0.5, "filled", false],
        "d6"  : [0.3, "filled", true],
        "d4"  : [0.3, "filled", false],
        "d3"  : [0.1, "filled", true],
        "d2"  : [0.1, "filled", false],
        "d1"  : [0.05, "filled", false]
      },
      "REST_TO_GLYPH"     : {
        "err" : [[2, 2], "rest_1", false],
        "d64" : [[0.5, 0.5], "rest_1", false],
        "d48" : [[0.3, 0.3], "rest_1", true],
        "d32" : [[0.3, 0.3], "rest_1", false],
        "d24" : [[0.4, 1], "rest_4", true],
        "d16" : [[0.4, 1], "rest_4", false],
        "d12" : [[0.4, 1], "rest_8", true],
        "d8"  : [[0.4, 1], "rest_8", false],
        "d6"  : [[0.4, 1], "rest_16", true],
        "d4"  : [[0.3, 1], "rest_16", false],
        "d3"  : [[0.3, 0.5], "rest_32", true],
        "d2"  : [[0.3, 0.5], "rest_32", false],
        "d1"  : [[0.3, 0.5], "rest_64", false]
      }
    },
    "annotations" : {
      "vt" : {"pos": [-1, -6], "text": "v"},
      "vr" : {"pos": [2, -3], "text": "v"},
      "vl" : {"pos": [-4, -3], "text": "v"}
    },
    "extract"     : {
      "0" : {
        "title"        : "alle Stimmen",
        "voices"       : [1, 2, 3, 4],
        "flowlines"    : [1, 3],
        "subflowlines" : [2, 4],
        "synchlines"   : [[1, 2], [3, 4]],
        "jumplines"    : [1, 3],
        "layoutlines"  : [1, 2, 3, 4],
        "legend"       : {"pos": [320, 20], "spos": [320, 27]},
        "notes"        : {
          "1" : {"pos": [320, 0], "text": "", "style": "large"}
        },
        "countnotes":   {"voices": [], "pos": [3, -2]},
        "lyrics"       : {"1": {"verses": [1], "pos": [350, 70]}},
        "nonflowrest"  : false,
        "startpos"     : 15
      },
      "1" : {"title": "Sopran, Alt", "voices": [1, 2]},
      "2" : {"title": "Tenor, Bass", "voices": [3, 4]}
    },
    "wrap"        : 60
  }
~~~~

# Credits

This software would not exist without the great support (mentioned in
sequence of contact)

-   My wife Ruth, she is an ardent plaer of Veeh® harp. This project
    started just to please her.
-   My son Christian, who helped me to define the initial architecture
    which proved to be stable
-   Sr. Christel Schröder, she answered all question about music
    notation
-   Flavio Vani (https://github.com/flvani) who helped me on the first
    steps
-   Elia Schito (https://github.com/elia) and the Opal project - what a
    great thing!
-   David Bau (https://github.com/PencilCode) for musicaljs
-   Paul Rosen (https://github.com/paulrosen) for abcjs (which was the
    abc parser in the beginning)
-   Jean Francois Moine (http://moinejf.free.fr/) for abc2svg.js and his
    outstandig support to fulfil my requests. abc2svg - blazing fast,
    full abc support
-   Willem de Vries (http://wim.vree.org/) for xml2abc.js - which
    enables music xml import
-   Dimitry Baranovskiy (https://github.com/DmitryBaranovskiy/raphael)
-   Vitali Malinouski (https://github.com/vitmalina/w2ui) for his great
    UI toolkit (w2ui)
-   James Hall (https://github.com/MrRio) for jspdf
-   Chris Walshaw (http://abcnotation.com) for abc notation

# Licencse

This software is licensed under dual license GPL and Commercial

# Contributing

Your contributions are welcome. However, few things you need to know
before contribution:

-   install Ruby 2.1.1 or higher with bundler
-   clone the repository
-   goto 30_Sources/SRC_Zupfnoter
-   run "bundle install"
-   goto 30_sources/SRC_Zupfnoter/src
-   run `rake server`
-   goto http://localhost:9292

Please check out latest code before changing anything. Please use
Gitflow to prepare PRs

Contributors who need a Code of Conduct which goes beyond the basic
social skills which usually are taught by parents or kindergarden might
consider to stay away from here.
