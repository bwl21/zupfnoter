##
# here we include the javascript modules
# these modules shall follow the common JS model as usually node modules do
# Note that we assign them to global objexts which need to be adapted in the
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

  // these requires are requred by nodejs/dir, nodejs/file
  // fs = require('fs')
  // glob = require("glob")      // don't know who needs this
}


require 'opal'
require 'opal-platform'
#require 'ajv.min.js'

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
#require 'svg_engine'
#require 'pdf_engine'
#require 'i18n'
require 'init_conf'
require 'text_pane'
#require 'command-controller'
#require 'controller'
#require 'controller-cli'

# require 'controller_command_definitions'
# require 'harpnote_player'
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
    text
  end

  def self.phrases
    nil
  end
end


class WorkerLogger < Logger

  def write(type, msg)

    current_level = LOGLEVELS[type] || LOGLEVELS[:warning]
    if (current_level <= @loglevel)
      time = Time.now.strftime("%H:%M:%S")
      puts msg
    end
  end
end


## preparing environment
#

$log=WorkerLogger.new("x.log")




# installing the handlers

@worker      = Webworker.new(`this`)
@namedworker = NamedWebworker.new(`this`)

@worker.post_message("worker started #{__FILE__}")

@worker.on_message do |e|
  puts ("worker received message #{Native(`e.data`).to_json}")
  #@worker.post_message({message: "foobar xx", payload: {source: `e.data`, a: 1, b: 2}})
  #@namedworker.post_named_message(:foo, {source: `e.data`, a: 1, b: 2})
  #@namedworker.post_named_message(:bar, {source: `e.data`, a: :bar, b: :bar})
end

@namedworker.on_named_message(:compute_tune_preview) do |data|
  @tune_preview_printer = ABC2SVG::Abc2Svg.new(nil) # note that we do not provide a div, so set_svg will fail
  payload          = data[:payload]
  svg_and_position = @tune_preview_printer.compute_tune_preview(payload[:abc], payload[:checksum])
  @namedworker.post_named_message(data[:name], svg_and_position)
end


