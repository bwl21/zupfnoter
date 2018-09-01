# the top level namespace

module Harpnotes

  # The music model that is transformed (layouted) to something drawable
  #
  # =Terminology
  #
  # - *beat*: denotes the start time of a note. So the entire song
  #   is divided into beats (as the musician counts). Beats are mainly
  #   used to determine the vertical position of a Playable in the harp sheet
  #
  # - *beat_map*: a mapping of playables to the beats of the the music.
  #
  # - *beat_layout*: a mapping between the bats of the music and the beats shown in the sheet.
  #   basically it is an approach to vertically compress the sheet.
  #
  # - *Flowline*: a representation of the flow of the music. Flowlines connect notes
  #
  # - *Jumpline*: an indicator of jumps within the piece. The music continues at then end
  #   of the jumpline
  #
  # - *Synchline*: an indicator for notes to be played simultaneously. They synchronize
  #   two voices
  #
  #
  #
  # =Basic concept
  #

  #  Song -> Staff* -> Voice* -> MusicEntity*
  #
  # 1. Music is denoted as Song
  # 2. Staff: Song consists of Staffs. Staffs may be printed on the same sheet with synchronized beats
  #    but without Synclines
  # 3. Voice: A Staff consists of multiple voices. Voices are printed with synclines
  # 4. MusicEntity: A Voice is represented as a squence (Array) of MusicEntities. This can be Plaaybles
  #    but also other entis required to specify the music
  # 5. Playable < MusicEntitiy - an entity which is actually played
  #
  # 6. Note: Measures are not modelled as containers ...
  #

  # =the Transformation chain
  #
  # ABC --abcjs--> tune --transform-->
  #            Harpnotes (Song) --layout-->
  #                                          Drawing (Sheet) --RaphaelEngine-->
  #                                                                          SVG
  #                                                          --PdfEngine-->
  #                                                                          PDF
  #
  # == Output of abcjs
  #    tune *(staff = (lines = (voices = (note | ....)))
  #
  #    note
  #    stem
  #    bar
  #    starttriplet
  #    annotation
  #    chord
  #
  # == Harpnotes
  #
  # is a representation of music targeting to Harpnote representation but independent
  # of the particular Layout
  #
  # we have
  #
  # Song
  # Note
  # Pause
  # Jumpline
  # Flowline
  #
  # Annnotation
  # ...
  #

  #
  # == Layout
  #
  # Ellipse
  # Flowline
  # Jumpline
  # Annotation
  # Bar


  module Music

    # Marks classes in this model
    #
    class MusicEntity
      attr_accessor :beat, # the beat: Todo: this correlates to time and should be removed
                    #:box, # ?? todo remove this
                    :conf_key,
                    :count_note, # string to support count_notes need to be queried even for measuers ...
                    :decorations, # decorations
                    :end_pos, # end position in source
                    :next_pitch, # pitch of next entity
                    :next_first_in_part, # indicate if next note is first in part
                    :next_playable, # next playable in voice
                    :prev_pitch, # pitch of previous entity
                    :prev_playable, # prev playable in voice
                    :start_pos, # start postition in source
                    :time, # position in time
                    :endtime, # end position in time we need this to get a time base for meter symbols.
                    :visible, # boolean is visible
                    :variant, # the variant within a variant block
                    :znid, # id for zupfnoter
                    :origin, # backtrace to abc2svg object
                    #
                    # note that these attributes are annotated in Layout
                    :sheet_drawable # reference to the drawable


      def initialize
        @visible = true
        @origin  = nil,
            @decorations = []
      end

      def visible?
        @visible
      end


      def start_pos_to_s
        "[#{@start_pos.first}:#{@start_pos.last}]"
      end


      def to_json
        Hash[[['class', self.class]] + (instance_variables - ['@constructor', '@toString']).map { |v|
          [v, instance_variable_get(v)]
        }].to_json
      end
    end

    # Non playable entities are not audible but still
    # be part of the harpnote sheet
    # pitch and beat are delegated to its companion
    class NonPlayable < MusicEntity
      attr_accessor :companion

      #
      # Constructor
      # @param companion [Note] The related playable to which
      # the non playable shall be bound, e.g. the first note in a measure
      #
      def companion=(companion)
        raise "Companion must be playable" unless companion.is_a? Harpnotes::Music::Playable
        @companion = companion
      end


      #
      # Return the associated pitch
      #
      # @return [Numeric] The pitch of the companion
      def pitch
        @companion.pitch rescue nil
      end


      #
      # Return the associated beat
      #
      # @return [Numeric] Beat of the companion
      def beat
        @companion.beat rescue nil
      end


      #
      # Return associated Duration
      #
      # @return [Numeric] Duration of the companion
      def duration
        @companion.duration rescue nil
      end

    end


    # Marks playable Music entities
    #
    # todo: playable shall provide duration
    class Playable < MusicEntity
      attr_accessor :first_in_part, # boolean
                    :jump_starts, # Array of labels for jumpstarts defined by this playables
                    :jump_ends, # Array of labels for jumpends defined by this playable
                    :slur_starts, # Array of labels for slur starts defined by this playable
                    :slur_ends, # Array of labels for slur ends defined by this playable
                    :tie_start, # Boolean: this is the start of a tie
                    :tie_end, # Boolean: this is the end of a tie
                    :duration, # the duration of the playable
                    :tuplet, # number of notes in tuplet if it is in a tuplet
                    :tuplet_start, # first note of a tuplet
                    :tuplet_end, # last note of a tuplet
                    :shift, # {dir: :left | :right}
                    :count_note, # string to support count_notes
                    :measure_count, # number of meausre for barnumbers
                    :measure_start # this playable starts a measure


      def initialize
        # initialize slur and ties to the safe side ...
        super
        @slur_starts  = []
        @slur_ends    = []
        @tie_start    = false
        @tie_end      = false
        @tuplet       = 1
        @tuplet_start = false
        @tuplet_end   = false
        @count_note   = nil
      end

      def first_in_part?
        first_in_part
      end

      def tie_end?
        @tie_end
      end

      def tie_start?
        @tie_start
      end

      def tuplet_start?
        @tuplet_start
      end

      def tuplet_end?
        @tuplet_end
      end

      def measure_start?
        @measure_start
      end

      # this yields a proxy note for the playable
      def proxy_note
        self
      end

      # this yields the most left note of the playable
      def left
        self
      end

      # this yields the most right note of a unison
      def right
        self
      end
    end

    # A single note
    #
    class Note < Playable
      attr_reader :pitch, :duration

      #
      # Constructor

      # @param pitch [Integer] A designator of the note (http://computermusicresource.com/midikeys.html)
      # @param duration [Integer] see Playable
      #
      # @return [type] [description]
      #
      def initialize(pitch, duration)
        super()
        raise("trying to create a note with undefined pitch") if pitch.nil?
        @pitch         = pitch
        @next_pitch    = pitch
        @next_playable = self
        @prev_pitch    = pitch
        @prev_playable = self
        @duration      = duration
      end

    end

    # An accord: multiple notes played simultaneously
    # note that we basically use an interval as
    # on table harps accords are difficult (but not impossible)
    # to play.
    #
    # It is called SynchPoint since it is represented by a horizontal
    # line connecting the involved notes
    class SynchPoint < Playable
      attr_reader :notes, :synched_notes

      #
      # Constructor
      #
      # @param notes [Array of Note] The particular notes of the chord
      # @param [Object] synched_notes the notes synched by this point
      def initialize(notes, synched_notes = [])
        super()
        raise "Notes must be an array" unless notes.is_a? Array

        @notes         = notes
        @synched_notes = [notes, synched_notes].flatten.uniq
      end

      def measure_start
        proxy_note.measure_start
      end

      alias_method :measure_start?, :measure_start

      #
      # Yield the duration of the SyncPoint
      # Accords are always played the same length
      # (otherwise it is not an Accord). Therefore
      # we can provide the duration as the duration
      # of the first note.
      #
      # @return [Integer] see Playable
      def duration
        proxy_note.duration
      end

      #
      # This sets the actual beat
      #
      # @param value [Integer] id of the beat
      #
      # @return [type] [description]
      def beat=(value)
        @beat = value
        @notes.each { |n| n.beat = value }
      end

      def pitch
        proxy_note.pitch
      end

      def proxy_note
        get_proxy_object(@notes)
      end

      def variant
        proxy_note.variant
      end

      def sheet_drawable
        proxy_note.sheet_drawable
      end

      def prev_playable
        proxy_note.prev_playable
      end

      def prev_playable=(playable)
        proxy_note.prev_playable = playable
      end

      def next_playable
        proxy_note.next_playable
      end

      def next_playable=(playable)
        proxy_note.next_playable = playable
      end

      # a Synchpoint is made of multiple notes
      # thse notes may be layouted
      # nevertheless, a synchpoint needs to be represented
      # by a proxy object for jumplines, geting centes, pitch etc.
      # 
      # this methods provides a single point of maintenance
      # to determine if the first or the last note (or derivative of the same)
      # shall represent the synchpoint
      #
      # @param [Array of Objects] objects representing the Syncpoint
      # @return [Object]
      def get_proxy_object(objects)
        objects.last
      end


      def left
        @notes.first # sort_by { |i| i.pitch }.first
      end

      def right
        @notes.last #sort_by { |i| i.pitch }.last
      end

    end

    # A pause also called 'rest'. It is not really
    # 'played' but has a duration
    #
    #
    class Pause < Playable
      # note that the pitch is used to support layout ...
      attr_accessor :duration, :pitch

      #
      # Constructor
      # @param duration [Integer] duration - see Playable

      #
      # @return [Type] [description]
      def initialize(pitch, duration)
        super()
        raise("trying to create a rest with undefined pitch") if pitch.nil?

        @pitch         = pitch
        @duration      = duration
        @next_playable = self
        @prev_pitch    = pitch
        @prev_playable = self
      end


      def visible=(visible)
        @visible = visible
      end

      def visible?
        @visible
      end

    end


    #
    # This class denotes the start of a Measure
    # It has a companion to associate it with a
    # beat. The companion is the note played after
    # the Measure. But Measures are not played and
    # do not change the vertical position in the
    # sheet.
    #
    # But they implicitly revoke accidents!
    #
    class MeasureStart < NonPlayable
      def initialize(companion)
        super()
        self.companion = companion
        @visible       = companion.visible?
      end
    end

    #
    # this represents the beginning of a new part
    #
    class NewPart < NonPlayable
      attr_reader :name

      def initialize(title, conf_key = nil)
        super()
        @conf_key = conf_key
        @name     = title
      end
    end


    #
    class NoteBoundAnnotation < NonPlayable
      # @param [Object] companion the note which is annotated
      # @param [Object] annotation the annotation {pos:[array], text:""} position relative to note
      def initialize(companion, annotation, conf_key = nil)
        super()
        self.companion = companion # self: use the method companion=
        @conf_key      = conf_key
        @annotations   = annotation
      end

      def style
        @annotations[:style] || :regular # default styl of notebound annotations
      end

      def text
        @annotations[:text]
      end

      def position
        @annotations[:pos]
      end

      def policy # this is used for filtering in layout for example if visibility is to be controlled (annotations on variant endings : Goto)
        @annotations[:policy]
      end
    end

    #
    # This denotes a situation where the playing of the
    # music shall be continued somewhere elase. It is represented
    # as an arrow in the sheet.
    #
    # Yes, the name is not really good, sinc ca capo in fact means
    # to continue from the beginning.
    #
    # The most prominent application is a repetition
    #
    class Goto < MusicEntity
      attr_reader :from, :to, :policy

      #
      # constrcutor
      # @param  [Playable] from -  the end point of jump (repeat from)
      # @param  [Playable] to - the Start point of jump (repeat to )
      # @param  [Hash] verticalpos - { level:, distance:} A verticalpos, used to optimize the graphical representation.
      #
      def initialize(from, to, policy)
        super()
        raise "End point of Jump (#{from.class}) must be a Playable" unless from.is_a? Harpnotes::Music::Playable
        raise "Start point of Jump (#{to.class}) must be a Playable" unless to.is_a? Harpnotes::Music::Playable

        @from     = from
        @to       = to
        @policy   = policy
        @conf_key = policy[:conf_key]
      end
    end


    # this represents a BeatMap which is basically a keyed access to playables
    # where the key is the beat of the playable
    #
    # additionally it has an index to indicate the index of the corresponding voice
    #
    class BeatMap < Hash
      attr_accessor :index

      def initialize(index)
        @index = index
      end
    end

    #
    # This represents the actual song / music piece
    #
    class Song
      attr_reader :voices, :beat_maps
      attr_accessor :meta_data, :harpnote_options, :checksum

      def to_json
        {voices: @voices, beat_maps: @beat_maps, meta_data: @meta_data, harpnote_options: @harpnote_options}.to_json
      end

      #
      # Constructor
      # @param voices [Array of ABCVoice] The voices in the song
      # @param note_length_in_beats [Integer] the shortest note todo: not used?
      #
      def initialize(voices = [], note_length_in_beats = 8, metadata = {})
        @voices               = voices
        @note_length_in_beats = note_length_in_beats
        @meta_data            = metadata
        @views                = []
        update_beats
      end

      #
      # Append a voice to the song
      # @param voice [Array of MusicEntity] The voice to be added
      #
      # @return [type] [description]
      def <<(voice)
        @voices << voice
        update_beats
      end

      #
      # This builds the Syncpoints within the song
      #
      # @param selector [Array] index of the two voices to be synchend
      # @return [Array] The syncpoints which were found in the song
      def build_synch_points(selector = nil)
        syncpoints = expanded_beat_maps.map do |beatmap_entry|
          playables = [beatmap_entry[selector.first], beatmap_entry[selector.last]].compact.select { |i| i.visible? } # if selector

          # compute the shortest synchline between the tow voices
          # find most left and most right notes of the involved voices

          pfirst = playables[0]
          plast  = playables[1]

          # it might be that on the particular beat there are not two visible playaybles
          # playables might be a synchpoint so we consider synchronization of two unisons
          # [left, right] <-> [left, right]
          # we have to find the shortest diestance

          if pfirst && plast
            first_left  = pfirst.left
            first_right = pfirst.right

            last_left  = plast.left
            last_right = plast.right

            candidates = [first_left, first_right].product [last_left, last_right]
          end

          if candidates
            synchpoint = candidates.min_by { |i| (i.last.pitch - i.first.pitch).abs }
            result     = SynchPoint.new(synchpoint, candidates)
          end

          result
        end.flatten.compact

        syncpoints
      end

      #
      # Computes the last beat in this song
      #
      # @return Numeric the last beat of this song
      def last_beat
        max_beat = @beat_maps.map { |map| map.keys.max }.max
      end

      #
      # Computes an expanded beat_map with an element for each beat.
      #
      # @return [Array] an array of playables. The index is the beat. Playables are ordered by the song voice order.
      def expanded_beat_maps
        (0 .. last_beat).map do |beat|
          @beat_maps.map { |map| map[beat] }
        end
      end

      private
      #
      # Updates the beat map of the song.
      # A beat map of a voice is a hash (current_beat => playable).
      # this method also updates the beat in the considered playable
      #
      # note that it requires that the voice elements already have their
      # time stamps
      #
      # @return nil
      def update_beats
        @beat_maps = @voices.map do |voice|
          current_beat = 0
          voice_map    = voice.select { |e| e.is_a? Playable }.inject(BeatMap.new(voice.index)) do |map, playable|
            current_beat       = playable.time / 8 # todo: replace literal - replace beat by time
            current_beat_floor = current_beat.floor(0)

            beat_error = current_beat - current_beat_floor
            if beat_error > 0
              pos = playable.start_pos
              $log.error("unsupported tuplet #{playable.tuplet} #{beat_error}", pos) # to support more, adjust BEAT_RESOLUTION to be mulpple of triplet
              current_beat = current_beat_floor
            end


            map[current_beat] = playable
            playable.beat     = current_beat

            map.index = voice.index
            map
          end
          voice_map
        end

        nil
      end

    end

    # this represents a voice and its properties
    # as it is derived from an array, it can represent voices in ABC as well as in Harpnote domain

    class Voice < Array
      attr_accessor :index, :name, :show_voice, :show_flowline, :show_jumpline

      def initialize()
        @show_voice    = true
        @show_flowline = true
        @show_jumpline = true
        super
      end

      def show_voice?()
        @show_voice == true
      end

      def show_flowline?()
        @show_flowline == true
      end

      def show_jumpline?()
        @show_jumpline == true
      end
    end
  end

  # The drawing model
  module Drawing


    # this class represents a collition detector
    #
    # whenver a #check is called, the objects are kept
    # in an instance variable. By this subesequent check
    # investigate the collision of objects with all previous ones
    #
    # usage pattern
    #
    # a = ColllisionDetector.new
    # a.check(res_annoations)     # chec
    # a.check(res_flowlines)
    # a.reset                     # restart a check
    # a.check(res_barnumbers + res_countnotes)
    #
    # Hint: be sure to perform a reset after all check
    # in oder to free memory.
    #
    class CollisionDetector
      def initialize
        reset
      end

      def check_annotations(drawables)
        drawables.select { |i| i.is_a? Annotation }.each do |drawable|
          _check1(drawable.center, drawable.size, drawable.conf_key, drawable.origin)
        end
      end

      def reset
        @coll_stack = []
      end

      # this performs a heuristic check of annotatoin collisions
      #
      # todo: try to correct the point ...
      def _check1(point, size, confkey, playable)
        x, y         = point
        xsize, ysize = size
        rect         = [x, y, x + xsize, y + ysize]

        collision = @coll_stack.select { |i| _rect_overlap?(i, rect) }
        startpos  = [0, 0]
        unless collision.empty?
          begin
            startpos = playable[:start_pos]
          rescue
            $log.error("BUG: Annotation without origin #{__FILE__} #{__LINE__}")
            [0, 0]
          end
          $log.warning(I18n.t("annotations too close [") + "#{collision.count}] #{confkey}", startpos)
        end

        @coll_stack.push(rect)
        point
      end


      def _rect_overlap?(rect1, rect2)
        left1, top1, right1, bottom1 = rect1
        left2, top2, right2, bottom2 = rect2
        (right1 > left2) and (right2 > left1) and (bottom1 > top2) and (bottom2 > top1)
      end

    end

    #
    # This is the drawing model of a tableharp sheet.
    # Note that this model is still independent from the rendering engine.
    # It comprises the drawing semantic drawing prmitives
    #
    #
    class Sheet
      attr_reader :children, :active_voices
      attr_accessor :printer_config

      # Constructor
      # @param children [Array of primitives]  the primitives which are drawn
      # @param vertical_scale = 1.0 [Numeric]  A factor to map the beats to vertical positions. todo: maybe superfluous
      # @param [Object] active_voices the array provided by voices entry of configuration; required for player
      #
      # @return [type] [description]
      def initialize(children, active_voices)
        @children       = children
        @active_voices  = active_voices
        @printer_config = $conf['printer']
      end
    end

    # this represents a drawable which is actually a compound
    # of drawables.
    class CompoundDrawable

      attr_accessor :shapes, :proxy

      def initialize(shapes, proxy)
        @shapes = shapes
        @proxy  = proxy
      end

      # push a single drawable
      def push(drawable)
        @shapes << drawable
      end

      # merge a compound drawable
      def merge (compound_drawable)
        @shapes += compound_drawable.shapes
      end

    end

    # this represents objects which can be visible
    # draginfo {handler: :drag | jumpline | bezier,
    #           jumpline {p1: [x1, y1], pv: xv, p2: [x2, y1] } |
    #           bezier: {cp1: [x1, y2], cp2: [x2, y2]}
    #
    # }
    class Drawable
      attr_accessor :conf_key, :conf_value, :draginfo, :color, :size, :note_conf_base

      def initialize
        @visible    = true
        @line_width = $conf.get('layout.LINE_THIN')
        @conf_key   = nil
        @color      = $conf.get('layout.color.color_default')
        @size       = [1, 1]
      end

      def center
        raise "center not implemented for #{self.class}"
      end

      def visible?
        @visible
      end

      def visible=(v)
        @visible = v
      end

      def line_width=(v)
        @line_width = v
      end

      def line_width
        @line_width
      end

      def color=(v)
        @color = v
      end

      def color
        @color
      end

      def size_with_dot
        result = @size.clone
        if dotted?
          result[0] = result[0] + 1
        end
        result
      end


    end


    class Symbol < Drawable
      attr_accessor :dotted, :hasbarover

      def iniitalize
        super
      end

      def dotted?
        @dotted
      end

      def hasbarover?
        @hasbarover
      end

    end

    #
    # This represents a flowline
    #
    class FlowLine < Drawable
      attr_reader :from, :to, :style

      # @param from [Drawable] the origin of the flow
      # @param to   [Drawable] the target of the flow
      # @param style [Symbol] either :dashed or :solid
      # @param origin [Object] An object to support backtrace, drill down etc.
      # @param [Object] center the center of the main Playable in that flowline - requrired for jumplines to Syncpoints
      # @param [Object] size the size of the main Playable in that flowline - requrired for jumplines to Syncpoints
      #
      #
      # @return [type] [description]
      def initialize(from, to, style = :solid)
        super()
        @from  = from
        @to    = to
        @style = style
        # just to avoid runtime messages
      end

      #
      # Indicates of the flowline shall be drawn as dashed
      # Syntactic sugar for the attr_reader
      #
      # @return [type] [description]
      def dashed?
        @style == :dashed
      end


      #
      # Indicates of the flowline shall be drawn as dotted
      # Syntactic sugar for the attr_reader
      #
      # @return [type] [description]
      def dotted?
        @style == :dotted
      end
    end


    class Image < Drawable
      attr_reader :url, :llpos, :height, :opacity, :origin
      # @param [String] url of imabge
      # @param [Vector2d] llpos lower left postion of crop in image
      # @param [Vector2d] trpos to right postion of crop in image
      def initialize (url, llpos, height, origin = nil)
        @url    = url
        @llpos  = llpos
        @height = height
        @origin = nil
      end
    end

    # this represents a path to be rendered. The path is noted as an array of path commands:
    # ["l", x, y ] or
    # ["c", x, y, cp1x, cp1y, cp2x, cp2y}]
    # ["M", x, y]
    class Path < Drawable
      attr_reader :path, :style, :origin


      # @param [Array] path see class description for details
      # @param [Symbol] fill :filled makes the path to be filled
      # @param [Object] origin Reference to the origin object for tracing purposes
      def initialize(path, fill = nil, origin = nil)
        super()
        @path   = path
        @fill   = fill
        @origin = origin
      end

      def filled?
        @fill == :filled
      end
    end


    #
    # This represents a note in the shape of an ellipsis
    #
    class Ellipse < Symbol
      attr_reader :center, :size, :fill, :origin, :color

      #
      # Constructor
      #
      # @param radii [Array] the radii of the ellipse as [width, height]
      # @param fill [Symbol] the fill style, either :filled or :empty
      # @param dotted [Boolean] true if the ellipse has a small companion dot, FALSE otherwise
      # @param origin [Object] The source object of the upstream model - to support upstream mapping
      #                        if no origin is given, no clickhandler is created
      # @param rect [Boolean] true if the ellipse is in fact a rectangle
      #
      def initialize(center, radii, fill = :filled, dotted = false, origin = nil, rect = false)
        super()
        @center = center
        @size   = radii
        @fill   = fill
        @dotted = dotted
        @rect   = rect
        @origin = origin
      end

      #
      # Return the height of the Ellipse
      #
      # @return [Numeric] The height of the ellipse
      def height
        @size.last
      end

      #
      # Indicate if the Ellipse shall have a Punctuation dot
      #
      # @return [Boolean] TRUE if ther shall be a punctuation dot
      def dotted?
        dotted
      end

      # Indicate if the Ellipse shall be filled
      #
      # @return [Boolean] TRUE if ther shall be filled
      #
      def filled?
        @fill == :filled
      end

      def rect?
        @rect == true
      end
    end

    #
    # Represent a text on the sheet
    #
    #
    class Annotation < Drawable
      attr_reader :center, :text, :style, :origin
      attr_accessor :conf_key, :conf_value

      # @param center Array the position of the text as [x, y]
      # @param text String the text itself
      # @param style Symbol the text style, can be :regular, :large (as defined in pdfengine)
      # @param [Object] origin # reference to the origin (abc object)
      # @param [string] conf_key - the key for configuration (used for dragging annotation)
      # @param [Object] conf_value - the value for configuration (used for dragging annotation)
      def initialize(center, text, style = :regular, origin = nil, conf_key = nil, conf_value = {})
        super()
        @center     = center
        @text       = text
        @style      = style
        @origin     = origin
        @conf_key   = conf_key
        @conf_value = conf_value
      end

      # this estimates the size of an annotation
      def size
        if @text and @text.strip.length > 0
          font_size = $conf.get("layout.FONT_STYLE_DEF.#{@style}.font_size")
          unless font_size
            font_size = 10
            $log.error("unsupported style for annotation: #{@style}")
          end
          ysize = font_size * $conf.get("layout.MM_PER_POINT").to_f
          xsize = @text.length * ysize # todo: this needs improvement (multiline texts, monospace fonts.)
        else
          xsize, ysize = 1.5, 2 # todo: this is pretty heuristic
        end
        [xsize, ysize]
      end
    end


    #
    # represent a glyph on the sheet
    #

    class Glyph < Symbol
      attr_reader :center, :size, :glyph, :origin

      GLYPHS = {
          # todo: apply a proper approach for the glyphs: Specify a bounding box here
          # we trim the intial move somehow - don't really konw what i am doing
          # ["M", 0.06, 0.03]
          #rest_0:   {d: [["M", 0.06 -0.06 - 11.25/2, 0.03-1.7*4.68], ["l", 0.09, -0.06], ["l", 5.46, 0], ["l", 5.49, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 2.19], ["l", 0, 2.19], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -5.49, 0], ["l", -5.46, 0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -2.19], ["l", 0, -2.19], ["z"]], w: 2* 11.25, h: 2.2*4.68},
          rest_1: {d: [["M", -10, -5], ['l', 20, 0], ['l', 0, 10], ['l', -20, 0], ['l', 0, -10], ['z']], w: 20, h: 10},
          # optimized by try and error: orginal: ["M", 1.89, -11.82]
          rest_4: {d: [["M", -1, -10], ["c", 0.12, -0.06, 0.24, -0.06, 0.36, -0.03], ["c", 0.09, 0.06, 4.74, 5.58, 4.86, 5.82], ["c", 0.21, 0.39, 0.15, 0.78, -0.15, 1.26],
                       ["c", -0.24, 0.33, -0.72, 0.81, -1.62, 1.56], ["c", -0.45, 0.36, -0.87, 0.75, -0.96, 0.84], ["c", -0.93, 0.99, -1.14, 2.49, -0.6, 3.63],
                       ["c", 0.18, 0.39, 0.27, 0.48, 1.32, 1.68], ["c", 1.92, 2.25, 1.83, 2.16, 1.83, 2.34], ["c", -0, 0.18, -0.18, 0.36, -0.36, 0.39],
                       ["c", -0.15, -0, -0.27, -0.06, -0.48, -0.27], ["c", -0.75, -0.75, -2.46, -1.29, -3.39, -1.08], ["c", -0.45, 0.09, -0.69, 0.27, -0.9, 0.69],
                       ["c", -0.12, 0.3, -0.21, 0.66, -0.24, 1.14], ["c", -0.03, 0.66, 0.09, 1.35, 0.3, 2.01], ["c", 0.15, 0.42, 0.24, 0.66, 0.45, 0.96],
                       ["c", 0.18, 0.24, 0.18, 0.33, 0.03, 0.42], ["c", -0.12, 0.06, -0.18, 0.03, -0.45, -0.3], ["c", -1.08, -1.38, -2.07, -3.36, -2.4, -4.83],
                       ["c", -0.27, -1.05, -0.15, -1.77, 0.27, -2.07], ["c", 0.21, -0.12, 0.42, -0.15, 0.87, -0.15], ["c", 0.87, 0.06, 2.1, 0.39, 3.3, 0.9],
                       ["l", 0.39, 0.18], ["l", -1.65, -1.95], ["c", -2.52, -2.97, -2.61, -3.09, -2.7, -3.27], ["c", -0.09, -0.24, -0.12, -0.48, -0.03, -0.75],
                       ["c", 0.15, -0.48, 0.57, -0.96, 1.83, -2.01], ["c", 0.45, -0.36, 0.84, -0.72, 0.93, -0.78], ["c", 0.69, -0.75, 1.02, -1.8, 0.9, -2.79],
                       ["c", -0.06, -0.33, -0.21, -0.84, -0.39, -1.11], ["c", -0.09, -0.15, -0.45, -0.6, -0.81, -1.05], ["c", -0.36, -0.42, -0.69, -0.81, -0.72, -0.87],
                       ["c", -0.09, -0.18, -0, -0.42, 0.21, -0.51], ["z"]],
                   w: 7.888, h: 21.435}, #w: 7.888, h: 21.435 },
          # optimized by try and error: orginal: ["M", 1.68, -6.12]
          rest_8: {d: [["M", -2, -6.7], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72],
                       ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.39, -0.18, 1.32, -1.29, 1.68, -1.98],
                       ["c", 0.09, -0.21, 0.24, -0.3, 0.39, -0.3], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.27, 1.11, -1.86, 6.42],
                       ["c", -1.02, 3.48, -1.89, 6.39, -1.92, 6.42], ["c", 0, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09],
                       ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.15, -0.57, 1.68, -4.92],
                       ["c", 0.96, -2.67, 1.74, -4.89, 1.71, -4.89], ["l", -0.51, 0.15], ["c", -1.08, 0.36, -1.74, 0.48, -2.55, 0.48],
                       ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]],
                   w: 7.534, h: 13.883}, #w: 7.534, h: 13.883 },
          rest_16:  {d: [["M", -1.33, -11.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.87, 0.42], ["c", 0.39, -0.18, 1.2, -1.23, 1.62, -2.07], ["c", 0.06, -0.15, 0.24, -0.24, 0.36, -0.24], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.45, 1.86, -2.67, 10.17], ["c", -1.5, 5.55, -2.73, 10.14, -2.76, 10.17], ["c", -0.03, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.12, -0.57, 1.44, -4.92], ["c", 0.81, -2.67, 1.47, -4.86, 1.47, -4.89], ["c", -0.03, 0, -0.27, 0.06, -0.54, 0.15], ["c", -1.08, 0.36, -1.77, 0.48, -2.58, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.33, -0.15, 1.02, -0.93, 1.41, -1.59], ["c", 0.12, -0.21, 0.18, -0.39, 0.39, -1.08], ["c", 0.66, -2.1, 1.17, -3.84, 1.17, -3.87], ["c", 0, 0, -0.21, 0.06, -0.42, 0.15], ["c", -0.51, 0.15, -1.2, 0.33, -1.68, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 9.724, h: 21.383},
          fermata:  {d: [["M", -0.75, -5.34], ["c", 0.12, 0, 0.45, -0.03, 0.69, -0.03], # patched 10.77 -> 5.34
                         ["c", 2.91, -0.03, 5.55, 1.53, 7.41, 4.35],
                         ["c", 1.17, 1.71, 1.95, 3.72, 2.43, 6.03],
                         ["c", 0.12, 0.51, 0.12, 0.57, 0.03, 0.69],
                         ["c", -0.12, 0.21, -0.48, 0.27, -0.69, 0.12],
                         ["c", -0.12, -0.09, -0.18, -0.24, -0.27, -0.69],
                         ["c", -0.78, -3.63, -3.42, -6.54, -6.78, -7.38],
                         ["c", -0.78, -0.21, -1.2, -0.24, -2.07, -0.24],
                         ["c", -0.63, -0, -0.84, -0, -1.2, 0.06],
                         ["c", -1.83, 0.27, -3.42, 1.08, -4.8, 2.37],
                         ["c", -1.41, 1.35, -2.4, 3.21, -2.85, 5.19],
                         ["c", -0.09, 0.45, -0.15, 0.6, -0.27, 0.69],
                         ["c", -0.21, 0.15, -0.57, 0.09, -0.69, -0.12],
                         ["c", -0.09, -0.12, -0.09, -0.18, 0.03, -0.69],
                         ["c", 0.33, -1.62, 0.78, -3, 1.47, -4.38],
                         ["c", 1.77, -3.54, 4.44, -5.67, 7.56, -5.97], ["z"],
                         ["M", -0.5, 1.5], # don't know what I am doing, but "m" is not properly supported by opal-jspdf. So I do an sbsolute move
                         ["c", 1.38, -0.3, 2.58, 0.9, 2.31, 2.25],
                         ["c", -0.15, 0.72, -0.78, 1.35, -1.47, 1.5],
                         ["c", -1.38, 0.27, -2.58, -0.93, -2.31, -2.31],
                         ["c", 0.15, -0.69, 0.78, -1.29, 1.47, -1.44],
                         ["z"]
                        ], w: 19.748, h: 11.289},
          emphasis: {d: [["M", -6.45, -3.69], ["c", 0.06, -0.03, 0.15, -0.06, 0.18, -0.06],
                         ["c", 0.06, 0, 2.85, 0.72, 6.24, 1.59], ["l", 6.33, 1.65],
                         ["c", 0.33, 0.06, 0.45, 0.21, 0.45, 0.51], ["c", 0, 0.3, -0.12, 0.45, -0.45, 0.51],
                         ["l", -6.33, 1.65], ["c", -3.39, 0.87, -6.18, 1.59, -6.21, 1.59],
                         ["c", -0.21, -0, -0.48, -0.24, -0.51, -0.45],
                         ["c", 0, -0.15, 0.06, -0.36, 0.18, -0.45],
                         ["c", 0.09, -0.06, 0.87, -0.27, 3.84, -1.05],
                         ["c", 2.04, -0.54, 3.84, -0.99, 4.02, -1.02],
                         ["c", 0.15, -0.06, 1.14, -0.24, 2.22, -0.42], ["c", 1.05, -0.18, 1.92, -0.36, 1.92, -0.36],
                         ["c", 0, -0, -0.87, -0.18, -1.92, -0.36], ["c", -1.08, -0.18, -2.07, -0.36, -2.22, -0.42],
                         ["c", -0.18, -0.03, -1.98, -0.48, -4.02, -1.02], ["c", -2.97, -0.78, -3.75, -0.99, -3.84, -1.05],
                         ["c", -0.12, -0.09, -0.18, -0.3, -0.18, -0.45], ["c", 0.03, -0.15, 0.15, -0.3, 0.3, -0.39], ["z"]], w: 13.5, h: 7.5},
          error:    {d: [["M", -10, -5], ['l', 0, 10], ['l', 20, -10], ['l', 0, 10], ['z']], w: 20, h: 10},

          #rest_32:  {d: [["M", 4.23, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.27, -0.06], ["c", 0.33, -0.21, 0.99, -1.11, 1.44, -1.98], ["c", 0.09, -0.24, 0.21, -0.33, 0.39, -0.33], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.57, 2.67, -3.21, 13.89], ["c", -1.8, 7.62, -3.3, 13.89, -3.3, 13.92], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, -0, -0.3, -0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.09, -0.57, 1.23, -4.92], ["c", 0.69, -2.67, 1.26, -4.86, 1.29, -4.89], ["c", 0, -0.03, -0.12, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.12, 0.09, 0.3, 0.18, 0.48, 0.21], ["c", 0.12, -0, 0.18, -0, 0.3, -0.09], ["c", 0.42, -0.21, 1.29, -1.29, 1.56, -1.89], ["c", 0.03, -0.12, 1.23, -4.59, 1.23, -4.65], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -0.63, 0.18, -1.2, 0.36, -1.74, 0.45], ["c", -0.39, 0.06, -0.54, 0.06, -1.02, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.18, 0.18, 0.51, 0.27, 0.72, 0.15], ["c", 0.3, -0.12, 0.69, -0.57, 1.08, -1.17], ["c", 0.42, -0.6, 0.39, -0.51, 1.05, -3.03], ["c", 0.33, -1.26, 0.6, -2.31, 0.6, -2.34], ["c", 0, -0, -0.21, 0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.14, 0.33, -1.62, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 11.373, h: 28.883},
          #rest_64:  {d: [["M", 5.13, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.24, -0.12, 0.63, -0.66, 1.08, -1.56], ["c", 0.33, -0.66, 0.39, -0.72, 0.6, -0.72], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.69, 3.66, -3.54, 17.64], ["c", -1.95, 9.66, -3.57, 17.61, -3.57, 17.64], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.06, -0.57, 1.05, -4.95], ["c", 0.6, -2.7, 1.08, -4.89, 1.08, -4.92], ["c", 0, 0, -0.24, 0.06, -0.51, 0.15], ["c", -0.66, 0.24, -1.2, 0.36, -1.77, 0.48], ["c", -0.42, 0.06, -0.57, 0.06, -1.05, 0.06], ["c", -0.69, 0, -0.87, -0.03, -1.35, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.21, 0.03, 0.39, -0.09, 0.72, -0.42], ["c", 0.45, -0.45, 1.02, -1.26, 1.17, -1.65], ["c", 0.03, -0.09, 0.27, -1.14, 0.54, -2.34], ["c", 0.27, -1.2, 0.48, -2.19, 0.51, -2.22], ["c", 0, -0.03, -0.09, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.9, 0.42], ["c", 0.36, -0.18, 1.2, -1.26, 1.47, -1.89], ["c", 0.03, -0.09, 0.3, -1.2, 0.57, -2.43], ["l", 0.51, -2.28], ["l", -0.54, 0.18], ["c", -1.11, 0.36, -1.8, 0.48, -2.61, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.21, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.36, -0.18, 0.93, -0.93, 1.29, -1.68], ["c", 0.12, -0.24, 0.18, -0.48, 0.63, -2.55], ["l", 0.51, -2.31], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -1.14, 0.36, -2.1, 0.54, -2.82, 0.51], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 12.453, h: 36.383},
          #rest_128: {d: [["M", 6.03, -21.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.21, 0, 0.33, -0.06, 0.54, -0.36], ["c", 0.15, -0.21, 0.54, -0.93, 0.78, -1.47], ["c", 0.15, -0.33, 0.18, -0.39, 0.3, -0.48], ["c", 0.18, -0.09, 0.45, 0, 0.51, 0.15], ["c", 0.03, 0.09, -7.11, 42.75, -7.17, 42.84], ["c", -0.03, 0.03, -0.15, 0.09, -0.24, 0.15], ["c", -0.18, 0.06, -0.24, 0.06, -0.45, 0.06], ["c", -0.24, -0, -0.3, -0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.03, -0.57, 0.84, -4.98], ["c", 0.51, -2.7, 0.93, -4.92, 0.9, -4.92], ["c", 0, -0, -0.15, 0.06, -0.36, 0.12], ["c", -0.78, 0.27, -1.62, 0.48, -2.31, 0.57], ["c", -0.15, 0.03, -0.54, 0.03, -0.81, 0.03], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.63, 0.48], ["c", 0.12, -0, 0.18, -0, 0.3, -0.09], ["c", 0.42, -0.21, 1.14, -1.11, 1.5, -1.83], ["c", 0.12, -0.27, 0.12, -0.27, 0.54, -2.52], ["c", 0.24, -1.23, 0.42, -2.25, 0.39, -2.25], ["c", 0, -0, -0.24, 0.06, -0.51, 0.18], ["c", -1.26, 0.39, -2.25, 0.57, -3.06, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.51, 0.3, 0.75, 0.18], ["c", 0.36, -0.15, 1.05, -0.99, 1.41, -1.77], ["l", 0.15, -0.3], ["l", 0.42, -2.25], ["c", 0.21, -1.26, 0.42, -2.28, 0.39, -2.28], ["l", -0.51, 0.15], ["c", -1.11, 0.39, -1.89, 0.51, -2.7, 0.51], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.18, 0.48, 0.27, 0.72, 0.21], ["c", 0.33, -0.12, 1.14, -1.26, 1.41, -1.95], ["c", 0, -0.09, 0.21, -1.11, 0.45, -2.34], ["c", 0.21, -1.2, 0.39, -2.22, 0.39, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.2, 0.33, -1.71, 0.42], ["c", -0.3, 0.06, -0.51, 0.06, -0.93, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.18, -0, 0.36, -0.09, 0.57, -0.33], ["c", 0.33, -0.36, 0.78, -1.14, 0.93, -1.56], ["c", 0.03, -0.12, 0.24, -1.2, 0.45, -2.4], ["c", 0.24, -1.2, 0.42, -2.22, 0.42, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.39, 0.09], ["c", -1.05, 0.36, -1.8, 0.48, -2.58, 0.48], ["c", -0.63, -0, -0.84, -0.03, -1.29, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 12.992, h: 43.883}
      }

      # @param [Array of Numeric] center of the glyph
      # @param [Numeric] size how the glyph shall be rendered
      # @param [String] glyph_name name of the glyph
      # @param [Boolean] dotted
      # @param [Object] origin the origin of the glyph for backtracking
      def initialize(center, size, glyph_name, dotted = FALSE, origin = nil, conf_key = nil, conf_value = {})
        super()
        glyph = GLYPHS[glyph_name]
        unless glyph
          $log.error ("BUG: unsuppoerted glyph #{glyph_name}") unless glyph
          glyph = GLYPHS[:error]
        end
        @center     = center
        @glyph_name = glyph_name
        @glyph      = glyph
        @size       = size #
        @dotted     = dotted
        @origin     = origin
        @filled     = true
        @conf_key   = conf_key
        @conf_value = conf_value
        @coll_stack = []
      end

      #
      # Return the height of the Rest to support representation w.o. glyphs
      #
      # @return [Numeric] The height of the ellipse
      def height
        @size.last
      end

      #
      # Indicate if the Rest shall have a Punctuation dot
      #
      # @return [Boolean] TRUE if ther shall be a punctuation dot
      def dotted?
        dotted
      end

      # Provided for compatibility with Ellipse (the representation of a note)
      # used  to support representation w.o. glyphs
      #
      # @return [Boolean] TRUE if there shall be filled
      #
      def filled?
        @fill == :filled
      end

    end
  end


  # The layout algorithms transforming a music model into a drawing model
  #
  module Layout
    #
    # the default layout engine representing vanilla table harp sheets
    # This might be the only one at all ...
    #
    class Default
      include Harpnotes::Music
      include Harpnotes::Drawing

      attr_accessor :placeholders

      MM_PER_POINT = 0.3

=begin
      LINE_THIN = 0.1
      LINE_MEDIUM = 0.3
      LINE_THICK = 0.5

      # all numbers in mm
      ELLIPSE_SIZE = [2.8, 1.7] # radii of the largest Ellipse
      REST_SIZE = [2.8, 2.8] # radii of the largest Rest Glyph

      # x-radii of one step in a pitch. It is the horizontal
      # distance between two strings of the harp
      X_SPACING = 115.0 / 10.0

      # X coordinate of the very first beat
      X_OFFSET = ELLIPSE_SIZE.first

      Y_SCALE = 4 # 4 mm per minimal
      DRAWING_AREA_SIZE = [400, 282] # Area in which Drawables can be placed

      # this affects the performance of the harpnote renderer
      # it also specifies the resolution of note starts
      # in fact the shortest playable note is 1/16; to display dotted 16, we need 1/32
      # in order to at least being able to handle triplets, we need to scale this up by 3
      # todo:see if we can speed it up by using 16 ...

      BEAT_RESOULUTION = 64 * 3 ## todo use if want to support 5 * 7 * 9  # Resolution of Beatmap
      SHORTEST_NOTE = 64 # shortest possible note (1/64) do not change this
      # in particular specifies the range of DURATION_TO_STYLE etc.

      BEAT_PER_DURATION = BEAT_RESOULUTION / SHORTEST_NOTE



      # this is the negative of midi-pitch of the lowest plaayble note
      # see http://computermusicresource.com/midikeys.html
      PITCH_OFFSET = -43


      FONT_STYLE_DEF = {
          smaller: {text_color: [0, 0, 0], font_size: 6, font_style: "normal"},
          small: {text_color: [0, 0, 0], font_size: 9, font_style: "normal"},
          regular: {text_color: [0, 0, 0], font_size: 12, font_style: "normal"},
          large: {text_color: [0, 0, 0], font_size: 20, font_style: "bold"}
      }

      # This is a lookup table to map durations to graphical representation
      DURATION_TO_STYLE = {
          #key      radii   fill          dot                  abc duration

          :err => [2, :filled, FALSE], # 1      1
          :d64 => [0.9, :empty, FALSE], # 1      1
          :d48 => [0.7, :empty, TRUE], # 1/2 *
          :d32 => [0.7, :empty, FALSE], # 1/2
          :d24 => [0.7, :filled, TRUE], # 1/4 *
          :d16 => [0.7, :filled, FALSE], # 1/4
          :d12 => [0.5, :filled, TRUE], # 1/8 *
          :d8 => [0.5, :filled, FALSE], # 1/8
          :d6 => [0.3, :filled, TRUE], # 1/16 *
          :d4 => [0.3, :filled, FALSE], # 1/16
          :d3 => [0.1, :filled, TRUE], # 1/32 *
          :d2 => [0.1, :filled, FALSE], # 1/32
          :d1 => [0.05, :filled, FALSE], # 1/64
      }


      REST_TO_GLYPH = {
          # this basically determines the white background rectangel
          :err => [[2, 2], :rest_1, FALSE], # 1      1
          :d64 => [[0.9, 0.9], :rest_1, FALSE], # 1      1
          :d48 => [[0.5, 0.5], :rest_1, TRUE], # 1/2 *
          :d32 => [[0.5, 0.5], :rest_1, FALSE], # 1/2
          :d24 => [[0.4, 0.7], :rest_4, TRUE], # 1/4 *
          :d16 => [[0.4, 0.7], :rest_4, FALSE], # 1/4
          :d12 => [[0.3, 0.5], :rest_8, TRUE], # 1/8 *
          :d8 => [[0.3, 0.5], :rest_8, FALSE], # 1/8
          :d6 => [[0.3, 0.4], :rest_16, TRUE], # 1/16 *
          :d4 => [[0.3, 0.5], :rest_16, FALSE], # 1/16
          :d3 => [[0.3, 0.5], :rest_32, TRUE], # 1/32 *
          :d2 => [[0.3, 0.5], :rest_32, FALSE], # 1/32
          :d1 => [[0.3, 0.5], :rest_64, FALSE], # 1/64
      }

=end

      # note that initiallize is called in method layout once more
      # in order to get the correct configuration values
      # this is because the print variant changes the configuration parameters
      # of laoyut
      # todo: fix handling of layout config parameters
      def initialize
        # Spacing between two BeatTable increments
        # 1.0 = dureation of a whole note
        #
        @beat_spacing         = $conf.get('layout.Y_SCALE') * 1.0 / $conf.get('layout.BEAT_RESOLUTION') # initial value for beat_spacing (also the optimum spacing)
        @slur_index           = {}
        @y_offset             = 5
        @conf_beat_resolution = $conf.get('layout.BEAT_RESOLUTION')
        @layout_minc          = {} # this is the lookup table for minc; it is populated in Default.layout
        @color_default        = $conf.get('layout.color.color_default')
        @color_variant1       = $conf.get('layout.color.color_variant1')
        @color_variant2       = $conf.get('layout.color.color_variant2')
        @draw_instrument      = nil
        @placeholders         = {} unless @placeholders # inhibit reinitialization of @placeholders as it might have been set via placeholde=
        set_instrument_handlers
      end

      def set_instrument_handlers

        xoffset                      = $conf['layout.X_OFFSET']
        xspacing                     = $conf['layout.X_SPACING']
        pitchoffset                  = $conf.get('layout.PITCH_OFFSET')
        @bottom_annotation_positions = [[150, 289], [325, 289], [380, 289]]
        @pitch_to_xpos               = lambda { |pitch| (pitchoffset + pitch) * xspacing + xoffset }

        case $conf['layout.instrument']

          when "saitenspiel"
            @pitch_to_xpos               = lambda { |pitch|
              #          G        c        d        e        f        g        a        b        c'       D'
              pitch_to_stringpos = Hash[[[31, 0], [36, 1], [38, 2], [40, 3], [41, 4], [43, 5], [45, 6], [47, 7], [48, 8], [50, 9]]]
              pitch_to_stringpos = pitch_to_stringpos[pitch + pitchoffset]
              result             = 0
              result             = (pitch_to_stringpos) * xspacing + xoffset if pitch_to_stringpos
              result
            }
            @bottom_annotation_positions = [[xoffset, 287], [xoffset, 290], [xoffset + 100, 290]]
            @draw_instrument             = lambda {
              res            = Harpnotes::Drawing::Path.new([['M', xoffset + 30, 6], ['L', xoffset + 180, 81], ['L', xoffset + 180, 216], ['L', xoffset + 30, 291]], :open)
              res.line_width = $conf.get('layout.LINE_MEDIUM');
              [res]
            }

          when "okon-f", "okon-g", "okon-c", "okon-d"
            flaps   = ""
            pitches = ""
            case $conf['layout.instrument']
              when "okon-f"
                #          G  A Bb C  D  E  F  G  A   Bb C  D  E  F  G  A  Bb C   D E F G
                pitches = "55 57 58 60 62 64 65 67 69 70 72 74 76 77 79 81 82 84"
                flaps   = ""
              when "okon-g"
                #          G  A  B  C  D  E  F# G  A  B  C  D  E  F# G  A  Bb C   D E F G
                pitches = "55 57 59 60 62 64 66 67 69 71 72 74 76 78 79 81 83 84"
                flaps   = "      59          66       71          78       83 "
              when "okon-c"
                #          G  A  B  C  D  E  F  G  A  B  C  D  E  F  G  A  B  C D E F G
                pitches = "55 57 59 60 62 64 65 67 69 71 72 74 76 77 79 81 83 84"
                flaps   = "      59                   71                   83"
              when "okon-d"
                #          G  A  B  C  D  E  F  G  A  B  C  D  E  F  G  A  B  C D E F G
                pitches = "55 57 59 61 62 64 66 67 69 71 73 74 76 78 79 81 83 85"
                flaps   = "      59 61       66       71 73       78       83"
            end

            flaps_y = {59 => 7, 61 => 7, 66 => 7, 71 => 7, 73 => 20, 78 => 65, 83 => 110}

            string_by_pitch = Hash[pitches.split(" ").each_with_index.map { |i, k| [i.to_i, k] }]
            flaps_by_pitch  = flaps.split(" ").map { |i| i.to_i }

            @pitch_to_xpos               = lambda { |pitch|
              #                           G        c        d        e        f        g        a        b        c'       D'
              pitch_to_stringpos = string_by_pitch[pitch + pitchoffset]
              result             = 0
              result             = (pitch_to_stringpos) * xspacing + xoffset if pitch_to_stringpos
              result
            }
            @bottom_annotation_positions = [[xoffset, 290], [xoffset + 200, 290], [xoffset + 270, 290]]

            @draw_instrument = lambda {
              result = []
              flaps_by_pitch.each do |f|
                result.push(Harpnotes::Drawing::Annotation.new([@pitch_to_xpos.call(f), flaps_y[f]], "*", :large))
              end

              res            = Harpnotes::Drawing::Path.new([['M', xoffset - 15, 280], ['L', xoffset - 15, 0], ['M', xoffset + 135, 0], ['L', xoffset + 290, 157], ['L', xoffset + 290, 280]], :open)
              res.line_width = $conf.get('layout.LINE_MEDIUM');
              result.push(res)
            }

          when "21-strings-a-f"
            @bottom_annotation_positions = [[190, 287], [190, 290], [250, 290]]


          when "18-strings-b-e"
            @bottom_annotation_positions = [[210, 287], [210, 290], [280, 290]]
          else
        end
      end


      def layout_images(print_options_raw, print_variant_nr)
        result = []
        images = print_options_raw['images']
        unless images.nil?
          images.each do |number, image|
            if image[:show] == true
              datauri = $resources[image['imagename']]
              datauri = datauri.join if datauri.is_a? Array
              if datauri
                result.push Harpnotes::Drawing::Image.new(datauri, Vector2d(image['pos']) - [0, image['height']], image['height']).tap { |s|
                  s.conf_key   = "extract.#{print_variant_nr}.images.#{number}.pos"
                  s.conf_value = image['pos']
                  s.draginfo   = {handler: :annotation}
                }
                ## todo insert a draghandle for dragging the height
              end
            end
          end
        end
        result
      end

      # todo: configur the stuff
      # options = {
      #     size: 1
      #     emphasize: 5
      # }
      def layout_debug_grid()
        the_options = {
            size:     1,
            emphasis: 10,
            line:     0.02,
            emphline: 0.2
        }

        # we store this for performance reasons
        gridsize  = the_options[:size]
        emphasis  = the_options[:emphasis] * gridsize
        sheetsize = [420, 297]

        result = [];

        (0 .. sheetsize.first / gridsize).map { |g| g * gridsize }.each do |g|
          e = Harpnotes::Drawing::Path.new([['M', g, 0], ['l', 0, sheetsize.last]])

          e.line_width = the_options[:line]
          e.line_width = the_options[:emphline] if (g % emphasis) == 0
          result << e
        end

        (0 .. sheetsize.last / gridsize).map { |g| g * gridsize }.each do |g|
          e = Harpnotes::Drawing::Path.new([['M', 0, g], ['l', sheetsize.first, 0]])

          e.line_width = the_options[:line]
          e.line_width = the_options[:emphline] if (g % emphasis) == 0
          result << e
        end

        result
      end

      #
      # compute the layout of the Harnote sheet
      #
      # @param [Harpnotes::Music::Song] music the Song to transform
      # @param [Lambda] beat_layout = nil Policy procedure to compute the vertical layout
      # @param [Integer] print_variant_nr = 0  If a song has multiple print_variants, this is the index of the one to be shown
      #
      # @return [Harpnotes::Drawing::Sheet] Sheet to be provided to the rendering engine
      def layout(music, beat_layout = nil, print_variant_nr = 0, page_format = 'A4')

        print_options_raw = get_print_options(print_variant_nr)

        print_options_hash = print_options_raw.get

        # push view specific configuration
        layout_options = print_options_hash[:layout] || {}
        $conf.push({layout: layout_options})
        $conf.push({printer: print_options_hash[:printer] || {}})

        debug_grid = [];
        debug_grid = layout_debug_grid() if $conf['layout.grid']
        res_images = layout_images(print_options_hash, print_variant_nr)

        initialize

        @layout_minc = print_options_raw['notebound.minc'] || {}

        @y_offset = print_options_hash[:startpos]
        @y_size   = $conf.get('layout.DRAWING_AREA_SIZE').last

        beat_compression_map = nil
        $log.benchmark("compute beat compression map") do
          layoutlines          = print_options_hash[:voices] + print_options_hash[:layoutlines].uniq
          beat_compression_map = compute_beat_compression(music, layoutlines)
        end
        maximal_beat      = beat_compression_map.values.max || 0
        full_beat_spacing = ($conf.get('layout.DRAWING_AREA_SIZE').last - @y_offset) / maximal_beat

        if full_beat_spacing < @beat_spacing
          factor = (@beat_spacing / full_beat_spacing)
          $log.warning("note distance too small (factor #{factor})")
        end
        @beat_spacing = [full_beat_spacing, $conf.get('layout.packer.pack_max_spreadfactor') * @beat_spacing].min # limit beat spacing to twice of optimal spacing

        # first optimize the vertical arrangement of the notes
        # by analyzing the beat layout
        unless $conf.get('layout.bottomup')
          beat_layout = beat_layout || Proc.new do |beat|
            # $log.debug("using default layout verticalpos #{beat}:#{@y_offset} #{__FILE__} #{__LINE__}")
            %x{#{beat} * #{@beat_spacing} + #{@y_offset}}
          end
        else
          beat_layout = beat_layout || Proc.new do |beat|
            # $log.debug("using default layout verticalpos #{beat}:#{@y_offset} #{__FILE__} #{__LINE__}")
            %x{#{@y_size} - #{beat} * #{@beat_spacing}}
          end
        end


        compressed_beat_layout_proc = Proc.new { |beat| beat_layout.call(beat_compression_map[beat]) }

        # configure which synclines are required from-voice to-voice
        # also filter such synchlines which have points in the displayed voices
        required_synchlines = print_options_hash[:synchlines].select { |sl|
          print_options_hash[:voices].include?(sl.first) && print_options_hash[:voices].include?(sl.last)
        }

        # determine the synchronized notes
        synched_notes = required_synchlines.map do |selector|
          synch_points_to_show = $log.benchmark("build_syncpoints") { music.build_synch_points(selector) }
          synch_points_to_show.map do |sp|
            sp.synched_notes
          end
        end.flatten

        # sheet_elements derived from the voices
        active_voices  = print_options_hash[:voices]
        voice_elements = music.voices.each_with_index.map { |v, index|
          if active_voices.include?(index) ## todo add control for jumpline right border
            countnotes_options = print_options_hash[:countnotes]
            countnotes_options = nil unless countnotes_options[:voices].include?(index)
            barnumbers_options = print_options_hash[:barnumbers]
            barnumbers_options = nil unless barnumbers_options[:voices].include?(index)

            layout_voice(v, compressed_beat_layout_proc, print_variant_nr,
                         voice_nr:      index,
                         nonflowrest:   print_options_hash[:nonflowrest],
                         flowline:      print_options_hash[:flowlines].include?(index),
                         subflowline:   print_options_hash[:subflowlines].include?(index),
                         jumpline:      print_options_hash[:jumplines].include?(index),
                         repeatsigns:   print_options_hash[:repeatsigns],
                         synched_notes: synched_notes, # synchronized notes to determine subflowlines
                         countnotes:        countnotes_options,
                         barnumbers:        barnumbers_options,
                         print_options_raw: print_options_raw
            )
          end
        }.flatten.compact # note that we get three nil objects bcause of the voice filter

        if $log.loglevel? :warning
          collisiondetector = CollisionDetector.new
          collisiondetector.check_annotations(voice_elements)
        end

        # build synchlines between voices
        synch_lines = required_synchlines.map do |selector|
          synch_points_to_show = music.build_synch_points(selector)
          synch_points_to_show.map do |sp|
            res       = FlowLine.new(sp.notes.first.sheet_drawable, sp.notes.last.sheet_drawable, :dashed)
            res.color = compute_color_by_variant_no(sp.notes.first.variant)
            res
          end
        end.flatten


        # build Scalebar
        sheet_marks = layout_stringnames(print_options_hash)

        # build cutmarks
        if page_format == 'A4' and $conf['printer.a4_pages'].length > 1
          delta = 12.0 * $conf.get('layout.X_SPACING') # cut in octaves
          (1 .. 2).each do |i| # number rof cutmarks
            [4, 290].each do |y| # the y  Coordinates
              # 0.25 Fragment of string distance to place the cutmark
              sheet_marks << Harpnotes::Drawing::Annotation.new([0.25 * $conf.get('layout.X_SPACING') + $conf.get('layout.X_OFFSET') + delta * i, y], "x", :small, nil)
            end
          end
        end

        # now generate legend

        annotations = []

        title               = music.meta_data[:title] || "untitled"
        filename            = music.meta_data[:filename]
        meter               = music.meta_data[:meter]
        meter               = meter.last.split("=").first if meter
        key                 = music.meta_data[:key]
        composer            = music.meta_data[:composer]
        tempo               = music.meta_data[:tempo_display]
        print_variant_title = print_options_hash[:title]

        title_pos  = print_options_hash[:legend][:pos]
        legend_pos = print_options_hash[:legend][:spos]
        legend     = "#{print_variant_title}\n#{composer}\nTakt: #{meter} (#{tempo})\nTonart: #{key}"
        annotations << Harpnotes::Drawing::Annotation.new(title_pos, title, :large, nil,
                                                          "extract.#{print_variant_nr}.legend.pos", title_pos).tap { |s| s.draginfo = {handler: :annotation} }
        if $conf["extract.#{print_variant_nr}.notes.T06_legend"].nil?
          annotations << Harpnotes::Drawing::Annotation.new(legend_pos, legend, :regular, nil,
                                                            "extract.#{print_variant_nr}.legend.spos", legend_pos).tap { |s| s.draginfo = {handler: :annotation} }
        end
        datestring = Time.now.strftime("%Y-%m-%d %H:%M:%S %Z")
        annotations << Harpnotes::Drawing::Annotation.new(@bottom_annotation_positions[0], "#{filename} - created #{datestring} by Zupfnoter #{VERSION} [#{Controller::get_uri[:hostname]}]", :smaller)
        annotations << Harpnotes::Drawing::Annotation.new(@bottom_annotation_positions[1], "Zupfnoter: https://www.zupfnoter.de", :smaller)
        annotations << Harpnotes::Drawing::Annotation.new(@bottom_annotation_positions[2], music.checksum, :smaller)

        lyrics     = print_options_hash[:lyrics]
        lyric_text = music.harpnote_options[:lyrics][:text]
        if lyric_text
          text = lyric_text.join("\n")

          if lyrics
            verses = text.gsub("\t", " ").squeeze(" ").split(/\n\n+/)
            lyrics.delete("versepos")
            lyrics.each do |key, entry|
              pos      = entry[:pos]
              the_text = (entry[:verses] || []).map do |i|
                j = 9999 if i == 0 # this is a workaround, assuming that we do not have 1000 verses
                j = i if i < 0
                j = i - 1 if i > 0
                verses[j]
              end.join("\n\n")
              annotations << Harpnotes::Drawing::Annotation.new(pos, the_text, nil, nil,
                                                                "extract.#{print_variant_nr}.lyrics.#{key}.pos", pos).tap { |s| s.draginfo = {handler: :annotation} }
            end
          end
        end

        # build sortmarks
        sortmark_options = print_options_hash['sortmark']
        sheet_marks << layout_sortmark(title, sortmark_options) if sortmark_options['show']

        #sheet based annotations
        # todo: implement a proper strategy for validateion of conf
        begin
          print_options_hash[:notes].each do |k, note|
            #note is an array [center, text, style] todo: refactor this
            conf_key = "extract.#{print_variant_nr}.notes.#{k}"
            raise %Q{#{I18n.t("missing pos")} in #{conf_key}} unless note[:pos]
            raise %Q{#{I18n.t("missing text")} in #{conf_key}} unless note[:text]
            annotations << Harpnotes::Drawing::Annotation.new(note[:pos], resolve_placeholder(note[:text], conf_key), note[:style], nil,
                                                              "#{conf_key}.pos", note[:pos]).tap { |s| s.draginfo = {handler: :annotation} }
          end
        rescue Exception => e
          $log.error e.message
        end

        @draw_instrument.call.each { |r| sheet_marks.push(r) } if @draw_instrument

        sheet_elements = res_images + debug_grid + synch_lines + voice_elements + annotations + sheet_marks

        result                = Harpnotes::Drawing::Sheet.new(sheet_elements, active_voices)
        result.printer_config = $conf[:printer]

        $conf.pop # remove view specific configuration printer
        $conf.pop # remove view specific configuration layout

        result
      end

      def get_print_options(print_variant_nr)
        print_options_raw        = Confstack.new()
        print_options_raw.strict = false
        print_options_raw.push($conf.get("extract.0"))

        song_print_options = $conf.get("extract.#{print_variant_nr}") #music.harpnote_options[:print][print_variant_nr]

        unless song_print_options
          $log.warning("selected print variant [#{print_variant_nr}] not available using [0]: '#{print_options_raw.get('title')}'")
        else
          print_options_raw.push(song_print_options)
        end

        if print_options_raw['layout.beams']
          print_options_raw.push({'layout' => {"DURATION_TO_STYLE" => $conf['layout.DURATION_TO_BEAMS']}})
        end

        print_options_raw
      end


      def layout_sortmark(title, options)
        sortname = title.upcase.gsub(/[ÄÖÜYZß]/, {'Ä' => 'AE', 'Ö' => 'OE', 'Ü' => 'UE', 'ß' => 'ss', 'Y' => "X", 'Z' => "X"}).gsub(/[^A-Za-z]/, "")
        b        = (sortname + "AAAA").split('').map { |i| i.ord - "A".ord }
        a        = b[0] + (0.1 * b[1] + 0.01 * b[2] + 0.001 * b[3]) * 0.5 / 2.4 # 0.5 cover half the stringdistance; 2.4 - 24 positions
        w, h     = options['size']
        fill     = options['fill'] ? :filled : :open
        markpos  = (12.5 + a) * $conf.get('layout.X_SPACING') # 12 - 12 strings fro mleft border

        markpath = [['M', markpos, 0], ['l', -w / 2, h], ['l', w, 0], ['l', -w / 2, -h], ['l', 0, h], ['l', 0, -h], ['z']]
        Harpnotes::Drawing::Path.new(markpath, fill)
      end

      # this creates a scale bar
      # todo: make it moveaeable by mouse
      def layout_stringnames(print_options_hash)
        vpos  = print_options_hash[:stringnames][:vpos]
        marks = print_options_hash[:stringnames][:marks][:hpos]

        sheet_marks = []
        unless marks.empty?
          sheet_marks += marks.inject([]) do |result, pitch|

            print_options_hash[:stringnames][:marks][:vpos].each do |mark_vpos|
              markpath = make_sheetmark_path([(@pitch_to_xpos.call(pitch)), mark_vpos])
              result << Harpnotes::Drawing::Path.new(markpath, :filled)
            end
            result
          end
        end

        unless vpos.empty?
          no_of_names = 37
          scale       = print_options_hash[:stringnames][:text].split(' ')
          scale       = scale * ((no_of_names) / scale.length + 1)

          start_scale = -$conf.get('layout.PITCH_OFFSET')
          end_scale   = start_scale + no_of_names - 1
          vpos        = print_options_hash[:stringnames][:vpos]
          style       = print_options_hash[:stringnames][:style]
          x_spacing   = $conf.get('layout.X_SPACING')
          x_offset    = $conf.get('layout.X_OFFSET') - 1

          sheet_marks += (start_scale .. end_scale).to_a.inject([]) do |result, pitch|
            x = (-start_scale + pitch) * x_spacing + x_offset
            vpos.each do |vpos|
              result << Harpnotes::Drawing::Annotation.new([x, vpos], scale[pitch - start_scale], style)
            end
            result
          end
        end
        sheet_marks
      end

      NOTE_POSITION_LOOKUP = {
          #         t   C
          "11" => [:r, :r], # l l
          "12" => [:r, :l], # l m
          "13" => [:r, :l], # l r

          "21" => [:r, :r], # m l
          "22" => [:r, :l], # m m
          "23" => [:l, :l], # m r

          "31" => [:l, :r], # r l
          "32" => [:l, :r], # r m
          "33" => [:l, :l], # r r
      }

      def compute_note_position (xp, x, xn, limit_a3)

        a = (xp <=> x) + 2
        b = (xn <=> x) + 2

        if limit_a3 && x < 10
          [:r, :r]
        elsif limit_a3 && x > 410
          [:l, :l]
        else
          NOTE_POSITION_LOOKUP["#{a}#{b}"]
        end
      end


      #
      # compute the layout of a particular voice. It places flowlines playables and jumplines.
      # The vertical arrangement is goverend by the beat_layout, which actually maps the
      # beat in the timing domain to the beat in the sheet.
      #
      # @param voice [Array of MusicEntity] the Voice to be layouted
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      # @param show_options [Hash] { flowlines: true, jumplines:true }
      #
      # @return [Array of Element] the list of elements to be drawn. It consists of flowlines, playables and jumplines.
      #                            note that these shall be rendered in the given order.
      def layout_voice(voice, beat_layout, print_variant_nr, show_options)
        @print_options_raw = show_options[:print_options_raw]  # todo this is a bad hack but we need it to get the note configuration within layout_playable
        # draw the playables
        # note that the resulting playables are even flattened (e.g. syncpoints appear as individual playables)
        voice_nr  = show_options[:voice_nr]
        playables = voice.select { |c| c.is_a? Playable }

        # handle visibility of rests in nonflows
        unless show_options[:nonflowrest]
          previous_note = nil

          playables.each do |c|
            # if no flowline and synched -> not visible
            c.visible = false if c.is_a? Pause and not show_options[:flowline]
            # if neither flowline or subflowline -> not visible
            c.visible = false if c.is_a? Pause and not show_options[:subflowline] and not show_options[:flowline]

            # turn previous note visible if the current playable is visible but not synchronized
            # which in turn means that it is part of a subflowline
            if not show_options[:flowline] and c.visible and not show_options[:synched_notes].include?(c.proxy_note)
              previous_note.visible = true unless previous_note.nil? # this handles the very first note which has previous_note
            end
            previous_note = c
          end

        end

        # now we layout the playables
        # thereby we collect decorations (!fermata! etc.)
        res_decorations = []
        res_playables   = playables.map do |playable|
          note_conf_base_tail = %Q{notebound.nconf.v_#{voice_nr}.t_#{playable.time}}
          note_conf_base = %Q{extract.#{print_variant_nr}.#{note_conf_base_tail}}
          result          = layout_playable(playable, beat_layout, note_conf_base) # unless playable.is_a? Pause
          decoration_root = result.proxy

          res_decorations.push (playable.decorations.empty? ? [] : make_decorations_per_playable(playable, decoration_root, print_variant_nr, show_options, voice_nr))

          # todo: this also adds the manual incrementation conf_key. This should be separated as another concern
          decoration_root.conf_key = %Q{extract.#{print_variant_nr}.notebound.minc.#{playable.time}.minc_f}
         # decoration_root.conf_key = note_conf_base

          result.shapes
        end.flatten.compact

        # flatten the list of decorations
        # it might be that there is more than one decoration per playable
        res_decorations = res_decorations.flatten.compact

        # draw barnumbers and countnotes
        res_barnumbers, res_countnotes = $log.benchmark("countnotes / barnumbers") { layout_barnumbers_countnotes(playables, print_variant_nr, show_options, voice_nr) }

        # draw the flowlines
        previous_note          = nil
        do_flowconf            = $settings["flowconf"] == 'true' # this parameter turns flowconfiguraiton on/off
        default_tuplet_options = $conf['defaults.notebound.flowline']
        flowlines_conf_key     = "notebound.flowline.v_#{voice_nr}"
        flowlines_conf         = show_options[:print_options_raw][flowlines_conf_key] || {} # here we cache the configuration of flowlines

        res_flow = voice.select { |c| c.is_a? Playable }.map do |playable|
          res = nil
          unless previous_note.nil?
            # todo: remove this if clause or set to fals to turn flowline configuration off at all
            if true # do_flowconf == true
              flowline_conf_key = "#{playable.znid}"
              conf_from_options = flowlines_conf[flowline_conf_key]
              if conf_from_options or do_flowconf == true
                conf_key      = "extract.#{print_variant_nr}.#{flowlines_conf_key}.#{flowline_conf_key}"
                conf_key_edit = conf_key + ".*" # "Edit conf strips the last element of conf_key"

                p1 = Vector2d(previous_note.sheet_drawable.center)
                p2 = Vector2d(playable.sheet_drawable.center)

                ## note we use the name tuplet_options since we steal the code from tuplet - handling
                tuplet_options = Confstack.new()
                tuplet_options.push(default_tuplet_options)
                tuplet_options.push(conf_from_options) rescue nil

                tiepath, bezier_anchor, cp1, cp2 = make_annotated_bezier_path([p1, p2], tuplet_options)

                if do_flowconf == true
                  draginfo = {handler: :tuplet, p1: p1, p2: p2, cp1: cp1, cp2: cp2, mp: bezier_anchor, tuplet_options: tuplet_options, conf_key: conf_key, callback: nil}
                else
                  draginfo = nil
                end
                res = Harpnotes::Drawing::Path.new(tiepath).tap { |d| d.conf_key = conf_key_edit; d.draginfo = draginfo }
              else
                # draw the flowline as line if it is not a path
                res = Harpnotes::Drawing::FlowLine.new(previous_note.sheet_drawable, playable.sheet_drawable)
              end
            end

            #res.color      = compute_color_by_variant_no(playable.variant) # todo: uncomment to colorize flowlines
            res.line_width = $conf.get('layout.LINE_MEDIUM');
            res            = nil unless previous_note.visible? # interupt flowing if one of the ends is not visible
          end
          res = nil if playable.first_in_part? # interrupt flowline at begin of a part
          res = nil unless playable.visible? # interupt flowing if one of the ends is not visible

          previous_note = playable
          res
        end.compact


        # draw the subflowlines
        # note that invisible rests make no sense and therefore do not interrupt subflowlines
        previous_note  = nil
        res_sub_flow   = voice.select { |c| c.is_a? Playable or c.is_a? SynchPoint }.map do |playable|

          unless show_options[:synched_notes].include?(playable.proxy_note)
            res = nil

            # draw subflowline if both ends are visible
            if not previous_note.nil? and previous_note.visible and playable.visible
              res = FlowLine.new(previous_note.sheet_drawable, playable.sheet_drawable, :dotted)
              #res.color = compute_color_by_variant_no(playable.variant) # todo: uncomment to colorize flowlines
            end

            # this supports the case that synclines are entirely turned off and also no flowlines show up.
            res = nil if playable.first_in_part?
          end

          previous_note = playable
          res
        end.compact

        # kill the flowlines / subflowlines if they shall not be shown
        res_sub_flow   = [] unless show_options[:subflowline]
        res_flow       = [] unless show_options[:flowline]
        res_countnotes = [] unless show_options[:countnotes]
        res_barnumbers = [] unless show_options[:barnumbers]


        # layout tuplets

        tuplet_start = playables.first
        tuplet_notes = []

        res_tuplets = playables.inject([]) do |result, playable|
          tuplet_start = playable if playable.tuplet_start?
          tuplet_notes.push playable.time if tuplet_start

          if playable.tuplet_end?
            tuplet_conf_key = "notebound.tuplet.v_#{voice_nr}.#{tuplet_start.znid}" # "tuplet.#{tuplet_start.znid}"
            conf_key        = "extract.#{print_variant_nr}.#{tuplet_conf_key}"
            conf_key_pos    = 'pos'

            tuplet_options = Confstack.new()
            tuplet_options.push($conf['defaults.notebound.tuplet'])
            tuplet_options.push(show_options[:print_options_raw][tuplet_conf_key]) rescue nil


            p1 = Vector2d(tuplet_start.sheet_drawable.center)
            p2 = Vector2d(playable.sheet_drawable.center)

            tiepath, bezier_anchor, cp1, cp2 = make_annotated_bezier_path([p1, p2], tuplet_options)
            pos_from_conf = tuplet_options['pos'] rescue [0, 0]
            configured_anchor = (bezier_anchor + pos_from_conf)
            conf_value        = (configured_anchor - bezier_anchor).to_a.map { |i| i.round(0) }

            shape_drag_callback = lambda do |the_tuplet_options|
              nil
            end

            unless tuplet_options[:show] == false
              conf_key_edit = conf_key + ".*" # "Edit conf strips the last element of conf_key"
              draginfo      = {handler: :tuplet, p1: p1, p2: p2, cp1: cp1, cp2: cp2, mp: bezier_anchor, tuplet_options: tuplet_options, conf_key: conf_key, callback: shape_drag_callback}
              result.push(Harpnotes::Drawing::Path.new(tiepath).tap { |d| d.conf_key = conf_key_edit; d.line_width = $conf.get('layout.LINE_THIN'); d.draginfo = draginfo })
              result.push(Harpnotes::Drawing::Annotation.new(configured_anchor.to_a, playable.tuplet.to_s,
                                                             :small,
                                                             tuplet_start.origin,
                                                             conf_key + ".#{conf_key_pos}",
                                                             conf_value.to_a)
                              .tap { |s| s.draginfo = {handler: :annotation} }
              )
            end
            tuplet_notes = []
            tuplet_start = nil
            # compute the position
          end
          result
        end

        # layout the slurs and ties
        @slur_index[:first_playable] = playables.first # prepare default
        tie_start                    = playables.first # prepare default
        res_slurs                    = playables.inject([]) do |result, playable|
          # note that there is a semantic difference between tie and slur
          # so first we pick the ties

          if playable.tie_end?
            p1      = Vector2d(tie_start.sheet_drawable.center) + [3, 0]
            p2      = Vector2d(playable.sheet_drawable.center) + [3, 0]
            tiepath = $conf['layout.bottomup'] ? make_slur_path(p2, p1) : make_slur_path(p1, p2)
            result.push(Harpnotes::Drawing::Path.new(tiepath).tap { |d| d.line_width = $conf.get('layout.LINE_MEDIUM') })
            if playable.is_a? Harpnotes::Music::SynchPoint
              playable.notes.each_with_index do |n, index|
                begin
                  p1      = tie_start.notes[index]
                  p1      = Vector2d(p1.sheet_drawable.center) + [3, 0]
                  p2      = Vector2d(n.sheet_drawable.center) + [3, 0]
                  tiepath = make_slur_path(p1, p2)
                  result.push(Harpnotes::Drawing::Path.new(tiepath).tap { |d| d.line_width = $conf.get('layout.LINE_MEDIUM') })
                rescue Exception => e
                  $log.error("tied chords which doesn't have same number of notes", n.start_pos)
                end
              end
            end
          end
          tie_start = playable if playable.tie_start?

          # then we pick the slurs
          playable.slur_starts.each { |s| @slur_index[s] = playable }
          @slur_index[playable.slur_starts.first] = playable

          playable.slur_ends.each do |id|
            begin_slur = @slur_index[id] || @slur_index[:first_playable]

            p1       = Vector2d(begin_slur.sheet_drawable.center) + [3, 0] # todo make tie configurable
            p2       = Vector2d(playable.sheet_drawable.center) + [3, 0]
            slurpath = make_slur_path(p1, p2)
            result.push(Harpnotes::Drawing::Path.new(slurpath).tap { |d| d.line_width = $conf.get('layout.LINE_MEDIUM') }) if $conf.get('layout.SHOW_SLUR')
          end

          result
        end

        # draw the jumplines
        res_gotos     = voice.select { |c| c.is_a? Goto }.map do |goto|
          if goto.conf_key
            conf_key = "extract.#{print_variant_nr}.#{goto.conf_key}"
            distance = show_options[:print_options_raw][goto.conf_key]

            unless distance
              old_conf_key = conf_key.gsub(/(.*)\.(\d+)\.(\d+)\.(\w+)/, '\1.\2.\4')
              distance     = show_options[:print_options_raw][old_conf_key]
            end

          end

          distance   = goto.policy[:distance] unless distance
          distance   = 1 unless distance
          is_visible = distance == 0 ? false : true;
          distance   = distance - 1 if distance > 0 # make distancebeh  symmetric  -1 0 1

          from_anchor     = goto.policy[:from_anchor] || :after # after -> reight
          to_anchor       = goto.policy[:to_anchor] || :before # before -> left
          vertical_anchor = goto.policy[:vertical_anchor] || :from

          $log.debug("vertical line x offset: #{distance} #{__FILE__}:#{__LINE__}")

          vertical = (distance + 0.5) * $conf.get('layout.X_SPACING')


          from = goto.from.sheet_drawable
          to   = goto.to.sheet_drawable

          # now swap before / after in case of bottomup
          if $conf['layout.bottomup']
            swap        = {before: :after, after: :before}
            from_anchor = swap[from_anchor]
            to_anchor   = swap[to_anchor]
          end

          jumpline_info = {from:            {center: from.center, size: from.size, anchor: from_anchor},
                           to:              {center: to.center, size: to.size, anchor: to_anchor},
                           vertical:        vertical, vertical_anchor: vertical_anchor,
                           padding:         goto.policy[:padding],
                           xspacing:        $conf['layout.X_SPACING'],
                           jumpline_anchor: $conf['layout.jumpline_anchor']
          }

          path     = Harpnotes::Layout::Default.make_path_from_jumpline(jumpline_info)
          draginfo = {handler: :jumpline, jumpline: jumpline_info, xspacing: $conf.get('layout.X_SPACING')}

          if is_visible
            unless goto.policy[:is_repeat] and show_options[:repeatsigns][:voices].include? show_options[:voice_nr]
              [Harpnotes::Drawing::Path.new(path[0], nil, goto.from).tap { |s| s.conf_key = conf_key; s.conf_value = distance; s.line_width = $conf.get('layout.LINE_THICK'); s.draginfo = draginfo },
               Harpnotes::Drawing::Path.new(path[1], :filled, goto.from)]
            end
          end
        end.flatten.compact

        res_gotos     = [] unless show_options[:jumpline]
        color_default = @color_default
        res_gotos.each { |the_goto| the_goto.color = color_default }


        # draw the repeatmarks

        res_repeatmarks = []
        if show_options[:repeatsigns][:voices].include? show_options[:voice_nr]
          res_repeatmarks = voice.select { |c| c.is_a? Goto and c.policy[:is_repeat] }.map do |goto|

            startbar = make_repeatsign_annotation(goto, :begin, print_variant_nr, show_options, voice_nr)
            endbar   = make_repeatsign_annotation(goto, :end, print_variant_nr, show_options, voice_nr)

            [endbar, startbar]
          end.flatten
        end


        ###
        # draw note bound annotations

        res_annotations = voice.select { |c| c.is_a? NoteBoundAnnotation }.map do |annotation|
          notebound_pos_key = annotation.conf_key
          if notebound_pos_key
            conf_key = "extract.#{print_variant_nr}.#{notebound_pos_key}"
            annotationoffset = show_options[:print_options_raw].get(notebound_pos_key) rescue nil
            annotationoffset = annotation.position unless annotationoffset
          else
            annotationoffset = annotation.position
            conf_key         = nil
          end

          position = Vector2d(annotation.companion.sheet_drawable.center) + annotationoffset
          result   = Harpnotes::Drawing::Annotation.new(position.to_a, annotation.text, annotation.style, annotation.companion.origin,
                                                        conf_key, annotationoffset).tap { |s| s.draginfo = {handler: :annotation} }
          result   = nil if annotation.policy == :Goto and not show_options[:jumpline]
          result
        end


        # return all drawing primitives
        (res_flow + res_sub_flow + res_slurs + res_tuplets + res_playables + res_countnotes + res_barnumbers + res_decorations + res_gotos + res_annotations + res_repeatmarks).compact
      end


      # this layouts the decoration of a playable.
      # note that we do not handle it as decoration of the harp note since we want
      # it to be draggable
      #
      # @param [Playable] playable
      # @param [Drawable] decoration_root
      # @param [Numeric] print_variant_nr
      # @param [Hash] show_options
      def make_decorations_per_playable(playable, decoration_root, print_variant_nr, show_options, voice_nr)
        decorations = nil
        decorations = playable.decorations
        unless decorations.empty?
          decoration_distance = (playable.measure_start ? 2 : 1)
          decoration_scale    = 0.8
          decoration_size     = decoration_root.size.map { |i| i * decoration_scale }

          decoration_result = []
          decorations.each_with_index do |decoration, index|
            notebound_pos_key = "notebound.decoration.v_#{voice_nr}.t_#{playable.znid}.#{index}.pos"
            conf_key          = "extract.#{print_variant_nr}.#{notebound_pos_key}"

            annotationoffset = show_options[:print_options_raw][notebound_pos_key] rescue nil
            annotationoffset = [0, (-decoration_root.size.last / decoration_scale - decoration_distance).round()] unless annotationoffset

            decoration_center = [decoration_root.center.first + annotationoffset.first, decoration_root.center.last + annotationoffset.last]
            r                 = Harpnotes::Drawing::Glyph.new(decoration_center, decoration_size, decoration, false, nil, conf_key, annotationoffset)
            r.tap { |s| s.draginfo = {handler: :annotation} }
            decoration_result.push [r]
          end
        end
        decoration_result
      end

      def make_repeatsign_annotation(goto, point_role, print_variant_nr, show_options, voice_nr)
        from_anchor = goto.policy[:from_anchor] || :after
        to_anchor   = goto.policy[:to_anchor] || :before

        # note we work with pitches here
        # otherwise we have to memize the previous drawing
        # compute the character of  repeatsign
        #
        #        |: to    <----------------------+   goto.to     # begin!
        #                next   prev             !
        #                             from :|  --+   goto.from   # end!
        #               <           <
        #        if only one note in repetion next and prev are considered
        #
        if point_role == :begin
          companion_note = goto.to
          if goto.to == goto.from
            attach_side = :left
          else
            attach_side = companion_note.pitch <= companion_note.next_pitch ? :left : :right
          end
        else # :end
          companion_note = goto.from
          if goto.to == goto.from
            attach_side = :right
          else
            attach_side = companion_note.prev_pitch <= companion_note.pitch ? :right : :left
          end
        end

        pos_key  = "notebound.repeat_#{point_role.to_s}.v_#{voice_nr}.#{companion_note.znid}.pos"
        conf_key = "extract.#{print_variant_nr}.#{pos_key}"

        repeatsign_options = show_options[:repeatsigns][attach_side]
        annotationoffset = show_options[:print_options_raw][pos_key] rescue nil
        annotationoffset = repeatsign_options[:pos] unless annotationoffset

        text = repeatsign_options[:text]

        position = Vector2d(companion_note.sheet_drawable.center) + annotationoffset

        Harpnotes::Drawing::Annotation.new(position.to_a, text, repeatsign_options[:style],
                                           companion_note.origin, conf_key, annotationoffset).tap { |s| s.draginfo = {handler: :annotation} }
      end


      private

      # This creates countnotes and barnumbers
      def layout_barnumbers_countnotes(playables, print_variant_nr, show_options, voice_nr)
        limit_a3 = $conf['layout.limit_a3'] == true
        bottomup = $conf['layout.bottomup'] == true

        # retrieve configuration for barnumbers and countnotes
        cn_options = show_options[:countnotes]
        bn_options = show_options[:barnumbers]


        res_countnotes = []
        res_barnumbers = []

        # skip that stuff itf there is no barnumbers or count nots
        if (cn_options || bn_options)

          visible_playables = playables.select { |playable| playable.visible? }

          if cn_options
            cn_style                     = cn_options[:style]
            cn_fontsize_x, cn_fontsize_y = [1, 1]
            cn_autopos                   = cn_options[:autopos]
            cn_fixedpos                  = cn_options[:pos]
            cn_apbase_x, cn_apbase_y     = cn_options[:apbase]
          end
          if bn_options
            bn_style                     = bn_options[:style]
            bn_fontsize_x, bn_fontsize_y = [2.7, 2.7]
            bn_autopos                   = bn_options[:autopos]
            bn_fixedpos                  = bn_options[:pos]
            bn_apbase_x, bn_apbase_y     = bn_options[:apbase]
            bn_prefix                    = bn_options[:prefix]
          end

          # now process all visible playables
          visible_playables.each do |playable|
            ## do some caching
            #
            the_drawable         = playable.sheet_drawable #lookuptable_drawing_by_playable[playable]
            dcenter              = the_drawable.center
            x, y                 = dcenter
            dsize_x, dsize_y     = the_drawable.size
            dsize_d_x, dsize_d_y = the_drawable.size_with_dot
            xp, yp               = playable.prev_playable.sheet_drawable.center
            xn, yn               = playable.next_playable.sheet_drawable.center

            # compute the barnote/countnote positions
            bn_position, cn_position = bottomup ? compute_note_position(xn, x, xp, limit_a3).reverse : compute_note_position(xp, x, xn, limit_a3)

            #### now handle countnotes
            # get the configurations for countnotes
            if cn_options
              cn_pos_key  = "notebound.countnote.v_#{voice_nr}.t_#{playable.time}.pos"
              cn_conf_key = "extract.#{print_variant_nr}.#{cn_pos_key}"
              count_note  = playable.count_note || ""

              # read countnote-configuration from extract
              cn_offset = show_options[:print_options_raw][cn_pos_key] rescue nil

              unless cn_offset
                if cn_autopos == true
                  cn_tie_x  = (cn_position == :r and playable.tie_start?) ? 1.5 : 0 # 1: this size of tie bow see line 1961
                  auto_x    = cn_tie_x + (cn_position == :l ? -(count_note.length * cn_fontsize_x + dsize_x + cn_apbase_x) : dsize_d_x + cn_apbase_x)
                  auto_y    = bottomup ? -(dsize_y + cn_apbase_y + cn_fontsize_y) : dsize_y + cn_apbase_y # -1 move it a bit upwords depend on font size
                  cn_offset = [auto_x, auto_y]
                else
                  cn_offset = cn_fixedpos
                end
              end

              cn_position = Vector2d(dcenter) + cn_offset

              res_countnotes.push Harpnotes::Drawing::Annotation.new(cn_position.to_a, count_note, cn_style, playable.origin,
                                                                     cn_conf_key, cn_offset).tap { |s| s.draginfo = {handler: :annotation} }
            end

            #### now handle barnumbers
            # get the configurations for barnumbers
            if bn_options && playable.measure_start?
              bn_pos_key  = "notebound.barnumber.v_#{voice_nr}.t_#{playable.time}.pos"
              bn_conf_key = "extract.#{print_variant_nr}.#{bn_pos_key}"
              barnumber   = %Q{#{bn_prefix}#{playable.measure_count.to_s}} || ""

              # read countnote-configuration from extract
              bn_offset = show_options[:print_options_raw][bn_pos_key] rescue nil

              unless bn_offset
                if bn_autopos == true
                  bn_tie_x = (bn_position == :r and playable.tie_start?) ? 1 : 0
                  # todo: the literals are determined by try and error to fine tune the posiition.
                  # todo: in case of left: barnumber.length is just a heuristic to geht the thing right justified
                  bn_auto_x = bn_tie_x + (bn_position == :l ? -(barnumber.length * bn_fontsize_x + dsize_x + bn_apbase_x) : dsize_d_x + bn_apbase_x)
                  bn_auto_y = bottomup ? dsize_y + bn_apbase_y : -(dsize_y + bn_apbase_y + bn_fontsize_y) # todo derive "1" from font style?
                  bn_offset = [bn_auto_x, bn_auto_y]
                else
                  bn_offset = bn_fixedpos
                end
              end

              bn_position = Vector2d(dcenter) + bn_offset
              res_barnumbers.push Harpnotes::Drawing::Annotation.new(bn_position.to_a, barnumber, bn_style, playable.origin,
                                                                     bn_conf_key, bn_offset).tap { |s| s.draginfo = {handler: :annotation} }
            end
          end
        end
        return res_barnumbers, res_countnotes
      end


      def compute_beat_compression(music, layout_lines)
        result = compute_beat_compression_1(music, layout_lines) if $conf.get('layout.packer.pack_method') == 1
        result = compute_beat_compression_2(music, layout_lines) if $conf.get('layout.packer.pack_method') == 2
        result = compute_beat_compression_10(music, layout_lines) if $conf.get('layout.packer.pack_method') == 10
        result = compute_beat_compression_0(music, layout_lines) if ($conf.get('layout.packer.pack_method') || 0) == 0
        result
      end

      # this is linear packer
      def compute_beat_compression_2(music, layout_lines)
        # find relevant notes for vertical layout
        compression_map = {}

        relevant_notes = layout_lines.map { |voice_id| music.voices[voice_id] }.inject([]) { |result, voice| result.push(voice) }.flatten.select { |note| note.is_a? Harpnotes::Music::Playable }
        relevant_sp    = relevant_notes.select { |note| note.is_a? Harpnotes::Music::SynchPoint }.map { |sp| sp.notes }
        relevant_notes = relevant_notes.push(relevant_sp).flatten

        relevant_beats = relevant_notes.group_by { |playable| playable.beat }

        relevant_beats.keys.sort.each do |beat| # note that hashes are not sorted!
          compression_map[beat] = beat * 8
        end

        compression_map
      end


      # this is the legacy c  ompressor kept for a while as fallback
      def compute_beat_compression_10(music, layout_lines)
        max_beat = music.beat_maps.map { |map| map.keys.max }.max


        # todo:clarify the initialization
        current_beat = 0
        last_size    = 0

        relevant_beat_maps = layout_lines.inject([]) { |r, i| r.push(music.beat_maps[i]) }.compact
        relevant_keys      = music.beat_maps.inject([]) { |r, a| r.push(a.keys); r }.flatten.uniq.sort

        duration_to_style = $conf.get('layout.DURATION_TO_STYLE')
        result            = Hash[relevant_keys.map do |beat|
          notes_on_beat        = relevant_beat_maps.map { |bm| bm[beat] }.flatten.compact ## select the voices for optimization
          max_duration_on_beat = notes_on_beat.map { |n| n.duration }.max
          has_no_notes_on_beat = notes_on_beat.empty?
          is_new_part          = notes_on_beat.select { |n| n.first_in_part? }
          measure_start        = notes_on_beat.select { |n| n.measure_start? }.first

          unless has_no_notes_on_beat
            begin
              size = %x{#{@conf_beat_resolution} * #{duration_to_style[duration_to_id(max_duration_on_beat)].first}}
            rescue Exception => e
              $log.error("BUG: unsupported duration: #{max_duration_on_beat} on beat #{beat},  #{notes_on_beat.to_json}")
            end

            # we need to increment the position by the (radii[i] + radii[i-1])/2
            increment = (size + last_size) / 2
            last_size = size

            if measure_start
              increment += increment / 4 # taktstrich-Abstand
            end

            # if a new part starts on this beat, double the increment
            unless is_new_part.empty?
              increment += increment
            end

            # if beat==2688/8 #14976/8
            #   #increment = -500
            # end

            increment += get_minc_factor(notes_on_beat.first.time, increment)

            current_beat += increment
          end
          [beat, current_beat]
        end]
        result
      end


      # this computes manually added additional increments
      def get_minc_factor(time, increment = @conf_beat_resolution)
        minc = @layout_minc[time.to_s]
        if minc
          minc[:minc_f] * increment
        else
          0
        end
      end

      # Standard algorith to compress  beat layout of a music sheet
      # it increments on every beat
      #
      # This algorithm considers the number of notes and the particular radii of the notes
      # when a beat (layout beat, not to mess up with song beat) has a note
      # the the
      #
      # returns a beat-map { beat => vertical_position_indicator }
      # vertical_position_indicator scales like beats but can be fractions
      # the need to be scaled to the aboslute position on the sheet later.
      # this scaling cannot be done here since it depends on the relative radii
      # of the musig on the sheet.
      #
      # we need to increment the position by the (radii[i] + radii[i-1])/2
      #
      # @param music Harpnotes::Music::Document the document to optimize the beat layout
      # @param [layout_lines] layout_lines list of voices to take into account
      #
      # @return [Hash] a beat map { 10 => 5 } beat 10 is placed at vertical position 5 (* beat_spacing)
      #
      def compute_beat_compression_0(music, layout_lines)
        duration_to_style  = $conf.get('layout.DURATION_TO_STYLE')
        conf_min_increment = ($conf.get('layout.packer.pack_min_increment') || 0) * @conf_beat_resolution


        # initialize the memory
        newbeat         = 0
        compression_map = {}
        last_size       = 0

        # find relevant notes for vertical layout
        relevant_notes = layout_lines.map { |voice_id| music.voices[voice_id] }.inject([]) { |result, voice| result.push(voice) }.flatten.select { |note| note.is_a? Harpnotes::Music::Playable }
        relevant_sp    = relevant_notes.select { |note| note.is_a? Harpnotes::Music::SynchPoint }.map { |sp| sp.notes }
        relevant_notes = relevant_notes.push(relevant_sp).flatten


        # get relvant beats
        relevant_beats = relevant_notes.group_by { |playable| playable.beat }

        relevant_beats.keys.sort.each do |beat| # note that hashes are not sorted!
          notes = relevant_beats[beat]

          max_duration_on_beat = notes.map { |n| n.duration }.max

          # detect parts and measure starts
          is_new_part   = notes.select { |n| n.first_in_part? }
          measure_start = notes.select { |n| n.measure_start? }

          # get the increment from thoe note sizes
          begin
            size = %x{#{@conf_beat_resolution} * #{duration_to_style[duration_to_id(max_duration_on_beat)].first}}
          rescue Exception => e
            $log.error("BUG: unsupported duration: #{max_duration_on_beat} on beat #{beat},  #{notes_on_beat.to_json}")
          end

          defaultincrement = (size + last_size) / 2
          last_size        = size

          # do the default incremnt in case of a collision
          increment = defaultincrement

          increment += defaultincrement unless is_new_part.empty? # handle part

          increment += increment / 4 unless measure_start.empty? # make room for measure bar

          increment += get_minc_factor(notes.first.time, defaultincrement) # get manuial increment

          newbeat += increment

          compression_map[beat] = newbeat
        end

        compression_map
      end

      # compressor based on collision detection
      def compute_beat_compression_1(music, layout_lines)
        duration_to_style  = $conf.get('layout.DURATION_TO_STYLE')
        conf_min_increment = ($conf.get('layout.packer.pack_min_increment') || 0) * @conf_beat_resolution


        # initialize the memory
        collision_stack = {}
        compression_map = {}
        newbeat         = 0
        nextincrement   = 0
        last_size       = 0

        # find relevant notes for vertical layout
        relevant_notes = layout_lines.map { |voice_id| music.voices[voice_id] }.inject([]) { |result, voice| result.push(voice) }.flatten.select { |note| note.is_a? Harpnotes::Music::Playable }
        relevant_sp    = relevant_notes.select { |note| note.is_a? Harpnotes::Music::SynchPoint }.map { |sp| sp.notes }
        relevant_notes = relevant_notes.push(relevant_sp).flatten


        # get relvant beats
        relevant_beats = relevant_notes.group_by { |playable| playable.beat }

        relevant_beats.keys.sort.each do |beat| # note that hashes are not sorted!
          notes = relevant_beats[beat]

          max_duration_on_beat = notes.map { |n| n.duration }.max

          # get the increment from thoe note sizes
          begin
            size = %x{#{@conf_beat_resolution} * #{duration_to_style[duration_to_id(max_duration_on_beat)].first}}
          rescue Exception => e
            $log.error("BUG: unsupported duration: #{max_duration_on_beat} on beat #{beat},  #{notes_on_beat.to_json}")
          end

          defaultincrement = (size + last_size) / 2
          last_size        = size

          # detect collisions
          collisions = notes.select do |note|
            ((collision_stack[note.pitch] || -1) >= newbeat - conf_min_increment)
          end

          # detect inversions of tune
          # it ignores inversions if the next note is a part
          inversions = notes.select do |note|
            a      = [note.prev_pitch || note.pitch, note.pitch, note.next_pitch || note.pitch]
            result = !((a.sort.reverse == a) or (a.sort == a))

            result = false if note.next_first_in_part # this ignores cross part inversions
            result
          end
          #inversions = []

          # detect parts and measure starts
          is_new_part   = notes.select { |n| n.first_in_part? }
          measure_start = notes.select { |n| n.measure_start? }

          increment     = nextincrement
          nextincrement = conf_min_increment

          # do the default incremnt in case of a collision
          if not collisions.empty?
            increment = defaultincrement
          elsif not inversions.empty? # perform half incremnet in case of inversion
            nextincrement = defaultincrement / 2 # other half comes in next seuqence
            increment     = nextincrement
          end

          # handle start part
          unless is_new_part.empty?
            increment     += defaultincrement
            nextincrement = conf_min_increment
          end
          increment += increment / 4 unless measure_start.empty? # make room for measure bar

          increment += get_minc_factor(notes.first.time, defaultincrement) # get manuial increment

          newbeat += increment

          notes.each { |note| collision_stack[note.pitch] = newbeat }
          compression_map[beat] = newbeat
        end

        compression_map
      end


      #
      # layout the one Playable on the sheet
      #
      # @param root [Playable] the entity to be drawn on the sheet
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      # @param [Object] note_conf_base base for note configuration
      #
      # @return [Hash] {shapes: [], proxy: proxy_shape}[description]
      def layout_playable(root, beat_layout, note_conf_base)

        result = if root.is_a? Note
                   layout_note(root, beat_layout, "#{note_conf_base}.n_0")
                 elsif root.is_a? SynchPoint
                   layout_accord(root, beat_layout, note_conf_base)  # layout_accord adds its own note index
                 elsif root.is_a? Pause
                   layout_pause(root, beat_layout, "#{note_conf_base}.n_0")
                 else
                   $log.error("BUG: Missing Music -> Sheet transform: #{root}")
                 end
        result
      end

      #
      # Place a Note on the sheet
      #
      # @param root [Note] The note
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [Object] The generated drawing primitive
      # @param [string] note_conf_base - the base of configuration details for this note
      def layout_note(root, beat_layout, note_conf_base)
        #               shift to left   pitch          space     stay away from border
        x_offset = convert_pitch_to_xpos(root)
        y_offset = beat_layout.call(root.beat)

        dotted, fill, size, flag = compute_ellipse_properties_from_note(root)

        shift = layout_note_shift(root, size, x_offset, dotted, note_conf_base)
        color = compute_color_by_variant_no(root.variant)

        res                 = Ellipse.new([x_offset + shift, y_offset], size, fill, dotted, root)
        res.note_conf_base  = note_conf_base
        root.sheet_drawable = res # backannotate
        res.color           = color
        res.line_width      = $conf.get('layout.LINE_THICK')
        #res.hasbarover     = true if root.measure_start # $conf.get('layout.bottomup')
        result = CompoundDrawable.new([res], res)

        ## layout the flag and beam
        if flag
          result.push(layout_note_flags(x_offset, y_offset, size, shift, color, flag))
        end

        if root.measure_start
          barover_y = size.last + $conf.get('layout.LINE_THICK')
          barover_y = -barover_y if $conf.get('layout.bottomup')

          reducer = flag && !$conf.get('layout.bottomup') ? $conf.get('layout.LINE_THICK') : 0 # reduce width of barover if we have a flag

          res            = Ellipse.new([x_offset + shift - reducer, y_offset - barover_y], [size.first - reducer, $conf.get('layout.LINE_THICK') / 2], :filled, false, nil, true)
          res.color      = color
          res.line_width = $conf.get('layout.LINE_THIN')
          result.push res
        end

        #todo
        # draw dots here

        result
      end

      #**
      # This computes the layout for note flags and beams
      # It is called from layout_note and depends on results
      # of layout_note
      #
      #
      # @param [Numeric] x_offset x position of note
      # @param [Numeric] y_offset y position of of note
      # @param [Array of numeric] size - size of note
      # @param [Boolean of Integer] number of flags: nil | false: no beam; 1-4 number of flags
      # @return [Harpnotes::Drawing::Path]
      def layout_note_flags(x_offset, y_offset, size, shift, color, flag)

        p_beam_x, p_beam_y = [0.1, 2 * size[1]]
        p_flag_x, p_flag_y = [1.3 * size[1], 0.6 * size[1]]

        linewidth = $conf.get('layout.LINE_MEDIUM')
        f_x       = x_offset + shift + size[0] - linewidth / 2 # beam start: right border of beam shall be right border of note
        f_delta_y = $conf.get('layout.LINE_MEDIUM') * 3
        f_delta_y = p_flag_y

        f_delta_x = p_beam_x * f_delta_y / p_beam_y rescue 0

        flagpath = ['l', p_flag_x, p_flag_y]

        # calulate the beam
        path = [['M', f_x, y_offset],
                ['l', p_beam_x, -p_beam_y], # hals
        ]

        # add  the flags
        flag.times { |i| path += [['M', f_x + p_beam_x - i * f_delta_x, y_offset -p_beam_y + i * f_delta_y], flagpath] }

        res            = Harpnotes::Drawing::Path.new(path, :open)
        res.line_width = linewidth
        res.color      = color
        res
      end


      def convert_pitch_to_xpos(root)
        @pitch_to_xpos.call(root.pitch)
      end

      def compute_color_by_variant_no(variant_no)
        if variant_no == 0
          result = @color_default
        else
          result = variant_no.odd? ? @color_variant1 : @color_variant2
        end
        result
      end

      def compute_ellipse_properties_from_note(root)
        scale, fill, dotted, flag = $conf.get('layout.DURATION_TO_STYLE')[check_duration(root)]
        size                      = $conf.get('layout.ELLIPSE_SIZE').map { |e| e * scale }
        return dotted, fill, size, flag
      end

      # layout the shift right/left of a note depending on
      # shift attribute and A3 sheet boundaries
      #
      # @param [Object] root the object being layouted
      # @param [Object] size the size of the object
      # @param [Numerical] x_offset the unshifted horizontal position of the object
      # @return [CompoundDrawable]
      def layout_note_shift(root, size, x_offset, dotted, note_conf_base)
        shift = 0
        if $conf.get('layout.limit_a3')
          if x_offset < 5 # todo: this is still vague
            shift += size.first
          end

          if x_offset > 415 # dodo: this is still vague
            shift += -size.first
            shift -= 1.5 if dotted # todo: derive 1.5 from dotted size
          end
        end

        if root.shift
          if root.shift[:dir] == -1
            shift += -size.first
          else
            shift += size.first
          end
        end

        if note_conf_base
          # todo: get from print_options_raw here
          local_key = note_conf_base.gsub(/extract\.(\d+)\./, '')
          nshift = @print_options_raw["#{local_key}.nshift"]
         # nshift = $conf["#{note_conf_base}.nshift"]
          if nshift
            shift = size.first * 2 * nshift
          end
        end

        shift
      end

      #
      # Place a SynchPoint on the Sheet
      # @param root [SynchPoint] The SynchPoint to be placed
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      # @param [Object] note_conf_base base for note configuration
      #
      # @return [CompoundDrawable] The generated drawing primitive
      def layout_accord(root, beat_layout, note_conf_base)
        # draw the notes in the order of the notes in the Unison
        res            = root.notes.reverse.each_with_index.map { |c, i| layout_note(c, beat_layout, "#{note_conf_base}.n_#{i}") }
        proxy_drawable = root.get_proxy_object(res).proxy # layout_note(root.proxy_drawable, beat_layout)

        # then we ensure that we draw the line from lowest to highest in order to cover all of them
        resnotes_sorted = res.map { |n| n.proxy }.sort_by { |n| n.center.first }

        res = res.map { |n| n.shapes }
        # add the synchline at the very beginning
        res.unshift FlowLine.new(resnotes_sorted.first, resnotes_sorted.last, :dashed)
        CompoundDrawable.new(res, proxy_drawable)
      end

      #
      # Draw a Pause on the Sheet
      # @param root [Pause] The Pause to be drawn
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [CompoundDrawable] The generated drawing primitive
      def layout_pause(root, beat_layout, note_conf_base)
        x_offset = convert_pitch_to_xpos(root)
        y_offset = beat_layout.call(root.beat)

        scale, glyph, dotted = $conf.get('layout.REST_TO_GLYPH')[check_duration(root)]
        rest_size            = $conf.get('layout.REST_SIZE')
        size                 = [rest_size.first * scale.first, rest_size.last * scale.last]

        # handle shift left/right
        shift = layout_note_shift(root, size, x_offset, dotted, note_conf_base)
        color = compute_color_by_variant_no(root.variant)

        # draw the rest
        res                 = nil
        res                 = Harpnotes::Drawing::Glyph.new([x_offset + shift, y_offset], size, glyph, dotted, root)
        res.note_conf_base  = note_conf_base
        root.sheet_drawable = res
        res.color           = color
        res.line_width      = $conf.get('layout.LINE_THICK')
        res.visible         = false unless root.visible?
        result              = CompoundDrawable.new([res], res)

        # draw the measure
        if root.measure_start
          barover_y = size.last + $conf.get('layout.LINE_THICK')
          barover_y = -barover_y if $conf.get('layout.bottomup')

          res            = Ellipse.new([x_offset + shift, y_offset - barover_y], [size.first, $conf.get('layout.LINE_THICK') / 2], :filled, false, nil, true)
          res.color      = color
          res.line_width = $conf.get('layout.LINE_THIN')
          res.visible    = false unless root.visible?
          result.push res
        end

        result
      end


      #
      #
      #
      # general appraoch
      # * music jumps from below start to above end
      # * arrow is on end part
      # * verticalpos determines position of the vertical part
      # * the center of the vertical position determines start or end (either west or east).
      # *
      # @param [Object] arg has like :
      #                from:     {center: from.center, size: from.size, anchor: :after},
      #                to:       {center: to.center, size: to.size, anchor: :before},
      #                vertical: vertical
      def self.make_path_from_jumpline(arg)
        # arg hash like :
        #                from:     {center: from.center, size: from.size, anchor: :after},
        #                to:       {center: to.center, size: to.size, anchor: :before},
        #                vertical: vertical
        #                padding:  2;
        anchorx, anchory = arg[:jumpline_anchor] # the anchor of the jumpline related tothe note size.

        from        = Vector2d(arg[:from][:center]) # the coordnates of the from - point
        from_offset = Vector2d(arg[:from][:size]) + [anchorx, anchory] # the offest of the from - point
        from_anchor = arg[:from][:anchor] == :before ? -1 : 1 # these are multipliers! before: above (-1); after: below (+1)

        to        = Vector2d(arg[:to][:center])
        to_offset = Vector2d(arg[:to][:size]) + [anchorx, anchory]
        to_anchor = arg[:to][:anchor] == :before ? -1 : 1

        verticalpos = arg[:vertical]

        vertical_anchor = from # the endpoint to which the varticalpos relates to
        vertical_anchor = to if arg[:vertical_anchor] == :to

        start_of_vertical = Vector2d(vertical_anchor.x + verticalpos, from.y) # todo: handle the case that vertical is 0;
        end_of_vertical   = Vector2d(vertical_anchor.x + verticalpos, to.y)

        start_orientation = Vector2d((((start_of_vertical - from) * [1, 0]).normalize).x, 0)
        end_orientation   = Vector2d((((end_of_vertical - to) * [1, 0]).normalize).x, 0)

        start_offset = from_offset * [start_orientation.x, from_anchor] # 1 start after -1 start before
        # offset of array top
        end_offset = to_offset * [end_orientation.x, to_anchor] # 1 end after -1 end before
        # offset of line such that it ends inside of the array

        start_of_vertical = start_of_vertical + start_offset * [0, 1] # set x of offest to 0
        end_of_vertical   = end_of_vertical + end_offset * [0, 1] # set x of offset to 0

        #start_of_jumpline = from + [start_offset.x * from_offset.x, +from_offset.y]
        #end_of_jumpline   = to + [end_offset.x * to_offset.x, -to_offset.y]

        # line points
        p1      = from + start_offset
        p2      = start_of_vertical
        p3      = end_of_vertical
        p4      = to + end_offset
        p4_line = to + end_offset + end_orientation * [2, 0] # end of line such that it ends inside of the arrow

        # arrow points
        a1 = p4 + end_orientation * 2.5 + [0, 1]
        a2 = p4 + end_orientation * 2.5 - [0, 1]
        a3 = p4

        # covert path to relative
        # relative line points
        rp2 = p2 - p1
        rp3 = p3 - p2
        rp4 = p4_line - p3

        # relative array points
        ra1 = a1 - p4
        ra2 = a2 - a1
        ra3 = p4 - a2

        path = [
            [["M", p1.x, p1.y],
             ['l', rp2.x, rp2.y],
             ['l', rp3.x, rp3.y],
             ['l', rp4.x, rp4.y]],
            [['M', p4.x, p4.y],
             ['l', ra1.x, ra1.y],
             ['l', ra2.x, ra2.y],
             ['l', ra3.x, ra3.y],
             ['z']]
        ]
        path
      end


      #
      # Convert a duration to a symbol todo: move DURATION_TO_STYLE in here
      #
      # @param duration [Integer] Duration as multiples of min note see DURATION_TO_STYLE
      #
      # @return [Object] The generated drawing primitive
      def duration_to_id(duration)
        result = "d#{duration}".to_sym
        if $conf.get('layout.DURATION_TO_STYLE')[result].nil?
          result = "err"
        end
        result
      end

      def check_duration(root)
        result = duration_to_id(root.duration)
        if result === 'err'
          $log.error("unsupported duration at #{root.start_pos_to_s}", root.start_pos, root.end_pos)
        end
        result
      end

      #
      # draw a sheetmark to
      # @param [Array] note Array [x,y] coordinates of center of sheetmark
      #
      # @return [Array] of Path command arrays
      def make_sheetmark_path(note)
        w     = 0.5; h = 5
        base  = Vector2d(note) - [w, h / 2]
        vpath = [Vector2d(w, -(2 * w)), Vector2d(w, 2 * w),
                 Vector2d(0, h),
                 Vector2d(-(w), 2 * w), Vector2d(-(w), -2 * (w)),
                 Vector2d(0, -h)]

        path = [["M", base.x, base.y]]
        vpath.each do |p|
          path << ["l", p.x, p.y]
        end
        path
      end

      #
      # create a path to represent a slur from p1 to p2
      #
      # @param [Vector2d] p1 the Start point of the slur
      # @param [Vector2d] p2 the End point of the slur
      # @return [Array] to be passed to Path
      def make_slur_path(p1, p2)
        deltap = p2 - p1

        # distance = deltap.length
        cp_template = Vector2d(0.3 * deltap.length, 0).rotate(deltap.angle)
        cp1         = cp_template.rotate(-0.4)
        cp2         = deltap + cp_template.reverse.rotate(0.4)

        # todo make the drawing more fancy
        slurpath = [['M', p1.x, p1.y], ['c', cp1.x, cp1.y, cp2.x, cp2.y, deltap.x, deltap.y]]
        slurpath
      end

      #
      # create a path to represent a slur from p1 to p2
      #
      # @param [Array of Vector2d] points the start and endpoint of the beziers pfad
      # @return [Array]  [Path, annotation-position]
      # @param [hash] tuplet_options
      def make_annotated_bezier_path(points, tuplet_options)
        p1     = points.first
        p2     = points.last
        deltap = p2 - p1

        # distance = deltap.length
        #cp_template = Vector2d(2 * deltap.length, 0).rotate(deltap.angle)

        # template is the normaliezd control-point
        #
        # *
        # | \
        # |  *  [x,y] y positive downwards
        # |  |
        # |  |
        # |  *
        # | /
        # *
        cp_template1 = Vector2d(tuplet_options[:cp1]) #.rotate(deltap.angle) #rotate(Math::PI * 0.5)
        cp_template2 = Vector2d(tuplet_options[:cp2]) #.rotate(deltap.angle) #rotate(Math::PI * 0.5)

        rotate_by = Math::PI * -0.5
        cp1       = cp_template1.rotate(deltap.angle).rotate(rotate_by) #.rotate(-rotate_by)
        cp2       = cp_template2.rotate(deltap.angle).rotate(rotate_by) #.rotate(rotate_by)

        cp2 = deltap + cp2

        $log.debug(%Q{#{cp1.to_s} - #{cp2.to_s}})

        # compute the position of the annotation
        # see https://de.wikipedia.org/wiki/B%C3%A9zierkurve#Kubische_B.C3.A9zierkurven_.28n.3D3.29
        cpa1  = p1 + cp1 # absolute control point 1
        cpa2  = p1 + cp2 # absolute control point 2
        cpm1  = (p1 + cpa1) / 2 # middle of p1->cp1
        cpm2  = (p2 + cpa2) / 2 # middle of p2->cp2
        cpmm  = (cpa1 + cpa2) / 2 # middle between the control points
        cpmm1 = (cpm1 + cpmm) / 2 # start of tangent
        cpmm2 = (cpm2 + cpmm) / 2 # end of tangent

        unless cpmm1 == cpmm2 # see #57
          annotation_normal = (cpmm1 - cpmm2).perpendicular.normalize
        else
          annotation_normal = Vector2d([0, 0])
        end

        # todo this is a hack
        # if curve goes south east, draw number on the right side
        # othewise on the left side
        # see 1025_Tuplet-patterns
        unless cpa1.x <= p1.x and p1.x <= p2.x
          # annotate eastwards
          annotation_anchor = (cpmm1 + cpmm2) / 2 + annotation_normal * 2
        else
          # anotate westwards
          annotation_anchor = (cpmm1 + cpmm2) / 2 + (annotation_normal * -2) - [2, 0] # need to correct by x-size of number
        end
        annotation_anchor = annotation_anchor + [0, -2] # literal corection since now reference point is top of line

        # todo make the drawing more fancy
        start = [['M', p1.x, p1.y]]
        curve = [['c', cp1.x, cp1.y, cp2.x, cp2.y, deltap.x, deltap.y]]
        line  = [["l", cp1.x, cp1.y], ['L', cpa2.x, cpa2.y], ['L', p2.x, p2.y]]

        slurpath = []
        slurpath += start + curve if tuplet_options[:shape].include? 'c'
        slurpath += start + line if tuplet_options[:shape].include? 'l'

        [slurpath, annotation_anchor, cpa1, cpa2]
      end


      # this is used to resolve placeholders in annotations
      #
      # @param [String] text the text to be resolveld
      # @param [String] parameter the name of the configuration parameter for backtracking purposes
      # @return [String] the resolved text
      def resolve_placeholder(text, parameter)
        result = text
        keys   = result.scan(/\{\{([^\}]+)\}\}/)
        keys.each do |key|
          value = @placeholders[key.first]
          if value
            result = result.gsub("{{#{key}}}", value.call)
          else
            $log.error(%Q{#{I18n.t("wrong placeholder: ")} #{key.first} in #{parameter}})
          end
        end
        result
      end

    end

  end


end
