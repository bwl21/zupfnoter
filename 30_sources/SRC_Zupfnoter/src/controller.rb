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
    result   = envelope[:p] if envelope
    result
  end

  def delete(key)
    if @directory[key]
      $log.warning("local storage: key '#{key}' does not exist")
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
    dirkey     = "#{@name}__dir"
    @directory = JSON.parse(`localStorage.getItem(dirkey)`)
  end

  def save_dir
    dir_json = @directory.to_json
    dirkey   = "#{@name}__dir"
    `localStorage.setItem(dirkey, dir_json)`
  end

end


class Controller

  attr :editor, :harpnote_preview_printer, :tune_preview_printer, :systemstatus

  def initialize


    `init_w2ui();`
    @update_sytemstatus_consumers = {systemstatus: [
                                                       lambda { `update_sytemstatus_w2ui(#{@systemstatus.to_n})` }
                                                   ],
                                     play_start:   [lambda { `update_play_w2ui('start')` }],
                                     play_stop:    [lambda { `update_play_w2ui('stop')` }]
    }

    Element.find("#lbZupfnoter").html("Zupfnoter #{VERSION}")

    @console = JqConsole::JqConsole.new('commandconsole', 'zupfnoter> ')
    @console.load_from_loacalstorage
    @console.on_command do |cmd|
      @console.save_to_localstorage
      handle_command(cmd)
    end

    @dropped_abc = "T: nothing dropped yet"

    $log = ConsoleLogger.new(@console)
    $log.info ("Welcome to Zupfnoter #{VERSION}")

    $conf        = Confstack.new()
    $conf.strict = false
    $conf.push(_init_conf)
    $log.debug($conf.get.to_json)

    @editor = Harpnotes::TextPane.new("abcEditor")

    @harpnote_player = Harpnotes::Music::HarpnotePlayer.new()
    @songbook        = LocalStore.new("songbook")

    @abc_transformer = Harpnotes::Input::Abc2svgToHarpnotes.new #todo: get it from abc2harpnotes_factory.

    @dropboxclient = Opal::DropboxJs::NilClient.new()

    @systemstatus={}

    # initialize the commandstack
    # note that CommandController has methods __ic_01 etc. to register the commands
    # these methods are invoked here.
    @commands    = CommandController::CommandStack.new
    self.methods.select { |n| n =~ /__ic.*/ }.each { |m| send(m) } # todo: what is this?

    setup_harpnote_preview

    # initialize virgin zupfnoter
    load_demo_tune
    set_status(dropbox: "not connected", music_model: "unchanged", loglevel: $log.loglevel, autorefresh: :off, view: 0)
    #
    # load from previous session
    load_from_loacalstorage
    render_previews
    #
    setup_nodewebkit
    # # now trigger the interactive UI
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
    systemstatus = @systemstatus.select { |key, _| [:music_model, :view, :autorefresh, :loglevel, :nwworkingdir, :dropboxapp, :dropboxpath, :perspective, :zoom].include?(key) }.to_json
    abc          = `localStorage.setItem('systemstatus', #{systemstatus});`
    abc          = @editor.get_text
    abc          = `localStorage.setItem('abc_data', abc);`
  end

  # load session from localstore
  def load_from_loacalstorage
    abc = Native(`localStorage.getItem('abc_data')`)
    @editor.set_text(abc) unless abc.nil?
    envelope = JSON.parse(`localStorage.getItem('systemstatus')`)
    set_status(envelope) if envelope
    if @systemstatus[:dropboxapp]
      handle_command("dlogin #{@systemstatus[:dropboxapp]} #{@systemstatus[:dropboxpath]}")
    end
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
       "lyrics": {"versepos": {"1,2,3,4,5,6,7,8" :[10,100]}},
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


  # migrate the configuration which is provided from textox
  # this method is necesary to upgrade existing sheets
  def migrate_config(config)
    result       = Confstack.new(false)
    result.strict= false
    result.push(config)

    if config['extract']
      new_lyrics = migrate_config_lyrics(result)
      result.push(new_lyrics)

      sheetnotes = migrate_notes(result)
      result.push(sheetnotes)

      new_legend = migrate_config_legend(result)
      result.push(new_legend)
    end
    result['$schema'] = SCHEMA_VERSION
    result['$version']= VERSION
    result

    migrate_config_cleanup(result.get)
  end

  def migrate_config_cleanup(config)
    if config['extract']
      config['extract'].each do |k, element|
        lyrics = element['lyrics']
        lyrics.delete('versepos') if lyrics
      end
    end
    config
  end

  def migrate_config_legend(config)
    new_legend = config['extract'].inject({}) do |r, element|
      legend = element.last['legend']
      if legend
        unless legend['spos'] # prevewnt loop
          opos = legend["pos"]

          result           = {"spos" => [opos.first, opos.last + 7], "pos" => opos}
          r[element.first] = {"legend" => result}
        end
      end
      r
    end

    {"extract" => new_legend}
  end

  def migrate_config_lyrics(config)
    new_lyrics = config['extract'].inject({}) do |r, element|
      lyrics = element.last['lyrics']
      lyrics = lyrics['versepos'] if lyrics # old version had everything in versepos
      if lyrics
        result           = lyrics.inject({}) do |ir, element|
          verses                = element.first.gsub(",", " ").split(" ").map { |f| f.to_i }
          ir[(ir.count+1).to_s] = {"verses" => verses, "pos" => element.last}
          ir
        end
        r[element.first] = {"lyrics" => result}
      end
      r
    end

    {"extract" => new_lyrics}
  end

  def migrate_notes(config)
    sheetnotes = config['extract'].inject({}) do |r, element|
      notes = element.last['notes']
      if notes.is_a? Array ## in the old version notes was an array
        result           = notes.inject({}) do |ir, element|
          ir[(ir.count+1).to_s] = element
          ir
        end
        r[element.first] = {'notes' => result}
      end
      r
    end
    {'extract' => sheetnotes}
  end


  def play_abc(mode = :music_model)
    if @systemstatus[:harpnotes_dirty]
      result = render_previews
    else
      result = Promise.new.resolve()
    end

    result.then do
      Promise.new.tap do |promise|
        if @harpnote_player.is_playing?
          stop_play_abc
        else
          @update_sytemstatus_consumers[:play_start].each { |i| i.call() }
          @harpnote_player.play_song() if mode == :music_model
          @harpnote_player.play_selection() if mode == :selection
          @harpnote_player.play_from_selection if mode == :selection_ff
        end
        promise.resolve()
      end
    end.fail do |message|
      `alert(#{message})`
    end
  end

  def stop_play_abc
    @harpnote_player.stop()
    @update_sytemstatus_consumers[:play_stop].each { |i| i.call() }
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
    s = Time.now
    begin
      $log.debug("viewid: #{@systemstatus[:view]} #{__FILE__} #{__LINE__}")
      @song_harpnotes = layout_harpnotes(@systemstatus[:view])
      @harpnote_player.load_song(@music_model)

      @harpnote_preview_printer.draw(@song_harpnotes)
    rescue Exception => e
      $log.error(["Bug", e.message, e.backtrace].join("\n"), [1, 1], [10, 1000])
    end

    set_status(refresh: false)

    $log.debug("finished rendering Haprnotes inn #{Time.now() -s} seconds #{__FILE__} #{__LINE__}")
    set_inactive("#harpPreview")
    @editor.set_annotations($log.annotations)
    set_status(harpnotes_dirty: false)

    nil
  end


  # @return [Promise] promise such that it can be chained e.g. in play.
  def render_previews()
    $log.info("rendering")
    unless @systemstatus[:autorefresh] == :remote
      save_to_localstorage
      send_remote_command('render')
    end

    setup_tune_preview

    result = Promise.new.tap do |promise|
      set_active("#tunePreview")
      `setTimeout(function(){self.$render_tunepreview_callback();#{promise}.$resolve()}, 0)`
    end.then do
      Promise.new.tap do |promise|
        set_active("#harpPreview")
        `setTimeout(function(){self.$render_harpnotepreview_callback();#{promise}.$resolve()}, 50)`
      end
    end

    result
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
    blob     = zip.to_blob
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
      config = migrate_config(config)
      @editor.set_config_part(config)
    rescue Object => error
      line_col = @editor.get_config_position(error.last)
      $log.error("#{error.first} at #{line_col}", line_col)
      config = {}
    end

    # todo: remove this compatibility code
    outdated_configs  = @editor.get_text.split("%%%%hn.").count
    config[:location] = "song" if config.keys.count > 0 || outdated_configs == 1
    # todo: end of compatiblility code

    $conf.push(config)
    abc_parser   = $conf.get('abc_parser')
    start        = Time.now()
    @music_model = Harpnotes::Input::ABCToHarpnotesFactory.create_engine(abc_parser).transform(@editor.get_abc_part)
    $log.info("duration transform #{Time.now - start}")
    result = Harpnotes::Layout::Default.new.layout(@music_model, nil, print_variant)
    $log.info("duration transform + layout #{Time.now - start}")
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
    endchar   = a[:endChar]
    endchar   = endchar - 5 if endchar == startchar # workaround bug https://github.com/paulrosen/abcjs/issues/22
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
    $log.debug("#{@systemstatus.to_s} #{__FILE__} #{__LINE__}")
    $log.loglevel= (@systemstatus[:loglevel]) unless @systemstatus[:loglevel] == $log.loglevel
    @update_sytemstatus_consumers[:systemstatus].each { |c| c.call(@sytemstatus) }
    nil
  end


  private


  # setup the harpnote prviewer
  def setup_harpnote_preview

    @harpnote_preview_printer = Harpnotes::RaphaelEngine.new("harpPreview", 2200, 1400) # size of canvas in pixels
    @harpnote_preview_printer.set_view_box(0, 0, 440, 297) # this scales the whole thing such that we can draw in mm
    @harpnote_preview_printer.on_select do |harpnote|
      select_abc_object(harpnote.origin)
    end

    ## register handler for dragging annotations
    @harpnote_preview_printer.on_annotation_drag_end do |info|
      if info[:config].include? '.notebound.'
        newcoords = info[:delta]
      else
        newcoords = info[:origin].zip(info[:delta]).map { |i| i.first + i.last }
      end

      report = "#{info[:config]}: #{newcoords}"
      if info[:config]
        @editor.patch_config_part(info[:config], newcoords)
      end
      `$("#harpPreview").w2overlay(report);`
      $log.info("dragged to #{report}")
    end
  end


  # setup tune preview
  def setup_tune_preview
    # todo: remove
    # width = Native(Element.find("#tunePreviewContainer").width) - 50 # todo: 70 determined by experiement
    # $log.debug("tune preview-width #{width} #{__FILE__}:#{__LINE__}")
    # printerparams = {staffwidth: width} #todo compute the staffwidth
    @tune_preview_printer = ABC2SVG::Abc2Svg.new(Element.find("#tunePreview"))

    @tune_preview_printer.on_select do |abcelement|
      a=Native(abcelement) # todo remove me
      select_abc_object(abcelement)
    end
  end

  def set_file_drop(dropzone)
    %x{

    function pasteXml(text){
                            try{
                              var xmldata = $.parseXML(text);
                             }
                            catch(ex){
                              #{$log.error(`ex.message`)}
                            }

                            var options = {
                                    'u': 0, 'b': 0, 'n': 0,    // unfold repeats (1), bars per line, chars per line
                            'c': 0, 'v': 0, 'd': 0,    // credit text filter level (0-6), no volta on higher voice numbers (1), denominator unit length (L:)
                            'm': 0, 'x': 0,           // with midi volume and panning (1), no line breaks (1)
                            'p': 'f'
                          };              // page format: scale (1.0), width, left- and right margin in cm

                          result = vertaal(xmldata, options);
                          #{
    $log.info(`result[1]`)
    @dropped_abc = `result[0]`
    handle_command('drop')
    }
    }

    function pasteMxl(text){
       zip = new JSZip(text);
       text = zip.file(/^lg.*xml$/)[0].asText();
       pasteXml(text);
    }

    function pasteAbc(text){
       #{
    @dropped_abc=`text`
    handle_command('drop')
    }
    }


    function initializeAbc2svg(element) {

               //xml2abc = new ZnXml2Abc();

               function handleDrop(event) {
                          event.stopPropagation();
                          event.preventDefault();
                          files = event.dataTransfer.files;
                          reader = new FileReader();
                          reader.onload = function (e) {
                             text = e.target.result;
                             if (text[0] == '<'){
                               pasteXml(text);
                               }
                             else if (files[0].name.endsWith(".mxl")) {
                                pasteMxl(text)
                               }
                             else
                               {
                                pasteAbc(text);
                               }
                            }

               reader.readAsBinaryString(files[0]);
             }

    function handleDragover(event) {
               event.stopPropagation();
               event.preventDefault();
               event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
             }

    a = document.getElementById(element);
    a.addEventListener('dragover', handleDragover, false);
    a.addEventListener('drop', handleDrop);
    }

    initializeAbc2svg(#{dropzone});
    }

  end


  # this registers the listeners to ui-elements.
  def setup_ui_listener

    # activate drop of files
    set_file_drop('layout');

    # changes in the editor
    @editor.on_change do |e|
      set_status(music_model: "changed")
      set_status(harpnotes_dirty: true)
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
      stop_play_abc
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
      key   = Native(evt[:originalEvent]).key
      value = Native(evt[:originalEvent]).newValue

      $log.debug("got storage event #{key}: #{value} (#{__FILE__} #{__LINE__})")
      if @systemstatus[:autorefresh] == :remote && key == :command && value == 'render'
        load_from_loacalstorage
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
      stop_play_abc # stop player since the model has poentially changed

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
    Element.find(ui_element).add_class('spinner')
  end

  def set_inactive(ui_element)
    Element.find(ui_element).remove_class('spinner')
  end

  private

  # returns a hash with the default values of configuration
  def _init_conf()
    result =
        {produce:     [0],
         abc_parser:  'ABC2SVG',
         wrap:        60,
         defaults:
                      {
                          note_length: "1/4",
                          print:       {t:        "", # title of the extract   # todo: remove these print defaults - no longer needed
                                        v:        [1, 2, 3, 4], # voices to show
                                        startpos: 15, # start position of the harpnotes
                                        s:        [[1, 2], [2, 3]], # synchlines
                                        f:        [1, 3], # flowlines
                                        sf:       [2, 4], # subflowlines
                                        j:        [1, 3], # jumplines
                                        l:        [1, 2, 3, 4] # lyoutlies
                          },
                          legend:      {pos: [20, 20]}, # legend defaults
                          lyrics:      {pos: [20, 60]}, # lyrics defaults
                          annotation:  {pos: [2, -5]} # position of notebound annotation
                      },

         annotations: {
             vt: {text: "v", pos: [-1, -6]},
             vr: {text: "v", pos: [2, -3]},
             vl: {text: "v", pos: [-4, -3]}

         }, # default for note based annotations

         extract:     {
             "0" => {
                 title:        "alle Stimmen",
                 startpos:     15,
                 voices:       [1, 2, 3, 4],
                 synchlines:   [[1, 2], [3, 4]],
                 flowlines:    [1, 3],
                 subflowlines: [2, 4],
                 jumplines:    [1, 3],
                 layoutlines:  [1, 2, 3, 4],
                 legend:       {spos: [320, 27], pos: [320, 20]},
                 lyrics:       {'1' => {verses: [1], pos: [350, 70]}},
                 nonflowrest:  false,
                 notes:        {"1" => {"pos" => [320, 0], "text" => "", "style" => "large"}},
             },
             "1" => {
                 title:  "Sopran, Alt",
                 voices: [1, 2]
             },
             "2" => {
                 title:  "Tenor, Bass",
                 voices: [3, 4]
             }
         },


         layout:
                      {
                          grid:              false,
                          SHOW_SLUR:         false,
                          LINE_THIN:         0.1,
                          LINE_MEDIUM:       0.3,
                          LINE_THICK:        0.5,
                          # all numbers in mm
                          ELLIPSE_SIZE:      [3.5, 1.7], # radii of the largest Ellipse
                          REST_SIZE:         [4, 2], # radii of the largest Rest Glyph

                          # x-size of one step in a pitch. It is the horizontal
                          # distance between two strings of the harp

                          X_SPACING:         11.5, # Distance of strings

                          # X coordinate of the very first beat
                          X_OFFSET:          2.8, #ELLIPSE_SIZE.first,

                          Y_SCALE:           4, # 4 mm per minimal
                          DRAWING_AREA_SIZE: [400, 282], # Area in which Drawables can be placed

                          # this affects the performance of the harpnote renderer
                          # it also specifies the resolution of note starts
                          # in fact the shortest playable note is 1/16; to display dotted 16, we need 1/32
                          # in order to at least being able to handle triplets, we need to scale this up by 3
                          # todo:see if we can speed it up by using 16 ...
                          BEAT_RESOLUTION:   192, # SHORTEST_NOTE * BEAT_PER_DURATION, ## todo use if want to support 5 * 7 * 9  # Resolution of Beatmap
                          SHORTEST_NOTE:     64, # shortest possible note (1/64) do not change this
                          # in particular specifies the range of DURATION_TO_STYLE etc.

                          BEAT_PER_DURATION: 3, # BEAT_RESOLUTION / SHORTEST_NOTE,

                          # this is the negative of midi-pitch of the lowest plaayble note
                          # see http://computermusicresource.com/midikeys.html
                          PITCH_OFFSET:      -43,

                          FONT_STYLE_DEF:    {
                              smaller: {text_color: [0, 0, 0], font_size: 6, font_style: "normal"},
                              small:   {text_color: [0, 0, 0], font_size: 9, font_style: "normal"},
                              regular: {text_color: [0, 0, 0], font_size: 12, font_style: "normal"},
                              large:   {text_color: [0, 0, 0], font_size: 20, font_style: "bold"}
                          },

                          MM_PER_POINT:      0.3,

                          # This is a lookup table to map durations to graphical representation
                          DURATION_TO_STYLE: {
                              #key      size   fill          dot                  abc duration

                              :err => [2, :filled, FALSE], # 1      1
                              :d64 => [1, :empty, FALSE], # 1      1
                              :d48 => [0.75, :empty, TRUE], # 1/2 *
                              :d32 => [0.75, :empty, FALSE], # 1/2
                              :d24 => [0.75, :filled, TRUE], # 1/4 *
                              :d16 => [0.75, :filled, FALSE], # 1/4
                              :d12 => [0.5, :filled, TRUE], # 1/8 *
                              :d8  => [0.5, :filled, FALSE], # 1/8
                              :d6  => [0.3, :filled, TRUE], # 1/16 *
                              :d4  => [0.3, :filled, FALSE], # 1/16
                              :d3  => [0.1, :filled, TRUE], # 1/32 *
                              :d2  => [0.1, :filled, FALSE], # 1/32
                              :d1  => [0.05, :filled, FALSE] # 1/64
                          },

                          REST_TO_GLYPH:     {
                              # this basically determines the white background rectangel
                              # [sizex, sizey], glyph, dot # note that sizex has no effect.
                              :err => [[2, 2], :rest_1, FALSE], # 1      1
                              :d64 => [[0.5, 0.5], :rest_1, FALSE], # 1      1
                              :d48 => [[0.3, 0.3], :rest_1, TRUE], # 1/2 *
                              :d32 => [[0.3, 0.3], :rest_1, FALSE], # 1/2
                              :d24 => [[0.4, 1], :rest_4, TRUE], # 1/4 *
                              :d16 => [[0.4, 1], :rest_4, FALSE], # 1/4
                              :d12 => [[0.4, 1], :rest_8, TRUE], # 1/8 *
                              :d8  => [[0.4, 1], :rest_8, FALSE], # 1/8
                              :d6  => [[0.4, 1], :rest_16, TRUE], # 1/16 *
                              :d4  => [[0.3, 1], :rest_16, FALSE], # 1/16
                              :d3  => [[0.3, 0.5], :rest_32, TRUE], # 1/32 *
                              :d2  => [[0.3, 0.5], :rest_32, FALSE], # 1/32
                              :d1  => [[0.3, 0.5], :rest_64, FALSE] # 1/64
                          }
                      }
        }

    result
  end

end

Document.ready? do
  a = Controller.new
  `uicontroller = #{a}`
  nil
end

