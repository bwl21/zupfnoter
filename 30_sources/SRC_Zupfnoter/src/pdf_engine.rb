require 'opal-jspdf'
require 'harpnotes'

module Harpnotes

  class PDFEngine
    include Harpnotes::Drawing
    attr_reader :pdf

    PADDING = 4.0
    ARROW_SIZE = 10.0
    JUMPLINE_INDENT = 10.0
    DOTTED_SIZE = 0.3

    X_SPACING = 115.0/10.0

    def initialize()
      @pdf = JsPDF.new(:l, :mm, :a3)
      @pdf.x_offset = 0.0
    end


    def draw_in_segments(sheet)
      delta = -12.0 * X_SPACING
      @pdf = JsPDF.new(:p, :mm, :a4)

      addpage = false
      (0..2).each do |i|
        draw_segment(30 + i * delta , sheet, addpage)
        addpage = true
      end
      @pdf
    end

    def draw(sheet)
      # todo: move this to the layouter
      @pdf.rect(1.0, 1.0, 418, 295)
      @pdf.rect(0.0, 0.0, 420.0, 297.0)

      # the dropmarks are drawn in octave distance
      delta = 12.0 * X_SPACING
      (1..2).each do |i|
        [:top, :bottom].each{|border| draw_cropmark(i, delta, border)}
      end

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
          $log.warn "don't know how to draw #{child.class}"
          nil
        end
      end

      @pdf
    end

    private

    def draw_annotation(root)

      style_def = {regular: {text_color: [0,0,0], font_size: 12, font_style: "normal"},
                   large:   {text_color: [0,0,0], font_size: 20, font_style: "bold"}
              }

      style = style_def[root.style] || style_def[:regular]

      @pdf.text_color = style[:text_color]
      @pdf.font_size  = style[:font_size]
      @pdf.font_style = style[:font_style]
      @pdf.text(root.center.first, root.center.last, root.text)
    end

    def draw_cropmark(i, delta, border)
      v = {:top => [0,7,9], :bottom => [297, 290, 288]}[border]
      hpos = X_SPACING/2.0 + delta * i
      hdiff = X_SPACING/2.0

      @pdf.line([hpos, v.first],  [hpos, v.last])
      @pdf.line([hpos - hdiff, v[1]],  [hpos + hdiff, v[1]])
    end

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


    def draw_segment(x_offset, sheet, newpage = false )
      @pdf.x_offset = x_offset
      @pdf.addPage if newpage
      draw(sheet)
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
      startpoint = root.from.center.clone
      startpoint[0] += PADDING
      startpoint[1] -= PADDING/4.0

      endpoint   = root.to.center.clone
      endpoint[0] += PADDING
      endpoint[1] += PADDING/4.0

      distance = root.distance
      unless distance.nil?
        depth = endpoint[0] + distance
      else
        depth      = 418.0 - (root.level * JUMPLINE_INDENT)  #todo:replace literal
      end

      @pdf.draw = (0...3).map { 0 }  # set the rgb color
      @pdf.line(endpoint, [depth, endpoint[1]])
      @pdf.line([depth, endpoint[1]], [depth, startpoint[1]])
      @pdf.line([depth, startpoint[1]], startpoint)

      @pdf.left_arrowhead(startpoint[0], startpoint[1])
    end
  end

end