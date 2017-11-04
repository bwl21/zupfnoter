//~ Copyright (C) 2014-2017: Willem Vree
//~ This program is free software; you can redistribute it and/or modify it under the terms of the
//~ Lesser GNU General Public License as published by the Free Software Foundation;
//~ This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
//~ without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
//~ See the Lesser GNU General Public License for more details. <http://www.gnu.org/licenses/lgpl.html>.

xml2abc_VERSION = 68;

(function () {  // all definitions inside an anonymous function
  function repstr (n, s) { return new Array (n + 1).join (s); }   // repeat string s n times
  function reparr (n, v) { var arr = []; while (n) { arr.push (v); --n; }; return arr; } // arr = n * [v]
  function dict (ks, vs) {    // init object with key list and value list
    for (var i = 0, obj = {}; i < ks.length; ++i) obj[ ks [i]] = vs [i]; return obj;
  }
  function format (str, vals) {       // help for sprintf string formatting
    var a = str.split (/%[ds]/);    // only works for simple %d and %s
    if (a.length > vals.length) vals.push ('');
    return vals.map (function (x, i) { return a[i] + x; }).join ('');
  }
  function infof (str, vals) { abcOut.info (format (str, vals)); }
  function endswith (str, suffix) { return str.indexOf (suffix, str.length - suffix.length) !== -1; }
  function keyints (obj) { return Object.keys (obj).map (function (x) { return parseInt (x); }); }
  var max_int = Math.pow (2, 53); // Ecma largest positive mantissa.
  function sortitems (d, onkey) { // {key:value} -> [[key, value]] or [value] -> [[ix, value]]
    var xs = [], f, k;
    if (Array.isArray (d)) for (k = 0; k < d.length; ++k ) { if (k in d) xs.push ([k, d[k]]); }
    else for (k in d) xs.push ([k, d[k]]);
    if (onkey)  f = function (a,b) { return a[0] - b[0]; };
    else        f = function (a,b) { return a[1] - b[1] || b[0] - a[0]; };  // tie (1) -> reverse sort on key (0)
    xs.sort (f);
    return xs;
  }

  var note_ornamentation_map = {        // for notations, modified from EasyABC
    'ornaments>trill-mark':       'T',
    'ornaments>mordent':          'M',
    'ornaments>inverted-mordent': 'P',
    'ornaments>turn':             '!turn!',
    'ornaments>inverted-turn':    '!invertedturn!',
    'ornaments>tremolo':          '!///!',
    'technical>up-bow':           'u',
    'technical>down-bow':         'v',
    'technical>harmonic':         '!open!',
    'technical>open-string':      '!open!',
    'technical>stopped':          '!plus!',
    'articulations>accent':       '!>!',
    'articulations>strong-accent':'!>!',    // compromise
    'articulations>staccato':     '.',
    'articulations>staccatissimo':'!wedge!',
    'fermata':                    '!fermata!',
    'arpeggiate':                 '!arpeggio!',
    'articulations>tenuto':       '!tenuto!',
    'articulations>spiccato':     '!wedge!', // not sure whether this is the right translation
    'articulations>breath-mark':  '!breath!', // this may need to be tested to make sure it appears on the right side of the note
    'articulations>detached-legato': '!tenuto!.'
  }

  var dynamics_map = {    // for direction/direction-type/dynamics/
    'p':    '!p!',
    'pp':   '!pp!',
    'ppp':  '!ppp!',
    'f':    '!f!',
    'ff':   '!ff!',
    'fff':  '!fff!',
    'mp':   '!mp!',
    'mf':   '!mf!',
    'sfz':  '!sfz!'
  }

  var abcOut;
//-------------------
// data abstractions
//-------------------
  function Measure (p) {
    this.reset ();
    this.ixp = p;       // part number
    this.ixm = 0;       // measure number
    this.mdur = 0;      // measure duration (nominal metre value in divisions)
    this.divs = 0;      // number of divisions per 1/4
  }
  Measure.prototype.reset = function () { // reset each measure
    this.attr = '';     // measure signatures, tempo
    this.lline = '';    // left barline, but only holds ':' at start of repeat, otherwise empty
    this.rline = '|';   // right barline
    this.lnum = '';     // (left) volta number
  }

  function Note (dur, n) {
    this.tijd = 0;      // the time in XML division units
    this.dur = dur;     // duration of a note in XML divisions
    this.fact = null;   // time modification for tuplet notes (num, div)
    this.tup = [''];    // start(s) and/or stop(s) of tuplet
    this.tupabc = '';   // abc tuplet string to issue before note
    this.beam = 0;      // 1 = beamed
    this.grace = 0;     // 1 = grace note
    this.before = '';   // extra abc string that goes before the note/chord
    this.after = '';    // the same after the note/chord
    this.ns = n ? [n] : [];  // notes in the chord
    this.lyrs = {};     // {number -> syllabe}
    this.pos = 0;       // position in Music.voices for stable sorting
  }

  function Elem (string) {
    this.tijd = 0      // the time in XML division units
    this.str = string  // any abc string that is not a note
    this.pos = 0;       // position in Music.voices for stable sorting
  }

  function Counter () {}
  Counter.prototype.inc = function (key, voice) {
    this.counters [key][voice] = (this.counters [key][voice] || 0) + 1;
  }
  Counter.prototype.clear = function (vnums) {    // reset all counters
    var ks = Object.keys (vnums);
    var vs = reparr (ks.length, 0);
    this.counters = {'note': dict (ks,vs), 'nopr': dict (ks,vs), 'nopt': dict (ks,vs)}
  }
  Counter.prototype.getv = function (key, voice) {
    return this.counters[key][voice];
  }
  Counter.prototype.prcnt = function (ip) {    // print summary of all non zero counters
    for (var iv in this.counters ['note']) {
      if (this.getv ('nopr', iv) != 0)
        infof ('part %d, voice %d has %d skipped non printable notes', [ip, iv, this.getv ('nopr', iv)]);
      if (this.getv ('nopt', iv) != 0)
        infof ('part %d, voice %d has %d notes without pitch', [ip, iv, this.getv ('nopt', iv)]);
      if (this.getv ('note', iv) == 0)        // no real notes counted in this voice
        infof ('part %d, skipped empty voice %d', [ip, iv]);
    }
  }

  function Music (options) {
    this.tijd = 0;          // the current time
    this.maxtime = 0;       // maximum time in a measure
    this.gMaten = [];       // [voices,.. for all measures in a part], voices = {vnum: [Note | Elem]}
    this.gLyrics = [];      // [{num: (abc_lyric_string, melis)},.. for all measures in a part]
    this.vnums = {};        // all used xml voice id's in a part (xml voice id's == numbers)
    this.cnt = new Counter ();  // global counter object
    this.vceCnt = 1;        // the global voice count over all parts
    this.lastnote = null;   // the last real note record inserted in this.voices
    this.bpl = options.b;   // the max number of bars per line when writing abc
    this.cpl = options.n;   // the number of chars per line when writing abc
    this.repbra = 0;        // true if volta is used somewhere
    this.nvlt = options.v;  // no volta on higher voice numbers
  }
  Music.prototype.initVoices = function (newPart) {
    this.vtimes = {}; this.voices = {}; this.lyrics = {};
    for (var v in this.vnums) {
      this.vtimes [v] = 0;    // {voice: the end time of the last item in each voice}
      this.voices [v] = [];   // {voice: [Note|Elem, ..]}
      this.lyrics [v] = [];   // {voice: [{num: syl}, ..]}
    }
    if (newPart) this.cnt.clear (this.vnums);    // clear counters once per part
  }
  Music.prototype.incTime = function (dt) {
    this.tijd += dt;
    if (this.tijd > this.maxtime) this.maxtime = this.tijd;
  }
  Music.prototype.appendElemCv = function (voices, elem) {
    for (var v in voices)
      this.appendElem (v, elem);  // insert element in all voices
  }
  Music.prototype.insertElem = function (v, elem) {   // insert at the start of voice v in the current measure
    var obj = new Elem (elem);
    obj.tijd = 0;                   // because voice is sorted later
    this.voices [v].unshift (obj);
  }
  Music.prototype.appendObj = function (v, obj, dur) {
    obj.tijd = this.tijd;
    this.voices [v].push (obj);
    this.incTime (dur);
    if (this.tijd > this.vtimes[v]) this.vtimes[v] = this.tijd;  // don't update for inserted earlier items
  }
  Music.prototype.appendElemT = function (v, elem, tijd) {    // insert element at specified time
    var obj = new Elem (elem);
    obj.tijd = tijd;
    this.voices [v].push (obj);
  }
  Music.prototype.appendElem = function (v, elem, tel) {
    this.appendObj (v, new Elem (elem), 0);
    if (tel) this.cnt.inc ('note', v);   // count number of certain elements in each voice
  }
  Music.prototype.appendNote = function (v, note, noot) {
    note.ns.push (noot);
    this.appendObj (v, note, parseInt (note.dur));
    if (noot != 'z' && noot != 'x') {           // real notes and grace notes
      this.lastnote = note;       // remember last note for later modifications (chord, grace)
      this.cnt.inc ('note', v);   // count number of real notes in each voice
      if (!note.grace)            // for every real note
        this.lyrics[v].push (note.lyrs);    // even when it has no lyrics
    }
  }
  Music.prototype.getLastRec = function (voice) {
    if (this.gMaten.length) {
      var m = this.gMaten [this.gMaten.length - 1][voice];
      return m [m.length - 1];    // the last record in the last measure
    }
    return null;    // no previous records in the first measure
  }
  Music.prototype.getLastMelis = function (voice, num) {  // get melisma of last measure
    if (this.gLyrics.length) {
      var lyrdict = this.gLyrics [this.gLyrics.length - 1][voice]; // the previous lyrics dict in this voice
      if (num in lyrdict) return lyrdict[num][1];     // lyrdict = num -> (lyric string, melisma)
    }
    return 0;       // no previous lyrics in voice or line number
  }
  Music.prototype.addChord = function (noot) {    // careful: we assume that chord notes follow immediately
    this.lastnote.ns.push (noot);
  }
  Music.prototype.addBar = function (lbrk, m) {   // linebreak, measure data
    if (m.mdur && this.maxtime > m.mdur) infof ('measure %d in part %d longer than metre', [m.ixm+1, m.ixp+1]);
    this.tijd = this.maxtime;           // the time of the bar lines inserted here
    for (var v in this.vnums) {
      if (m.lline || m.lnum) {        // if left barline or left volta number
        var p = this.getLastRec (v);    // get the previous barline record
        if (p) {                    // p == null: in measure 1 no previous measure is available
          var x = p.str;          // p.str is the ABC barline string
          if (m.lline)            // append begin of repeat, m.lline == ':'
            x = (x + m.lline).replace (/:\|:/g,'::').replace (/\|\|/g,'|');
          if (this.nvlt == 3) {   // add volta number only to lowest voice in part 0
            if (m.ixp + parseInt (v) == Math.min.apply (null, keyints (this.vnums))) x += m.lnum;
          } else if (this.nvlt == 4) {    // add volta to lowest voice in each part
            if (parseInt (v) == Math.min.apply (null, keyints (this.vnums))) x += m.lnum;
          } else if (m.lnum) {      // new behaviour with I:repbra 0
            x += m.lnum;        // add volta number(s) or text to all voices
            this.repbra = 1;    // signal occurrence of a volta
          }
          p.str = x;              // modify previous right barline
        } else if (m.lline) {       // begin of new part and left repeat bar is required
          this.insertElem (v, '|:');
        }
      }
      if (lbrk) {
        var p = this.getLastRec (v);    // get the previous barline record
        if (p) p.str += lbrk;           // insert linebreak char after the barlines+volta
      }
      if (m.attr)                         // insert signatures at front of buffer
        this.insertElem (v, '' + m.attr);
      this.appendElem (v, ' ' + m.rline); // insert current barline record at time maxtime
      this.voices[v] = sortMeasure (this.voices[v], m);      // make all times consistent
      var lyrs = this.lyrics[v];          // [{number: sylabe}, .. for all notes]
      var lyrdict = {};                   // {number: (abc_lyric_string, melis)} for this voice
      var nums = lyrs.reduce (function (ns, lx) { return ns.concat (keyints (lx))}, []);
      var maxNums = Math.max.apply (null, nums.concat ([0]));  // the highest lyrics number in this measure
      for (var i = maxNums; i > 0; --i) {
        var xs = lyrs.map (function (syldict) { return syldict [i] || ''; });  // collect the syllabi with number i
        var melis = this.getLastMelis (v, i);           // get melisma from last measure
        lyrdict [i] = abcLyr (xs, melis);
      }
      this.lyrics[v] = lyrdict;   // {number: (abc_lyric_string, melis)} for this measure
      mkBroken (this.voices[v]);
    }
    this.gMaten.push (this.voices);
    this.gLyrics.push (this.lyrics);
    this.tijd = this.maxtime = 0;
    this.initVoices ();
  }
  Music.prototype.outVoices = function (divs, ip) {   // output all voices of part ip
    var lyrlines, i, n, lyrs, vvmap, unitL, lvc, iv, im, measure, xs, lyrstr, melis, mis, t;
    vvmap = {};                     // xml voice number -> abc voice number (one part)
    lvc = Math.min.apply (null, keyints (this.vnums));  // lowest xml voice number of this part
    for (iv in this.vnums) {
      if (this.cnt.getv ('note', iv) == 0)    // no real notes counted in this voice
        continue;               // skip empty voices
      if (abcOut.denL) unitL = abcOut.denL;   // take the unit length from the -d option
      else             unitL = compUnitLength (iv, this.gMaten, divs); // compute the best unit length for this voice
      abcOut.cmpL.push (unitL);   // remember for header output
      var vn = [], vl = {};       // for voice iv: collect all notes to vn and all lyric lines to vl
      for (im = 0; im < this.gMaten.length; ++im) {
        measure = this.gMaten [im][iv];
        vn.push (outVoice (measure, divs, im, ip, unitL));
        checkMelismas (this.gLyrics, this.gMaten, im, iv);
        xs = this.gLyrics [im][iv];
        for (n in xs) {
          t = xs [n];
          lyrstr = t[0]; melis = t[1];
          if (n in vl) {
            while (vl[n].length < im) vl[n].push ('');  // fill in skipped measures
            vl[n].push (lyrstr);
          } else {
            vl[n] = reparr (im, '').concat ([lyrstr]);  // must skip im measures
          }
        }
      }
      for (n in vl) {         // fill up possibly empty lyric measures at the end
        lyrs = vl [n];
        mis = vn.length - lyrs.length;
        vl[n] = lyrs.concat (reparr (mis, ''));
      }
      abcOut.add ('V:' + this.vceCnt);
      if (this.repbra) {
        if (this.nvlt == 1 && this.vceCnt > 1)     abcOut.add ('I:repbra 0');  // only volta on first voice
        if (this.nvlt == 2 && parseInt (iv) > lvc) abcOut.add ('I:repbra 0');  // only volta on first voice of each part
      }
      if      (this.cpl > 0)  this.bpl = 0;   // option -n (max chars per line) overrules -b (max bars per line)
      else if (this.bpl == 0) this.cpl = 100; // the default: 100 chars per line

      var bn = 0;                 // count bars
      while (vn.length) {         // while still measures available
        var ib = 1;
        var chunk = vn [0];
        while (ib < vn.length) {
          if (this.cpl > 0 && chunk.length + vn [ib].length >= this.cpl) break;   // line full (number of chars)
          if (this.bpl > 0 && ib >= this.bpl) break;                              // line full (number of bars)
          chunk += vn [ib];
          ib += 1;
        }
        bn += ib;
        abcOut.add (chunk + ' %' + bn);   // line with barnumer
        vn.splice (0, ib);      // chop ib bars
        lyrlines = sortitems (vl, 1);   // order the numbered lyric lines for output (alphabitical on key)
        for (i = 0; i < lyrlines.length; ++ i) {
          t = lyrlines [i];
          n = t[0]; lyrs = t[1];
          abcOut.add ('w: ' + lyrs.slice (0, ib).join ('|') + '|');
          lyrs.splice (0, ib);
        }
      }
      vvmap [iv] = this.vceCnt;   // xml voice number -> abc voice number
      this.vceCnt += 1;           // count voices over all parts
    }
    this.gMaten = [];               // reset the follwing instance vars for each part
    this.gLyrics = [];
    this.cnt.prcnt (ip+1);          // print summary of skipped items in this part
    return vvmap;
  }

  function ABCoutput (fnmext, pad, X, options) {
    this.fnmext = fnmext;
    this.outlist = [];          // list of ABC strings
    this.infolist = [];         // list of info messages
    this.title = 'T:Title';
    this.key = 'none';
    this.clefs = {};            // clefs for all abc-voices
    this.mtr = 'none'
    this.tempo = 0;             // 0 -> no tempo field
    this.pad = pad;             // the output path or null
    this.X = X + 1;             // the abc tune number
    this.denL = options.d;      // denominator of the unit length (L:) from -d option
    this.volpan = options.m;    // 0 -> no %%MIDI, 1 -> only program, 2 -> all %%MIDI
    this.cmpL = [];             // computed optimal unit length for all voices
    this.scale = '';            // float around 1.0
    this.pagewidth = '';        // in cm
    this.leftmargin = '';       // in cm
    this.rightmargin = '';      // in cm
    if (options.p.length == 4) {
      this.scale = options.p [0] != '' ? parseFloat (options.p [0]) : '';
      this.pagewidth = options.p [1] != '' ? parseFloat (options.p [1]) : '';
      this.leftmargin = options.p [2] != '' ? parseFloat (options.p [2]) : '';
      this.rightmargin = options.p [3] != '' ? parseFloat (options.p [3]) : '';
    }
  }
  ABCoutput.prototype.add = function (str) {
    this.outlist.push (str + '\n'); // collect all ABC output
  }
  ABCoutput.prototype.info = function (str, warn) {
    var indent = (typeof warn == 'undefined' || warn) ? '-- ' : '';
    this.infolist.push (indent + str);
  }
  ABCoutput.prototype.mkHeader = function (stfmap, partlist, midimap) { // stfmap = [parts], part = [staves], stave = [voices]
    var accVce = [], accStf = [], x, staves, clfnms, part, tag, partname, partabbrv, firstVoice, t, dmap;
    var nm, snm, clfnms, hd, tempo, d, defL, vnum, clef, ch, prg, vol, pan, i, abcNote, midiNote, step, notehead;
    var staffs = stfmap.slice ();  // stafmap is consumed by prgroupelem
    for (i = 0; i < partlist.length; ++i) { // collect partnames into accVce and staff groups into accStf
      x = partlist [i];
      try { prgroupelem (x, ['', ''], '', stfmap, accVce, accStf); }
      catch (err) { infof ('lousy musicxml: error in part-list',[]); }
    }
    staves = accStf.join (' ');
    clfnms = {};
    for (i = 0; i < staffs.length; ++ i) {
      part = staffs [i];
      t =  accVce [i];
      tag = t[0]; partname = t[1]; partabbrv = t[2];
      if (part.length == 0) continue;       // skip empty part
      firstVoice = part[0][0];     // the first voice number in this part
      nm  = partname.replace (/\n/g,'\\n').replace (/\.:/g,'.').replace (/^:|:$/g,'');
      snm = partabbrv.replace (/\n/g,'\\n').replace (/\.:/g,'.').replace (/^:|:$/g,'');
      clfnms [firstVoice] = (nm ? 'nm="' + nm + '"' : '') + (snm ? ' snm="' + snm + '"' : '');
    }
    hd = [format ('X:%d\n%s\n', [this.X, this.title])];
    if (this.scale !== '') hd.push ('%%scale ' + this.scale + '\n');
    if (this.pagewidth !== '') hd.push ('%%pagewidth ' + this.pagewidth + 'cm\n');
    if (this.leftmargin !== '') hd.push ('%%leftmargin ' + this.leftmargin + 'cm\n');
    if (this.rightmargin !== '') hd.push ('%%rightmargin ' + this.rightmargin + 'cm\n');
    if (staves && accStf.length > 1) hd.push ('%%score ' + staves + '\n');
    tempo = this.tempo ? 'Q:1/4=' + this.tempo + '\n' : ''; // default no tempo field
    d = [];             // determine the most frequently occurring unit length over all voices
    for (i = 0; i < this.cmpL.length; ++i) { x = this.cmpL [i]; d[x] = (d[x] || 0) + 1; }
    d = sortitems (d);  // -> [[unitLength, numberOfTimes]], sorted on numberOfTimes (when tie select smallest unitL)
    defL = d [d.length-1][0];
    defL = this.denL ? this.denL : defL;    // override default unit length with -d option
    hd.push (format ('L:1/%d\n%sM:%s\n', [defL, tempo, this.mtr]));
    hd.push (format ('I:linebreak $\nK:%s\n', [this.key]));
    for (vnum in this.clefs) {
      t =  midimap [vnum-1];
      ch = t[0]; prg = t[1]; vol = t[1]; pan = t[3]; dmap = t.slice (4);
      clef = this.clefs [vnum];
      if (dmap.length && clef.indexOf ('perc') < 0 ) clef = (clef + ' map=perc').trim ();
      hd.push (format ('V:%d %s %s\n', [vnum, clef, clfnms [vnum] || '']));
      if (this.volpan > 1) {  // option -m 2 -> output all recognized midi commands when needed and present in xml
        if (ch > 0 && ch != vnum) hd.push ('%%MIDI channel ' + ch + '\n');
        if (prg > 0)  hd.push ('%%MIDI program ' + (prg - 1) + '\n');
        if (vol >= 0) hd.push ('%%MIDI control 7 ' + vol + '\n'); // volume == 0 is possible ...
        if (pan >= 0) hd.push ('%%MIDI control 10 ' + pan + '\n');
      } else if (this.volpan > 0) {   // default -> only output midi program command when present in xml
        if (dmap.length && ch > 0) hd.push ('%%MIDI channel ' + ch + '\n'); // also channel if percussion part
        if (prg > 0)  hd.push ('%%MIDI program ' + (prg - 1) + '\n');
      }
      for (i = 0; i < dmap.length; ++i) {
        abcNote = dmap [i].nt; step = dmap [i].step; midiNote = dmap [i].midi; notehead = dmap [i].nhd;
        if (!notehead) notehead = 'normal';
        if (abcMid (abcNote) != midiNote || abcNote != step) {
          if (this.volpan > 0) hd.push ('%%MIDI drummap '+abcNote+' '+midiNote+'\n');
          hd.push ('I:percmap '+abcNote+' '+step+' '+midiNote+' '+notehead+'\n');
        }
      }
      if (defL != this.cmpL [vnum-1]) // only if computed unit length different from header
        hd.push ('L:1/' + this.cmpL [vnum-1] + '\n');
    }
    this.outlist = hd.concat (this.outlist);
  }

//----------------
// functions
//----------------
  function abcLyr (xs, melis) {   // Convert list xs to abc lyrics.
    if (!xs.join ('')) return ['', 0];  // there is no lyrics in this measure
    var res = [];
    for (var i = 0; i < xs.length; ++i) {
      var x = xs[i];          // xs has for every note a lyrics syllabe or an empty string
      if (x == '') {          // note without lyrics
        if (melis) x = '_'; // set melisma
        else x = '*';       // skip note
      } else if (endswith (x,'_') && !endswith (x,'\\_')) { // start of new melisma
        x = x.replace ('_', '');    // remove and set melis boolean
        melis = 1;          // so next skips will become melisma
      } else melis = 0;       // melisma stops on first syllable
      res.push (x);
    }
    return ([res.join (' '), melis]);
  }

  function simplify (a, b) {      // divide a and b by their greatest common divisor
    var x = a, y = b, c;
    while (b) {
      c = a % b;
      a = b; b = c;
    }
    return [x / a, y / a];
  }

  function abcdur (nx, divs, uL) {    // convert an musicXML duration d to abc units with L:1/uL
    if (nx.dur == 0) return '';     // when called for elements without duration
    var num, den, numfac, denfac, dabc, t;
    t = simplify (uL * nx.dur, divs * 4); // L=1/8 -> uL = 8 units
    num = t[0]; den = t[1];
    if (nx.fact) {                  // apply tuplet time modification
      numfac = nx.fact [0];
      denfac = nx.fact [1];
      t = simplify (num * numfac, den * denfac);
      num = t[0]; den = t[1];
    }
    if (den > 64) {                 // limit the denominator to a maximum of 64
      var x = num / den, n = Math.floor (x);
      if (x - n < 0.1 * x) { num = n; den = 1; }
      t = simplify (Math.round (64 * num / den) || 1, 64);
      infof ('denominator too small: %d/%d rounded to %d/%d', [num, den, t[0], t[1]]);
      num = t[0]; den = t[1];
    }
    if (num == 1) {
      if      (den == 1)  dabc = '';
      else if (den == 2)  dabc = '/';
      else                dabc = '/' + den;
    } else if   (den == 1)  dabc = ''  + num;
    else                    dabc = num + '/' + den;
    return dabc;
  }

  function abcMid (note) {    // abc note -> midi pitch
    var r = note.match (/([_^]*)([A-Ga-g])([',]*)/);
    if (!r) return -1;
    var acc = r[1], n = r[2], oct = r[3], nUp, p;
    nUp = n.toUpperCase ();
    p = 60 + [0,2,4,5,7,9,11]['CDEFGAB'.indexOf (nUp)] + (nUp != n ? 12 : 0);
    if (acc) p += (acc[0] == '^' ? 1 : -1) * acc.length;
    if (oct) p += (oct[0] == "'" ? 12 : -12) * oct.length;
    return p;
  }

  function staffStep (ptc, o, clef, tstep) {
    var n, ndif = 0;
    if (clef.indexOf ('stafflines=1') >= 0) ndif += 4;    // meaning of one line: E (xml) -> B (abc)
    if (!tstep && clef.indexOf ('bass') >= 0) ndif += 12; // transpose bass -> treble (C3 -> A4)
    if (ndif) { // diatonic transposition == addition modulo 7
      var nm7 = 'CDEFGAB'.split ('');
      n = nm7.indexOf (ptc) + ndif;
      ptc = nm7 [n % 7];
      o += Math.floor (n / 7);
    }
    if (o > 4) ptc = ptc.toLowerCase ();
    if (o > 5) ptc = ptc + repstr (o-5, "'");
    if (o < 4) ptc = ptc + repstr (4-o, ",");
    return ptc;
  }

  function setKey (fifths, mode) {
    var accs, kmaj, kmin, key, msralts;
    accs = ['F','C','G','D','A','E','B'];
    kmaj = ['Cb','Gb','Db','Ab','Eb','Bb','F','C','G','D','A', 'E', 'B', 'F#','C#'];
    kmin = ['Ab','Eb','Bb','F', 'C', 'G', 'D','A','E','B','F#','C#','G#','D#','A#'];
    key = '';
    if (mode == 'major') key = kmaj [7 + fifths];
    if (mode == 'minor') key = kmin [7 + fifths] + 'min';
    if (fifths >= 0) msralts = dict (accs.slice (0, fifths), reparr (fifths, 1));
    else             msralts = dict (accs.slice (fifths), reparr (-fifths, -1));
    return [key, msralts];
  }

  function insTup (ix, notes, fact) { // read one nested tuplet
    var tupcnt = 0, halted = 0, lastix, tupfact, fn, fd, fnum, fden, tupcntR, halted, tupPrefix, t;
    var nx = notes [ix];
    var i = nx.tup.indexOf ('start');
    if (i > -1)                 // splice (i, 1) == remove 1 element at i
      nx.tup.splice (i, 1);   // later do recursive calls when any starts remain
    var tix = ix;               // index of first tuplet note
    fn = fact[0]; fd = fact[1]; // xml time-mod of the higher level
    fnum = nx.fact[0]; fden = nx.fact[1];   // xml time-mod of the current level
    tupfact = [fnum/fn, fden/fd];           // abc time mod of this level
    while (ix < notes.length) {
      nx = notes [ix];
      if ((nx instanceof Elem) || nx.grace) {
        ix += 1;            // skip all non tuplet elements
        continue;
      }
      if (nx.tup.indexOf ('start') > -1) {    // more nested tuplets to start
        t = insTup (ix, notes, tupfact);
        ix = t[0]; tupcntR = t[1];      // ix is on the stop note!
        tupcnt += tupcntR
      } else if (nx.fact) {
        tupcnt += 1;        // count tuplet elements
      }
      i = nx.tup.indexOf ('stop')
      if (i > -1) {
        nx.tup.splice (i, 1);
        halted = 1;
        break;
      }
      if (!nx.fact) {         // stop on first non tuplet note
        ix = lastix;        // back to last tuplet note
        halted = 1;
        break;
      }
      lastix = ix;
      ix += 1;
    }
    // put abc tuplet notation before the recursive ones
    var tup =  [tupfact[0], tupfact[1], tupcnt];
    if (tup.toString () == '3,2,3') tupPrefix = '(3';
    else                            tupPrefix = format ('(%d:%d:%d', tup);
    notes [tix].tupabc =            tupPrefix + notes [tix].tupabc;
    return [ix, tupcnt]         // ix is on the last tuplet note
  }

  function mkBroken (vs) {        // introduce broken rhythms (vs: one voice, one measure)
    vs = vs.filter (function (n) { return n instanceof Note; });
    var i = 0;
    while (i < vs.length - 1) {
      var n1 = vs[i], n2 = vs[i+1] // scan all adjacent pairs
      if (!n1.fact && !n2.fact && n1.dur > 0 && n2.beam) {    // skip if note in tuplet or has no duration or outside beam
        if (n1.dur * 3 == n2.dur) {
          n2.dur = (2 * n2.dur) / 3;
          n1.dur = n1.dur * 2;
          n1.after = '<' + n1.after;
          i += 1;             // do not chain broken rhythms
        } else if (n2.dur * 3 == n1.dur) {
          n1.dur = (2 * n1.dur) / 3;
          n2.dur = n2.dur * 2;
          n1.after = '>' + n1.after;
          i += 1;             // do not chain broken rhythms
        }
      }
      i += 1;
    }
  }

  function outVoice (measure, divs, im, ip, unitL) {    // note/elem objects of one measure in one voice
    var ix = 0, tupcnt, t;
    while (ix < measure.length) {   // set all (nested) tuplet annotations
      var nx = measure [ix];
      if ((nx instanceof Note) && nx.fact) {
        t = insTup (ix, measure, [1, 1]); // read one tuplet, insert annotation(s)
        ix = t[0]; tupcnt = t[1];
      }
      ix += 1;
    }
    var vs = [], nospace, s;
    for (var i = 0; i < measure.length; ++i) {
      var nx = measure [i];
      if (nx instanceof Note) {
        var durstr = abcdur (nx, divs, unitL);      // xml -> abc duration string
        var chord = nx.ns.length > 1;
        var cns = nx.ns.filter (function (n) { return endswith (n, '-') });
        cns = cns.map (function (n) { return n.slice (0,-1) }); // chop tie
        var tie = '';
        if (chord && cns.length == nx.ns.length) {  // all chord notes tied
          nx.ns = cns     // chord notes without tie
          tie = '-'       // one tie for whole chord
        }
        s = nx.tupabc + nx.before;
        if (chord) s += '[';
        s += nx.ns.join ('');
        if (chord) s += ']' + tie;
        if (endswith (s, '-')) {
          s = s.slice (0,-1); // split off tie
          tie = '-';
        }
        s += durstr + tie;  // and put it back again
        s += nx.after;
        nospace = nx.beam;
      } else {
        s = nx.str;
        nospace = 1;
      }
      if (nospace) vs.push (s);
      else vs.push (' ' + s);
    }
    vs = vs.join ('');  // ad hoc: remove multiple pedal directions
    while (vs.indexOf ('!ped!!ped!') >= 0) vs = vs.replace (/!ped!!ped!/g,'!ped!');
    while (vs.indexOf ('!ped-up!!ped-up!') >= 0) vs = vs.replace (/!ped-up!!ped-up!/g,'!ped-up!');
    while (vs.indexOf ('!8va(!!8va)!') >= 0) vs = vs.replace (/!8va\(!!8va\)!/g,'');  // remove empty ottava's
    return vs;
  }

  function sortMeasure (voice, m) {
    voice.map (function (e, ix) { e.pos = ix; });   // prepare for stable sorting
    voice.sort (function (a, b) { return a.tijd - b.tijd || a.pos - b.pos; } )   // (stable) sort objects on time
    var time = 0;
    var v = [];
    for (var i = 0; i < voice.length; ++i) {    // establish sequentiality
      var nx = voice [i];
      if (nx.tijd > time) v.push (new Note (nx.tijd - time, 'x')); // fill hole
      if (nx instanceof Elem) {
        if (nx.tijd < time) nx.tijd = time; // shift elems without duration to where they fit
        v.push (nx);
        time = nx.tijd;
        continue;
      }
      if (nx.tijd < time) {                   // overlapping element
        if (nx.ns[0] == 'z') continue;      // discard overlapping rest
        var o = v [v.length - 1];           // last object in voice
        if (o.tijd <= nx.tijd) {            // we can do something
          if (o.ns[0] == 'z') {           // shorten rest
            o.dur = nx.tijd - o.tijd;
            if (o.dur == 0) v.pop ();   // nothing left, remove note
            infof ('overlap in part %d, measure %d: rest shortened', [m.ixp+1, m.ixm+1] );
          } else {                        // make a chord of overlap
            o.ns = o.ns.concat (nx.ns);
            infof ('overlap in part %d, measure %d: added chord', [m.ixp+1, m.ixm+1] );
            nx.dur = (nx.tijd + nx.dur) - time;  // the remains
            if (nx.dur <= 0) continue;           // nothing left
            nx.tijd = time;             // append remains
          }
        } else {                            // give up
          var s = 'overlapping notes in one voice! part %d, measure %d, note %s discarded';
          infof (s, [m.ixp+1, m.ixm+1, nx instanceof Note ? nx.ns : nx.str]);
          continue;
        }
      }
      v.push (nx);
      time = nx.tijd + nx.dur;
    }
    //   when a measure contains no elements and no forwards -> no incTime -> this.maxtime = 0 -> right barline
    //   is inserted at time == 0 (in addbar) and is only element in the voice when sortMeasure is called
    if (time == 0) infof ('empty measure in part %d, measure %d, it should contain at least a rest to advance the time!', [m.ixp+1, m.ixm+1] );
    return v;
  }

  function getPartlist ($ps) {    // correct part-list (from buggy xml-software)
    function mkstop (num) {     // make proper xml-element for missing part-group
      var elemstr = '<part-group number="%d" type="%s"></part-group>';
      var newelem = format (elemstr, [num, 'stop']);  // xml string of (missing) part-group
      newelem = $.parseXML (newelem).firstChild;      // part-group element is first child of (empty) xml document
      return $ (newelem);     // return a jquery object
    }
    var xs, e, $x, num, type, i, cs, inum;
    xs = [];    // the corrected part-list
    e = [];     // stack of opened part-groups
    for (cs = $ps.children (), i = 0; i < cs.length; i++) {
      $x = $(cs [i]);             // insert missing stops, delete double starts
      if ($x[0].nodeName ==  'part-group') {
        num = $x.attr ('number'); type = $x.attr ('type');
        inum = e.indexOf (num);
        if (type == 'start') {
          if (inum > -1) {    // missing stop: insert one
            xs.push (mkstop (num));
            xs.push ($x);
          } else {            // normal start
            xs.push ($x)
            e.push (num)
          }
        } else {
          if (inum > -1) {    // normal stop
            e.splice (inum, 1); // remove stop
            xs.push ($x)
          } else {}           // double stop: skip it
        }
      } else xs.push ($x);
    }
    for (i = e.length - 1; i >= 0; --i) { // fill missing stops at the end
      num = e[i];
      xs.push (mkstop (num));
    }
    return xs;
  }

  function parseParts (xs, d, e) {    // [] {} [] -> [[elems on current level], rest of xs]
    var $x, num, type, s, n, elemsnext, rest1, elems, rest2, nums, sym, rest, name, t;
    if (xs.length == 0) return [[],[]];
    $x = xs.shift ();
    if ($x[0].nodeName == 'part-group') {
      num = $x.attr ('number'); type = $x.attr ('type');
      if (type == 'start') {  // go one level deeper
        s = [];             // get group data
        for (n in {'group-symbol':0,'group-barline':0,'group-name':0,'group-abbreviation':0})
          s.push ($x.find (n).text () || '');
        d [num] = s;        // remember groupdata by group number
        e.push (num);       // make stack of open group numbers
        t = parseParts (xs, d, e);      // parse one level deeper to next stop
        elemsnext = t[0]; rest1 = t[1];
        t = parseParts (rest1, d, e);   // parse the rest on this level
        elems = t[0]; rest2 = t[1];
        return [[elemsnext].concat (elems), rest2];
      } else {                // stop: close level and return group-data
        nums = e.pop ();    // last open group number in stack order
        if (xs.length && xs[0].attr ('type') == 'stop') // two consequetive stops
          if (num != nums) {                          // in the wrong order (tempory solution)
            t = d[nums];
            d[nums] = d[num]; d[num] = t;           // exchange values    (only works for two stops!!!)
          }
        sym = d[num];       // retrieve and return groupdata as last element of the group
        return [[sym], xs];
      }
    } else {
      t = parseParts (xs, d, e);  // parse remaining elements on current level
      elems = t[0]; rest = t[1];
      name = ['name_tuple', $x.find ('part-name').text () || '', $x.find ('part-abbreviation').text () || ''];
      return [[name].concat (elems), rest];
    }
  }

  function bracePart (part) {     // put a brace on multistaff part and group voices
    var brace, ivs, i, j;
    if (part.length == 0) return [];    // empty part in the score
    brace = [];
    for (i = 0; i < part.length; ++i) {
      ivs = part [i];
      if (ivs.length == 1)    // stave with one voice
        brace.push ('' + ivs[0]);
      else {                  // stave with multiple voices
        brace.push ('(');
        for (j = 0; j < ivs.length; ++j) brace.push ('' + ivs [j]);
        brace.push (')');
      }
      brace.push('|');
    }
    brace.splice (-1, 1);       // no barline at the end
    if (part.length > 1)
      brace = ['{'].concat (brace).concat (['}']);
    return brace;
  }

  function prgroupelem (x, gnm, bar, pmap, accVce, accStf) {  // collect partnames (accVce) and %%score map (accStf)
    var y, nms, i, n1, n2, xx;
    if (x[0] == 'name_tuple') { // partname-tuple = ['name_tuple', part-name, part-abbrev]
      y = pmap.shift ();
      if (gnm[0]) {           // put group-name before part-name
        x[1] = gnm[0] + ':' + x[1];   // gnm == [group-name, group-abbrev]
        x[2] = gnm[1] + ':' + x[2];
      }
      accVce.push (x);
      accStf.push.apply (accStf, bracePart (y));
    } else if (x.length == 2) {     // misuse of group just to add extra name to stave
      y = pmap.shift ();
      nms = ['name_tuple','',''];
      nms[1] = x[0][1] + ':' + x[1][2];   // x[0] = ['name_tuple', part-name, part-abbrev]
      nms[2] = x[0][2] + ':' + x[1][3];   // x[1] = [bracket symbol, continue barline, group-name, group-abbrev]
      accVce.push (nms)
      accStf.push.apply (accStf, bracePart (y));
    } else {
      prgrouplist (x, bar, pmap, accVce, accStf);
    }
  }

  function prgrouplist (x, pbar, pmap, accVce, accStf) {  // collect partnames, scoremap for a part-group
    var sym, bar, gnm, gabbr, y, z, i, t;
    t = x [x.length-1];                     // bracket symbol, continue barline, group-name-tuple
    sym = t[0]; bar = t[1]; gnm = t[2]; gabbr = t[3];
    bar = bar == 'yes' || pbar;             // pbar -> the parent has bar
    accStf.push (sym == 'brace' ? '{' : '[')
    for (i = 0; i < x.length - 1; ++i) {
      prgroupelem (x[i], [gnm, gabbr], bar, pmap, accVce, accStf)
      if (bar) accStf.push ('|')
    }
    if (bar) accStf.splice (-1, 1);         // remove last one before close
    accStf.push (sym == 'brace' ? '}' : ']');
  }

  function compUnitLength (iv, maten, divs) {   // compute optimal unit length
    var uLmin = 0, minLen = max_int, i, j;
    var xs = [4,8,16];      // try 1/4, 1/8 and 1/16
    while (xs.length) {
      var uL = xs.shift ();
      var vLen = 0;       // total length of abc duration strings in this voice
      for (i = 0; i < maten.length; ++i) { // all measures
        var m = maten [i][iv];  // voice iv
        for (j = 0; j < m.length; ++j) {
          var e = m[j];       // all notes in voice iv
          if ((e instanceof Elem) || e.dur == 0) continue;    // no real durations
          vLen += abcdur (e, divs, uL).length;        // add len of duration string
        }
      }
      if (vLen < minLen) { uLmin = uL; minLen = vLen; }   // remember the smallest
    }
    return uLmin;
  }

  function doSyllable ($lyr) {
    var txt = '';       // collect all text and elision elements
    var $xs = $lyr.children ();
    for (var i = 0; i < $xs.length; ++i) {
      var e = $xs [i];
      switch (e.nodeName) {
        case 'elision': txt += '~'; break;
        case 'text':    // escape _, - and space
          txt += $(e).text ().replace (/_/g,'\\_').replace (/-/g, '\\-').replace (/ /g, '~');
          break;
      }
    }
    if (!txt) return txt;
    var s = $lyr.find ('syllabic').text ();
    if (s == 'begin' || s == 'middle')  txt += '-';
    if ($lyr.find ('extend').length)    txt += '_';
    return txt;
  }

  function checkMelismas (lyrics, maten, im, iv) {
    if (im == 0) return;
    var maat = maten [im][iv];          // notes of the current measure
    var curlyr = lyrics [im][iv];       // lyrics dict of current measure
    var prvlyr = lyrics [im-1][iv];     // lyrics dict of previous measure
    var n, lyrstr, melis, ms;
    for (n in prvlyr) {                 // all lyric numbers in the previous measure
      var t = prvlyr [n];
      lyrstr = t[0]; melis = t[1];
      if (!(n in curlyr) && melis) {  // melisma required, but no lyrics present -> make one!
        ms = getMelisma (maat);     // get a melisma for the current measure
        if (ms) curlyr [n] = [ms, 0];   // set melisma as the n-th lyrics of the current measure
      }
    }
  }

  function getMelisma (maat) {            // get melisma from notes in maat
    var ms = [];
    for (var i = 0; i < maat.length; ++i) {     // every note should get an underscore
      var note = maat [i];
      if (!(note instanceof Note)) continue;  // skip Elem's
      if (note.grace) continue;               // skip grace notes
      if (note.ns [0] == 'z' || note.ns [0] == 'x') break;    // stop on first rest
      ms.push ('_');
    }
    return ms.join (' ');
  }

//----------------
// parser
//----------------
  function Parser (options) {
    this.slurBuf = {};    // dict of open slurs keyed by slur number
    this.dirStk = {};     // {direction-type + number -> (type, voice | time)} dict for proper closing
    this.ingrace = 0;     // marks a sequence of grace notes
    this.msc = new Music (options); // global music data abstraction
    this.unfold = options.u; // turn unfolding repeats on
    this.ctf = options.c;    // credit text filter level
    this.gStfMap = [];    // [[abc voice numbers] for all parts]
    this.midiMap = [];    // midi-settings for each abc voice, in order
    this.drumInst = {};   // inst_id -> midi pitch for channel 10 notes
    this.drumNotes = {};  // 'xml voice ; abc note' -> (midi note, note head)
    this.instMid = [];    // [{inst id -> midi-settings} for all parts]
    this.midDflt = [-1,-1,-1,-91]; // default midi settings for channel, program, volume, panning
    this.msralts = {};    // xml-notenames (without octave) with accidentals from the key
    this.curalts = {};    // abc-notenames (with voice number) with passing accidentals
    this.stfMap = {};     // xml staff number -> [xml voice number]
    this.clefMap = {};    // xml staff number -> abc clef (for header only)
    this.curClef = {};    // xml staff number -> current abc clef
    this.clefOct = {};    // xml staff number -> current clef-octave-change
    this.curStf = {};     // xml voice number -> current xml staff number
    this.nolbrk = options.x; // generate no linebreaks ($)
    this.doPageFmt = options.p.length == 1; // translate xml page format
    this.tstep = options.t; // clef determines step on staff (percussion)
    this.dirtov1 = options.v1;  // all directions to first voice of staff
    this.ped = !options.noped;  // render pedal directions
    this.pedVce = null;     // voice for pedal directions
  }
  Parser.prototype.matchSlur = function (type2, n, v2, note2, grace, stopgrace) { // match slur number n in voice v2, add abc code to before/after
    if (['start', 'stop'].indexOf (type2) == -1) return;    // slur type continue has no abc equivalent
    if (!n) n = '1';                    // default slur number
    if (n in this.slurBuf) {
      var t = this.slurBuf [n];
      var type1 = t[0], v1 = t[1], note1 = t[2], grace1 = t[3];
      if (type2 != type1) {           // slur complete, now check the voice
        if (v2 == v1) {             // begins and ends in the same voice: keep it
          if (type1 == 'start' && (!grace1 || !stopgrace)) {  // normal slur: start before stop and no grace slur
            note1.before = '(' + note1.before;  // keep left-right order!
            note2.after += ')';
          }
        }   // no else: don't bother with reversed stave spanning slurs
        delete this.slurBuf [n];    // slur finished, remove from stack
      } else {                        // double definition, keep the last
        infof ('double slur numbers %s-%s in part %d, measure %d, voice %d note %s, first discarded', [type2, n, this.msr.ixp+1, this.msr.ixm+1, v2, note2.ns]);
        this.slurBuf [n] = [type2, v2, note2, grace];
      }
    } else {                            // unmatched slur, put in dict
      this.slurBuf [n] = [type2, v2, note2, grace];
    }
  }
  Parser.prototype.doNotations = function (note, $nttn) {
    var ks = Object.keys (note_ornamentation_map).sort ();
    for (var i = 0; i < ks.length; ++i) {
      var key = ks[i];
      var val = note_ornamentation_map [key];
      if ($nttn.find (key).length) note.before += val;    // just concat all ornaments
    }
    var $fingering = $nttn.find ('technical>fingering');
    $fingering.each (function () {  // handle multiple finger annotations
      note.before += '!' + $(this).text () + '!';  // validate text?
    });
    var $wvln = $nttn.find ('ornaments>wavy-line');
    if ($wvln.length) {
      switch ($wvln.attr ('type')) {
        case 'start': note.before = '!trill(!' + note.before; break; // keep left-right order!
        case 'stop': note.after += '!trill)!'; break
      }
    }
  }
  Parser.prototype.ntAbc = function (ptc, o, $note, v) {  // pitch, octave -> abc notation
    var acc2alt = {'double-flat':-2,'flat-flat':-2,'flat':-1,'natural':0,'sharp':1,'sharp-sharp':2,'double-sharp':2};
    o += this.clefOct [this.curStf [v]] || 0;       // current clef-octave-change value
    var p = ptc;
    if (o > 4) p = ptc.toLowerCase ();
    if (o > 5) p = p + repstr (o-5, "'");
    if (o < 4) p = p + repstr (4-o, ",");
    var acc = $note.find ('accidental').text ();    // should be the notated accidental
    var alt = $note.find ('pitch>alter').text ();   // pitch alteration (midi)
    if (!alt && this.msralts [ptc]) alt = 0;        // no alt but key implies alt -> natural!!
    var p_v = p + '#' + v;          // key == pitch, voice
    if (!alt && p_v in this.curalts) alt = 0;       // no alt but previous note had one -> natural!!
    if (acc === '' && alt === '') {
      return p;                   // no acc, no alt
    } else if (acc != '') {
      alt = acc2alt [acc];
    } else {                        // now see if we really must add an accidental
      alt = parseInt (alt);
      if (p_v in this.curalts) {  // the note in this voice has been altered before
        if (alt == this.curalts [p_v]) return p;            // alteration still the same
      } else if (alt == (this.msralts [ptc] || 0)) return p;  // alteration implied by the key
      var xs = $note.find ('tie').add ($note.find ('notations>tied')).get (); // in xml we have separate notated ties and playback ties
      if (xs.some (function (x) { return x.getAttribute ('type') == 'stop'; })) return p; // don't alter tied notes
      infof ('accidental %d added in part %d, measure %d, voice %d note %s', [alt, this.msr.ixp+1, this.msr.ixm+1, v+1, p] );
    }
    this.curalts [p_v] = alt;
    p = ['__','_','=','^','^^'][alt+2] + p; // and finally ... prepend the accidental
    return p;
  }
  Parser.prototype.doNote = function ($n) {
    var note = new Note (0, null);
    var v = parseInt ($n.find ('voice').text () || '1');
    if (this.isSib) v += 100 * ($n.find ('staff').text () || '1')   // repair bug in Sibelius
    var chord = $n.find ('chord').length > 0;
    var p = $n.find ('pitch>step').text () || $n.find ('unpitched>display-step').text ();
    var o = $n.find ('pitch>octave').text () || $n.find ('unpitched>display-octave').text ();
    var r = $n.find ('rest').length > 0;
    var numer = $n.find ('time-modification>actual-notes').text();
    if (numer) {
      var denom = $n.find ('time-modification>normal-notes').text();
      note.fact = [parseInt (numer), parseInt (denom)];
    }
    note.tup = $n.find ('notations>tuplet').map (function () { return $(this).attr ('type'); }).get();
    var dur = $n.find ('duration').text ();
    var $grc = $n.find ('grace');
    note.grace = $grc.length > 0;
    note.before = '', note.after = ''   // strings with ABC stuff that goes before or after a note/chord
    if (note.grace && !this.ingrace) {     // open a grace sequence
      this.ingrace = 1;
      note.before = '{';
      if ($grc.attr ('slash') == 'yes') note.before += '/';   // acciaccatura
    }
    var stopgrace = !note.grace && this.ingrace;
    if (stopgrace) {                    // close the grace sequence
      this.ingrace = 0;
      this.msc.lastnote.after += '}'; // close grace on lastenote.after
    }
    if (!dur || note.grace) dur = 0;
    if (!r && $n.attr ('print-object') == 'no') {   // not a rest and not visible
      if (!chord) this.msc.incTime (parseInt (dur));  // still increment the time !!
      this.msc.cnt.inc ('nopr', v);   // count skipped notes
      return;                         // skip non printable notes
    }
    note.dur = parseInt (dur);
    if (!r && (!p || !o)) {             // not a rest and no pitch
      this.msc.cnt.inc ('nopt', v);   // count unpitched notes
      o = 5; p = 'E';                 // make it an E5 ??
    }
    var $nttn = $n.find ('notations');  // add ornaments
    if ($nttn.length) this.doNotations (note, $nttn);
    var noot;
    if (r) noot = $n.attr ('print-object') == 'no' ? 'x' : 'z';
    else noot = this.ntAbc (p, parseInt (o), $n, v);
    if ($n.find ('unpitched').length) {
      var clef = this.curClef [this.curStf [v]];      // the current clef for this voice
      var step = staffStep (p, parseInt (o), clef, this.tstep); // (clef independent) step value for note on staff
      var $instr = $n.find ('instrument');
      var instId = $instr.length ? $instr.attr ('id') : 'dummyId';
      var midi = this.drumInst [instId] || abcMid (noot);
      var $nh = $n.find ('notehead');
      var nh =  $nh.text ().replace (' ','-');        //replace spaces in xml notehead names for percmap
      if ($nh.attr ('filled') == 'yes') nh += '+';
      if (nh == 'x') noot = '^' + noot.replace (/\^/g,'').replace (/_/g,'');
      if (nh == 'circle-x' || nh == 'diamond') noot = '_' + noot.replace (/\^/g,'').replace (/_/g,'');
      this.drumNotes [v+';'+noot] = [step, midi, nh]; // keep data for percussion map
    }
    var xs = $n.find ('tie').add ($n.find ('notations>tied')).get ();   // array of dom elements
    if (xs.some (function (x) { return x.getAttribute ('type') == 'start'; }))  // n can have stop and start tie
      noot += '-';
    xs = $n.find ('beam').map (function () { return $(this).text (); }).get ();
    note.beam = xs.indexOf ('continue') > -1 || xs.indexOf ('end') > -1 || note.grace;
    xs = $n.find ('lyric'); var lyrlast = 0;
    for (var i = 0; i < xs.length; ++i) {
      var $e = $(xs [i]);
      var lyrnum = parseInt (($e.attr ('number') || '1').replace (/^.*verse/, ''));
      if (lyrnum == 0) lyrnum = lyrlast + 1
      else lyrlast = lyrnum;
      note.lyrs [lyrnum] = doSyllable ($e);
    }
    if (chord) this.msc.addChord (noot);
    else {
      var xmlstaff = parseInt ($n.find ('staff').text () || '1');
      if (this.curStf [v] != xmlstaff) {      // the note should go to another staff
        var dstaff = xmlstaff - this.curStf [v];    // relative new staff number
        this.curStf [v] = xmlstaff;         // remember the new staff for this voice
        var sgn = dstaff > 0 ? '+' : '';    // force a sign
        this.msc.appendElem (v, '[I:staff ' + sgn + dstaff + ']');  // insert a move before the note
      }
      this.msc.appendNote (v, note, noot)
    }
    xs = $n.find ('notations>slur');
    for (var i = 0; i < xs.length; ++i) {
      var $slur = $(xs[i]);   // this.msc.lastnote points to the last real note/chord inserted above
      this.matchSlur ($slur.attr ('type'), $slur.attr ('number'), v, this.msc.lastnote, note.grace, stopgrace); // match slur definitions
    }
  }
  Parser.prototype.doAttr = function ($e) {
    var teken, trans, dvstxt, steps, fifths, first, key, beats, unit, mtr, toct, $clef, n, sgn, line, cs, oct, voices, v, dstaff, i, clfs, j, t, lines;
    teken = {'C1':'alto1','C2':'alto2','C3':'alto','C4':'tenor','F4':'bass','F3':'bass3','G2':'treble','TAB':'','percussion':'perc'}
    dvstxt = $e.find ('divisions').text ();
    if (dvstxt) this.msr.divs = parseInt (dvstxt);
    steps = parseInt ($e.find ('transpose>chromatic').text () || '0');  // for transposing instrument
    fifths = $e.find ('key>fifths').first().text ();
    first = this.msc.tijd == 0 && this.msr.ixm == 0;    // first attributes in first measure
    if (fifths) {
      t = setKey (parseInt (fifths), $e.find ('key>mode').first().text () || 'major');
      key = t[0];
      this.msralts = t[1];
      if (first && !steps && abcOut.key == 'none')
        abcOut.key = key;   // first measure -> header, if not transposing instrument and header not yet set.
      else if (key != abcOut.key || !first)
        this.msr.attr += '[K:' + key + ']'; // otherwise -> voice
    }
    beats = $e.find ('time>beats').text ();
    if (beats) {
      unit = $e.find ('time>beat-type').text ();
      mtr = beats + '/' + unit;
      if (first) abcOut.mtr = mtr;                // first measure -> header
      else this.msr.attr += '[M:' + mtr + ']';    // otherwise -> voice
      this.msr.mdur = (this.msr.divs * parseInt (beats) * 4) / parseInt (unit);    // duration of measure in xml-divisions
    }
    toct = $e.find ('transpose>octave-change').text () || '';
    if (toct) steps += 12 * parseInt (toct);        // extra transposition of toct octaves
    clfs = $e.find ('clef');
    for (i = 0; i < clfs.length; i++) {             // a part can have multiple staves
      $clef = $ (clfs [i]);
      n = parseInt ($clef.attr ('number') || '1');    // local staff number for this clef
      sgn = $clef.find ('sign').text ();
      line = sgn != 'percussion' ? $clef.find ('line').text () || '' : '';
      cs = teken [sgn + line] || '';
      oct = $clef.find ('clef-octave-change').text () || '0';
      if (oct) cs += {'-2':'-15', '-1':'-8', '1':'+8', '2':'+15'} [oct] || '';
      this.clefOct [n] = -parseInt (oct);     // xml playback pitch -> abc notation pitch
      if (steps) cs += ' transpose=' + steps;
      lines = $e.find ('staff-details>staff-lines').text ();
      if (lines) cs += ' stafflines=' + lines;
      this.curClef [n] = cs;                  // keep track of current clef (for percmap)
      if (first) this.clefMap [n] = cs;       // clef goes to header (where it is mapped to voices)
      else {
        voices = this.stfMap [n];           // clef change to all voices of staff n
        for (j = 0; j < voices.length; ++j) {
          v = voices [j];
          if (n != this.curStf [v]) {     // voice is not at its home staff n
            dstaff = n - this.curStf [v];
            this.curStf [v] = n;        // reset current staff at start of measure to home position
            var sgn = dstaff > 0 ? '+' : '';    // force a sign
            this.msc.appendElem (v, '[I:staff ' + sgn + dstaff + ']');
          }
          this.msc.appendElem (v, '[K:' + cs + ']')
        }
      }
    }
  }
  Parser.prototype.findVoice = function (i, $es) {
    var stfnum, v1, $e, k, stf, v;
    $e = $es.eq (i);
    stfnum = parseInt ($e.find ('staff').text () || '1');   // directions belong to a staff
    v1 = this.stfMap [stfnum][0];           // directions to first voice of staff
    if (this.dirtov1) return { sn:stfnum, v:v1, v1:v1 }     // option --v1
    for (k = i; k < $es.length; ++k) {
      $e = $es.eq (k);
      if ($e.prop ('nodeName') == 'note') {
        stf = parseInt ($e.find ('staff').text () || '1')
        v = parseInt ($e.find ('voice').text () || '1')
        if (this.isSib) v += 100 * stf; // repair bug in Sibelius
        return { sn:stf, v:v, v1:v1 };  // voice of next note, first voice of staff
      }
      if ($e.prop ('nodeName') == 'backup') break
    }
    return { sn:stfnum, v:v1, v1:v1 };      // no note found, fall back to v1
  }
  Parser.prototype.doDirection = function ($e, i, $es) {  // parse a musicXML direction tag
    var plcmnt, t, tempo, stfnum, dirtyp, vs, type, x, txt, plc, plcmnt, key, val, minst, prg, chn, v, parm, inst, wrds, stf, v1;
    function addDirection (dit, x, vs, tijd, stfnum) {
      if (!x) return;
      vs = x.indexOf ('!8v') >= 0 ? dit.stfMap [stfnum] : [vs]; // ottava's go to all voices of staff
      vs.forEach (function (v) {
        if (tijd != null)       // insert at time of encounter
          dit.msc.appendElemT (v, x.replace ('(',')').replace ('ped','ped-up'), tijd);
        else
          dit.msc.appendElem (v, x);
      });
    }
    function startStop (dit, dtype, vs, stfnum) {
      var k, sk, x;
      typmap = {'down':'!8va(!', 'up':'!8vb(!', 'crescendo':'!<(!', 'diminuendo':'!>(!', 'start':'!ped!'}
      type = t.attr ('type') || '';
      k = dtype + (t.attr ('number') || '1');   // key to match the closing direction
      if (type in typmap) {                   // opening the direction
        x = typmap [type];
        if (k in dit.dirStk) {             // closing direction already encountered
          sk = dit.dirStk [k]; delete dit.dirStk [k];
          if (sk.type == 'stop')
            addDirection (dit, x, vs, sk.tijd, stfnum);
          else {
            infof ('%s direction %s has no stop in part %d, measure %d, voice %d', [dtype, sk.type, dit.msr.ixp+1, dit.msr.ixm+1, vs+1]);
            dit.dirStk [k] = { type:type , vs:vs };    // remember voice and type for closing
          }
        } else {
          dit.dirStk [k] = { type:type , vs:vs };        // remember voice and type for closing
        }
      } else if (type == 'stop') {
        if (k in dit.dirStk) {             // matching open direction found
          sk = dit.dirStk [k]; delete dit.dirStk [k];   // into the same voice
          type = sk.type; vs = sk.vs;    // same values as opening direction
          if (type == 'stop') {
            infof ('%s direction %s has double stop in part %d, measure %d, voice %d', [dtype, type, dit.msr.ixp+1, dit.msr.ixm+1, vs+1]);
            x = '';
          } else {
            x = typmap [sk.type].replace ('(',')').replace ('ped','ped-up');
          }
        } else {                            // closing direction found before opening
          dit.dirStk [k] = { type:'stop', tijd: dit.msc.tijd };
          x = ''                          // delay code generation until opening found
        }
      } else throw 'wrong direction type';
      addDirection (dit, x, vs, null, stfnum);
    }
    plcmnt = $e.attr ('placement');
    x = this.findVoice (i, $es);
    stf = x.sn; vs = x.v, v1 = x.v1;
    t = $e.find ('sound')        // there are many possible attributes for sound
    if (t.length) {
      minst = t.find ('midi-instrument');
      if (minst) {
        prg = t.find ('midi-instrument>midi-program').text ();
        chn = t.find ('midi-instrument>midi-channel').text ();
        for (v in this.vceInst) {   // direction is for the indentified voice, not the staff
          if (this.vceInst [v] == minst.attr ('id')) vs = v;
        }
        parm = prg ? 'program'  : 'channel';
        inst = (prg ? prg - 1    : chn) + '';
        if (inst && abcOut.volpan > 0) this.msc.appendElem (vs, '[I:MIDI= '+ parm +' '+ inst +']')
      }
      tempo = t.attr ('tempo'); // look for tempo attribute
      if (tempo) {
        if (tempo.indexOf ('.') > -1) tempo = parseFloat (tempo).toFixed (2); // hope it is a number and insert in voice 1
        else                          tempo = parseInt (tempo);
        if (this.msc.tijd == 0 && this.msr.ixm == 0) abcOut.tempo = tempo; // first measure -> header
        else this.msc.appendElem (v1, '[Q:1/4=' + tempo + ']'); // otherwise -> first voice
      }
    }
    dirtyp = $e.children ('direction-type');
    if (dirtyp.length) {
      t = dirtyp.find ('wedge');
      if (t.length) startStop (this, 'wedge', vs);
      wrds = dirtyp.find ('words').eq (0);
      if (wrds.length == 0) wrds = dirtyp.find ('rehearsal').eq (0);  // treat rehearsal mark as text annotation
      if (wrds.length) {
        plc = plcmnt == 'below' ? '_' : '^' ;
        if (parseFloat (wrds.attr ('default-y') || '0') < 0) plc = '_'
        txt = wrds.text().replace (/"/g,'\\"').replace (/\n/g, ' ').trim ();
        if (txt) this.msc.appendElem (vs, '"' + plc + txt + '"', 1);    // to first voice
      }
      for (key in dynamics_map) {
        val = dynamics_map [key];
        if (dirtyp.find ('dynamics>' + key).length)
          this.msc.appendElem (vs, val, 1);  // to first voice
      }
      if (dirtyp.find ('coda').length) this.msc.appendElem (vs, 'O', 1);
      if (dirtyp.find ('segno').length) this.msc.appendElem (vs, 'S', 1);
      t = dirtyp.find ('octave-shift');
      if (t.length) startStop (this, 'octave-shift', vs, stf);  // assume size == 8 for the time being
      t = dirtyp.find ('pedal');
      if (t.length && this.ped) {
        if (!this.pedVce) this.pedVce = vs;
        startStop (this, 'pedal', this.pedVce);
      }
    }
  }
  Parser.prototype.doHarmony = function ($e, i, $es) {    // parse a musicXMl harmony tag
    var stfnum, vt, kort, accmap, modmap, altmap, root, alt, sus, kind, triad, mod, degrees, bass, i, $d, t;
    vt = this.findVoice (i, $es).v;     // find voice for this chord
    kort   = {'major':'', 'minor':'m', 'augmented':'+', 'diminished':'dim', 'dominant':'7', 'half-diminished':'m7b5'};
    accmap = {'major':'maj', 'dominant':'', 'minor':'m', 'diminished':'dim', 'augmented':'+', 'suspended':'sus'};
    modmap = {'second':'2', 'fourth':'4', 'seventh':'7', 'sixth':'6', 'ninth':'9', '11th':'11', '13th':'13'};
    altmap = {'1':'#', '0':'', '-1':'b'};
    root = $e.find ('root>root-step','').text ();
    alt = altmap [$e.find ('root>root-alter').text ()] ||  '';
    sus = ''
    kind = $e.find ('kind').text ();
    if (kind in kort) kind = kort [kind];
    else if (kind.indexOf ('-') > -1) {         // xml chord names: <triad name>-<modification>
      t = kind.split ('-');
      triad = t[0]; mod = t[1];
      kind = (accmap [triad] || '') + (modmap [mod] || '');
      if (kind.indexOf ('sus') == 0) { sus = kind; kind = ''; };    // sus-suffix goes to the end
    } else if (kind == 'none') kind = $e.find ('kind').attr ('text');
    degrees = $e.find ('degree');
    for (i = 0; i < degrees.length; ++i) {      // chord alterations
      $d = $(degrees [i]);
      kind += (altmap [$d.find ('degree-alter').text ()] || '') + $d.find ('degree-value').text ();
    }
    kind = kind.replace ('79','9').replace ('713','13').replace ('maj6','6');
    bass = $e.find ('bass>bass-step').text () + (altmap [$e.find ('bass>bass-alter').text ()] || '');
    this.msc.appendElem (vt, '"' + root + alt + kind + sus + (bass && '/' + bass) + '"', 1);
  }
  Parser.prototype.doBarline = function ($e) {
    var $rep = $e.find ('repeat');
    var rep = 0;            // 0 = no repeat, 1 = begin repeat, 2 = end repeat
    if ($rep.length) rep = $rep.attr ('direction');
    if (this.unfold) {      // unfold repeat, don't translate barlines
      return rep ? (rep == 'forward' ? 1 : 2) : 0;
    }
    var loc = $e.attr ('location');
    if (loc == 'right') {   // only change style for the right side
      var style = $e.find ('bar-style').text ();
      if      (style == 'light-light') this.msr.rline = '||';
      else if (style == 'light-heavy') this.msr.rline = '|]';
    }
    if (rep) {              // repeat found
      if (rep == 'forward') this.msr.lline = ':';
      else                  this.msr.rline = ':|'; // override barline style
    }
    var $end = $e.find ('ending');
    if ($end.length) {
      if ($end.attr ('type') == 'start') {
        var n = ($end.attr ('number') || '1').replace (/\./g,'').replace (/ /g,'');
        if (!/^[\d,]+$/.test (n)) {     // should be a list comma separated integers
          n = '"' + n.trim () + '"'   // illegal musicXML
        }
        this.msr.lnum = n;      // assume a start is always at the beginning of a measure
      } else if (this.msr.rline == '|') { // stop and discontinue the same  in ABC ?
        this.msr.rline = '||';  // to stop on a normal barline use || in ABC ?
      }
    }
    return 0;
  }
  Parser.prototype.doPrint = function ($e) {  // print element, measure number -> insert a line break
    if ($e.attr ('new-system') == 'yes' || $e.attr ('new-page') == 'yes')
      return this.nolbrk ? '' : '$';      // a line break
  }
  Parser.prototype.doPartList = function ($e) {    // translate the start/stop-event-based xml-partlist into proper tree
    var i, j, k, sp, $sparts, midi, $mins, $m, xs, parms, p, pan, $ps, partlist, up;
    $sparts = $e.find ('part-list>score-part');
    for (i = 0; i < $sparts.length; ++i) {
      sp = $sparts [i];
      midi = {};
      $mins = $(sp).find ('midi-instrument');
      for (j = 0; j < $mins.length; ++j) {
        $m = $($mins [j]);
        parms = ['midi-channel','midi-program','volume','pan'];
        xs = [];
        for (k = 0; k < parms.length; ++k) {
          p = parms [k];
          xs.push ($m.find (p).text () || this.midDflt [k]);
        }
        pan = xs[3];
        if (pan >= -90 && pan <= 90)        // would be better to map behind-pannings
          pan = (pan + 90) / 180 * 127;   // xml between -90 and +90
        midi [$m.attr ('id')] = [parseInt (xs[0]), parseInt (xs[1]), parseFloat (xs[2]), pan];
        up = $m.find ('midi-unpitched').text ();
        if (up) this.drumInst [$m.attr ('id')] = up - 1 // store midi-pitch for channel 10 notes
      }
      this.instMid.push (midi);
    }
    $ps = $e.find ('part-list');            // partlist  = [groupelem]
    xs = getPartlist ($ps);                 // groupelem = partname | grouplist
    partlist = parseParts (xs, {}, []) [0]; // grouplist = [groupelem, ..., groupdata]
    return partlist;                        // groupdata = [group-symbol, group-barline, group-name, group-abbrev]
  }
  Parser.prototype.mkTitle = function ($e) {
    var title, mvttl, composer = [], lyricist = [], credits = [], xs, i, $creator, ctxt, ctype, cs, ys, j;
    function filterCredits (y) {    // y == filter level, higher filters less
      var cs = [], x, i;
      function _in (y, ys) { return y && ys.indexOf (y) > -1; };  // y in ys
      function _fc (c) { return _in (c, x) };                     // c in (free variable) x
      for (i = 0; i < credits.length; ++i) {  // skip redundant credit lines
        x = credits [i];
        if (y < 6 && (_in (x, title) || _in (x, mvttl))) continue;          // sure skip
        if (y < 5 && (_in (x, composer) || _in (x, lyricist))) continue;    // almost sure skip
        if (y < 4 && (_in (title, x) || _in (mvttl, x))) continue;          // may skip too much
        if (y < 3 && (composer.some (_fc) || lyricist.some (_fc))) continue; // skips too much
        if (y < 2 && /^[\d\W]*$/.test (x)) continue;    // line only contains numbers and punctuation
        cs.push (x);
      }
      if (y == 0 && (title + mvttl)) cs = ''; // default: only credit when no title set
      return cs;
    }
    title = $e.find ('work>work-title').text ().trim ();
    mvttl = $e.find ('movement-title').text ().trim ();
    xs = $e.find ('identification>creator');
    for (i = 0; i < xs.length; ++i) {
      $creator = $ (xs[i]);
      ctxt = $creator.text ();
      ctype = $creator.attr ('type');
      if (ctxt) {
        ctxt = ctxt.split ('\n').map (function (s) { return s.trim (); });
        if (ctype == 'composer') composer.push.apply (composer, ctxt);
        else if (ctype == 'lyricist' || ctype == 'transcriber') lyricist.push.apply (lyricist, ctxt);
      }
    }
    xs = $e.find ('identification>rights');
    for (i = 0; i < xs.length; ++i) {
      ctxt = $ (xs[i]).text ();
      ctxt = ctxt.split ('\n').map (function (s) { return s.trim (); });
      lyricist.push.apply (lyricist, ctxt);
    }
    xs = $e.find ('credit');
    for (i = 0; i < xs.length; ++i) {
      cs = '';
      ys = $(xs[i]).find ('credit-words');
      for (j = 0; j < ys.length; ++j) {
        cs += $(ys [j]).text ();
      }
      credits.push (cs.replace (/\s*[\r\n]\s*/g, ' '));
    }
    credits = filterCredits (this.ctf);
    if (title) title = 'T:' + title.replace (/\n/g,'\nT:') + '\n';
    if (mvttl) title += 'T:' + mvttl.replace (/\n/g,'\nT:') + '\n';
    if (credits.length) title += credits.map (function (c) { return 'T:' + c; }).join ('\n') + '\n';
    if (composer.length) title += composer.map (function (c) { return 'C:' + c; }).join ('\n') + '\n';
    if (lyricist.length) title += lyricist.map (function (c) { return 'Z:' + c; }).join ('\n') + '\n';
    if (title) abcOut.title = title.substr (0, title.length - 1);
    this.isSib = $e.find ('identification>encoding>software').text ().indexOf ('Sibelius') >= 0;
    if (this.isSib) infof ('Sibelius MusicXMl is unreliable', []);

  }
  Parser.prototype.doDefaults = function ($e) {
    var $d, mils, tenths, pagewidth, leftmargin, rightmargin, space, abcScale, xmlScale, $pm;
    if (!this.doPageFmt) return;                    // return if options.p == []
    $d = $e.find ('defaults');
    if (!$d.length) return;
    mils = $d.find ('scaling>millimeters').text (); // mills == staff height (mm)
    tenths = $d.find ('scaling>tenths').text ();    // staff height in tenths
    xmlScale = mils / tenths / 10;                  // tenths -> cm
    pagewidth = $d.find ('page-layout>page-width').text () * xmlScale;
    $pm = $d.find ('page-layout>page-margins').first ();    // first: even and odd pages
    leftmargin = $pm.find ('left-margin').text ();
    rightmargin = $pm.find ('right-margin').text ();
    space = 10 * xmlScale;      // space between staff lines == 10 tenths
    abcScale = space / 0.2117;  // 0.2117 cm = 6pt = space between staff lines for scale = 1.0 in abcm2ps
    if (!abcOut.scale && abcScale) abcOut.scale = abcScale.toFixed (2);
    if (!abcOut.pagewidth && pagewidth) abcOut.pagewidth = pagewidth.toFixed (2);
    if (!abcOut.leftmargin && leftmargin != '') abcOut.leftmargin = (leftmargin * xmlScale).toFixed (2);
    if (!abcOut.rightmargin && rightmargin != '') abcOut.rightmargin = (rightmargin * xmlScale).toFixed (2);
  }
  Parser.prototype.locStaffMap = function ($part, $maten) {   // map voice to staff with majority voting
    var vmap = {};          // {voice -> {staff -> n}} count occurrences of voice in staff
    this.vceInst = {};      // {voice -> instrument id} for this part
    this.msc.vnums = {};    // voice id's
    var ns = $part.find ('measure>note')
    for (var i = 0; i < ns.length; i++) {   // count staff allocations for all notes
      var $n = $ (ns [i]);
      var v = parseInt ($n.find ('voice').text () || '1');
      if (this.isSib) v += 100 * ($n.find ('staff').text () || '1')   // repair bug in Sibelius
      this.msc.vnums [v] = 1; // collect all used voice id's in this part
      var sn = parseInt ($n.find ('staff').text () || '1');
      if (v in vmap) {
        var d = vmap[v];    // counter for voice v
        d[sn] = (d[sn] || 0) + 1;   // ++ number of allocations for staff sn
      } else {
        var x = {}; x [sn] = 1;
        vmap [v] = x;       // {sn : 1}
      }
      var x = $n.find ('instrument');
      if (x.length) this.vceInst [v] = $(x).attr ('id');
    }
    this.stfMap = {}; this.clefMap = {};    // staff -> [voices], staff -> clef
    for (var v in vmap) {       // choose staff with most allocations for each voice
      var xs = [], vtup = vmap [v];
      for (var sn in vtup) xs.push ([vtup [sn], sn]);
      xs.sort (function (a, b) { return b[0] - a[0]; });
      var stf = xs[0][1];     // the winner: staff with most notes of voice v
      this.stfMap [stf] = (this.stfMap [stf] || []).concat ([v]);
      this.curStf [v] = stf;  // current staff of XML voice v
    }
  }
  Parser.prototype.addStaffMap = function (vvmap) {   // vvmap: xml voice number -> global abc voice number
    var i, j, iv, clef, voices, stf, locmap;
    var part = [];                      // default: brace on staffs of one part
    var staff_keys = Object.keys (this.stfMap).sort ();
    for (j = 0; j < staff_keys.length; ++j) {   // scan stfMap in alphabetical (xml) staff number order
      stf = staff_keys [j];
      voices = this.stfMap [stf];     // this.stfMap has xml staff and voice numbers
      locmap = [];
      for (i = 0; i < voices.length; ++i) {   // voices is an array of xml voice numbers
        iv = voices [i];            // xml voice number
        if (iv in vvmap) locmap.push (vvmap [iv]);
      }
      if (locmap.length) {            // abc voice number of staff stf
        part.push (locmap);
        clef = stf in this.clefMap ? this.clefMap [stf] : 'treble'; // {xml staff number -> clef}
        for (i = 0; i < locmap.length; ++i) {
          iv = locmap [i];
          abcOut.clefs [iv] = clef;
        }
      }
    }
    this.gStfMap.push (part);
  }
  Parser.prototype.addMidiMap = function (ip, vvmap) {    // map abc voices to midi settings
    var instr = this.instMid [ip];              // get the midi settings for this part
    var defInstr, ks = Object.keys (instr);
    if (ks.length)  defInstr = instr [ks [0]];  // default settings = first instrument
    else            defInstr = this.midDflt;    // no instruments defined
    var xs = [], v, vabc, id, i, midi, ks, ds, o = this;    // problematic scope rules in javascript
    for (v in vvmap) {                          // xml voice num, abc voice num
      ks = Object.keys (this.drumNotes).sort().filter (function (x) { return x.split (';')[0] == v; }); // key == 'voice;abcnote'
      ds = ks.map (function (k) {             // map perc notes
        return { nt: k.split (';')[1], step: o.drumNotes [k][0], midi: o.drumNotes [k][1], nhd: o.drumNotes [k][2] };
      });
      vabc = vvmap [v];
      id = this.vceInst [v] || '';            // get the instrument-id for part with multiple instruments
      if (id in instr)                        // id is defined as midi-instrument in part-list
        xs.push ([vabc, instr [id].concat (ds)]);   // get midi settings for id, append drummap
      else    xs.push ([vabc, defInstr.concat (ds)]);     // only one instrument for this part
    }
    xs.sort (function (a, b) { return a[0] - b[0]; });  // put abc voices in order
    for (i = 0; i < xs.length; ++i) { vabc = xs [i][0]; midi = xs [i][1]; this.midiMap.push (midi); }
  }
  Parser.prototype.parse = function (xmltree) {
    var vvmapAll = {};              // collect xml->abc voice maps (vvmap) of all parts
    var $e = $(xmltree);            // xmltree should be a DOM-tree
    this.mkTitle ($e);
    this.doDefaults ($e);
    partlist = this.doPartList ($e);
    var parts = $e.find ('part');
    for (var ip = 0; ip < parts.length; ++ip) {
      var $p = parts.eq (ip);
      var $maten = $p.find ('measure');
      this.locStaffMap ($p, $maten);  // {voice -> staff} for this part
      this.drumNotes = {};        // 'xml_voice;abc_note' -> (midi note, note head)
      this.clefOct = {};          // xml staff number -> current clef-octave-change
      this.msc.initVoices (1);    // create all voices
      var aantalHerhaald = 0;     // keep track of number of repititions
      var herhaalMaat = 0;        // target measure of the repitition
      this.msr = new Measure (ip);    // various measure data
      while (this.msr.ixm < $maten.length) {
        var $maat = $maten.eq (this.msr.ixm);
        var herhaal = 0, lbrk = '';
        this.msr.reset ();
        this.curalts = {};      // passing accidentals are reset each measure
        var $es = $maat.children ();
        for (var i = 0; i < $es.length; i++) {
          var $e = $es.eq (i);    // jquery object
          var e = $e [0];         // same, but dom object
          switch (e.nodeName) {
            case 'note':        this.doNote ($e); break;
            case 'attributes':  this.doAttr ($e); break;
            case 'direction':   this.doDirection ($e, i, $es); break;
            case 'sound':       this.doDirection ($maat, i, $es); break; // sound element directly in measure!
            case 'harmony':     this.doHarmony ($e, i, $es); break;
            case 'barline': herhaal = this.doBarline ($e); break;
            case 'backup':
              var dt = parseInt ($e.find ('duration').text ());
              this.msc.incTime (-dt);
              break;
            case 'forward':
              var dt = parseInt ($e.find ('duration').text ());
              this.msc.incTime (dt);
              break;
            case 'print': lbrk = this.doPrint ($e); break;
          }
        }
        this.msc.addBar (lbrk, this.msr);
        if (herhaal == 1) {
          herhaalMaat = this.msr.ixm;
          this.msr.ixm += 1;
        } else if (herhaal == 2) {
          if (aantalHerhaald < 1) {   // jump
            this.msr.ixm = herhaalMaat;
            aantalHerhaald += 1;
          } else {
            aantalHerhaald = 0;     // reset
            this.msr.ixm += 1;      // just continue
          }
        } else this.msr.ixm += 1;       // on to the next measure
      }
      var vvmap = this.msc.outVoices (this.msr.divs, ip);
      this.addStaffMap (vvmap);           // update global staff map
      this.addMidiMap (ip, vvmap);
      Object.assign (vvmapAll, vvmap);
    }
    if (Object.keys (vvmapAll).length) {
      abcOut.mkHeader (this.gStfMap, partlist, this.midiMap);
      //~ abcOut.writeall ()
    } else infof ('nothing written, %s has no notes ...', [abcOut.fnmext]);
  }

  vertaal = function (xmltree, options_parm) {   // publish in the global name space
    var fnm = '', pad = '', X = 0;          // fnm, pad are not used anywhere ...
    var options = { 'u':0, 'b':0, 'n':0,    // unfold repeats (1), bars per line, chars per line
      'c':0, 'v':0, 'd':0,    // credit text filter level (0-6), no volta on higher voice numbers (1), denominator unit length (L:)
      'm':0, 'x':0, 't':0,    // no midi, minimal midi, all midi output (0,1,2), no line breaks (1), clef dependent step value (1)
      'v1':0, 'noped':0,      // all directions to first voice of staff (1), no pedal directions (1)
      'p':'f' };              // page format: scale (1.0), width, left- and right margin in cm
    for (var opt in options_parm) options [opt] = options_parm [opt];
    options.p = options.p ? options.p.split (',') : []          // [] | [string]
    abcOut = new ABCoutput (fnm + '.abc', pad, X, options); // create global ABC output object
    var psr = new Parser (options); // xml parser
    try {
      psr.parse (xmltree);        // parse xmldoc and write abc to <fnm>.abc
    } catch (err) {
      infof ('** exception occurred: %s', [err]);
    }
    return [abcOut.outlist.join (''), abcOut.infolist.join ('\n')];
  }
}) ();