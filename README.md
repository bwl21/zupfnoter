# zupfnoter

Work in progress: Web based editor for Tableharp notations based on abc
notation

# getting started

as of now the whole thing is far from being ready to use out of the box.

-   install Ruby 1.9.3 or higher with bundler
-   clone the repository
-   goto 30_Sources/SRC_Zupfnoter
-   run "bundle install"
-   goto 30_sources/SRC_Zupfnoter/src
-   run rake build
-   open 30_sourcs/SRC_Zupfnoter/index.html in your webbrowser

# Zupfnoter conventions in abc code

Zupfnoter tries to use ABC as close as possible. It does not add new
syntax but applies to some conventions:

1.  Adding "goto" lines.

    This is done using annotations which is text in double quotes before
    a note. The target of the "jump" is denoted as "\^:target", while
    the "jump" is dentoed as "\^@target". Of course the same target can
    be part of multple jumps.

2.  Control appearence of Voice Synchlines, Jumplines, Flowlines

    This is done using specific comments with JSON syntax

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
    j
    :   List of jumplines to be shown. It is an array of integers
    l
    :   List of voices to consider for vertical layout optimization. Defaults to the List specified by v

3.  control the legend position and annotations

    %%%%hn.note ["foobar", [10, 10], "large"]

    Parameters:

    1.  Text
    2.  position in mm from top left
    3.  Textstyle "regular" | "large"

    %%%%hn.legend [10,10]

    Parameters

    1.  Position in mm from top left

    2.

# Licencse

This software is licensed under dual license MIT and Commercial

# Open issues

## known bugs

001 Hightlighting in ace is turned off, since ace is throwing too many selection changed events
002 Play cannot be stopped
003 some refactoring necessary (see todo)
004 highlighting in tunepreview while playing does not work properly; tunepreview removes previous highlights
005 Q: tag is not considered while playing


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
204. add ABC-Syntax-Support to the Editor
205. minimize the panes
206. multilingual
207. incorporate bootstrap

## More support for ABC

301. multiple staff / Voices to (support Bass harp) *done*

    better control about bass tenor alto soprano - requires certain
    refactoring *done*
302. annotations
303. trioles
304. ties and slurs
305. improved line handling: line break different between the voices ...
306. voice properties octave=...

## Harpnotes

401. indicating measures *done*
402. vertical layout optimization (optimize the visual distance between
    two beats) *done*
403. annotations *done*
404. Debugging (writing the notenames in light grey ) *cancelled*
405. draw extra flow line in unsynched notes (*cancelled*)
406. add marks to adjust the sheet in the harp *done*
407. print extracts *done*
408. configure vertical layout (fixed, optimized)
409. configure a transformation *done*
410. denote parts *done*

## technology

501. MusicXml interface
502. Visualize the internal model for debugging purposes
503. Improved error handling

## Player

701. Emulate harpplayer *in progress*
702. Metronome

# Brainstorming

* using shoes and atom_shell to make a standalone application
    https://github.com/wasnotrice/shoes-atom


# Result of initial evaluation

601. it is good to enter the stuff with two persons
602. good Visual feedback is essential
603. should be able to turn of some voices in oder to focus on the one
    currently entered
604. play from particular position onwards.


#