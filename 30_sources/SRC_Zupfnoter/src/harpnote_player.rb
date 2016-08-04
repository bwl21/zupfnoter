module Harpnotes

  module Music

    # This class is used to play the harpnotes
    # todo factor out the dependency of to musicaljs into opal-musicaljs

    class HarpnotePlayer


      def initialize()
        @inst      = []
        @isplaying = false
        @selection = []
      end

      def is_playing?
        @isplaying
      end

      # This creates an instrument upon request
      def create_inst(instrument_id)
        unless @inst[instrument_id]
          $log.debug "creating instrument #{instrument_id} "
          @inst[instrument_id] = %x{new Instrument("piano")}
          Native(@inst[instrument_id]).on(:noteon) do |element|
            abc_element = Native(element)[:origin]
            @noteon_callback.call(abc_element)
            nil
          end
          Native(@inst[instrument_id]).on(:noteoff) do |element|
            abc_element = Native(element)[:origin]
            @noteoff_callback.call(abc_element)
            nil
          end
        end
        @inst[instrument_id]
      end

      def on_noteon(&block)
        @noteon_callback = block
      end


      def on_noteoff(&block)
        @noteoff_callback = block
      end

      def on_songoff(&block)
        @songoff_callback = block
      end

      def play_auto
        
        if @selection.count >= 0 and  (counts = @selection.map{|i|i[:delay]}.uniq.count) > 1
           play_selection
        else
          play_from_selection
        end
      end

      def play_from_selection
        $log.debug("#{@selection.to_s} (#{__FILE__} #{__LINE__})")

        if @selection.first
          notes_to_play = @voice_elements.select do |n|
            n[:delay] >= @selection.first[:delay]
          end
        else
          $log.error("please select at least one note")
          notes_to_play = @voice_elements
        end

        play_notes(notes_to_play)
      end

      def play_selection
        play_notes(@selection)
      end

      def play_song
        play_notes(@voice_elements)
      end

      def play_notes(the_notes)
        self.stop()

        unless the_notes.empty?
          #note schedule in secc, SetTimout in msec; finsh after last measure
          `clearTimeout(#{@song_off_timer})` if @song_off_timer

          the_notes = the_notes.sort_by{|the_note|  the_note[:delay] + the_note[:duration]}


          firstnote       = the_notes.first
          lastnote        = the_notes.last


          # stoptime comes in msec
          stop_time       = (lastnote[:delay] - firstnote[:delay] + $conf.get('layout.SHORTEST_NOTE') * @duration_timefactor) * 1000 # todo factor out the literals
          @song_off_timer = `setTimeout(function(){#{@songoff_callback}.$call()}, #{stop_time} )`

          idx = 0
          the_notes.each do |the_note|
            the_note_to_play         = the_note.clone
            the_note_to_play[:delay] -= firstnote[:delay]

            note  = the_note_to_play.to_n
            index = the_note_to_play[:index]
            inst  = create_inst(index)

            %x{
            #{inst}.tone(#{note});
            #{inst}.schedule(#{note}.delay + #{note}.duration, function(){#{inst}._trigger("noteoff", #{note});});
           }
          end
          @isplaying = true
        else
          $log.warning("nothing selected to play")
        end
      end


      def stop()
        @inst.each_with_index { |inst, index|
          begin
            `#{inst}.silence()`
          rescue Exception => e
            $log.info(e.backtrace)
          end
        }
        @isplaying = false
      end

      def unhighlight_all()
        @selection = []
      end


      def range_highlight(from, to)
        @selection = []
        @voice_elements.sort { |a, b| a[:delay] <=> b[:delay] }.each do |element|

          origin = Native(element[:origin])
          unless origin.nil?
            el_start = origin[:startChar]
            el_end   = origin[:endChar]

            if ((to > el_start && from < el_end) || ((to === from) && to === el_end))
              @selection.push(element)
            end
          else
            $log.error("BUG: note without origin #{element.class}")
          end
        end
      end


      def load_song(music)
        specduration = music.meta_data[:tempo][:duration].reduce(:+)
        specbpm      = music.meta_data[:tempo][:bpm]

        spectf               = (specduration * specbpm)

        # 1/4 = 120 bpm shall be  32 ticks per quarter: convert to 1/4 <-> 128:
        tf                   = spectf * (128/120)
        @duration_timefactor = 1/tf # convert music duration to musicaljs duration
        @beat_timefactor     = 1/(tf * $conf.get('layout.BEAT_PER_DURATION')) # convert music beat to musicaljs delay

        #todo duration_time_factor, beat_time_factor

        $log.debug("playing with tempo: #{tf} ticks per quarter #{__FILE__} #{__LINE__}")
        @voice_elements = music.voices.each_with_index.map do |voice, index|
          tie_start = {}
          voice.select { |c| c.is_a? Playable }.map do |root|

            velocity = 0.5
            velocity = 0.000011 if root.is_a? Pause # pause is highlighted but not to be heard

            to_play      = mk_to_play(root, velocity, index)

            # todo Handle synchpoints

            more_to_play = []
            if root.is_a? SynchPoint
              more_to_play = root.notes.each.map do |note|
                mk_to_play(note, velocity, index) unless note.pitch === root.pitch
              end.compact
            end
            # handle ties and slurs

            if root.tie_end?
              if tie_start[:pitch] == to_play[:pitch]
                to_play[:duration] += tie_start[:duration]
                to_play[:delay]    = tie_start[:delay]
                $log.debug("#{more_to_play} #{__FILE__} #{__LINE__}")

                more_to_play.each do |p|
                  p[:duration] += tie_start[:duration]
                  p[:delay]    = tie_start[:delay]
                end
              end
            end

            if root.tie_start?
              tie_start = to_play
            end

            [to_play] + [more_to_play]
          end
        end.flatten.compact # note that we get three nil objects bcause of the voice filter

      end


      # @param [Note] note - the note to play
      # @param [Numerical] velocity - velocity to play the note
      # @param [Numericcal] index - the number of the voice
      # @return [Hash] information for the player to play the note
      def mk_to_play(note, velocity, index)
        {
            delay:    note.beat * @beat_timefactor,
            pitch:    -note.pitch, # todo: why -
            duration: note.duration * @duration_timefactor, # todo: do we need to adjust triplets?
            velocity: velocity,
            origin:   note.origin,
            index:    index
        }
      end
    end

  end

end