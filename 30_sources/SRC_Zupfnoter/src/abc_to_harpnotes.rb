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
    # todo:@next_not_marks ...
    class ABCToHarpnotes

      def initialize
        @pitch_transformer = Harpnotes::Input::ABCPitchToMidipitch.new()
        @jumptargets = {}

        reset_state
      end

      def reset_state
        @next_note_marks_measure = false
        @next_note_marks_repeat_start = false
        @previous_new_part = []
        @previous_note = nil
        @repetition_stack = []
        @pitch_transformer.reset_measure_accidentals
        nil
      end

      #
      # todo refine the parsing of the options
      def parse_harpnote_config(abc_code)
        # extract harpnoter specific commands

        hn_config_from_song = {}
        line_no = 1
        abc_code.split("\n").each do |line|
          entry = line.match(/^%%%%hn\.(print|legend|note) (.*)/){ |m| [m[1], m[2]] }
          if entry
            begin
              parsed_entry = JSON.parse(entry.last)
              hn_config_from_song[entry.first] ||= []
              hn_config_from_song[entry.first] << parsed_entry
            rescue Exception => e
              $log.error("#{e.message} in line #{line_no} while parsing: #{entry}")
            end
          end
          line_no +=1
        end
        #$log.debug("#{hn_config_from_song} (#{__FILE__} #{__LINE__})")
        unless hn_config_from_song[:print]
          hn_config_from_song[:print] =  [{t: "all by default", v:[1,2,3,4], s: [[1,2],[3,4]], f:[1,3], j:[1,3]}]
        end
        hn_config_from_song[:legend] = hn_config_from_song[:legend].first if hn_config_from_song[:legend] # legend is not an array
        hn_config_from_song
      end



      # get the metadata of the current song from the editor
      #
      def get_metadata(abc_code)
        retval = abc_code.split("\n").inject({}) do |result, line|
          entry = line.match(/^(X|T):\s*(.*)/){ |m| [m[1], m[2]] }
          result[entry.first] = entry.last if entry
          result
        end
        retval
      end

      def transform(abc_code)

        harpnote_options = parse_harpnote_config(abc_code)
        #$log.debug("#{harpnote_options} (#{__FILE__} #{__LINE__})")

        # now parse the abc_code by abcjs
        %x{
          var book = new ABCJS.TuneBook(abc_code);
          var parser = new ABCJS.parse.Parse();
          parser.parse(book.tunes[0].abc);
          var warnings = parser.getWarningObjects();
          var tune = parser.getTune();
          // todo handle parser warnings
          console.log(tune);
          console.log(JSON.stringify(tune));
        }

        warnings = [Native(`warnings`)].flatten.compact
        warnings.each{|w|
          wn = Native(w)
          $log.warning("#{wn[message]} at line #{wn[:line]} position #{wn[:startChar]}")
        }

        #
        # pull out the headlines
        # todo:factor out to a generic method parse_abc_header()
        #
        note_length_rows = abc_code.split("\n").select {|row| row[0..1] == "L:" }
        note_length_rows = ["L:1/4"] if note_length_rows.empty?
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
          meter[:den] = Native(first_staff[:meter][:value].first)[:den]
          meter[:num] = Native(first_staff[:meter][:value].first)[:num]
          meter[:display] = "#{meter[:num]}/#{meter[:den]}"
        elsif
          meter[:display] = meter[:type]
        end

        # extract the voices
        voices = []
        lines.each_with_index do |line, line_index|
          voice_no = 1
          Native(line)[:staff].each_with_index do |staff, staff_index|
            Native(staff)[:voices].each_with_index do |voice, voice_index|
              $log.debug("reading line.staff.voice #{voice_no}:#{line_index} #{staff_index}.#{voice_index} (#{__FILE__} #{__LINE__})")
              voices[voice_no] ||= Harpnotes::Music::Voice.new()
              voices[voice_no] << voice.map {|x| Native(x) }
              voices[voice_no].index = voice_no
              voices[voice_no].flatten!
              voice_no += 1
            end
          end
        end
        voices.compact!

        # transform the voices
        hn_voices = voices.each_with_index.map do |voice, voice_idx|
          reset_state

          # transform the voice content
          hn_voice = voice.map do |el|
            type = el[:el_type]
            hn_voice_element = self.send("transform_#{type}", el)

            unless hn_voice_element.nil? or hn_voice_element.empty?
              hn_voice_element.each {|e| e.origin = el }
            end

            hn_voice_element
          end.flatten.compact

          # compute the explicit jumplines
          jumplines = []
          hn_voice.each do |e|
            jumplines << make_jumplines(e)
          end

          hn_voice += jumplines.flatten.compact
         # hn_voice.flatten.compact

          hn_voice
        end

        # now construct the song
        result = Harpnotes::Music::Song.new(hn_voices, note_length)
        meta_data = {:compile_time => Time.now(),
                     :meter => meter[:display],
                     :key => Native(key)[:root] + Native(key)[:acc] + Native(key)[:mode]
                    }

        # handling tempo
        # tempo is marked as duration, ... duration = bpm
        duration = 0.25; bpm =120   # default speed settings
        meta_data[:tempo] = {duration: [duration], bpm:bpm} # setting the default speed
        meta_data[:tempo_display] = "1/#{1/duration} = #{bpm}"
        if tune[:metaText][:tempo]
          duration = tune[:metaText][:tempo][:duration] rescue meta_data[:tempo][:duration]
          bpm = tune[:metaText][:tempo][:bpm] rescue meta_data[:tempo][:bpm]
          meta_data[:tempo] = {duration: duration, bpm: bpm }
          duration_display = duration.map{|d| "1/#{1/d}"}
          meta_data[:tempo_display] = [tune[:metaText][:tempo][:preString],
                                       duration_display, "=", bpm,
                                       tune[:metaText][:tempo][:postString]
                                      ].join(" ")
        end

        meta_data_from_tune = Hash.new(tune[:metaText].to_n)
        meta_data_from_tune.keys.each {|k| meta_data[k] = meta_data_from_tune[k]} # todo could not get Hash(object) and use merge

        result.meta_data = meta_data

        result.harpnote_options = {}
        result.harpnote_options[:print] = harpnote_options[:print].map{|o|
         {title:       o[:t],
          voices:      o[:v].map{|i| i-1},
          synchlines:  o[:s].map{|i| i.map{|j| j-1}},
          flowlines:   o[:f].map{|i| i-1},
          jumplines:   o[:j].map{|i| i-1}
         }
        }
        result.harpnote_options[:legend] = harpnote_options[:legend]
        result.harpnote_options[:notes]  = harpnote_options[:note] || []

        result
      end

      private

      #@param entity []
      def make_jumplines(entity)
        result = []
        if entity.is_a? Harpnotes::Music::Playable
          chords = entity.origin[:chord] || []
          chords.each do |chord|
            name = Native(chord)[:name]
            if name[0] == '@'
              nameparts = name[1..-1].split("@")
              target = @jumptargets[nameparts.first]
              argument = nameparts.last.to_i || 1
              if target.nil?
                $log.error("missing target #{name[1..-1]}")
              else
                result  << Harpnotes::Music::Dacapo.new(target, entity, distance: argument)  #todo: better algorithm
              end
            else
              #result << Harpnotes::Music::Annotation.new(name, )
            end
          end
        end
        `//foobar`

        result
      end

      def transform_note(note)
        # 1/64 is the shortest note being handled
        # note that this scaling also has an effect
        # on the layout (DURATION_TO_STYLE). So, don't change this.
        duration = (64 * note[:duration]).round

        if not note[:rest].nil?
          if note[:rest][:type] == 'spacer'  # 'spacers' are not played: http://abcnotation.com/wiki/abc:standard:v2.1#typesetting_extra_space
            result = []
          else
            result = transform_rest(note, duration)
          end
        else
          result = transform_real_note(note, duration)
        end

        if not result.empty?

          # support the case of repetitions from the very beginning

          if @repetition_stack.empty?
            @repetition_stack << result.last
          end

          # collect chord based target
          unless note[:chord].nil?
            note[:chord].each do |chord|
              name = Native(chord)[:name]
              if name[0] == ':'
                @jumptargets[name[1 .. -1]] = result.select{|n|n.is_a? Harpnotes::Music::Playable}.last
              end
            end
          end
        end

        result
      end


      #todol factor out handling of measures and newparts
      def transform_rest(note, duration)
        if @previous_note
          pitch = @previous_note.pitch
        else
          pitch = 60   # todo:choose a better value? 60 is c in 3rd octave
        end

        res = Harpnotes::Music::Pause.new(pitch, duration)
        res.origin = note
        res.visible = false if note[:rest][:type] == 'invisible'
        @previous_note = res

        result = [res] 
        if @next_note_marks_measure
          result << Harpnotes::Music::MeasureStart.new(res)
          @next_note_marks_measure = false
        end

        if @next_note_marks_repeat_start
          @repetition_stack << res
          @next_note_marks_repeat_start = false
        end

        @previous_new_part.each{|part|
          part.companion = res
          res.first_in_part=true
        }
        @previous_new_part.clear

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

        @previous_new_part.each{|part|
          part.companion = notes.last
          notes.last.first_in_part=true
        }
        @previous_new_part.clear

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

      def transform_bar_thin_thick(bar)
        @next_note_marks_measure = true
        nil
      end

      def transform_bar_right_repeat(bar)
        if @repetition_stack.length == 1
          start = @repetition_stack.last
        else
          start = @repetition_stack.pop
        end

        [ Harpnotes::Music::Dacapo.new(start, @previous_note, level: @repetition_stack.length) ]
      end

      def transform_part(part)
        new_part = Harpnotes::Music::NewPart.new(part[:title])
        @previous_new_part << new_part
        [ new_part ]
      end

      def method_missing(name, *args)
        $log.debug("Missing transformation rule: #{name} (#{__FILE__} #{__LINE__})")
        nil
      end

    end

  end

end
