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

        @pitchmap = (0..11).map{|f| 0}

        @pitchnames = {'sharp' => 1, 'flat' => -1, 'neutral' => 0}
      end

      # set the key of the Sheet
      # http://computermusicresource.com/midikeys.html
      # @param key [key as provided by ABCjs]
      # @return self
      def set_key(key)
        @pitchmap = (0..6).map{|f| 0}
        nkey = Native(key)
        accidentals = Native(key)[:accidentals]
        accidentals.each do |accidental|
          a = Native(accidental)
          @pitchmap[@tonemap[a[:note].downcase]] = @pitchnames[a[:acc].downcase]
          puts @pitchmap
          self
        end

        self
      end

      def get_midipitch(note)
        abc_pitch = Native(note)[:pitch]
        scale = [0, 2, 4, 5, 7, 9, 11]

        octave = (abc_pitch / 7).floor

        note_in_octave = abc_pitch % 7
        note_in_octave += 7 if note_in_octave < 0

        acc_by_key = @pitchmap[note_in_octave]

        # 60 is the C in 3rd Octave
        result = 60 + 12 * octave + scale[note_in_octave] + acc_by_key

        result
      end
    end


    # The transformer
    class ABCToHarpnotes

      def initialize
        reset_state
        @pitch_transformer = Harpnotes::Input::ABCPitchToMidipitch.new()
      end

      def reset_state
        @next_note_marks_measure = true
        @next_note_marks_repeat_start = false
        @previous_note = nil
        @repetition_stack = []
      end

      def transform(abc_code)
        %x{
        var book = new ABCJS.TuneBook(abc_code);
        var parser = new ABCJS.parse.Parse();
        parser.parse(book.tunes[0].abc);
        var tune = parser.getTune();
        console.log(tune)
        }
        note_length_rows = abc_code.split("\n").select {|row| row[0..1] == "L:" }
        raise "ABC code does not contain a unit note length (L)" if note_length_rows.empty?
        note_length = note_length_rows.first.strip.split(":").last.split("/").map {|s| s.strip.to_i }
        note_length = note_length.last / note_length.first

        tune = Native(`tune`)
        lines = tune[:lines].map {|l| Native(l)[:staff] }.flatten # todo a line can have more than one staff

        first_staff = Native(tune[:lines].first)[:staff].first
        key = Native(first_staff)[:key]
        @pitch_transformer.set_key(key)

        voices = lines.inject([]) do |m, l|
          Native(l)[:voices].each_with_index do |v, idx|
            m[idx] ||= []
            m[idx] << v.map {|x| Native(x) }
            m[idx].flatten!
          end
          m
        end

        voices_transformed = voices.each_with_index.map do |voice, voice_idx|
          reset_state

          res = voice.map do |el|
            type = el[:el_type]
            res = self.send("transform_#{type}", el)
            unless res.nil? or res.empty?
              @previous_note = res.last
              res.each {|e| e.origin = el }
            end
            res
          end.flatten.compact
          res
        end

        Harpnotes::Music::Song.new(voices_transformed, note_length)

      end

      def transform_note(note)
        # 1/64 is the shortest note being handled
        # note that this scaling also has an effect
        # on the layout (DURATION_TO_STYLE). So, don't change this.
        duration = (64 * note[:duration]).round

        if not note[:rest].nil?
          transform_rest(duration)
        else
          transform_real_note(note, duration)
        end
      end

      def transform_rest(duration)
        [ Pause.new(duration) ]
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
        if @next_note_marks_measure
          res << MeasureStart.new(notes.last)
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
        start = @repetition_stack.pop
        [ Dacapo.new(start, @previous_note, @repetition_stack.length) ]
      end

      def method_missing(name, *args)
        `console.log('Missing transformation rule: ' + name)`
        nil
      end

    end

  end

end