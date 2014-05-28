require "native"

module Harpnotes

  module Input

    class ABCToHarpnotes

      def initialize
        reset_state
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
        }
        note_length_rows = abc_code.split("\n").select {|row| row[0..1] == "L:" }
        raise "ABC code does not contain a unit note length (L)" if note_length_rows.empty?
        note_length = note_length_rows.first.strip.split(":").last.split("/").map {|s| s.strip.to_i }
        note_length = note_length.last / note_length.first

        tune = Native(`tune`)
        lines = tune[:lines].map {|l| Native(l)[:staff] }.flatten
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
        duration = (1.0 / note[:duration]).round

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
          note = Harpnotes::Music::Note.new(Native(pitch)[:pitch], duration)
          note.origin = note
          note
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