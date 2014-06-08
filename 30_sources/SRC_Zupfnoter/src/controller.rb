require 'opal-jquery'
require 'opal-jszip'
require 'opal-jspdf'
require 'harpnotes'
require 'abc_to_harpnotes'
require 'raphael_engine'
require 'pdf_engine'

class Controller

  def initialize
    setup_editor
    setup_ui
    setup_ui_listener
  end

  def render_pdf
    Harpnotes::PDFEngine.new.draw(layout_harpnotes)
  end


  def play_abc
    if @inst
      Element.find('#tbPlay').html('play')
      `self.inst.silence();`
      @inst = nil;
    else
      Element.find('#tbPlay').html('stop')
      @inst = `new Instrument('piano')`
      `self.inst.play({tempo:200}, #{get_abc_code});`
    end
  end

  def render_to_canvas
    @raphael_engine.draw(layout_harpnotes)
    `ABCJS.renderAbc($("#tunePreview")[0], #{get_abc_code}, {}, {}, {})`
  end

  def save_file
    zip = JSZip::ZipFile.new
    zip.file("song.abc", get_abc_code)
    zip.file("harpnotes.pdf", render_pdf.output(:raw))
    blob = zip.to_blob
    filename = "song#{Time.now.strftime("%d%m%Y%H%M%S")}.zip"
    `window.saveAs(blob, filename)`
  end

  def get_abc_code
    `self.editor.getSession().getValue()`
  end

  def layout_harpnotes
    song = Harpnotes::Input::ABCToHarpnotes.new.transform(get_abc_code)
    Harpnotes::Layout::Default.new.layout(song)
  end

  def select_note(note, origin)
    `console.log(note)`
    alert "Selection from #{origin}"
  end

  private

  def setup_editor
    %x{
      var editor = ace.edit("abcEditor");
      editor.setTheme("ace/theme/tomorrow_night");
    }
    @editor = `editor`
  end

  def setup_ui
    @raphael_engine = Harpnotes::RaphaelEngine.new("harpPreview")
    @raphael_engine.on_select do |origin|
      select_note(origin, :harpnotes)
    end
  end

  def setup_ui_listener

    Element.find("#tbPlay").on(:click) { play_abc }
    Element.find("#tbRender").on(:click) { render_to_canvas }
    Element.find("#tbPrint").on(:click) { url = render_pdf.output(:datauristring); `window.open(url)` }

    Element.find(`window`).on(:keydown) do |evt|
      if `evt.keyCode == 13 && evt.shiftKey`
        evt.prevent_default
        render_to_canvas
        `evt.preventDefault()`
      elsif `(event.keyCode == 83 && event.ctrlKey) || (event.which == 19)`
        evt.prevent_default
        save_file
        `evt.preventDefault()`
      end
    end

    Element.find("#dragbar").on(:mousedown) do |re|
      re.prevent
      Element.find(`document`).on(:mousemove) do |e|
        Element.find("#leftColumn").css(:right, "#{`window.innerWidth` - e.page_x}px")
        Element.find("#rightColumn").css(:left, "#{e.page_x}px")
        Element.find("#dragbar").css(:left, "#{e.page_x}px")
      end
      Element.find(`document`).on(:mouseup) do
        `$(document).unbind('mousemove')`
      end
    end
  end

end

Document.ready? do
  Controller.new
end
