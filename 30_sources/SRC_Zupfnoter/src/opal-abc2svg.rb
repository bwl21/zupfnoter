module ABC2SVG
  class Abc2Svg


    def initialize(div, options={ mode: :svg })
      @on_select           = lambda { |element| }
      @printer             = div
      @svgbuf              = []
      @abc_source          = ''
      @element_to_position = {}
      @user                = { img_out:     nil,
                               errmsg:      nil,
                               read_file:   nil,
                               annotate:    true,
                               page_format: true
      }

      set_callback(:errmsg) do |message, line_number, column_number|
        #todo handle produce startpos / endpos
        $log.error(message,  [line_number+1, column_number+1])
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

      set_callback(:get_abcmodel) do |tsfirst, voice_tb, anno_type|
        # _get_abcmodel(tsfirst, voice_tb, anno_type)
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
        element = Element.find("##{id}")

        %x{#{element}.parents('svg').get(0).scrollIntoView()}
        classes = [element.attr('class').split(" "), 'highlight'].flatten.uniq.join(" ")
        element.attr('class', classes)
      end
      nil
    end

    def range_unhighlight_more(from, to)
      get_elements_by_range(from, to).each do |id|
        foo     = Element.find("##{id}")
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
      range  = [from, to].sort
      result = []
      @element_to_position.each { |k, value|
        noterange = [:startChar, :endChar].map { |c| value[c] }.sort

        if (range.first - noterange.last) * (noterange.first - range.last) > 0
          result.push(k)
        end
      }
      result
    end

    private


    def _get_abcmodel(tsfirst, voice_tb, music_types)
      tune          = { voices: [] }
      tune[:voices] = Native(voice_tb).map { |v|
        curnote = Native(Native(v)[:sym])
        result  = []
        while curnote do
          nextnote         = curnote[:next]
          curnote[:next]   =nil
          curnote[:prev]   =nil
          curnote[:ts_next]=nil
          curnote[:ts_prev]=nil
          result << curnote.to_n;
          curnote = nextnote
        end
        puts result.to_json
        result
      }
    end


    def _get_charpos(abc_source, line, column)
      lines = @abc_source.split("\n")
      result = lines[0 .. line].inject(0) { |r, v| r += v.length }
      result + column
    end

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
      @element_to_position[id] = { startChar: start_offset, endChar: stop_offset }

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
      @abc_source          = abc_source
      @element_to_position = {}
      @svgbuf              = []
      %x{
      #{@root}.tosvg(#{file_name}, #{@abc_source});
      }
    end
  end
end