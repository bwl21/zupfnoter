require "native"

module Harpnotes

  # the input faciities, basically the ABCinput stuff.

  module Input

    class ABCPitchToMidipitch

      def initialize
        #the tones within an octave
        @tonemap = {'c' => 0,
                    'd' => 1,
                    'e' => 2,
                    'f' => 3,
                    'g' => 4,
                    'a' => 5,
                    'b' => 6}

        @voice_accidentals = (0..6).map{|f| 0}
        @measure_accidentals = (0..6).map{|f| 0}

        @accidental_pitches = {'sharp' => 1, 'flat' => -1, 'natural' => 0}
      end

      # set the key of the Sheet
      # @param key [key as provided by ABCjs]
      # @return self
      def set_key(key)
        @voice_accidentals = (0..6).map{|f| 0}
        nkey = Native(key)
        accidentals = Native(key)[:accidentals]
        accidentals.each do |accidental|
          a = Native(accidental)
          @voice_accidentals[@tonemap[a[:note].downcase]] = @accidental_pitches[a[:acc].downcase]
          self
        end

        self
      end


      def reset_measure_accidentals
        @measure_accidentals = @measure_accidentals.map{|f| 0}
      end

      #@param note [Object] Note as provided by abc_parser
      #@return [Integer] midi pitch of the note
      # http://computermusicresource.com/midikeys.html
      def get_midipitch(note)

        native_note = Native(note)
        abc_pitch = native_note[:pitch]
        scale = [0, 2, 4, 5, 7, 9, 11]

        octave = (abc_pitch / 7).floor

        note_in_octave = abc_pitch % 7
        note_in_octave += 7 if note_in_octave < 0

        # add accidentals by key
        acc_by_key = @voice_accidentals[note_in_octave]

        # handle accidentals in measure
        note_accidental = native_note[:accidental]
        if (note_accidental) then
          pitch_delta = @accidental_pitches[note_accidental]
          if pitch_delta == 0 then
            if @measure_accidentals[note_in_octave] != 0
              pitch_delta = 0
            else
              pitch_delta = -1 * @voice_accidentals[note_in_octave]
            end
          end
          @measure_accidentals[note_in_octave] = pitch_delta
        end
        acc_by_measure = @measure_accidentals[note_in_octave]

        # 60 is the C in 3rd Octave
        result = 60 + 12 * octave + scale[note_in_octave] + acc_by_key + acc_by_measure

        result
      end
    end


    # The transformer
    class ABCToHarpnotes

      def initialize
        @pitch_transformer = Harpnotes::Input::ABCPitchToMidipitch.new()
        reset_state
      end

      def reset_state
        @next_note_marks_measure = false
        @next_note_marks_repeat_start = false
        @previous_note = nil
        @repetition_stack = []
        @pitch_transformer.reset_measure_accidentals
        nil
      end


      def transform(abc_code)
        %x{
          var book = new ABCJS.TuneBook(abc_code);
          var parser = new ABCJS.parse.Parse();
          parser.parse(book.tunes[0].abc);
          var warnings = parser.getWarnings();
          var tune = parser.getTune();
          // todo handle parser warnings
          console.log(tune);
          console.log(JSON.stringify(tune));
        }

        warnings = [Native(`warnings`)].compact
        warnings.each{|w|
          $log.warning(w)
        }

        #
        # pull out the headlines
        # todo:factor out to a generic method parse_abc_header()
        #
        note_length_rows = abc_code.split("\n").select {|row| row[0..1] == "L:" }
        raise "ABC code does not contain a unit note length (L)" if note_length_rows.empty?
        note_length = note_length_rows.first.strip.split(":").last.split("/").map {|s| s.strip.to_i }
        note_length = note_length.last / note_length.first

        # extract the lines
        tune = Native(`tune`)
        lines = tune[:lines].select {|l| Native(l)[:staff] } # filter out subtitles


        # get the key
        first_staff = Native(Native(lines.first)[:staff].first)
        key = first_staff[:key]
        @pitch_transformer.set_key(key)

        #get the meter
        meter = {
          :type => first_staff[:meter][:type]
        }
        if meter[:type] == "specified"
          meter[:den] = Native(first_staff[:meter][:value].first)[:den],
          meter[:num] = Native(first_staff[:meter][:value].first)[:num],
          meter[:display] = "#{meter[:num]}/#{meter[:den]}"
        elsif
          meter[:display] = meter[:type]
        end

        # get voice layout
        voices_in_staff = [[1,2], [3,4], [3], [4]] # get this from %%score instruction

        # extract the voices
        voices = []
        lines.each do |line|
          Native(line)[:staff].each_with_index do |staff, staff_index|
            Native(staff)[:voices].each_with_index do |voice, voice_index|
              $log.info("reading staff.voice: #{staff_index}.#{voice_index}")
              idx = voices_in_staff[staff_index][voice_index]
              voices[idx] ||= []
              voices[idx] << voice.map {|x| Native(x) }
              voices[idx].flatten!
            end
          end
        end
        voices.compact!

        # transform the voices
        voices_transformed = voices.each_with_index.map do |voice, voice_idx|
          reset_state

          # ttransform the voice content
          res = voice.map do |el|
            type = el[:el_type]
            res = self.send("transform_#{type}", el)
            unless res.nil? or res.empty?
              res.each {|e| e.origin = el }
            end
            res
          end.flatten.compact
          res
        end

        result = Harpnotes::Music::Song.new(voices_transformed, note_length)
        meta_data = {:compile_time => Time.now(),
                     :meter => meter[:display],
                     :key => key
                    }
        meta_data_from_tune = Hash.new(tune[:metaText].to_n)
        meta_data_from_tune.keys.each {|k| meta_data[k] = meta_data_from_tune[k]} # todo could not get Hash(object) and use merge
        result.meta_data = meta_data

        result
      end

      def transform_note(note)
        # 1/64 is the shortest note being handled
        # note that this scaling also has an effect
        # on the layout (DURATION_TO_STYLE). So, don't change this.
        duration = (64 * note[:duration]).round

        if not note[:rest].nil?
          if note[:rest][:type] == 'spacer'  # 'spacers' are not played: http://abcnotation.com/wiki/abc:standard:v2.1#typesetting_extra_space
            result = nil
          else
            result = transform_rest(note, duration)
          end
        else
          result = transform_real_note(note, duration)
        end

        if not result.nil?

          # support the case of repetitions from the very beginning

          if @repetition_stack.empty?
            @repetition_stack << result.last
          end
        end

        result
      end

      def transform_rest(note, duration)
        if @previous_note
          pitch = @previous_note.pitch
        else
          pitch = 60   # todo:choose a better value? 60 is c in 3rd octave
        end

        res = Harpnotes::Music::Pause.new(pitch, duration)
        res.origin = note
        @previous_note = res

        result = [res] 
        if @next_note_marks_measure
          result << Harpnotes::Music::MeasureStart.new(res)
          @next_note_marks_measure = false
        end


        result
      end

      def transform_real_note(note, duration)
        notes = Native(note[:pitches]).map do |pitch|
          midipitch = @pitch_transformer.get_midipitch(pitch)
          thenote = Harpnotes::Music::Note.new(midipitch, duration)
          thenote.origin = note
          thenote
        end

        res = []
        if notes.length == 1
          res << notes.first
        else
          res << Harpnotes::Music::SynchPoint.new(notes)
        end

        @previous_note = res.last

        if @next_note_marks_measure
          res << Harpnotes::Music::MeasureStart.new(notes.last)
          @next_note_marks_measure = false
        end

        if @next_note_marks_repeat_start
          @repetition_stack << notes.last
          @next_note_marks_repeat_start = false
        end
        res
      end

      def transform_bar(bar)
        type = bar[:type]
        @next_note_marks_measure = true
        @pitch_transformer.reset_measure_accidentals
        send("transform_#{type.gsub(" ", "_")}", bar)
      end

      def transform_bar_thin(bar)
        @next_note_marks_measure = true
        nil
      end

      def transform_bar_left_repeat(bar)
        @next_note_marks_repeat_start = true
        nil
      end

      def transform_bar_right_repeat(bar)
        if @repetition_stack.length == 1
          start = @repetition_stack.last
        else
          start = @repetition_stack.pop
        end

        [ Harpnotes::Music::Dacapo.new(start, @previous_note, @repetition_stack.length) ]
      end

      def method_missing(name, *args)
        `console.log('Missing transformation rule: ' + name)`
        nil
      end

    end

  end

end
