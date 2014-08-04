# config.ru
require 'bundler'
Bundler.require

run Opal::Server.new { |s|

  s.append_path 'public'
  s.append_path 'src'
  s.debug = true
  s.source_map = true

  s.main = 'application'

  s.index_path = 'index_opal.html'
}