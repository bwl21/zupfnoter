class CliController <  Controller

  attr_accessor :cli_abc_input
  def initialize

    $log = NodeLogger.new("x.log")
    $log.info ("Welcome to Zupfnoter")
    $log.info ("Zupfnoter #{VERSION}")
    $log.info ("Opal:     #{RUBY_ENGINE_VERSION}")
    $log.info ("Ruby:     #{RUBY_VERSION}")
    $log.info ("Abc2svg:  #{%x{abc2svg.version}}")


    $conf        = Confstack.new(nil)
    $conf.strict = false
    $conf.push(_init_conf)

    $settings = {} # this is te keep runtime settings

    @harpnote_player = Harpnotes::Music::HarpnotePlayer.new()
  end

  def get_abc_part
    @cli_abc_input.split(CONFIG_SEPARATOR).first
  end

  def load_music_model
    `debugger`
    abc_parser = $conf.get('abc_parser')
    $log.timestamp_start
    harpnote_engine                   = Harpnotes::Input::ABCToHarpnotesFactory.create_engine(abc_parser)
    harpnote_engine.abcplay           = @harpnote_player.abcplay # provide the abc player to convert the abc model for playing
    @music_model                      = harpnote_engine.transform(get_abc_part)
    @music_model.checksum             = @editor.get_checksum
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
    candidates     = candidate_keys.map { |c| $conf_helptext[c.join('.')] }
    candidate_keys = candidate_keys.map { |c| c.join(".") }.to_s

    helptext = candidates.compact.first || "no help for #{candidate_keys}"

    ##helptext = $conf_helptext[key] || "<p>no helpr for #{key}</p>"
    %Q{<h2>#{key}</h2><div style="padding:0.5em;width:30em;">#{helptext}</div>}
  end

  def self.get_candidate_keys(key)
    help_key  = key
    help_key  = help_key.gsub(/^(extract\.)(\d+)(.*)$/) { "#{$1}0#{$3}" }
    help_key  = help_key.gsub(/^(extract\.0\.lyrics\.)(\d+)(.*)$/) { "#{$1}0#{$3}" }
    help_key  = help_key.gsub(/^(extract\.0\.notes\.)([a-zA-SU-Z_0-9]+)(.*)$/) { "#{$1}0#{$3}" }
    help_key  = help_key.gsub(/^(extract\.0\.tuplet\.)([a-zA-SU-Z_0-9]+)(.*)$/) { "#{$1}0#{$3}" }
    keyparts  = help_key.split(".")
    downwards = []; upwards = []
    (0 .. keyparts.length - 1).each do |i|
      #downwards.push(keyparts[0 .. i-1])
      upwards.push(keyparts[i .. -1])
    end
    candidate_keys = upwards + downwards.reverse
  end


  def self.locale(language)


  end
end