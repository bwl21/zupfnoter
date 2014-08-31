## sample websites

http://wfiedler-online.de/musikblog3/abc.php

http://de.wikipedia.org/wiki/ABC\_(Musiknotation)

https://code.google.com/p/abcjs/

http://thesession.org/discussions/24614

http://drawthedots.com/abcjs - einfacher abc editor

http://normanschmidt.net/abc/index.php - choräle in abc

http://penzeng.de/Geige/Abc.htm - Deutsche Anleitung

http://abcplus.sourceforge.net/ABCPlus.pdf - Deutsche Anleitung

https://github.com/MrRio/jsPDF

https://github.com/paulrosen/abcjs

http://trillian.mit.edu/~jc/cgi/abc/tunefind   - tunefinder

http://homepage.bnv-bamberg.de/flg-blw-partnerschaft/musik-facharbeit-eva-klein.pdf

## useful links

https://github.com/paulrosen/abcjs - the abcjs package

http://www.musicxml.com/  - detailled information about musicxml

https://github.com/paulrosen/abcjs the sourcecode of an abcprocessor in js

https://github.com/mudcube/MIDI.js - wie man midi im browser spielen kann

http://threejs.org/ - webgl library

http://raphaeljs.com/ - JS vector library

https://github.com/dr-skot/abc  # ruby/treetop parser

https://github.com/PencilCode/musical.js  # javascript player for ABC

## choosing a vector-gem

In order to compute the l   ayout slurs and triplets we need a 2d vector library with :

* add, subtract
* rotate
* angle
* create from array
* to_a

nice to have

* various constructors
* inspect

special

.to_path



* vector2d

    * big
    * well documented
    * actively maintained
    
    The library of choice. Maybe I strip it down if it is too big.

* vector2d-ruby

    * small
    * not documented
    * acively maintained
    
* uzi-vector

    * not actively maintained
    