module I18n
  def self.t(text)
    if RUBY_ENGINE=='opal'
      `w2utils.lang(#{text})`
    end
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

    $conf_helptext = {}
    HTTP.get("public/locale/conf-help_#{language}.json").then do |response|
      $conf_helptext = Native(response.body)
      $conf_helptext = JSON.parse($conf_helptext) if $conf_helptext.is_a? String
    end.fail do |response|
      alert "could not loaad confhelp #{response}"
    end.always do |response|
    end

    `w2utils.locale('public/locale/' + #{language} + '.json')`
  end
end