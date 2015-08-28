require "native"

module Harpnotes
  # the input faciities, basically the ABCinput stuff.

  module Input

    class Abc2svgToHarpnotes < AbstractAbcToHarpnotes

      ABC2SVG_DURATION_FACTOR = 1536


      def initialize
        super
        @abc_code          = nil
        @previous_new_part = []

        # this is local state memory

        @tie_started       = false
        @slurstack         = 0
        @tuplet_count      = 1
        @tuplet_down_count = 1

        @next_note_marks = {}

        @repetition_stack = []
      end

      # @param [String] zupfnoter_abc to be transformed
      #
      # @return [Harpnotes::Music::Song] the Song
      def transform(zupfnoter_abc)
        @abc_code   = zupfnoter_abc
        transformer = ABC2SVG::Abc2Svg.new(nil, { mode: :model }) # first argument is the container for SVG
        @abc_model  = transformer.get_abcmodel(zupfnoter_abc)

        result = _transform_voices

        result.meta_data         = {}
        result.meta_data[:tempo] = { duration: [0.25], bpm: 120 }
        result.harpnote_options  = { lyrics: {} }

        result
      end

      private


      def _transform_voices
        hn_voices = @abc_model[:voices].map do |voice_model|

          @pitch_providers = voice_model[:symbols].map do |voice_model_element|
            nil
            voice_model_element if voice_model_element[:type] == 8 #todo remove literal
          end

          result = voice_model[:symbols].each_with_index.map do |voice_model_element, index|
            type = @abc_model[:music_types][voice_model_element[:type]]
            begin
              result = self.send("_transform_#{type}", voice_model_element, index)
            rescue Exception => e
              $log.error("BUG: #{e}", charpos_to_line_column(voice_model_element[:istart]))
              nil
            end
            result
          end

          result.flatten.compact
        end

        hn_voices.unshift(hn_voices.first) # let voice-index start with 1 -> duplicate voice 0
        Harpnotes::Music::Song.new(hn_voices)
      end

      def _transform_bar(voice_element)
        bar_types = {
            '|'  => 'thin',
            '['  => 'variant_ending',
            '|:' => 'repeat_start',
            ':|' => 'repeat_end',
            '::' => 'repeat_end_start',
            '|]' => 'big_bar'
        }

        result = []
        type   = voice_element[:bar_type]

        @next_note_marks[:measure]        = true
        @next_note_marks[:variant_ending] = voice_element[:text]
        @next_note_marks[:repeat_start]   = true if ['|:', '::'].include?(type)

        result << _transform_bar_repeat_end(voice_element) if [':|', '::'].include?(type)
      end

      def _transform_note(voice_element)

        origin                           = _parse_origin(voice_element)
        start_pos, end_pos               = origin[:startChar], origin[:endChar]


        #handle tuplets
        tuplet, tuplet_end, tuplet_start = _parse_tuplet_info(voice_element)


        # transform the individual notes
        notes                            = voice_element[:notes].map do |the_note|
          duration = ((the_note[:dur]/ABC2SVG_DURATION_FACTOR) * $conf.get('layout.SHORTEST_NOTE')).round

          result           = Harpnotes::Music::Note.new(the_note[:midi], duration)
          result.origin    = origin
          result.start_pos = charpos_to_line_column(start_pos) # get column und line number of abc_code
          result.end_pos   = charpos_to_line_column(end_pos)

          result.tuplet       = tuplet
          result.tuplet_start = tuplet_start
          result.tuplet_end   = tuplet_end

          result
        end

        # support the case of repetitions from the very beginning

        if @repetition_stack.empty?
          @repetition_stack << notes.last
        end

        # handle duration and orign
        result                           = Harpnotes::Music::SynchPoint.new(notes)
        result.duration                  = notes.first.duration
        result.origin                    = origin

        # handle ties
        # note that abc2svg only indicates tie start by  voice_element[:ti1] but has no tie end
        result.tie_end                   = @tie_started
        @tie_started                     = !voice_element[:ti1].nil?
        result.tie_start                 = @tie_started

        # handle slurs
        result.slur_starts               = _parse_slur(voice_element[:slur_start]).map { |i| _push_slur() }
        amount_of_slur_ends              = (voice_element[:slur_end] or 0)
        result.slur_ends                 = (1 .. amount_of_slur_ends).map { _pop_slur } # pop_slur delivers an id.


        #handle tuplets of synchpoint
        result.tuplet                    = tuplet
        result.tuplet_start              = tuplet_start
        result.tuplet_end                = tuplet_end

        result = [result]

        @previous_note = notes.first # save this for repeat lines etc.

        if @next_note_marks[:measure]
          notes.each { |note| result << Harpnotes::Music::MeasureStart.new(note) }
          @next_note_marks[:measure] = false
        end

        if @next_note_marks[:repeat_start]
          @repetition_stack << notes.first
          @next_note_marks[:repeat_start] = false
        end

        if @next_note_marks[:variant_ending]
          result << Harpnotes::Music::NoteBoundAnnotation.new(notes.first, { pos: [4, -2], text: @next_note_marks[:variant_ending] })
          @next_note_marks[:variant_ending] = nil
        end

        result
      end

      def _transform_rest(voice_element, index)

        pitch_note = (@pitch_providers[index .. -1].compact.first or @pitch_providers[0..index-1].compact.last)
        if pitch_note
          pitch = pitch_note[:notes].first[:midi]
        else
          pitch = 60
        end

        the_note                         = voice_element[:notes].first
        duration                         = ((the_note[:dur]/ABC2SVG_DURATION_FACTOR) * $conf.get('layout.SHORTEST_NOTE')).round
        tuplet, tuplet_end, tuplet_start = _parse_tuplet_info(voice_element)

        result              = Harpnotes::Music::Pause.new(pitch, duration)
        result.origin       = _parse_origin(voice_element)

        #handle tuplets of synchpoint
        result.tuplet       = tuplet
        result.tuplet_start = tuplet_start
        result.tuplet_end   = tuplet_end


        # support the case of repetitions from the very beginning

        if @repetition_stack.empty?
          @repetition_stack << result
        end

        @previous_note = result # save this for repeat lines etc.

        result = [result]

        if @next_note_marks[:measure]
          result << Harpnotes::Music::MeasureStart.new(result.first)
          @next_note_marks[:measure] = false
        end

        if @next_note_marks[:repeat_start]
          @repetition_stack << result.first
          @next_note_marks[:repeat_start] = false
        end

        if @next_note_marks[:variant_ending]
          result << Harpnotes::Music::NoteBoundAnnotation.new(result.first, { pos: [4, -2], text: @next_note_marks[:variant_ending] })
          @next_note_marks[:variant_ending] = nil
        end

        result
      end


      def _transform_bar_repeat_end(bar)
        if @repetition_stack.length == 1
          start = @repetition_stack.last
        else
          start = @repetition_stack.pop
        end

        distance = 2
        _parse_chordlines(bar).each do |line|
          level = line.split('@')
          if level[2]
            level = level[2] # note that "^@@distance"
            $log.debug("bar repeat level #{level} #{__FILE__}:#{__LINE__}")
            distance = level.to_i unless level.nil?
          end
        end

        [Harpnotes::Music::Goto.new(@previous_note, start, distance: distance)]
      end

      def _transform_format(voice_element)
        nil
      end


      def _push_slur
        @slurstack += 1
      end

      def _pop_slur
        result     = @slurstack
        @slurstack -= 1
        @slurstack = 0 if @slurstack < 0
        result
      end

      def _parse_chordlines(voice_element)
        chords = voice_element[:a_gch]
        if chords
          result = chords.select { |e| e[:type] = '^' }.map { |e| e[:text] }
        else
          result = []
        end

        result
      end

      def _parse_origin(voice_element)
        { startChar: voice_element[:istart], endChar: voice_element[:iend] }
      end

      # this parses the slur information from abc2svg
      # every slur has 4 bits
      # so the slurs are parsed by shifting by 4 and masking 4 bits
      def _parse_slur(slurstart)
        startvalue = slurstart
        result     = []
        while startvalue > 0 do
          result.push startvalue & 0xf
          startvalue >>= 4
        end
        result
      end

      # this parses the tuplet_information out of the voice_elmenet
      def _parse_tuplet_info(voice_element)
        if voice_element[:in_tuplet]

          if voice_element[:extra] and voice_element[:extra][:"15"]
            @tuplet_count      = (voice_element[:extra][:"15"][:tuplet_p])
            @tuplet_down_count = @tuplet_count
            tuplet_start       = true
          else
            tuplet_start = nil
          end

          tuplet = @tuplet_count

          if @tuplet_down_count == 1
            @tuplet_count = 1
            tuplet_end    = true
          else
            @tuplet_down_count -= 1
            tuplet_end         = nil
          end
        else
          tuplet       = 1
          tuplet_start = nil
          tuplet_end   = nil
        end
        return tuplet, tuplet_end, tuplet_start
      end


    end
  end

end
