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
    dirkey = "#{@name}__dir"
    @directory = JSON.parse(`localStorage.getItem(dirkey)`)
  end

  def save_dir
    dir_json = @directory.to_json
    dirkey = "#{@name}__dir"
    `localStorage.setItem(dirkey, dir_json)`
  end

end


class Controller

  attr :editor, :harpnote_preview_printer, :tune_preview_printer, :systemstatus

  def initialize
    Element.find("#lbZupfnoter").html("Zupfnoter #{VERSION}")

    @console = JqConsole::JqConsole.new('commandconsole', 'zupfnoter> ')
    @console.load_from_loacalstorage
    @console.on_command do |cmd|
      @console.save_to_localstorage
      handle_command(cmd)
    end

    $log = ConsoleLogger.new(@console)
    $log.info ("Welcome to Zupfnoter #{VERSION}")
    @editor = Harpnotes::TextPane.new("abcEditor")
    @harpnote_player = Harpnotes::Music::HarpnotePlayer.new()
    @songbook = LocalStore.new("songbook")
    @abc_transformer = Harpnotes::Input::ABCToHarpnotes.new
    @dropboxclient = Opal::DropboxJs::NilClient.new()

    @systemstatus={}


    @commands = CommandController::CommandStack.new
    self.methods.select { |n| n =~ /__ic.*/ }.each { |m| send(m) }

    setup_ui


    # initialize virgin zupfnoter
    load_demo_tune
    set_status(dropbox: "not connected", song: "unchanged", loglevel: $log.loglevel, autorefresh: :on, view: 0)

    # load from previous session
    load_from_loacalstorage
    render_previews

    setup_nodewebkit
    # now trigger the interactive UI
    setup_ui_listener
  end


  # this handles a command
  # todo: this is a temporary hack until we have a proper ui
  def handle_command(command)

    begin
      @commands.run_string(command)
    rescue Exception => e
      $log.error("#{e.message} in #{command} #{e.caller} #{__FILE__}:#{__LINE__}")
    end
  end

  # Save session to local store
  def save_to_localstorage
    # todo. better maintenance of persistent keys
    systemstatus = @systemstatus.select { |key, _| [:song, :view, :autorefresh, :loglevel, :nwworkingdir].include?(key) }.to_json
    abc = `localStorage.setItem('systemstatus', #{systemstatus});`
    abc = @editor.get_text
    abc = `localStorage.setItem('abc_data', abc);`
  end

  # load session from localstore
  def load_from_loacalstorage
    abc = Native(`localStorage.getItem('abc_data')`)
    @editor.set_text(abc) unless abc.nil?
    envelope = JSON.parse(`localStorage.getItem('systemstatus')`)
    set_status(envelope) if envelope
    nil
  end

  # this loads a demo song
  def load_demo_tune
    abc =%Q{C: Generated more or less automatically
C: by swtoabc by Erich Rickheit KSC
X:1
T:Zupfnoter Demo Tune
T:do you recognize it?
M:6/8
L:1/4
K:G
Q:1/4=120
z4 z E| G2 A B3/2- c/2 B| A2 F D3/2- E/2 F| G2 E E3/2- ^D/2 E| F2 ^D B,2 E |
G2 A B3/2- c/2 B| A2 F D3/2- E/2 F| G3/2- F/2 E ^D3/2- ^C/2 D| E3 E2 z|
d3 d3/2- ^c/2 B| A2 F D3/2- E/2- F| G2- E E3/2- ^D/2 E| F2 ^D B,3|
d3 d3/2 ^c/2 B| A2 F D3/2- E/2 F| G3/2 F/2 E ^D3/2- ^C/2 D| E3 E2 z| }
    @editor.set_text(abc)
  end

  # render the harpnotes to a3
  def render_a3(index = @systemstatus[:view])
    printer = Harpnotes::PDFEngine.new
    printer.draw(layout_harpnotes(index))
  end


  # render the harpnotes splitted on a4 pages
  def render_a4(index = @systemstatus[:view])
    Harpnotes::PDFEngine.new.draw_in_segments(layout_harpnotes(index))
  end

  def play_abc(mode = :song)
    if @harpnote_player.is_playing?
      @harpnote_player.stop()
      Element.find('#tbPlay').html('play')
    else
      Element.find('#tbPlay').html('stop')
      @harpnote_player.play_song(0) if mode == :song
      @harpnote_player.play_selection(0) if mode == :selection
      @harpnote_player.play_from_selection if mode == :selection_ff
    end
  end

  def stop_play_abc
    @harpnote_player.stop()
    Element.find('#tbPlay').html('play')
  end


  # render the previews
  # also saves abc in localstore()
  def render_tunepreview_callback
    begin
      @tune_preview_printer.draw(@editor.get_text)
    rescue Exception => e
      $log.error([e.message, e.backtrace])
    end
    $log.debug("finished render tune #{__FILE__} #{__LINE__}")
    set_inactive("#tunePreview")
    nil
  end

  # render the previews
  # also saves abc in localstore()
  def render_harpnotepreview_callback
    begin
      $log.debug("viewid: #{@systemstatus[:view]} #{__FILE__} #{__LINE__}")
      @song_harpnotes = layout_harpnotes(@systemstatus[:view])
      @harpnote_player.load_song(@song)
      @harpnote_preview_printer.draw(@song_harpnotes)
    rescue Exception => e
      $log.error([e.message, e.backtrace])
    end

    $log.debug("finished rendering Haprnotes #{__FILE__} #{__LINE__}")
    set_inactive("#harpPreview")

    nil
  end


  def render_previews
    $log.info("rendering")
    unless @systemstatus[:autorefresh] == :remote
      save_to_localstorage
      send_remote_command('render')
    end
    setup_tune_preview

    set_active("#tunePreview")
    `setTimeout(function(){self.$render_tunepreview_callback()}, 0)`

    set_active("#harpPreview")
    `setTimeout(function(){self.$render_harpnotepreview_callback()}, 0)`
  end

  def render_remote
    save_to_localstorage
    send_remote_command('render')
  end

  # download abc + pdfs as a zip archive
  # todo: determine filename from abc header
  def save_file
    zip = JSZip::ZipFile.new
    zip.file("song.abc", @editor.get_text)
    zip.file("harpnotes_a4.pdf", render_a4.output(:blob))
    zip.file("harpnotes_a3.pdf", render_a3.output(:blob))
    blob =zip.to_blob
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
    $log.debug("select_abc_element #{a[:startChar]} (#{__FILE__} #{__LINE__})")

    startchar = a[:startChar]
    endchar = a[:endChar]
    endchar = endchar - 5 if endchar == startchar # workaround bug https://github.com/paulrosen/abcjs/issues/22
    unless @harpnote_player.is_playing?
      @editor.select_range_by_position(startchar, endchar)
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


  def set_status(status)
    @systemstatus.merge!(status)
    to_hide = [:nwworkingdir]
    statusmessage = @systemstatus.inject([]) { |r, v|
      r.push "#{v.first}: #{v.last}  " unless to_hide.include?(v.first)
      r
    }.join(" | ")
    $log.debug("#{@systemstatus.to_s} #{__FILE__} #{__LINE__}")
    $log.loglevel= (@systemstatus[:loglevel]) unless @systemstatus[:loglevel] == $log.loglevel
    Element.find("#tbStatus").html(statusmessage)
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
  end

  def setup_tune_preview
    width = Native(Element.find("#tunePreviewContainer").width) - 50 # todo: 70 determined by experiement
    $log.debug("tune preview-width #{width} #{__FILE__}:#{__LINE__}")
    printerparams = {staffwidth: width} #todo compute the staffwidth
    @tune_preview_printer = ABCJS::Write::Printer.new("tunePreview", printerparams)
    @tune_preview_printer.on_select do |abcelement|
      a=Native(abcelement)
      select_abc_object(abcelement)
    end
  end


  def setup_ui_listener

    Element.find("#tbPlay").on(:click) { play_abc(:selection_ff) }
    Element.find("#tbRender").on(:click) { render_previews }
    Element.find("#tbPrintA3").on(:click) { url = render_a3.output(:datauristring); `window.open(url)` }
    Element.find("#tbPrintA4").on(:click) { url = render_a4.output(:datauristring); `window.open(url)` }


    # changes in the editor
    @editor.on_change do |e|
      set_status(song: "changed")
      if @refresh_timer
        `clearTimeout(self.refresh_timer)`
        # `alert("refresh cancelled")`
      end

      if @playtimer_timer
        `setTimeout(function(){$('#tbPlay').html('play')}, 0)`
        `clearTimeout(self.playtimer_timer)`
        # `alert("refresh cancelled")`
      end

      #@playtimer_timer = `setTimeout(function(){self.$play_abc_part(e.data.text), 10})`

      case @systemstatus[:autorefresh]
        when :on
          @refresh_timer = `setTimeout(function(){self.$render_previews()}, 2000)`
        when :off
          @refresh_timer = `setTimeout(function(){self.$render_remote()}, 0)`
        when :remote
          @refresh_timer = `setTimeout(function(){self.$render_previews()}, 500)`
      end
      nil
    end


    @editor.on_selection_change do |e|
      a = @editor.get_selection_positions
      # $log.debug("editor selecton #{a.first} to #{a.last} (#{__FILE__}:#{__LINE__})")
      unless a.first == a.last
        @tune_preview_printer.range_highlight(a.first, a.last)
        @harpnote_preview_printer.unhighlight_all
        @harpnote_preview_printer.range_highlight(a.first, a.last)
        @harpnote_player.range_highlight(a.first, a.last)
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

    @harpnote_player.on_songoff do
      stop_play_abc()
    end

    # # key events in editor
    # Element.find(`window`).on(:keydown) do |evt|
    #
    #   $log.debug("key pressed (#{__FILE__} #{__LINE__})")
    #   `console.log(event)`
    #   if `evt.keyCode == 13 && evt.shiftKey`
    #     evt.prevent_default
    #     render_previews
    #     `evt.preventDefault()`
    #   elsif `(event.keyCode == 83 && event.ctrlKey) || (event.which == 19)`
    #     evt.prevent_default
    #     save_file
    #     `evt.preventDefault()`
    #   end
    # end

    Element.find(`window`).on(:storage) do |evt|
      key = Native(evt[:originalEvent]).key
      value = Native(evt[:originalEvent]).newValue

      $log.debug("got storage event #{key}: #{value}")
      if systemstatus[:autorefresh] == :remote && key == :command && value == 'render'
        load_from_loacalstorage
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

  def send_remote_command(command)
    `localStorage.setItem('command', '');`
    `localStorage.setItem('command', #{command});`
  end

  def set_active(ui_element)
    Element.find(ui_element).css('background-color', 'red')

  end

  def set_inactive(ui_element)
    Element.find(ui_element).css('background-color', 'white')
  end

end

Document.ready? do
    Controller.new
end
