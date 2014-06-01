require 'opal-raphael'
require 'harpnotes'

module Harpnotes

  class RaphaelEngine
    include Harpnotes::Drawing
    attr_reader :paper

    PADDING = 20
    ARROW_SIZE = 10
    JUMPLINE_INDENT = 10
    DOTTED_SIZE = 2

    def initialize(element_id)
      @paper = Raphael::Paper.new(element_id)
      @on_select = nil
    end

    def draw(sheet)
      @paper.clear

      sheet.children.each do |child|
        if child.is_a? Ellipse
          draw_ellipse(child)
        elsif child.is_a? FlowLine
          draw_flowline(child)
        elsif child.is_a? JumpLine
          draw_jumpline(child)
        end
      end
    end

    def on_select(&block)
      @on_select = block
    end

    private

    def draw_ellipse(root)
      e = @paper.ellipse(root.center.first, root.center.last, root.size.first, root.size.last)
      e["fill"] = root.fill == :filled ? "black" : "white"
      if root.dotted?
        x = root.center.first + (root.size.first * 1.2)
        y = root.center.last + (root.size.last * 1.2)
        @paper.ellipse(x, y, DOTTED_SIZE, DOTTED_SIZE)["fill"] = "black"
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

      depth      = @paper.size[1] - (root.level * JUMPLINE_INDENT)

      path  = "M#{endpoint[0]},#{endpoint[1]}L#{depth},#{endpoint[1]}L#{depth},#{startpoint[1]}L#{startpoint[0]},#{startpoint[1]}"
      @paper.path(path)

      arrow = @paper.path("M0,0L#{ARROW_SIZE},#{-0.5 * ARROW_SIZE}L#{ARROW_SIZE},#{0.5 * ARROW_SIZE}L0,0")
      arrow["fill"] = "red"
      arrow.translate(startpoint[0], startpoint[1])
    end
  end

end