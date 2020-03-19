# This is a wrapper class for local store


class LastRenderMonitor
  def ok?
    result = %x{localStorage.getItem('lastrender')}
    Native(result).nil?
  end

  def set_active
    %x{localStorage.setItem('lastrender', #{Time.now()})  }
    true
  end

  def clear
    %x{localStorage.removeItem('lastrender')  }
    false
  end
end


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
      `localStorage.removeItem(self.$mangle_key(key))`
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
  attr_accessor :dropped_abc, :dropboxclient, :dropboxpath,  :editor, :harpnote_preview_printer, :info_url, :tune_preview_printer, :systemstatus, :zupfnoter_ui,
                :pdf_preview_string

  def initialize

    buster = Time.now
    buster = Element.find("#buster").html
    buster = JSON.parse(buster)[:buster]

    @worker             = NamedWebworker.new("public/znworker.js#{buster}")
    @worker_tunepreview = @worker #NamedWebworker.new("public/znworker.js#{buster}")
    @worker_info        = {version: 'unknown'}
    @worker.post_named_message(:get_worker_info, nil)


    # todo make this configurable by a preferences menu
    languages = {'de'    => 'de-de',
                 'de-de' => 'de-de',
                 'en'    => 'en-US',
                 'en-us' => 'en-US'
    }
    browser_language = `navigator.language`.downcase rescue "de-de"
    zupfnoter_language = languages[browser_language] || 'de-de'

    @info_url = "https://www.zupfnoter.de/category/info_#{zupfnoter_language}"

    @refresh_timer = [] # this is used to contron time based renderin
    @render_stack  = [] # this is to prevent a restart of rendering in a rendering is already running

    @version = VERSION
    if browser_language
      I18n.locale(zupfnoter_language) do
        call_consumers(:localizedtexts)
        object = `JSON.stringify(#{I18n.phrases.to_n})`
        @worker.post_named_message(:i18n_set_locale, object)
      end
    end

    $conf        = Confstack.new(nil)
    $conf.strict = false
    $conf.push(_init_conf)

    @zupfnoter_ui = `new init_w2ui(#{self})`

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
    $log.info ("JsPdf:    #{JsPDF.jspdfversion}")
    $log.info ("Browser:  #{`bowser.name`}  #{`bowser.version`}");
    $log.info ("Language: #{zupfnoter_language}");
    check_suppoerted_browser




    # this keeps  a hash of resources
    # as resource thend to be big,
    # we do not hold them in $conf
    $resources = {} # this keeps resources

    $settings = {autoscroll: 'true', follow: 'true'} # this is te keep runtime settings
    call_consumers(:settings_menu)

    @json_validator    = Ajv::JsonValidator.new
    @editor            = Harpnotes::TextPane.new("abcEditor")
    @editor.controller = self

    @songbook = LocalStore.new("songbook") # used to store songs in localstore

    @abc_transformer = Harpnotes::Input::Abc2svgToHarpnotes.new #todo: get it from abc2harpnotes_factory.

    @dropboxclient   = Opal::DropboxJs::NilClient.new()

    # initialize the sytemstatus entries which are absolutely necessary
    @systemstatus = {version: VERSION, dropboxpathlist: []}

    # initialize the commandstack
    # note that CommandController has methods __ic_01 etc. to register the commands
    # these methods are invoked here.
    @commands = CommandController::CommandStack.new
    self.methods.select { |n| n =~ /__ic.*/ }.each { |m| send(m) } # todo: what is this?

    ## setup preview panes
    setup_tune_preview
    setup_harpnote_preview
    setup_harpnote_player
    setup_worker_listners

    # initialize virgin zupfnoter

    # todo: this should be optimized
    # todo: loading is determined in the load_* Methids. Not sure if this is ok
    uri = self.class.get_uri
    mode = uri[:parsed_search][:mode].last rescue :work

    cleanup_localstorage
    load_from_loacalstorage
    load_demo_tune if @editor.get_abc_part.empty?
    set_status(dropbox: "not connected", music_model: "unchanged", loglevel: $log.loglevel, autorefresh: :off, view: 0,
               mode:    mode) unless @systemstatus[:view]
    set_status(mode: mode)

    set_status(saveformat: "A3-A4") unless @systemstatus[:saveformat]

    get_current_template
    #
    # load from previous session

    handle_command('dreconnect')

    demo_uri = uri[:parsed_search][:load] rescue nil
    load_from_uri(uri[:parsed_search][:load]) if demo_uri

    if @systemstatus[:mode] == :demo
      handle_command("view 0")
    else
      @editor.get_lyrics

      #$log.error(I189n.t("last session failed. Did not render"))
      lastrender = LastRenderMonitor.new

      if lastrender.ok?
        render_previews unless uri[:parsed_search][:debug] # prevernt initial rendition in case of hangs caused by input
      else
        $log.error(I18n.t("last session failed. Did not render. Cleanup ABC, then render manually"))
        call_consumers(:error_alert)
      end
    end
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

  def about_zupfnoter
    %Q{<p>#{I18n.t("Free software to create sheets for table harps")}</p>
         <table>
          <tbody>
          <tr><td>Zupfnoter:</td><td>#{VERSION}</td></tr>
          <tr><td>Worker:</td><td>#{@worker_info[:version]}</td></tr>
          <tr><td><a target="_blank" href="http://opalrb.com">Opal</a>:</td><td>#{RUBY_ENGINE_VERSION}</td></tr>
          <tr><td>Ruby:</td><td>#{RUBY_VERSION}</td></tr>
          <tr><td><a target="_blank" href="http://moinejf.free.fr/js/index.html">abc2svg</a>:</td><td>#{%x{abc2svg.version}}</td></tr>
          <tr><td><a target="_blank" href="https://wim.vree.org/js/xml2abc-js_index.html">xml2abc.js</a>:</td><td>#{%x{xml2abc_VERSION}}</td></tr>
          <tr><td><a target="_blank" href="https://parall.ax/products/jspdf">jsPDF</a>:</td><td>#{JsPDF.jspdfversion}</td></tr>
         </tbody>
        </table>
        <p>© #{Time.now.year} Bernhard Weichel - info@zupfnoter.de</p>
        <p><a target="_blank" href="https://www.zupfnoter.de">Website: https://www.zupfnoter.de</a></p>
    }
  end

# this method invokes the system conumers
#

  def make_error_popup
    result = %Q{<p>Wenn du nicht weiter kommmst, poste eine Anfrage über Menü 'Hilfe / support'</p><p>}
    result += $log.get_errors.join("<br/>\n")
    result +=  "</p>"
    result
  end

  def   call_consumers(clazz)
    @systemstatus_consumers = {systemstatus:      [
                                                      lambda { `update_systemstatus_w2ui(#{@systemstatus.to_n})` }
                                                  ],
                               lock:              [lambda { `lockscreen()` }],
                               unlock:            [lambda { `unlockscreen()` }],
                               localizedtexts:    [lambda { %x{update_localized_texts()} }],
                               statusline:        [],
                               error_alert:       [lambda { `window.update_error_status_w2ui(#{make_error_popup})` if $log.has_errors? }],
                               play_start:        [lambda { `update_play_w2ui('start')` }],
                               play_stop:         [lambda { `update_play_w2ui('stop')` }],
                               play_stopping:     [lambda { `update_play_w2ui('stopping')` }],
                               disable_save:      [lambda { `disable_save()` }],
                               enable_save:       [lambda { `enable_save()` }],
                               before_open:       [lambda { `before_open()` }],
                               document_title:    [lambda { `document.title = #{@document_title}` }],
                               current_notes:     [lambda { `update_current_notes_w2ui(#{@harpnote_player.get_notes.join(" ")})` }],
                               settings_menu:     [lambda { `update_settings_menu(#{$settings.to_n})` }],
                               extracts: [lambda {
                                 items = @extracts.map { |id, entry| {id: id, text: "#{id}: #{entry}"} }
                                 `set_extract_menu(#{items.to_n})`
                                 call_consumers(:systemstatus) # restore systemstatus as set_extract_menu redraws the toolbar
                               }],
                               harp_preview_size: [lambda { %x{set_harp_preview_size(#{@harp_preview_size})} }],
                               render_status:     [lambda { %x{set_render_status(#{@systemstatus[:autorefresh]}+ ' '+ #{@render_stack.to_s})} }],
                               show_config_tab:    [lambda { %x{show_config_tab()} }],
                               update_pdf_preview: [lambda {%x{update_pdf_preview(#{self})}  }]
    }
    @systemstatus_consumers[clazz].each { |c| c.call() }
  end

# This provides the configuration form menue entries
# they are defined in ConfstackEditor and can be retrieved
# to be used e.g. in the editor toolbar as well.
  def get_config_form_menu_entries
    ConfstackEditor.get_config_form_menu_entries
  end

# This provides the decoration menue entries
# they are defined in ConfstackEditor and can be retrieved
# to be used e.g. in the editor toolbar as well.
  def get_decoration_menu_entries

    result = [
        {   # emphasis is a glyph and therefore not in DECORATIONS_AS_ANNOTATIONS
            id:      "!fermata!",
            text:    "Fermata ",
            icon:    'fa fa-bars',
            tooltip: "insert decoration: " + %Q{Fermata: 'H'}
        },
        {
            id:      "!emphasis!",
            text:    "Emphasis ",
            icon:    'fa fa-bars',
            tooltip: "insert decoration: " + %Q{Emphasis: 'L'}
        },
        {
            id:      %Q{"^#rit"},
            text:    "rit",
            icon:    'fa fa-bars',
            tooltip: "insert Ritardando"
        },
        {
            id:      %Q{"^#vb"},
            text:    "Damper",
            icon:    'fa fa-bars',
            tooltip: "insert Damper below note"
        },
    ]

    result += $conf['layout.DECORATIIONS_AS_ANNOTATIONS'].map do |name, decoration|
      {
          id:      %Q{!#{name}!},
          text:    %Q{!#{name}!: comes as '#{decoration[:text]}'},
          icon:    'fa fa-bars',
      }
    end
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

# this handles a command which is already parsed
#
# @param [String] command the name of the command
# @param [Hash] args a hash with the arguments. May even be a JS object
  def handle_parsed_command(command, args)
    $log.clear_errors
    begin
      $log.timestamp_start
      $log.timestamp(command)
      @commands.run_parsed_command(command, Native(args))
    rescue Exception => e
      $log.error(%Q{#{e.message} in command "#{command}"}, nil, nil, e.backtrace)
    end
    call_consumers(:error_alert)
  end

# Save session to local store
# only if in :work mode
  def save_to_localstorage
    # todo. better maintenance of persistent keys
    systemstatus = @systemstatus.select { |key, _| [:last_read_info_id, :zndropboxlogincmd, :music_model, :view, :autorefresh,
                                                    :loglevel, :nwworkingdir, :dropboxapp, :dropboxpath, :dropboxpathlist, :dropboxloginstate, :perspective, :saveformat, :zoom].include?(key)
    }.to_json
    if @systemstatus[:mode] == :work
      `localStorage.setItem('systemstatus', #{systemstatus});`
    end
    @editor.save_to_localstorage
  end

  def push_to_dropboxpathlist()
    dropboxpathlist = systemstatus[:dropboxpathlist] || []
    dropboxpathlist.push(@dropboxpath)
    dropboxpathlist = dropboxpathlist.uniq.last(10) # get the last 10 elements
    set_status(dropboxpathlist: dropboxpathlist)
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
    @editor.restore_from_localstorage

    envelope = JSON.parse(`localStorage.getItem('systemstatus')`)
    set_status(envelope) if envelope
    nil
  end

# this does a cleanup of localstorage
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


  def get_chordnotes(chordname)
    chordserver = Chordengine.new("C")
    chordserver.chordnotes(chordname)
  end

  def get_chords_for(notes)
    the_notes = notes
    chordserver = Chordengine.new("C")
    chordserver.chordfor(the_notes)
  end

  def get_chords_for_string(notesstring)
    the_notes = scan_notesstring(notesstring)
    result = get_chords_for(the_notes)
    result
  end

  def scan_notesstring(notesstring)
    notesstring.scan(/([a-gA-G])([#b])?/).map{|i| "#{i.first.upcase}#{i.last}"}
  end

  def play_chord(chordname)
    call_consumers(:play_start)
    chordserver = Chordengine.new("C")
    pitches = chordserver.tomidi(chordserver.chordnotes(chordname, "#")).map{|i| i + 60}
    @harpnote_player.play_pitches(pitches)
  end

  def play_chordnotes(notesstring)
    call_consumers(:play_start)
    the_notes = scan_notesstring(notesstring)
    chordserver = Chordengine.new("C")
    pitches = chordserver.tomidi(the_notes).compact.map{|i| i + 60}
    @harpnote_player.play_pitches(pitches)
  end

# this loads a demo song
  def load_demo_tune
    url = "public/demos/zndemo_42_Ich_steh_an_deiner_krippen_hier.abc"
    HTTP.get(url, {async: false}) do |response|
      @editor.set_text(response.body)

      result = response.body
    end


  end

# render the harpnotes to a3
  def render_a3(index = @systemstatus[:view])
    flowconf = $settings[:flowconf]
    # turn of flowconf:  otherwise very short unconfigured undconfigured flowlines are
    # longer because of the default values of the handles whihc make the curve from    +-+  to -+-+-
    $settings[:flowconf] = false
    result               = Harpnotes::PDFEngine.new.draw(layout_harpnotes(index, 'A3'))
    $settings[:flowconf] = flowconf
    result
  end


# render the harpnotes splitted on a4 pages
  def render_a4(index = @systemstatus[:view])
    flowconf             = $settings[:flowconf]
    $settings[:flowconf] = false
    result               = Harpnotes::PDFEngine.new.draw_in_segments(layout_harpnotes(index, 'A4'))
    $settings[:flowconf] = flowconf
    result
  end


# migrate the configuration which is provided from textox
# this method is necesary to upgrade existing sheets
  def migrate_config(config)
    result            = Confstack.new(false)
    result.strict     = false
    old_config        = Confstack.new(false)
    old_config.strict = false
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
          verses                  = element.first.gsub(",", " ").split(" ").map { |f| f.to_i }
          ir[(ir.count + 1).to_s] = {"verses" => verses, "pos" => element.last}
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
          ir[(ir.count + 1).to_s] = element
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
          call_consumers(:play_stopping)
          stop_play_abc
        elsif @harpnote_player.is_stopped?
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
  end


# render the tune previews
  def render_tunepreview_in_uithread
    set_active("#tunePreview")
    # by calling setup_tune_preview
    # todo: clarfiy why setup_tune_preview needs to be called on every preview

    setup_tune_preview

    begin
      abc_text = tweak_abc_text

      $log.benchmark("render tune preview") do
        svg_and_positions = @tune_preview_printer.compute_tune_preview(abc_text, @editor.get_checksum)
        @tune_preview_printer.set_svg(svg_and_positions)
        set_inactive("#tunePreview")
      end
    rescue Exception => e
      $log.error(%Q{Bug #{e.message}}, nil, nil, e.backtrace)
    end
    nil
  end

  def render_tunepreview__in_worker
    set_active("#tunePreview")
    # by calling setup_tune_preview
    # todo: clarfiy why setup_tune_preview needs to be called on every preview
    setup_tune_preview

    begin
      abc_text = tweak_abc_text

      $log.benchmark("render tune preview by worker") do
        @worker_tunepreview.post_named_message(:compute_tune_preview, {abc: abc_text, checksum: @editor.get_checksum})
      end
    rescue Exception => e
      $log.error(%Q{Bug #{e.message}}, nil, nil, e.backtrace)
    end
    nil
  end

  def tweak_abc_text
    abc_text = @editor.get_abc_part
    abc_text = abc_text.split("\n").map { |line|
      result = line
      result = result.gsub(/(\\?)(~)/) { |m| m[0] == '\\' ? m[1] : ' ' } if line.start_with? 'W:'
      result
    }.join("\n")
  end

# render the harpnote previews in a worker
  def render_harpnotepreview_in_worker
    $log.benchmark("render_harpnotepreview_callback_by_worker") do
      set_active("#harpPreview")
      @worker.post_named_message(:compute_harpnotes_preview, {
          settings:             $settings,
          resources:            $resources,
          systemstatus:         @systemstatus,
          uri:                  {hostname: self.class.get_uri[:hostname]},
          config_from_editor:   get_config_from_editor,
          page_format:          "A3",
          abc_part_from_editor: @editor.get_abc_part,
          checksum:             @editor.get_checksum
      })
    end
    nil
  end


# render the harpnote-previews in the main thread
  def render_harpnotepreview_callback
    $log.benchmark("render_harpnotepreview_callback") do
      begin
        $log.debug("viewid: #{@systemstatus[:view]} #{__FILE__} #{__LINE__}")
        @song_harpnotes = layout_harpnotes(@systemstatus[:view], "A3")

        if @song_harpnotes

          # todo: not sure if it is good to pass active_voices via @song_harpnotes
          # todo: refactor better moove that part of the code out here
          $log.benchmark("loading music to player") { @harpnote_player.load_song(@music_model, @song_harpnotes.active_voices) }

          $log.benchmark("drawing preview sheet") {
            svg_and_positions = @harpnote_preview_printer.draw(@song_harpnotes)
            @harpnote_preview_printer.set_svg(svg_and_positions)
            harpnote_preview_printer.draw(@song_harpnotes)
            set_inactive("#harpPreview")
          }
          set_status(harpnotes_dirty: false)
        end
      rescue Exception => e
        $log.error(%Q{Bug #{e.message}}, nil, nil, e.backtrace)

      end

      set_status(refresh: false)
    end

    nil
  end

  def render_previews()
    LastRenderMonitor.new.set_active

    save_to_localstorage

    @harpnote_preview_printer.save_scroll_position
    @editor.resize();
    $log.info("rendering")
    set_status(harpnotes_dirty: true)

    $log.clear_errors
    $log.clear_annotations

    # now handle harp previews

    if @systemstatus[:autorefresh] == :on
      render_previews_in_worker()
    else
      render_previews_in_uithread().then do
        call_consumers(:update_pdf_preview)
      end
    end
  end

  def render_previews_in_worker()
    render_tunepreview__in_worker

    result = Promise.new.tap do |promise|
      #set_active("#tunePreview")
      #`setTimeout(function(){#{render_tunepreview_callback()};#{promise}.$resolve()}, 0)`
      #  `setTimeout(function(){#{promise.resolve}}, 0)`
      promise.resolve()
      # nil
    end.fail do
      alert("fail")
    end.then do
      Promise.new.tap do |promise|
        @harpnote_preview_printer.clear
        @render_stack.push(@render_stack.count + 1)
        call_consumers(:render_status)
        if @render_stack.size == 1
          render_harpnotepreview_in_worker()
        end
        promise.resolve()
      end.fail do
        alert("BUG - This should never happen in render Previews #{__FILE__} #{__LINE__}")
      end
    end

    result
  end


# @return [Promise] promise such that it can be chained e.g. in play.
  def render_previews_in_uithread()
    render_tunepreview_in_uithread

    # note that render_tunepreview_callback also initializes the previewPrinter
    # by calling setup_tune_preview
    # todo: clarfiy why setup_tune_preview needs to be called on every preview
    result = Promise.new.tap do |promise|
      promise.resolve()
    end.then do
      Promise.new.tap do |promise|
        @harpnote_preview_printer.clear

        # we need to call render_harpnotepreview_callbac in a setTimeout
        # othewise the busy-indicator set_active is not rendered by the UI
        set_active("#harpPreview")
        `setTimeout(function(){#{render_harpnotepreview_callback()};#{promise}.$resolve()}, 0)`

        #render_harpnotepreview_callback()
      end.fail do
        alert("BUG - This should never happen in render Previews #{__FILE__} #{__LINE__}")
      end
    end.then do
      Promise.new.tap do |promise|
        @harpnote_preview_printer.bind_elements
        call_consumers(:error_alert)
        @editor.set_annotations($log.annotations)
        LastRenderMonitor.new.clear
        promise.resolve()
      end
    end.then do
      Promise.new.tap do |promise|
        engine              = Harpnotes::PDFEngine.new
        @pdf_preview_string = engine.draw(@song_harpnotes).output('datauristring')
        promise.resolve()
      end
    end

    result
  end

  # this is an accessor which tries to recompute
  # the value if is not available
  def pdf_preview_string
    if @systemstatus[:autorefresh] and not @pdf_preview_string.empty?
      @pdf_preview_string
    else
      engine              = Harpnotes::PDFEngine.new
      @pdf_preview_string = engine.draw(@song_harpnotes).output('datauristring')
    end
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
  def layout_harpnotes(print_variant = 0, page_format = 'A4')
    $log.benchmark("transforming music model") { load_music_model }

    $image_list = $conf.get['resources'].keys rescue nil

    # prepare extract menu
    set_extracts_menu


    begin
      $log.benchmark("validate default conf") do
        @validation_errors = []
        @validation_errors = @json_validator.validate_conf($conf) if ($log.loglevel == :debug || $settings[:validate] == :true)
        @validation_errors
      end

      call_consumers(:document_title)

      result = nil
      $log.benchmark("computing layout") do
        layouter              = Harpnotes::Layout::Default.new
        layouter.uri          = self.class.get_uri
        layouter.placeholders = get_placeholder_replacers(print_variant)
        result                = layouter.layout(@music_model, nil, print_variant, page_format)
      end

      #$log.debug(@music_model.to_json) if $log.loglevel == 'debug'
      @editor.set_annotations($log.annotations)
    rescue Exception => e
        $log.error(%Q{#{__FILE__}:#{__LINE__}: #{e.message}}, nil, nil, e.backtrace)
    ensure
      $conf.pop
    end
    result
  end


## todo: this is not DRY, we define this method
# in controller.rb as well
  def get_placeholder_replacers(print_variant_nr)
    # keys for musid_model see _mk_meta_data
    # @meta_data = {number:        (@info_fields[:X]),
    # composer:      (@info_fields[:C] or []).join("\n"),
    #     title:         (@info_fields[:T] or []).join("\n"),
    #     filename:      (@info_fields[:F] or []).join("\n"),
    #     tempo:         {duration: duration, bpm: bpm, sym: tempo_note},
    #     tempo_display: tempo_display,
    #     meter:         @info_fields[:M],
    #     key:           key,
    #     o_key:         o_key_display
    # }

    {
        composer:         lambda { @music_model.meta_data[:composer] },
        key:              lambda { @music_model.meta_data[:key] },
        meter:            lambda { @music_model.meta_data[:meter].join(" ") },
        number:           lambda { @music_model.meta_data[:number] },
        o_key:            lambda { @music_model.meta_data[:o_key] },
        tempo:            lambda { @music_model.meta_data[:tempo_display] },
        title:            lambda { @music_model.meta_data[:title] },
        extract_title:    lambda { $conf["extract.#{print_variant_nr}.title"] },
        extract_filename: lambda { $conf["extract.#{print_variant_nr}.filenamepart"] },
        printed_extracts: lambda { $conf[:produce].map { |k| $conf["extract.#{k}.filenamepart"] }.join(" ") },
        watermark:        lambda { $settings[:watermark] || "" },
        current_year:     lambda { Time.now.year.to_s }
    }
  end

  def load_music_model
    config = get_config_from_editor

    $conf.reset_to(1) # todo: verify this: reset in case we had errors in previous runs
    $conf.push(config) # in case of error, we have the ensure close below

    harpnote_engine                   = Harpnotes::Input::Abc2svgToHarpnotes.new
    @music_model, player_model_abc    = harpnote_engine.transform(@editor.get_abc_part)
    @abc_model                        = harpnote_engine.abc_model
    @harpnote_player.player_model_abc = player_model_abc
    @music_model.checksum             = @editor.get_checksum
    @document_title                   = @music_model.meta_data[:filename]
  end

# this retrieves the current config from the editor
  def get_config_from_editor
    config, status = @editor.get_config_model
    if status
      config, status = migrate_config(config)
      if status[:changed]
        $log.info(status[:message])
        @editor.set_config_model(config, "{migrated config}", true)
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

# this is intended to be used for following the player only
# todo: not clear if it is ok, to deal with DOM-Elements here
# but this allows to hightliight tune and harp preview simultaneously
  def highlight_abc_object_by_player_callback(startchar, on)
    elements = Element.find("._#{startchar}_")
    if on

      # highlight in tune and harp preview
      elements.add_class('highlightplay')

      # scroll in tune preview
      @tune_preview_printer.scroll_into_view(elements.first)

      # scroll in harp preview
      zn_element = elements.select { |i| i.has_class?('znref') }.last
      @harpnote_preview_printer.scroll_to_element(elements.select { |i| i.has_class?('znref') }.last) if zn_element
    else
      elements.remove_class('highlightplay')
    end
    nil
  end

# highlight a particular abc element in all views
# note that previous selections are still maintained.
# note that previous selections are still maintained.
# @param [Hash] abcelement : [{startChar: xx, endChar: yy}]
  def highlight_abc_object(abcelement)
    a = Native(abcelement)
    #$log.debug("select_abc_element #{a[:startChar]} (#{__FILE__} #{__LINE__})")

    startchar = a[:startChar]
    endchar   = a[:endChar]
    endchar   = endchar - 5 if endchar == startchar # workaround bug https://github.com/paulrosen/abcjs/issues/22
    unless @harpnote_player.is_playing?
      @editor.select_range_by_position(startchar, endchar, @expand_selection)
      call_consumers(:current_notes)
    end

    @tune_preview_printer.range_highlight_more(a[:startChar], a[:endChar])

    @harpnote_preview_printer.range_highlight_more(a[:startChar], a[:endChar])
  end


# @param [Hash] abcelement : [{startChar: xx, endChar: yy}]
  def unhighlight_abc_object(abcelement)
    a = Native(abcelement) # remove me
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

# this performs a selection based on time segements
# it will select all musical symbols which are in the
# given time range in any voice
#
# it can highlight multiple segments, even if there
# is no usecase yet
#
# @param [Array of Array of Integer] segments the list of segments which shall be highlighted
  def select_by_time_segments(segments)
    result = []

    voice_map = @abc_model[:voices].map { |v| v[:symbols] }
    segments.each do |segment|
      voice_map.each do |voice|
        selection = voice
                        .select { |e| not [5, 6, 12, 14].include? e[:type] }
                        .select { |element| element[:time].between?(*segment) }
        result.push([selection.first, selection.last]) unless selection.empty?
      end
    end
    result

    #@editor.clear_selection
    result.each do |range|
      if range == result.first
        @editor.select_range_by_position(range.first[:istart], range.last[:iend])
      else
        @editor.select_add_range_by_position(range.first[:istart], range.last[:iend])
      end
    end
  end


# this returns a list of time ranges
# covered by the current selection in editor
#
# purpose is to select a given time range in
# all voices the result of this method
# can be used in select_by_time_segments
#
  def get_selected_time_segments
    ranges = @editor.get_selection_ranges
    $log.info(ranges.to_json)

    time_ranges = ranges.map do |erange|
      range    = erange.to_a
      range    = [range.first, range.last - 1] unless range.first == range.last # to make ?between ignore the upper limit
      elements = @abc_model[:voices].map do |v|
        v[:symbols]
            .select { |e| !(e[:iend].nil? or e[:istart].nil?) and ((e[:istart].between?(*range)) or (e[:iend].between?(*range))) }
      end
      a        = elements.flatten.compact

      $log.info(a.to_json)
      if a.empty?
        $log.error(I18n.t("your cursor is not within a voice"))
        result = [0, 0]
      else
        result = [a.first[:time], a.last[:time] + a.last[:dur] - 1] # expand the selection to the end of the last note
      end
      result
    end

    time_ranges
  end

  def set_status(status)
    @systemstatus.merge!(status)
    $log.debug("sytemstatus: #{@systemstatus.to_s} #{__FILE__} #{__LINE__}")
    $log.loglevel = (@systemstatus[:loglevel]) unless @systemstatus[:loglevel] == $log.loglevel

    save_to_localstorage
    call_consumers(:systemstatus)
    nil
  end

# this method sets systemstatus from the status of @dropboxclient
  def set_status_dropbox_status
    set_status(dropbox: "#{@dropboxclient.app_name}: #{@dropboxpath}", dropboxapp: @dropboxclient.app_id, dropboxpath: @dropboxpath, dropboxloginstate: @dropboxloginstate)
  end

  def clear_status_dropbox_status
    set_status(dropbox: "#{@dropboxclient.app_name}: #{@dropboxpath}", dropboxapp: nil, dropboxpath: nil, dropboxloginstate: nil)
  end

  def set_extracts_menu
    $log.benchmark("prepare extract menu") do
      printed_extracts = $conf['produce']
      @extracts        = $conf.get('extract').inject([]) do |r, entry|
        extract_number = entry.last.dig(:filenamepart)
        print          = (printed_extracts.include?(entry.first.to_i) ? '*  ' : ' ')
        title          = %Q{#{print}#{extract_number} #{entry.last[:title]} }
        r.push([entry.first, title])
      end
      call_consumers(:extracts)
    end
  end


# setup the harpnote prviewer
  def setup_harpnote_preview

    @harpnote_preview_printer = Harpnotes::SvgEngine.new("harpPreview", 10, 10) # size of canvas in pixels
    # todo: DRY 2200, 1400 is also defined in userinterface.js
    set_harppreview_size([2200, 1400])
    @harpnote_preview_printer.set_view_box(0, 0, 420, 297) # todo: configure ? this scales the whole thing such that we can draw in mm
    @harpnote_preview_printer.on_select do |harpnote|
      select_abc_object(harpnote[:origin])
    end

    ## register handler for dragging annotations
    # the handler is called with an info - hash
    # conf_key: the key of configuration to be patched
    # conf_value_new: the new value of configuration to be patched
    #
    # if conf_value_new is nil then process the following keys
    # conf_value: {pos: []} old position
    # delta: {delta: []} delta for positions
    #
    # Note: it is a matter of the draginfo[:handler] to select
    # the correct draggable handler which has to handle
    # drag operation as well as eventually compute the value for info
    #
    # see opal_svg: bind_elements for details
    #
    #

    @harpnote_preview_printer.on_drag_start do |info|
    end

    @harpnote_preview_printer.on_drag_end do |info|
      conf_key  = info[:conf_key]
      newcoords = info[:conf_value_new]
      unless newcoords
        newcoords = info[:conf_value][:pos].zip(info[:delta]).map { |i| i.first + i.last }
      end

      @editor.patch_config_part(conf_key, newcoords, "drag #{conf_key}")
      @config_form_editor.refresh_form if @config_form_editor
    end

    @harpnote_preview_printer.on_mouseover do |info|
      `update_mouseover_status_w2ui(#{info[:conf_key]})`
    end

    @harpnote_preview_printer.on_mouseout do |info|
      `update_mouseover_status_w2ui('')`
    end

    # info: see ZnSvg::Paper
    # info: see opal-svg.rb line 116
    # todo: this is not prepared for more than two context menu items
    # this is a bit a hack to create the context menu for harp preview
    # Approach:
    #   minc is a menu entry of its own
    #   config distinguishes between config_note and default config.
    # it would be possible to
    #   * add more menu items by more entries in info (see opal-svg.rb set_conf_editable)
    #   * make specificic menu item text depending on connf_key
    # no - it is not really elegant :-)
    @harpnote_preview_printer.on_draggable_rightcklick do |info|
      items = []
      if (info[:conf_key])
        items.push({id: info[:conf_key], text: I18n.t('Edit Config'), icon: 'fa fa-gear'})
      end

      info[:more_conf_keys].each do |entry|
        id    = entry[:conf_key]
        text  = entry[:text]
        icon  = entry[:icon]
        value = entry[:value]
        items.push({id: id, text: text, icon: icon, value: value})
      end

      %x{
          $(#{info[:element]}).w2menu({
                                       items: #{items.to_n},

                                       onSelect: function (event) {
                                           w2ui.layout_left_tabs.click('configtab');
                                           if (event.item.value != null ) #{handle_command(%Q{cconf #{`event.item.id`} #{`event.item.value`}})}
      #{handle_command(%Q{editconf #{`event.item.id`.gsub(/\.[^\.]+$/, '') }})}  // we strip the particular parameter to get all params of the object
                                           if (event.item.value != null ) #{handle_command(%Q{render})}
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
      a = Native(abcelement) # todo remove me
      select_abc_object(abcelement)
    end
  end

# setup harpnote_playxer
  def setup_harpnote_player
    @harpnote_player            = Harpnotes::Music::HarpnotePlayer.new()
    @harpnote_player.controller = self
  end

# this is used by ui, so intellj does not find the usage
  def set_harppreview_size(size)
    @harp_preview_size = size
    @harpnote_preview_printer.set_canvas(size)
    call_consumers(:harp_preview_size)
  end

# note the filedrop is not entirely initialized in user-interface.js
#
#
  def toggle_autorefresh
    if @systemstatus[:autorefresh] == :on
      handle_command('autorefresh off')
    else
      handle_command('autorefresh on')
    end
    call_consumers(:render_status)
  end

  def toggle_console
    %x{
       w2ui['layout'].toggle('bottom', true);
       #{@editor}.$resize();
      }
  end

  def show_console
    %x{
       w2ui['layout'].show('bottom', true);
       #{@editor}.$resize();
      }
  end

  def setup_worker_listners
    @worker_tunepreview.on_named_message(:compute_tune_preview) do |data|
      $log.benchmark("preocessing reply from compute_tune_preview") do
        svg_and_positions = data[:payload]
        set_inactive("#tunePreview")
        @tune_preview_printer.set_svg(svg_and_positions)
      end
    end

    @worker.on_named_message(:get_worker_info) do |data|
      @worker_info = data[:payload]
    end

    @worker.on_named_message(:set_logger_status) do |data|
      #$log.set_status(data[:payload])
      @editor.set_annotations($log.annotations)
    end

    @worker.on_named_message(:compute_harpnotes_preview) do |data|
      $log.benchmark("processing reply from compute_harpnotes_preview") do
        svg_and_positions = data[:payload]
        if @render_stack.size <= 1 # if there is no other rendering active?
          @harpnote_preview_printer.set_svg(svg_and_positions)
          set_harppreview_size(@harp_preview_size)
          set_status(harpnotes_dirty: false)
          set_status(refresh: false)
          set_inactive("#harpPreview")
          LastRenderMonitor.new.clear
          @editor.set_annotations($log.annotations)
        end

        @render_stack.shift
        call_consumers(:render_status)
        unless @render_stack.empty?
          @render_stack.clear
          render_previews
        end

        nil
      end
    end

    # this retrieves the abc model from worker
    # required for select in multiple voices
    @worker.on_named_message(:compute_pdf_preview) do |data|
      $log.benchmark("preocessing reply from compute_pdf_preview") do
        @pdf_preview_string = data[:payload]
        call_consumers(:update_pdf_preview)
      end
    end


    @worker.on_named_message(:error_alert) do |data|
      call_consumers(:error_alert)
    end

    @worker.on_named_message(:update_ui) do |data|
      @extracts = data[:payload][:extracts]
      call_consumers(:extracts)
      @document_title = data[:payload][:document_title]
      call_consumers(:document_title)
    end

# this receiges the player_model_abc to play
# along the tune
    @worker.on_named_message(:load_player_model_abc) do |data|
      $log.benchmark("preocessing reply from load_player_model_abc") do
        @harpnote_player.player_model_abc = %x{JSON.parse(#{data[:payload]})}
      end
    end

# this receives the player_model to play according
# to harpnotes
    @worker.on_named_message(:load_player_from_worker) do |data|
      $log.benchmark("preocessing reply from load_player_model") do
        @harpnote_player.set_worker_model(data[:payload])
      end
    end

# this retrieves the abc model from worker
# required for select in multiple voices
    @worker.on_named_message(:load_abc_model) do |data|
      $log.benchmark("preocessing reply from load_abc_model") do
        @abc_model = data[:payload]
      end
    end

# this lets the worker send a message to the logger
    @worker.on_named_message('log') do |data|
      $log.log_from_worker(data[:payload])
    end

# this rescues from fatal worker errors
    @worker.on_named_message(:rescue_from_worker_error) do |data|
      @render_stack.clear
      call_consumers(:error_alert)
      call_consumers(:render_status)
    end
  end



# this registers the listeners to ui-elements.
  def setup_ui_listener

    # activate drop of files
    # set_file_drop('layout'); this is now in userinterface.js

    # changes in the editor
    @editor.on_change do |e|
      set_status(music_model: "changed")
      set_status(harpnotes_dirty: true)
      request_refresh(true)
      nil
    end


    @editor.on_selection_change do |e|
      ranges         = @editor.get_selection_ranges
      selection_info = @editor.get_selection_info

      #$log.debug("editor selecton #{a.first} to #{a.last} (#{__FILE__}:#{__LINE__})")
      #$log.debug "dirtyflag: #{@systemstatus[:harpnotes_dirty]}"

      @harpnote_preview_printer.unhighlight_all
      @tune_preview_printer.unhighlight_all

      ranges.each do |a|
        @harpnote_preview_printer.range_highlight_more(a.first, a.last)
        @tune_preview_printer.range_highlight_more(a.first, a.last)
        @harpnote_player.range_highlight(a.first, a.last)
      end
    end

    @editor.on_cursor_change do |e|
      request_refresh(false)

      selection_info = @editor.get_selection_info
      selections     = @editor.get_selection_ranges
      ranges         = selection_info[:selection]

      position = "#{ranges.first.first}:#{ranges.first.last}"
      position += " - #{ranges.last.first}:#{ranges.last.last}" unless ranges.first == ranges.last

      if selection_info[:token]
        token = selection_info[:token]
      else
        token = {type: "", value: ""}
      end

      editorstatus = {position:   position,
                      tokeninfo:  "#{token[:type]} [#{token[:value]}]",
                      token:      token,
                      selections: selections
      }
      `update_editor_status_w2ui(#{editorstatus.to_n})` # todo: use a listener here ...
    end

    @harpnote_player.on_noteon do |e|
      highlight_abc_object_by_player_callback(e[:startChar], true) unless $settings[:follow] == 'false'
    end

    @harpnote_player.on_noteoff do |e|
      highlight_abc_object_by_player_callback(e[:startChar], false) unless $settings[:follow] == 'false'
    end

    @harpnote_player.on_songoff do
      stop_play_abc
      call_consumers(:play_stop)
    end

    $window.on :mousedown do |e|
      @expand_selection = e.shift_key
      true # meed this to continue processing of the mouse event
    end


    # key events in editor
    Element.find('body').on :keydown do |e|
      # note that on windows some characters (eg "[") are entered as ctrl-alt-8
      # this prevents the handler to fire ...
      if (e.alt_key)

      elsif (e.meta_key || e.ctrl_key) # Ctrl/Cmd
        case (e.key_code)
        when 'A'.ord
          @editor.select_range_by_position(0, 10000)
        when 'R'.ord, 13
          e.prevent
          handle_command('render')
        when 'S'.ord #s
          e.prevent
          handle_command("dsave")
        when 'P'.ord #p
          e.prevent
          play_abc('auto')
        when 'K'.ord #k
          e.prevent
          toggle_console
        when 'L'.ord
          %x{#{@zupfnoter_ui}.toggle_full_screen();}
          e.prevent
        when *((0 .. 9).map { |i| i.to_s.ord })
          e.prevent
          handle_command("view #{e.key_code.chr}")
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
      set_status({last_read_info_id: last_info_id})
    end

    have_not_read = lambda do
      # alert (" hat nicht gelesen gelesen")
    end

    body = %Q{<h3><a href="#{@info_url}" target="_blank">#{I18n.t("read now")}</a></h3>}

    body += messages.map { |m|
      nm      = Native(m)
      post_id = nm[:postId]
      desc    = nm[:description]
      %Q{<div style="text-align:left;"><p>#{post_id}: #{nm[:title]}</p></div>}
    }.join


    options = {
        msg:   body,
        title: I18n.t('There is new unread information'),
        width: 600, # width of the dialog
        height: 200, # height of the dialog
        modal:    true,
        btn_yes:  {
            text: I18n.t('already read'), # text for yes button (or yes_text)
            class: '', # class for yes button (or yes_class)
            style: '', # style for yes button (or yes_style)
            callBack: have_read # callBack for yes button (or yes_callBack)
        },
        btn_no:   {
            text: I18n.t('read later'), # text for no button (or no_text)
            class: '', # class for no button (or no_class)
            style: '', # style for no button (or no_style)
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

    unless @refresh_timer.empty?
      @refresh_timer.each do |i|
        `clearTimeout(#{i})`
        @refresh_timer.pop
      end
    end

    if @systemstatus[:refresh]
      stop_play_abc # stop player since the model has poentially changed

      case @systemstatus[:autorefresh]
      when :on
        @refresh_timer.push `setTimeout(function(){#{render_previews()}}, 600)`
      when :off
        # off still renders tune_preview
        @refresh_timer.push `setTimeout(function(){#{render_tunepreview_in_uithread()}},  600)`
      when :remote # this means that the current instance runs in remote mode
        #   @refresh_timer.push `setTimeout(function(){#{render_previews()}}, 500)`
      end
    end
  end

  def send_remote_command(command)
    `localStorage.setItem('command', '')`
    `localStorage.setItem('command', #{command})`
  end

  def set_active(ui_element)
    Element.find(ui_element).add_class('spinner')
  end

  def set_inactive(ui_element)
    Element.find(ui_element).remove_class('spinner')
  end

  def check_suppoerted_browser
    supportedbrowsers = %W{Chrome Firefox Vivaldi Opera}
    unless supportedbrowsers.include?(`bowser.name`)
      message = I18n.t("Unsupported browser. Please use one of ") + supportedbrowsers.to_s
      $log.warning(message)
      `alert(#{message})`
    end
  end


# returns a hash with the default values of configuration
  def _init_conf()
    InitConf.init_conf()
  end

end


