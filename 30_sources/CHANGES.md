
# v 1.8

## fix

* print preview no longer clears unsave indicator #176
* update to abc2svg 1.14
  * crash when bad value in transpose
  * bad pitches after ties and repeat
  * the accidentals must be reset on a measure bar
* improved fermata symbol in pdf #178
* crash when config references a non existing voice #179
* improved localization #182
* Error window now has an ok button #183
* improve Message "no ABC found"  #184  
  
## enhancement

* now have menu to import from local disc #177  
* support for 25 string bass harp #180
* strip =duration on meter "M:3/4 4/4 =3/4" #181
* initial support to work with file templates #71
* No initial render after a crash in previous session #103
  
# v 1.7.1

## fix

* improved fermata symbol in pdf #178
* turnoff flowconf edit for pdf. This avoids noise around very short vertical flowlines #167 
* print preview no longer clears unsaved indicator #176


# v 1.7

## fix

* tuplet lines are now correct in pdf (#139)
* no longer have unexpected subflowlines to unisons (#140)
* fixed size of smaall notes (#143)
* player also plays until end of tied notes (#147)
* decorations now also work on rests (#127)
* shift now also works on unisons (#107)
* abc2svg settings no longer necessary in tunes (removed from Template) (#71)
* BWC Default for "filenamepart" is now as it was in 1.5 (#155)
* Config form is refreshed after loading another song (#156)
* printer offset is no longer broken if user enters only one value (#157)
* Dropbox-Path can now also have digits (#162)
* Printer window show pdf on Chrome 60 (#160)
* now invisible rests are supressed even on flowline (#166)
* now handle multi measure rests (#166)
* fix predefined annotations vt and vr
* BWC: move Tuplet configuration to notebounds (#168)
* Multiple notebound annotations can now be dragged individually (#170)
* BWC: no longer show (Original in ) in case of transpositions (#174)

## enhancement

* jumplines can now be configured by drag & drop (#136)
* tuplets can now be sculptured by drag & drop (#138)
* improved performance of configuration (#115)
* improved performance of harpnote preview (#87)
* improved performance of vertical packer (#87, #89)
* editor collapses config parameters by default (#144)
* now can print a sortmark on top of the sheet (#145)
* the anchor of jumplines can now be configured (#150)
* now have variant parts appear in grey (#151)
* now menu supports extract 0 to extract 5 (#153)
* now menu also shows title of extracts (#153)
* ctrl-alt 'F' now toggles harp preview
* rearranged "Edit Configuration" Menu to improve configuration workflow (#171)
* now suppoert tilde as non braeking space in lyrics, stringnames, annotations #113
* now suppoert quoted tilde as non braeking space in lyrics, stringnames, annotations #113
* layoutlines is now the combination of voices and layoutlines (#175). 

## internal stuff

* updated to abc2svg 1.13.7 (#163)

## experimental feature

* implemented a collision based packer (#89)
* implemented validation of config parameters (#85) with result form
* Shape of Flowlines can be configured (#167)


## backwards compatibility issues

* layoutlines is now the combination of voices and layoutlines. 
  It is no longer possible to show voices without considering them in the layout (#175)
* Default for "filenamepart" is now as it was in 1.5 (#155)
* tuplet configuration is now under 'notebound': meed to rework in the sheets - sorry! (#168)
* transposititions are no longer exposed in legend (#174)

## known issues

Dragging of jumpline does not work properly on Saitenspiel #158

# V 1.6.1

## Fix

* dragging of text now alsow works Firefox again  #102
* Better note selection in note preview 
* non BWC: now handle treble+8, treble-8 #104 provided by abc2svg 1.9.0
* cutmarks only show up if rendered for A4 printing #100
* do not show variation marks if jumplines are turned off #110
* no longer show barnumbers/contnotes on invisible rests #109
* show unsynchronized rests such that subflowlines do not end somewhere #109
* no longer throw internal message if produce refers to non existing extract #114
* non BWC improved auto positioning of barnumbers and counthints #81
* fix size of notes an sheetmark shape #120
* now import mxl files produced by musescore (not only the ones downloaded from musescore.org) #123
* updated to abc2svg 1.12 ff #124
* improeved display of overlapping synchlines #121
* speedup configuration forms #118, #119
* now Zupfnoter no longer makes all Keys to Major Key upon transposition #103
* reference sheet not longer raises errors #134

## Enhancement

* now suppoert tilde as non braeking space in lyrics #113
* Harpnote preview is cleared before rendering #101
* show checksum also in the tune preview #80
* supress rendering of tuplets via configuration #55
* improved support for abc 2.2 #99
* now support dropbox API 2.0 (mandaory from June 17) #63
* now have dropdown menu for dropbox to open, save login, logout 
* improve error reporting on dropbox save #128
* fine tune structure of configuration menu #116
* add another German tutorial #38
* disable New, Dropbox, Login, Open, Save in demo mode #135

## Experimental features

* now can load the template from LocalStorage #71
    

## backward compatibilility issues

* double check if you have clef octaves "+8", "-8" and remove the same in order to get the previous result 
* double check if you use inline transposition. This is no longer supported. You need to do the transposition manually.
* Barnumbers and Conuntnotes autopos is now turned on; autopos-Algorithm is improved
* in case of multiple `[P:]` respecitvly `[R:]` the now the last one is relevant - best to remove the other ones
* now get message if F: is missing
* now get messaage Filename or path contains whitespace and special characters
* you have to redo configuration for tuplets (#167) 

## known issues

* default for filename part has changed to the defaults of the builtin configuration - fixed in 1.7 (#155)


# V 1.5

## backward compatibility issues

* filenames are now trimmed - this might lead to slightly different filenames in dropbox
* we now have a filenamepart per extract. It allows to change titles without changing the filenames. 
  Future releases might introduce a default value. So better adapt this parameter now.
* you need first to invoke "login" in Zupfnoter before you can use the "open"
* the fingerprint on a page might change as we now have 2 decimal digits in configuration #95

## Fix

* adjusted German language also for error messages #47
* communication with Dropbox (error handling etc.)  #77
* improved auto positioning of barnumbers and counthints #81
* builtin sheet annotation no longer claims a copyright #69
* optimized position of cutmarks #74
* fix whitespace handling in lyrics and filenames #54
* report multiple F and T lines #54
* non BWC trim filename addendum #54
* Jumpline end are now correct in case of a full rest #50
* no longer shift name first and last string in the stringnames #18
* Editor no longer hangs if harpnotes could not be created #86
* abc2svg titletrim now turned off #88
* browser now consider zupfnoter as secure site again #90
* Now also use ctrl/cmd-RETURN for render
* Now yield 1.50 instead of 1.49999999 to minimize rounding effects #95

## Enhancement

* now we have configuration paramters for printer optimimization #82
* now have forms based configuration #67
* now have forms based editing of snippets (now called addons) #83
* now have a lyrics editor tab #8
* more styles for annotations #70
* now have a parameter "filenamepart" per extract to determine the filename addendum for the extract #72
* now raise a popup if an error occurs on render or save #76
* now have a button to toggle harpnote preview #93
* now have foundation for optimized packer, and an experimental packer #89
* now show information of the day #98
* now have quick settings for some configuration #97

# V 1.4.2

## Fix

* barnumbers are small_bold again #60
* optimized placement of cutmarks #74
* fixed tempo note for e.g. 3/8= 120 #79
* fix countnotes #78

# V 1.4.2

## Fix

* remove copyright note from sheet annotation #69

## enhancement

* add textstyles: italic, small_bold, small_italic

# V 1.4.1

## enhancment

* suppress measure bar if repetition starts within measure #42

## fixes

* force reading dropped abc-files as utf-8 #66
* annotation template now works

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
* play button now plays: #40
  * if nothing is selected: the entire song in all voices
  * if one note is selected: the song from selection, only voices of current extract 
  * if more than one notes are selected: the selection only
* shift key now expands the selection #40
* now support !fermata! and !empphasis! decorations #30 
* now place a fingerprint of input on the sheet. Sheets with identical fingerprints stm from the same input. #22
* improved demo mode #43
* config menu now investigates the next free key for lyrics and note #44
* initial version of localization #47
* non BWC: algorithm for horizontal position of rests can now be configured. Default is different thatn in 1.3 
  Configuration menu provides an entry to switch to 1.3 behavior. #58
* Now generate a HTML-Page with the music notes for tune preview - also saves the html in Dropbox #59
* prevent automatic processing after initialization by adding ?debug to the url #61
* Now generate bar numers #60
* improve adjustment of zoom levels #62

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