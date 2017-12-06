require 'opal-jspdf'
require 'harpnotes'

module Harpnotes

  class PDFEngine
    include Harpnotes::Drawing
    attr_reader :pdf

    PADDING         = 4.0
    JUMPLINE_INDENT = 10.0
    DOTTED_SIZE     = 0.5 # radius of dot

    # COLORS = {'black' => [0, 0, 0], 'white' => [255, 255, 255], 'grey' => [0, 128, 128], 'lightgrey' => [211, 0, 211], 'darkgrey' => [169,169,0]}
    COLORS = {'black' => [0, 0, 0], 'white' => [255, 255, 255], 'grey' => [128, 128, 128], 'lightgrey' => [211, 211, 211],
              'darkgrey' => [169, 169, 169], 'dimgrey' => [105, 105, 105]}

    #X_SPACING = 115.0/10.0

    def initialize()
      @pdf = JsPDF.new(:l, :mm, :a3)
    end


    def draw_in_segments(sheet)
      delta         = -12.0 * $conf['layout.X_SPACING'] # todo: 12.0 = number of strings per page
      @pdf          = JsPDF.new(:p, :mm, :a4)
      @pdf.y_offset = sheet.printer_config['a4_offset'].last # -5
      addpage       = false
      pages         = sheet.printer_config['a4_pages'] || [0, 1, 2]

      pages.each do |i|
        draw_segment(30 + sheet.printer_config['a4_offset'].first + i * delta, sheet, addpage) # todo: 30 = initial offset
        addpage = true
      end
      @pdf
    end

    def draw(sheet)
      @pdf.x_offset, @pdf.y_offset = sheet.printer_config['a3_offset']
      draw_sheet(sheet)
    end

    # this draws a page setment
    def draw_segment(x_offset, sheet, newpage = false)
      @pdf.x_offset = x_offset
      @pdf.addPage if newpage
      draw_sheet(sheet)
    end


    def draw_sheet(sheet)
      if sheet.printer_config['show_border']
        @pdf.rect(1.0, 1.0, 418, 295)
        @pdf.rect(0.0, 0.0, 420.0, 297.0)
      end

      sheet.children.each do |child|
        @pdf.line_width = child.line_width
        if child.is_a? Ellipse
          draw_ellipse(child) if child.visible?
        elsif child.is_a? FlowLine
          draw_flowline(child) if child.visible?
        elsif child.is_a? Harpnotes::Drawing::Glyph
          draw_glyph(child) if child.visible?
        elsif child.is_a? Harpnotes::Drawing::Path
          draw_path(child) if child.visible?
        elsif child.is_a? Harpnotes::Drawing::Annotation
          draw_annotation(child) if child.visible?
        else
          $log.error "BUG: don't know how to draw #{child.class} (#{__FILE__} #{__LINE__})"
          nil
        end
      end

      @pdf
    end

    private

    def draw_annotation(root)

      #todo: reference to FONT_STYLE_DEF is not ok here.
      style        = $conf.get('layout.FONT_STYLE_DEF')[root.style] || $conf.get('layout.FONT_STYLE_DEF')[:regular]
      mm_per_point = $conf.get('layout.MM_PER_POINT')

      @pdf.text_color = style[:text_color]
      @pdf.font_size  = style[:font_size]
      @pdf.font_style = style[:font_style]
      # + style ... we shift it up by the fontsize converted from point to mm by mm_per_point
      text = root.text.gsub(/(\\?)(~)/){|m|  m[0]=='\\' ? m[1] : ' '}
      @pdf.text(root.center.first, root.center.last + style[:font_size] * mm_per_point, text)
    end


    def draw_ellipse(root)

      color           = COLORS[root.color]
      style           = root.filled? ? :F : :FD
      size            = root.size
      @pdf.line_width = 0
      @pdf.stroke     = color
      @pdf.fill       = root.filled? ? color : COLORS['white']
      if root.rect?
        @pdf.rect_like_ellipse(root.center, size, style)
      else
        @pdf.ellipse(root.center, size, style)
      end


      unless root.fill == :filled
        @pdf.line_width = root.line_width
        size            = size.map {|s| s - root.line_width / 2}
        if root.rect?
          @pdf.rect_like_ellipse(root.center, size, style)
        else
          @pdf.ellipse(root.center, size, style)
        end
      end


      if root.dotted?
        draw_the_dot(root)
      end

      if root.hasbarover
        draw_the_barover(root)
      end

      @pdf.stroke = COLORS['black']
      @pdf.fill   = COLORS['black']
    end

    def draw_glyph(root)

      style     = root.filled? :FD, :FD
      @pdf.fill = (0...3).map {root.filled? ? 0 : 128}

      center      = [root.center.first - root.size.first, root.center.last - root.size.last]
      center      = [root.center.first, root.center.last]
      size        = [root.size.first * 2, root.size.last * 2] # size to be treated as radius
      scalefactor = size.last / root.glyph[:h] # drawing = glyph * scalefactor
      boundingbox = [root.glyph[:w], root.glyph[:h]]
      glyph_size  = [root.glyph[:w], root.glyph[:h]].map {|e| e/2 * scalefactor}


      # draw a white background
      color       = COLORS['white']
      @pdf.fill   = color
      @pdf.stroke = color
      @pdf.rect_like_ellipse(root.center, root.size, :FD)


      # turn this on to draw background
      #@pdf.fill = [255, 0, 0]
      #@pdf.stroke = [0, 0, 0]
      #@pdf.rect_like_ellipse(root.center, glyph_size, '')


      # draw th path

      color       = COLORS[root.color]
      @pdf.fill   = color
      @pdf.stroke = color

      scale           = [scalefactor, scalefactor]
      lines           = []
      start           = []
      @pdf.line_width = 0.0001 # todo: this was experimental ...
      root.glyph[:d].each do |element|
        case element.first
          when "M"
            lines = []

            start = [center.first + (element[1] * scale.first),
                     center.last + (element[2] * scale.last)]
            @pdf.lines(lines, start.first, start.last, scale, "FD", false) unless lines.empty?

          when "l"
            lines.push element[1 .. -1]
          when "m"
            lines.push element[1 .. -1]
          when "c"
            lines.push element[1 .. -1]
          when "z"
            @pdf.lines(lines, start.first, start.last, scale, "FD", true) unless lines.empty?
            lines = []
          else
            $log.error("BUG: unsupported Pdf Path command '#{element.first}' in glyph (#{__FILE__} #{__LINE__})")
        end
      end
      @pdf.stroke = [0, 0, 0] # why this?

      # add the dot if needed
      if root.dotted?
        draw_the_dot(root)
      end

      if root.hasbarover?
        draw_the_barover(root)
      end

    end

    def draw_the_dot(root)
      #@pdf.fill = (0...3).map { 0 }
      #@pdf.ellipse(root.center.zip(root.size).map { |s| a, b = s; a + b + 0.7 }, [DOTTED_SIZE, DOTTED_SIZE], :F)

      color = COLORS[root.color]
      ds1   = DOTTED_SIZE + root.line_width # distance of dot
      ds2   = DOTTED_SIZE + root.line_width/2 # size of white dot
      x     = root.center.first + (root.size.first + ds1)
      y     = root.center.last

      @pdf.line_width = 0
      @pdf.fill       = [255, 255, 255] # this needs to be white
      @pdf.stroke     = [255, 255, 255]
      @pdf.ellipse([x, y], [ds2, ds2], :FD)

      @pdf.fill   = color
      @pdf.stroke = color

      @pdf.ellipse([x, y], [DOTTED_SIZE, DOTTED_SIZE], :FD)
    end


    def draw_the_barover(root)
      @pdf.fill  = COLORS[root.color]
      new_center = [root.center.first, root.center.last - root.size.last - 1.3 * root.line_width]
      new_size   = [root.size.first, 0.2] # pdf shows rectangle of height 0
      @pdf.rect_like_ellipse(new_center, new_size, :F)
    end


    #
    # Draw a Flowline to indicate the flow of the music. It indicates
    # the sequence in which the notes are played
    #
    # @param root [type] [description]
    #
    # @return [type] [description]
    def draw_flowline(root)
      color          = COLORS[root.color]
      @pdf.stroke    = color
      #@pdf.draw = (0...3).map { root.dashed? ? 128 : 0 }
      @pdf.line_dash = 3 if root.dashed?
      @pdf.line_dash = 6 if root.dotted?
      @pdf.line(root.from.center, root.to.center)
      @pdf.use_solid_lines #if root.dashed? # reset dashing
    end

    #
    # Draw a Jump line to indicate that the music is to be continued at another beat
    # @param root [Drawing::Jumpline] The jumpline to be drawn
    #
    # @return [nil] nothing
    def draw_jumpline(root)
      startpoint    = root.from.center.clone
      startpoint[0] += PADDING
      startpoint[1] -= PADDING/4.0

      endpoint    = root.to.center.clone
      endpoint[0] += PADDING
      endpoint[1] += PADDING/4.0

      distance = root.distance
      unless distance.nil?
        depth = endpoint[0] + distance
      else
        depth = 418.0 - (root.level * JUMPLINE_INDENT) #todo:replace literal
      end

      @pdf.stroke = (0...3).map {0} # set the rgb color
      @pdf.line(endpoint, [depth, endpoint[1]])
      @pdf.line([depth, endpoint[1]], [depth, startpoint[1]])
      @pdf.line([depth, startpoint[1]], startpoint)

      @pdf.left_arrowhead(startpoint[0], startpoint[1])
    end


    # draw a path
    # documentation see raphaeljs
    # todo: fully support absolute and relative commands
    def draw_path(root)
      lines       = []
      scale       = [1, 1]
      start       = []
      style       = root.filled? ? :FD : ""
      color       = COLORS[root.color]
      @pdf.fill   = root.filled? ? color : COLORS['white']
      @pdf.stroke = color

      root.path.each do |element|
        case element.first
          when "M"
            @pdf.lines(lines, start.first, start.last, scale, style, false) unless lines.empty?
            lines = []
            start = element[1 .. 2]
          when "L"
            new_start = [[start], lines].flatten(1).inject([0, 0]) {|i, o| [o[0] + i[-2], o[1] + i[-1]]}
            @pdf.lines(lines, start.first, start.last, scale, style, false) unless lines.empty?
            lines = []
            start = new_start
            lines.push [element[1] - new_start.first, element[2] - new_start.last]
          when "l"
            lines.push element[1 .. -1]
          when "c"
            lines.push element[1 .. -1]
          when "z"
            @pdf.lines(lines, start.first, start.last, scale, "FD", true) unless lines.empty?
            lines = []
          else
            $log.error("BUG: unsupported command '#{element.first}' in glyph (#{__FILE__} #{__LINE__})")
        end
      end
      @pdf.lines(lines, start.first, start.last, scale, style, false) unless lines.empty?
    end
  end

end