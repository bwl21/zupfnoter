module ABC2SVG
  class Abc2Svg


    def initialize()
      @user = {img_out: nil,
               errmsg: nil,
               read_file: nil,
               annoate: true,
               page_format: true
      }

      set_errmsg() do |message, line_number, column_number|
        %{alert(#{message})}
      end

      set_img_out() do |svg|
        %{alert(#{svg})}
      end

      @root = %x{new Abc(#{@user.to_n})}
    end

    def translate(file_name, abc_source)
      `debugger`
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