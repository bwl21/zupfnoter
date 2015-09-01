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

        @part_table = {}

        _reset_state
      end

      # @param [String] zupfnoter_abc to be transformed
      #
      # @return [Harpnotes::Music::Song] the Song
      def transform(zupfnoter_abc)
        @abc_code    = zupfnoter_abc
        @annotations = $conf.get("annotations")

        abc_parser = ABC2SVG::Abc2Svg.new(nil, { mode: :model }) # first argument is the container for SVG
        @abc_model = abc_parser.get_abcmodel(zupfnoter_abc)

        result = _transform_voices

        result.meta_data         = {}
        result.meta_data[:tempo] = { duration: [0.25], bpm: 120 }
        result.harpnote_options  = { lyrics: {} }

        result
      end

      private


      # This resets the converter
      # to be called when beginning a new voice
      def _reset_state

        @jumptargets = {} # the lookup table for jumps

        @next_note_marks   = { measure:        false,
                               repeat_start:   false,
                               variant_ending: nil }
        @previous_new_part = []
        @previous_note     = nil
        @repetition_stack  = []

        @tie_started       = false
        @slurstack         = 0
        @tuplet_count      = 1
        @tuplet_down_count = 1

        nil
      end


      def _transform_voices


        _extract_part_table

        hn_voices = @abc_model[:voices].map do |voice_model|

          _reset_state
          @pitch_providers = voice_model[:symbols].map do |voice_model_element|
            nil
            voice_model_element if voice_model_element[:type] == 8 #todo remove literal
          end

          result                = voice_model[:symbols].each_with_index.map do |voice_model_element, index|
            type = @abc_model[:music_types][voice_model_element[:type]]
            begin
              result = self.send("_transform_#{type}", voice_model_element, index)
            rescue Exception => e
              $log.error("BUG: #{e}", charpos_to_line_column(voice_model_element[:istart]))
              nil
            end
            result
          end

          # handle the jumplines
          result                = result.flatten
          jumplines             = result.inject([]) do |jumplines, element|
            jumplines << _make_jumplines(element)
            jumplines
          end

          #handle notebound annotations

          notebound_annotations = result.inject([]) do |notebound_annotations, element|
            notebound_annotations << _make_notebound_annotations(element)
          end

          result += (jumplines + notebound_annotations)


          result.flatten.compact
        end

        hn_voices.unshift(hn_voices.first) # let voice-index start with 1 -> duplicate voice 0
        Harpnotes::Music::Song.new(hn_voices)
      end

      def _extract_part_table
        @abc_model[:voices].first[:symbols].each do |voice_model_element|
          part                                         = ((voice_model_element[:extra] or {})['9'] or {})[:text]
          @part_table[voice_model_element[:time].to_s] = part if part
        end
      end

      def _transform_bar(voice_element)
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

        # the postprocessing
        # support the case of repetitions from the very beginning

        if @repetition_stack.empty?
          @repetition_stack << notes.last
        end

        # handle duration and orign
        result              = Harpnotes::Music::SynchPoint.new(notes)
        first_note          = notes.first
        result.duration     = first_note.duration
        result.origin       = first_note.origin
        result.start_pos    = first_note.start_pos
        result.end_pos      = first_note.end_pos

        # handle ties
        # note that abc2svg only indicates tie start by  voice_element[:ti1] but has no tie end
        result.tie_end      = @tie_started
        @tie_started        = !voice_element[:ti1].nil?
        result.tie_start    = @tie_started


        #handle tuplets of synchpoint
        result.tuplet       = first_note.tuplet
        result.tuplet_start = first_note.tuplet_start
        result.tuplet_end   = first_note.tuplet_end


        # handle slurs
        # note that rests do not have slurs in practise
        result.slur_starts  = _parse_slur(voice_element[:slur_start]).map { |i| _push_slur() }
        amount_of_slur_ends = (voice_element[:slur_end] or 0)
        result.slur_ends    = (1 .. amount_of_slur_ends).map { _pop_slur } # pop_slur delivers an id.


        result = [result] # make it an array such that we can append further elements

        if @next_note_marks[:measure]
          notes.each { |note| result << Harpnotes::Music::MeasureStart.new(note) }
          @next_note_marks[:measure] = false
        end

        _make_repeats_jumps_annotations(result, voice_element)

        result
      end


      # @param [Integer] index  - this is required to determine the pitch of the rest
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


        # the post processing

        # support the case of repetitions from the very beginning

        if @repetition_stack.empty?
          @repetition_stack << result
        end

        result = [result]

        if @next_note_marks[:measure]
          result << Harpnotes::Music::MeasureStart.new(result.first)
          @next_note_marks[:measure] = false
        end


        _make_repeats_jumps_annotations(result, voice_element)

        result
      end


      def _transform_bar_repeat_end(bar)
        if @repetition_stack.length == 1
          start = @repetition_stack.last
        else
          start = @repetition_stack.pop
        end

        distance = 2
        _extract_chord_lines(bar).each do |line|
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

      # make the jumplilnes
      # @param [Playable] element - an element of the converted voice
      def _make_jumplines(element)
        if element.is_a?(Harpnotes::Music::Playable)
          chords = _extract_chord_lines(element.origin[:raw])
          chords.select { |c| c[0] == '@' }.inject([]) do |result, chord|
            nameparts = chord.split('@')

            targetname = nameparts[1]
            target     = @jumptargets[targetname]

            argument = nameparts[2] || 1
            argument = argument.to_i
            if target.nil?
              $log.error("target '#{targetname}' not found in voice at #{element.start_pos_to_s}", element.start_pos, element.end_pos)
            else
              result << Harpnotes::Music::Goto.new(element, target, distance: argument) #todo: better algorithm
            end

            result
          end
        else
          nil
        end
      end

      def _make_notebound_annotations(entity)
        result = []
        if entity.is_a? Harpnotes::Music::Playable
          chords =_extract_chord_lines(entity.origin[:raw])
          chords.each do |name|

            match = name.match(/^([!#])([^\@]+)(\@(\-?[0-9\.]+),(\-?[0-9\.]+))?$/)
            if match
              semantic = match[1]
              text     = match[2]
              pos_x    = match[4] if match[4]
              pos_y    = match[5] if match[5]
              case semantic
                when "#"
                  annotation = @annotations[text]
                  $log.error("could not find annotation #{text}", entity.start_pos, entity.end_pos) unless annotation
                when "!"
                  annotation = { text: text }
                else
                  annotation = nil # it is not an annotation
              end

              if annotation
                notepos  = [pos_x, pos_y].map { |p| p.to_f } if pos_x
                position = notepos || annotation[:pos] || [2, -5] #todo: make default position configurable
                result << Harpnotes::Music::NoteBoundAnnotation.new(entity, { pos: position, text: annotation[:text] })
              end
            else
              # $log.error("syntax error in annotation: #{name}")
            end
          end
        end
        result
      end

      # this appends repeates, jumplines, annotations to the resultl
      def _make_repeats_jumps_annotations(result, voice_element)
        @previous_note = result.first # notes.first # save this for repeat lines etc.


        if part_label = @part_table[voice_element[:time].to_s]
          part                       = Harpnotes::Music::NewPart.new(part_label)
          part.origin                = _parse_origin(voice_element)
          part.companion             = result.first
          result.first.first_in_part = true
          result << part
        end

        if @next_note_marks[:repeat_start]
          @repetition_stack << result.first
          @next_note_marks[:repeat_start] = false
        end

        if @next_note_marks[:variant_ending]
          result << Harpnotes::Music::NoteBoundAnnotation.new(result.first, { pos: [4, -2], text: @next_note_marks[:variant_ending] })
          @next_note_marks[:variant_ending] = nil
        end

        # collect chord based targets
        chords = _extract_chord_lines(voice_element)
        chords.select { |chord| chord[0] == ":" }.each do |name|
          @jumptargets[name[1 .. -1]] = result.select { |n| n.is_a? Harpnotes::Music::Playable }.last
        end
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

      def _extract_chord_lines(voice_element)
        chords = voice_element[:a_gch]
        if chords
          result = chords.select { |e| e[:type] = '^' }.map { |e| e[:text] }
        else
          result = []
        end

        result
      end

      def _parse_origin(voice_element)
        { startChar: voice_element[:istart], endChar: voice_element[:iend], raw: voice_element }
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
  end # module Input

end # module Harpnotes
