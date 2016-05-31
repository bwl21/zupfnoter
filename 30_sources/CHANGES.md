# V 1.3.2 

* fixed harpnote-player (no longer relies on last voice, no noise if song starts with rests) (#20)
* countnotes: draw hints how to count close to the notes (#21). Configure by `  "countnotes" : {"voices": [1], "pos": [3, -2]}`
* fixed position of bars (#16)
* refined representation of rests (#16): full rest now has same size as full note
* refined layout of jumplines: now considering size of symbol
* Draw a mesaure bar on the first note if the first measure is a complete one (#23)
* notes are shifted left/right if on the border of A3 sheets. This supports printing on A3 sheets (#17)



# V 1.3.1 2016-05-17

* initial support of voice overlays (bars do not always show up)
* raise an alert before unloading Zupfnoter
* indicate draggable text by "pointer" cursors
* notebound annotations can be dragged if the note has an [r:] remark which serves as note-id.
* config menu now injects some layout options

* no error message on [r:] - remarks
* some refactorings (abc2svg-json)
* update to abc2svg 1.5.22

# V 1.2.2

* slowed down activity animation



# V 1.2.1


# V 1.2.0 2016-04-21

* upgrade to abc2svg 1.5.14 ( Crash on some cases of ties since 1.5.6)
* let "play" call "render"  before playing if necessary
* now use green animation (flying notes) for progress indicator

# V 1.1.1 2016-04-05

* patched version number

# V 1.1.0 2016-04-05

* refinements of toolbar: login, new, open, save
* add a dialog for create and login
* invoke render_previews on new, open, drag
* Improved report of coordinates for dragging annotations

# V 1.0.0 2016-04-03

* first official release