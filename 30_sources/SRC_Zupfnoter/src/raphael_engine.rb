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
          $log.debug "don't know how to draw #{child.class} (#{__FILE__} #{__LINE__})"
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
      l["stroke-dasharray"] = "-" if root.style == :dashed
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

      # todo move this style definition to the layout section.
      # Font size is provided in mm while in jspdf it is in point ... We need to keep these definitions in sync
      style_def = {
          smaller: {text_color: [0, 0, 0], font_size: 2.1, font_style: "normal"},
          small: {text_color: [0, 0, 0], font_size: 3.1, font_style: "normal"},
          regular: {text_color: [0, 0, 0], font_size: 4.2, font_style: "normal"},
          large: {text_color: [0, 0, 0], font_size: 7.03, font_style: "bold"}
      }

      style = style_def[root.style] || style_def[:regular]

      element = @paper.text(root.center.first, root.center.last, root.text)
      element[:"font-size"] = style[:font_size]
      element[:"font-weight"] = style[:font_size]
      element[:"text-anchor"] = "start"

      # getting the same adjustment as in postscript
      # the center of the  text is vertically is a the anchor point, so we need to shift it up by half of the size
      # then achorpoint in ps is the baseline of the text, so we need to shift it up again by font size
      # todo this is a dependency to jspdf which I don't relly like
      #
      element.translate(0, element.get_bbox()[:height]/2 - style[:font_size])

    end

    # draw a path
    def draw_path(root)
      path_spec = path_to_raphael(root.path)
      @paper.path(path_spec)
    end
  end

end