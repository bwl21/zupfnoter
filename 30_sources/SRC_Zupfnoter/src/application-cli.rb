require 'opal'
require 'opal-platform'
require 'ajv.min.js'


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
require 'jspdf-cli.js'
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

sourcefiles.each do |sourcefile|
  begin
    abctext = File.read(sourcefile)
    `debugger`
  rescue Exception => e
    puts e
  end

  $log.message("processing: #{sourcefile}")

  controller.set_abc_input(abctext, sourcefile)

  controller.load_music_model

  pdfs = controller.produce_pdfs(".")

  pdfs.each do |filename, content|
    outputname = %Q{#{targetfolder}/#{filename}}
    puts filename
    File.open(outputname, "w") {|f| f.write content}
  end
end
nil

