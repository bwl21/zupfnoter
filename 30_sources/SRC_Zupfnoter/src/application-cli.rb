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
  // see https://stackoverflow.com/questions/30694428/jspdf-server-side-node-js-usage-using-node-jspdf
  global.window = {document: {createElementNS: function(){return {}} }};
  global.navigator = {};
  global.btoa = function(){};

  jsPDF = require ("jspdf")   // adapt in opal-jspdf.rb
  Ajv = require("ajv")        // adapt in opal-ajv.rb
  neatJSON = require("./neatjson_js") // adapt in opal-neatjson.rb

  // these requires are requred by nodejs/dir, nodejs/file
  fs = require('fs')
  glob = require("glob")      // don't know who needs this
}

require 'opal'
require 'opal-platform'
#require 'ajv.min.js'


require 'nodejs'
require 'nodejs/fileutils'
#require 'opal-jquery'
require 'vector2d'
#require 'neatjson_js'
require 'opal-neatjson'


require 'opal-ajv'
#require 'math'

require 'consolelogger'
require 'harpnotes'
require 'abc_to_harpnotes_factory'
require 'abc2svg_to_harpnotes'

#require 'node_modules/jspdf/dist/jspdf.min'
#require 'jspdf-cli.js'
require 'opal-jspdf'
require 'opal-jszip'
#require 'opal-musicaljs'
#require 'svg_engine'
require 'pdf_engine'
#require 'i18n'
require 'init_conf'
require 'text_pane'
require 'command-controller'
require 'controller'
require 'controller-cli'

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


# ----------------- move this to somewhere else
#
sourcepattern = ARGV[0] || "*.abc"
targetfolder  = ARGV[1] || "."
#targetfolder  = File.realpath(targetfolder)
#
unless ARGV.length == 2
  puts %Q{usage: node --max_old_space_size=4096 zupfnoter-cli.js "/tmp/zntest/*.abc" /tmp/xxx}
  exit(0)
end

FileUtils.mkdir_p(targetfolder)

puts "processing #{ARGV.first} to #{targetfolder}"

controller = CliController.new

sourcefiles = Dir[sourcepattern].sort

# these requires are necessar yfor browserify
# $encoding = node_require('encoding')



sourcefiles.each do |sourcefile|

  $log.clear_errors
  begin
    abctext = File.read(sourcefile)
  rescue Exception => e
    puts e
  end

  $log.message("processing: #{sourcefile}")

  controller = CliController.new

  controller.set_abc_input(abctext)

  controller.load_music_model

  pdfs = controller.produce_pdfs(".")


  pdfs.each do |filename, content|
    outputname = %Q{#{targetfolder}/#{filename}}
    puts filename

    %x{
       var encoding = require ("encoding")
       var buffer = encoding.convert(#{content}, 'Latin-1')
       fs.writeFileSync(#{outputname}, buffer)
    }
  end

  File.write("#{targetfolder}/#{File.basename(sourcefile)}.err.log", $log.get_errors.join("\n"))
end
nil

