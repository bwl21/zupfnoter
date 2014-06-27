
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
      attr_accessor :origin, :beat
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
    # duration is represented reciproke value of duration: 1: whole; 2: half, 4:quarter
    # playable shall provide duration
    class Playable < MusicEntity
      attr_accessor :first_in_part

      def first_in_part?
        first_in_part
      end
    end

    # A single note
    #
    class Note < Playable
      attr_reader :pitch, :duration

      #
      # Constructor

      # @param pitch [Interger] A designator of the note (http://computermusicresource.com/midikeys.html)
      # @param duration [Integer] see Playable
      #
      # @return [type] [description]
      #
      def initialize(pitch, duration)
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
        @notes.each {|n| n.beat = value }
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
        @pitch = pitch
        @duration = duration
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
        self.companion = companion
      end
    end

    #
    # this represents the beginning of a new part
    #
    class NewPart < NonPlayable
      attr_reader :name
      def initialize(title)
        @name = title
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
    class Dacapo < MusicEntity
      attr_reader :from, :to, :policy

      #
      # construtor
      # @param from [Playable] the end point of jump (repeat from)
      # @param to [Playable] the Start point of jump (repeat to )
      # @param policy [Hash] {level:, distance:} A policy, used to optimize the graphical representation.
      #
      def initialize(from, to, policy)
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
        expanded_beat_maps.map do |playables|
          playables = [playables[selector.first], playables[selector.last]] if selector
          playables.compact!
          SynchPoint.new(playables) if playables.length > 1
        end.flatten.compact.select {|sp| sp.notes.reject {|e| e.is_a? Note }.empty? }
      end

      #
      # Computes the last beat in this song
      #
      # @return Numeric the last beat of this song
      def last_beat
        max_beat = @beat_maps.map {|map| map.keys.max }.max
      end

      #
      # Computes an expanded beat_map with an element for each beat.
      #
      # @return [Array] an array of playables. The index is the beat. Playables are ordered by the song voice order.
      def expanded_beat_maps
        (0..last_beat).map do |beat|
          @beat_maps.map {|map| map[beat] }
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
        @beat_maps = @voices.map do |voice|
          current_beat = 0
          voice_map = voice.select {|e| e.is_a? Playable }.inject(BeatMap.new(voice.index)) do |map, playable|
            beats = playable.duration
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
    # as it is derived from an array, it can represent voices in ABCas well as in Harpnote domain

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

    #
    # This represents a flowline
    #
    class FlowLine
      attr_reader :from, :to, :style, :origin

      # @param from [Drawable] the origin of the flow
      # @param to   [Drawable] the target of the flow
      # @param style [Symbol] either :dashed or :solid
      # @param origin [Object] An object to support bactrace, drill down etc.
      #
      # @return [type] [description]
      def initialize(from, to, style = :solid, origin = nil)
        @from   = from
        @to     = to
        @style  = style
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

    #
    # This represents a JumpLine
    #
    class JumpLine
      attr_reader :from, :to

      # @param from [Drawable] the origin of the flow
      # @param to   [Drawable] the target of the flow
      # @param policy [Hash] the policy for vertical line
      def initialize(from, to, policy  = {level: 0 })
        @from  = from
        @to    = to
        @policy = policy
      end

      def level
        @policy[:level] || 0
      end

      def distance
        @policy[:distance]
      end
    end

    class Drawable
      def center
        raise "Not implemented"
      end
    end

    class Glyph < Drawable
      attr_reader :center, :name

      def initialize(center, name)
        @center = center
        @name = name
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
        @center = center
        @size   = size
        @fill   = fill
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
        @center = center
        @text = text
        @style = style
        @origin = origin
      end
    end

    #
    # This represents a Rest
    #
    class Rest < Drawable
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
        @center = center
        @size   = size
        @fill   = fill
        @dotted = dotted
        @origin = origin
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
      # @return [Boolean] TRUE if ther shall be filled
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
      ELLIPSE_SIZE = [ 2.8, 1.7 ]   # radii of the largest Ellipse

      # x-size of one step in a pitch. It is the horizontal
      # distance between two strings of the harp
      X_SPACING    = 115.0 / 10.0

      # Y coordinate of the very first beat
      Y_OFFSET  = 5
      X_OFFSET  = ELLIPSE_SIZE.first

      # this is the negative of midi-pitch of the lowest playble note
      # see http://computermusicresource.com/midikeys.html
      PITCH_OFFSET = -43


      # This is a lookup table to map durations to graphical representation
      DURATION_TO_STYLE = {
        #key      size   fill          dot                  abc duration
        :d64 => [ 0.9,   :empty,       FALSE],    # 1      1
        :d48 => [ 0.5,   :empty,       TRUE],     # 1/2 *
        :d32 => [ 0.5,   :empty,       FALSE],    # 1/2
        :d24 => [ 0.7,   :filled,      TRUE],     # 1/4 *
        :d16 => [ 0.7,   :filled,      FALSE],    # 1/4
        :d12 => [ 0.5,   :filled,      TRUE],     # 1/8 *
        :d8  => [ 0.5,   :filled,      FALSE],    # 1/8
        :d6  => [ 0.3,   :filled,      TRUE],     # 1/16 *
        :d4  => [ 0.3,   :filled,      FALSE],    # 1/16
        :d3  => [ 0.1,   :filled,      TRUE],     # 1/32 *
        :d2  => [ 0.1,   :filled,      FALSE],    # 1/32
        :d1  => [ 0.05,  :filled,      FALSE],    # 1/64
      }

      def initialize
        # Spacing between beats
        @beat_spacing = 4 * 1.0/64.0 * 1
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
          (beat -1 ) * @beat_spacing + Y_OFFSET
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
      def layout(music, beat_layout = nil, print_variant = 0)

        print_options = music.harpnote_options[:print][print_variant]

        # first optimize the vertical arrangement of the notes
        # by analyzing the beat layout
        beat_layout = beat_layout || beat_layout_policy(music)

        beat_compression_map = compute_beat_compression(music)
        maximal_beat = beat_compression_map.values.max
        full_beat_spacing = 285 / maximal_beat

        if full_beat_spacing < @beat_spacing
          factor = (@beat_spacing / full_beat_spacing).round(2)
          $log.warning("note distance too small (factor #{factor})")
        end
        @beat_spacing = full_beat_spacing

        compressed_beat_layout = Proc.new {|beat| beat_layout.call(beat_compression_map[beat]) }

        # sheet_elements derived from the voices
        sheet_elements  = music.voices.each_with_index.map {|v, index|
          if print_options[:voices].include?(index)
            layout_voice(v, compressed_beat_layout,
                         flowline: print_options[:flowlines].include?(index),
                         jumpline: print_options[:jumplines].include?(index))
          end
        }.flatten

        # this is a lookup table to find the drawing symbol by a note
        note_to_ellipse = Hash[sheet_elements.select {|e| e.is_a? Ellipse }.map {|e| [e.origin, e] }]

        # configure which synclines are required from-voice to-voice
        # also filter such synchlines which have points in the displayed voices
        required_synchlines = print_options[:synchlines].select{|sl|
          print_options[:voices].include?(sl.first) && print_options[:voices].include?(sl.last)
        }

        # build synchlines
        synch_lines = required_synchlines.map do |selector|
          synch_points_to_show = music.build_synch_points(selector)
          synch_points_to_show.map do |sp|
            FlowLine.new(note_to_ellipse[sp.notes.first], note_to_ellipse[sp.notes[1]], :dashed, sp)
          end
        end.flatten


        # now generate sheet_marks
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

        title_pos  = [20, 20]
        legend_pos = [20, 30]

        title    = music.meta_data[:title] || "untitled"
        meter    = music.meta_data[:meter]
        key      = music.meta_data[:key]
        composer = music.meta_data[:composer]
        tempo    = music.meta_data[:tempo_display]
        print_variant = print_options[:title]
        legend = "#{print_variant}\n#{composer}\nTakt: #{meter}\ Tonart: #{key}"
        annotations << Harpnotes::Drawing::Annotation.new(title_pos, title, :large)
        annotations << Harpnotes::Drawing::Annotation.new(legend_pos, legend, :regular)


        sheet_elements = synch_lines + sheet_elements + sheet_marks + annotations

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
      # @return [Array of Element] the list of elements to be drawn. It consists of flowlines, playbles and jumplines.
      #                            note that these shall be rendered in the given order.
      def layout_voice(voice, beat_layout, show_options)

        # draw the playables
        res_playables = voice.select {|c| c.is_a? Playable }.map do |playable|
          layout_playables(playable, beat_layout)
        end.flatten

        # layout the measures

        res_measures = voice.select{|c| c.is_a? MeasureStart}.map do |measure|
          layout_playables(measure, beat_layout)
        end

        res_newparts = voice.select{|c| c.is_a? NewPart}.map do |newpart|
          layout_newpart(newpart, beat_layout)
        end

        # this is a lookup-Table to navigate from the drawing primitive (ellipse) to the origin
        note_to_ellipse = Hash[res_playables.map {|e| [e.origin, e] }]
        res_playables.select {|e| e.is_a? FlowLine }.each {|f| note_to_ellipse[f.origin] = f.to }

        # draw the flowlines
        previous_note = nil
        res_flow = voice.select {|c| c.is_a? Playable or c.is_a? SynchPoint }.map do |playable|
          res = nil
          res = FlowLine.new(note_to_ellipse[previous_note], note_to_ellipse[playable]) unless previous_note.nil?
          res = nil if playable.first_in_part?

          previous_note = playable
          res
        end.compact

        # kill the flowlines if they shall not be shown
        res_flow = [] unless show_options[:flowline]

        # draw the jumplines
        res_dacapo = voice.select {|c| c.is_a? Dacapo }.map do |dacapo|
          if distance = dacapo.policy[:distance]
            vertical = {distance: (distance + 0.5) * X_SPACING}
          else
            vertical = {level: dacapo.policy[:level]}
          end
          JumpLine.new(note_to_ellipse[dacapo.from], note_to_ellipse[dacapo.to], vertical)
        end

        # kill the jumplines if they shallnot be shown
        res_dacapo = [] unless show_options[:jumpline]

        # return all drawing primitives
        res_flow + res_playables + res_dacapo + res_measures + res_newparts
      end


      private


      # compress  beat layout of a music sheet
      # @param music Harpnotes::Music::Document the document to optimize the beat layout
      #
      # @return [Hash] a beat map {10 => 5} beat 10 is placed at vertical position 5
      #
      def compute_beat_compression(music)
        max_beat = music.beat_maps.map {|map| map.keys.max }.max

        current_beat = 0
        last_size = 32  #todo:replace literal
        Hash[(0..max_beat).map do |beat|
               notes_on_beat = music.beat_maps.map {|bm| bm[beat] }.flatten.compact
               max_duration = notes_on_beat.map{|n| n.duration}.max
               has_no_notes_on_beat = notes_on_beat.empty?
               is_new_part = notes_on_beat.select{|n| n.first_in_part? }

               unless has_no_notes_on_beat
                 begin
                   size = 32 * DURATION_TO_STYLE[duration_to_id(max_duration)].first  #todo:replace literal
                 rescue Exception => e
                   $log.error("unsupported duration: #{max_duration} on beat #{beat},  #{notes_on_beat.to_json}")
                 end
                 increment = (size + last_size)
                 last_size = size

                 # if a new part starts on this beat, make space for a full note
                 increment = [64, increment].max unless is_new_part.empty? #todo: replace literal
                 current_beat += increment
               end
               [ beat, current_beat ]
        end]
      end

      #
      # layout the one Playable on the sheet
      #
      # @param root [Playable] the entity to be drawn on the sheet
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [type] [description]
      def layout_playables(root, beat_layout)
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
          `console.log("Missing Music -> Sheet transform: " + root)`
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
        x_offset     = (PITCH_OFFSET + root.pitch) * X_SPACING + X_OFFSET
        y_offset     = beat_layout.call(root.beat)
        scale, fill, dotted = DURATION_TO_STYLE[duration_to_id(root.duration)]
        size         = ELLIPSE_SIZE.map {|e| e * scale }

        res = Ellipse.new([ x_offset, y_offset ], size, fill, dotted, root)
        res
      end

      #
      # Place a SynchPoint on the Sheet
      # @param root [SynchPoint] The SynchPoint to be placed
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [Object] The generated drawing primitive
      def layout_accord(root, beat_layout)
        notes = root.notes.sort_by{|a|a.pitch}
        resnotes = notes.map{|c| layout_note(c, beat_layout) }
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
        x_offset     = (PITCH_OFFSET + root.pitch) * X_SPACING + X_OFFSET
        y_offset     = beat_layout.call(root.beat)
        scale, fill, dotted = DURATION_TO_STYLE[duration_to_id(root.duration)]
        size         = ELLIPSE_SIZE.map {|e| e * scale }

        res = Harpnotes::Drawing::Rest.new([ x_offset, y_offset ], size, fill, dotted, root)
        res
      end


      def layout_measure_start(root, beat_layout)
        x_offset     = (PITCH_OFFSET + root.pitch) * X_SPACING + X_OFFSET
        y_offset     = beat_layout.call(root.beat)
        scale, fill, dotted = DURATION_TO_STYLE[duration_to_id(root.duration)]
        size         = ELLIPSE_SIZE.map {|e| e * scale }
        res = Ellipse.new([ x_offset, y_offset - size.last - 0.5 ], [size.first, 0.0], fill, false, root)
      end


      def layout_newpart(root, beat_layout)
        #               shift to left   pitch          space     stay away from border
        if root.beat
          # todo decide if part starts on a new line, then x_offset should be 0
          x_offset     = (PITCH_OFFSET + root.pitch + (-0.5)) * X_SPACING + X_OFFSET  # todo:remove literal here
          y_offset     = beat_layout.call(root.beat()) -(24 * @beat_spacing) # todo:remove literal here
          res = Annotation.new([ x_offset, y_offset ], root.name, :regular, nil)
        else
          $log.warn("Part without content")
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
        "d#{duration}".to_sym
      end

    end

  end


end
