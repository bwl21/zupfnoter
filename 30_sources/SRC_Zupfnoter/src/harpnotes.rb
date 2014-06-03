
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
  module Music

    # Marks classes in this model
    #
    class MusicEntity
      attr_accessor :origin
    end

    # Marks playable Music entities
    #
    # duration is represented reciproke value of duration: 1: whole; 2: half, 4:quarter
    # playable shall provide duration
    class Playable < MusicEntity
      attr_accessor :beat
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
    # note that we bacsically use an interval as
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
    # But they implicitly revoke accidents
    #
    class MeasureStart < MusicEntity
      attr_reader :companion

      #
      # Constructor
      # @param companion [Note] The first playable in the new measure
      #
      # @return [type] [description]
      def initialize(companion)
        raise "Companion must be playable" unless companion.is_a? Harpnotes::Music::Playable

        @companion = companion
      end

      def pitch
        @companion.pitch
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
      attr_reader :from, :to, :level

      #
      # construtor
      # @param from [Playable] the end point of jump (repeat from)
      # @param to [Playable] the Start point of jump (repeat to )
      # @param level [Integer] A nesting level, used to optimize the graphical representation.
      #
      def initialize(from, to, level)
        raise "End point of Jump (#{from.class}) must be a Playable" unless from.is_a? Harpnotes::Music::Playable
        raise "Start point of Jump (#{to.class}) must be a Playable" unless to.is_a? Harpnotes::Music::Playable

        @from = from
        @to = to
        @level = level
      end
    end



    #
    # This represents the actual song / music piece
    #
    class Song
      attr_reader :voices, :beat_maps

      #
      # Constructor
      # @param voices [Array of Array of MusicEntity] The voices in the song
      # @param note_length_in_beats [Integer] the shortest note todo: not used?
      #
      def initialize(voices = [], note_length_in_beats = 8)
        @voices = voices
        @note_length_in_beats = note_length_in_beats
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
      # @return [Array] The syncpoints which wer found in the song
      def build_synch_points
        expanded_beat_maps.map do |playables|
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
      # @return [Array of Hash] Array of beat maps corresponding ot array of voices
      def update_beats
        @beat_maps = @voices.map do |voice|
          current_beat = 0
          voice.select {|e| e.is_a? Playable }.inject({}) do |map, playable|
            beats = playable.duration
            map[current_beat] = playable
            playable.beat = current_beat

            current_beat += beats
            map
          end
        end
        @beat_maps
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
      attr_reader :from, :to, :level

      # @param from [Drawable] the origin of the flow
      # @param to   [Drawable] the target of the flow
      # @param level [Numeric] the indentation level of the line
      def initialize(from, to, level = 0)
        @from  = from
        @to    = to
        @level = level
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
    class Text < Drawable
      attr_reader :center, :text, :style

      # @param position Array the position of the text as [x, y]
      # @param text String the text itself
      # @param style Symbol the text style, can be :regular, :bold, :framed
      def initialize(center, text, style = :regular)
        @center = center
        @text = text
        @style = style
      end
    end

    class GlyphPause
      attr_reader :center, :origin

      def initialize(position, size)
        @center = position
        @size = size
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
      X_SPACING    = 115 / 10

      # Spacing between beats
      BEAT_SPACING = 4

      # Y coordinate of the very first beat
      Y_OFFSET  = BEAT_SPACING
      X_OFFSET  = ELLIPSE_SIZE.first

      # this is the negative of midi-pitch of the lowest playble note
      # see http://computermusicresource.com/midikeys.html
      PITCH_OFFSET = -43


      # This is a lookup table to map durations to graphical representation
      DURATION_TO_STYLE = {
          #key      size   fill          dot                  abc duration
          :d64 => [ 0.9,   :empty,       FALSE],    # 1      1
          :d48 => [ 0.7,   :empty,       TRUE],     # 1/2 *
          :d32 => [ 0.7,   :empty,       FALSE],    # 1/2
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


      #
      # get the vertical layout policy
      #
      # @param music Harpnotes::Music::Document the document to transform
      #
      # @return [Lambda] Proecdure, to compute the vertical distance of a particular beat
      def compute_beat_layout(music)
        Proc.new do |beat|
          (beat -1 ) * BEAT_SPACING + Y_OFFSET
        end
      end

      #
      # compute the layout of the Harnote sheet
      #
      # @param music Harpnotes::Music::Document the document to transform
      # @param beat_layout = nil [Lambda] Policy procedure to compute the vertical layout
      #
      # @return [Harpnotes::Drawing::Sheet] Sheet to be provided to the rendering engine
      def layout(music, beat_layout = nil)
        beat_layout = beat_layout || compute_beat_layout(music)

        beat_compression_map = compute_beat_compression(music)
        compressed_beat_layout = Proc.new {|beat| beat_layout.call(beat_compression_map[beat]) }

        sheet_elements  = music.voices.map {|v|
          layout_voice(v, compressed_beat_layout)
        }.flatten

        note_to_ellipse = Hash[sheet_elements.select {|e| e.is_a? Ellipse }.map {|e| [e.origin, e] }]

        synch_lines = music.build_synch_points.map do |sp|
          FlowLine.new(note_to_ellipse[sp.notes.first], note_to_ellipse[sp.notes.last], :dashed, sp)
        end
        sheet_elements = synch_lines + sheet_elements

        Harpnotes::Drawing::Sheet.new(sheet_elements)
      end

      #
      # compute the layout of a particular voice. It places flowlines playables and jumplines.
      # The vertical arrangement is goverend by the beat_layout, which actually maps the
      # beat in the timing domain to the beat in the sheet.
      #
      # @param voice [Array of MusicEntity] the Voice to be layouted
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [Array of Element] the list of elements to be drawn. It consists of flowlines, playbles and jumplines.
      #                            note that these shall be rendered in the given order.
      def layout_voice(voice, beat_layout)
        res_playables = voice.select {|c| c.is_a? Playable }.map do |playable|
          layout_playables(playable, beat_layout)
        end.flatten

        # this is a lookup-Table to navigate from the drawing primitive (ellipse) to the origin
        note_to_ellipse = Hash[res_playables.map {|e| [e.origin, e] }]
        res_playables.select {|e| e.is_a? FlowLine }.each {|f| note_to_ellipse[f.origin] = f.to }

        # draw the flowlines
        previous_note = nil
        res_flow = voice.select {|c| c.is_a? Note or c.is_a? SynchPoint }.map do |playable|
          res = nil
          res = FlowLine.new(note_to_ellipse[previous_note], note_to_ellipse[playable]) unless previous_note.nil?

          previous_note = playable
          res
        end.compact

        # draw the jumplines
        res_dacapo = voice.select {|c| c.is_a? Dacapo }.map do |dacapo|
          JumpLine.new(note_to_ellipse[dacapo.from], note_to_ellipse[dacapo.to], dacapo.level)
        end

        # return all drawing primitives
        res_flow + res_playables + res_dacapo
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
        Hash[(0..max_beat).map do |beat|
               notes_on_beat = music.beat_maps.map {|bm| bm[beat] }.flatten.compact
               max_duration = notes_on_beat.map{|n| n.duration}.max

               has_no_notes_on_beat = notes_on_beat.empty?
               current_beat += 1 unless has_no_notes_on_beat
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
        elsif root.is_a? SynchPoint
          layout_accord(root, beat_layout)
        elsif root.is_a? Pause
          layout_pause(root, beat_layout)
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
        res = notes.map{|c| layout_note(c, beat_layout) }
        res << FlowLine.new(res.first, res.last, :dashed, root)
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

        res = Ellipse.new([ x_offset, y_offset ], [1, 1], fill, dotted, root)
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
