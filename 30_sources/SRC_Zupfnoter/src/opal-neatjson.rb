if (RUBY_ENGINE == 'opal')
  require 'json'
  module JSON

    # neajson_js needs to be already impoerted
    # maybe in the application.js

    if OPAL_PLATFORM == 'nodejs'
      $neatJSON = %x{neatJSON}
    else
      $neatJSON = %x{neatJSON}
    end

    def self.neat_generate(object, opts = {explicit_sort: []})
      opts[:sort] = lambda {|k, v, o| result = opts[:explicit_sort][k] || "_9999_#{k}";; result} if opts.has_key?(:explicit_sort)

      outputjs = %x{#{$neatJSON}(JSON.parse(JSON.stringify(#{object.to_n})), #{opts.to_n})} #{ wrap:40, short:false, aligned:true, padding:1, afterComma:1, aroundColonN:1, sort:true })}
      outputjs
    end

  end
end