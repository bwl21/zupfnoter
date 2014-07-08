
# This is a wrapper class for local store

class LocalStore

  def initialize(name)
    @name = name
    load_dir

    unless @directory
      @directory = {}
      save_dir
    end
  end


  def create(key, item, title = nil)
    if @directory[key]
      $log.warning("local storage: key '#{key}' already exists")
    else
      update(key, item, title, true)
    end
  end


  def update(key, item, title = nil, create = false)
    envelope = {p: item, title: title}.to_json
    if @directory[key] || create
      `localStorage.setItem(self.$mangle_key(key), envelope)`
      @directory[key] = title
      save_dir
    else
      $log.warning("local storage update: key '#{key}' does not exist")
    end
  end

  def retrieve(key)
    envelope = JSON.parse(`localStorage.getItem(self.$mangle_key(key))`)
    envelope[:p]
  end

  def delete(key)
    if @directory[key]
      $log.warn("local storage: key '#{key}' does not exist")
    else
      `localStorage.deleteItem(self.$mangle_key(key))`
      @directory[key] = nil
      save_dir
    end
  end

  def list
     @directory.clone
  end

  private


  def mangle_key(key)
    "#{@name}.#{key}"
  end

  def load_dir
    dirkey =  "#{@name}__dir"
    @directory  = JSON.parse(`localStorage.getItem(dirkey)`)
  end

  def save_dir
    dir_json = @directory.to_json
    dirkey =  "#{@name}__dir"
    `localStorage.setItem(dirkey, dir_json)`
  end

end


class Controller

  attr :editor, :harpnote_preview_printer, :tune_preview_printer

  def initialize
    $log = ConsoleLogger.new("consoleEntries")
    @editor = Harpnotes::TextPane.new("abcEditor")
    @songbook = LocalStore.new("songbook")
    @abc_transformer = Harpnotes::Input::ABCToHarpnotes.new

    setup_ui
    setup_ui_listener
    load_from_loacalstorage
  end


  # this handles a command
  # todo: this is a temporary hack until we have a proper ui
  def handle_command(command)
    c = command.split(" ")
    case c.first
      when "s"
        abc_code = @editor.get_text
        metadata = @abc_transformer.get_metadata(abc_code)
        @songbook.update(metadata[:X], abc_code,  metadata[:T])
        $log.info("saved #{metadata[:X]}, '#{metadata[:T]}'")

      when "r"
        if c.last
          payload = @songbook.retrieve(c.last)
          if payload
            @editor.set_text(payload)
          else
            $log.error("song #{c.last} not found")
          end
        else
          $log.error("plase add a song number")
        end

      when "n"
        if c.last
          @songbook.create(c.last, "X:#{c.last}\n", "not yet saved")
        else
          $log.error("plase add a song number")
        end

      when "l"
        $log.info(@songbook.list)

    else
      $log.error("wrong commnad: #{command}")
    end
  end

  # Save session to local store
  def save_to_localstorage
    abc = @editor.get_text
    abc = `localStorage.setItem('abc_data', abc);`
  end

  # load session from localstore
  def load_from_loacalstorage
    abc = `localStorage.getItem('abc_data');`
    @editor.set_text(abc) unless abc.nil?
  end

  # render the harpnotes to a3
  def render_a3
    printer = Harpnotes::PDFEngine.new
    printer.draw(layout_harpnotes(0))
  end


  # render the harpnotes splitted on a4 pages
  def render_a4
    Harpnotes::PDFEngine.new.draw_in_segments(layout_harpnotes)
  end

  # play the abc tune
  def play_abc
    if @inst
      Element.find('#tbPlay').html('play')
      `self.inst.silence();`
      @inst = nil;
    else
      Element.find('#tbPlay').html('stop')
      @inst = `new Instrument('piano')`
      `self.inst.play(nil, #{@editor.get_text}, function(){self.$play_abc()} )` # todo get parameter from ABC
    end
  end


  # play an abc fragment
  # todo prepend the abc header
  def play_abc_part(string)
    @inst = `new Instrument('piano')`
    `self.inst.play(nil, #{string});` # todo get parameter from ABC
  end

  # render the previews
  # also saves abc in localstore
  def render_previews
    $log.info("rendering")
    save_to_localstorage
    begin
      @harpnote_preview_printer.draw(layout_harpnotes)
    rescue Exception => e
      $log.error([e.message, e.backtrace])
    end
    begin
      @tune_preview_printer.draw(@editor.get_text)
    rescue Exception => e
      $log.error([e.message, e.backtrace])
    end

    nil
  end


  # download abc + pdfs as a zip archive
  # todo: determine filename from abc header
  def save_file
    zip = JSZip::ZipFile.new
    zip.file("song.abc", get_abc_code)
    zip.file("harpnotes_a4.pdf", render_a4.output(:raw))
    zip.file("harpnotes_a3.pdf", render_a3.output(:raw))
    blob = zip.to_blob
    filename = "song#{Time.now.strftime("%d%m%Y%H%M%S")}.zip"
    `window.saveAs(blob, filename)`
  end

  # compute the layout of the harpnotes
  # @return [Happnotes::Layout] to be passed to one of the engines for output
  def layout_harpnotes(print_variant = 0)
    song = Harpnotes::Input::ABCToHarpnotes.new.transform(@editor.get_text)
    Harpnotes::Layout::Default.new.layout(song, nil, print_variant)
  end

  # select a particular abc elemnt in all views
  def select_abc_object(abcelement)
    a=Native(abcelement)
    $log.debug("select_abc_element (#{__FILE__} #{__LINE__})")
    @editor.select_range_by_position(a[:startChar], a[:endChar])
    @tune_preview_printer.range_highlight(a[:startChar], a[:endChar]);
    @harpnote_preview_printer.range_highlight(a[:startChar], a[:endChar]);
  end



  private


  def setup_ui
    # setup the harpnote prviewer
    @harpnote_preview_printer = Harpnotes::RaphaelEngine.new("harpPreview",1100, 700)
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
    Element.find("#tbCommand").on(:change) {|event|
      handle_command(Native(event[:target])[:value])
      Native(event[:target])[:value] = ""
      }


    # changes in the editor
    @editor.on_change do |e|
      if @refresh_timer
        `clearTimeout(self.refresh_timer)`
        # `alert("refresh cancelled")`
      end

      if @playtimer_timer
        `clearTimeout(self.playtimer_timer)`
        # `alert("refresh cancelled")`
      end

      #@playtimer_timer = `setTimeout(function(){self.$play_abc_part(e.data.text), 10})`
      @refresh_timer = `setTimeout(function(){self.$render_previews()}, 1000)`
      nil
    end


    @editor.on_selection_change do |e|
      a = @editor.get_selection_positions
      unless a.first == a.last
        @tune_preview_printer.range_highlight(a.first, a.last);
        @harpnote_preview_printer.range_highlight(a.first, a.last);
      end
    end


    # key events in editor
    Element.find(`window`).on(:keydown) do |evt|
      $log.debug("key pressed (#{__FILE__} #{__LINE__})")
      `console.log(event)`
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
