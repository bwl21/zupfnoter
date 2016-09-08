require 'opal-raphael'
require 'harpnotes'

module Harpnotes

  class RaphaelEngine
    include Harpnotes::Drawing
    attr_reader :paper

    PADDING         = 5
    ARROW_SIZE      = 1.0
    JUMPLINE_INDENT = 10
    DOTTED_SIZE     = 0.3

    def initialize(element_id, width, height)
      @container_id = element_id
      @paper        = Raphael::Paper.new(element_id, width, height)
      #@paper.enable_pan_zoom
      @on_select    = nil
      @elements     = {} # record all elements being on the sheet, using upstream object as key
      @highlighted  = []
    end

    def set_view_box(x, y, width, height)
      @paper.set_view_box(x, y, width, height, true)
    end

    def draw(sheet)
      @paper.clear
      @elements    = {} # record all elements being on the sheet, using upstream object as key
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
          $log.error "BUG:don't know how to draw #{child.class} (#{__FILE__} #{__LINE__})"
          nil
        end
      end
    end

    def on_select(&block)
      @on_select = block
    end

    def on_mouseover(&block)
      @paper.on_mouseover do |info|
        block.call(Native(info))
      end
    end

    def on_mouseout(&block)
      @paper.on_mouseout do |info|
        block.call(Native(info))
      end
    end

    def on_annotation_drag_end(&block)
      @paper.on_annotation_drag_end do |info|
        block.call(Native(info))
      end
    end

    def on_draggable_rightcklick(&block)
      @paper.on_draggable_rightclick do |info|
        block.call(Native(info))
      end
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
      range  = [from, to].sort()
      @elements.each_key { |k|
        origin = Native(k.origin)
        unless origin.nil?
          noterange = [:startChar, :endChar].map { |c| Native(k.origin)[c] }.sort # todo: this should be done in abc2harpnotes
          if (range.first - noterange.last) * (noterange.first - range.last) > 0
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
      @x = 0 unless @x
      %x{
            var node = #{element}.r;
            var bbox = node.getBBox();
            var top = bbox.y + bbox.y2;
            top = 100 * Math.floor(top/100);
            $("#"+#{@container_id}).get(0).scrollTop=top;
      }
      element.unhighlight_color = element[:fill]
      element[:fill]            ="#ff0000"
      element[:stroke]          ="#ff0000"
      nil
    end

    def unhighlight_element(element)
      if @highlighted.include?(element)
        @highlighted     -= [element]
        element[:fill]   = element.unhighlight_color
        element[:stroke] = "#000000"
      end
      nil
    end


    def push_element(root, element)
      @elements[root] ||= []
      @elements[root] << element
    end

    def draw_ellipse(root)
      if root.rect?
        e = @paper.rect(root.center.first - root.size.first, root.center.last - root.size.last, 2 * root.size.first, 2 * root.size.last)
      else
        e = @paper.ellipse(root.center.first, root.center.last, root.size.first, root.size.last)
      end
      push_element(root.origin, e)

      e["fill"] = root.fill == :filled ? "black" : "white"
      if root.dotted?
        draw_the_dot(root)
      end

      if root.hasbarover?
        draw_the_barover(root)
      end

      e.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end
    end

    def draw_glyph(root)
      center     = [root.center.first, root.center.last]
      size       = [root.size.first * 2, root.size.last * 2] # size to be treated as radius

      line_width = root.line_width
      @paper.line_width = 0.1

      #path_spec = "M#{center.first} #{center.last}"
      path_spec  = path_to_raphael(root.glyph[:d])
      #path_spec = self.glyph_to_path_spec(root.glyph)

      # draw a white background
      e          = @paper.rect(root.center.first, root.center.last - size.last, size.first, size.last)
      e[:fill]   = "white"
      e[:stroke] = "white"
      e.transform("t-#{size.first/2} #{size.last/2}")

      # draw th path
      e        = @paper.path(path_spec)
      e[:fill] = "black"
      push_element(root.origin, e)

      e.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end


      # scale and move the glyph
      bbox         = e.get_bbox()
      glyph_center = [(bbox[:x] + bbox[:x2])/2, (bbox[:y] + bbox[:y2])/2]
      scalefactor  = size.last / bbox[:height]
      e.transform("t#{(center.first)} #{(center.last)}t#{(-glyph_center.first)} #{(-glyph_center.last)}s#{scalefactor}")

      @paper.line_width = line_width

      # add the dot if needed
      if root.dotted?
        draw_the_dot(root)
      end

      if root.hasbarover?
        draw_the_barover(root)
      end

      # make annotation draggable
      if root.conf_key
        @paper.draggable(e)
        e.conf_key   = root.conf_key
        e.conf_value = root.conf_value
      end
    end

    def draw_the_barover(root)
      e_bar = @paper.rect(root.center.first - root.size.first, root.center.last - root.size.last - 1.3 * root.line_width, 2 * root.size.first, 0.0001) # svg does not show if heigt=0
      e_bar.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end
      push_element(root.origin, e_bar)
    end

    # this draws the dot to an ellipse or glyph
    def draw_the_dot(root)
      ds1             = DOTTED_SIZE + root.line_width
      ds2             = DOTTED_SIZE + root.line_width/2
      x               = root.center.first + (root.size.first + ds1)
      y               = root.center.last
      e_dot           = @paper.ellipse(x, y, ds2, ds2)
      e_dot["stroke"] = "white"
      e_dot["fill"]   = "white"
      push_element(root.origin, e_dot)

      e_dot         = @paper.ellipse(x, y, DOTTED_SIZE, DOTTED_SIZE)
      e_dot["fill"] = "black"
      push_element(root.origin, e_dot)

      e_dot.on_click do
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
      l                     = @paper.line(root.from.center[0], root.from.center[1], root.to.center[0], root.to.center[1])
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
      startpoint    = root.from.center
      startpoint[0] += PADDING

      endpoint    = root.to.center
      endpoint[0] += PADDING

      distance = root.distance
      unless distance.nil?
        depth = endpoint[0] + distance
      else
        depth = 420 - (root.level * JUMPLINE_INDENT) # todo replace literal
      end

      path = "M#{endpoint[0]},#{endpoint[1]}L#{depth},#{endpoint[1]}L#{depth},#{startpoint[1]}L#{startpoint[0]},#{startpoint[1]}"
      @paper.path(path)

      arrow         = @paper.path("M0,0L#{ARROW_SIZE},#{-0.5 * ARROW_SIZE}L#{ARROW_SIZE},#{0.5 * ARROW_SIZE}L0,0")
      arrow["fill"] = "red"
      arrow.translate(startpoint[0], startpoint[1])
    end

    # Draw an an annotation
    def draw_annotation(root)

      style        = $conf.get('layout.FONT_STYLE_DEF')[root.style] || $conf.get('layout.FONT_STYLE_DEF')[:regular]
      mm_per_point = $conf.get('layout.MM_PER_POINT')

      text                    = root.text.gsub(/\ +\n/, "\n").gsub("\n\n", "\n \n")
      element                 = @paper.text(root.center.first, root.center.last, text)
      element[:"font-size"]   = 1 #; style[:font_size]
      element[:"font-weight"] = style[:font_style]
      element[:"text-anchor"] = "start"

      # getting the same adjustment as in postscript
      # in raphael, the center of the  text is vertically the anchor point, so we need to shift it up by half of the size
      # we fix this by computing the bounding box

      # first we scale the text
      scaley                  = style[:font_size] / 3 #* should be mm_per_point; but i had to figure it out by try and error
      scalex                  = scaley * 45/42.5 # figured out by try and error - adjust the differnt horitzontal font spacing
      element.transform("s#{scalex},#{scaley}")

      # then we measure the result
      bbox        = element.get_bbox()
      #$log.debug(%Q(#{root.center.first}, #{root.center.last} ”#{text}” #{bbox[:width]}, #{bbox[:height]} (#{__FILE__} #{__LINE__})))

      dx          = root.center.first - bbox[:x]
      dy          = root.center.last - bbox[:y]

      # finally we transform the result
      translation ="s#{scalex},#{scaley}T#{dx},#{dy}"
      element.transform(translation)

      # make annotation draggable
      if root.conf_key
        @paper.draggable(element)
        element.conf_key   = root.conf_key
        element.conf_value = root.conf_value
      end
      element.startpos = root.center

      element

    end

    # draw a path
    def draw_path(root)
      path_spec = path_to_raphael(root.path)
      #@paper.path(path_spec)
      e         =@paper.path(path_spec)
      e[:fill]  = "#000000" if root.filled?
    end
  end

end