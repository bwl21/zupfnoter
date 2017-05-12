require 'opal-svg'
require 'harpnotes'

module Harpnotes

  class SvgEngine
    include Harpnotes::Drawing
    attr_reader :paper

    PADDING         = 5
    ARROW_SIZE      = 1.0
    JUMPLINE_INDENT = 10
    DOTTED_SIZE     = 0.3

    def initialize(element_id, width, height)
      @container_id = element_id
      @paper        = ZnSvg::Paper.new(element_id, width, height)
      #@paper.enable_pan_zoom
      @on_select    = nil
      @elements     = {} # record all elements being on the sheet, using upstream object as key
      @highlighted  = []
    end

    def set_view_box(x, y, width, height)
      @paper.set_view_box(x, y, width, height, true)
    end

    def clear
      @elements = {}
      Element.find("##{@container_id}").html(%Q{<h1>#{I18n.t("no preview available yet")}</h1>})
    end

    def flush
      svg = @paper.get_svg
      Element.find("##{@container_id}").html(svg)
      $log.benchmark("binding elements") { bind_elements }

      nil
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

      flush
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
      unhighlight_all # todo in tune preview, we unhilight all, why not here? here the controller does unhiglighting!
      range_highlight_more(from, to)
    end

    def range_highlight_more(from, to)
      elements = get_elements_by_range(from, to)
      elements.each { |element| highlight_element(element) }
      scroll_to_element(elements.first) unless elements.empty?
    end

    # hightlights the drawn elements driven by the selection range in the abc text
    def range_unhighlight(from, to)
      elements = get_elements_by_range(from, to)
      elements.each { |element| unhighlight_element(element) }
      `debugger`
      nil
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
      @highlighted.push(element)
      #classes = [element.attr('class').split(" "), 'highlight'].flatten.uniq.join(" ")
      element.attr('class', ['highlight'])
      nil
    end

    def scroll_to_element(element)

      # %x{
      #       var node = #{element};
      #       var bbox = node.getBBox();
      #       var top = bbox.y + bbox.y2;
      #       top = 100 * Math.floor(top/100);
      #       $("#"+#{@container_id}).get(0).scrollTop=top;
      # }
    end


    def unhighlight_element(element)
      element.attr('class', ['abcref'])

        @highlighted -= [element]
      nil
    end


    # this binds Music model elements to drawing dom nodes
    # approach:
    # as svg is generated as a string, the dom nodes need to be found
    # by an id and connected to the music model elements
    # svg_engine uses abc_ref to create clicable areas with ids
    # these areas are also used for highlighting
    def bind_elements
      @elements.keys.each do |k|
        @elements[k] = @elements[k].map do |id|
          origin = Element.find("##{id}")   # find the DOM - node correspnding to Harpnote Object (k)
          origin.on(:click) do
            @on_select.call(k) unless origin.nil? or @on_select.nil?
          end
          origin
        end
      end
    end

    def push_element(root, element)
      @elements[root] ||= []
      @elements[root] << element
    end

    def draw_ellipse(root)
      attr          ={}
      attr["fill"]  = root.fill == :filled ? "black" : "white"
      attr[:stroke] = 'black'
      if root.rect?
        e = @paper.rect(root.center.first - root.size.first, root.center.last - root.size.last, 2 * root.size.first, 2 * root.size.last)
      else
        e = @paper.ellipse(root.center.first, root.center.last, root.size.first, root.size.last, attr)
      end

      if root.dotted?
        draw_the_dot(root)
      end

      if root.hasbarover?
        draw_the_barover(root)
      end

      e = @paper.add_abcref(root.center.first, root.center.last, root.size.first, root.size.last)
      push_element(root.origin, e)

=begin
      e.conf_key = root.conf_key;
      @paper.set_conf_editable(e);

      e.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end
=end
    end

    def draw_glyph(root)
      center = [root.center.first, root.center.last]
      size   = [root.size.first * 2, root.size.last * 2] # size to be treated as radius

      @paper.line_width = 0.1

      #path_spec = "M#{center.first} #{center.last}"
      path_spec         = path_to_raphael(root.glyph[:d])
      #path_spec = self.glyph_to_path_spec(root.glyph)

      # draw a white background
      e                 = @paper.rect(root.center.first - size.first/2, root.center.last - size.last/2, size.first, size.last, 0, {fill: "white", stroke: "white"})

      nil
      # draw th path

      @paper.line_width = root.line_width
      scalefactor       = size.last / root.glyph[:h]
      attr              ={}
      attr[:fill]       = "black"
      attr[:transform]  ="translate(#{(center.first)},#{(center.last)}) translate(0,#{(0)}) scale(#{scalefactor})"
      e                 = @paper.path(path_spec, attr)

      if root.dotted?
        draw_the_dot(root)
      end

      if root.hasbarover?
        draw_the_barover(root)
      end

      e = @paper.add_abcref(root.center.first, root.center.last, root.size.first, root.size.last)
      push_element(root.origin, e)

#       push_element(root.origin, e)
#
#       e.on_click do
#         origin = root.origin
#         @on_select.call(origin) unless origin.nil? or @on_select.nil?
#       end
#
#
#       @paper.line_width = line_width
#
#       # add the dot if needed
#       if root.dotted?
#         draw_the_dot(root)
#       end
#
#       if root.hasbarover?
#         draw_the_barover(root)
#       end
#
#       # make annotation draggable
#       if root.conf_key
#         @paper.set_draggable(e)
#         e.conf_key   = root.conf_key
#         e.conf_value = root.conf_value
#       end

    end

    def draw_the_barover(root)
      e_bar = @paper.rect(root.center.first - root.size.first, root.center.last - root.size.last - 0.5, 2 * root.size.first, 0.3, 0, {fill: :black}) # svg does not show if heigt=0

=begin
      e_bar.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end
      push_element(root.origin, e_bar)
=end
    end

    # this draws the dot to an ellipse or glyph
    def draw_the_dot(root)
      ds1   = DOTTED_SIZE + root.line_width
      ds2   = DOTTED_SIZE + root.line_width/2
      x     = root.center.first + (root.size.first + ds1)
      y     = root.center.last
      e_dot = @paper.ellipse(x, y, ds2, ds2, {stroke: "white", fill: "white"}) # white outer
      e_dot = @paper.ellipse(x, y, DOTTED_SIZE, DOTTED_SIZE, {fill: "black"})  # black inner

=begin
      push_element(root.origin, e_dot)

      e_dot.on_click do
        origin = root.origin
        @on_select.call(origin) unless origin.nil? or @on_select.nil?
      end
=end
    end


    #
    # Draw a Flowline to indicate the flow of the music. It indicates
    # the sequence in which the notes are played
    #
    # @param root [type] [description]
    #
    # @return [type] [description]
    def draw_flowline(root)
      attr                     ={}
      attr["stroke-dasharray"] = "2,1" if root.style == :dashed
      attr["stroke-dasharray"] = "0.5,1" if root.style == :dotted
      @paper.line(root.from.center[0], root.from.center[1], root.to.center[0], root.to.center[1], attr)
      # see http://stackoverflow.com/questions/10940316/how-to-use-attrs-stroke-dasharray-stroke-linecap-stroke-linejoin-in-raphaeljs
    end

    #
    # Draw a Jump line to indicate that the music is to be continued at another beat
    # @param root [Drawing::Jumpline] The jumpline to be drawn
    #
    # @return [nil] nothing
    def draw_jumpline_outdated(root)
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

      attr             ={}
      attr[:fill]      = "red"
      attr[:transform] = "t#{startpoint[0]},#{startpoint[1]}"
      arrow            = @paper.path("M0,0L#{ARROW_SIZE},#{-0.5 * ARROW_SIZE}L#{ARROW_SIZE},#{0.5 * ARROW_SIZE}L0,0", attr)
    end

    # Draw an an annotation
    def draw_annotation(root)

      style                = $conf.get('layout.FONT_STYLE_DEF')[root.style] || $conf.get('layout.FONT_STYLE_DEF')[:regular]
      mm_per_point         = $conf.get('layout.MM_PER_POINT')

      # activate to debug the positioning of text
      #@paper.rect(root.center.first, root.center.last, 20, 5, 0, {stroke: "red", fill: "none", "stroke-width" => "0.2"}) if $log.loglevel == :debug

      text                 = root.text.gsub(/\ +\n/, "\n").gsub("\n\n", "\n \n") #
      attr                 ={}
      attr[:"font-size"]   = style[:font_size]/3 # literal by try and error
      attr[:"font-family"] = "Arial"
      attr[:transform]     = "scale(1.05, 1) translate(0,#{-style[:font_size]/8})" # literal by try and error
      attr[:"font-weight"] = "bold" if style[:font_style].to_s.include? "bold"
      attr[:"font-style"]  = "italic" if style[:font_style].to_s.include? "italic"
      attr[:"text-anchor"] = "start"
      element              = @paper.text(root.center.first/1.05, root.center.last, text, attr) # literal by try and error

      element

    end

    # draw a path
    def draw_path(root)
      path_spec   = path_to_raphael(root.path)
      attr        ={}
      attr[:fill] = "none"
      attr[:fill] = "#000000" if root.filled?
      e           = @paper.path(path_spec, attr)
    end
  end

end