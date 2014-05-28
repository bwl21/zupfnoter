
module Raphael

  class Element

    def initialize(r)
      @r = r
    end

    def [](name)
      `self.r.attr(name)`
    end

    def []=(name, value)
      `self.r.attr(name, value)`
    end

    def translate(x, y)
      `self.r.translate(x, y)`
    end

    def on_click(&block)
      %x{
        var wrapper = function(evt) {
          return block.apply(null, arguments);
        };
        self.r.click(wrapper);
      }
    end

  end

  class Paper

    def initialize(element, width, height)
      @r = `Raphael(element, width, height)`
    end

    def clear
      `self.r.clear()`
    end

    def ellipse(x, y, rx, ry)
      Raphael::Element.new(`self.r.ellipse(x, y, rx, ry)`)
    end

    def path(spec)
      Raphael::Element.new(`self.r.path(spec)`)
    end

    def line(x1, y1, x2, y2)
      path("M#{x1},#{y1}L#{x2},#{y2}")
    end

    def text(x, y, text)
      Raphael::Element.new(`self.r.text(x, y, text)`)
    end

    def size
      [ `self.r.canvas.offsetWidth`, `self.r.canvas.offsetHeight` ]
    end

  end

end