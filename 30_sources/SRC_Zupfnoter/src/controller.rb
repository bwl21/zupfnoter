
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
    result = envelope[:p] if envelope
    result
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
    @harpnote_player = Harpnotes::Music::HarpnotePlayer.new()
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

      # save current song
      # todo check the title
      when "s"
        abc_code = @editor.get_text
        metadata = @abc_transformer.get_metadata(abc_code)
        @songbook.update(metadata[:X], abc_code,  metadata[:T])
        $log.info("saved #{metadata[:X]}, '#{metadata[:T]}'")

      # retrieve a song
      when "r"
        if c[1]
          payload = @songbook.retrieve(c[1])
          if payload
            @editor.set_text(payload)
          else
            $log.error("song #{c.last} not found")
          end
        else
          $log.error("plase add a song number")
        end

      # create a new song
      # todo retrive the title
      when "n"
        song_id = c[1]
        song_title = c[2 .. - 1].join(" ")
        if song_id && song_title
          template = %Q{X:#{song_id}
T:#{song_title}
C:{copyright}
R:{rhythm}
M:4/4
L:1/4
Q:1/4=120
K:C
% %%%hn.print {"t":"alle Stimmen",         "v":[1,2,3,4], "s": [[1,2],[3,4]], "f":[1,3], "j":[1]}
% %%%hn.print {"t":"sopran, alt", "v":[1,2],     "s":[[1,2]],       "f":[1],   "j":[1]}
%%%%hn.print {"t":"tenor, bass", "v":[3, 4],     "s":[[1, 2], [3,4]],       "f":[3  ],   "j":[1, 3]}
%%%%hn.legend [10,10]
%%%%hn.note [[5, 50], "Folge: A A B B C A", "regular"]
%%%%hn.note [[360, 280], "Erstellt mit Zupfnoter 0.7", "regular"]
%%score T1 T2  B1 B2
V:T1 clef=treble-8 octave=-1 name="Sopran" snm="S"
V:T2 clef=treble-8 octave=-1 name="Alt" snm="A"
V:B1 clef=bass transpose=-24 name="Tenor" middle=D, snm="T"
V:B2 clef=bass transpose=-24 name="Bass" middle=D, snm="B"
[V:T1] c'
[V:T2] c
[V:B1] c,
[V:B2] C
%
          }
          @songbook.create(song_id, template, song_title)
        else
          $log.error("plase add a song number AND a Title")
        end

      # list the songbook
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
  def play_abc_outdated
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


  def play_abc
    if @harpnote_player.is_playing?
      @harpnote_player.stop()
      Element.find('#tbPlay').html('play')
    else
      Element.find('#tbPlay').html('stop')
      @harpnote_player.play_song(0)
    end
  end

  # play an abc fragment
  # todo prepend the abc header
  def play_abc_part(string)
    @inst = `new Instrument('piano')`
    `self.inst.play(nil, #{string});` # todo get parameter from ABC
  end

  # render the previews
  # also saves abc in localstore()
  def render_previews
    $log.info("rendering")
    save_to_localstorage

    begin
      @song_harpnotes = layout_harpnotes(0)
      @harpnote_player.load_song(@song)
      @harpnote_preview_printer.draw(@song_harpnotes)
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
    @song = Harpnotes::Input::ABCToHarpnotes.new.transform(@editor.get_text)
    Harpnotes::Layout::Default.new.layout(@song, nil, print_variant)
  end

  # highlight a particular abc element in all views
  # note that previous selections are still maintained.
  def highlight_abc_object(abcelement)
    a=Native(abcelement)
   # $log.debug("select_abc_element #{a[:startChar]} (#{__FILE__} #{__LINE__})")

    unless @harpnote_player.is_playing?
      @editor.select_range_by_position(a[:startChar], a[:endChar])
    end

    @tune_preview_printer.range_highlight_more(a[:startChar], a[:endChar])

    @harpnote_preview_printer.range_highlight(a[:startChar], a[:endChar])
  end


  def unhighlight_abc_object(abcelement)
    a=Native(abcelement)
    @tune_preview_printer.range_unhighlight_more(a[:startChar], a[:endChar])
    #$log.debug("unselect_abc_element #{a[:startChar]} (#{__FILE__} #{__LINE__})")

    @harpnote_preview_printer.range_unhighlight(a[:startChar], a[:endChar])
  end

  # select a particular abcelement in all views
  # previous selections are removed
  def select_abc_object(abcelement)
    @harpnote_preview_printer.unhighlight_all();

    highlight_abc_object(abcelement)
  end

  private


  def setup_ui
    # setup the harpnote prviewer
    @harpnote_preview_printer = Harpnotes::RaphaelEngine.new("harpPreview", 1100, 700) # size of canvas in pixels
    @harpnote_preview_printer.set_view_box(0, 0, 440, 297) # this scales the whole thing
    @harpnote_preview_printer.on_select do |harpnote|
      select_abc_object(harpnote.origin)
    end

    # setup tune preview
    printerparams = {staffwidth: 750} #todo compute the staffidth
    @tune_preview_printer = ABCJS::Write::Printer.new("tunePreview", printerparams)
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


    @harpnote_player.on_noteon do |e|
      $log.debug("noteon #{Native(e)[:startChar]}")
      highlight_abc_object(e)
    end

    @harpnote_player.on_noteoff do |e|
      $log.debug("noteoff #{Native(e)[:startChar]}")
      unhighlight_abc_object(e)
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
