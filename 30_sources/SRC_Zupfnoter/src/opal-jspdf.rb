require 'native'

class JsPDF

  attr_accessor :x_offset, :y_offset

  # @param orientation Symbol the page orientation, :p for portrait, :l for landscape
  # @param unit Symbol the unit of measurement, :mm (default), :pt, :cm, :in
  # @param format Symbol page format, :a3, :a4 (default), :a5, :letter, :legal
  def initialize(orientation = :p, unit = :mm, format = :a4)
    @x_offset = 0
    @y_offset = 0
    # note that jsPDF.js and jspdf-cli.js delivers the jsPDF constructor in the global
    # area. Don't relly know why it works, but we should take care
    #
    @native_jspdf = `new jsPDF(orientation, unit, format)`
  end

  def self.jspdfversion()
    %x{jsPDF.version}
  end

  def line(from, to)
    nfrom = apply_offset_to_point(from)
    nto   = apply_offset_to_point(to)
    `#{@native_jspdf}.lines([ [ nto[0] - nfrom[0], nto[1] - nfrom[1] ] ], nfrom[0], nfrom[1])`
  end

  def line_cap=(value)
    `#{@native_jspdf}.setLineCap(value)`
  end

  # @param style Symbol the style of the ellipse, :F for filled, :D for outlined, :FD for both
  # @param [Array] size radii
  def ellipse(center, radii, style = `undefined`)
    ncenter = apply_offset_to_point(center)
    `#{@native_jspdf}.ellipse(#{ncenter[0]}, #{ncenter[1]}, #{radii[0]}, #{radii[1]}, #{style})`
  end

  def fill=(rgb)
    `#{@native_jspdf}.setFillColor(rgb[0], rgb[1], rgb[2])`
  end

  def stroke=(rgb)
    `#{@native_jspdf}.setDrawColor(rgb[0], rgb[1], rgb[2])`
  end

  # @param [interger] width of line
  def line_width=(width)
    `#{@native_jspdf}.setLineWidth(#{width})`
  end

  def line_dash=(dist = 3)
    dist = `undefined` if dist.nil?
    `#{@native_jspdf}.setLineDash([#{dist}, #{dist}], #{dist})`
  end


  # @param rgb [Array] R G B values 0..255
  def text_color=(rgb)
    `#{@native_jspdf}.setTextColor(rgb[0], rgb[1], rgb[2])`
  end

  def font_size=(size)
    `#{@native_jspdf}.setFontSize(#{size})`
  end


  def font_style=(style)
    `#{@native_jspdf}.setFontStyle(style)`
  end

  def use_solid_lines
    `#{@native_jspdf}.setLineDash('', 0)`
  end


  # draw an image 
  # @param [String] url mainly data uri
  # 
  # @param [Float] x horizontal
  # @param [Float] y vertical
  # @param [Float] height height of imaag
  def image(url, x, y, height)

    nx, ny, = apply_offset_to_point([x, y])
    format = nil
    format = "jpeg" if url.start_with? "data:image/jpeg"
    format = "png" if url.start_with? "data:image/png"
    if format
      `#{@native_jspdf}.addImage(#{url}, #{format}, #{nx}, #{ny}, 0, #{height})`
    else
      raise "image format not supported for pdf: #{format}"
    end
  end

  def text(x, y, text, flags = nil)
    nx, ny = apply_offset_to_point([x, y])
    `#{@native_jspdf}.text(#{nx}, #{ny}, #{text}, #{flags.to_n})`
  end

  # @param style Symbol the style of the ellipse, :F for filled, :D for outlined, :FD for both
  def rect_like_ellipse(center, radii, style = 'undefined')
    ncenter = apply_offset_to_point(center)
    rsize   = radii.map { |s| 2.0 * s } # real size
    `#{@native_jspdf}.rect(#{ncenter[0] - radii[0]}, #{ncenter[1] - radii[1]}, #{rsize[0]}, #{rsize[1]}, style)`
  end


  # @param [Numerical] x1 x of upper left corner
  # @param [Numerical] y1 y of upper left corner
  # @param [Numerical] x2 width
  # @param [Numerical] y2 height
  def rect(x1, y1, x2, y2, style = 'undefined')
    nx1, ny1 = apply_offset_to_point([x1, y1])
    `#{@native_jspdf}.rect(#{nx1}, #{ny1}, #{x2}, #{y2}, #{style})`
  end

  def lines(lines, x, y, scale, style, close)
    nx, ny = apply_offset_to_point([x, y])
    `#{@native_jspdf}.lines(lines, #{nx}, #{ny}, scale, style, close)`
  end

  # @param type Symbol the output type as :datauristring, :datauri, :raw
  # @param options String options forwarded to the PDF generator
  def output(type = :raw, options = nil)
    type    = `undefined` if type == :raw
    options = `undefined` if options.nil?

    `#{@native_jspdf}.output(type, options)`
  end

  def left_arrowhead(x, y)
    delta    = 1.0
    nx, ny   = apply_offset_to_point([x, y])
    x0       = nx
    x1       = nx + delta
    y_top    = ny + delta / 2.0
    y_bottom = ny - delta / 2.0

    `#{@native_jspdf}.triangle(#{x0}, #{ny}, #{x1}, #{y_top}, #{x1}, #{y_bottom}, #{x0}, #{ny}, 'FD')`
  end

  def addPage()
    `#{@native_jspdf}.addPage()`
  end

  def get_text_width(text)
    %x{#{@native_jspdf}.getTextWidth(#{text})}
  end

  private

  def apply_offset_to_point(point)
    [point.first + @x_offset, point.last + @y_offset]
  end

end
