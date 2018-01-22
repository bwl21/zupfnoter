// compiled for Zupfnoter 2018-01-20 14:35:20 +0100
// abc2svg - ABC to SVG translator
// @source: https://github.com/moinejf/abc2svg.git
// Copyright (C) 2014-2017 Jean-Francois Moine - LGPL3+
var abc2svg={version:"1.15.8",vdate:"2018-01-19"}
// abc2svg - abc2svg.js
//
// Copyright (C) 2014-2017 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

// start of the Abc object
function Abc(user) {
	"use strict";

	// mask some unsafe functions
    var	require = function(){return {}}

	this.user = user

// -- constants --
// symbol types
var	BAR = 0,
	CLEF = 1,
	CUSTOS = 2,
//	FORMAT = 3,
	GRACE = 4,
	KEY = 5,
	METER = 6,
	MREST = 7,
	NOTE = 8,
	PART = 9,
	REST = 10,
	SPACE = 11,
	STAVES = 12,
	STBRK = 13,
	TEMPO = 14,
//	TUPLET = 15,
	BLOCK = 16,
	REMARK = 17,

// note heads
	FULL = 0,
	EMPTY = 1,
	OVAL = 2,
	OVALBARS = 3,
	SQUARE = 4,

/* slur/tie types (3 + 1 bits) */
	SL_ABOVE = 0x01,
	SL_BELOW = 0x02,
	SL_AUTO = 0x03,
	SL_HIDDEN = 0x04,
	SL_DOTTED = 0x08,		/* (modifier bit) */

// staff system
	OPEN_BRACE = 0x01,
	CLOSE_BRACE = 0x02,
	OPEN_BRACKET = 0x04,
	CLOSE_BRACKET = 0x08,
	OPEN_PARENTH = 0x10,
	CLOSE_PARENTH = 0x20,
	STOP_BAR = 0x40,
	FL_VOICE = 0x80,
	OPEN_BRACE2 = 0x0100,
	CLOSE_BRACE2 = 0x0200,
	OPEN_BRACKET2 = 0x0400,
	CLOSE_BRACKET2 = 0x0800,
	MASTER_VOICE = 0x1000,

	BASE_LEN = 1536,
	IN = 96,		// resolution 96 PPI
	CM = 37.8,		// 1 inch = 2.54 centimeter
	YSTEP = 256		/* number of steps for y offsets */

var	glovar = {
		meter: {
			type: METER,		// meter in tune header
			wmeasure: 1,		// no M:
			a_meter: []		// default: none
		}
	},
	info = {},			// information fields
	mac = {},			// macros (m:)
	maci = new Int8Array(128),	// first letter of macros
	parse = {
		ctx: {},
		prefix: '%',
		state: 0,
		line: new scanBuf()
	},
	psvg			// PostScript

// utilities
function clone(obj) {
	if (!obj)
		return obj
	var tmp = new obj.constructor()
	for (var k in obj)
	    if (obj.hasOwnProperty(k))
		tmp[k] = obj[k]
	return tmp
}

function errbld(sev, txt, fn, idx) {
	var i, j, l, c, h

	if (user.errbld) {
		switch (sev) {
		case 0: sev = "warn"; break
		case 1: sev = "error"; break
		default: sev= "fatal"; break
		}
		user.errbld(sev, txt, fn, idx)
		return
	}
	if (idx != undefined && idx >= 0) {
		i = l = 0
		while (1) {
			j = parse.file.indexOf('\n', i)
			if (j < 0 || j > idx)
				break
			l++;
			i = j + 1
		}
		c = idx - i
	}
	h = ""
	if (fn) {
		h = fn
		if (l)
			h += ":" + (l + 1) + ":" + (c + 1);
		h += " "
	}
	switch (sev) {
	case 0: h += "Warning: "; break
	case 1: h += "Error: "; break
	default: h += "Internal bug: "; break
	}
	user.errmsg(h + txt, l, c)
}

function error(sev, s, msg, a1, a2, a3, a4) {
	var i, j, regex, tmp

	if (user.textrans) {
		tmp = user.textrans[msg]
		if (tmp)
			msg = tmp
	}
	if (arguments.length > 3)
		msg = msg.replace(/\$./g, function(a) {
			switch (a) {
			case '$1': return a1
			case '$2': return a2
			case '$3': return a3
			default  : return a4
			}
		})
	if (s && s.ctx)
		errbld(sev, msg, s.ctx.fname, s.istart)
	else
		errbld(sev, msg)
}

// scanning functions
function scanBuf() {
//	this.buffer = buffer
	this.index = 0;

	scanBuf.prototype.char = function() {
		return this.buffer[this.index]
	}
	scanBuf.prototype.next_char = function() {
		return this.buffer[++this.index]
	}
	scanBuf.prototype.get_int = function() {
		var	val = 0,
			c = this.buffer[this.index]
		while (c >= '0' && c <= '9') {
			val = val * 10 + Number(c);
			c = this.next_char()
		}
		return val
	}
}

function syntax(sev, msg, a1, a2, a3, a4) {
    var	s = {
		ctx: parse.ctx,
		istart: parse.istart + parse.line.index
	}

	error(sev, s, msg, a1, a2, a3, a4)
}
// abc2svg - deco.js - decorations
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

var	dd_tb = {},		// definition of the decorations
	a_de,			// array of the decoration elements
	od		// ottava: index = type + staff, value = counter + voice number

// standard decorations
var std_deco = {
	dot: "0 stc 5 1 1",
	tenuto: "0 emb 5 2 2",
	slide: "1 sld 3 7 0",
	arpeggio: "2 arp 12 10 0",
	roll: "3 roll 7 6 6",
	fermata: "3 hld 12 7 7",
	emphasis: "3 accent 7 4 4",
	lowermordent: "3 lmrd 10 2 2",
	coda: "3 coda 24 10 10",
	uppermordent: "3 umrd 10 2 2",
	segno: "3 sgno 20 8 8",
	trill: "3 trl 14 4 4",
	upbow: "3 upb 10 5 5",
	downbow: "3 dnb 9 5 5",
	gmark: "3 grm 6 5 5",
	wedge: "3 wedge 8 1 1",
	turnx: "3 turnx 10 0 5",
	breath: "3 brth 0 1 20",
	longphrase: "3 lphr 0 1 1",
	mediumphrase: "3 mphr 0 1 1",
	shortphrase: "3 sphr 0 1 1",
	invertedfermata: "3 hld 12 7 7",
	invertedturn: "3 turn 10 0 5",
	invertedturnx: "3 turnx 10 0 5",
	"0": "3 fng 8 3 3 0",
	"1": "3 fng 8 3 3 1",
	"2": "3 fng 8 3 3 2",
	"3": "3 fng 8 3 3 3",
	"4": "3 fng 8 3 3 4",
	"5": "3 fng 8 3 3 5",
	plus: "3 dplus 7 3 3",
	"+": "3 dplus 7 3 3",
	accent: "3 accent 6 4 4",
	">": "3 accent 6 4 4",
	marcato: "3 marcato 9 3 3",
	"^": "3 marcato 9 3 3",
	mordent: "3 lmrd 10 2 2",
	open: "3 opend 10 2 2",
	snap: "3 snap 14 3 3",
	thumb: "3 thumb 14 2 2",
	"D.C.": "3 dacs 16 10 10 D.C.",
	"D.S.": "3 dacs 16 10 10 D.S.",
	fine: "3 dacs 16 10 10 FINE",
	turn: "3 turn 10 0 5",
	"trill(": "3 ltr 8 0 0",
	"trill)": "3 ltr 8 0 0",
	f: "6 pf 18 1 7",
	ff: "6 pf 18 2 10",
	fff: "6 pf 18 4 13",
	ffff: "6 pf 18 6 16",
	mf: "6 pf 18 6 13",
	mp: "6 pf 18 6 16",
	p: "6 pf 18 2 8",
	pp: "6 pf 18 5 14",
	ppp: "6 pf 18 8 20",
	pppp: "6 pf 18 10 25",
	pralltriller: "3 umrd 10 2 2",
	sfz: '6 sfz 18 4 10 ""',
	ped: "4 ped 20 0 0",
	"ped-up": "4 pedoff 20 0 0",
	"crescendo(": "7 cresc 18 0 0",
	"crescendo)": "7 cresc 18 0 0",
	"<(": "7 cresc 18 0 0",
	"<)": "7 cresc 18 0 0",
	"diminuendo(": "7 dim 18 0 0",
	"diminuendo)": "7 dim 18 0 0",
	">(": "7 dim 18 0 0",
	">)": "7 dim 18 0 0",
	"-(": "8 gliss 0 0 0",
	"-)": "8 gliss 0 0 0",
	"~(": "8 glisq 0 0 0",
	"~)": "8 glisq 0 0 0",
	"8va(": "3 8va 10 0 0",
	"8va)": "3 8va 10 0 0",
	"8vb(": "4 8vb 10 0 0",
	"8vb)": "4 8vb 10 0 0",
	"15ma(": "3 15ma 10 0 0",
	"15ma)": "3 15ma 10 0 0",
	"15mb(": "4 15mb 10 0 0",
	"15mb)": "4 15mb 10 0 0",
// internal
//	color: "10 0 0 0 0",
	invisible: "32 0 0 0 0",
	beamon: "33 0 0 0 0",
	trem1: "34 0 0 0 0",
	trem2: "34 0 0 0 0",
	trem3: "34 0 0 0 0",
	trem4: "34 0 0 0 0",
	xstem: "35 0 0 0 0",
	beambr1: "36 0 0 0 0",
	beambr2: "36 0 0 0 0",
	rbstop: "37 0 0 0 0",
	"/": "38 0 0 6 6",
	"//": "38 0 0 6 6",
	"///": "38 0 0 6 6",
	"beam-accel": "39 0 0 0 0",
	"beam-rall": "39 0 0 0 0",
	stemless: "40 0 0 0 0",
	rbend: "41 0 0 0 0"},

	// types of decoration per function
	f_near = [true, true, true],
	f_note = [false, false, false, true, true, true, false, false, true],
	f_staff = [false, false, false, false, false, false, true, true]

var	user_deco = {}	/* user decorations */

/* -- get the max/min vertical offset -- */
function y_get(st, up, x, w) {
	var	y,
		p_staff = staff_tb[st],
		i = (x / realwidth * YSTEP) | 0,
		j = ((x + w) / realwidth * YSTEP) | 0

	if (i < 0)
		i = 0
	if (j >= YSTEP) {
		j = YSTEP - 1
		if (i > j)
			i = j
	}
	if (up) {
		y = p_staff.top[i++]
		while (i <= j) {
			if (y < p_staff.top[i])
				y = p_staff.top[i];
			i++
		}
	} else {
		y = p_staff.bot[i++]
		while (i <= j) {
			if (y > p_staff.bot[i])
				y = p_staff.bot[i];
			i++
		}
	}
	return y
}

/* -- adjust the vertical offsets -- */
function y_set(st, up, x, w, y) {
	var	p_staff = staff_tb[st],
		i = (x / realwidth * YSTEP) | 0,
		j = ((x + w) / realwidth * YSTEP) | 0

	/* (may occur when annotation on 'y' at start of an empty staff) */
	if (i < 0)
		i = 0
	if (j >= YSTEP) {
		j = YSTEP - 1
		if (i > j)
			i = j
	}
	if (up) {
		while (i <= j) {
			if (p_staff.top[i] < y)
				p_staff.top[i] = y;
			i++
		}
	} else {
		while (i <= j) {
			if (p_staff.bot[i] > y)
				p_staff.bot[i] = y;
			i++
		}
	}
}

/* -- get the staff position of the dynamic and volume marks -- */
function up_p(s, pos) {
	switch (pos) {
	case SL_ABOVE:
		return true
	case SL_BELOW:
		return false
	}
	if (s.multi && s.multi != 0)
		return s.multi > 0
	if (!s.p_v.have_ly)
		return false

	/* above if the lyrics are below the staff */
	return s.pos.voc != SL_ABOVE
}

/* -- drawing functions -- */
/* 2: special case for arpeggio */
function d_arp(de) {
	var	m, h, dx,
		s = de.s,
		dd = de.dd,
		xc = 5

	if (s.type == NOTE) {
		for (m = 0; m <= s.nhd; m++) {
			if (s.notes[m].acc) {
				dx = 5 + s.notes[m].shac
			} else {
				dx = 6 - s.notes[m].shhd
				switch (s.head) {
				case SQUARE:
					dx += 3.5
					break
				case OVALBARS:
				case OVAL:
					dx += 2
					break
				}
			}
			if (dx > xc)
				xc = dx
		}
	}
	h = 3 * (s.notes[s.nhd].pit - s.notes[0].pit) + 4;
	m = dd.h			/* minimum height */
	if (h < m)
		h = m;

	de.has_val = true;
	de.val = h;
//	de.x = s.x - xc;
	de.x -= xc;
	de.y = 3 * (s.notes[0].pit - 18) - 3
}

/* 7: special case for crescendo/diminuendo */
function d_cresc(de) {
	if (de.ldst)			// skip start of deco
		return
	var	s, dd, dd2, up, x, dx, x2, i,
		s2 = de.s,
		de2 = de.start,		/* start of the deco */
		de2_prev, de_next;

	s = de2.s;
	x = s.x + 3;
	i = de2.ix
	if (i > 0)
		de2_prev = a_de[i - 1];

	de.st = s2.st;
	de.lden = false;		/* old behaviour */
	de.has_val = true;
	up = up_p(s2, s2.pos.dyn)
	if (up)
		de.up = true

	// shift the starting point if any dynamic mark on the left
	if (de2_prev && de2_prev.s == s
	 && ((de.up && !de2_prev.up)
	  || (!de.up && de2_prev.up))) {
		dd2 = de2_prev.dd
		if (f_staff[dd2.func]) {	// if dynamic mark
			x2 = de2_prev.x + de2_prev.val + 4
			if (x2 > x)
				x = x2
		}
	}

	if (de.defl.noen) {		/* if no decoration end */
		dx = de.x - x
		if (dx < 20) {
			x = de.x - 20 - 3;
			dx = 20
		}
	} else {

		// shift the ending point if any dynamic mark on the right
		x2 = s2.x;
		de_next = a_de[de.ix + 1]
		if (de_next
		 && de_next.s == s
		 && ((de.up && !de_next.up)
		  || (!de.up && de_next.up))) {
			dd2 = de_next.dd
			if (f_staff[dd2.func])	// if dynamic mark
				x2 -= 5
		}
		dx = x2 - x - 4
		if (dx < 20) {
			x -= (20 - dx) * .5;
			dx = 20
		}
	}

	de.val = dx;
	de.x = x;
	de.y = y_get(de.st, up, x, dx)
	if (!up) {
		dd = de.dd;
		de.y -= dd.h
	}
	/* (y_set is done later in draw_deco_staff) */
}

/* 0: near the note (dot, tenuto) */
function d_near(de) {
	var	y, up,
		s = de.s,
		dd = de.dd

	if (dd.str) {			// annotation like decoration
//		de.x = s.x;
//		de.y = s.y;
		return
	}
	if (s.multi)
		up = s.multi > 0
	else
		up = s.stem < 0
	if (up)
		y = s.ymx | 0
	else
		y = (s.ymn - dd.h) | 0
	if (y > -6 && y < 24) {
		if (up)
			y += 3;
		y = (((y + 6) / 6) | 0) * 6 - 6		/* between lines */
	}
	if (up)
		s.ymx = y + dd.h
	else
		s.ymn = y;
	de.y = y
//	de.x = s.x + s.notes[s.stem >= 0 ? 0 : s.nhd].shhd
	if (s.type == NOTE)
		de.x += s.notes[s.stem >= 0 ? 0 : s.nhd].shhd
	if (dd.name[0] == 'd'			/* if dot decoration */
	 && s.nflags >= -1) {			/* on stem */
		if (up) {
			if (s.stem > 0)
				de.x += 3.5	// stem_xoff
		} else {
			if (s.stem < 0)
				de.x -= 3.5
		}
	}
}

/* 6: dynamic marks */
function d_pf(de) {
	var	dd2, x2, str, x, up,
		s = de.s,
		dd = de.dd,
		de_prev;

	de.val = dd.wl + dd.wr;
	up = up_p(s, s.pos.vol)
	if (up)
		de.up = true;
	x = s.x - dd.wl
	if (de.ix > 0) {
		de_prev = a_de[de.ix - 1]
		if (de_prev.s == s
		 && ((de.up && !de_prev.up)
		  || (!de.up && de_prev.up))) {
			dd2 = de_prev.dd
			if (f_staff[dd2.func]) {	/* if dynamic mark */
				x2 = de_prev.x + de_prev.val + 4;
				if (x2 > x)
					x = x2
			}
		}
	}

	de.x = x;
	de.y = y_get(s.st, up, x, de.val)
	if (!up)
		de.y -= dd.h
	/* (y_set is done later in draw_deco_staff) */
}

/* 1: special case for slide */
function d_slide(de) {
	var	m, dx,
		s = de.s,
		yc = s.notes[0].pit,
		xc = 5

	for (m = 0; m <= s.nhd; m++) {
		if (s.notes[m].acc) {
			dx = 4 + s.notes[m].shac
		} else {
			dx = 5 - s.notes[m].shhd
			switch (s.head) {
			case SQUARE:
				dx += 3.5
				break
			case OVALBARS:
			case OVAL:
				dx += 2
				break
			}
		}
		if (s.notes[m].pit <= yc + 3 && dx > xc)
			xc = dx
	}
//	de.x = s.x - xc;
	de.x -= xc;
	de.y = 3 * (yc - 18)
}

/* 5: special case for long trill */
function d_trill(de) {
	if (de.ldst)
		return
	var	dd, up, y, w, tmp,
		s2 = de.s,
		st = s2.st,
		s = de.start.s,
		x = s.x

	if (de.prev) {			// hack 'tr~~~~~'
		x = de.prev.x + 10;
		y = de.prev.y
	}
	de.st = st

	if (de.dd.func != 4) {		// if not below
		switch (de.dd.glyph) {
		case "8va":
		case "15ma":
			up = 1
			break
		default:
			up = s2.multi >= 0
			break
		}
	}
	if (de.defl.noen) {		/* if no decoration end */
		w = de.x - x
		if (w < 20) {
			x = de.x - 20 - 3;
			w = 20
		}
	} else {
		w = s2.x - x - 6
		if (s2.type == NOTE)
			w -= 6
		if (w < 20) {
			x -= (20 - w) * .5;
			w = 20
		}
	}
	dd = de.dd;
	if (!y)
		y = y_get(st, up, x, w)
	if (up) {
		tmp = staff_tb[s.st].topbar + 2
		if (y < tmp)
			y = tmp
	} else {
		y -= dd.h;
		tmp = staff_tb[s.st].botbar - 2
		if (y > tmp)
			y = tmp
	}
	de.lden = false;
	de.has_val = true;
	de.val = w;
	de.x = x;
	de.y = y
	if (up)
		y += dd.h;
	y_set(st, up, x, w, y)
	if (up)
		s.ymx = s2.ymx = y
	else
		s.ymn = s2.ymn = y
}

/* 3, 4: above (or below) the staff */
function d_upstaff(de) {

	// don't treat here the long decorations
	if (de.ldst)			// if long deco start
		return
	if (de.start) {			// if long decoration
		d_trill(de)
		return
	}
	var	yc, up, inv,
		s = de.s,
		dd = de.dd,
		x = s.x,
		w = dd.wl + dd.wr,
		stafft = staff_tb[s.st].topbar + 2,
		staffb = staff_tb[s.st].botbar - 2

	if (s.nhd)
		x += s.notes[s.stem >= 0 ? 0 : s.nhd].shhd;
	up = -1
	if (dd.func == 4) {		// below
		up = 0
	} else if (s.pos) {
		switch (s.pos.orn) {
		case SL_ABOVE:
			up = 1
			break
		case SL_BELOW:
			up = 0
			break
		}
	}

	switch (dd.glyph) {
	case "accent":
	case "roll":
		if (!up
		 || (up < 0
		  && (s.multi < 0
		   || (!s.multi && s.stem > 0)))) {
			yc = y_get(s.st, false, s.x - dd.wl, w)
			if (yc > staffb)
				yc = staffb;
			yc -= dd.h;
			y_set(s.st, false, s.x, 0, yc);
			inv = true;
			s.ymn = yc
		} else {
			yc = y_get(s.st, true, s.x, 0)
			if (yc < stafft)
				yc = stafft;
			y_set(s.st, true, s.x - dd.wl, w, yc + dd.h);
			s.ymx = yc + dd.h
		}
		break
	case "brth":
	case "lphr":
	case "mphr":
	case "sphr":
		yc = stafft + 1
		if (dd.glyph == "brth") {
			if (yc < s.ymx)
				yc = s.ymx
		}
		for (s = s.ts_next; s; s = s.ts_next)
			if (s.shrink)
				break
		x += ((s ? s.x : realwidth) - x) * .4
		break
	default:
		if (dd.name.indexOf("invert") == 0)
			inv = true
		if (dd.name != "invertedfermata"
		 && (up > 0
		  || (up < 0 && s.multi >= 0))) {
			yc = y_get(s.st, true, s.x - dd.wl, w)
			if (yc < stafft)
				yc = stafft;
			y_set(s.st, true, s.x - dd.wl, w, yc + dd.h);
			s.ymx = yc + dd.h
		} else {
			yc = y_get(s.st, false, s.x - dd.wl, w)
			if (yc > staffb)
				yc = staffb;
			yc -= dd.h;
			y_set(s.st, false, s.x - dd.wl, w, yc)
			if (dd.name == "fermata")
				inv = true;
			s.ymn = yc
		}
		break
	}
	if (inv) {
		yc += dd.h;
		de.inv = true
	}
	de.x = x;
	de.y = yc
}

/* deco function table */
var func_tb = [
	d_near,		/* 0 - near the note */
	d_slide,	/* 1 */
	d_arp,		/* 2 */
	d_upstaff,	/* 3 - tied to note */
	d_upstaff,	/* 4 (below the staff) */
	d_trill,	/* 5 */
	d_pf,		/* 6 - tied to staff (dynamic marks) */
	d_cresc,	/* 7 */
]

/* -- add a decoration - from internal table or %%deco -- */
/* syntax:
 *	%%deco <name> <c_func> <glyph> <h> <wl> <wr> [<str>]
 */
function deco_add(param) {
	var dv = param.match(/(\S*)\s+(.*)/);
	user_deco[dv[1]] = dv[2]
}

// return the decoration
function deco_build(nm, text) {
	var a, dd, dd2, name2, c, i, elts, str

	// extract the values
	a = text.match(/(\d+)\s+(.+?)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/)
	if (!a) {
		error(1, null, "Invalid decoration '$1'", nm)
		return //undefined
	}
	var	c_func = Number(a[1]),
//		glyph = a[2],
		h = parseFloat(a[3]),
		wl = parseFloat(a[4]),
		wr = parseFloat(a[5])

	if (isNaN(c_func)) {
		error(1, null, "%%deco: bad C function value '$1'", a[1])
		return //undefined
	}
	if ((c_func < 0 || c_func > 10)
	 && (c_func < 32 || c_func > 41)) {
		error(1, null, "%%deco: bad C function index '$1'", c_func)
		return //undefined
	}
	if (h < 0 || wl < 0 || wr < 0) {
		error(1, null, "%%deco: cannot have a negative value '$1'", text)
		return //undefined
	}
	if (h > 50 || wl > 80 || wr > 80) {
		error(1, null, "%%deco: abnormal h/wl/wr value '$1'", text)
		return //undefined
	}

	// create/redefine the decoration
	dd = dd_tb[nm]
	if (!dd) {
		dd = {
			name: nm
		}
		dd_tb[nm] = dd
	}

	/* set the values */
	dd.func = dd.name.indexOf("head-") == 0 ? 9 : c_func;
	dd.glyph = a[2];
	dd.h = h;
	dd.wl = wl;
	dd.wr = wr;
	str = text.replace(a[0], '').trim()
	if (str) {				// optional string
		if (str[0] == '"')
			str = str.slice(1, -1);
		dd.str = str
	}

	/* compatibility */
	if (dd.func == 6 && dd.str == undefined)
		dd.str = dd.name

	// link the start and end of long decorations
	c = dd.name.slice(-1)
	if (c == '(' ||
	    (c == ')' && dd.name.indexOf('(') < 0)) {
		name2 = dd.name.slice(0, -1) + (c == '(' ? ')' : '(');
		dd2 = dd_tb[name2]
		if (dd2) {
			if (c == '(') {
				dd.dd_en = dd2;
				dd2.dd_st = dd
			} else {
				dd.dd_st = dd2;
				dd2.dd_en = dd
			}
		} else {
			dd2 = deco_def(name2)
			if (!dd2)
				return //undefined
		}
	}
	return dd
}

/* -- convert the decorations -- */
function deco_cnv(a_dcn, s, prev) {
	var	i, j, dd, dcn, note,
		nd = a_dcn.length

	for (i = 0; i < nd; i++) {
		dcn = a_dcn[i];
		dd = dd_tb[dcn]
		if (!dd) {
			dd = deco_def(dcn)
			if (!dd)
				continue
		}

		/* special decorations */
		switch (dd.func) {
		case 0:			// near
			if (s.type == BAR && dd.name == "dot") {
				s.bar_dotted = true
				break
			}
			// fall thru
		case 1:			// slide
		case 2:			// arp
//			if (s.type != NOTE && s.type != REST) {
			if (!s.notes) {
				error(1, s,
					"!$1! must be on a note or a rest", dd.name)
				continue
			}
			break
		case 8:			// gliss
			if (s.type != NOTE) {
				error(1, s,
					"!$1! must be on a note", dd.name)
				continue
			}
			note = s.notes[s.nhd] // move to the upper note of the chord
			if (!note.a_dcn)
				note.a_dcn = []
			note.a_dcn.push(dd.name)
			continue
		case 9:			// alternate head
			if (!s.notes) {
				error(1, s,
					"!$1! must be on a note or rest", dd.name)
				continue
			}

			// move the alternate head of the chord to the notes
			for (j = 0; j <= s.nhd; j++) {
				note = s.notes[j]
				if (!note.a_dcn)
					note.a_dcn = []
				note.a_dcn.push(dd.name)
			}
			continue
		default:
			break
		case 10:		/* color */
			if (s.notes) {
				for (j = 0; j <= s.nhd; j++)
					s.notes[j].color = dd.name
			} else {
				s.color = dd.name
			}
			continue
		case 32:		/* invisible */
			s.invis = true
			continue
		case 33:		/* beamon */
			if (s.type != BAR) {
				error(1, s, "!beamon! must be on a bar")
				continue
			}
			s.beam_on = true
			continue
		case 34:		/* trem1..trem4 */
			if (s.type != NOTE
			 || !prev
			 || prev.type != NOTE
			 || s.nflags != prev.nflags) {
				error(1, s,
					"!$1! must be on the last of a couple of notes",
					dd.name)
				continue
			}
			s.trem2 = true;
			s.beam_end = true;
//			s.beam_st = false;
			prev.trem2 = true;
			prev.beam_st = true;
//			prev.beam_end = false;
			s.ntrem = prev.ntrem = Number(dd.name[4]);
			prev.nflags = --s.nflags;
			prev.head = ++s.head
			if (s.nflags > 0) {
				s.nflags += s.ntrem;
			} else {
				if (s.nflags <= -2) {
					s.stemless = true;
					prev.stemless = true
				}
				s.nflags = s.ntrem;
			}
			prev.nflags = s.nflags
			for (j = 0; j <= s.nhd; j++)
				s.notes[j].dur *= 2;
			for (j = 0; j <= prev.nhd; j++)
				prev.notes[j].dur *= 2
			continue
		case 35:		/* xstem */
			if (s.type != NOTE) {
				error(1, s, "!xstem! must be on a note")
				continue
			}
			s.xstem = true;
			s.nflags = 0		// beam break
			continue
		case 36:		/* beambr1 / beambr2 */
			if (s.type != NOTE) {
				error(1, s, "!$1! must be on a note", dd.name)
				continue
			}
			if (dd.name[6] == '1')
				s.beam_br1 = true
			else
				s.beam_br2 = true
			continue
		case 37:		/* rbstop */
			s.rbstop = 1	// open
			continue
		case 38:		/* /, // and /// = tremolo */
			if (s.type != NOTE) {
				error(1, s, "!$1! must be on a note", dd.name)
				continue
			}
			s.trem1 = true;
			s.ntrem = dd.name.length	/* 1, 2 or 3 */
			if (s.nflags > 0)
				s.nflags += s.ntrem
			else
				s.nflags = s.ntrem
			continue
		case 39:		/* beam-accel/beam-rall */
			if (s.type != NOTE) {
				error(1, s, "!$1! must be on a note", dd.name)
				continue
			}
			s.feathered_beam = dd.name[5] == 'a' ? 1 : -1;
			continue
		case 40:		/* stemless */
			s.stemless = true
			continue
		case 41:		/* rbend */
			s.rbstop = 2	// with end
			continue
		}

		// add the decoration in the symbol
		if (!s.a_dd)
			s.a_dd = []
		s.a_dd.push(dd)
	}
}

/* -- define a decoration -- */
function deco_def(nm) {
	if (user_deco && user_deco[nm])
		return deco_build(nm, user_deco[nm])
	if (std_deco[nm])
		return deco_build(nm, std_deco[nm])
	if (cfmt.decoerr)
		error(1, null, "Unknown decoration '$1'", nm)
	return //undefined
}

/* -- update the x position of a decoration -- */
// used to center the rests
function deco_update(s, dx) {
	var	i, de,
		nd = a_de.length

	for (i = 0; i < nd; i++) {
		de = a_de[i]
		if (de.s == s)
			de.x += dx
	}
}

/* -- adjust the symbol width -- */
function deco_width(s) {
	var	dd, i,
		wl = 0,
		a_dd = s.a_dd,
		nd = a_dd.length

	for (i = 0; i < nd; i++) {
		dd =  a_dd[i]
		switch (dd.func) {
		case 1:			/* slide */
			if (wl < 7)
				wl = 7
			break
		case 2:			/* arpeggio */
			if (wl < 14)
				wl = 14
			break
		}
	}
	if (wl != 0 && s.prev && s.prev.type == BAR)
		wl -= 3
	return wl
}

/* -- draw the decorations -- */
/* (the staves are defined) */
function draw_all_deco() {
	if (a_de.length == 0)
		return
	var	de, de2, dd, s, note, f, st, x, y, y2, ym, uf, i, str, a,
		new_de = [],
		ymid = []

	if (!cfmt.dynalign) {
		st = nstaff;
		y = staff_tb[st].y
		while (--st >= 0) {
			y2 = staff_tb[st].y;
			ymid[st] = (y + 24 + y2) * .5;
			y = y2
		}
	}

	while (1) {
		de = a_de.shift()
		if (!de)
			break
		dd = de.dd
		if (!dd)
			continue		// deleted

		if (dd.dd_en)			// start of long decoration
			continue

		// handle the stem direction
		s = de.s
		f = dd.glyph;
		i = f.indexOf('/')
		if (i > 0) {
			if (s.stem >= 0)
				f = f.slice(0, i)
			else
				f = f.slice(i + 1)
		}

		// no scale if staff decoration
		if (f_staff[dd.func])
			set_sscale(-1)
		else
			set_scale(s);

		st = de.st;
		if (!staff_tb[st].topbar)
			continue		// invisible staff
		x = de.x;
//		y = de.y + staff_tb[st].y / staff_tb[st].staffscale
		y = de.y + staff_tb[st].y

		// update the coordinates if head decoration
		if (de.m != undefined) {
			note = s.notes[de.m];
			x += note.shhd * stv_g.scale;

		/* center the dynamic marks between two staves */
/*fixme: KO when deco on other voice and same direction*/
		} else if (f_staff[dd.func] && !cfmt.dynalign
			&& ((de.up && st > 0)
			 || (!de.up && st < nstaff))) {
			if (de.up)
				ym = ymid[--st]
			else
				ym = ymid[st++];
			ym -= dd.h * .5
			if ((de.up && y < ym)
			 || (!de.up && y > ym)) {
//				if (s.st > st) {
//					while (s.st != st)
//						s = s.ts_prev
//				} else if (s.st < st) {
//					while (s.st != st)
//						s = s.ts_next
//				}
				y2 = y_get(st, !de.up, de.x, de.val)
					+ staff_tb[st].y
				if (de.up)
					y2 -= dd.h
//fixme: y_set is not used later!
				if ((de.up && y2 > ym)
				 || (!de.up && y2 < ym)) {
					y = ym;
//					y_set(st, de.up, de.x, de.val,
//						(de.up ? y + dd.h : y)
//							- staff_tb[st].y)
				}
			}
		}

		// check if user JS decoration
		uf = user[f]
		if (uf && typeof(uf) == "function") {
			uf(x, y, de)
			continue
		}

		// check if user PS definition
		if (psdeco(f, x, y, de))
			continue

		anno_start(s, 'deco')
//		if (de.flags.grace) {
//			g_open(x, y, 0, .7, de.inv ? -.7 : 0);
//			x = y = 0
//		} else
		if (de.inv) {
			g_open(x, y, 0, 1, -1);
			x = y = 0
		}
		if (de.has_val) {
			if (dd.func != 2	// if not !arpeggio!
			 || stv_g.st < 0)	// or not staff scale
// || voice_tb[s.v].scale != 1)
				out_deco_val(x, y, f, de.val / stv_g.scale, de.defl)
			else
				out_deco_val(x, y, f, de.val, de.defl)
			if (de.defl.noen)
				new_de.push(de.start)	// to be continued next line
		} else if (dd.str != undefined
			&& dd.str != 'sfz') {
			str = dd.str
			if (str[0] == '@') {
				a = str.match(/^@([0-9.-]+),([0-9.-]+);?/);
				x += Number(a[1]);
				y += Number(a[2]);
				str = str.replace(a[0], "")
			}
//			out_deco_str(x, y + de.dy,	// - dd.h * .2,
			out_deco_str(x, y,		// - dd.h * .2,
					f, str)
		} else if (de.lden) {
			out_deco_long(x, y, de)
		} else {
			xygl(x, y, f)
		}
		if (stv_g.g)
			g_close();
		anno_stop(s, 'deco')
	}

	// keep the long decorations which continue on the next line
	a_de = new_de
}

/* -- create the decorations and define the ones near the notes -- */
/* (the staves are not yet defined) */
/* (delayed output) */
/* this function must be called first as it builds the deco element table */
    var	ottava = {"8va(":1, "8va)":1, "15ma(":1, "15ma)":1,
		"8vb(":1, "8vb)":1, "15mb(":1, "15mb)":1}
function draw_deco_near() {
    var	s, g

	// update starting old decorations
	function ldeco_update(s) {
		var	i, de,
//			x = s.ts_prev.x + s.ts_prev.wr
			x = s.x - s.wl,
			nd = a_de.length

		for (i = 0; i < nd; i++) {
			de = a_de[i];
			de.ix = i;
			de.s.x = de.x = x;
			de.defl.nost = true
		}
	}

	/* -- create the deco elements, and treat the near ones -- */
	function create_deco(s) {
		var	dd, k, l, pos, de, x,
			nd = s.a_dd.length

/*fixme:pb with decorations above the staff*/
		for (k = 0; k < nd; k++) {
			dd = s.a_dd[k]

			/* check if hidden */
			switch (dd.func) {
			default:
				pos = 0
				break
			case 3:				/* d_upstaff */
			case 4:
//fixme:trill does not work yet
			case 5:				/* trill */
				if (ottava[dd.name]) {	// only one ottava per staff
					x = dd.name.slice(0, -1) + s.st.toString()
					if (od[x]) {
						if (dd.name[dd.name.length - 1] == '(') {
							od[x]++
							continue
						}
						od[x]--
						if (s.v + 1 != od[x] >> 8
						 || !od[x])
							continue
						od[x] &= 0xff
					} else if (dd.name[dd.name.length - 1] == '(') {
						od[x] = 1 + ((s.v + 1) << 8)
					}
				}
				pos = s.pos.orn
				break
			case 6:				/* d_pf */
				pos = s.pos.vol
				break
			case 7:				/* d_cresc */
				pos = s.pos.dyn
				break
			}
			if (pos == SL_HIDDEN)
				continue

			de = {
				s: s,
				dd: dd,
				st: s.st,
				ix: a_de.length,
				defl: {},
				x: s.x,
				y: s.y,
//				dy: 0
			}
			a_de.push(de)
			if (dd.dd_en) {
				de.ldst = true
			} else if (dd.dd_st) {
//fixme: pb with "()"
				de.lden = true;
				de.defl.nost = true
			}

			if (!f_near[dd.func])	/* if not near the note */
				continue
			func_tb[dd.func](de)
		}
	} // create_deco()

	// create the decorations of note heads
	function create_dh(s, m) {
		var	f, str, de, uf, k, dcn, dd,
			note = s.notes[m],
			nd = note.a_dcn.length

		for (k = 0; k < nd; k++) {
			dcn = note.a_dcn[k];
			dd = dd_tb[dcn]
			if (!dd) {
				dd = deco_def(dcn)
				if (!dd)
					continue
			}

			switch (dd.func) {
			case 2:			// arpeggio
			case 5:			// trill
			case 7:			// d_cresc
				error(1, null, "Cannot have !$1! on a head", dd.name)
				continue
			case 9:			// head replacement
				note.invis = true
				break
			case 10:		// color
				note.color = dd.name
				continue
			case 32:		// invisible
				note.invis = true
				continue
			}

//fixme: check if hidden?
			de = {
				s: s,
				dd: dd,
				st: s.st,
				m: m,
				ix: 0,
				defl: {},
				x: s.x,
				y: 3 * (note.pit - 18),
//				dy: 0
			}
			a_de.push(de)
			if (dd.dd_en) {
				de.ldst = true
			} else if (dd.dd_st) {
				de.lden = true;
				de.defl.nost = true
			}
		}
	} // create_dh()

	// create all decoration of a note (chord and heads)
	function create_all(s) {
		var m

		if (s.a_dd)
			create_deco(s)
		if (s.notes) {
			for (m = 0; m < s.notes.length; m++) {
				if (s.notes[m].a_dcn)
					create_dh(s, m)
			}
		}
	} // create_all()

	// link the long decorations
	function ll_deco() {
		var	i, j, de, de2, dd, dd2, v, s, st,
			n_de = a_de.length

		// add ending decorations
		for (i = 0; i < n_de; i++) {
			de = a_de[i]
			if (!de.ldst)	// not the start of long decoration
				continue
			dd = de.dd;
			dd2 = dd.dd_en;
			s = de.s;
			v = s.v			// search later in the voice
			for (j = i + 1; j < n_de; j++) {
				de2 = a_de[j]
				if (!de2.start
				 && de2.dd == dd2 && de2.s.v == v)
					break
			}
			if (j == n_de) {	// no end, search in the staff
				st = s.st;
				for (j = i + 1; j < n_de; j++) {
					de2 = a_de[j]
					if (!de2.start
					 && de2.dd == dd2 && de2.s.st == st)
						break
				}
			}
			if (j == n_de) {	// no end, insert one
				de2 = {
					s: de.s,
					st: de.st,
					dd: dd2,
					ix: a_de.length - 1,
					x: realwidth - 6,
					y: de.s.y,
					lden: true,
					defl: {
						noen: true
					}
				}
				if (de2.x < s.x + 10)
					de2.x = s.x + 10
				if (de.m != undefined)
					de2.m = de.m;
				a_de.push(de2)
			}
			de2.start = de;
			de2.defl.nost = de.defl.nost

			// handle 'tr~~~~~'
			if (dd.name == "trill("
			 && i > 0 && a_de[i - 1].dd.name == "trill")
				de2.prev = a_de[i - 1]
		}

		// add starting decorations
		for (i = 0; i < n_de; i++) {
			de2 = a_de[i]
			if (!de2.lden	// not the end of long decoration
			 || de2.start)	// start already found
				continue
			s = de2.s;
			de = {
				s: prev_scut(s),
				st: de2.st,
				dd: de2.dd.dd_st,
				ix: a_de.length - 1,
//				x: s.x - s.wl - 4,
				y: s.y,
				ldst: true
			}
			de.x = de.s.x
			if (de2.m != undefined)
				de.m = de2.m;
			a_de.push(de);
			de2.start = de
		}
	} // ll_deco

	// update the long decorations started in the previous line
	for (s = tsfirst ; s; s = s.ts_next) {
		switch (s.type) {
		case CLEF:
		case KEY:
		case METER:
			continue
		}
		break
	}
	if (a_de.length != 0)
		ldeco_update(s)

	for ( ; s; s = s.ts_next) {
		switch (s.type) {
		case BAR:
		case MREST:
		case NOTE:
		case REST:
		case SPACE:
			break
		case GRACE:
			for (g = s.extra; g; g = g.next)
				create_all(g)
		default:
			continue
		}
		create_all(s)
	}
	ll_deco()			// link the long decorations
}

/* -- define the decorations tied to a note -- */
/* (the staves are not yet defined) */
/* (delayed output) */
function draw_deco_note() {
	var	i, de, dd, f,
		nd = a_de.length

	for (i = 0; i < nd; i++) {
		de = a_de[i];
		dd = de.dd;
		f = dd.func
		if (f_note[f]
		 && de.m == undefined)
			func_tb[f](de)
	}
}

// -- define the music elements tied to the staff --
//	- chord indications
//	- repeat brackets
//	- decoration tied to the staves
/* (the staves are not yet defined) */
/* (unscaled delayed output) */
function draw_deco_staff() {
	var	s, first_gchord, p_voice, x, y, w, i, v, de, dd,
		gch, gch2, ix, top, bot,
		minmax = new Array(nstaff),
		nd = a_de.length

	/* draw the repeat brackets */
	function draw_repbra(p_voice) {
		var s, s1, y, y2, i, p, w, first_repeat;

		/* search the max y offset */
		y = staff_tb[p_voice.st].topbar + 6 + 20;
		for (s = p_voice.sym; s; s = s.next) {
			if (s.type != BAR)
				continue
			if (!s.rbstart || s.norepbra)
				continue
/*fixme: line cut on repeat!*/
			if (!s.next)
				break
			if (!first_repeat) {
				first_repeat = s;
				set_font("repeat")
			}
			s1 = s
			for (;;) {
				if (!s.next)
					break
				s = s.next
				if (s.rbstop)
					break
			}
			y2 = y_get(p_voice.st, true, s1.x, s.x - s1.x)
			if (y < y2)
				y = y2

			/* have room for the repeat numbers */
			if (s1.text) {
				w = strw(s1.text);
				y2 = y_get(p_voice.st, true, s1.x + 4, w);
				y2 += gene.curfont.size + 2
				if (y < y2)
					y = y2
			}
			if (s.rbstart)
				s = s.prev
		}

		/* draw the repeat indications */
		s = first_repeat
		if (!s)
			return
		set_dscale(p_voice.st, true);
		y2 =  y * staff_tb[p_voice.st].staffscale
		for ( ; s; s = s.next) {
			if (!s.rbstart || s.norepbra)
				continue
			s1 = s
			while (1) {
				if (!s.next)
					break
				s = s.next
				if (s.rbstop)
					break
			}
			if (s1 == s)
				break
			x = s1.x
//			if (s1.bar_type[0] == ":")
//				x -= 4;
			if (s.type != BAR) {
				w = s.rbstop ? 0 : s.x - realwidth + 4
			} else if ((s.bar_type.length > 1	// if complex bar
				 && s.bar_type != "[]")
				|| s.bar_type == "]") {
//				if (s.bar_type == "]")
//					s.invis = true
//fixme:%%staves: cur_sy moved?
				if (s1.st > 0
				 && !(cur_sy.staves[s1.st - 1].flags & STOP_BAR))
					w = s.wl
				else if (s.bar_type.slice(-1) == ':')
					w = 12
				else if (s.bar_type[0] != ':')
//				      || s.bar_type == "]")
					w = 0		/* explicit repeat end */
				else
					w = 8
			} else {
				w = s.rbstop ? 0 : 8
			}
			w = (s.x - x - w)	// / staff_tb[p_voice.st].staffscale;

			if (!s.next		// 2nd ending at end of line
			 && !s.rbstop
			 && !p_voice.bar_start) { // continue on next line
				p_voice.bar_start = clone(s);
				p_voice.bar_start.type = BAR;
				p_voice.bar_start.bar_type = "["
				delete p_voice.bar_start.text;
				p_voice.bar_start.rbstart = 1
				delete p_voice.bar_start.a_gch
			}
			if (s1.text)
				xy_str(x + 4, y2 - gene.curfont.size * .9,
					s1.text);
			xypath(x, y2);
			if (s1.rbstart == 2)
				output.push('m0 20v-20');
			output.push('h');
			output.push(w.toFixed(2))
			if (s.rbstop == 2)
				output.push('v20');
			output.push('"/>\n');
			y_set(s1.st, true, x, w, y + 2)

			if (s.rbstart)
				s = s.prev
		}
	} // draw_repbra()

	/* search the vertical offset for the guitar chords */
	for (i = 0; i <= nstaff; i++)
		minmax[i] = {
			ymin: 0,
			ymax: 24
		}
	for (s = tsfirst; s; s = s.ts_next) {
		if (!s.a_gch)
			continue
		if (!first_gchord)
			first_gchord = s;
		gch2 = null
		for (ix = 0; ix < s.a_gch.length; ix++) {
			gch = s.a_gch[ix]
			if (gch.type != 'g')
				continue
			gch2 = gch	/* guitar chord closest to the staff */
			if (gch.y < 0)
				break
		}
		if (gch2) {
			w = gch2.w
			if (gch2.y >= 0) {
				y = y_get(s.st, true, s.x, w)
				if (y > minmax[s.st].ymax)
					minmax[s.st].ymax = y
			} else {
				y = y_get(s.st, false, s.x, w)
				if (y < minmax[s.st].ymin)
					minmax[s.st].ymin = y
			}
		}
	}

	/* draw the chord indications if any */
	if (first_gchord) {
		for (i = 0; i <= nstaff; i++) {
			bot = staff_tb[i].botbar;
			minmax[i].ymin -= 3
			if (minmax[i].ymin > bot - 10)
				minmax[i].ymin = bot - 10
			top = staff_tb[i].topbar;
			minmax[i].ymax += 3
			if (minmax[i].ymax < top + 10)
				minmax[i].ymax = top + 10
		}
		set_sscale(-1)		/* restore the scale parameters */
		for (s = first_gchord; s; s = s.ts_next) {
			if (!s.a_gch)
				continue
//			switch (s.type) {
//			case NOTE:
//			case REST:
//			case SPACE:
//			case MREST:
//			case BAR:
//--fixme: what when gchord and repeat ?
//				if (s.text == undefined) // not a repeat bar
//					break
//			default:
//				continue
//			}
			draw_gchord(s, minmax[s.st].ymin,
					minmax[s.st].ymax)
		}
	}

	/* draw the repeat brackets */
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (p_voice.second || !p_voice.sym)
			continue
		draw_repbra(p_voice)
	}

	/* create the decorations tied to the staves */
	for (i = 0; i <= nstaff; i++)
		minmax[i] = {
			ymin: 0,
			ymax: 0
		}
	for (i = 0; i < nd; i++) {
		de = a_de[i];
		dd = de.dd
		if (!dd)		// if error
			continue
		if (!f_staff[dd.func]	/* if not tied to the staff */
		 || de.m != undefined)	// or head decoration
			continue
		func_tb[dd.func](de)
		if (dd.dd_en)		// if start
			continue
		if (cfmt.dynalign) {
			if (de.up) {
				if (de.y > minmax[de.st].ymax)
					minmax[de.st].ymax = de.y
			} else {
				if (de.y < minmax[de.st].ymin)
					minmax[de.st].ymin = de.y
			}
		}
	}

	/* and, if wanted, set them at a same vertical offset */
	for (i = 0; i < nd; i++) {
		de = a_de[i];
		dd = de.dd
		if (!dd)		// if error
			continue
		if (dd.dd_en		// if start
		 || !f_staff[dd.func])
			continue
		if (cfmt.dynalign) {
			if (de.up)
				y = minmax[de.st].ymax
			else
				y = minmax[de.st].ymin;
			de.y = y
		} else {
			y = de.y
		}
		if (de.up)
			y += dd.h;
		y_set(de.st, de.up, de.x, de.val, y)
	}
}

/* -- draw the measure bar numbers -- */
/* (scaled delayed output) */
function draw_measnb() {
	var	s, st, bar_num, x, y, w, any_nb, font_size,
		sy = cur_sy

	/* search the top staff */
	for (st = 0; st <= nstaff; st++) {
		if (sy.st_print[st])
			break
	}
	if (st > nstaff)
		return				/* no visible staff */
	set_dscale(st)

	/* leave the measure numbers as unscaled */
	if (staff_tb[st].staffscale != 1) {
		font_size = get_font("measure").size;
		param_set_font("measurefont", "* " +
			(font_size / staff_tb[st].staffscale).toString())
	}
	set_font("measure");

	s = tsfirst;				/* clef */
	bar_num = gene.nbar
	if (bar_num > 1) {
		if (cfmt.measurenb == 0) {
			any_nb = true;
			y = y_get(st, true, 0, 20)
			if (y < staff_tb[st].topbar + 14)
				y = staff_tb[st].topbar + 14;
			xy_str(0, y, bar_num.toString());
			y_set(st, true, 0, 20, y + gene.curfont.size + 2)
		} else if (bar_num % cfmt.measurenb == 0) {
			for ( ; ; s = s.ts_next) {
				switch (s.type) {
				case METER:
				case CLEF:
				case KEY:
				case STBRK:
					continue
				}
				break
			}
			while (s.st != st)
				s = s.ts_next
			if (s.prev && s.prev.type != CLEF)
				s = s.prev;
			x = s.x - s.wl;
			any_nb = true;
			w = cwid('0') * gene.curfont.swfac
			if (bar_num >= 10)
				w *= bar_num >= 100 ? 3 : 2
			if (cfmt.measurebox)
				w += 4;
			y = y_get(st, true, x, w)
			if (y < staff_tb[st].topbar + 6)
				y = staff_tb[st].topbar + 6;
			y += 2;
			if (cfmt.measurebox) {
				xy_str_b(x, y, bar_num.toString());
				w += 3
			} else {
				xy_str(x, y, bar_num.toString())
			}
			y += gene.curfont.size;
			y_set(st, true, x, w, y);
			s.ymx = y
		}
	}

	for ( ; s; s = s.ts_next) {
		switch (s.type) {
		case STAVES:
			sy = s.sy
			for (st = 0; st < nstaff; st++) {
				if (sy.st_print[st])
					break
			}
			set_sscale(st)
			continue
		default:
			continue
		case BAR:
			if (!s.bar_num)
				continue
			break
		}

		bar_num = s.bar_num
		if (cfmt.measurenb == 0
		 || (bar_num % cfmt.measurenb) != 0
		 || !s.next)
			continue
		if (!any_nb)
			any_nb = true;
		w = cwid('0') * gene.curfont.swfac
		if (bar_num >= 10)
			w *= bar_num >= 100 ? 3 : 2
		if (cfmt.measurebox)
			w += 4;
		x = s.x - w * .4;
		y = y_get(st, true, x, w)
		if (y < staff_tb[st].topbar + 6)
			y = staff_tb[st].topbar + 6
//fixme: can s.next be null?
		if (s.next.type == NOTE) {
//		if (s.next && s.next.type == NOTE) {
			if (s.next.stem > 0) {
				if (y < s.next.ys - gene.curfont.size)
					y = s.next.ys - gene.curfont.size
			} else {
				if (y < s.next.y)
					y = s.next.y
			}
		}
		y += 2;
		if (cfmt.measurebox) {
			xy_str_b(x, y, bar_num.toString());
			w += 3
		} else {
			xy_str(x, y, bar_num.toString())
		}
		y += gene.curfont.size;
		y_set(st, true, x, w, y);
		s.ymx = y
	}
	gene.nbar = bar_num

	if (font_size)
		param_set_font("measurefont", "* " + font_size.toString());
}

/* -- draw the note of the tempo -- */
function draw_notempo(s, x, y, dur, sc) {
	var	dx, p, dotx,
		elts = identify_note(s, dur),
		head = elts[0],
		dots = elts[1],
		nflags = elts[2]

	// protection against end of container
	if (stv_g.started) {
		output.push("</g>\n");
		stv_g.started = false
	}

	out_XYAB('<g transform="translate(X,Y) scale(F)">\n',
		x + 4, y + 2, sc)
	switch (head) {
	case OVAL:
		p = "HD"
		break
	case EMPTY:
		p = "Hd"
		break
	default:
		p = "hd"
		break
	}
	xygl(-posx, posy, p);
	dx = 4
	if (dots) {
		dotx = 9
		if (nflags > 0)
			dotx += 4
		switch (head) {
		case SQUARE:
			dotx += 3
			break
		case OVALBARS:
		case OVAL:
			dotx += 2
			break
		case EMPTY:
			dotx += 1
			break
		}
		dx = dotx * dots;
		dotx -= posx
		while (--dots >= 0) {
			xygl(dotx, posy, "dot");
			dotx += 3.5
		}
	}
	if (dur < BASE_LEN) {
		if (nflags <= 0) {
			out_stem(-posx, posy, 21)		// stem height
		} else {
			out_stem(-posx, posy, 21, false, nflags)
			if (dx < 6)
				dx = 6
		}
	}
	output.push('</g>\n')
	return (dx + 15) * sc
}

/* -- estimate the tempo width -- */
function tempo_width(s) {
	var	w = 0;

	set_font("tempo")
	if (s.tempo_str1)
		w = strw(s.tempo_str1)
	if (s.tempo_ca)
		w += strw(s.tempo_ca)
	if (s.tempo_notes)
		w += 10 * s.tempo_notes.length +
			6 + cwid(' ') * gene.curfont.swfac * 6 + 10
	if (s.tempo_str2)
		w += strw(s.tempo_str2)
	return w
}

/* - output a tempo --*/
function write_tempo(s, x, y) {
	var	j, dx,
		sc = .6 * gene.curfont.size / 15.0; //fixme: 15.0 = initial tempofont

	set_font("tempo")
	if (s.tempo_str1) {
		xy_str(x, y, s.tempo_str1);
		x += strw(s.tempo_str1) + 3
	}
	if (s.tempo_notes) {
		for (j = 0; j < s.tempo_notes.length; j++)
			x += draw_notempo(s, x, y, s.tempo_notes[j], sc);
		xy_str(x, y, "=");
		x += strw("= ")
		if (s.tempo_ca) {
			xy_str(x, y, s.tempo_ca);
			x += strw(s.tempo_ca) //+ 5
		}
		if (s.tempo) {
			xy_str(x, y, s.tempo.toString());
			dx = cwid('0') * gene.curfont.swfac;
			x += dx + 5
			if (s.tempo >= 10) {
				x += dx
				if (s.tempo >= 100)
					x += dx
			}
		} else {
			x += draw_notempo(s, x, y, s.new_beat, sc)
		}
	}
	if (s.tempo_str2)
		xy_str(x, y, s.tempo_str2)

	// don't display anymore
	s.del = true
}

/* -- draw the parts and the tempo information -- */
/* (the staves are being defined) */
function draw_partempo(st, top) {
	var	s, some_part, some_tempo, h, w, y,
		dy = 0,		/* put the tempo indication at top */
		ht = 0

	/* get the minimal y offset */
	var	ymin = staff_tb[st].topbar + 12,
		dosh = 0,
		shift = 1,
		x = 0
	for (s = tsfirst; s; s = s.ts_next) {
		if (s.type != TEMPO || s.del)
			continue
		if (!some_tempo)
			some_tempo = s;
		w = tempo_width(s);
		y = y_get(st, true, s.x - 5, w) + 2
		if (y > ymin)
			ymin = y
		if (x >= s.x - 5 && !(dosh & (shift >> 1)))
			dosh |= shift;
		shift <<= 1;
		x = s.x - 5 + w
	}
	if (some_tempo) {
		set_sscale(-1);
		set_font("tempo");
		ht = gene.curfont.size + 2 + 2;
		y = 2 - ht;
		h = y - ht
		if (dosh != 0)
			ht *= 2
		if (top < ymin + ht)
			dy = ymin + ht - top

		/* draw the tempo indications */
		for (s = some_tempo; s; s = s.ts_next) {
			if (s.type != TEMPO
			 || s.del)		// (displayed by %%titleformat)
				continue
			if (user.anno_start || user.anno_stop) {
				s.wl = 5;
				s.wr = 40;
				s.ymn = (dosh & 1) ? h : y;
				s.ymx = s.ymn + 14;
				anno_start(s)
			}
			/*fixme: cf left shift (-5)*/
			write_tempo(s, s.x - 5, (dosh & 1) ? h : y);
			anno_stop(s);
			dosh >>= 1
		}
	}

	/* then, put the parts */
/*fixme: should reduce vertical space if parts don't overlap tempo...*/
	ymin = staff_tb[st].topbar + 14
	for (s = tsfirst; s; s = s.ts_next) {
		if (s.type != PART)
			continue
		if (!some_part) {
			some_part = s;
			set_font("parts");
			h = gene.curfont.size + 2 + 2
						/* + cfmt.partsspace ?? */
		}
		w = strw(s.text);
		y = y_get(st, true, s.x - 10, w + 3) + 5
		if (ymin < y)
			ymin = y
	}
	if (some_part) {
		set_sscale(-1)
		if (top < ymin + h + ht)
			dy = ymin + h + ht - top

		for (s = some_part; s; s = s.ts_next) {
			if (s.type != PART)
				continue
			s.x -= 10;
			if (user.anno_start || user.anno_stop) {
				w = strw(s.text);
				s.wl = 0;
				s.wr = w;
				s.ymn = -ht - h;
				s.ymx = s.ymn + h;
				anno_start(s)
			}
			if (cfmt.partsbox)
				xy_str_b(s.x, 2 - ht - h, s.text)
			else
				xy_str(s.x, 2 - ht - h, s.text)
			anno_stop(s)
		}
	}
	return dy
}
// abc2svg - draw.js - draw functions
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

// constants
var	STEM_MIN	= 16,	/* min stem height under beams */
	STEM_MIN2	= 14,	/* ... for notes with two beams */
	STEM_MIN3	= 12,	/* ... for notes with three beams */
	STEM_MIN4	= 10,	/* ... for notes with four beams */
	STEM_CH_MIN	= 14,	/* min stem height for chords under beams */
	STEM_CH_MIN2	= 10,	/* ... for notes with two beams */
	STEM_CH_MIN3	= 9,	/* ... for notes with three beams */
	STEM_CH_MIN4	= 9,	/* ... for notes with four beams */
	BEAM_DEPTH	= 3.2,	/* width of a beam stroke */
	BEAM_OFFSET	= .25,	/* pos of flat beam relative to staff line */
	BEAM_SHIFT	= 5,	/* shift of second and third beams */
	BEAM_SLOPE	= .4,	/* max slope of a beam */
	BEAM_STUB	= 8,	/* length of stub for flag under beam */ 
	SLUR_SLOPE	= .5,	/* max slope of a slur */
	GSTEM		= 15,	/* grace note stem length */
	GSTEM_XOFF	= 2.3	/* x offset for grace note stem */

    var cache

/* -- compute the best vertical offset for the beams -- */
function b_pos(grace, stem, nflags, b) {
	var	top, bot, d1, d2,
		shift = !grace ? BEAM_SHIFT : 3.5,
		depth = !grace ? BEAM_DEPTH : 1.8

	/* -- up/down shift needed to get k*6 -- */
	function rnd6(y) {
		var iy = Math.round((y + 12) / 6) * 6 - 12
		return iy - y
	} // rnd6()

	if (stem > 0) {
		bot = b - (nflags - 1) * shift - depth
		if (bot > 26)
			return 0
		top = b
	} else {
		top = b + (nflags - 1) * shift + depth
		if (top < -2)
			return 0
		bot = b
	}

	d1 = rnd6(top - BEAM_OFFSET);
	d2 = rnd6(bot + BEAM_OFFSET)
	return d1 * d1 > d2 * d2 ? d2 : d1
}

/* duplicate a note for beaming continuation */
function sym_dup(s_orig) {
	var	m, note,
		s = clone(s_orig);

	s.invis = true
	delete s.text
	delete s.a_gch
	delete s.a_ly
	delete s.a_dd;
	s.notes = clone(s_orig.notes)
	for (m = 0; m <= s.nhd; m++) {
		note = s.notes[m] = clone(s_orig.notes[m])
		delete note.a_dcn
	}
	return s
}

/* -- calculate a beam -- */
/* (the staves may be defined or not) */
var min_tb = [
	[STEM_MIN, STEM_MIN,
		STEM_MIN2, STEM_MIN3, STEM_MIN4, STEM_MIN4],
	[STEM_CH_MIN, STEM_CH_MIN,
		STEM_CH_MIN2, STEM_CH_MIN3, STEM_CH_MIN4, STEM_CH_MIN4]
]

function calculate_beam(bm, s1) {
	var	s, s2, notes, nflags, st, v, two_staves, two_dir,
		x, y, ys, a, b, stem_err, max_stem_err,
		p_min, p_max, s_closest,
		stem_xoff, scale,
		visible, dy

	if (!s1.beam_st) {	/* beam from previous music line */
		s = sym_dup(s1);
		lkvsym(s, s1);
		lktsym(s, s1);
		s.x -= 12
		if (s.x > s1.prev.x + 12)
			s.x = s1.prev.x + 12;
		s.beam_st = true
		delete s.beam_end;
		s.tmp = true
		delete s.slur_start
		delete s.slur_end;
		s1 = s
	}

	/* search last note in beam */
	notes = nflags = 0;	/* set x positions, count notes and flags */
	two_staves = two_dir = false;
	st = s1.st;
	v = s1.v;
	stem_xoff = s1.grace ? GSTEM_XOFF : 3.5
	for (s2 = s1;  ;s2 = s2.next) {
		if (s2.type == NOTE) {
			if (s2.nflags > nflags)
				nflags = s2.nflags;
			notes++
			if (s2.st != st)
				two_staves = true
			if (s2.stem != s1.stem)
				two_dir = true
			if (!visible && !s2.invis
			 && (!s2.stemless || s2.trem2))
				visible = true
			if (s2.beam_end)
				break
		}
		if (!s2.next) {		/* beam towards next music line */
			for (; ; s2 = s2.prev) {
				if (s2.type == NOTE)
					break
			}
			s = sym_dup(s2);
			s.next = s2.next
			if (s.next)
				s.next.prev = s;
			s2.next = s;
			s.prev = s2;
			s.ts_next = s2.ts_next
			if (s.ts_next)
				s.ts_next.ts_prev = s;
			s2.ts_next = s;
			s.ts_prev = s2
			delete s.beam_st;
			s.beam_end = true;
			s.tmp = true
			delete s.slur_start
			delete s.slur_end
			s.x += 12
			if (s.x < realwidth - 12)
				s.x = realwidth - 12;
			s2 = s;
			notes++
			break
		}
	}

	// at least, must have a visible note with a stem
	if (!visible)
		return false;

	bm.s2 = s2			/* (don't display the flags) */

	if (staff_tb[st].y == 0) {	/* staves not defined */
		if (two_staves)
			return false
	} else {			/* staves defined */
//		if (!two_staves && !s1.grace) {
		if (!two_staves) {
			bm.s1 = s1;	/* beam already calculated */
			bm.a = (s1.ys- s2.ys) / (s1.xs - s2.xs);
			bm.b = s1.ys - s1.xs * bm.a + staff_tb[st].y;
			bm.nflags = nflags
			return true
		}
	}

	s_closest = s1;
	p_min = 100;
	p_max = 0
	for (s = s1; ; s = s.next) {
		if (s.type != NOTE)
			continue
		if ((scale = s.p_v.scale) == 1)
			scale = staff_tb[s.st].staffscale
		if (s.stem >= 0) {
			x = stem_xoff + s.notes[0].shhd
			if (s.notes[s.nhd].pit > p_max) {
				p_max = s.notes[s.nhd].pit;
				s_closest = s
			}
		} else {
			x = -stem_xoff + s.notes[s.nhd].shhd
			if (s.notes[0].pit < p_min) {
				p_min = s.notes[0].pit;
				s_closest = s
			}
		}
		s.xs = s.x + x * scale;
		if (s == s2)
			break
	}

	// have flat beams when asked
	if (cfmt.flatbeams)
		a = 0

	// if a note inside the beam is the closest to the beam, the beam is flat
	else if (!two_dir
	      && notes >= 3
	      && s_closest != s1 && s_closest != s2)
		a = 0

	y = s1.ys + staff_tb[st].y
	if (a == undefined)
		a = (s2.ys + staff_tb[s2.st].y - y) / (s2.xs - s1.xs)

	if (a != 0) {
		if (a > 0)
			a = BEAM_SLOPE * a / (BEAM_SLOPE + a) // max steepness for beam
		else
			a = BEAM_SLOPE * a / (BEAM_SLOPE - a);
	}

	b = y - a * s1.xs;

/*fixme: have a look again*/
	/* have room for the symbols in the staff */
	max_stem_err = 0;		/* check stem lengths */
	s = s1
	if (two_dir) {				/* 2 directions */
/*fixme: more to do*/
		ys = ((s1.grace ? 3.5 : BEAM_SHIFT) * (nflags - 1) +
			BEAM_DEPTH) * .5
		if (s1.stem != s2.stem && s1.nflags < s2.nflags)
			ys *= s2.stem
		else
			ys *= s1.stem;
		b += ys
	} else if (!s1.grace) {		/* normal notes */
		var beam_h = BEAM_DEPTH + BEAM_SHIFT * (nflags - 1)
//--fixme: added for abc2svg
		while (s.ts_prev
		    && s.ts_prev.type == NOTE
		    && s.ts_prev.time == s.time
		    && s.ts_prev.x > s1.xs)
			s = s.ts_prev

		for (; s && s.time <= s2.time; s = s.ts_next) {
			if (s.type != NOTE
			 || s.invis
			 || (s.st != st
			  && s.v != v)) {
				continue
			}
			x = s.v == v ? s.xs : s.x;
			ys = a * x + b - staff_tb[s.st].y
			if (s.v == v) {
				stem_err = min_tb[s.nhd == 0 ? 0 : 1][s.nflags]
				if (s.stem > 0) {
					if (s.notes[s.nhd].pit > 26) {
						stem_err -= 2
						if (s.notes[s.nhd].pit > 28)
							stem_err -= 2
					}
					stem_err -= ys - 3 * (s.notes[s.nhd].pit - 18)
				} else {
					if (s.notes[0].pit < 18) {
						stem_err -= 2
						if (s.notes[0].pit < 16)
							stem_err -= 2
					}
					stem_err -= 3 * (s.notes[0].pit - 18) - ys
				}
				stem_err += BEAM_DEPTH + BEAM_SHIFT * (s.nflags - 1)
			} else {
/*fixme: KO when two_staves*/
				if (s1.stem > 0) {
					if (s.stem > 0) {
/*fixme: KO when the voice numbers are inverted*/
						if (s.ymn > ys + 4
						 || s.ymx < ys - beam_h - 2)
							continue
						if (s.v > v)
							stem_err = s.ymx - ys
						else
							stem_err = s.ymn + 8 - ys
					} else {
						stem_err = s.ymx - ys
					}
				} else {
					if (s.stem < 0) {
						if (s.ymx < ys - 4
						 || s.ymn > ys - beam_h - 2)
							continue
						if (s.v < v)
							stem_err = ys - s.ymn
						else
							stem_err = ys - s.ymx + 8
					} else {
						stem_err = ys - s.ymn
					}
				}
				stem_err += 2 + beam_h
			}
			if (stem_err > max_stem_err)
				max_stem_err = stem_err
		}
	} else {				/* grace notes */
		for ( ; ; s = s.next) {
			ys = a * s.xs + b - staff_tb[s.st].y;
			stem_err = GSTEM - 2
			if (s.stem > 0)
				stem_err -= ys - (3 * (s.notes[s.nhd].pit - 18))
			else
				stem_err += ys - (3 * (s.notes[0].pit - 18));
			stem_err += 3 * (s.nflags - 1)
			if (stem_err > max_stem_err)
				max_stem_err = stem_err
			if (s == s2)
				break
		}
	}

	if (max_stem_err > 0)		/* shift beam if stems too short */
		b += s1.stem * max_stem_err

	/* have room for the gracenotes, bars and clefs */
/*fixme: test*/
    if (!two_staves && !two_dir)
	for (s = s1.next; ; s = s.next) {
		var g
		switch (s.type) {
		case REST:		/* cannot move rests in multi-voices */
			g = s.ts_next
			if (!g || g.st != st
			 || (g.type != NOTE && g.type != REST))
				break
//fixme:too much vertical shift if some space above the note
//fixme:this does not fix rest under beam in second voice (ts_prev)
			/*fall thru*/
		case BAR:
			if (s.invis)
				break
			/*fall thru*/
		case CLEF:
			y = a * s.x + b
			if (s1.stem > 0) {
				y = s.ymx - y
					+ BEAM_DEPTH + BEAM_SHIFT * (nflags - 1)
					+ 2
				if (y > 0)
					b += y
			} else {
				y = s.ymn - y
					- BEAM_DEPTH - BEAM_SHIFT * (nflags - 1)
					- 2
				if (y < 0)
					b += y
			}
			break
		case GRACE:
			for (g = s.extra; g; g = g.next) {
				y = a * g.x + b
				if (s1.stem > 0) {
					y = g.ymx - y
						+ BEAM_DEPTH + BEAM_SHIFT * (nflags - 1)
						+ 2
					if (y > 0)
						b += y
				} else {
					y = g.ymn - y
						- BEAM_DEPTH - BEAM_SHIFT * (nflags - 1)
						- 2
					if (y < 0)
						b += y
				}
			}
			break
		}
		if (s == s2)
			break
	}

	if (a == 0)		/* shift flat beams onto staff lines */
		b += b_pos(s1.grace, s1.stem, nflags, b - staff_tb[st].y)

	/* adjust final stems and rests under beam */
	for (s = s1; ; s = s.next) {
		switch (s.type) {
		case NOTE:
			s.ys = a * s.xs + b - staff_tb[s.st].y
			if (s.stem > 0) {
				s.ymx = s.ys + 2.5
//fixme: hack
				if (s.ts_prev
				 && s.ts_prev.stem > 0
				 && s.ts_prev.st == s.st
				 && s.ts_prev.ymn < s.ymx
				 && s.ts_prev.x == s.x
				 && s.notes[0].shhd == 0) {
					s.ts_prev.x -= 5;	/* fix stem clash */
					s.ts_prev.xs -= 5
				}
			} else {
				s.ymn = s.ys - 2.5
			}
			break
		case REST:
			y = a * s.x + b - staff_tb[s.st].y
			dy = BEAM_DEPTH + BEAM_SHIFT * (nflags - 1)
				+ (s.head != FULL ? 4 : 9)
			if (s1.stem > 0) {
				y -= dy
				if (s1.multi == 0 && y > 12)
					y = 12
				if (s.y <= y)
					break
			} else {
				y += dy
				if (s1.multi == 0 && y < 12)
					y = 12
				if (s.y >= y)
					break
			}
			if (s.head != FULL)
				y = (((y + 3 + 12) / 6) | 0) * 6 - 12;
			s.y = y
			break
		}
		if (s == s2)
			break
	}

	/* save beam parameters */
	if (staff_tb[st].y == 0)	/* if staves not defined */
		return false
	bm.s1 = s1;
	bm.a = a;
	bm.b = b;
	bm.nflags = nflags
	return true
}

/* -- draw the beams for one word -- */
/* (the staves are defined) */
function draw_beams(bm) {
	var	s, i, beam_dir, shift, bshift, bstub, bh, da,
		k, k1, k2, x1,
		s1 = bm.s1,
		s2 = bm.s2

	/* -- draw a single beam -- */
	function draw_beam(x1, x2, dy, h, bm,
				 n) {		/* beam number (1..n) */
		var	y1, dy2,
			s = bm.s1,
			nflags = s.nflags

		if (s.ntrem)
			nflags -= s.ntrem
		if (s.trem2 && n > nflags) {
			if (s.dur >= BASE_LEN / 2) {
				x1 = s.x + 6;
				x2 = bm.s2.x - 6
			} else if (s.dur < BASE_LEN / 4) {
				x1 += 5;
				x2 -= 6
			}
		}

		y1 = bm.a * x1 + bm.b - dy;
		x2 -= x1;
	//--fixme: scale (bm.a already scaled!)
		x2 /= stv_g.scale;
		dy2 = bm.a * x2 * stv_g.scale;
		xypath(x1, y1, true);
		output.push('l' + x2.toFixed(2) + ' ' + (-dy2).toFixed(2) +
			'v' + h.toFixed(2) +
			'l' + (-x2).toFixed(2) + ' ' + dy2.toFixed(2) +
			'"/>\n')
	} // draw_beam()

	anno_start(s1, 'beam')
/*fixme: KO if many staves with different scales*/
//	set_scale(s1)
	if (!s1.grace) {
		bshift = BEAM_SHIFT;
		bstub = BEAM_STUB;
		shift = .34;		/* (half width of the stem) */
		bh = BEAM_DEPTH
	} else {
		bshift = 3.5;
		bstub = 3.2;
		shift = .29;
		bh = 1.8
	}

/*fixme: quick hack for stubs at end of beam and different stem directions*/
	beam_dir = s1.stem
	if (s1.stem != s2.stem
	 && s1.nflags < s2.nflags)
		beam_dir = s2.stem
	if (beam_dir < 0)
		bh = -bh;

	/* make first beam over whole word and adjust the stem lengths */
	draw_beam(s1.xs - shift, s2.xs + shift, 0, bh, bm, 1);
	da = 0
	for (s = s1; ; s = s.next) {
		if (s.type == NOTE
		 && s.stem != beam_dir)
			s.ys = bm.a * s.xs + bm.b
				- staff_tb[s.st].y
				+ bshift * (s.nflags - 1) * s.stem
				- bh
		if (s == s2)
			break
	}

	if (s1.feathered_beam) {
		da = bshift / (s2.xs - s1.xs)
		if (s1.feathered_beam > 0) {
			da = -da;
			bshift = da * s1.xs
		} else {
			bshift = da * s2.xs
		}
		da = da * beam_dir
	}

	/* other beams with two or more flags */
	shift = 0
	for (i = 2; i <= bm.nflags; i++) {
		shift += bshift
		if (da != 0)
			bm.a += da
		for (s = s1; ; s = s.next) {
			if (s.type != NOTE
			 || s.nflags < i) {
				if (s == s2)
					break
				continue
			}
			if (s.trem1
			 && i > s.nflags - s.ntrem) {
				x1 = (s.dur >= BASE_LEN / 2) ? s.x : s.xs;
				draw_beam(x1 - 5, x1 + 5,
					  (shift + 2.5) * beam_dir,
					  bh, bm, i)
				if (s == s2)
					break
				continue
			}
			k1 = s
			while (1) {
				if (s == s2)
					break
				k = s.next
				if (k.type == NOTE || k.type == REST) {
					if (k.trem1){
						if (k.nflags - k.ntrem < i)
							break
					} else if (k.nflags < i) {
						break
					}
				}
				if (k.beam_br1
				 || (k.beam_br2 && i > 2))
					break
				s = k
			}
			k2 = s
			while (k2.type != NOTE)
				k2 = k2.prev;
			x1 = k1.xs
			if (k1 == k2) {
				if (k1 == s1) {
					x1 += bstub
				} else if (k1 == s2) {
					x1 -= bstub
				} else if (k1.beam_br1
				        || (k1.beam_br2
					 && i > 2)) {
					x1 += bstub
				} else {
					k = k1.next
					while (k.type != NOTE)
						k = k.next
					if (k.beam_br1
					 || (k.beam_br2 && i > 2)) {
						x1 -= bstub
					} else {
						k1 = k1.prev
						while (k1.type != NOTE)
							k1 = k1.prev
						if (k1.nflags < k.nflags
						 || (k1.nflags == k.nflags
						  && k1.dots < k.dots))
							x1 += bstub
						else
							x1 -= bstub
					}
				}
			}
			draw_beam(x1, k2.xs,
				  shift * beam_dir,
				  bh, bm, i)
			if (s == s2)
				break
		}
	}
	if (s1.tmp)
		unlksym(s1)
	else if (s2.tmp)
		unlksym(s2)
	anno_stop(s1, 'beam')
}

/* -- draw the left side of the staves -- */
function draw_lstaff(x) {
//	if (cfmt.alignbars)
//		return
	var	i, j, yb, h,
		nst = cur_sy.nstaff,
		l = 0

	/* -- draw a system brace or bracket -- */
	function draw_sysbra(x, st, flag) {
		var i, st_end, yt, yb

		while (!cur_sy.st_print[st]) {
			if (cur_sy.staves[st].flags & flag)
				return
			st++
		}
		i = st_end = st
		while (1) {
			if (cur_sy.st_print[i])
				st_end = i
			if (cur_sy.staves[i].flags & flag)
				break
			i++
		}
		yt = staff_tb[st].y + staff_tb[st].topbar
					* staff_tb[st].staffscale;
		yb = staff_tb[st_end].y + staff_tb[st_end].botbar
					* staff_tb[st_end].staffscale
		if (flag & (CLOSE_BRACE | CLOSE_BRACE2))
			out_brace(x, yb, yt - yb)
		else
			out_bracket(x, yt, yt - yb)
	}

	for (i = 0; ; i++) {
		if (cur_sy.staves[i].flags & (OPEN_BRACE | OPEN_BRACKET))
			l++
		if (cur_sy.st_print[i])
			break
		if (cur_sy.staves[i].flags & (CLOSE_BRACE | CLOSE_BRACKET))
			l--
		if (i == nst)
			break
	}
	for (j = nst; j > i; j--) {
		if (cur_sy.st_print[j])
			break
	}
	if (i == j && l == 0)
		return
	yb = staff_tb[j].y + staff_tb[j].botbar * staff_tb[j].staffscale;
	h = staff_tb[i].y + staff_tb[i].topbar * staff_tb[i].staffscale - yb;
	xypath(x, yb);
	output.push("v" + (-h).toFixed(2) + '"/>\n')
	for (i = 0; i <= nst; i++) {
		if (cur_sy.staves[i].flags & OPEN_BRACE)
			draw_sysbra(x, i, CLOSE_BRACE)
		if (cur_sy.staves[i].flags & OPEN_BRACKET)
			draw_sysbra(x, i, CLOSE_BRACKET)
		if (cur_sy.staves[i].flags & OPEN_BRACE2)
			draw_sysbra(x - 6, i, CLOSE_BRACE2)
		if (cur_sy.staves[i].flags & OPEN_BRACKET2)
			draw_sysbra(x - 6, i, CLOSE_BRACKET2)
	}
}

/* -- draw the time signature -- */
function draw_meter(x, s) {
	if (!s.a_meter)
		return
	var	dx, i,
		st = s.st,
		y = staff_tb[st].y;
	x -= s.wl
	for (i = 0; i < s.a_meter.length; i++) {
		var	f,
			meter = s.a_meter[i]

		if (meter.top == "C|")
			dx = 13
		else
			dx = 13 * meter.top.length
		if (meter.bot) {
			if (meter.bot.length > meter.top.length)
				dx = 13 * meter.bot.length;
			out_XYAB('<g style="font-family:serif; font-weight:bold; font-size: 16px"\n\
	transform="translate(X,Y) scale(1.2,1)">\n\
	<text y="-12" text-anchor="middle">A</text>\n\
	<text text-anchor="middle">B</text>\n\
</g>\n', x + dx * .5, y, meter.top, meter.bot)
		} else {
			switch (meter.top[0]) {
			case 'C':
				f = meter.top[1] != '|' ? "csig" : "ctsig";
				x -= 5;
				y += 12
				break
			case 'c':
				f = meter.top[1] != '.' ? "imsig" : "iMsig"
				break
			case 'o':
				f = meter.top[1] != '.' ? "pmsig" : "pMsig"
				break
			default:
				out_XYAB('<g style="font-family:serif; font-weight:bold; font-size: 18px"\n\
	transform="translate(X,Y) scale(1.2,1)">\n\
	<text y="-6" text-anchor="middle">A</text>\n\
</g>\n', x + dx * .5, y, meter.top)
				break
			}
		}
		if (f)
			xygl(x + dx * .5, y, f);
		x += dx
	}
}

/* -- draw an accidental -- */
function draw_acc(x, y, acc,
			micro_n,
			micro_d) {
	if (micro_n) {
		if (micro_n == micro_d) {
			acc = acc == -1 ?	// flat
				-2 : 2		// double flat : sharp
		} else if (micro_n * 2 != micro_d) {
			xygl(x, y, "acc" + acc + '_' + micro_n + '_' + micro_d)
			return
		}
	}
	xygl(x, y, "acc" + acc)
}

// draw helper lines between yl and yu
//fixme: double lines when needed for different voices
//fixme: no helper inside staff when holes
function draw_hl(x, yl, yu, st, hltype) {
	var	i,
		p_staff = staff_tb[st],
		staffb = p_staff.y,
//		stafflines = p_staff.stafflines,
		top = (p_staff.stafflines.length - 1) * 6;

//	if (top - p_staff.botline < 4)
//		return			// no helper lines when staff < 4 lines

	yl = Math.ceil(yl / 6) * 6
	for (; yl < p_staff.botline; yl += 6)
		xygl(x, staffb + yl, hltype);
	yu -= yu % 6
	for (; yu > top; yu -= 6)
		xygl(x, staffb + yu, hltype)
//	if (yl > top)
//		yl = top
//	if (yu < p_staff.botline)
//		yu = p_staff.botline;
//	for (; yl <= yu; yl += 6) {
//		if (stafflines[yl / 6] != '|')
//			xygl(x, staffb + yl, hltype)	// hole
//	}
}

/* -- draw a key signature -- */
var	sharp_cl = new Int8Array([24, 9, 15, 21, 6, 12, 18]),
	flat_cl = new Int8Array([12, 18, 24, 9, 15, 21, 6]),
	sharp1 = new Int8Array([-9, 12, -9, -9, 12, -9]),
	sharp2 = new Int8Array([12, -9, 12, -9, 12, -9]),
	flat1 = new Int8Array([9, -12, 9, -12, 9, -12]),
	flat2 = new Int8Array([-12, 9, -12, 9, -12, 9])

function draw_keysig(p_voice, x, s) {
	if (s.k_none)
		return
	var	old_sf = s.k_old_sf,
		st = p_voice.st,
		staffb = staff_tb[st].y,
		i, shift, p_seq,
		clef_ix = s.k_y_clef

	if (clef_ix & 1)
		clef_ix += 7;
	clef_ix /= 2
	while (clef_ix < 0)
		clef_ix += 7;
	clef_ix %= 7

	/* normal accidentals */
	if (!s.k_a_acc) {

		/* put neutrals if 'accidental cancel' */
		if (cfmt.cancelkey || s.k_sf == 0) {

			/* when flats to sharps, or sharps to flats, */
			if (s.k_sf == 0
			 || old_sf * s.k_sf < 0) {

				/* old sharps */
				shift = sharp_cl[clef_ix];
				p_seq = shift > 9 ? sharp1 : sharp2
				for (i = 0; i < old_sf; i++) {
					xygl(x, staffb + shift, "acc3");
					shift += p_seq[i];
					x += 5.5
				}

				/* old flats */
				shift = flat_cl[clef_ix];
				p_seq = shift < 18 ? flat1 : flat2
				for (i = 0; i > old_sf; i--) {
					xygl(x, staffb + shift, "acc3");
					shift += p_seq[-i];
					x += 5.5
				}
				if (s.k_sf != 0)
					x += 3		/* extra space */
			}
		}

		/* new sharps */
		if (s.k_sf > 0) {
			shift = sharp_cl[clef_ix];
			p_seq = shift > 9 ? sharp1 : sharp2
			for (i = 0; i < s.k_sf; i++) {
				xygl(x, staffb + shift, "acc1");
				shift += p_seq[i];
				x += 5.5
			}
			if (cfmt.cancelkey && i < old_sf) {
				x += 2
				for (; i < old_sf; i++) {
					xygl(x, staffb + shift, "acc3");
					shift += p_seq[i];
					x += 5.5
				}
			}
		}

		/* new flats */
		if (s.k_sf < 0) {
			shift = flat_cl[clef_ix];
			p_seq = shift < 18 ? flat1 : flat2
			for (i = 0; i > s.k_sf; i--) {
				xygl(x, staffb + shift, "acc-1");
				shift += p_seq[-i];
				x += 5.5
			}
			if (cfmt.cancelkey && i > old_sf) {
				x += 2
				for (; i > old_sf; i--) {
					xygl(x, staffb + shift, "acc3");
					shift += p_seq[-i];
					x += 5.5
				}
			}
		}
	} else if (s.k_a_acc.length) {

		/* explicit accidentals */
		var	acc,
			last_acc = s.k_a_acc[0].acc,
			last_shift = 100

		for (i = 0; i < s.k_a_acc.length; i++) {
			acc = s.k_a_acc[i];
			shift = (s.k_y_clef	// clef shift
				+ acc.pit - 18) * 3
			if (i != 0
			 && (shift > last_shift + 18
			  || shift < last_shift - 18))
				x -= 5.5		// no clash
			else if (acc.acc != last_acc)
				x += 3;
			last_acc = acc.acc;
			draw_hl(x, shift, shift, st, "hl");
			last_shift = shift;
			draw_acc(x, staffb + shift,
				 acc.acc, acc.micro_n, acc.micro_d);
			x += 5.5
		}
	}
}

/* -- convert the standard measure bars -- */
function bar_cnv(bar_type) {
	switch (bar_type) {
	case "[":
	case "[]":
		return ""			/* invisible */
	case "|:":
	case "|::":
	case "|:::":
		return "[" + bar_type		/* |::: -> [|::: */
	case ":|":
	case "::|":
	case ":::|":
		return bar_type + "]"		/* :..| -> :..|] */
	case "::":
		return cfmt.dblrepbar		/* :: -> double repeat bar */
	case '||:':
		return '[|:'
	}
	return bar_type
}

/* -- draw a measure bar -- */
function draw_bar(s, bot, h) {
	var	i, s2, yb, bar_type,
		st = s.st,
		x = s.x

	bar_type = bar_cnv(s.bar_type)
	if (!bar_type)
		return				/* invisible */

	/* don't put a line between the staves if there is no bar above */
	if (st != 0
	 && s.ts_prev
//fixme: 's.ts_prev.st != st - 1' when floating voice in lower staff
//	 && (s.ts_prev.type != BAR || s.ts_prev.st != st - 1))
	 && s.ts_prev.type != BAR)
		h = staff_tb[st].topbar * staff_tb[st].staffscale;

	s.ymx = s.ymn + h;
	set_sscale(-1);
	anno_start(s)

	/* if measure repeat, draw the '%' like glyphs */
	if (s.bar_mrep) {
		yb = staff_tb[st].y + 12;
		set_sscale(st)
		if (s.bar_mrep == 1) {
			for (s2 = s.prev; s2.type != REST; s2 = s2.prev)
				;
			xygl(s2.x, yb, "mrep")
		} else {
			xygl(x, yb, "mrep2")
			if (s.v == cur_sy.top_voice) {
				set_font("annotation");
				xy_str(x, yb + staff_tb[st].topbar - 9,
						s.bar_mrep.toString(), "c")
			}
		}
	}

	for (i = bar_type.length; --i >= 0; ) {
		switch (bar_type[i]) {
		case "|":
			set_sscale(-1);
			out_bar(x, bot, h, s.bar_dotted)
			break
		default:
//		case "[":
//		case "]":
			x -= 3;
			set_sscale(-1);
			out_thbar(x, bot, h)
			break
		case ":":
			x -= 2;
			set_sscale(st);
			xygl(x + 1, staff_tb[st].y, "rdots")
			break
		}
		x -= 3
	}
	set_sscale(-1);
	anno_stop(s)
}

/* -- draw a rest -- */
/* (the staves are defined) */
var rest_tb = [
	"r128", "r64", "r32", "r16", "r8",
	"r4",
	"r2", "r1", "r0", "r00"]

function draw_rest(s) {
	var	s2, i, j, x, y, dotx, staffb, yb, yt, head,
		p_staff = staff_tb[s.st]

	/* don't display the rests of invisible staves */
	/* (must do this here for voices out of their normal staff) */
	if (!p_staff.topbar)
		return

	/* if rest alone in the measure or measure repeat, center */
	if (s.dur == s.p_v.meter.wmeasure
	 || (s.rep_nb && s.rep_nb >= 0)) {

		/* don't use next/prev: there is no bar in voice overlay */
		s2 = s.ts_next
		while (s2 && s2.time != s.time + s.dur)
			s2 = s2.ts_next;
		x = s2 ? s2.x : realwidth;
		s2 = s
		while (!s2.seqst)
			s2 = s2.ts_prev;
		s2 = s2.ts_prev;
		x = (x + s2.x) / 2

		/* center the associated decorations */
		if (s.a_dd)
			deco_update(s, x - s.x);
		s.x = x
	} else {
		x = s.x
		if (s.notes[0].shhd)
			x += s.notes[0].shhd * stv_g.scale
	}
	if (s.invis)
		return

	staffb = p_staff.y			/* bottom of staff */

	if (s.rep_nb) {
		set_sscale(s.st);
		anno_start(s);
		staffb += 12
		if (s.rep_nb < 0) {
			xygl(x, staffb, "srep")
		} else {
			xygl(x, staffb, "mrep")
			if (s.rep_nb > 2 && s.v == cur_sy.top_voice) {
				set_font("annotation");
				xy_str(x, staffb + p_staff.topbar - 9,
					s.rep_nb.toString(), "c")
			}
		}
		anno_stop(s)
		return
	}

	set_scale(s);
	anno_start(s);

	y = s.y;

	i = 5 - s.nflags		/* rest_tb index (5 = C_XFLAGS) */
	if (i == 7 && y == 12
	 && p_staff.stafflines.length <= 2)
		y -= 6				/* semibreve a bit lower */

	// draw the rest
	xygl(x, y + staffb, s.notes[0].head ? s.notes[0].head : rest_tb[i])

	/* output ledger line(s) when greater than minim */
	if (i >= 6) {
		j = y / 6
		switch (i) {
		default:
			switch (p_staff.stafflines[j + 1]) {
			case '|':
			case '[':
				break
			default:
				xygl(x, y + 6 + staffb, "hl1")
				break
			}
			if (i == 9) {			/* longa */
				y -= 6;
				j--
			}
			break
		case 7:					/* semibreve */
			y += 6;
			j++
		case 6:					/* minim */
			break
		}
		switch (p_staff.stafflines[j]) {
		case '|':
		case '[':
			break
		default:
			xygl(x, y + staffb, "hl1")
			break
		}
	}
	x += 8;
	y += staffb + 3
	for (i = 0; i < s.dots; i++) {
		xygl(x, y, "dot");
		x += 3.5
	}
	anno_stop(s)
}

/* -- draw grace notes -- */
/* (the staves are defined) */
function draw_gracenotes(s) {
	var	yy, x0, y0, x1, y1, x2, y2, x3, y3, bet1, bet2,
		dy1, dy2, g, last, note,
		bm = {}

	/* draw the notes */
//	bm.s2 = undefined			/* (draw flags) */
	for (g = s.extra; g; g = g.next) {
		if (g.beam_st && !g.beam_end) {
			if (calculate_beam(bm, g))
				draw_beams(bm)
		}
		anno_start(g);
		draw_note(g, !bm.s2)
		if (g == bm.s2)
			bm.s2 = null			/* (draw flags again) */
		anno_stop(g)
		if (!g.next)
			break			/* (keep the last note) */
	}

	// if an acciaccatura, draw a bar 
	if (s.sappo) {
		g = s.extra
		if (!g.next) {			/* if one note */
			x1 = 9;
			y1 = g.stem > 0 ? 5 : -5
		} else {			/* many notes */
			x1 = (g.next.x - g.x) * .5 + 4;
			y1 = (g.ys + g.next.ys) * .5 - g.y
			if (g.stem > 0)
				y1 -= 1
			else
				y1 += 1
		}
		note = g.notes[g.stem < 0 ? 0 : g.nhd];
		out_acciac(x_head(g, note), y_head(g, note),
				x1, y1, g.stem > 0)
	}

	/* slur */
//fixme: have a full key symbol in voice
	if (s.p_v.key.k_bagpipe			/* no slur when bagpipe */
	 || !cfmt.graceslurs
	 || s.slur_start			/* explicit slur */
	 || !s.next
	 || s.next.type != NOTE)
		return
	last = g
	if (last.stem >= 0) {
		yy = 127
		for (g = s.extra; g; g = g.next) {
			if (g.y < yy) {
				yy = g.y;
				last = g
			}
		}
		x0 = last.x;
		y0 = last.y - 5
		if (s.extra != last) {
			x0 -= 4;
			y0 += 1
		}
		s = s.next;
		x3 = s.x - 1
		if (s.stem < 0)
			x3 -= 4;
		y3 = 3 * (s.notes[0].pit - 18) - 5;
		dy1 = (x3 - x0) * .4
		if (dy1 > 3)
			dy1 = 3;
		dy2 = dy1;
		bet1 = .2;
		bet2 = .8
		if (y0 > y3 + 7) {
			x0 = last.x - 1;
			y0 += .5;
			y3 += 6.5;
			x3 = s.x - 5.5;
			dy1 = (y0 - y3) * .8;
			dy2 = (y0 - y3) * .2;
			bet1 = 0
		} else if (y3 > y0 + 4) {
			y3 = y0 + 4;
			x0 = last.x + 2;
			y0 = last.y - 4
		}
	} else {
		yy = -127
		for (g = s.extra; g; g = g.next) {
			if (g.y > yy) {
				yy = g.y;
				last = g
			}
		}
		x0 = last.x;
		y0 = last.y + 5
		if (s.extra != last) {
			x0 -= 4;
			y0 -= 1
		}
		s = s.next;
		x3 = s.x - 1
		if (s.stem >= 0)
			x3 -= 2;
		y3 = 3 * (s.notes[s.nhd].pit - 18) + 5;
		dy1 = (x0 - x3) * .4
		if (dy1 < -3)
			dy1 = -3;
		dy2 = dy1;
		bet1 = .2;
		bet2 = .8
		if (y0 < y3 - 7) {
			x0 = last.x - 1;
			y0 -= .5;
			y3 -= 6.5;
			x3 = s.x - 5.5;
			dy1 = (y0 - y3) * .8;
			dy2 = (y0 - y3) * .2;
			bet1 = 0
		} else if (y3 < y0 - 4) {
			y3 = y0 - 4;
			x0 = last.x + 2;
			y0 = last.y + 4
		}
	}

	x1 = bet1 * x3 + (1 - bet1) * x0 - x0;
	y1 = bet1 * y3 + (1 - bet1) * y0 - dy1 - y0;
	x2 = bet2 * x3 + (1 - bet2) * x0 - x0;
	y2 = bet2 * y3 + (1 - bet2) * y0 - dy2 - y0;

	anno_start(s, 'slur');
	xypath(x0, y0 + staff_tb[s.st].y);
	output.push('c' + x1.toFixed(2) + ' ' + (-y1).toFixed(2) +
		' ' + x2.toFixed(2) + ' ' + (-y2).toFixed(2) +
		' ' + (x3 - x0).toFixed(2) + ' ' + (-y3 + y0).toFixed(2) + '"/>\n');
	anno_stop(s, 'slur')
}

/* -- set the y offset of the dots -- */
function setdoty(s, y_tb) {
	var m, m1, y

	/* set the normal offsets */
	for (m = 0; m <= s.nhd; m++) {
		y = 3 * (s.notes[m].pit - 18)	/* note height on staff */
		if ((y % 6) == 0) {
			if (s.dot_low)
				y -= 3
			else
				y += 3
		}
		y_tb[m] = y
	}
	/* dispatch and recenter the dots in the staff spaces */
	for (m = 0; m < s.nhd; m++) {
		if (y_tb[m + 1] > y_tb[m])
			continue
		m1 = m
		while (m1 > 0) {
			if (y_tb[m1] > y_tb[m1 - 1] + 6)
				break
			m1--
		}
		if (3 * (s.notes[m1].pit - 18) - y_tb[m1]
				< y_tb[m + 1] - 3 * (s.notes[m + 1].pit - 18)) {
			while (m1 <= m)
				y_tb[m1++] -= 6
		} else {
			y_tb[m + 1] = y_tb[m] + 6
		}
	}
}

// get the x and y position of a note head
// (when the staves are defined)
function x_head(s, note) {
	return s.x + note.shhd
}
function y_head(s, note) {
	return staff_tb[s.st].y + 3 * (note.pit - 18)
}

/* -- draw m-th head with accidentals and dots -- */
/* (the staves are defined) */
// sets {x,y}_note
function draw_basic_note(x, s, m, y_tb) {
	var	i, k, y, p, yy, dotx, doty,
		old_color = false,
		note = s.notes[m],
		staffb = staff_tb[s.st].y,	/* bottom of staff */
		y = 3 * (note.pit - 18),	/* note height on staff */
		shhd = note.shhd * stv_g.scale,
		x_note = x + shhd,
		y_note = y + staffb

//	/* special case for voice unison */
//	if (s.nohdi1 != undefined
//	 && m >= s.nohdi1 && m < s.nohdi2)
//		return

	var	elts = identify_note(s, note.dur),
		head = elts[0],
		dots = elts[1],
		nflags = elts[2]

	/* output a ledger line if horizontal shift / chord
	 * and note on a line */
	if (y % 6 == 0
	 && shhd != (s.stem > 0 ? s.notes[0].shhd : s.notes[s.nhd].shhd)) {
		yy = 0
		if (y >= 30) {
			yy = y
			if (yy % 6)
				yy -= 3
		} else if (y <= -6) {
			yy = y
			if (yy % 6)
				yy += 3
		}
		if (yy)
			xygl(x_note, yy + staffb, "hl")
	}

	/* draw the head */
	if (note.invis) {
		;
	} else if (s.grace) {			// don't apply %%map to grace notes
		p = "ghd";
		x_note -= 4.5 * stv_g.scale
	} else if (note.map && note.map[0]) {
		i = s.head;
		p = note.map[0][i]		// heads
		if (!p)
			p = note.map[0][note.map[0].length - 1]
		i = p.indexOf('/')
		if (i >= 0) {			// stem dependant
			if (s.stem >= 0)
				p = p.slice(0, i)
			else
				p = p.slice(i + 1)
		}
	} else if (s.type == CUSTOS) {
		p = "custos"
	} else {
		switch (head) {
		case OVAL:
			p = "HD"
			break
		case OVALBARS:
			if (s.head != SQUARE) {
				p = "HDD"
				break
			}
			// fall thru
		case SQUARE:
			p = note.dur < BASE_LEN * 4 ? "breve" : "longa"

			/* don't display dots on last note of the tune */
			if (!tsnext && s.next
			 && s.next.type == BAR && !s.next.next)
				dots = 0
			break
		case EMPTY:
			p = "Hd"		// white note
			break
		default:			// black note
			p = "hd"
			break
		}
	}
	if (note.color)
		old_color = set_color(note.color)
	else if (note.map && note.map[2])
		old_color = set_color(note.map[2])
	if (p) {
		if (!psxygl(x_note, y_note, p))
			xygl(x_note, y_note, p)
	}

	/* draw the dots */
/*fixme: to see for grace notes*/
	if (dots) {
		dotx = x + (7.7 + s.xmx) * stv_g.scale
		if (y_tb[m] == undefined) {
			y_tb[m] = 3 * (s.notes[m].pit - 18)
			if ((s.notes[m].pit & 1) == 0)
				y_tb[m] += 3
		}
		doty = y_tb[m] + staffb
		while (--dots >= 0) {
			xygl(dotx, doty, "dot");
			dotx += 3.5
		}
	}

	/* draw the accidental */
	if (note.acc) {
		x -= note.shac * stv_g.scale
		if (!s.grace) {
			draw_acc(x, y + staffb,
				 note.acc, note.micro_n, note.micro_d)
		} else {
			g_open(x, y + staffb, 0, .75);
			draw_acc(0, 0, note.acc, note.micro_n, note.micro_d);
			g_close()
		}
	}
	if (old_color != false)
		set_color(old_color)
}

/* -- draw a note or a chord -- */
/* (the staves are defined) */
function draw_note(s,
		   fl) {		// draw flags
	var	s2, i, m, y, staffb, slen, c, hltype, nflags,
		x, y, note,
		y_tb = new Array(s.nhd + 1)

	if (s.dots)
		setdoty(s, y_tb)

	note = s.notes[s.stem < 0 ? s.nhd : 0];	// master note head
	x = x_head(s, note);
	staffb = staff_tb[s.st].y

	/* output the ledger lines */
	if (s.grace) {
		hltype = "ghl"
	} else {
		switch (s.head) {
		default:
			hltype = "hl"
			break
		case OVAL:
		case OVALBARS:
			hltype = "hl1"
			break
		case SQUARE:
			hltype = "hl2"
			break
		}
	}
	draw_hl(x, 3 * (s.notes[0].pit - 18), 3 * (s.notes[s.nhd].pit - 18),
		s.st, hltype)

	/* draw the stem and flags */
	y = y_head(s, note)
	if (!s.stemless) {
		slen = s.ys - s.y;
		nflags = s.nflags
		if (s.ntrem)
			nflags -= s.ntrem
		if (!fl || nflags <= 0) {	/* stem only */
			if (s.nflags > 0) {	/* (fix for PS low resolution) */
				if (s.stem >= 0)
					slen -= 1
				else
					slen += 1
			}
			out_stem(x, y, slen, s.grace)
		} else {				/* stem and flags */
			out_stem(x, y, slen, s.grace,
				 nflags, cfmt.straightflags)
		}
	} else if (s.xstem) {				/* cross-staff stem */
		s2 = s.ts_prev;
		slen = (s2.stem > 0 ? s2.y : s2.ys) - s.y;
		slen += staff_tb[s2.st].y - staffb;
/*fixme:KO when different scales*/
		slen /= s.p_v.scale;
		out_stem(x, y, slen)
	}

	/* draw the tremolo bars */
	if (fl && s.trem1) {
		var	ntrem = s.ntrem || 0,
			x1 = x;
		slen = 3 * (s.notes[s.stem > 0 ? s.nhd : 0].pit - 18)
		if (s.head == FULL || s.head == EMPTY) {
			x1 += (s.grace ? GSTEM_XOFF : 3.5) * s.stem
			if (s.stem > 0)
				slen += 6 + 5.4 * ntrem
			else
				slen -= 6 + 5.4
		} else {
			if (s.stem > 0)
				slen += 5 + 5.4 * ntrem
			else
				slen -= 5 + 5.4
		}
		slen /= s.p_v.scale;
		out_trem(x1, staffb + slen, ntrem)
	}

	/* draw the note heads */
	x = s.x
	for (m = 0; m <= s.nhd; m++)
		draw_basic_note(x, s, m, y_tb)
}

/* -- find where to terminate/start a slur -- */
function next_scut(s) {
	var prev = s

	for (s = s.next; s; s = s.next) {
		if (s.rbstop)
			return s
		prev = s
	}
	/*fixme: KO when no note for this voice at end of staff */
	return prev
}

function prev_scut(s) {
	while (s.prev) {
		s = s.prev
		if (s.rbstart)
			return s
	}

	/* return a symbol of any voice starting before the start of the voice */
	s = s.p_v.sym
	while (s.type != CLEF)
		s = s.ts_prev		/* search a main voice */
	if (s.next && s.next.type == KEY)
		s = s.next
	if (s.next && s.next.type == METER)
		return s.next
	return s
}

/* -- decide whether a slur goes up or down -- */
function slur_direction(k1, k2) {
	var s, some_upstem, low

	if (k1.grace && k1.stem > 0)
		return -1

	for (s = k1; ; s = s.next) {
		if (s.type == NOTE) {
			if (!s.stemless) {
				if (s.stem < 0)
					return 1
				some_upstem = true
			}
			if (s.notes[0].pit < 22)	/* if under middle staff */
				low = true
		}
		if (s == k2)
			break
	}
	if (!some_upstem && !low)
		return 1
	return -1
}

/* -- output a slur / tie -- */
function slur_out(x1, y1, x2, y2, dir, height, dotted) {
	var	dx, dy, dz,
		alfa = .3,
		beta = .45;

	/* for wide flat slurs, make shape more square */
	dy = y2 - y1
	if (dy < 0)
		dy = -dy;
	dx = x2 - x1
	if (dx > 40. && dy / dx < .7) {
		alfa = .3 + .002 * (dx - 40.)
		if (alfa > .7)
			alfa = .7
	}

	/* alfa, beta, and height determine Bezier control points pp1,pp2
	 *
	 *           X====alfa===|===alfa=====X
	 *	    /		 |	       \
	 *	  pp1		 |	        pp2
	 *	  /	       height		 \
	 *	beta		 |		 beta
	 *      /		 |		   \
	 *    p1		 m		     p2
	 *
	 */

	var	mx = .5 * (x1 + x2),
		my = .5 * (y1 + y2),
		xx1 = mx + alfa * (x1 - mx),
		yy1 = my + alfa * (y1 - my) + height;
	xx1 = x1 + beta * (xx1 - x1);
	yy1 = y1 + beta * (yy1 - y1)

	var	xx2 = mx + alfa * (x2 - mx),
		yy2 = my + alfa * (y2 - my) + height;
	xx2 = x2 + beta * (xx2 - x2);
	yy2 = y2 + beta * (yy2 - y2);

	dx = .03 * (x2 - x1);
//	if (dx > 10.)
//		dx = 10.
//	dy = 1.6 * dir
	dy = 2 * dir;
	dz = .2 + .001 * (x2 - x1)
	if (dz > .6)
		dz = .6;
	dz *= dir
	
	var scale_y = stv_g.v ? stv_g.scale : 1
	if (!dotted)
		output.push('<path class="fill" d="M')
	else
		output.push('<path class="stroke" stroke-dasharray="5,5" d="M');
	out_sxsy(x1, ' ', y1);
	output.push('c' +
		((xx1 - x1) / stv_g.scale).toFixed(2) + ' ' +
		((y1 - yy1) / scale_y).toFixed(2) + ' ' +
		((xx2 - x1) / stv_g.scale).toFixed(2) + ' ' +
		((y1 - yy2) / scale_y).toFixed(2) + ' ' +
		((x2 - x1) / stv_g.scale).toFixed(2) + ' ' +
		((y1 - y2) / scale_y).toFixed(2))

	if (!dotted)
		output.push('\n\tv' +
			(-dz).toFixed(2) + 'c' +
			((xx2 - dx - x2) / stv_g.scale).toFixed(2) + ' ' +
			((y2 + dz - yy2 - dy) / scale_y).toFixed(2) + ' ' +
			((xx1 + dx - x2) / stv_g.scale).toFixed(2) + ' ' +
			((y2 + dz - yy1 - dy) / scale_y).toFixed(2) + ' ' +
			((x1 - x2) / stv_g.scale).toFixed(2) + ' ' +
			((y2 + dz - y1) / scale_y).toFixed(2));
	output.push('"/>\n')
}

/* -- check if slur sequence in a multi-voice staff -- */
function slur_multi(k1, k2) {
	while (1) {
		if (k1.multi)		/* if multi voice */
			/*fixme: may change*/
			return k1.multi
		if (k1 == k2)
			break
		k1 = k1.next
	}
	return 0
}

/* -- draw a phrasing slur between two symbols -- */
/* (the staves are not yet defined) */
/* (delayed output) */
/* (not a pretty routine, this) */
function draw_slur(k1_o, k2, m1, m2, slur_type) {
	var	k1 = k1_o,
		k, g, x1, y1, x2, y2, height, addy,
		a, y, z, h, dx, dy, dir

	while (k1.v != k2.v)
		k1 = k1.ts_next
/*fixme: if two staves, may have upper or lower slur*/
	switch (slur_type & 0x07) {	/* (ignore dotted flag) */
	case SL_ABOVE: dir = 1; break
	case SL_BELOW: dir = -1; break
	default:
		dir = slur_multi(k1, k2)
		if (!dir)
			dir = slur_direction(k1, k2)
		break
	}

	var	nn = 1,
		upstaff = k1.st,
		two_staves = false

	if (k1 != k2) {
		k = k1.next
		while (1) {
			if (k.type == NOTE || k.type == REST) {
				nn++
				if (k.st != upstaff) {
					two_staves = true
					if (k.st < upstaff)
						upstaff = k.st
				}
			}
			if (k == k2)
				break
			k = k.next
		}
	}
/*fixme: KO when two staves*/
if (two_staves) error(2, k1, "*** multi-staves slurs not treated yet");

	/* fix endpoints */
	x1 = k1_o.x
	if (k1_o.notes && k1_o.notes[0].shhd)
		x1 += k1_o.notes[0].shhd
	if (k1_o != k2) {
		x2 = k2.x
		if (k2.notes)
			x2 += k2.notes[0].shhd
	} else {		/* (the slur starts on last note of the line) */
		for (k = k2.ts_next; k; k = k.ts_next)
//fixme: must check if the staff continues
			if (k.type == STAVES)
				break
		x2 = k ? k.x : realwidth
	}

	if (m1 >= 0) {
		y1 = 3 * (k1.notes[m1].pit - 18) + 5 * dir
	} else {
		y1 = dir > 0 ? k1.ymx + 2 : k1.ymn - 2
		if (k1.type == NOTE) {
			if (dir > 0) {
				if (k1.stem > 0) {
					x1 += 5
					if (k1.beam_end
					 && k1.nflags >= -1	/* if with a stem */
//fixme: check if at end of tuplet
					 && !k1.in_tuplet) {
//					  || k1.ys > y1 - 3)) {
						if (k1.nflags > 0) {
							x1 += 2;
							y1 = k1.ys - 3
						} else {
							y1 = k1.ys - 6
						}
// don't clash with decorations
//					} else {
//						y1 = k1.ys + 3
					}
//				} else {
//					y1 = k1.y + 8
				}
			} else {
				if (k1.stem < 0) {
					x1 -= 1
					if (k2.grace) {
						y1 = k1.y - 8
					} else if (k1.beam_end
						&& k1.nflags >= -1
						&& (!k1.in_tuplet
						 || k1.ys < y1 + 3)) {
						if (k1.nflags > 0) {
							x1 += 2;
							y1 = k1.ys + 3
						} else {
							y1 = k1.ys + 6
						}
//					} else {
//						y1 = k1.ys - 3
					}
//				} else {
//					y1 = k1.y - 8
				}
			}
		}
	}
	if (m2 >= 0) {
		y2 = 3 * (k2.notes[m2].pit - 18) + 5 * dir
	} else {
		y2 = dir > 0 ? k2.ymx + 2 : k2.ymn - 2
		if (k2.type == NOTE) {
			if (dir > 0) {
				if (k2.stem > 0) {
					x2 += 1
					if (k2.beam_st
					 && k2.nflags >= -1
					 && !k2.in_tuplet)
//						|| k2.ys > y2 - 3))
						y2 = k2.ys - 6
//					else
//						y2 = k2.ys + 3
//				} else {
//					y2 = k2.y + 8
				}
			} else {
				if (k2.stem < 0) {
					x2 -= 5
					if (k2.beam_st
					 && k2.nflags >= -1
					 && !k2.in_tuplet)
//						|| k2.ys < y2 + 3))
						y2 = k2.ys + 6
//					else
//						y2 = k2.ys - 3
//				} else {
//					y2 = k2.y - 8
				}
			}
		}
	}

	if (k1.type != NOTE) {
		y1 = y2 + 1.2 * dir;
		x1 = k1.x + k1.wr * .5
		if (x1 > x2 - 12)
			x1 = x2 - 12
	}

	if (k2.type != NOTE) {
		if (k1.type == NOTE)
			y2 = y1 + 1.2 * dir
		else
			y2 = y1
		if (k1 != k2)
			x2 = k2.x - k2.wl * .3
	}

	if (nn >= 3) {
		if (k1.next.type != BAR
		 && k1.next.x < x1 + 48) {
			if (dir > 0) {
				y = k1.next.ymx - 2
				if (y1 < y)
					y1 = y
			} else {
				y = k1.next.ymn + 2
				if (y1 > y)
					y1 = y
			}
		}
		if (k2.prev
		 && k2.prev.type != BAR
		 && k2.prev.x > x2 - 48) {
			if (dir > 0) {
				y = k2.prev.ymx - 2
				if (y2 < y)
					y2 = y
			} else {
				y = k2.prev.ymn + 2
				if (y2 > y)
					y2 = y
			}
		}
	}

	a = (y2 - y1) / (x2 - x1)		/* slur steepness */
	if (a > SLUR_SLOPE || a < -SLUR_SLOPE) {
		a = a > SLUR_SLOPE ? SLUR_SLOPE : -SLUR_SLOPE
		if (a * dir > 0)
			y1 = y2 - a * (x2 - x1)
		else
			y2 = y1 + a * (x2 - x1)
	}

	/* for big vertical jump, shift endpoints */
	y = y2 - y1
	if (y > 8)
		y = 8
	else if (y < -8)
		y = -8
	z = y
	if (z < 0)
		z = -z;
	dx = .5 * z;
	dy = .3 * y
	if (y * dir > 0) {
		x2 -= dx;
		y2 -= dy
	} else {
		x1 += dx;
		y1 += dy
	}

	/* special case for grace notes */
	if (k1.grace)
		x1 = k1.x - GSTEM_XOFF * .5
	if (k2.grace)
		x2 = k2.x + GSTEM_XOFF * 1.5;

	h = 0;
	a = (y2 - y1) / (x2 - x1)
	if (k1 != k2
	 && k1.v == k2.v) {
	    addy = y1 - a * x1
	    for (k = k1.next; k != k2 ; k = k.next) {
		if (k.st != upstaff)
			continue
		switch (k.type) {
		case NOTE:
		case REST:
			if (dir > 0) {
				y = 3 * (k.notes[k.nhd].pit - 18) + 6
				if (y < k.ymx)
					y = k.ymx;
				y -= a * k.x + addy
				if (y > h)
					h = y
			} else {
				y = 3 * (k.notes[0].pit - 18) - 6
				if (y > k.ymn)
					y = k.ymn;
				y -= a * k.x + addy
				if (y < h)
					h = y
			}
			break
		case GRACE:
			for (g = k.extra; g; g = g.next) {
				if (dir > 0) {
					y = 3 * (g.notes[g.nhd].pit - 18) + 6
					if (y < g.ymx)
						y = g.ymx;
					y -= a * g.x + addy
					if (y > h)
						h = y
				} else {
					y = 3 * (g.notes[0].pit - 18) - 6
					if (y > g.ymn)
						y = g.ymn;
					y -= a * g.x + addy
					if (y < h)
						h = y
				}
			}
			break
		}
	    }
	    y1 += .45 * h;
	    y2 += .45 * h;
	    h *= .65
	}

	if (nn > 3)
		height = (.08 * (x2 - x1) + 12) * dir
	else
		height = (.03 * (x2 - x1) + 8) * dir
	if (dir > 0) {
		if (height < 3 * h)
			height = 3 * h
		if (height > 40)
			height = 40
	} else {
		if (height > 3 * h)
			height = 3 * h
		if (height < -40)
			height = -40
	}

	y = y2 - y1
	if (y < 0)
		y = -y
	if (dir > 0) {
		if (height < .8 * y)
			height = .8 * y
	} else {
		if (height > -.8 * y)
			height = -.8 * y
	}
	height *= cfmt.slurheight;

//	anno_start(k1_o, 'slur');
	slur_out(x1, y1, x2, y2, dir, height, slur_type & SL_DOTTED);
//	anno_stop(k1_o, 'slur');

	/* have room for other symbols */
	dx = x2 - x1;
	a = (y2 - y1) / dx;
/*fixme: it seems to work with .4, but why?*/
	addy = y1 - a * x1 + .4 * height
	if (k1.v == k2.v)
	    for (k = k1; k != k2; k = k.next) {
		if (k.st != upstaff)
			continue
		y = a * k.x + addy
		if (k.ymx < y)
			k.ymx = y
		else if (k.ymn > y)
			k.ymn = y
		if (k.next == k2) {
			dx = x2
			if (k2.sl1)
				dx -= 5
		} else {
			dx = k.next.x
		}
		if (k != k1)
			x1 = k.x;
		dx -= x1;
		y_set(upstaff, dir > 0, x1, dx, y)
	}
	return (dir > 0 ? SL_ABOVE : SL_BELOW) | (slur_type & SL_DOTTED)
}

/* -- draw the slurs between 2 symbols --*/
function draw_slurs(first, last) {
	var	s1, k, gr1, gr2, i, m1, m2, slur_type, cont,
		s = first

	while (1) {
		if (!s || s == last) {
			if (!gr1
			 || !(s = gr1.next)
			 || s == last)
				break
			gr1 = null
		}
		if (s.type == GRACE) {
			gr1 = s;
			s = s.extra
			continue
		}
		if ((s.type != NOTE && s.type != REST
		  && s.type != SPACE)
		 || (!s.slur_start && !s.sl1)) {
			s = s.next
			continue
		}
		k = null;		/* find matching slur end */
		s1 = s.next
		var gr1_out = false
		while (1) {
			if (!s1) {
				if (gr2) {
					s1 = gr2.next;
					gr2 = null
					continue
				}
				if (!gr1 || gr1_out)
					break
				s1 = gr1.next;
				gr1_out = true
				continue
			}
			if (s1.type == GRACE) {
				gr2 = s1;
				s1 = s1.extra
				continue
			}
			if (s1.type == BAR
			 && (s1.bar_type[0] == ':'
			  || s1.bar_type == "|]"
			  || s1.bar_type == "[|"
			  || (s1.text && s1.text[0] != '1'))) {
				k = s1
				break
			}
			if (s1.type != NOTE && s1.type != REST
			 && s1.type != SPACE) {
				s1 = s1.next
				continue
			}
			if (s1.slur_end || s1.sl2) {
				k = s1
				break
			}
			if (s1.slur_start || s1.sl1) {
				if (gr2) {	/* if in grace note sequence */
					for (k = s1; k.next; k = k.next)
						;
					k.next = gr2.next
					if (gr2.next)
						gr2.next.prev = k;
//					gr2.slur_start = SL_AUTO
					k = null
				}
				draw_slurs(s1, last)
				if (gr2
				 && gr2.next) {
					gr2.next.prev.next = null;
					gr2.next.prev = gr2
				}
			}
			if (s1 == last)
				break
			s1 = s1.next
		}
		if (!s1) {
			k = next_scut(s)
		} else if (!k) {
			s = s1
			if (s == last)
				break
			continue
		}

		/* if slur in grace note sequence, change the linkages */
		if (gr1) {
			for (s1 = s; s1.next; s1 = s1.next)
				;
			s1.next = gr1.next
			if (gr1.next)
				gr1.next.prev = s1;
			gr1.slur_start = SL_AUTO
		}
		if (gr2) {
			gr2.prev.next = gr2.extra;
			gr2.extra.prev = gr2.prev;
			gr2.slur_start = SL_AUTO
		}
		if (s.slur_start) {
			slur_type = s.slur_start & 0x0f;
			s.slur_start >>= 4;
			m1 = -1
		} else {
			for (m1 = 0; m1 <= s.nhd; m1++)
				if (s.notes[m1].sl1)
					break
			slur_type = s.notes[m1].sl1 & 0x0f;
			s.notes[m1].sl1 >>= 4;
			s.sl1--
		}
		m2 = -1;
		cont = 0
		if ((k.type == NOTE || k.type == REST || k.type == SPACE) &&
		    (k.slur_end || k.sl2)) {
			if (k.slur_end) {
				k.slur_end--
			} else {
				for (m2 = 0; m2 <= k.nhd; m2++)
					if (k.notes[m2].sl2)
						break
				k.notes[m2].sl2--;
				k.sl2--
			}
		} else {
			if (k.type != BAR
			 || (k.bar_type[0] != ':'
			  && k.bar_type != "|]"
			  && k.bar_type != "[|"
			  && (!k.text || k.text[0] == '1')))
				cont = 1
		}
		slur_type = draw_slur(s, k, m1, m2, slur_type)
		if (cont) {
			if (!k.p_v.slur_start)
				k.p_v.slur_start = 0;
			k.p_v.slur_start <<= 4;
			k.p_v.slur_start += slur_type
		}

		/* if slur in grace note sequence, restore the linkages */
		if (gr1
		 && gr1.next) {
			gr1.next.prev.next = null;
			gr1.next.prev = gr1
		}
		if (gr2) {
			gr2.prev.next = gr2;
			gr2.extra.prev = null
		}

		if (s.slur_start || s.sl1)
			continue
		if (s == last)
			break
		s = s.next
	}
}

/* -- draw a tuplet -- */
/* (the staves are not yet defined) */
/* (delayed output) */
/* See http://moinejf.free.fr/abcm2ps-doc/tuplets.xhtml
 * for the value of 'tf' */
function draw_tuplet(s1,
			lvl) {	// nesting level
	var	s2, s3, g, upstaff, nb_only, some_slur,
		x1, x2, y1, y2, xm, ym, a, s0, yy, yx, dy, a, b, dir,
		p, q, r

	// check if some slurs and treat the nested tuplets
	upstaff = s1.st
	for (s2 = s1; s2; s2 = s2.next) {
		if (s2.type != NOTE && s2.type != REST) {
			if (s2.type == GRACE) {
				for (g = s2.extra; g; g = g.next) {
					if (g.slur_start || g.sl1)
						some_slur = true
				}
			}
			continue
		}
		if (s2.slur_start || s2.slur_end /* if slur start/end */
		 || s2.sl1 || s2.sl2)
			some_slur = true
		if (s2.st < upstaff)
			upstaff = s2.st
		if (lvl == 0) {
			if (s2.tp1)
				draw_tuplet(s2, 1)
			if (s2.te0)
				break
		} else if (s2.te1)
			break
	}

	if (!s2) {
		error(1, s1, "No end of tuplet in this music line")
		if (lvl == 0)
			s1.tp0 = 0
		else
			s1.tp1 = 0
		return
	}

	/* draw the slurs fully inside the tuplet */
	if (some_slur) {
		draw_slurs(s1, s2)

		// don't draw the tuplet when a slur starts or stops inside it
		if (s1.slur_start || s1.sl1)
			return
		for (s3 = s1.next; s3 != s2; s3 = s3.next) {
			if (s3.slur_start || s3.slur_end
			 || s3.sl1 || s3.sl2)
				return
		}

		if (s2.slur_end || s2.sl2)
			return
	}

	if (lvl == 0) {
		p = s1.tp0;
		s1.tp0 = 0;
		q = s1.tq0
	} else {
		p = s1.tp1;
		s1.tp1 = 0
		q = s1.tq1
	}

	if (s1.tf[0] == 1)			/* if 'when' == never */
		return

	dir = s1.tf[3]				/* 'where' (SL_xxx) */
	if (!dir)
		dir = s1.stem > 0 ? SL_ABOVE : SL_BELOW

	if (s1 == s2) {				/* tuplet with 1 note (!) */
		nb_only = true
	} else if (s1.tf[1] == 1) {			/* 'what' == slur */
		nb_only = true;
		draw_slur(s1, s2, -1, -1, dir)
	} else {

		/* search if a bracket is needed */
		if (s1.tf[0] == 2		/* if 'when' == always */
		 || s1.type != NOTE || s2.type != NOTE) {
			nb_only = false
		} else {
			nb_only = true
			for (s3 = s1; ; s3 = s3.next) {
				if (s3.type != NOTE
				 && s3.type != REST) {
					if (s3.type == GRACE
					 || s3.type == SPACE)
						continue
					nb_only = false
					break
				}
				if (s3 == s2)
					break
				if (s3.beam_end) {
					nb_only = false
					break
				}
			}
			if (nb_only
			 && !s1.beam_st
			 && !s1.beam_br1
			 && !s1.beam_br2) {
				for (s3 = s1.prev; s3; s3 = s3.prev) {
					if (s3.type == NOTE
					 || s3.type == REST) {
						if (s3.nflags >= s1.nflags)
							nb_only = false
						break
					}
				}
			}
			if (nb_only && !s2.beam_end) {
				for (s3 = s2.next; s3; s3 = s3.next) {
					if (s3.type == NOTE
					 || s3.type == REST) {
						if (!s3.beam_br1
						 && !s3.beam_br2
						 && s3.nflags >= s2.nflags)
							nb_only = false
						break
					}
				}
			}
		}
	}

	/* if number only, draw it */
	if (nb_only) {
		if (s1.tf[2] == 1)		/* if 'which' == none */
			return
		xm = (s2.x + s1.x) / 2
		if (s1 == s2)			/* tuplet with 1 note */
			a = 0
		else
			a = (s2.ys - s1.ys) / (s2.x - s1.x);
		b = s1.ys - a * s1.x;
		yy = a * xm + b
		if (dir == SL_ABOVE) {
			ym = y_get(upstaff, 1, xm - 4, 8)
			if (ym > yy)
				b += ym - yy;
			b += 2
		} else {
			ym = y_get(upstaff, 0, xm - 4, 8)
			if (ym < yy)
				b += ym - yy;
			b -= 10
		}
		for (s3 = s1; ; s3 = s3.next) {
			if (s3.x >= xm)
				break
		}
		if (s1.stem * s2.stem > 0) {
			if (s1.stem > 0)
				xm += 1.5
			else
				xm -= 1.5
		}
		ym = a * xm + b
		if (s1.tf[2] == 0)		/* if 'which' == number */
			out_bnum(xm, ym, p)
		else
			out_bnum(xm, ym, p + ':' +  q)
		if (dir == SL_ABOVE) {
			ym += 10
			if (s3.ymx < ym)
				s3.ymx = ym;
			y_set(upstaff, true, xm - 3, 6, ym)
		} else {
			if (s3.ymn > ym)
				s3.ymn = ym;
			y_set(upstaff, false, xm - 3, 6, ym)
		}
		return
	}

	if (s1.tf[1] != 0)				/* if 'what' != square */
		error(2, s1, "'what' value of %%tuplets not yet coded")

/*fixme: two staves not treated*/
/*fixme: to optimize*/
	dir = s1.tf[3]				// 'where'
	if (!dir)
		dir = s1.multi >= 0 ? SL_ABOVE : SL_BELOW
    if (dir == SL_ABOVE) {

	/* sole or upper voice: the bracket is above the staff */
	x1 = s1.x - 4;
	y1 = 24
	if (s1.st == upstaff) {
		for (s3 = s1; !s3.dur; s3 = s3.next)
			;
		ym = y_get(upstaff, 1, s3.x - 4, 8)
		if (ym > y1)
			y1 = ym
		if (s1.stem > 0)
			x1 += 3
	}
	y2 = 24
	if (s2.st == upstaff) {
		for (s3 = s2; !s3.dur; s3 = s3.prev)
			;
		ym = y_get(upstaff, 1, s3.x - 4, 8)
		if (ym > y2)
			y2 = ym
	}

	/* end the backet according to the last note duration */
	if (s2.dur > s2.prev.dur) {
		if (s2.next)
			x2 = s2.next.x - s2.next.wl - 5
		else
			x2 = realwidth - 6
	} else {
		x2 = s2.x + 4;
		r = s2.stem >= 0 ? 0 : s2.nhd
		if (s2.notes[r].shhd > 0)
			x2 += s2.notes[r].shhd
		if (s2.st == upstaff
		 && s2.stem > 0)
			x2 += 3.5
	}

	xm = .5 * (x1 + x2);
	ym = .5 * (y1 + y2);

	a = (y2 - y1) / (x2 - x1);
	s0 = 3 * (s2.notes[s2.nhd].pit - s1.notes[s1.nhd].pit) / (x2 - x1)
	if (s0 > 0) {
		if (a < 0)
			a = 0
		else if (a > s0)
			a = s0
	} else {
		if (a > 0)
			a = 0
		else if (a < s0)
			a = s0
	}
	if (a * a < .1 * .1)
		a = 0

	/* shift up bracket if needed */
	dy = 0
	for (s3 = s1; ; s3 = s3.next) {
		if (!s3.dur			/* not a note or a rest */
		 || s3.st != upstaff) {
			if (s3 == s2)
				break
			continue
		}
		yy = ym + (s3.x - xm) * a;
		yx = y_get(upstaff, 1, s3.x - 4, 8)
		if (yx - yy > dy)
			dy = yx - yy
		if (s3 == s2)
			break
	}

	ym += dy + 2;
	y1 = ym + a * (x1 - xm);
	y2 = ym + a * (x2 - xm);

	/* shift the slurs / decorations */
	ym += 8
	for (s3 = s1; ; s3 = s3.next) {
		if (s3.st == upstaff) {
			yy = ym + (s3.x - xm) * a
			if (s3.ymx < yy)
				s3.ymx = yy
			if (s3 == s2)
				break
			y_set(upstaff, true, s3.x, s3.next.x - s3.x, yy)
		} else if (s3 == s2) {
			break
		}
	}

    } else {	/* lower voice of the staff: the bracket is below the staff */
/*fixme: think to all of that again..*/
	x1 = s1.x - 7
	if (s2.dur > s2.prev.dur) {
		if (s2.next)
			x2 = s2.next.x - s2.next.wl - 8
		else
			x2 = realwidth - 6
	} else {
		x2 = s2.x + 2
		if (s2.notes[s2.nhd].shhd > 0)
			x2 += s2.notes[s2.nhd].shhd
	}
	if (s1.stem >= 0) {
		x1 += 2;
		x2 += 2
	}

	if (s1.st == upstaff) {
		for (s3 = s1; !s3.dur; s3 = s3.next)
			;
		y1 = y_get(upstaff, 0, s3.x - 4, 8)
	} else {
		y1 = 0
	}
	if (s2.st == upstaff) {
		for (s3 = s2; !s3.dur; s3 = s3.prev)
			;
		y2 = y_get(upstaff, 0, s3.x - 4, 8)
	} else {
		y2 = 0
	}

	xm = .5 * (x1 + x2);
	ym = .5 * (y1 + y2);

	a = (y2 - y1) / (x2 - x1);
	s0 = 3 * (s2.notes[0].pit - s1.notes[0].pit) / (x2 - x1)
	if (s0 > 0) {
		if (a < 0)
			a = 0
		else if (a > s0)
			a = s0
	} else {
		if (a > 0)
			a = 0
		else if (a < s0)
			a = s0
	}
	if (a * a < .1 * .1)
		a = 0

	/* shift down the bracket if needed */
	dy = 0
	for (s3 = s1; ; s3 = s3.next) {
		if (!s3.dur			/* not a note nor a rest */
		 || s3.st != upstaff) {
			if (s3 == s2)
				break
			continue
		}
		yy = ym + (s3.x - xm) * a;
		yx = y_get(upstaff, 0, s3.x - 4, 8)
		if (yx - yy < dy)
			dy = yx - yy
		if (s3 == s2)
			break
	}

	ym += dy - 10;
	y1 = ym + a * (x1 - xm);
	y2 = ym + a * (x2 - xm);

	/* shift the slurs / decorations */
	ym -= 2
	for (s3 = s1; ; s3 = s3.next) {
		if (s3.st == upstaff) {
			if (s3 == s2)
				break
			yy = ym + (s3.x - xm) * a
			if (s3.ymn > yy)
				s3.ymn = yy;
			y_set(upstaff, false, s3.x, s3.next.x - s3.x, yy)
		}
		if (s3 == s2)
			break
	}
    } /* lower voice */

	if (s1.tf[2] == 1) {			/* if 'which' == none */
		out_tubr(x1, y1 + 4, x2 - x1, y2 - y1, dir == SL_ABOVE);
		return
	}
	out_tubrn(x1, y1, x2 - x1, y2 - y1, dir == SL_ABOVE,
		s1.tf[2] == 0 ? p.toString() : p + ':' +  q);

	yy = .5 * (y1 + y2)
	if (dir == SL_ABOVE)
		y_set(upstaff, true, xm - 3, 6, yy + 9)
	else
		y_set(upstaff, false, xm - 3, 6, yy)
}

/* -- draw the ties between two notes/chords -- */
function draw_note_ties(k1, k2, mhead1, mhead2, job) {
	var i, dir, m1, m2, p, p2, y, st, k, x1, x2, h, sh, time

	for (i = 0; i < mhead1.length; i++) {
		m1 = mhead1[i];
		p = k1.notes[m1].pit;
		m2 = mhead2[i];
		p2 = job != 2 ? k2.notes[m2].pit : p;
		dir = (k1.notes[m1].ti1 & 0x07) == SL_ABOVE ? 1 : -1;

		x1 = k1.x;
		sh = k1.notes[m1].shhd		/* head shift */
		if (dir > 0) {
			if (m1 < k1.nhd && p + 1 == k1.notes[m1 + 1].pit)
				if (k1.notes[m1 + 1].shhd > sh)
					sh = k1.notes[m1 + 1].shhd
		} else {
			if (m1 > 0 && p == k1.notes[m1 - 1].pit + 1)
				if (k1.notes[m1 - 1].shhd > sh)
					sh = k1.notes[m1 - 1].shhd
		}
		x1 += sh * .6;

		x2 = k2.x
		if (job != 2) {
			sh = k2.notes[m2].shhd
			if (dir > 0) {
				if (m2 < k2.nhd && p2 + 1 == k2.notes[m2 + 1].pit)
					if (k2.notes[m2 + 1].shhd < sh)
						sh = k2.notes[m2 + 1].shhd
			} else {
				if (m2 > 0 && p2 == k2.notes[m2 - 1].pit + 1)
					if (k2.notes[m2 - 1].shhd < sh)
						sh = k2.notes[m2 - 1].shhd
			}
			x2 += sh * .6
		}

		st = k1.st
		switch (job) {
		case 0:
			if (p != p2 && !(p & 1))
				p = p2
			break
		case 3:				/* clef or staff change */
			dir = -dir
			// fall thru
		case 1:				/* no starting note */
			x1 = k1.x
			if (x1 > x2 - 20)
				x1 = x2 - 20;
			p = p2;
			st = k2.st
			break
/*		case 2:				 * no ending note */
		default:
			if (k1 != k2) {
				x2 -= k2.wl
				if (k2.type == BAR)
					x2 += 5
			} else {
				time = k1.time + k1.dur
				for (k = k1.ts_next; k; k = k.ts_next)
//(fixme: must check if the staff continues??)
					if (k.time > time)
						break
				x2 = k ? k.x : realwidth
			}
			if (x2 < x1 + 16)
				x2 = x1 + 16
			break
		}
		if (x2 - x1 > 20) {
			x1 += 3.5;
			x2 -= 3.5
		} else {
			x1 += 1.5;
			x2 -= 1.5
		}

		y = 3 * (p - 18)
//fixme: clash when 2 ties on second interval chord
//		if (p & 1)
//			y += 2 * dir
		if (job != 1 && job != 3) {
			if (dir > 0) {
				if (!(p & 1) && k1.dots)
					y = 3 * (p - 18) + 6
			}
		}

		h = (.04 * (x2 - x1) + 10) * dir;
//		anno_start(k1, 'slur');
		slur_out(x1, staff_tb[st].y + y,
			 x2, staff_tb[st].y + y,
			 dir, h, k1.notes[m1].ti1 & SL_DOTTED)
//		anno_stop(k1, 'slur')
	}
}

/* -- draw ties between neighboring notes/chords -- */
function draw_ties(k1, k2,
			job) {	// 0: normal
				// 1: no starting note
				// 2: no ending note
				// 3: no start for clef or staff change
	var	k3, i, j, m1, pit, tie2,
		mhead1 = [],
		mhead2 = [],
		mhead3 = [],
		nh1 = k1.nhd,
		time = k1.time + k1.dur

	/* half ties from last note in line or before new repeat */
	if (job == 2) {
		for (i = 0; i <= nh1; i++) {
			if (k1.notes[i].ti1)
				mhead3.push(i)
		}
		draw_note_ties(k1, k2 || k1, mhead3, mhead3, job)
		return
	}

	/* set up list of ties to draw */
	for (i = 0; i <= nh1; i++) {
		if (!k1.notes[i].ti1)
			continue
		tie2 = -1;
		pit = k1.notes[i].apit
		for (m1 = k2.nhd; m1 >= 0; m1--) {
			switch (k2.notes[m1].apit - pit) {
			case 1:			/* maybe ^c - _d */
			case -1:		/* _d - ^c */
				if (k1.notes[i].acc != k2.notes[m1].acc)
					tie2 = m1
			default:
				continue
			case 0:
				tie2 = m1
				break
			}
			break
		}
		if (tie2 >= 0) {		/* 1st or 2nd choice */
			mhead1.push(i);
			mhead2.push(tie2)
		} else {
			mhead3.push(i)		/* no match */
		}
	}

	/* draw the ties */
	draw_note_ties(k1, k2, mhead1, mhead2, job)

	/* if any bad tie, try an other voice of the same staff */
	if (!mhead3.length)
		return				/* no bad tie */

	k3 = k1.ts_next
	while (k3 && k3.time < time)
		k3 = k3.ts_next
	while (k3 && k3.time == time) {
		if (k3.type != NOTE
		 || k3.st != k1.st) {
			k3 = k3.ts_next
			continue
		}
		mhead1.length = 0;
		mhead2.length = 0
		for (i = mhead3.length; --i >= 0; ) {
			j = mhead3[i];
			pit = k1.notes[j].apit
			for (m1 = k3.nhd; m1 >= 0; m1--) {
				if (k3.notes[m1].apit == pit) {
					mhead1.push(j);
					mhead2.push(m1);
					mhead3[i] = mhead3.pop()
					break
				}
			}
		}
		if (mhead1.length > 0) {
			draw_note_ties(k1, k3,
					mhead1, mhead2,
					job == 1 ? 1 : 0)
			if (mhead3.length == 0)
				return
		}
		k3 = k3.ts_next
	}

	if (mhead3.length != 0)
		error(1, k1, "Bad tie")
}

/* -- try to get the symbol of a ending tie when combined voices -- */
function tie_comb(s) {
	var	s1, time, st;

	time = s.time + s.dur;
	st = s.st
	for (s1 = s.ts_next; s1; s1 = s1.ts_next) {
		if (s1.st != st)
			continue
		if (s1.time == time) {
			if (s1.type == NOTE)
				return s1
			continue
		}
		if (s1.time > time)
			return s		// bad tie
	}
	return //null				// no ending tie
}

/* -- draw all ties between neighboring notes -- */
function draw_all_ties(p_voice) {
	var s1, s2, s3, clef_chg, time, s_rtie, s_tie, x, dx

	function draw_ties_g(s1, s2, job) {
		var g

		if (s1.type == GRACE) {
			for (g = s1.extra; g; g = g.next) {
				if (g.ti1)
					draw_ties(g, s2, job)
			}
		} else {
			draw_ties(s1, s2, job)
		}
	} // draw_ties_g()

	for (s1 = p_voice.sym; s1; s1 = s1.next) {
		switch (s1.type) {
		case CLEF:
		case KEY:
		case METER:
			continue
		}
		break
	}
	s_rtie = p_voice.s_rtie			/* tie from 1st repeat bar */
	for (s2 = s1; s2; s2 = s2.next) {
		if (s2.dur
		 || s2.type == GRACE)
			break
		if (s2.type != BAR
		 || !s2.text)			// not a repeat bar
			continue
		if (s2.text[0] == '1')		/* 1st repeat bar */
			s_rtie = p_voice.s_tie
		else
			p_voice.s_tie = s_rtie
	}
	if (!s2)
		return
	if (p_voice.s_tie) {			/* tie from previous line */
		p_voice.s_tie.x = s1.x + s1.wr;
		s1 = p_voice.s_tie;
		p_voice.s_tie = null;
		s1.st = s2.st;
		s1.ts_next = s2.ts_next;	/* (for tie to other voice) */
		s1.time = s2.time - s1.dur;	/* (if after repeat sequence) */
		draw_ties(s1, s2, 1)		/* tie to 1st note */
	}

	/* search the start of ties */
//	clef_chg = false
	while (1) {
		for (s1 = s2; s1; s1 = s1.next) {
			if (s1.ti1)
				break
			if (!s_rtie)
				continue
			if (s1.type != BAR
			 || !s1.text)			// not a repeat bar
				continue
			if (s1.text[0] == '1') {	/* 1st repeat bar */
				s_rtie = null
				continue
			}
			if (s1.bar_type == '|')
				continue		// not a repeat
			for (s2 = s1.next; s2; s2 = s2.next)
				if (s2.type == NOTE)
					break
			if (!s2) {
				s1 = null
				break
			}
			s_tie = clone(s_rtie);
			s_tie.x = s1.x;
			s_tie.next = s2;
			s_tie.st = s2.st;
			s_tie.time = s2.time - s_tie.dur;
			draw_ties(s_tie, s2, 1)
		}
		if (!s1)
			break

		/* search the end of the tie
		 * and notice the clef changes (may occur in an other voice) */
		time = s1.time + s1.dur
		for (s2 = s1.next; s2; s2 = s2.next) {
			if (s2.dur)
				break
			if (s2.text) {			// repeat bar
				if (s2.text[0] != '1')
					break
				s_rtie = s1		/* 1st repeat bar */
			}
		}
		if (!s2) {
			for (s2 = s1.ts_next; s2; s2 = s2.ts_next) {
				if (s2.st != s1.st)
					continue
				if (s2.time < time)
					continue
				if (s2.time > time) {
					s2 = null
					break
				}
				if (s2.dur)
					break
			}
			if (!s2) {
				draw_ties_g(s1, null, 2);
				p_voice.s_tie = s1
				break
			}
		} else {
			if (s2.type != NOTE
			 && s2.type != BAR) {
				error(1, s1, "Bad tie")
				continue
			}
			if (s2.time != time) {
				s3 = tie_comb(s1)
				if (s3 == s1) {
					error(1, s1, "Bad tie")
					continue
				}
				s2 = s3
			}
		}
		for (s3 = s1.ts_next; s3; s3 = s3.ts_next) {
			if (s3.st != s1.st)
				continue
			if (s3.time > time)
				break
			if (s3.type == CLEF) {
				clef_chg = true
				continue
			}
		}

		/* ties with clef or staff change */
		if (clef_chg || s1.st != s2.st) {
			clef_chg = false;
			dx = (s2.x - s1.x) * .4;
			x = s2.x;
			s2.x -= dx
			if (s2.x > s1.x + 32.)
				s2.x = s1.x + 32.;
			draw_ties_g(s1, s2, 2);
			s2.x = x;
			x = s1.x;
			s1.x += dx
			if (s1.x < s2.x - 24.)
				s1.x = s2.x - 24.;
			draw_ties(s1, s2, 3);
			s1.x = x
			continue
		}
		draw_ties_g(s1, s2, s2.type == NOTE ? 0 : 2)
	}
	p_voice.s_rtie = s_rtie
}

/* -- draw all phrasing slurs for one staff -- */
/* (the staves are not yet defined) */
function draw_all_slurs(p_voice) {
	var	k, i, m2,
		s = p_voice.sym,
		slur_type = p_voice.slur_start,
		slur_st = 0

	if (!s)
		return

	/* the starting slur types are inverted */
	if (slur_type) {
		p_voice.slur_start = 0
		while (slur_type != 0) {
			slur_st <<= 4;
			slur_st |= (slur_type & 0x0f);
			slur_type >>= 4
		}
	}

	/* draw the slurs inside the music line */
	draw_slurs(s, undefined)

	/* do unbalanced slurs still left over */
	for ( ; s; s = s.next) {
		if (s.type != NOTE && s.type != REST
		 && s.type != SPACE)
			continue
		while (s.slur_end || s.sl2) {
			if (s.slur_end) {
				s.slur_end--;
				m2 = -1
			} else {
				for (m2 = 0; m2 <= s.nhd; m2++)
					if (s.notes[m2].sl2)
						break
				s.notes[m2].sl2--;
				s.sl2--
			}
			slur_type = slur_st & 0x0f;
			k = prev_scut(s);
			draw_slur(k, s, -1, m2, slur_type)
			if (k.type != BAR
			 || (k.bar_type[0] != ':'
			  && k.bar_type != "|]"
			  && k.bar_type != "[|"
			  && (!k.text || k.text[0] == '1')))
				slur_st >>= 4
		}
	}
	s = p_voice.sym
	while (slur_st != 0) {
		slur_type = slur_st & 0x0f;
		slur_st >>= 4;
		k = next_scut(s);
		draw_slur(s, k, -1, -1, slur_type)
		if (k.type != BAR
		 || (k.bar_type[0] != ':'
		  && k.bar_type != "|]"
		  && k.bar_type != "[|"
		  && (!k.text || k.text[0] == '1'))) {
			if (!p_voice.slur_start)
				p_voice.slur_start = 0;
			p_voice.slur_start <<= 4;
			p_voice.slur_start += slur_type
		}
	}
}

/* -- draw the symbols near the notes -- */
/* (the staves are not yet defined) */
/* order:
 * - scaled
 *   - beams
 *   - decorations near the notes
 *   - measure bar numbers
 *   - n-plets
 *   - decorations tied to the notes
 *   - slurs
 * - not scaled
 *   - guitar chords
 *   - staff decorations
 *   - lyrics
 *   - measure numbers
 * The buffer output is delayed until the definition of the staff system
 */
function draw_sym_near() {
	var p_voice, p_st, s, v, st, y, g, w, i, st, dx, top, bot

	/* calculate the beams but don't draw them (the staves are not yet defined) */
	for (v = 0; v < voice_tb.length; v++) {
		var	bm = {},
			first_note = true;

		p_voice = voice_tb[v]
		for (s = p_voice.sym; s; s = s.next) {
			switch (s.type) {
			case GRACE:
				for (g = s.extra; g; g = g.next) {
					if (g.beam_st && !g.beam_end)
						calculate_beam(bm, g)
				}
				break
			case NOTE:
				if ((s.beam_st && !s.beam_end)
				 || (first_note && !s.beam_st)) {
					first_note = false;
					calculate_beam(bm, s)
				}
				break
			}
		}
	}

	/* initialize the min/max vertical offsets */
	for (st = 0; st <= nstaff; st++) {
		p_st = staff_tb[st]
		if (!p_st.top) {
			p_st.top = new Float32Array(YSTEP);
			p_st.bot = new Float32Array(YSTEP)
		}
		for (i = 0; i < YSTEP; i++) {
			p_st.top[i] = 0;
			p_st.bot[i] = 24
		}
//		p_st.top.fill(0.);
//		p_st.bot.fill(24.)
	}

	set_tie_room();
	draw_deco_near()

	/* set the min/max vertical offsets */
	for (s = tsfirst; s; s = s.ts_next) {
		if (s.invis)
			continue
		switch (s.type) {
		case GRACE:
			for (g = s.extra; g; g = g.next) {
				y_set(s.st, true, g.x - 2, 4, g.ymx + 1);
				y_set(s.st, false, g.x - 2, 4, g.ymn - 1)
			}
			continue
		case MREST:
			y_set(s.st, true, s.x + 16, 32, s.ymx + 2)
			continue
		default:
			y_set(s.st, true, s.x - s.wl, s.wl + s.wr, s.ymx + 2);
			y_set(s.st, false, s.x - s.wl, s.wl + s.wr, s.ymn - 2)
			continue
		case NOTE:
			break
		}

		// (permit closer staves)
		if (s.stem > 0) {
			if (s.beam_st) {
				dx = 3;
				w = s.beam_end ? 4 : 10
			} else {
				dx = -8;
				w = s.beam_end ? 11 : 16
			}
			y_set(s.st, true, s.x + dx, w, s.ymx + 2);
			y_set(s.st, false, s.x - s.wl, s.wl + s.wr, s.ymn - 2)
		} else {
			y_set(s.st, true, s.x - s.wl, s.wl + s.wr, s.ymx + 2);
			if (s.beam_st) {
				dx = -6;
				w = s.beam_end ? 4 : 10
			} else {
				dx = -8;
				w = s.beam_end ? 5 : 16
			}
			y_set(s.st, false, s.x + dx, w, s.ymn - 2)
		}

		/* have room for the accidentals */
		if (s.notes[s.nhd].acc) {
			y = s.y + 8
			if (s.ymx < y)
				s.ymx = y;
			y_set(s.st, true, s.x, 0, y)
		}
		if (s.notes[0].acc) {
			y = s.y
			if (s.notes[0].acc == 1		// sharp
			 || s.notes[0].acc == 3)	// natural
				y -= 7
			else
				y -= 5
			if (s.ymn > y)
				s.ymn = y;
			y_set(s.st, false, s.x, 0, y)
		}
	}

	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v];
		s = p_voice.sym
		if (!s)
			continue
		set_color(s.color);
		st = p_voice.st;
//  if (st == undefined) {
//error(1, s, "BUG: no staff for voice " + p_voice.id)
//    continue
//  }
		set_dscale(st)

		/* draw the tuplets near the notes */
		for ( ; s; s = s.next) {
			if (s.tp0)
				draw_tuplet(s, 0)
		}
		draw_all_slurs(p_voice)

		/* draw the tuplets over the slurs */
		for (s = p_voice.sym; s; s = s.next) {
			if (s.tp0)
				draw_tuplet(s, 0)
		}
	}

	/* set the top and bottom out of the staves */
	for (st = 0; st <= nstaff; st++) {
		p_st = staff_tb[st];
		top = p_st.topbar + 2;
		bot = p_st.botbar - 2
/*fixme:should handle stafflines changes*/
		for (i = 0; i < YSTEP; i++) {
			if (top > p_st.top[i])
				p_st.top[i] = top
			if (bot < p_st.bot[i])
				p_st.bot[i] = bot
		}
	}

	set_color(undefined);
	draw_deco_note()
	draw_deco_staff();
	set_sscale(-1);		/* restore the scale parameters */

	/* if any lyric, draw them now as unscaled */
	set_dscale(-1)
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (p_voice.have_ly) {
			draw_all_lyrics()
			break
		}
	}

	if (cfmt.measurenb >= 0)
		draw_measnb()
}

/* -- draw the name/subname of the voices -- */
function draw_vname(indent) {
	var	p_voice, n, st, v, a_p, p, y, name_type,
		staff_d = []

	for (st = cur_sy.nstaff; st >= 0; st--) {
		if (cur_sy.st_print[st])
			break
	}
	if (st < 0)
		return

	// check if full or sub names
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (!p_voice.sym)
			continue
		st = cur_sy.voices[v].st
		if (!cur_sy.st_print[st])
			continue
		if (p_voice.new_name) {
			name_type = 2
			break
		}
		if (p_voice.snm)
			name_type = 1
	}
	if (!name_type)
		return
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (!p_voice.sym)
			continue
		st = cur_sy.voices[v].st
		if (!cur_sy.st_print[st])
			continue
		if (p_voice.new_name)
			delete p_voice.new_name;
		p = name_type == 2 ? p_voice.nm : p_voice.snm
		if (!p)
			continue
		if (cur_sy.staves[st].flags & CLOSE_BRACE2) {
			while (!(cur_sy.staves[st].flags & OPEN_BRACE2))
				st--
		} else if (cur_sy.staves[st].flags & CLOSE_BRACE) {
			while (!(cur_sy.staves[st].flags & OPEN_BRACE))
				st--
		}
		if (!staff_d[st])
			staff_d[st] = p
		else
			staff_d[st] += "\\n" + p
	}
	if (staff_d.length == 0)
		return
	set_font("voice");
	indent = -indent * .5			/* center */
	for (st = 0; st < staff_d.length; st++) {
		if (!staff_d[st])
			continue
		a_p = staff_d[st].split('\\n');
		y = staff_tb[st].y
			+ staff_tb[st].topbar * .5
				* staff_tb[st].staffscale
			+ 9 * (a_p.length - 1)
			- gene.curfont.size * .3;
		n = st
		if (cur_sy.staves[st].flags & OPEN_BRACE2) {
			while (!(cur_sy.staves[n].flags & CLOSE_BRACE2))
				n++
		} else if (cur_sy.staves[st].flags & OPEN_BRACE) {
			while (!(cur_sy.staves[n].flags & CLOSE_BRACE))
				n++
		}
		if (n != st)
			y -= (staff_tb[st].y - staff_tb[n].y) * .5
		for (n = 0; n < a_p.length; n++) {
			p = a_p[n];
			xy_str(indent, y, p, "c");
			y -= 18
		}
	}
}

// -- set the y offset of the staves and return the height of the whole system --
function set_staff() {
	var	s, i, st, prev_staff, v,
		y, staffsep, dy, maxsep, mbot, val, p_voice, p_staff

	/* set the scale of the voices */
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (p_voice.scale != 1)
			p_voice.scale_str = 
				'transform="scale(' + p_voice.scale.toFixed(2) + ')"'
	}

	// search the top staff
	for (st = 0; st <= nstaff; st++) {
		if (gene.st_print[st])
			break
	}
	y = 0
	if (st > nstaff) {
		st--;			/* one staff, empty */
		p_staff = staff_tb[st]
	} else {
		p_staff = staff_tb[st]
		for (i = 0; i < YSTEP; i++) {
			val = p_staff.top[i]
			if (y < val)
				y = val
		}
	}

	/* draw the parts and tempo indications if any */
	y += draw_partempo(st, y)

	if (!gene.st_print[st])
		return y;

	/* set the vertical offset of the 1st staff */
	y *= p_staff.staffscale;
	staffsep = cfmt.staffsep * .5 +
			p_staff.topbar * p_staff.staffscale
	if (y < staffsep)
		y = staffsep
	if (y < p_staff.ann_top)	// absolute annotation
		y = p_staff.ann_top;
	p_staff.y = -y;

	/* set the offset of the other staves */
	prev_staff = st
	var sy_staff_prev = cur_sy.staves[prev_staff]
	for (st++; st <= nstaff; st++) {
		p_staff = staff_tb[st]
		if (!gene.st_print[st])
			continue
		staffsep = sy_staff_prev.sep || cfmt.sysstaffsep;
		maxsep = sy_staff_prev.maxsep || cfmt.maxsysstaffsep;

		dy = 0
		if (p_staff.staffscale == staff_tb[prev_staff].staffscale) {
			for (i = 0; i < YSTEP; i++) {
				val = p_staff.top[i] -
						staff_tb[prev_staff].bot[i]
				if (dy < val)
					dy = val
			}
			dy *= p_staff.staffscale
		} else {
			for (i = 0; i < YSTEP; i++) {
				val = p_staff.top[i] * p_staff.staffscale
				  - staff_tb[prev_staff].bot[i]
					* staff_tb[prev_staff].staffscale
				if (dy < val)
					dy = val
			}
		}
		staffsep += p_staff.topbar * p_staff.staffscale
		if (dy < staffsep)
			dy = staffsep;
		maxsep += p_staff.topbar * p_staff.staffscale
		if (dy > maxsep)
			dy = maxsep;
		y += dy;
		p_staff.y = -y;

		prev_staff = st;
		sy_staff_prev = cur_sy.staves[prev_staff]
	}
	mbot = 0
	for (i = 0; i < YSTEP; i++) {
		val = staff_tb[prev_staff].bot[i]
		if (mbot > val)
			mbot = val
	}
	if (mbot > p_staff.ann_bot) 	// absolute annotation
		mbot = p_staff.ann_bot;
	mbot *= staff_tb[prev_staff].staffscale

	/* output the staff offsets */
	for (st = 0; st <= nstaff; st++) {
		p_staff = staff_tb[st];
		dy = p_staff.y
		if (p_staff.staffscale != 1) {
			p_staff.scale_str =
				'transform="translate(0,' +
					(posy - dy).toFixed(2) + ') ' +
				'scale(' + p_staff.staffscale.toFixed(2) + ')"'
		}
	}

	if (mbot == 0) {
		for (st = nstaff; st >= 0; st--) {
			if (gene.st_print[st])
				break
		}
		if (st < 0)		/* no symbol in this system ! */
			return y
	}
	dy = -mbot;
	staffsep = cfmt.staffsep * .5
	if (dy < staffsep)
		dy = staffsep;
	maxsep = cfmt.maxstaffsep * .5
	if (dy > maxsep)
		dy = maxsep;

	// return the height of the whole staff system
	return y + dy
}

/* -- draw the staff systems and the measure bars -- */
function draw_systems(indent) {
	var	s, s2, st, x, x2, res,
		staves_bar, bar_force,
		xstaff = [],
		bar_bot = [],
		bar_height = []

	/* -- set the bottom and height of the measure bars -- */
	function bar_set() {
		var	st, staffscale, top, bot,
			dy = 0

		for (st = 0; st <= cur_sy.nstaff; st++) {
			if (xstaff[st] < 0) {
				bar_bot[st] = bar_height[st] = 0
				continue
			}
			staffscale = staff_tb[st].staffscale;
			top = staff_tb[st].topbar * staffscale;
			bot = staff_tb[st].botbar * staffscale
			if (dy == 0)
				dy = staff_tb[st].y + top;
			bar_bot[st] = staff_tb[st].y + bot;
			bar_height[st] = dy - bar_bot[st];
			dy = (cur_sy.staves[st].flags & STOP_BAR) ?
					0 : bar_bot[st]
		}
	} // bar_set()

	/* -- draw a staff -- */
	function draw_staff(st, x1, x2) {
		var	w, ws, i, dy, ty,
			y = 0,
			ln = "",
			stafflines = staff_tb[st].stafflines,
			l = stafflines.length

		if (!stafflines.match(/[\[|]/))
			return				// no line
		w = x2 - x1;
		set_sscale(st);
		ws = w / stv_g.scale

		// check if default staff
		if (cache && cache.st_l == stafflines && cache.st_ws == ws) {
			xygl(x1, staff_tb[st].y, "stdef")
			return
		}
		for (i = 0; i < l; i++, y -= 6) {
			if (stafflines[i] == '.')
				continue
			dy = 0
			for (; i < l; i++, y -= 6, dy -= 6) {
				switch (stafflines[i]) {
				case '.':
					continue
				case ty:
					ln += 'm-' + ws.toFixed(2) +
						' ' + dy +
						'h' + ws.toFixed(2);
					dy = 0
					continue
				}
				if (ty != undefined)
					ln += '"/>\n';
				ty = stafflines[i]
				ln += '<path class="stroke"'
				if (ty == '[')
					ln += ' stroke-width="1.5"';
				ln += ' d="m0 ' + y + 'h' + ws.toFixed(2);
				dy = 0
			}
			ln += '"/>\n'
		}
		y = staff_tb[st].y
		if (!cache
		 && w == get_lwidth()) {
			cache = {
				st_l: stafflines,
				st_ws: ws
			}
			glyphs.stdef = '<g id="stdef">\n' + ln + '</g>';
			xygl(x1, y, "stdef")
			return
		}
		out_XYAB('<g transform="translate(X, Y)">\n' + ln + '</g>\n', x1, y)
	} // draw_staff()

	draw_vname(indent)

	/* draw the staff, skipping the staff breaks */
	for (st = 0; st <= nstaff; st++)
		xstaff[st] = !cur_sy.st_print[st] ? -1 : 0;
	bar_set();
	draw_lstaff(0)
	for (s = tsfirst; s; s = s.ts_next) {
		if (bar_force && s.time != bar_force) {
			bar_force = 0
			for (st = 0; st <= nstaff; st++) {
				if (!cur_sy.st_print[st])
					xstaff[st] = -1
			}
			bar_set()
		}
		switch (s.type) {
		case STAVES:
			staves_bar = 0
			for (s2 = s.ts_next; s2; s2 = s2.ts_next) {
				if (s2.time != s.time)
					break
				switch (s2.type) {
				case BAR:
				case CLEF:
				case KEY:
				case METER:
					staves_bar = s2.x
					continue
				}
				break
			}
			if (!s2)
				staves_bar = realwidth;
			cur_sy = s.sy
			for (st = 0; st <= nstaff; st++) {
				x = xstaff[st]
				if (x < 0) {		// no staff yet
					if (cur_sy.st_print[st])
						xstaff[st] = s.ts_next.type == BAR ?
							s.x : (s.x - s.wl - 2)
					continue
				}
				if (cur_sy.st_print[st]) // if not staff stop
					continue
				if (staves_bar) {
					x2 = staves_bar;
					bar_force = s.time
				} else {
					x2 = s.x - s.wl - 2;
					xstaff[st] = -1
				}
				draw_staff(st, x, x2)
			}
			bar_set()
			continue
		case BAR:
			st = s.st
			if (s.second || s.invis)
				break

			// if the bar is not in the current staff system
			// it may be in the next one
			if (xstaff[st] < 0) {
				for (s2 = s.ts_next;
				     s2 && s2.time == s.time;
				     s2 = s2.ts_next) {
					if (s2.type == STAVES)
						break
				}
				if (!s2 || s2.type != STAVES)
					break
				xstaff[st] = s.x;
				bar_set()
			}

			draw_bar(s, bar_bot[st], bar_height[st]);
			break
		case STBRK:
			if (cur_sy.voices[s.v].range == 0) {
				if (s.xmx > 14) {

					/* draw the left system if stbrk in all voices */
					var nv = 0
					for (var i = 0; i < voice_tb.length; i++) {
						if (cur_sy.voices[i].range > 0)
							nv++
					}
					for (s2 = s.ts_next; s2; s2 = s2.ts_next) {
						if (s2.type != STBRK)
							break
						nv--
					}
					if (nv == 0)
						draw_lstaff(s.x)
				}
			}
			s2 = s.prev
			if (!s2)
				break
			x2 = s2.x
			if (s2.type != BAR)
				x2 += s2.wr;
			st = s.st;
			x = xstaff[st]
			if (x >= 0) {
				if (x >= x2)
					continue
				draw_staff(st, x, x2)
			}
			xstaff[st] = s.x
			break
//		default:
//fixme:does not work for "%%staves K: M: $" */
//removed for K:/M: in empty staves
//			if (!cur_sy.st_print[st])
//				s.invis = true
//			break
		}
	}

	// draw the end of the staves
	for (st = 0; st <= nstaff; st++) {
		if (bar_force && !cur_sy.st_print[st])
			continue
		x = xstaff[st]
		if (x < 0 || x >= realwidth)
			continue
		draw_staff(st, x, realwidth)
	}
//	set_sscale(-1)
}

/* -- draw remaining symbols when the staves are defined -- */
function draw_symbols(p_voice) {
	var	bm = {},
		s, g, x, y, st;

//	bm.s2 = undefined
	for (s = p_voice.sym; s; s = s.next) {
		if (s.invis) {
			switch (s.type) {
			case KEY:
				p_voice.key = s
			default:
				continue
			case NOTE:	// (beams may start on invisible notes)
				break
			}
		}
		x = s.x;
		set_color(s.color)
		switch (s.type) {
		case NOTE:
//--fixme: recall set_scale if different staff
			set_scale(s)
			if (s.beam_st && !s.beam_end) {
				if (calculate_beam(bm, s))
					draw_beams(bm)
			}
			if (!s.invis) {
				anno_start(s);
				draw_note(s, !bm.s2);
				anno_stop(s)
			}
			if (s == bm.s2)
				bm.s2 = null
			break
		case REST:
			draw_rest(s);
			break
		case BAR:
			break			/* drawn in draw_systems */
		case CLEF:
			st = s.st
			if (s.time > staff_tb[st].clef.time)
				staff_tb[st].clef = s
			if (s.second)
/*			 || p_voice.st != st)	*/
				break		/* only one clef per staff */
			if (!staff_tb[s.st].topbar)
				break
			set_color(undefined);
			set_sscale(st);
			anno_start(s);
			y = staff_tb[st].y
			if (s.clef_name)
				xygl(x, y + s.y, s.clef_name)
			else if (!s.clef_small)
				xygl(x, y + s.y, s.clef_type + "clef")
			else
				xygl(x, y + s.y, "s" + s.clef_type + "clef")
			if (s.clef_octave) {
/*fixme:break the compatibility and avoid strange numbers*/
				if (s.clef_octave > 0) {
					y += s.ymx - 10
					if (s.clef_small)
						y -= 1
				} else {
					y += s.ymn + 2
					if (s.clef_small)
						y += 1
				}
				xygl(x - 2, y, "oct")
			}
			anno_stop(s)
			break
		case METER:
			p_voice.meter = s
			if (s.second
			 || !staff_tb[s.st].topbar)
				break
			if (cfmt.alignbars && s.st != 0)
				break
			set_color(undefined);
			set_sscale(s.st);
			anno_start(s);
			draw_meter(x, s);
			anno_stop(s)
			break
		case KEY:
			p_voice.key = s
			if (s.second
			 || !staff_tb[s.st].topbar)
				break
			set_color(undefined);
			set_sscale(s.st);
			anno_start(s);
			draw_keysig(p_voice, x, s);
			anno_stop(s)
			break
		case MREST:
			set_scale(s);
			x += 32;
			anno_start(s);
			xygl(x, staff_tb[s.st].y + 12, "mrest");
			out_XYAB('<text style="font-family:serif; font-weight:bold; font-size: 15px"\n\
	x ="X" y="Y" text-anchor="middle">A</text>\n',
				x, staff_tb[s.st].y + 28, s.nmes);
			anno_stop(s)
			break
		case GRACE:
			set_scale(s);
			draw_gracenotes(s)
			break
		case SPACE:
		case STBRK:
			break			/* nothing */
		case CUSTOS:
			set_scale(s);
			draw_note(s, 0)
			break
		case BLOCK:			// no width
		case PART:
		case REMARK:
		case STAVES:
		case TEMPO:
			break
		default:
			error(2, s, "draw_symbols - Cannot draw symbol " + s.type)
			break
		}
	}
	set_scale(p_voice.sym);
	draw_all_ties(p_voice);
// no need to reset the scale as in abcm2ps
	set_color(undefined)
}

/* -- draw all symbols -- */
function draw_all_sym() {
	var	p_voice, v,
		n = voice_tb.length

	for (v = 0; v < n; v++) {
		p_voice = voice_tb[v]
		if (p_voice.sym
		 && p_voice.sym.x != undefined)
			draw_symbols(p_voice)
	}

	draw_all_deco();
	set_sscale(-1)				/* restore the scale */
}

/* -- set the tie directions for one voice -- */
function set_tie_dir(sym) {
	var s, i, ntie, dir, sec, pit, ti

	for (s = sym; s; s = s.next) {
		if (!s.ti1)
			continue

		/* if other voice, set the ties in opposite direction */
		if (s.multi != 0) {
			dir = s.multi > 0 ? SL_ABOVE : SL_BELOW
			for (i = 0; i <= s.nhd; i++) {
				ti = s.notes[i].ti1;
				if (!((ti & 0x07) == SL_AUTO))
					continue
				s.notes[i].ti1 = (ti & SL_DOTTED) | dir
			}
			continue
		}

		/* if one note, set the direction according to the stem */
		sec = ntie = 0;
		pit = 128
		for (i = 0; i <= s.nhd; i++) {
			if (s.notes[i].ti1) {
				ntie++
				if (pit < 128
				 && s.notes[i].pit <= pit + 1)
					sec++;
				pit = s.notes[i].pit
			}
		}
		if (ntie <= 1) {
			dir = s.stem < 0 ? SL_ABOVE : SL_BELOW
			for (i = 0; i <= s.nhd; i++) {
				ti = s.notes[i].ti1
				if (ti) {
					if ((ti & 0x07) == SL_AUTO)
						s.notes[i].ti1 =
							(ti & SL_DOTTED) | dir
					break
				}
			}
			continue
		}
		if (sec == 0) {
			if (ntie & 1) {
/* in chords with an odd number of notes, the outer noteheads are paired off
 * center notes are tied according to their position in relation to the
 * center line */
				ntie = (ntie - 1) / 2;
				dir = SL_BELOW
				for (i = 0; i <= s.nhd; i++) {
					ti = s.notes[i].ti1
					if (ti == 0)
						continue
					if (ntie == 0) {	/* central tie */
						if (s.notes[i].pit >= 22)
							dir = SL_ABOVE
					}
					if ((ti & 0x07) == SL_AUTO)
						s.notes[i].ti1 =
							(ti & SL_DOTTED) | dir
					if (ntie-- == 0)
						dir = SL_ABOVE
				}
				continue
			}
/* even number of notes, ties divided in opposite directions */
			ntie /= 2;
			dir = SL_BELOW
			for (i = 0; i <= s.nhd; i++) {
				ti = s.notes[i].ti1
				if (ti == 0)
					continue
				if ((ti & 0x07) == SL_AUTO)
					s.notes[i].ti1 =
						(ti & SL_DOTTED) | dir
				if (--ntie == 0)
					dir = SL_ABOVE
			}
			continue
		}
/*fixme: treat more than one second */
/*		if (nsec == 1) {	*/
/* When a chord contains the interval of a second, tie those two notes in
 * opposition; then fill in the remaining notes of the chord accordingly */
			pit = 128
			for (i = 0; i <= s.nhd; i++) {
				if (s.notes[i].ti1) {
					if (pit < 128
					 && s.notes[i].pit <= pit + 1) {
						ntie = i
						break
					}
					pit = s.notes[i].pit
				}
			}
			dir = SL_BELOW
			for (i = 0; i <= s.nhd; i++) {
				ti = s.notes[i].ti1
				if (ti == 0)
					continue
				if (ntie == i)
					dir = SL_ABOVE
				if ((ti & 0x07) == SL_AUTO)
					s.notes[i].ti1 = (ti & SL_DOTTED) | dir
			}
/*fixme..
			continue
		}
..*/
/* if a chord contains more than one pair of seconds, the pair farthest
 * from the center line receives the ties drawn in opposition */
	}
}

/* -- have room for the ties out of the staves -- */
function set_tie_room() {
	var p_voice, s, s2, v, dx, y, dy

	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v];
		s = p_voice.sym
		if (!s)
			continue
		s = s.next
		if (!s)
			continue
		set_tie_dir(s)
		for ( ; s; s = s.next) {
			if (!s.ti1)
				continue
			if (s.notes[0].pit < 20
			 && (s.notes[0].ti1 & 0x07) == SL_BELOW)
				;
			else if (s.notes[s.nhd].pit > 24
			      && (s.notes[s.nhd].ti1 & 0x07) == SL_ABOVE)
				;
			else
				continue
			s2 = s.next
			while (s2 && s2.type != NOTE)
				s2 = s2.next
			if (s2) {
				if (s2.st != s.st)
					continue
				dx = s2.x - s.x - 10
			} else {
				dx = realwidth - s.x - 10
			}
			if (dx < 100)
				dy = 9
			else if (dx < 300)
				dy = 12
			else
				dy = 16
			if (s.notes[s.nhd].pit > 24) {
				y = 3 * (s.notes[s.nhd].pit - 18) + dy
				if (s.ymx < y)
					s.ymx = y
				if (s2 && s2.ymx < y)
					s2.ymx = y;
				y_set(s.st, true, s.x + 5, dx, y)
			}
			if (s.notes[0].pit < 20) {
				y = 3 * (s.notes[0].pit - 18) - dy
				if (s.ymn > y)
					s.ymn = y
				if (s2 && s2.ymn > y)
					s2.ymn = y;
				y_set(s.st, false, s.x + 5, dx, y)
			}
		}
	}
}
// abc2svg music font
var musicfont = 'url("data:application/font-woff;base64,d09GRk9UVE8AABjsAAoAAAAAH8wAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAABDRkYgAAADRAAAFPgAABncbyRwGEZGVE0AABg8AAAAHAAAABx6k9cvT1MvMgAAAVQAAABLAAAAYFjAWjRjbWFwAAAChAAAALEAAAH6kDnc6GhlYWQAAAD0AAAANQAAADYHrbQmaGhlYQAAASwAAAAgAAAAJAihAQhobXR4AAAYWAAAAJMAAAC+V4YAJG1heHAAAAFMAAAABgAAAAYAMFAAbmFtZQAAAaAAAADhAAABhgcU47Fwb3N0AAADOAAAAAwAAAAgAAMAAHicY2BkYGAAYpmvsQ7x/DZfGbhZGEDg4nQlcRB92dO/6P+uvzzMX1imALkcDEwgUQAm/gs4AAAAeJxjYGRgYJnyl4chhoX3/67/+5m/MABFUIA+AJ3hBq4AAFAAADAAAHicY2BmvMs4gYGVgYNpJtMZBgaGfgjN+JrBmJGTgYGJgZWZAQ4EEEyGgDTXFAYHBoaXMczG/40ZYlimMH0BCjPCFSgAISMAm6gMnAB4nHWOMWrDQBBFn2zZwTiEVCHlgps0EtI2wT6ADpDCvWwWYTASrGyTk6TKEVLmGDlAjpBj5EuZJoUXhn3z+TN/gFveSBhewg33xhPxk/GUFa/GqfQP4xlLvozn0n/kTNKFlLtxauCJ+NF4SkVhnEp/N57xwKfxXPo3NTv2eHouNFDv9r6/CF4I6s8c5YhqQ3M+1oKKjpbT+Ec5Ak7TudIcG9X/fX+apyRjrfLylTxrTdeeqi42wfm8cBtnuSJfZuvMF6VM127bKjVKPYy3OG0c8tmG2B+61pV5cXX2FwIWN4EAAAB4nGNgYGBmgGAZBkYGEPgC5DGC+SwMN4C0EYMCkCXEwPCA4YHHg4AHMQ+SHmQ+qHnQ/WDJQ8aHzx+lPFnwZM2TA09ePXn3lPFp+tPcZwHPQl/G/P8PMgyoxx2up+pB14MFYD0JUD0PgXoYgHpy4HoYFZjk98hvlV8lv1R+vny/fJN8nryQnK7sVukq6XzpGGkbaUtpDanDUvsl70reFLsMdTOJgJGNgTyNwwgAANfVUlQAAAB4nGNgZsALAAB9AAR4nJ1YCVhTV76/1xByizYK8dKNBvf246utu7ZjVepS1ypqC1QFBJElQCAQAoR9C+QfwpawBJIQSAgQCDtaKCiVitUuY6m2jk6f045dZtpxtO2c2JP2eweivnnvzZuZ73033/c79+Sc3/mf/zn/7dKUmxtF0zRzPDxiVXJqFEXPomhqi2P3LMcejuNxN5jDgTluQg/qkdQ3XgB42JjD2/5Lyc8lPm4ars8sdq4PRc3zmZXi6UMt9XnCy4taOc3Co/gUS/lQiyk/aiW1gdpM7aD2UYepI1Q4FUMlUjIqmyqiVFQ1paNMVBvVTQ1Ro9QEdYn6mLpG3aS+pv5C/UQ5aQ7tQXvSj9O+9DJ6Ob2G/g39Cr2LPkAHPp8gPhF5UpoQs33FihUzsGa9CzbMwFpX59qtM7BulQtenIH1/i54xQWuIRtcnRtcnf6u6f4rXeCa7r/aBWumYeWKmf9Wbp9ZdtW6FS5Y6YJVLljtgpkJa1yca/xn1luz1fW2faULVrlgtQtcE7avdcE6F6x3wQYXvOgCfxdsn4a1Lk2sdUm2dt16F2x1wbZpWOfSy7q1M9Qvrt16/+wfXAGKohV0CV1KK2mgVXQZrabL6Qq6kq6iq2kNraVr6Fq6jq6ndXQD3UjraQNtpJtoE91Mt9Bm2kK30la6jW6nO2gb3Ul30Xa6m+6he+k+up8eoAepFdO3Ywm1nmqj1bMWcELdyrjbudHuZ3nfMrpHlj9yy+NJjx0e4R4THj/Ndp+9aHbibNNsx5xXHqUfDXo0+dF3H/3s0e/5NJ/lH+E38O/MLZ/3queznns95Z5tXge8srwuzs/x5nq/hHxhzHFgjB4bQxfGOGPejucdQ87n3cecBazjALrgPMDjt4JjCQ2OpRxwcyx1LHEudefjvqZUGlra2jiOWje7XB8FoRCTG5y8Kzu8OBpiYUdb4LsnQu1pAzAClurOOjvTell7Dt6Ci5LhwIaxBssQvAen8s4nfpxtL2gHC4wYBk/ZmYATCYGwA2IrouvCW3bVBEMMhKWLouUM/29lRqS5LruOKoxeiutvWBHz59V//uJ6kFXQk+tYhL5iF3gIPqPwr/unG1UUegwfZgWVWyK6Qz8SWsFabmtoMdpsMMIIaih4J+oqZtAsBonQWFgHjsbD3OiO8K4j3SKb3AYtcOacbYRAS0GDnBFUUqK8nAyQM9LmVIvV0NwsJBT9UadeFYpBrBDJk2UiERwh47bA4e4tiME0g6Pw8JAIRaAhbnfcQMxIlE3UIIJkCDwkOkIguVrewBAhbdraRmhgTClNSUJxWkqKL9+RtXMIHe1HxwZpVHcbufUjt9uc+T6OOMc3LH6ah7m5K5/Jx48zWBiBhO4aPP/WYsTNZfDT/ehpHuLW3PpBg+YzSNiPhe75aP7KHzC3hiF/RTg3sPgob3/1kTEFWsig57yRm7sCLzwStL+AQYVu6ChvsmAkuBwvYvBz3tjNvRwtHRmZrGb4Dr9fBH3o+z70M/Lygq+HUSr2H39/5IO+LwaaPhD8cNaxGBnYNBTBRauR59lbgPYBelxxdd3Xz4uffQHwUditfbF6cVDk0dBkWVjMS79JCmJEByWrYDVgOfLB81Am1EAj1KiYRnyQq8qDfPIsC04MgiRIKZfVMIJ7Z99TjXTBeeZ88Pi+HSFBB9e/vwO5Iap//K4QdEqdsoGRo/3cwfJ2XY/hi8GeT+Ab+Djn/aB3Qs9sse4AJg/ylPlKphbPY+vdEXV99Yu+sDlmE346jon0LoVShRBnwzbkXYI2qtCSj6+jnWgJESaAK/jp7ArJy3vgWdjase1yRpIttQ9s8OHE4G/rmPx7W9iaLwd+/IO2V1q7E47BosWLXzrMEIWU6BRvw1mwqKxqM8NHd5x13Q4f+12748keGtDci9ZP0Ur0G0RxHBJnCisGkSbK0FVjNGqaobqsEqqZgXBbmLDY/ViGVEIM6cVvDn0HF+F868TZ3m7jcMUZRs+D4az+pJ7osVffeY4YSERBeCYTc6XrKncgs7+gC6zQom7R3rJPfQKIJqOLz8iGI7sPnj1g2UvuXlJxckFARlRcRkhxLhDVQKxJ8lYGU+E+NGAb8IXq0kqozLfKGmNqbI0tmn44B70iYomxVdEQDZtOYLdtwMRDfIO8Jqw1dyj5lHRPWkiaOE0skYhSGUeB+FeN1VHBs6WaJQYxeUJMe2qslY0VNc3WkdPniTPoOtm4TRNXHg8JzKqji1YJnZKfJeyvGjT3Zw2Pjz7Hm/4agLKj7/QOeRmQAq1HHh9+JwgxDLAvjay5JmwFq6a5qdVUayUHcfHQ+dfgJOQWxkfqv71x7lM4A105AyFMT5hhD6yHWEVk4QnpwpBn9u9bvRwLDuJFkeiAFvl//dc/3r41hlhA6xm4kPVx/KmgK/52zAUGP4Y5L+LHfQWGe944irUYTW1tyU2JCRmpCb5xJlmbULCpCBWzrUZTpyW1KTE+LT3BN9YobRfyvwPkdxn5cVAiUrPOEuTHK3WUcJ1u3g/bxI6cynbU1IH6/rTyL17wqR3twsKhM71jtimbdUDw2U30e/QIW6Wqgir4Gia3wqvwWuQ+PEvCFH2VhoIAmCLcz5aCskSI90PQj0XoSRXijV9CSxCPEfzpZkVg+fGKgFdk+4JgIwR0hfZLUy15rcSxjr9lf6dGJW/BRsLRlcB2qZtr23WXu9rOwxWYyB8LP8UIrt2MGD5sfJ1YXgExlcKLpW8VjyPB7aEpQM/CT4rJV6/4Szf6A17DQGD1rsoN4fEno9LkMYm796SGJx2TbYPtgPch6ln0GmigFjQqpg4v5KoIHRSCf3R8KKRCulquYQQ3bo6qelthmBmOOBV8OCr82M4PX798Y6D/C2EVj8yrVmqVNUXni6aYnfe+ZzWXbZcuW23xmnByzq+sX747lBG8d7O0VtEHg9Ckai4zEv+03LmyDX1o/b0Vvd9Ow/djpgvICz3xBcfh5ZzPSkFSlaBr1TQ0VumhsqwCKpnOGEuMUOF+MitDRlzMrish12AUhk1vDba3NfaUDzI6HvTmdqS2iwcOn9oMiSAqjM1hEs+3TnI7c2xFrWACY5mhesr67nn4gqnnKQYzeuLbjg0eNQVDGqQWpxUdy0pIzopSTG++AJIaZT1ZTLl7V5e50xcqSyugotAkr0/UWOr1VTY4DR0SwxuapIoEEMO+uFUHgSHhoS5bE2PK70qzpwdlnsyUZkplsqQMxrFA+sukyeHHs2QYZTopeU7qgzSmivpyjd7U1zMMvdAaX3+wSqJOhhRmW+T6bUKn171O9pfJ7+9N8viOHdjnxlF0QHyjo8tLhwKR97fj1wQhuk52d9/294QmMFXpG016rYncmdGQkTchHgqKkuPrr75/+gJRtyWvM4ppj9EFwk5IKokriktfF73xSPD2LUuPYfd45FeNfD+58fH1qf4fAHkz8HbuRLI9/PwB60pgFq3avZAYlaMGv8w2Neibm9MapSlZGSm+Er2cBNNNxegN1tSgtzRlNEiTM7NSfJMa0luE/G6sbEOAnrzURGvQLBQ+XtfIQefQBlbpfhJSY0qTmGjridN95uFhIViyLLJmWXNIayDgx5Sr9wLeCArVCVCoX216oy+y9+SobBQYxC8butB5V6VOV4M65UhahDhZnJyQlwQiSKpLaRMNFl6FTxlAz42fu1DWB2eSyKEolMUliiKVQlWgYvj2/ybSBTua9W8KVQRKZREwd6IX8RZn7twF+Jm/F689oTetr4hZYP9BxSMy9l2y3f7fMuZBsSpfzTh28arL1GXV8A/kw3PxL2xBZWFVoca1F/jBPNndSqLQCsza0eEOGvpUP6FMNEvVz3FkoU0svtuP7vKcFm98t480kNsCdqEHurWXXeTBx5tuowW3aTA7ss0c82XWkY0XOLPdJWiIde41jzqyg82OvZJgZ/Yoj3/1Af8MOwdxLv4XTyh+dgLtnqChAxk6OOj0R6y6qKyIOIYD+ImXXgYppFUVNCgqSeCpgvPoiRvXiIkZCjVypqmOlQyHGY/C87DoZXgB0ipkWpn56JBsmET4H68RN2koNuYRHxCGFyAbCa6fc2Ldtp85+Z6QZFVl+spblquj8Ee4/Hr3HsiEzJIMxeqUTa/DaqKP/VjthmaDY5+jBM8BLv9vwWSjtzmjwazVZLJapSaxWCoVi01Sqy9/MeL30qN25PEBBz2L+GxHS3y0L0TLw+PDE8IkyemlDArlmXuaLcL2XjYC4tNTYhj0WbTzJq8LzljHx8+OW0ZgGN4+2h0KDB/7gxUtMXOsy0gE8kNLTgP24+Iljh1solKpBOenaMsY4FQzgOMT/HIgl794wnynhfP7z9g7bYB3LRVzscEN0O7pt00tAGj7pA4+358JaOek3tXYmgyA93CXJgHaJCHNHQezYM1EA+kjjXUTjYC3cvkL8bwrt6do49TdKQ4KJLnR1NRB98AzXENjZxcJFBMfbyWvQdz0xtiZ161bJ3hjwUHBBwH8pwDOj41xa7P7I8lf/ELk2UsO96vxuvavz3KuIU9W5V4DtQXa7KosdTqkQw5kK7ILorPiUhNSE3IzcmBaYWBqaWlWMZZeNgpS0+UiBk3FOX/H64Tetja7tctkb+yv0Jc3QAMMiYYjyJS1kWw54dXO8JbP8Jbe500nvFkZufd5m+/zRkOqTB5PeOMJbzsMtFntbV1Ge0N/lYv3rbhTx4n4bwAqoUvQVY5exaL+77gadUU1uYnVxdX55Qzu/xtXCUqVkphfQSZkQ5G6qIIc+PGNXK0CFHnFDI54hasoLS0mJp5XmaWFMlBBGXEVzwN6j1zJTlIz9cAt9OaX+M33gdzT97h8JAM0B837Aw1alE5aci0ZpHXXkevAfouWwfSPXa7DfozWHcVgP/QI9pt5GBwrRGe8uyytnbZEa2xcglgkahN3+PKxgjhdDlK7kXzD25VvTHep6fvdWI28kZrHfwV7Ik/SeZYsSJpnkSfpg/tdyPNhH34KxxHpL3EGHE+xN/Cbz+Cd6Cl8gJtSL61KgSMQTgoeOG47/OXh8N7MHmiHPqtlgEB3dncsgykUcRfFExE8RjoJ81MctHmSxVzcPyJHfo6lXEWZDEpLQwPEacdA31RhICWQPcYYHRubHnLotOSscBDqqvXlDHEcJ2wopdOLUOxFTwl+izbjIHYdPn06BwXfW3afJj74eOL/RaOfptmPQ7hF6cnyY8AIbi724FtmWB8QB6CndhDuH5Fykg14OPIhXROhSyN0ydN0NZXGSsa1ftPP/876Rg1ZPwCHElbpzPrf3B8n+OM0tVDwzQN230HQTLPz/+K8L90DAfc/lPEO2ux8sP8/+7hV/X8EuPtAgDsuAe7+TwEC/k5bP/4TNfz9uHtEqzNyS2woYeaX+ED0fTO/LUT6nyk0dYY9hIP+tYoD8NGH3M4t/+osHH4+3Nx/VxeB+MhDXThy/zH1jB5efygo2R9FNuiQLEInSTC8N2DmoAw3Z5gZed4bwJ5mR5gEe/4yMG026CAOJPbsh+bQxQQn0RzOO1fZJR6OzbiZgLP4MIs8XUHHiwQd0v1guAzNcQyR4f3Tw+89PzP8F+lhdqkHDnaWEOBfKrn0Wg9yu3jC7gX1juX1gqMOjx6WhDVtWh2DNyJvrqw+RS1TpYGsKDNbKksXwwmI1SbrpYygsSHDkF9PYqKmFprAkKdNh1zILsnMz6wpqoc26GvqaANGB3X5hmwGbcTeXEGcMctSaAQDsaH6umaj3kryjRHRuZDpiXKlDDI0eQZgiJtX6zS63KosiGdOporEQj6KAJRCd73FXr32I6nuGTRvGpahtdLmTesXonl4Dp63jMAivJx4wog30O9wRaoX6mgVNKGOyyye20oqJnMrVxB2f56sZeM6Mm+7P1fQpERzE0lA85Om3Kdokly95hrK5d97rnQyYBCVdPZ/EjqGNtq8YAL5jde+++25qt7JvtEJ9ML5ykmB9defY0tZfW19Q0NWvTwzM0vuK9dl6YROw5/Y8Cg5KQrEILkSaWF60Xquqhymn7HtelIjlKsqVeWkew0XLSo8vQ2iGcELv5I6KHz6O1CVtJfJzuG2BAwldQMz8s7box/t+g+8B4f646WbfQWyX2MaJK3CD6DFfPZLRl7NTYk4WZAKMshpgBY4PXUdPa4ll1PEVRYpC0koOfhBFhyDEmWJUhGPHzP0LtkbLgk+TrIYhbqkChg9DGinRow1BrMJ6qE2Sx9nD6/PJik8mPTvjjYlDUeSbJdslThmXetQR1BPkQ1uwcQV+AqQEHPQXFz9OaPkQTrate3KUvx4tHgXLGME4l+jQiKThJGQbEpuMxtH7C3DWgO5A/UwmNQeBeEQVpAULU0oSoUIBmJ0iUYR09fKZpkV9dAKk/39dqgDTWm5vKywrIBsIkSasvsAg8Z+w4ZqU5vhFNy0TH7Z3yJuPAShsDUlYKeC4X/0TVNj4beHzh3SW/TN33mhV5vzvt+vb28UTC5AHSiflaRnpaalNzQ3N9YZhQZjdoqv4NIW/HQBa67LzfQlFUpeYaFcnlkqJbE5T5mbk0uSAtIUN2WZQQtatbac6TLHtdu7NZqqihoinzYfEhnBxVwIjSyASEbSktZsatOR2v5SGAweV8I5MFVrtKSM1RRqCuwnEiQWSX1enaIWbNBgghYG6kp0udoEc0rSyc48jVJDlFOvLe8g6m4J6wN1pA0Yu6HJ3JxlCfcVlIfFgvJEMMlxc7WkLq6urNVqGnWaMjswFkNHkzXZIPHNA1lxQb5Y1CYVReXl5CoKIAOKjWBSDduLoJvpSNFLJZIMkRBEPcryUNV0UVkMGfmF019vcioKq0/2W9skltzqnHKSAInkkuQUnWTQtw50iobM6sLy6TI0OydPUkoE3BKiLu5OACZaLk0SG9I7fTtA2TNMkpV/merzVE53MyjvqUg+STJ+gFHivnrmOx5h6+d42Dxs1eOVxoqbc+aYZ5sryyvera2r1c151IdaKqDcaXr+3vDsClJa6k2mdL1Ump4u9ZXq003C2XVt1krieOrcPyi+tLcmvKxQlT/zCaJAUShPSCoSA5Ptvqti78WcgdIqJUnJQFumUVcxs6+vfhv7YJ/Vb67b8uWbyAf5fPn2deHsfxIoZne2tnZ2JrbGxiYmxcS2Jnb6zkZ8lyOeC9zZ/wlF9IlhAAAAAQAAAADVs2WlAAAAANGXIhcAAAAA00lPcnicY2JgYGCcACTCgfSD/3eY4xiqmLkZGJguAfH+/7sYrzEwgPjMfECs/v8E40wGTsYZDJxMgkB5GaCeA0DsCcReQL4ByAwg5mUwYjgBphkYuRlEGPOAtMP/v4wSQDURQLuaIJhRB4IZ3gHxf6g5/UB8A4KZg4Hqjf9/YFb4/5BxK5DtwsALwiy8YLt5GBgAC1ge5AA=")'
// abc2svg - format.js - formatting functions
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

var	defined_font = {},
	font_tb = {},
	fid = 1,
	font_scale_tb = {
		serif: 1.05,
		serifBold: 1.05,
		'sans-serif': 1.1,
		'sans-serifBold': 1.1,
		Palatino: 1.1,
		Mono: 1.35
	},
	fmt_lock = {}

var cfmt = {
	aligncomposer: 1,
//	botmargin: .7 * IN,		// != 1.8 * CM,
	breaklimit: .7,
	breakoneoln: true,
	cancelkey: true,
	composerspace: 6,
//	contbarnb: 0,
	dblrepbar: ':][:',
	decoerr: true,
	dynalign: true,
	fullsvg: '',
	gracespace: [6.5, 8, 12],	/* left, inside, right */
	graceslurs: true,
	hyphencont: true,
	indent: 0,
	infoname: 'R "Rhythm: "\n\
B "Book: "\n\
S "Source: "\n\
D "Discography: "\n\
N "Notes: "\n\
Z "Transcription: "\n\
H "History: "',
	infospace: 0,
	keywarn: true,
	leftmargin: 1.4 * CM,
	lineskipfac: 1.1,
	linewarn: true,
	maxshrink: .65,
	maxstaffsep: 2000,
	maxsysstaffsep: 2000,
	measurefirst: 1,
	measurenb: -1,
	musicspace: 6,
//	notespacingfactor: 1.414,
	parskipfac: .4,
	partsspace: 8,
//	pageheight: 29.7 * CM,
	pagewidth: 21 * CM,
//	pos: {
//		dyn: 0,
//		gch: 0,
//		gst: 0,
//		orn: 0,
//		stm: 0,
//		voc: 0,
//		vol: 0
//	},
	"printmargin": 0,
	rightmargin: 1.4 * CM,
	rbdbstop: true,
	rbmax: 4,
	rbmin: 2,
	scale: 1,
	slurheight: 1.0,
	staffnonote: 1,
	staffsep: 46,
	stemheight: 21,			// one octave
	stretchlast: .25,
	stretchstaff: true,
	subtitlespace: 3,
	sysstaffsep: 34,
//	textoption: undefined,
	textspace: 14,
//	titleleft: false,
	titlespace: 6,
	titletrim: true,
//	transp: 0,			// global transpose
//	topmargin: .7 * IN,
	topspace: 22,
	tuplets: [0, 0, 0, 0],
	vocalspace: 10,
//	voicecombine: 0,
//	voicescale: 1,
	writefields: "CMOPQsTWw",
	wordsspace: 5
}

function get_bool(param) {
	return !param || !param.match(/^(0|n|f)/i) // accept void as true !
}

function get_int(param) {
	var	v = parseInt(param)

	if (isNaN(v)) {
		syntax(1, "Bad integer value");
		v = 1
	}
	return v
}

// %%font <font> [<encoding>] [<scale>]
function get_font_scale(param) {
	var	a = param.split(/\s+/)	// a[0] = font name

	if (a.length <= 1)
		return
	var scale = parseFloat(a[a.length - 1])

	if (isNaN(scale) || a <= 0) {
		syntax(1, "Bad scale value in %%font")
		return
	}
	font_scale_tb[a[0]] = scale
	for (var fn in font_tb) {
		if (!font_tb.hasOwnProperty(fn))
			continue
		var font = font_tb[fn]
		if (font.name == a[0])
			font.swfac = font.size * scale
	}
}

// %%xxxfont fontname|* [encoding] [size|*]
function param_set_font(xxxfont, param) {
	var font, fn, old_fn, n, a, new_name, new_fn, new_size, scale, cl

	// "setfont-<n>" goes to "u<n>font"
	if (xxxfont[xxxfont.length - 2] == '-') {
		n = xxxfont[xxxfont.length - 1]
		if (n < '1' || n > '9')
			return
		xxxfont = "u" + n + "font"
	}
	fn = cfmt[xxxfont]
	if (fn) {
		font = font_tb[fn]
		if (font) {
			old_fn = font.name + "." + font.size
			if (font.class)
				old_fn += '.' + font.class
		}
	}

	n = param.indexOf('class=')
	if (n >= 0) {
		n += 6;
		a = param.indexOf(' ', n)
		if (a > 0)
			cl = param.slice(n, a)
		else
			cl = param.slice(n);
		param = param.replace(new RegExp('class=' + cl), '').trim()
	}

	a = param.split(/\s+/);
	new_name = a[0]
	if (new_name == "*"
	 && font) {
		new_name = font.name
	} else {
		new_name = new_name.replace('Times-Roman', 'serif');
		new_name = new_name.replace('Times', 'serif');
		new_name = new_name.replace('Helvetica', 'sans-serif');
		new_name = new_name.replace('Courier', 'monospace')
	}
	if (a.length > 1) {
		new_size = a[a.length - 1]
		if (new_size == '*' && font)
			new_size = font.size
	} else if (font) {
		new_size = font.size
	}
	if (!new_size) {
		// error ?
		return
	}
	new_fn = new_name + "." + new_size
	if (cl)
		new_fn += '.' + cl
	if (new_fn == old_fn)
		return
	font = font_tb[new_fn]
	if (!font) {
		scale = font_scale_tb[new_name]
		if (!scale)
			scale = 1.1;
		font = {
			name: new_name,
			size: Number(new_size),
			swfac: new_size * scale
		}
		font_tb[new_fn] = font
	}
	if (cl)
		font.class = cl;
	cfmt[xxxfont] = new_fn
}

/* -- get a value with a unit in 72 PPI -- */
function get_unit(param) {
	var v = parseFloat(param)

	switch (param.slice(-2)) {
	case "CM":
	case "cm":
		v *= 28.35
		break
	case "IN":
	case "in":
		v *= 72
		break
	}
	return v
}

/* -- get a page value with a unit -- */
function get_unitp(param) {
	var v = parseFloat(param)

	switch (param.slice(-2)) {
	case "CM":
	case "cm":
		v *= CM
		break
	case "IN":
	case "in":
		v *= IN
		break
//	default:
//		unit required...
	}
	return v
}

// set the infoname
function set_infoname(param) {
//fixme: check syntax: '<letter> ["string"]'
	var	tmp = cfmt.infoname.split("\n"),
		letter = param[0]

	for (var i = 0; i < tmp.length; i++) {
		var infoname = tmp[i]
		if (infoname[0] != letter)
			continue
		if (param.length == 1)
			tmp.splice(i, 1)
		else
			tmp[i] = param
		cfmt.infoname = tmp.join('\n')
		return
	}
	cfmt.infoname += "\n" + param
}

// get the text option
var textopt = {
	align: 'j',
	center: 'c',
	fill: 'f',
	justify: 'j',
	ragged: 'f',
	right: 'r',
	skip: 's'
}
function get_textopt(param) {
	return textopt[param]
}

/* -- position of a voice element -- */
var posval = {
	above: SL_ABOVE,
	auto: 0,		// !! not SL_AUTO !!
	below: SL_BELOW,
	down: SL_BELOW,
	hidden: SL_HIDDEN,
	opposite: SL_HIDDEN,
	under: SL_BELOW,
	up: SL_ABOVE
}

/* -- set the position of elements in a voice -- */
function set_pos(k, v) {		// keyword, value
	if (posval[v] == undefined) {
		syntax(1, err_bad_val_s, k)
		return
	}
	k = k.slice(0, 3)
	if (k == "ste")
		k = "stm"
	if (curvoice)
		curvoice.pos = clone(curvoice.pos);
	set_v_param(k, v, 'pos')
}

// set/unset the fields to write
function set_writefields(parm) {
	var	c, i,
		a = parm.split(/\s+/)

	if (get_bool(a[1])) {
		for (i = 0; i < a[0].length; i++) {	// set
			c = a[0][i]
			if (cfmt.writefields.indexOf(c) < 0)
				cfmt.writefields += c
		}
	} else {
		for (i = 0; i < a[0].length; i++) {	// unset
			c = a[0][i]
			if (cfmt.writefields.indexOf(c) >= 0)
				cfmt.writefields = cfmt.writefields.replace(c, '')
		}
	}
}

// set a voice specific parameter
function set_v_param(k, v, sub) {
	if (curvoice) {
		if (sub)
			curvoice[sub][k] = posval[v]	// sub == "pos" only
		else
			curvoice[k] = v
		return
	}
	k = [k + '=', v];
	var vid = '*'
	if (!info.V)
		info.V = {}
	if (info.V[vid])
		Array.prototype.push.apply(info.V[vid], k)
	else
		info.V[vid] = k
}

function set_page() {
	if (!img.chg)
		return
	img.chg = false;
	img.lm = cfmt.leftmargin - cfmt.printmargin
	if (img.lm < 0)
		img.lm = 0;
	img.rm = cfmt.rightmargin - cfmt.printmargin
	if (img.rm < 0)
		img.rm = 0;
	img.width = cfmt.pagewidth - 2 * cfmt.printmargin

	// must have 100pt at least as the staff width
	if (img.width - img.lm - img.rm < 100) {
		error(0, undefined, "Bad staff width");
		img.width = img.lm + img.rm + 150
	}
	set_posx()
} // set_page()

// set a format parameter
function set_format(cmd, param, lock) {
	var f, f2, v, box, i

//fixme: should check the type and limits of the parameter values
	if (lock) {
		fmt_lock[cmd] = true
	} else if (fmt_lock[cmd])
		return

	if (cmd.match(/.+font$/)
	 || cmd.match(/.+font-[\d]$/)) {
		if (param.slice(-4) == " box") {
			box = true;
			param = param.slice(0, -4)
		}
		param_set_font(cmd, param)
		switch (cmd) {
		case "gchordfont":
			cfmt.gchordbox = box
			break
//		case "annotationfont":
//			cfmt.annotationbox = box
//			break
		case "measurefont":
			cfmt.measurebox = box
			break
		case "partsfont":
			cfmt.partsbox = box
			break
		}
		return
	}

	switch (cmd) {
	case "aligncomposer":
	case "barsperstaff":
	case "capo":
	case "infoline":
	case "measurefirst":
	case "measurenb":
	case "rbmax":
	case "rbmin":
	case "shiftunison":
	case "staffnonote":
		cfmt[cmd] = get_int(param)
		break
	case "microscale":
		f = get_int(param)
		if (isNaN(f) || f < 4 || f > 256 || f % 1) {
			syntax(1, err_bad_val_s, "%%" + cmd)
			break
		}
		set_v_param("uscale", f)
		break
	case "bgcolor":
	case "dblrepbar":
	case "titleformat":
		cfmt[cmd] = param
		break
	case "breaklimit":			// float values
	case "lineskipfac":
	case "maxshrink":
	case "pagescale":
	case "parskipfac":
	case "scale":
	case "slurheight":
	case "stemheight":
	case "stretchlast":
		f = parseFloat(param)
		if (isNaN(f)) {
			syntax(1, err_bad_val_s, '%%' + cmd)
			break
		}
		switch (cmd) {
		case "scale":			// old scale
			f /= .75
		case "pagescale":
			cmd = "scale";
			img.chg = true
			break
		}
		cfmt[cmd] = f
		break
	case "bstemdown":
	case "breakoneoln":
	case "cancelkey":
	case "custos":
	case "decoerr":
	case "dynalign":
	case "flatbeams":
	case "gchordbox":
	case "graceslurs":
	case "graceword":
	case "hyphencont":
	case "keywarn":
	case "linewarn":
	case "measurebox":
	case "partsbox":
	case "rbdbstop":
	case "singleline":
	case "squarebreve":
	case "straightflags":
	case "stretchstaff":
	case "timewarn":
	case "titlecaps":
	case "titleleft":
	case "titletrim":
		cfmt[cmd] = get_bool(param)
		break
	case "chordnames":
		v = param.split(',')
		cfmt.chordnames = {}
		for (i = 0; i < v.length; i++)
			cfmt.chordnames['CDEFGAB'[i]] = v[i]
		break
	case "composerspace":
	case "indent":
	case "infospace":
	case "maxstaffsep":
	case "maxsysstaffsep":
	case "musicspace":
	case "partsspace":
	case "staffsep":
	case "subtitlespace":
	case "sysstaffsep":
	case "textspace":
	case "titlespace":
	case "topspace":
	case "vocalspace":
	case "wordsspace":
		f = get_unit(param)	// normally, unit in points - 72 DPI accepted
		if (isNaN(f))
			syntax(1, "Bad value in $1", '%%' + cmd)
		else
			cfmt[cmd] = f
		break
	case "print-leftmargin":	// to remove
		syntax(0, "$1 is deprecated - use %%printmargin instead", '%%' + cmd)
		cmd = "printmargin"
		// fall thru
	case "printmargin":
//	case "botmargin":
	case "leftmargin":
//	case "pageheight":
	case "pagewidth":
	case "rightmargin":
//	case "topmargin":
		f = get_unitp(param)	// normally unit in cm or in - 96 DPI
		if (isNaN(f)) {
			syntax(1, "Bad value in $1", '%%' + cmd)
			break
		}
		cfmt[cmd] = f;
		img.chg = true
		break
	case "concert-score":
		cfmt.sound = "concert"
		break
	case "contbarnb":
		cfmt.contbarnb = get_int(param)
		break
	case "writefields":
		set_writefields(param)
		break
	case "dynamic":
	case "gchord":
	case "gstemdir":
	case "ornament":
	case "stemdir":
	case "vocal":
	case "volume":
		set_pos(cmd, param)
		break
	case "font":
		get_font_scale(param)
		break
	case "fullsvg":
		if (parse.state != 0) {
			syntax(1, "Cannot have %%fullsvg inside a tune")
			break
		}
//fixme: should check only alpha, num and '_' characters
		cfmt[cmd] = param
		break
	case "gracespace":
		cfmt[cmd] = param.split(/\s+/)
		break
	case "tuplets":
		cfmt[cmd] = param.split(/\s+/);
		v = cfmt[cmd][3]
		if (v			// if 'where'
		 && (posval[v]))	// translate the keyword
			cfmt[cmd][3] = posval[v]
		break
	case "infoname":
		set_infoname(param)
		break
	case "notespacingfactor":
		f = parseFloat(param)
		if (isNaN(f) || f < 1 || f > 2) {
			syntax(1, err_bad_val_s, "%%" + cmd)
			break
		}
		i = 5;				// index of crotchet
		f2 = space_tb[i]
		for ( ; --i >= 0; ) {
			f2 /= f;
			space_tb[i] = f2
		}
		i = 5;
		f2 = space_tb[i]
		for ( ; ++i < space_tb.length; ) {
			f2 *= f;
			space_tb[i] = f2
		}
		break
	case "play":
		cfmt.sound = "play"		// without clef
		break
	case "pos":
		cmd = param.split(/\s+/);
		set_pos(cmd[0], cmd[1])
		break
	case "sounding-score":
		cfmt.sound = "sounding"
		break
	case "staffwidth":
		v = get_unitp(param)
		if (v < 100) {
			syntax(1, "%%staffwidth too small")
			break
		}
		v = cfmt.pagewidth - v - cfmt.leftmargin
		if (v < 2) {
			syntax(1, "%%staffwidth too big")
			break
		}
		cfmt.rightmargin = v;
		img.chg = true
		break
	case "textoption":
		cfmt[cmd] = get_textopt(param)
		break
	case "combinevoices":
	case "voicecombine":
		v = parseInt(param)
		if (isNaN(v)) {
			syntax(1, err_bad_val_s, "%%" + cmd)
			return
		}
		if (curvoice && cmd == "combinevoices") {
			for (f = 0; f < voice_tb.length; f++)
				voice_tb[f].combine = v
			break
		}
		set_v_param("combine", v)
		break
	case "voicemap":
		set_v_param("map", param)
		break
	case "voicescale":
		v = parseFloat(param)
		if (isNaN(v) || v < .6 || v > 1.5) {
			syntax(1, err_bad_val_s, "%%" + cmd)
			return
		}
		set_v_param("scale", v)
		break
	default:		// memorize all global commands
		if (parse.state == 0)
			cfmt[cmd] = param
		break
	}
}

// font stuff

// initialize the default fonts
function font_init() {
	param_set_font("annotationfont", "sans-serif 12");
	param_set_font("composerfont", "serifItalic 14");
	param_set_font("footerfont", "serif 16");
	param_set_font("gchordfont", "sans-serif 12");
	param_set_font("headerfont", "serif 16");
	param_set_font("historyfont", "serif 16");
	param_set_font("infofont", "serifItalic 14");
	param_set_font("measurefont", "serifItalic 14");
	param_set_font("partsfont", "serif 15");
	param_set_font("repeatfont", "serif 13");
	param_set_font("subtitlefont", "serif 16");
	param_set_font("tempofont", "serifBold 15");
	param_set_font("textfont", "serif 16");
	param_set_font("titlefont", "serif 20");
	param_set_font("vocalfont", "serifBold 13");
	param_set_font("voicefont", "serifBold 13");
	param_set_font("wordsfont", "serif 16")
}

// build a font style
function style_font(fn) {		// 'font_name'.'size'
	var	r = fn.split('.'),
		sz = r[1],
		i = fn.indexOf("Italic"),
		j = 100,
		o = fn.indexOf("Oblique"),
		b = fn.indexOf("Bold");

	fn = r[0];
	r = ''
	if (b > 0) {
		r += "font-weight:bold; ";
		j = b
	}
	if (i > 0 || o > 0) {
		if (i > 0) {
			r += "font-style:italic; "
			if (i < j)
				j = i
		}
		if (o > 0) {
			r += "font-style:oblique; "
			if (o < j)
				j = o
		}
	}
	if (j != 100) {
		if (fn[j - 1] == '-')
			j--;
		fn = fn.slice(0, j)
	}
	return 'font-family:' + fn + '; ' + r + 'font-size:' + sz + 'px'
}
Abc.prototype.style_font = style_font

// build a font class
function font_class(font) {
	if (font.class)
		return 'f' + font.fid + cfmt.fullsvg + ' ' + font.class
	return 'f' + font.fid + cfmt.fullsvg
}

// output a font style
function style_add_font(font) {
	font_style += "\n.f" + font.fid + cfmt.fullsvg +
			" {" + style_font(font.name + '.' + font.size) + "}"
}

// use the font
function use_font(font) {
	if (!defined_font[font.fid]) {
		defined_font[font.fid] = true;
		style_add_font(font)
	}
}

// get the font of the 'xxxfont' parameter
function get_font(xxx) {
	xxx += "font"
	var	fn = cfmt[xxx],
		font = font_tb[fn]
	if (!font) {
		syntax(1, "Unknown font $1", xxx);
		font = gene.curfont
	}
	if (!font.fid)
		font.fid = fid++;
	use_font(font)
	return font
}
// abc2svg - front.js - ABC parsing front-end
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

/* translation table from the ABC draft version 2 */
var abc_utf = {
	"=D": "Đ",
	"=H": "Ħ",
	"=T": "Ŧ",
	"=d": "đ",
	"=h": "ħ",
	"=t": "ŧ",
	"/O": "Ø",
	"/o": "ø",
//	"/D": "Đ",
//	"/d": "đ",
	"/L": "Ł",
	"/l": "ł",
	"vL": "Ľ",
	"vl": "ľ",
	"vd": "ď",
	".i": "ı",
	"AA": "Å",
	"aa": "å",
	"AE": "Æ",
	"ae": "æ",
	"DH": "Ð",
	"dh": "ð",
//	"ng": "ŋ",
	"OE": "Œ",
	"oe": "œ",
	"ss": "ß",
	"TH": "Þ",
	"th": "þ"
}

// convert the escape sequences to utf-8
function cnv_escape(src) {
	var	c, c2,
		dst = "",
		i, j = 0, codeUnits

	while (1) {
		i = src.indexOf('\\', j)
		if (i < 0)
			break
		dst += src.slice(j, i);
		c = src[++i]
		if (!c)
			return dst + '\\'
		switch (c) {
		case '0':
		case '2':
			if (src[i + 1] == '0') {
				switch (src[i + 2]) {	// compatibility
				case '1':
					dst += "\u266f";
					j = i + 3
					continue
				case '2':
					dst += "\u266d";
					j = i + 3
					continue
				case '3':
					dst += "\u266e";
					j = i + 3
					continue
				case '4':
					dst += "&#x1d12a;";
					j = i + 3
					continue
				case '5':
					dst += "&#x1d12b;";
					j = i + 3
					continue
				}
			}
				// fall thru
		case '1':
		case '3':
			if (src[i + 1] >= '0' && src[i + 1] <= '7'
			 && src[i + 2] >= '0' && src[i + 2] <= '7') {
				j = parseInt(src.slice(i, i + 3), 8);
				dst += String.fromCharCode(j);
				j = i + 3
				continue
			}
			break
		case 'u':
			j = Number("0x" + src.slice(i + 1, i + 5));
			if (isNaN(j)) {
				dst += src[++i] + "\u0306"	// breve
				j = i + 1
				continue
			}
			codeUnits = [j]
			if (j >= 0xd800 && j <= 0xdfff) {	// surrogates
				j = Number("0x" + src.slice(i + 7, i + 11));
				if (isNaN(j))
					break		// bad surrogate
				codeUnits.push(j);
				j = i + 11
			} else {
				j = i + 5
			}
			dst += String.fromCharCode.apply(null, codeUnits)
			continue
		case 't':
			dst += ' ';
			j = i + 1
			continue
		default:
			c2 = abc_utf[src.slice(i, i + 2)]
			if (c2) {
				dst += c2;
				j = i + 2
				continue
			}

			// try unicode combine characters
			switch (c) {
			case '`':
				dst += src[++i] + "\u0300"	// grave
				j = i + 1
				continue
			case "'":
				dst += src[++i] + "\u0301"	// acute
				j = i + 1
				continue
			case '^':
				dst += src[++i] + "\u0302"	// circumflex
				j = i + 1
				continue
			case '~':
				dst += src[++i] + "\u0303"	// tilde
				j = i + 1
				continue
			case '=':
				dst += src[++i] + "\u0304"	// macron
				j = i + 1
				continue
			case '_':
				dst += src[++i] + "\u0305"	// overline
				j = i + 1
				continue
			case '.':
				dst += src[++i] + "\u0307"	// dot
				j = i + 1
				continue
			case '"':
				dst += src[++i] + "\u0308"	// dieresis
				j = i + 1
				continue
			case 'o':
				dst += src[++i] + "\u030a"	// ring
				j = i + 1
				continue
			case ':':
				dst += src[++i] + "\u030b"	// double acute
				j = i + 1
				continue
			case 'v':
				dst += src[++i] + "\u030c"	// caron
				j = i + 1
				continue
//			case ',':
//				dst += src[++i] + "\u0326"	// comma below
//				j = i + 1
//				continue
			case 'c':
				dst += src[++i] + "\u0327"	// cedilla
				j = i + 1
				continue
			case ';':
				dst += src[++i] + "\u0328"	// ogonek
				j = i + 1
				continue
			}
			break
		}
		dst += '\\' + c;
		j = i + 1
	}
	return dst + src.slice(j)
}

// ABC include
var include = 0

function do_include(fn) {
	var file, parse_sav

	if (!user.read_file) {
		syntax(1, "No read_file support")
		return
	}
	if (include > 2) {
		syntax(1, "Too many include levels")
		return
	}
	include++;
	file = user.read_file(fn)
	if (!file) {
		syntax(1, "Cannot read file '$1'", fn)
		return
	}
	if (fn.slice(-3) == '.js') {
		eval(file)
	} else {
		parse_sav = clone(parse);
		tosvg(fn, file);
		parse = parse_sav
	}
	include--
}

var	err_ign_s = "$1: inside tune - ignored",
	err_bad_val_s = "Bad value in $1"

// parse ABC code
function tosvg(in_fname,		// file name
		file) {			// file content
	var	i, c, bol, eol, end,
		ext, select,
		line0, line1,
		last_info, opt, text, a, b, s,
		cfmt_sav, info_sav, char_tb_sav, glovar_sav, maps_sav,
		mac_sav, maci_sav,
		pscom,
		txt_add = '\n',		// for "+:"
		eof = file.length

	// check if a tune is selected
	function tune_selected() {
		var	re, res,
			i = file.indexOf('K:', bol)

		if (i < 0) {
//			syntax(1, "No K: in tune")
			return false
		}
		i = file.indexOf('\n', i)
		if (parse.select.test(file.slice(bol, i)))
			return true
		re = /\n\w*\n/;
		re.lastIndex = i;
		res = re.exec(file)
		if (res)
			eol = re.lastIndex
		else
			eol = eof
		return false
	} // tune_selected()

	// remove the comment at end of text
	function uncomment(src, do_escape) {
		var i, j, c, l

		if (do_escape && src.indexOf('\\') >= 0)
			src = cnv_escape(src);
		j = 0
		while (1) {
			i = src.indexOf('%', j)
			if (i < 0)
				break
			if (src[i - 1] != '\\') {
				src = src.slice(0, i)
				break
			}
			j = i + 1
		}
		src = src.replace(/\s+$/, '');		// trimRight
		return src.replace(/\\%/g,'%')
	} // uncomment()

	function end_tune() {
		generate()
		if (info.W)
			put_words(info.W);
		put_history();
		blk_flush();
		parse.state = 0;		// file header
		cfmt = cfmt_sav;
		info = info_sav;
		char_tb = char_tb_sav;
		glovar = glovar_sav;
		maps = maps_sav;
		mac = mac_sav;
		maci = maci_sav;
		init_tune()
		img.chg = true;
		set_page();
	} // end_tune()

	// initialize
	parse.file = file;		// used for errors
	parse.ctx = {
		fname: in_fname
	}

	// scan the file
	bol = 0
	for (bol = 0; bol < eof; bol = parse.eol + 1) {
		eol = file.indexOf('\n', bol)	// get a line
		if (eol < 0)
			eol = eof;
		parse.eol = eol

		// remove the ending white spaces
		while (1) {
			eol--
			switch (file[eol]) {
			case ' ':
			case '\t':
				continue
			}
			break
		}
		eol++
		if (eol == bol) {		// empty line
			if (parse.state == 1) {
				parse.istart = bol;
				syntax(1, "Empty line in tune header - ignored")
			} else if (parse.state >= 2) {
				end_tune()
				if (parse.select) {	// skip to next tune
					eol = file.indexOf('\nX:', parse.eol)
					if (eol < 0)
						eol = eof
					parse.eol = eol
				}
			}
			continue
		}
		parse.istart = parse.bol = bol;
		parse.iend = eol;
		parse.line.index = 0;

		// check if the line is a pseudo-comment or I:
		line0 = file[bol];
		line1 = file[bol + 1]
		if (line0 == '%') {
			if (parse.prefix.indexOf(line1) < 0)
				continue		// comment

			// change "%%abc xxxx" to "xxxx"
			if (file[bol + 2] == 'a'
			 && file[bol + 3] == 'b'
			 && file[bol + 4] == 'c'
			 && file[bol + 5] == ' ') {
				bol += 6;
				line0 = file[bol];
				line1 = file[bol + 1]
			} else {
				pscom = true
			}
		} else if (line0 == 'I' && line1 == ':') {
			pscom = true
		}

		// pseudo-comments
		if (pscom) {
			pscom = false;
			bol += 2		// skip %%/I:
			while (1) {
				switch (file[bol]) {
				case ' ':
				case '\t':
					bol++
					continue
				}
				break
			}
			text = file.slice(bol, eol)
			if (!text || text[0] == '%')
				continue
			a = text.split(/\s+/, 2)
			if (!a[0])
				a.shift()
			switch (a[0]) {
			case "abcm2ps":
			case "ss-pref":
				parse.prefix = a[1]
				continue
			case "abc-include":
				ext = a[1].match(/.*\.(.*)/)
				if (!ext)
					continue
				switch (ext[1]) {
				case "abc":
				case "js":
					do_include(a[1])
					break
				}
				continue
			}

			// beginxxx/endxxx
			b = a[0].match(/begin(.*)/)
			if (b) {
//fixme: ignore "I:beginxxx" ... ?
				end = '\n' + line0 + line1 + "end" + b[1];
				i = file.indexOf(end, eol)
				if (i < 0) {
					syntax(1, "No $1 after %%$2",
							end.slice(1), b[0]);
					parse.eol = eof
					continue
				}
				do_begin_end(b[1], a[1],
					file.slice(eol + 1, i).replace(
						new RegExp('^' + line0 + line1, 'gm'),
										''));
				parse.eol = file.indexOf('\n', i + 6)
				if (parse.eol < 0)
					parse.eol = eof
				continue
			}
			switch (a[0]) {
			case "select":
				if (parse.state != 0) {
					syntax(1, "%%select ignored")
					continue
				}
				select = uncomment(text.slice(7).trim(),
							false)
				if (select[0] == '"')
					select = select.slice(1, -1);
				select = select.replace(/\(/g, '\\(');
				select = select.replace(/\)/g, '\\)');
//				select = select.replace(/\|/g, '\\|');
				parse.select = new RegExp(select, 'm')
				continue
			case "tune":
				syntax(1, "%%tune not treated yet")
				continue
			case "voice":
				if (parse.state != 0) {
					syntax(1, "%%voice ignored")
					continue
				}
				select = uncomment(text.slice(6).trim(), false)

				/* if void %%voice, free all voice options */
				if (!select) {
					if (parse.cur_tune_opts)
						parse.cur_tune_opts.voice_opts = null
					else
						parse.voice_opts = null
					continue
				}
				
				if (select == "end")
					continue	/* end of previous %%voice */

				/* get the voice options */
				if (parse.cur_tune_opts) {
					if (!parse.cur_tune_opts.voice_opts)
						parse.cur_tune_opts.voice_opts = {}
					opt = parse.cur_tune_opts.voice_opts
				} else {
					if (!parse.voice_opts)
						parse.voice_opts = {}
					opt = parse.voice_opts
				}
				opt[select] = []
				while (1) {
					bol = ++eol
					if (file[bol] != '%')
						break
					eol = file.indexOf('\n', eol);
					if (file[bol + 1] != line1)
						continue
					bol += 2
					if (eol < 0)
						text = file.slice(bol)
					else
						text = file.slice(bol, eol);
					a = text.match(/\S+/)
					switch (a[0]) {
					default:
						opt[select].push(
							uncomment(text.trim(), true))
						continue
					case "score":
					case "staves":
					case "tune":
					case "voice":
						bol -= 2
						break
					}
					break
				}
				parse.eol = bol - 1
				continue
			}
			do_pscom(uncomment(text.trim(), true))
			continue
		}

		// music line (or free text)
		if (line1 != ':') {
			last_info = undefined;
			if (parse.state < 2)
				continue
			parse.line.buffer = file.slice(bol, eol);
			parse_music_line()
			continue
		}

		// information fields
		text = uncomment(file.slice(bol + 2, eol).trim(),
				 true)
		if (line0 == '+') {
			if (!last_info) {
				syntax(1, "+: without previous info field")
				continue
			}
			txt_add = ' ';		// concatenate
			line0 = last_info
		}

		switch (line0) {
		case 'X':			// start of tune
			if (parse.state != 0) {
				syntax(1, err_ign_s, line0)
				continue
			}
			if (parse.select
			 && !tune_selected()) {	// skip to the next tune
				eol = file.indexOf('\nX:', parse.eol)
				if (eol < 0)
					eol = eof;
				parse.eol = eol
				continue
			}

			cfmt_sav = clone(cfmt);
			cfmt.pos = clone(cfmt.pos);
			info_sav = clone(info)
			if (info.V) {
				info_sav.V = {}
				for (i in info.V)
				    if (info.V.hasOwnProperty(i))
					info_sav.V[i] = clone(info.V[i])
			}
			char_tb_sav = clone(char_tb);
			glovar_sav = clone(glovar);
			maps_sav = maps;
			mac_sav = clone(mac);
			maci_sav = new Int8Array(128)
			for (i = 0; i < 128; i++)
				maci_sav[i] = maci[i];
			info.X = text;
			parse.state = 1			// tune header
			continue
		case 'T':
			switch (parse.state) {
			case 0:
				continue
			case 1:
				if (info.T == undefined)	// (keep empty T:)
					info.T = text
				else
					info.T += "\n" + text
				continue
			}
			s = new_block("title");
			s.text = text
			continue
		case 'K':
			switch (parse.state) {
			case 0:
				continue
			case 1:				// tune header
				info.K = text
				break
			}
			do_info(line0, text)
			continue
		case 'W':
			if (parse.state == 0
			 || cfmt.writefields.indexOf(line0) < 0)
				break
			if (info.W == undefined)
				info.W = text
			else
				info.W += txt_add + text
			break

		case 'm':
			if (parse.state >= 2) {
				syntax(1, err_ign_s, line0)
				continue
			}
			if ((!cfmt.sound || cfmt.sound != "play")
			 && cfmt.writefields.indexOf(line0) < 0)
				break
			a = text.match(/(.*?)[= ]+(.*)/)
			if (!a || !a[2]) {
				syntax(1, err_bad_val_s, "m:")
				continue
			}
			mac[a[1]] = a[2];
			maci[a[1].charCodeAt(0)] = 1	// first letter
			break

		// info fields in tune body only
		case 's':
			if (parse.state != 3
			 || cfmt.writefields.indexOf(line0) < 0)
				break
			get_sym(text, txt_add == ' ')
			break
		case 'w':
			if (parse.state != 3
			 || cfmt.writefields.indexOf(line0) < 0)
				break
			get_lyrics(text, txt_add == ' ')
			if (text.slice(-1) == '\\') {	// old continuation
				txt_add = ' ';
				last_info = line0
				continue
			}
			break
		case '|':			// "|:" starts a music line
			if (parse.state < 2)
				continue
			parse.line.buffer = file.slice(bol, eol);
			parse_music_line()
			continue
		default:
			if ("ABCDFGHOSZ".indexOf(line0) >= 0) {
				if (parse.state >= 2) {
					syntax(1, err_ign_s, line0)
					continue
				}
//				if (cfmt.writefields.indexOf(c) < 0)
//					break
				if (!info[line0])
					info[line0] = text
				else
					info[line0] += txt_add + text
				break
			}

			// info field which may be embedded
			do_info(line0, text)
			continue
		}
		txt_add = '\n';
		last_info = line0
	}
	if (include)
		return
	if (parse.state >= 2)
		end_tune();
	parse.state = 0
}
Abc.prototype.tosvg = tosvg
// abc2svg - music.js - music generation
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

var	gene,
	staff_tb,
	nstaff,			// current number of staves
	tsnext,			// next line when cut
	realwidth,		// real staff width while generating
	insert_meter,		// insert time signature (1) and indent 1st line (2)
	beta_last,		// for last short short line..

/* width of notes indexed by log2(note_length) */
	space_tb = new Float32Array([
		7, 10, 14.15, 20, 28.3,
		40,			/* crotchet (whole note / 4) */
		56.6, 80, 100, 120
	]),
	smallest_duration

/* -- decide whether to shift heads to other side of stem on chords -- */
/* this routine is called only once per tune */

// distance for no overlap - index: [prev acc][cur acc]
//var dt_tb = [
//	[5, 5, 5, 5],		/* dble sharp */
//	[5, 6, 6, 6],		/* sharp */
//	[5, 6, 5, 6],		/* natural */
//	[5, 5, 5, 5]		/* flat / dble flat */
//]

// accidental x offset - index = note head type
var dx_tb = new Float32Array([
	10,		// FULL
	10,		// EMPTY
	11,		// OVAL
	13,		// OVALBARS
	13		// SQUARE
])

// head width  - index = note head type
var hw_tb = new Float32Array([
	4.5,		// FULL
	5,		// EMPTY
	6,		// OVAL
	7,		// OVALBARS
	8		// SQUARE
])

/* head width for voice overlap - index = note head type */
var w_note = new Float32Array([
	3.5,		// FULL
	3.7,		// EMPTY
	5,		// OVAL
	6,		// OVALBARS
	7		// SQUARE
])

function set_head_shift(s) {
	var	i, i1, i2, d, ps, dx,
		dx_head = dx_tb[s.head],
		dir = s.stem,
		n = s.nhd

	if (n == 0)
		return			// single note

	/* set the head shifts */
	dx = dx_head * .78
	if (s.grace)
		dx *= .5
	if (dir >= 0) {
		i1 = 1;
		i2 = n + 1;
		ps = s.notes[0].pit
	} else {
		dx = -dx;
		i1 = n - 1;
		i2 = -1;
		ps = s.notes[n].pit
	}
	var	shift = false,
		dx_max = 0
	for (i = i1; i != i2; i += dir) {
		d = s.notes[i].pit - ps;
		ps = s.notes[i].pit
		if (d == 0) {
			if (shift) {		/* unison on shifted note */
				var new_dx = s.notes[i].shhd =
						s.notes[i - dir].shhd + dx
				if (dx_max < new_dx)
					dx_max = new_dx
				continue
			}
			if (i + dir != i2	/* second after unison */
//fixme: should handle many unisons after second
			 && ps + dir == s.notes[i + dir].pit) {
				s.notes[i].shhd = -dx
				if (dx_max < -dx)
					dx_max = -dx
				continue
			}
		}
		if (d < 0)
			d = -d
		if (d > 3 || (d >= 2 && s.head != SQUARE)) {
			shift = false
		} else {
			shift = !shift
			if (shift) {
				s.notes[i].shhd = dx
				if (dx_max < dx)
					dx_max = dx
			}
		}
	}
	s.xmx = dx_max				/* shift the dots */
}

// set the accidental shifts for a set of chords
function acc_shift(notes, dx_head) {
	var	i, i1, dx, dx1, ps, p1, acc,
		n = notes.length

	// set the shifts from the head shifts
	for (i = n - 1; --i >= 0; ) {	// (no shift on top)
		dx = notes[i].shhd
		if (!dx || dx > 0)
			continue
		dx = dx_head - dx;
		ps = notes[i].pit
		for (i1 = n; --i1 >= 0; ) {
			if (!notes[i1].acc)
				continue
			p1 = notes[i1].pit
			if (p1 < ps - 3)
				break
			if (p1 > ps + 3)
				continue
			if (notes[i1].shac < dx)
				notes[i1].shac = dx
		}
	}

	// set the shifts from accidental shifts
	for (i = n; --i >= 0; ) {		// from top to bottom
		acc = notes[i].acc
		if (!acc)
			continue
		dx = notes[i].shac
		if (!dx) {
			dx = notes[i].shhd
			if (dx < 0)
				dx = dx_head - dx
			else
				dx = dx_head
		}
		ps = notes[i].pit
		for (i1 = n; --i1 > i; ) {
			if (!notes[i1].acc)
				continue
			p1 = notes[i1].pit
			if (p1 >= ps + 4) {	// pitch far enough
				if (p1 > ps + 4	// if more than a fifth
				 || acc < 0	// if flat/dble flat
				 || notes[i1].acc < 0)
					continue
			}
			if (dx > notes[i1].shac - 6) {
				dx1 = notes[i1].shac + 7
				if (dx1 > dx)
					dx = dx1
			}
		}
		notes[i].shac = dx
	}
}

/* set the horizontal shift of accidentals */
/* this routine is called only once per tune */
function set_acc_shft() {
	var s, s2, st, i, acc, st, t, dx_head;

	// search the notes with accidentals at the same time
	s = tsfirst
	while (s) {
		if (s.type != NOTE
		 || s.invis) {
			s = s.ts_next
			continue
		}
		st = s.st;
		t = s.time;
		acc = false
		for (s2 = s; s2; s2 = s2.ts_next) {
			if (s2.time != t
			 || s2.type != NOTE
			 || s2.st != st)
				break
			if (acc)
				continue
			for (i = 0; i <= s2.nhd; i++) {
				if (s2.notes[i].acc) {
					acc = true
					break
				}
			}
		}
		if (!acc) {
			s = s2
			continue
		}

		dx_head = dx_tb[s.head]
//		if (s.dur >= BASE_LEN * 2 && s.head == OVAL)
//		if (s.dur >= BASE_LEN * 2)
//			dx_head = 15.8;

		// build a pseudo chord and shift the accidentals
		st = {
			notes: []
		}
		for ( ; s != s2; s = s.ts_next)
			st.notes = st.notes.concat(s.notes);
		sort_pitch(st);
		acc_shift(st.notes, dx_head)
	}
}

// link a symbol before an other one
function lkvsym(s, next) {	// voice linkage
	s.next = next;
	s.prev = next.prev
	if (s.prev)
		s.prev.next = s
	else
		s.p_v.sym = s;
	next.prev = s
}
function lktsym(s, next) {	// time linkage
	if (next) {
		s.ts_next = next;
		s.ts_prev = next.ts_prev
		if (s.ts_prev)
			s.ts_prev.ts_next = s;
		next.ts_prev = s
	} else {
		s.ts_next = s.ts_prev = null
	}
}

/* -- unlink a symbol -- */
function unlksym(s) {
	if (s.next)
		s.next.prev = s.prev
	if (s.prev)
		s.prev.next = s.next
	else
		s.p_v.sym = s.next
	if (s.ts_next) {
		if (s.seqst && !s.ts_next.seqst) {
			s.ts_next.seqst = true;
			s.ts_next.shrink = s.shrink;
			s.ts_next.space = s.space
		}
		s.ts_next.ts_prev = s.ts_prev
	}
	if (s.ts_prev)
		s.ts_prev.ts_next = s.ts_next
	if (tsfirst == s)
		tsfirst = s.ts_next
	if (tsnext == s)
		tsnext = s.ts_next
}

/* -- check if voice combine may occur -- */
function may_combine(s) {
	var	nhd2,
		s2 = s.ts_next

	if (!s2 || (s2.type != NOTE && s2.type != REST))
		return false
	if (s2.v == s.v
	 || s2.st != s.st
	 || s2.time != s.time
	 || s2.dur != s.dur)
		return false
	if (s.combine <= 0
	 && s2.type != s.type)
		return false
//	if (s2.a_dd) { //fixme: should check the double decorations
//		return false
//	}
	if (s.a_gch && s2.a_gch)
		return false
	if (s.type == REST) {
		if (s.type == s2.type && s.invis && !s2.invis)
			return false
		return true
	}
	if (s2.a_ly
	 || s2.sl1 || s2.sl2
	 || s2.slur_start || s2.slur_end)
		return false
	if (s2.beam_st != s.beam_st
	 || s2.beam_end != s.beam_end)
		return false;
	nhd2 = s2.nhd
	if (s.combine <= 1
	 && s.notes[0].pit <= s2.notes[nhd2].pit + 1)
		return false
	return true
}

/* combine two notes */
function combine_notes(s, s2) {
	var nhd, type, m

	s.notes = s.notes.concat(s2.notes);
	s.nhd = nhd = s.notes.length - 1;
	sort_pitch(s)			/* sort the notes by pitch */

	if (s.combine >= 3) {		// remove unison heads
		for (m = nhd; m > 0; m--) {
			if (s.notes[m].pit == s.notes[m - 1].pit
			 && s.notes[m].acc == s.notes[m - 1].acc)
				s.notes.splice(m, 1)
		}
		s.nhd = nhd = s.notes.length - 1
	}

	s.ymx = 3 * (s.notes[nhd].pit - 18) + 4;
	s.ymn = 3 * (s.notes[0].pit - 18) - 4;

	/* force the tie directions */
	type = s.notes[0].ti1
	if ((type & 0x0f) == SL_AUTO)
		s.notes[0].ti1 = SL_BELOW | (type & ~SL_DOTTED);
	type = s.notes[nhd].ti1
	if ((type & 0x0f) == SL_AUTO)
		s.notes[nhd].ti1 = SL_ABOVE | (type & ~SL_DOTTED)
}

/* -- combine 2 voices -- */
function do_combine(s) {
	var s2, nhd, nhd2, type

	while (1) {
		nhd = s.nhd;
		s2 = s.ts_next;
		nhd2 = s2.nhd
		if (s.type != s2.type) {	/* if note and rest */
			if (s2.type != REST) {
				s2 = s;
				s = s2.ts_next
			}
		} else if (s.type == REST) {
			if (s.invis
			 && !s2.invis)
				delete s.invis
		} else {
			combine_notes(s, s2)
		}

		if (s2.a_gch)
			s.a_gch = s2.a_gch;
		if (s2.a_dd) {
			if (!s.a_dd)
				s.a_dd = s2.a_dd
			else
				s.a_dd = s.a_dd.concat(s2.a_dd)
		}
		unlksym(s2)			/* remove the next symbol */

		/* there may be more voices */
		if (s.in_tuplet || !may_combine(s))
			break
	}
}

/* try to combine voices */
function combine_voices() {
	var s, s2, g, i, r

	for (s = tsfirst; s; s = s.ts_next) {
		switch (s.type) {
		case REST:
			if (s.combine < 0)
				continue
			if (may_combine(s))
				do_combine(s)
			continue
		default:
			continue
		case NOTE:
			if (s.combine <= 0)
				continue
			break
		}

		if (!s.beam_st)
			continue
		if (s.beam_end) {
			if (may_combine(s))
				do_combine(s)
			continue
		}

		s2 = s
		while (1) {
			if (!may_combine(s2)) {
				s2 = null
				break
			}
//fixme: may have rests in beam
			if (s2.beam_end)
				break
			do {
				s2 = s2.next
			} while (s2.type != NOTE && s2.type != REST)
		}
		if (!s2)
			continue
		s2 = s
		while (1) {
			do_combine(s2)
//fixme: may have rests in beam
			if (s2.beam_end)
				break
			do {
				s2 = s2.next
			} while (s2.type != NOTE && s2.type != REST)
		}
	}
}

/* -- insert a clef change (treble or bass) before a symbol -- */
function insert_clef(s, clef_type, clef_line) {
	var	p_voice = s.p_v,
		new_s,
		st = s.st

	/* don't insert the clef between two bars */
	if (s.type == BAR && s.prev && s.prev.type == BAR)
		s = s.prev;

	/* create the symbol */
	p_voice.last_sym = s.prev
	if (!p_voice.last_sym)
		p_voice.sym = null;
	p_voice.time = s.time;
	new_s = sym_add(p_voice, CLEF);
	new_s.next = s;
	s.prev = new_s;

	new_s.clef_type = clef_type;
	new_s.clef_line = clef_line;
	new_s.st = st;
	new_s.clef_small = true
	delete new_s.second;
	new_s.notes = []
	new_s.notes[0] = {
		pit: s.notes[0].pit
	}
	new_s.nhd = 0;

	/* link in time */
	while (!s.seqst)
		s = s.ts_prev;
	lktsym(new_s, s)
	if (new_s.ts_prev.type != CLEF)
		new_s.seqst = true
	return new_s
}

/* -- set the staff of the floating voices -- */
/* this function is called only once per tune */
function set_float() {
	var p_voice, st, staff_chg, v, s, s1, up, down

	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
//		if (!p_voice.floating)
//			continue
		staff_chg = false;
		st = p_voice.st
		for (s = p_voice.sym; s; s = s.next) {
			if (!s.floating) {
				while (s && !s.floating)
					s = s.next
				if (!s)
					break
				staff_chg = false
			}
			if (!s.dur) {
				if (staff_chg)
					s.st++
				continue
			}
			if (s.notes[0].pit >= 19) {		/* F */
				staff_chg = false
				continue
			}
			if (s.notes[s.nhd].pit <= 12) {	/* F, */
				staff_chg = true
				s.st++
				continue
			}
			up = 127
			for (s1 = s.ts_prev; s1; s1 = s1.ts_prev) {
				if (s1.st != st
				 || s1.v == s.v)
					break
				if (s1.type == NOTE)
				    if (s1.notes[0].pit < up)
					up = s1.notes[0].pit
			}
			if (up == 127) {
				if (staff_chg)
					s.st++
				continue
			}
			if (s.notes[s.nhd].pit > up - 3) {
				staff_chg = false
				continue
			}
			down = -127
			for (s1 = s.ts_next; s1; s1 = s1.ts_next) {
				if (s1.st != st + 1
				 || s1.v == s.v)
					break
				if (s1.type == NOTE)
				    if (s1.notes[s1.nhd].pit > down)
					down = s1.notes[s1.nhd].pit
			}
			if (down == -127) {
				if (staff_chg)
					s.st++
				continue
			}
			if (s.notes[0].pit < down + 3) {
				staff_chg = true
				s.st++
				continue
			}
			up -= s.notes[s.nhd].pit
			down = s.notes[0].pit - down
			if (!staff_chg) {
				if (up < down + 3)
					continue
				staff_chg = true
			} else {
				if (up < down - 3) {
					staff_chg = false
					continue
				}
			}
			s.st++
		}
	}
}

/* -- set the x offset of the grace notes -- */
function set_graceoffs(s) {
	var	next, m, dx,
		gspleft = Number(cfmt.gracespace[0]),
		gspinside = Number(cfmt.gracespace[1]),
		gspright = Number(cfmt.gracespace[2]),
		xx = 0,
		g = s.extra;

	g.beam_st = true
	for ( ; ; g = g.next) {
		set_head_shift(g)
		acc_shift(g.notes, 7);
		dx = 0
		for (m = g.nhd; m >= 0; m--) {
			if (g.notes[m].shac > dx)
				dx = g.notes[m].shac
		}
		xx += dx;
		g.x = xx

		if (g.nflags <= 0) {
			g.beam_st = true;
			g.beam_end = true
		}
		next = g.next
		if (!next) {
			g.beam_end = true
			break
		}
		if (next.nflags <= 0)
			g.beam_end = true
		if (g.beam_end) {
			next.beam_st = true;
			xx += gspinside / 4
		}
		if (g.nflags <= 0)
			xx += gspinside / 4
		if (g.y > next.y + 8)
			xx -= 1.5
		xx += gspinside
	}

	xx += gspleft + gspright;
	next = s.next
	if (next
	 && next.type == NOTE) {	/* if before a note */
		if (g.y >= 3 * (next.notes[next.nhd].pit - 18))
			xx -= 1		/* above, a bit closer */
		else if (g.beam_st
		      && g.y < 3 * (next.notes[0].pit - 18) - 7)
			xx += 2		/* below with flag, a bit further */
	}

	/* return the whole width */
	return xx
}

/* -- compute the width needed by the guitar chords / annotations -- */
function gchord_width(s, wlnote, wlw) {
	var	s2, gch, w, wl, ix,
		lspc = 0,
		rspc = 0,
		alspc = 0,
		arspc = 0

	for (ix = 0; ix < s.a_gch.length; ix++) {
		gch = s.a_gch[ix]
		switch (gch.type) {
		default:		/* default = above */
			wl = -gch.x
			if (wl > lspc)
				lspc = wl;
			w = gch.w + 2- wl
			if (w > rspc)
				rspc = w
			break
		case '<':		/* left */
			w = gch.w + wlnote
			if (w > alspc)
				alspc = w
			break
		case '>':		/* right */
			w = gch.w + s.wr
			if (w > arspc)
				arspc = w
			break
		}
	}

	/* adjust width for no clash */
	s2 = s.prev
	if (s2) {
		if (s2.a_gch) {
			for (s2 = s.ts_prev; ; s2 = s2.ts_prev) {
				if (s2 == s.prev) {
					if (wlw < lspc)
						wlw = lspc
					break
				}
				if (s2.seqst)
					lspc -= s2.shrink
			}
		}
		if (alspc != 0)
			if (wlw < alspc)
				wlw = alspc
	}
	s2 = s.next
	if (s2) {
		if (s2.a_gch) {
			for (s2 = s.ts_next; ; s2 = s2.ts_next) {
				if (s2 == s.next) {
					if (s.wr < rspc)
						s.wr = rspc
					break
				}
				if (s2.seqst)
					rspc -= 8
			}
		}
		if (arspc != 0)
			if (s.wr < arspc)
				s.wr = alspc
	}
	return wlw
}

/* -- set the width of a symbol -- */
/* This routine sets the minimal left and right widths wl,wr
 * so that successive symbols are still separated when
 * no extra glue is put between them */
function set_width(s) {
	var s2, i, m, xx, w, wlnote, wlw, acc

	switch (s.type) {
	case NOTE:
	case REST:

		/* set the note widths */
		s.wr = wlnote = hw_tb[s.head]

		/* room for shifted heads and accidental signs */
		if (s.xmx > 0)
			s.wr += s.xmx + 4;
		for (s2 = s.prev; s2; s2 = s2.prev) {
			if (w_tb[s2.type] != 0)
				break
		}
		if (s2) {
			switch (s2.type) {
			case BAR:
			case CLEF:
			case KEY:
			case METER:
				wlnote += 3
				break
			}
		}
		for (m = 0; m <= s.nhd; m++) {
			xx = s.notes[m].shhd
			if (xx < 0) {
				if (wlnote < -xx + 5)
					wlnote = -xx + 5
			}
			if (s.notes[m].acc) {
				var tmp = s.notes[m].shac +
					(s.notes[m].micro ? 6.5 : 4.5)
				if (wlnote < tmp)
					wlnote = tmp
			}
		}
		if (s2) {
			switch (s2.type) {
			case BAR:
			case CLEF:
			case KEY:
			case METER:
				wlnote -= 3
				break
			}
		}

		/* room for the decorations */
		if (s.a_dd)
			wlnote += deco_width(s)

		/* space for flag if stem goes up on standalone note */
		if (s.beam_st && s.beam_end
		 && s.stem > 0 && s.nflags > 0) {
			if (s.wr < s.xmx + 9)
				s.wr = s.xmx + 9
		}

		/* leave room for dots and set their offset */
		if (s.dots > 0) {
			switch (s.head) {
			case SQUARE:
			case OVALBARS:
			case OVAL:
				s.xmx += 2
				break
			case EMPTY:
				s.xmx += 1
				break
			}
			if (s.wr < s.xmx + 12)
				s.wr = s.xmx + 12
			if (s.dots >= 2)
				s.wr += 3.5 * (s.dots - 1)
		}

		/* if a tremolo on 2 notes, have space for the small beam(s) */
		if (s.trem2 && s.beam_end
		 && wlnote < 20)
			wlnote = 20

		wlw = wlnote

		if (s2) {
			switch (s2.type) {
			case NOTE:	/* extra space when up stem - down stem */
				if (s2.stem > 0 && s.stem < 0) {
					if (wlw < 7)
						wlw = 7
				}

				/* make sure helper lines don't overlap */
				if ((s.y > 27 && s2.y > 27)
				 || (s.y < -3 && s2.y < -3)) {
					if (wlw < 6)
						wlw= 6
				}

				/* have ties wide enough */
				if (s2.ti1) {
					if (wlw < 14)
						wlw = 14
				}
				break
			case CLEF:		/* extra space at start of line */
				if (s2.second
				 || s2.clef_small)
					break
				wlw += 8
				break
			case KEY:
/*			case METER:	*/
				wlw += 4
				break
			}
		}

		/* leave room for guitar chord */
		if (s.a_gch)
			wlw = gchord_width(s, wlnote, wlw)

		/* leave room for vocals under note */
		/* related to draw_lyrics() */
		if (s.a_ly)
			wlw = ly_width(s, wlw)

		/* if preceeded by a grace note sequence, adjust */
		if (s2 && s2.type == GRACE)
			s.wl = wlnote - 4.5
		else
			s.wl = wlw
		return
	case SPACE:
		xx = s.width / 2;
		s.wr = xx
		if (s.a_gch)
			xx = gchord_width(s, xx, xx)
		if (s.a_dd)
			xx += deco_width(s);
		s.wl = xx
		return
	case BAR:
		if (s.norepbra)
			break
		if (!s.invis) {
			var bar_type = s.bar_type

			switch (bar_type) {
			case "|":
				w = 8		// 5 + 3
				break
			case "|:":
			case ":|":
				w = 16		// 5 + 3 + 3 + 5
				break
			case "::":
				w = 24		// 5 + 5 + 3 + 3 + 3 + 5
				break
			default:
				if (!bar_type)
					break
				w = 5 + 3 * bar_type.length
				for (i = 0; i < bar_type.length; i++) {
					switch (bar_type[i]) {
					case "[":
					case "]":
						w += 3
						break
					case ":":
						w += 2
						break
					}
				}
				break
			}
			s.wl = w
			if (s.next
			 && s.next.type != METER)
				s.wr = 8
			else
				s.wr = 5
//			s.notes[0].shhd = (w - 5) * -.5

			/* if preceeded by a grace note sequence, adjust */
			for (s2 = s.prev; s2; s2 = s2.prev) {
				if (w_tb[s2.type] != 0) {
					if (s2.type == GRACE)
						s.wl -= 8
					break
				}
			}
		} else {
			s.wl = s.wr = 0
		}
		if (s.a_dd)
			s.wl += deco_width(s)

		/* have room for the repeat numbers / chord indication */
		if (s.text && s.text.length < 4
		 && s.next && s.next.a_gch) {
			set_font("repeat");
			s.wr += strw(s.text) + 2
		}
		return
	case CLEF:
		/* shift the clef to the left - see draw_symbols() */
// there may be invisible clefs in empty staves
//		if (s.invis)
//			break
		s.wl = //12;
		    s.wr = s.clef_small ? 9 : 12
		return
	case KEY:
		var n1, n2, esp;

		s.wl = 3;
		esp = 4
		if (!s.k_a_acc) {
			n1 = s.k_sf			/* new key sig */
			if (s.k_old_sf && (cfmt.cancelkey || n1 == 0))
				n2 = s.k_old_sf	/* old key */
			else
				n2 = 0
			if (n1 * n2 >= 0) {		/* if no natural */
				if (n1 < 0)
					n1 = -n1
				if (n2 < 0)
					n2 = -n2
				if (n2 > n1)
					n1 = n2
			} else {
				n1 -= n2
				if (n1 < 0)
					n1 = -n1;
				esp += 3	/* see extra space in draw_keysig() */
			}
		} else {
			n1 = n2 = s.k_a_acc.length
			if (n2)
			    var	last_acc = s.k_a_acc[0].acc
			for (i = 1; i < n2; i++) {
				acc = s.k_a_acc[i]
				if (acc.pit > s.k_a_acc[i - 1].pit + 6
				 || acc.pit < s.k_a_acc[i - 1].pit - 6)
					n1--		// no clash
				else if (acc.acc != last_acc)
					esp += 3;
				last_acc = acc.acc
			}
		}
		s.wr = 5.5 * n1 + esp
		return
	case METER:
		/* !!tied to draw_meter()!! */
		w = 0
		for (i = 0; i < s.a_meter.length; i++) {
			var meter = s.a_meter[i]
			if (meter.top == "C|") {
				w += 6.5
			} else {
				if (!meter.bot
				 || meter.top.length > meter.bot.length)
					w += 6.5 * meter.top.length
				else
					w += 6.5 * meter.bot.length
			}
		}
		s.wl = w;
		s.wr = w + 7
		return
	case MREST:
		s.wl = 6;
		s.wr = 66
		return
	case GRACE:
		s.wl = set_graceoffs(s);
		s.wr = 0
		if (s.a_ly)
			ly_width(s, wlw)
		return
	case STBRK:
		s.wl = s.xmx
		if (s.next && s.next.type == CLEF) {
			s.wr = 2
			delete s.next.clef_small	/* big clef */
		} else {
			s.wr = 8
		}
		return
	case CUSTOS:
		s.wl = s.wr = 4
		return
	case BLOCK:				// no width
	case PART:
	case REMARK:
	case STAVES:
	case TEMPO:
		break
	default:
		error(2, s, "set_width - Cannot set width for symbol $1", s.type)
		break
	}
	s.wl = s.wr = 0
}

/* -- set the natural space -- */
function set_space(s) {
	var	s2, i, l, space,
		prev_time = s.ts_prev.time,
		len = s.time - prev_time		/* time skip */

	if (len == 0) {
		switch (s.type) {
		case MREST:
			return s.wl
///*fixme:do same thing at start of line*/
//		case NOTE:
//		case REST:
//			if (s.ts_prev.type == BAR) {
//				if (s.nflags < -2)
//					return space_tb[0]
//				return space_tb[2]
//			}
//			break
		}
		return 0
	}
	if (s.ts_prev.type == MREST)
//		return s.ts_prev.wr + 16
//				+ 3		// (bar wl=5 wr=8)
		return 71	// 66 (mrest.wl) + 5 (bar.wl)
	if (smallest_duration >= BASE_LEN / 2) {
		if (smallest_duration >= BASE_LEN)
			len /= 4
		else
			len /= 2
	} else if (!s.next && len >= BASE_LEN) {
		len /= 2
	}
	if (len >= BASE_LEN / 4) {
		if (len < BASE_LEN / 2)
			i = 5
		else if (len < BASE_LEN)
			i = 6
		else if (len < BASE_LEN * 2)
			i = 7
		else if (len < BASE_LEN * 4)
			i = 8
		else
			i = 9
	} else {
		if (len >= BASE_LEN / 8)
			i = 4
		else if (len >= BASE_LEN / 16)
			i = 3
		else if (len >= BASE_LEN / 32)
			i = 2
		else if (len >= BASE_LEN / 64)
			i = 1
		else
			i = 0
	}
	l = len - ((BASE_LEN / 16 / 8) << i)
	space = space_tb[i]
	if (l != 0) {
		if (l < 0) {
			space = space_tb[0] * len / (BASE_LEN / 16 / 8)
		} else {
			if (i >= 9)
				i = 8
			space += (space_tb[i + 1] - space_tb[i]) * l / len
		}
	}
	while (!s.dur) {
		switch (s.type) {
		case BAR:
			// (hack to have quite the same note widths between measures)
			return space * .9 - 7
		case CLEF:
			return space - s.wl
		case BLOCK:			// no space
		case PART:
		case REMARK:
		case STAVES:
		case TEMPO:
			s = s.ts_next
			if (!s)
				return space
			continue
		}
		break
	}

	/* reduce spacing within a beam */
	if (!s.beam_st)
		space *= .9			// ex fnnp

	/* decrease spacing when stem down followed by stem up */
/*fixme:to be done later, after x computed in sym_glue*/
	if (s.type == NOTE && s.nflags >= -1
	 && s.stem > 0) {
		var stemdir = true

		for (s2 = s.ts_prev;
		     s2 && s2.time == prev_time;
		     s2 = s2.ts_prev) {
			if (s2.type == NOTE
			 && (s2.nflags < -1 || s2.stem > 0)) {
				stemdir = false
				break
			}
		}
		if (stemdir) {
			for (s2 = s.ts_next;
			     s2 && s2.time == s.time;
			     s2 = s2.ts_next) {
				if (s2.type == NOTE
				 && (s2.nflags < -1 || s2.stem < 0)) {
					stemdir = false
					break
				}
			}
			if (stemdir)
				space *= .9
		}
	}
	return space
}

// create an invisible bar for end of music lines
function add_end_bar(s) {
	return {
		type: BAR,
		bar_type: "|",
		ctx: s.ctx,
		istart: s.istart,
		iend: s.iend,
		v: s.v,
		p_v: s.p_v,
		st: s.st,
		dur: 0,
		seqst: true,
		invis: true,
		time: s.time + s.dur,
		nhd: 0,
		notes: [{
			pit: s.notes[0].pit
		}],
		wl:0,
		wr:0
	}
}

/* -- set the width and space of all symbols -- */
/* this function is called once for the whole tune
 * then, once per music line up to the first sequence */
function set_allsymwidth(last_s) {
	var	new_val,
		s = tsfirst,
		xa = 0,
		xl = []

	/* loop on all symbols */
	while (1) {
		var	maxx = xa,
			s2 = s

		do {
			set_width(s)
			new_val = (xl[s.st] || 0) + s.wl
			if (new_val > maxx)
				maxx = new_val;
			s = s.ts_next
		} while (s != last_s && !s.seqst);

		/* set the spaces at start of sequence */
		s2.shrink = maxx - xa
		if (s2.ts_prev)
			s2.space = set_space(s2)
		else
			s2.space = 0
		if (s2.shrink == 0 && s2.space == 0 && s2.type == CLEF) {
			delete s2.seqst;		/* no space */
			s2.time = s2.ts_prev.time
		}
		if (s == last_s)
			break

		// update the min left space per staff
		xa = maxx;
		s = s2
		do {
			if (!xl[s.st] || xl[s.st] < xa + s.wr)
				xl[s.st] = xa + s.wr;
			s = s.ts_next
		} while (!s.seqst)
	}
}

/* change a symbol into a rest */
function to_rest(s) {
	s.type = REST
// just keep nl and seqst
	delete s.in_tuplet
	delete s.sl1
	delete s.sl2
	delete s.a_dd
	delete s.a_gch
	s.slur_start = s.slur_end = 0
/*fixme: should set many parameters for set_width*/
//	set_width(s)
}

/* -- set the repeat sequences / measures -- */
var	err_no_s = 'Not enough notes/rests for %%repeat',
	err_no_m = 'Not enough measures for %%repeat'

function set_repeat(s) {	// first note
	var	s2, s3,  i, j, dur,
		n = s.repeat_n,
		k = s.repeat_k,
		st = s.st,
		v = s.v

	s.repeat_n = 0				// treated

	/* treat the sequence repeat */
	if (n < 0) {				/* number of notes / measures */
		n = -n;
		i = n				/* number of notes to repeat */
		for (s3 = s.prev; s3; s3 = s3.prev) {
			if (!s3.dur) {
				if (s3.type == BAR) {
					error(1, s3, "Bar in repeat sequence")
					return
				}
				continue
			}
			if (--i <= 0)
				break
		}
		if (!s3) {
			error(1, s, err_no_s)
			return
		}
		dur = s.time - s3.time;

		i = k * n		/* whole number of notes/rests to repeat */
		for (s2 = s; s2; s2 = s2.next) {
			if (!s2.dur) {
				if (s2.type == BAR) {
					error(1, s2, "Bar in repeat sequence")
					return
				}
				continue
			}
			if (--i <= 0)
				break
		}
		if (!s2
		 || !s2.next) {		/* should have some symbol */
			error(1, s, err_no_s)
			return
		}
		for (s2 = s.prev; s2 != s3; s2 = s2.prev) {
			if (s2.type == NOTE) {
				s2.beam_end = true
				break
			}
		}
		for (j = k; --j >= 0; ) {
			i = n			/* number of notes/rests */
			if (s.dur)
				i--;
			s2 = s.ts_next
			while (i > 0) {
				if (s2.st == st) {
					unlksym(s2)
					if (s2.v == v
					 && s2.dur)
						i--
				}
				s2 = s2.ts_next
			}
			to_rest(s);
			s.dur = s.notes[0].dur = dur;
			s.rep_nb = -1;		// single repeat
			s.beam_st = true;
			set_width(s)
			if (s.seqst)
				s.space = set_space(s);
			s.head = SQUARE;
			for (s = s2; s; s = s.ts_next) {
				if (s.st == st
				 && s.v == v
				 && s.dur)
					break
			}
		}
		return
	}

	/* check the measure repeat */
	i = n				/* number of measures to repeat */
	for (s2 = s.prev.prev ; s2; s2 = s2.prev) {
		if (s2.type == BAR
		 || s2.time == tsfirst.time) {
			if (--i <= 0)
				break
		}
	}
	if (!s2) {
		error(1, s, err_no_m)
		return
	}

	dur = s.time - s2.time		/* repeat duration */

	if (n == 1)
		i = k			/* repeat number */
	else
		i = n			/* check only 2 measures */
	for (s2 = s; s2; s2 = s2.next) {
		if (s2.type == BAR) {
			if (--i <= 0)
				break
		}
	}
	if (!s2) {
		error(1, s, err_no_m)
		return
	}

	/* if many 'repeat 2 measures'
	 * insert a new %%repeat after the next bar */
	i = k				/* repeat number */
	if (n == 2 && i > 1) {
		s2 = s2.next
		if (!s2) {
			error(1, s, err_no_m)
			return
		}
		s2.repeat_n = n;
		s2.repeat_k = --i
	}

	/* replace */
	dur /= n
	if (n == 2) {			/* repeat 2 measures (once) */
		s3 = s
		for (s2 = s.ts_next; ; s2 = s2.ts_next) {
			if (s2.st != st)
				continue
			if (s2.v == v
			 && s2.type == BAR)
				break
			unlksym(s2)
		}
		to_rest(s3);
		s3.dur = s3.notes[0].dur = dur;
		s3.invis = true
		if (s3.seqst)
			s3.space = set_space(s3);
		s2.bar_mrep = 2
		if (s2.seqst)
			s2.space = set_space(s2);
		s3 = s2.next;
		for (s2 = s3.ts_next; ; s2 = s2.ts_next) {
			if (s2.st != st)
				continue
			if (s2.v == v
			 && s2.type == BAR)
				break
			unlksym(s2)
		}
		to_rest(s3);
		s3.dur = s3.notes[0].dur = dur;
		s3.invis = true;
		set_width(s3)
		if (s3.seqst)
			s3.space = set_space(s3)
		if (s2.seqst)
			s2.space = set_space(s2)
		return
	}

	/* repeat 1 measure */
	s3 = s
	for (j = k; --j >= 0; ) {
		for (s2 = s3.ts_next; ; s2 = s2.ts_next) {
			if (s2.st != st)
				continue
			if (s2.v == v
			 && s2.type == BAR)
				break
			unlksym(s2)
		}
		to_rest(s3);
		s3.dur = s3.notes[0].dur = dur;
		s3.beam_st = true
		if (s3.seqst)
			s3.space = set_space(s3)
		if (s2.seqst)
			s2.space = set_space(s2)
		if (k == 1) {
			s3.rep_nb = 1
			break
		}
		s3.rep_nb = k - j + 1;	// number to print above the repeat rest
		s3 = s2.next
	}
}

/* add a custos before the symbol of the next line */
function custos_add(s) {
	var	p_voice, new_s, i,
		s2 = s

	while (1) {
		if (s2.type == NOTE)
			break
		s2 = s2.next
		if (!s2)
			return
	}

	p_voice = s.p_v;
	p_voice.last_sym = s.prev;
//	if (!p_voice.last_sym)
//		p_voice.sym = null;
	p_voice.time = s.time;
	new_s = sym_add(p_voice, CUSTOS);
	new_s.next = s;
	s.prev = new_s;
	lktsym(new_s, s);

	new_s.seqst = true;
	new_s.shrink = s.shrink
	if (new_s.shrink < 8 + 4)
		new_s.shrink = 8 + 4;
	new_s.space = s2.space;

	new_s.nhd = s2.nhd;
	new_s.notes = []
	for (i = 0; i < s.notes.length; i++) {
		new_s.notes[i] = {
			pit: s2.notes[i].pit,
			shhd: 0,
			dur: BASE_LEN / 4
		}
	}
	new_s.stemless = true
}

/* -- define the beginning of a new music line -- */
function set_nl(s) {
	var s2, p_voice, done

	// set the end of line marker and
	// (if needed, add a space at the end of the music line - removed)
	function set_eol(s) {
		if (cfmt.custos && voice_tb.length == 1)
			custos_add(s)
		if (s.ts_next)
			s.nl = true
	} // set_eol()

	// set the eol on the next symbol
	function set_eol_next(s) {
		if (!s.next) {		// special case: the voice stops here
			set_eol(s)
			return s
		}
		for (s = s.ts_next; s; s = s.ts_next) {
			if (s.seqst) {
				set_eol(s)
				break
			}
		}
		return s
	} // set_eol_next()

	/* if explicit EOLN, cut on the next symbol */
	if (s.eoln && !cfmt.keywarn && !cfmt.timewarn)
		return set_eol_next(s)

	/* if normal symbol, cut here */
	switch (s.type) {
	case CLEF:
	case BAR:
	case STAVES:
		break
	case KEY:
		if (cfmt.keywarn && !s.k_none)
			break
		return set_eol_next(s)
	case METER:
		if (cfmt.timewarn)
			break
		return set_eol_next(s)
	case GRACE:			/* don't cut on a grace note */
		s = s.next
		if (!s)
			return s
		/* fall thru */
	default:
		return set_eol_next(s)
	}

	/* go back to handle the staff breaks at end of line */
	for (; s; s = s.ts_prev) {
		if (!s.seqst)
			continue
		switch (s.type) {
		case KEY:
		case CLEF:
		case METER:
			continue
		}
		break
	}
	done = 0
	for ( ; ; s = s.ts_next) {
		if (!s)
			return s
		if (!s.seqst)
			continue
		if (done < 0)
			break
		switch (s.type) {
		case STAVES:
			if (s.ts_prev && s.ts_prev.type == BAR)
				break
			while (s.ts_next) {
				if (w_tb[s.ts_next.type] != 0
				 && s.ts_next.type != CLEF)
					break
				s = s.ts_next
			}
			if (!s.ts_next || s.ts_next.type != BAR)
				continue
			s = s.ts_next
			// fall thru
		case BAR:
			if (done)
				break
			done = 1;
			continue
		case STBRK:
			if (!s.stbrk_forced)
				unlksym(s)	/* remove */
			else
				done = -1	// keep the next symbols on the next line
			continue
		case METER:
			if (!cfmt.timewarn)
				break
			continue
		case CLEF:
			if (done)
				break
			continue
		case KEY:
			if (!cfmt.keywarn || s.k_none)
				break
			continue
		default:
			if (!done || (s.prev && s.prev.type == GRACE))
				continue
			break
		}
		break
	}
	set_eol(s)
	return s
}

/* get the width of the starting clef and key signature */
// return
//	r[0] = width of clef and key signature
//	r[1] = width of the meter
function get_ck_width() {
    var	r0, r1,
	p_voice = voice_tb[0]

	set_width(p_voice.clef);
	set_width(p_voice.key);
	set_width(p_voice.meter)
	return [p_voice.clef.wl + p_voice.clef.wr +
			p_voice.key.wl + p_voice.key.wr,
		p_voice.meter.wl + p_voice.meter.wr]
}

// get the width of the symbols up to the next eoln or eof
function get_width(s, last) {
	var	shrink, space,
		w = 0,
		sp_fac = (1 - cfmt.maxshrink)

	do {
		if (s.seqst) {
			shrink = s.shrink
			if ((space = s.space) < shrink)
				w += shrink
			else
				w += shrink * cfmt.maxshrink
					+ space * sp_fac
			s.x = w
		}
		if (s == last)
			break
		s = s.ts_next
	} while (s)
	return w;
}

/* -- search where to cut the lines according to the staff width -- */
function set_lines(	s,		/* first symbol */
			last,		/* last symbol / null */
			lwidth,		/* w - (clef & key sig) */
			indent) {	/* for start of tune */
	var	first, s2, s3, x, xmin, xmid, xmax, wwidth, shrink, space,
		nlines, cut_here;

	for ( ; last; last = last.ts_next) {
		if (last.eoln)
			break
	}

	/* calculate the whole size of the piece of tune */
	wwidth = get_width(s, last) + indent

	/* loop on cutting the tune into music lines */
	while (1) {
		nlines = Math.ceil(wwidth / lwidth)
		if (nlines <= 1) {
			if (last)
				last = set_nl(last)
			return last
		}

		s2 = first = s;
		xmin = s.x - s.shrink - indent;
		xmax = xmin + lwidth;
		xmid = xmin + wwidth / nlines;
		xmin += wwidth / nlines * cfmt.breaklimit;
		for (s = s.ts_next; s != last ; s = s.ts_next) {
			if (!s.x)
				continue
			if (s.type == BAR)
				s2 = s
			if (s.x >= xmin)
				break
		}
//fixme: can this occur?
		if (s == last) {
			if (last)
				last = set_nl(last)
			return last
		}

		/* try to cut on a measure bar */
		cut_here = false;
		s3 = null
		for ( ; s != last; s = s.ts_next) {
			x = s.x
			if (!x)
				continue
			if (x > xmax)
				break
			if (s.type != BAR)
				continue
			if (x < xmid) {
				s3 = s		// keep the last bar
				continue
			}

			// cut on the bar closest to the middle
			if (!s3 || xmid - s3.x > s.x - xmid)
				s3 = s
			break
		}

		/* if a bar, cut here */
		if (s3) {
			s = s3;
			cut_here = true
		}

		/* try to avoid to cut a beam or a tuplet */
		if (!cut_here) {
			var	beam = 0,
				bar_time = s2.time;

			xmax -= 8; // (left width of the inserted bar in set_allsymwidth)
			s = s2;			// restart from start or last bar
			s3 = null
			for ( ; s != last; s = s.ts_next) {
				if (s.beam_st)
					beam++
				if (s.beam_end && beam > 0)
					beam--
				x = s.x
				if (!x)
					continue
				if (x + s.wr >= xmax)
					break
				if (beam || s.in_tuplet)
					continue
//fixme: this depends on the meter
				if ((s.time - bar_time) % (BASE_LEN / 4) == 0) {
					s3 = s
					continue
				}
				if (!s3 || xmid - s3.x > s.x - xmid)
					s3 = s
				break
			}
			if (s3) {
				s = s3;
				cut_here = true
			}
		}

		// cut anyhere
		if (!cut_here) {
			s3 = s = s2
			for ( ; s != last; s = s.ts_next) {
				x = s.x
				if (!x)
					continue
				if (x < xmid) {
					s3 = s
					continue
				}
				if (xmid - s3.x > s.x - xmid)
					s3 = s
				break
			}
			s = s3
		}

		if (s.nl) {		/* already set here - advance */
			error(0, s,
			    "Line split problem - adjust maxshrink and/or breaklimit");
			nlines = 2
			for (s = s.ts_next; s != last; s = s.ts_next) {
				if (!s.x)
					continue
				if (--nlines <= 0)
					break
			}
		}
		s = set_nl(s)
		if (!s
		 || (last && s.time >= last.time))
			break
		wwidth -= s.x - first.x;
		indent = 0
	}
	return s
}

/* -- cut the tune into music lines -- */
function cut_tune(lwidth, indent) {
	var	s, s2, s3, i, xmin,
//fixme: not usable yet
//		pg_sav = {
//			leftmargin: cfmt.leftmargin,
//			rightmargin: cfmt.rightmargin,
//			pagewidth: cfmt.pagewidth,
//			scale: cfmt.scale
//		},
		s = tsfirst

	// take care of the voice subnames
	if (indent != 0) {
		i = set_indent()
		lwidth -= i;
		indent -= i;
	}

	/* adjust the line width according to the starting clef
	 * and key signature */
/*fixme: may change in the tune*/
	i = get_ck_width();
	lwidth -= i[0];
	indent += i[1]

	if (cfmt.custos && voice_tb.length == 1)
		lwidth -= 12

	/* if asked, count the measures and set the EOLNs */
	if (cfmt.barsperstaff) {
		i = cfmt.barsperstaff;
		for (s2 = s; s2; s2 = s2.ts_next) {
			if (s2.type != BAR
			 || !s2.bar_num
			 || --i > 0)
				continue
			s2.eoln = true;
			i = cfmt.barsperstaff
		}
	}

	/* cut at explicit end of line, checking the line width */
	xmin = indent;
	s2 = s
	for ( ; s; s = s.ts_next) {
//fixme: not usable yet
//		if (s.type == BLOCK) {
//			switch (s.subtype) {
//			case "leftmargin":
//			case "rightmargin":
//			case "pagescale":
//			case "pagewidth":
//			case "scale":
//			case "staffwidth":
//				set_format(s.subtype, s.param)
//				break
//			}
//			continue
//		}
		if (!s.seqst && !s.eoln)
			continue
		xmin += s.shrink
		if (xmin > lwidth) {		// overflow
			s2 = set_lines(s2, s, lwidth, indent)
		} else {
			if (!s.eoln)
				continue
			delete s.eoln

			// if eoln on a note or a rest,
			// check for a smaller duration in an other voice
			if (s.dur) {
				for (s3 = s.ts_next; s3; s3 = s3.ts_next) {
					if (s3.seqst
					 || s3.dur < s.dur)
						break
				}
				if (s3 && !s3.seqst)
					s2 = set_lines(s2, s, lwidth, indent)
				else
					s2 = set_nl(s)
			} else {
				s2 = set_nl(s)
			}
		}
		if (!s2)
			break

		// (s2 may be tsfirst - no ts_prev - when only one
		//  embedded info in the first line after the first K:)
		if (!s2.ts_prev) {
			delete s2.nl
			continue
		}
		xmin = s2.shrink;
		s = s2.ts_prev;		// don't miss an eoln
		indent = 0
	}

//fixme: not usable yet
//	// restore the page parameters at start of line
//	cfmt.leftmargin = pg_sav.leftmargin;
//	cfmt.rightmargin = pg_sav.rightmargin;
//	cfmt.pagewidth = pg_sav.pagewidth;
//	cfmt.scale = pg_sav.scale
}

/* -- set the y values of some symbols -- */
function set_yval(s) {
//fixme: staff_tb is not yet defined
//	var top = staff_tb[s.st].topbar
//	var bot = staff_tb[s.st].botbar
	switch (s.type) {
	case CLEF:
		if (s.second
		 || s.invis) {
//			s.ymx = s.ymn = (top + bot) / 2
			s.ymx = s.ymn = 12
			break
		}
		s.y = (s.clef_line - 1) * 6
		switch (s.clef_type) {
		default:			/* treble / perc */
			s.ymx = s.y + 28
			s.ymn = s.y - 14
			break
		case "c":
			s.ymx = s.y + 13
			s.ymn = s.y - 11
			break
		case "b":
			s.ymx = s.y + 7
			s.ymn = s.y - 12
			break
		}
		if (s.clef_small) {
			s.ymx -= 2;
			s.ymn += 2
		}
		if (s.ymx < 26)
			s.ymx = 26
		if (s.ymn > -1)
			s.ymn = -1
//		s.y += s.clef_line * 6
//		if (s.y > 0)
//			s.ymx += s.y
//		else if (s.y < 0)
//			s.ymn += s.y
		if (s.clef_octave) {
			if (s.clef_octave > 0)
				s.ymx += 12
			else
				s.ymn -= 12
		}
		break
	case KEY:
		if (s.k_sf > 2)
			s.ymx = 24 + 10
		else if (s.k_sf > 0)
			s.ymx = 24 + 6
		else
			s.ymx = 24 + 2;
		s.ymn = -2
		break
	default:
//		s.ymx = top + 2;
		s.ymx = 24 + 2;
		s.ymn = -2
		break
	}
}

// set the clefs (treble or bass) in a 'auto clef' sequence
// return the starting clef type
function set_auto_clef(st, s_start, clef_type_start) {
	var s, min, max, time, s2, s3;

	/* get the max and min pitches in the sequence */
	max = 12;					/* "F," */
	min = 20					/* "G" */
	for (s = s_start; s; s = s.ts_next) {
		if (s.type == STAVES && s != s_start)
			break
		if (s.st != st)
			continue
		if (s.type != NOTE) {
			if (s.type == CLEF) {
				if (s.clef_type != 'a')
					break
				unlksym(s)
			}
			continue
		}
		if (s.notes[0].pit < min)
			min = s.notes[0].pit
		else if (s.notes[s.nhd].pit > max)
			max = s.notes[s.nhd].pit
	}

	if (min >= 19					/* upper than 'F' */
	 || (min >= 13 && clef_type_start != 'b'))	/* or 'G,' */
		return 't'
	if (max <= 13					/* lower than 'G,' */
	 || (max <= 19 && clef_type_start != 't'))	/* or 'F' */
		return 'b'

	/* set clef changes */
	if (clef_type_start == 'a') {
		if ((max + min) / 2 >= 16)
			clef_type_start = 't'
		else
			clef_type_start = 'b'
	}
	var	clef_type = clef_type_start,
		s_last = s,
		s_last_chg = null
	for (s = s_start; s != s_last; s = s.ts_next) {
		if (s.type == STAVES && s != s_start)
			break
		if (s.st != st || s.type != NOTE)
			continue

		/* check if a clef change may occur */
		time = s.time
		if (clef_type == 't') {
			if (s.notes[0].pit > 12		/* F, */
			 || s.notes[s.nhd].pit > 20) {	/* G */
				if (s.notes[0].pit > 20)
					s_last_chg = s
				continue
			}
			s2 = s.ts_prev
			if (s2
			 && s2.time == time
			 && s2.st == st
			 && s2.type == NOTE
			 && s2.notes[0].pit >= 19)	/* F */
				continue
			s2 = s.ts_next
			if (s2
			 && s2.st == st
			 && s2.time == time
			 && s2.type == NOTE
			 && s2.notes[0].pit >= 19)	/* F */
				continue
		} else {
			if (s.notes[0].pit < 12		/* F, */
			 || s.notes[s.nhd].pit < 20) {	/* G */
				if (s.notes[s.nhd].pit < 12)
					s_last_chg = s
				continue
			}
			s2 = s.ts_prev
			if (s2
			 && s2.time == time
			 && s2.st == st
			 && s2.type == NOTE
			 && s2.notes[0].pit <= 13)	/* G, */
				continue
			s2 = s.ts_next
			if (s2
			 && s2.st == st
			 && s2.time == time
			 && s2.type == NOTE
			 && s2.notes[0].pit <= 13)	/* G, */
				continue
		}

		/* if first change, change the starting clef */
		if (!s_last_chg) {
			clef_type = clef_type_start =
					clef_type == 't' ? 'b' : 't';
			s_last_chg = s
			continue
		}

		/* go backwards and search where to insert a clef change */
		s3 = s
		for (s2 = s.ts_prev; s2 != s_last_chg; s2 = s2.ts_prev) {
			if (s2.st != st)
				continue
			if (s2.type == BAR
			 && s2.v == s.v) {
				s3 = s2
				break
			}
			if (s2.type != NOTE)
				continue

			/* have a 2nd choice on beam start */
			if (s2.beam_st
			 && !s2.p_v.second)
				s3 = s2
		}

		/* no change possible if no insert point */
		if (s3.time == s_last_chg.time) {
			s_last_chg = s
			continue
		}
		s_last_chg = s;

		/* insert a clef change */
		clef_type = clef_type == 't' ? 'b' : 't';
		s2 = insert_clef(s3, clef_type, clef_type == "t" ? 2 : 4);
		s2.clef_auto = true
//		s3.prev.st = st
	}
	return clef_type_start
}

/* set the clefs */
/* this function is called once at start of tune generation */
/*
 * global variables:
 *	- staff_tb[st].clef = clefs at start of line (here, start of tune)
 *				(created here, updated on clef draw)
 *	- voice_tb[v].clef = clefs at end of generation
 *				(created on voice creation, updated here)
 */
function set_clefs() {
	var	s, s2, st, v, p_voice, g, new_type, new_line, p_staff, pit,
		staff_clef = new Array(nstaff),	// st -> { clef, autoclef }
		sy = cur_sy,
		mid = []

	// create the staff table
	staff_tb = new Array(nstaff)
	for (st = 0; st <= nstaff; st++) {
		staff_clef[st] = {
			autoclef: true
		}
		staff_tb[st] = {
			output: [],
			sc_out: []
		}
	}

	// set the starting clefs of the staves
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (sy.voices[v].range < 0)
			continue
		st = sy.voices[v].st
		if (!sy.voices[v].second) {		// main voices
			if (p_voice.stafflines != undefined)
				sy.staves[st].stafflines = p_voice.stafflines
			if (p_voice.staffscale)
				sy.staves[st].staffscale = p_voice.staffscale
			if (sy.voices[v].sep)
				sy.staves[st].sep = sy.voices[v].sep
			if (sy.voices[v].maxsep)
				sy.staves[st].maxsep = sy.voices[v].maxsep;
		}
		if (!sy.voices[v].second
		 && !p_voice.clef.clef_auto)
			staff_clef[st].autoclef = false
	}
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (sy.voices[v].range < 0
		 || sy.voices[v].second)		// main voices
			continue
		st = sy.voices[v].st;
		s = p_voice.clef
		if (staff_clef[st].autoclef) {
			s.clef_type = set_auto_clef(st,
						tsfirst,
						s.clef_type);
			s.clef_line = s.clef_type == 't' ? 2 : 4
		}
		staff_clef[st].clef = staff_tb[st].clef = s
	}
	for (st = 0; st <= sy.nstaff; st++)
		mid[st] = (sy.staves[st].stafflines.length - 1) * 3

	for (s = tsfirst; s; s = s.ts_next) {
		if (s.repeat_n)
			set_repeat(s)

		switch (s.type) {
		case STAVES:
			sy = s.sy
			for (st = 0; st <= nstaff; st++)
				staff_clef[st].autoclef = true
			for (v = 0; v < voice_tb.length; v++) {
				if (sy.voices[v].range < 0)
					continue
				p_voice = voice_tb[v];
				st = sy.voices[v].st
				if (!sy.voices[v].second) {
					if (p_voice.stafflines != undefined)
						sy.staves[st].stafflines = p_voice.stafflines
					if (p_voice.staffscale)
						sy.staves[st].staffscale = p_voice.staffscale
					if (sy.voices[v].sep)
						sy.staves[st].sep = sy.voices[v].sep
					if (sy.voices[v].maxsep)
						sy.staves[st].maxsep = sy.voices[v].maxsep
				}
				s2 = p_voice.clef
				if (!s2.clef_auto)
					staff_clef[st].autoclef = false
			}
			for (st = 0; st <= sy.nstaff; st++)
				mid[st] = (sy.staves[st].stafflines.length - 1) * 3
			for (v = 0; v < voice_tb.length; v++) {
				if (sy.voices[v].range < 0
				 || sy.voices[v].second)	// main voices
					continue
				p_voice = voice_tb[v];
				st = sy.voices[v].st;
				s2 = p_voice.clef
				if (s2.clef_auto) {
//fixme: the staff may have other voices with explicit clefs...
//					if (!staff_clef[st].autoclef)
//						???
					new_type = set_auto_clef(st, s,
						staff_clef[st].clef ?
							staff_clef[st].clef.clef_type :
							'a');
					new_line = new_type == 't' ? 2 : 4
				} else {
					new_type = s2.clef_type;
					new_line = s2.clef_line
				}
				if (!staff_clef[st].clef) {	// new staff
					if (s2.clef_auto) {
						if (s2.type != 'a')
							p_voice.clef =
								clone(p_voice.clef);
						p_voice.clef.clef_type = new_type;
						p_voice.clef.clef_line = new_line
					}
					staff_tb[st].clef =
						staff_clef[st].clef = p_voice.clef
					continue
				}
								// old staff
				if (new_type == staff_clef[st].clef.clef_type
				 && new_line == staff_clef[st].clef.clef_line)
					continue
				g = s.ts_next
				while (g && (g.v != v || g.st != st))
					g = g.ts_next
				if (!g)				// ??
					continue
				if (g.type != CLEF) {
					g = insert_clef(g, new_type, new_line)
					if (s2.clef_auto)
						g.clef_auto = true
				}
				staff_clef[st].clef = p_voice.clef = g
			}
			continue
		default:
			s.mid = mid[s.st]
			continue
		case CLEF:
			break
		}

		if (s.clef_type == 'a') {
			s.clef_type = set_auto_clef(s.st,
						s.ts_next,
						staff_clef[s.st].clef.clef_type);
			s.clef_line = s.clef_type == 't' ? 2 : 4
		}

		p_voice = s.p_v;
		p_voice.clef = s
		if (s.second) {
/*fixme:%%staves:can this happen?*/
//			if (!s.prev)
//				break
			unlksym(s)
			continue
		}
		st = s.st
// may have been inserted on %%staves
//		if (s.clef_auto) {
//			unlksym(s)
//			continue
//		}

		if (staff_clef[st].clef) {
			if (s.clef_type == staff_clef[st].clef.clef_type
			 && s.clef_line == staff_clef[st].clef.clef_line) {
//				unlksym(s)
				continue
			}
		} else {

			// the voice moved to a new staff with a forced clef
			staff_tb[st].clef = s
		}
		staff_clef[st].clef = s
	}

	/* set a pitch to the symbols of voices with no note */
	sy = cur_sy
	for (v = 0; v < voice_tb.length; v++) {
		if (sy.voices[v].range < 0)
			continue
		s2 = voice_tb[v].sym
		if (!s2 || s2.notes[0].pit != 127)
			continue
		st = sy.voices[v].st
		switch (staff_tb[st].clef.clef_type) {
		default:
			pit = 22		/* 'B' */
			break
		case "c":
			pit = 16		/* 'C' */
			break
		case "b":
			pit = 10		/* 'D,' */
			break
		}
		for (s = s2; s; s = s.next)
			s.notes[0].pit = pit
	}
}

/* set the pitch of the notes according to the clefs
 * and set the vertical offset of the symbols */
/* this function is called at start of tune generation and
 * then, once per music line up to the old sequence */

var delta_tb = {
	t: 0 - 2 * 2,
	c: 6 - 3 * 2,
	b: 12 - 4 * 2,
	p: 0 - 3 * 2
}

/* upper and lower space needed by rests */
var rest_sp = [
	[18, 18],
	[12, 18],
	[12, 12],
	[0, 12],
	[6, 8],
	[10, 10],			/* crotchet */
	[6, 4],
	[10, 0],
	[10, 4],
	[10, 10]
]

function set_pitch(last_s) {
	var	s, s2, g, st, delta, m, pitch, note,
		dur = BASE_LEN,
		staff_delta = new Array(nstaff),
		sy = cur_sy

	// set the starting clefs of the staves
	for (st = 0; st <= nstaff; st++) {
		s = staff_tb[st].clef;
		staff_delta[st] = delta_tb[s.clef_type] + s.clef_line * 2
		if (cfmt.sound) {
			if (s.clef_octave && !s.clef_oct_transp)
				staff_delta[st] += s.clef_octave
		} else {
			if (s.clef_oct_transp)
				staff_delta[st] -= s.clef_octave
		}
	}

	for (s = tsfirst; s != last_s; s = s.ts_next) {
		st = s.st
		switch (s.type) {
		case CLEF:
			staff_delta[st] = delta_tb[s.clef_type] +
						s.clef_line * 2
			if (cfmt.sound) {
				if (s.clef_octave && !s.clef_oct_transp)
					staff_delta[st] += s.clef_octave
			} else {
				if (s.clef_oct_transp)
					staff_delta[st] -= s.clef_octave
			}
			set_yval(s)
			break
		case GRACE:
			for (g = s.extra; g; g = g.next) {
				delta = staff_delta[g.st]
				if (delta != 0
				 && !s.p_v.key.k_drum) {
					for (m = 0; m <= g.nhd; m++) {
						note = g.notes[m];
						note.pit += delta
					}
				}
				g.ymn = 3 * (g.notes[0].pit - 18) - 2;
				g.ymx = 3 * (g.notes[g.nhd].pit - 18) + 2
			}
			set_yval(s)
			break
		case KEY:
			s.k_y_clef = staff_delta[st] /* keep the y delta */
			/* fall thru */
		default:
			set_yval(s)
			break
		case MREST:
			if (s.invis)
				break
			s.y = 12;
			s.ymx = 24 + 15;
			s.ymn = -2
			break
		case REST:
			if (voice_tb.length == 1) {
				s.y = 12;		/* rest single voice */
//				s.ymx = 12 + 8;
//				s.ymn = 12 - 8
				s.ymx = 24;
				s.ymn = 0
				break
			}
			// fall thru
		case NOTE:
			delta = staff_delta[st]
			if (delta != 0
			 && !s.p_v.key.k_drum) {
				for (m = s.nhd; m >= 0; m--)
					s.notes[m].pit += delta
			}
			if (s.type == NOTE) {
				s.ymx = 3 * (s.notes[s.nhd].pit - 18) + 4;
				s.ymn = 3 * (s.notes[0].pit - 18) - 4;
			} else {
				s.y = (((s.notes[0].pit - 18) / 2) | 0) * 6;
				s.ymx = s.y + rest_sp[5 - s.nflags][0];
				s.ymn = s.y - rest_sp[5 - s.nflags][1]
			}
			if (s.dur < dur)
				dur = s.dur
			break
		}
	}
	if (!last_s)
		smallest_duration = dur
}

/* -- set the stem direction when multi-voices -- */
/* this function is called only once per tune */
function set_stem_dir() {
	var	t, u, i, st, rvoice, v,
		v_st,			// voice -> staff 1 & 2
		st_v, vobj,		// staff -> (v, ymx, ymn)*
		v_st_tb,		// array of v_st
		st_v_tb = [],		// array of st_v
		s = tsfirst,
		sy = cur_sy,
		nst = sy.nstaff

	while (s) {
		for (st = 0; st <= nst; st++)
			st_v_tb[st] = []
		v_st_tb = []

		/* get the max/min offsets in the delta time */
/*fixme: the stem height is not calculated yet*/
		for (u = s; u; u = u.ts_next) {
			if (u.type == BAR)
				break;
			if (u.type == STAVES) {
				if (u != s)
					break
				sy = s.sy
				for (st = nst; st <= sy.nstaff; st++)
					st_v_tb[st] = []
				nst = sy.nstaff
				continue
			}
			if ((u.type != NOTE && u.type != REST)
			 || u.invis)
				continue
			st = u.st;
/*fixme:test*/
if (st > nst) {
	var msg = "*** fatal set_stem_dir(): bad staff number " + st +
			" max " + nst;
	error(2, null, msg);
	throw new Error(msg)
}
			v = u.v;
			v_st = v_st_tb[v]
			if (!v_st) {
				v_st = {
					st1: -1,
					st2: -1
				}
				v_st_tb[v] = v_st
			}
			if (v_st.st1 < 0) {
				v_st.st1 = st
			} else if (v_st.st1 != st) {
				if (st > v_st.st1) {
					if (st > v_st.st2)
						v_st.st2 = st
				} else {
					if (v_st.st1 > v_st.st2)
						v_st.st2 = v_st.st1;
					v_st.st1 = st
				}
			}
			st_v = st_v_tb[st];
			rvoice = sy.voices[v].range;
			for (i = st_v.length; --i >= 0; ) {
				vobj = st_v[i]
				if (vobj.v == rvoice)
					break
			}
			if (i < 0) {
				vobj = {
					v: rvoice,
					ymx: 0,
					ymn: 24
				}
				for (i = 0; i < st_v.length; i++) {
					if (rvoice < st_v[i].v) {
						st_v.splice(i, 0, vobj)
						break
					}
				}
				if (i == st_v.length)
					st_v.push(vobj)
			}

			if (u.type != NOTE)
				continue
			if (u.ymx > vobj.ymx)
				vobj.ymx = u.ymx
			if (u.ymn < vobj.ymn)
				vobj.ymn = u.ymn

			if (u.xstem) {
				if (u.ts_prev.st != st - 1
				 || u.ts_prev.type != NOTE) {
					error(1, s, "Bad !xstem!");
					u.xstem = false
/*fixme:nflags KO*/
				} else {
					u.ts_prev.multi = 1;
					u.multi = 1;
					u.stemless = true
				}
			}
		}

		for ( ; s != u; s = s.ts_next) {
			if (s.multi)
				continue
			if (s.type != NOTE
			 && s.type != REST
			 && s.type != GRACE)
				continue
			st = s.st;
			v = s.v;
			v_st = v_st_tb[v];
			st_v = st_v_tb[st]
			if (v_st && v_st.st2 >= 0) {
				if (st == v_st.st1)
					s.multi = -1
				else if (st == v_st.st2)
					s.multi = 1
				continue
			}
			if (st_v.length <= 1) { /* voice alone on the staff */
//				if (s.multi)
//					continue
/*fixme:could be done in set_var()*/
				if (s.floating)
					s.multi = st == voice_tb[v].st ? -1 : 1
				continue
			}
			rvoice = sy.voices[v].range
			for (i = st_v.length; --i >= 0; ) {
				if (st_v[i].v == rvoice)
					break
			}
			if (i < 0)
				continue		/* voice ignored */
			if (i == st_v.length - 1) {
				s.multi = -1	/* last voice */
			} else {
				s.multi = 1	/* first voice(s) */

				/* if 3 voices, and vertical space enough,
				 * have stems down for the middle voice */
				if (i != 0 && i + 2 == st_v.length) {
					if (st_v[i].ymn - cfmt.stemheight
							> st_v[i + 1].ymx)
						s.multi = -1;

					/* special case for unison */
					t = s.ts_next
//fixme: pb with ../lacerda/evol-7.5.5.abc
					if (s.ts_prev
					 && s.ts_prev.time == s.time
					 && s.ts_prev.st == s.st
					 && s.notes[s.nhd].pit == s.ts_prev.notes[0].pit
					 && s.beam_st
					 && s.beam_end
					 && (!t
					  || t.st != s.st
					  || t.time != s.time))
						s.multi = -1
				}
			}
		}
		while (s && s.type == BAR)
			s = s.ts_next
	}
}

/* -- adjust the offset of the rests when many voices -- */
/* this function is called only once per tune */
function set_rest_offset() {
	var	s, s2, v, end_time, not_alone, v_s, y, ymax, ymin,
		shift, dots, dx,
		v_s_tb = [],
		sy = cur_sy

	for (s = tsfirst; s; s = s.ts_next) {
		if (s.invis)
			continue
		if (s.type == STAVES)
			sy = s.sy
		if (!s.dur)
			continue
		v_s = v_s_tb[s.v]
		if (!v_s) {
			v_s = {}
			v_s_tb[s.v] = v_s
		}
		v_s.s = s;
		v_s.st = s.st;
		v_s.end_time = s.time + s.dur
		if (s.type != REST)
			continue

		/* check if clash with previous symbols */
		ymin = -127;
		ymax = 127;
		not_alone = dots = false
		for (v = 0; v <= v_s_tb.length; v++) {
			v_s = v_s_tb[v]
			if (!v_s || !v_s.s
			 || v_s.st != s.st
			 || v == s.v)
				continue
			if (v_s.end_time <= s.time)
				continue
			not_alone = true;
			s2 = v_s.s
			if (sy.voices[v].range < sy.voices[s.v].range) {
				if (s2.time == s.time) {
					if (s2.ymn < ymax) {
						ymax = s2.ymn
						if (s2.dots)
							dots = true
					}
				} else {
					if (s2.y < ymax)
						ymax = s2.y
				}
			} else {
				if (s2.time == s.time) {
					if (s2.ymx > ymin) {
						ymin = s2.ymx
						if (s2.dots)
							dots = true
					}
				} else {
					if (s2.y > ymin)
						ymin = s2.y
				}
			}
		}

		/* check if clash with next symbols */
		end_time = s.time + s.dur
		for (s2 = s.ts_next; s2; s2 = s2.ts_next) {
			if (s2.time >= end_time)
				break
			if (s2.st != s.st
//			 || (s2.type != NOTE && s2.type != REST)
			 || !s2.dur
			 || s2.invis)
				continue
			not_alone = true
			if (sy.voices[s2.v].range < sy.voices[s.v].range) {
				if (s2.time == s.time) {
					if (s2.ymn < ymax) {
						ymax = s2.ymn
						if (s2.dots)
							dots = true
					}
				} else {
					if (s2.y < ymax)
						ymax = s2.y
				}
			} else {
				if (s2.time == s.time) {
					if (s2.ymx > ymin) {
						ymin = s2.ymx
						if (s2.dots)
							dots = true
					}
				} else {
					if (s2.y > ymin)
						ymin = s2.y
				}
			}
		}
		if (!not_alone) {
			s.y = 12;
			s.ymx = 24;
			s.ymn = 0
			continue
		}
		if (ymax == 127 && s.y < 12) {
			shift = 12 - s.y
			s.y += shift;
			s.ymx += shift;
			s.ymn += shift
		}
		if (ymin == -127 && s.y > 12) {
			shift = s.y - 12
			s.y -= shift;
			s.ymx -= shift;
			s.ymn -= shift
		}
		shift = ymax - s.ymx
		if (shift < 0) {
			shift = Math.ceil(-shift / 6) * 6
			if (s.ymn - shift >= ymin) {
				s.y -= shift;
				s.ymx -= shift;
				s.ymn -= shift
				continue
			}
			dx = dots ? 15 : 10;
			s.notes[0].shhd = dx;
			s.xmx = dx
			continue
		}
		shift = ymin - s.ymn
		if (shift > 0) {
			shift = Math.ceil(shift / 6) * 6
			if (s.ymx + shift <= ymax) {
				s.y += shift;
				s.ymx += shift;
				s.ymn += shift
				continue
			}
			dx = dots ? 15 : 10;
			s.notes[0].shhd = dx;
			s.xmx = dx
			continue
		}
	}
}

/* -- create a starting symbol -- */
function new_sym(type, p_voice,
			last_s) {	/* symbol at same time */
	var s = {
		type: type,
		ctx: last_s.ctx,
//		istart: last_s.istart,
//		iend: last_s.iend,
		v: p_voice.v,
		p_v: p_voice,
		st: p_voice.st,
		time: last_s.time,
		next: p_voice.last_sym.next
	}
	if (s.next)
		s.next.prev = s;
	p_voice.last_sym.next = s;
	s.prev = p_voice.last_sym;
	p_voice.last_sym = s;

	lktsym(s, last_s)
	if (s.ts_prev.type != type)
		s.seqst = true
	if (last_s.type == type && s.v != last_s.v) {
		delete last_s.seqst;
		last_s.shrink = 0
	}
	return s
}

/* -- init the symbols at start of a music line -- */
function init_music_line() {
	var	p_voice, s, s2, last_s, v, st,
		nv = voice_tb.length

	/* initialize the voices */
	for (v = 0; v < nv; v++) {
		if (cur_sy.voices[v].range < 0)
			continue
		p_voice = voice_tb[v];
		p_voice.second = cur_sy.voices[v].second;

		/* move the voice to a printed staff */
		st = cur_sy.voices[v].st
		while (st < nstaff && !cur_sy.st_print[st])
			st++;
		p_voice.st = st
	}

	/* add a clef at start of the main voices */
	last_s = tsfirst
	while (last_s.type == CLEF) {		/* move the starting clefs */
		v = last_s.v
		if (cur_sy.voices[v].range >= 0
		 && !cur_sy.voices[v].second) {
			delete last_s.clef_small;	/* normal clef */
			p_voice = last_s.p_v;
			p_voice.last_sym = p_voice.sym = last_s
		}
		last_s = last_s.ts_next
	}
	for (v = 0; v < nv; v++) {
		p_voice = voice_tb[v]
		if (p_voice.sym && p_voice.sym.type == CLEF)
			continue
		if (cur_sy.voices[v].range < 0
		 || (cur_sy.voices[v].second
		  && !p_voice.bar_start))	// needed for correct linkage
			continue
		st = cur_sy.voices[v].st
		if (!staff_tb[st]
		 || !staff_tb[st].clef)
			continue
		s = clone(staff_tb[st].clef);
		s.v = v;
		s.p_v = p_voice;
		s.st = st;
		s.time = tsfirst.time;
		s.prev = null;
		s.next = p_voice.sym
		if (s.next)
			s.next.prev = s;
		p_voice.sym = s;
		p_voice.last_sym = s;
		s.ts_next = last_s;
		if (last_s)
			s.ts_prev = last_s.ts_prev
		else
			s.ts_prev = null
		if (!s.ts_prev) {
			tsfirst = s;
			s.seqst = true
		} else {
			s.ts_prev.ts_next = s
			delete s.seqst
		}
		if (last_s) {
			last_s.ts_prev = s
			if (last_s.type == CLEF)
				delete last_s.seqst
		}
		delete s.clef_small;
		s.second = cur_sy.voices[v].second
// (fixme: needed for sample5 X:3 Fugue & staffnonote.xhtml)
		if (!cur_sy.st_print[st])
			s.invis = true
	}

	/* add keysig */
	for (v = 0; v < nv; v++) {
		if (cur_sy.voices[v].range < 0
		 || cur_sy.voices[v].second
		 || !cur_sy.st_print[cur_sy.voices[v].st])
			continue
		p_voice = voice_tb[v]
		if (last_s && last_s.v == v && last_s.type == KEY) {
			p_voice.last_sym = last_s;
			last_s.k_old_sf = last_s.k_sf;	// no key cancel
			last_s = last_s.ts_next
			continue
		}
		s2 = p_voice.key
		if (s2.k_sf || s2.k_a_acc) {
			s = new_sym(KEY, p_voice, last_s);
			s.k_sf = s2.k_sf;
			s.k_old_sf = s2.k_sf;	// no key cancel
			s.k_none = s2.k_none;
			s.k_a_acc = s2.k_a_acc;
			s.istart = s2.istart;
			s.iend = s2.iend
			if (s2.k_bagpipe) {
				s.k_bagpipe = s2.k_bagpipe
				if (s.k_bagpipe == 'p')
					s.k_old_sf = 3	/* "A" -> "D" => G natural */
			}
		}
	}

	/* add time signature (meter) if needed */
	if (insert_meter & 1) {
		for (v = 0; v < nv; v++) {
			p_voice = voice_tb[v];
			s2 = p_voice.meter
			if (cur_sy.voices[v].range < 0
			 || cur_sy.voices[v].second
			 || !cur_sy.st_print[cur_sy.voices[v].st]
			 || s2.a_meter.length == 0)
				continue
			if (last_s && last_s.v == v && last_s.type == METER) {
				p_voice.last_sym = last_s;
				last_s = last_s.ts_next
				continue
			}
			s = new_sym(METER, p_voice, last_s);
			s.istart = s2.istart;
			s.iend = s2.iend;
			s.wmeasure = s2.wmeasure;
			s.a_meter = s2.a_meter
		}
		insert_meter &= ~1		// no meter any more
	}

	/* add bar if needed (for repeat bracket) */
	for (v = 0; v < nv; v++) {

		// if bar already, keep it in sequence
		p_voice = voice_tb[v];
		if (last_s && last_s.v == v && last_s.type == BAR) {
			p_voice.last_sym = last_s;
			last_s = last_s.ts_next
			continue
		}

		s2 = p_voice.bar_start
		if (!s2)
			continue
		p_voice.bar_start = null
		if (cur_sy.voices[v].range < 0
		 || !cur_sy.st_print[cur_sy.voices[v].st])
			continue

		s2.next = p_voice.last_sym.next
		if (s2.next)
			s2.next.prev = s2;
		p_voice.last_sym.next = s2;
		s2.prev = p_voice.last_sym;
		p_voice.last_sym = s2;
		lktsym(s2, last_s);
		s2.time = tsfirst.time
		if (s2.ts_prev.type != s2.type)
			s2.seqst = true;
		if (last_s && last_s.type == s2.type && s2.v != last_s.v) {
			delete last_s.seqst;
			last_s.shrink = 0
		}
	}

	/* if initialization of a new music line, compute the spacing,
	 * including the first (old) sequence */
	set_pitch(last_s);
	for (s = last_s; s; s = s.ts_next) {
		if (s.seqst) {
			for (s = s.ts_next; s; s = s.ts_next)
				if (s.seqst)
					break
			break
		}
	}
	set_allsymwidth(s)	/* set the width of the added symbols */
}

/* -- set a pitch in all symbols and the start/stop of the beams -- */
function set_words(p_voice) {
	var	s, s2, nflags, lastnote,
		start_flag = true,
		pitch = 127			/* no note */

	for (s = p_voice.sym; s; s = s.next) {
		if (s.type == NOTE) {
			pitch = s.notes[0].pit
			break
		}
	}
	for (s = p_voice.sym; s; s = s.next) {
		switch (s.type) {
		case MREST:
			start_flag = true
			break
		case BAR:
			if (!s.beam_on)
				start_flag = true
			if (!s.next && s.prev
//			 && s.prev.type == NOTE
//			 && s.prev.dur >= BASE_LEN * 2)
			 && s.prev.head == OVALBARS)
				s.prev.head = SQUARE
			break
		case NOTE:
		case REST:
			if (s.trem2)
				break
			nflags = s.nflags

			if (s.ntrem)
				nflags += s.ntrem
			if (s.type == REST && s.beam_end) {
				s.beam_end = false;
				start_flag = true
			}
			if (start_flag
			 || nflags <= 0) {
				if (lastnote) {
					lastnote.beam_end = true;
					lastnote = null
				}
				if (nflags <= 0) {
					s.beam_st = true;
					s.beam_end = true
				} else if (s.type == NOTE) {
					s.beam_st = true;
					start_flag = false
				}
			}
			if (s.beam_end)
				start_flag = true
			if (s.type == NOTE)
				lastnote = s
			break
		}
		if (s.type == NOTE) {
			if (s.nhd != 0)
				sort_pitch(s);
			pitch = s.notes[0].pit
//			if (s.prev
//			 && s.prev.type != NOTE) {
//				s.prev.notes[0].pit = (s.prev.notes[0].pit
//						    + pitch) / 2
			for (s2 = s.prev; s2; s2 = s2.prev) {
				if (s2.type != REST)
					break
				s2.notes[0].pit = pitch
			}
		} else {
			if (!s.notes) {
				s.notes = []
				s.notes[0] = {}
				s.nhd = 0
			}
			s.notes[0].pit = pitch
		}
	}
	if (lastnote)
		lastnote.beam_end = true
}

/* -- set the end of the repeat sequences -- */
function set_rb(p_voice) {
	var	s2, mx, n,
		s = p_voice.sym

	while (s) {
		if (s.type != BAR || !s.rbstart || s.norepbra) {
			s = s.next
			continue
		}

		mx = cfmt.rbmax

		/* if 1st repeat sequence, compute the bracket length */
		if (s.text && s.text[0] == '1') {
			n = 0;
			s2 = null
			for (s = s.next; s; s = s.next) {
				if (s.type != BAR)
					continue
				n++
				if (s.rbstop) {
					if (n <= cfmt.rbmax) {
						mx = n;
						s2 = null
					}
					break
				}
				if (n == cfmt.rbmin)
					s2 = s
			}
			if (s2) {
				s2.rbstop = 1;
				mx = cfmt.rbmin
			}
		}
		while (s) {

			/* check repbra shifts (:| | |2 in 2nd staves) */
			if (s.rbstart != 2) {
				s = s.next
				if (!s)
					break
				if (s.rbstart != 2) {
					s = s.next
					if (!s)
						break
					if (s.rbstart != 2)
						break
				}
			}
			n = 0;
			s2 = null
			for (s = s.next; s; s = s.next) {
				if (s.type != BAR)
					continue
				n++
				if (s.rbstop)
					break
				if (!s.next)
					s.rbstop = 2	// right repeat with end
				else if (n == mx)
					s.rbstop = 1	// right repeat without end
			}
		}
	}
}

/* -- initialize the generator -- */
/* this function is called only once per tune  */

var delpit = [0, -7, -14, 0]

function set_global() {
	var p_voice, st, v, nv, sy

	/* get the max number of staves */
	sy = cur_sy;
	st = sy.nstaff;
//	sy.st_print = new Uint8Array(sy.staves.length)
	while (1) {
		sy = sy.next
		if (!sy)
			break
//		sy.st_print = new Uint8Array(sy.staves.length)
		if (sy.nstaff > st)
			st = sy.nstaff
	}
	nstaff = st;

	/* set the pitches, the words (beams) and the repeat brackets */
	nv = voice_tb.length
	for (v = 0; v < nv; v++) {
		p_voice = voice_tb[v];
		set_words(p_voice)
// (test removed because v.second may change after %%staves)
//		if (!p_voice.second && !p_voice.norepbra)
			set_rb(p_voice)
	}

	/* set the staff of the floating voices */
	set_float();

	// set the clefs and adjust the pitches of all symbol
	set_clefs();
	set_pitch(null)
}

/* -- return the left indentation of the staves -- */
function set_indent(first) {
	var	st, v, w, p_voice, p, i, j, font,
		nv = voice_tb.length,
		maxw = 0

	for (v = 0; v < nv; v++) {
		p_voice = voice_tb[v]
		if (cur_sy.voices[v].range < 0)
			continue
		st = cur_sy.voices[v].st
//		if (!cur_sy.st_print[st])
//			continue
		p = (first || p_voice.new_name) ? p_voice.nm : p_voice.snm
		if (!p)
			continue
		if (!font) {
			font = get_font("voice");
			gene.curfont = gene.deffont = font
		}
		i = 0
		while (1) {
			j = p.indexOf("\\n", i)
			if (j < 0)
				w = strw(p.slice(i))
			else
				w = strw(p.slice(i, j))
			if (w > maxw)
				maxw = w
			if (j < 0)
				break
			i = j + 1
		}
	}
	if (font)
		maxw += 4 * cwid(' ') * font.swfac;

	w = 0
	for (st = 0; st <= cur_sy.nstaff; st++) {
		if (cur_sy.staves[st].flags
				& (OPEN_BRACE2 | OPEN_BRACKET2)) {
			w = 16
			break
		}
		if (cur_sy.staves[st].flags & (OPEN_BRACE | OPEN_BRACKET))
			w = 8
	}
	maxw += w

	if (first)			// if %%indent
		maxw += cfmt.indent
	return maxw
}

/* -- decide on beams and on stem directions -- */
/* this routine is called only once per tune */
function set_beams(sym) {
	var	s, t, g, beam, s_opp, dy, avg, n, m, mid_p, pu, pd,
		laststem = -1

	for (s = sym; s; s = s.next) {
		if (s.type != NOTE) {
			if (s.type != GRACE)
				continue
			g = s.extra
			if (g.stem == 2) {	/* opposite gstem direction */
				s_opp = s
				continue
			}
			if (!s.stem
			 && (s.stem = s.multi) == 0)
				s.stem = 1
			for (; g; g = g.next) {
				g.stem = s.stem;
				g.multi = s.multi
			}
			continue
		}

		if (!s.stem			/* if not explicitly set */
		 && (s.stem = s.multi) == 0) { /* and alone on the staff */
			mid_p = s.mid / 3 + 18

			/* notes in a beam have the same stem direction */
			if (beam) {
				s.stem = laststem
			} else if (s.beam_st && !s.beam_end) {	// beam start
				beam = true;
				pu = s.notes[s.nhd].pit;
				pd = s.notes[0].pit
				for (g = s.next; g; g = g.next) {
					if (g.type != NOTE)
						continue
					if (g.stem || g.multi) {
						s.stem = g.stem || g.multi
						break
					}
					if (g.notes[g.nhd].pit > pu)
						pu = g.notes[g.nhd].pit
					if (g.notes[0].pit < pd)
						pd = g.notes[0].pit
					if (g.beam_end)
						break
				}
				if (g.beam_end) {
					if ((pu + pd) / 2 < mid_p) {
						s.stem = 1
					} else if ((pu + pd) / 2 > mid_p) {
						s.stem = -1
					} else {
//--fixme: equal: check all notes of the beam
						if (cfmt.bstemdown)
							s.stem = -1
					}
				}
				if (!s.stem)
					s.stem = laststem
			} else {				// no beam
				n = (s.notes[s.nhd].pit + s.notes[0].pit) / 2
				if (n == mid_p) {
					n = 0
					for (m = 0; m <= s.nhd; m++)
						n += s.notes[m].pit;
					n /= (s.nhd + 1)
				}
//				s.stem = n < mid_p ? 1 : -1
				if (n < mid_p)
					s.stem = 1
				else if (n > mid_p)
					s.stem = -1
				else if (cfmt.bstemdown)
					s.stem = -1
				else
					s.stem = laststem
			}
		} else {			/* stem set by set_stem_dir */
			if (s.beam_st && !s.beam_end)
				beam = true
		}
		if (s.beam_end)
			beam = false;
		laststem = s.stem;

		if (s_opp) {			/* opposite gstem direction */
			for (g = s_opp.extra; g; g = g.next)
				g.stem = -laststem;
			s_opp.stem = -laststem;
			s_opp = null
		}
	}
}

// check if there may be one head for unison when voice overlap
function same_head(s1, s2) {
	var i1, i2, l1, l2, head, i11, i12, i21, i22, sh1, sh2

	if (s1.shiftunison && s1.shiftunison >= 3)
		return false
	if ((l1 = s1.dur) >= BASE_LEN)
		return false
	if ((l2 = s2.dur) >= BASE_LEN)
		return false
	if (s1.stemless && s2.stemless)
		return false
	if (s1.dots != s2.dots) {
		if ((s1.shiftunison && (s1.shiftunison & 1))
		 || s1.dots * s2.dots != 0)
			return false
	}
	if (s1.stem * s2.stem > 0)
		return false

	/* check if a common unison */
	i1 = i2 = 0
	if (s1.notes[0].pit > s2.notes[0].pit) {
//fixme:dots
		if (s1.stem < 0)
			return false
		while (s2.notes[i2].pit != s1.notes[0].pit) {
			if (++i2 > s2.nhd)
				return false
		}
	} else if (s1.notes[0].pit < s2.notes[0].pit) {
//fixme:dots
		if (s2.stem < 0)
			return false
		while (s2.notes[0].pit != s1.notes[i1].pit) {
			if (++i1 > s1.nhd)
				return false
		}
	}
	if (s2.notes[i2].acc != s1.notes[i1].acc)
		return false;
	i11 = i1;
	i21 = i2;
	sh1 = s1.notes[i1].shhd;
	sh2 = s2.notes[i2].shhd
	do {
//fixme:dots
		i1++;
		i2++
		if (i1 > s1.nhd) {
//fixme:dots
//			if (s1.notes[0].pit < s2.notes[0].pit)
//				return false
			break
		}
		if (i2 > s2.nhd) {
//fixme:dots
//			if (s1.notes[0].pit > s2.notes[0].pit)
//				return false
			break
		}
		if (s2.notes[i2].acc != s1.notes[i1].acc)
			return false
		if (sh1 < s1.notes[i1].shhd)
			sh1 = s1.notes[i1].shhd
		if (sh2 < s2.notes[i2].shhd)
			sh2 = s2.notes[i2].shhd
	} while (s2.notes[i2].pit == s1.notes[i1].pit)
//fixme:dots
	if (i1 <= s1.nhd) {
		if (i2 <= s2.nhd)
			return false
		if (s2.stem > 0)
			return false
	} else if (i2 <= s2.nhd) {
		if (s1.stem > 0)
			return false
	}
	i12 = i1;
	i22 = i2;

	head = 0
	if (l1 != l2) {
		if (l1 < l2) {
			l1 = l2;
			l2 = s1.dur
		}
		if (l1 < BASE_LEN / 2) {
			if (s2.dots > 0)
				head = 2
			else if (s1.dots > 0)
				head = 1
		} else if (l2 < BASE_LEN / 4) {	/* (l1 >= BASE_LEN / 2) */
//			if ((s1.shiftunison && s1.shiftunison == 2)
//			 || s1.dots != s2.dots)
			if (s1.shiftunison && (s1.shiftunison & 2))
				return false
			head = s2.dur >= BASE_LEN / 2 ? 2 : 1
		} else {
			return false
		}
	}
	if (head == 0)
		head = s1.p_v.scale < s2.p_v.scale ? 2 : 1
	if (head == 1) {
		for (i2 = i21; i2 < i22; i2++) {
			s2.notes[i2].invis = true
			delete s2.notes[i2].acc
		}
		for (i2 = 0; i2 <= s2.nhd; i2++)
			s2.notes[i2].shhd += sh1
	} else {
		for (i1 = i11; i1 < i12; i1++) {
			s1.notes[i1].invis = true
			delete s1.notes[i1].acc
		}
		for (i1 = 0; i1 <= s1.nhd; i1++)
			s1.notes[i1].shhd += sh2
	}
	return true
}

/* handle unison with different accidentals */
function unison_acc(s1, s2, i1, i2) {
	var m, d

	if (!s2.notes[i2].acc) {
		d = w_note[s2.head] * 2 + s2.xmx + s1.notes[i1].shac + 2
		if (s1.notes[i1].micro)
			d += 2
		if (s2.dots)
			d += 6
		for (m = 0; m <= s1.nhd; m++) {
			s1.notes[m].shhd += d;
			s1.notes[m].shac -= d
		}
		s1.xmx += d
	} else {
		d = w_note[s1.head] * 2 + s1.xmx + s2.notes[i2].shac + 2
		if (s2.notes[i2].micro)
			d += 2
		if (s1.dots)
			d += 6
		for (m = 0; m <= s2.nhd; m++) {
			s2.notes[m].shhd += d;
			s2.notes[m].shac -= d
		}
		s2.xmx += d
	}
}

var MAXPIT = 48 * 2

/* set the left space of a note/chord */
function set_left(s) {
	var	m, i, j, shift,
		w_base = w_note[s.head],
		w = w_base,
		left = []

	for (i = 0; i < MAXPIT; i++)
		left.push(-100)

	/* stem */
	if (s.nflags > -2) {
		if (s.stem > 0) {
			w = -w;
			i = s.notes[0].pit * 2;
			j = (Math.ceil((s.ymx - 2) / 3) + 18) * 2
		} else {
			i = (Math.ceil((s.ymn + 2) / 3) + 18) * 2;
			j = s.notes[s.nhd].pit * 2
		}
		if (i < 0)
			i = 0
		if (j >= MAXPIT)
			j = MAXPIT - 1
		while (i <= j)
			left[i++] = w
	}

	/* notes */
	shift = s.notes[s.stem > 0 ? 0 : s.nhd].shhd;	/* previous shift */
	for (m = 0; m <= s.nhd; m++) {
		w = -s.notes[m].shhd + w_base + shift;
		i = s.notes[m].pit * 2
		if (i < 0)
			i = 0
		else if (i >= MAXPIT - 1)
			i = MAXPIT - 2
		if (w > left[i])
			left[i] = w
		if (s.head != SQUARE)
			w -= 1
		if (w > left[i - 1])
			left[i - 1] = w
		if (w > left[i + 1])
			left[i + 1] = w
	}

	return left
}

/* set the right space of a note/chord */
function set_right(s) {
	var	m, i, j, k, shift,
		w_base = w_note[s.head],
		w = w_base,
		flags = s.nflags > 0 && s.beam_st && s.beam_end,
		right = []

	for (i = 0; i < MAXPIT; i++)
		right.push(-100)

	/* stem and flags */
	if (s.nflags > -2) {
		if (s.stem < 0) {
			w = -w;
			i = (Math.ceil((s.ymn + 2) / 3) + 18) * 2;
			j = s.notes[s.nhd].pit * 2;
			k = i + 4
		} else {
			i = s.notes[0].pit * 2;
			j = (Math.ceil((s.ymx - 2) / 3) + 18) * 2
		}
		if (i < 0)
			i = 0
		if (j > MAXPIT)
			j = MAXPIT
		while (i < j)
			right[i++] = w
	}

	if (flags) {
		if (s.stem > 0) {
			if (s.xmx == 0)
				i = s.notes[s.nhd].pit * 2
			else
				i = s.notes[0].pit * 2;
			i += 4
			if (i < 0)
				i = 0
			for (; i < MAXPIT && i <= j - 4; i++)
				right[i] = 11
		} else {
			i = k
			if (i < 0)
				i = 0
			for (; i < MAXPIT && i <= s.notes[0].pit * 2 - 4; i++)
				right[i] = 3.5
		}
	}

	/* notes */
	shift = s.notes[s.stem > 0 ? 0 : s.nhd].shhd	/* previous shift */
	for (m = 0; m <= s.nhd; m++) {
		w = s.notes[m].shhd + w_base - shift;
		i = s.notes[m].pit * 2
		if (i < 0)
			i = 0
		else if (i >= MAXPIT - 1)
			i = MAXPIT - 2
		if (w > right[i])
			right[i] = w
		if (s.head != SQUARE)
			w -= 1
		if (w > right[i - 1])
			right[i - 1] = w
		if (w > right[i + 1])
			right[i + 1] = w
	}

	return right
}

/* -- shift the notes horizontally when voices overlap -- */
/* this routine is called only once per tune */
function set_overlap() {
	var	s, s1, s2, s3, i, i1, i2, m, sd, t, dp,
		d, d2, dr, dr2, dx,
		left1, right1, left2, right2, right3, pl, pr

	// invert the voices
	function v_invert() {
		s1 = s2;
		s2 = s;
		d = d2;
		pl = left1;
		pr = right1;
		dr2 = dr
	}

	for (s = tsfirst; s; s = s.ts_next) {
		if (s.type != NOTE
		 || s.invis)
			continue

		/* treat the stem on two staves with different directions */
		if (s.xstem
		 && s.ts_prev.stem < 0) {
			s2 = s.ts_prev
			for (m = 0; m <= s2.nhd; m++) {
				s2.notes[m].shhd += 3.5 * 2;	// stem_xoff
				s2.notes[m].shac -= 3.5 * 2
			}
			s2.xmx += 3.5 * 2
		}

		/* search the next note at the same time on the same staff */
		s2 = s
		while (1) {
			s2 = s2.ts_next
			if (!s2)
				break
			if (s2.time != s.time) {
				s2 = null
				break
			}
			if (s2.type == NOTE
			 && !s2.invis
			 && s2.st == s.st)
				break
		}
		if (!s2)
			continue
		s1 = s

		/* set the dot vertical offset */
		if (cur_sy.voices[s1.v].range < cur_sy.voices[s2.v].range)
			s2.dot_low = true
		else
			s1.dot_low = true

		/* no shift if no overlap */
		if (s1.ymn > s2.ymx
		 || s1.ymx < s2.ymn)
			continue

		if (same_head(s1, s2))
			continue

		/* compute the minimum space for 's1 s2' and 's2 s1' */
		right1 = set_right(s1);
		left2 = set_left(s2);

		s3 = s1.ts_prev
		if (s3 && s3.time == s1.time
		 && s3.st == s1.st && s3.type == NOTE && !s3.invis) {
			right3 = set_right(s3)
			for (i = 0; i < MAXPIT; i++) {
				if (right3[i] > right1[i])
					right1[i] = right3[i]
			}
		} else {
			s3 = null
		}
		d = -10
		for (i = 0; i < MAXPIT; i++) {
			if (left2[i] + right1[i] > d)
				d = left2[i] + right1[i]
		}
		if (d < -3) {			// no clash if no dots clash
			if (!s1.dots || !s2.dots
			 || !s2.dot_low
			 || s1.stem > 0 || s2.stem < 0
			 || s1.notes[s1.nhd].pit + 2 != s2.notes[0].pit
			 || (s2.notes[0].pit & 1))
				continue
		}

		right2 = set_right(s2);
		left1 = set_left(s1)
		if (s3) {
			right3 = set_left(s3)
			for (i = 0; i < MAXPIT; i++) {
				if (right3[i] > left1[i])
					left1[i] = right3[i]
			}
		}
		d2 = dr = dr2 = -100
		for (i = 0; i < MAXPIT; i++) {
			if (left1[i] + right2[i] > d2)
				d2 = left1[i] + right2[i]
			if (right2[i] > dr2)
				dr2 = right2[i]
			if (right1[i] > dr)
				dr = right1[i]
		}

		/* check for unison with different accidentals
		 * and clash of dots */
		t = 0;
		i1 = s1.nhd;
		i2 = s2.nhd
		while (1) {
			dp = s1.notes[i1].pit - s2.notes[i2].pit
			switch (dp) {
			case 0:
				if (s1.notes[i1].acc != s2.notes[i2].acc) {
					t = -1
					break
				}
				if (s2.notes[i2].acc)
					s2.notes[i2].acc = 0
				if (s1.dots && s2.dots
				 && (s1.notes[i1].pit & 1))
					t = 1
				break
			case -1:
//fixme:dots++
//				if (s1.dots && s2.dots)
//					t = 1
//++--
				if (s1.dots && s2.dots) {
					if (s1.notes[i1].pit & 1) {
						s1.dot_low = false;
						s2.dot_low = false
					} else {
						s1.dot_low = true;
						s2.dot_low = true
					}
				}
//fixme:dots--
				break
			case -2:
				if (s1.dots && s2.dots
				 && !(s1.notes[i1].pit & 1)) {
//fixme:dots++
//					t = 1
//++--
					s1.dot_low = false;
					s2.dot_low = false
//fixme:dots--
					break
				}
				break
			}
			if (t < 0)
				break
			if (dp >= 0) {
				if (--i1 < 0)
					break
			}
			if (dp <= 0) {
				if (--i2 < 0)
					break
			}
		}

		if (t < 0) {	/* unison and different accidentals */
			unison_acc(s1, s2, i1, i2)
			continue
		}

		sd = 0;
		if (s1.dots) {
			if (s2.dots) {
				if (!t)			/* if no dot clash */
					sd = 1		/* align the dots */
//fixme:dots
			}
		} else if (s2.dots) {
			if (d2 + dr < d + dr2)
				sd = 1		/* align the dots */
//fixme:dots
		}
		pl = left2;
		pr = right2
		if (!s3 && d2 + dr < d + dr2)
			v_invert()
		d += 3
		if (d < 0)
			d = 0;			// (not return!)

		/* handle the previous shift */
		m = s1.stem >= 0 ? 0 : s1.nhd;
		d += s1.notes[m].shhd;
		m = s2.stem >= 0 ? 0 : s2.nhd;
		d -= s2.notes[m].shhd

		/*
		 * room for the dots
		 * - if the dots of v1 don't shift, adjust the shift of v2
		 * - otherwise, align the dots and shift them if clash
		 */
		if (s1.dots) {
			dx = 7.7 + s1.xmx +		// x 1st dot
				3.5 * s1.dots - 3.5 +	// x last dot
				3;			// some space
			if (!sd) {
				d2 = -100;
				for (i1 = 0; i1 <= s1.nhd; i1++) {
					i = s1.notes[i1].pit
					if (!(i & 1)) {
						if (!s1.dot_low)
							i++
						else
							i--
					}
					i *= 2
					if (i < 1)
						i = 1
					else if (i >= MAXPIT - 1)
						i = MAXPIT - 2
					if (pl[i] > d2)
						d2 = pl[i]
					if (pl[i - 1] + 1 > d2)
						d2 = pl[i - 1] + 1
					if (pl[i + 1] + 1 > d2)
						d2 = pl[i + 1] + 1
				}
				if (dx + d2 + 2 > d)
					d = dx + d2 + 2
			} else {
				if (dx < d + dr2 + s2.xmx) {
					d2 = 0
					for (i1 = 0; i1 <= s1.nhd; i1++) {
						i = s1.notes[i1].pit
						if (!(i & 1)) {
							if (!s1.dot_low)
								i++
							else
								i--
						}
						i *= 2
						if (i < 1)
							i = 1
						else if (i >= MAXPIT - 1)
							i = MAXPIT - 2
						if (pr[i] > d2)
							d2 = pr[i]
						if (pr[i - 1] + 1 > d2)
							d2 = pr[i - 1] = 1
						if (pr[i + 1] + 1 > d2)
							d2 = pr[i + 1] + 1
					}
					if (d2 > 4.5
					 && 7.7 + s1.xmx + 2 < d + d2 + s2.xmx)
						s2.xmx = d2 + 3 - 7.7
				}
			}
		}

		for (m = s2.nhd; m >= 0; m--) {
			s2.notes[m].shhd += d
//			if (s2.notes[m].acc
//			 && s2.notes[m].pit < s1.notes[0].pit - 4)
//				s2.notes[m].shac -= d
		}
		s2.xmx += d
		if (sd)
			s1.xmx = s2.xmx		// align the dots
	}
}

/* -- set the stem height -- */
/* this routine is called only once per tune */
function set_stems() {
	var s, s2, g, slen, scale,ymn, ymx, nflags, ymin, ymax

	for (s = tsfirst; s; s = s.ts_next) {
		if (s.type != NOTE) {
			if (s.type != GRACE)
				continue
			ymin = ymax = s.mid
			for (g = s.extra; g; g = g.next) {
				slen = GSTEM
				if (g.nflags > 1)
					slen += 1.2 * (g.nflags - 1);
				ymn = 3 * (g.notes[0].pit - 18);
				ymx = 3 * (g.notes[g.nhd].pit - 18)
				if (s.stem >= 0) {
					g.y = ymn;
					g.ys = ymx + slen;
					ymx = Math.round(g.ys)
				} else {
					g.y = ymx;
					g.ys = ymn - slen;
					ymn = Math.round(g.ys)
				}
				ymx += 2;
				ymn -= 2
				if (ymn < ymin)
					ymin = ymn
				else if (ymx > ymax)
					ymax = ymx;
				g.ymx = ymx;
				g.ymn = ymn
			}
			s.ymx = ymax;
			s.ymn = ymin
			continue
		}

		/* shift notes in chords (need stem direction to do this) */
		set_head_shift(s);

		/* if start or end of beam, adjust the number of flags
		 * with the other end */
		nflags = s.nflags
		if (s.beam_st && !s.beam_end) {
			if (s.feathered_beam)
				nflags = ++s.nflags
			for (s2 = s.next; /*s2*/; s2 = s2.next) {
				if (s2.type == NOTE) {
					if (s.feathered_beam)
						s2.nflags++
					if (s2.beam_end)
						break
				}
			}
/*			if (s2) */
			    if (s2.nflags > nflags)
				nflags = s2.nflags
		} else if (!s.beam_st && s.beam_end) {
//fixme: keep the start of beam ?
			for (s2 = s.prev; /*s2*/; s2 = s2.prev) {
				if (s2.beam_st)
					break
			}
/*			if (s2) */
			    if (s2.nflags > nflags)
				nflags = s2.nflags
		}

		/* set height of stem end */
		slen = cfmt.stemheight
		switch (nflags) {
		case 2: slen += 2; break
		case 3:	slen += 5; break
		case 4:	slen += 10; break
		case 5:	slen += 16; break
		}
		if ((scale = s.p_v.scale) != 1)
			slen *= (scale + 1) * .5;
		ymn = 3 * (s.notes[0].pit - 18)
		if (s.nhd > 0) {
			slen -= 2;
			ymx = 3 * (s.notes[s.nhd].pit - 18)
		} else {
			ymx = ymn
		}
		if (s.ntrem)
			slen += 2 * s.ntrem		/* tremolo */
		if (s.stemless) {
			if (s.stem >= 0) {
				s.y = ymn;
				s.ys = ymx
			} else {
				s.ys = ymn;
				s.y = ymx
			}
			if (nflags == -4)		/* if longa */
				ymn -= 6;
			s.ymx = ymx + 4;
			s.ymn = ymn - 4
		} else if (s.stem >= 0) {
			if (nflags >= 2)
				slen -= 1
			if (s.notes[s.nhd].pit > 26
			 && (nflags <= 0
			  || !s.beam_st
			  || !s.beam_end)) {
				slen -= 2
				if (s.notes[s.nhd].pit > 28)
					slen -= 2
			}
			s.y = ymn
			if (s.notes[0].ti1)
				ymn -= 3;
			s.ymn = ymn - 4;
			s.ys = ymx + slen
			if (s.ys < s.mid)
				s.ys = s.mid;
			s.ymx = (s.ys + 2.5) | 0
		} else {			/* stem down */
			if (s.notes[0].pit < 18
			 && (nflags <= 0
			  || !s.beam_st || !s.beam_end)) {
				slen -= 2
				if (s.notes[0].pit < 16)
					slen -= 2
			}
			s.ys = ymn - slen
			if (s.ys > s.mid)
				s.ys = s.mid;
			s.ymn = (s.ys - 2.5) | 0;
			s.y = ymx
/*fixme:the tie may be lower*/
			if (s.notes[s.nhd].ti1)
				ymx += 3;
			s.ymx = ymx + 4
		}
	}
}

/* -- split up unsuitable bars at end of staff -- */
function check_bar(s) {
	var	bar_type, i, b1, b2,
		p_voice = s.p_v

	/* search the last bar */
	while (s.type == CLEF || s.type == KEY || s.type == METER) {
		if (s.type == METER
		 && s.time > p_voice.sym.time)	/* if not empty voice */
			insert_meter |= 1;	/* meter in the next line */
		s = s.prev
		if (!s)
			return
	}
	if (s.type != BAR)
		return

	if (s.text != undefined) {			// if repeat bar
		p_voice.bar_start = clone(s);
		p_voice.bar_start.bar_type = "["
		delete s.text
		delete s.a_gch
//		return
	}
	bar_type = s.bar_type
	if (bar_type == ":")
		return
	if (bar_type.slice(-1) != ':')	// if not left repeat bar
		return

	if (!p_voice.bar_start)
		p_voice.bar_start = clone(s)
	if (bar_type[0] != ':') {			/* 'xx:' (not ':xx:') */
		if (bar_type == "||:") {
			p_voice.bar_start.bar_type = "|:";
			s.bar_type = "||"
			return
		}
		p_voice.bar_start.bar_type = bar_type
		if (s.prev && s.prev.type == BAR)
			unlksym(s)
		else
			s.bar_type = "|"
		return
	}
	if (bar_type == "::") {
		p_voice.bar_start.bar_type = "|:";
		s.bar_type = ":|"
		return
	}
	if (bar_type == "||:") {
		p_voice.bar_start.bar_type = "|:";
		s.bar_type = "||"
		return
	}

	// '::xx::' -> '::|' and '|::'
//fixme: do the same in abcm2ps
	i = 0
	while (bar_type[i] == ':')
		i++
	if (i < bar_type.length) {
		s.bar_type = bar_type.slice(0, i) + '|';
		i = bar_type.length - 1
		while (bar_type[i] == ':')
			i--;
		p_voice.bar_start.bar_type = '|' + bar_type.slice(i + 1)
	} else {
		i = (bar_type.length / 2) |0;			// '::::' !
		s.bar_type = bar_type.slice(0, i) + '|';
		p_voice.bar_start.bar_type = '|' + bar_type.slice(i)
	}
}

/* -- move the symbols of an empty staff to the next one -- */
function sym_staff_move(st) {
	for (var s = tsfirst; s; s = s.ts_next) {
		if (s.nl)
			break
		if (s.st == st
		 && s.type != CLEF) {
			s.st++;
			s.invis = true
		}
	}
}

// generate a block symbol
var blocks = []		// array of delayed block symbols

function block_gen(s) {
	switch (s.subtype) {
	case "leftmargin":
	case "rightmargin":
	case "pagescale":
	case "pagewidth":
	case "scale":
	case "staffwidth":
		set_format(s.subtype, s.param);
		break
	case "ml":
		svg_flush();
		user.img_out(s.text)
		break
	case "newpage":
		blk_flush();
		block.newpage = true;
		blk_out()
		break
	case "sep":
		set_page();
		vskip(s.sk1);
		output.push('<path class="stroke"\n\td="M');
		out_sxsy(s.x, ' ', 0);
		output.push('h' + s.l.toFixed(2) + '"/>\n');
		vskip(s.sk2);
		break
	case "text":
		write_text(s.text, s.opt)
		break
	case "title":
		write_title(s.text, true)
		break
	case "vskip":
		vskip(s.sk);
//		blk_out()
		break
	default:
		error(2, s, 'Block $1 not treated', s.subtype)
		break
	}
}

/* -- define the start and end of a piece of tune -- */
/* tsnext becomes the beginning of the next line */
function set_piece() {
	var	s, last, p_voice, st, v, nst, nv,
		non_empty = [],
		non_empty_gl = [],
		sy = cur_sy

	function reset_staff(st) {
		var	p_staff = staff_tb[st],
			sy_staff = sy.staves[st]

		if (!p_staff)
			p_staff = staff_tb[st] = {}
		p_staff.y = 0;			// staff system not computed yet
		p_staff.stafflines = sy_staff.stafflines;
		p_staff.staffscale = sy_staff.staffscale;
		p_staff.ann_top = p_staff.ann_bot = 0
	} // reset_staff()

	// adjust the empty flag of brace systems
	function set_brace() {
		var	st, i, empty_fl,
			n = sy.staves.length

		// if a system brace has empty and non empty staves, keep all staves
		for (st = 0; st < n; st++) {
			if (!(sy.staves[st].flags & (OPEN_BRACE | OPEN_BRACE2)))
				continue
			empty_fl = 0;
			i = st
			while (st < n) {
				empty_fl |= non_empty[st] ? 1 : 2
				if (sy.staves[st].flags & (CLOSE_BRACE | CLOSE_BRACE2))
					break
				st++
			}
			if (empty_fl == 3) {	// if both empty and not empty staves
				while (i <= st) {
					non_empty[i] = true;
					non_empty_gl[i++] = true
				}
			}
		}
	} // set_brace()

	// set the top and bottom of the staves
	function set_top_bot() {
		var st, p_staff, i, l, hole

		for (st = 0; st <= nstaff; st++) {
			p_staff = staff_tb[st]
			if (!non_empty_gl[st]) {
				p_staff.botbar = p_staff.topbar = 0
				continue
			}
			l = p_staff.stafflines.length;
			p_staff.topbar = 6 * (l - 1)

			for (i = 0; i < l - 1; i++)
				if (p_staff.stafflines[i] != '.')
					break
			p_staff.botline = p_staff.botbar = i * 6
			if (i >= l - 2) {		// 0, 1 or 2 lines
				p_staff.botbar -= 6;
				p_staff.topbar += 6
			}
		}
	} // set_top_bot()

	/* reset the staves */
	nstaff = nst = sy.nstaff
	for (st = 0; st <= nst; st++)
		reset_staff(st);

	/*
	 * search the next end of line,
	 * and mark the empty staves
	 */
	for (s = tsfirst; s; s = s.ts_next) {
		if (s.nl) {
//fixme: not useful
//			// delay the next block symbols
//			while (s && s.type == BLOCK) {
//				blocks.push(s);
//				unlksym(s);
//				s = s.ts_next
//			}
			break
		}
		if (!s.ts_next)
			last = s		// keep the last symbol
		switch (s.type) {
		case STAVES:
			set_brace();
			sy.st_print = new Uint8Array(non_empty);
			sy = s.sy;
			nst = sy.nstaff
			if (nstaff < nst) {
				for (st = nstaff + 1; st <= nst; st++)
					reset_staff(st);
				nstaff = nst
			}
			non_empty = []
			continue

		// the block symbols will be treated after music line generation
		case BLOCK:
			blocks.push(s);
			unlksym(s)
			if (last)
				last = s.ts_prev
			continue
		}
		st = s.st
		if (non_empty[st])
			continue
		switch (s.type) {
		case CLEF:
			if (st > nstaff) {	// if clef warning/change for new staff
				staff_tb[st].clef = s;
				unlksym(s)
			}
			break
		case BAR:
			if (cfmt.staffnonote <= 1)
				break
			// fall thru
		case GRACE:
			non_empty_gl[st] = non_empty[st] = true
			break
		case NOTE:
		case REST:
		case SPACE:
		case MREST:
			if (cfmt.staffnonote > 1) {
				non_empty_gl[st] = non_empty[st] = true
			} else if (!s.invis) {
				if (cfmt.staffnonote != 0
				 || s.type == NOTE)
					non_empty_gl[st] = non_empty[st] = true
			}
			break
		}
	}
	tsnext = s;

	/* set the last empty staves */
	set_brace()
//	for (st = 0; st <= nstaff; st++)
//		sy.st_print[st] = non_empty[st];
	sy.st_print = new Uint8Array(non_empty);

	/* define the offsets of the measure bars */
	set_top_bot()

	/* move the symbols of the empty staves to the next staff */
//fixme: could be optimized (use a old->new staff array)
	for (st = 0; st < nstaff; st++) {
		if (!non_empty_gl[st])
			sym_staff_move(st)
	}

	/* let the last empty staff have a full height */
	if (!non_empty_gl[nstaff])
		staff_tb[nstaff].topbar = 0;

	/* initialize the music line */
	init_music_line();

	// keep the array of the staves to be printed
	gene.st_print = new Uint8Array(non_empty_gl)

	// if not the end of the tune, set the end of the music line
	if (tsnext) {
		s = tsnext;
		delete s.nl;
		last = s.ts_prev;
		last.ts_next = null;

		// and the end of the voices
		nv = voice_tb.length
		for (v = 0; v < nv; v++) {
			p_voice = voice_tb[v]
			if (p_voice.sym
			 && p_voice.sym.time <= tsnext.time) {
				for (s = tsnext.ts_prev; s; s = s.ts_prev) {
					if (s.v == v) {
						p_voice.s_next = s.next;
						s.next = null;
						check_bar(s)
						break
					}
				}
				if (s)
					continue
			}
			p_voice.s_next = p_voice.sym;
			p_voice.sym = null
		}
	}

	// if the last symbol is not a bar, add an invisible bar
	if (last.type != BAR) {
		s = add_end_bar(last);
		s.prev = s.ts_prev = last;
		last.ts_next = last.next = s;
		s.shrink = last.wr + 2;	// just a small space before end of staff
		s.space = set_space(s)
		if (s.space < s.shrink)
			s.space = s.shrink
	}
}

/* -- position the symbols along the staff -- */
function set_sym_glue(width) {
	var space, beta0, alfa, beta, min, g, spafac, xmax

	/* calculate the whole space of the symbols */
	var	some_grace,
		s = tsfirst,
		xmin = 0,
		x = 0

	while (1) {
		if (s.type == GRACE && !some_grace)
			some_grace = s
		if (s.seqst) {
			space = s.space;
			xmin += s.shrink
			if (space < s.shrink)
				space = s.shrink;
			x += space
//			if (cfmt.stretchstaff)
//				space *= 1.8;
//			xmax += space
		}
		if (!s.ts_next)
			break
		s = s.ts_next
	}

	// can occur when bar alone in a staff system
	if (x == 0) {
		realwidth = 0
		return
	}

	xmax = x
	if (cfmt.stretchstaff)
		xmax *= 1.8;
	/* set max shrink and stretch */
	beta0 = 1			/* max expansion before complaining */

	/* memorize the glue for the last music line */
	if (tsnext) {
		if (x >= width) {
			beta_last = 0
		} else {
			beta_last = (width - x) / (xmax - x)	/* stretch */
			if (beta_last > beta0) {
				if (cfmt.stretchstaff) {
					if (cfmt.linewarn) {
						error(0, s,
							"Line underfull ($1pt of $2pt)",
							(beta0 * xmax + (1 - beta0) * x).toFixed(2),
							width.toFixed(2))
					}
				} else {
					width = x;
					beta_last = 0
				}
			}
		}
	} else {			/* if last music line */
		if (x < width) {
			beta = (width - x) / (xmax - x)	/* stretch */
			if (beta >= beta_last) {
				beta = beta_last * xmax + (1 - beta_last) * x

				/* shrink underfull last line same as previous */
				if (beta < width * (1. - cfmt.stretchlast))
					width = beta
			}
		}
	}

	spafac = width / x;			/* space expansion factor */

	/* define the x offsets of all starting symbols */
	x = xmax = 0;
	s = tsfirst
	while (1) {
		if (s.seqst) {
			space = s.shrink
			if (s.space != 0)
				xmax += s.space * spafac * 1.8;
			x += space;
			xmax += space;
			s.x = x;
			s.xmax = xmax
		}
		if (!s.ts_next)
			break
		s = s.ts_next
	}

	/* calculate the exact glue */
	if (x >= width) {
		beta = 0
		if (x == xmin) {
			alfa = 1			// no extra space
		} else {
			alfa = (x - width) / (x - xmin)		/* shrink */
			if (alfa > 1) {
				error(1, s, "Line too much shrunk $1 $2 $3",
					xmin.toFixed(2),
					x.toFixed(2),
					width.toFixed(2))
// uncomment for staff greater than music line
//				alfa = 1
			}
		}
		realwidth = xmin * alfa + x * (1 - alfa)
	} else {
		alfa = 0
		if (xmax > x)
			beta = (width - x) / (xmax - x)		/* stretch */
		else
			beta = 1				/* (no note) */
		if (beta > beta0) {
			if (!cfmt.stretchstaff)
				beta = 0
		}
		realwidth = xmax * beta + x * (1 - beta)
	}

	/* set the final x offsets */
	s = tsfirst
	if (alfa != 0) {
		if (alfa < 1) {
			x = xmin = 0
			for (; s; s = s.ts_next) {
				if (s.seqst) {
					xmin += s.shrink * alfa;
					x = xmin + s.x * (1 - alfa)
				}
				s.x = x
			}
		} else {
			alfa = realwidth / x;
			x = 0
			for (; s; s = s.ts_next) {
				if (s.seqst)
					x = s.x * alfa;
				s.x = x
			}
		}
	} else {
		x = 0
		for (; s; s = s.ts_next) {
			if (s.seqst)
				x = s.xmax * beta + s.x * (1 - beta);
			s.x = x
		}
	}

	/* set the x offsets of the grace notes */
	for (s = some_grace; s; s = s.ts_next) {
		if (s.type != GRACE)
			continue
		if (s.gr_shift)
			x = s.prev.x + s.prev.wr
				+ Number(cfmt.gracespace[0])
		else
			x = s.x - s.wl + Number(cfmt.gracespace[0])
		for (g = s.extra; g; g = g.next)
			g.x += x
	}
}

// set the starting symbols of the voices for the new music line
function set_sym_line() {
	var	p_voice, s, v,
		nv = voice_tb.length

	// set the first symbol of each voice
	for (v = 0; v < nv; v++) {
		p_voice = voice_tb[v];
		s = p_voice.s_next;		// (set in set_piece)
		p_voice.sym = s
		if (s)
			s.prev = null
	}
}

// set the left offset the images
function set_posx() {
	posx = img.lm / cfmt.scale
}

// initialize the start of generation / new music line
// and output the inter-staff blocks if any
function gen_init() {
	var	s = tsfirst,
		tim = s.time

	for ( ; s; s = s.ts_next) {
		if (s.time != tim) {
			set_page()
			return
		}
		switch (s.type) {
		case NOTE:
		case REST:
		case MREST:
			set_page()
			return
		default:
			continue
		case STAVES:
			cur_sy = s.sy
			break
		case BLOCK:
			block_gen(s)
			break
		}
		unlksym(s)
		if (s.p_v.s_next == s)
			s.p_v.s_next = s.next
	}
	tsfirst = null			/* no more notes */
}

/* -- generate the music -- */
function output_music() {
	var output_sav, v, lwidth, indent, line_height

	gen_init()
	if (!tsfirst)
		return
	set_global()
	if (voice_tb.length > 1) {	/* if many voices */
		combine_voices();
		set_stem_dir()		/* set the stems direction in 'multi' */
	}

	for (v = 0; v < voice_tb.length; v++)
		set_beams(voice_tb[v].sym);	/* decide on beams */

	set_stems()			/* set the stem lengths */
	if (voice_tb.length > 1) {	/* if many voices */
		set_rest_offset();	/* set the vertical offset of rests */
		set_overlap();		/* shift the notes on voice overlap */
//		set_rp_bars()		// set repeat bars
	}
	set_acc_shft();			// set the horizontal offset of accidentals

	set_allsymwidth(null);		/* set the width of all symbols */

	indent = set_indent(true)

	/* if single line, adjust the page width */
	if (cfmt.singleline) {
		v = get_ck_width();
		lwidth = indent + v[0] + v[1] + get_width(tsfirst, null);
		img.width = lwidth * cfmt.scale + img.lm + img.rm + 2
	} else {

	/* else, split the tune into music lines */
		lwidth = get_lwidth();
		cut_tune(lwidth, indent)
	}

	beta_last = 0
	while (1) {				/* loop per music line */
		set_piece();
		set_sym_glue(lwidth - indent)
		if (realwidth != 0) {
			if (indent != 0)
				posx += indent;
			output_sav = output;
			output = undefined;
			draw_sym_near();		// delayed output
			output = output_sav;
			line_height = set_staff();
			delayed_update();
			draw_systems(indent);
			draw_all_sym();
			vskip(line_height)
			if (indent != 0) {
				posx -= indent;
				insert_meter &= ~2	// no more indentation
			}
			while (blocks.length != 0)
				block_gen(blocks.shift())
		}

		tsfirst = tsnext
		svg_flush()
		if (!tsnext)
			break

		// next line
		gen_init()
		if (!tsfirst)
			break
		tsfirst.ts_prev = null;
		set_sym_line();
		lwidth = get_lwidth()	// the image size may have changed
		indent = set_indent()
	}
}

/* -- reset the generator -- */
function reset_gen() {
	insert_meter = cfmt.writefields.indexOf('M') >= 0 ?
				3 :	/* insert meter and indent */
				2	/* indent only */
}
// abc2svg - parse.js - ABC parse
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

var	a_gch,		// array of parsed guitar chords
	a_dcn,		// array of parsed decoration names
	multicol,	// multi column object
	maps = {}	// maps object - hashcode = map name
			//	-> object - hashcode = note
			//	[0] array of heads
			//	[1] print
			//	[2] color
var	not_ascii = "Not an ASCII character",
	bar_grace = "Cannot have a bar in grace notes",
	qplet_tb = new Int8Array([ 0, 1, 3, 2, 3, 0, 2, 0, 3, 0 ]),
	ntb = "CDEFGABcdefgab"


// set the source references of a symbol
function set_ref(s) {
	s.ctx = parse.ctx;
	s.istart = parse.istart;
	s.iend = parse.iend
}

// -- %% pseudo-comment

// clef definition (%%clef, K: and V:)
function new_clef(clef_def) {
	var	s = {
			type: CLEF,
			clef_line: 2,
			clef_type: "t",
			v: curvoice.v,
			p_v: curvoice,
			time: curvoice.time,
			dur: 0
		},
		i = 1

	set_ref(s)

	switch (clef_def[0]) {
	case '"':
		i = clef_def.indexOf('"', 1);
		s.clef_name = clef_def.slice(1, i);
		i++
		break
	case 'a':
		if (clef_def[1] == 'u') {	// auto
			s.clef_type = "a";
			s.clef_auto = true;
			i = 4
			break
		}
		i = 4				// alto
	case 'C':
		s.clef_type = "c";
		s.clef_line = 3
		break
	case 'b':				// bass
		i = 4
	case 'F':
		s.clef_type = "b";
		s.clef_line = 4
		break
	case 'n':				// none
		i = 4
		s.invis = true
		break
	case 't':
		if (clef_def[1] == 'e') {	// tenor
			s.clef_type = "c";
			s.clef_line = 4
			break
		}
		i = 6
	case 'G':
//		s.clef_type = "t"		// treble
		break
	case 'p':
		i = 4
	case 'P':				// perc
		s.clef_type = "p";
		s.clef_line = 3
		break
	default:
		syntax(1, "Unknown clef '$1'", clef_def)
		return //undefined
	}
	if (clef_def[i] >= '1' && clef_def[i] <= '9') {
		s.clef_line = Number(clef_def[i]);
		i++
	}
	if (clef_def[i + 1] != '8')
		return s
	switch (clef_def[i]) {			// octave
	case '^':
		s.clef_oct_transp = true
	case '+':
		s.clef_octave = 7
		break
	case '_':
		s.clef_oct_transp = true
	case '-':
		s.clef_octave = -7
		break
	}
	return s
}

// get a transposition value
function get_transp(param,
			type) {		// undefined or "instr"
	var	i, val, tmp, note,
		pit = []

	if (param[0] == '0')
		return 0
	if ("123456789-+".indexOf(param[0]) >= 0) {	// by semi-tone
		val = parseInt(param) * 3
		if (isNaN(val) || val < -108 || val > 108) {
//fixme: no source reference...
			syntax(1, "Bad transpose value")
			return
		}
		switch (param.slice(-1)) {
		default:
			return val
		case '#':
			val++
			break
		case 'b':
			val += 2
			break
		}
		if (val > 0)
			return val
		return val - 3
	}

	// by music interval
	if (type == "instr") {	// convert instr= into score= or sound=
		tmp = param.indexOf('/')
		if (!cfmt.sound) {
			if (tmp < 0)
				return 0	// written pitch
			param = param.replace('/', '')
		} else {
			if (tmp < 0)
				param = 'c' + param
			else
				param = param.replace(/.*\//, 'c')
		}
	}

	tmp = new scanBuf();
	tmp.buffer = param
	for (i = 0; i < 2; i++) {
		note = parse_acc_pit(tmp)
		if (!note) {
			syntax(1, "Bad transpose value")
			return
		}
		note.pit += 124;	// 126 - 2 for value > 0 and 'C' % 7 == 0
		val = ((note.pit / 7) | 0) * 12 + note_pit[note.pit % 7]
		if (note.acc && note.acc != 3)		// if not natural
			val += note.acc;
		pit[i] = val
	}
	if (cfmt.sound)
		pit[0] = 252;			// 'c'

	val = (pit[1] - pit[0]) * 3
	if (note) {
		switch (note.acc) {
		default:
			return val
		case 2:
		case 1:
			val++
			break
		case -1:
		case -2:
			val += 2
			break
		}
	}
	if (val > 0)
		return val
	return val - 3
}

// set the linebreak character
function set_linebreak(param) {
	var i, item

	for (i = 0; i < 128; i++) {
		if (char_tb[i] == "\n")
			char_tb[i] = nil	// remove old definition
	}
	param = param.split(/\s+/)
	for (i = 0; i < param.length; i++) {
		item = param[i]
		switch (item) {
		case '!':
		case '$':
		case '*':
		case ';':
		case '?':
		case '@':
			break
		case "<none>":
			continue
		case "<EOL>":
			item = '\n'
			break
		default:
			syntax(1, "Bad value '$1' in %%linebreak - ignored",
					item)
			continue
		}
		char_tb[item.charCodeAt(0)] = '\n'
	}
}

// set a new user character (U: or %%user)
function set_user(parm) {
    var	k, c, v,
	a = parm.match(/(.*?)[= ]*([!"].*[!"])/)

	if (!a) {
		syntax(1, 'Lack of starting ! or " in U: / %%user')
		return
	}
	c = a[1];
	v = a[2]
	if (v.slice(-1) != v[0]) {
		syntax(1, "Lack of ending $1 in U:/%%user", v[0])
		return
	}
	if (c[0] == '\\') {
		if (c[1] == 't')
			c = '\t'
		else if (!c[1])
			c = ' '
	}

	k = c.charCodeAt(0)
	if (k >= 128) {
		syntax(1, not_ascii)
		return
	}
	switch (char_tb[k][0]) {
	case '0':			// nil
	case 'd':
	case 'i':
	case ' ':
		break
	case '"':
	case '!':
		if (char_tb[k].length > 1)
			break
		// fall thru
	default:
		syntax(1, "Bad user character '$1'", c)
		return
	}
	switch (v) {
	case "!beambreak!":
		v = " "
		break
	case "!ignore!":
		v = "i"
		break
	case "!nil!":
	case "!none!":
		v = "d"
		break
	}
	char_tb[k] = v
}

// get a stafflines value
function get_st_lines(param) {
	var n, val

	if (!param)
		return
	if (param.match(/^[\]\[|.]+$/))
		return param.replace(/\]/g, '[')

	n = parseInt(param)
	switch (n) {
	case 0: return "..."
	case 1: return "..|"
	case 2: return ".||"
	case 3: return ".|||"
	}
	if (isNaN(n) || n < 0 || n > 16)
		return //undefined
	val = '|'
	while (--n > 0)
		val += '|'
	return val
}

// create a block symbol in the tune body
function new_block(subtype) {
	var	s = {
			type: BLOCK,
			subtype: subtype,
			dur: 0
		}

	if (parse.state == 2)
		goto_tune()
	var voice_s = curvoice;
	curvoice = voice_tb[par_sy.top_voice]
	sym_link(s);
	curvoice = voice_s
	return s
}

// set the K: / V: parameters
function set_kv_parm(a) {	// array of items
	var	s, item, pos, val

	// add the global parameters if not done yet
	if (!curvoice.init) {
		curvoice.init = true

		if (info.V) {
			if (info.V['*'])
				a = info.V['*'].concat(a)
			if (info.V[curvoice.id])
				a = info.V[curvoice.id].concat(a)
		}
	}
	if (a.length == 0)
		return 0

	while (1) {
		item = a.shift()
		if (!item)
			break
		if (item[item.length - 1] == '='
		 && !a[0]) {
			syntax(1, err_bad_val_s, item)
			break
		}
		switch (item) {
		case "clef=":
			s = a.shift()		// keep last clef
			break
		case "combine=":		// %%voicecombine
		case "octave=":
		case "uscale=":			// %%microscale
			val = parseInt(a.shift())
			if (isNaN(val))
				syntax(1, err_bad_val_s, item)
			else
				curvoice[item.slice(0, -1)] = val
			break
		case "cue=":
			curvoice.scale = a.shift() == 'on' ? .7 : 1
			break
		case "instrument=":
			curvoice.transp = get_transp(a.shift(), 'instr')
			break
		case "map=":			// %%voicemap
			item = item.slice(0, -1);
			curvoice[item] = a.shift()
			break
		case "name=":
		case "nm=":
			curvoice.nm = a.shift()
			if (curvoice.nm[0] == '"')
				curvoice.nm = curvoice.nm.slice(1, -1);
			curvoice.new_name = true
			break
		case "stem=":
			item = "stm="
		case "dyn=":			// %%pos
		case "gch=":
		case "gst=":
		case "orn=":
		case "stm=":
		case "voc=":
		case "vol=":
			val = posval[a.shift()]
			if (val == undefined) {
				syntax(1, err_bad_val_s, item)
				break
			}
			item = item.slice(0, -1)
			if (!pos)
				pos = {}
			pos[item] = val
			break
		case "scale=":			// %%voicescale
			do_pscom('voicescale ' + a.shift())
			break
		case "score=":
			if (cfmt.sound)
				break
			item = a.shift()
			if (item.indexOf('/') < 0)
				item += '/c';
			curvoice.transp = get_transp(item)
			break
		case "shift=":
			curvoice.shift = get_transp(a.shift())
			break
		case "sound=":
		case "transpose=":		// (abcMIDI compatibility)
			if (!cfmt.sound)
				break
			curvoice.transp = get_transp(a.shift())
			break
		case "subname=":
		case "sname=":
		case "snm=":
			curvoice.snm = a.shift()
			if (curvoice.snm[0] == '"')
				curvoice.snm = curvoice.snm.slice(1, -1);
			break
		case "stafflines=":
			do_pscom('stafflines ' + a.shift())
			break
		case "staffscale=":
			do_pscom('staffscale ' + a.shift())
			break
		default:
			switch (item.slice(0, 4)) {
			case "treb":
			case "bass":
			case "alto":
			case "teno":
			case "perc":
				s = item
				break
			default:
				if ("GFC".indexOf(item[0]) >= 0)
					s = item
				else if (item.slice(-1) == '=')
					a.shift()
				break
			}
			break
		}
	}
	if (pos) {
		curvoice.pos = clone(curvoice.pos)
		for (item in pos)
		    if (pos.hasOwnProperty(item))
			curvoice.pos[item] = pos[item]
	}

	if (s) {
		s = new_clef(s)
		if (s)
			get_clef(s)
	}
}

// memorize the K:/V: parameters
function memo_kv_parm(vid,	// voice ID (V:) / '*' (K:/V:*)
			a) {	// array of items
	if (a.length == 0)
		return
	if (!info.V)
		info.V = {}
	if (info.V[vid])
		Array.prototype.push.apply(info.V[vid], a)
	else
		info.V[vid] = a
}

// K: key signature
// return the key and the voice/clef parameters
function new_key(param) {
	var	i, clef, key_end, c, tmp,
		mode = 0,
		s = {
			type: KEY,
			k_delta: 0,
			dur:0
		}

	set_ref(s);

	// tonic
	i = 1
	switch (param[0]) {
	case 'A': s.k_sf = 3; break
	case 'B': s.k_sf = 5; break
	case 'C': s.k_sf = 0; break
	case 'D': s.k_sf = 2; break
	case 'E': s.k_sf = 4; break
	case 'F': s.k_sf = -1; break
	case 'G': s.k_sf = 1; break
	case 'H':				// bagpipe
		switch (param[1]) {
		case 'P':
			s.k_bagpipe = "P";
			i++
			break
		case 'p':
			s.k_bagpipe = "p";
			s.k_sf = 2;
			i++
			break
		default:
			syntax(1, "Unknown bagpipe-like key")
			break
		}
		key_end = true
		break
	case 'P':
		s.k_drum = true;
		key_end = true
		break
	case 'n':				// none
		if (param.indexOf("none") == 0) {
			s.k_sf = 0;
			s.k_none = true;
			i = 4
		}
		// fall thru
	default:
		key_end = true
		break
	}

	if (!key_end) {
		switch (param[i]) {
		case '#': s.k_sf += 7; i++; break
		case 'b': s.k_sf -= 7; i++; break
		}
		param = param.slice(i).trim()
		switch (param.slice(0, 3).toLowerCase()) {
		case "aeo":
		case "m":
		case "min": s.k_sf -= 3;
			mode = 5
			break
		case "dor": s.k_sf -= 2;
			mode = 1
			break
		case "ion":
		case "maj": break
		case "loc": s.k_sf -= 5;
			mode = 6
			break
		case "lyd": s.k_sf += 1;
			mode = 3
			break
		case "mix": s.k_sf -= 1;
			mode = 4
			break
		case "phr": s.k_sf -= 4;
			mode = 2
			break
		default:
			if (param[0] == 'm'
			 && (param[1] == ' ' || param[1] == '\t'
			  || param[1] == '\n')) {
				s.k_sf -= 3;
				mode = 5
				break
			}
			key_end = true
			break
		}
		if (!key_end)
			param = param.replace(/\w+\s*/, '')

		// [exp] accidentals
		if (param.indexOf("exp ") == 0) {
			param = param.replace(/\w+\s*/, '')
			if (!param)
				syntax(1, "No accidental after 'exp'");
			s.k_exp = true
		}
		c = param[0]
		if (c == '^' || c == '_' || c == '=') {
			s.k_a_acc = [];
			tmp = new scanBuf();
			tmp.buffer = param
			do {
				var note = parse_acc_pit(tmp)
				if (!note)
					return [s, null]
				s.k_a_acc.push(note);
				c = param[tmp.index]
				while (c == ' ')
					c = param[++tmp.index]
			} while (c == '^' || c == '_' || c == '=');
			param = param.slice(tmp.index)
		} else if (s.k_exp && param.indexOf("none") == 0) {
			s.k_sf = 0;
			param = param.replace(/\w+\s*/, '')
		}
	}

	s.k_delta = cgd2cde[(s.k_sf + 7) % 7];
	s.k_mode = mode

	return [s, info_split(param, 0)]
}

// M: meter
function new_meter(text) {
	var	s = {
			type: METER,
			dur: 0,
			a_meter: []
		},
		meter = {},
		val, v,
		m1 = 0, m2,
		i = 0, j,
		wmeasure,
		p = text,
		in_parenth;

	set_ref(s)

	if (p.indexOf("none") == 0) {
		i = 4;				/* no meter */
		wmeasure = 1;	// simplify measure numbering and MREST conversion
	} else {
		wmeasure = 0
		while (i < text.length) {
			if (p[i] == '=')
				break
			switch (p[i]) {
			case 'C':
				meter.top = p[i++]
				if (p[i] == '|')
					meter.top += p[i++];
				m1 = 4;
				m2 = 4
				break
			case 'c':
			case 'o':
				m1 = p[i] == 'c' ? 4 : 3;
				m2 = 4;
				meter.top = p[i++]
				if (p[i] == '.')
					meter.top += p[i++]
				break
			case '(':
				if (p[i + 1] == '(') {	/* "M:5/4 ((2+3)/4)" */
					in_parenth = true;
					meter.top = p[i++];
					s.a_meter.push(meter);
					meter = {}
				}
				j = i + 1
				while (j < text.length) {
					if (p[j] == ')' || p[j] == '/')
						break
					j++
				}
				if (p[j] == ')' && p[j + 1] == '/') {	/* "M:5/4 (2+3)/4" */
					i++		/* remove the parenthesis */
					continue
				}			/* "M:5 (2+3)" */
				/* fall thru */
			case ')':
				in_parenth = p[i] == '(';
				meter.top = p[i++];
				s.a_meter.push(meter);
				meter = {}
				continue
			default:
				if (p[i] <= '0' || p[i] > '9') {
					syntax(1, "Bad char '$1' in M:", p[i])
					return
				}
				m2 = 2;			/* default when no bottom value */
				meter.top = p[i++]
				for (;;) {
					while (p[i] >= '0' && p[i] <= '9')
						meter.top += p[i++]
					if (p[i] == ')') {
						if (p[i + 1] != '/')
							break
						i++
					}
					if (p[i] == '/') {
						i++;
						if (p[i] <= '0' || p[i] > '9') {
							syntax(1, "Bad char '$1' in M:", p[i])
							return
						}
						meter.bot = p[i++]
						while (p[i] >= '0' && p[i] <= '9')
							meter.bot += p[i++]
						break
					}
					if (p[i] != ' ' && p[i] != '+')
						break
					if (i >= text.length
					 || p[i + 1] == '(')	/* "M:5 (2/4+3/4)" */
						break
					meter.top += p[i++]
				}
				m1 = parseInt(meter.top)
				break
			}
			if (!in_parenth) {
				if (meter.bot)
					m2 = parseInt(meter.bot);
				wmeasure += m1 * BASE_LEN / m2
			}
			s.a_meter.push(meter);
			meter = {}
			while (p[i] == ' ')
				i++
			if (p[i] == '+') {
				meter.top = p[i++];
				s.a_meter.push(meter);
				meter = {}
			}
		}
	}
	if (p[i] == '=') {
		val = p.substring(++i)
		if (!val.match(/^(\d|\/)+$/)) {
			syntax(1, "Bad duration '$1' in M:", val)
			return
		}
		wmeasure = BASE_LEN * eval(val)
	}
	s.wmeasure = wmeasure

	if (parse.state != 3) {
		info.M = text;
		glovar.meter = s
		if (parse.state >= 1) {

			/* in the tune header, change the unit note length */
			if (!glovar.ulen) {
				if (wmeasure <= 1
				 || wmeasure >= BASE_LEN * 3 / 4)
					glovar.ulen = BASE_LEN / 8
				else
					glovar.ulen = BASE_LEN / 16
			}
			for (v = 0; v < voice_tb.length; v++) {
				voice_tb[v].meter = s;
				voice_tb[v].wmeasure = wmeasure
			}
		}
	} else {
		curvoice.wmeasure = wmeasure
		if (is_voice_sig()) {
			curvoice.meter = s;
			reset_gen()
		} else {
			sym_link(s)
		}
	}
}

/* Q: tempo */
function new_tempo(text) {
	var	i = 0, j, c, nd, tmp,
		s = {
			type: TEMPO,
			dur: 0
		}

	set_ref(s)

	if (cfmt.writefields.indexOf('Q') < 0)
		s.del = true			// don't display

	/* string before */
	if (text[0] == '"') {
		i = text.indexOf('"', 1)
		if (i < 0) {
			syntax(1, "Unterminated string in Q:")
			return
		}
		s.tempo_str1 = text.slice(1, i);
		i++
		while (text[i] == ' ')
			i++
	}

	/* beat */
	tmp = new scanBuf();
	tmp.buffer = text;
	tmp.index = i
	while (1) {
//		c = tmp.char()
		c = text[tmp.index]
		if (c == undefined || c <= '0' || c > '9')
			break
		nd = parse_dur(tmp)
		if (!s.tempo_notes)
			s.tempo_notes = []
		s.tempo_notes.push(BASE_LEN * nd[0] / nd[1])
		while (1) {
//			c = tmp.char()
			c = text[tmp.index]
			if (c != ' ')
				break
			tmp.index++
		}
	}

	/* tempo value */
	if (c == '=') {
		c = text[++tmp.index]
		while (c == ' ')
			c = text[++tmp.index];
		i = tmp.index
		if (c == 'c' && text[i + 1] == 'a'
		 && text[i + 2] == '.' && text[i + 3] == ' ') {
			s.tempo_ca = 'ca. ';
			tmp.index += 4;
//			c = text[tmp.index]
		}
		if (text[tmp.index + 1] != '/') {
			s.tempo = tmp.get_int()
		} else {
			nd = parse_dur(tmp);
			s.new_beat = BASE_LEN * nd[0] / nd[1]
		}
		c = text[tmp.index]
		while (c == ' ')
			c = text[++tmp.index]
	}

	/* string after */
	if (c == '"') {
		tmp.index++;
		i = text.indexOf('"', tmp.index + 1)
		if (i < 0) {
			syntax(1, "Unterminated string in Q:")
			return
		}
		s.tempo_str2 = text.slice(tmp.index, i)
	}

	if (parse.state != 3) {
		if (parse.state == 1) {			// tune header
			info.Q = text;
			glovar.tempo = s
			return
		}
		goto_tune()
	}
	if (curvoice.v == par_sy.top_voice) {	/* tempo only for first voice */
		sym_link(s)
		if (glovar.tempo && curvoice.time == 0)
			glovar.tempo.del = true
	}
}

// treat the information fields which may embedded
function do_info(info_type, text) {
	var s, d1, d2, a, vid

	switch (info_type) {

	// info fields in any state
	case 'I':
		do_pscom(text)
		break
	case 'L':
//fixme: ??
		if (parse.state == 2)
			goto_tune();
		a = text.match(/^(\d+)\/(\d+)(=(\d+)\/(\d+))?$/)
		if (a) {
			d1 = Number(a[2])
			if (!d1 || (d1 & (d1 - 1)) != 0)
				break
			d1 = Number(a[1]) / d1 * BASE_LEN
			if (a[3]) {
				d2 = Number(a[5])
				if (!d2 || (d2 & (d2 - 1)) != 0) {
					d2 = 0
					break
				}
				d2 = Number(a[4]) / d2 * BASE_LEN
			} else {
				d2 = d1
			}
		} else if (text == "auto") {
			d1 = d2 = -1
		}
		if (!d2) {
			syntax(1, "Bad L: value")
			break
		}
		if (parse.state < 2) {
			glovar.ulen = d1
		} else {
			curvoice.ulen = d1;
			curvoice.dur_fact = d2 / d1
		}
		break
	case 'M':
		new_meter(text)
		break
	case 'U':
		set_user(text)
		break

	// fields in tune header or tune body
	case 'P':
		if (parse.state == 0)
			break
		if (parse.state == 1) {
			info.P = text
			break
		}
		if (parse.state == 2)
			goto_tune()
		if (cfmt.writefields.indexOf(info_type) < 0)
			break
		s = {
			type: PART,
			text: text,
			dur: 0
		}

		/*
		 * If not in the main voice, then,
		 * if the voices are synchronized and no P: yet in the main voice,
		 * the misplaced P: goes into the main voice.
		 */
		var p_voice = voice_tb[par_sy.top_voice]
		if (curvoice.v != p_voice.v) {
			if (curvoice.time != p_voice.time)
				break
			if (p_voice.last_sym && p_voice.last_sym.type == PART)
				break		// already a P:
			var voice_sav = curvoice;
			curvoice = p_voice;
			sym_link(s);
			curvoice = voice_sav
		} else {
			sym_link(s)
		}
		break
	case 'Q':
		if (parse.state == 0)
			break
		new_tempo(text)
		break
	case 'V':
		get_voice(text)
		break

	// key signature at end of tune header on in tune body
	case 'K':
		if (parse.state == 0)
			break
		get_key(text)
		break

	// info in any state
	case 'N':
	case 'R':
		if (!info[info_type])
			info[info_type] = text
		else
			info[info_type] += '\n' + text
		break
	case 'r':
		if (!user.keep_remark
		 || parse.state != 3)
			break
		s = {
			type: REMARK,
			text: text,
			dur: 0
		}
		sym_link(s)
		break
	default:
		syntax(0, "'$1:' line ignored", info_type)
		break
	}
}

// music line parsing functions

/* -- adjust the duration and time of symbols in a measure when L:auto -- */
function adjust_dur(s) {
	var s2, time, auto_time, i, res;

	/* search the start of the measure */
	s2 = curvoice.last_sym
	if (!s2)
		return;

	/* the bar time is correct if there are multi-rests */
	if (s2.type == MREST
	 || s2.type == BAR)			/* in second voice */
		return
	while (s2.type != BAR && s2.prev)
		s2 = s2.prev;
	time = s2.time;
	auto_time = curvoice.time - time

	/* remove the invisible rest at start of tune */
	if (time == 0) {
		while (s2 && !s2.dur)
			s2 = s2.next
		if (s2 && s2.type == REST
		 && s2.invis) {
			time += s2.dur * curvoice.wmeasure / auto_time
			if (s2.prev)
				s2.prev.next = s2.next
			else
				curvoice.sym = s2.next
			if (s2.next)
				s2.next.prev = s2.prev;
			s2 = s2.next
		}
	}
	if (curvoice.wmeasure == auto_time)
		return				/* already good duration */

	for ( ; s2; s2 = s2.next) {
		s2.time = time
		if (!s2.dur || s2.grace)
			continue
		s2.dur = s2.dur * curvoice.wmeasure / auto_time;
		s2.dur_orig = s2.dur_orig * curvoice.wmeasure / auto_time;
		time += s2.dur
		if (s2.type != NOTE && s2.type != REST)
			continue
		for (i = 0; i <= s2.nhd; i++)
			s2.notes[i].dur = s2.notes[i].dur
					 * curvoice.wmeasure / auto_time;
		res = identify_note(s2, s2.dur_orig);
		s2.head = res[0];
		s2.dots = res[1];
		s2.nflags = res[2]
		if (s2.nflags <= -2)
			s2.stemless = true
		else
			delete s2.stemless
	}
	curvoice.time = s.time = time
}

/* -- parse a bar -- */
function new_bar() {
	var	s2, c, bar_type,
		line = parse.line,
		s = {
			type: BAR,
			ctx: parse.ctx,
			istart: parse.bol + line.index,
			dur: 0,
			multi: 0		// needed for decorations
		}

	if (vover && vover.bar)			// end of voice overlay
		get_vover('|')
	if (glovar.new_nbar) {			// %%setbarnb
		s.bar_num = glovar.new_nbar;
		glovar.new_nbar = 0
	}
	bar_type = line.char()
	while (1) {
		c = line.next_char()
		switch (c) {
		case '|':
		case '[':
		case ']':
		case ':':
			bar_type += c
			continue
		}
		break
	}
	if (bar_type[0] == ':') {
		if (bar_type.length == 1) {	// ":" alone
			bar_type = '|';
			s.bar_dotted = true
		} else {
			s.rbstop = 2		// right repeat with end
		}
	}

	// set the guitar chord and the decorations
	if (a_gch)
		gch_build(s)
	if (a_dcn) {
		deco_cnv(a_dcn, s);
		a_dcn = null
	}

	/* if the last element is '[', it may start
	 * a chord, an embedded header or an other bar */
	switch (bar_type.slice(-1)) {
	case '[':
		if (bar_type.length == 1) {
			s.text = ''
			break
		}
		if (c > '0' && c <= '9')	// ":|[2"
			break
		bar_type = bar_type.slice(0, -1);
		line.index--;
		c = '['
		break
	case ':':				// left repeat
		s.rbstop = 2			// with bracket end
		break
	}

	// check if repeat bar
	if (c > '0' && c <= '9') {
		s.text = c
		while (1) {
			c = line.next_char()
			if ("0123456789,.-".indexOf(c) < 0)
				break
			s.text += c
		}
		s.rbstop = 2;
		s.rbstart = 2
	} else if (c == '"' && bar_type == "[") {
//		s.text = ""
		while (1) {
			c = line.next_char()
			if (!c) {
				syntax(1, "No end of repeat string")
				return
			}
			if (c == '"') {
				line.index++
				break
			}
			if (c == '\\') {
				s.text += c;
				c = line.next_char()
			}
			s.text += c
		}
		s.text = cnv_escape(s.text);
		s.rbstop = 2;
		s.rbstart = 2
	}

	// ']' as the first character indicates a repeat bar stop
	if (bar_type[0] == ']') {
		s.rbstop = 2			// with end
		if (bar_type.length != 1)
			bar_type = bar_type.slice(1)
		else
			s.invis = true
	}

	s.iend = parse.bol + line.index

	if (s.rbstart
	 && curvoice.norepbra
	 && !curvoice.second)
		s.norepbra = true

	if (curvoice.ulen < 0)			// L:auto
		adjust_dur(s);

	s2 = curvoice.last_sym
	if (s2 && s2.type == SPACE) {
		s2.time--		// keep the space at the right place
	} else if (s2 && s2.type == BAR
		&& !s2.a_gch && !s2.a_dd
		&& !s.a_gch && !s.a_dd) {

		/* remove the invisible repeat bars when no shift is needed */
		if (bar_type == "["
		 && !s2.text
		 && (curvoice.st == 0
		  || (par_sy.staves[curvoice.st - 1].flags & STOP_BAR)
		  || s.norepbra)) {
			if (s.text)
				s2.text = s.text
			if (s.a_gch)
				s2.a_gch = s.a_gch
			if (s.norepbra)
				s2.norepbra = s.norepbra
			if (s.rbstart)
				s2.rbstart = s.rbstart
			if (s.rbstop)
				s2.rbstop = s.rbstop
//--fixme: pb when on next line and empty staff above
			return
		}

		/* merge back-to-back repeat bars */
		if (bar_type == "|:") {
			if (s2.bar_type == ":|") {
				s2.bar_type = "::";
				s2.rbstop = 2
				return
			}
			if (s2.bar_type == "||") {
				s2.bar_type = "||:";
				s2.rbstop = 2
				return
			}
		}
	}

	/* set some flags */
	switch (bar_type) {
	case "[":
		s.rbstop = 2
	case "[]":
	case "[|]":
		s.invis = true;
		bar_type = "[]"
		break
	case ":|:":
	case ":||:":
		bar_type = "::"
		break
	case "||":
		if (!cfmt.rbdbstop)
			break
	case "[|":
	case "|]":
		s.rbstop = 2
		break
	}
	s.bar_type = bar_type
	if (!curvoice.lyric_restart)
		curvoice.lyric_restart = s
	if (!curvoice.sym_restart)
		curvoice.sym_restart = s

	/* the bar must appear before a key signature */
	if (s2 && s2.type == KEY
	 && (!s2.prev || s2.prev.type != BAR)) {
		curvoice.last_sym = s2.prev
		if (!s2.prev)
			curvoice.sym = s2.prev;	// null
		sym_link(s);
		s.next = s2;
		s2.prev = s;
		curvoice.last_sym = s2
	} else {
		sym_link(s)
	}
	s.st = curvoice.st			/* original staff */

	/* if repeat bar and shift, add a repeat bar */
	if (s.rbstart
	 && !curvoice.norepbra
	 && curvoice.st > 0
	 && !(par_sy.staves[curvoice.st - 1].flags & STOP_BAR)) {
		s2 = {
			type: BAR,
			ctx: s.ctx,
			istart: s.istart,
			iend: s.iend,
			bar_type: "[",
			multi: 0,
			invis: true,
			text: s.text,
			rbstart: 2
		}
		sym_link(s2);
		s2.st = curvoice.st
		delete s.text;
		s.rbstart = 0
	}
}

var err_mispl_sta_s = "Misplaced '$1' in %%staves"

// parse %%staves / %%score
// return an array of [vid, flags] / null
function parse_staves(p) {
	var	v, vid,
		a_vf = [],
		err = false,
		flags = 0,
		brace = 0,
		bracket = 0,
		parenth = 0,
		flags_st = 0,
		i = 0

	/* parse the voices */
	while (i < p.length) {
		switch (p[i]) {
		case ' ':
		case '\t':
			break
		case '[':
			if (parenth || brace + bracket >= 2) {
				syntax(1, err_mispl_sta_s, '[');
				err = true
				break
			}
			flags |= brace + bracket == 0 ? OPEN_BRACKET : OPEN_BRACKET2;
			bracket++;
			flags_st <<= 8;
			flags_st |= OPEN_BRACKET
			break
		case '{':
			if (parenth || brace || bracket >= 2) {
				syntax(1, err_mispl_sta_s, '{');
				err = true
				break
			}
			flags |= !bracket ? OPEN_BRACE : OPEN_BRACE2;
			brace++;
			flags_st <<= 8;
			flags_st |= OPEN_BRACE
			break
		case '(':
			if (parenth) {
				syntax(1, err_mispl_sta_s, '(');
				err = true
				break
			}
			flags |= OPEN_PARENTH;
			parenth++;
			flags_st <<= 8;
			flags_st |= OPEN_PARENTH
			break
		case '*':
			if (brace && !parenth && !(flags & (OPEN_BRACE | OPEN_BRACE2)))
				flags |= FL_VOICE
			break
		case '+':
			flags |= MASTER_VOICE
			break
		default:
			if (!p[i].match(/\w/)) {
				syntax(1, "Bad voice ID in %%staves");
				err = true
				break
			}

			/* get / create the voice in the voice table */
			vid = ""
			while (i < p.length) {
				if (" \t()[]{}|*".indexOf(p[i]) >= 0)
					break
				vid += p[i++]
			}
			for ( ; i < p.length; i++) {
				switch (p[i]) {
				case ' ':
				case '\t':
					continue
				case ']':
					if (!(flags_st & OPEN_BRACKET)) {
						syntax(1, err_mispl_sta_s, ']');
						err = true
						break
					}
					bracket--;
					flags |= brace + bracket == 0 ?
							CLOSE_BRACKET :
							CLOSE_BRACKET2;
					flags_st >>= 8
					continue
				case '}':
					if (!(flags_st & OPEN_BRACE)) {
						syntax(1, err_mispl_sta_s, '}');
						err = true
						break
					}
					brace--;
					flags |= !bracket ?
							CLOSE_BRACE :
							CLOSE_BRACE2;
					flags &= ~FL_VOICE;
					flags_st >>= 8
					continue
				case ')':
					if (!(flags_st & OPEN_PARENTH)) {
						syntax(1, err_mispl_sta_s, ')');
						err = true
						break
					}
					parenth--;
					flags |= CLOSE_PARENTH;
					flags_st >>= 8
					continue
				case '|':
					flags |= STOP_BAR
					continue
				}
				break
			}
			a_vf.push([vid, flags]);
			flags = 0
			continue
		}
		i++
	}
	if (flags_st != 0) {
		syntax(1, "'}', ')' or ']' missing in %%staves");
		err = true
	}
	if (err || a_vf.length == 0)
		return //null
	return a_vf
}

// split an info string
function info_split(text) {
//		    start) {		// handle 'key=' after 'start' items
	var	a = [],
		item = "",
		i, j,
		n = text.length

	for (i = 0 ; i < n; i++) {
		switch (text[i]) {
		case '=':
			if (!item) {
				item = '='
				break
			}
			item += '=';
			a.push(item);
			item = ""
			break
		case ' ':
		case '\t':
			if (!item)
				break
			a.push(item);
			item = ""
			break
		case '"':
			if (item) {
				a.push(item);
				item = ""
			}
			j = i++
			while (i < n) {
				if (text[i] == '"')
					break
				if (text[i] == '\\')
					i++;
				i++
			}
			if (text[i] != '"') {
				syntax(1, "Unterminated string")
				break
			}
			a.push(text.slice(j, i + 1))	// keep the '"'s
			break
		case '\\':
			item += text[i++]
			// fall thru
		default:
			item += text[i]
			break
		}
	}
	if (item)
		a.push(item)
	return a
}

/* -- get head type, dots, flags of note/rest for a duration -- */
function identify_note(s, dur) {
	var head, dots, flags

	if (dur % 12 != 0)
		syntax(1, "Invalid note duration $1", dur);
	dur /= 12			/* see BASE_LEN for values */
	if (dur == 0)
		syntax(1, "Note too short")
	for (flags = 5; dur != 0; dur >>= 1, flags--) {
		if (dur & 1)
			break
	}
	dur >>= 1
	switch (dur) {
	case 0: dots = 0; break
	case 1: dots = 1; break
	case 3: dots = 2; break
//	case 7: dots = 3; break
	default:
		dots = 3
		break
	}
	flags -= dots
//--fixme: is 'head' useful?
	if (flags >= 0) {
		head = FULL
	} else switch (flags) {
	default:
		syntax(1, "Note too long");
		flags = -4
		/* fall thru */
	case -4:
		head = SQUARE
		break
	case -3:
		head = cfmt.squarebreve ? SQUARE : OVALBARS
		break
	case -2:
		head = OVAL
		break
	case -1:
		head = EMPTY
		break
	}
	return [head, dots, flags]
}

// parse a duration and return [numerator, denominator]
// 'line' is not always 'parse.line'
var reg_dur = /(\d*)(\/*)(\d*)/g		/* (stop comment) */

function parse_dur(line) {
	var res, num, den;

	reg_dur.lastIndex = line.index;
	res = reg_dur.exec(line.buffer)
	if (!res[0])
		return [1, 1];
	num = res[1] || 1;
	den = res[3] || 1
	if (!res[3])
		den *= 1 << res[2].length;
	line.index = reg_dur.lastIndex
	return [num, den]
}

// parse the note accidental and pitch
function parse_acc_pit(line) {
	var	note, acc, micro_n, micro_d, pit, nd,
		c = line.char()

	// optional accidental
	switch (c) {
	case '^':
		c = line.next_char()
		if (c == '^') {
			acc = 2;
			c = line.next_char()
		} else {
			acc = 1
		}
		break
	case '=':
		acc = 3;
		c = line.next_char()
		break
	case '_':
		c = line.next_char()
		if (c == '_') {
			acc = -2;
			c = line.next_char()
		} else {
			acc = -1
		}
		break
	}

	/* look for microtone value */
	if (acc && acc != 3 && (c >= '1' && c <= '9')
	 || c == '/') {				// compatibility
		nd = parse_dur(line);
		micro_n = nd[0];
		micro_d = nd[1]
		if (micro_d == 1)
			micro_d = curvoice ? curvoice.uscale : 1
		else
			micro_d *= 2;	// 1/2 tone fraction -> tone fraction
		c = line.char()
	}

	/* get the pitch */
	pit = ntb.indexOf(c) + 16;
	c = line.next_char()
	if (pit < 16) {
		syntax(1, "'$1' is not a note", line.buffer[line.index - 1])
		return //undefined
	}

	// octave
	while (c == "'") {
		pit += 7;
		c = line.next_char()
	}
	while (c == ',') {
		pit -= 7;
		c = line.next_char()
	}
	note = {
		pit: pit,
		apit: pit,
		shhd: 0,
		shac: 0,
		ti1: 0
	}
	if (acc) {
		note.acc = acc
		if (micro_n) {
			note.micro_n = micro_n;
			note.micro_d = micro_d
		}
	}
	return note
}

/* set the mapping of a note */
function set_map(note) {
	var	bn, an, nn, i,
		map = maps[curvoice.map]	// never null

	bn = 'abcdefg'[(note.pit + 77) % 7]
	if (note.acc)
		an = ['__', '_', '', '^', '^^', '='][note.acc + 2]
	else
		an = ''
//fixme: treat microtone
	nn = an + bn
	for (i = note.pit; i >= 28; i -= 7)
		nn += "'"
	for (i = note.pit; i < 21; i += 7)
		nn += ",";

	if (!map[nn]) {
		nn = 'octave,' + an + bn		// octave
		if (!map[nn]) {
			nn = 'key,' +			// 'key,'
				'abcdefg'[(note.pit + 77 -
						curvoice.ckey.k_delta) % 7]
			if (!map[nn]) {
				nn = 'all'		// 'all'
				if (!map[nn])
					return
			}
		}
	}
	note.map = map[nn]
	if (note.map[1]) {
		note.apit = note.pit = note.map[1].pit;	// print
		note.acc = note.map[1].acc
	}
}

/* -- parse note or rest with pitch and length -- */
// 'line' is not always 'parse.line'
function parse_basic_note(line, ulen) {
	var	nd,
		note = parse_acc_pit(line)

	if (!note)
		return //null

	// duration
	if (line.char() == '0') {		// compatibility
		parse.stemless = true;
		line.index++
	}
	nd = parse_dur(line);
	note.dur = ulen * nd[0] / nd[1]
	return note
}

function parse_vpos() {
	var	c,
		line = parse.line,
		ti1 = 0

	if (line.buffer[line.index - 1] == '.' && !a_dcn)
		ti1 = SL_DOTTED
	switch (line.next_char()) {
	case "'":
		line.index++
		return ti1 + SL_ABOVE
	case ",":
		line.index++
		return ti1 + SL_BELOW
	}
	return ti1 + SL_AUTO
}

var	cde2fcg = new Int8Array([0, 2, 4, -1, 1, 3, 5]),
	cgd2cde = new Int8Array([0, 4, 1, 5, 2, 6, 3]),
	acc2 = new Int8Array([-2, -1, 3, 1, 2])

/* transpose a note / chord */
function note_transp(s) {
	var	i, j, n, d, a, acc, i1, i3, i4, note,
		m = s.nhd,
		sf_old = curvoice.okey.k_sf,
		i2 = curvoice.ckey.k_sf - sf_old,
		dp = cgd2cde[(i2 + 4 * 7) % 7],
		t = curvoice.vtransp

	if (t < 0 && dp != 0)
		dp -= 7;
	dp += ((t / 3 / 12) | 0) * 7
	for (i = 0; i <= m; i++) {
		note = s.notes[i];

		// pitch
		n = note.pit;
		note.pit += dp;
		note.apit = note.pit;

		// accidental
		i1 = cde2fcg[(n + 5 + 16 * 7) % 7];	/* fcgdaeb */
		a = note.acc
		if (!a) {
			if (!curvoice.okey.a_acc) {
				if (sf_old > 0) {
					if (i1 < sf_old - 1)
						a = 1	// sharp
				} else if (sf_old < 0) {
					if (i1 >= sf_old + 6)
						a = -1	// flat
				}
			} else {
				for (j = 0; j < curvoice.okey.a_acc.length; j++) {
					acc = curvoice.okey.a_acc[j]
					if ((n + 16 * 7 - acc.pit) % 7 == 0) {
						a = acc.acc
						break
					}
				}
			}
		}
		i3 = i1 + i2
		if (a && a != 3)				// ! natural
			i3 += a * 7;

		i1 = ((((i3 + 1 + 21) / 7) | 0) + 2 - 3 + 32 * 5) % 5;
		a = acc2[i1]
		if (note.acc) {
			;
		} else if (curvoice.ckey.k_none) {
			if (a == 3		// natural
			 || acc_same_pitch(note.pit))
				continue
		} else if (curvoice.ckey.a_acc) {	/* acc list */
			i4 = cgd2cde[(i3 + 16 * 7) % 7]
			for (j = 0; j < curvoice.ckey.a_acc.length; j++) {
				if ((i4 + 16 * 7 - curvoice.ckey.a_acc[j].pits) % 7
							== 0)
					break
			}
			if (j < curvoice.ckey.a_acc.length)
				continue
		} else {
			continue
		}
		i1 = note.acc;
		d = note.micro_d
		if (d				/* microtone */
		 && i1 != a) {			/* different accidental type */
			n = note.micro_n
//fixme: double sharps/flats ?*/
//fixme: does not work in all cases (tied notes, previous accidental)
			switch (a) {
			case 3:			// natural
				if (n > d / 2) {
					n -= d / 2;
					note.micro_n = n;
					a = i1
				} else {
					a = -i1
				}
				break
			case 2:			// double sharp
				if (n > d / 2) {
					note.pit += 1;
					note.apit = note.pit;
					n -= d / 2
				} else {
					n += d / 2
				}
				a = i1;
				note.micro_n = n
				break
			case -2:		// double flat
				if (n >= d / 2) {
					note.pit -= 1;
					note.apit = note.pit;
					n -= d / 2
				} else {
					n += d / 2
				}
				a = i1;
				note.micro_n = n
				break
			}
		}
		note.acc = a
	}
}

/* sort the notes of the chord by pitch (lowest first) */
function sort_pitch(s) {
	s.notes = s.notes.sort(function(n1, n2) {
			return n1.pit - n2.pit
		})
}
function new_note(grace, tp_fact) {
	var	note, s, in_chord, c, dcn, type,
		i, n, s2, nd, res, num, dur,
		sl1 = 0,
		line = parse.line,
		a_dcn_sav = a_dcn;	// save parsed decoration names

	a_dcn = null;
	parse.stemless = false;
	s = {
		type: NOTE,
		ctx: parse.ctx,
		stem: 0,
		multi: 0,
		nhd: 0,
		xmx: 0
	}
	s.istart = parse.bol + line.index

	if (curvoice.color)
		s.color = curvoice.color

	if (grace) {
		s.grace = true
	} else {
		if (a_gch)
			gch_build(s)
		if (parse.repeat_n) {
			s.repeat_n = parse.repeat_n;
			s.repeat_k = parse.repeat_k;
			parse.repeat_n = 0
		}
	}
	c = line.char()
	switch (c) {
	case 'X':
		s.invis = true
	case 'Z':
		s.type = MREST;
		c = line.next_char()
		s.nmes = (c > '0' && c <= '9') ? line.get_int() : 1;
		s.dur = curvoice.wmeasure * s.nmes

		// ignore if in second voice
		if (curvoice.second) {
			curvoice.time += s.dur
			return null
		}
		break
	case 'y':
		s.type = SPACE;
		s.invis = true;
		s.dur = 0;
		c = line.next_char()
		if (c >= '0' && c <= '9')
			s.width = line.get_int()
		else
			s.width = 10
		break
	case 'x':
		s.invis = true
	case 'z':
		s.type = REST;
		line.index++;
		nd = parse_dur(line);
		s.dur_orig = ((curvoice.ulen < 0) ?
					15120 :	// 2*2*2*2*3*3*3*5*7
					curvoice.ulen) * nd[0] / nd[1];
		s.dur = s.dur_orig * curvoice.dur_fact;
		s.notes = [{
			pit: 18,
			dur: s.dur_orig
		}]
		break
	case '[':			// chord
		in_chord = true;
		c = line.next_char()
		// fall thru
	default:			// accidental, chord, note
		if (curvoice.uscale)
			s.uscale = curvoice.uscale;
		s.notes = []

		// loop on the chord
		while (1) {

			// when in chord, get the slurs and decorations
			if (in_chord) {
				while (1) {
					if (!c || c == '%')
						break
					i = c.charCodeAt(0);
					if (i >= 128) {
						syntax(1, not_ascii)
						return null
					}
					type = char_tb[i]
					switch (type[0]) {
					case '(':
						sl1 <<= 4;
						sl1 += parse_vpos();
						c = line.char()
						continue
					case '!':
						if (!a_dcn)
							a_dcn = []
						if (type.length > 1) {
							a_dcn.push(type.slice(1, -1))
						} else {
							dcn = ""
							while (1) {
								c = line.next_char()
								if (!c || c == '%') {
									syntax(1, "No end of decoration")
									return //null
								}
								if (c == '!')
									break
								dcn += c
							}
							a_dcn.push(dcn)
						}
						c = line.next_char()
						continue
					}
					break
				}
			}
			note = parse_basic_note(line,
					s.grace ? BASE_LEN / 4 :
					curvoice.ulen < 0 ?
						15120 :	// 2*2*2*2*3*3*3*5*7
						curvoice.ulen)
			if (!note)
				return //null

			// transpose
			if (curvoice.octave)
				note.apit = note.pit += curvoice.octave * 7
			if (curvoice.ottava)
				note.pit += curvoice.ottava
			if (sl1) {
				note.sl1 = sl1
				if (s.sl1)
					s.sl1++
				else
					s.sl1 = 1;
				sl1 = 0
			}
			if (a_dcn) {
				note.a_dcn = a_dcn;
				a_dcn = null
			}
			s.notes.push(note)
			if (!in_chord)
				break

			// in chord: get the ending slurs and the ties
			c = line.char()
			while (1) {
				switch (c) {
				case ')':
					if (note.sl2)
						note.sl2++
					else
						note.sl2 = 1
					if (s.sl2)
						s.sl2++
					else
						s.sl2 = 1;
					c = line.next_char()
					continue
				case '-':
					note.ti1 = parse_vpos();
					s.ti1 = true;
					c = line.char()
					continue
				case '.':
					c = line.next_char()
					if (c != '-') {
						syntax(1, "Misplaced dot")
						break
					}
					continue
				}
				break
			}
			if (c == ']') {
				line.index++;

				// adjust the chord duration
				nd = parse_dur(line);
				s.nhd = s.notes.length - 1
				for (i = 0; i <= s.nhd ; i++) {
					note = s.notes[i];
					note.dur = note.dur * nd[0] / nd[1]
				}
				break
			}
		}

		// the duration of the chord is the duration of the 1st note
		s.dur_orig = s.notes[0].dur;
		s.dur = s.notes[0].dur * curvoice.dur_fact
	}
	if (s.grace && s.type != NOTE) {
		syntax(1, "Not a note in grace note sequence")
		return //null
	}

	if (s.notes) {				// if note or rest
		if (!s.grace) {
			switch (curvoice.pos.stm) {
			case SL_ABOVE: s.stem = 1; break
			case SL_BELOW: s.stem = -1; break
			case SL_HIDDEN: s.stemless = true; break
			}

			s.combine = curvoice.combine

			// adjust the symbol duration
			s.dur *= tp_fact;
			num = curvoice.brk_rhythm
			if (num) {
				curvoice.brk_rhythm = 0;
				s2 = curvoice.last_note
				if (num > 0) {
					n = num * 2 - 1;
					s.dur = s.dur * n / num;
					s.dur_orig = s.dur_orig * n / num
					for (i = 0; i <= s.nhd; i++)
						s.notes[i].dur =
							s.notes[i].dur * n / num;
					s2.dur /= num;
					s2.dur_orig /= num
					for (i = 0; i <= s2.nhd; i++)
						s2.notes[i].dur /= num
				} else {
					num = -num;
					n = num * 2 - 1;
					s.dur /= num;
					s.dur_orig /= num
					for (i = 0; i <= s.nhd; i++)
						s.notes[i].dur /= num;
					s2.dur = s2.dur * n / num;
					s2.dur_orig = s2.dur_orig * n / num
					for (i = 0; i <= s2.nhd; i++)
						s2.notes[i].dur =
							s2.notes[i].dur * n / num
				}
				curvoice.time = s2.time + s2.dur;
				res = identify_note(s2, s2.dur_orig);
				s2.head = res[0];
				s2.dots = res[1];
				s2.nflags = res[2]
				if (s2.nflags <= -2)
					s2.stemless = true
				else
					delete s2.stemless

				// adjust the time of the grace notes, bars...
				for (s2 = s2.next; s2; s2 = s2.next)
					s2.time = curvoice.time
			}
		} else {		/* grace note - adjust its duration */
			var div = curvoice.key.k_bagpipe ? 8 : 4

			for (i = 0; i <= s.nhd; i++)
				s.notes[i].dur /= div;
			s.dur /= div;
			s.dur_orig /= div
			if (grace.stem)
				s.stem = grace.stem
		}

		// set the symbol parameters
		if (s.type == NOTE) {
			res = identify_note(s, s.dur_orig);
			s.head = res[0];
			s.dots = res[1];
			s.nflags = res[2]
			if (s.nflags <= -2)
				s.stemless = true
		} else {					// rest

			/* change the figure of whole measure rests */
//--fixme: does not work in sample.abc because broken rhythm on measure bar
			dur = s.dur_orig
			if (dur == curvoice.wmeasure) {
				if (dur < BASE_LEN * 2)
					dur = BASE_LEN
				else if (dur < BASE_LEN * 4)
					dur = BASE_LEN * 2
				else
					dur = BASE_LEN * 4
			}
			res = identify_note(s, dur);
			s.head = res[0];
			s.dots = res[1];
			s.nflags = res[2]
		}
		curvoice.last_note = s
	}

	sym_link(s)

	if (s.type == NOTE) {
		if (curvoice.vtransp)
			note_transp(s)
		if (curvoice.map
		 && maps[curvoice.map]) {
			for (i = 0; i <= s.nhd; i++)
				set_map(s.notes[i])
		}
	}

	if (cfmt.shiftunison)
		s.shiftunison = cfmt.shiftunison
	if (!grace) {
		if (!curvoice.lyric_restart)
			curvoice.lyric_restart = s
		if (!curvoice.sym_restart)
			curvoice.sym_restart = s
	}

	if (a_dcn_sav)
		deco_cnv(a_dcn_sav, s, s.prev)
	if (parse.stemless)
		s.stemless = true
	s.iend = parse.bol + line.index
	return s
}

// characters in the music line (ASCII only)
var nil = ["0"]
var char_tb = [
	nil, nil, nil, nil,		/* 00 - .. */
	nil, nil, nil, nil,
	nil, " ", "\n", nil,		/* . \t \n . */
	nil, nil, nil, nil,
	nil, nil, nil, nil,
	nil, nil, nil, nil,
	nil, nil, nil, nil,
	nil, nil, nil, nil,		/* .. - 1f */
	" ", "!", '"', "i",		/* (sp) ! " # */
	"\n", nil, "&", nil,		/* $ % & ' */
	"(", ")", "i", nil,		/* ( ) * + */
	nil, "-", "!dot!", nil,		/* , - . / */
	nil, nil, nil, nil, 		/* 0 1 2 3 */
	nil, nil, nil, nil, 		/* 4 5 6 7 */
	nil, nil, "|", "i",		/* 8 9 : ; */
	"<", "n", "<", "i",		/* < = > ? */
	"i", "n", "n", "n",		/* @ A B C */
	"n", "n", "n", "n", 		/* D E F G */
	"!fermata!", "d", "d", "d",	/* H I J K */
	"!emphasis!", "!lowermordent!",
		"d", "!coda!",		/* L M N O */
	"!uppermordent!", "d",
		"d", "!segno!",		/* P Q R S */
	"!trill!", "d", "d", "d",	/* T U V W */
	"n", "d", "n", "[",		/* X Y Z [ */
	"\\","|", "n", "n",		/* \ ] ^ _ */
	"i", "n", "n", "n",	 	/* ` a b c */
	"n", "n", "n", "n",	 	/* d e f g */
	"d", "d", "d", "d",		/* h i j k */
	"d", "d", "d", "d",		/* l m n o */
	"d", "d", "d", "d",		/* p q r s */
	"d", "!upbow!",
		"!downbow!", "d",	/* t u v w */
	"n", "n", "n", "{",		/* x y z { */
	"|", "}", "!roll!", nil,	/* | } ~ (del) */
]

function parse_music_line() {
	var	grace, last_note_sav, a_dcn_sav, no_eol, s,
		tp_a = [], tp,
		tpn = -1,
		tp_fact = 1,
		slur_start = 0,
		line = parse.line

	// check if a transposing macro matches a source sequence
	// if yes return the base note
	function check_mac(m) {
	    var	i, j, b

		for (i = 1, j = line.index + 1; i < m.length; i++, j++) {
			if (m[i] == line.buffer[j])
				continue
			if (m[i] != 'n')		// search the base note
				return //null
			b = ntb.indexOf(line.buffer[j])
			if (b < 0)
				return //null
			while (line.buffer[j + 1] == "'") {
				b += 7;
				j++
			}
			while (line.buffer[j + 1] == ',') {
				b -= 7;
				j++
			}
		}
		line.index = j
		return b
	}

	// expand a transposing macro
	function expand(m, b) {
	    var	c, d,
		r = "",				// result
		n = m.length

		for (i = 0; i < n; i++) {
			c = m[i]
			if (c >= 'h' && c <= 'z') {
				d = b + c.charCodeAt(0) - 'n'.charCodeAt(0)
				c = ""
				while (d < 0) {
					d += 7;
					c += ','
				}
				while (d > 14) {
					d -= 7;
					c += "'"
				}
				r += ntb[d] + c
			} else {
				r += c
			}
		}
		return r
	} // expand()

	// parse a macro
	function parse_mac(m, b) {
	    var	seq,
		line_sav = line,
		istart_sav = parse.istart;

		parse.line = line = new scanBuf();
		parse.istart += line_sav.index;
		line.buffer = b ? expand(m, b) : m;
		parse_seq(true);
		parse.line = line = line_sav;
		parse.istart = istart_sav
	}

	// parse a music sequence
	function parse_seq(in_mac) {
	    var	c, idx, type, k, s, dcn, i, n, text

		while (1) {
			c = line.char()
			if (!c || c == '%')
				break

			// special case for '.' (dot)
			if (c == '.') {
				switch (line.buffer[line.index + 1]) {
				case '(':
				case '-':
				case '|':
					c = line.next_char()
					break
				}
			}

			idx = c.charCodeAt(0);
			if (idx >= 128) {
				syntax(1, not_ascii);
				line.index++
				break
			}

			// check if start of a macro
			if (!in_mac && maci[idx]) {
				n = 0
				for (k in mac) {
					if (!mac.hasOwnProperty(k)
					 || k[0] != c)
						continue
					if (k.indexOf('n') < 0) {
						if (line.buffer.indexOf(k, line.index)
								!= line.index)
							continue
						line.index += k.length
					} else {
						n = check_mac(k)
						if (!n)
							continue
					}
					parse_mac(mac[k], n);
					n = 1
					break
				}
				if (n)
					continue
			}

			type = char_tb[idx]
			switch (type[0]) {
			case ' ':			// beam break
				s = curvoice.last_note
				if (s) {
					s.beam_end = true
					if (grace)
						grace.gr_shift = true
				}
				break
			case '\n':			// line break
				if (cfmt.barsperstaff)
					break
				if (par_sy.voices[curvoice.v].range == 0
				 && curvoice.last_sym)
					curvoice.last_sym.eoln = true
				break
			case '&':			// voice overlay
				c = line.next_char()
				if (c == ')') {
					get_vover(')')
					break
				}
				get_vover('&')
				continue
			case '(':			// slur start - tuplet - vover
				c = line.next_char()
				if (c > '0' && c <= '9') {	// tuplet
				    var	pplet = line.get_int(),
					qplet = qplet_tb[pplet],
					rplet = pplet,
					c = line.char()

					if (c == ':') {
						c = line.next_char()
						if (c > '0' && c <= '9') {
							qplet = line.get_int();
							c = line.char()
						}
						if (c == ':') {
							c = line.next_char()
							if (c > '0' && c <= '9') {
								rplet = line.get_int();
								c = line.char()
							} else {
								syntax(1, "Invalid 'r' in tuplet")
								continue
							}
						}
					}
					if (qplet == 0 || qplet == undefined)
						qplet = (curvoice.wmeasure % 9) == 0 ?
									3 : 2;
					tp = tp_a[++tpn]
					if (!tp)
						tp_a[tpn] = tp = {}
					tp.p = pplet;
					tp.q = qplet;
					tp.r = rplet;
					tp.f = cfmt.tuplets;
					tp.fact	= tp_fact * qplet / pplet;
					tp_fact = tp.fact
					continue
				}
				if (c == '&') {		// voice overlay start
					get_vover('(')
					break
				}
				slur_start <<= 4;
				line.index--;
				slur_start += parse_vpos()
				continue
			case ')':			// slur end
				if (curvoice.ignore)
					break
				s = curvoice.last_sym
				if (s) {
					switch (s.type) {
					case NOTE:
					case REST:
					case SPACE:
						break
					default:
						s = null
						break
					}
				}
				if (!s) {
					syntax(1, "Bad character '$1'", c)
					break
				}
				if (s.slur_end)
					s.slur_end++
				else
					s.slur_end = 1
				break
			case '!':			// start of decoration
				if (!a_dcn)
					a_dcn = []
				if (type.length > 1) {	// decoration letter
					dcn = type.slice(1, -1)
				} else {
					dcn = "";
					i = line.index		// in case no deco end
					while (1) {
						c = line.next_char()
						if (c == '%')
							c = 0
						if (!c)
							break
						if (c == '!')
							break
						dcn += c
					}
					if (!c) {
						line.index = i;
						syntax(1, "No end of decoration")
						break
					}
				}
				if (ottava[dcn])
					set_ottava(dcn)
				a_dcn.push(dcn)
				break
			case '"':
				parse_gchord(type)
				break
			case '-':
			    var tie_pos = 0

				if (!curvoice.last_note
				 || curvoice.last_note.type != NOTE) {
					syntax(1, "No note before '-'")
					break
				}
				tie_pos = parse_vpos();
				s = curvoice.last_note
				for (i = 0; i <= s.nhd; i++) {
					if (!s.notes[i].ti1)
						s.notes[i].ti1 = tie_pos
					else if (s.nhd == 0)
						syntax(1, "Too many ties")
				}
				s.ti1 = true
				if (grace)
					grace.ti1 = true
				continue
			case '[':
			    var c_next = line.buffer[line.index + 1]

				if ('|[]: "'.indexOf(c_next) >= 0
				 || (c_next >= '1' && c_next <= '9')) {
					if (grace) {
						syntax(1, bar_grace)
						break
					}
					new_bar()
					continue
				}
				if (line.buffer[line.index + 2] == ':') {
//fixme: KO if no end of info and '%' followed by ']'
					i = line.buffer.indexOf(']', line.index + 1)
					if (i < 0) {
						syntax(1, "Lack of ']'")
						break
					}
					text = line.buffer.slice(line.index + 3, i).trim()

					parse.istart = parse.bol + line.index;
					parse.iend = parse.bol + i++;
					line.index = 0;
					do_info(c_next, text);
					line.index = i
					continue
				}
				// fall thru ('[' is start of chord)
			case 'n':				// note/rest
				s = new_note(grace, tp_fact)
				if (!s)
					continue
				if (s.type == NOTE) {
					if (slur_start) {
						s.slur_start = slur_start;
						slur_start = 0
					}
				}
				if (grace) {
//fixme: tuplets in grace notes?
					if (tpn >= 0)
						s.in_tuplet = true
					continue
				}

				// set the tuplet values
				if (tpn >= 0 && s.notes) {
					s.in_tuplet = true
//fixme: only one nesting level
					if (tpn > 0) {
						if (tp_a[0].p) {
							s.tp0 = tp_a[0].p;
							s.tq0 = tp_a[0].q;
							s.tf = tp_a[0].f;
							tp_a[0].p = 0
						}
						tp_a[0].r--
						if (tp.p) {
							s.tp1 = tp.p;
							s.tq1 = tp.q;
							s.tf = tp.f;
							tp.p = 0
						}
					} else if (tp.p) {
						s.tp0 = tp.p;
						s.tq0 = tp.q;
						s.tf = tp.f;	// %%tuplets
						tp.p = 0
					}
					tp.r--
					if (tp.r == 0) {
						if (tpn-- == 0) {
							s.te0 = true;
							tp_fact = 1;
							curvoice.time = Math.round(curvoice.time);
							s.dur = curvoice.time - s.time
						} else {
							s.te1 = true;
							tp = tp_a[0]
							if (tp.r == 0) {
								tpn--;
								s.te0 = true;
								tp_fact = 1;
								curvoice.time = Math.round(curvoice.time);
								s.dur = curvoice.time - s.time
							} else {
								tp_fact = tp.fact
							}
						}
					}
				}
				continue
			case '<':				/* '<' and '>' */
				if (!curvoice.last_note) {
					syntax(1, "No note before '<'")
					break
				}
				if (grace) {
					syntax(1, "Cannot have a broken rhythm in grace notes")
					break
				}
				n = c == '<' ? 1 : -1
				while (c == '<' || c == '>') {
					n *= 2;
					c = line.next_char()
				}
				curvoice.brk_rhythm = n
				continue
			case 'i':				// ignore
				break
			case '{':
				if (grace) {
					syntax(1, "'{' in grace note")
					break
				}
				last_note_sav = curvoice.last_note;
				curvoice.last_note = null;
				a_dcn_sav = a_dcn;
				a_dcn = undefined;
				grace = {
					type: GRACE,
					ctx: parse.ctx,
					istart: parse.bol + line.index,
					dur: 0,
					multi: 0
				}
				switch (curvoice.pos.gst) {
				case SL_ABOVE: grace.stem = 1; break
				case SL_BELOW: grace.stem = -1; break
				case SL_HIDDEN:	grace.stem = 2; break	/* opposite */
				}
				sym_link(grace);
				c = line.next_char()
				if (c == '/') {
					grace.sappo = true	// acciaccatura
					break
				}
				continue
			case '|':
				if (grace) {
					syntax(1, bar_grace)
					break
				}
				c = line.buffer[line.index - 1];
				new_bar()
				if (c == '.')
					curvoice.last_sym.bar_dotted = true
				continue
			case '}':
				s = curvoice.last_note
				if (!grace || !s) {
					syntax(1, "Bad character '$1'", c)
					break
				}
				if (a_dcn)
					syntax(1, "Decoration ignored");
				s.gr_end = true;
				grace.extra = grace.next;
				grace.extra.prev = null;
				grace.next = null;
				curvoice.last_sym = grace;
				grace = null
				if (!s.prev			// if one grace note
				 && !curvoice.key.k_bagpipe) {
					for (i = 0; i <= s.nhd; i++)
						s.notes[i].dur *= 2;
					s.dur *= 2;
					s.dur_orig *= 2
					var res = identify_note(s, s.dur_orig);
					s.head = res[0];
					s.dots = res[1];
					s.nflags = res[2]
				}
				curvoice.last_note = last_note_sav;
				a_dcn = a_dcn_sav
				break
			case "\\":
				for (i = line.index + 1; ; i++) { // check if some comment
					switch (line.buffer[i]) {
					case ' ':
					case '\t':
						continue
					case '%':
						line.index = line.buffer.length
						// fall thru
					case undefined:
						c = undefined;
						no_eol = true
						break
					}
					break
				}
				if (!c)
					break
				// fall thru
			default:
				syntax(1, "Bad character '$1'", c)
				break
			}
			line.index++
		}
	} // parse_seq()

	if (parse.state != 3) {		// if not in tune body
		if (parse.state != 2)
			return
		goto_tune()
	}

	parse_seq()

	if (tpn >= 0) {
		syntax(1, "No end of tuplet")
		for (s = curvoice.last_note; s; s = s.prev) {
			if (s.tp1)
				s.tp1 = 0
			if (s.tp0) {
				s.tp0 = 0
				break
			}
		}
	}
	if (grace) {
		syntax(1, "No end of grace note sequence");
		curvoice.last_sym = grace.prev;
		curvoice.last_note = last_note_sav
		if (grace.prev)
			grace.prev.next = null
	}
	if (cfmt.breakoneoln && curvoice.last_note)
		curvoice.last_note.beam_end = true
	if (no_eol || cfmt.barsperstaff)
		return
	if (char_tb['\n'.charCodeAt(0)] == '\n'
	 && par_sy.voices[curvoice.v].range == 0
	 && curvoice.last_sym)
		curvoice.last_sym.eoln = true
//--fixme: cfmt.alignbars
}
// abc2svg - subs.js - text output
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

/* width of characters according to the encoding */
/* these are the widths for Times-Roman, extracted from the 'a2ps' package */
/*fixme-hack: set 500 to control characters for utf-8*/

var cw_tb = new Float32Array([
	.500,.500,.500,.500,.500,.500,.500,.500,	// 00
	.500,.500,.500,.500,.500,.500,.500,.500,
	.500,.500,.500,.500,.500,.500,.500,.500,	// 10
	.500,.500,.500,.500,.500,.500,.500,.500,
	.250,.333,.408,.500,.500,.833,.778,.333,	// 20
	.333,.333,.500,.564,.250,.564,.250,.278,
	.500,.500,.500,.500,.500,.500,.500,.500,	// 30
	.500,.500,.278,.278,.564,.564,.564,.444,
	.921,.722,.667,.667,.722,.611,.556,.722,	// 40
	.722,.333,.389,.722,.611,.889,.722,.722,
	.556,.722,.667,.556,.611,.722,.722,.944,	// 50
	.722,.722,.611,.333,.278,.333,.469,.500,
	.333,.444,.500,.444,.500,.444,.333,.500,	// 60
	.500,.278,.278,.500,.278,.778,.500,.500,
	.500,.500,.333,.389,.278,.500,.500,.722,	// 70
	.500,.500,.444,.480,.200,.480,.541,.500
])

/* -- return the character width -- */
function cwid(c) {
	var i = c.charCodeAt(0)		// utf-16

	if (i >= 0x80) {		// if not ASCII
		if (i >= 0x300 && i < 0x370)
			return 0;	// combining diacritical mark
		i = 0x61		// 'a'
	}
	return cw_tb[i]
}

// estimate the width of a string
function strw(str) {
	var	swfac = gene.curfont.swfac,
		w = 0,
		i, j, c,
		n = str.length

	for (i = 0; i < n; i++) {
		c = str[i]
		switch (c) {
		case '$':
			c = str[i + 1]
			if (c == '0') {
				gene.curfont = gene.deffont
			} else if (c >= '1' && c <= '9') {
				gene.curfont = get_font("u" + c)
			} else {
				c = '$'
				break
			}
			i++
			swfac = gene.curfont.swfac
			continue
		case '&':
			j = str.indexOf(';', i)
			if (j > 0 && j - i < 10) {
				i = j;
				c = 'a'		// XML character reference
			}
			break
		}
		w += cwid(c) * swfac
	}
	return w
}

// set the default and current font
function set_font(xxx) {
	gene.curfont = gene.deffont = get_font(xxx)
}

// output a string handling the font changes
function out_str(str) {
	var	n_font,
		o_font = gene.curfont,
		c_font = o_font;

	output.push(str.replace(/<|>|&.*?;|&|  |\$./g, function(c){
			switch (c[0]) {
			case '<': return "&lt;"
			case '>': return "&gt;"
			case '&':
				if (c == '&')
					 return "&amp;"
				return c
			case ' ':
				return '  '		// space + nbspace
			case '$':
				if (c[1] == '0') {
					n_font = gene.deffont;
					use_font(n_font)
				} else if (c[1] >= '1' && c[1] <= '9')
					n_font = get_font("u" + c[1])
				else
					return c
				c = ''
				if (n_font == c_font)
					return c
				if (c_font != o_font)
					c = "</tspan>";
				c_font = n_font
				if (c_font == o_font)
					return c
				return c + '<tspan\n\tclass="' +
						font_class(n_font) + '">'
			}
		}))
	if (c_font != o_font) {
		output.push("</tspan>");
		gene.curfont = c_font	// keep current font for next paragraph
	}
}

// output a string, handling the font changes
// the action is:
//	'c' align center
//	'r' align right
//	'\t' handle the tabulations - dx is the space between the fields
//	'j' justify - line_w is the line width
//	otherwise align left
function xy_str(x, y, str,
		 action,
		 line_w) {
	output.push('<text class="' + font_class(gene.curfont) + '" x="');
	out_sxsy(x, '" y="', y)
	switch (action) {
	case 'c':
		output.push('" text-anchor="middle">')
		break
	case 'j':
		output.push('" textLength="' + line_w.toFixed(2) + '">')
		break
	case 'r':
		output.push('" text-anchor="end">')
		break
	default:
		output.push('">')
		break
	}
	out_str(str);
	output.push("</text>\n")
}

// output a string in a box
function xy_str_b(x, y, str) {
// not in the SVG documentation,
// but this works for almost all browsers but firefox
//	output.push('<g style="outline: solid black;\
// outline-width: 1px">\n');
//	xy_str(x, y, str, action, line_w);
//	output.push('</g>\n')
	var	w = strw(str);

	output.push('<rect class="stroke" x="');
	out_sxsy(x - 2, '" y="', y + gene.curfont.size - 2);
	output.push('" width="' + (w + 4).toFixed(2) +
		'" height="' + (gene.curfont.size + 3).toFixed(2) +
		'"/>\n');
	xy_str(x, y, str)
}

/* -- move trailing "The" to front, set to uppercase letters or add xref -- */
function trim_title(title, is_subtitle) {
	var i

	if (cfmt.titletrim) {
		i = title.lastIndexOf(", ")
		if (i < 0 || title[i + 2] < 'A' || title[i + 2] > 'Z'
		 || i < title.length - 7	// word no more than 5 characters
		 || title.indexOf(' ', i + 3) >= 0)
			i = 0
	}
	if (!is_subtitle
	 && cfmt.writefields.indexOf('X') >= 0)
		title = info.X + '.  ' + title
	if (i)
		title = title.slice(i + 2).trim() + ' ' + title.slice(0, i)
	if (cfmt.titlecaps)
		return title.toUpperCase()
	return title
}

// return the width of the music line
function get_lwidth() {
	return (img.width - img.lm - img.rm
					- 2)	// for bar thickness at eol
			/ cfmt.scale
}

// header generation functions
function write_title(title, is_subtitle) {
	var font, sz

	if (!title)
		return
	set_page();
	title = trim_title(title, is_subtitle)
	if (is_subtitle) {
		set_font("subtitle");
		sz = gene.curfont.size;
		vskip(cfmt.subtitlespace + sz)
	} else {
		set_font("title");
		sz = gene.curfont.size;
		vskip(cfmt.titlespace + sz)
	}
	if (cfmt.titleleft)
		xy_str(0, sz * .2, title)
	else
		xy_str(get_lwidth() / 2, sz * .2, title, "c")
}

/* -- output a header format '111 (222)' -- */
function put_inf2r(x, y, str1, str2, action) {
	if (!str1) {
		if (!str2)
			return
		str1 = str2;
		str2 = null
	}
	if (!str2)
		xy_str(x, y, str1, action)
	else
		xy_str(x, y, str1 + ' (' + str2 + ')', action)
}

/* -- write a text block (%%begintext / %%text / %%center) -- */
function write_text(text, action) {
	if (action == 's')
		return				// skip
	set_font("text");
	set_page();
	var	strlw = get_lwidth(),
		lineskip = gene.curfont.size * cfmt.lineskipfac,
		parskip = gene.curfont.size * cfmt.parskipfac,
		p_start = block.started ? function(){} : blk_out,
		p_flush = block.started ? svg_flush : blk_flush,
		i, j, x, words, w, k, ww

	p_start()
	switch (action) {
	default:
//	case 'c':
//	case 'r':
		switch (action) {
		case 'c': x = strlw / 2; break
		case 'r': x = strlw; break
		default: x = 0; break
		}
		j = 0
		while (1) {
			i = text.indexOf('\n', j)
			if (i < 0) {
				vskip(lineskip);
				xy_str(x, 0, text.slice(j), action)
				break
			}
			if (i == j) {			// new paragraph
				vskip(parskip);
				p_flush();
				use_font(gene.curfont)
				while (text[i + 1] == '\n') {
					vskip(lineskip);
					i++
				}
				if (i == text.length)
					break
				p_start()
			} else {
				vskip(lineskip);
				xy_str(x, 0, text.slice(j, i), action)
			}
			j = i + 1
		}
		vskip(parskip);
		p_flush()
		break
	case 'f':
	case 'j':
		j = 0
		while (1) {
			i = text.indexOf('\n\n', j)
			if (i < 0)
				words = text.slice(j)
			else
				words = text.slice(j, i);
			words = words.split(/\s+/);
			w = k = 0
			for (j = 0; j < words.length; j++) {
				ww = strw(words[j] + ' ');
				w += ww
				if (w >= strlw) {
					vskip(lineskip);
					xy_str(0, 0,
						words.slice(k, j).join(' '),
						action, strlw);
					k = j;
					w = ww
				}
			}
			if (w != 0) {
				vskip(lineskip);
				xy_str(0, 0, words.slice(k).join(' '))
			}
			vskip(parskip);
			p_flush()
			if (i < 0)
				break
			while (text[i + 2] == '\n') {
				vskip(lineskip);
				i++
			}
			if (i == text.length)
				break
			p_start();
			use_font(gene.curfont);
			j = i + 2
		}
		break
	}
}

/* -- output the words after tune -- */
function put_words(words) {
	var p, i, j, n, nw, i2, i_end, have_text;

	// output a line of words after tune
	function put_wline(p, x, right) {
		var i = 0, j, k

		if (p[i] == '$' && p[i +  1] >= '0' && p[i + 1] <= '9')
			i += 2;
		k = 0;
		j = i
		if ((p[i] >= '0' && p[i] <= '9') || p[i + 1] == '.') {
			while (i < p.length) {
				i++
				if (p[i] == ' '
				 || p[i - 1] == ':'
				 || p[i - 1] == '.')
					break
			}
			k = i
			while (p[i] == ' ')
				i++
		}

		if (k != 0)
			xy_str(x, 0, p.slice(j, k), 'r')
		if (i < p.length)
			xy_str(x + 5, 0, p.slice(i), 'l')
		return i >= p.length && k == 0
	} // put_wline()

	blk_out();
	set_font("words")

	/* see if we may have 2 columns */
	var	middle = get_lwidth() / 2,
		max2col = (middle - 45.) / (cwid('a') * gene.curfont.swfac);
	n = 0;
	words = words.split('\n');
	nw = words.length
	for (i = 0; i < nw; i++) {
		p = words[i]
/*fixme:utf8*/
		if (p.length > max2col) {
			n = 0
			break
		}
		if (!p) {
			if (have_text) {
				n++;
				have_text = false
			}
		} else {
			have_text = true
		}
	}
	if (n > 0) {
		i = n = ((n + 1) / 2) | 0;
		have_text = false
		for (i_end = 0; i_end < nw; i_end++) {
			p = words[i_end];
			j = 0
			while (p[j] == ' ')
				j++
			if (j == p.length) {
				if (have_text && --i <= 0)
					break
				have_text = false
			} else {
				have_text = true
			}
		}
		i2 = i_end + 1
	} else {
		i2 = i_end = nw
	}

	/* output the text */
	vskip(cfmt.wordsspace)

	for (i = 0; i < i_end || i2 < nw; i++) {
		var desc = gene.curfont.size * .2
//fixme:should also permit page break on stanza start
		if (i < i_end && words[i].length == 0) {
			blk_out();
			use_font(gene.curfont)
		}
		vskip(cfmt.lineskipfac * gene.curfont.size - desc)
		if (i < i_end)
			put_wline(words[i], 45., 0)
		if (i2 < nw) {
			if (put_wline(words[i2], 20. + middle, 1)) {
				if (--n == 0) {
					if (i < i_end) {
						n++
					} else if (i2 < words.length - 1) {

						/* center the last words */
/*fixme: should compute the width average.. */
						middle *= .6
					}
				}
			}
			i2++
		}
		vskip(desc)
	}
}

/* -- output history -- */
function put_history() {
	var	i, j, c, str, font, h, w, head,
		names = cfmt.infoname.split("\n"),
		n = names.length

	for (i = 0; i < n; i++) {
		c = names[i][0]
		if (cfmt.writefields.indexOf(c) < 0)
			continue
		str = info[c]
		if (!str)
			continue
		if (!font) {
			font = true;
			set_font("history");
			vskip(cfmt.textspace);
			h = gene.curfont.size * cfmt.lineskipfac
		}
		head = names[i].slice(2)
		if (head[0] == '"')
			head = head.slice(1, -1);
		vskip(h);
		xy_str(0, 0, head);
		w = strw(head);
		str = str.split('\n');
		xy_str(w, 0, str[0])
		for (j = 1; j < str.length; j++) {
			vskip(h);
			xy_str(w, 0, str[j])
		}
		vskip(h * .3);
		blk_out();
		use_font(gene.curfont)
	}
}

/* -- write heading with format -- */
var info_font_init = {
	A: "info",
	C: "composer",
	O: "composer",
	P: "parts",
	Q: "tempo",
	R: "info",
	T: "title",
	X: "title"
}
function write_headform(lwidth) {
	var	c, font, font_name, align, x, y, sz,
		info_val = {},
		info_font = clone(info_font_init),
		info_sz = {
			A: cfmt.infospace,
			C: cfmt.composerspace,
			O: cfmt.composerspace,
			R: cfmt.infospace
		},
		info_nb = {}

	// compress the format
	var	fmt = "",
		p = cfmt.titleformat,
		j = 0,
		i = 0

	while (1) {
		while (p[i] == ' ')
			i++
		if (i >= p.length)
			break
		c = p[i++]
		if (c < 'A' || c > 'Z') {
			if (c == '+') {
				if (fmt.length == 0
				 || fmt.slice(-1) == '+')
					continue
				fmt = fmt.slice(0, -1) + '+'
			} else if (c == ',') {
				if (fmt.slice(-1) == '+')
					fmt = fmt.slice(0, -1) + 'l'
				fmt += '\n'
			}
			continue
		}
		if (!info_val[c]) {
			if (!info[c])
				continue
			info_val[c] = info[c].split('\n');
			info_nb[c] = 1
		} else {
			info_nb[c]++
		}
		fmt += c
		switch (p[i]) {
		case '-':
			fmt += 'l'
			i++
			break
		case '0':
			fmt += 'c'
			i++
			break
		case '1':
			fmt += 'r'
			i++
			break
		default:
			fmt += 'c'
			break
		}
	}
	if (fmt.slice(-1) == '+')
		fmt = fmt.slice(0, -1) + 'l';
	fmt += '\n'

	// loop on the blocks
	var	ya = {
			l: cfmt.titlespace,
			c: cfmt.titlespace,
			r: cfmt.titlespace
		},
		xa = {
			l: 0,
			c: lwidth * .5,
			r: lwidth
		},
		yb = {},
		str;
	p = fmt;
	i = 0
	while (1) {

		// get the y offset of the top text
		yb.l = yb.c = yb.r = y = 0;
		j = i
		while (1) {
			c = p[j++]
			if (c == '\n')
				break
			align = p[j++]
			if (align == '+')
				align = p[j + 1]
			else if (yb[align] != 0)
				continue
			str = info_val[c]
			if (!str)
				continue
			font_name = info_font[c]
			if (!font_name)
				font_name = "history";
			font = get_font(font_name);
			sz = font.size * 1.1
			if (info_sz[c])
				sz += info_sz[c]
			if (y < sz)
				y = sz;
			yb[align] = sz
		}
		ya.l += y - yb.l;
		ya.c += y - yb.c;
		ya.r += y - yb.r
		while (1) {
			c = p[i++]
			if (c == '\n')
				break
			align = p[i++]
			if (info_val[c].length == 0)
				continue
			str = info_val[c].shift()
			if (align == '+') {
				info_nb[c]--;
				c = p[i++];
				align = p[i++]
				if (info_val[c].length > 0) {
					if (str)
						str += ' ' + info_val[c].shift()
					else
						str = ' ' + info_val[c].shift()
				}
			}
			font_name = info_font[c]
			if (!font_name)
				font_name = "history";
			font = get_font(font_name);
			sz = font.size * 1.1
			if (info_sz[c])
				sz += info_sz[c];
			set_font(font_name);
			x = xa[align];
			y = ya[align] + sz

			if (c == 'Q') {			/* special case for tempo */
				if (!glovar.tempo.del) {
					if (align != 'l') {
						var w = tempo_width(glovar.tempo)

						if (align == 'c')
							w *= .5;
						x -= w
					}
					write_tempo(glovar.tempo, x, -y)
				}
			} else if (str) {
				xy_str(x, -y, str, align)
			}

			if (c == 'T') {
				font_name = info_font.T = "subtitle";
				info_sz.T = cfmt.subtitlespace
			}
			if (info_nb[c] <= 1) {
				if (c == 'T') {
					font = get_font(font_name);
					sz = font.size * 1.1
					if (info_sz[c])
						sz += info_sz[c];
					set_font(font_name)
				}
				while (info_val[c].length > 0) {
					y += sz;
					str = info_val[c].shift();
					xy_str(x, -y, str, align)
				}
			}
			info_nb[c]--;
			ya[align] = y
		}
		if (ya.c > ya.l)
			ya.l = ya.c
		if (ya.r > ya.l)
			ya.l = ya.r
		if (i >= fmt.length)
			break
		ya.c = ya.r = ya.l
	}
	vskip(ya.l)
}

/* -- output the tune heading -- */
function write_heading() {
	var	i, j, area, composer, origin, rhythm, down1, down2,
		lwidth = get_lwidth()

	blk_out();
	vskip(cfmt.topspace)

	if (cfmt.titleformat) {
		write_headform(lwidth);
		vskip(cfmt.musicspace)
		return
	}

	/* titles */
	if (info.T
	 && cfmt.writefields.indexOf('T') >= 0) {
		i = 0
		while (1) {
			j = info.T.indexOf("\n", i)
			if (j < 0) {
				write_title(info.T.substring(i), i != 0)
				break
			}
			write_title(info.T.slice(i, j), i != 0);
			i = j + 1
		}
	}

	/* rhythm, composer, origin */
	set_font("composer");
//	down1 = cfmt.composerspace + gene.curfont.size
	down1 = down2 = 0
	if (parse.ckey.k_bagpipe
	 && !cfmt.infoline
	 && cfmt.writefields.indexOf('R') >= 0)
		rhythm = info.R
	if (rhythm) {
		xy_str(0, -cfmt.composerspace, rhythm);
		down1 = cfmt.composerspace
	}
	area = info.A
	if (cfmt.writefields.indexOf('C') >= 0)
		composer = info.C
	if (cfmt.writefields.indexOf('O') >= 0)
		origin = info.O
	if (composer || origin || cfmt.infoline) {
		var xcomp, align;

		vskip(cfmt.composerspace)
		if (cfmt.aligncomposer < 0) {
			xcomp = 0;
			align = ' '
		} else if (cfmt.aligncomposer == 0) {
			xcomp = lwidth * .5;
			align = 'c'
		} else {
			xcomp = lwidth;
			align = 'r'
		}
		down2 = down1
		if (composer || origin) {
			if (cfmt.aligncomposer >= 0
			 && down1 != down2)
				vskip(down1 - down2);
			i = 0
			while (1) {
				vskip(gene.curfont.size)
				if (composer)
					j = composer.indexOf("\n", i)
				else
					j = -1
				if (j < 0) {
					put_inf2r(xcomp, 0,
						composer ? composer.substring(i) : null,
						origin,
						align)
					break
				}
				xy_str(xcomp, 0, composer.slice(i, j), align);
				down1 += gene.curfont.size;
				i = j + 1
			}
			if (down2 > down1)
				vskip(down2 - down1)
		}

		rhythm = rhythm ? null : info.R
		if ((rhythm || area) && cfmt.infoline) {

			/* if only one of rhythm or area then do not use ()'s
			 * otherwise output 'rhythm (area)' */
			set_font("info");
			vskip(gene.curfont.size + cfmt.infospace);
			put_inf2r(lwidth, 0, rhythm, area, 'r');
			down1 += gene.curfont.size + cfmt.infospace
		}
//		down2 = 0
	} else {
		down2 = cfmt.composerspace
	}

	/* parts */
	if (info.P
	 && cfmt.writefields.indexOf('P') >= 0) {
		set_font("parts");
		down1 = cfmt.partsspace + gene.curfont.size - down1
		if (down1 > 0)
			down2 += down1
		if (down2 > .01)
			vskip(down2);
		xy_str(0, 0, info.P);
		down2 = 0
	}
	vskip(down2 + cfmt.musicspace)
}
// abc2svg - svg.js - svg functions
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

var	output = [],		// output buffer
	style = '\n.fill {fill: currentColor}\
\n.stroke {stroke: currentColor; fill: none}\
\n.music text, .music tspan {fill:currentColor}',
	font_style = '',
	posx = cfmt.leftmargin / cfmt.scale,	// default x offset of the images
	posy = 0,		// y offset in the block
	img = {			// image
		width: cfmt.pagewidth,	// width
		lm: cfmt.leftmargin,	// left and right margins
		rm: cfmt.rightmargin
//		chg: false
	},
	defined_glyph = {},
	defs = '',
	fulldefs = '',		// unreferenced defs as <filter>
	stv_g = {		/* staff/voice graphic parameters */
		scale: 1,
		dy: 0,
		st: -1,
		v: 0,
		g: 0
//		color: undefined
	},
	block = {}		/* started & newpage */

// glyphs in music font
var tgls = {
  sgno: {x: -6, y:4, c:"\ue047"},
  coda: {x:-12, y:6, c:"\ue048"},
  tclef: {x:-8, y:0, c:"\ue050"},
  cclef: {x:-8, y:0, c:"\ue05c"},
  bclef: {x:-8, y:0, c:"\ue062"},
  pclef: {x:-6, y:0, c:"\ue069"},
  stclef: {x:-8, y:0, c:"\ue07a"},
  scclef: {x:-8, y:0, c:"\ue07b"},
  sbclef: {x:-7, y:0, c:"\ue07c"},
  csig: {x:0, y:0, c:"\ue08a"},
  ctsig: {x:0, y:0, c:"\ue08b"},
  HDD: {x:-7, y:0, c:"\ue0a0"},
  breve: {x:-6, y:0, c:"\ue0a1"},
  HD: {x:-5.2, y:0, c:"\ue0a2"},
  Hd: {x:-3.8, y:0, c:"\ue0a3"},
  hd: {x:-3.7, y:0, c:"\ue0a4"},
  srep: {x:-5, y:0, c:"\ue101"},
  dot: {x:-2, y:0, c:"\ue1e7"},
 "acc-1": {x:-3, y:0, c:"\ue260"},
  acc3: {x:-2, y:0, c:"\ue261"},
  acc1: {x:-3, y:0, c:"\ue262"},
  acc2: {x:-3, y:0, c:"\ue263"},
  pshhd: {x:-3, y:0, c:"\ue263"},
 "acc-2": {x:-3, y:0, c:"\ue264"},
  accent: {x:-3, y:0, c:"\ue4a0"},
  marcato: {x:-3, y:0, c:"\ue4ac"},
  hld: {x:-7, y:0, c:"\ue4c0"},
  r00: {x:-1.5, y:0, c:"\ue4e1"},
  r0: {x:-1.5, y:0, c:"\ue4e2"},
  r1: {x:-3.5, y:6, c:"\ue4e3"},
  r2: {x:-3.2, y:0, c:"\ue4e4"},
  r4: {x:-3, y:0, c:"\ue4e5"},
  r8: {x:-3, y:0, c:"\ue4e6"},
  r16: {x:-4, y:0, c:"\ue4e7"},
  r32: {x:-4, y:0, c:"\ue4e8"},
  r64: {x:-4, y:0, c:"\ue4e9"},
  r128: {x:-4, y:0, c:"\ue4ea"},
  mrest: {x:-10, y:0, c:"\ue4ee"},
  mrep: {x:-6, y:0, c:"\ue500"},
  mrep2: {x:-9, y:0, c:"\ue501"},
  turn: {x:-5, y:4, c:"\ue567"},
  umrd: {x:-7, y:2, c:"\ue56c"},
  lmrd: {x:-7, y:2, c:"\ue56d"},
  ped: {x:-10, y:0, c:"\ue650"},
  pedoff: {x:-5, y:0, c:"\ue655"},
  longa: {x:-6, y:0, c:"\ue95c"}
}

// glyphs to put in <defs>
var glyphs = {
  brace: '<text id="brace">\ue000</text>',
  ghd: '<g id="ghd" transform="translate(4.5,0) scale(0.66)">\n\
	<text x="-3.7">\ue0a4</text>\n\
</g>',
  acc1_1_4: '<g id="acc1_1_4">\n\
	<path d="m0 7.8v-15.4" class="stroke"/>\n\
	<path class="fill" d="M-1.8 2.7l3.6 -1.1v2.2l-3.6 1.1v-2.2z\n\
		M-1.8 -3.7l3.6 -1.1v2.2l-3.6 1.1v-2.2"/>\n\
</g>',
  acc1_3_4: '<g id="acc1_3_4">\n\
	<path d="m-2.5 8.7v-15.4M0 7.8v-15.4M2.5 6.9v-15.4" class="stroke"/>\n\
	<path class="fill" d="m-3.7 3.1l7.4 -2.2v2.2l-7.4 2.2v-2.2z\n\
		M-3.7 -3.2l7.4 -2.2v2.2l-7.4 2.2v-2.2"/>\n\
</g>',
 "acc-1_1_4": '<g id="acc-1_1_4" transform="scale(-1,1)">\n\
	<text x="-3">\ue260</text>\n\
</g>',
 "acc-1_3_4": '<g id="acc-1_3_4">\n\
    <path class="fill" d="m0.6 -2.7\n\
	c-5.7 -3.1 -5.7 3.6 0 6.7c-3.9 -4 -4 -7.6 0 -5.8\n\
	M1 -2.7c5.7 -3.1 5.7 3.6 0 6.7c3.9 -4 4 -7.6 0 -5.8"/>\n\
    <path d="m1.6 3.5v-13M0 3.5v-13" class="stroke" stroke-width=".6"/>\n\
</g>',
  turnx: '<g id="turnx">\n\
	<text x="-5" y="-4">\ue567</text>\n\
	<path class="stroke" d="m0 -1.5v-9"/>\n\
</g>',
  pfthd: '<g id="pfthd">\n\
	<text x="-3">\ue263</text>\n\
	<circle r="4" class="stroke"/>\n\
</g>',
  pmsig: '<path id="pmsig" class="stroke" stroke-width="0.8"\n\
	d="m0 -7a5 5 0 0 1 0 -10a5 5 0 0 1 0 10"/>',
  pMsig: '<g id="pMsig">\n\
	<use xlink:href="#pmsig"/>\n\
	<path class="fill" d="m0 -10a2 2 0 0 1 0 -4a2 2 0 0 1 0 4"/>\n\
</g>',
  imsig: '<path id="imsig" class="stroke" stroke-width="0.8"\n\
	d="m3 -8a5 5 0 1 1 0 -8"/>',
  iMsig: '<g id="iMsig">\n\
	<use xlink:href="#imsig"/>\n\
	<path class="fill" d="m0 -10a2 2 0 0 1 0 -4a2 2 0 0 1 0 4"/>\n\
</g>',
  hl: '<path id="hl" class="stroke" stroke-width="1" d="m-6 0h12"/>',
  hl1: '<path id="hl1" class="stroke" stroke-width="1" d="m-7 0h14"/>',
  hl2: '<path id="hl2" class="stroke" stroke-width="1" d="m-9 0h18"/>',
  ghl: '<path id="ghl" class="stroke" d="m-3.5 0h7"/>',
  rdots: '<g id="rdots" class="fill">\n\
	<circle cx="0" cy="-9" r="1.2"/>\n\
	<circle cx="0" cy="-15" r="1.2"/>\n\
</g>',
  grm: '<path id="grm" class="fill" d="m-5 -2.5\n\
	c5 -8.5 5.5 4.5 10 -2\n\
	-5 8.5 -5.5 -4.5 -10 2"/>',
  stc: '<circle id="stc" class="fill" cx="0" cy="-3" r="1.2"/>',
  sld: '<path id="sld" class="fill" d="m-7.2 4.8\n\
	c1.8 .7 4.5 -.2 7.2 -4.8\n\
	-2.1 5 -5.4 6.8 -7.6 6"/>',
  emb: '<path id="emb" class="stroke" stroke-width="1.2" stroke-linecap="round"\n\
	d="m-2.5 -3h5"/>',
  brth: '<text id="brth" y="-6" \
style="font-family:serif; font-weight:bold; font-style:italic; font-size:30px">,</text>',
  roll: '<path id="roll" class="fill" d="m-6 0\n\
	c0.4 -7.3 11.3 -7.3 11.7 0\n\
	-1.3 -6 -10.4 -6 -11.7 0"/>',
  upb: '<path id="upb" class="stroke" d="m-2.6 -9.4\n\
	l2.6 8.8\n\
	l2.6 -8.8"/>',
  dnb: '<g id="dnb">\n\
	<path d="M-3.2 -2v-7.2m6.4 0v7.2" class="stroke"/>\n\
	<path d="M-3.2 -6.8v-2.4l6.4 0v2.4" class="fill"/>\n\
</g>',
  dplus: '<path id="dplus" class="stroke" stroke-width="1.7"\n\
	d="m0 -.5v-6m-3 3h6"/>',
  lphr: '<path id="lphr" class="stroke" stroke-width="1.2"\n\
	d="m0 0v18"/>',
  mphr: '<path id="mphr" class="stroke" stroke-width="1.2"\n\
	d="m0 0v12"/>',
  sphr: '<path id="sphr" class="stroke" stroke-width="1.2"\n\
	d="m0 0v6"/>',
  sfz: '<text id="sfz" x="-5" y="-7" \
style="font-family:serif; font-style:italic; font-size:14px">\n\
	s<tspan font-size="16" font-weight="bold">f</tspan>z</text>',
  trl: '<text id="trl" x="-2" y="-4"\n\
	style="font-family:serif; font-weight:bold; \
font-style:italic; font-size:16px">tr</text>',
  opend: '<circle id="opend" class="stroke"\n\
	cx="0" cy="-3" r="2.5"/>',
  snap: '<path id="snap" class="stroke" d="m-3 -6\n\
	c0 -5 6 -5 6 0\n\
	0 5 -6 5 -6 0\n\
	M0 -5v6"/>',
  thumb: '<path id="thumb" class="stroke" d="m-2.5 -7\n\
	c0 -6 5 -6 5 0\n\
	0 6 -5 6 -5 0\n\
	M-2.5 -9v4"/>',
  wedge: '<path id="wedge" class="fill" d="m0 -1l-1.5 -5h3l-1.5 5"/>',
  ltr: '<path id="ltr" class="fill"\n\
	d="m0 -.4c2 -1.5 3.4 -1.9 3.9 .4\n\
	0.2 .8 .7 .7 2.1 -.4\n\
	v0.8c-2 1.5 -3.4 1.9 -3.9 -.4\n\
	-.2 -.8 -.7 -.7 -2.1 .4z"/>',
  custos: '<g id="custos">\n\
	<path class="fill" d="m-4 0l2 2.5 2 -2.5 2 2.5 2 -2.5\n\
		-2 -2.5 -2 2.5 -2 -2.5 -2 2.5"/>\n\
	<path class="stroke" d="m3.5 0l5 -7"/>\n\
</g>',
  oct: '<text id="oct" style="font-family:serif; font-size:12px">8</text>'
}

// mark a glyph as used and add it in <defs>
function def_use(gl) {
	var	i, j, g

	if (defined_glyph[gl])
		return
	defined_glyph[gl] = true;
	g = glyphs[gl]
	if (!g) {
//throw new Error("unknown glyph: " + gl)
		error(1, null, "Unknown glyph: '$1'", gl)
		return	// fixme: the xlink is set
	}
	j = 0
	while (1) {
		i = g.indexOf('xlink:href="#', j)
		if (i < 0)
			break
		i += 13;
		j = g.indexOf('"', i);
		def_use(g.slice(i, j))
	}
	defs += '\n' + g
}

// add user defs from %%beginsvg
function defs_add(text) {
	var	i, j, gl, tag, is,
		ie = 0

	// remove XML comments
	text = text.replace(/<!--.*?-->/g, '')

	while (1) {
		is = text.indexOf('<', ie);
		if (is < 0)
			break
		i = text.indexOf('id="', is)
		if (i < 0)
			break
		i += 4;
		j = text.indexOf('"', i);
		if (j < 0)
			break
		gl = text.slice(i, j);
		ie = text.indexOf('>', j);
		if (ie < 0)
			break
		if (text[ie - 1] == '/') {
			ie++
		} else {
			i = text.indexOf(' ', is);
			if (i < 0)
				break
			tag = text.slice(is + 1, i);
			ie = text.indexOf('</' + tag + '>', ie)
			if (ie < 0)
				break
			ie += 3 + tag.length
		}
		if (text.substr(is, 7) == '<filter')
			fulldefs += '\n' + text.slice(is, ie)
		else
			glyphs[gl] = text.slice(is, ie)
	}
}

// output the stop/start of a graphic sequence
function set_g() {

	// close the previous sequence
	if (stv_g.started) {
		stv_g.started = false;
		output.push("</g>\n")
	}

	// check if new sequence needed
	if (stv_g.scale == 1 && !stv_g.color)
		return

	// open the new sequence
	output.push('<g ')
	if (stv_g.scale != 1) {
		if (stv_g.st >= 0)
			output.push(staff_tb[stv_g.st].scale_str)
		else
			output.push(voice_tb[stv_g.v].scale_str)
	}
	if (stv_g.color) {
		if (stv_g.scale != 1)
			output.push(' ');
		output.push('style="color:' + stv_g.color + '"')
	}
	output.push(">\n");
	stv_g.started = true
}

/* set the color */
function set_color(color) {
	if (color == stv_g.color)
		return null
	var	old_color = stv_g.color;
	stv_g.color = color;
	set_g()
	return old_color
}

/* -- set the staff scale (only) -- */
function set_sscale(st) {
	var	new_scale, dy

	if (st != stv_g.st && stv_g.scale != 1)
		stv_g.scale = 0;
	new_scale = st >= 0 ? staff_tb[st].staffscale : 1
	if (st >= 0 && new_scale != 1)
		dy = staff_tb[st].y
	else
		dy = posy
	if (new_scale == stv_g.scale && dy == stv_g.dy)
		return
	stv_g.scale = new_scale;
	stv_g.dy = dy;
	stv_g.st = st;
	set_g()
}

/* -- set the voice or staff scale -- */
function set_scale(s) {
	var	new_scale = s.p_v.scale

	if (new_scale == 1) {
		set_sscale(s.st)
		return
	}
/*fixme: KO when both staff and voice are scaled */
	if (new_scale == stv_g.scale && stv_g.dy == posy)
		return
	stv_g.scale = new_scale;
	stv_g.dy = posy;
	stv_g.st = -1;
	stv_g.v = s.v;
	set_g()
}

// -- set the staff output buffer and scale when delayed output
function set_dscale(st, no_scale) {
	if (st < 0) {
		stv_g.scale = 1;
		output = staff_tb[0].output
	} else {
		stv_g.scale = no_scale ? 1 : staff_tb[st].staffscale;
		output = stv_g.scale == 1 ? staff_tb[st].output :
					staff_tb[st].sc_out
	}
	stv_g.st = st;
	stv_g.dy = 0
}

// update the y offsets of delayed output
function delayed_update() {
	var st, new_out, text

//	stv_g.delayed = false
	for (st = 0; st <= nstaff; st++) {
		if (staff_tb[st].sc_out.length != 0) {
			output.push('<g transform="translate(0,' +
					(posy - staff_tb[st].y).toFixed(2) +
					') scale(' +
					 staff_tb[st].staffscale.toFixed(2) +
					')">\n');
			output.push(staff_tb[st].sc_out.join(''));
			output.push('</g>\n');
			staff_tb[st].sc_out = []
		}
		if (staff_tb[st].output.length == 0)
			continue
		output.push('<g transform="translate(0,' +
				(-staff_tb[st].y).toFixed(2) +
				')">\n')
		output.push(staff_tb[st].output.join(''));
		output.push('</g>\n');
		staff_tb[st].output = []
	}
}

// output the annotations
// !! tied to the symbol types in abc2svg.js !!
var anno_type = ['bar', 'clef', 'custos', '', 'grace',
		'key', 'meter', 'Zrest', 'note', 'part',
		'rest', 'yspace', 'staves', 'Break', 'tempo',
		'', 'block', 'remark']

function anno_out(s, t, f) {
	if (s.istart == undefined)
		return
	var	type = s.type,
		h = s.ymx - s.ymn + 4,
		wl = s.wl || 2,
		wr = s.wr || 2

	if (s.grace)
		type = GRACE

	f(t || anno_type[type], s.istart, s.iend,
		s.x - wl - 2, staff_tb[s.st].y + s.ymn + h - 2,
		wl + wr + 4, h, s);
}

function a_start(s, t) {
	anno_out(s, t, user.anno_start)
}
function a_stop(s, t) {
	anno_out(s, t, user.anno_stop)
}
function empty_function() {
}
var	anno_start = user.anno_start ? a_start : empty_function,
	anno_stop = user.anno_stop ? a_stop : empty_function

// output a string with x, y, a and b
// In the string,
//	X and Y are replaced by scaled x and y
//	A and B are replaced by a and b as string
//	F and G are replaced by a and b as float
function out_XYAB(str, x, y, a, b) {
	x = sx(x);
	y = sy(y);
	output.push(str.replace(/X|Y|A|B|F|G/g, function(c) {
		switch (c) {
		case 'X': return x.toFixed(2)
		case 'Y': return y.toFixed(2)
		case 'A': return a
		case 'B': return b
		case 'F': return a.toFixed(2)
//		case 'G':
		default: return b.toFixed(2)
		}
		}))
}

// open / close containers
function g_open(x, y, rot, sx, sy) {
	out_XYAB('<g transform="translate(X,Y', x, y);
	if (rot)
		output.push(') rotate(' + rot.toFixed(2))
	if (sx) {
		if (sy)
			output.push(') scale(' + sx.toFixed(2) +
						', ' + sy.toFixed(2))
		else
			output.push(') scale(' + sx.toFixed(2));
	}
	output.push(')">\n');
	stv_g.g++
}
function g_close() {
	stv_g.g--;
	output.push('</g>\n')
}

// external SVG string
function out_svg(str) {
	output.push(str)
}
Abc.prototype.out_svg = out_svg

// exported functions for the annotation
function sx(x) {
	if (stv_g.g)
		return x
	return (x + posx) / stv_g.scale
}
Abc.prototype.sx = sx
function sy(y) {
	if (stv_g.g)
		return y
	if (stv_g.scale == 1)
		return posy - y
	if (stv_g.st < 0)
		return (posy - y) / stv_g.scale	// voice scale
	return stv_g.dy - y			// staff scale
}
Abc.prototype.sy = sy;
Abc.prototype.sh = function(h) {
	if (stv_g.st < 0)
		return h / stv_g.scale
	return h
}
// for absolute X,Y coordinates
Abc.prototype.ax = function(x) { return x + posx }
Abc.prototype.ay = function(y) {
	if (stv_g.st < 0)
		return posy - y
	return posy + (stv_g.dy - y) * stv_g.scale - stv_g.dy
}
Abc.prototype.ah = function(h) {
	if (stv_g.st < 0)
		return h
	return h * stv_g.scale
}
// output scaled (x + <sep> + y)
function out_sxsy(x, sep, y) {
	x = sx(x);
	y = sy(y);
	output.push(x.toFixed(2) + sep + y.toFixed(2))
}
Abc.prototype.out_sxsy = out_sxsy

// define the start of a path
function xypath(x, y, fill) {
	out_XYAB('<path class="A" d="mX Y\n', x, y, fill ? "fill" : "stroke")
}
Abc.prototype.xypath = xypath

// output a glyph
function xygl(x, y, gl) {
// (avoid ps<->js loop)
//	if (psxygl(x, y, gl))
//		return
	var 	tgl = tgls[gl]
	if (tgl && !glyphs[gl]) {
		out_XYAB('<text x="X" y="Y">A</text>\n',
			x + tgl.x * stv_g.scale, y + tgl.y, tgl.c)
		return
	}
	if (!glyphs[gl]) {
		error(1, null, 'no definition of $1', gl)
		return
	}
	def_use(gl);
	out_XYAB('<use x="X" y="Y" xlink:href="#A"/>\n', x, y, gl)
}
// - specific functions -
// gua gda (acciaccatura)
function out_acciac(x, y, dx, dy, up) {
	if (up) {
		x -= 1;
		y += 4
	} else {
		x -= 5;
		y -= 4
	}
	out_XYAB('<path class="stroke" d="mX YlF G"/>\n',
		x, y, dx, -dy)
}
// simple /dotted measure bar
function out_bar(x, y, h, dotted) {
	output.push('<path class="stroke" stroke-width="1" ' +
		(dotted ? 'stroke-dasharray="5,5" ' : '') +
		'd="m' + (x + posx).toFixed(2) +
		' ' + (posy - y).toFixed(2) + 'v' + (-h).toFixed(2) +
		'"/>\n')
}
// tuplet value - the staves are not defined
function out_bnum(x, y, str) {
	out_XYAB('<text style="font-family:serif; font-style:italic; font-size:12px"\n\
	x="X" y="Y" text-anchor="middle">A</text>\n',
		x, y, str.toString())
}
// staff system brace
function out_brace(x, y, h) {
	def_use("brace");
//fixme: '-6' depends on the scale
	x += posx - 6;
	y = posy - y;
	h /= 24;
	output.push('<use transform="translate(' +
				x.toFixed(2) + ',' + y.toFixed(2) +
			') scale(2.5,' + h.toFixed(2) +
			')" xlink:href="#brace"/>\n')
}

// staff system bracket
function out_bracket(x, y, h) {
	x += posx - 5;
	y = posy - y - 3;
	h += 2;
	output.push('<path class="fill"\n\
	d="m' + x.toFixed(2) + ' ' + y.toFixed(2) + '\n\
	c10.5 1 12 -4.5 12 -3.5c0 1 -3.5 5.5 -8.5 5.5\n\
	v' + h.toFixed(2) + '\n\
	c5 0 8.5 4.5 8.5 5.5c0 1 -1.5 -4.5 -12 -3.5"/>\n')
}
// hyphen
function out_hyph(x, y, w) {
	var	n, a_y,
		d = 25 + ((w / 20) | 0) * 3

	if (w > 15.)
		n = ((w - 15) / d) | 0
	else
		n = 0;
	x += (w - d * n - 5) / 2;
	out_XYAB('<path class="stroke" stroke-width="1.2"\n\
	stroke-dasharray="5,F"\n\
	d="mX YhG"/>\n',
		x, y + 3,		// set the line a bit upper
		Math.round((d - 5) / stv_g.scale), d * n + 5)
}
// stem [and flags]
// fixme: h is already scaled - change that?
function out_stem(x, y, h, grace,
		  nflags, straight) {	// optional
//fixme: dx KO with half note or longa
	var	dx = grace ? GSTEM_XOFF : 3.5,
		slen = -h

	if (h < 0)
		dx = -dx;		// down
	x += dx * stv_g.scale
	if (stv_g.st < 0)
		slen /= stv_g.scale;
	out_XYAB('<path class="stroke" d="mX YvF"/>\n',	// stem
		x, y, slen)
	if (!nflags)
		return

	output.push('<path class="fill"\n\
	d="');
	y += h
	if (h > 0) {				// up
		if (!straight) {
			if (!grace) {
				if (nflags == 1) {
					out_XYAB('MX Yc0.6 5.6 9.6 9 5.6 18.4\n\
	1.6 -6 -1.3 -11.6 -5.6 -12.8\n', x, y)
				} else {
					while (--nflags >= 0) {
						out_XYAB('MX Yc0.9 3.7 9.1 6.4 6 12.4\n\
	1 -5.4 -4.2 -8.4 -6 -8.4\n', x, y);
						y -= 5.4
					}
				}
			} else {		// grace
				if (nflags == 1) {
					out_XYAB('MX Yc0.6 3.4 5.6 3.8 3 10\n\
	1.2 -4.4 -1.4 -7 -3 -7\n', x, y)
				} else {
					while (--nflags >= 0) {
						out_XYAB('MX Yc1 3.2 5.6 2.8 3.2 8\n\
	1.4 -4.8 -2.4 -5.4 -3.2 -5.2\n', x, y);
						y -= 3.5
					}
				}
			}
		} else {			// straight
			if (!grace) {
//fixme: check endpoints
				y += 1
				while (--nflags >= 0) {
					out_XYAB('MX Yl7 3.2 0 3.2 -7 -3.2z\n',
						x, y);
					y -= 5.4
				}
			} else {		// grace
				while (--nflags >= 0) {
					out_XYAB('MX Yl3 1.5 0 2 -3 -1.5z\n',
						x, y);
					y -= 3
				}
			}
		}
	} else {				// down
		if (!straight) {
			if (!grace) {
				if (nflags == 1) {
					out_XYAB('MX Yc0.6 -5.6 9.6 -9 5.6 -18.4\n\
	1.6 6 -1.3 11.6 -5.6 12.8\n', x, y)
				} else {
					while (--nflags >= 0) {
						out_XYAB('MX Yc0.9 -3.7 9.1 -6.4 6 -12.4\n\
	1 5.4 -4.2 8.4 -6 8.4\n', x, y);
						y += 5.4
					}
				}
			} else {		// grace
				if (nflags == 1) {
					out_XYAB('MX Yc0.6 -3.4 5.6 -3.8 3 -10\n\
	1.2 4.4 -1.4 7 -3 7\n', x, y)
				} else {
					while (--nflags >= 0) {
						out_XYAB('MX Yc1 -3.2 5.6 -2.8 3.2 -8\n\
	1.4 4.8 -2.4 5.4 -3.2 5.2\n', x, y);
						y += 3.5
					}
				}
			}
		} else {			// straight
			if (!grace) {
//fixme: check endpoints
				y += 1
				while (--nflags >= 0) {
					out_XYAB('MX Yl7 -3.2 0 -3.2 -7 3.2z\n',
						x, y);
					y += 5.4
				}
//			} else {		// grace
//--fixme: error?
			}
		}
	}
	output.push('"/>\n')
}
// thick measure bar
function out_thbar(x, y, h) {
	x += posx + 1.5;
	y = posy - y;
	output.push('<path class="stroke" stroke-width="3" d="m' +
		x.toFixed(2) + ' ' + y.toFixed(2) +
		'v' + (-h).toFixed(2) + '"/>\n')
}
// tremolo
function out_trem(x, y, ntrem) {
	out_XYAB('<path class="fill" d="mX Y\n\t', x - 4.5, y)
	while (1) {
		output.push('l9 -3v3l-9 3z');
		if (--ntrem <= 0)
			break
		output.push('m0 5.4')
	}
	output.push('"/>\n')
}
// tuplet bracket - the staves are not defined
function out_tubr(x, y, dx, dy, up) {
	var	h = up ? -3 : 3;

	y += h;
	dx /= stv_g.scale;
	output.push('<path class="stroke" d="m');
	out_sxsy(x, ' ', y);
	output.push('v' + h.toFixed(2) +
		'l' + dx.toFixed(2) + ' ' + (-dy).toFixed(2) +
		'v' + (-h).toFixed(2) + '"/>\n')
}
// tuplet bracket with number - the staves are not defined
function out_tubrn(x, y, dx, dy, up, str) {
    var	sw = str.length * 10,
	h = up ? -3 : 3;

	dx /= stv_g.scale;
	out_XYAB('<text style="font-family:serif; font-style:italic; font-size:12px"\n\
	x="X" y="Y" text-anchor="middle">A</text>\n',
		x + dx / 2, y + dy / 2, str);

	if (!up)
		y += 6;
	output.push('<path class="stroke" d="m');
	out_sxsy(x, ' ', y);
	output.push('v' + h.toFixed(2) +
		'm' + dx.toFixed(2) + ' ' + (-dy).toFixed(2) +
		'v' + (-h).toFixed(2) + '"/>\n')
	output.push('<path class="stroke" stroke-dasharray="' +
		((dx - sw) / 2).toFixed(2) + ' ' + sw.toFixed(2) +
		'" d="m');
	out_sxsy(x, ' ', y - h);
	output.push('l' + dx.toFixed(2) + ' ' + (-dy).toFixed(2) + '"/>\n')

}
// underscore line
function out_wln(x, y, w) {
	out_XYAB('<path class="stroke" stroke-width="0.8" d="mX YhF"/>\n',
		x, y, w)
}

// decorations with string
var deco_str_style = {
crdc:	{
		dx: 0,
		dy: 5,
		style: 'font-family:serif; font-style:italic; font-size:14px'
	},
dacs:	{
		dx: 0,
		dy: 3,
		style: 'font-family:serif; font-size:16px',
		anchor: ' text-anchor="middle"'
	},
fng:	{
		dx: 0,
		dy: 1,
		style: 'font-family:Bookman; font-size:8px',
		anchor: ' text-anchor="middle"'
	},
pf:	{
		dx: 0,
		dy: 5,
		style: 'font-family:serif; font-weight:bold; font-style:italic; font-size:16px'
	},
'@':	{
		dx: 0,
		dy: 5,
		style: 'font-family:sans-serif; font-size:12px'
	}
}

function out_deco_str(x, y, name, str) {
	var	a, f,
		a_deco = deco_str_style[name]

	if (!a_deco) {
		xygl(x, y, name)
		return
	}
	x += a_deco.dx;
	y += a_deco.dy;
	if (!a_deco.def) {
		style += "\n." + name + " {" + a_deco.style + "}";
		a_deco.def = true
	}
	out_XYAB('<text x="X" y="Y" class="A"B>', x, y,
		name, a_deco.anchor || "");
	set_font("annotation");
	out_str(str);
	output.push('</text>\n')
}

function out_arp(x, y, val) {
	g_open(x, y, 270);
	x = 0;
	y = -4;
	val = Math.ceil(val / 6)
	while (--val >= 0) {
		xygl(x, y, "ltr");
		x += 6
	}
	g_close()
}
function out_cresc(x, y, val, defl) {
	x += val;
	val = -val;
	out_XYAB('<path class="stroke"\n\
	d="mX YlA ', x, y + 5, val)
	if (defl.nost)
		output.push('-2.2m0 -3.6l' + (-val).toFixed(2) + ' -2.2"/>\n')
	else
		output.push('-4l' + (-val).toFixed(2) + ' -4"/>\n')

}
function out_dim(x, y, val, defl) {
	out_XYAB('<path class="stroke"\n\
	d="mX YlA ', x, y + 5, val)
	if (defl.noen)
		output.push('-2.2m0 -3.6l' + (-val).toFixed(2) + ' -2.2"/>\n')
	else
		output.push('-4l' + (-val).toFixed(2) + ' -4"/>\n')
}
function out_ltr(x, y, val) {
	y += 4;
	val = Math.ceil(val / 6)
	while (--val >= 0) {
		xygl(x, y, "ltr");
		x += 6
	}
}
function out_8va(x, y, val, defl) {
	if (!defl.nost) {
		out_XYAB('<text x="X" y="Y" \
style="font-family:serif; font-weight:bold; font-style:italic; font-size:12px">8\
<tspan dy="-4" style="font-size:10px">va</tspan></text>\n',
			x - 8, y);
		x += 12;
		val -= 12
	} else {
		val -= 5
	}
	y += 6;
	out_XYAB('<path class="stroke" stroke-dasharray="6,6" d="mX YhA"/>\n',
		x, y, val)
	if (!defl.noen)
		out_XYAB('<path class="stroke" d="mX Yv6"/>\n', x + val, y)
}
function out_8vb(x, y, val, defl) {
	if (!defl.nost) {
		out_XYAB('<text x="X" y="Y" \
style="font-family:serif; font-weight:bold; font-style:italic; font-size:12px">8\
<tspan dy="-4" style="font-size:10px">vb</tspan></text>\n',
			x - 8, y);
		x += 4;
		val -= 4
	} else {
		val -= 5
	}
//	y -= 2;
	out_XYAB('<path class="stroke" stroke-dasharray="6,6" d="mX YhA"/>\n',
		x, y, val)
	if (!defl.noen)
		out_XYAB('<path class="stroke" d="mX Yv-6"/>\n', x + val, y)
}
function out_15ma(x, y, val, defl) {
	if (!defl.nost) {
		out_XYAB('<text x="X" y="Y" \
style="font-family:serif; font-weight:bold; font-style:italic; font-size:12px">15\
<tspan dy="-4" style="font-size:10px">ma</tspan></text>\n',
			x - 10, y);
		x += 20;
		val -= 20
	} else {
		val -= 5
	}
	y += 6;
	out_XYAB('<path class="stroke" stroke-dasharray="6,6" d="mX YhA"/>\n',
		x, y, val)
	if (!defl.noen)
		out_XYAB('<path class="stroke" d="mX Yv6"/>\n', x + val, y)
}
function out_15mb(x, y, val, defl) {
	if (!defl.nost) {
		out_XYAB('<text x="X" y="Y" \
style="font-family:serif; font-weight:bold; font-style:italic; font-size:12px">15\
<tspan dy="-4" style="font-size:10px">mb</tspan></text>\n',
			x - 10, y);
		x += 7;
		val -= 7
	} else {
		val -= 5
	}
//	y -= 2;
	out_XYAB('<path class="stroke" stroke-dasharray="6,6" d="mX YhA"/>\n',
		x, y, val)
	if (!defl.noen)
		out_XYAB('<path class="stroke" d="mX Yv-6"/>\n', x + val, y)
}
var deco_val_tb = {
	arp:	out_arp,
	cresc:	out_cresc,
	dim:	out_dim,
	ltr:	out_ltr,
	"8va":	out_8va,
	"8vb":	out_8vb,
	"15ma":	out_15ma,
	"15mb": out_15mb
}

function out_deco_val(x, y, name, val, defl) {
	if (deco_val_tb[name])
		deco_val_tb[name](x, y, val, defl)
	else
		error(1, null, "No function for decoration '$1'", name)
}

function out_glisq(x2, y2, de) {
	var	de1 = de.start,
		x1 = de1.x,
		y1 = de1.y + staff_tb[de1.st].y,
		ar = -Math.atan2(y2 - y1, x2 - x1),
		a = ar / Math.PI * 180,
		len = (x2 - x1) / Math.cos(ar);

	g_open(x1, y1, a);
	x1 = de1.s.dots ? 13 + de1.s.xmx : 8;
	len = (len - x1 - 6) / 6 | 0
	if (len < 1)
		len = 1
	while (--len >= 0) {
		xygl(x1, 0, "ltr");
		x1 += 6
	}
	g_close()
}

function out_gliss(x2, y2, de) {
	var	de1 = de.start,
		x1 = de1.x,
		y1 = de1.y + staff_tb[de1.st].y,
		ar = -Math.atan2(y2 - y1, x2 - x1),
		a = ar / Math.PI * 180,
		len = (x2 - x1) / Math.cos(ar);

	g_open(x1, y1, a);
	x1 = de1.s.dots ? 13 + de1.s.xmx : 8;
	len -= x1 + 8;
	xypath(x1, 0);
	output.push('l' + len.toFixed(2) + ' 0" stroke-width="1"/>\n');
	g_close()
}

var deco_l_tb = {
	glisq: out_glisq,
	gliss: out_gliss
}

function out_deco_long(x, y, de) {
	var	name = de.dd.glyph

	if (deco_l_tb[name])
		deco_l_tb[name](x, y, de)
	else
		error(1, null, "No function for decoration '$1'", name)
}

// update the vertical offset
function vskip(h) {
	posy += h
}

// create the SVG image of the block
function svg_flush() {
	if (multicol || output.length == 0 || !user.img_out || posy == 0)
		return

    var	head = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1"\n\
	xmlns:xlink="http://www.w3.org/1999/xlink"\n\
	color="black" class="music" stroke-width=".7"',
	g = ''

	if (cfmt.bgcolor)
		head += ' style="background-color: ' + cfmt.bgcolor + '"';

	posy *= cfmt.scale

	if (user.imagesize) {
		head += '\n' +
			user.imagesize +
			' viewBox="0 0 ' + img.width.toFixed(0) + ' ' +
			 posy.toFixed(0) + '">\n'
	} else {
		head += '\n\twidth="' + img.width.toFixed(0) +
			'px" height="' + posy.toFixed(0) + 'px">\n'
	}

	if (style || font_style || musicfont) {
		head += '<style type="text/css">' + style + font_style
		if (musicfont) {
			if (musicfont.indexOf('(') > 0) {
				head += '\n\
.music {font-family: music; font-size: 24px; fill: currentColor}\n\
@font-face {\n\
  font-family: "music";\n\
  src: ' + musicfont + '}';
			} else {
				head += '\n\
.music {font-family: '+ musicfont +'; font-size: 24px; fill: currentColor}'
			}
		}
		head += '\n</style>\n'
	}
	defs += fulldefs
	if (defs)
		head += '<defs>' + defs + '\n</defs>\n'

	// if %%pagescale != 1, do a global scale
	// (with a container: transform scale in <svg> does not work
	//	the same in all browsers)
	// the class is used to know that the container is global
	if (cfmt.scale != 1) {
		head += '<g class="g" transform="scale(' +
			cfmt.scale.toFixed(2) + ')">\n';
		g = '</g>\n'
	}

	if (psvg)			// if PostScript support
		psvg.ps_flush(true);	// + setg(0)

	user.img_out(head + output.join('') + g + "</svg>");
	output = []

	font_style = ''
	if (cfmt.fullsvg) {
		defined_glyph = {}
		defined_font = {}
	} else {
		musicfont = '';
		style = '';
		fulldefs = ''
	}
	defs = '';
	posy = 0
}

// output a part of a block of images
function blk_out() {
	if (multicol || !user.img_out)
		return
	blk_flush()
	if (user.page_format && !block.started) {
		block.started = true
		if (block.newpage) {
			block.newpage = false;
			user.img_out('<div class="nobrk newpage">')
		} else {
			user.img_out('<div class="nobrk">')
		}
	}
}
Abc.prototype.blk_out = blk_out

// output the end of a block (or tune)
function blk_flush() {
	svg_flush()
	if (block.started) {
		block.started = false;
		user.img_out('</div>')
	}
}
Abc.prototype.blk_flush = blk_flush
// abc2svg - tune.js - tune generation
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

var	par_sy,		// current staff system for parse
	cur_sy,		// current staff system for generation
	voice_tb,
	curvoice,
	staves_found,
	vover,		// voice overlay
	tsfirst

/* apply the %%voice options of the current voice */
function voice_filter() {
	var opt, sel, i

	for (opt in parse.voice_opts) {
		if (!parse.voice_opts.hasOwnProperty(opt))
			continue
		sel = new RegExp(opt)
		if (sel.test(curvoice.id)
		 || sel.test(curvoice.nm)) {
			for (i in parse.voice_opts[opt])
			    if (parse.voice_opts[opt].hasOwnProperty(i))
				do_pscom(parse.voice_opts[opt][i])
		}
	}
}

/* -- link a ABC symbol into the current voice -- */
function sym_link(s) {
	if (!s.ctx)
		set_ref(s)
	if (!curvoice.ignore) {
		parse.last_sym = s;
		s.prev = curvoice.last_sym
		if (curvoice.last_sym)
			curvoice.last_sym.next = s
		else
			curvoice.sym = s;
		curvoice.last_sym = s
	}
	s.v = curvoice.v;
	s.p_v = curvoice;
	s.st = curvoice.cst;
	s.time = curvoice.time
	if (s.dur && !s.grace)
		curvoice.time += s.dur;
	s.pos = curvoice.pos
	if (curvoice.second)
		s.second = true
	if (curvoice.floating)
		s.floating = true
}

/* -- add a new symbol in a voice -- */
function sym_add(p_voice, type) {
	var	s = {
			type:type,
			dur:0
		},
		s2,
		p_voice2 = curvoice;

	curvoice = p_voice;
	sym_link(s);
	curvoice = p_voice2;
	s2 = s.prev
	if (!s2)
		s2 = s.next
	if (s2) {
		s.ctx = s2.ctx;
		s.istart = s2.istart;
		s.iend = s2.iend
	}
	return s
}

/* -- expand a multi-rest into single rests and measure bars -- */
function mrest_expand(s) {
	var	p_voice, s2, next,
		nb = s.nmes,
		dur = s.dur / nb

	/* change the multi-rest (type bar) to a single rest */
	var a_dd = s.a_dd;
	s.type = REST;
	s.dur = dur;
	s.head = FULL;
	s.nflags = -2;

	/* add the bar(s) and rest(s) */
	next = s.next;
	p_voice = s.p_v;
	p_voice.last_sym = s;
	p_voice.time = s.time + dur;
	p_voice.cst = s.st;
	s2 = s
	while (--nb > 0) {
		s2 = sym_add(p_voice, BAR);
		s2.bar_type = "|";
		s2 = sym_add(p_voice, REST);
		if (s.invis)
			s2.invis = true;
		s2.dur = dur;
		s2.head = FULL;
		s2.nflags = -2;
		p_voice.time += dur
	}
	s2.next = next
	if (next)
		next.prev = s2;

	/* copy the mrest decorations to the last rest */
	s2.a_dd = a_dd
}

/* -- sort all symbols by time and vertical sequence -- */
// weight of the symbols !! depends on the symbol type !!
var w_tb = new Uint8Array([
	2,	// bar
	1,	// clef
	8,	// custos
	0,	// (free)
	3,	// grace
	5,	// key
	6,	// meter
	9,	// mrest
	9,	// note
	0,	// part
	9,	// rest
	3,	// space
	0,	// staves
	7,	// stbrk
	0,	// tempo
	0,	// (free)
	0,	// block
	0	// remark
])

function sort_all() {
	var	s, s2, p_voice, v, time, w, wmin, ir, multi,
		prev, nb, ir2, v2, sy,
		nv = voice_tb.length,
		vtb = [],
		vn = [],			/* voice indexed by range */
		mrest_time = -1

	for (v = 0; v < nv; v++)
		vtb.push(voice_tb[v].sym)

	/* initialize the voice order */
	var	fl = 1,				// start a new time sequence
		new_sy = cur_sy

	while (1) {
		if (new_sy && fl) {
			sy = new_sy;
			new_sy = null;
			multi = -1;
			vn = []
			for (v = 0; v < nv; v++) {
				if (!sy.voices[v]) {
					sy.voices[v] = {
						range: -1
					}
					continue
				}
				ir = sy.voices[v].range
				if (ir < 0)
					continue
				vn[ir] = v;
				multi++
			}
		}

		/* search the min time and symbol weight */
		wmin = time = 1000000				/* big int */
		for (ir = 0; ir < nv; ir++) {
			v = vn[ir]
			if (v == undefined)
				break
			s = vtb[v]
			if (!s || s.time > time)
				continue
			w = w_tb[s.type]
			if (s.time < time) {
				time = s.time;
				wmin = w
			} else if (w < wmin) {
				wmin = w
			}
			if (s.type == MREST) {
				if (s.nmes == 1)
					mrest_expand(s)
				else if (multi > 0)
					mrest_time = time
			}
		}

		if (wmin > 127)
			break			// done

		/* if some multi-rest and many voices, expand */
		if (time == mrest_time) {
			nb = 0
			for (ir = 0; ir < nv; ir++) {
				v = vn[ir]
				if (v == undefined)
					break
				s = vtb[v]
				if (!s || s.time != time
				 || w_tb[s.type] != wmin)
					continue
				if (s.type != MREST) {
					mrest_time = -1 /* some note or rest */
					break
				}
				if (nb == 0) {
					nb = s.nmes
				} else if (nb != s.nmes) {
					mrest_time = -1	/* different duration */
					break
				}
			}
			if (mrest_time < 0) {
				for (ir = 0; ir < nv; ir++) {
					v = vn[ir]
					if (v == undefined)
						break
					s = vtb[v]
					if (s && s.type == MREST)
						mrest_expand(s)
				}
			}
		}

		/* link the vertical sequence */
		for (ir = 0; ir < nv; ir++) {
			v = vn[ir]
			if (v == undefined)
				break
			s = vtb[v]
			if (!s || s.time != time
			 || w_tb[s.type] != wmin)
				continue
			if (s.type == STAVES) {
				new_sy = s.sy;

				// set all voices of previous and next staff systems
				// as reachable
				for (ir2 = 0; ir2 < nv; ir2++) {
					if (vn[ir2] == undefined)
						break
				}
				for (v2 = 0; v2 < nv; v2++) {
					if (!new_sy.voices[v2])
						continue
					ir = new_sy.voices[v2].range
					if (ir < 0
					 || sy.voices[v2].range >= 0)
						continue
					vn[ir2++] = v2
				}
			}
			if (fl) {
				fl = 0;
				s.seqst = true
			}
			s.ts_prev = prev
			if (prev)
				prev.ts_next = s
			else
				tsfirst = s;
			prev = s

			vtb[v] = s.next
		}
		fl = wmin		/* start a new sequence if some width */
	}
}

// adjust some voice elements
function voice_adj() {
	var p_voice, s, s2, v

	// set the duration of the notes under a feathered beam
	function set_feathered_beam(s1) {
		var	s, s2, t, d, b, i, a,
			d = s1.dur,
			n = 1

		/* search the end of the beam */
		for (s = s1; s; s = s.next) {
			if (s.beam_end || !s.next)
				break
			n++
		}
		if (n <= 1) {
			delete s1.feathered_beam
			return
		}
		s2 = s;
		b = d / 2;		/* smallest note duration */
		a = d / (n - 1);	/* delta duration */
		t = s1.time
		if (s1.feathered_beam > 0) {	/* !beam-accel! */
			for (s = s1, i = n - 1;
			     s != s2;
			     s = s.next, i--) {
				d = ((a * i) | 0) + b;
				s.dur = d;
				s.time = t;
				t += d
			}
		} else {				/* !beam-rall! */
			for (s = s1, i = 0;
			     s != s2;
			     s = s.next, i++) {
				d = ((a * i) | 0) + b;
				s.dur = d;
				s.time = t;
				t += d
			}
		}
		s.dur = s.time + s.dur - t;
		s.time = t
	} // end set_feathered_beam()

	/* if Q: from tune header, put it at start of the music */
	s = glovar.tempo
	if (s && staves_found <= 0) {	// && !s.del) {		- play problem
		v = par_sy.top_voice;
		p_voice = voice_tb[v];
		if (p_voice.sym && p_voice.sym.type != TEMPO) {
			s = clone(s);
			s.v = v;
			s.p_v = p_voice;
			s.st = p_voice.st;
			s.time = 0;
			s.next = p_voice.sym
			if (s.next)
				s.next.prev = s;
			p_voice.sym = s
		}
	}

	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (p_voice.ignore)
			p_voice.ignore = false
		for (s = p_voice.sym; s; s = s.next) {
			if (s.time >= staves_found)
				break
		}
		for ( ; s; s = s.next) {
			switch (s.type) {
			case GRACE:
				// with w_tb[BAR] = 2,
				// the grace notes go after the bar;
				// if before a bar, change the grace time
				if (s.next && s.next.type == BAR)
					s.time--

				if (!cfmt.graceword)
					continue
				for (s2 = s.next; s2; s2 = s2.next) {
					switch (s2.type) {
					case SPACE:
						continue
					case NOTE:
						if (!s2.a_ly)
							break
						s.a_ly = s2.a_ly;
						s2.a_ly = null
						break
					}
					break
				}
				continue
			}

			if (s.feathered_beam)
				set_feathered_beam(s)
		}
	}
}

/* -- duplicate the voices as required -- */
function dupl_voice() {
	var	p_voice, p_voice2, s, s2, g, g2, v, i,
		nv = voice_tb.length

	for (v = 0; v < nv; v++) {
		p_voice = voice_tb[v];
		p_voice2 = p_voice.clone
		if (!p_voice2)
			continue
		p_voice.clone = null
		for (s = p_voice.sym; s; s = s.next) {
//fixme: there may be other symbols before the %%staves at this same time
			if (s.time >= staves_found)
				break
		}
		p_voice2.clef = clone(p_voice.clef);
		curvoice = p_voice2
		for ( ; s; s = s.next) {
			if (s.type == STAVES)
				continue
			s2 = clone(s)
			if (s.notes) {
				s2.notes = []
				for (i = 0; i <= s.nhd; i++)
					s2.notes.push(clone(s.notes[i]))
			}
			sym_link(s2)
//			s2.time = s.time
			if (p_voice2.second)
				s2.second = true
			else
				delete s2.second
			if (p_voice2.floating)
				s2.floating = true
			else
				delete s2.floating
			delete s2.a_ly;
			g = s2.extra
			if (!g)
				continue
			g2 = clone(g);
			s2.extra = g2;
			s2 = g2;
			s2.v = p_voice2.v;
			s2.p_v = p_voice2;
			s2.st = p_voice2.st
			for (g = g.next; g; g = g.next) {
				g2 = clone(g)
				if (g.notes) {
					g2.notes = []
					for (i = 0; i <= g.nhd; i++)
						g2.notes.push(clone(g.notes[i]))
				}
				s2.next = g2;
				g2.prev = s2;
				s2 = g2;
				s2.v = p_voice2.v;
				s2.p_v = p_voice2;
				s2.st = p_voice2.st
			}
		}
	}
}

/* -- create a new staff system -- */
function new_syst(init) {
	var	st, v,
		sy_new = {
			voices: [],
			staves: [],
			top_voice: 0
		}

	if (init) {				/* first staff system */
		cur_sy = par_sy = sy_new
		return
	}

	// update the previous system
	for (v = 0; v < voice_tb.length; v++) {
		st = par_sy.voices[v].st
		var	sy_staff = par_sy.staves[st],
			p_voice = voice_tb[v]
		if (p_voice.stafflines != undefined)
			sy_staff.stafflines = p_voice.stafflines
		if (p_voice.staffscale)
			sy_staff.staffscale = p_voice.staffscale;
		sy_new.voices[v] = clone(par_sy.voices[v]);
		sy_new.voices[v].range = -1;
		delete sy_new.voices[v].second
	}
	for (st = 0; st < par_sy.staves.length; st++) {
		sy_new.staves[st] = clone(par_sy.staves[st]);
		sy_new.staves[st].flags = 0
	}
	par_sy.next = sy_new;
	par_sy = sy_new
}

/* go to a global (measure + time) */
function go_global_time(s, symsel) {
	var s2, bar_time, seq

	if (symsel.bar <= 1) {		/* special case: there is no measure 0/1 */
		if (symsel.bar == 1) {
			for (s2 = s; s2; s2 = s2.ts_next) {
				if (s2.type == BAR
				 && s2.time != 0)
					break
			}
			if (s2.time < voice_tb[cur_sy.top_voice].meter.wmeasure)
				s = s2
		}
	} else {
		for ( ; s; s = s.ts_next) {
			if (s.type == BAR
			 && s.bar_num >= symsel.bar)
				break
		}
		if (!s)
			return // null
		if (symsel.seq != 0) {
			seq = symsel.seq
			for (s = s.ts_next; s; s = s.ts_next) {
				if (s.type == BAR
				 && s.bar_num == symsel.bar) {
					if (--seq == 0)
						break
				}
			}
			if (!s)
				return // null
		}
	}

	if (symsel.time == 0)
		return s;
	bar_time = s.time + symsel.time
	while (s.time < bar_time) {
		s = s.ts_next
		if (!s)
			return s
	}
	do {
		s = s.ts_prev		/* go back to the previous sequence */
	} while (!s.seqst)
	return s
}

/* treat %%clip */
function do_clip() {
	var s, s2, sy, p_voice, v

	/* remove the beginning of the tune */
	s = tsfirst
	if (clip_start.bar > 0
	 || clip_start.time > 0) {
		s = go_global_time(s, clip_start)
		if (!s) {
			tsfirst = null
			return
		}

		/* update the start of voices */
		sy = cur_sy
		for (s2 = tsfirst; s2 != s; s2 = s2.ts_next) {
			switch (s2.type) {
			case CLEF:
				s2.p_v.clef = s2
				break
			case KEY:
				s2.p_v.key = clone(s2.as.u.key)
				break
			case METER:
				s2.p_v.meter = clone(s2.as.u.meter)
				break
			case STAVES:
				sy = s.sy
				break
			}
		}
		cur_sy = sy
		for (v = 0; v < voice_tb.length; v++) {
			p_voice = voice_tb[v]
			for (s2 = s; s2; s2 = s2.ts_next) {
				if (s2.v == v) {
					delete s2.prev
					break
				}
			}
			p_voice.sym = s2
		}
		tsfirst = s
		delete s.ts_prev
	}

	/* remove the end of the tune */
	s = go_global_time(s, clip_end)
	if (!s)
		return

	/* keep the current sequence */
	do {
		s = s.ts_next
		if (!s)
			return
	} while (!s.seqst)

	/* cut the voices */
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		for (s2 = s.ts_prev; s2; s2 = s2.ts_prev) {
			if (s2.v == v) {
				delete s2.next
				break
			}
		}
		if (!s2)
			p_voice.sym = null
	}
	delete s.ts_prev.ts_next
}

/* -- set the bar numbers and treat %%clip / %%break -- */
function set_bar_num() {
	var	s, s2, tim,
		v = cur_sy.top_voice,
		wmeasure = voice_tb[v].meter.wmeasure,
		bar_rep = gene.nbar

	// insert the EOL of %%break
	function do_break() {
		var s, i, m, n, d, t

		for (i = 0; i < glovar.break.length; i++) {
			m = glovar.break[i].m
			n = glovar.break[i].n
			d = glovar.break[i].d
			for (s = voice_tb[v].sym; s; s = s.next) {
				if (s.type == BAR && s.bar_num == m)
					break
			}
			if (!s)
				continue
			if (n != 0) {
				t = s.time + n / d
				for ( ; s; s = s.next) {
					if (s.time > t)
						break
				}
				if (!s)
					continue
			}
			s.eoln = true
		}
	} // do_break

	/* don't count a bar at start of line */
	for (s = tsfirst; ; s = s.ts_next) {
		if (!s)
			return
		switch (s.type) {
		case METER:
		case CLEF:
		case KEY:
		case STBRK:
			continue
		case BAR:
			if (s.bar_num) {
				gene.nbar = s.bar_num	/* (%%setbarnb) */
				break
			}
			if (s.text			// if repeat bar
			 && !cfmt.contbarnb) {
				if (s.text[0] == '1') {
					bar_rep = gene.nbar
				} else {
					gene.nbar = bar_rep; /* restart bar numbering */
					s.bar_num = gene.nbar
				}
			}
			break
		}
		break
	}

	// set the measure number on the top bars
	var	bar_time = s.time + wmeasure, // for incomplete measure at start of tune
		bar_num = gene.nbar

	for ( ; s; s = s.ts_next) {
		switch (s.type) {
		case METER:
			wmeasure = s.wmeasure
			if (s.time < bar_time)
				bar_time = s.time + wmeasure
			break
		case MREST:
			bar_num += s.nmes - 1
			while (s.ts_next
			    && s.ts_next.type != BAR)
				s = s.ts_next
			break
		case BAR:
			if (s.bar_num) {
				bar_num = s.bar_num		/* (%%setbarnb) */
				if (s.time < bar_time) {
					delete s.bar_num
					break
				}
			} else {
				if (s.time < bar_time)	/* incomplete measure */
					break
				bar_num++
			}

			/* check if any repeat bar at this time */
			tim = s.time;
			s2 = s
			do {
				if (s2.type == BAR
				 && s2.text		// if repeat bar
				 && !cfmt.contbarnb) {
					if (s2.text[0] == '1')
						bar_rep = bar_num
					else		/* restart bar numbering */
						bar_num = bar_rep
					break
				}
				s2 = s2.next
			} while (s2 && s2.time == tim);
			s.bar_num = bar_num;
			bar_time = s.time + wmeasure
			break
		}
	}
//fixme
	/* do the %%clip stuff */
	/* do the %%break stuff */
	if (glovar.break)
		do_break()

	if (cfmt.measurenb < 0)		/* if no display of measure bar */
		gene.nbar = bar_num	/* update in case of more music to come */
}

// %%break measure_nb [":" num "/" den] [" " measure ...]*
function get_break(param) {
	var a = param.split(' '), b, c, d, i, j, k, n

	glovar.break = []
	for (k in a) {
		if (!a.hasOwnProperty(k))
			continue
		b = a[k];
		i = b.indexOf(':')
		if (i < 0) {
			glovar.break.push({m: b, n: 0, d: 1})
			continue
		}
		j = b.indexOf('/')
		if (j < 0) {
			syntax(1, "'/' missing in %%break")
			break
		}
		d = parseInt(b.slice(j + 1))
		if (isNaN(d) || d <= 1) {
			syntax(1, "Bad denominator in %%break")
			break
		}
		glovar.break.push({
			m: b.slice(0, i - 1),
			n: b.slice(i + 1, j - 1),
			d: d})
	}
}

// note mapping
// %%map map_name note [print [note_head]] [param]*
function get_map(text) {
	if (!text)
		return

	var	i, note, notes, map, tmp, ns,
		a = info_split(text, 2)

	if (a.length < 3) {
		syntax(1, "Not enough parameters in %%map")
		return
	}
	ns = a[1]
	if (ns.indexOf("octave,") == 0
	 || ns.indexOf("key,") == 0) {		// remove the octave part
		ns = ns.replace(/[,']+$/m, '').toLowerCase(); //'
		if (ns[0] == 'k')		// remove the accidental part
			ns = ns.replace(/[_=^]+/, '')
	} else if (ns[0] == '*' || ns.indexOf("all") == 0) {
		ns = 'all'
	} else {				// exact pitch, rebuild the note
		tmp = new scanBuf();
		tmp.buffer = a[1];
		note = parse_acc_pit(tmp)
		if (!note) {
			syntax(1, "Bad note in %%map")
			return
		}
		ns = 'abcdefg'[(note.pit + 77) % 7]
		if (note.acc)
			ns = ['__', '_', '', '^', '^^', '='][note.acc + 2] + ns
		for (i = note.pit; i >= 28; i -= 7)
			ns += "'"
		for (i = note.pit; i < 21; i += 7)
			ns += ","
	}

	notes = maps[a[0]]
	if (!notes)
		maps[a[0]] = notes = {}
	map = notes[ns]
	if (!map)
		notes[ns] = map = []

	/* try the optional 'print' and 'heads' parameters */
	if (!a[2])
		return
	i = 2
	if (a[2].indexOf('=') < 0) {
		if (a[2][0] != '*') {
			tmp = new scanBuf();		// print
			tmp.buffer = a[2];
			map[1] = parse_acc_pit(tmp)
		}
		if (!a[3])
			return
		i++
		if (a[3].indexOf('=') < 0) {
			map[0] = a[3].split(',');
			i++
		}
	}

	for (; i < a.length; i++) {
		switch (a[i]) {
		case "heads=":
			map[0] = a[++i].split(',')
			break
		case "print=":
			tmp = new scanBuf();
			tmp.buffer = a[++i];
			map[1] = parse_acc_pit(tmp)
			break
//		case "transpose=":
//			switch (a[++i][0]) {
//			case "n":
//				map[2] = false
//				break
//			case "y":
//				map[2] = true
//				break
//			}
//			break
		case "color=":
			map[2] = a[++i]
			break
		}
	}
}

// %%MIDI
function get_midi(param) {
	var	chan, prog,
		a = param.split(/\s+/)

	switch (a[0]) {
	case "program":
		if (a[2]) {		// channel program
			chan = a[1];
			prog = a[2]
		} else {		// program
			chan = 0;
			prog = a[1]
		}
		prog = parseInt(prog)
		if (isNaN(prog) || prog < 0 || prog > 127) {
			syntax(1, "Bad program in %%MIDI")
			return
		}
		if (curvoice)
			curvoice.instr = prog
		else
			glovar.instr = prog
		break
	}
}

// set the transposition in the previous or starting key
function set_transp() {
	var	s, transp, vtransp

	if (curvoice.ckey.k_bagpipe || curvoice.ckey.k_drum)
		return

	if (cfmt.transp && curvoice.transp)	// if %%transpose and score=
		syntax(0, "Mix of old and new transposition syntaxes");

	transp = (cfmt.transp || 0) +		// %%transpose
		(curvoice.transp || 0) +	// score= / sound=
		(curvoice.shift || 0);		// shift=
	vtransp = curvoice.vtransp || 0
	if (transp == vtransp)
		return

	curvoice.vtransp = transp;

	s = curvoice.last_sym
	if (!s) {				// no symbol yet
		curvoice.key = clone(curvoice.okey);
		key_transp(curvoice.key);
		curvoice.ckey = clone(curvoice.key)
		if (curvoice.key.k_none)
			curvoice.key.k_sf = 0
		return
	}

	// set the transposition in the previous K:
	while (1) {
		if (s.type == KEY)
			break
		if (!s.prev) {
			s = curvoice.key
			break
		}
		s = s.prev
	}
	key_transp(s);
	curvoice.ckey = clone(s)
	if (curvoice.key.k_none)
		s.k_sf = 0
}

function set_ottava(dcn) {
	if (cfmt.sound)
		return
	switch (dcn) {
	case "15ma(":
		curvoice.ottava = -14
		break
	case "8va(":
		curvoice.ottava = -7
		break
	case "8vb(":
		curvoice.ottava = 7
		break
	case "15mb(":
		curvoice.ottava = 14
		break
	case "15ma)":
	case "8va)":
	case "8vb)":
	case "15mb)":
		curvoice.ottava = 0
		break
	}
}

/* -- process a pseudo-comment (%% or I:) -- */
function do_pscom(text) {
	var	h1, val, s, cmd, param, n, k, b,
		lock = false

	if (text.match(/ lock$/)) {
		lock = true;
		text = text.slice(0, -5).trim()
	}
	cmd = text.match(/(\w|-)+/)
	if (!cmd)
		return
	cmd = cmd[0];
	param = text.replace(cmd, '').trim()
	switch (cmd) {
	case "break":
		get_break(param)
		return
	case "center":
		if (parse.state >= 2) {
			s = new_block("text");
			s.text = cnv_escape(param);
			s.opt = 'c'
			return
		}
		write_text(cnv_escape(param), 'c')
		return
	case "clef":
		if (parse.state >= 2) {
			if (parse.state == 2)
				goto_tune();
			s = new_clef(param)
			if (s)
				get_clef(s)
		}
		return
	case "clip":
//fixme: to do
		return
	case "deco":
		deco_add(param)
		return
	case "linebreak":
		set_linebreak(param)
		return
	case "MIDI":
		get_midi(param)
		return
	case "map":
		get_map(param)
		return
	case "maxsysstaffsep":
		if (parse.state == 3) {
			par_sy.voices[curvoice.v].maxsep = get_unit(param)
			return
		}
		break
	case "multicol":
		generate()
		switch (param) {
		case "start":
			blk_out();
			multicol = {
				posy: posy,
				maxy: posy,
				lmarg: cfmt.leftmargin,
				rmarg: cfmt.rightmargin,
				state: parse.state
			}
			break
		case "new":
			if (!multicol) {
				syntax(1, "%%multicol new without start")
				break
			}
			if (posy > multicol.maxy)
				multicol.maxy = posy;
			cfmt.leftmargin = multicol.lmarg;
			cfmt.rightmargin = multicol.rmarg;
			img.chg = true;
			set_page();
			posy = multicol.posy
			break
		case "end":
			if (!multicol) {
				syntax(1, "%%multicol end without start")
				break
			}
			if (posy < multicol.maxy)
				posy = multicol.maxy;
			cfmt.leftmargin = multicol.lmarg;
			cfmt.rightmargin = multicol.rmarg;
			multicol = undefined;
			blk_out();
			img.chg = true;
			set_page()
			break
		default:
			syntax(1, "Unknown keyword '$1' in %%multicol", param)
			break
		}
		return
	case "musicfont":
		musicfont = param
		return
	case "ottava":
		if (parse.state != 3) {
			if (parse.state != 2)
				return
			goto_tune()
		}
		n = parseInt(param)
		if (isNaN(n) || n < -2 || n > 2) {
			syntax(1, err_bad_val_s, "%%ottava")
			return
		}
		switch (curvoice.ottava) {
		case 14: b = "15mb)"; break
		case 7: b = "8vb)"; break
		case -7: b = "8va)"; break
		case -14: b = "15ma)"; break
		}
		if (b) {
			if (!a_dcn)
				a_dcn = []
			a_dcn.push(b);
			set_ottava(b)
		}
		switch (n) {
		case -2: b = "15mb("; break
		case -1: b = "8vb("; break
		case 0: return
		case 1: b = "8va("; break
		case 2: b = "15ma("; break
		}
		if (!a_dcn)
			a_dcn = []
		a_dcn.push(b);
		set_ottava(b)
		return
	case "repbra":
		if (parse.state >= 2) {
			if (parse.state == 2)
				goto_tune();
			curvoice.norepbra = !get_bool(param)
		}
		return
	case "repeat":
		if (parse.state != 3)
			return
		if (!curvoice.last_sym) {
			syntax(1, "%%repeat cannot start a tune")
			return
		}
		if (!param.length) {
			n = 1;
			k = 1
		} else {
			b = param.split(/\s+/);

			n = parseInt(b[0]);
			k = parseInt(b[1])
			if (isNaN(n) || n < 1
			 || (curvoice.last_sym.type == BAR
			  && n > 2)) {
				syntax(1, "Incorrect 1st value in %%repeat")
				return
			}
			if (isNaN(k)) {
				k = 1
			} else {
				if (k < 1) {
					syntax(1, "Incorrect 2nd value in %%repeat")
					return
				}
			}
		}
		parse.repeat_n = curvoice.last_sym.type == BAR ? n : -n;
		parse.repeat_k = k
		return
	case "sep":
		var	h2, len, values, lwidth;

		set_page();
		lwidth = img.width - img.lm - img.rm;
		h1 = h2 = len = 0
		if (param) {
			values = param.split(/\s+/);
			h1 = get_unit(values[0])
			if (values[1]) {
				h2 = get_unit(values[1])
				if (values[2])
					len = get_unit(values[2])
			}
		}
		if (h1 < 1)
			h1 = 14
		if (h2 < 1)
			h2 = h1
		if (len < 1)
			len = 90
		if (parse.state >= 2) {
			s = new_block(cmd);
			s.x = (lwidth - len) / 2 / cfmt.scale;
			s.l = len / cfmt.scale;
			s.sk1 = h1;
			s.sk2 = h2
			return
		}
		blk_out();
		vskip(h1);
		output.push('<path class="stroke"\n\td="M');
		out_sxsy((lwidth - len) / 2 / cfmt.scale, ' ', 0);
		output.push('h' + (len / cfmt.scale).toFixed(2) + '"/>\n');
		vskip(h2);
		blk_flush()
		return
	case "setbarnb":
		val = parseInt(param)
		if (isNaN(val))
			syntax(1, "Bad %%setbarnb value")
		else if (parse.state >= 2)
			glovar.new_nbar = val
		else
			cfmt.measurefirst = val
		return
	case "staff":
		if (parse.state != 3) {
			if (parse.state != 2)
				return
			goto_tune()
		}
		val = parseInt(param)
		if (isNaN(val)) {
			syntax(1, "Bad %%staff value '$1'", param)
			return
		}
		var st
		if (param[0] == '+' || param[0] == '-')
			st = curvoice.cst + val
		else
			st = val - 1
		if (st < 0 || st > nstaff) {
			syntax(1, "Bad %%staff number $1 (cur $2, max $3)",
					st, curvoice.cst, nstaff)
			return
		}
		delete curvoice.floating;
		curvoice.cst = st
		return
	case "staffbreak":
		if (parse.state != 3) {
			if (parse.state != 2)
				return
			goto_tune()
		}
		s = {
			type: STBRK,
			dur:0
		}
		if (param[0] >= '0' && param[0] <= '9') {
			s.xmx = get_unit(param)
			if (param.slice(-1) == 'f')
				s.stbrk_forced = true
		} else {
			s.xmx = 14
			if (param[0] == 'f')
				s.stbrk_forced = true
		}
		sym_link(s)
		return
	case "stafflines":
		val = get_st_lines(param)
		if (val == undefined)
			syntax(1, "Bad %%stafflines value")
		else
			set_v_param(cmd, val)
		return
	case "staffscale":
		val = parseFloat(param)
		if (isNaN(val) || val < .3 || val > 2)
			syntax(1, "Bad %%staffscale value")
		else
			set_v_param(cmd, val)
		return
	case "staves":
	case "score":
		if (parse.state == 0)
			return
		get_staves(cmd, param)
		return
	case "sysstaffsep":
//--fixme: may be global
		if (parse.state == 3) {
			par_sy.voices[curvoice.v].sep = get_unit(param)
			return
		}
		break
	case "text":
		if (parse.state >= 2) {
			s = new_block(cmd);
			s.text = cnv_escape(param);
			s.opt = cfmt.textoption
			return
		}
		write_text(cnv_escape(param), cfmt.textoption)
		return
	case "transpose":		// (abcm2ps compatibility)
		if (cfmt.sound)
			return
		switch (parse.state) {
		case 0:
			cfmt.transp = 0
			// fall thru
		case 1:
		case 2:
			cfmt.transp = (cfmt.transp || 0) + get_transp(param)
			return
//		case 2:
//			goto_tune()
//			break
		}
		for (s = curvoice.last_sym; s; s = s.prev) {
			switch (s.type) {
			case NOTE:		// insert a key
				s = clone(curvoice.okey);
				s.k_old_sf = curvoice.ckey.k_sf;
				sym_link(s)
				break
			case KEY:
				break
			default:
				continue
			}
			break
		}
		do_info('V', curvoice.id + ' shift=' + param)
		return
	case "tune":
//fixme: to do
		return
	case "user":
		set_user(param)
		return
	case "voicecolor":
		if (parse.state != 3) {
			if (parse.state != 2)
				return
			goto_tune()
		}
		curvoice.color = param
		return
	case "vskip":
		val = get_unit(param)
		if (val < 0) {
			syntax(1, "%%vskip cannot be negative")
			return
		}
		if (parse.state >= 2) {
			s = new_block(cmd);
			s.sk = val
			return
		}
		vskip(val);
		return
	case "newpage":
	case "leftmargin":
	case "rightmargin":
	case "pagescale":
	case "pagewidth":
	case "printmargin":
	case "scale":
	case "staffwidth":
		if (parse.state == 3) {			// tune body
			s = new_block(cmd);
			s.param = param
			return
		}
		if (cmd == "newpage") {
			blk_flush();
			block.newpage = true;
			return
		}
		break
	}
	set_format(cmd, param, lock)
}

// treat the %%beginxxx / %%endxxx sequences
function do_begin_end(type,
			opt,
			text) {
	var i, j, action, s

	switch (type) {
	default:
//	case "ps":
		if (opt != 'nosvg' && psvg)
			psvg.ps_eval(text)
		break
	case "js":
		eval(text)
		break
	case "ml":
		if (parse.state >= 2) {
			s = new_block(type);
			s.text = text
		} else {
			svg_flush();
			user.img_out(text)
		}
		break
	case "svg":
		j = 0
		while (1) {
			i = text.indexOf('<style type="text/css">\n', j)
			if (i < 0)
				break
			j = text.indexOf('</style>', i)
			if (j < 0) {
				syntax(1, "No </style> in %%beginsvg sequence")
				break
			}
			style += text.slice(i + 23, j).replace(/\s+$/, '')
		}
		j = 0
		while (1) {
			i = text.indexOf('<defs>\n', j)
			if (i < 0)
				break
			j = text.indexOf('</defs>', i)
			if (j < 0) {
				syntax(1, "No </defs> in %%beginsvg sequence")
				break
			}
			defs_add(text.slice(i + 6, j))
		}
		break
	case "text":
		action = get_textopt(opt);
		if (!action)
			action = cfmt.textoption
		if (parse.state >= 2) {
			s = new_block(type);
			s.text = cnv_escape(text);
			s.opt = action
			break
		}
		write_text(cnv_escape(text), action)
		break
	}
}

/* -- generate a piece of tune -- */
function generate() {
	var v, p_voice;

	if (voice_tb.length == 0)
		return
	voice_adj();
	dupl_voice();
	sort_all()			/* define the time / vertical sequences */
	if (!tsfirst)
		return
	set_bar_num()
	if (!tsfirst)
		return				/* no more symbol */

	// give the parser result to the application
	if (user.get_abcmodel)
		user.get_abcmodel(tsfirst, voice_tb, anno_type, info)

	if (user.img_out)		// if SVG generation
		output_music()

	/* reset the parser */
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v];
		p_voice.time = 0;
		p_voice.sym = p_voice.last_sym = null;
		p_voice.st = cur_sy.voices[v].st;
		p_voice.second = cur_sy.voices[v].second;
//		p_voice.clef.time = 0;
		delete p_voice.have_ly;
		p_voice.hy_st = 0;
		delete p_voice.bar_start
		delete p_voice.slur_st
		delete p_voice.s_tie
		delete p_voice.s_rtie
	}
	staves_found = 0			// (for compress/dup the voices)
}

// transpose a key
//fixme: transpose of the accidental list is not done
function key_transp(s_key) {
	var	t = (curvoice.vtransp / 3) | 0,
		sf = (t & ~1) + (t & 1) * 7 + s_key.k_sf

	switch ((curvoice.vtransp + 210) % 3) {
	case 1:
		sf = (sf + 4 + 12 * 4) % 12 - 4	/* more sharps */
		break
	case 2:
		sf = (sf + 7 + 12 * 4) % 12 - 7	/* more flats */
		break
	default:
		sf = (sf + 5 + 12 * 4) % 12 - 5	/* Db, F# or B */
		break
	}
	s_key.k_sf = sf;
	s_key.k_delta = cgd2cde[(sf + 7) % 7]
}

/* -- set the accidentals when K: with modified accidentals -- */
function set_k_acc(s) {
	var i, j, n, nacc, p_acc,
		accs = [],
		pits = [],
		m_n = [],
		m_d = []

	if (s.k_sf > 0) {
		for (nacc = 0; nacc < s.k_sf; nacc++) {
			accs[nacc] = 1;			// sharp
			pits[nacc] = [26, 23, 27, 24, 21, 25, 22][nacc]
		}
	} else {
		for (nacc = 0; nacc < -s.k_sf; nacc++) {
			accs[nacc] = -1;		// flat
			pits[nacc] = [22, 25, 21, 24, 20, 23, 26][nacc]
		}
	}
	n = s.k_a_acc.length
	for (i = 0; i < n; i++) {
		p_acc = s.k_a_acc[i]
		for (j = 0; j < nacc; j++) {
			if (pits[j] == p_acc.pit) {
				accs[j] = p_acc.acc
				if (p_acc.micro_n) {
					m_n[j] = p_acc.micro_n;
					m_d[j] = p_acc.micro_d
				}
				break
			}
		}
		if (j == nacc) {
			accs[j] = p_acc.acc;
			pits[j] = p_acc.pit
			if (p_acc.micro_n) {
				m_n[j] = p_acc.micro_n;
				m_d[j] = p_acc.micro_d
			}
			nacc++
		}
	}
	for (i = 0; i < nacc; i++) {
		p_acc = s.k_a_acc[i]
		if (!p_acc)
			p_acc = s.k_a_acc[i] = {}
		p_acc.acc = accs[i];
		p_acc.pit = pits[i]
		if (m_n[i]) {
			p_acc.micro_n = m_n[i];
			p_acc.micro_d = m_d[i]
		} else {
			delete p_acc.micro_n
			delete p_acc.micro_d
		}
	}
}

/*
 * for transpose purpose, check if a pitch is already in the measure or
 * if it is tied from a previous note, and return the associated accidental
 */
function acc_same_pitch(pitch) {
	var	i, time,
		s = curvoice.last_sym.prev

	if (!s)
		return //undefined;

	time = s.time

	for (; s; s = s.prev) {
		switch (s.type) {
		case BAR:
			if (s.time < time)
				return //undefined // no same pitch
			while (1) {
				s = s.prev
				if (!s)
					return //undefined
				if (s.type == NOTE) {
					if (s.time + s.dur == time)
						break
					return //undefined
				}
				if (s.time < time)
					return //undefined
			}
			for (i = 0; i <= s.nhd; i++) {
				if (s.notes[i].pit == pitch
				 && s.notes[i].ti1)
					return s.notes[i].acc
			}
			return //undefined
		case NOTE:
			for (i = 0; i <= s.nhd; i++) {
				if (s.notes[i].pit == pitch)
					return s.notes[i].acc
			}
			break
		}
	}
	return //undefined
}

/* -- get staves definition (%%staves / %%score) -- */
function get_staves(cmd, parm) {
	var	s, p_voice, p_voice2, i, flags, v, vid,
		st, range,
		a_vf = parse_staves(parm) // array of [vid, flags]

	if (!a_vf)
		return

	if (voice_tb.length != 0) {
		voice_adj();
		dupl_voice()
	}

	/* create a new staff system */
	var	maxtime = 0,
		no_sym = true

	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (p_voice.time > maxtime)
			maxtime = p_voice.time
		if (p_voice.sym)
			no_sym = false
	}
	if (no_sym				/* if first %%staves */
	 || (maxtime == 0 && staves_found < 0)) {
		for (v = 0; v < par_sy.voices.length; v++)
			par_sy.voices[v].range = -1
	} else {

		/*
		 * create a new staff system and
		 * link the 'staves' symbol in a voice which is seen from
		 * the previous system - see sort_all
		 */
		for (v = 0; v < par_sy.voices.length; v++) {
			if (par_sy.voices[v].range >= 0) {
				curvoice = voice_tb[v]
				break
			}
		}
		curvoice.time = maxtime;
		s = {
			type: STAVES,
			dur: 0
		}

		sym_link(s);		// link the staves in this voice
		par_sy.nstaff = nstaff;
		new_syst();
		s.sy = par_sy
	}

	staves_found = maxtime

	/* initialize the (old) voices */
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		delete p_voice.second
		delete p_voice.ignore
		delete p_voice.floating
	}
	range = 0
	for (i = 0; i < a_vf.length; i++) {
		vid = a_vf[i][0];
		p_voice = new_voice(vid);
		p_voice.time = maxtime;
		v = p_voice.v
		if (i == 0)
			par_sy.top_voice = p_voice.v

		// if the voice is already here, clone it
		if (par_sy.voices[v].range >= 0) {
			p_voice2 = clone(p_voice);
			par_sy.voices[voice_tb.length] = clone(par_sy.voices[v]);
			v = voice_tb.length;
			p_voice2.v = v;
			p_voice2.sym = p_voice2.last_sym = null;
			p_voice2.time = maxtime;
			voice_tb.push(p_voice2)
			delete p_voice2.clone
			while (p_voice.clone)
				p_voice = p_voice.clone;
			p_voice.clone = p_voice2;
			p_voice = p_voice2
		}
		a_vf[i][0] = p_voice;
		par_sy.voices[v].range = range++
	}

	/* change the behavior from %%staves to %%score */
	if (cmd[1] == 't') {				/* if %%staves */
		for (i = 0; i < a_vf.length; i++) {
			flags = a_vf[i][1]
			if (!(flags & (OPEN_BRACE | OPEN_BRACE2)))
				continue
			if ((flags & (OPEN_BRACE | CLOSE_BRACE))
					== (OPEN_BRACE | CLOSE_BRACE)
			 || (flags & (OPEN_BRACE2 | CLOSE_BRACE2))
					== (OPEN_BRACE2 | CLOSE_BRACE2))
				continue
			if (a_vf[i + 1][1] != 0)
				continue
			if ((flags & OPEN_PARENTH)
			 || (a_vf[i + 2][1] & OPEN_PARENTH))
				continue

			/* {a b c} -> {a *b c} */
			if (a_vf[i + 2][1] & (CLOSE_BRACE | CLOSE_BRACE2)) {
				a_vf[i + 1][1] |= FL_VOICE

			/* {a b c d} -> {(a b) (c d)} */
			} else if (a_vf[i + 2][1] == 0
				&& (a_vf[i + 3][1]
					& (CLOSE_BRACE | CLOSE_BRACE2))) {
				a_vf[i][1] |= OPEN_PARENTH;
				a_vf[i + 1][1] |= CLOSE_PARENTH;
				a_vf[i + 2][1] |= OPEN_PARENTH;
				a_vf[i + 3][1] |= CLOSE_PARENTH
			}
		}
	}

	/* set the staff system */
	st = -1
	for (i = 0; i < a_vf.length; i++) {
		flags = a_vf[i][1]
		if ((flags & (OPEN_PARENTH | CLOSE_PARENTH))
				== (OPEN_PARENTH | CLOSE_PARENTH)) {
			flags &= ~(OPEN_PARENTH | CLOSE_PARENTH);
			a_vf[i][1] = flags
		}
		p_voice = a_vf[i][0]
		if (flags & FL_VOICE) {
			p_voice.floating = true;
			p_voice.second = true
		} else {
			st++;
			if (!par_sy.staves[st]) {
				par_sy.staves[st] = {
					stafflines: '|||||',
					staffscale: 1
				}
			}
			par_sy.staves[st].flags = 0
		}
		v = p_voice.v;
		p_voice.st = p_voice.cst =
				par_sy.voices[v].st = st;
		par_sy.staves[st].flags |= flags
		if (flags & OPEN_PARENTH) {
			p_voice2 = p_voice
			while (i < a_vf.length - 1) {
				p_voice = a_vf[++i][0];
				v = p_voice.v
				if (a_vf[i][1] & MASTER_VOICE) {
					p_voice2.second = true
					p_voice2 = p_voice
				} else {
					p_voice.second = true;
				}
				p_voice.st = p_voice.cst
						= par_sy.voices[v].st
						= st
				if (a_vf[i][1] & CLOSE_PARENTH)
					break
			}
			par_sy.staves[st].flags |= a_vf[i][1]
		}
	}
	if (st < 0)
		st = 0
	par_sy.nstaff = nstaff = st

	/* change the behaviour of '|' in %%score */
	if (cmd[1] == 'c') {				/* if %%score */
		for (st = 0; st < nstaff; st++)
			par_sy.staves[st].flags ^= STOP_BAR
	}

	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v]
		if (par_sy.voices[v].range < 0) {
			p_voice.ignore = true
			continue
		}
		par_sy.voices[v].second = p_voice.second;
		st = p_voice.st
		if (st > 0 && !p_voice.norepbra
		 && !(par_sy.staves[st - 1].flags & STOP_BAR))
			p_voice.norepbra = true
	}

	curvoice = parse.state >= 2 ? voice_tb[par_sy.top_voice] : null
}

var err_no_strt_ov = "No note in voice overlay"

/* -- get a voice overlay -- */
function get_vover(type) {
	var	p_voice2, p_voice3, range, s, time, v, v2, v3,
		line = parse.line

	// get a voice or create a clone of the current voice
	function clone_voice(id) {
		var v, p_voice

		for (v = 0; v < voice_tb.length; v++) {
			p_voice = voice_tb[v]
			if (p_voice.id == id)
				return p_voice		// found
		}
		p_voice = clone(curvoice);
		p_voice.v = voice_tb.length;
		p_voice.id = id;
		p_voice.sym = p_voice.last_sym = null;

		delete p_voice.nm
		delete p_voice.snm
		delete p_voice.new_name
		delete p_voice.lyric_restart
		delete p_voice.lyric_cont
		delete p_voice.ly_a_h;
		delete p_voice.sym_restart
		delete p_voice.sym_cont

		voice_tb.push(p_voice)
		return p_voice
	} // clone_voice()

	/* treat the end of overlay */
	if (curvoice.ignore)
		return
	if (type == '|'
	 || type == ')')  {
		if (!curvoice.last_note) {
			syntax(1, err_no_strt_ov)
			return
		}
		curvoice.last_note.beam_end = true
		if (!vover) {
			syntax(1, "Erroneous end of voice overlap")
			return
		}
		if (curvoice.time != vover.mxtime)
			syntax(1, "Wrong duration in voice overlay");
		curvoice = vover.p_voice;
		vover = null
		return
	}

	/* treat the full overlay start */
	if (type == '(') {
		if (vover) {
			syntax(1, "Voice overlay already started")
			return
		}
		vover = {			// no voice yet
			time: curvoice.time
		}
		return
	}

	/* (here is treated a new overlay - '&') */
	/* create the extra voice if not done yet */
	if (!curvoice.last_note) {
		syntax(1, err_no_strt_ov)
		return
	}
	curvoice.last_note.beam_end = true;
	p_voice2 = curvoice.voice_down
	if (!p_voice2) {
		p_voice2 = clone_voice(curvoice.id + 'o');
		curvoice.voice_down = p_voice2;
		p_voice2.time = 0;
		p_voice2.second = true;
		v2 = p_voice2.v;
		par_sy.voices[v2] = {
			st: curvoice.st,
			second: true
		}
		var f_clone = curvoice.clone != undefined ? 1 : 0;
		range = par_sy.voices[curvoice.v].range
		for (v = 0; v < par_sy.voices.length; v++) {
			if (par_sy.voices[v].range > range)
				par_sy.voices[v].range += f_clone + 1
		}
		par_sy.voices[v2].range = range + 1
		if (f_clone) {
			p_voice3 = clone_voice(p_voice2.id + 'c');
			p_voice3.second = true;
			v3 = p_voice3.v;
			par_sy.voices[v3] = {
				second: true,
				range: range + 2
			}
			p_voice2.clone = p_voice3
		}
	}
	p_voice2.ulen = curvoice.ulen
	p_voice2.dur_fact = curvoice.dur_fact
	if (curvoice.uscale)
		p_voice2.uscale = curvoice.uscale

	if (!vover) {				/* first '&' in a measure */
		vover = {
			bar: true,
			mxtime: curvoice.time,
			p_voice: curvoice
		}
		time = p_voice2.time
		for (s = curvoice.last_sym; /*s*/; s = s.prev) {
			if (s.type == BAR
			 || s.time <= time)	/* (if start of tune) */
				break
		}
		vover.time = s.time
	} else {
		if (!vover.p_voice) {		// first '&' in '(&' sequence
			vover.mxtime = curvoice.time;
			vover.p_voice = curvoice
		} else if (curvoice.time != vover.mxtime) {
			syntax(1, "Wrong duration in voice overlay")
		}
	}
	p_voice2.time = vover.time;
	curvoice = p_voice2
}

// check if a clef, key or time signature may go at start of the current voice
function is_voice_sig() {
	var s

	if (!curvoice.sym)
		return true	// new voice (may appear in the middle of a tune)
	if (curvoice.time != 0)
		return false
	for (s = curvoice.last_sym; s; s = s.prev)
		if (w_tb[s.type] != 0)
			return false
	return true
}

// treat a clef found in the tune body
function get_clef(s) {
	var	s2, s3

	if (is_voice_sig()) {
		curvoice.clef = s
		return
	}

	// clef change
	/* the clef must appear before a key signature or a bar */
	for (s2 = curvoice.last_sym;
	     s2 && s2.prev && s2.time == curvoice.time;
	     s2 = s2.prev) {
		if (w_tb[s2.type] != 0)
			break
	}
	if (s2 && s2.prev
	 && s2.time == curvoice.time		// if no time skip
	 && ((s2.type == KEY && !s2.k_none) || s2.type == BAR)) {
		for (s3 = s2; s3.prev; s3 = s3.prev) {
			switch (s3.prev.type) {
			case KEY:
			case BAR:
				continue
			}
			break
		}
		s2 = curvoice.last_sym;
		curvoice.last_sym = s3.prev;
		sym_link(s);
		s.next = s3;
		s3.prev = s;
		curvoice.last_sym = s2
	} else {
		sym_link(s)
	}
	s.clef_small = true
}

// treat K: (kp = key signature + parameters)
function get_key(parm) {
	var	v, p_voice, s, transp,
//		[s_key, a] = new_key(parm)	// KO with nodejs
		a = new_key(parm),
		s_key = a[0];

	a = a[1]
	if (s_key.k_sf
	 && !s_key.k_exp
	 && s_key.k_a_acc)
		set_k_acc(s_key)

	switch (parse.state) {
	case 1:				// in tune header (first K:)
		if (s_key.k_sf == undefined && !s_key.k_a_acc) { // empty K:
			s_key.k_sf = 0;
			s_key.k_none = true
		}
		for (v = 0; v < voice_tb.length; v++) {
			p_voice = voice_tb[v];
			p_voice.key = clone(s_key);
			p_voice.okey = clone(s_key);
			p_voice.ckey = clone(s_key)
		}
		parse.okey = clone(s_key);
		parse.ckey = s_key
		if (a.length != 0)
			memo_kv_parm('*', a)
		if (!glovar.ulen)
			glovar.ulen = BASE_LEN / 8;
		parse.state = 2;		// in tune header after K:

		set_page();
		write_heading();
		reset_gen();
		gene.nbar = cfmt.measurefirst	// measure numbering
		return
	case 2:					// K: at start of tune body
		goto_tune(true)
		break
	}
	if (a.length != 0)
		set_kv_parm(a);

	transp = (cfmt.transp || 0) +
		(curvoice.transp || 0) +
		(curvoice.shift || 0)

	if (s_key.k_sf == undefined) {
		if (!s_key.k_a_acc
		 && !transp)
			return
		s_key.k_sf = curvoice.okey.k_sf
	}

	curvoice.okey = clone(s_key)
	if (transp) {
		curvoice.vtransp = transp;
		key_transp(s_key)
	}

	s_key.k_old_sf = curvoice.ckey.k_sf;	// memorize the key changes

	curvoice.ckey = s_key

	if (is_voice_sig()) {
		curvoice.key = clone(s_key)
		if (s_key.k_none)
			curvoice.key.k_sf = 0
		return
	}

	/* the key signature must appear before a time signature */
	s = curvoice.last_sym
	if (s && s.type == METER) {
		curvoice.last_sym = s.prev
		if (!curvoice.last_sym)
			curvoice.sym = null;
		sym_link(s_key);
		s_key.next = s;
		s.prev = s_key;
		curvoice.last_sym = s
	} else {
		sym_link(s_key)
	}
}

// get / create a new voice
function new_voice(id) {
	var	p_voice, v, p_v_sav,
		n = voice_tb.length

	// if first explicit voice and no music, replace the default V:1
	if (n == 1
	 && voice_tb[0].default) {
		delete voice_tb[0].default
		if (voice_tb[0].time == 0) {
			p_voice = voice_tb[0];
			p_voice.id = id
			if (cfmt.transp	// != undefined
			 && parse.state >= 2) {
				p_v_sav = curvoice;
				curvoice = p_voice;
				set_transp();
				curvoice = p_v_sav
			}
			return p_voice		// default voice
		}
	}
	for (v = 0; v < n; v++) {
		p_voice = voice_tb[v]
		if (p_voice.id == id)
			return p_voice		// old voice
	}

	p_voice = {
		v: v,
		id: id,
		time: 0,
		new: true,
		pos: {
			dyn: 0,
			gch: 0,
			gst: 0,
			orn: 0,
			stm: 0,
			voc: 0,
			vol: 0
		},
		scale: 1,
		combine: 0,
//		st: 0,
//		cst: 0,
		ulen: glovar.ulen,
		dur_fact: 1,
		key: clone(parse.ckey),
		ckey: clone(parse.ckey),
		okey: clone(parse.okey),
		meter: clone(glovar.meter),
		wmeasure: glovar.meter.wmeasure,
		clef: {
			type: CLEF,
			clef_auto: true,
			clef_type: "a",		// auto
			time: 0
		},
		hy_st: 0,
		instr: glovar.instr || 0	// MIDI instrument
	}

	voice_tb.push(p_voice);

	par_sy.voices[v] = {
		range: -1
	}

	return p_voice
}

// this function is called at program start and on end of tune
function init_tune() {
	nstaff = -1;
	voice_tb = [];
	curvoice = null;
	new_syst(true);
	staves_found = -1;
	gene = {}
	a_de = []			// remove old decorations
	od = {}				// no ottava decorations anymore
	if (capo)
		capo = false
}

// treat a 'V:' info
function get_voice(parm) {
	var	v, transp, vtransp,
		a = info_split(parm, 1),
		vid = a.shift();

	if (parse.state < 2) {
		if (a.length != 0)
			memo_kv_parm(vid, a)
		if (vid != '*' && parse.state == 1)
			new_voice(vid)
		return
	}

	if (vid == '*') {
		syntax(1, "Cannot have V:* in tune body")
		return
	}
	curvoice = new_voice(vid);
	set_kv_parm(a)
	if (parse.state == 2)			// if first voice
		goto_tune();
	set_transp();

	v = curvoice.v
	if (curvoice.new) {			// if new voice
		delete curvoice.new
		if (staves_found < 0) {		// if no %%score/%%staves
			curvoice.st = curvoice.cst = ++nstaff;
			par_sy.nstaff = nstaff;
			par_sy.voices[v].st = nstaff;
			par_sy.voices[v].range = v;
			par_sy.staves[nstaff] = {
				stafflines: "|||||",
				staffscale: 1
			}
		}
	
		if (par_sy.voices[v].range < 0) {
//			if (cfmt.alignbars)
//				syntax(1, "V: does not work with %%alignbars")
			if (staves_found >= 0)
				curvoice.ignore = true
		}
	}

	if (!curvoice.filtered
	 && !curvoice.ignore
	 && parse.voice_opts) {
		curvoice.filtered = true;
		voice_filter()
	}
}

// change state from 'tune header after K:' to 'in tune body'
// curvoice is defined when called from get_voice()
function goto_tune(is_K) {
	var	v, p_voice,
		s = {
			type: STAVES,
			dur: 0,
			sy: par_sy
		}

	parse.state = 3;			// in tune body

	// if no voice yet, create the default voice
	if (voice_tb.length == 0) {
		curvoice = new_voice("1");
		curvoice.clef.istart = curvoice.key.istart;
		curvoice.clef.iend = curvoice.key.iend;
//		nstaff = 0;
		curvoice.default = true
	} else if (!curvoice) {
		curvoice = voice_tb[staves_found < 0 ? 0 : par_sy.top_voice]
	}

	if (!curvoice.init && !is_K) {
		set_kv_parm([]);
		set_transp()
	}

	// update some voice parameters
	for (v = 0; v < voice_tb.length; v++) {
		p_voice = voice_tb[v];
		p_voice.ulen = glovar.ulen
		if (p_voice.key.k_bagpipe
		 && !p_voice.pos.stm) {
			p_voice.pos = clone(p_voice.pos);
			p_voice.pos.stm = SL_BELOW
		}
	}

	// initialize the voices when no %%staves/score	
	if (staves_found < 0) {
		nstaff = voice_tb.length - 1
		for (v = 0; v <= nstaff; v++) {
			p_voice = voice_tb[v];
			delete p_voice.new;		// old voice
			p_voice.st = p_voice.cst =
				par_sy.voices[v].st =
					par_sy.voices[v].range = v;
			par_sy.staves[v] = {
				stafflines: '|||||',
				staffscale: 1
			}
		}
		par_sy.nstaff = nstaff
	}

	// link the first %%score in the top voice
	p_voice = curvoice;
	curvoice = voice_tb[par_sy.top_voice];
	sym_link(s)
	if (staves_found < 0)
		s.default = true;
	curvoice = p_voice
}
// abc2svg - lyrics.js - lyrics
//
// Copyright (C) 2014-2017 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

// parse a symbol line (s:)
function get_sym(p, cont) {
	var s, c, i, j, d

	if (curvoice.ignore)
		return

	// get the starting symbol of the lyrics
	if (cont) {					// +:
		s = curvoice.sym_cont
		if (!s) {
			syntax(1, "+: symbol line without music")
			return
		}
	} else {
		if (curvoice.sym_restart) {		// new music
			curvoice.sym_start = s = curvoice.sym_restart;
			curvoice.sym_restart = null
		} else {
			s = curvoice.sym_start
		}
		if (!s)
			s = curvoice.sym
		if (!s) {
			syntax(1, "s: without music")
			return
		}
	}

	/* scan the symbol line */
	i = 0
	while (1) {
		while (p[i] == ' ' || p[i] == '\t')
			i++;
		c = p[i]
		if (!c)
			break
		switch (c) {
		case '|':
			while (s && s.type != BAR)
				s = s.next
			if (!s) {
				syntax(1, "Not enough measure bars for symbol line")
				return
			}
			s = s.next;
			i++
			continue
		case '!':
		case '"':
			j = ++i
			i = p.indexOf(c, j)
			if (i < 0) {
				syntax(1, c == '!' ?
					"No end of decoration" :
					"No end of guitar chord");
				i = p.length
				continue
			}
			d = p.slice(j - 1, i + 1)
			break
		case '*':
			break
		default:
			d = c.charCodeAt(0)
			if (d < 128) {
				d = char_tb[d]
				if (d.length > 1
				 && (d[0] == '!' || d[0] == '"')) {
					c = d[0]
					break
				}
			}
			syntax(1, "Bad character '$1'", c)
			break
		}

		/* store the element in the next note */
		while (s && (s.type != NOTE || s.grace))
			s = s.next
		if (!s) {
			syntax(1, "Too many elements in symbol line")
			return
		}
		switch (c) {
		default:
//		case '*':
			break
		case '!':
			deco_cnv([d.slice(1, -1)], s, s.prev)
			break
		case '"':
			a_gch = s.a_gch;
			parse_gchord(d)
			if (a_gch)
				gch_build(s)
			break
		}
		s = s.next;
		i++
	}
	curvoice.lyric_cont = s
}

/* -- parse a lyric (vocal) line (w:) -- */
function get_lyrics(text, cont) {
	var s, word, p, i, j, ly

	if (curvoice.ignore)
		return
	if (curvoice.pos.voc != SL_HIDDEN)
		curvoice.have_ly = true

	// get the starting symbol of the lyrics
	if (cont) {					// +:
		s = curvoice.lyric_cont
		if (!s) {
			syntax(1, "+: lyric without music")
			return
		}
	} else {
		set_font("vocal")
		if (curvoice.lyric_restart) {		// new music
			curvoice.lyric_start = s = curvoice.lyric_restart;
			curvoice.lyric_restart = null;
			curvoice.lyric_line = 0
		} else {
			curvoice.lyric_line++;
			s = curvoice.lyric_start
		}
		if (!s)
			s = curvoice.sym
		if (!s) {
			syntax(1, "w: without music")
			return
		}
	}

	/* scan the lyric line */
	p = text;
	i = 0
	while (1) {
		while (p[i] == ' ' || p[i] == '\t')
			i++
		if (!p[i])
			break
		j = parse.istart + i + 2	// start index
		switch (p[i]) { 
		case '|':
			while (s && s.type != BAR)
				s = s.next
			if (!s) {
				syntax(1, "Not enough measure bars for lyric line")
				return
			}
			s = s.next;
			i++
			continue
		case '-':
			word = "-\n"
			break
		case '_':
			word = "_\n"
			break
		case '*':
			word = ""
			break
		default:
			if (p[i] == '\\'
			 && i == p.length - 1) {
				curvoice.lyric_cont = s
				return
			}
			word = "";
			while (1) {
				if (!p[i])
					break
				switch (p[i]) {
				case '_':
				case '*':
				case '|':
					i--
				case ' ':
				case '\t':
					break
				case '~':
					word += ' ';
					i++
					continue
				case '-':
					word += "\n"
					break
				case '\\':
					word += p[++i];
					i++
					continue
				default:
					word += p[i++]
					continue
				}
				break
			}
			break
		}

		/* store the word in the next note */
		while (s && (s.type != NOTE || s.grace))
			s = s.next
		if (!s) {
			syntax(1, "Too many words in lyric line")
			return
		}
		if (word
		 && s.pos.voc != SL_HIDDEN) {
			if (word.match(/^\$\d/)) {
				if (word[1] == '0')
					set_font("vocal")
				else
					set_font("u" + word[1]);
				word = word.slice(2)
			}
			ly = {
				t: word,
				font: gene.curfont,
				w: strw(word),
				istart: j,
				iend: j + word.length
			}
			if (!s.a_ly)
				s.a_ly = []
			s.a_ly[curvoice.lyric_line] = ly
		}
		s = s.next;
		i++
	}
	curvoice.lyric_cont = s
}

// -- set the width needed by the lyrics --
// (called once per tune)
function ly_width(s, wlw) {
	var	ly, sz, swfac, align, xx, w, i, j, k, shift, p,
		a_ly = s.a_ly;

	align = 0
	for (i = 0; i < a_ly.length; i++) {
		ly = a_ly[i]
		if (!ly)
			continue
		p = ly.t;
		w = ly.w;
		swfac = ly.font.swfac;
		xx = w + 2 * cwid(' ') * swfac
		if (s.type == GRACE) {			// %%graceword
			shift = s.wl
		} else if ((p[0] >= '0' && p[0] <= '9' && p.length > 2)
		 || p[1] == ':'
		 || p[0] == '(' || p[0] == ')') {
			if (p[0] == '(') {
				sz = cwid('(') * swfac
			} else {
				j = p.indexOf(' ');
				gene.curfont = gene.deffont = ly.font
				if (j > 0)
					sz = strw(p.slice(0, j))
				else
					sz = w
			}
			shift = (w - sz + 2 * cwid(' ') * swfac) * .4
			if (shift > 20)
				shift = 20;
			shift += sz
			if (ly.t[0] >= '0' && ly.t[0] <= '9') {
				if (shift > align)
					align = shift
			}
		} else if (p == "-\n" || p == "_\n") {
			shift = 0
		} else {
			shift = xx * .4
			if (shift > 20)
				shift = 20
		}
		ly.shift = shift
		if (wlw < shift)
			wlw = shift;
//		if (p[p.length - 1] == "\n")		// if "xx-"
//			xx -= cwid(' ') * swfac
		xx -= shift;
		shift = 2 * cwid(' ') * swfac
		for (k = s.next; k; k = k.next) {
			switch (k.type) {
			case NOTE:
			case REST:
				if (!k.a_ly || !k.a_ly[i]
				 || k.a_ly[i].w == 0)
					xx -= 9
				else if (k.a_ly[i].t == "-\n"
				      || k.a_ly[i].t == "_\n")
					xx -= shift
				else
					break
				if (xx <= 0)
					break
				continue
			case CLEF:
			case METER:
			case KEY:
				xx -= 10
				continue
			default:
				xx -= 5
				break
			}
			break
		}
		if (xx > s.wr)
			s.wr = xx
	}
	if (align > 0) {
		for (i = 0; i < a_ly.length; i++) {
			ly = a_ly[i]
			if (ly && ly.t[0] >= '0' && ly.t[0] <= '9')
				ly.shift = align
		}
	}
	return wlw
}

/* -- draw the lyrics under (or above) notes -- */
/* (the staves are not yet defined) */
/* !! this routine is tied to ly_width() !! */
function draw_lyric_line(p_voice, j, y) {
	var	l, p, lastx, w, s, s2, f, ly, lyl,
		hyflag, lflag, x0, font, shift, desc

	if (p_voice.hy_st & (1 << j)) {
		hyflag = true;
		p_voice.hy_st &= ~(1 << j)
	}
	for (s = p_voice.sym; /*s*/; s = s.next)
		if (s.type != CLEF
		 && s.type != KEY && s.type != METER)
			break
	lastx = s.prev ? s.prev.x : tsfirst.x;
	x0 = 0
	for ( ; s; s = s.next) {
		if (s.a_ly)
			ly = s.a_ly[j]
		else
			ly = null
		if (!ly) {
			switch (s.type) {
			case REST:
			case MREST:
				if (lflag) {
					out_wln(lastx + 3, y, x0 - lastx);
					lflag = false;
					lastx = s.x + s.wr
				}
			}
			continue
		}
		if (ly.font != gene.curfont)		/* font change */
			gene.curfont = font = ly.font;
		p = ly.t;
		w = ly.w;
		shift = ly.shift
		if (hyflag) {
			if (p == "_\n") {		/* '_' */
				p = "-\n"
			} else if (p != "-\n") {	/* not '-' */
				out_hyph(lastx, y, s.x - shift - lastx);
				hyflag = false;
				lastx = s.x + s.wr
			}
		}
		if (lflag
		 && p != "_\n") {		/* not '_' */
			out_wln(lastx + 3, y, x0 - lastx + 3);
			lflag = false;
			lastx = s.x + s.wr
		}
		if (p == "-\n"			/* '-' */
		 || p == "_\n") {		/* '_' */
			if (x0 == 0 && lastx > s.x - 18)
				lastx = s.x - 18
			if (p[0] == '-')
				hyflag = true
			else
				lflag = true;
			x0 = s.x - shift
			continue
		}
		x0 = s.x - shift;
		if (p.slice(-1) == '\n') {
			p = p.slice(0, -1);	/* '-' at end */
			hyflag = true
		}
		if (user.anno_start || user.anno_stop) {
			s2 = {
				st: s.st,
				istart: ly.istart,
				iend: ly.iend,
				x: x0,
				y: y,
				ymn: y,
				ymx: y + gene.curfont.size,
				wl: 0,
				wr: w
			}
			anno_start(s2, 'lyrics')
		}
		xy_str(x0, y, p);
		anno_stop(s2, 'lyrics')
		lastx = x0 + w
	}
	if (hyflag) {
		hyflag = false;
		x0 = realwidth - 10
		if (x0 < lastx + 10)
			x0 = lastx + 10;
		out_hyph(lastx, y, x0 - lastx)
		if (cfmt.hyphencont)
			p_voice.hy_st |= (1 << j)
	}

	/* see if any underscore in the next line */
	for (p_voice.s_next ; s; s = s.next) {
		if (s.type == NOTE) {
			if (!s.a_ly)
				break
			ly = s.a_ly[j]
			if (ly && ly.t == "_\n") {
				lflag = true;
				x0 = realwidth - 15
				if (x0 < lastx + 12)
					x0 = lastx + 12
			}
			break
		}
	}
	if (lflag) {
		out_wln(lastx + 3, y, x0 - lastx + 3);
		lflag = false
	}
}

function draw_lyrics(p_voice, nly, a_h, y,
				incr) {	/* 1: below, -1: above */
	var	j, top,
		sc = staff_tb[p_voice.st].staffscale;

	set_font("vocal")
	if (incr > 0) {				/* under the staff */
		if (y > -cfmt.vocalspace)
			y = -cfmt.vocalspace;
		y += a_h[0] / 6;		// descent
		y *= sc
		for (j = 0; j < nly; j++) {
			y -= a_h[j] * 1.1;
			draw_lyric_line(p_voice, j, y)
		}
		return (y - a_h[j - 1] / 6) / sc
	}

	/* above the staff */
	top = staff_tb[p_voice.st].topbar + cfmt.vocalspace
	if (y < top)
		y = top;
	y += a_h[nly - 1] / 6;			// descent
	y *= sc
	for (j = nly; --j >= 0;) {
		draw_lyric_line(p_voice, j, y);
		y += a_h[j] * 1.1
	}
	return y / sc
}

// -- draw all the lyrics --
/* (the staves are not yet defined) */
function draw_all_lyrics() {
	var	p_voice, s, v, nly, i, x, y, w, a_ly, ly,
		lyst_tb = new Array(nstaff),
		nv = voice_tb.length,
		h_tb = new Array(nv),
		nly_tb = new Array(nv),
		above_tb = new Array(nv),
		rv_tb = new Array(nv),
		top = 0,
		bot = 0,
		st = -1

	/* compute the number of lyrics per voice - staff
	 * and their y offset on the staff */
	for (v = 0; v < nv; v++) {
		p_voice = voice_tb[v]
		if (!p_voice.sym)
			continue
		if (p_voice.st != st) {
			top = 0;
			bot = 0;
			st = p_voice.st
		}
		nly = 0
		if (p_voice.have_ly) {
			if (!h_tb[v])
				h_tb[v] = []
			for (s = p_voice.sym; s; s = s.next) {
				a_ly = s.a_ly
				if (!a_ly)
					continue
/*fixme:should get the real width*/
				x = s.x;
				w = 10
				for (i = 0; i < a_ly.length; i++) {
					ly = a_ly[i]
					if (ly && ly.w != 0) {
						x -= ly.shift;
						w = ly.w
						break
					}
				}
				y = y_get(p_voice.st, 1, x, w)
				if (top < y)
					top = y;
				y = y_get(p_voice.st, 0, x, w)
				if (bot > y)
					bot = y
				while (nly < a_ly.length)
					h_tb[v][nly++] = 0
				for (i = 0; i < a_ly.length; i++) {
					ly = a_ly[i]
					if (!ly)
						continue
					if (!h_tb[v][i]
					 || ly.font.size > h_tb[v][i])
						h_tb[v][i] = ly.font.size
				}
			}
		} else {
			y = y_get(p_voice.st, 1, 0, realwidth)
			if (top < y)
				top = y;
			y = y_get(p_voice.st, 0, 0, realwidth)
			if (bot > y)
				bot = y
		}
		if (!lyst_tb[st])
			lyst_tb[st] = {}
		lyst_tb[st].top = top;
		lyst_tb[st].bot = bot;
		nly_tb[v] = nly
		if (nly == 0)
			continue
		if (p_voice.pos.voc)
			above_tb[v] = p_voice.pos.voc == SL_ABOVE
		else if (voice_tb[v + 1]
/*fixme:%%staves:KO - find an other way..*/
		      && voice_tb[v + 1].st == st
		      && voice_tb[v + 1].have_ly)
			above_tb[v] = true
		else
			above_tb[v] = false
		if (above_tb[v])
			lyst_tb[st].a = true
		else
			lyst_tb[st].b = true
	}

	/* draw the lyrics under the staves */
	i = 0
	for (v = 0; v < nv; v++) {
		p_voice = voice_tb[v]
		if (!p_voice.sym)
			continue
		if (!p_voice.have_ly)
			continue
		if (above_tb[v]) {
			rv_tb[i++] = v
			continue
		}
		st = p_voice.st;
// don't scale the lyrics
		set_dscale(st, true)
		if (nly_tb[v] > 0)
			lyst_tb[st].bot = draw_lyrics(p_voice, nly_tb[v],
							h_tb[v],
							lyst_tb[st].bot, 1)
	}

	/* draw the lyrics above the staff */
	while (--i >= 0) {
		v = rv_tb[i];
		p_voice = voice_tb[v];
		st = p_voice.st;
		set_dscale(st, true);
		lyst_tb[st].top = draw_lyrics(p_voice, nly_tb[v],
						h_tb[v],
						lyst_tb[st].top, -1)
	}

	/* set the max y offsets of all symbols */
	for (v = 0; v < nv; v++) {
		p_voice = voice_tb[v]
		if (!p_voice.sym)
			continue
		st = p_voice.st;
		if (lyst_tb[st].a) {
			top = lyst_tb[st].top + 2
			for (s = p_voice.sym.next; s; s = s.next) {
/*fixme: may have lyrics crossing a next symbol*/
				if (s.a_ly) {
/*fixme:should set the real width*/
					y_set(st, 1, s.x - 2, 10, top)
				}
			}
		}
		if (lyst_tb[st].b) {
			bot = lyst_tb[st].bot - 2
			if (nly_tb[p_voice.v] > 0) {
				for (s = p_voice.sym.next; s; s = s.next) {
					if (s.a_ly) {
/*fixme:should set the real width*/
						y_set(st, 0, s.x - 2, 10, bot)
					}
				}
			} else {
				y_set(st, 0, 0, realwidth, bot)
			}
		}
	}
}
// abc2svg - gchord.js - chord symbols
//
// Copyright (C) 2014-2018 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

var	capo			// capo indication

// -- parse a chord symbol / annotation --
// the result is added in the global variable a_gch
// 'type' may be a single '"' or a string '"xxx"' created by U:
function parse_gchord(type) {
	var	c, text, gch, x_abs, y_abs, type,
		i, istart, iend,
		ann_font = get_font("annotation"),
		h_ann = ann_font.size,
		line = parse.line

	function get_float() {
		var txt = ''

		while (1) {
			c = text[i++]
			if ("1234567890.-".indexOf(c) < 0)
				return parseFloat(txt)
			txt += c
		}
	} // get_float()

	istart = parse.bol + line.index
	if (type.length > 1) {			// U:
		text = type.slice(1, -1);
		iend = istart + 1
	} else {
		text = ""
		while (1) {
			c = line.next_char()
			if (!c) {
				syntax(1, "No end of guitar chord")
				return
			}
			if (c == '"')
				break
			if (c == '\\') {
				text += c;
				c = line.next_char()
			}
			text += c
		}
		iend = parse.bol + line.index + 1
	}

	if (curvoice.pos.gch == SL_HIDDEN)
		return

	i = 0;
	type = 'g'
	while (1) {
		c = text[i]
		if (!c)
			break
		gch = {
			text: "",
			istart: istart,
			iend: iend,
		}
		switch (c) {
		case '@':
			type = c;
			i++;
			x_abs = get_float()
			if (c != ',') {
				syntax(1, "',' lacking in annotation '@x,y'");
				y_abs = 0
			} else {
				y_abs = get_float()
				if (c != ' ')
					i--
			}
			gch.x = x_abs;
			gch.y = y_abs - h_ann / 2
			break
		case '^':
		case '_':
		case '<':
		case '>':
			i++;
			type = c
			break
		}
		gch.type = type
		while (1) {
			c = text[i]
			if (!c)
				break
			switch (c) {
			case '\\':
				c = text[++i]
				if (!c || c == 'n')
					break
				gch.text += '\\'
			default:
				gch.text += c;
				i++
				continue
			case '&':			/* skip "&xxx;" */
				while (1) {
					gch.text += c;
					c = text[++i]
					switch (c) {
					default:
						continue
					case ';':
					case undefined:
					case '\\':
						break
					}
					break
				}
				if (c == ';') {
					gch.text += c
					continue
				}
				break
			case ';':
				break
			}
			i++
			break
		}
		if (!a_gch)
			a_gch = []
		a_gch.push(gch)
	}
}

// create the guitar chords with capo
function gch_capo(s) {
    var	gch, gch2, i2,
	i = 0

	while (1) {
		gch = s.a_gch[i++]
		if (!gch)
			return
		if (gch.type == 'g')
			break
	}
	gch2 = clone(gch);
	gch2.text = gch_tr1(gch2.text, -cfmt.capo)
	if (!capo) {
		capo = true;
		gch2.text += "  (capo: " + cfmt.capo.toString() + ")";
	}
	gch2.type = "^";		// capo as annotation
	s.a_gch.splice(i, 0, gch2)
}

// transpose a chord symbol
var	note_names = "CDEFGAB",
	latin_names = [ "Do", "Ré", "Mi", "Fa", "Sol", "La", "Si" ],
	acc_name = ["bb", "b", "", "#", "##"],
	note_pit = new Int8Array([0, 2, 4, 5, 7, 9, 11]),
	pit_note = new Int8Array([0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6]),
	pit_acc = new Int8Array([2, 3, 2, 1, 2, 2, 3, 2, 1, 2, 1, 2])

	function gch_tr1(p, i2) {
		var	new_txt, l,
			n, i1, i3, i4, ix, a, ip, ip2,
			latin = 0

		/* main chord */
		switch (p[0]) {
		case 'A': n = 5; break
		case 'B': n = 6; break
		case 'C': n = 0; break
		case 'D':
			if (p[1] == 'o') {
				latin++;
				n = 0		/* Do */
				break
			}
			n = 1
			break
		case 'E': n = 2; break
		case 'F':
			if (p[1] == 'a')
				latin++;	/* Fa */
			n = 3
			break
		case 'G': n = 4; break
		case 'L':
			latin++;		/* La */
			n = 5
			break
		case 'M':
			latin++;		/* Mi */
			n = 2
			break
		case 'R':
			latin++
			if (p[1] != 'e')
				latin++;	/* Ré */
			n = 1			/* Re */
			break
		case 'S':
			latin++
			if (p[1] == 'o') {
				latin++;
				n = 4		/* Sol */
			} else {
				n = 6		/* Si */
			}
			break
		case '/':			// bass only
			latin--
			break
		default:
			return p
		}

		a = 0;
		ip = latin + 1
		if (latin >= 0) {		// if some chord
			while (p[ip] == '#') {
				a++;
				ip++
			}
			while (p[ip] == 'b') {
				a--;
				ip++
			}
//			if (p[ip] == '=')
//				ip++
			i3 = (note_pit[n] + a + i2 + 12) % 12;
			i4 = pit_note[i3];
			i1 = pit_acc[i3];
			new_txt = (latin ? latin_names[i4] : note_names[i4]) +
					acc_name[i1]
		} else {
			new_txt = ''
		}

		ip2 = p.indexOf('/', ip)	// skip 'm'/'dim'..
		if (ip2 < 0)
			return new_txt + p.slice(ip);

		/* bass */
		n = note_names.indexOf(p[++ip2])
		if (n < 0)
			return new_txt + p.slice(ip);
//fixme: latin names not treated
		new_txt += p.slice(ip, ip2);
		a = 0
		if (p[++ip2] == '#') {
			a++
			if (p[++ip2] == '#') {
				a++;
				ip2++
			}
		} else if (p[ip2] == 'b') {
			a--
			if (p[++ip2] == 'b') {
				a--;
				ip2++
			}
		}
		i3 = (note_pit[n] + a + i2 + 12) % 12;
		i4 = pit_note[i3];
		i1 = pit_acc[i3]
		return new_txt + note_names[i4] + acc_name[i1] + p.slice(ip2)
	} // get_tr1

function gch_transp(s) {
	var	gch, p, j,
		i = 0,
		i2 = ((curvoice.ckey.k_sf - curvoice.okey.k_sf + 12) * 7) % 12

	while (1) {
		gch = s.a_gch[i++]
		if (!gch)
			return
		if (gch.type != 'g')
			continue
		p = gch.text;
		j = p.indexOf('\t')
		if (j >= 0) {
			j++;
			p = p.slice(0, j) + gch_tr1(p.slice(j), i2)
		}
		gch.text = gch_tr1(p, i2)
	}
}

// -- build the chord indications / annotations --
function gch_build(s) {

	/* split the chord indications / annotations
	 * and initialize their vertical offsets */
	var	gch, w, xspc, ix,
		pos = curvoice.pos.gch == SL_BELOW ? -1 : 1,
		gch_font = get_font("gchord"),
		ann_font = get_font("annotation"),
		y_above = 0,
		y_below = 0,
		y_left = 0,
		y_right = 0,
		h_gch = gch_font.size,
		h_ann = ann_font.size,
		box = cfmt.gchordbox,
		GCHPRE = .4;		// portion of chord before note

	s.a_gch = a_gch;
	a_gch = null

	if (cfmt.capo)
		gch_capo(s)
	if (curvoice.vtransp)
		gch_transp(s)

	// change the accidentals in the chord symbols,
	// convert the escape sequences in annotations, and
	// set the offsets
	for (ix = 0; ix < s.a_gch.length; ix++) {
		gch = s.a_gch[ix]
		if (gch.type == 'g') {
			if (cfmt.chordnames) {
				gch.text = gch.text.replace(/A|B|C|D|E|F|G/g,
					function(c){return cfmt.chordnames[c]})
				if (cfmt.chordnames.B == 'H')
					gch.text = gch.text.replace(/Hb/g, 'Bb')
			}
			gch.text = gch.text.replace(/##|#|=|bb|b/g,
				function(x) {
					switch (x) {
					case '##': return "&#x1d12a;"
					case '#': return "\u266f"
					case '=': return "\u266e"
					case 'b': return "\u266d"
					}
					return "&#x1d12b;"
				});
			gch.font = gch_font
		} else {
			gch.text = cnv_escape(gch.text);
			gch.font = ann_font
			if (gch.type == '@' && !user.anno_start)
				continue		/* no width */
		}

		/* set the offsets and widths */
		gene.curfont = gch.font;
		w = strw(gch.text);
		gch.w = w //+ 4
		switch (gch.type) {
		case '@':
			break
		case '^':			/* above */
			xspc = w * GCHPRE
			if (xspc > 8)
				xspc = 8;
			gch.x = -xspc;
			y_above -= h_ann;
			gch.y = y_above
			break
		case '_':			/* below */
			xspc = w * GCHPRE
			if (xspc > 8)
				xspc = 8;
			gch.x = -xspc;
			y_below -= h_ann;
			gch.y = y_below
			break
		case '<':			/* left */
			gch.x = -(w + 6);
			y_left -= h_ann;
			gch.y = y_left + h_ann / 2
			break
		case '>':			/* right */
			gch.x = 6;
			y_right -= h_ann;
			gch.y = y_right + h_ann / 2
			break
		default:			// chord symbol
			gch.box = box
			xspc = w * GCHPRE
			if (xspc > 8)
				xspc = 8;
			gch.x = -xspc;
			if (pos < 0) {		/* below */
				y_below -= h_gch;
				gch.y = y_below
				if (box) {
					y_below -= 2;
					gch.y -= 1
				}
			} else {
				y_above -= h_gch;
				gch.y = y_above
				if (box) {
					y_above -= 2;
					gch.y -= 1
				}
			}
			break
		}
	}

	/* move upwards the top and middle texts */
	y_left /= 2;
	y_right /= 2
	for (ix = 0; ix < s.a_gch.length; ix++) {
		gch = s.a_gch[ix]
		switch (gch.type) {
		case '^':			/* above */
			gch.y -= y_above
			break
		case '<':			/* left */
			gch.y -= y_left
			break
		case '>':			/* right */
			gch.y -= y_right
			break
		case 'g':			// chord symbol
			if (pos > 0)
				gch.y -= y_above
			break
		}
	}
}

// -- draw the chord symbols and annotations
// (the staves are not yet defined)
// (unscaled delayed output)
function draw_gchord(s, gchy_min, gchy_max) {
	var	gch, gch2, text, ix, x, y, y2, i, j, hbox, h

	// adjust the vertical offset according to the chord symbols
//fixme: w may be too small
	var	w = s.a_gch[0].w,
		y_above = y_get(s.st, 1, s.x - 2, w),
		y_below = y_get(s.st, 0, s.x - 2, w),
		yav = (((s.notes[s.nhd].pit + s.notes[0].pit) >> 1) - 18) * 3

	for (ix = 0; ix < s.a_gch.length; ix++) {
		gch = s.a_gch[ix]
		if (gch.type != 'g')
			continue
		gch2 = gch		// chord symbol closest to the staff
		if (gch.y < 0)
			break
	}
	if (gch2) {
		if (gch2.y >= 0) {
			if (y_above < gchy_max)
				y_above = gchy_max
		} else {
			if (y_below > gchy_min)
				y_below = gchy_min
		}
	}

	set_dscale(s.st);
	for (ix = 0; ix < s.a_gch.length; ix++) {
		gch = s.a_gch[ix];
		use_font(gch.font);
		gene.curfont = gene.deffont = gch.font;
		h = gch.font.size;
		w = gch.w;
		x = s.x + gch.x;
		text = gch.text
		switch (gch.type) {
		case '_':			/* below */
			y = gch.y + y_below;
			y_set(s.st, 0, x, w, y - h * .2 - 2)
			break
		case '^':			/* above */
			y = gch.y + y_above;
			y_set(s.st, 1, x, w, y + h * .8 + 2)
			break
		case '<':			/* left */
/*fixme: what symbol space?*/
			if (s.notes[0].acc)
				x -= s.notes[0].shac;
			y = gch.y + yav - h / 2
			break
		case '>':			/* right */
			x += s.xmx
			if (s.dots > 0)
				x += 1.5 + 3.5 * s.dots;
			y = gch.y + yav - h / 2
			break
		default:			// chord symbol
			hbox = gch.box ? 3 : 2
			if (gch.y >= 0) {
				y = gch.y + y_above;
				y_set(s.st, true, x, w, y + h + hbox)
			} else {
				y = gch.y + y_below;
				y_set(s.st, false, x, w, y - hbox)
			}
			i = text.indexOf('\t')

			// if some TAB: expand the chord symbol
			if (i >= 0) {
				x = realwidth
				for (var next = s.next; next; next = next.next) {
					switch (next.type) {
					default:
						continue
					case NOTE:
					case REST:
					case BAR:
						x = next.x
						break
					}
					break
				}
				j = 2
				for (;;) {
					i = text.indexOf('\t', i + 1)
					if (i < 0)
						break
					j++
				}
				var expdx = (x - s.x) / j;

				x = s.x;
				y *= staff_tb[s.st].staffscale
				if (user.anno_start)
					user.anno_start("gchord", gch.istart, gch.iend,
						x - 2, y + h + 2, w + 4, h + 4, s)
				i = 0;
				j = i;
				for (;;) {
					i = text.indexOf('\t', j)
					if (i < 0)
						break
					xy_str(x, y + h * .2,
							text.slice(j, i), 'c');
					x += expdx;
					j = i + 1
				}
				xy_str(x, y + h * .2, text.slice(j), 'c')
				if (user.anno_stop)
					user.anno_stop("gchord", gch.istart, gch.iend,
						s.x - 2, y + h + 2, w + 4, h + 4, s)
				continue
			}
			break
		case '@':			/* absolute */
			y = gch.y + yav
			if (y > 0) {
				y2 = y + h
				if (y2 > staff_tb[s.st].ann_top)
					staff_tb[s.st].ann_top = y2
			} else {
				if (y < staff_tb[s.st].ann_bot)
					staff_tb[s.st].ann_bot = y
			}
			break
		}
		if (user.anno_start)
			user.anno_start("annot", gch.istart, gch.iend,
				x - 2, y + h + 2, w + 4, h + 4, s)
		if (gch.box)
			xy_str_b(x, y + h * .2, text)
		else
			xy_str(x, y + h * .2, text)		/* (descent) */
		if (user.anno_stop)
			user.anno_stop("annot", gch.istart, gch.iend,
				x - 2, y + h + 2, w + 4, h + 4, s)
	}
}
// abc2svg - tail.js
//
// Copyright (C) 2014-2017 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

    var	psdeco = function(f, x, y, de) { return false },
	psxygl = function(x, y, gl) { return false }

// try to install PostScript support
function ps_def(abcobj) {
	if (psvg || typeof Psvg != "function")
		return		// already installed or no support

// ---- Abc functions called from the PS interpreter
	function svgcall(f, x, y, v1, v2) {
	    var	xy = psvg.getorig();
		psvg.ps_flush();
		f((x + xy[0]) * stv_g.scale, y - xy[1], v1, v2)
	}

	// output an arpeggio
	Abc.prototype.arpps = function(val, x, y) {
		svgcall(out_arp, x, y, val)
	}

	// output a long trill
	Abc.prototype.ltrps = function(val, x, y) {
		svgcall(out_ltr, x, y, val)
	}

	// output a deco with string
	Abc.prototype.xyglsps = function(str, x, y, gl) {
		svgcall(out_deco_str, x, y, gl, str)
	}

	// output a deco with value
	Abc.prototype.xyglvps = function(val, x, y, gl) {
		svgcall(out_deco_val, x, y, gl, val)
	}

	// output a glyph
	Abc.prototype.xyglps = function(x, y, gl) {
		svgcall(xygl, x, y, gl)
	}

	Abc.prototype.get_y = function(st, y) {
		return y + staff_tb[st].y
	}

	Abc.prototype.set_ps = function(deco, xygl) {
		psdeco = deco;
		psxygl = xygl
	}
	Abc.prototype.stv_g = stv_g
	Abc.prototype.psget_x = function() {
		return posx / stv_g.scale
	}
	Abc.prototype.psget_y = function() {
		return stv_g.started ? stv_g.dy : posy
	}

	psvg = new Psvg(abcobj)
}

	Abc.prototype.ps_def = ps_def;

// initialize
	ps_def(this);
	font_init();
	init_tune()
	for (var i = 0; i < 128; i++)
		maci[i] = 0

}	// end of Abc()

// nodejs
if (typeof module == 'object' && typeof exports == 'object') {
	exports.abc2svg = abc2svg;
	exports.Abc = Abc
}
// abc2svg - ABC to SVG translator
// @source: https://github.com/moinejf/abc2svg.git
// Copyright (C) 2014-2017 Jean-Francois Moine - LGPL3+
// json-1.js for abc2svg-1.15.8 (2018-01-19)
//#javascript
// Generate a JSON representation of ABC
//
// Copyright (C) 2016 Jean-Francois Moine
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 2 as
// published by the Free Software Foundation.

// Usage:
//	// Define a get_abcmodel() callback function
//	// This one is called by abc2svg after ABC parsing 
//	user.get_abcmodel = json_callback
//
//	// In this function
//	function json_callback(tsfirst, voice_tb, music_types, info) {
//
//		// Create a AbcJSON instance
//		var abcjson = new AbcJSON();
//
//		// and generate the ABC representation
//		json += abcjson.gen_json(tsfirst, voice_tb, anno_type, info);
//	}
//
//	// result
//	var json = ''

// AbcJSON creation
function AbcJSON(nindent) {			// indentation level
	var inb = Array((nindent || 2) + 1).join(' ') // indentation base

    AbcJSON.prototype.gen_json = function (tsfirst, voice_tb, anno_type, info) {
	var	json, i, j, l, v, s, h,
		ind2 = inb + inb,
		ind3 = ind2 + inb,
		ind4 = ind3 + inb,
		links = {
			next: true,
			prev: true,
			ts_next: true,
			ts_prev: true,
			extra: true,
			p_v: true,
			dd_st: true
		}
	// generate an attribute
	function attr_gen(ind, attr, val) {
		var	i, e,
			indn = ind + inb	// next indentation

		if (links[attr]) {
			if (attr == "extra") {
				json += h + ind + '"extra": [';
				h = '\n'
				for (e = val ; e; e = e.next)
					attr_gen(indn, null, e);
				json += '\n' + ind + ']'
			}
			return
		}
		json += h + ind
		if (attr)
			 json += '"' + attr.toString() + '": ';
		switch (typeof(val)) {
		case "undefined":
			json += "null"
			break
		case "object":
			if (!val) {
				json += "null"
				break
			}
			if (Array.isArray(val)) {
				if (val.length == 0) {
					json += "[]"
					break
				}
				h = '[\n';
				l = val.length
				for (i = 0; i < l; i++)
					attr_gen(indn, null, val[i]);
				json += '\n' + ind + ']'
			} else {
				h = '{\n'
				for (i in val)
				    if (val.hasOwnProperty(i))
					attr_gen(indn, i, val[i]);
				json += '\n' + ind + '}'
			}
			break
		default:
			json += JSON.stringify(val)
			break
		}
		h = ',\n'
	} // attr_gen()

	// music types
	json = '';
	h = '{\n';
	attr_gen(inb, "music_types", anno_type);

	h = ',\n' + inb + '"music_type_ids": {\n';
	l = anno_type.length
	for (i = 0; i < l; i++) {
		if (anno_type[i]) {
			json += h + ind2 + '"' + anno_type[i] + '": ' + i;
			h = ',\n'
		}
	}

	// info
	h = '\n' + inb + '},\n';
	attr_gen(inb, "info", info);

	// voices
	json += ',\n' + inb + '"voices": [';
	v = 0;
	h = '\n'
	while (1) {
		h += ind2 + '{\n' +
			ind3 + '"voice_properties": {\n'
		for (i in voice_tb[v])
		    if (voice_tb[v].hasOwnProperty(i))
			attr_gen(ind4, i, voice_tb[v][i]);

		json += '\n' + ind3 + '},\n' +
			ind3 + '"symbols": [';
		s = voice_tb[v].sym
		if (!s) {
			json += ']\n' + ind3 + '}'
		} else {
			h = '\n'
			for ( ; s; s = s.next)
				attr_gen(ind4, null, s);
			json += '\n' + ind3 + ']\n' +
				ind2 + '}'
		}
		h = ',\n'
		if (!voice_tb[++v])
			break
	}
	return json + '\n' + inb + ']\n}\n'
    }
}
// abc2svg - ABC to SVG translator
// @source: https://github.com/moinejf/abc2svg.git
// Copyright (C) 2014-2017 Jean-Francois Moine - LGPL3+
// midi-1.js for abc2svg-1.15.8 (2018-01-19)
//#javascript
// Set the MIDI pitches in the notes
//
// Copyright (C) 2015-2017 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

// Usage:
//	// Define a get_abcmodel() callback function
//	// This one is called by abc2svg after ABC parsing 
//	user.get_abcmodel = my_midi_callback
//
//	// In this function
//	function my_midi_callback(tsfirst, voice_tb, music_types, info) {
//
//		// Create a AbcMIDI instance
//		var abcmidi = new AbcMIDI();
//
//		// and set the MIDI pitches
//		abcmidi.add(tsfirst, voice_tb);
//
//		// The MIDI pitches are stored in the notes
//		//	s.notes[i].midi
//	}

// AbcMIDI creation
function AbcMIDI() {

	// constants from Abc
	var	BAR = 0,
		CLEF = 1,
		GRACE = 4,
		KEY = 5,
		NOTE = 8

	// add MIDI pitches
	AbcMIDI.prototype.add = function(s,		// starting symbol
					voice_tb) {	// voice table

		var	scale = new Int8Array(		// note to pitch
					[0, 2, 4, 5, 7, 9, 11]),
			bmap = new Int8Array(7),	// measure base map
			map = new Int8Array(70),	// current map - 10 octaves
			tie_map,			// index = MIDI pitch
			v,
			transp				// clef transpose

		// re-initialize the map on bar
		function bar_map() {
			for (var j = 0; j < 10; j++)
				for (var i = 0; i < 7; i++)
					map[j * 7 + i] = bmap[i]
		} // bar_map()

		// define the note map
		function key_map(s) {
			for (var i = 0; i < 7; i++)
				bmap[i] = 0
			switch (s.k_sf) {
			case 7: bmap[6] = 1
			case 6: bmap[2] = 1
			case 5: bmap[5] = 1
			case 4: bmap[1] = 1
			case 3: bmap[4] = 1
			case 2: bmap[0] = 1
			case 1: bmap[3] = 1; break
			case -7: bmap[3] = -1
			case -6: bmap[0] = -1
			case -5: bmap[4] = -1
			case -4: bmap[1] = -1
			case -3: bmap[5] = -1
			case -2: bmap[2] = -1
			case -1: bmap[6] = -1; break
			}
			bar_map()
		} // key_map()

		// convert ABC pitch to MIDI
		function pit2midi(p, a) {
			if (a)
				map[p] = a == 3 ? 0 : a; // (3 = natural)
			return ((p / 7) | 0) * 12 + scale[p % 7] +
						(tie_map[p] ||  map[p])
		} // pit2midi()

		// initialize the clefs and keys
		for (v = 0; v < voice_tb.length; v++) {
			if (!voice_tb[v].sym)
				continue
			s = voice_tb[v].clef
			if (!s.clef_octave
			 || s.clef_oct_transp)
				transp = 0
			else
				transp = s.clef_octave

			key_map(voice_tb[v].key);	// init acc. map from key sig.

			// and loop on the symbols of the voice
			vloop(v)
		}
	    function vloop(v) {
		var	i, g, p, note,
			s = voice_tb[v].sym,
			vtime = s.time,		// next time
			tie_time = [],
			rep_tie_map = []

		tie_map = []
		while (s) {
			if (s.time > vtime) {	// if time skip
				bar_map()	// force a measure bar
				vtime = s.time
			}
			if (s.dur)
				vtime = s.time + s.dur
			switch (s.type) {
			case BAR:
//fixme: pb when lack of measure bar (voice overlay, new voice)
				// x times repeat
				if (s.text) {
					if (s.text[0] == '1') {	// 1st time
						rep_tie_map = [];
						rep_tie_time = []
						for (i in tie_map)
							rep_tie_map[i] = tie_map[i]
					} else if (rep_tie_map.length != 0) {
						tie_map = []
						tie_time = []
						for (i in rep_tie_map) {
							tie_map[i] = rep_tie_map[i];
							tie_time[i] = s.time
						}
					}
				}
				if (!s.invis)
					bar_map()
				break
			case CLEF:
				if (!s.clef_octave
				 || s.clef_oct_transp)
					transp = 0
				else
					transp = s.clef_octave
				break
			case GRACE:
				for (g = s.extra; g; g = g.next) {
					if (!g.type != NOTE)
						continue
					for (i = 0; i <= g.nhd; i++) {
						note = g.notes[i];
						p = note.apit + 19 + transp;
						note.midi = pit2midi(p, note.acc)
					}
				}
				break
			case KEY:
				key_map(s)
				break
			case NOTE:
				for (i = 0; i <= s.nhd; i++) {
					note = s.notes[i];
					p = note.apit + 19 +	// pitch from C-1
							transp
					if (tie_map[p]) {
						if (s.time > tie_time[p]) {
							delete tie_map[p]
							delete tie_time[p]
						}
					}
					note.midi = pit2midi(p, note.acc)
					if (note.ti1) {
						tie_map[p] = map[p];
						tie_time[p] = s.time + s.dur
					}
				}
				break
			}
			s = s.next
		}
	    } // vloop()
	} // add()
} // end AbcMidi
// abc2svg - ABC to SVG translator
// @source: https://github.com/moinejf/abc2svg.git
// Copyright (C) 2014-2017 Jean-Francois Moine - LGPL3+
// play-1.js for abc2svg-1.15.8 (2018-01-19)
// play-1.js - file to include in html pages with abc2svg-1.js for playing
//
// Copyright (C) 2015-2017 Jean-Francois Moine
//
// This file is part of abc2svg.
//
// abc2svg is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with abc2svg.  If not, see <http://www.gnu.org/licenses/>.

// This file is just a wrapper around ToAudio (toaudio.js) and Audio5 (toaudio5.js)

function AbcPlay(conf) {
var	audio = new ToAudio(),
	audio5 = new Audio5(conf)

	return {
		clear: audio.clear,
		add: audio.add,
		play: audio5.play,
		stop: audio5.stop,
		get_sft: audio5.get_sft,
		get_sfu: audio5.get_sfu,
		get_vol: audio5.get_vol,
		set_sft: audio5.set_sft,
		set_sfu: audio5.set_sfu,
		set_speed: audio5.set_speed,
		set_vol: audio5.set_vol,
		set_follow: audio5.set_follow
	}
} // AbcPlay
// toaudio.js - audio generation
//
// Copyright (C) 2015-2017 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.

// ToAudio creation
function ToAudio() {

// constants from Abc
var	BAR = 0,
	CLEF = 1,
	GRACE = 4,
	KEY = 5,
	NOTE = 8,
	REST = 10,
	STAVES = 12,
	TEMPO = 14,
	BASE_LEN = 1536,

	scale = new Uint8Array([0, 2, 4, 5, 7, 9, 11]),	// note to pitch conversion

	a_e,				// event array

	p_time,				// last playing time
	abc_time,			// last ABC time
	play_factor;			// play time factor

// clear the playing events and return the old ones
    ToAudio.prototype.clear = function() {
	var a_pe = a_e;
	a_e = null
	return a_pe
    } // clear()

// add playing events from the ABC model
    ToAudio.prototype.add = function(start,		// starting symbol
				 voice_tb) {		// voice table
	var	bmap = new Float32Array(7), // measure base map
		map,			// map of the current voice - 10 octaves
		vmap = [],		// map of all voices
		i, n, dt, d, v,
		top_v,			// top voice
		rep_st_s,		// start of sequence to be repeated
		rep_en_s,		// end ("|1")
		rep_nx_s,		// restart at end of repeat
		rep_st_transp,		// transposition at start of repeat sequence
		rep_st_map,		// and map
		rep_st_fac,		// and play factor
		transp,			// clef transposition per voice
		s = start

	// set the transpositions
	function set_voices() {
		var v, s

		transp = new Int8Array(voice_tb.length)
		for (v = 0; v < voice_tb.length; v++) {
			s = voice_tb[v].clef;
			transp[v] = (!s.clef_octave || s.clef_oct_transp) ?
					0 : s.clef_octave
			if (!vmap[v])
				vmap[v] = new Float32Array(70);
			map = vmap[v];
			voice_tb[v].key.v = v;
			key_map(voice_tb[v].key)
		}
	} // set_voices()

	// re-initialize the map on bar
	function bar_map(v) {
		for (var j = 0; j < 10; j++)
			for (var i = 0; i < 7; i++)
				vmap[v][j * 7 + i] = bmap[i]
	} // bar_map()

	// define the note map
	function key_map(s) {
	    if (s.k_bagpipe) {
		// detune for just intonation in A (C is C#, F is F# and G is Gnat)
		bmap = [100-13.7, -2, 2, 100-15.6, -31.2, 0, 3.9]
		for (var i = 0; i < 7; i++)
			bmap[i] = (bmap[i] + 150.6) / 100 // 'A' bagpipe = 480Hz
				// 150.6 = (Math.log2(480/440) - 1)*1200
	    } else {
		for (var i = 0; i < 7; i++)
			bmap[i] = 0
		switch (s.k_sf) {
		case 7: bmap[6] = 1
		case 6: bmap[2] = 1
		case 5: bmap[5] = 1
		case 4: bmap[1] = 1
		case 3: bmap[4] = 1
		case 2: bmap[0] = 1
		case 1: bmap[3] = 1; break
		case -7: bmap[3] = -1
		case -6: bmap[0] = -1
		case -5: bmap[4] = -1
		case -4: bmap[1] = -1
		case -3: bmap[5] = -1
		case -2: bmap[2] = -1
		case -1: bmap[6] = -1; break
		}
	    }
		bar_map(s.v)
	} // key_map()

	// convert ABC pitch to MIDI index
	function pit2mid(s, i) {
		var	n, oct,
			note = s.notes[i];
			p = note.pit + 19, // pitch from C-1
			a = note.acc

		if (transp[s.v])
			p += transp[s.v]
		if (a) {
			if (a == 3)		// (3 = natural)
				a = 0
			else if (note.micro_n)
				a = (a < 0 ? -note.micro_n : note.micro_n) /
						note.micro_d * 2;
			map[p] = a
		}
		return ((p / 7) | 0) * 12 + scale[p % 7] + map[p]
	} // pit2mid()

	// handle the ties
	function do_tie(s, note, d) {
		var	n,
			end_time = s.time + s.dur,
			pit = note.pit,
			p = pit + 19,
			a = note.acc

		if (transp[s.v])
			p += transp[s.v]

		// search the end of the tie
		for (s = s.next; ; s = s.next) {
			if (!s)
				return d

			// skip if end of sequence to be repeated
			if (s == rep_en_s) {
				var v = s.v;
				s = rep_nx_s.ts_next
				while (s && s.v != v)
					s = s.ts_next
				if (!s)
					return d
				end_time = s.time
			}
			if (s.time != end_time)
				return d
			if (s.type == NOTE)
				break
		}
		n = s.notes.length
		for (i = 0; i < n; i++) {
			note = s.notes[i]
			if (note.pit == pit) {
				d += s.dur / play_factor;
				note.ti2 = true
				return note.ti1 ? do_tie(s, note, d) : d
			}
		}
		return d
	} // do_tie()

	// generate the grace notes
	function gen_grace(s) {
		var	g, i, n, t, d,
			next = s.next

		// before beat
		if (s.sappo) {
			d = BASE_LEN / 16
		} else if ((!next || next.type != NOTE)
			&& s.prev && s.prev.type == NOTE) {
			d = s.prev.dur / 2
		} else {

			// after beat
			after = true
			if (!next.dots)
				d = next.dur / 2
			else if (next.dots == 1)
				d = next.dur / 3
			else
				d = next.dur * 2 / 7;
			next.time += d;
			next.dur -= d
		}
		n = 0
		for (g = s.extra; g; g = g.next)
			if (g.type == NOTE)
				n++;
		d /= n * play_factor;
		t = p_time
		for (g = s.extra; g; g = g.next) {
			if (g.type != NOTE)
				continue
			gen_notes(g, t, d);
			t += d
		}
	} // gen_grace()

	// generate the notes
	function gen_notes(s, t, d) {
		for (var i = 0; i <= s.nhd; i++) {
		    var	note = s.notes[i]
			if (note.ti2)
				continue
			a_e.push([
				s.istart,
				t,
				s.p_v.instr,
				pit2mid(s, i),
				note.ti1 ? do_tie(s, note, d) : d])
		}
	} // gen_note()

	// add() main

	set_voices();			// initialize the voice parameters

	if (!a_e) {			// if first call
		a_e = []
		abc_time = rep_st_t = p_time = 0;
		play_factor = BASE_LEN / 4 * 120 / 60	// default: Q:1/4=120
	} else if (s.time < abc_time) {
		abc_time = rep_st_t = s.time
	}

	// loop on the symbols
	while (s) {
		if (s.type == TEMPO
		 && s.tempo) {
			d = 0;
			n = s.tempo_notes.length
			for (i = 0; i < n; i++)
				d += s.tempo_notes[i];
			play_factor = d * s.tempo / 60
		}

		dt = s.time - abc_time
		if (dt > 0) {
			p_time += dt / play_factor;
			abc_time = s.time
		}

		if (s == rep_en_s) {			// repeat end
			s = rep_nx_s;
			abc_time = s.time
		}

		map = vmap[s.v]
		switch (s.type) {
		case BAR:
//fixme: does not work if different measures per voice
			if (s.v != top_v)
				break

			// right repeat
			if (s.bar_type[0] == ':') {
				s.bar_type = '|';	// don't repeat again
				rep_nx_s = s		// repeat next
				if (!rep_en_s)		// if no "|1"
					rep_en_s = s	// repeat end
				if (rep_st_s) {		// if left repeat
					s = rep_st_s
					for (v = 0; v < voice_tb.length; v++) {
						for (i = 0; i < 70; i++)
							vmap[v][i] = rep_st_map[v][i];
						transp[v] = rep_st_transp[v]
					}
					play_factor = rep_st_fac;
				} else {			// back to start
					s = start;
					set_voices();
					for (v = 0; v < voice_tb.length; v++)
						bar_map(v)
				}
				abc_time = s.time
				break
			}

			if (!s.invis) {
				for (v = 0; v < voice_tb.length; v++)
					bar_map(v)
			}

			// left repeat
			if (s.bar_type[s.bar_type.length - 1] == ':') {
				rep_st_s = s;
				rep_en_s = null
				for (v = 0; v < voice_tb.length; v++) {
					if (!rep_st_map)
						rep_st_map = []
					if (!rep_st_map[v])
						rep_st_map[v] =
							new Float32Array(70)
					for (i = 0; i < 70; i++)
						rep_st_map[v][i] = vmap[v][i];
					if (!rep_st_transp)
						rep_st_transp = []
					rep_st_transp[v] = transp[v]
				}
				rep_st_fac = play_factor
				break

			// 1st time repeat
			} else if (s.text && s.text[0] == '1') {
				rep_en_s = s
			}
			break
		case CLEF:
			transp[s.v] = (!s.clef_octave || s.clef_oct_transp) ?
					0 : s.clef_octave
			break
		case GRACE:
			if (s.time == 0		// if before beat at start time
			 && abc_time == 0) {
				dt = 0
				if (s.sappo)
					dt = BASE_LEN / 16
				else if (!s.next || s.next.type != NOTE)
					dt = d / 2;
				abc_time -= dt
			}
			gen_grace(s)
			break
		case KEY:
			key_map(s)
			break
		case REST:
		case NOTE:
			d = s.dur
			if (s.next && s.next.type == GRACE) {
				dt = 0
				if (s.next.sappo)
					dt = BASE_LEN / 16
				else if (!s.next.next || s.next.next.type != NOTE)
					dt = d / 2;
				s.next.time -= dt;
				d -= dt
			}
			if (s.type == NOTE)
				gen_notes(s, p_time, d / play_factor)
			break
		case STAVES:
			top_v = s.sy.top_voice
			break
		}
		s = s.ts_next
	}
    } // add()

} // ToAudio

// nodejs
if (typeof module == 'object' && typeof exports == 'object')
	exports.ToAudio = ToAudio
// toaudio5.js - audio output using HTML5 audio
//
// Copyright (C) 2015-2017 Jean-Francois Moine
//
// This file is part of abc2svg.
//
// abc2svg is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with abc2svg.  If not, see <http://www.gnu.org/licenses/>.

// Audio5 creation
// one argument:
// @conf: configuration object - all items are optional:
//	ac: audio context
// 	sft: soundfont type ("js", "mp3" or "ogg")
//	sfu: soundfont URL
//		When the type is "js", the URL is the directory containing
//			the  <instrument>-ogg.js files of midi-js
//		When the type is "mp3" or "ogg",
//			the URL is the directory containing
//			the <instrument>-<type> directories
//	onend: callback function called at end of playing
//		(no arguments)
//	onnote: callback function called on note start/stop playing
//		Arguments:
//			i: start index of the note in the ABC source
//			on: true on note start, false on note stop

// Audio5 methods

// play() - start playing
// @start_index -
// @stop_index: play the notes found in ABC source between
//		the start and stop indexes
// @play_event: optional (default: previous generated events)
//	array of array
//		[0]: index of the note in the ABC source
//		[1]: time in seconds
//		[2]: MIDI instrument
//		[3]: MIDI note pitch (with cents)
//		[4]: duration
//		[5]: volume (0..1 - optional)
//
// stop() - stop playing
//
// set_sft() - get/set the soundfont type
// @type: either "js", "mp3" or "ogg" - undefined = return current value
//
// set_sfu() - get/set the soundfont URL
// @url: URL - undefined = return current value
//
// set_speed() - get/set the play speed
// @speed: < 1 slower, > 1 faster - undefined = return current value
//
// set_vol() - get/set the current sound volume
// @volume: range [0..1] - undefined = return current value
//
// set_follow() - get/set the flag to call or not the 'onnote' callback
// @follow: boolean - undefined = return current value

function Audio5(i_conf) {
	// constants
	var	instr_tb = [			// index = GM1 instrument - 1
			"acoustic_grand_piano",
			"bright_acoustic_piano",
			"electric_grand_piano",
			"honkytonk_piano",
			"electric_piano_1",
			"electric_piano_2",
			"harpsichord",
			"clavinet",
			"celesta",
			"glockenspiel",
			"music_box",
			"vibraphone",
			"marimba",
			"xylophone",
			"tubular_bells",
			"dulcimer",
			"drawbar_organ",
			"percussive_organ",
			"rock_organ",
			"church_organ",
			"reed_organ",
			"accordion",
			"harmonica",
			"tango_accordion",
			"acoustic_guitar_nylon",
			"acoustic_guitar_steel",
			"electric_guitar_jazz",
			"electric_guitar_clean",
			"electric_guitar_muted",
			"overdriven_guitar",
			"distortion_guitar",
			"guitar_harmonics",
			"acoustic_bass",
			"electric_bass_finger",
			"electric_bass_pick",
			"fretless_bass",
			"slap_bass_1",
			"slap_bass_2",
			"synth_bass_1",
			"synth_bass_2",
			"violin",
			"viola",
			"cello",
			"contrabass",
			"tremolo_strings",
			"pizzicato_strings",
			"orchestral_harp",
			"timpani",
			"string_ensemble_1",
			"string_ensemble_2",
			"synth_strings_1",
			"synth_strings_2",
			"choir_aahs",
			"voice_oohs",
			"synth_choir",
			"orchestra_hit",
			"trumpet",
			"trombone",
			"tuba",
			"muted_trumpet",
			"french_horn",
			"brass_section",
			"synth_brass_1",
			"synth_brass_2",
			"soprano_sax",
			"alto_sax",
			"tenor_sax",
			"baritone_sax",
			"oboe",
			"english_horn",
			"bassoon",
			"clarinet",
			"piccolo",
			"flute",
			"recorder",
			"pan_flute",
			"blown_bottle",
			"shakuhachi",
			"whistle",
			"ocarina",
			"lead_1_square",
			"lead_2_sawtooth",
			"lead_3_calliope",
			"lead_4_chiff",
			"lead_5_charang",
			"lead_6_voice",
			"lead_7_fifths",
			"lead_8_bass__lead",
			"pad_1_new_age",
			"pad_2_warm",
			"pad_3_polysynth",
			"pad_4_choir",
			"pad_5_bowed",
			"pad_6_metallic",
			"pad_7_halo",
			"pad_8_sweep",
			"fx_1_rain",
			"fx_2_soundtrack",
			"fx_3_crystal",
			"fx_4_atmosphere",
			"fx_5_brightness",
			"fx_6_goblins",
			"fx_7_echoes",
			"fx_8_scifi",
			"sitar",
			"banjo",
			"shamisen",
			"koto",
			"kalimba",
			"bagpipe",
			"fiddle",
			"shanai",
			"tinkle_bell",
			"agogo",
			"steel_drums",
			"woodblock",
			"taiko_drum",
			"melodic_tom",
			"synth_drum",
			"reverse_cymbal",
			"guitar_fret_noise",
			"breath_noise",
			"seashore",
			"bird_tweet",
			"telephone_ring",
			"helicopter",
			"applause",
			"gunshot"],

		// instruments
		loop = new Uint8Array([		// index = GM1 instrument - 1
			0, 0, 0, 0, 0, 0, 0, 0,		// 0   Piano
			0, 0, 0, 0, 0, 0, 0, 0,		// 8   Chromatic Percussion
			1, 1, 1, 1, 1, 1, 1, 1,		// 16  Organ
			0, 0, 0, 0, 0, 0, 0, 0,		// 24  Guitar
			0, 0, 0, 0, 0, 0, 0, 0,		// 32  Bass
			1, 1, 1, 1, 1, 1, 1, 1,		// 40  Strings
			1, 1, 0, 0, 0, 0, 0, 0,		// 48  Ensemble
			1, 1, 1, 1, 1, 1, 1, 1,		// 56  Brass
			1, 1, 1, 1, 1, 1, 1, 1,		// 64  Reed
			1, 1, 1, 1, 1, 1, 1, 1,		// 72  Pipe
			1, 1, 1, 1, 1, 1, 1, 1,		// 80  Synth Lead
			1, 1, 1, 1, 1, 1, 1, 1,		// 88  Synth Pad
			1, 1, 1, 1, 1, 1, 1, 1,		// 96  Synth Effects
			0, 0, 0, 0, 0, 1, 1, 0,		// 104 Ethnic
			0, 0, 0, 0, 0, 0, 0, 0,		// 112 Percussive
			0, 0, 0, 0, 0, 0, 0, 0,		// 120 Sound Effects
		]),

		// note to name and note to octave
		nn =	["C", "Db", "D",  "Eb", "E",  "F",
			 "Gb", "G", "Ab", "A",  "Bb", "B"],
		no = "0012345678"

	// -- global --
	var	conf = i_conf,		// configuration
		onend = function() {},	// callback function on play end
		onnote = function() {},	// callback function on note start/stop
		ac,			// audio context
		gain,			// global gain
		gain_val = 0.7,
		a_e,			// event array
		follow,			// follow the music
		speed = 1,		// speed factor
		new_speed,

	// instruments/notes
		sfu,			// soundfont URL
		sft,			// soundfont type:
					// - "js" midi-js with encoded data structure
					// - "mp3" midi-js mp3 samples
					// - "ogg" midi-js ogg samples
		sounds = [],		// [instr][mi] decoded notes per instrument
		w_instr = 0,		// number of instruments being loaded
		note_q = [],		// [instr, note] to be decoded
		w_note = 0,		// number of notes being decoded
		geval = eval,

	// -- play the memorized events --
		evt_idx,		// event index while playing
		iend,			// source stop index
		stime			// start playing time

	// get the URL and the type of the soundfont from cookies
	function get_cookies() {
	    var	ac = document.cookie.split(';')
		for (var i = 0; i < ac.length; i++) {
			var c = ac[i].split('=')
			switch (c[0].replace(/ */, '')) {
			case "follow":
				follow = c[1] == "true"
				break
			case "sft":
				if (!sft)
					sft = c[1]
				break
			case "sfu":
				if (!sfu)
					sfu = c[1]
				break
//			case "speed":
//			    var	v = Math.pow(3, (c[1] - 10) * .1);
//				speed = v
//				break
			case "volume":
				vol = Number(c[1])
				break
			}
		}
	}

	function decode_note(instr, mi) {

		// convert data URI to binary
		function data2bin(dataURI) {
			var	i,
				base64Index = dataURI.indexOf(',') + 1,
				base64 = dataURI.substring(base64Index),
				raw = window.atob(base64),
				rawl = raw.length,
				ab = new ArrayBuffer(rawl),
				array = new Uint8Array(ab)

			for (i = 0; i < rawl; i++)
				array[i] = raw.charCodeAt(i)
			return ab
		} // data2bin()

		function audio_dcod(instr, mi, snd) {
			ac.decodeAudioData(snd,
				function(b) {
					sounds[instr][mi] = b;
					w_note--
				},
				function(e) {
					alert("Decode audio data error " +
						(e ? e.err : "???"));
					w_note--;
					iend = 0;
					onend()
				})
		} // audio_dcod()

		// decode_note() main
		w_note++
		var p = nn[mi % 12] + no[(mi / 12) | 0]

		if (sft == 'js') {
			audio_dcod(instr, mi,
				data2bin(MIDI.Soundfont[instr_tb[instr]][p]))
		} else {
			var	url = sfu + '/' + instr_tb[instr] + '-' +
					sft + '/' + p + '.' + sft,
				req = new XMLHttpRequest();

			req.open('GET', url);
			req.responseType = 'arraybuffer';
			req.onload = function() {
				audio_dcod(instr, mi, this.response)
			}
			req.onerror = function(msg) {
				if (typeof msg == 'object')
					msg = msg.type
				alert("Error '" + msg + "' while loading\n" + url);
				w_note--;
				iend = 0;
				onend()
			}
			req.send()
		}
	} // decode_note()

	// load an instrument (.js file)
	function load_instr(instr) {
		if (sft != 'js')
			return
		w_instr++
		var	url = sfu + '/' + instr_tb[instr] + '-ogg.js',
			script = document.createElement('script');
		script.src = url;
		script.onload = function() {
			w_instr--
		}
		document.head.appendChild(script)
	} // load_instr()

	// start loading the required MIDI resources
	function load_res() {
		var i, e, instr, mi

		for (i = evt_idx; ; i++) {
			e = a_e[i]
			if (!e || e[0] > iend)
				break
			instr = e[2]
			if (!sounds[instr]) {
				sounds[instr] = [];
				load_instr(instr)
			}
			mi = e[3] | 0
			if (!sounds[instr][mi]) {	// if no note yet
				sounds[instr][mi] = true;
				note_q.push([instr, mi])
			}
		}
	}

	// play the next time sequence
	function play_next() {
		var	t, e, e2, maxt, o, st, d;

		// play the next events
		e = a_e[evt_idx]
		if (!e
		 || e[0] > iend) {		// if source ref > source end
			onend()
			return
		}

		// if speed change, shift the start time
		if (new_speed) {
			stime = ac.currentTime -
					(ac.currentTime - stime) * speed / new_speed;
			speed = new_speed;
			new_speed = 0
		}

//fixme: better, count the number of events?
		t = e[1] / speed;		// start time
		maxt = t + 3			// max time = evt time + 3 seconds
		while (1) {
			o = ac.createBufferSource();
			o.buffer = sounds[e[2]][e[3] | 0];
			if (e[5] != 0)		// if no sound (rest), don't connect
				o.connect(gain)
			if (o.detune) {
				d = (e[3] * 100) % 100
				if (d)			// if micro-tone
					 o.detune.value = d
			}
			d = e[4] / speed
			if (loop[e[2]]) {	// if not a percussion instrument
				o.loop = true;
				o.loopStart = 3; // (for sample 4s)
				o.loopEnd = 10
			}
			st = t + stime;			// absolute start time
			o.start(st);
			o.stop(st + d)

			if (follow) {
			    var	i = e[0];
				st = (st - ac.currentTime) * 1000;
				setTimeout(onnote, st, i, true);
				setTimeout(onnote, st + d * 1000, i, false)
			}

			e = a_e[++evt_idx]
			if (!e) {
				setTimeout(onend,
					(t + stime - ac.currentTime + d) * 1000)
				return
			}
			t = e[1] / speed
			if (t > maxt)
				break
		}

		setTimeout(play_next, (t + stime - ac.currentTime)
				* 1000 - 300)	// wake before end of playing
	} // play_next()

	// wait for all resources, then start playing
	function play_start() {
		if (iend == 0)		// play stop
			return

		// wait for instruments
		if (w_instr != 0) {
			setTimeout(function() {	// wait for all instruments
				play_start()
			}, 300)
			return
		}

		// wait for notes
		if (note_q.length != 0) {
			while (1) {
				var e = note_q.shift()
				if (!e)
					break
				decode_note(e[0], e[1])
			}
		}
		if (w_note != 0) {
			setTimeout(function() {	// wait for all notes
				play_start()
			}, 300)
			return
		}

		// all resources are there
		stime = ac.currentTime + .2		// start time + 0.2s
			- a_e[evt_idx][1] * speed;
		play_next()
	}

	// play the events
	Audio5.prototype.play = function(istart, i_iend, a_pe) {
		if (a_pe)			// force old playing events
			a_e = a_pe
		if (!a_e || !a_e.length) {
			onend()			// nothing to play
			return
		}
		iend = i_iend;
		evt_idx = 0
		while (a_e[evt_idx] && a_e[evt_idx][0] < istart)
			evt_idx++
		if (!a_e[evt_idx]) {
			onend()			// nothing to play
			return
		}
		load_res();
		play_start()
	} // play()

	// stop playing
	Audio5.prototype.stop = function() {
		iend = 0
	} // stop()

	function set_cookie(n, v) {
	    var	d = new Date();
		d.setTime(d.getTime() + 31536000000)	// one year
//					365 * 24 * 60 * 60 * 1000
		document.cookie = n + "=" + v + ";expires=" + d.toUTCString()
	}

	// get/set 'follow music'
	Audio5.prototype.set_follow = function(v) {
		if (v == undefined)
			return follow
		follow = v;
		set_cookie("follow", v)
	} // set_follow()

	// set soundfont type
	Audio5.prototype.set_sft = function(v) {
		if (v == undefined)
			return sft
		sft = v;
		set_cookie("sft", v)
	} // set_sft()
	Audio5.prototype.get_sft = Audio5.prototype.set_sft	// compatibility

	// set soundfont URL
	Audio5.prototype.set_sfu = function(v) {
		if (v == undefined)
			return sfu
		sfu = v;
		set_cookie("sfu", v)
	} // set_sft()
	Audio5.prototype.get_sfu = Audio5.prototype.set_sfu	// compatibility

	// set speed (< 1 slower, > 1 faster)
	Audio5.prototype.set_speed = function(v) {
		if (v == undefined)
			return speed
		new_speed = v
	} // set_speed()

	// set volume
	Audio5.prototype.set_vol = function(v) {
		if (v == undefined) {
			if (gain)
				return gain.gain.value
			return gain_val
		}
		if (gain)
			gain.gain.value = v
		else
			gain_val = v;
		set_cookie("volume", v.toFixed(2))
	} // set_vol()
	Audio5.prototype.get_vol = Audio5.prototype.set_vol	// compatibility

	// Audio5 object creation
	ac = conf.ac
	if (!ac) {
		conf.ac = ac = new (window.AudioContext ||
					window.webkitAudioContext);
		gain = ac.createGain();
		gain.gain.value = gain_val;
		gain.connect(ac.destination)
	}

	// get the soundfont
	// 1- from the object configuration
	if (conf.sft)
		sft = conf.sft
	if (conf.sfu)
		sfu = conf.sfu
	// 2- from cookies
	if (!sfu || !sft)
		get_cookies()
	// 3- from the site location
	if (!sfu || !sft) {
		if (document.URL.match(/^http:\/\/moinejf.free.fr/)) {
			if (!sfu)
				sfu = "http://moinejf.free.fr/js/FluidR3_GM"
			if (!sft)
				sft = "ogg"
		} else {
			if (!sfu)
			    sfu =
				"https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM"
			if (!sft)
				sft = "js"
		}
	}

	if (conf.onend)
		onend = conf.onend
	if (conf.onnote)
		onnote = conf.onnote

	if (typeof(MIDI) == "object")
		sounds[0] = []		// default: acoustic grand piano
	else
		MIDI = {}

} // end Audio5
