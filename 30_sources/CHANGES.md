# V 1.4.0

* fixed harpnote-player (no longer relies on last voice, no noise if song starts with rests) (#20)
* countnotes: draw hints how to count close to the notes (#21). Configure by `  "countnotes" : {"voices": [1], "pos": [3, -2]}`
* fixed position of bars (#16)
* refined representation of rests (#16): full rest now has same size as full note
* refined layout of jumplines: now considering size of symbol
* Draw a measure bar on the first note if the first measure is a complete one (#23)
* notes are shifted left/right if on the border of A3 sheets. This supports printing on A3 sheets (#17)
* removed spinner, progress indicator is again only background-color (reuqested by Karl)
* advanced approach to represent variant endings (#10)
* config menu no longer overrides existing entries with the default values (#25)
* now have a button to download the abc (#26) 
* how have keyboard shortcuts cmd-P, cmd-R, cmd-S #37
* non BWC: unisons are nore connected to their last note (#32); migrate by inverting the unisons
* non BWC: restructure of notebound annotations (#33); migrate by delete notebound configuration and reposition
  \[r:\] needs to start with lowercase letter, all now works per voice only;
* update favorite icon to Zupfnoter logo
* now can print a scalebar with very flexible configuration #18
* now can print repeatsigns as alternative to jumplines; flowline is now interrupted upon repeat start/end #3
* rearranged config menu, added hints visble on hove #37
* console is now on cmd-K - only #37
* shape of tuplet slur can now be configured #39 - this is an experimental implementation and subject of changing.
* play button now plays selection if more than three note are selected #40
* shift key now expands the selection #40
* now support !fermata! and !empphasis! decorations #30 
* now place a fingerprint of input on the sheet. Sheets with identical fingerprints stm from the same input. #22


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