
#
# This module wraps the API for Raphael
# as long as we need it to render harpnotes
#
# note that the class variable @r is used by
# `self.r` in the native javascript
# of the methods
#
module Raphael

  #
  # This represents a Raphael element
  #
  class Element
    attr_accessor :unhighlight_color
    #
    # Constructor
    #
    # @param r [] The Raphael element
    #
    # @return [type] [description]
    def initialize(r)
      @r = r
    end


    #
    # get a Raphael attribute
    # @param name [String] The name of the attribute
    #
    # @return [String] The value of the attribute
    def [](name)
      `self.r.attr(name)`
    end


    #
    # set the a Raphael attribute
    # @param name [String] The name of the attribute
    # @param value [Object] The value of the attribute
    #
    # @return [type] [description]
    def []=(name, value)
      `self.r.attr(name, value)`
    end


    #
    # Wrap translate
    # @param x [Numeric] horizontal distance
    # @param y [Numeric] vertical distance
    #
    # @return [type] [description]
    def translate(x, y)
      `self.r.translate(x, y)`
    end

    #
    # Wrap transform
    # @param x [Numeric] horizontal distance
    # @param y [Numeric] vertical distance
    #
    # @return [type] [description]
    def transform(cmd)
      `self.r.transform(cmd)`
    end


    #
    # the the size of an object
    # @return [Native Javascript object] see http://raphaeljs.com/reference.html#Element.getBBox
    #
    def get_bbox()
      Native(`self.r.getBBox()`)
    end


    #
    # Add an on_click handler
    # @param block [type] [description]
    #
    # @return [type] [description]
    def on_click(&block)
      %x{
        var wrapper = function(evt) {
          return block.apply(null, arguments);
        };
        self.r.click(wrapper);
      }
    end

  end



  #
  # Wraps Raphael drawing area
  #
  class Paper

    
    #
    # Construtctor
    # @param element [String] The indentifier of the canvas element
    # @param width [Numeric] Width of the canvas in pixels
    # @param height [Numeric] Height of the canvas in pixels
    #
    # @return [type] [description]
    def initialize(element, width, height)
      @r = `Raphael(element, width, height)`
    end

    # @return the native raphael object
    def raw
      @r
    end

    # 
    # Clear the area
    # 
    # @return [type] [description]
    def clear
      `self.r.clear()`
    end

    # Draw an ellipse
    # 
    # @param x [Numeric] x - horizontal coordinate of center
    # @param y [Numeric] y - vertical coordinate of center
    # @param rx [Numeric] rx - horizontal radius
    # @param ry [Numeric] ry - vertical radius
    # 
    # @return [element] The generated Element
    def ellipse(x, y, rx, ry)
      Raphael::Element.new(`self.r.ellipse(x, y, rx, ry)`)
    end

    # 
    # Draw a path
    # 
    # @param spec [String] The path to be drawn
    # see http://raphaeljs.com/reference.html#Paper.path
    # 
    # 
    # @return [Element] The generated Element
    def path(spec)
      Raphael::Element.new(`self.r.path(spec)`)
    end

    # Draw an Rectangle
    # 
    # @param x [Numeric] x - of topleft corner
    # @param y [Numeric] y - of topleft corner
    # @param rx [Numeric] rx - width
    # @param ry [Numeric] ry - height
    # @param radius [Numeric] radius for rounded corners, default is 0
    # 
    # @return [element] The generated Element
    def rect(x, y, rx, ry, radius = 0)
      Raphael::Element.new(`self.r.rect(x, y, rx, ry, radius)`)
    end


    # 
    # Draw a line
    # 
    # @param x1 [Numeric] horiozontal startpoint coordinate
    # @param y1 [Numeric] vertical startpoint coordinate
    # @param x2 [Numeric] horiozontal endpoint coordinate
    # @param y2 [Numeric] vertical endpoint coordinate
    # 
    # @return [Element] The generated Element
    def line(x1, y1, x2, y2)
      path("M#{x1},#{y1}L#{x2},#{y2}")
    end

    # 
    # Draw a text
    # 
    # @param x [Numeric] horiozontal startpoint coordinate
    # @param y [Numeric] horiozontal startpoint coordinate
    # @param text [String] The text to be rendered
    # 
    # @return [Element] The generated Element
    def text(x, y, text, attributes={})
      x = Raphael::Element.new(`self.r.text(x, y, text)`)
    end



    # 
    # Determine the size of the canvas
    # 
    # @return [Array of Numeric] The horizontal, vertical dimensions
    # of the canvas
    def size
      [ `self.r.canvas.offsetWidth`, `self.r.canvas.offsetHeight` ]
    end

    def enable_pan_zoom
      `self.r.panzoom().enable()` if `self.r.panzoom != undefined`
    end

  end

end
