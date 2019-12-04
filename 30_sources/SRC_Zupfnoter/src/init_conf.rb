module InitConf
# how to add a new parameter
# 1. set the default here
# 2. maintain neatjson options to get it sorted here as well
# 3. update controller_command_defnitions to provide the add / edit commands
# 4. update conf_doc_source.rb / help_de-de.md to provide the documentation and help
# 5. update config-form.rb to attach a type
# 6. update user-interface.js to add the menu entries
# 7: update json schema in opal-ajv.rb

  def self.cut_string_names(stringnames, from, to)
    stringnames.split(' ').each_with_index.map { |v, index| index.between?(from, to) ? v : '~' }.join(' ')
  end

  def self.init_conf()


    explicit_sort = [:produce, :annotations, :restposition, :default, :repeatstart, :repeatend, :extract,
                     :title, :filenamepart, :startpos, :voices, :flowlines, :subflowlines, :synchlines, :jumplines, :repeatsigns, :layoutlines, :barnumbers, :countnotes,
                     :legend, :nonflowrest, :lyrics, :notes, :images, :tuplets, :layout, :printer,
                     #
                     :annotation, :decoration, :partname, :variantend, :countnote, :c_jumplines, :tuplet, :minc, :flowline, # sort within notebound

                     :imagename,
                     :stringnames,

                     # sort within layout
                     :limit_a3, :LINE_THIN, :LINE_MEDIUM, :LINE_THICK, :ELLIPSE_SIZE, :REST_SIZE,
                     :DRAWING_AREA_SIZE,
                     :instrument, :bottomup, :beams, :packer, :pack_method, :pack_max_spreadfactor, :pack_min_increment,
                     :sortmark, :show, :fill, :size, :PITCH_OFFSET, :X_OFFSET, :X_SPACING, :jumpline_anchor, :jumpline_vcut,
                     # sort within printer
                     :a3_offset, :a4_offset, :a4_pages, # sort within layout

                     :T01_number, :T01_number_extract, :T02_copyright_music, :T03_copyright_harpnotes, :T04_to_order, :T05_printed_extracts, :T99_do_not_copy,

                     "0", "1", "2", "3", "4", "5", "6", :verses, # extracts
                     :cp1, :cp2, :shape, :pos, :hpos, :height, :vpos, :spos, :autopos, :apbase, :text, :style, :marks, # tuplets annotations
                     :resources,
                     :d64, :d48, :d32, :d24, :d16, :d12, :d8, :d6, :d4, :d3, :d2, :d1
    ]


    result =
        {produce:      [0],
         abc_parser:   'ABC2SVG',
         restposition: {default: :center, repeatstart: :next, repeatend: :default},
         template:     {filebase: "-no-template-", title: "- no template -"},
         wrap:         60,


         # here are values for object which occur multiple times
         # such that there is no explicit default in the configuration
         defaults: {
             notebound: {annotation: {pos: [5, -7]},
                         chord:{pos: [0,0]},
                         partname:   {pos: [-4, -7]},
                         variantend: {pos: [-4, -7]},
                         tuplet:     {
                             cp1: [5, 2], # first control point positive x: point is east of flowline, positive y: point is south of note
                             cp2: [5, -2], # second control point
                             shape: ['c'], # 'c' | 'l' => curve | line
                             show: true
                         },
                         flowline:   {
                             cp1: [0, 10], # first control point positive x: point is east of flowline, positive y: point is south of note
                             cp2: [0, -10], # second control point
                             shape: ['c'], # 'c' | 'l' => curve | line
                             show: true
                         }
             }
         },

         # this is used to upddate / create new objects
         templates: {
             notes: {"pos" => [320, 6], "text" => "ENTER_NOTE", "style" => "large"}, # Seitenbeschriftung
             lyrics:      {verses: [1], pos: [350, 70], style: :regular},
             images:      {imagename: "", show: true, pos: [10, 10], height: 100, },
             tuplet:      {cp1: [5, 2], cp2: [5, -2], shape: ['c'], show: true},
             annotations: {text: "_vorlage_", pos: [-5, -6]}, # Notenbeschriftungsvorlage
             extracts:    {title: "", filenamepart: "-", notes:{T01_number_extract:{text: "{{extract_filename}}"}}}
         },

         # this is used to populate a QuickSettings menu
         # in configuration editor
         # needs to be handled in controller_command_definiitions for
         # commands.add_command(:editconf)
         # commands.add_command(:addconf) do |command|
         presets: {
             barnumbers_countnotes: {
                 'anchor_at_box'    => {
                     barnumbers: {apanchor: "box",
                                  apbase:   [1, 1]},
                     countnotes: {apanchor: "box",
                                  apbase:   [1, -0.5]}
                 },
                 "anchor_at_center" => {
                     barnumbers: {apanchor: "center",
                                  apbase:   [1, 0.3]},
                     countnotes: {apanchor: "center",
                                  apbase:   [1, 0]}
                 },
                 "countnotes_with_lyrics" => {
                     countnotes: {cntextleft: "{lyrics} {countnote}",
                                  cntextright: "{countnote} {lyrics} "},
                 }
             },
             stdextract:            {}, # this is to get a translation, the values
             layout:     {
                 notes_small:            {
                     LINE_MEDIUM: 0.2,
                     LINE_THICK:  0.3,
                     # all numbers in mm
                     ELLIPSE_SIZE: [3.5, 1.3], # radii of the largest Ellipse
                     REST_SIZE: [4, 1.5],
                     beams:     false
                 },
                 notes_regular:          {
                     LINE_MEDIUM:  lambda { $conf['extract.0.layout.LINE_MEDIUM'] },
                     LINE_THICK:   lambda { $conf['extract.0.layout.LINE_THICK'] },
                     ELLIPSE_SIZE: lambda { $conf['extract.0.layout.ELLIPSE_SIZE'] }, # radii of the largest Ellipse
                     REST_SIZE: lambda { $conf['extract.0.layout.REST_SIZE'] },
                     beams:     false

                 },
                 notes_large:            {
                     LINE_MEDIUM:  0.3,
                     LINE_THICK:   0.7,
                     ELLIPSE_SIZE: [4, 2], # radii of the largest Ellipse
                     REST_SIZE: [4, 2],
                     beams:     false
                 },
                 notes_with_beams:       {
                     LINE_THIN:    0.1,
                     LINE_MEDIUM:  0.2,
                     LINE_THICK:   0.5,
                     ELLIPSE_SIZE: [1.3, 1],
                     REST_SIZE:    [2, 1.3],
                     beams:        true
                 },
                 '-'                     => {},
                 packer_compact:         {
                     packer: {
                         pack_method:           1,
                         pack_max_spreadfactor: 2,
                         pack_min_increment:    0.20
                     }
                 },
                 packer_regular:         {
                     packer: lambda { $conf.get('extract.0.layout.packer') }

                 },
                 '--'                    => {},
                 color_on:               {
                     color: {
                         color_default:  "black",
                         color_variant1: "grey",
                         color_variant2: "darkgrey"
                     }

                 },
                 color_off:              {
                     color: {
                         color_default:  "black",
                         color_variant1: "black",
                         color_variant2: "black"
                     }
                 },
                 '---'                   => {},
                 jumpline_anchor_close:  {jumpline_anchor: [3, 1]},
                 jumpline_anchor_medium: {jumpline_anchor: [5, 1]},
                 jumpline_anchor_wide:   {jumpline_anchor: [10, 1]},
                 jumpline_open:          {jumpline_vcut: 3},
                 jumpline_close:         {jumpline_vcut: 0},
             },

             instrument: {
                 '37-strings-g-g'      => {
                     layout:      {instrument:   '37-strings-g-g',
                                   limit_a3:     true,
                                   beams:        false,
                                   bottomup:     false,
                                   PITCH_OFFSET: lambda { $conf['extract.0.layout.PITCH_OFFSET'] },
                                   X_SPACING:    lambda { $conf['extract.0.layout.X_SPACING'] },
                                   X_OFFSET:     lambda { $conf['extract.0.layout.X_OFFSET'] } # just to be safe
                     },
                     stringnames: {text:  lambda { $conf['extract.0.stringnames.text'] },
                                   marks: {hpos: [43, 79]}
                     },
                     printer:     {a4_pages:  [0, 1, 2],
                                   a4_offset: lambda { $conf['extract.0.printer.a4_offset'] },
                                   a3_offset: lambda { $conf['extract.0.printer.a3_offset'] }
                     }
                 },
                 '25-strings-g-g'      => {
                     layout:      {instrument:   '25-strings-g-g',
                                   limit_a3:     false,
                                   beams:        false,
                                   bottomup:     false,
                                   PITCH_OFFSET: lambda { $conf['extract.0.layout.PITCH_OFFSET'] },
                                   X_SPACING:    lambda { $conf['extract.0.layout.X_SPACING'] },
                                   X_OFFSET:     lambda { $conf['extract.0.layout.X_OFFSET'] } # just to be safe
                     },
                     stringnames: {text:  lambda { self.cut_string_names($conf['extract.0.stringnames.text'], 12, 36) },
                                   marks: {hpos: [55, 79]
                                   }
                     },
                     printer:     {a4_pages:  [1, 2],
                                   a3_offset: [-5, 0],
                                   a4_offset: lambda { $conf['extract.0.printer.a4_offset'] }}
                 },
                 '25-strings-G-g Bass' => {
                     layout:      {instrument:   '25-strings-g-g',
                                   limit_a3:     false,
                                   beams:        false,
                                   bottomup:     false,
                                   PITCH_OFFSET: lambda { -31 },
                                   X_SPACING:    lambda { $conf['extract.0.layout.X_SPACING'] },
                                   X_OFFSET:     lambda { $conf['extract.0.layout.X_OFFSET'] } # just to be safe
                     },
                     stringnames: {text:  lambda { self.cut_string_names($conf['extract.0.stringnames.text'], 12, 36) },
                                   marks: {hpos: [43, 67]
                                   }
                     },
                     printer:     {a4_pages:  [1, 2],
                                   a3_offset: [-5, 0],
                                   a4_offset: lambda { $conf['extract.0.printer.a4_offset'] }}
                 },
                 '21-strings-a-f'      => {
                     layout:      {instrument:   '21-strings-a-f',
                                   limit_a3:     false,
                                   beams:        false,
                                   bottomup:     false,
                                   PITCH_OFFSET: lambda { $conf['extract.0.layout.PITCH_OFFSET'] },
                                   X_SPACING:    lambda { $conf['extract.0.layout.X_SPACING'] },
                                   X_OFFSET:     23
                     },
                     stringnames: {text:  lambda { self.cut_string_names($conf['extract.0.stringnames.text'], 14, 34) },
                                   marks: {hpos: [57, 77]
                                   }
                     },
                     printer:     {a4_pages:  [1, 2],
                                   a3_offset: [-5, 0],
                                   a4_offset: lambda { $conf['extract.0.printer.a4_offset'] }}
                 },
                 '18-strings-b-e'      => {
                     layout:      {instrument:   '18-strings-b-e',
                                   limit_a3:     false,
                                   beams:        false,
                                   bottomup:     false,
                                   PITCH_OFFSET: lambda { $conf['extract.0.layout.PITCH_OFFSET'] },
                                   X_SPACING:    lambda { $conf['extract.0.layout.X_SPACING'] },
                                   X_OFFSET:     28.5
                     },
                     stringnames: {text:  lambda { self.cut_string_names($conf['extract.0.stringnames.text'], 16, 33) },
                                   marks: {hpos: [59, 76]}
                     },
                     printer:     {a4_pages:  [2],
                                   a3_offset: [0, 0],
                                   a4_offset: [40, 0]}
                 },
                 'saitenspiel'         => {
                     layout:      {instrument:   'saitenspiel',
                                   limit_a3:     false,
                                   beams:        false,
                                   bottomup:     false,
                                   PITCH_OFFSET: -24,
                                   X_SPACING:    14.50,
                                   X_OFFSET:     240
                     },
                     stringnames: {text:  'G C D E F G A B C D  ~ ~ ~ ~ ~ ~ ~',
                                   marks: {hpos: [55, 74]}
                     },
                     printer:     {a4_pages:  [2],
                                   a3_offset: [0, 0],
                                   a4_offset: [35, 0]}
                 },
                 'Zipino'              => {
                     layout:      {instrument:   'Zipino',
                                   limit_a3:     true,
                                   beams:        true,
                                   bottomup:     false,
                                   PITCH_OFFSET: 0,
                                   X_SPACING:    12.50,
                                   X_OFFSET:     230,
                                   ELLIPSE_SIZE:  [2,2],
                                   REST_SIZE:  [2,2]
                 },
                     stringnames: {text:  'F# G A B C D E F# G A B C D E F# ~ ~ ~ ~ ~ ~  ~',
                                   marks: {hpos: [54]}
                     },
                     printer:     {a4_pages:  [2],
                                   a3_offset: [0, 0],
                                   a4_offset: [35, 0]}
                 },
                 'Okon-Harfe'          => {
                     layout:      {instrument:   'okon-f',
                                   beams:        true,
                                   bottomup:     true,
                                   limit_a3:     false,
                                   PITCH_OFFSET: 0, # adapt if you pitches in
                                   X_SPACING: 15,
                                   X_OFFSET:  50
                     },
                     stringnames: {text:  %Q{G, A, BB, C D E F G A BB c d e f g a bb c' ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~},
                                   marks: {hpos: [55, 74]}
                     },
                     printer:     {a4_pages:  [1, 2],
                                   a3_offset: [-35, 0],
                                   a4_offset: [70, 0]}
                 },
                 'Akkordzither'          => {
                     layout:      {instrument:   'akkordzither',
                                   tuning:       'open',
                                   beams:        true,
                                   bottomup:     false,
                                   limit_a3:     false,
                                   PITCH_OFFSET: 0, # adapt if you pitches in
                                   X_SPACING: 15,
                                   X_OFFSET:  50
                     },
                     stringnames: {text:  %Q{C C# D E F F# G G# A B C' C# D' E' F' F#' G' G#' A' B' C''  ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ },
                                   marks: {hpos: [60]}
                     },
                     printer:     {a4_pages:  [1, 2],
                                   a3_offset: [-35, 0],
                                   a4_offset: [70, 0]}
                 },
             },

             notes:      {

                 T01_number:               {
                     value: {
                         pos:   [410, 17],
                         text:  "XXX-{{number}}",
                         style: "bold",
                         align: "l"
                     }},
                 T01_number_extract:       {
                     value: {
                         pos:   [411, 17],
                         text:  "{{extract_filename}}",
                         style: "bold"
                     }},
                 T01_number_extract_value: {
                     key:   :T01_number_extract,
                     value: {
                         text: "{{extract_filename}}",
                     }},
                 T02_copyright_music:      {
                     value: {
                         pos:   [340, 251],
                         text:  lambda { ("© #{Time.now.year}\n#{I18n.t("Private copy")}") },
                         style: "small"
                     }},
                 T03_copyright_harpnotes:  {
                     value: {
                         pos:   [340, 260],
                         text:  "© #{Time.now.year} Notenbild: zupfnoter.de",
                         style: "small"
                     }},
                 T04_to_order:             {
                     value: {
                         pos:   [340, 242],
                         text:  lambda { I18n.t("provided by\n") },
                         style: "small"
                     }},
                 T05_printed_extracts:     {
                     value: {
                         pos:   [410, 22],
                         text:  "{{printed_extracts}}",
                         style: "smaller",
                         align: "l"
                     }},
                 T06_legend:               {
                     value: {
                         pos:   [360, 30],
                         text:  %Q{{{extract_title}}\n{{composer}}\nTakt: {{meter}} ({{tempo}})\nTonart: {{key}}},
                         style: "small"
                     }},
                 T99_do_not_copy:          {
                     value: {
                         pos:   [380, 284],
                         text:  lambda { I18n.t("Please do not copy") },
                         style: "small_bold"
                     }},
                 T01_T99:                  {
                     value: {
                         ## note we have no value here. This is computed in controller_command_definitions.rb
                         # harddcoded - not really cool :-)
                     }}
             },

             printer:    {
                 printer_left:    {
                     printer: {
                         a3_offset:   [-10, 0],
                         a4_offset:   [-5, 0],
                         show_border: false
                     },
                     layout:  {limit_a3: false}
                 },
                 printer_centric: {
                     printer: {
                         a3_offset:   [0, 0],
                         a4_offset:   [5, 0],
                         show_border: false
                     },
                     layout:  {limit_a3: true}
                 },
                 printer_right:   {
                     printer: {
                         a3_offset:   [10, 0],
                         a4_offset:   [5, 0],
                         show_border: false
                     },
                     layout:  {limit_a3: false}
                 }
             }
         },

         # these are the builtin notebound annotations
         annotations: {
             vl: {text: "v", pos: [-5, -5]},
             vt: {text: "v", pos: [-1, -5]},
             vr: {text: "v", pos: [2, -5]}
         }, # default for note based annotations

         extract: {
             "0" => {
                 title:        "alle Stimmen",
                 startpos:     15,
                 voices:       [1, 2, 3, 4],
                 synchlines:   [[1, 2], [3, 4]],
                 flowlines:    [1, 3],
                 subflowlines: [2, 4],
                 jumplines:    [1, 3],
                 repeatsigns:  {voices: [],
                                left:   {pos: [-7, -2], text: '|:', style: :bold},
                                right:  {pos: [5, -2], text: ':|', style: :bold}
                 },
                 layoutlines:  [1, 2, 3, 4],
                 legend:       {spos: [320, 27], pos: [320, 7]},
                 lyrics:       {},
                 images:       {},
                 #
                 # this denotes the layout parameters which are intended to bne configured
                 # by the regular user
                 layout:      {limit_a3:        true,
                               bottomup:        false,
                               beams:           false,
                               jumpline_anchor: [3, 1],
                               color:           {color_default: 'black', color_variant1: 'grey', color_variant2: 'dimgrey'},
                               LINE_THIN:       0.1,
                               LINE_MEDIUM:     0.3,
                               LINE_THICK:      0.5,
                               PITCH_OFFSET:    -43,
                               X_SPACING:       11.5,
                               X_OFFSET:        2.8, ## todo: set this to layout.ELLIPSE_SIZE first
                               # all numbers in mm
                               ELLIPSE_SIZE: [3.5, 1.7], # radii of the largest Ellipse
                               REST_SIZE:         [4, 2],
                               DRAWING_AREA_SIZE: [400, 282],
                               instrument:        '37-strings-g-g',
                               tuning:            'fixed',
                               packer:            {
                                   pack_method:           0,
                                   pack_max_spreadfactor: 2,
                                   pack_min_increment:    0.2
                               },
                 },
                 sortmark:    {size: [2, 4], fill: true, show: false},
                 nonflowrest: false,
                 notes:       {},
                 tuplets:     {text: "{{tuplet}}"},
                 barnumbers:  {
                     voices:   [],
                     pos:      [6, -4],
                     autopos:  true,
                     apanchor: 'box',
                     apbase:   [1, 1],
                     style:    "small_bold",
                     prefix:   ""
                 },
                 countnotes:  {voices: [], pos: [3, -2], autopos: true, apbase: [1, -0.5], apanchor: 'box', style: "smaller"},
                 chords:  {voices: [], pos: [3, -2], autopos: true, apbase: [1, -0.5], apanchor: 'box', style: "large"},
                 stringnames: {
                     text:  "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
                     vpos:  [],
                     style: :small,
                     marks: {vpos: [11], hpos: [43, 55, 79]}
                 },
                 printer:     {
                     a3_offset:   [0, 0],
                     a4_offset:   [-5, 0],
                     a4_pages:    [0, 1, 2],
                     show_border: false
                 }
             },
             "1" => {
                 title:  "Sopran, Alt",
                 voices: [1, 2]
             },
             "2" => {
                 title:  "Tenor, Bass",
                 voices: [3, 4]
             },
             "3" => {
                 title:  "Melodie",
                 voices: [1]
             },
             "4" => {
                 title:  "Extract 4",
                 voices: [1]
             },
             "5" => {
                 title: "Extract 5", voices: [1]
             }

         },


         # this is the builtin default for layout
         # it is somehow double maintained es
         # extrat.0.layout defines a default as well.
         # but the runtime layout has more parameters which
         # are not intended to be configured by a regular user.
         #
         # nevertheless, an expert user could also change the
         # other parameters
         layout:   {
             grid:        false,
             limit_a3:    true,
             SHOW_SLUR:   false,
             LINE_THIN:   0.1,
             LINE_MEDIUM: 0.3,
             LINE_THICK:  0.5,
             # all numbers in mm
             ELLIPSE_SIZE: [3.5, 1.7], # radii of the largest Ellipse
             REST_SIZE: [4, 2], # radii of the largest Rest Glyph

             # x-size of one step in a pitch. It is the horizontal
             # distance between two strings of the harp

             X_SPACING: 11.5, # Distance of strings

             # X coordinate of the very first beat
             # just to be safe; it will be overridden at least by extract.0.layout.X_OFFSET
             X_OFFSET: 2.8, #ELLIPSE_SIZE.first, ## todo: strictly speaking, this should be adjusted to ELLIPSE_SIZE.first

             Y_SCALE: 4, # 4 mm per minimal
             DRAWING_AREA_SIZE: [400, 282], # Area in which Drawables can be placed

             # this affects the performance of the harpnote renderer
             # it also specifies the resolution of note starts
             # in fact the shortest playable note is 1/16; to display dotted 16, we need 1/32
             # in order to at least being able to handle triplets, we need to scale this up by 3
             # todo:see if we can speed it up by using 16 ...
             BEAT_RESOLUTION: 192, # SHORTEST_NOTE * BEAT_PER_DURATION, ## todo use if want to support 5 * 7 * 9  # Resolution of Beatmap
             SHORTEST_NOTE: 64, # shortest possible note (1/64) do not change this
             # in particular specifies the range of DURATION_TO_STYLE etc.

             BEAT_PER_DURATION: 3, # BEAT_RESOLUTION / SHORTEST_NOTE,

             # this is the negative of midi-pitch of the lowest plaayble note
             # see http://computermusicresource.com/midikeys.html
             PITCH_OFFSET:   -43,

             FONT_STYLE_DEF: {
                 bold:         {text_color: [0, 0, 0], font_size: 12, font_style: "bold"},
                 italic:       {text_color: [0, 0, 0], font_size: 12, font_style: "italic"},
                 large:        {text_color: [0, 0, 0], font_size: 20, font_style: "bold"},
                 regular:      {text_color: [0, 0, 0], font_size: 12, font_style: "normal"},
                 small_bold:   {text_color: [0, 0, 0], font_size: 9, font_style: "bold"},
                 small_italic: {text_color: [0, 0, 0], font_size: 9, font_style: "italic"},
                 small:        {text_color: [0, 0, 0], font_size: 9, font_style: "normal"},
                 smaller:      {text_color: [0, 0, 0], font_size: 6, font_style: "normal"}
             },

             MM_PER_POINT:   0.3, # todo: got bny try/error - should be refactored and ba 0.358

             # This is a lookup table to map durations to giraphical representation
             DURATION_TO_STYLE: {
                 #key      size   fill          dot                  abc duration

                 :err => [2, :filled, false], # 1      1
                 :d64 => [1, :empty, false], # 1      1
                 :d48 => [0.75, :empty, true], # 1/2 *
                 :d32 => [0.75, :empty, false], # 1/2
                 :d24 => [0.75, :filled, true], # 1/4 *
                 :d16 => [0.75, :filled, false], # 1/4
                 :d12 => [0.5, :filled, true], # 1/8 *
                 :d8 => [0.5, :filled, false], # 1/8
                 :d6 => [0.3, :filled, true], # 1/16 *
                 :d4 => [0.3, :filled, false], # 1/16
                 :d3 => [0.1, :filled, true], # 1/32 *
                 :d2 => [0.1, :filled, false], # 1/32
                 :d1 => [0.05, :filled, false] # 1/64
             },

             # this is injected in case of layout.beams = true
             DURATION_TO_BEAMS: {
                 # key     size, fill, dot, number-of-flags (nil = no beam)
                 "d64" => [1, "empty", false],
                 "d48" => [1, "empty", true, 0],
                 "d32" => [1, "empty", false, 0],
                 "d24" => [1, "filled", true, 0],
                 "d16" => [1, "filled", false, 0],
                 "d12" => [1, "filled", true, 1],
                 "d8"  => [1, "filled", false, 1],
                 "d6"  => [1, "filled", true, 2],
                 "d4"  => [1, "filled", false, 2],
                 "d3"  => [1, "filled", true, 3],
                 "d2"  => [1, "filled", false, 3],
                 "d1"  => [1, "filled", false, 4]
             },

             REST_TO_GLYPH:     {
                 # this basically determines the white background rectangel
                 # [sizex, sizey], glyph, dot # note that sizex has no effect.
                 :err => [[2, 2], :rest_1, false], # 1      1
                 :d64 => [[1, 0.8], :rest_1, false], # 1      1   # make it a bit smaller than the note to improve visibility of barover
                 :d48 => [[0.5, 0.4], :rest_1, true], # 1/2 *     # make it a bit smaller than the note to improve visibility of barover
                 :d32 => [[0.5, 0.4], :rest_1, false], # 1/2      # make it a bit smaller than the note to improve visibility of barover
                 :d24 => [[0.4, 0.75], :rest_4, true], # 1/4 *
                 :d16 => [[0.4, 0.75], :rest_4, false], # 1/4
                 :d12 => [[0.4, 0.5], :rest_8, true], # 1/8 *
                 :d8 => [[0.4, 0.5], :rest_8, false], # 1/8
                 :d6 => [[0.4, 0.3], :rest_16, true], # 1/16 *
                 :d4 => [[0.3, 0.3], :rest_16, false], # 1/16
                 :d3 => [[0.3, 0.5], :rest_32, true], # 1/32 *
                 :d2 => [[0.3, 0.5], :rest_32, false], # 1/32
                 :d1 => [[0.3, 0.5], :rest_64, false] # 1/64
             }
         },

         neatjson: {
             wrap:          60, aligned: true,
             after_comma:   1, after_colon_1: 1, after_colon_n: 1, before_colon_n: 1, short: false,
             afterComma:    1, afterColon1: 1, afterColonN: 1, beforeColonN: 1,
             decimals:      2,
             explicit_sort: Hash[explicit_sort.each_with_index.to_a.map { |i| [i.first, '_' + "000#{i.last}"[-4 .. -1]] }]
         }
        }
    result
  end
end

DBX_APIKEY_FULL = "zwydv2vbgp30e05"
DBX_APIKEY_APP  = "xr3zna7wrp75zax"

CONFIG_SEPARATOR = "%%%%zupfnoter.config"
