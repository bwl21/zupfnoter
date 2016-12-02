module InitConf
# how to add a new parameter
# 1. set the default here
# 2. maintain neatjson options to get it sorted here as well
# 3. update controller_command_defnitions to provide the add / edit commands
# 4. update conf_doc_source.rb to provide the documentation and help
# 5. update config-form.rb to attach a type
# 6. update user-interface.js to add the menu entries
  def self.init_conf()
    result =
        {produce:      [0],
         abc_parser:   'ABC2SVG',
         restposition: {default: :center, repeatstart: :next, repeatend: :default},
         wrap:         60,


         # here are values for object which occur multiple times
         # such that there i no expolicit default in the configuration
         defaults:     {
             notebound: {annotation: {pos: [5, -7]},
                         partname:   {pos: [-4, -7]},
                         variantend: {pos: [-4, -7]},
                         tuplet:     {
                             cp1:   [5, 2], # first control point positive x: point is east of flowline, positive y: point is south of note
                             cp2:   [5, -2], # second control point
                             shape: ['c'] # 'c' | 'l' => curve | line
                         }
             }
         },

         # this is used to upddate / create new objects
         templates:    {
                        notes:       {"pos" => [320, 6], "text" => "ENTER_NOTE", "style" => "large"}, # Seitenbeschriftung
                        lyrics:      {verses: [1], pos: [350, 70]},
                        tuplet:      {cp1: [5, 2], cp2: [5, -2], shape: ['c']},
                        annotations: {text: "_vorlage_", pos: [-5, -6]} # Notenbeschriftungsvorlage
         },

         # this is used to populate a presets menu
         # in configuration editor
         presets:      {
             layout:  {
                 regular: nil,
                 compact: nil,
                 large:   nil
             },

             printer: {
                 west:  nil,
                 east:  nil,
                 south: nil
             }
         },

         # these are the builtin notebound annotations
         annotations:  {
             vl: {text: "v", pos: [-5, -5]},
             vt: {text: "v", pos: [2, -5]},
             vr: {text: "v", pos: [-1, -5]}

         }, # default for note based annotations

         extract:      {
             "0" => {
                 title:        "alle Stimmen",
                 filenamepart: nil,
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
                 legend:       {spos: [320, 27], pos: [320, 20]},
                 lyrics:       {},
                 #
                 # this denotes the layout parameters which are intended to bne configured
                 # by the regular user
                 layout:       {limit_a3:     true,
                                LINE_THIN:    0.1,
                                LINE_MEDIUM:  0.3,
                                LINE_THICK:   0.5,
                                # all numbers in mm
                                ELLIPSE_SIZE: [3.5, 1.7], # radii of the largest Ellipse
                                REST_SIZE:    [4, 2],
                                packer:       {
                                    pack_method:           0,
                                    pack_max_spreadfactor: 2,
                                    pack_min_increment:    0.2
                                },
                                limit_a3:     true
                 },
                 nonflowrest:  false,
                 notes:        {},
                 barnumbers:   {
                     voices:  [],
                     pos:     [6, -4],
                     autopos: false,
                     style:   "small_bold",
                     prefix:  ""
                 },
                 countnotes:   {voices: [], pos: [3, -2], autopos: false, style: "smaller"},
                 stringnames:  {
                     text:  "G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G G# A A# B C C# D D# E F F# G",
                     vpos:  [],
                     style: :small,
                     marks: {vpos: [11], hpos: [43, 55, 79]}
                 },
                 printer:      {
                     a3_offset:   [0, 0],
                     a4_offset:   [-5, 0],
                     show_border: true
                 }
             },
             "1" => {
                 title:        "Sopran, Alt",
                 filenamepart: nil,
                 voices:       [1, 2]
             },
             "2" => {
                 title:        "Tenor, Bass",
                 filenamepart: nil,
                 voices:       [3, 4]
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
         layout:       {
             grid:              false,
             packer:            {
                 pack_method:           0,
                 pack_max_spreadfactor: 2,
                 pack_min_increment:    0.2
             },
             limit_a3:          true,
             SHOW_SLUR:         false,
             LINE_THIN:         0.1,
             LINE_MEDIUM:       0.3,
             LINE_THICK:        0.5,
             # all numbers in mm
             ELLIPSE_SIZE:      [3.5, 1.7], # radii of the largest Ellipse
             REST_SIZE:         [4, 2], # radii of the largest Rest Glyph

             # x-size of one step in a pitch. It is the horizontal
             # distance between two strings of the harp

             X_SPACING:         11.5, # Distance of strings

             # X coordinate of the very first beat
             X_OFFSET:          2.8, #ELLIPSE_SIZE.first,

             Y_SCALE:           4, # 4 mm per minimal
             DRAWING_AREA_SIZE: [400, 282], # Area in which Drawables can be placed

             # this affects the performance of the harpnote renderer
             # it also specifies the resolution of note starts
             # in fact the shortest playable note is 1/16; to display dotted 16, we need 1/32
             # in order to at least being able to handle triplets, we need to scale this up by 3
             # todo:see if we can speed it up by using 16 ...
             BEAT_RESOLUTION:   192, # SHORTEST_NOTE * BEAT_PER_DURATION, ## todo use if want to support 5 * 7 * 9  # Resolution of Beatmap
             SHORTEST_NOTE:     64, # shortest possible note (1/64) do not change this
             # in particular specifies the range of DURATION_TO_STYLE etc.

             BEAT_PER_DURATION: 3, # BEAT_RESOLUTION / SHORTEST_NOTE,

             # this is the negative of midi-pitch of the lowest plaayble note
             # see http://computermusicresource.com/midikeys.html
             PITCH_OFFSET:      -43,

             FONT_STYLE_DEF:    {
                 bold:         {text_color: [0, 0, 0], font_size: 12, font_style: "bold"},
                 italic:       {text_color: [0, 0, 0], font_size: 12, font_style: "italic"},
                 large:        {text_color: [0, 0, 0], font_size: 20, font_style: "bold"},
                 regular:      {text_color: [0, 0, 0], font_size: 12, font_style: "normal"},
                 small_bold:   {text_color: [0, 0, 0], font_size: 9, font_style: "bold"},
                 small_italic: {text_color: [0, 0, 0], font_size: 9, font_style: "italic"},
                 small:        {text_color: [0, 0, 0], font_size: 9, font_style: "normal"},
                 smaller:      {text_color: [0, 0, 0], font_size: 6, font_style: "normal"}
             },

             MM_PER_POINT:      0.3,

             # This is a lookup table to map durations to giraphical representation
             DURATION_TO_STYLE: {
                 #key      size   fill          dot                  abc duration

                 :err => [2, :filled, FALSE], # 1      1
                 :d64 => [1, :empty, FALSE], # 1      1
                 :d48 => [0.75, :empty, TRUE], # 1/2 *
                 :d32 => [0.75, :empty, FALSE], # 1/2
                 :d24 => [0.75, :filled, TRUE], # 1/4 *
                 :d16 => [0.75, :filled, FALSE], # 1/4
                 :d12 => [0.5, :filled, TRUE], # 1/8 *
                 :d8  => [0.5, :filled, FALSE], # 1/8
                 :d6  => [0.3, :filled, TRUE], # 1/16 *
                 :d4  => [0.3, :filled, FALSE], # 1/16
                 :d3  => [0.1, :filled, TRUE], # 1/32 *
                 :d2  => [0.1, :filled, FALSE], # 1/32
                 :d1  => [0.05, :filled, FALSE] # 1/64
             },

             REST_TO_GLYPH:     {
                 # this basically determines the white background rectangel
                 # [sizex, sizey], glyph, dot # note that sizex has no effect.
                 :err => [[2, 2], :rest_1, FALSE], # 1      1
                 :d64 => [[1, 0.8], :rest_1, FALSE], # 1      1   # make it a bit smaller than the note to improve visibility of barover
                 :d48 => [[0.5, 0.4], :rest_1, TRUE], # 1/2 *     # make it a bit smaller than the note to improve visibility of barover
                 :d32 => [[0.5, 0.4], :rest_1, FALSE], # 1/2      # make it a bit smaller than the note to improve visibility of barover
                 :d24 => [[0.4, 0.75], :rest_4, TRUE], # 1/4 *
                 :d16 => [[0.4, 0.75], :rest_4, FALSE], # 1/4
                 :d12 => [[0.4, 0.5], :rest_8, TRUE], # 1/8 *
                 :d8  => [[0.4, 0.5], :rest_8, FALSE], # 1/8
                 :d6  => [[0.4, 0.3], :rest_16, TRUE], # 1/16 *
                 :d4  => [[0.3, 0.3], :rest_16, FALSE], # 1/16
                 :d3  => [[0.3, 0.5], :rest_32, TRUE], # 1/32 *
                 :d2  => [[0.3, 0.5], :rest_32, FALSE], # 1/32
                 :d1  => [[0.3, 0.5], :rest_64, FALSE] # 1/64
             }
         },

         neatjson:     {
             wrap:          60, aligned: true, after_comma: 1, after_colon_1: 1, after_colon_n: 1, before_colon_n: 1, sorted: true,
             decimals:      2,
             explicit_sort: [[:produce, :annotations, :restposition, :default, :repeatstart, :repeatend, :extract,
                              :title, :filenamepart, :startpos, :voices, :flowlines, :subflowlines, :synchlines, :jumplines, :repeatsigns, :layoutlines, :barnumbers, :countnotes,
                              :legend, :nonflowrest, :lyrics, :notes, :tuplet, :layout, :printer,
                              #
                              :annotation, :partname, :variantend, :countnote, :stringnames, # sort within notebound

                              # sort within layout
                              :limit_a3, :LINE_THIN, :LINE_MEDIUM, :LINE_THICK, :ELLIPSE_SIZE, :REST_SIZE,
                              :DRAWING_AREA_SIZE,
                              :packer, :pack_method, :pack_max_spreadfactor, :pack_min_increment,

                              # sort within printer
                              :a3_offset, :a4_offset, # sort within laoyut

                              "0", "1", "2", "3", "4", "5", "6", :verses, # extracts
                              :cp1, :cp2, :shape, :pos, :hpos, :vpos, :spos, :autopos, :text, :style, :marks # tuplets annotations
                             ],
                             []],
         }
        }

    result
  end
end