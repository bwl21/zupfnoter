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
    setup_ui_listener
  end

  def render_pdf
    Harpnotes::PDFEngine.new.draw(layout_harpnotes)
  end

  def render_to_canvas
    Harpnotes::RaphaelEngine.new("harpPreview").draw(layout_harpnotes)
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

  private

  def setup_editor
    %x{
      var editor = ace.edit("abcEditor");
      editor.setTheme("ace/theme/chrome");
    }
    @editor = `editor`
  end

  def setup_ui_listener
    Element.find("#tbRender").on(:click) { render_to_canvas }
    Element.find("#tbPrint").on(:click) { url = render_pdf.output(:datauristring); `window.open(url)` }

    Element.find(`window`).on(:keydown) do |evt|
      if `evt.keyCode == 13 && evt.shiftKey`
        evt.prevent_default
        render_to_canvas
      elsif `(event.keyCode == 83 && event.ctrlKey) || (event.which == 19)`
        evt.prevent_default
        save_file
        `evt.preventDefault()`
      end
    end
  end

end

Document.ready? do
  Controller.new
end
