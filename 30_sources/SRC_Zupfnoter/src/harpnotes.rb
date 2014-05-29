
module Harpnotes

  # The music model that is transformed (layouted) to something drawable

  #
  # [module description]
  #
  # @author [beweiche]
  #
  module Music

    # Marks classes in this model
    #
    # [class description]
    #
    # @author [beweiche]
    #
    class MusicEntity
      attr_accessor :origin
    end

    # Marks playable Music entities
    #
    # [class description]
    #
    # @author [beweiche]
    #
    class Playable < MusicEntity
      attr_accessor :beat
    end

    # A single note
    #
    # [class description]
    #
    # @author [beweiche]
    #
    class Note < Playable
      attr_reader :pitch, :duration

      #
      # [initialize description]
      # @param pitch [type] [description]
      # @param duration [type] [description]
      #
      # @return [type] [description]
      def initialize(pitch, duration)
        @pitch = pitch
        @duration = duration
      end

    end

    # An accord: multiple notes played at the same time
    class SynchPoint < Playable
      attr_reader :notes

      # @param notes Array the notes of comprising the coord.
      #
      # [initialize description]
      # @param notes [type] [description]
      #
      # @return [type] [description]
      def initialize(notes)
        raise "Notes must be an array" unless notes.is_a? Array

        @notes = notes
      end

      #
      # [duration description]
      #
      # @return [type] [description]
      def duration
        @notes.first.duration
      end

      #
      # [beat= description]
      # @param value [type] [description]
      #
      # @return [type] [description]
      def beat=(value)
        @beat = value
        @notes.each {|n| n.beat = value }
      end
    end

    # A pause in the song
    #
    # [class description]
    #
    # @author [beweiche]
    #
    class Pause < Playable
      attr_reader :duration

      #
      # [initialize description]
      # @param duration [type] [description]
      #
      # @return [type] [description]
      def initialize(duration)
        @duration = duration
      end
    end

    class MeasureStart < MusicEntity
      attr_reader :companion

      #
      # [initialize description]
      # @param companion [type] [description]
      #
      # @return [type] [description]
      def initialize(companion)
        raise "Companion must be playable" unless companion.is_a? Harpnotes::Music::Playable

        @companion = companion
      end
    end

    class Dacapo < MusicEntity
      attr_reader :from, :to, :level

      #
      # [initialize description]
      # @param from [type] [description]
      # @param to [type] [description]
      # @param level [type] [description]
      #
      # @return [type] [description]
      def initialize(from, to, level)
        raise "From must be a Playable" unless from.is_a? Harpnotes::Music::Playable
        raise "To must be a Playable" unless to.is_a? Harpnotes::Music::Playable

        @from = from
        @to = to
        @level = level
      end
    end

    class Song
      attr_reader :voices, :beat_maps

      #
      # [initialize description]
      # @param voices = [] [type] [description]
      # @param note_length_in_beats = 8 [type] [description]
      #
      # @return [type] [description]
      def initialize(voices = [], note_length_in_beats = 8)
        @voices = voices
        @note_length_in_beats = note_length_in_beats
        update_beats
      end

      #
      # [<< description]
      # @param voice [type] [description]
      #
      # @return [type] [description]
      def <<(voice)
        @voices << voice
        update_beats
      end

      #
      # [build_synch_points description]
      #
      # @return [type] [description]
      def build_synch_points
        max_beat = @beat_maps.map {|map| map.keys.max }.max
        (0..max_beat).map do |beat|
          playables = @beat_maps.map {|map| map[beat] }.compact
          if playables.length > 1
            SynchPoint.new(playables)
          end
        end.flatten.compact.select {|sp| sp.notes.reject {|e| e.is_a? Note }.empty? }
      end

      private

      #
      # [update_beats description]
      #
      # @return [type] [description]
      def update_beats
        @beat_maps = @voices.map do |voice|
          current_beat = 0
          voice.select {|e| e.is_a? Playable }.inject({}) do |map, playable|
            beats = ((1.0 / playable.duration) * @note_length_in_beats).round.to_i
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
    # [class description]
    #
    # @author [beweiche]
    #
    class Sheet
      attr_reader :children, :vertical_scale

      def initialize(children = [], vertical_scale = 1.0)
        @children = children
        @vertical_scale = vertical_scale
      end
    end

    #
    # [class description]
    #
    # @author [beweiche]
    #
    class FlowLine
      attr_reader :from, :to, :style, :origin

      # @param from Ellipse the origin of the flow
      # @param to   Ellipse the target of the flow
      # @param style Symbol either :dashed or :solid
      def initialize(from, to, style = :solid, origin = nil)
        @from   = from
        @to     = to
        @style  = style
        @origin = origin
      end

      def dashed?
        @style == :dashed
      end

    end

    #
    # [class description]
    #
    # @author [beweiche]
    #
    class JumpLine
      attr_reader :from, :to, :level

      # @param from Ellipse the origin of the flow
      # @param to   Ellipse the target of the flow
      # @param level Numeric the indentation level of the line
      def initialize(from, to, level = 0)
        @from  = from
        @to    = to
        @level = level
      end
    end

    #
    # [class description]
    #
    # @author [beweiche]
    #
    class Ellipse
      attr_reader :center, :size, :fill, :dotted, :origin

      # @param from Array the center of the ellipse as [x, y]
      # @param size Array the size of the ellipse as [width, height]
      # @param fill Symbol the fill style, either :filled or :empty
      # @param dotted TRUE if the ellipse has a small companion dot, FALSE otherwise
      # @param origin The source object of the original model
      def initialize(center, size, fill = :filled, dotted = TRUE, origin = nil)
        @center = center
        @size   = size
        @fill   = fill
        @dotted = dotted
        @origin = origin
      end

      def height
        @size.last
      end

      def dotted?
        dotted
      end

      def filled?
        @fill == :filled
      end

    end

    #
    # [class description]
    #
    # @author [beweiche]
    #
    class Text
      attr_reader :position, :text, :style

      # @param position Array the position of the text as [x, y]
      # @param text String the text itself
      # @param style Symbol the text style, can be :regular, :bold, :framed
      def initialize(position, text, style = :regular)
        @position = position
        @text = text
        @style = style
      end
    end

  end



  # The layout algorithms transforming a music model into a drawing model
  #
  # [module description]
  #
  # @author [beweiche]
  #
  module Layout
    include Harpnotes::Music
    include Harpnotes::Drawing

    #
    # [class description]
    #
    # @author [beweiche]
    #
    class Default
      # all numbers in mm
      ELLIPSE_SIZE = [ 3, 2 ]   # radii of the largest Ellipse

      # x-size of one step in a pitch. It is the horizontal
      # distance between two strings of the harp
      X_SPACING    = 139 / 12.0

      # Spacing between beats
      BEAT_SPACING = 4
      # Y coordinate of the very first beat
      BEAT_OFFSET  = 5

      # note names (currently not in use, left in for debug purposes)
      NOTE_X_OFFSETS = Hash[["",
                             "G", "G#", "A", "A#", "H",
                             "c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "h",
                             "c'", "c'#", "d'", "d'#", "e'", "f'", "f'#", "g'", "g'#", "a'", "a'#", "h'",
                             "c''", "c''#", "d''", "d'#", "e''", "f''", "f''#", "g''", "g''#", "a''", "a''#", "h''"
                             ].each_with_index.map { |value, index| [value, index] }]

      # This is a lookup table to map durations to graphical represenations
      DURATION_TO_STYLE = {
        #key      size   fill          dot
        :d1  => [ 1,     :empty,       FALSE],
        :d2  => [ 0.7,   :empty,       FALSE],
        :d3  => [ 0.7,   :empty,       TRUE],
        :d4  => [ 0.7,   :filled,      FALSE],
        :d6  => [ 0.7,   :filled,      TRUE],
        :d8  => [ 0.5,   :filled,      FALSE],
        :d12 => [ 0.5,   :filled,      TRUE],
        :d16 => [ 0.3,   :filled,      FALSE],
        :d24 => [ 0.3,   :filled,      TRUE],
        :d32 => [ 0.1,   :filled,      FALSE],
      }

      #
      # [compute_beat_layout description]
      # @param music [type] [description]
      #
      # @return [type] [description]
      def compute_beat_layout(music)
        Proc.new do |beat|
          beat * BEAT_SPACING + BEAT_OFFSET
        end
      end

      # @param music Harpnotes::Music::Document the document to transform
      #
      # [layout description]
      # @param music [type] [description]
      # @param beat_layout = nil [type] [description]
      #
      # @return [type] [description]
      def layout(music, beat_layout = nil)
        beat_layout = beat_layout || compute_beat_layout(music)

        beat_compression_map = compute_beat_compression(music)
        compressed_beat_layout = Proc.new {|beat| beat_layout.call(beat_compression_map[beat]) }

        sheet_elements  = music.voices.map {|v| layout_voice(v, compressed_beat_layout) }.flatten
        note_to_ellipse = Hash[sheet_elements.select {|e| e.is_a? Ellipse }.map {|e| [e.origin, e] }]
        synch_lines = music.build_synch_points.map do |sp|
          FlowLine.new(note_to_ellipse[sp.notes.first], note_to_ellipse[sp.notes.last], :dashed, sp)
        end
        sheet_elements = synch_lines + sheet_elements

        Harpnotes::Drawing::Sheet.new(sheet_elements)
      end

      #
      # [layout_voice description]
      # @param voice [type] [description]
      # @param beat_layout [type] [description]
      #
      # @return [type] [description]
      def layout_voice(voice, beat_layout)
        res_playables = voice.select {|c| c.is_a? Playable }.map do |playable|
          layout_playables(playable, beat_layout)
        end.flatten

        note_to_ellipse = Hash[res_playables.select {|e| e.is_a? Ellipse }.map {|e| [e.origin, e] }]
        res_playables.select {|e| e.is_a? FlowLine }.each {|f| note_to_ellipse[f.origin] = f.to }

        previous_note = nil
        res_flow = voice.select {|c| c.is_a? Note or c.is_a? SynchPoint }.map do |playable|
          res = nil
          res = FlowLine.new(note_to_ellipse[previous_note], note_to_ellipse[playable]) unless previous_note.nil?

          previous_note = playable
          res
        end.compact

        res_dacapo = voice.select {|c| c.is_a? Dacapo }.map do |dacapo|
          JumpLine.new(note_to_ellipse[dacapo.from], note_to_ellipse[dacapo.to], dacapo.level)
        end

        res_flow + res_playables + res_dacapo
      end


      private

      def compute_beat_compression(music)
        max_beat = music.beat_maps.map {|map| map.keys.max }.max

        current_beat = 0
        Hash[(0..max_beat).map do |beat|
          has_no_notes_on_beat = music.beat_maps.map {|bm| bm[beat] }.flatten.compact.empty?
          current_beat += 1 unless has_no_notes_on_beat
          [ beat, current_beat ]
        end]
      end

      #
      # [layout_playables description]
      # @param root [type] [description]
      # @param beat_layout Lambda [description]
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
      # [layout_note description]
      # @param root [type] [description]
      # @param beat_layout [lambda] procedure to compute the y_offset of a given beat
      #
      # @return [type] [description]
      def layout_note(root, beat_layout)
        x_offset     = root.pitch * X_SPACING
        y_offset     = beat_layout.call(root.beat)
        scale, fill, dotted = DURATION_TO_STYLE[duration_to_id(root.duration)]
        size         = ELLIPSE_SIZE.map {|e| e * scale }

        res = Ellipse.new([ x_offset, y_offset ], size, fill, dotted, root)
        res
      end

      #
      # [layout_accord description]
      # @param root [type] [description]
      # @param beat_layout [type] [description]
      #
      # @return [type] [description]
      def layout_accord(root, beat_layout)
        res = root.notes.map([]) {|c| layout_note(c, beat_layout) }[0..1]
        res << FlowLine.new(res.first, res.last, :dashed, root)
        res
      end

      #
      # [layout_pause description]
      # @param root [type] [description]
      # @param y_offset [type] [description]
      #
      # @return [type] [description]
      def layout_pause(root, y_offset)
        scale, fill, dotted = DURATION_TO_STYLE[duration_to_id(root.duration)]
        []
      end


      #
      # [duration_to_id description]
      # @param duration [type] [description]
      #
      # @return [type] [description]
      def duration_to_id(duration)
        "d#{duration}".to_sym
      end

    end

  end


end
