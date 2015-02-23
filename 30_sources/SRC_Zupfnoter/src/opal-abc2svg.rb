module ABC2SVG
  class Abc2Svg


    def initialize(div, options={})
      @on_select = lambda { |element|}
      @printer = div
      @svgbuf = []
      @abc_source = ''
      @user = {img_out: nil,
               errmsg: nil,
               read_file: nil,
               annotate: true,
               page_format: true
      }

      set_errmsg() do |message, line_number, column_number|
        $log.error(message)
      end

      set_img_out() do |svg|
        @svgbuf.push svg
      end

      @root = %x{new Abc(#{@user.to_n})}
    end

    def on_select(&block)
      @on_select = block
      set_on_select()
    end

    def set_on_select()
      Element.find('.abcref').on(:click) do |evt|
        evt.stop_propagation
        @on_select.call(_id_to_abcelement(evt.current_target.id))
        nil
      end
    end

    def draw(abc_code)
      _translate("abc", abc_code)
      @printer.html(get_svg)
      set_on_select();
      _build_charpos_map();
    end

    def get_svg
      @svgbuf.join("\n")
    end


    def set_errmsg(&block)
      @user[:errmsg] = block;
    end

    def set_img_out(&block)
      @user[:img_out] = block;
    end


    def get_elements_by_range(from, to)
      result = []
      @elements_to_position.each_key { |k, value|
        origin = Native(k.origin)
        unless origin.nil?
          el_start = value.first
          el_end = value.last

          if ((to > el_start && from < el_end) || ((to === from) && to === el_end))
            result.push(key)
          end
        end
      }
      result
    end

    private

    #
    # @return [Hash] [startChar: xx, endChar: xx]
    def _id_to_abcelement(id)
      result = {}
      id.match(/(\w+)[ _](\d+)[ _](\d+)[ _](\d+)/) do |matchdata|
        line = matchdata[2].to_i + 1
        startcol = matchdata[3].to_i
        endcol = matchdata[4].to_i
        start_pos = _line_column_to_charpos(line, startcol)
        end_pos = _line_column_to_charpos(line, endcol)
        result = {startChar: start_pos, endChar: end_pos} # todo: refactor to AbcObject
      end

      result
    end

    def _build_charpos_map
      @element_to_position = {}
      Element.find('.abcref').each do |element|
        position = _id_to_abcelement(element.id)
        @element_to_position[element.id] = position
      end
    end

    def _charpos_to_line_column(charpos)
      lines = @abc_source[1, charpos].split("\n")
      line_no = lines.count
      char_pos = lines.last.length()
      return line_no, char_pos
    end

    def _line_column_to_charpos(line, column)
      lines =@abc_source.split("\n")[0, line - 1]
      result = lines.inject(0) { |result, increment| result + increment.length() +1 } + column ## 1 for cr

      result
    end


    def _translate(file_name, abc_source)
      @abc_source = abc_source
      %x{#{@root}.abc_fe(#{file_name}, #{abc_source})}
    end
  end
end