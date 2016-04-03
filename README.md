# zupfnoter

Work in progress: Web based editor for Tableharp notations based on abc
notation

# getting started

## running online version

-  https://zupfnoter.weichel21.de - **Hint:** uses a self signed certificate (sorry)
-  enter `demo` followed by return on the lower left pane
-  watch tunes showing up
-  click on `render` to update harp notes
-  click on `play` to listen to the tune
-  feel free to ask if there are questions (too many features to describe here)


## local installation

as of now the whole thing is far from being ready to use out of the box.

-   install Ruby 1.9.3 or higher with bundler
-   clone the repository
-   goto 30_Sources/SRC_Zupfnoter
-   run "bundle install"
-   goto 30_sources/SRC_Zupfnoter/src
-   to run from local filesystems
    -   run `rake build`
    -   open `30_sourcs/SRC_Zupfnoter/index.html` in your webbrowser

-   to run from a local webserver
    -   run `rake server`
    -   goto http://localhost:9292

## run from website

https://zupfnoter.weichel21.de


# Zupfnoter conventions in abc code

## current conventions

Zupfnoter tries to use ABC as close as possible. It does not add new
syntax but applies to some conventions. These conventions reflect to

1.  comments

    comments starting with `%%%%hn.` have a specific interpetation

2.  annotations

    Annotations starting with one of `:`, `@`, `!`, `#`, `<`, `>` have a specific
    interpretation:
    
    `:`
    :   Target of a jump
    
    `@`
    :   Jump
    
    `!`
    :   Regular annotation
    
    `#`
    :   referenced annotation
    
    `>'
    :   shift note symbol right by half string distance
    
    `<'
    :   shift note symbol left by half string distance

The specific conventions in detail are as follows:

1.  Jumps and repetitions

    This is done using anotations which is text in double quotes before
    a note. The target of the "jump" is denoted as "\^:target", while
    the "jump" is dentoed as "\^@target". Of course the same target can
    be part of multple jumps.

    You can control the position of the goto-line by adding a distance
    in halftones, e.g. "\^@target@3", "\^@target@-3"

2.  Repetitions can also be controlled by chords on the right repeat
    bar. In this case target is left empty. For example

        "^@@-3" :| 

    places the repetition line 3 halftones left of the end of the
    repetition.

## multi level configuration profiles

Zupfnoter uses a sophisticated configuration system to control any adjustable item in the produced harpnote sheets such as

* sheet dimensions
* line style
* size of notes
* annotations
* position of legend and lyrics

The configuration is represented as a hierarchy of key/value entities (Hiearchy of hashes). These entities
can be defined / redefined on various levels:

* the builtin defaults
* user level (planned for a desktop version)
* music level
* extract level

Configurations are appended to the abc - code separated by

```
%%%%zupfnoter.config
```

on each level, the level specific values are specified including their parent. An example of simple configuration is:

```JSON`

%%%%zupfnoter.config

{
 "produce": ["1", "2"]
}
```

This indicates that extract "1" and extract "2" shall be produced. The details of these views are taken from the default.

An complex example is as follows:

```JSON

{

 "produce": ["1", "2"],

 "annotations": {
                "1":   {"pos": [0,10], "text": "hallo"},
                "refn":  {"text": "referenced note", "pos": [20,10]}
                },

 "extract":{

             "2": {"voices": [1,2],
                   "flowlines": [1,2],
                   "layoutlines" : [1],
                   "lyrics": {"versepos": {"1": [300,40], "2,3":  [320, 60]},"pos": [300,40]},
                   "legend": {"pos": [300,10]},
                   "notes":[
                    {"pos": [30,30], "text": "note at 10,30", "style": "regular"},
                    {"pos": [30,60], "text": "note at 10,60", "style": "regular"},
                    {"pos": [5, 50], "text": "Folge: A A B B C A", "style": "regular"}
                   ],
                    "layout": {
                               "ELLIPSE_SIZE": [1.4, 0.5],
                               "REST_SIZE": [2.8, 1.7]
                              }
                   }
          },

}

```

In this case we specifiy

* produce extract 1 and 2
* define two annotations to be referenced from note based annotations
* redefine extract 2
    * optimize layout only by voice 1
    * particluar positioning of lyrics and legend
    * add further notes on the sheet
    * change the size of notes in extract 2

Note that '"layout" can be specified on extract level as well as on sheet level.

### configuration of an extract

the following fields apply to an extract:

title -> string
:   The title of the print

voices -> array of numbers
:   List of voices to be shown (it is an array of integer) from 1 to
    n denoting the voice index. Note that the voice index is
    basically the sequence of voices in the note preview. Therefore
    the %%score directive also influcnces the voice index.

synchlines -> array of array of numbers
:   List of synchlines to be shown. It is an array of array integers
    denoting the voice pairs for which synchlines shall be drawn.

    example

    ```JSON
        "synchlines": [[1, 2], [3, 4]]
    ```

flowlines - >array of numbers
:   List of flowlines to be shown. It is an array of integers

subflowlines -> array of numbers
:   List of subflowlins to be shown. It is an array of intenters.
    Subflowlines are flowlines connecting notes which otherwise have
    no corresponding note in other displayed voices and therefore
    would appear as single notes lost in space (without anny
    connection).

startpos -> array of numbers
:   the vertical position to start with the first note. It is an
    integer.

jumplines -> array of numbers
:   List of jumplines to be shown. It is an array of integers

layoutlines -> array of numbers
:   List of voices to consider for vertical layout optimization.
    Defaults to the List specified by v

notes -> array of hashes (placeable text)
:   Array of notes to be drawn on the output. Each note is a placeable text

    ```JSON
     "annotations": {
                    "1":   {"pos": [0,10], "text": "hallo"},
                    "refn":  {"text": "referenced note", "pos": [20,10]}
                    },
    ```
nonflowrest -> boolean
:   if true: show rests in voices without flowlines


**todo**



### the default configuration

```JSON
{
  "produce": [0],

  "annotations": {
    "vt" : {"text": "v", "pos": [-1, -6]},
    "vr" : {"text": "v", "pos": [2, -3]}
  },

  "extract": {
    "0": {
      "title": "alle Stimmen",
      "startpos": 15, "voices": [1, 2, 3, 4],
      "synchlines": [[1, 2], [3, 4]],
      "flowlines": [1, 3],
      "subflowlines": [2, 4],
      "jumplines": [1, 3],
      "layoutlines": [1, 2, 3, 4],
      "legend": {"pos": [320, 20]},
      "lyrics": {"pos": [320, 60]},
      "nonflowrest" : false,
      "notes": []
    },

    "1": {
      "title": "Sopran, Alt",
      "startpos": 15,
      "voices": [1, 2],
      "synchlines": [[1, 2], [3, 4]],
      "flowlines": [1, 3],
      "subflowlines": [2, 4],
      "jumplines": [1, 3],
      "layoutlines": [1, 2],
      "legend": {"pos": [320, 20]},
      "lyrics": {"pos": [320, 60]},
      "notes": []
    },

    "2": {
      "title": "Tenor, Bass",
      "startpos": 15,
      "voices": [3, 4],
      "synchlines": [[1, 2], [3, 4]],
      "flowlines": [3],
      "subflowlines": [4],
      "jumplines": [1, 3],
      "layoutlines": [3, 4],
      "legend": {"pos": [320, 20]},
      "lyrics": {"pos": [320, 60]},
      "notes": []
    }
  },

  "layout": {
    "LINE_THIN": 0.1,
    "LINE_MEDIUM": 0.3,
    "LINE_THICK": 0.5,
    "ELLIPSE_SIZE": [2.8, 1.7],
    "REST_SIZE": [2.8, 1.5],
    "X_SPACING": 11.5,
    "X_OFFSET": 2.8, "Y_SCALE": 4,
    "DRAWING_AREA_SIZE": [400, 282],
    "BEAT_RESOLUTION": 192,
    "SHORTEST_NOTE": 64,
    "BEAT_PER_DURATION": 3,
    "PITCH_OFFSET": -43,
    "FONT_STYLE_DEF": {
      "smaller": {"text_color": [0, 0, 0], "font_size": 6, "font_style": "normal"},
      "small": {"text_color": [0, 0, 0], "font_size": 9, "font_style": "normal"},
      "regular": {"text_color": [0, 0, 0], "font_size": 12, "font_style": "normal"},
      "large": {"text_color": [0, 0, 0], "font_size": 20, "font_style": "bold"}
    },

    "MM_PER_POINT": 0.3,
    "DURATION_TO_STYLE": {
      "err": [2, "filled", false],
      "d64": [0.9, "empty", false],
      "d48": [0.7, "empty", true],
      "d32": [0.7, "empty", false],
      "d24": [0.7, "filled", true],
      "d16": [0.7, "filled", false],
      "d12": [0.5, "filled", true],
      "d8": [0.5, "filled", false],
      "d6": [0.3, "filled", true],
      "d4": [0.3, "filled", false],
      "d3": [0.1, "filled", true],
      "d2": [0.1, "filled", false],
      "d1": [0.05, "filled", false]
    },

    "REST_TO_GLYPH": {
      "err": [[2, 2], "rest_1", false],
      "d64": [[0.9, 0.9], "rest_1", false],
      "d48": [[0.5, 0.5], "rest_1", true],
      "d32": [[0.5, 0.5], "rest_1", false],
      "d24": [[0.4, 0.7], "rest_4", true],
      "d16": [[0.4, 0.7], "rest_4", false],
      "d12": [[0.3, 0.5], "rest_8", true],
      "d8": [[0.3, 0.5], "rest_8", false],
      "d6": [[0.3, 0.4], "rest_16", true],
      "d4": [[0.3, 0.5], "rest_16", false],
      "d3": [[0.3, 0.5], "rest_32", true],
      "d2": [[0.3, 0.5], "rest_32", false],
      "d1": [[0.3, 0.5], "rest_64", false]
    }
  }
}

```



## outdated and deprecated conventions

3.  Control visualization of Voices Synchlines, Jumplines, Flowlines

    This is done using specific comments with JSON syntax (

        %%%%hn.print {"t":"all",         "v":[1,2,3,4], "s": [[1,2],[3,4]], "f":[1,3], "j":[1]}
        %%%%hn.print {"t":"all",         "v":[1], "s": [[1,2],[3,4]], "f":[1,3], "j":[1]}
        %%%%hn.print {"t":"sopran, alt", "v":[1,2],     "s":[[1,2]],       "f":[1],   "j":[1,2]}
        %%%%hn.print {"t":"tenor, bass", "v":[1, 2, 3, 4],     "s":[[1, 2], [3,4]],       "f":[1],   "j":[1, 3]}
        %%score (T1 T2)  (B1 B2)

    t
    :   The title of the print

    v
    :   List of voices to be shown (it is an array of integer) from 1 to
        n denoting the voice index. Note that the voice index is
        basically the sequence of voices in the note preview. Therefore
        the %%score directive also influcnces the voice index.

    s
    :   List of synclines to be shown. It is an array of array integers
        denoting the voice pairs for which synchlines shall be drawn.

    f
    :   List of flowlines to be shown. It is an array of integers

    sf
    :   List of subflowlins to be shown. It is an array of intenters.
        Subflowlines are flowlines connecting notes which otherwise have
        no corresponding note in other displayed voices and therefore
        would appear as single notes lost in space (without anny
        connection).

    startpos
    :   the vertical position to start with the first note. It is an
        integer.

    j
    :   List of jumplines to be shown. It is an array of integers

    l
    :   List of voices to consider for vertical layout optimization.
        Defaults to the List specified by v

4.  control the position of the legend

        %%%%hn.legend {"pos": [10,10]}

    where parameter is the legend position in mm from top left

5.  augment the content of the legend

    The content of the legend is derived from the ABC metadata. You can
    append content to the particular lines by defineing an annotation
    with the same key. For example

        %%%%hn.annotation {"id": "K:", "pos": [-50,3], "text": "Original in F"}

    adds a note to the legend entry for "K:" which is the key of the
    music

6.  sheet based annotations

    %%%%hn.note {"pos": [10,10]. "text": "foobar", "style": "large"]

    Parameters:

    pos
    :   Position im mm from top left

    text
    :   The content of the note

    style
    :   Textstyle: "regular" | "large"

7.  Note bound annotations

    1.  you can define referrable annotations as

            %%%%hn.annotation {"id": "10", "pos": [-50,3], "text": "referenced annotation 10"}
            %%%%hn.annotation {"id": "11", "pos": [3,0], "text": "referenced annotation 11"}

    2.  Note bound annotations are also entered as annotations, for
        example:

        `"^!Fine@10,10"` adds the word "Fine" at 10,10 mm from the note.
        Default position is 3,0

        `"^#10@10,10"` adds the content of hn.annotation with id: "10"
        (see 1.) at position 10,10 from note.

8.  Lyrics

    Zupfnoter supports placement of lyrics by `w: lyrics` lines in ABC.
    You can control the position of lyrics at all by

        %%%%hn.lyrics {"pos": [50,50]}

    You can also controll the position of individual verses e.g. by

        %%%%hn.lyrics {"versepos": {"1,2":[40,50], "3": [140,50], "4": [90,10], "5,6":[330,10]}}

# Licencse

This software is licensed under dual license GPL and Commercial

# Open issues

## known bugs

001. Hightlighting in ace is turned off, since ace is throwing too many
selection changed events **done**
002. Play cannot be stopped **done**
003. some refactoring necessary (see todo)
004. highlighting in tunepreview while playing does
not work properly; tunepreview removes previous highlights
005. Q: tag is not considered while playing **done**

## current work items

101. drop down menu with proper links to informative sites
102. midi - play the generated harpnotes *done*
103. write messages to the console pane *done*
104. vertical resize of panes
105. zoom pan scroll in Notes pane *done*

## User interface

201. zoom full screen of pane
202. cross-highlighting bewtween ABC (*done*) - Notes *done* - Harpnotes
    *done* - Player *done*
203. add a local description for ABC
204. add ABC-Syntax-Support to the Editor *done*
205. minimize the panes
206. multilingual
207. incorporate bootstrap

## More support for ABC

301. multiple staff / Voices to (support Bass harp) *done*

    better control about bass tenor alto soprano - requires certain
    refactoring *done*
302. annotations *done*
303. trioles *done*
304. ties and slurs *done*
305. improved line handling: line break different between the voices ...
306. voice properties octave=...

## Harpnotes

401. indicating measures *done*
402. vertical layout optimization (optimize the visual distance between
    two beats) *done*
403. annotations *done*
404. Debugging (writing the notenames in light grey ) *cancelled*
405. draw extra flow line in unsynched notes, aka subflowlines} (*done*)
406. add marks to adjust the sheet in the harp *done*
407. print extracts *done*
408. configure vertical layout (*done*, optimized)
409. configure a transformation *done*
410. denote parts *done*

## technology

501. MusicXml interface
502. Visualize the internal model for debugging purposes
503. Improved error handling *done*

## Player

701. Emulate harpplayer *in progress*
702. Metronome

# Brainstorming

-   using shoes and atom_shell to make a standalone application
    https://github.com/wasnotrice/shoes-atom

    started with node-webkit

# Result of initial evaluation

601. it is good to enter the stuff with two persons
602. good Visual feedback is essential
603. should be able to turn of some voices in oder to focus on the one
    currently entered
604. play from particular position onwards.

# 
