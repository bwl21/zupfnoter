require 'native'

%x{
jsPDF.API.setLineDash = function(dashArray, dashPhase) {
  if(dashArray == undefined) {
    this.internal.write('[] 0 d')
  } else {
    this.internal.write('[' + dashArray + '] ' + dashPhase + ' d')
  }

  return this;
};
}

class JsPDF

  attr_accessor :x_offset

  # @param orientation Symbol the page orientation, :p for portrait, :l for landscape
  # @param unit Symbol the unit of measurement, :mm (default), :pt, :cm, :in
  # @param format Symbol page format, :a3, :a4 (default), :a5, :letter, :legal
  def initialize(orientation = :p, unit = :mm, format = :a4)
    @x_offset = 0
    @native = `new jsPDF(orientation, unit, format)`
  end

  def line(from, to)
    nfrom = apply_offset_to_point(from)
    nto = apply_offset_to_point(to)
    `self.native.lines([ [ nto[0] - nfrom[0], nto[1] - nfrom[1] ] ], nfrom[0], nfrom[1])`
  end

  def line_cap=(value)
    `self.native.setLineCap(value)`
  end

  # @param style Symbol the style of the ellipse, :F for filled, :D for outlined, :FD for both
  def ellipse(center, size, style = `undefined`)
    ncenter = apply_offset_to_point(center)
    `self.native.ellipse(ncenter[0], ncenter[1], size[0], size[1], style)`
  end

  def fill=(rgb)
    `self.native.setFillColor(rgb[0], rgb[1], rgb[2])`
  end

  def stroke=(rgb)
    `self.native.setDrawColor(rgb[0], rgb[1], rgb[2])`
  end

  # @param rgb [Array] R G B values 0..255
  def text_color=(rgb)
    `self.native.setTextColor(rgb[0], rgb[1], rgb[2])`
  end

  def font_size=(size)
    `self.native.setFontSize(size)`
  end


  def font_style=(style)
    `self.native.setFontStyle(style)`
  end

  def use_solid_lines
    `self.native.setLineDash('', 0)`
  end

  def line_dash=(dist = 3)
    dist = `undefined` if dist.nil?
    `self.native.setLineDash(#{dist}, #{dist})`
  end

  def text(x, y, text, flags=nil)
    nx = apply_offset_to_x(x)
    `self.native.text(nx, y, text, flags)`
  end

  # @param style Symbol the style of the ellipse, :F for filled, :D for outlined, :FD for both
  def rect_like_ellipse(center, size, style = 'undefined')
    ncenter = apply_offset_to_point(center)
    `self.native.rect(ncenter[0], ncenter[1], size[0], size[1], style)`
  end

  def rect(x1, y1, x2, y2, style = 'undefined')
    nx1 = apply_offset_to_x(x1)
    `self.native.rect(nx1, y1, x2, y2, style)`
  end

  def lines(lines, x, y, scale, style, close)
    nx = apply_offset_to_x(x)
    `self.native.lines(lines, nx, y, scale, style, close)`
  end

  # @param type Symbol the output type as :datauristring, :datauri, :raw
  # @param options String options forwarded to the PDF generator
  def output(type = :raw, options = nil)
    type = `undefined` if type == :raw
    options = `undefined` if options.nil?

    `self.native.output(type, options)`
  end

  def left_arrowhead(x, y)
    delta = 1.0
    x0       = apply_offset_to_x(x)
    x1       = apply_offset_to_x(x + delta)
    y_top    = y + delta/2.0
    y_bottom = y - delta/2.0

    `self.native.triangle(x0, y, x1, y_top, x1, y_bottom, x0, y, 'FD')`
  end

  def addPage()
    `self.native.addPage()`
  end

  private

  def apply_offset_to_point(point)
    [point.first + @x_offset, point.last]
  end

  def apply_offset_to_x(x)
    x + @x_offset
  end
end
