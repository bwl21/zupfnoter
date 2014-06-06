require 'opal-jspdf'
require 'harpnotes'

module Harpnotes

  class PDFEngine
    include Harpnotes::Drawing
    attr_reader :pdf

    PADDING = 4
    ARROW_SIZE = 10
    JUMPLINE_INDENT = 10
    DOTTED_SIZE = 0.3

    def initialize()
      @pdf = JsPDF.new(:l, :mm, :a3)
      @pdf.rect(1, 1, 418, 295)
      @pdf.text_color=[200,200,200]
      @pdf.text(10, 10, 'powered by Zupfnoter')
    end

    def draw(sheet)
      sheet.children.each do |child|
        if child.is_a? Ellipse
          draw_ellipse(child)
        elsif child.is_a? FlowLine
          draw_flowline(child)
        elsif child.is_a? JumpLine
          draw_jumpline(child)
        elsif child.is_a? Harpnotes::Drawing::Rest
          draw_rest(child)
        else
          puts "don't know how to draw #{child.class}"
          nil
        end
      end

      @pdf
    end

    private

    def draw_ellipse(root)
      style = root.filled? ? :F : :FD
      @pdf.fill = (0...3).map { root.filled? ? 0 : 255 }
      @pdf.ellipse(root.center, root.size, style)

      if root.dotted?
        @pdf.fill = (0...3).map { 0 }
        @pdf.ellipse(root.center.zip(root.size).map {|s| a, b = s; a + b * 1.5 }, [DOTTED_SIZE,DOTTED_SIZE], :F)
      end
    end

    def draw_rest(root)
      style = root.filled? ? :F : :FD
      @pdf.fill = (0...3).map { root.filled? ? 0 : 255 }
      center = [root.center.first - root.size.first, root.center.last - root.size.last]
      size = root.size.map{|s| 2.0 * s}
      @pdf.rect_like_ellipse(center, size, style)

      if root.dotted?
        @pdf.fill = (0...3).map { 0 }
        @pdf.ellipse(root.center.zip(root.size).map {|s| a, b = s; a + b * 1.5 }, [DOTTED_SIZE,DOTTED_SIZE], :F)
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
      #@pdf.draw = (0...3).map { root.dashed? ? 128 : 0 }
      @pdf.line_dash = 3 if root.dashed?
      @pdf.line(root.from.center, root.to.center)
      @pdf.use_solid_lines if root.dashed?
    end

    #
    # Draw a Jump line to indicate that the music is to be continued at another beat
    # @param root [Drawing::Jumpline] The jumpline to be drawn
    #
    # @return [nil] nothing
    def draw_jumpline(root)
      startpoint = root.from.center
      startpoint[0] += PADDING
      startpoint[1] -= PADDING/4

      endpoint   = root.to.center
      endpoint[0] += PADDING
      endpoint[1] += PADDING/4

      depth      = 418 - (root.level * JUMPLINE_INDENT)

      @pdf.draw = (0...3).map { 0 }
      @pdf.line(endpoint, [depth, endpoint[1]])
      @pdf.line([depth, endpoint[1]], [depth, startpoint[1]])
      @pdf.line([depth, startpoint[1]], startpoint)
    end
  end

end