# config.ru
ENV['RACK_ENV'] = "production" # https://stackoverflow.com/questions/10168436/how-do-i-turn-off-exceptions-in-a-rack-app
require 'bundler'
Bundler.require
Opal::append_path 'public'
Opal::append_path 'src'
Opal::append_path 'vendor'
Opal::use_gem 'vector2d'
# binding.pry
Opal::Config.source_map_enabled = true

#Opal::Processor.inline_operators_enabled = true
run Opal::Sprockets::Server.new { |s|

  s.main = 'application'

  s.index_path = 'index_opal.html.erb'
}