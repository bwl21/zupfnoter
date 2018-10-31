
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


# installing the nandlers

handle_message = lambda do |e|
  puts ("worker received message")
  post_message({message: "foobar", payload: {source: `e.data`, a: 1, b: 2}})
end

def post_message(object)
  `postMessage(#{object.to_n})`
end

%x{
  addEventListener('message', #{handle_message})
}


