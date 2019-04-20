##
# here we include the javascript modules
# these modules shall follow the common JS model as usually node modules do
# Note that we assign them to global objects which need to be adapted in the
# opal wrappers.
#
# note that the require here is basically node_require
# we cannot use opal's node_require because browserify would not find the results
#
%x{

  // polyfills from https://gist.github.com/jmshal/b14199f7402c8f3a4568733d8bed0f25
  //global.btoa = function btoa(b) {return new Buffer(b).toString('base64');};
  //global.atob = function atob(a) {return new Buffer(a, 'base64').toString('binary');};

  //jsPDF = require ("jspdf")   // adapt in opal-jspdf.rb
  // Ajv = require("ajv")        // adapt in opal-ajv.rb
  //neatJSON = require("./neatjson_js") // adapt in opal-neatjson.rb

  // these requires are required by nodejs/dir, nodejs/file
  // fs = require('fs')
  // glob = require("glob")      // don't know who needs this
}


require 'opal'
require 'opal-platform'
require 'ajv.min.js'

#require 'opal-jquery'
require 'vector2d'
#require 'neatjson_js'
#require 'opal-neatjson'


require 'opal-ajv'
#require 'math'

require 'consolelogger'
require 'harpnotes'
require 'abc_to_harpnotes_factory'
require 'abc2svg_to_harpnotes'

#require 'node_modules/jspdf/dist/jspdf.min'
#require 'jspdf-cli.js'
#require 'opal-jspdf'
#require 'opal-jszip'
#require 'opal-musicaljs'
require 'svg_engine'
#require 'pdf_engine'
#require 'i18n'
require 'init_conf'
require 'text_pane'
#require 'command-controller'
#require 'controller'
#require 'controller-cli'

# require 'controller_command_definitions'
require 'harpnote_player'
# require 'opal-dropboxjs'
# require 'opal-jqconsole'
require 'confstack2'
require 'opal-abc2svg'
# require 'opal-w2ui'
require 'version-prod'
# require 'user-interface.js'
# require 'config-form'
# require 'snippet_editor'
require 'abc2svg-1.js'
require 'opal-webworker'


module I18n
  def self.t(text)
    # it might be that the phrases are not yet loaded
    # controller loads them by ajax, wich might not be ready
    # on the very first render tasks
    @phrasesOpal[text] || text rescue text
  end

  def self.phrases
    @phrases
  end

  def self.phrases=(phrases)
    @phrases     = phrases
    @phrasesOpal = Native(phrases)
  end
end


class WorkerLogger < Logger
  attr_accessor :worker

  def error(*args)
    write_worker(:error, *args)
  end

  def info(*args)
    write_worker(:info, *args)
  end

  def warning(*args)
    write_worker(:warning, *args)
  end

  def message(*args)
    write_worker(:message, *args)
  end

  def debug(*args)
    write_worker(:debug, *args)
  end


  def write_worker(type, *args)
    the_args    = args
    the_args[0] = "worker: #{args[0]}"
    @worker.post_named_message(:log, {type: type, args: the_args})
  end
end


## preparing environment
#

$log = WorkerLogger.new(nil)

# worker routines
#
# # compute the layout of the harpnotes
# @return [Happnotes::Layout] to be passed to one of the engines for output
#

class WorkerController

  attr_accessor :config_from_editor, :abc_part_from_editor, :systemstatus, :harpnote_player, :abc_model, :extracts, :music_model, :checksum

  def initialize
    $conf        = Confstack.new(nil)
    $conf.strict = false
    $conf.push(InitConf.init_conf)
    @harpnote_player            = Harpnotes::Music::HarpnotePlayer.new
    @harpnote_player.controller = self
    @json_validator             = Ajv::JsonValidator.new
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

    # need this to get configs required by abc2svg
    # todo: move restposition to extract configs
    # transfer all restpositions in the music model

    config = @config_from_editor
    $conf.reset_to(1) # todo: verify this: reset in case we had errors in previous runs
    $conf.push(config) # in case of error, we hav the ensure close below

    harpnote_engine                   = Harpnotes::Input::Abc2svgToHarpnotes.new
    @music_model, player_model_abc    = harpnote_engine.transform(@abc_part_from_editor)
    @abc_model                        = harpnote_engine.abc_model
    @harpnote_player.player_model_abc = player_model_abc
    @music_model.checksum             = @checksum
  end

  def compute_harpnotes_preview
    result = {svg: I18n.t("BUG: worker did not finsh"), interactive_elements: [], error_alert: true}
    begin
      load_music_model
      $log.debug("viewid: #{@systemstatus[:view]} #{__FILE__} #{__LINE__}")
      @song_harpnotes = layout_harpnotes(@systemstatus[:view], "A3")

      if @song_harpnotes
        # todo: not sure if it is good to pass active_voices via @song_harpnotes
        # todo: refactor better moove that part of the code out here
        $log.benchmark("loading music to player") { @harpnote_player.load_song(@music_model, @song_harpnotes.active_voices) }
        @harpnote_preview_printer = Harpnotes::SvgEngine.new(nil, 2200, 1400) # size of canvas in pixels
        @harpnote_preview_printer.clear
        @harpnote_preview_printer.set_view_box(0, 0, 420, 297) # todo: configure ? this scales the whole thing such that we can draw in mm
        result = @harpnote_preview_printer.draw(@song_harpnotes)
      end
    rescue Exception => e
      $log.error(%Q{#{e.message}}, nil, nil, e.backtrace)
    end

    result
  end

  def layout_harpnotes(print_variant = 0, page_format = 'A4')

    $image_list = $conf.get['resources'].keys rescue nil
    begin
      $log.benchmark("validate default conf") do
        @validation_errors = []
        @validation_errors = @json_validator.validate_conf($conf) if ($log.loglevel == :debug || $settings[:validate] == :true)
      end

      set_extracts_menu

      result = nil
      $log.benchmark("computing layout") do
        layouter              = Harpnotes::Layout::Default.new
        layouter.uri          = $uri
        layouter.placeholders = get_placeholder_replacers(print_variant)
        result                = layouter.layout(@music_model, nil, print_variant, page_format)
      end

    rescue Exception => e
      $log.error(%Q{#{e.message}}, nil, nil, e.backtrace)
    ensure
      $conf.pop
    end
    result
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
    end
  end
end

def perform_worker_task(title = nil, &block)
  begin
    block.call
  rescue Exception => e
    $log.error(%Q{#{title}: #{e.message}}, nil, nil, e.backtrace)
    @namedworker.post_named_message(:rescue_from_worker_error, nil)
  end
end

# installing the handlers

@worker      = Webworker.new(`this`)
@namedworker = NamedWebworker.new(`this`)
$log.worker  = @namedworker


@worker.post_message("worker started #{__FILE__}")

@namedworker.on_named_message(:abort) do |data|
  # note that this method sends a POJO object
  # so we need to user JS json handling here
  $log.error("aborting worker: #{data[:payload][:render_stack].to_s}")
end

@namedworker.on_named_message(:set_loglevel) do |data|
  perform_worker_task(data[:cmd]) do
    $log.loglevel = (data[:payload])
  end
end

@namedworker.on_named_message(:compute_tune_preview) do |data|
  perform_worker_task(data[:name]) do
    $log.clear_errors
    $log.clear_annotations
    @tune_preview_printer = ABC2SVG::Abc2Svg.new(nil) # note that we do not provide a div, so set_svg will fail
    payload               = data[:payload]

    #todo: error handling
    svg_and_position = @tune_preview_printer.compute_tune_preview(payload[:abc], payload[:checksum])
    @namedworker.post_named_message(data[:name], svg_and_position)
    @namedworker.post_named_message(:set_logger_status, $log.get_status)
  end
end

@namedworker.on_named_message(:i18n_set_locale) do |data|
  # note that this method sends a POJO object
  # so we need to user JS json handling here
  I18n.phrases = %x{JSON.parse(#{data[:payload]})}
  I18n.t("locales loaded")
end

@namedworker.on_named_message(:compute_harpnotes_preview) do |data|
  perform_worker_task(data[:name]) do
    controller = WorkerController.new

    $settings  = data[:payload][:settings]
    $resources = data[:payload][:resources]
    $uri       = data[:payload][:uri]

    controller.checksum             = data[:payload][:checksum]
    controller.systemstatus         = data[:payload][:systemstatus]
    controller.config_from_editor   = data[:payload][:config_from_editor]
    controller.abc_part_from_editor = data[:payload][:abc_part_from_editor]

    result = controller.compute_harpnotes_preview

    # send results to the main script
    #
    if result[:error_alert]
      @namedworker.post_named_message(:error_alert, nil)
    else
      document_title = controller.music_model.meta_data[:filename] rescue "error"
      @namedworker.post_named_message(:update_ui, {extracts: controller.extracts, document_title: document_title})
    end
    @namedworker.post_named_message(:compute_harpnotes_preview, result)
    @namedworker.post_named_message(:load_abc_model, controller.abc_model)

    @namedworker.post_named_message(:load_player_model_abc, `JSON.stringify(#{controller.harpnote_player.player_model_abc})`)
    @namedworker.post_named_message(:load_player_from_worker, controller.harpnote_player.get_worker_model)
  end
end


@namedworker.on_named_message(:get_worker_info) do |data|
  result = {
      version: VERSION
  }
  @namedworker.post_named_message(:get_worker_info, result)
end