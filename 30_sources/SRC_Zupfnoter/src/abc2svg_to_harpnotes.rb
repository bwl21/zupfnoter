require "native"

module Harpnotes

  # the input faciities, basically the ABCinput stuff.

  module Input

    class Abc2svgToHarpnotes < AbstractAbcToHarpnotes

      class ABCPitchToMidipitch

        def initialize
          #the tones within an octave
          @tonemap = { 'c' => 0,
                       'd' => 1,
                       'e' => 2,
                       'f' => 3,
                       'g' => 4,
                       'a' => 5,
                       'b' => 6 }

          @voice_accidentals   = (0..6).map { |f| 0 }
          @measure_accidentals = (0..6).map { |f| 0 }
          @on_error            = lambda { |line, message| }

          @accidental_pitches = { 'sharp' => 1, 'flat' => -1, 'natural' => 0 }
        end

        def on_error(&block)
          @on_error = block
        end

        # set the key of the Sheet
        # @param key [key as provided by ABCjs]
        # @return self
        def set_key(key)
          @voice_accidentals = (0..6).map { |f| 0 }
          nkey               = Native(key)
          accidentals        = Native(key)[:accidentals]
          accidentals.each do |accidental|
            a                                               = Native(accidental)
            @voice_accidentals[@tonemap[a[:note].downcase]] = @accidental_pitches[a[:acc].downcase]
            self
          end

          self
        end


        def reset_measure_accidentals
          @measure_accidentals = @measure_accidentals.map { |f| 0 }
        end

        #@param note [Object] Note as provided by abc_parser
        #@return [Integer] midi pitch of the note
        # http://computermusicresource.com/midikeys.html
        # @param [Object] persist_accidentals if set to false, accidentals are considered for the current note only but
        # but not persisted in the measure. This is used, in case of rests, which get their pitch from the subsequent note
        # which invokes its pitch again on its own. In case of a "neutral" accidental persisting the same would make
        # apply the neutral too early!.
        # this covers a but which is in the get_midipitch algorithm
        def get_midipitch(note, persist_accidentals = true)

          native_note = Native(note)
          abc_pitch   = native_note[:pitch]
          scale       = [0, 2, 4, 5, 7, 9, 11]

          octave = (abc_pitch / 7).floor

          note_in_octave      = abc_pitch % 7
          note_in_octave      += 7 if note_in_octave < 0

          # add accidentals by key
          acc_by_key          = @voice_accidentals[note_in_octave]

          # handle accidentals in measure
          note_accidental     = native_note[:accidental]
          measure_accidentals = @measure_accidentals.clone
          if (note_accidental) then
            pitch_delta = @accidental_pitches[note_accidental]
            if pitch_delta == 0 then
              if measure_accidentals[note_in_octave] != 0
                pitch_delta = 0
              else
                pitch_delta = -1 * @voice_accidentals[note_in_octave]
              end
            end
            measure_accidentals[note_in_octave] = pitch_delta
          end
          acc_by_measure       = measure_accidentals[note_in_octave]
          @measure_accidentals = measure_accidentals.clone if persist_accidentals

          # 60 is the C in 3rd Octave
          result               = 60 + 12 * octave + scale[note_in_octave] + acc_by_key + acc_by_measure

          result
        end
      end


      def initialize
        super
        @pitch_transformer = ABCPitchToMidipitch.new()
        @abc_code          = nil
        @previous_new_part = []
        reset_state
      end

      # @param [String] zupfnoter_abc to be transformed
      #
      # @return [Harpnotes::Music::Song] the Song
      def transform(zupfnoter_abc)
        @abc_code = zupfnoter_abc
        transformer  = ABC2SVG::Abc2Svg.new(nil, {mode: :model})
        @abc_model = transformer.get_abcmodel(zupfnoter_abc)
        `debugger`
        @abc_model
      end

    end
  end

end
