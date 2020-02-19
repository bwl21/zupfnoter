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

  // polyfills from https://gist.github.com/jmshal/b14199f7402c8f3a4568733d8bed0f25
  global.btoa = function btoa(b) {return Buffer.from(b).toString('base64');};
  global.atob = function atob(a) {return Buffer.from(a, 'base64').toString('binary');};

  jsPDF = require ("../vendor/jspdf.node.debug.js")   // adapt in opal-jspdf.rb
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
configfile    = ARGV[2]

#targetfolder  = File.realpath(targetfolder)
#
unless ARGV.length >= 2
  puts %Q{usage: node --max_old_space_size=4096 zupfnoter-cli.js "/tmp/zntest/*.abc" /tmp/xxxd}
  puts CliController.new.about_zupfnoter
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

  if File.exist?(configfile)
    puts "reading config"
    config = JSON.parse(File.read(configfile))
    controller.apply_config(config)
  end



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
    nil
  end

  File.write("#{targetfolder}/#{File.basename(sourcefile)}.err.log", $log.get_errors.join("\n"))
end
nil

