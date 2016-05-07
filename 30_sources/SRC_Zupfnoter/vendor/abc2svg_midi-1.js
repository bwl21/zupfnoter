//#javascript
// Set the MIDI pitches in the music symbols
//
// Copyright (C) 2015-2016 Jean-Francois Moine
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 2 as
// published by the Free Software Foundation.");

// AbcMIDI creation
function AbcMIDI() {

	// -- generation of the MIDI pitches --
	this.add = function(s, k) {		// add MIDI pitches
						//	s: starting symbol
						//	k: starting key (first voice)
		// constants from Abc
		const	BAR = 0,
			GRACE = 4,
			KEY = 5,
			NOTE = 8,
			scale = [0, 2, 4, 5, 7, 9, 11]	// note to pitch

		var	bmap = [],			// measure base map
			map = [],			// current map - 10 octaves
			i, n, pit, lrep,
			rep_en_map = []

		function key_map(s) {			// define the note map
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
		}

		function bar_map() {			// re-initialize the map on bar
			for (var j = 0; j < 10; j++)
				for (var i = 0; i < 7; i++)
					map[j * 7 + i] = bmap[i]
		}

		function pit2midi(s, i) {		// convert ABC pitch to MIDI
			var	p = s.notes[i].apit + 19,	// pitch from lowest C
				a = s.notes[i].acc

			if (a)
				map[p] = a == 3 ? 0 : a;	// (3 = '=')
			return Math.floor(p / 7) * 12 + scale[p % 7] + map[p]
		}

		function do_tie(s, i) {			// handle the ties
			var	j, n, s2, note2, pit, str_tie,
				note = s.notes[i],
				tie = note.ti1,
				end_time

			pit = note.apit;			// absolute pitch
			end_time = s.time + s.dur
			for (s2 = s.next; ; s2 = s2.next) {
				if (!s2
				 || s2.time != end_time)
					return
				if (s2.type == NOTE)
					break
			}
			n = s2.notes.length
			for (j = 0; j < n; j++) {
				note2 = s2.notes[j]
				if (note2.apit == pit) {
					note2.midi = note.midi
					if (note2.ti1)
						do_tie(s2, j)
					break
				}
			}
		}

		key_map(k);			// init acc. map from key sig.
		lrep = false

		while (s) {
			switch (s.type) {
			case BAR:
//fixme: handle different keys per staff
				if (s.st != 0)
					break
//fixme: handle the ties on repeat
				// left repeat
				if (s.bar_type[s.bar_type.length - 1] == ':') {
					lrep = false

				// 1st time repeat
				} else if (s.text && s.text[0] == '1') {
					lrep = true;
					bar_map()
					for (i = 0; i < 7; i++)
						rep_en_map[i] = bmap[i]
					break

				// right repeat
				} else if (s.bar_type[0] == ':') {
					if (lrep) {
						for (i = 0; i < 7; i++)
							bmap[i] = rep_en_map[i]
					}
				}

				bar_map()
				break
//			case GRACE:
//				break
			case KEY:
//fixme: handle different keys per staff
				if (s.st != 0)
					break
				key_map(s)
				break
			case NOTE:
				for (i = 0; i <= s.nhd; i++) {
					if (s.notes[i].midi != undefined)
						continue
					pit = s.notes[i].apit;
					str_tie = '_' + s.st + pit;
					s.notes[i].midi = pit2midi(s, i)
					if (s.notes[i].ti1)
						do_tie(s, i)
				}
				break
			}
			s = s.ts_next
		}
	}
} // end AbcMidi
