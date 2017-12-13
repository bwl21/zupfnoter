%x{
#{$nodemodules} = {};
  // see https://stackoverflow.com/questions/30694428/jspdf-server-side-node-js-usage-using-node-jspdf
  global.window = {document: {createElementNS: () => {return {}} }};
  global.navigator = {};
  global.btoa = () => {};

  jsPDF = require ("jspdf")
  Ajv = require("ajv")
  glob = require("glob")
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
require 'version'
# require 'user-interface.js'
# require 'config-form'
# require 'snippet_editor'
require 'abc2svg-1.js'


# ----------------- move this to somewhere else
#
sourcepattern = ARGV[0] || "*.abc"
targetfolder  = ARGV[1] || "."
#targetfolder  = File.realpath(targetfolder)

FileUtils.mkdir_p(targetfolder)

puts "processing #{ARGV.first} to #{targetfolder}"

controller = CliController.new

sourcefiles = Dir[sourcepattern]

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

  controller.set_abc_input(abctext)

  controller.load_music_model

  pdfs = controller.produce_pdfs(".")


  pdfs.each do |filename, content|
    outputname = %Q{#{targetfolder}/#{filename}}
    puts filename

    %x{
       var fs = require('fs')
       var encoding = require ("encoding")
       var buffer = encoding.convert(#{content}, 'Latin-1')
       fs.writeFileSync(#{outputname}, buffer)
    }
  end

  File.write("#{targetfolder}/#{File.basename(sourcefile)}.err", $log.get_errors.join("\n"))
end
nil

