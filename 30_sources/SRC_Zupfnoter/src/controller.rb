require 'opal-jquery'
require 'opal-jszip'
require 'opal-jspdf'
require 'harpnotes'
require 'abc_to_harpnotes'
require 'raphael_engine'
require 'pdf_engine'
require 'consolelogger'


class Controller

  attr :editor, :harpnote_preview_printer, :tune_preview_printer

  def initialize
    $log = ConsoleLogger.new("consoleEntries")
    @auto_selection = true
    setup_editor
    setup_ui
    setup_ui_listener
  end

  def render_a3
    Harpnotes::PDFEngine.new.draw(layout_harpnotes)
  end

  def render_a4
    Harpnotes::PDFEngine.new.draw_in_segments(layout_harpnotes)
  end

  def play_abc
    if @inst
      Element.find('#tbPlay').html('play')
      `self.inst.silence();`
      @inst = nil;
    else
      Element.find('#tbPlay').html('stop')
      @inst = `new Instrument('piano')`
      `self.inst.play({tempo:200}, #{get_abc_code}, function(){self.$play_abc()} )`  # todo get parameter from ABC
    end
  end


  def play_abc_part(string)
      @inst = `new Instrument('piano')`
      `self.inst.play({tempo:200}, #{string});`  # todo get parameter from ABC
  end

  def render_previews
    $log.info("rendering")
    begin
      @harpnote_preview_printer.draw(layout_harpnotes)
    rescue Exception =>e
      $log.error([e.message, e.backtrace])
    end
    begin
      @tune_preview_printer.draw(get_abc_code)
    rescue Exception =>e
      $log.error([e.message, e.backtrace])
    end

    nil
  end

  def save_file
    zip = JSZip::ZipFile.new
    zip.file("song.abc", get_abc_code)
    zip.file("harpnotes_a4.pdf", render_a4.output(:raw))
    zip.file("harpnotes_a3.pdf", render_a3.output(:raw))
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

  #@param selection_start [Numeric] Start position
  def select_range_by_position(selection_start, selection_end)
    %x{
      doc = self.editor.selection.doc
      startrange = doc.indexToPosition(selection_start);
      endrange = doc.indexToPosition(selection_end);
      range = new Range(startrange.row, startrange.column, endrange.row, endrange.column);
      myrange = {start:startrange, end:endrange}
      self.editor.selection.setSelectionRange(myrange, false);
     }
  end

  def get_selection_positions
    %x{
      doc = self.editor.selection.doc;
      range = self.editor.selection.getRange();
      range_start = doc.positionToIndex(range.start, 0);
      range_end = doc.positionToIndex(range.end, 0);
     }
    [`range_start`, `range_end`]
  end

  # select a particular abc elemnt in all views
  def select_abc_object(abcelement)
    a=Native(abcelement)
    if true #@auto_selection
      select_range_by_position(a[:startChar], a[:endChar])
      @tune_preview_printer.range_highlight(a[:startChar], a[:endChar]);
      @harpnote_preview_printer.range_highlight(a[:startChar], a[:endChar]);
    end
  end

  private

  def setup_editor
    %x{
      var editor = ace.edit("abcEditor");
      // editor.setTheme("ace/theme/tomorrow_night");

    }
    @editor = `editor`
  end

  def setup_ui
    # setup the harpnote prviewer
    @harpnote_preview_printer = Harpnotes::RaphaelEngine.new("harpPreview")
    @harpnote_preview_printer.on_select do |harpnote|
      select_abc_object(harpnote.origin)
    end


    # setup tune preview
    printerparams = {}
    @tune_preview_printer = ABCJS::Write::Printer.new("tunePreview")
    @tune_preview_printer.on_select do |abcelement|
      a=Native(abcelement)
      select_abc_object(abcelement)
    end
  end

  def setup_ui_listener

    Element.find("#tbPlay").on(:click) { play_abc }
    Element.find("#tbRender").on(:click) { render_previews }
    Element.find("#tbPrintA3").on(:click) { url = render_a3.output(:datauristring); `window.open(url)` }
    Element.find("#tbPrintA4").on(:click) { url = render_a4.output(:datauristring); `window.open(url)` }


    # changes in the editor
    Native(Native(@editor).getSession).on(:change){|e|
      if @refresh_timer
        `clearTimeout(self.refresh_timer)`
       # `alert("refresh cancelled")`
      end

      if @playtimer_timer
        `clearTimeout(self.playtimer_timer)`
        # `alert("refresh cancelled")`
      end

      @playtimer_timer = `setTimeout(function(){self.$play_abc_part(e.data.text), 10})`
      @refresh_timer = `setTimeout(function(){self.$render_previews()}, 1000)`
        nil
    }

    # Seletion change in the editor
    Native(Native(@editor)[:selection]).on(:changeSelection) do |e|
      a = get_selection_positions()
      $log.debug("selection changed #{a}")
      @auto_selection=false
      @tune_preview_printer.range_highlight(a.first, a.last);
      @harpnote_preview_printer.range_highlight(a.first, a.last);
      @auto_selection=true
    end



    # key events in editor
    Element.find(`window`).on(:keydown) do |evt|
      if `evt.keyCode == 13 && evt.shiftKey`
        evt.prevent_default
        render_previews
        `evt.preventDefault()`
      elsif `(event.keyCode == 83 && event.ctrlKey) || (event.which == 19)`
        evt.prevent_default
        save_file
        `evt.preventDefault()`
      end
    end

    # dragbars
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
