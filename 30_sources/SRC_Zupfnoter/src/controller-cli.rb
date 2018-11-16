class Controller

  def self.get_uri()
    {hostname: "zupfnoter-cli"}
  end
end

class CliController < Controller

  def initialize

    $log = NodeLogger.new("x.log")
    $log.loglevel = :warning
    $log.info ("Welcome to Zupfnoter")
    $log.info ("Zupfnoter #{VERSION}")
    $log.info ("Opal:     #{RUBY_ENGINE_VERSION}")
    $log.info ("Ruby:     #{RUBY_VERSION}")
    $log.info ("Abc2svg:  #{%x{abc2svg.version}}")


    $conf        = Confstack.new(nil)
    $conf.strict = false
    $conf.push(_init_conf)

    $settings = {} # this is te keep runtime settings

    @editor = TextPaneEmulatorForCli.new()
    @json_validator = Ajv::JsonValidator.new


  end

  def set_abc_input(abc_input)
    @editor.set_text(abc_input)
  end

  def call_consumers(clazz)
    nil
  end

  def apply_config(config)
    @editor.patch_config_part("" ,config, "from json file")
  end

  def load_music_model
    config = get_config_from_editor

    $conf.reset_to(1) # todo: verify this: reset in case we had errors in previous runs
    $conf.push(config) # in case of error, we have the ensure close below

    abc_parser                      = $conf.get('abc_parser')
    harpnote_engine                 = Harpnotes::Input::ABCToHarpnotesFactory.create_engine(abc_parser)
    @music_model, @player_model_abc = harpnote_engine.transform(@editor.get_abc_part)
    @music_model.checksum           = @editor.get_checksum
  end

  def produce_pdfs(folder)
    layout_harpnotes # todo: this uses a side-effect to get the @music_model populated
    if @music_model.meta_data[:filename].include?('{{')
      is_template = true
      filebase    = @music_model.harpnote_options.dig(:template, :filebase)
      unless filebase
        raise "no filebase given for template"
      end
      print_variants = []
    else
      print_variants = @music_model.harpnote_options[:print]
      filebase       = @music_model.meta_data[:filename]
    end


    rootpath = folder

    pdfs = {}
    print_variants.each do |print_variant|

      index = print_variant[:view_id]

      pdfs["#{rootpath}/#{filebase}_#{print_variant[:filenamepart]}_a3.pdf"] = render_a3(index).output(:raw)
     # pdfs["#{rootpath}/#{filebase}_#{print_variant[:filenamepart]}_a4.pdf"] = render_a4(index).output(:blob)
      nil
    end

    pdfs
  end


end


module I18n
  def self.t(text)
    text
  end

  def self.t_key(key)
    self.t(key.split(".").last)
  end

  def self.t_help(key)
    candidate_keys = get_candidate_keys(key)
    candidates     = candidate_keys.map {|c| $conf_helptext[c.join('.')]}
    candidate_keys = candidate_keys.map {|c| c.join(".")}.to_s

    helptext = candidates.compact.first || "no help for #{candidate_keys}"

    ##helptext = $conf_helptext[key] || "<p>no helpr for #{key}</p>"
    %Q{<h2>#{key}</h2><div style="padding:0.5em;width:30em;">#{helptext}</div>}
  end

  def self.get_candidate_keys(key)
    help_key  = key
    help_key  = help_key.gsub(/^(extract\.)(\d+)(.*)$/) {"#{$1}0#{$3}"}
    help_key  = help_key.gsub(/^(extract\.0\.lyrics\.)(\d+)(.*)$/) {"#{$1}0#{$3}"}
    help_key  = help_key.gsub(/^(extract\.0\.images\.)(\d+)(.*)$/) {"#{$1}0#{$3}"}
    help_key  = help_key.gsub(/^(extract\.0\.notes\.)([a-zA-SU-Z_0-9]+)(.*)$/) {"#{$1}0#{$3}"}
    help_key  = help_key.gsub(/^(extract\.0\.tuplet\.)([a-zA-SU-Z_0-9]+)(.*)$/) {"#{$1}0#{$3}"}
    keyparts  = help_key.split(".")
    downwards = []; upwards = []
    (0..keyparts.length - 1).each do |i|
      #downwards.push(keyparts[0 .. i-1])
      upwards.push(keyparts[i..-1])
    end
    candidate_keys = upwards + downwards.reverse
  end


  def self.locale(language)

  end

  def self.phrases
    nil
  end
end

class TextPaneEmulatorForCli < Harpnotes::TextPane

  def initialize
    # this is pretty empty for the CLI
    @abc_text = nil
    @config_separator  = '%%%%zupfnoter'
    @on_change         = lambda {}
    @config_undo       = UndoManager.new

  end

  def get_abc_part
    @abc_part
  end

  # add new text to the editor pane as loaded from file
  # @param text the text to be set to the editor
  def set_text(text)
    _split_parts(text)
  end


  def _split_parts(fulltext)
    _clean_models
    fulltext.split(@config_separator).each_with_index do |part, i|
      if i == 0
        @abc_part = part
      elsif part.start_with? ".config"
        _set_config_json(part.split(".config").last, "from loaded abc", true)
      elsif part.start_with? ".resources"
        _set_resources_json(part.split(".resources").last)
      else
        $log.error(I18n.t("unsupported section found in abc file: ") + part[0 .. 10])
      end
    end
  end

  def _get_abc_from_editor
    @abc_part
  end


  def set_config_part(config)
    nil
  end

  def clear_markers
  end

  def set_markers
  end

  def set_annotations
  end


  def save_to_localstorage(dirty_name = nil)
  end

  def clean_localstorage
  end


end