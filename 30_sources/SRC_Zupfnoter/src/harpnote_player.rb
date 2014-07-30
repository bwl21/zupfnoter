
module Harpnotes

  module Music

    # This class is used to play the harpnotes
    # todo factor out the dependency of to musicaljs into opal-musicaljs

    class HarpnotePlayer

      def initialize()
        @inst = `new Instrument("piano")`
        @isplaying = false
      end

      def is_playing?
        @isplaying
      end

      def on_noteon(&block)
        Native(@inst).on(:noteon) do |element|
          abc_element = Native(element)[:origin]
          block.call(abc_element)
          nil
        end
      end


      def on_noteoff(&block)
        Native(@inst).on(:noteoff) do |element|
          abc_element = Native(element)[:origin]
          block.call(abc_element)
          nil
        end
      end

      def on_songoff(&block)
        @songoff_callback = block
      end


      def play_song()
        self.stop()

        #note schedule in secc, SetTimout in msec; finsh after last measure
        `clearTimeout(self.song_off_timer)` if @song_off_timer
        lastnote = @voice_elements.last
        stop = (lastnote[:delay] + 128 * @timefactor)*1000   
        `setTimeout(function(){self.songoff_callback.$call()}, stop )`
        stop = (lastnote[:delay] + 64 * @timefactor)*1000
        @song_off_timer = `setTimeout(function(){self.songoff_callback.$call()}, stop )`

        @voice_elements.each{|the_note|
         #@inst.tone(note)
          note = the_note.to_n
          %x{
            self.inst.tone(note);
            self.inst.schedule(note.delay + note.duration, function(){self.inst._trigger("noteoff", note);});
           }
        }
        @isplaying = true
      end

      def stop()
        `self.inst.silence()`
        @isplaying = false
      end

      def play_selected

      end

      def load_song(music)
        specduration = music.meta_data[:tempo][:duration].reduce(:+)
        specbpm      = music.meta_data[:tempo][:bpm]

        spectf = (specduration * specbpm)

        # 1/4 = 120 bpm shall be  32 ticks per quarter: convert to 1/4 <-> 128:
        tf =  spectf * (128/120)
        @timefactor = 1/tf

        $log.debug("playing with tempo: #{tf} ticks per quarter #{__FILE__} #{__LINE__}")
        @voice_elements  = music.voices.each_with_index.map {|voice, index|
          voice.select {|c| c.is_a? Playable }.map{|root|

            delay  = root.beat * @timefactor
            pitch = - root.pitch
            duration = root.duration * @timefactor
            velocity = 1
            velocity = 0.000011 if root.is_a? Pause # pause is highlighted but not to be heard

            {pitch: pitch,
             velocity: velocity,
             duration: duration,
             delay: delay,
             origin: root.origin
            }
          }
        }.flatten.compact # note that we get three nil objects bcause of the voice filter

      end
    end

  end

end