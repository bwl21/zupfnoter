require "native"

module Harpnotes
  # the input faciities, basically the ABCinput stuff.

  module Input

    class Abc2svgToHarpnotes < AbstractAbcToHarpnotes

      def initialize
        super
        @abc_code          = nil
        @previous_new_part = []

        # this is local state memory

        @tie_started       = false
        @slurstack         = 0
        @tuplet_count      = 1
        @tuplet_down_count = 1
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

          result = voice_model[:symbols].map do |voice_model_element|
            type = @abc_model[:music_types][voice_model_element[:type]]
            begin
              result = self.send("_transform_#{type}", voice_model_element)
            rescue String => e
              $log.error("BUG: #{e}", charpos_to_line_column(voice_model_element[:istart]))
              nil
            end
            result
          end

          result.compact
        end

        hn_voices.unshift(hn_voices.first) # let voice-index start with 1 -> duplicate voice 0
        Harpnotes::Music::Song.new(hn_voices)
      end

      def _transform_bar(voice_element)
        $log.error "bar not implemented"
        nil
      end

      def _transform_note(voice_element)

        abc2svg_duration_factor = 1536

        start_pos = voice_element[:istart]
        end_pos   = voice_element[:iend]


        #handle tuplets
        if voice_element[:in_tuplet]

          if voice_element[:extra] and  voice_element[:extra][:"15"]
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


        # transform the individual notes
        notes               = voice_element[:notes].map do |the_note|
          duration = ((the_note[:dur]/abc2svg_duration_factor) * $conf.get('layout.SHORTEST_NOTE')).round

          result           = Harpnotes::Music::Note.new(the_note[:midi], duration)
          result.origin    = { startChar: start_pos, endChar: end_pos }
          result.start_pos = charpos_to_line_column(start_pos) # get column und line number of abc_code
          result.end_pos   = charpos_to_line_column(end_pos)

          result.tuplet       = tuplet
          result.tuplet_start = tuplet_start
          result.tuplet_end   = tuplet_end

          result
        end

        # handle duration and orign
        result              = Harpnotes::Music::SynchPoint.new(notes)
        result.duration     = notes.first.duration
        result.origin       = notes.first.origin

        # handle ties
        # note that abc2svg only indicates tie start by  voice_element[:ti1] but has no tie end
        result.tie_end      = @tie_started
        @tie_started        = !voice_element[:ti1].nil?
        result.tie_start    = @tie_started

        # handle slurs
        result.slur_starts  = _parse_slur(voice_element[:slur_start]).map { |i| _push_slur() }
        amount_of_slur_ends = (voice_element[:slur_end] or 0)
        result.slur_ends    = (1 .. amount_of_slur_ends).map { _pop_slur } # pop_slur delivers an id.


        #handle tuplets of synchpoint
        result.tuplet       = tuplet
        result.tuplet_start = tuplet_start
        result.tuplet_end   = tuplet_end


        result
      end

      def _transform_format(voice_element)
        nil
      end


      ################

      def _push_slur
        @slurstack += 1
      end

      def _pop_slur
        result     = @slurstack
        @slurstack -= 1
        @slurstack = 0 if @slurstack < 0
        result
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

    end
  end

end
