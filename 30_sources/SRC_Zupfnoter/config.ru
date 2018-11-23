  # config.ru
  require 'bundler'
  Bundler.require

  #Opal::Processor.inline_operators_enabled = true
  run Opal::Sprockets::Server.new { |s|

    s.append_path 'public'
    s.append_path 'src'
    s.append_path 'vendor'

    Opal.use_gem "vector2d"
    Opal::Config.source_map_enabled = true
    Opal.paths.each { |p| s.append_path(p) }


    #s.use_gem 'vector2d'

   # s.debug = true
    s.source_map = true

    s.main = 'application'

    s.index_path = 'index_opal.html.erb'
  }