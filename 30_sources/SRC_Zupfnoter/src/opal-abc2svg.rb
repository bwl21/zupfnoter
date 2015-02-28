module ABC2SVG
  class Abc2Svg


    def initialize(div, options={})
      @on_select = lambda { |element|}
      @printer = div
      @svgbuf = []
      @abc_source = ''
      @element_to_position = {}
      @user = {img_out: nil,
               errmsg: nil,
               read_file: nil,
               annotate: true,
               page_format: true
      }

      set_callback(:errmsg) do |message, line_number, column_number|
        $log.error(message)
      end

      set_callback(:img_out) do |svg|
        @svgbuf.push svg
      end

      set_callback(:anno_start) do |type, start, stop, x, y, w, h|
         _anno_start(type, start, stop, x, y, w, h)
      end

      set_callback(:anno_stop) do |type, start, stop, x, y, w, h|
        _anno_stop(type, start, stop, x, y, w, h)
      end

      @root = %x{new Abc(#{@user.to_n})}
    end

    def range_highlight(from, to)
      unhighlight_all()
      range_highlight_more(from, to)
      nil
    end

    def range_highlight_more(from, to)
      get_elements_by_range(from, to).each do |id|
        foo = Element.find("##{id}")
        classes = [foo.attr('class').split(" "), 'highlight'].flatten.uniq.join(" ")
        foo.attr('class', classes)
      end
      nil
    end

    def range_unhighlight_more(from, to)
      get_elements_by_range(from, to).each do |id|
        foo = Element.find("##{id}")
        classes = foo.attr('class').gsub("highlight", '')
        foo.attr('class', classes)
      end
    end

    def unhighlight_all()
      Element.find('.highlight').attr('class', 'abcref')
    end


    def on_select(&block)
      @on_select = block
      _set_on_select()
    end

    def draw(abc_code)
      _translate("abc", abc_code)
      @printer.html(get_svg())
      _set_on_select();
      nil
    end

    def get_svg
      @svgbuf.join("\n")
    end


    def set_callback(event, &block)
      @user[event] = block;
    end


    def get_elements_by_range(from, to)
      range = [from,to].sort
      result = []
      @element_to_position.each { |k, value|
        noterange = [:startChar, :endChar].map{|c| value[c]}.sort

        if (range.first - noterange.last) * (noterange.first - range.last) > 0
          result.push(k)
        end
      }
      result
    end

    private


    def _anno_start(music_type, start_offset, stop_offset, x, y, w, h)
      id = _mk_id(music_type, start_offset, stop_offset)
      %x{
      #{@root}.out_svg('<g class="' + #{id} +'">\n')
      }
    end

    def _anno_stop(music_type, start_offset, stop_offset, x, y, w, h)
      id = _mk_id(music_type, start_offset, stop_offset)
      %x{
          // close the container
          #{@root}.out_svg('</g>\n');
          // create a rectangle
          #{@root}.out_svg('<rect class="abcref" id="' + #{id} +'" x="');
          #{@root}.out_sxsy(#{x}, '" y="', #{y});
          #{@root}.out_svg('" width="' + #{w}.toFixed(2) +
            '" height="' + #{h}.toFixed(2) + '"/>\n')
        }
      @element_to_position[id] = {startChar: start_offset, endChar: stop_offset}

    end


    def _mk_id(music_type, start_offset, end_offset)
      "_#{music_type}_#{start_offset}_#{end_offset}_"
    end


    def _set_on_select()
      Element.find('.abcref').on(:click) do |evt|
        evt.stop_propagation
        @on_select.call(@element_to_position[evt.current_target.id])
        nil
      end
    end


    def _translate(file_name, abc_source)
      @abc_source = abc_source
      @element_to_position = {}
      @svgbuf = []
      %x{
      #{@root}.tosvg(#{file_name}, #{abc_source});
      }
    end
  end
end