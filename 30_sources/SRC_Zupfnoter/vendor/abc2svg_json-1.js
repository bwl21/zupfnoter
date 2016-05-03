//#javascript
// json-1.js file to generate a JSON representation of ABC
//
// Copyright (C) 2016 Jean-Francois Moine
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 2 as
// published by the Free Software Foundation.

// AbcMIDI creation
function AbcJSON() {

    this.gen_json = function (tsfirst, voice_tb, anno_type, info) {
        var json, i, j, v, s, h,
            indent = 2,
            links = {
                next: true,
                prev: true,
                ts_next: true,
                ts_prev: true,
                p_v: true,
            }

        // generate an attribute
        function attr_gen(attr, val) {
            var i, e

            if (links[attr])
                return
            if (attr == "extra") {
                json += h + ' '.repeat(indent) + '"extra": {';
                indent += 2;
                h = '\n'
                for (e = val; e; e = e.next)
                    attr_gen(e.type, e)
                indent -= 2
                json += '\n' + ' '.repeat(indent) + '}'
                return
            }
            json += h + ' '.repeat(indent)
            if (attr)
                json += '"' + attr.toString() + '": ';
            switch (typeof(val)) {
                case "undefined":
                    json += "null"
                    break
                case "boolean":
                case "number":
                    json += val.toString()
                    break
                case "object":
                    if (!val) {
                        json += "null"
                        break
                    }
                    indent += 2;
                    if (Array.isArray(val)) {
                        if (val.length == 0) {
                            json += "[]"
                            break
                        }
                        h = '[\n'
                        il = val.length;
                        for (i = 0; i < il; i++)
                            attr_gen(null, val[i]);
                        indent -= 2;
                        json += '\n' + ' '.repeat(indent) + ']'
                    } else {
                        h = '{\n'
                        for (i in val)
                            attr_gen(i, val[i]);
                        indent -= 2;
                        json += '\n' + ' '.repeat(indent) + '}'
                    }
                    break
                case "string":
                    json += JSON.stringify(val)
                    break
                default:
                    json += '"' + val.toString() + "'"
                    break
            }
            h = ',\n'
        } // attr_gen()

        // music types
        json = ''
        h = '{\n';
        attr_gen("music_types", anno_type)

        h = ',\n  "music_type_ids": {\n'
        il = anno_type.length
        for (i=0;i<il;i++) {
            json += h + '    "' + anno_type[i] + '": ' + i;
            h = ',\n'
        }

        // info
        h = '\n  },\n'
        attr_gen("info", info)

        // voices
        json += ',\n  "voices": ['
        indent = 8
        v = 0;
        h = '\n'
        while (1) {
            h += '    {\n      "voice_properties": {\n'
            for (i in voice_tb[v])
                attr_gen(i, voice_tb[v][i]);

            json += '\n      },\n      "symbols": [';
            s = voice_tb[v].sym
            if (!s) {
                json += ']\n    }'
            } else {
                h = '\n'
                for (; s; s = s.next)
                    attr_gen(null, s);
                json += '\n      ]\n    }'
            }
            h = ',\n'
            if (!voice_tb[++v])
                break
        }
        return json + '\n  ]\n}\n'
    }
}