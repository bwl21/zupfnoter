module Harpnotes


  module Input


    # this provides the appropriate transformation engine
    class ABCToHarpnotesFactory
      def self.create_engine(engine)
        case engine
          when 'ABC2SVG'
            result = Harpnotes::Input::Abc2svgToHarpnotes.new
          when 'ABCJS'
            result = Harpnotes::Input::AbcjsToHarpnotes.new
          else
            $log.error("Undefined abc parser: #{engine}")
            result = Harpnotes::Input::AbcjsToHarpnotes.new
        end

        result
      end

    end


    class AbstractAbcToHarpnotes

      def initialize
        @abc_code          = nil
        @previous_new_part = []
      end

      def reset_state

        @jumptargets = {} # the lookup table for jumps

        @next_note_marks   = { measure:        false,
                               repeat_start:   false,
                               variant_ending: nil }
        @previous_new_part = []
        @previous_note     = nil
        @repetition_stack  = []
        @pitch_transformer.reset_measure_accidentals
        @current_tuplet   = 0
        @tuplet_downcount = 0
        @pitch_providers  = [] # lookuptable for pitches (used by rest)
        nil
      end

      # This creates a mockup of an ABC-Object providing the informaiton required for bactracing
      # and cross highlighting
      #
      # @param [Object] this is an abc object
      #
      # @return [Hash] with startChar, endChar
      def mk_origin(origin)
        { startChar: origin[:startChar], endChar: origin[:endChar] }
      end

      #
      # todo refine the parsing of the options
      def parse_harpnote_config(abc_code)
        # extract harpnoter specific commands

        hn_config_from_song = {}
        line_no             = 1
        abc_code.split("\n").each do |line|
          entry = line.match(/^%%%%hn\.(print|legend|note|annotation|lyrics) (.*)/) { |m| [m[1], m[2]] }
          if entry
            begin
              parsed_entry                     = JSON.parse(entry.last)
              parsed_entry[:line_no]           = line_no
              hn_config_from_song[entry.first] ||= []
              hn_config_from_song[entry.first] << parsed_entry
            rescue Exception => e
              message = ("error in harpnote commands: #{e.message} [#{line_no}:#{entry}]")
              $log.error(message, [line_no, 1], [line_no, 2])
            end
          end
          line_no +=1
        end

        # cleanups

        hn_config_from_song[:legend] = hn_config_from_song[:legend].first if hn_config_from_song[:legend] # legend is not an array
        hn_config_from_song[:lyrics] = hn_config_from_song[:lyrics].first if hn_config_from_song[:lyrics] # lyrics is not an array
        hn_config_from_song
      end


      # get the abc-specified metadata of the current song from the editor_f
      #
      def get_metadata(abc_code)
        retval = abc_code.split("\n").inject({}) do |result, line|
          entry               = line.match(/^([A-Z]):\s*(.*)/) { |m| [m[1], m[2]] }
          result[entry.first] = entry.last if entry
          result
        end
        retval
      end

      # add missing abc-metadata
      #
      def add_metadata(abc_code, new_metadata)
        old_metadata  = get_metadata(abc_code)
        more_metadata = new_metadata.select { |k, v| old_metadata[k].nil? }.map { |k, v| "#{k}:#{v}" }
        [more_metadata, abc_code].flatten.compact.join("\n")
      end

    end
  end

end