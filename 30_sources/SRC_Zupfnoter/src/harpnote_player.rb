module Harpnotes

  module Music

    # This class is used to play the harpnotes
    # todo factor out the dependency of to musicaljs into opal-musicaljs

    class HarpnotePlayer

      attr_accessor :player_model_abc # This is to inject the player events created by abc2svg


      def initialize()
        %x{#{@abcplay} = new AbcPlay({
             onend: function(){#{call_on_songoff}}, // todo: activate after fix https://github.com/moinejf/abc2svg/issues/43
             onnote: function(index, on,  custom){#{call_on_note(`index`, `on`, `custom`)}}
          })
           #{@abcplay}.set_sfu("public/soundfont/FluidR3_GM")
           #{@abcplay}.set_sft('js')
           #{@abcplay}.set_follow(true)
           #{@abcplay}.set_vol(1.0)
        } # the player engine
        @isplaying        = false
        @selection        = []
        @voices_to_play   = [1, 2, 3, 4, 5, 6, 7, 8]
        @voice_elements   = []
        @player_model_abc = []
      end

      def is_playing?
        @isplaying
      end

      def call_on_note(index, on, custom = nil)
        if on
          @noteon_callback.call({startChar: index, endChar: index});
        else
          @noteoff_callback.call({startChar: index, endChar: index});
        end
      end

      def call_on_songoff
        %x{
           setTimeout(function(){#{@songoff_callback.call}}, 10)
          }
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
        if @selection.count >= 0 and (counts = @selection.map {|i| i[:delay]}.uniq.count) > 1
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
          notes_to_play = notes_to_play.select {|v| @active_voices.include? v[:index]}
          play_notes(notes_to_play)
        else
          play_from_abc # play from abc if no note is selected
        end
      end

      def play_selection
        play_notes(@selection)
      end

      def play_song
        play_from_abc
        # play_notes(@voice_elements)
      end

      def play_from_abc
        %x{
        #{@abcplay}.play(0, 1000000, #{@player_model_abc})
          }
        @isplaying = true
      end

      # this does the ultimate playing of the notes

      def play_notes(the_notes)
        self.stop()

        unless the_notes.empty?
          #note schedule in secc, SetTimout in msec; finsh after last measure
          `clearTimeout(#{@song_off_timer})` if @song_off_timer

          the_notes = the_notes.sort_by {|the_note| the_note[:delay]}

          firstnote = the_notes.first
          lastnote  = the_notes.last


          # stoptime comes in msec
          stop_time       = (lastnote[:delay] - firstnote[:delay] + lastnote[:duration] + $conf.get('layout.SHORTEST_NOTE') * @duration_timefactor) * 1000 # todo factor out the literals
          @song_off_timer = `setTimeout(function(){#{@songoff_callback}.$call()}, #{stop_time} )`

          pe = the_notes.map {|i| mk_to_play_1(i)}

          %x{
          #{@abcplay}.play(0, 1000000, #{pe})
          }
          ## todo add the player logic here

          @isplaying = true
        else
          $log.warning("nothing selected to play")
        end
      end

      def set_speed(speed)
        %x{#{@abcplay}.set_speed(#{speed})}
      end

      def stop()
        %x{#{@abcplay}.stop()} if @isplaying
        @isplaying = false
      end

      def unhighlight_all()
        @selection = []
      end


      def range_highlight(from, to)
        @selection = []
        @voice_elements.sort {|a, b| a[:delay] <=> b[:delay]}.each do |element|

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
        nil
      end

      def pitch_to_note(pitch)
        %W{C C# D D# E F F# G G# A A# B}[pitch % 12]
      end

      # this is experimental and puts the notes in the curren time to the logwindow
      def get_notes
        pitches = @selection.map{|i| @voice_elements_by_time[i[:delay]].map{|i| i[:pitch]}}.flatten.uniq.compact
        pitches.map{|i| i%12}.uniq.sort.map{|i| pitch_to_note(i)}
      end

      # this loads a song from the zupfnoter music model.
      def load_song(music, active_voices)
        @active_voices = active_voices
        specduration   = music.meta_data[:tempo][:duration].reduce(:+)
        specbpm        = music.meta_data[:tempo][:bpm]

        spectf = (specduration * specbpm)

        # 1/4 = 120 bpm shall be  32 ticks per quarter: convert to 1/4 <-> 128:
        tf                   = spectf * (128/120)
        @duration_timefactor = 1/tf # convert music duration to musicaljs duration
        @beat_timefactor     = 1/(tf * $conf.get('layout.BEAT_PER_DURATION')) # convert music beat to musicaljs delay

        #todo duration_time_factor, beat_time_factor

        $log.debug("playing with tempo: #{tf} ticks per quarter #{__FILE__} #{__LINE__}")
        _load_voice_elements_from_voices(music)
        @voice_elements_by_time = @voice_elements.group_by{|element| element[:delay]}

        self
      end

      def _load_voice_elements_from_voices(music)
        @voice_elements = music.voices.each_with_index.map do |voice, index|
          next  if index == 0
          tie_start = {}
          voice.select {|c| c.is_a? Playable}.map do |root|

            velocity = 0.5
            velocity = 0.000011 if root.is_a? Pause # pause is highlighted but not to be heard

            to_play = mk_to_play(root, velocity, index)

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
                to_play[:duration]           += tie_start[:duration]
                to_play[:origin][:startChar] = tie_start[:origin][:startChar]
                to_play[:delay]              = tie_start[:delay]

                more_to_play.each do |p|
                  p[:duration] += tie_start[:duration]
                  p[:delay]    = tie_start[:delay]
                end
              end
            end

            if root.tie_start?
              tie_start = to_play
              reault    = nil # result = [to_play] + [more_to_play]
            else
              result = [to_play] + [more_to_play]
            end
            result
          end
        end.flatten.compact # note that we get three nil objects bcause of the voice filter
      end


      def mk_to_play_1(note)
        [
            note[:origin][:startChar], # [0]: index of the note in the ABC source
            note[:delay], #[1]: time in seconds
            25, #[2]: MIDI instrument 25: guitar steel
            note[:pitch], # [3]: MIDI note pitch (with cents)
            note[:duration], # [4]: duration
            ((note[:velocity] > 0.2) ? 1 : 0) # [5] volume
            #note.to_n # [6] custom object
        ]
      end

      # @param [Note] note - the note to play
      # @param [Numerical] velocity - velocity to play the note
      # @param [Numericcal] index - the number of the voice
      # @return [Hash] information for the player to play the note
      def mk_to_play(note, velocity, index)
        {
            delay: note.beat * @beat_timefactor,
            pitch: note.pitch, # todo: why -
            duration: 1 * note.duration * @duration_timefactor, # todo: handle sustain of harp ...
            velocity: velocity,
            origin:   note.origin,
            index:    index
        }
      end
    end

  end

end