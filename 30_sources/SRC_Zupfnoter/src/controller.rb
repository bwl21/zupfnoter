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
  attr_accessor :zupfnoter_ui, :info_url

  def initialize


    # todo make this configurable by a preferences menu
    languages          = {'de'    => 'de-de',
                          'de-de' => 'de-de',
                          'en'    => 'en-US',
                          'en-us' => 'en-US'
    }
    browser_language   = `navigator.language`.downcase
    zupfnoter_language = languages[browser_language]

    @info_url = "https://www.zupfnoter.de/category/info_#{zupfnoter_language}"

    I18n.locale(zupfnoter_language) if browser_language

    @zupfnoter_ui = `window.hugo = new init_w2ui(#{self});`

    Element.find("#lbZupfnoter").html("Zupfnoter #{VERSION}")

    @console = JqConsole::JqConsole.new('commandconsole', 'zupfnoter> ')
    @console.load_from_loacalstorage
    @console.on_command do |cmd|
      @console.save_to_localstorage
      handle_command(cmd)
    end

    @dropped_abc = "T: nothing dropped yet"

    $log = ConsoleLogger.new(@console)
    $log.info ("Welcome to Zupfnoter")
    $log.info ("Zupfnoter #{VERSION}")
    $log.info ("Opal:     #{RUBY_ENGINE_VERSION}")
    $log.info ("Ruby:     #{RUBY_VERSION}")
    $log.info ("Abc2svg:  #{%x{abc2svg.version}}")


    $conf        = Confstack.new(nil)
    $conf.strict = false
    $conf.push(_init_conf)

    @json_validator = Ajv::JsonValidator.new

    @editor            = Harpnotes::TextPane.new("abcEditor")
    @editor.controller = self

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

    # todo: this should be optimized
    # todo: loading is determined in the load_* Methids. Not sure if this is ok
    uri = self.class.get_uri
    mode = uri[:parsed_search][:mode].last rescue :work

    cleanup_localstorage
    load_from_loacalstorage
    load_demo_tune unless @editor.get_abc_part
    set_status(dropbox: "not connected", music_model: "unchanged", loglevel: $log.loglevel, autorefresh: :off, view: 0, mode: mode) unless @systemstatus[:view]
    set_status(mode: mode)

    #
    # load from previous session

    handle_command('dreconnect')

    demo_uri = uri[:parsed_search][:load] rescue nil
    load_from_uri(uri[:parsed_search][:load]) if demo_uri

    if @systemstatus[:mode] == :demo
      handle_command("view 0")
    end
    @editor.get_lyrics
    render_previews unless uri[:parsed_search][:debug] # prevernt initial rendition in case of hangs caused by input
    #
    #setup_nodewebkit
    # # now trigger the interactive UI
    setup_ui_listener


    show_message_of_the_day


    # todo
    # todo this completes the very first connection to dropbox
    # todo in this case dropbox-Api goes to another window and returns with an access token
    # todo don't know if this is the most eleant solution
    # see controller_command_definitions.rb
    #
  end


  # this method invokes the system conumers
  def call_consumers(clazz)
    @systemstatus_consumers = {systemstatus: [
                                                 lambda { `update_systemstatus_w2ui(#{@systemstatus.to_n})` }
                                             ],
                               statusline:   [],
                               error_alert:  [lambda { `window.update_error_status_w2ui(#{$log.get_errors.join("<br/>\n")})` if $log.has_errors? }],
                               play_start:   [lambda { `update_play_w2ui('start')` }],
                               play_stop:    [lambda { `update_play_w2ui('stop')` }],
                               disable_save: [lambda { `disable_save();`}],
                               enable_save:  [lambda { `enable_save();`}]
    }
    @systemstatus_consumers[clazz].each { |c| c.call() }
  end

  # this handles a command
  # todo: this is a temporary hack until we have a proper ui
  def handle_command(command)
    $log.clear_errors
    begin
      $log.timestamp_start
      $log.timestamp(command)
      @commands.run_string(command)
    rescue Exception => e
      $log.error(%Q{#{e.message} in command "#{command}"}, nil, nil, e.backtrace)
    end
    call_consumers(:error_alert)
  end

  # Save session to local store
  # only if in :work mode
  def save_to_localstorage
    # todo. better maintenance of persistent keys
    systemstatus = @systemstatus.select { |key, _| [:last_read_info_id, :zndropboxlogincmd, :music_model, :view, :autorefresh, :loglevel, :nwworkingdir, :dropboxapp, :dropboxpath, :perspective, :zoom].include?(key) }.to_json
    if @systemstatus[:mode] == :work
      abc = `localStorage.setItem('systemstatus', #{systemstatus});`
      abc = @editor.get_text
      abc = `localStorage.setItem('abc_data', abc);`
    end
  end


  def load_from_uri(url)
    HTTP.get(url).then do |response|
      @editor.set_text(response.body)
    end.fail do |response|
      alert "could not load from URL: #{url}"
    end.always do |response|
    end
  end

  # load session from localstore
  def load_from_loacalstorage
    abc = Native(`localStorage.getItem('abc_data')`)
    @editor.set_text(abc) unless abc.nil?
    envelope = JSON.parse(`localStorage.getItem('systemstatus')`)
    set_status(envelope) if envelope
    nil
  end

  # this does a cleanip of localstorage
  # note that this is maintained from version to version
  def cleanup_localstorage
    keys             = `Object.keys(localStorage)`
    dbx_apiv1_traces = keys.select { |k| k.match(/dropbox\-auth:default:/) }
    unless dbx_apiv1_traces.empty?
      # remove dropbox api-v1
      # remove systemstatus to get rid of the dropbox login status
      # dodo: refine this to remove only dropobox state
      %x{
         localStorage.removeItem(#{dbx_apiv1_traces.first});
         localStorage.removeItem('systemstatus');
        }
    end

    %x{localStorage.setItem('zupfnoterVersion', #{VERSION})}
    nil
  end

  # this loads a demo song
  def load_demo_tune
    abc = %Q{X:21
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
  "produce"     : [1],
  "annotations" : {
    "refn" : {
      "pos"  : [20, 10],
      "text" : "referenced note",
      "id"   : "refn"
    }
  },
  "extract"     : {
    "0" : {
      "voices"      : [1, 2, 3, 4],
      "flowlines"   : [1, 3],
      "layoutlines" : [1, 2, 3, 4],
      "legend"      : {"pos": [310, 175], "spos": [310, 182]},
      "notes"       : {
        "1" : {
          "pos"   : [340, 10],
          "text"  : "Ich steh an deiner Krippen hier",
          "style" : "strong"
        }
      },
      "lyrics"      : {
        "1" : {
          "verses" : [1, 2, 3, 4, 5, 6, 7, 8],
          "pos"    : [10, 100]
        }
      }
    }
  },
  "$schema"     : "https://zupfnoter.weichel21.de/schema/zupfnoter-config_1.0.json",
  "$version"    : "1.4.0 beta 2"
}
}
    @editor.set_text(abc)
  end

  # render the harpnotes to a3
  def render_a3(index = @systemstatus[:view])
    printer = Harpnotes::PDFEngine.new
    printer.draw(layout_harpnotes(index, 'A3'))
  end


  # render the harpnotes splitted on a4 pages
  def render_a4(index = @systemstatus[:view])
    Harpnotes::PDFEngine.new.draw_in_segments(layout_harpnotes(index, 'A4'))
  end


  # migrate the configuration which is provided from textox
  # this method is necesary to upgrade existing sheets
  def migrate_config(config)
    result           = Confstack.new(false)
    result.strict    = false
    old_config       = Confstack.new(false)
    old_config.strict= false
    old_config.push(config.clone)
    result.push(config)

    if config['extract']
      new_lyrics = migrate_config_lyrics(result)
      result.push(new_lyrics)

      sheetnotes = migrate_notes(result)
      result.push(sheetnotes)

    end
    result['$schema'] = SCHEMA_VERSION

    new_config = migrate_config_cleanup(result.get)

    unless old_config.get == new_config
      status = {
          changed:    true,
          message:    %Q{#{I18n.t(I18n.t("Please double check the generated sheets.\n\nYour abc file was automatically migrated\nto Zupfnoter version"))} #{VERSION}},
          oldversion: old_config['$version']
      }
    else
      status = {changed: false, message: "", oldversion: old_config[$version]}
    end

    new_config['$version'] = VERSION

    [new_config, status]
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
          call_consumers(:play_start)
          @harpnote_player.play_auto() if mode == :auto
          @harpnote_player.play_song() if mode == :music_model
          @harpnote_player.play_selection() if mode == :selection
          @harpnote_player.play_from_selection if mode == :selection_ff
        end
        promise.resolve()
      end
    end.fail do |message|
      $log.error("bug: Error in player #{message}", __FILE__, __LINE__)
      call_consumers(:error_alert)
    end
  end

  def stop_play_abc
    @harpnote_player.stop()
    call_consumers(:play_stop)
  end


  # render the previews
  # also saves abc in localstore()
  def render_tunepreview_callback
    setup_tune_preview

    begin
      abc_text = @editor.get_abc_part
      abc_text = abc_text.split("\n").map { |line|
        result = line
        result = result.gsub('~', ' ') if line.start_with? 'W:'
        result
      }.join("\n")

      @tune_preview_printer.draw(abc_text, @editor.get_checksum)
    rescue Exception => e
      $log.error(%Q{Bug #{e.message}}, nil, nil, e.backtrace)
    end
    $log.debug("finished render tune #{__FILE__} #{__LINE__}")
    set_inactive("#tunePreview")

    @editor.set_annotations($log.annotations)

    nil
  end

  # render the previews
  # also saves abc in localstore()
  def render_harpnotepreview_callback
    $log.benchmark("render_harpnotepreview_callback") do
      begin
        $log.debug("viewid: #{@systemstatus[:view]} #{__FILE__} #{__LINE__}")
        @song_harpnotes = layout_harpnotes(@systemstatus[:view])

        if @song_harpnotes
          # todo: not sure if it is good to pass active_voices via @song_harpnotes
          # todo: refactor better moove that part of the code out here
          @harpnote_player.load_song(@music_model, @song_harpnotes.active_voices)
          @harpnote_preview_printer.draw(@song_harpnotes)
          set_status(harpnotes_dirty: false)
        end
      rescue Exception => e
        $log.error(%Q{Bug #{e.message}}, nil, nil, e.backtrace)
      end

      set_status(refresh: false)
    end

    nil
  end


  # @return [Promise] promise such that it can be chained e.g. in play.
  def render_previews()

    @editor.resize();
    $log.info("rendering")
    set_status(harpnotes_dirty: true)

    $log.clear_errors
    $log.clear_annotations

    unless @systemstatus[:autorefresh] == :remote
      save_to_localstorage
      send_remote_command('render')
    end

    # note that render_tunepreview_callback also initializes the previewPrinter
    # by calling setup_tune_preview
    # todo: clarfiy why setup_tune_preview needs to be called on every preview
    result = Promise.new.tap do |promise|
      set_active("#tunePreview")
      `setTimeout(function(){#{render_tunepreview_callback()};#{promise}.$resolve()}, 0)`
    end.then do
      Promise.new.tap do |promise|
        set_active("#harpPreview")
        @harpnote_preview_printer.clear
        `setTimeout(function(){#{render_harpnotepreview_callback()};#{promise}.$resolve()}, 50)`
      end.then do
        Promise.new.tap do |promise|
          call_consumers(:error_alert)
          set_inactive("#harpPreview")
          @editor.set_annotations($log.annotations)
          promise.resolve()
        end
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
  def layout_harpnotes(print_variant = 0, page_format='A4')

    config = get_config_from_editor
    @editor.neat_config

    $conf.reset_to(1) # todo: verify this: reset in case we had errors in previous runs
    $conf.push(config) # in case of error, we hav the ensure close below

    begin

      $log.benchmark("validate default conf") do
        @json_validator.validate_conf($conf) if $log.loglevel == :debug
      end

      load_music_model
      `document.title = #{@music_model.meta_data[:filename]}` ## todo: move this to a call back.
      $log.timestamp("transform  #{__FILE__} #{__LINE__}")

      result = Harpnotes::Layout::Default.new.layout(@music_model, nil, print_variant, page_format)

      $log.timestamp("layout  #{__FILE__} #{__LINE__}")

      #$log.debug(@music_model.to_json) if $log.loglevel == 'debug'
      @editor.set_annotations($log.annotations)
    rescue Exception => e
      $log.error(%Q{#{e.message}}, nil, nil, e.backtrace)
    ensure
      $conf.pop
    end
    result
  end

  def load_music_model
    abc_parser = $conf.get('abc_parser')
    $log.timestamp_start
    @music_model          = Harpnotes::Input::ABCToHarpnotesFactory.create_engine(abc_parser).transform(@editor.get_abc_part)
    @music_model.checksum = @editor.get_checksum
  end

  # this retrieves the current config from the editor
  def get_config_from_editor
    config, status = @editor.get_parsed_config
    if status
      config, status = migrate_config(config)
      if status[:changed]
        alert(status[:message])
        @editor.set_config_part(config)
        # @editor.prepend_comment(status[:message])
      end
    end

    config
  end

  def self.get_uri()
    parser = nil;
    # got this from http://stackoverflow.com/a/21152762/2092206
    # maybe we switch to https://github.com/medialize/URI.js
    %x{
    #{parser} = new URL(window.location.href);

        var qd = {};
        #{parser}.search.substr(1).split("&").forEach(function(item) {
            var s = item.split("="),
                k = s[0],
                v = s[1] && decodeURIComponent(s[1]);
            //(k in qd) ? qd[k].push(v) : qd[k] = [v]
            (qd[k] = qd[k] || []).push(v) //short-circuit
            })
         #{parser}.parsed_search = qd
      }

    # parser.protocol; // => "http:"
    # parser.host;     // => "example.com:3000"
    # parser.hostname; // => "example.com"
    # parser.port;     // => "3000"
    # parser.pathname; // => "/pathname/"
    # parser.hash;     // => "#hash"
    # parser.search;   // => "?search=test"
    # parser.origin;   // => "http://example.com:3000"
    #     }
    Native(parser)
  end

  # highlight a particular abc element in all views
  # note that previous selections are still maintained.
  # @param [Hash] abcelement : [{startChar: xx, endChar: yy}]
  def highlight_abc_object(abcelement)
    a         =Native(abcelement)
    #$log.debug("select_abc_element #{a[:startChar]} (#{__FILE__} #{__LINE__})")

    startchar = a[:startChar]
    endchar   = a[:endChar]
    endchar   = endchar - 5 if endchar == startchar # workaround bug https://github.com/paulrosen/abcjs/issues/22
    unless @harpnote_player.is_playing?
      @editor.select_range_by_position(startchar, endchar, @expand_selection)
    end

    @tune_preview_printer.range_highlight_more(a[:startChar], a[:endChar])

    @harpnote_preview_printer.range_highlight_more(a[:startChar], a[:endChar])
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
    highlight_abc_object(abcelement)
  end

  def set_status(status)
    @systemstatus.merge!(status)
    $log.debug("#{@systemstatus.to_s} #{__FILE__} #{__LINE__}")
    $log.loglevel= (@systemstatus[:loglevel]) unless @systemstatus[:loglevel] == $log.loglevel

    save_to_localstorage
    call_consumers(:systemstatus)
    nil
  end

  # this method sets systemstatus from the status of @dropboxclient
  def set_status_dropbox_status
    set_status(dropbox: "#{@dropboxclient.app_name}: #{@dropboxpath}", dropboxapp: @dropboxclient.app_id, dropboxpath: @dropboxpath)
  end

  private


  # setup the harpnote prviewer
  def setup_harpnote_preview

    @harpnote_preview_printer = Harpnotes::SvgEngine.new("harpPreview", 2200, 1400) # size of canvas in pixels
    @harpnote_preview_printer.set_view_box(0, 0, 420, 297) # todo: configure ? this scales the whole thing such that we can draw in mm
    @harpnote_preview_printer.on_select do |harpnote|
      select_abc_object(harpnote.origin)
    end

    ## register handler for dragging annotations
    @harpnote_preview_printer.on_annotation_drag_end do |info|

      conf_key  = info[:conf_key]
      newcoords = info[:conf_value_new]
      unless newcoords
        newcoords = info[:conf_value][:pos].zip(info[:delta]).map { |i| i.first + i.last }
      end

      @editor.patch_config_part(conf_key, newcoords)
      @config_form_editor.refresh_form if @config_form_editor
    end

    @harpnote_preview_printer.on_mouseover do |info|
      `update_mouseover_status_w2ui(#{info.conf_key})`
    end

    @harpnote_preview_printer.on_mouseout do |info|
      `update_mouseover_status_w2ui('')`
    end

    # info: see ZnSvg::Paper
    @harpnote_preview_printer.on_draggable_rightcklick do |info|
      %x{
          $(#{info.element}).w2menu({
                                       items: [
                                                  { id: 'config', text: 'Edit config', icon: 'fa fa-gear' }
                                              ],
                                       onSelect: function (event) {
                                           w2ui.layout_left_tabs.click('configtab');
                                           #{handle_command(%Q{editconf #{info[:conf_key].gsub(/\.[^\.]+$/, '') }})}
                                       }
                                   });
          return false ;
        };
    end

  end


  # setup tune preview
  def setup_tune_preview
    # todo: remove
    # width = Native(Element.find("#tunePreviewContainer").width) - 50 # todo: 70 determined by experiement
    # $log.debug("tune preview-width #{width} #{__FILE__}:#{__LINE__}")
    # printerparams = {staffwidth: width} #todo compute the staffwidth
    @tune_preview_printer = ABC2SVG::Abc2Svg.new(Element.find('#tunePreview'))

    @tune_preview_printer.on_select do |abcelement|
      a=Native(abcelement) # todo remove me
      select_abc_object(abcelement)
    end
  end

  def set_harppreview_size(size)
    @harpnote_preview_printer.set_canvas(size)
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
       text = zip.file(/^[^/ ]*\.xml$/)[0].asText();
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
                          if (files[0].name.endsWith('.mxl')){
                              reader.readAsBinaryString(files[0]);
                             }
                           else
                             {
                              reader.readAsText(files[0], "UTF-8");
                             }

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


  def toggle_console
    %x{
       w2ui['layout'].toggle('bottom', window.instant);
       #{@editor}.$resize();
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
      a              = @editor.get_selection_positions
      selection_info = @editor.get_selection_info
      ranges         = selection_info[:selection]
      $log.debug("editor selecton #{a.first} to #{a.last} (#{__FILE__}:#{__LINE__})")

      $log.debug "dirtyflag: #{@systemstatus[:harpnotes_dirty]}"
      unless false # @systemstatus[:harpnotes_dirty]
        @harpnote_preview_printer.range_highlight(a.first, a.last)
        @tune_preview_printer.range_highlight(a.first, a.last)
        @harpnote_player.range_highlight(a.first, a.last)
      end
    end

    @editor.on_cursor_change do |e|
      request_refresh(false)

      selection_info = @editor.get_selection_info
      ranges         = selection_info[:selection]

      position = "#{ranges.first.first}:#{ranges.first.last}"
      position += " - #{ranges.last.first}:#{ranges.last.last}" unless ranges.first == ranges.last

      if selection_info[:token]
        token = selection_info[:token]
      else
        token = {type: "", value: ""}
      end

      editorstatus = {position:  position,
                      tokeninfo: "#{token[:type]} [#{token[:value]}]",
                      token:     token
      }

      `update_editor_status_w2ui(#{editorstatus.to_n})` # todo: use a listener here ...

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

    $window.on :mousedown do |e|
      @expand_selection = e.shift_key
      true # meed this to continue processing of the mouse event
    end

    # key events in editor
    $window.on :keydown do |e|
      if (e.meta_key || e.ctrl_key) # Ctrl/Cmd
        case (e.key_code)
          when 'A'.ord
            @editor.select_range_by_position(0, 10000)
          when 'R'.ord, 13
            e.prevent
            render_previews()
          when 'S'.ord #s
            e.prevent
            handle_command("dsave")
          when 'P'.ord #p
            e.prevent
            play_abc('auto')
          when 'K'.ord #k
            e.prevent
            toggle_console
        end
      end
    end

    Element.find(`window`).on(:storage) do |evt|
      key   = Native(evt[:originalEvent]).key
      value = Native(evt[:originalEvent]).newValue

      $log.debug("got storage event #{key}: #{value} (#{__FILE__} #{__LINE__})")
      if @systemstatus[:autorefresh] == :remote && key == :command && value == 'render'
        load_from_loacalstorage
      end
    end


  end

  def show_message_of_the_day
    messages = []

    info_feed_url = "#{@info_url}/feed/"
    %x{
        $.get(#{info_feed_url}, function (data) {
            $(data).find("item").each(function () { // or "item" or whatever suits your feed
                var el = $(this);
                #{messages}.push(
                  {'title':  el.find("title").text(),
                   'description': el.find("description").text(),
                   'link':  el.find("link").text(),
                   'pubDate': el.find("pubDate").text(),
                   'postId': el.find("post-id").text()
                  }
                )
            })
          #{present_message_of_the_day(messages)}
        });
    }
  end

  def present_message_of_the_day(messages)

    last_info_id      = Native(messages.first)[:postId].to_i
    last_read_info_id = systemstatus[:last_read_info_id] || 0

    have_read = lambda do
      %x{window.open(#{@info_url})}
      set_status({last_read_info_id: last_info_id})
    end

    have_not_read = lambda do
      # alert (" hat nicht gelesen gelesen")
    end

    body = messages.map { |m|
      nm      = Native(m)
      post_id = nm[:postId]
      desc    = nm[:description]
      %Q{<div style="text-align:left;"><p>#{post_id}: #{nm[:title]}</p></div>}
    }.join

    options = {
        msg:      body,
        title:    I18n.t('There is new unread information'),
        width:    600, # width of the dialog
        height:   200, # height of the dialog
        modal:    true,
        btn_yes:  {
            text:     I18n.t('read now'), # text for yes button (or yes_text)
            class:    '', # class for yes button (or yes_class)
            style:    '', # style for yes button (or yes_style)
            callBack: have_read # callBack for yes button (or yes_callBack)
        },
        btn_no:   {
            text:     I18n.t('read later'), # text for no button (or no_text)
            class:    '', # class for no button (or no_class)
            style:    '', # style for no button (or no_style)
            callBack: have_not_read # callBack for no button (or no_callBack)
        },
        callBack: nil # common callBack
    };

    # todo: w2confirm might be in conflict with other popus
    if last_info_id > last_read_info_id
      %x{
       w2confirm(#{options.to_n});
      }
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
          @refresh_timer = `setTimeout(function(){#{render_previews()}}, 100)`
        when :off # off means it relies on remote rendering
          @refresh_timer = `setTimeout(function(){#{render_remote()}}, 300)`
        when :remote # this means that the current instance runs in remote mode
          @refresh_timer = `setTimeout(function(){#{render_previews()}}, 500)`
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
    InitConf.init_conf()
  end

end

Document.ready? do
  a = Controller.new
  # provide access to  zupfnoter controller from browser console
  # to suppert debuggeing
  Element.find("html").append(%Q{ <script type="text/javascript" src="https://www.dropbox.com/static/api/2/dropins.js" id="dropboxjs" data-app-key="#{DBX_APIKEY_FULL}"></script>
})
  `window.zupfnoter=#{a}`
end

