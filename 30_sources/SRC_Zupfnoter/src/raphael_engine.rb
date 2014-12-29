require 'opal-raphael'
require 'harpnotes'

module Harpnotes

  class RaphaelEngine
    include Harpnotes::Drawing
    attr_reader :paper

    PADDING = 5
    ARROW_SIZE = 1.0
    JUMPLINE_INDENT = 10
    DOTTED_SIZE = 0.3

    def initialize(element_id, width, height)
      @paper = Raphael::Paper.new(element_id, width, height)
      #@paper.enable_pan_zoom
      @on_select = nil
      @elements = {} # record all elements being on the sheet, using upstream object as key
      @highlighted = []
    end

    def set_view_box(x, y, width, height)
      @paper.set_view_box(x, y, width, height, true)
    end

    def draw(sheet)
      @paper.clear
      @elements = {} # record all elements being on the sheet, using upstream object as key
      @highlighted = []
      @paper.rect(1.0, 1.0, 418, 295)
      @paper.rect(0.0, 0.0, 420.0, 297.0)


      sheet.children.each do |child|
        @paper.line_width = child.line_width
        if child.is_a? Ellipse
          draw_ellipse(child) if child.visible?
        elsif child.is_a? FlowLine
          draw_flowline(child) if child.visible?
        elsif child.is_a? Harpnotes::Drawing::Glyph
          draw_glyph(child) if child.visible?
        elsif child.is_a? Harpnotes::Drawing::Annotation
          draw_annotation(child) if child.visible?
        elsif child.is_a? Harpnotes::Drawing::Path
          draw_path(child) if child.visible?
        else
          $log.debug "BUG:don't know how to draw #{child.class} (#{__FILE__} #{__LINE__})"
          nil
        end
      end
    end

    def on_select(&block)
      @on_select = block
    end


    # remove all hightlights
    def unhighlight_all()
      @highlighted.each { |e| unhighlight_element(e) }
    end

    # hightlights the drawn elements driven by the selection range in the abc text
    def range_highlight(from, to)
      get_elements_by_range(from, to).each { |element| highlight_element(element) }
    end

    # hightlights the drawn elements driven by the selection range in the abc text
    def range_unhighlight(from, to)
      get_elements_by_range(from, to).each { |element| unhighlight_element(element) }
    end


    private

    def path_to_raphael(path)
      result = path.inject("") do |result, element|
        result += element.first
        result += element[1 .. -1].join(" ")
      end
      result
    end

    def get_elements_by_range(from, to)
      result = []
      @elements.each_key { |k|
        origin = Native(k.origin)
        unless origin.nil?
          el_start = Native(k.origin)[:startChar]
          el_end = Native(k.origin)[:endChar]

          if ((to > el_start && from < el_end) || ((to === from) && to === el_end))
            @elements[k].each do |e|
              result.push(e)
            end
          end
        end
      }
      result
    end

    def highlight_element(element)
      unhighlight_element(element)
      @highlighted.push(element)
      element.unhighlight_color = element[:fill]
      element[:fill]="#ff0000"
      element[:stroke]="#ff0000"
      nil
    end

    def unhighlight_element(element)
      if @highlighted.include?(element)
        @highlighted -= [element]
        element[:fill] = element.unhighlight_color
        element[:stroke] = "#000000"
      end
      nil
    end


    def push_element(root, element)
      @elements[root] ||= []
      @elements[root] << element
    end

    def draw_ellipse(root)
      e = @paper.ellipse(root.center.first, root.center.last, root.size.first, root.size.last)
      push_element(root.origin, e)

      e["fill"] = root.fill == :filled ? "black" : "white"
      if root.dotted?
        x = root.center.first + (root.size.first * 1.2)
        y = root.center.last + (root.size.last * 1.2)
        e_dot = @paper.ellipse(x, y, DOTTED_SIZE, DOTTED_SIZE)
        e_dot["fill"] = "black"
        push_element(root.origin, e_dot)

        e_dot.on_click do
          origin = root.origin
          @on_select.call(origin) unless origin.nil? or @on_select.nil?
        end
      end

      e.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end


    end

    def draw_glyph(root)

      def glyph_to_path_spec(glyph)
        result = ""
        glyph[:d].each do |part|
          result += part.first
          result += part[1 .. -1].join(" ")
        end
        result
      end

      center = [root.center.first, root.center.last]
      size = [root.size.first, root.size.last] # size to be treated as radius

      #path_spec = "M#{center.first} #{center.last}"
      path_spec = path_to_raphael(root.glyph[:d])
      #path_spec = self.glyph_to_path_spec(root.glyph)

      # draw a white background
      e = @paper.rect(root.center.first, root.center.last - size.last, size.first, size.last)
      e[:fill] = "white"
      e[:stroke] = "white"
      e.transform("t-#{size.first/2} #{size.last/2}")

      # draw th path
      e = @paper.path(path_spec)
      e[:fill] = "black"
      push_element(root.origin, e)

      e.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end


      # scale and move the glyph
      bbox = e.get_bbox()
      glyph_center = [(bbox[:x] + bbox[:x2])/2, (bbox[:y] + bbox[:y2])/2]
      scalefactor = size.last / bbox[:height]
      e.transform("t#{(center.first)} #{(center.last)}t#{(-glyph_center.first)} #{(-glyph_center.last)}s#{scalefactor}")

      # add the dot if needed
      if root.dotted?
        bbox = e.get_bbox()
        x = bbox[:x2] + 0.5
        y = bbox[:y2] + 0.5
        e_dot = @paper.ellipse(x, y, DOTTED_SIZE, DOTTED_SIZE)
        e_dot["fill"] = "black"
        push_element(root.origin, e_dot)

        e_dot.on_click do
          origin = root.origin
          @on_select.call(origin) unless origin.nil? or @on_select.nil?
        end
      end
    end


    # 
    # Draw a Flowline to indicate the flow of the music. It indicates
    # the sequence in which the notes are played
    # 
    # @param root [type] [description]
    # 
    # @return [type] [description]
    def draw_flowline(root)
      l = @paper.line(root.from.center[0], root.from.center[1], root.to.center[0], root.to.center[1])
      # see http://stackoverflow.com/questions/10940316/how-to-use-attrs-stroke-dasharray-stroke-linecap-stroke-linejoin-in-raphaeljs
      l["stroke-dasharray"] = "-" if root.style == :dashed
      l["stroke-dasharray"] = ". " if root.style == :dotted
    end

    # 
    # Draw a Jump line to indicate that the music is to be continued at another beat
    # @param root [Drawing::Jumpline] The jumpline to be drawn
    # 
    # @return [nil] nothing
    def draw_jumpline(root)
      startpoint = root.from.center
      startpoint[0] += PADDING

      endpoint = root.to.center
      endpoint[0] += PADDING

      distance = root.distance
      unless distance.nil?
        depth = endpoint[0] + distance
      else
        depth = 420 - (root.level * JUMPLINE_INDENT) # todo replace literal
      end

      path = "M#{endpoint[0]},#{endpoint[1]}L#{depth},#{endpoint[1]}L#{depth},#{startpoint[1]}L#{startpoint[0]},#{startpoint[1]}"
      @paper.path(path)

      arrow = @paper.path("M0,0L#{ARROW_SIZE},#{-0.5 * ARROW_SIZE}L#{ARROW_SIZE},#{0.5 * ARROW_SIZE}L0,0")
      arrow["fill"] = "red"
      arrow.translate(startpoint[0], startpoint[1])
    end

    # Draw an an annotation
    def draw_annotation(root)

      style = Harpnotes::Layout::Default::FONT_STYLE_DEF[root.style] || Harpnotes::Layout::Default::FONT_STYLE_DEF[:regular]
      mm_per_point = Harpnotes::Layout::Default::MM_PER_POINT

      text = root.text.gsub("\n\n", "\n \n")
      element = @paper.text(root.center.first, root.center.last, text)
      element[:"font-size"] = 1 #; style[:font_size]
      element[:"font-weight"] = style[:font_style]
      element[:"text-anchor"] = "start"

      # getting the same adjustment as in postscript
      # in raphael, the center of the  text is vertically the anchor point, so we need to shift it up by half of the size
      # we fix this by computing the bounding box

      # first we scale the text
      scaley = style[:font_size] / 3 #* should be mm_per_point; but i had to figure it out by try and error
      scalex = scaley * 45/42.5      # figured out by try and error - adjust the differnt horitzontal font spacing
      element.transform("s#{scalex},#{scaley}")

      # then we measure the result
      bbox = element.get_bbox()
      $log.debug(%Q(#{root.center.first}, #{root.center.last} ”#{text}” #{bbox[:width]}, #{bbox[:height]} (#{__FILE__} #{__LINE__})))

      dx = root.center.first - bbox[:x]
      dy = root.center.last - bbox[:y]

      # finally we transform the result
      translation ="s#{scalex},#{scaley}T#{dx},#{dy}"
      element.transform(translation)
      element
      #element.translate(0, element.get_bbox()[:height]/2 - style[:font_size])

    end

    # draw a path
    def draw_path(root)
      path_spec = path_to_raphael(root.path)
      #@paper.path(path_spec)
      e=@paper.path(path_spec)
      e[:fill] = "#000000" if root.filled?
    end
  end

end