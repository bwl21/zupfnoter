//~ Copyright (C) 2014: W.G. Vree
//~ This program is free software; you can redistribute it and/or modify it under the terms of the
//~ GNU General Public License as published by the Free Software Foundation; either version 2 of
//~ the License, or (at your option) any later version.
//~ This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
//~ without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
//~ See the GNU General Public License for more details. <http://www.gnu.org/licenses/gpl.html>.
function ZnXml2Abc() {
    function repstr(b, a) {
        return Array(b + 1).join(a)
    }

    function reparr(b, a) {
        for (var c = []; b;)c.push(a), --b;
        return c
    }

    function dict(b, a) {
        for (var c = 0, d = {}; c < b.length; ++c)d[b[c]] = a[c];
        return d
    }

    function format(b, a) {
        var c = b.split(/%[ds]/);
        c.length > a.length && a.push("");
        return a.map(function (a, b) {
            return c[b] + a
        }).join("")
    }

    function infof(b, a) {
        abcOut.info(format(b, a))
    }

    function endswith(b, a) {
        return -1 !== b.indexOf(a, b.length - a.length)
    }

    function keyints(b) {
        return Object.keys(b).map(function (a) {
            return parseInt(a)
        })
    }

    var max_int = Math.pow(2, 53);

    function sortitems(b, a) {
        var c = [], d;
        for (d = 0; d < b.length; d++)c.push([d, b[d]]);
        c.sort(a ? function (a, b) {
            return a[0] - b[0]
        } : function (a, b) {
            return a[1] - b[1] || b[0] - a[0]
        });
        return c
    }

    note_ornamentation_map = {
        "ornaments>trill-mark": "T",
        "ornaments>mordent": "M",
        "ornaments>inverted-mordent": "P",
        "ornaments>turn": "!turn!",
        "ornaments>inverted-turn": "!invertedturn!",
        "ornaments>tremolo": "!///!",
        "technical>up-bow": "u",
        "technical>down-bow": "v",
        "technical>harmonic": "!open!",
        "technical>open-string": "!open!",
        "technical>stopped": "!plus!",
        "articulations>accent": "!>!",
        "articulations>strong-accent": "!>!",
        "articulations>staccato": ".",
        "articulations>staccatissimo": "!wedge!",
        fermata: "!fermata!",
        arpeggiate: "!arpeggio!",
        "articulations>tenuto": "!tenuto!",
        "articulations>staccatissimo": "!wedge!",
        "articulations>spiccato": "!wedge!",
        "articulations>breath-mark": "!breath!",
        "articulations>detached-legato": "!tenuto!."
    };
    dynamics_map = {
        p: "!p!",
        pp: "!pp!",
        ppp: "!ppp!",
        f: "!f!",
        ff: "!ff!",
        fff: "!fff!",
        mp: "!mp!",
        mf: "!mf!",
        sfz: "!sfz!"
    };
    var abcOut, xml2abc_VERSION = 60;

    function Measure(b) {
        this.reset();
        this.ixp = b;
        this.divs = this.mdur = this.ixm = 0
    }

    Measure.prototype.reset = function () {
        this.lline = this.attr = "";
        this.rline = "|";
        this.lnum = ""
    };
    function Note(b, a) {
        this.tijd = 0;
        this.dur = b;
        this.fact = null;
        this.tup = [""];
        this.tupabc = "";
        this.grace = this.beam = 0;
        this.after = this.before = "";
        this.ns = a ? [a] : [];
        this.lyrs = {};
        this.pos = 0
    }

    function Elem(b) {
        this.tijd = 0;
        this.str = b;
        this.pos = 0
    }

    function Counter() {
    }

    Counter.prototype.inc = function (b, a) {
        this.counters[b][a] = (this.counters[b][a] || 0) + 1
    };
    Counter.prototype.clear = function (b) {
        b = Object.keys(b);
        var a = reparr(b.length, 0);
        this.counters = {note: dict(b, a), nopr: dict(b, a), nopt: dict(b, a)}
    };
    Counter.prototype.getv = function (b, a) {
        return this.counters[b][a]
    };
    Counter.prototype.prcnt = function (b) {
        for (var a in this.counters.note)0 != this.getv("nopr", a) && infof("part %d, voice %d has %d skipped non printable notes", [b, a, this.getv("nopr", a)]), 0 != this.getv("nopt", a) && infof("part %d, voice %d has %d notes without pitch", [b, a, this.getv("nopt", a)]), 0 == this.getv("note", a) && infof("part %d, skipped empty voice %d", [b, a])
    };
    function Music(b) {
        this.maxtime = this.tijd = 0;
        this.gMaten = [];
        this.gLyrics = [];
        this.vnums = {};
        this.cnt = new Counter;
        this.vceCnt = 1;
        this.lastnote = null;
        this.bpl = b.b;
        this.cpl = b.n;
        this.repbra = 0;
        this.nvlt = b.v
    }

    Music.prototype.initVoices = function (b) {
        this.vtimes = {};
        this.voices = {};
        this.lyrics = {};
        for (var a in this.vnums)this.vtimes[a] = 0, this.voices[a] = [], this.lyrics[a] = [];
        b && this.cnt.clear(this.vnums)
    };
    Music.prototype.incTime = function (b) {
        this.tijd += b;
        this.tijd > this.maxtime && (this.maxtime = this.tijd)
    };
    Music.prototype.appendElemCv = function (b, a) {
        for (var c in b)this.appendElem(c, a)
    };
    Music.prototype.insertElem = function (b, a) {
        var c = new Elem(a);
        c.tijd = 0;
        this.voices[b].unshift(c)
    };
    Music.prototype.appendObj = function (b, a, c) {
        a.tijd = this.tijd;
        this.voices[b].push(a);
        this.incTime(c);
        this.tijd > this.vtimes[b] && (this.vtimes[b] = this.tijd)
    };
    Music.prototype.appendElem = function (b, a) {
        this.appendObj(b, new Elem(a), 0)
    };
    Music.prototype.appendNote = function (b, a, c) {
        a.ns.push(c);
        this.appendObj(b, a, parseInt(a.dur));
        "z" != c && (this.lastnote = a, this.cnt.inc("note", b), a.grace || this.lyrics[b].push(a.lyrs))
    };
    Music.prototype.getLastRec = function (b) {
        return this.gMaten.length ? (b = this.gMaten[this.gMaten.length - 1][b], b[b.length - 1]) : null
    };
    Music.prototype.getLastMelis = function (b, a) {
        if (this.gLyrics.length) {
            var c = this.gLyrics[this.gLyrics.length - 1][b];
            if (a in c)return c[a][1]
        }
        return 0
    };
    Music.prototype.addChord = function (b) {
        this.lastnote.ns.push(b)
    };
    Music.prototype.addBar = function (b, a) {
        a.mdur && this.maxtime > a.mdur && infof("measure %d in part %d longer than metre", [a.ixm + 1, a.ixp + 1]);
        this.tijd = this.maxtime;
        for (var c in this.vnums) {
            if (a.lline || a.lnum) {
                var d = this.getLastRec(c);
                if (d) {
                    var f = d.str;
                    a.lline && (f = (f + a.lline).replace(/:\|:/g, "::").replace(/\|\|/g, "|"));
                    3 == this.nvlt ? a.ixp + c == Math.min.apply(null, this.vnums) && (f += a.lnum) : a.lnum && (f += a.lnum, this.repbra = 1);
                    d.str = f
                } else a.lline && this.insertElem(c, "|:")
            }
            b && (d = this.getLastRec(c)) && (d.str += b);
            a.attr &&
            this.insertElem(c, "" + a.attr);
            this.appendElem(c, " " + a.rline);
            this.voices[c] = sortMeasure(this.voices[c], a);
            for (var d = this.lyrics[c], f = {}, e = d.reduce(function (a, b) {
                return a.concat(keyints(b))
            }, []), g = Math.max.apply(null, e.concat([0])); 0 < g; --g) {
                var e = d.map(function (a) {
                    return a[g] || ""
                }), l = this.getLastMelis(c, g);
                f[g] = abcLyr(e, l)
            }
            this.lyrics[c] = f;
            mkBroken(this.voices[c])
        }
        this.gMaten.push(this.voices);
        this.gLyrics.push(this.lyrics);
        this.tijd = this.maxtime = 0;
        this.initVoices()
    };
    Music.prototype.outVoices = function (b, a) {
        var c, d, f, e, g, l, h, k, m;
        g = {};
        h = Math.min.apply(null, keyints(this.vnums));
        for (k in this.vnums)if (0 != this.cnt.getv("note", k)) {
            l = abcOut.denL ? abcOut.denL : compUnitLength(k, this.gMaten, b);
            abcOut.cmpL.push(l);
            var n = [], p = {};
            for (m = 0; m < this.gMaten.length; ++m)for (f in e = this.gMaten[m][k], n.push(outVoice(e, b, m, a, l)), checkMelismas(this.gLyrics, this.gMaten, m, k), c = this.gLyrics[m][k], c)if (e = c[f], e = e[0], f in p) {
                for (; p[f].length < m;)p[f].push("");
                p[f].push(e)
            } else p[f] = reparr(m,
                "").concat([e]);
            for (f in p)e = p[f], l = n.length - e.length, p[f] = e.concat(reparr(l, ""));
            abcOut.add("V:" + this.vceCnt);
            this.repbra && (1 == this.nvlt && 1 < this.vceCnt && abcOut.add("I:repbra 0"), 2 == this.nvlt && k > h && abcOut.add("I:repbra 0"));
            0 < this.cpl ? this.bpl = 0 : 0 == this.bpl && (this.cpl = 100);
            for (l = 0; n.length;) {
                m = 1;
                for (e = n[0]; m < n.length && !(0 < this.cpl && e.length + n[m].length >= this.cpl) && !(0 < this.bpl && m >= this.bpl);)e += n[m], m += 1;
                l += m;
                abcOut.add(e + " %" + l);
                n.splice(0, m);
                c = sortitems(p, 1);
                for (d = 0; d < c.length; d++)e = c[d], f = e[0], e = e[1], abcOut.add("w: " +
                    e.slice(0, m).join("|") + "|"), e.splice(0, m)
            }
            g[k] = this.vceCnt;
            this.vceCnt += 1
        }
        this.gMaten = [];
        this.gLyrics = [];
        this.cnt.prcnt(a + 1);
        return g
    };
    function ABCoutput(b, a, c, d) {
        this.fnmext = b;
        this.outlist = [];
        this.infolist = [];
        this.title = "T:Title";
        this.key = "none";
        this.clefs = {};
        this.mtr = "none";
        this.tempo = 0;
        this.pad = a;
        this.X = c + 1;
        this.denL = d.d;
        this.volpan = d.m;
        this.cmpL = [];
        this.rightmargin = this.leftmargin = this.pagewidth = this.scale = "";
        4 == d.p.length && (this.scale = "" != d.p[0] ? parseFloat(d.p[0]) : "", this.pagewidth = "" != d.p[1] ? parseFloat(d.p[1]) : "", this.leftmargin = "" != d.p[2] ? parseFloat(d.p[2]) : "", this.rightmargin = "" != d.p[3] ? parseFloat(d.p[3]) : "")
    }

    ABCoutput.prototype.add = function (b) {
        this.outlist.push(b + "\n")
    };
    ABCoutput.prototype.info = function (b, a) {
        this.infolist.push(("undefined" == typeof a || a ? "-- " : "") + b)
    };
    ABCoutput.prototype.mkHeader = function (b, a, c) {
        var d = [], f = [], e, g, l, h, k, m;
        h = b.slice();
        for (m = 0; m < a.length; m++) {
            e = a[m];
            try {
                prgroupelem(e, ["", ""], "", b, d, f)
            } catch (n) {
                infof("lousy musicxml: error in part-list", [])
            }
        }
        a = f.join(" ");
        b = {};
        for (m = 0; m < h.length; m++)g = h[m], e = d[m], l = e[1], e = e[2], 0 != g.length && (g = g[0][0], l = l.replace(/\n/g, "\\n").replace(/\.:/g, ".").replace(/^:|:$/g, ""), e = e.replace(/\n/g, "\\n").replace(/\.:/g, ".").replace(/^:|:$/g, ""), b[g] = (l ? 'nm="' + l + '"' : "") + (e ? ' snm="' + e + '"' : ""));
        d = [format("X:%d\n%s\n", [this.X, this.title])];
        "" !== this.scale && d.push("%%scale " + this.scale + "\n");
        "" !== this.pagewidth && d.push("%%pagewidth " + this.pagewidth + "cm\n");
        "" !== this.leftmargin && d.push("%%leftmargin " + this.leftmargin + "cm\n");
        "" !== this.rightmargin && d.push("%%rightmargin " + this.rightmargin + "cm\n");
        a && 1 < f.length && d.push("%%score " + a + "\n");
        h = this.tempo ? "Q:1/4=" + this.tempo + "\n" : "";
        f = [];
        for (m = 0; m < this.cmpL.length; m++)e = this.cmpL[m], f[e] = (f[e] || 0) + 1;
        f = sortitems(f);
        f = f[f.length - 1][0];
        f = this.denL ? this.denL : f;
        d.push(format("L:1/%d\n%sM:%s\n", [f, h, this.mtr]));
        d.push(format("I:linebreak $\nK:%s\n", [this.key]));
        for (k in this.clefs) {
            e = c[k - 1];
            m = e[0];
            a = e[1];
            l = e[1];
            g = e[3];
            h = e.slice(4);
            e = this.clefs[k];
            h.length && 0 > e.indexOf("perc") && (e = (e + " map=perc").trim());
            d.push(format("V:%d %s %s\n", [k, e, b[k] || ""]));
            1 < this.volpan ? (0 < m && m != k && d.push("%%MIDI channel " + m + "\n"), 0 < a && d.push("%%MIDI program " + (a - 1) + "\n"), 0 <= l && d.push("%%MIDI control 7 " + l + "\n"), 0 <= g && d.push("%%MIDI control 10 " + g + "\n")) : 0 < this.volpan && (h.length && 0 < m && d.push("%%MIDI channel " + m + "\n"), 0 < a && d.push("%%MIDI program " +
                (a - 1) + "\n"));
            for (m = 0; m < h.length; ++m)if (e = h[m].nt, l = h[m].step, a = h[m].midi, (g = h[m].nhd) || (g = "normal"), abcMid(e) != a || e != l)0 < this.volpan && d.push("%%MIDI drummap " + e + " " + a + "\n"), d.push("I:percmap " + e + " " + l + " " + a + " " + g + "\n");
            f != this.cmpL[k - 1] && d.push("L:1/" + this.cmpL[k - 1] + "\n")
        }
        this.outlist = d.concat(this.outlist)
    };
    function abcLyr(b, a) {
        if (!b.join(""))return ["", 0];
        for (var c = [], d = 0; d < b.length; ++d) {
            var f = b[d];
            "" == f ? f = a ? "_" : "*" : endswith(f, "_") && !endswith(f, "\\_") ? (f = f.replace("_", ""), a = 1) : a = 0;
            c.push(f)
        }
        return [c.join(" "), a]
    }

    function simplify(b, a) {
        for (var c = b, d = a, f; a;)f = b % a, b = a, a = f;
        return [c / b, d / b]
    }

    function abcdur(b, a, c) {
        if (0 == b.dur)return "";
        var d;
        d = simplify(c * b.dur, 4 * a);
        a = d[0];
        c = d[1];
        b.fact && (d = b.fact[0], b = b.fact[1], d = simplify(a * d, c * b), a = d[0], c = d[1]);
        64 < c && (d = simplify(Math.round(64 * a / c) || 1, 64), infof("denominator too small: %d/%d rounded to %d/%d", [a, c, d[0], d[1]]), a = d[0], c = d[1]);
        return 1 == a ? 1 == c ? "" : 2 == c ? "/" : "/" + c : 1 == c ? "" + a : a + "/" + c
    }

    function abcMid(b) {
        var a = b.match(/([_^]*)([A-Ga-g])([',]*)/);
        if (!a)return -1;
        b = a[1];
        var c = a[2], a = a[3], d;
        d = c.toUpperCase();
        c = 60 + [0, 2, 4, 5, 7, 9, 11]["CDEFGAB".indexOf(d)] + (d != c ? 12 : 0);
        b && (c += ("^" == b[0] ? 1 : -1) * b.length);
        a && (c += ("'" == a[0] ? 12 : -12) * a.length);
        return c
    }

    function staffStep(b, a, c, d) {
        var f;
        f = 0;
        0 <= c.indexOf("stafflines=1") && (f += 4);
        !d && 0 <= c.indexOf("bass") && (f += 12);
        f && (c = "CDEFGAB".split(""), f = c.indexOf(b) + f, b = c[f % 7], a += Math.floor(f / 7));
        4 < a && (b = b.toLowerCase());
        5 < a && (b += repstr(a - 5, "'"));
        4 > a && (b += repstr(4 - a, ","));
        return b
    }

    function setKey(b, a) {
        var c, d, f, e;
        c = "FCGDAEB".split("");
        d = "Cb Gb Db Ab Eb Bb F C G D A E B F# C#".split(" ");
        f = "Ab Eb Bb F C G D A E B F# C# G# D# A#".split(" ");
        e = "";
        "major" == a && (e = d[7 + b]);
        "minor" == a && (e = f[7 + b] + "min");
        c = 0 <= b ? dict(c.slice(0, b), reparr(b, 1)) : dict(c.slice(b), reparr(-b, -1));
        return [e, c]
    }

    function insTup(b, a, c) {
        var d = 0, f, e, g = a[b];
        e = g.tup.indexOf("start");
        -1 < e && g.tup.splice(e, 1);
        var l = b;
        for (c = [g.fact[0] / c[0], g.fact[1] / c[1]]; b < a.length;) {
            g = a[b];
            if (!(g instanceof Elem || g.grace)) {
                -1 < g.tup.indexOf("start") ? (e = insTup(b, a, c), b = e[0], e = e[1], d += e) : g.fact && (d += 1);
                e = g.tup.indexOf("stop");
                if (-1 < e) {
                    g.tup.splice(e, 1);
                    break
                }
                if (!g.fact) {
                    b = f;
                    break
                }
                f = b
            }
            b += 1
        }
        f = [c[0], c[1], d];
        f = "3,2,3" == f.toString() ? "(3" : format("(%d:%d:%d", f);
        a[l].tupabc = f + a[l].tupabc;
        return [b, d]
    }

    function mkBroken(b) {
        b = b.filter(function (a) {
            return a instanceof Note
        });
        for (var a = 0; a < b.length - 1;) {
            var c = b[a], d = b[a + 1];
            !c.fact && !d.fact && 0 < c.dur && d.beam && (3 * c.dur == d.dur ? (d.dur = 2 * d.dur / 3, c.dur *= 2, c.after = "<" + c.after, a += 1) : 3 * d.dur == c.dur && (c.dur = 2 * c.dur / 3, d.dur *= 2, c.after = ">" + c.after, a += 1));
            a += 1
        }
    }

    function outVoice(b, a, c, d, f) {
        for (d = 0; d < b.length; d++)c = b[d], c instanceof Note && c.fact && (c = insTup(d, b, [1, 1]), d = c[0]), d += 1;
        d = [];
        for (var e, g = 0; g < b.length; ++g) {
            c = b[g];
            if (c instanceof Note) {
                var l = abcdur(c, a, f), h = 1 < c.ns.length;
                e = c.ns.filter(function (a) {
                    return endswith(a, "-")
                });
                e = e.map(function (a) {
                    return a.slice(0, -1)
                });
                var k = "";
                h && e.length == c.ns.length && (c.ns = e, k = "-");
                e = c.tupabc + c.before;
                h && (e += "[");
                e += c.ns.join("");
                h && (e += "]" + k);
                endswith(e, "-") && (e = e.slice(0, -1), k = "-");
                e += l + k;
                e += c.after;
                c = c.beam
            } else e = c.str,
                c = 1;
            c ? d.push(e) : d.push(" " + e)
        }
        return d.join("")
    }

    function sortMeasure(b, a) {
        b.map(function (a, b) {
            a.pos = b
        });
        b.sort(function (a, b) {
            return a.tijd - b.tijd || a.pos - b.pos
        });
        for (var c = 0, d = [], f = 0; f < b.length; ++f) {
            var e = b[f];
            e.tijd > c && d.push(new Note(e.tijd - c, "x"));
            if (e instanceof Elem)e.tijd < c && (e.tijd = c), d.push(e), c = e.tijd; else {
                if (e.tijd < c) {
                    if ("z" == e.ns[0])continue;
                    var g = d[d.length - 1];
                    if (g.tijd <= e.tijd)if ("z" == g.ns[0])g.dur = e.tijd - g.tijd, 0 == g.dur && pop(d), infof("overlap in part %d, measure %d: rest shortened", [a.ixp + 1, a.ixm + 1]); else {
                        g.ns = g.ns.concat(e.ns);
                        infof("overlap in part %d, measure %d: added chord",
                            [a.ixp + 1, a.ixm + 1]);
                        e.dur = e.tijd + e.dur - c;
                        if (0 >= e.dur)continue;
                        e.tijd = c
                    } else {
                        infof("overlapping notes in one voice! part %d, measure %d, note %s discarded", [a.ixp + 1, a.ixm + 1, e instanceof Note ? e.ns : e.str]);
                        continue
                    }
                }
                d.push(e);
                c = e.tijd + e.dur
            }
        }
        0 == c && infof("empty measure in part %d, measure %d, it should contain at least a rest to advance the time!", [a.ixp + 1, a.ixm + 1]);
        return d
    }

    function getPartlist(b) {
        function a(a) {
            a = format('<part-group number="%d" type="%s"></part-group>', [a, "stop"]);
            a = $.parseXML(a).firstChild;
            return $(a)
        }

        var c, d, f, e, g, l, h;
        c = [];
        d = [];
        l = b.children();
        for (g = 0; g < l.length; g++)b = $(l[g]), "part-group" == b[0].nodeName ? (f = b.attr("number"), e = b.attr("type"), h = d.indexOf(f), "start" == e ? -1 < h ? (c.push(a(f)), c.push(b)) : (c.push(b), d.push(f)) : -1 < h && (d.splice(h, 1), c.push(b))) : c.push(b);
        for (g = d.length - 1; 0 <= g; --g)f = d[g], c.push(a(f));
        return c
    }

    function parseParts(b, a, c) {
        var d, f, e, g;
        if (0 == b.length)return [[], []];
        d = b.shift();
        if ("part-group" == d[0].nodeName) {
            f = d.attr("number");
            e = d.attr("type");
            if ("start" == e) {
                e = [];
                for (g in{
                    "group-symbol": 0,
                    "group-barline": 0,
                    "group-name": 0,
                    "group-abbreviation": 0
                })e.push(d.find(g).text() || "");
                a[f] = e;
                c.push(f);
                g = parseParts(b, a, c);
                b = g[0];
                d = g[1];
                g = parseParts(d, a, c);
                a = g[0];
                c = g[1];
                return [[b].concat(a), c]
            }
            c = c.pop();
            b.length && "stop" == b[0].attr("type") && f != c && (g = a[c], a[c] = a[f], a[f] = g);
            a = a[f];
            return [[a], b]
        }
        g = parseParts(b,
            a, c);
        a = g[0];
        b = g[1];
        return [[["name_tuple", d.find("part-name").text() || "", d.find("part-abbreviation").text() || ""]].concat(a), b]
    }

    function bracePart(b) {
        var a, c, d, f;
        if (0 == b.length)return [];
        a = [];
        for (d = 0; d < b.length; d++) {
            c = b[d];
            if (1 == c.length)a.push("" + c[0]); else {
                a.push("(");
                for (f = 0; f < c.length; f++)a.push("" + c[f]);
                a.push(")")
            }
            a.push("|")
        }
        a.splice(-1, 1);
        1 < b.length && (a = ["{"].concat(a).concat(["}"]));
        return a
    }

    function prgroupelem(b, a, c, d, f, e) {
        "name_tuple" == b[0] ? (c = d.shift(), a[0] && (b[1] = a[0] + ":" + b[1], b[2] = a[1] + ":" + b[2]), f.push(b), e.push.apply(e, bracePart(c))) : 2 == b.length ? (c = d.shift(), a = ["name_tuple", "", ""], a[1] = b[0][1] + ":" + b[1][2], a[2] = b[0][2] + ":" + b[1][3], f.push(a), e.push.apply(e, bracePart(c))) : prgrouplist(b, c, d, f, e)
    }

    function prgrouplist(b, a, c, d, f) {
        var e, g, l, h;
        h = b[b.length - 1];
        e = h[0];
        g = h[1];
        l = h[2];
        h = h[3];
        g = "yes" == g || a;
        f.push("brace" == e ? "{" : "[");
        for (a = 0; a < b.length - 1; ++a)prgroupelem(b[a], [l, h], g, c, d, f), g && f.push("|");
        g && f.splice(-1, 1);
        f.push("brace" == e ? "}" : "]")
    }

    function compUnitLength(b, a, c) {
        for (var d = 0, f = max_int, e, g, l = [4, 8, 16]; l.length;) {
            var h = l.shift(), k = 0;
            for (e = 0; e < a.length; e++) {
                var m = a[e][b];
                for (g = 0; g < m.length; g++) {
                    var n = m[g];
                    n instanceof Elem || 0 == n.dur || (k += abcdur(n, c, h).length)
                }
            }
            k < f && (d = h, f = k)
        }
        return d
    }

    function doSyllable(b) {
        for (var a = "", c = b.children(), d = 0; d < c.length; ++d) {
            var f = c[d];
            switch (f.nodeName) {
                case "elision":
                    a += "~";
                    break;
                case "text":
                    a += $(f).text().replace(/_/g, "\\_").replace(/-/g, "\\-").replace(/ /g, "~")
            }
        }
        if (!a)return a;
        c = b.find("syllabic").text();
        if ("begin" == c || "middle" == c)a += "-";
        b.find("extend").length && (a += "_");
        return a
    }

    function checkMelismas(b, a, c, d) {
        if (0 != c) {
            a = a[c][d];
            var f = b[c][d];
            b = b[c - 1][d];
            for (var e in b)c = b[e][1], e in f || !c || (c = getMelisma(a)) && (f[e] = [c, 0])
        }
    }

    function getMelisma(b) {
        var a = [], c;
        for (c = 0; c < b.length; c++) {
            var d = b[c];
            if (d instanceof Note && !d.grace) {
                if ("z" == d.ns[0])break;
                a.push("_")
            }
        }
        return a.join(" ")
    }

    function Parser(b) {
        this.slurBuf = {};
        this.wedge_type = "";
        this.ingrace = 0;
        this.msc = new Music(b);
        this.unfold = b.u;
        this.ctf = b.c;
        this.gStfMap = [];
        this.midiMap = [];
        this.drumInst = {};
        this.drumNotes = {};
        this.instMid = [];
        this.midDflt = [-1, -1, -1, -91];
        this.msralts = {};
        this.curalts = {};
        this.stfMap = {};
        this.clefMap = {};
        this.curClef = {};
        this.clefOct = {};
        this.curStf = {};
        this.nolbrk = b.x;
        this.doPageFmt = 1 == b.p.length;
        this.tstep = b.t
    }

    Parser.prototype.matchSlur = function (b, a, c, d, f, e) {
        if (-1 != ["start", "stop"].indexOf(b))if (a || (a = "1"), a in this.slurBuf) {
            var g = this.slurBuf[a], l = g[0], h = g[1], k = g[2], g = g[3];
            b != l ? (c != h || "start" != l || g && e || (k.before = "(" + k.before, d.after += ")"), delete this.slurBuf[a]) : (infof("double slur numbers %s-%s in part %d, measure %d, voice %d note %s, first discarded", [b, a, this.msr.ixp + 1, this.msr.ixm + 1, c, d.ns]), this.slurBuf[a] = [b, c, d, f])
        } else this.slurBuf[a] = [b, c, d, f]
    };
    Parser.prototype.doNotations = function (b, a) {
        var c = Object.keys(note_ornamentation_map).sort(), d;
        for (d = 0; d < c.length; d++) {
            var f = c[d], e = note_ornamentation_map[f];
            a.find(f).length && (b.before += e)
        }
        c = a.find("technical>fingering");
        c.length && (b.before += "!" + c.text() + "!");
        c = a.find("ornaments>wavy-line");
        if (c.length)switch (c.attr("type")) {
            case "start":
                b.before = "!trill(!" + b.before;
                break;
            case "stop":
                b.after += "!trill)!"
        }
    };
    Parser.prototype.ntAbc = function (b, a, c, d) {
        var f = {
            "double-flat": -2,
            "flat-flat": -2,
            flat: -1,
            natural: 0,
            sharp: 1,
            "sharp-sharp": 2,
            "double-sharp": 2
        };
        a += this.clefOct[this.curStf[d]] || 0;
        var e = b;
        4 < a && (e = b.toLowerCase());
        5 < a && (e += repstr(a - 5, "'"));
        4 > a && (e += repstr(4 - a, ","));
        a = c.find("accidental").text();
        var g = c.find("pitch>alter").text();
        !g && this.msralts[b] && (g = 0);
        var l = e + "#" + d;
        if ("" === a && "" === g)return e;
        if ("" != a)g = f[a]; else {
            g = parseInt(g);
            if (l in this.curalts) {
                if (g == this.curalts[l])return e
            } else if (g == (this.msralts[b] ||
                0))return e;
            if (c.find("tie").map(function () {
                    return $(this).attr("type")
                }).get().some(function (a) {
                    return "stop" == a
                }))return e;
            infof("accidental %d added in part %d, measure %d, voice %d note %s", [g, this.msr.ixp + 1, this.msr.ixm + 1, d + 1, e])
        }
        this.curalts[l] = g;
        return e = ["__", "_", "=", "^", "^^"][g + 2] + e
    };
    Parser.prototype.doNote = function (b) {
        var a = new Note(0, null), c = parseInt(b.find("voice").text() || "1");
        this.isSib && (c += 100 * (b.find("staff").text() || 1));
        var d = 0 < b.find("chord").length, f = b.find("pitch>step").text() || b.find("unpitched>display-step").text(), e = b.find("pitch>octave").text() || b.find("unpitched>display-octave").text(), g = 0 < b.find("rest").length, l = b.find("time-modification>actual-notes").text();
        if (l) {
            var h = b.find("time-modification>normal-notes").text();
            a.fact = [parseInt(l), parseInt(h)]
        }
        a.tup = b.find("notations>tuplet").map(function () {
            return $(this).attr("type")
        }).get();
        h = b.find("duration").text();
        l = b.find("grace");
        a.grace = 0 < l.length;
        a.before = "";
        a.after = "";
        a.grace && !this.ingrace && (this.ingrace = 1, a.before = "{", "yes" == l.attr("slash") && (a.before += "/"));
        if (l = !a.grace && this.ingrace)this.ingrace = 0, this.msc.lastnote.after += "}";
        if (g || "no" != b.attr("print-object")) {
            if (!h || a.grace)h = 0;
            a.dur = parseInt(h);
            g || f && e || (this.msc.cnt.inc("nopt", c), e = 5, f = "E");
            h = b.find("notations");
            h.length && this.doNotations(a, h);
            g = g ? "z" : this.ntAbc(f, parseInt(e), b, c);
            if (b.find("unpitched").length) {
                var h =
                    this.curClef[this.curStf[c]], f = staffStep(f, parseInt(e), h, this.tstep), e = b.find("instrument"), e = e.length ? e.attr("id") : "dummyId", e = this.drumInst[e] || abcMid(g), h = b.find("notehead"), k = h.text().replace(" ", "-");
                "yes" == h.attr("filled") && (k += "+");
                "x" == k && (g = "^" + g.replace(/\^/g, "").replace(/_/g, ""));
                if ("circle-x" == k || "diamond" == k)g = "_" + g.replace(/\^/g, "").replace(/_/g, "");
                this.drumNotes[c + ";" + g] = [f, e, k]
            }
            f = b.find("tie").map(function () {
                return $(this).attr("type")
            }).get();
            -1 < f.indexOf("start") && (g += "-");
            f = b.find("beam").map(function () {
                return $(this).text()
            }).get();
            a.beam = -1 < f.indexOf("continue") || -1 < f.indexOf("end") || a.grace;
            f = b.find("lyric");
            for (e = h = 0; e < f.length; ++e) {
                var k = $(f[e]), m = parseInt((k.attr("number") || "1").replace(/^.*verse/, ""));
                0 == m ? m = h + 1 : h = m;
                a.lyrs[m] = doSyllable(k)
            }
            d ? this.msc.addChord(g) : (d = parseInt(b.find("staff").text() || "1"), this.curStf[c] != d && (f = d - this.curStf[c], this.curStf[c] = d, this.msc.appendElem(c, "[I:staff " + (0 < f ? "+" : "") + f + "]")), this.msc.appendNote(c, a, g));
            f = b.find("notations>slur");
            for (e = 0; e < f.length; ++e)b = $(f[e]), this.matchSlur(b.attr("type"),
                b.attr("number"), c, this.msc.lastnote, a.grace, l)
        } else this.msc.cnt.inc("nopr", c)
    };
    Parser.prototype.doAttr = function (b) {
        var a, c, d, f, e, g, l, h, k, m, n, p;
        a = {
            C1: "alto1",
            C2: "alto2",
            C3: "alto",
            C4: "tenor",
            F4: "bass",
            F3: "bass3",
            G2: "treble",
            TAB: "",
            percussion: "perc"
        };
        if (c = b.find("divisions").text())this.msr.divs = parseInt(c);
        c = parseInt(b.find("transpose>chromatic").text() || "0");
        d = b.find("key>fifths").first().text();
        f = 0 == this.msc.tijd && 0 == this.msr.ixm;
        d && (e = setKey(parseInt(d), b.find("key>mode").first().text() || "major"), d = e[0], this.msralts = e[1], f && !c && "none" == abcOut.key ? abcOut.key = d : d == abcOut.key &&
        f || (this.msr.attr += "[K:" + d + "]"));
        if (d = b.find("time>beats").text())e = b.find("time>beat-type").text(), g = d + "/" + e, f ? abcOut.mtr = g : this.msr.attr += "[M:" + g + "]", this.msr.mdur = this.msr.divs * parseInt(d) * 4 / parseInt(e);
        (d = b.find("transpose>octave-change").text() || "") && (c += 12 * parseInt(d));
        g = b.find("clef");
        for (e = 0; e < g.length; e++)if (l = $(g[e]), d = parseInt(l.attr("number") || "1"), h = l.find("sign").text(), k = "percussion" != h ? l.find("line").text() || "" : "", k = a[h + k] || "", h = l.find("clef-octave-change").text() || "0", k += {
                    "-2": "-15",
                    "-1": "-8", 1: "+8", 2: "+15"
                }[h] || "", this.clefOct[d] = -parseInt(h), c && (k += " transpose=" + c), (h = b.find("staff-details>staff-lines").text()) && (k += " stafflines=" + h), this.curClef[d] = k, f)this.clefMap[d] = k; else for (l = this.stfMap[d], p = 0; p < l.length; ++p)m = l[p], d != this.curStf[m] && (n = d - this.curStf[m], this.curStf[m] = d, h = 0 < n ? "+" : "", this.msc.appendElem(m, "[I:staff " + h + n + "]")), this.msc.appendElem(m, "[K:" + k + "]")
    };
    Parser.prototype.doDirection = function (b) {
        var a, c, d, f, e, g, l, h, k;
        d = parseInt(b.find("staff").first().text() || "1");
        d = this.stfMap[d][0];
        a = b.attr("placement");
        c = b.find("sound");
        if (c.length) {
            if (l = c.find("midi-instrument")) {
                f = c.find("midi-instrument>midi-program").text();
                h = c.find("midi-instrument>midi-channel").text();
                for (k in this.vceInst)this.vceInst[k] == l.attr("id") && (d = k);
                (k = (f ? f - 1 : h) + "") && 0 < abcOut.volpan && this.msc.appendElem(d, "[I:MIDI= " + (f ? "program" : "channel") + " " + k + "]")
            }
            if (c = c.attr("tempo"))c = -1 <
            c.indexOf(".") ? parseFloat(c).toFixed(2) : parseInt(c), 0 == this.msc.tijd && 0 == this.msr.ixm ? abcOut.tempo = c : this.msc.appendElem(d, "[Q:1/4=" + c + "]")
        }
        f = b.children("direction-type");
        if (f.length) {
            c = f.find("wedge");
            if (c.length) {
                switch (c.attr("type")) {
                    case "crescendo":
                        e = "!<(!";
                        this.wedge_type = "<";
                        break;
                    case "diminuendo":
                        e = "!>(!";
                        this.wedge_type = ">";
                        break;
                    case "stop":
                        e = "<" == this.wedge_type ? "!<)!" : "!>)!";
                        break;
                    default:
                        raise("wrong wedge type")
                }
                this.msc.appendElem(d, e)
            }
            e = f.find("words").eq(0).text();
            e.length && (a =
                "below" == a ? "_" : "^", 0 > parseInt(b.attr("default-y") || "0") && (a = "_"), e = e.replace(/"/g, '\\"').replace(/\n/g, " ").trim(), this.msc.appendElem(d, '"' + a + e + '"'));
            for (g in dynamics_map)b = dynamics_map[g], f.find("dynamics>" + g).length && this.msc.appendElem(d, b);
            f.find("coda").length && this.msc.appendElem(d, "O");
            f.find("segno").length && this.msc.appendElem(d, "S")
        }
    };
    Parser.prototype.doHarmony = function (b) {
        var a, c, d, f, e, g, l, h, k;
        a = parseInt(b.children("staff").text() || "1");
        a = this.stfMap[a][0];
        c = {major: "", minor: "m", augmented: "+", diminished: "dim", dominant: "7", "half-diminished": "m7b5"};
        d = {major: "maj", dominant: "", minor: "m", diminished: "dim", augmented: "+", suspended: "sus"};
        f = {second: "2", fourth: "4", seventh: "7", sixth: "6", ninth: "9", "11th": "11", "13th": "13"};
        e = {1: "#", 0: "", "-1": "b"};
        g = b.find("root>root-step", "").text();
        l = e[b.find("root>root-alter").text()] || "";
        h = "";
        k = b.find("kind").text();
        k in c ? k = c[k] : -1 < k.indexOf("-") ? (c = k.split("-"), k = c[0], c = c[1], k = (d[k] || "") + (f[c] || ""), 0 == k.indexOf("sus") && (h = k, k = "")) : "none" == k && (k = b.find("kind").attr("text"));
        d = b.find("degree");
        for (f = 0; f < d.length; ++f)c = $(d[f]), k += (e[c.find("degree-alter").text()] || "") + c.find("degree-value").text();
        k = k.replace("79", "9").replace("713", "13").replace("maj6", "6");
        b = b.find("bass>bass-step").text() + (e[b.find("bass>bass-alter").text()] || "");
        this.msc.appendElem(a, '"' + g + l + k + h + (b && "/" + b) + '"')
    };
    Parser.prototype.doBarline = function (b) {
        var a = b.find("repeat"), c = 0;
        a.length && (c = a.attr("direction"));
        if (this.unfold)return c ? "forward" == c ? 1 : 2 : 0;
        "right" == b.attr("location") && (a = b.find("bar-style").text(), "light-light" == a ? this.msr.rline = "||" : "light-heavy" == a && (this.msr.rline = "|]"));
        c && ("forward" == c ? this.msr.lline = ":" : this.msr.rline = ":|");
        b = b.find("ending");
        b.length && ("start" == b.attr("type") ? (b = (b.attr("number") || "1").replace(/\./g, "").replace(/ /g, ""), /^[\d,]+$/.test(b) || (b = '"' + b.trim() + '"'), this.msr.lnum =
            b) : "|" == this.msr.rline && (this.msr.rline = "||"));
        return 0
    };
    Parser.prototype.doPrint = function (b) {
        if ("yes" == b.attr("new-system") || "yes" == b.attr("new-page"))return this.nolbrk ? "" : "$"
    };
    Parser.prototype.doPartList = function (b) {
        var a, c, d, f, e, g, l, h, k, m;
        f = b.find("part-list>score-part");
        for (a = 0; a < f.length; ++a) {
            c = f[a];
            e = {};
            g = $(c).find("midi-instrument");
            for (c = 0; c < g.length; ++c) {
                l = $(g[c]);
                k = ["midi-channel", "midi-program", "volume", "pan"];
                h = [];
                for (d = 0; d < k.length; d++) {
                    m = k[d];
                    h.push(l.find(m).text() || this.midDflt[d]);
                }
                k = h[3];
                -90 <= k && 90 >= k && (k = (k + 90) / 180 * 127);
                e[l.attr("id")] = [parseInt(h[0]), parseInt(h[1]), parseFloat(h[2]), k];
                (h = l.find("midi-unpitched").text()) && (this.drumInst[l.attr("id")] = h - 1)
            }
            this.instMid.push(e)
        }
        b =
            b.find("part-list");
        h = getPartlist(b);
        return parseParts(h, {}, [])[0]
    };
    Parser.prototype.mkTitle = function (b) {
        var a, c, d = [], f = [], e = [], g, l, h, k, m;
        a = b.find("work>work-title").text();
        c = b.find("movement-title").text();
        g = b.find("identification>creator");
        for (l = 0; l < g.length; ++l)h = $(g[l]), k = h.text(), h = h.attr("type"), k && (k = k.split("\n").map(function (a) {
            return a.trim()
        }), "composer" == h ? d.push.apply(d, k) : "lyricist" != h && "transcriber" != h || f.push.apply(f, k));
        g = b.find("credit");
        for (l = 0; l < g.length; ++l) {
            k = "";
            h = $(g[l]).find("credit-words");
            for (m = 0; m < h.length; ++m)k += $(h[m]).text();
            e.push(k.replace(/\s*[\r\n]\s*/g,
                " "))
        }
        e = function (b) {
            function g(a) {
                return a && -1 < h.indexOf(a)
            }

            var k = [], h, l;
            for (l = 0; l < e.length; l++)h = e[l], 6 > b && (h && -1 < a.indexOf(h) || h && -1 < c.indexOf(h)) || 5 > b && (h && -1 < d.indexOf(h) || h && -1 < f.indexOf(h)) || 4 > b && (a && -1 < h.indexOf(a) || c && -1 < h.indexOf(c)) || 3 > b && (d.some(g) || f.some(g)) || 2 > b && /^[\d\W]*$/.test(h) || k.push(h);
            0 == b && a + c && (k = "");
            return k
        }(this.ctf);
        a && (a = "T:" + a + "\n");
        c && (a += "T:" + c + "\n");
        e.length && (a += e.map(function (a) {
                return "T:" + a
            }).join("\n") + "\n");
        d.length && (a += d.map(function (a) {
                return "C:" + a
            }).join("\n") + "\n");
        f.length && (a += f.map(function (a) {
                return "Z:" + a
            }).join("\n") + "\n");
        a && (abcOut.title = a.substr(0, a.length - 1));
        (this.isSib = 0 <= b.find("identification>encoding>software").text().indexOf("Sibelius")) && infof("Sibelius MusicXMl is unreliable", [])
    };
    Parser.prototype.doDefaults = function (b) {
        var a, c, d, f;
        this.doPageFmt && (a = b.find("defaults"), a.length && (b = a.find("scaling>millimeters").text(), c = a.find("scaling>tenths").text(), c = b / c / 10, b = a.find("page-layout>page-width").text() * c, d = a.find("page-layout>page-margins").first(), a = d.find("left-margin").text(), d = d.find("right-margin").text(), f = 10 * c / .2117, !abcOut.scale && f && (abcOut.scale = f.toFixed(2)), !abcOut.pagewidth && b && (abcOut.pagewidth = b.toFixed(2)), abcOut.leftmargin || "" == a || (abcOut.leftmargin = (a * c).toFixed(2)),
        abcOut.rightmargin || "" == d || (abcOut.rightmargin = (d * c).toFixed(2))))
    };
    Parser.prototype.locStaffMap = function (b) {
        var a = {};
        this.vceInst = {};
        this.msc.vnums = {};
        b = b.find("measure>note");
        for (var c = 0; c < b.length; c++) {
            var d = $(b[c]), f = parseInt(d.find("voice").text() || "1");
            this.isSib && (f += 100 * (d.find("staff").text() || 1));
            this.msc.vnums[f] = 1;
            var e = parseInt(d.find("staff").text() || "1");
            if (f in a) {
                var g = a[f];
                g[e] = (g[e] || 0) + 1
            } else g = {}, g[e] = 1, a[f] = g;
            g = d.find("instrument");
            g.length && (this.vceInst[f] = $(g).attr("id"))
        }
        this.stfMap = {};
        this.clefMap = {};
        for (f in a) {
            b = [];
            c = a[f];
            for (e in c)b.push([c[e],
                e]);
            b.sort(function (a, b) {
                return b[0] - a[0]
            });
            b = b[0][1];
            this.stfMap[b] = (this.stfMap[b] || []).concat([f]);
            this.curStf[f] = b
        }
    };
    Parser.prototype.addStaffMap = function (b) {
        var a, c, d, f, e, g = [], l = Object.keys(this.stfMap).sort();
        for (a = 0; a < l.length; a++) {
            f = l[a];
            d = this.stfMap[f];
            e = [];
            for (a = 0; a < d.length; a++)c = d[a], c in b && e.push(b[c]);
            if (e.length) {
                g.push(e.sort());
                for (a = 0 ; a < g.length; a++, d = f in this.clefMap ? this.clefMap[f] : "treble", e) {
                    c = e[a], abcOut.clefs[c] = d
                }
            }
        }
        this.gStfMap.push(g)
    };
    Parser.prototype.addMidiMap = function (b, a) {
        var c = this.instMid[b], d, f = Object.keys(c);
        d = f.length ? c[f[0]] : this.midDflt;
        var e = [], g, l, h, k, m = this;
        for (g in a)f = Object.keys(this.drumNotes).sort().filter(function (a) { // a is an object, no Array
            return a.split(";")[0] == g
        }), k = f.map(function (a) {
            return {nt: a.split(";")[1], step: m.drumNotes[a][0], midi: m.drumNotes[a][1], nhd: m.drumNotes[a][2]}
        }), f = a[g], l = this.vceInst[g] || "", l in c ? e.push([f, c[l].concat(k)]) : e.push([f, d.concat(k)]);
        e.sort(function (a, b) {
            return a[0] - b[0]
        });
        for (h = 0; h < e.length; h++)f = e[h][0], c =
            e[h][1], this.midiMap.push(c)
    };
    Parser.prototype.parse = function (b) {
        var a = $(b);
        this.mkTitle(a);
        this.doDefaults(a);
        partlist = this.doPartList(a);
        b = a.find("part");
        for (var c = 0; c < b.length; ++c) {
            var a = $(b[c]), d = a.find("measure");
            this.locStaffMap(a);
            this.drumNotes = {};
            this.clefOct = {};
            this.msc.initVoices(1);
            var f = 0, e = 0;
            for (this.msr = new Measure(c); this.msr.ixm < d.length;) {
                var g = $(d[this.msr.ixm]), l = 0, h = "";
                this.msr.reset();
                this.curalts = {};
                for (var k = g.children(), m = 0; m < k.length; m++) {
                    var n = k[m], a = $(n);
                    switch (n.nodeName) {
                        case "note":
                            this.doNote(a);
                            break;
                        case "attributes":
                            this.doAttr(a);
                            break;
                        case "direction":
                            this.doDirection(a);
                            break;
                        case "sound":
                            this.doDirection(g);
                            break;
                        case "harmony":
                            this.doHarmony(a);
                            break;
                        case "barline":
                            l = this.doBarline(a);
                            break;
                        case "backup":
                            a = parseInt(a.find("duration").text());
                            this.msc.incTime(-a);
                            break;
                        case "forward":
                            a = parseInt(a.find("duration").text());
                            this.msc.incTime(a);
                            break;
                        case "print":
                            h = this.doPrint(a)
                    }
                }
                this.msc.addBar(h, this.msr);
                1 == l ? (e = this.msr.ixm, this.msr.ixm += 1) : 2 == l ? 1 > f ? (this.msr.ixm = e, f += 1) : (f = 0, this.msr.ixm +=
                    1) : this.msr.ixm += 1
            }
            d = this.msc.outVoices(this.msr.divs, c);
            this.addStaffMap(d);
            this.addMidiMap(c, d)
        }
        Object.keys(d).length ? abcOut.mkHeader(this.gStfMap, partlist, this.midiMap) : infof("nothing written, %s has no notes ...", [abcOut.fnmext])
    };
    this.vertaal = function (b, a) {
        var c = {u: 0, b: 0, n: 0, c: 0, v: 0, d: 0, m: 0, x: 0, t: 0, p: "f"}, d;
        // for (d in a)c[d] = a[d];
        // c.p = c.p ? c.p.split(",") : [];
        abcOut = new ABCoutput(".abc", "", 0, c);
        xxx = new Parser(c);
        xxx.parse(b)

        try {
        } catch (f) {
            infof("** exception occurred: %s", [f])
        }
        return [abcOut.outlist.join(""), abcOut.infolist.join("\n")]
    };
}
