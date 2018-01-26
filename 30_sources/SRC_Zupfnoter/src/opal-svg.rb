#
# This module wraps the API for Raphael
# as long as we need it to render harpnotes
#
# note that the class variable @r is used by
# `self.r` in the native javascript
# of the methods
#
module ZnSvg

  #
  # This represents a Raphael element
  #

  #
  # Wraps Raphael drawing area
  #
  class Paper

    #
    # Construtctor
    # @param container_id [String] The indentifier of the canvas element # not used
    # @param width [Numeric] Width of the canvas in pixels
    # @param height [Numeric] Height of the canvas in pixels
    #
    # dropinfo: a js-object: {element: {svg-node}, conf_key: {conf_key}, conf_value: {value for conf_key}}
    # @return [type] [description]
    def initialize(container_id, width, height)
      @container_id                 = container_id
      @draggable_dragend_handler    = lambda { |dropinfo| $log.info(dropinfo) }
      @on_mouseover_handler         = lambda { |dropinfo| $log.info(Native(dropinfo).conf_key) }
      @on_mouseout_handler          = lambda { |dropinfo| $log.info(Native(dropinfo).conf_key) }
      @draggable_rightclick_handler = lambda { |dropinfo|}

      @canvas    = [width, height]
      @scale     = 1
      @viewbox   = [0, 0, 420, 297] # what a default ?
      @svgbuffer = []
      @id        = 0

      @line_width = 0.2 # todo:clarify value

      clear
    end

    def new_id!
      "ZN_#{@id+=1}"
    end

    # @return the resulting SVG

    def get_svg
      @svgbuffer.push(%Q{</svg>})
      @svgbuffer.join
    end

    # @param [Numerical] width of line from now on
    def line_width=(width)
      @line_width = width
    end

    #
    # Clear the area
    #
    # @return [type] [description]
    def clear
      @id        = 0
      @svgbuffer = []
      @svgbuffer.push(%Q{<svg width="#{@canvas.first}" height="#{@canvas.last}" viewBox="#{@viewbox.join(', ')}" > }) ## todo improve handling of viewbox
    end

    def on_mouseover(&block)
      @on_mouseover_handler = block
    end

    def on_mouseout(&block)
      @on_mouseout_handler = block
    end

    def on_annotation_drag_end(&block)
      @draggable_dragend_handler = block
    end

    # @param block: {element: {},  detla: {}, conf_key: {}, conf_val {} }
    def on_draggable_rightclick(&block)
      @draggable_rightclick_handler = block
    end


    def set_canvas(size)
      @canvas = size;
      nil
    end

    # this attaches the context menu only
    #

    def set_conf_editable(svg_element, conf_key)
      %x{
          var me = #{svg_element};
          mouseoverFnc = function(){
            #{@on_mouseover_handler}({element: me, conf_key: #{conf_key}})
          }

          mouseoutFnc = function(){
            #{@on_mouseout_handler}({element: me, conf_key: #{conf_key}})
          }
          me.mouseover(mouseoverFnc);
          me.mouseout(mouseoutFnc);

          me[0].oncontextmenu = function(){ return #{@draggable_rightclick_handler}({element: svg_element, conf_key: #{conf_key}});};
      }
    end

    # mkake the svg_emeent with svg_element_id draggable
    # pass conf_key and conf_value to the drag handler
    def set_draggable_pos(svg_element_id, conf_key, conf_value)
      conf_value_new = conf_value.to_n
      %x{

          var xx = SVG.get(#{svg_element_id});
          var sy = 0, sy=0;
          xx.addClass("zn_draggable");

          xx.draggable(function(x, y) {
            return {
              x: Math.round(x),// Math.floor(x),
              y: Math.round(y)// Math.floor(y)
            }
          });

          xx.on('dragstart', function(e) {
            ismoved = false;
            sx = e.detail.p.x;
            sy = e.detail.p.y;
            this.fill("blue");
          });

          // todo: don't know why 'this' is the only way to change the filling ...
          xx.on('dragend', function(e) {

            this.fill("red");
            deltax =  Math.round(e.detail.p.x - sx);
            deltay =  Math.round(e.detail.p.y - sy);

            conf_value_new[0] += deltax;
            conf_value_new[1] += deltay;

             #{@draggable_dragend_handler.call( {element: `this`, conf_key: conf_key, conf_value_new: Native(`conf_value_new`)} ) };
          })
      }
    end


    #
    # make tuplets reshape by ddrag and drop
    #
    # @param [String] svg_element_id - the id of the group which controls draggable for tuplet
    # @param [String] conf_key - the configuration key for the tuplet (not used - for symmetry of api only passed in draginfo instead)
    # @param [String] conf_value - the configuration value of the tuplet (not used - for symmetry of api only passed in draginfo instead)
    # @param [Hash] draginfo - the information for the draghandler - see usage for detail.
    #                             draginfo      = {handler: :tuplet, p1: p1, p2: p2, cp1: cp1, cp2: cp2, mp: bezier_anchor, tuplet_options: tuplet_options, conf_key: conf_key, callback: shape_drag_callback}

    def set_draggable_tuplet(svg_element_id, conf_key, conf_value, draginfo)
      %x{
      var xx = SVG.get(#{svg_element_id});
      xx.addClass("zn_draggable");

      xx.draggable();

      var sx = 0,                // initialize the outer variables for the closures
          sy = 0,
          target_id = null,
          target_curve=null;


      // *******************************************************************************************
      xx.on('dragstart', function(e) {

        sx = e.detail.p.x;
        sy = e.detail.p.y;
        this.stroke("blue");
        target_id = #{draginfo[:target_id]};
        target_curve = document.getElementById(target_id)
      });



      // *******************************************************************************************
      xx.on('dragmove', function(e){
        e.preventDefault();

        dx = e.detail.p.x - sx; // dx = dx - dx % 5;
        dy = e.detail.p.y - sy; // dy = dy - dy % 5;

        #{
      p1  = draginfo[:p1]
      p2  = draginfo[:p2]
      cp1 = draginfo[:cp1]
      cp2 = draginfo[:cp2]

      deltap = p2 - p1
      }

      // need to find out which of the handle was drag
      cp_id = e.target.childNodes[0].attributes['data-cp'].value // use childNodes for Edge Browser
      if (cp_id == "cp1") {#{cp1 = cp1 + [`dx`, `dy`]}}
                 else {#{cp2 = cp2 + [`dx`, `dy`]}}

      // the bezier curve
      newpath = [['M', #{p1.x}, #{p1.y}], ['C', #{cp1.x}, #{cp1.y}, #{cp2.x}, #{cp2.y}, #{p2.x}, #{p2.y}]]
      np = #{path_to_raphael(`newpath`)};
      target_curve.childNodes[0].setAttribute('d', np);

      // draw the lines to illustrate the controlpoints
      newpath = [['M', #{p1.x}, #{p1.y}], ['L', #{cp1.x}, #{cp1.y}], ['L', #{cp2.x}, #{cp2.y}], ['L', #{p2.x}, #{p2.y}]]
      np = #{path_to_raphael(`newpath`)};
      e.target.firstChild.setAttribute('d', np);

      })

      // *************************************************************************************************************
        xx.on('dragend', function(e) {
      #{
      draginfo[:cp1] = cp1
      draginfo[:cp2] = cp2
      }
          this.stroke("red");
            conf_key_to_change = #{draginfo[:conf_key]} + "." + cp_id

            #{
      rotate_by = Math::PI * 0.5
      np1       = (p1 - cp1).rotate(-deltap.angle).rotate(-rotate_by)
      np2       = (p2 - cp2).rotate(-deltap.angle).rotate(-rotate_by)
      }

             if (cp_id == "cp1") {
                 conf_value_new = #{np1.to_a}
                  newpath = [['M', #{p1.x}, #{p1.y}], ['L', #{cp1.x}, #{cp1.y}]]
                  np = #{path_to_raphael(`newpath`)};
                  e.target.firstChild.setAttribute('d', np);
                }
                 else
                {
                 conf_value_new = #{np2.to_a}
                  newpath = [['M', #{p2.x}, #{p2.y}],  ['L', #{cp2.x}, #{cp2.y}]]
                  np = #{path_to_raphael(`newpath`)};
                  e.target.firstChild.setAttribute('d', np);
                }

            #{@draggable_dragend_handler}( { conf_key: conf_key_to_change, conf_value_new: conf_value_new } )
        })
      }
    end

    def set_draggable_jumpline(svg_element_id, conf_key, conf_value, draginfo)
      %x{

      var xx = SVG.get(#{svg_element_id});
      xx.addClass("zn_draggable");

      xx.draggable();

      xx.on('dragstart', function(e) {
        #{vertical      = draginfo[:jumpline][:vertical]}
        sx = e.detail.p.x;
        sy = e.detail.p.y;
        this.stroke("blue");
      });

      xx.on('dragmove', function(e){
        e.preventDefault();

        dx = e.detail.p.x - sx;
        dx = dx - dx % #{draginfo[:xspacing]}; // we still drag in string rasters.

        #{
      draginfo[:jumpline][:vertical] = vertical + `dx`
      newpath                        = Harpnotes::Layout::Default.make_path_from_jumpline(draginfo[:jumpline])[0]
      }

        np = #{path_to_raphael(newpath)}
        e.target.childNodes[0].setAttribute('d', np);
      })

        // todo: don't know why 'this' is the only way to change the filling ...
        xx.on('dragend', function(e) {
          this.stroke("red");
          var result = {
            delta: [ e.detail.p.x - sx, e.detail.p.y - sy],
            element: svg_element_id
          };
            conf_value_new = Math.round(((vertical + dx ) / #{$conf['layout.X_SPACING']}))  // todo: #154 this does not work for diatonic instruments
            if (conf_value_new <= 0) conf_value_new -= 1
            #{@draggable_dragend_handler}( { delta: [e.detail.p.x - sx, e.detail.p.y - sy], element: this, conf_key: #{conf_key}, conf_value: #{conf_value}, conf_value_new: conf_value_new } )
        })
      }
    end

    def add_abcref(x, y, rx, ry, start_char=nil)
      id  = new_id!
      # classes:
      # abcref - for global unhighlighting - name came from abc2svg
      #        - to add a click handler
      # znref  - for scroll_intoview while playing
      # _(startchar)_ to hilight by player - approach comes from abc2svg
      # zn
      padding = 2
      svg =%Q{<rect class="abcref znref _#{start_char}_" id="#{id}" x="#{x - rx - padding/2}" y="#{y - ry - padding/2}" width="#{2 * rx +  padding}" height="#{2 * ry + padding}"/>}
      @svgbuffer.push(svg)
      id
    end


    # Draw an ellipse
    #
    # @param x [Numeric] x - horizontal coordinate of center
    # @param y [Numeric] y - vertical coordinate of center
    # @param rx [Numeric] rx - horizontal radius
    # @param ry [Numeric] ry - vertical radius
    #
    # @return [element] The generated Element
    def ellipse(x, y, rx, ry, attributes = {})
      attr = _attr_to_xml(attributes)
      svg  = %Q{<ellipse  cx="#{x}" cy="#{y}" rx="#{rx}" ry="#{ry}" stroke-width="#{@line_width}" #{attr}/>}
      @svgbuffer.push(svg)
      nil
    end


    def image(url, x, y, height)
      @svgbuffer.push(%Q{  <image x="#{x}" y="#{y}" height="#{height}"
    preserveAspectRatio="none"
    xlink:href="#{url}">
  </image>})

    end

    #
    # Draw a path
    #
    # @param spec [String] The path to be drawn
    # see http://raphaeljs.com/reference.html#Paper.path
    #
    #
    # @return [Element] The generated Element
    def path(spec, attributes={}, bgrectspec=nil)
      thespec     = path_to_raphael(spec)
      id          = new_id!
      group_attrs = _attr_to_xml({fill: attributes[:fill], stroke: attributes[:stroke]}) # move fill attibute to the group such that drag drop can change the color
      attributes.delete(:fill)
      attributes.delete(:stroke)
      attributes[:'stroke-width'] = @line_width unless attributes[:'stroke-width']

      attrs  = _attr_to_xml(attributes)

      # recte a transparent background rectangle to make selection easier
      bgrect = %Q{<rect class="abcref" x="#{bgrectspec[0]}" y="#{bgrectspec[1]}" width="#{bgrectspec[2]}" height="#{bgrectspec[3]}" />} if bgrectspec

      @svgbuffer.push %Q{<g id="#{id}" #{group_attrs} >#{bgrect}<path #{attrs} d="#{thespec}"/></g>}
      id
    end

    def path_to_raphael(path)
      if path.is_a? Array
        result = path.inject("") do |result, element|
          result += element.first
          result += element[1 .. -1].join(" ")
        end
      else
        result=path
      end
      result
    end


    # Draw an Rectangle like an ellipse
    #
    # @param x [Numeric] x - of topleft corner
    # @param y [Numeric] y - of topleft corner
    # @param rx [Numeric] rx - width
    # @param ry [Numeric] ry - height
    # @param radius [Numeric] radius for rounded corners, default is 0
    #
    # @return [element] The generated Element
    def rect(x, y, rx, ry, radius = 0, attributes={fill: "none", stroke: "black", "stroke-width" => @line_width})
      id   = new_id!
      attr = _attr_to_xml(attributes)
      #@svgbuffer.push(%Q{<rect x="#{x}" y="#{y}" width="#{rx}" height="#{ry}" rx="#{radius}" ry="#{radius}" style="fill:#{attr[:fill]};stroke-width:#{@line_width};stroke:#{attr[:stroke]}" />})
      @svgbuffer.push(%Q{<rect id="#{id}" x="#{x}" y="#{y}" width="#{rx}" height="#{ry}" rx="#{radius}" ry="#{radius}"  stroke-width="#{@line_width}" #{attr} />})
      id
    end


    def set_view_box(x, y, width, height, fit)
      @viewbox = [x, y, width, height]
      @scale   = @canvas.last / height
      # todo change viewbox in @svgbugger if necessary
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
    def line(x1, y1, x2, y2, attributes = {}, draginfo = nil)
      path("M#{x1},#{y1}L#{x2},#{y2}", attributes)
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
      id     = new_id!
      attrs  = _attr_to_xml(attributes)
      tspans = text.split("\n").map { |l| %Q{<tspan dy="1.2em" x="#{x}">#{l}</tspan>} }.join()

      @svgbuffer.push %Q{<g id="#{id}" x="#{x}" y="#{y}"><text x="#{x}" y="#{y}" id="#{id}" #{attrs}>#{tspans}</text></g>}
      # $log.info %Q{<g id="#{id}"><text id="#{id}" x="#{x}" y="#{y}"  #{attrs}>#{tspans}</text></g>}
      id
    end

    def _attr_to_xml(attributes)
      attributes.map { |k, v| %Q{#{k}="#{v}"} }.join(" ")
    end

    #
    # Determine the size of the canvas
    #
    # @return [Array of Numeric] The horizontal, vertical dimensions
    # of the canvas
    def size
      [`self.r.canvas.offsetWidth`, `self.r.canvas.offsetHeight`]
    end

    def enable_pan_zoom
      `self.r.panzoom().enable()` if `self.r.panzoom != undefined`
    end

    def scroll_to_element(element)
      %x{
        height = $("#" + #{@container_id} + " svg").height();
        thetopraw = element[0].y.baseVal.value;
        thetop = thetopraw * (height / #{@viewbox[3]}) - 100;  // keep 110 px from top border
        $("#"+#{@container_id}).get(0).scrollTop = thetop;
      }
    end

  end

end
