require "native"

module Harpnotes

  # the input faciities, basically the ABCinput stuff.

  module Input

    class Abc2svgToHarpnotes < AbstractAbcToHarpnotes

      def initialize
        super
        # @pitch_transformer = ABCPitchToMidipitch.new()
        @abc_code          = nil
        @previous_new_part = []
        reset_state
      end



    end
  end

end
