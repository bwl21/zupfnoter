module Harpnotes


  module Input


    # this provides the appropriate transformation engine
    class ABCToHarpnotesFactory
      def self.create_engine(engine)
        case engine
          when 'ABC2SVG'
            result = Harpnotes::Input::Abc2svgToHarpnotes.new
          else
            $log.error("Undefined abc parser: #{engine}")
            result = Harpnotes::Input::Abc2svgToHarpnotes.new
        end

        result
      end

    end


    class AbstractAbcToHarpnotes

      def initialize
        @abc_code          = nil
        @previous_new_part = []
      end


      # get column und line number of abc_code
      # based on the character position
      #
      # @param [Numeric] charpos character position in abc code
      # @return [Numeric] charpos, line_no
      def charpos_to_line_column(charpos)
        cleancharpos = charpos || 1
        lines        = @abc_code[1, cleancharpos].split("\n")
        line_no      = lines.count
        char_pos     = lines.last.length()
        return line_no, char_pos
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
          line_no += 1
        end

        # cleanups

        hn_config_from_song[:legend] = hn_config_from_song[:legend].first if hn_config_from_song[:legend] # legend is not an array
        hn_config_from_song[:lyrics] = hn_config_from_song[:lyrics].first if hn_config_from_song[:lyrics] # lyrics is not an array
        hn_config_from_song
      end


      # get the abc-specified metadata of the current song from the editor_f
      #
      def get_metadata(abc_code)
        retval = abc_code.split("\n").each_with_index.inject({}) do |result, (line, index)|
          entry = line.match(/^([A-Z]):\s*(.*)/) { |m| [m[1], m[2]] }
          if entry
            key = entry.first
            if result[key]
              $log.error(%Q{#{I18n.t("more than one line found for ")} ':#{key}'}, [index + 1, 1]) if ['F', 'X'].include?(key)
              result[key] << entry.last.strip
            else
              if key == 'F'
                filename = entry.last.strip
                unless filename.include?('{{')  # do not check F: if we have placeholders
                  $log.error(%Q{"#{filename}": #{I18n.t("bad characters in filename")}}, [index + 1, 1]) unless filename.match(/^[a-zA-z0-9_\-\.]+$/)
                end
              end
              result[key] = [entry.last.strip]
            end
          end
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