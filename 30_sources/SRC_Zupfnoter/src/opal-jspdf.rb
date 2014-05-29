require 'native'

class JsPDF

  # @param orientation Symbol the page orientation, :p for portrait, :l for landscape
  # @param unit Symbol the unit of measurement, :mm (default), :pt, :cm, :in
  # @param format Symbol page format, :a3, :a4 (default), :a5, :letter, :legal
  def initialize(orientation = :p, unit = :mm, format = :a4)
    @native = `new jsPDF(orientation, unit, format)`
  end

  def line(from, to)
    `self.native.lines(to, from[0], from[1])`
  end

  def ellipse(center, size, style)
    `self.native.ellipse(center[0], center[1], size[0], size[1], style)`
  end

  def fill=(rgba)
    `self.native.setFillColor(rgba[0], rgba[1], rgba[2], rgba[3])`
  end

  def draw=(rgba)
    `self.native.setDrawColor(rgba[0], rgba[1], rgba[2], rgba[3])`
  end

  def text_color=(rgb)
    `self.native.setTetColor(rgba[0], rgba[1], rgba[2])`
  end

  def text(text, position, flags)
    `self.native.text(text, position[0], position[1], flags)`
  end

  # @param type Symbol the output type as :datauristring, :datauri, :raw
  # @param options String options forwarded to the PDF generator
  def output(type = :raw, options = nil)
    type = `undefined` if type == :raw
    options = `undefined` if options.nil?

    `self.native.output(type, options)`
  end

end
