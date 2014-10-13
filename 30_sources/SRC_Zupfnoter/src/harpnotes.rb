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
  # - *Syncline*: an indicator for notes to be played simultaneously. They synchronize
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
      attr_accessor :origin, :beat, :visible

      def initialize
        @visible = true
      end

      def visible?
        @visible
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
        @companion.pitch
      end


      #
      # Return the associated beat
      #
      # @return [Numeric] Beat of the companion
      def beat
        @companion.beat
      end


      #
      # Return associated Duration
      #
      # @return [Numeric] Duration of the companion
      def duration
        @companion.duration
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
                    :tuplet_end # last note of a tuplet

      def initialize
        # initialize slur and ties to the safe side ...
        super
        @slur_starts = []
        @slur_ends = []
        @tie_start = false
        @tie_end = false
        @tuplet = 1
        @tuplet_start = false
        @tuplet_end = false
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
        super
        @pitch = pitch
        @duration = duration
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
      attr_reader :notes

      #
      # Constructor
      #
      # @param notes [Array of Note] The particular notes of the chord
      #
      def initialize(notes)
        super
        raise "Notes must be an array" unless notes.is_a? Array

        @notes = notes
      end

      #
      # Yield the duration of the SyncPoint
      # Accords are always played the same length
      # (otherwise it is not an Accord). Therefore
      # we can provide the duration as the duration
      # of the first note.
      #
      # @return [Integer] see Playable
      def duration
        @notes.first.duration
      end

      #
      # This sets the actual beat
      #
      # @param value [Integer] id of hte beat
      #
      # @return [type] [description]
      def beat=(value)
        @beat = value
        @notes.each { |n| n.beat = value }
      end


      def pitch
        @notes.last.pitch
      end

    end

    # A pause also called 'rest'. It is not really
    # 'played' but has a duration
    #
    #
    class Pause < Playable
      # note that the pitch is used to support layout ...
      attr_reader :duration, :pitch

      #
      # Constructor
      # @param duration [Integer] duration - see Playable

      #
      # @return [Type] [description]
      def initialize(pitch, duration)
        super
        @pitch = pitch
        @duration = duration
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
        super
        self.companion = companion
        @visible = companion.visible?
      end
    end

    #
    # this represents the beginning of a new part
    #
    class NewPart < NonPlayable
      attr_reader :name

      def initialize(title)
        super
        @name = title
      end
    end


    #
    class NoteBoundAnnotation < NonPlayable
      # @param [Object] origin the note which is annotated
      # @param [Object] annotation the annotation {pos:[array], text:""} position relative to note
      def initialize(companion, annotation)
        super
        self.companion = companion
        @annotations = annotation
      end

      def text
        @annotations[:text]
      end

      def position
        @annotations[:pos]
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
      # construtor
      # @param from [Playable] the end point of jump (repeat from)
      # @param to [Playable] the Start point of jump (repeat to )
      # @param policy [Hash] {level:, distance:} A policy, used to optimize the graphical representation.
      #
      def initialize(from, to, policy)
        super
        raise "End point of Jump (#{from.class}) must be a Playable" unless from.is_a? Harpnotes::Music::Playable
        raise "Start point of Jump (#{to.class}) must be a Playable" unless to.is_a? Harpnotes::Music::Playable

        @from = from
        @to = to
        @policy = policy
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
      attr_accessor :meta_data, :harpnote_options

      #
      # Constructor
      # @param voices [Array of ABCVoice] The voices in the song
      # @param note_length_in_beats [Integer] the shortest note todo: not used?
      #
      def initialize(voices = [], note_length_in_beats = 8, metadata={})
        @voices = voices
        @note_length_in_beats = note_length_in_beats
        @meta_data = metadata
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
        syncpoints =expanded_beat_maps.map do |playables|
          playables = [playables[selector.first], playables[selector.last]] if selector

          #
          # replace syncpoints with the first note of a syncpoint
          # this might lead to double printing of the
          # inner synchline.
          # todo: investigate if this is a problem
          playables = playables.map { |p|
            if p.is_a? SynchPoint
              r = p.notes.first
            else
              r = p
            end
            r
          }
          playables.compact!
          SynchPoint.new(playables) if playables.length > 1
        end.flatten.compact

        # this drops synchpoints which contain other playables than notes
        # todo: investigate if we still need this.
        syncpoints = syncpoints.select { |sp| sp.notes.reject { |e| e.is_a? Note }.empty? }
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
        (0..last_beat).map do |beat|
          @beat_maps.map { |map| map[beat] }
        end
      end

      private

      #
      # Updates the beat map of the song.
      # A beat map of a voice is a hash (current_beat => playable).
      # this method also updates the beat in the considered playable
      #
      # @return nil
      def update_beats
        tupletmap = {
            1 => 1,
            2 => 3/2,
            3 => 2/3,
            4 => 3/4,
            5 => 2/5, # todo 3/5 depends on measure http://abcnotation.com/wiki/abc:standard:v2.1#duplets_triplets_quadruplets_etc
            6 => 2/6,
            7 => 2/7, # todo 3/7 depends on measure http://abcnotation.com/wiki/abc:standard:v2.1#duplets_triplets_quadruplets_etc
            8 => 3/8,
            9 => 2/9 # todo 3/9 depends on measure http://abcnotation.com/wiki/abc:standard:v2.1#duplets_triplets_quadruplets_etc

        }
        @beat_maps = @voices.map do |voice|
          current_beat = 0
          voice_map = voice.select { |e| e.is_a? Playable }.inject(BeatMap.new(voice.index)) do |map, playable|
            beats = playable.duration * Harpnotes::Layout::Default::BEAT_PER_DURATION # todo:handle triplets
            # Timefactor of player
            # BEAT_RESOLUTOIN
            if playable.tuplet == 3
              #beats = beats * 2/3
            end

            beats = beats * tupletmap[playable.tuplet]
            beat_error = beats - beats.floor(0)
            if beat_error > 0
              $log.error("unsupported tuplet #{playable.tuplet} #{beat_error}") # to support more, adjust BEAT_RESOLUTION to be mulpple of triplet
              beats = beats.floor(0)
            end

            map[current_beat] = playable
            playable.beat = current_beat

            current_beat += beats
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
        @show_voice=true
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

    #
    # This is the drawing model of a tableharp sheet.
    # Note that this model is still independent from the rendering engine.
    # It comprises the drawing semantic drawing prmitives
    #
    #
    class Sheet
      attr_reader :children, :vertical_scale

      # Constructor
      # @param children [Array of primitives]  the primitives which are drawn
      # @param vertical_scale = 1.0 [Numeric]  A factor to map the beats to vertical positions. todo: maybe superfluous
      #
      # @return [type] [description]
      def initialize(children = [], vertical_scale = 1.0)
        @children = children
        @vertical_scale = vertical_scale
      end
    end

    # this represetns objects which can be visible
    class Drawable
      def initialize
        @visible = true
      end

      def center
        raise "Not implemented"
      end

      def visible?
        @visible
      end

      def visible=(v)
        @visible=v
      end
    end


    #
    # This represents a flowline
    #
    class FlowLine < Drawable
      attr_reader :from, :to, :style, :origin

      # @param from [Drawable] the origin of the flow
      # @param to   [Drawable] the target of the flow
      # @param style [Symbol] either :dashed or :solid
      # @param origin [Object] An object to support bactrace, drill down etc.
      #
      # @return [type] [description]
      def initialize(from, to, style = :solid, origin = nil)
        super
        @from = from
        @to = to
        @style = style
        @origin = origin
      end

      #
      # Indicates of the flowline shall be drawn as dashed
      # Syntactic sugar for the attr_reader
      #
      # @return [type] [description]
      def dashed?
        @style == :dashed
      end
    end



    # this represents a path to be rendered. The path is noted as an array of path commands:
    # ["l", {x}, {y}] or
    # ["c" {x}, {y}, {cp1x}, {cp1y}, {cp2x}, {cp2x}]
    # ["M", {x}, {y}]
    class Path < Drawable
      attr_reader :path, :style


      # @param [Arraa] path see class description for details
      # @param [Symbol] fill :filled makes the path to be filled
      # @param [Object] origin Reference to the origin object for tracing purposes
      def initialize(path, fill = nil, origin = nil)
        super
        @path = path
        @fill = fill
        @origin = origin
      end

      def filled?
        @fill == :filled
      end
    end


    #
    # This represents a note in the shape of an ellipsis
    #
    class Ellipse < Drawable
      attr_reader :center, :size, :fill, :dotted, :origin

      #
      # Constructor
      #
      # @param size [Array] the size of the ellipse as [width, height]
      # @param fill [Symbol] the fill style, either :filled or :empty
      # @param dotted [Boolean] TRUE if the ellipse has a small companion dot, FALSE otherwise
      # @param origin [Object] The source object of the upstream model
      #
      def initialize(center, size, fill = :filled, dotted = TRUE, origin = nil)
        super
        @center = center
        @size = size
        @fill = fill
        @dotted = dotted
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

    end

    #
    # Represent a text on the sheet
    #
    #
    class Annotation < Drawable
      attr_reader :center, :text, :style, :origin

      # @param center Array the position of the text as [x, y]
      # @param text String the text itself
      # @param style Symbol the text style, can be :regular, :large (as defined in pdfengine)
      # 
      def initialize(center, text, style = :regular, origin = nil)
        super
        @center = center
        @text = text
        @style = style
        @origin = origin
      end
    end


    #
    # represent a glyph on the sheet
    #

    class Glyph < Drawable
      attr_reader :center, :size, :glyph, :dotted, :origin

      GLYPHS = {
          # todo: apply a proper approach for the glyphs: Specify a bounding box here
          # we trim the intial move somehow - don't really konw what i am doing
          # ["M", 0.06, 0.03]
          rest_1: {d: [["M", 0.06 -0.06 - 11.25/2, 0.03-1.7*4.68], ["l", 0.09, -0.06], ["l", 5.46, 0], ["l", 5.49, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 2.19], ["l", 0, 2.19], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -5.49, 0], ["l", -5.46, 0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -2.19], ["l", 0, -2.19], ["z"]], w: 11.25, h: 2.2*4.68},
          rest_4: {d: [["M", 1.89, -11.82], ["c", 0.12, -0.06, 0.24, -0.06, 0.36, -0.03], ["c", 0.09, 0.06, 4.74, 5.58, 4.86, 5.82], ["c", 0.21, 0.39, 0.15, 0.78, -0.15, 1.26], ["c", -0.24, 0.33, -0.72, 0.81, -1.62, 1.56], ["c", -0.45, 0.36, -0.87, 0.75, -0.96, 0.84], ["c", -0.93, 0.99, -1.14, 2.49, -0.6, 3.63], ["c", 0.18, 0.39, 0.27, 0.48, 1.32, 1.68], ["c", 1.92, 2.25, 1.83, 2.16, 1.83, 2.34], ["c", -0, 0.18, -0.18, 0.36, -0.36, 0.39], ["c", -0.15, -0, -0.27, -0.06, -0.48, -0.27], ["c", -0.75, -0.75, -2.46, -1.29, -3.39, -1.08], ["c", -0.45, 0.09, -0.69, 0.27, -0.9, 0.69], ["c", -0.12, 0.3, -0.21, 0.66, -0.24, 1.14], ["c", -0.03, 0.66, 0.09, 1.35, 0.3, 2.01], ["c", 0.15, 0.42, 0.24, 0.66, 0.45, 0.96], ["c", 0.18, 0.24, 0.18, 0.33, 0.03, 0.42], ["c", -0.12, 0.06, -0.18, 0.03, -0.45, -0.3], ["c", -1.08, -1.38, -2.07, -3.36, -2.4, -4.83], ["c", -0.27, -1.05, -0.15, -1.77, 0.27, -2.07], ["c", 0.21, -0.12, 0.42, -0.15, 0.87, -0.15], ["c", 0.87, 0.06, 2.1, 0.39, 3.3, 0.9], ["l", 0.39, 0.18], ["l", -1.65, -1.95], ["c", -2.52, -2.97, -2.61, -3.09, -2.7, -3.27], ["c", -0.09, -0.24, -0.12, -0.48, -0.03, -0.75], ["c", 0.15, -0.48, 0.57, -0.96, 1.83, -2.01], ["c", 0.45, -0.36, 0.84, -0.72, 0.93, -0.78], ["c", 0.69, -0.75, 1.02, -1.8, 0.9, -2.79], ["c", -0.06, -0.33, -0.21, -0.84, -0.39, -1.11], ["c", -0.09, -0.15, -0.45, -0.6, -0.81, -1.05], ["c", -0.36, -0.42, -0.69, -0.81, -0.72, -0.87], ["c", -0.09, -0.18, -0, -0.42, 0.21, -0.51], ["z"]], w: 7.888, h: 21.435},
          rest_8: {d: [["M", 1.68, -6.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.39, -0.18, 1.32, -1.29, 1.68, -1.98], ["c", 0.09, -0.21, 0.24, -0.3, 0.39, -0.3], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.27, 1.11, -1.86, 6.42], ["c", -1.02, 3.48, -1.89, 6.39, -1.92, 6.42], ["c", 0, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.15, -0.57, 1.68, -4.92], ["c", 0.96, -2.67, 1.74, -4.89, 1.71, -4.89], ["l", -0.51, 0.15], ["c", -1.08, 0.36, -1.74, 0.48, -2.55, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 7.534, h: 13.883},
          rest_16: {d: [["M", 3.33, -6.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.87, 0.42], ["c", 0.39, -0.18, 1.2, -1.23, 1.62, -2.07], ["c", 0.06, -0.15, 0.24, -0.24, 0.36, -0.24], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.45, 1.86, -2.67, 10.17], ["c", -1.5, 5.55, -2.73, 10.14, -2.76, 10.17], ["c", -0.03, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.12, -0.57, 1.44, -4.92], ["c", 0.81, -2.67, 1.47, -4.86, 1.47, -4.89], ["c", -0.03, 0, -0.27, 0.06, -0.54, 0.15], ["c", -1.08, 0.36, -1.77, 0.48, -2.58, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.33, -0.15, 1.02, -0.93, 1.41, -1.59], ["c", 0.12, -0.21, 0.18, -0.39, 0.39, -1.08], ["c", 0.66, -2.1, 1.17, -3.84, 1.17, -3.87], ["c", 0, 0, -0.21, 0.06, -0.42, 0.15], ["c", -0.51, 0.15, -1.2, 0.33, -1.68, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 9.724, h: 21.383},
          rest_32: {d: [["M", 4.23, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.27, -0.06], ["c", 0.33, -0.21, 0.99, -1.11, 1.44, -1.98], ["c", 0.09, -0.24, 0.21, -0.33, 0.39, -0.33], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.57, 2.67, -3.21, 13.89], ["c", -1.8, 7.62, -3.3, 13.89, -3.3, 13.92], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, -0, -0.3, -0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.09, -0.57, 1.23, -4.92], ["c", 0.69, -2.67, 1.26, -4.86, 1.29, -4.89], ["c", 0, -0.03, -0.12, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.12, 0.09, 0.3, 0.18, 0.48, 0.21], ["c", 0.12, -0, 0.18, -0, 0.3, -0.09], ["c", 0.42, -0.21, 1.29, -1.29, 1.56, -1.89], ["c", 0.03, -0.12, 1.23, -4.59, 1.23, -4.65], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -0.63, 0.18, -1.2, 0.36, -1.74, 0.45], ["c", -0.39, 0.06, -0.54, 0.06, -1.02, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.18, 0.18, 0.51, 0.27, 0.72, 0.15], ["c", 0.3, -0.12, 0.69, -0.57, 1.08, -1.17], ["c", 0.42, -0.6, 0.39, -0.51, 1.05, -3.03], ["c", 0.33, -1.26, 0.6, -2.31, 0.6, -2.34], ["c", 0, -0, -0.21, 0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.14, 0.33, -1.62, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 11.373, h: 28.883},
          rest_64: {d: [["M", 5.13, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.24, -0.12, 0.63, -0.66, 1.08, -1.56], ["c", 0.33, -0.66, 0.39, -0.72, 0.6, -0.72], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.69, 3.66, -3.54, 17.64], ["c", -1.95, 9.66, -3.57, 17.61, -3.57, 17.64], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.06, -0.57, 1.05, -4.95], ["c", 0.6, -2.7, 1.08, -4.89, 1.08, -4.92], ["c", 0, 0, -0.24, 0.06, -0.51, 0.15], ["c", -0.66, 0.24, -1.2, 0.36, -1.77, 0.48], ["c", -0.42, 0.06, -0.57, 0.06, -1.05, 0.06], ["c", -0.69, 0, -0.87, -0.03, -1.35, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.21, 0.03, 0.39, -0.09, 0.72, -0.42], ["c", 0.45, -0.45, 1.02, -1.26, 1.17, -1.65], ["c", 0.03, -0.09, 0.27, -1.14, 0.54, -2.34], ["c", 0.27, -1.2, 0.48, -2.19, 0.51, -2.22], ["c", 0, -0.03, -0.09, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.9, 0.42], ["c", 0.36, -0.18, 1.2, -1.26, 1.47, -1.89], ["c", 0.03, -0.09, 0.3, -1.2, 0.57, -2.43], ["l", 0.51, -2.28], ["l", -0.54, 0.18], ["c", -1.11, 0.36, -1.8, 0.48, -2.61, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.21, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.36, -0.18, 0.93, -0.93, 1.29, -1.68], ["c", 0.12, -0.24, 0.18, -0.48, 0.63, -2.55], ["l", 0.51, -2.31], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -1.14, 0.36, -2.1, 0.54, -2.82, 0.51], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 12.453, h: 36.383},
          rest_128: {d: [["M", 6.03, -21.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.21, 0, 0.33, -0.06, 0.54, -0.36], ["c", 0.15, -0.21, 0.54, -0.93, 0.78, -1.47], ["c", 0.15, -0.33, 0.18, -0.39, 0.3, -0.48], ["c", 0.18, -0.09, 0.45, 0, 0.51, 0.15], ["c", 0.03, 0.09, -7.11, 42.75, -7.17, 42.84], ["c", -0.03, 0.03, -0.15, 0.09, -0.24, 0.15], ["c", -0.18, 0.06, -0.24, 0.06, -0.45, 0.06], ["c", -0.24, -0, -0.3, -0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.03, -0.57, 0.84, -4.98], ["c", 0.51, -2.7, 0.93, -4.92, 0.9, -4.92], ["c", 0, -0, -0.15, 0.06, -0.36, 0.12], ["c", -0.78, 0.27, -1.62, 0.48, -2.31, 0.57], ["c", -0.15, 0.03, -0.54, 0.03, -0.81, 0.03], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.63, 0.48], ["c", 0.12, -0, 0.18, -0, 0.3, -0.09], ["c", 0.42, -0.21, 1.14, -1.11, 1.5, -1.83], ["c", 0.12, -0.27, 0.12, -0.27, 0.54, -2.52], ["c", 0.24, -1.23, 0.42, -2.25, 0.39, -2.25], ["c", 0, -0, -0.24, 0.06, -0.51, 0.18], ["c", -1.26, 0.39, -2.25, 0.57, -3.06, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.51, 0.3, 0.75, 0.18], ["c", 0.36, -0.15, 1.05, -0.99, 1.41, -1.77], ["l", 0.15, -0.3], ["l", 0.42, -2.25], ["c", 0.21, -1.26, 0.42, -2.28, 0.39, -2.28], ["l", -0.51, 0.15], ["c", -1.11, 0.39, -1.89, 0.51, -2.7, 0.51], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.18, 0.48, 0.27, 0.72, 0.21], ["c", 0.33, -0.12, 1.14, -1.26, 1.41, -1.95], ["c", 0, -0.09, 0.21, -1.11, 0.45, -2.34], ["c", 0.21, -1.2, 0.39, -2.22, 0.39, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.2, 0.33, -1.71, 0.42], ["c", -0.3, 0.06, -0.51, 0.06, -0.93, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.18, -0, 0.36, -0.09, 0.57, -0.33], ["c", 0.33, -0.36, 0.78, -1.14, 0.93, -1.56], ["c", 0.03, -0.12, 0.24, -1.2, 0.45, -2.4], ["c", 0.24, -1.2, 0.42, -2.22, 0.42, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.39, 0.09], ["c", -1.05, 0.36, -1.8, 0.48, -2.58, 0.48], ["c", -0.63, -0, -0.84, -0.03, -1.29, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]], w: 12.992, h: 43.883}
      }

      # @param
      def initialize(center, size, glyph_name, dotted = FALSE, origin = nil)
        super
        @center = center
        @glyph_name = glyph_name
        @glyph = GLYPHS[glyph_name]
        @size = size #
        @dotted = dotted
        @origin = origin
        @filled = true
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
    include Harpnotes::Music
    include Harpnotes::Drawing

    #
    # the default layout engine representing vanilla table harp sheets
    # This might be the only one at all ...
    #
    class Default
      # all numbers in mm
      ELLIPSE_SIZE = [2.8, 1.7] # radii of the largest Ellipse
      REST_SIZE = [2.8, 2.8] # radii of the largest Rest Glyph

      # x-size of one step in a pitch. It is the horizontal
      # distance between two strings of the harp
      X_SPACING = 115.0 / 10.0

      # Y coordinate of the very first beat
      Y_OFFSET = 5
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


      # This is a lookup table to map durations to graphical representation
      DURATION_TO_STYLE = {
          #key      size   fill          dot                  abc duration

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

      REST_TO_GLYPH = {# this basically determines the white background rectangel
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

      def initialize
        # Spacing between two BeatTable increments
        # 1.0 = dureation of a whole note
        #
        @beat_spacing = Y_SCALE * 1.0/BEAT_RESOULUTION # initial value for beat_spacing (also the optimum spacing)
        @slur_index = {}
      end

      #
      # get the vertical layout policy
      #
      # @param music Harpnotes::Music::Document the document to transform
      #             don't be confused it is just to make inject music in the scope of the returned procedure
      #
      # @return [Lambda] Proecdure, to compute the vertical distance of a particular beat
      def beat_layout_policy(music)
        Proc.new do |beat|
          (beat -1) * @beat_spacing + Y_OFFSET
        end
      end

      #
      # compute the layout of the Harnote sheet
      #
      # @param music Harpnotes::Music::Song the Song to transform
      # @param beat_layout = nil [Lambda] Policy procedure to compute the vertical layout
      # @print_variant = 0 [Integer] If a song has multiple print_variants, this is the index of the one to be shown
      #
      # @return [Harpnotes::Drawing::Sheet] Sheet to be provided to the rendering engine
      def layout(music, beat_layout = nil, print_variant_nr = 0)

        print_options = music.harpnote_options[:print][print_variant_nr]

        # first optimize the vertical arrangement of the notes
        # by analyzing the beat layout
        beat_layout = beat_layout || beat_layout_policy(music)

        beat_compression_map = compute_beat_compression(music, print_options[:layoutlines])
        maximal_beat = beat_compression_map.values.max
        full_beat_spacing = DRAWING_AREA_SIZE.last / maximal_beat

        if full_beat_spacing < @beat_spacing
          factor = (@beat_spacing / full_beat_spacing)
          $log.warning("note distance too small (factor #{factor})")
        end
        @beat_spacing = [full_beat_spacing, 2 * @beat_spacing].min # limit beat spacing to twice of optimal spacing

        compressed_beat_layout = Proc.new { |beat| beat_layout.call(beat_compression_map[beat]) }

        # sheet_elements derived from the voices
        voice_elements = music.voices.each_with_index.map { |v, index|
          if print_options[:voices].include?(index) ## todo add control for jumpline right border
            layout_voice(v, compressed_beat_layout,
                         flowline: print_options[:flowlines].include?(index),
                         jumpline: print_options[:jumplines].include?(index),
                         annotations: music.harpnote_options[:annotations])
          end
        }.flatten.compact # note that we get three nil objects bcause of the voice filter

        # this is a lookup table to find the drawing symbol by a note
        note_to_ellipse = Hash[voice_elements.select { |e| e.is_a? Ellipse }.map { |e| [e.origin, e] }]

        # configure which synclines are required from-voice to-voice
        # also filter such synchlines which have points in the displayed voices
        required_synchlines = print_options[:synchlines].select { |sl|
          print_options[:voices].include?(sl.first) && print_options[:voices].include?(sl.last)
        }

        # build synchlines between voices
        synch_lines = required_synchlines.map do |selector|
          synch_points_to_show = music.build_synch_points(selector)
          synch_points_to_show.map do |sp|
            FlowLine.new(note_to_ellipse[sp.notes.first], note_to_ellipse[sp.notes.last], :dashed, sp)
          end
        end.flatten


        # now generate sheet_marks
        # todo: use a path for sheet marks
        sheet_marks = []
        rightmark = Harpnotes::Music::Note.new(79, 2)
        leftmark = Harpnotes::Music::Note.new(43, 2)
        (1..3).each do |i|
          rightmark.beat = i * 16
          leftmark.beat = i * 8
          sheet_marks << layout_note(rightmark, beat_layout_policy(music))
          sheet_marks << layout_note(leftmark, beat_layout_policy(music))
        end


        # now generate legend

        annotations = []

        title_pos = [20, 20]
        legend_pos = [20, 30]

        title = music.meta_data[:title] || "untitled"
        meter = music.meta_data[:meter]
        key = music.meta_data[:key] +
        composer = music.meta_data[:composer]
        tempo = music.meta_data[:tempo_display]
        print_variant_title = print_options[:title]
        title_pos = music.harpnote_options[:legend] || [20, 20]
        legend_pos = [title_pos.first, title_pos.last + 7]

        legend = "#{print_variant_title}\n#{composer}\nTakt: #{meter} (#{tempo})\nTonart: #{key}"
        annotations << Harpnotes::Drawing::Annotation.new(title_pos, title, :large)
        annotations << Harpnotes::Drawing::Annotation.new(legend_pos, legend, :regular)
        datestring = Time.now.strftime("%Y-%m-%d %H:%M:%S %Z")
        annotations << Harpnotes::Drawing::Annotation.new([150, 292], "rendered #{datestring} by Zupfnoter #{VERSION} #{COPYRIGHT} (Host #{`window.location`})", :smaller)

        #sheet based annotations
        music.harpnote_options[:notes].each do |note|
          #note is an array [center, text, style] todo: refactor this
          annotations << Harpnotes::Drawing::Annotation.new(note[0], note[1], note[2])
        end


        sheet_elements = synch_lines + voice_elements + sheet_marks + annotations
        hugo=1
        Harpnotes::Drawing::Sheet.new(sheet_elements)
      end

      #
      # compute the layout of a particular voice. It places flowlines playables and jumplines.
      # The vertical arrangement is goverend by the beat_layout, which actually maps the
      # beat in the timing domain to the beat in the sheet.
      #
      # @param voice [Array of MusicEntity] the Voice to be layouted
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      # @param show_options [Hash] {flowlines: true, jumplines:true}
      #
      # @return [Array of Element] the list of elements to be drawn. It consists of flowlines, playables and jumplines.
      #                            note that these shall be rendered in the given order.
      def layout_voice(voice, beat_layout, show_options)

        # draw the playables
        # note that the resulting playables are even flattened (e.g. syncpoints appear as individual playables)
        playables = voice.select { |c| c.is_a? Playable }


        res_playables = playables.map do |playable|
          layout_playable(playable, beat_layout)
        end.flatten


        # layout the measures

        res_measures = voice.select { |c| c.is_a? MeasureStart }.map do |measure|
          layout_playable(measure, beat_layout)
        end

        res_newparts = voice.select { |c| c.is_a? NewPart }.map do |newpart|
          layout_newpart(newpart, beat_layout)
        end

        # this is a lookup-Table to navigate from the drawing primitive (ellipse) to the origin
        lookuptable_drawing_by_playable = Hash[res_playables.map { |e| [e.origin, e] }]
        res_playables.select { |e| e.is_a? FlowLine }.each { |f| lookuptable_drawing_by_playable[f.origin] = f.to }

        # draw the flowlines
        previous_note = nil
        res_flow = voice.select { |c| c.is_a? Playable or c.is_a? SynchPoint }.map do |playable|
          res = nil
          res = FlowLine.new(lookuptable_drawing_by_playable[previous_note], lookuptable_drawing_by_playable[playable]) unless previous_note.nil?
          res = nil if playable.first_in_part?

          previous_note = playable
          res
        end.compact

        # layout tuplets

        tuplet_start = playables.first

        res_tuplets = playables.inject([]) do |result, playable|
          tuplet_start = playable if playable.tuplet_start?

          if playable.tuplet_end?
            p1 = Vector2d(lookuptable_drawing_by_playable[tuplet_start].center)
            p2 = Vector2d(lookuptable_drawing_by_playable[playable].center)
            tiepath, anchor = make_annotated_bezier_path([p1, p2])
            $log.debug([tiepath, anchor])
            result.push(Harpnotes::Drawing::Path.new(tiepath))
            result.push(Harpnotes::Drawing::Annotation.new(anchor.to_a, playable.tuplet.to_s, :small))

            # compute the position
          end
          result
        end

        # layout the slurs and ties
        @slur_index[:first_playable] = playables.first  # prepare default
        tie_start = playables.first                     # prepare default
        res_slurs = playables.inject([]) do |result, playable|
          # note that there is a semantic difference between tie and slur
          # so first we pick the ties

          if playable.tie_end?
            p1 = Vector2d(lookuptable_drawing_by_playable[tie_start].center) + [3, 0]
            p2 = Vector2d(lookuptable_drawing_by_playable[playable].center) + [3, 0]
            tiepath = make_slur_path(p1, p2)
            result.push(Harpnotes::Drawing::Path.new(tiepath))
            if playable.is_a? Harpnotes::Music::SynchPoint
              playable.notes.each_with_index do |n, index|
                begin
                  p1 = tie_start.notes[index]
                  p1 = Vector2d(lookuptable_drawing_by_playable[p1].center) + [3, 0]
                  p2 = Vector2d(lookuptable_drawing_by_playable[n].center) + [3, 0]
                  tiepath = make_slur_path(p1, p2)
                  result.push(Harpnotes::Drawing::Path.new(tiepath))
                rescue Exception => e
                  $log.error("tied chords which doesn't have same number of notes")
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

            p1 = Vector2d(lookuptable_drawing_by_playable[begin_slur].center) + [3, 0]
            p2 = Vector2d(lookuptable_drawing_by_playable[playable].center) + [3, 0]
            slurpath = make_slur_path(p1, p2)
            result.push(Harpnotes::Drawing::Path.new(slurpath))
          end

          result
        end

        # kill the flowlines if they shall not be shown
        res_flow = [] unless show_options[:flowline]

        # draw the jumplines
        res_gotos = voice.select { |c| c.is_a? Goto }.map do |goto|
          distance = goto.policy[:distance]
          $log.debug("vertical line x offset: #{distance} #{__FILE__}:#{__LINE__}")

          distance = distance - 1 if distance > 0 # make distancebeh  syymetric  -1 0 1
          if distance
           # vertical = {distance: (distance + 0.5) * X_SPACING}
            vertical = (distance + 0.5) * X_SPACING
          else
            vertical = 0.5 * X_SPACING # {level: goto.policy[:level]}
          end
          path = layout_jumpline(Vector2d(lookuptable_drawing_by_playable[goto.from].center),
                                 Vector2d(lookuptable_drawing_by_playable[goto.to].center),
                                 Vector2d(2.5, 2.5),
                                 vertical)
          Harpnotes::Drawing::Path.new(path, true, goto.from)
          #JumpLine.new(lookuptable_drawing_by_playable[goto.from], lookuptable_drawing_by_playable[goto.to], vertical)
        end
        res_gotos = [] unless show_options[:jumpline]


        ###
        # draw note bound annotations

        res_annotations = voice.select {|c| c.is_a? NoteBoundAnnotation}.map do |annotation|
          position = Vector2d(lookuptable_drawing_by_playable[annotation.companion].center) + annotation.position
          Harpnotes::Drawing::Annotation.new(position.to_a, annotation.text)
        end


        # return all drawing primitives
        retval = (res_flow + res_playables + res_gotos + res_measures + res_newparts + res_slurs + res_tuplets + res_annotations).compact
      end


      private


      # compress  beat layout of a music sheet
      #
      # This algorithm considers the number of notes and the particular size of the notes
      # when a beat (layout beat, not to mess up with song beat) has a note
      # the the
      #
      # returns a beat-map {beat => vertical_position_indicator}
      # vertical_position_indicator scales like beats but can be fractions
      # the need to be scaled to the aboslute position on the sheet later.
      # this scaling cannot be done here since it depends on the relative size
      # of the musig on the sheet.
      #
      # we need to increment the position by the (size[i] + size[i-1])/2
      #
      # @param music Harpnotes::Music::Document the document to optimize the beat layout
      #
      # @return [Hash] a beat map {10 => 5} beat 10 is placed at vertical position 5 (* beat_spacing)
      #
      def compute_beat_compression(music, layout_lines)
        max_beat = music.beat_maps.map { |map| map.keys.max }.max

        current_beat = 0
        last_size = (BEAT_RESOULUTION)

        relevant_beat_maps = layout_lines.inject([]) { |r, i| r.push(music.beat_maps[i]) }.compact

        Hash[(0..max_beat).map do |beat|
          notes_on_beat = relevant_beat_maps.map { |bm| bm[beat] }.flatten.compact ## select the voices for optimization
          max_duration = notes_on_beat.map { |n| n.duration }.max
          has_no_notes_on_beat = notes_on_beat.empty?
          is_new_part = notes_on_beat.select { |n| n.first_in_part? }

          unless has_no_notes_on_beat
            begin
              size = (BEAT_RESOULUTION) * DURATION_TO_STYLE[duration_to_id(max_duration)].first #todo:replace literal
            rescue Exception => e
              $log.error("unsupported duration: #{max_duration} on beat #{beat},  #{notes_on_beat.to_json}")
            end

            # we need to increment the position by the (size[i] + size[i-1])/2
            increment = (size + last_size)/2
            last_size = size

            # if a new part starts on this beat, make space for a full note
            increment += BEAT_RESOULUTION unless is_new_part.empty?
            current_beat += increment
          end
          [beat, current_beat]
        end]
      end

      #
      # layout the one Playable on the sheet
      #
      # @param root [Playable] the entity to be drawn on the sheet
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [type] [description]
      def layout_playable(root, beat_layout)
        if root.is_a? Note
          layout_note(root, beat_layout)
        elsif root.is_a? MeasureStart
          layout_measure_start(root, beat_layout)
        elsif root.is_a? SynchPoint
          layout_accord(root, beat_layout)
        elsif root.is_a? Pause
          layout_pause(root, beat_layout)
        elsif root.is_a? NewPart
          layout_newpart(root, beat_layout)
        else
          $log.error("Missing Music -> Sheet transform: #{root}")
        end
      end

      #
      # Place a Note on the sheet
      #
      # @param root [Note] The note
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [Object] The generated drawing primitive
      def layout_note(root, beat_layout)
        #               shift to left   pitch          space     stay away from border
        x_offset = (PITCH_OFFSET + root.pitch) * X_SPACING + X_OFFSET
        y_offset = beat_layout.call(root.beat)
        scale, fill, dotted = DURATION_TO_STYLE[duration_to_id(root.duration)]
        size = ELLIPSE_SIZE.map { |e| e * scale }

        res = Ellipse.new([x_offset, y_offset], size, fill, dotted, root)
        res
      end

      #
      # Place a SynchPoint on the Sheet
      # @param root [SynchPoint] The SynchPoint to be placed
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [Object] The generated drawing primitive
      def layout_accord(root, beat_layout)
        notes = root.notes.sort_by { |a| a.pitch }
        resnotes = notes.map { |c| layout_note(c, beat_layout) }
        res = []
        res << FlowLine.new(resnotes.first, resnotes.last, :dashed, root)
        res << resnotes
        res
      end

      #
      # Draw a Pause on the Sheet
      # @param root [Pause] The Pause to be drawn
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [Object] The generated drawing primitive
      def layout_pause(root, beat_layout)
        x_offset = (PITCH_OFFSET + root.pitch) * X_SPACING + X_OFFSET
        y_offset = beat_layout.call(root.beat)
        scale, glyph, dotted = REST_TO_GLYPH[duration_to_id(root.duration)]
        size = [REST_SIZE.first * scale.first, REST_SIZE.last * scale.last]

        res = Harpnotes::Drawing::Glyph.new([x_offset, y_offset], size, glyph, dotted, root)
        res.visible = false unless root.visible?
        res
      end

      def layout_measure_start(root, beat_layout)
        x_offset = (PITCH_OFFSET + root.pitch) * X_SPACING + X_OFFSET
        y_offset = beat_layout.call(root.beat)
        scale, fill, dotted = DURATION_TO_STYLE[duration_to_id(root.duration)]
        size = ELLIPSE_SIZE.map { |e| e * scale }
        res = Ellipse.new([x_offset, y_offset - size.last - 0.5], [size.first, 0.1], fill, false, root) # todo draw a line
        res.visible = false unless root.visible?
        res
      end

      #
      # @param [Vector2d] from
      # @param [Vector2d] to
      # @param [Numeric] policy horizontal of the jumpline related to startpoint
      # @param [Vector2d] north_east_offset - vector to determine the startpoint
      #
      # general appraoch
      # * music jumps from below start to above end
      # * arrow is on end part
      # * policy determines the vertical position of the jumpline
      # * the center of the vertical position determines start or ed (either west or east).
      # *
      def layout_jumpline(from, to, north_east_offset, policy)
        start_of_vertical = Vector2d(from.x + policy, from.y)
        end_of_vertical =   Vector2d(from.x + policy, to.y)

        start_orientation = Vector2d((((start_of_vertical - from) * [1, 0]).normalize).x, 0)
        end_orientation = Vector2d((((end_of_vertical - to) * [1, 0]).normalize).x, 0)

        start_offset = north_east_offset * [start_orientation.x, 1]
        end_offset = north_east_offset * [end_orientation.x, -1]

        start_of_vertical = start_of_vertical + start_offset * [0,1]
        end_of_vertical = end_of_vertical + end_offset * [0,1]

        start_of_jumpline = from + [start_offset.x * north_east_offset.x, +north_east_offset.y]
        end_of_jumpline = to + [end_offset.x * north_east_offset.x, -north_east_offset.y]

        p1 = from + start_offset
        p2 = start_of_vertical
        p3 = end_of_vertical
        p4 = to + end_offset
        a1 = p4 + end_orientation * 2.5 + [0,1]
        a2 = p4 + end_orientation * 2.5 - [0,1]
        a3 = p4

        # covert path to relative
        rp2 = p2 - p1
        rp3 = p3 - p2
        rp4 = p4 - p3
        ra1 = a1 - p4
        ra2 = a2 - a1
        ra3 = p4 - a2

        path = [["M", p1.x, p1.y],
                ['l', rp2.x, rp2.y],
                ['l', rp3.x, rp3.y],
                ['l', rp4.x, rp4.y],
                ['M', p4.x, p4.y],
                ['l', ra1.x, ra1.y],
                ['l', ra2.x, ra2.y],
                ['l', ra3.x, ra3.y],
                ['z']
        ]
        path
      end

      def layout_newpart(root, beat_layout)
        #               shift to left   pitch          space     stay away from border
        if root.beat
          # todo decide if part starts on a new line, then x_offset should be 0
          x_offset = (PITCH_OFFSET + root.pitch + (-0.5)) * X_SPACING + X_OFFSET # todo:remove literal here
          y_offset = beat_layout.call(root.beat()) -(24 * @beat_spacing) # todo:remove literal here
          res = Annotation.new([x_offset, y_offset], root.name, :regular, nil)
        else
          $log.warning("Part without content")
          res = nil
        end

        res
      end

      #
      # Convert a duration to a symbol todo: move DURATION_TO_STYLE in here
      #
      # @param duration [Integer] Duration as multiples of min note see DURATION_TO_STYLE
      #
      # @return [Object] The generated drawing primitive
      def duration_to_id(duration)
        result = "d#{duration}".to_sym
        if DURATION_TO_STYLE[result].nil?
          $log.error("unsupported duration #{result} replaced by error note")
          result = "err"
        end
        result
      end

      #
      # create a path to represent a slur from p1 to p2
      #
      # @param [Vector2d] the Start point of the slur
      # @param [Vector2d] the End point of the slur
      # @return [Array] to be passed to Path
      def make_slur_path(p1, p2)
        deltap = p2 - p1

        # distance = deltap.length
        cp_template = Vector2d(0.3 * deltap.length, 0).rotate(deltap.angle)
        cp1 = cp_template.rotate(-0.4)
        cp2 = deltap + cp_template.reverse.rotate(0.4)

        # todo make the drawing more fancy
        slurpath = [['M', p1.x, p1.y], ['c', cp1.x, cp1.y, cp2.x, cp2.y, deltap.x, deltap.y]]
      end

      #
      # create a path to represent a slur from p1 to p2
      #
      # @param [Array of Vector2d] the start and endpoint of the beziers pfad
      # @return [Array]  [Path, annotation-position]
      def make_annotated_bezier_path(points)
        p1 = points.first
        p2 = points.last
        deltap = p2 - p1

        # distance = deltap.length
        #cp_template = Vector2d(2 * deltap.length, 0).rotate(deltap.angle)
        cp_template = Vector2d(5, 0).rotate(deltap.angle)
        rotate_by = Math::PI/2
        cp1 = cp_template.rotate(-rotate_by)
        cp2 = deltap + cp_template.reverse.rotate(rotate_by)

        # compute the position of the annotation
        cpa1 = p1 + cp1
        cpa2 = p1 + cp2
        cpm1 = (p1 + cpa1)/2
        cpm2 = (p2 + cpa2)/2
        cpmm = (cpa1 + cpa2)/2
        cpmm1 = (cpm1 + cpmm)/2
        cpmm2 = (cpm2 + cpmm)/2
        annotation_anchor = (cpmm1 + cpmm2) / 2 + (cpmm1 - cpmm2).perpendicular.normalize * 2

        # todo make the drawing more fancy
        slurpath = [['M', p1.x, p1.y], ['c', cp1.x, cp1.y, cp2.x, cp2.y, deltap.x, deltap.y]]
        [slurpath, annotation_anchor]
      end

    end

  end


end
