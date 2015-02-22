module ABC2SVG
  class Abc2Svg


    def initialize()
      @svgbuf = []
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

    def get_svg
      @svgbuf.join("\n")
    end
    def translate(file_name, abc_source)
      %x{#{@root}.abc_fe(#{file_name}, #{abc_source})}
    end

    def set_errmsg(&block)
      @user[:errmsg] = block;
    end

    def set_img_out(&block)
      @user[:img_out] = block;
    end
  end
end