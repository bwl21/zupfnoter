require 'opal-jquery'
require 'native'
require 'harpnotes'
require 'abc_to_harpnotes'
require 'raphael_engine'
require 'pdf_engine'
require 'json'

def reload_harp_notes
  %x{
  var abc = editor.getSession().getValue();
  ABCJS.renderAbc($("#tunePreview")[0], abc, {}, {}, {});
  }

  song = Harpnotes::Input::ABCToHarpnotes.new.transform(`abc`)
  `console.log(song)`
  sheet = Harpnotes::Layout::Default.new.layout(song)
  `console.log(sheet)`
  Harpnotes::RaphaelEngine.new("harpPreview").draw(sheet)
end

def generate_pdf
  %x{
  var abc = editor.getSession().getValue();
  }

  song = Harpnotes::Input::ABCToHarpnotes.new.transform(`abc`)
  sheet = Harpnotes::Layout::Default.new.layout(song)
  pdf = Harpnotes::PDFEngine.new.draw(sheet)
  url = pdf.output(:datauristring)
  `console.log(pdf.$output('raw'))`
  `window.open(url)`
end

Document.ready? do
  include Harpnotes::Music

  Element.find("#tbRender").on(:click) { reload_harp_notes }
  Element.find("#tbPrint").on(:click) { generate_pdf }
end