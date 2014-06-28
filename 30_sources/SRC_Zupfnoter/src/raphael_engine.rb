require 'opal-raphael'
require 'harpnotes'

module Harpnotes

  class RaphaelEngine
    include Harpnotes::Drawing
    attr_reader :paper

    PADDING = 5
    ARROW_SIZE = 10
    JUMPLINE_INDENT = 10
    DOTTED_SIZE = 0.3

    def initialize(element_id, width, height)
      @paper = Raphael::Paper.new(element_id, width, height)
      @paper.enable_pan_zoom
      @on_select = nil
      @elements = {}   # record all elements being on the sheet, using upstream object as key
    end

    def draw(sheet)
      @paper.clear
      @elements = {}   # record all elements being on the sheet, using upstream object as key
      @highlighted = []


      sheet.children.each do |child|
        if child.is_a? Ellipse
          draw_ellipse(child)
        elsif child.is_a? FlowLine
          draw_flowline(child)
        elsif child.is_a? JumpLine
          draw_jumpline(child)
        elsif child.is_a? Harpnotes::Drawing::Rest
          draw_rest(child)
        elsif child.is_a? Harpnotes::Drawing::Annotation
          draw_annotation(child)
        else
          $log.debug "don't know how to draw #{child.class} (#{__FILE__} #{__LINE__})"
          nil
        end
      end
    end

    def on_select(&block)
      @on_select = block
    end

    # hightlights the drawn elements driven by the selection range in the abc text
    def range_highlight(from, to)
      @highlighted.each{|e| unhighlight(e)}
      @highlighted = []

      @elements.each_key { |k|
        origin = Native(k.origin)
        unless origin.nil?
          el_start = Native(k.origin)[:startChar]
          el_end = Native(k.origin)[:endChar]

          if ((to > el_start && from < el_end) || ((to === from) && to === el_end))
            @elements[k].each do |e|
              highlight(e)
              @highlighted << e
            end
          end
        end
      }
    end

    private

    def highlight(element)
      element.unhighlight_color = element[:fill]
      element[:fill]="#ff0000"
      nil
    end

    def unhighlight(element)
      element[:fill]=element.unhighlight_color
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
      end

      e.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end
    end

    def draw_rest(root)
      center = [root.center.first - root.size.first, root.center.last - root.size.last]

      size = root.size.map{|s| 2*s}
      e = @paper.rect(center.first, center.last, size.first, size.last)
      push_element(root.origin, e)
      e["fill"] = root.fill == :filled ? "black" : "white"
      if root.dotted?
        x = root.center.first + (root.size.first * 1.2)
        y = root.center.last + (root.size.last * 1.2)
        e_dot = @paper.ellipse(x, y, DOTTED_SIZE, DOTTED_SIZE)
        e_dot["fill"] = "black"
        push_element(root.origin, e_dot)
      end

      e.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
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

      endpoint   = root.to.center
      endpoint[0] += PADDING

      distance = root.distance
      unless distance.nil?
        depth = endpoint[0] + distance
      else
        depth = @paper.size[1] - (root.level * JUMPLINE_INDENT)
      end

      path  = "M#{endpoint[0]},#{endpoint[1]}L#{depth},#{endpoint[1]}L#{depth},#{startpoint[1]}L#{startpoint[0]},#{startpoint[1]}"
      @paper.path(path)

      arrow = @paper.path("M0,0L#{ARROW_SIZE},#{-0.5 * ARROW_SIZE}L#{ARROW_SIZE},#{0.5 * ARROW_SIZE}L0,0")
      arrow["fill"] = "red"
      arrow.translate(startpoint[0], startpoint[1])
    end

    # Draw an an annotation
    def draw_annotation(root)

      # todo move this style definition to the layout section.
      # Font size is provided in mm while in jspdf it is in point ... We need to keep these definitions in sync
      style_def = {regular: {text_color: [0,0,0], font_size: 4.2, font_style: "normal"},
          large:   {text_color: [0,0,0], font_size: 7.03, font_style: "bold"}
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
      element.translate(0 , element.get_bbox()[:height]/2 - style[:font_size])

    end
  end

end