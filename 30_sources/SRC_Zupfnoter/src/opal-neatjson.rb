if (RUBY_ENGINE == 'opal')
  require 'json'
  module JSON


    require 'neatjson_js'

    $neatJSON = %x{neatJSON}

    def self.neat_generate(object, opts={})
      opts[:sort] = lambda{|k,v,o| result = opts[:explicit_sort][k] || 9999;  ; result }

      outputjs = %x{#{$neatJSON}(JSON.parse(JSON.stringify(#{object.to_n})), #{opts.to_n})} #{ wrap:40, short:false, aligned:true, padding:1, afterComma:1, aroundColonN:1, sort:true })}
      outputjs
    end

  end
end

