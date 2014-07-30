module Musicaljs


  class Instrument

    def initialize(options)
      @instrument = `new Instrument(options)`
      @isplaying = false
    end

    def play(options, abc_text)
      `self.instrument.play(options, abc_text)`
    end

    def tone(pitch, velocity, duration, delay, timbre)
      `self.instrument.tone(pitch, velocity, duration, delay, timbre)`
    end
  end
end