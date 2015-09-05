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

    $conf = Confstack.new
    $conf.push(_init_conf)

    @editor = Harpnotes::TextPane.new("abcEditor")
    @harpnote_player = Harpnotes::Music::HarpnotePlayer.new()
    @songbook = LocalStore.new("songbook")
    @abc_transformer = Harpnotes::Input::AbcjsToHarpnotes.new
    @dropboxclient = Opal::DropboxJs::NilClient.new()

    @systemstatus={}


    @commands = CommandController::CommandStack.new
    self.methods.select { |n| n =~ /__ic.*/ }.each { |m| send(m) }

    setup_ui


    # initialize virgin zupfnoter
    load_demo_tune
    set_status(dropbox: "not connected", music_model: "unchanged", loglevel: $log.loglevel, autorefresh: :off, view: 0)

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
    systemstatus = @systemstatus.select { |key, _| [:music_model, :view, :autorefresh, :loglevel, :nwworkingdir].include?(key) }.to_json
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
    abc =%Q{X:21
F:21_Ich_steh_an_deiner_krippen_hier
T:Ich steh an deiner Krippen hier
C:Nr. 59 aus dem Weihnachtsoratorium
C:Joh. Seb. Bach
C:Kirchenchor Mattighofen
%%score ( 1 2 ) ( 3 4 )
L:1/4
Q:1/4=80.00
M:4/4
I:linebreak $
K:G
V:1 treble nm="Sopran Alt"
V:2 treble
V:3 bass nm="Tenor Bass"
V:4 bass
V:1
G | G/A/ B A G | A A !fermata!B G/A/ |
B c d c/B/ | A/G/ A !fermata!G :| B | B A G F |
G/A/ B !fermata!A A | G F G D | G A !fermata!B G/A/ |
B c d c/B/ | A/G/ A !fermata!G z |]
V:2
D | E/F/ G G/F/ G | G F G E/F/ |
G/ B A/4G/4 F G | G F D :| z | G3/2 F/ F/E/ E/^D/ |
E D D D | D/C/ D D/C/ B, | B, E ^D B, |
E E D/E/2 G | G F D z |]
V:3
B, | B, E E/D/ D | E/C/ A,/D/ !fermata!D E |
D G,/A,/ B,/C/ D | D C/B,/ !fermata!B, :| D | D D/C/ B,/C/ F,/B,/ |
B,/A,/ A,/G,/ !fermata!F, F, | G,/A,/ B,/C/ B,/A,/ G, | G, F,/E,/ !fermata!F, E,/F,/ |
G,3/2 A,/ B,/C/ D | D C/B,/ !fermata!B, z |]
V:4
G,/F,/ | E,3/2 D,/ C,3/2 B,,/ | C,/A,,/ D, G,, C, |
G,/F,/ E, B,/A,/ G, | D D, G, :| z | B,/C/ D/2-D/2 G,/A,/ B, |
E,/F,/ G, D, D/C/ | B,3/2 A,/ G,3/2 F,/ | E,/D,/ C, B,, E,/-E,/ |
E,/D,/ C, B,,/A,,/ G,, | D,2 G,, z |]

%%%%zupfnoter.config
{
 "produce":[1],
 "annotations": {
                  "refn": {"id": "refn", "text": "referenced note", "pos": [20,10]}
                },
 "extract": {
  "0": {
       "voices": [1,2,3,4],
       "flowlines": [1,3],
       "layoutlines": [1,2,3,4],
       "lyrics": {"versepos": {"1,2,3,4,5,6" :[10,100]}},
       "legend": {"pos": [310,175]},
       "notes":[
         {"pos": [340,10], "text": "Ich steh an deiner Krippen hier", "style": "strong"}
         ]
      }
       }
}
}
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

  def play_abc(mode = :music_model)
    if @harpnote_player.is_playing?
      @harpnote_player.stop()
      Element.find('#tbPlay').html('play')
    else
      Element.find('#tbPlay').html('stop')
      @harpnote_player.play_song(0) if mode == :music_model
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
    setup_tune_preview

    begin
      abc_text = @editor.get_abc_part
      @tune_preview_printer.draw(abc_text)
    rescue Exception => e
      $log.error(["Bug", e.message, e.backtrace].join("\n"), [1, 1], [10, 1000])
    end
    $log.debug("finished render tune #{__FILE__} #{__LINE__}")
    set_inactive("#tunePreview")

    @editor.set_annotations($log.annotations)

    nil
  end

  # render the previews
  # also saves abc in localstore()
  def render_harpnotepreview_callback
    begin
      $log.debug("viewid: #{@systemstatus[:view]} #{__FILE__} #{__LINE__}")
      @song_harpnotes = layout_harpnotes(@systemstatus[:view])
      @harpnote_player.load_song(@music_model)
      @harpnote_preview_printer.draw(@song_harpnotes)
    rescue Exception => e
      $log.error(["Bug", e.message, e.backtrace].join("\n"), [1, 1], [10, 1000])
    end

    set_status(refresh: false)

    $log.debug("finished rendering Haprnotes #{__FILE__} #{__LINE__}")
    set_inactive("#harpPreview")
    @editor.set_annotations($log.annotations)

    nil
  end


  def render_previews()
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
    set_status(refresh: false)
    save_to_localstorage
    render_tunepreview_callback()
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
    $log.clear_annotations
    config_part = @editor.get_config_part
    begin
      config = %x{json_parse(#{config_part})}
      config = JSON.parse(config_part)
    rescue Object => error
      line_col = @editor.get_config_position(error.last)
      $log.error("#{error.first} at #{line_col}", line_col)
      config = {}
    end

    # todo: remove this compatibility code
    outdated_configs = @editor.get_text.split("%%%%hn.").count
    config[:location] = "song" if config.keys.count > 0 || outdated_configs == 1
    # todo: end of compatiblility code

    $conf.push(config)
    abc_parser = $conf.get('abc_parser')
    @music_model = Harpnotes::Input::ABCToHarpnotesFactory.create_engine(abc_parser).transform(@editor.get_abc_part)
    result = Harpnotes::Layout::Default.new.layout(@music_model, nil, print_variant)
    $log.debug(@music_model.to_json) if $log.loglevel == 'debug'
    @editor.set_annotations($log.annotations)
    $conf.pop
    result
  end

  # highlight a particular abc element in all views
  # note that previous selections are still maintained.
  # @param [Hash] abcelement : [{startChar: xx, endChar: yy}]
  def highlight_abc_object(abcelement)
    a=Native(abcelement) # todo: remove me
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


  # @param [Hash] abcelement : [{startChar: xx, endChar: yy}]
  def unhighlight_abc_object(abcelement)
    a=Native(abcelement) # remove me
    @tune_preview_printer.range_unhighlight_more(a[:startChar], a[:endChar])
    #$log.debug("unselect_abc_element #{a[:startChar]} (#{__FILE__} #{__LINE__})")

    @harpnote_preview_printer.range_unhighlight(a[:startChar], a[:endChar])
  end

  # select a particular abcelement in all views
  # previous selections are removed
  # @param [Hash] abcelement : [{startChar: xx, endChar: yy}]
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
    @tune_preview_printer = ABC2SVG::Abc2Svg.new(Element.find("#tunePreview"))

    @tune_preview_printer.on_select do |abcelement|
      a=Native(abcelement) # todo remove me
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
      set_status(music_model: "changed")
      request_refresh(true)
      nil
    end


    @editor.on_selection_change do |e|
      a = @editor.get_selection_positions
      $log.debug("editor selecton #{a.first} to #{a.last} (#{__FILE__}:#{__LINE__})")
      unless # a.first == a.last
        @tune_preview_printer.range_highlight(a.first, a.last)
        @harpnote_preview_printer.unhighlight_all
        @harpnote_preview_printer.range_highlight(a.first, a.last)
        @harpnote_player.range_highlight(a.first, a.last)
      end

    end

    @editor.on_cursor_change do |e|
      request_refresh(false)
    end

    @harpnote_player.on_noteon do |e|
      $log.debug("noteon #{Native(e)[:startChar]} (#{__FILE__} #{__LINE__})")
      highlight_abc_object(e)
    end

    @harpnote_player.on_noteoff do |e|
      $log.debug("noteoff #{Native(e)[:startChar]} (#{__FILE__} #{__LINE__})")
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

      $log.debug("got storage event #{key}: #{value} (#{__FILE__} #{__LINE__})")
      if @systemstatus[:autorefresh] == :remote && key == :command && value == 'render'
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

  # @param [Boolean] init if true triggers a new refresh request; if false restarts a running request
  def request_refresh(init)
    set_status({refresh: true}) if init

    $log.debug("request refresh #{@systemstatus[:refresh]} #{init} #{__FILE__} #{__LINE__}")
    if @refresh_timer
      `clearTimeout(self.refresh_timer)`
    end

    if @systemstatus[:refresh]
      handle_command('stop') # stop player as the Song is changed

      case @systemstatus[:autorefresh]
        when :on
          @refresh_timer = `setTimeout(function(){self.$render_previews()}, 100)`
        when :off
          @refresh_timer = `setTimeout(function(){self.$render_remote()}, 0)`
        when :remote
          @refresh_timer = `setTimeout(function(){self.$render_previews()}, 500)`
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

  private

  # returns a hash with the default values of configuration
  def _init_conf()
    result =
        {produce: [0],
         abc_parser: 'ABC2SVG',
         defaults:
             {
                 note_length: "1/4",
                 print: {t: "", # title of the extract   # todo: remove these print defaults - no longer needed
                         v: [1, 2, 3, 4], # voices to show
                         startpos: 15, # start position of the harpnotes
                         s: [[1, 2], [2, 3]], # synchlines
                         f: [1, 3], # flowlines
                         sf: [2, 4], # subflowlines
                         j: [1, 3], # jumplines
                         l: [1, 2, 3, 4] # lyoutlies
                 },
                 legend: {pos: [20, 20]}, # legend defaults
                 lyrics: {pos: [20, 60]}, # lyrics defaults
                 annotation: {pos: [2, -5]} # position of notebound annotation
             },

         annotations: {
             vt: {text: "v", pos: [-1, -6]},
             vr: {text: "v", pos: [2, -3]},
             vl: {text: "v", pos: [-4, -3]}

         }, # default for note based annotations

         extract: {
             "0" => {
                 line_no: 1,
                 title: "alle Stimmen",
                 startpos: 15,
                 voices: [1, 2, 3, 4],
                 synchlines: [[1, 2], [3, 4]],
                 flowlines: [1, 3],
                 subflowlines: [2, 4],
                 jumplines: [1, 3],
                 layoutlines: [1, 2, 3, 4],
                 legend: {pos: [320, 20]},
                 lyrics: {pos: [320, 50]},
                 notes: []
             },
             "1" => {
                 line_no: 2,
                 title: "Sopran, Alt",
                 voices: [1, 2]
             },
             "2" => {
                 line_no: 1,
                 title: "Tenor, Bass",
                 voices: [3, 4]
             }
         },


         layout:
             {
                 LINE_THIN: 0.1,
                 LINE_MEDIUM: 0.3,
                 LINE_THICK: 0.5,
                 # all numbers in mm
                 ELLIPSE_SIZE: [2.8, 1.7], # radii of the largest Ellipse
                 REST_SIZE: [2.8, 1.5], # radii of the largest Rest Glyph

                 # x-size of one step in a pitch. It is the horizontal
                 # distance between two strings of the harp

                 X_SPACING: 11.5, # Distance of strings

                 # X coordinate of the very first beat
                 X_OFFSET: 2.8, #ELLIPSE_SIZE.first,

                 Y_SCALE: 4, # 4 mm per minimal
                 DRAWING_AREA_SIZE: [400, 282], # Area in which Drawables can be placed

                 # this affects the performance of the harpnote renderer
                 # it also specifies the resolution of note starts
                 # in fact the shortest playable note is 1/16; to display dotted 16, we need 1/32
                 # in order to at least being able to handle triplets, we need to scale this up by 3
                 # todo:see if we can speed it up by using 16 ...
                 BEAT_RESOLUTION: 192, # SHORTEST_NOTE * BEAT_PER_DURATION, ## todo use if want to support 5 * 7 * 9  # Resolution of Beatmap
                 SHORTEST_NOTE: 64, # shortest possible note (1/64) do not change this
                 # in particular specifies the range of DURATION_TO_STYLE etc.

                 BEAT_PER_DURATION: 3, # BEAT_RESOLUTION / SHORTEST_NOTE,

                 # this is the negative of midi-pitch of the lowest plaayble note
                 # see http://computermusicresource.com/midikeys.html
                 PITCH_OFFSET: -43,

                 FONT_STYLE_DEF: {
                     smaller: {text_color: [0, 0, 0], font_size: 6, font_style: "normal"},
                     small: {text_color: [0, 0, 0], font_size: 9, font_style: "normal"},
                     regular: {text_color: [0, 0, 0], font_size: 12, font_style: "normal"},
                     large: {text_color: [0, 0, 0], font_size: 20, font_style: "bold"}
                 },

                 MM_PER_POINT: 0.3,

                 # This is a lookup table to map durations to graphical representation
                 DURATION_TO_STYLE: {
                     #key      size   fill          dot                  abc duration

                     :err => [2, :filled, FALSE], # 1      1
                     :d64 => [0.9, :empty, FALSE], # 1      1
                     :d48 => [0.7, :empty, TRUE], # 1/2 *
                     :d32 => [0.7, :empty, FALSE], # 1/2
                     :d24 => [0.7, :filled, TRUE], # 1/4 *
                     :d16 => [0.7, :filled, FALSE], # 1/4
                     :d12 => [0.5, :filled, TRUE], # 1/8 *
                     :d8 => [0.5, :filled, FALSE], # 1/8
                     :d6 => [0.3, :filled, TRUE], # 1/16 *
                     :d4 => [0.3, :filled, FALSE], # 1/16
                     :d3 => [0.1, :filled, TRUE], # 1/32 *
                     :d2 => [0.1, :filled, FALSE], # 1/32
                     :d1 => [0.05, :filled, FALSE] # 1/64
                 },

                 REST_TO_GLYPH: {
                     # this basically determines the white background rectangel
                     :err => [[2, 2], :rest_1, FALSE], # 1      1
                     :d64 => [[0.9, 0.9], :rest_1, FALSE], # 1      1
                     :d48 => [[0.5, 0.5], :rest_1, TRUE], # 1/2 *
                     :d32 => [[0.5, 0.5], :rest_1, FALSE], # 1/2
                     :d24 => [[0.4, 0.7], :rest_4, TRUE], # 1/4 *
                     :d16 => [[0.4, 0.7], :rest_4, FALSE], # 1/4
                     :d12 => [[0.3, 0.5], :rest_8, TRUE], # 1/8 *
                     :d8 => [[0.3, 0.5], :rest_8, FALSE], # 1/8
                     :d6 => [[0.3, 0.4], :rest_16, TRUE], # 1/16 *
                     :d4 => [[0.3, 0.5], :rest_16, FALSE], # 1/16
                     :d3 => [[0.3, 0.5], :rest_32, TRUE], # 1/32 *
                     :d2 => [[0.3, 0.5], :rest_32, FALSE], # 1/32
                     :d1 => [[0.3, 0.5], :rest_64, FALSE] # 1/64
                 }
             }
        }

    result
  end

end

Document.ready? do
  Controller.new
end
