
require 'opal'
require 'opal-platform'
require 'opal-jquery'
require 'vector2d'
require 'neatjson_js'
require 'opal-neatjson'
require 'opal-ajv'
#require 'math'

require 'consolelogger'
require 'harpnotes'
require 'abc_to_harpnotes_factory'
require 'abc2svg_to_harpnotes'

#require 'opal-raphael'
require 'opal-jspdf'
require 'opal-jszip'
require 'svg_engine'
require 'pdf_engine'
require 'i18n'
require 'init_conf'
require 'command-controller'
require 'controller'
require 'controller-nw'
require 'controller_command_definitions'
require 'harpnote_player'
require 'text_pane'
require 'opal-dropboxjs'
require 'opal-jqconsole'
require 'confstack2'
require 'opal-abc2svg'
require 'opal-w2ui'
require 'version-prod'
require 'user-interface.js'
require 'config-form'
require 'snippet_editor'
require 'abc2svg-1.js'
require 'abc2svg_polyfill.js'
require 'xml2abc.js'
require 'bowser.js'
require 'opal-webworker'

puts "now starting zupfnoter"
puts "zupfnoter is now running"

class Numeric
  def clamp(min, max)
    self < min ? min : self > max ? max : self
  end
end

# use promise to initializes
Document.ready.then do |ready|
  uicontroller = Controller.new
  # provide access to  zupfnoter controller from browser console
  # to suppert debuggeing
  Element.find("html")
      .append(%Q{ <script type="text/javascript" src="https://www.dropbox.com/static/api/2/dropins.js" id="dropboxjs" data-app-key="#{DBX_APIKEY_FULL}"></script>})


  # see https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload
  %x{
     window.zupfnoter=#{uicontroller};
  }
end.fail do |a,b|
  %x{
     alert(#{I18n.t("BUG: error while initializing Zupfnoter Controller")}+ "\n" + a.stack);
     console.log("BUG: error lodading Zupfnoter\n" + a.stack);
  }
end
