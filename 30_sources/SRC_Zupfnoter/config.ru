# config.ru
require 'bundler'
Bundler.require

run Opal::Server.new { |s|

  s.append_path 'public'
  s.append_path 'src'
  Opal.use_gem "vector2d"

  Opal.paths.each { |p| s.append_path(p) }

  #s.use_gem 'vector2d'

  s.debug = true
  s.source_map = true

  s.main = 'application'

  s.index_path = 'index_opal.html.erb'
}