// abc2svg - ABC to SVG translator
// Copyright (C) 2014-2015 Jean-Francois Moine
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 2 as
// published by the Free Software Foundation.
// play.js for abc2svg-1.1.5 (2015-04-05)
function AbcPlay(i_onend) {
    var onend = i_onend, ac, gain, a_e;
    var evt_idx, iend, ctime, a_g = [];

    function o_end(o, g) {
        a_g.push(g);
        o.disconnect()
    }

    function play_next() {
        var t, ct, e, e2;

        function play_note(f, d) {
            var o = ac.createOscillator(), g = a_g.pop();
            if (!g) {
                g = ac.createGain();
                g.gain.value = .2;
                g.connect(gain)
            }
            o.frequency.value = f;
            o.type = "sine";
            o.onended = function () {
                o_end(o, g)
            };
            if (d > .8)d -= .07; else d *= .9;
            o.start(ctime);
            o.stop(ctime + d);
            o.connect(g)
        }

        e = a_e[evt_idx++];
        if (!e || e[0] > iend) {
            if (onend)onend();
            return
        }
        ct = e[1];
        while (1) {
            play_note(e[2], e[3]);
            e2 = a_e[evt_idx];
            if (!e2) {
                t = ct + e[3];
                break
            }
            e = e2;
            t = e[1];
            if (t != ct)break;
            evt_idx++
        }
        ctime += t - ct;
        setTimeout(play_next, (ctime - ac.currentTime) * 1e3 - 100)
    }

    this.play = function (istart, i_iend) {
        if (!a_e)return;
        iend = i_iend;
        evt_idx = 0;
        while (a_e[evt_idx] && a_e[evt_idx][0] < istart)evt_idx++;
        if (a_e[evt_idx])ctime = ac.currentTime + a_e[evt_idx][1];
        play_next()
    };
    this.stop = function () {
        iend = 0
    };
    var dtime, play_factor;
    this.clear = function () {
        a_e = null
    };
    this.add = function (s, k) {
        const BAR = 0, GRACE = 4, KEY = 5, NOTE = 8, TEMPO = 14, BASE_LEN = 1536;
        var bmap = [], map = [], scale = [0, 2, 4, 5, 7, 9, 11], o_pit = {}, i, n, t, d, g, pit, pit_time, rep_st_s, rep_st_map = [], rep_en_s, rep_en_map = [];

        function key_map(s) {
            for (var i = 0; i < 7; i++)bmap[i] = 0;
            switch (s.k_sf) {
                case 7:
                    bmap[6] = 1;
                case 6:
                    bmap[2] = 1;
                case 5:
                    bmap[5] = 1;
                case 4:
                    bmap[1] = 1;
                case 3:
                    bmap[4] = 1;
                case 2:
                    bmap[0] = 1;
                case 1:
                    bmap[3] = 1;
                    break;
                case-7:
                    bmap[3] = -1;
                case-6:
                    bmap[0] = -1;
                case-5:
                    bmap[4] = -1;
                case-4:
                    bmap[1] = -1;
                case-3:
                    bmap[5] = -1;
                case-2:
                    bmap[2] = -1;
                case-1:
                    bmap[6] = -1;
                    break
            }
            bar_map()
        }

        function bar_map() {
            for (var j = 0; j < 10; j++)for (var i = 0; i < 7; i++)map[j * 7 + i] = bmap[i]
        }

        function pit2f(s, i) {
            var p = s.notes[i].pit + 19, a = s.notes[i].acc;
            if (a)map[p] = a == 4 ? 0 : a;
            p = Math.floor(p / 7) * 12 + scale[p % 7] + map[p];
            return 440 * Math.pow(2, (p - 69) / 12)
        }

        function tie(s, i, d) {
            var j, n, s2, note, pit, str_tie, note = s.notes[i], tie = note.ti1, end_time;
            if (!tie)return d;
            pit = note.pit;
            end_time = s.time + s.dur;
            for (s2 = s.next; ; s2 = s2.next) {
                if (!s2 || s2.time != end_time)return d;
                if (s2.type == NOTE)break
            }
            n = s2.notes.length;
            for (j = 0; j < n; j++) {
                note = s2.notes[j];
                if (note.pit == pit) {
                    d += s2.dur / play_factor;
                    o_pit["_" + s2.st + pit] = s2.time;
                    return s2.ti1 ? tie(s2, j, d) : d
                }
            }
            return d
        }

        key_map(k);
        if (!a_e) {
            a_e = [];
            dtime = 0;
            play_factor = BASE_LEN / 4 * 80 / 60
        }
        rep_st_s = rep_en_s = {ts_next: s, time: dtime};
        for (i = 0; i < 7; i++)rep_st_map[i] = bmap[i];
        while (1) {
            for (g = s.extra; g; g = g.next) {
                if (g.type == TEMPO) {
                    d = 0;
                    n = g.tempo_notes.length;
                    for (i = 0; i < n; i++)d += g.tempo_notes[i];
                    play_factor = d * g.tempo_value / 60
                }
            }
            switch (s.type) {
                case BAR:
                    if (s.st != 0)break;
                    bar_map();
                    if (s.bar_type[0] == ":") {
                        if (s.time > rep_en_s.time) {
                            rep_en_s = s;
                            for (i = 0; i < 7; i++)rep_en_map[i] = bmap[i];
                            dtime += s.time - rep_st_s.time;
                            s = rep_st_s;
                            for (i = 0; i < 7; i++)bmap[i] = rep_st_map[i];
                            break
                        }
                        for (i = 0; i < 7; i++)bmap[i] = rep_en_map[i]
                    }
                    if (s.bar_type[s.bar_type.length - 1] == ":") {
                        rep_st_s = rep_en_st = s;
                        for (i = 0; i < 7; i++)rep_st_map[i] = bmap[i];
                        break
                    }
                    if (s.text && s.text[0] == "1") {
                        if (s.time == 0)break;
                        if (s.time > rep_en_s.time) {
                            rep_en_s = s;
                            break
                        }
                        dtime += s.time - rep_en_s.time;
                        s = rep_en_s;
                        for (i = 0; i < 7; i++)bmap[i] = rep_en_map[i];
                        break
                    }
                    break;
                case KEY:
                    if (s.st != 0)break;
                    key_map(s);
                    break;
                case NOTE:
                    t = (s.time + dtime) / play_factor;
                    d = s.dur / play_factor;
                    for (i = 0; i <= s.nhd; i++) {
                        pit = s.notes[i].pit;
                        str_tie = "_" + s.st + pit;
                        pit_time = o_pit[str_tie];
                        if (pit_time) {
                            if (pit_time <= s.time)delete o_pit[str_tie];
                            continue
                        }
                        a_e.push([s.istart, t, pit2f(s, i), s.notes[i].ti1 ? tie(s, i, d) : d])
                    }
                    break
            }
            if (!s.ts_next) {
                dtime = s.time;
                if (s.dur)dtime += s.dur;
                break
            }
            s = s.ts_next
        }
    };
    if (window.AudioContext)ac = new window.AudioContext; else if (window.webkitAudioContext)ac = new window.webkitAudioContext; else return {};
    gain = ac.createGain();
    gain.gain.value = .7;
    if (1) {
        gain.connect(ac.destination)
    } else {
        comp = ac.createDynamicsCompressor();
        comp.ratio = 16;
        comp.attack = 5e-4;
        comp.connect(ac.destination);
        gain.connect(comp)
    }
}