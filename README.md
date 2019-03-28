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

For more details please read the manual (sorry, it is in German) or
watch the tutorial vidoes (via zupfnoter.de)

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

# Contributing (needs update)

Your contributions are welcome. However, few things you need to know
before contribution:

-   install Ruby 2.1.1 or higher with bundler
-   clone the repository
-   goto 30_Sources/SRC_Zupfnoter
-   run "bundle install"
-   goto 30_sources/SRC_Zupfnoter/src
-   run `rake server`
-   goto http://localhost:9292

Install the following node modules - the node setting is not yet done properly ...

- blob
- encoding
- browserify
- jspdf
- uglify-js
- ajv

Please check out latest code before changing anything. Please use
Gitflow to prepare PRs

Contributors who need a Code of Conduct which goes beyond the basic
social skills which usually are taught by parents or kindergarden might
consider to stay away from here.
