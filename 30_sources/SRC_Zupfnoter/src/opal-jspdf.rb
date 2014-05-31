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

  # @param orientation Symbol the page orientation, :p for portrait, :l for landscape
  # @param unit Symbol the unit of measurement, :mm (default), :pt, :cm, :in
  # @param format Symbol page format, :a3, :a4 (default), :a5, :letter, :legal
  def initialize(orientation = :p, unit = :mm, format = :a4)
    @native = `new jsPDF(orientation, unit, format)`
  end

  def line(from, to)
    `self.native.lines([ [ to[0] - from[0], to[1] - from[1] ] ], from[0], from[1])`
  end

  def line_cap=(value)
    `self.native.setLineCap(value)`
  end

  # @param style Symbol the style of the ellipse, :F for filled, :D for outlined, :FD for both
  def ellipse(center, size, style = `undefined`)
    `self.native.ellipse(center[0], center[1], size[0], size[1], style)`
  end

  def fill=(rgb)
    `self.native.setFillColor(rgb[0], rgb[1], rgb[2])`
  end

  def draw=(rgb)
    `self.native.setDrawColor(rgb[0], rgb[1], rgb[2])`
  end

  # @param rgb [Array] R G B values 0..255
  def text_color=(rgb)
    `self.native.setTextColor(rgb[0], rgb[1], rgb[2])`
  end

  def use_solid_lines
    `self.native.setLineDash('', 0)`
  end

  def line_dash=(dist = 3)
    dist = `undefined` if dist.nil?
    `self.native.setLineDash(#{dist}, #{dist})`
  end

  def text(x, y, text, flags=nil)
    `self.native.text(x, y, text, flags)`
  end

  def rect(x1, y1, x2, y2)
    `self.native.rect(x1, y1, x2, y2)`
  end

  # @param type Symbol the output type as :datauristring, :datauri, :raw
  # @param options String options forwarded to the PDF generator
  def output(type = :raw, options = nil)
    type = `undefined` if type == :raw
    options = `undefined` if options.nil?

    `self.native.output(type, options)`
  end

end
