# include this to your rakefile to get some tasks for testing Zupfnoter
#
#
# what it creates


require 'diff/lcs'
require 'diff/lcs/ldiff'
require 'yaml'
require 'json'

ruruku = "../200_Zupfnoter/30_sources/ZSUPP_Tools/macOs/ruruku"

configfile = "config.mft.rb"

def process_example_argument(args)
  if args[:example]
    example     = "-e #{args[:example]}" if args[:example]
    example_doc = "_#{args[:example]}".gsub(/[^A-Za-z\-_0-9]/, "_")
  else
    example_doc = ""
  end

  return example, example_doc
end


PRODUCED_WITH = "reference produced with "

def get_reference_version(referenceversionfile)
  refabc2svgversion = File.read(referenceversionfile).split(PRODUCED_WITH).last.strip rescue "_unknown_"
  "#{refabc2svgversion}"
end


if File.exist?(configfile)
  load("config.mft.rb")
  referenceversionfile = "#{$conf[:testreferencefolder]}/0000_zupfnoter_version.txt"
else
  puts %Q{
  could not find #{configfile}

  please create a #{configfile} similar to

    testfolder = "."
    $conf      = {
        testoutputfolder:    "\#{testfolder}/test-output",
        testreferencefolder: "\#{testfolder}/test-reference",
        testresultfolder:    "\#{testfolder}/test-results",
        testdifffolder:      "\#{testfolder}/test-diff",
        testsourcefolder:    "\#{testfolder}/test-source",
        testrurukufolder:    "\#{testfolder}/test-ruruku",
        sourcefiles:         Dir["../**/*.abc"].uniq {|f| File.basename(f)},

        chrome:              '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
        zupfnoter_src:       "\#{__FILE__}/../SRC_Zupfnoter/src"
    }

       }
  exit
end

chrome = $conf[:chrome]

Rake::TaskManager.record_task_metadata = true

zupfnoterversion = "unknown" # need to do this to allocate abcversion
cd $conf[:zupfnoter_src], verbose: false do
  zupfnoterversion = `git describe`.strip.split("/").last
end

refzupfnoterversion = get_reference_version(referenceversionfile)
testname            = %Q{#{zupfnoterversion}_vs_#{refzupfnoterversion}}


###############################################################################
#

desc "initialize the requested folders"
task :init do
  [:testreferencefolder, :testoutputfolder, :testresultfolder, :testdifffolder, :testsourcefolder, :testrurukufolder].each do |name|
    mkdir_p $conf[name]
  end
end

desc "start ruruku server"
task :ruruku do
  require 'WEBrick'
  Thread.new {
    WEBrick::HTTPServer.new(:Port => 3000, :DocumentRoot => Dir.pwd).start
  }

  rm("ruruku.db") if File.exist? "ruruku.db"
  cmd = %Q{#{ruruku} -v start  #{$conf[:testrurukufolder]}/zupfnoter.yaml}
  sh cmd
end

desc "creates ruruku testlib"
task :buildrurukutestlib do

  ids              = []
  ruruku_testsuite = {'case' => [],
                      'id'   => "zupfnoter",
                      'name' => "zupfnoter",
                      'tags' => {}}


  Dir["#{$conf[:testsourcefolder]}/*.abc"].each do |file|

    diffurl = %Q{http://localhost:3000/test-diff/#{File.basename(file).gsub(".abc", ".diff.png")}}
    newurl  = %Q{http://localhost:3000/test-output/#{File.basename(file).gsub(".abc", "_-test_a3.png")}}
    steps   = %Q{

## investigate #{file}

<img src="#{diffurl}" alt="drawing" width="100%"/>
<img src="#{newurl}" alt="drawing" width="100%"/>

  }

    id = file.split("_").first

    unless ids.include?(id)

      ids.push(id)

      ruruku_testsuite['case'].push({
                                        'description'    => file,
                                        'group'          => "Zupfnoter",
                                        'id'             => File.basename(file).split("_").first,
                                        'minTesterCount' => 0,
                                        'mustPass'       => false,
                                        'name'           => "mal schaun #{file}",
                                        'steps'          => steps
                                    })
    end
  end
  File.open("#{$conf[:testrurukufolder]}/zupfnoter.yaml", 'w') { |f| YAML.dump(ruruku_testsuite, f) }
end

desc "copy testresults to reference"
task :copyreference, [:example] do |t, args|
  pattern = "*#{args[:example]}*"
  File.open("#{$conf[:testreferencefolder]}/0000_zupfnoter_version.txt", "w") do |f|
    f.puts %Q{#{PRODUCED_WITH}#{zupfnoterversion} }
  end

  Dir["#{$conf[:testoutputfolder]}/#{pattern}"].each { |file| cp file, $conf[:testreferencefolder] }
end

#--------------------------------------------


def createFiletasks
  pdffiles     = []
  outputfolder = "#{$conf[:testoutputfolder]}"
  mkdir_p outputfolder
  $conf[:testsourcefiles].each do |sourcefilename|
    json_temp    = "xconfig.json"
    filenamepart = "-test"

    File.open(json_temp, "w") do |f|
      conf = {
          produce: [0],
          extract: {
              "0" => {
                  filenamepart: filenamepart
              }
          }
      }
      f.puts(conf.to_json)
    end

    outfilename = File.basename(sourcefilename, '.abc')
    outfilebase = "#{outputfolder}/#{outfilename}"

    pdffile = "#{outfilebase}_#{filenamepart}_a3.pdf"
    pdffiles.push(pdffile)

    file pdffile do |t, args|
      # cleanup output folder
      ["err", "html", "pdf"].each do |ext|
        FileUtils.rm "#{outfilebase}}*.#{ext}" rescue nil
      end

      cmd = %Q{node #{$conf[:zupfnoter_src]}/zupfnoter-cli.js "#{sourcefilename}" "#{outputfolder}" "#{json_temp}"}
      puts cmd
      %x{#{cmd}}

      # produce png

      cmd = %Q{convert -density 300 +antialias  -flatten "#{outfilebase}_#{filenamepart}_a3.pdf" "#{outfilebase}_#{filenamepart}_a3.png"}

      #cmd = %Q{sips -Z 1200 -s format png  "#{outfilebase}_#{filenamepart}_a3.pdf" --out "#{outfilebase}_#{filenamepart}_a3.png"}
      %x{#{cmd}}
    end
  end
  pdffiles
end

pdffiles = createFiletasks

desc "generate new outputfiles (parallel)"
multitask :buildcurrentoutput => pdffiles

desc "cleeanup putputfiles"
task :cleancurrentoutput
# cleanup output folder
["err", "html", "pdf"].each do |ext|
  FileUtils.rm "#{outfilebase}}*.#{ext}" rescue nil
end

desc "execute rspec with given examples"
task :rspec, [:example] do |t, args|

  example, example_doc = process_example_argument(args)

  # clean diff folder - only if not specific example is to be evaluated
  Dir["test-diff/*"].each { |f| rm f } if example.nil?

  resultfile = "#{$conf[:testresultfolder]}/#{testname}#{example_doc}.html" # note that example_doc brings the "_" separator

  sh "rspec #{File.dirname(__FILE__)}/abc2svg_spec.rb #{example } -f html --out '#{resultfile}' -f progress" rescue nil
end

# install file tasks to produce reference pngs
Dir[%Q{#{$conf[:testreferencefolder]}/*.html}].each do |f|
  pngfilename = %Q{#{File.dirname(f)}/#{File.basename(f, ".html")}.png}

  file pngfilename => f do |t, args|
    htmlfile = t.source
    fullfile = File.absolute_path("#{htmlfile}").gsub(" ", "%20")

    cmd = %Q{#{chrome} --headless --disable-gpu --screenshot --window-size=#{$conf[:windowsize]} "file://#{fullfile}" &> chrome.log}
    %x{#{cmd}}
    FileUtils.mv "screenshot.png", pngfilename
  end
end


desc "create reference pngs"
task :buildreferencepngs => Dir[%Q{#{$conf[:testreferencefolder]}/*.html}].map { |f| %Q{#{File.dirname(f)}/#{File.basename(f, ".html")}.png} }

desc "show testresult html page"
task :show, [:example] do |t, args|

  example, example_doc = process_example_argument(args)

  resultfile = "#{$conf[:testresultfolder]}/#{testname}#{example_doc}.html" # note that example_doc brings the "_" separator

  cmd = %Q{open "#{resultfile}"}
  `#{cmd}`
end

desc "show the changed png"
task :showpng, [:example] do |t, args|
  pattern     = "*#{args[:example]}*.png"
  diffpattern = "*#{args[:example]}*.diff.png"

  [:testreferencefolder, :testoutputfolder, :testdifffolder].each do |folder|
    files = Dir["#{$conf[folder]}/#{pattern}"]
    files = Dir["#{$conf[folder]}/#{diffpattern}"] if files.empty?

    if files.count == 1
      cmd = %Q{open "#{files.first}"}
      `#{cmd}`
    else
      puts "Should have exactly one file to display! Found #{files.count} files for #{pattern} #{files}"
      exit(0)
    end
  end
end

desc "collect sources to #{$conf[:testsourcefolder]}"
task :collectsources do
  $conf[:sourcefiles].each do |source|
    cp source, $conf[:testsourcefolder]
  end
end


desc "list avaliable examples"
task :list, [:example] do |t, args|
  pattern = "*#{args[:example]}*"

  puts $conf[:sourcefiles].select { |f| File.fnmatch(pattern, f) }.map { |f| File.basename(f) }
end

task :default do
  tasks     = Rake.application.tasks.select { |t| t.is_a? Rake::Task }
  tasks     = tasks.select { |t| t.comment }
  tasknames = tasks.map { |t| t.name }

  name_width = tasks.map { |t| t.name_with_args.length }.max || 10
  max_column = Rake.application.terminal_width

  tasks.each do |t|
    printf("rake %-#{name_width}s  # %s\n",
           "#{t.name_with_args}",
           max_column ? Rake.application.truncate(t.comment, max_column) : t.comment)
  end

  puts %Q{
  Example usage:

  rake rspec[9999]  # execute test with example matching *9999*
  rake list [9999]  # list  example matching *9999*

       }
end

desc "show the changed png"
task :showdiff, [:example] do |t, args|

  def mk_row(difffilename)
    filename = difffilename.gsub(".diff.", ".")

    pngfilename = difffilename.gsub(".diff.", "_-test_a3.")

    referr = File.read(%Q{#{$conf[:testreferencefolder]}/#{File.basename(filename, ".png")}.abc.err.log})
    outerr = File.read(%Q{#{$conf[:testoutputfolder]}/#{File.basename(filename, ".png")}.abc.err.log})


    diff_as_html = []
    diff_as_html.push %Q{<p>}
    callback_obj = DiffToHtmlCallbacks.new(diff_as_html)
    xx           = Diff::LCS.traverse_balanced(referr, outerr, callback_obj)
    diff_as_html.push %Q{</p>}
    diff_as_html = diff_as_html.join

    testid = filename.split("_").first

    %Q{
       <h1 style="page-break-before: always;">#{filename}</h>
       <input></input><button onclick='contribute("#{testid}", 0, "no comment");'>ok</button><button>fail</button><button>unknown</button>
       <table width="100%" border="1">
            <tr valign="top">
               <td width="30%"><img src="../#{$conf[:testreferencefolder]}/#{pngfilename}" width="100%"></img><p>#{referr.gsub("\n", "<br/>")}</p></td>
               <td width="30%"><img src="../#{$conf[:testdifffolder]}/#{difffilename}" width="100%">#{diff_as_html.gsub("\n", "<br/>")}</img></td>
               <td width="30%"><img src="../#{$conf[:testoutputfolder]}/#{pngfilename}" width="100%"></img><p>#{outerr.gsub("\n", "<br/>")}</p></td>
            </tr>
          </table>
    }
  end

  files_to_show = Dir["#{$conf[:testdifffolder]}/*.diff.png"].map { |f| File.basename(f) }
  showfile      = "#{$conf[:testresultfolder]}/#{testname}.diff.html" # note that example_doc brings the "_" separator

  File.open(showfile, "w") do |f|

    ruruku_url = "http://localhost:8080"
    f.puts %Q{
<!doctype html>
        <html>
        <head>
          <script src="#{ruruku_url}/client.js"></script>
          <script type="text/javascript">
             let contribute;
             const boot = async () => {
               let c = ruruku.newClient('#{ruruku_url}');
               await c.login("admin", "admin");
               const sessions = await c.listSessions();
               await c.joinSession(sessions[0].getId());
  console.log ("foobar");


               contribute = async function contribute(testID, result, comment) {
                   await c.claim(testID, true);
                   await c.contribute(testID, result, comment);
               }
            };
            boot();
          </script>
        </head>
        <body>
         #{files_to_show.map { |f| mk_row(f) }.join("\n")}
        </body>
      </html>
    }

    cmd = %Q{open "#{showfile}"}
    `#{cmd}`

  end
end

desc "commit the recent test"
task :commit_test do
  cmd = %Q{git add -A}
  sh cmd
  cmd = %Q{git commit -m "test-results #{testname}"}
  sh cmd
end

desc "commit the current result as reference"
task :commit_ref do
  cmd = %Q(git add -A #{$conf[:testreferencefolder]})
  sh cmd
  cmd = %Q{git commit -m "#{PRODUCED_WITH} #{ get_reference_version(referenceversionfile)}"}
  sh cmd
end

desc "baseline a test"
task :baseline do
  sh "rake commit_test"
  sh "rake buildreference"
  sh "rake commit_ref"
end

desc "show status"
task :status do
  puts %Q{
current test: #{testname}
reference   : #{get_reference_version(referenceversionfile)}

git status:

#{`git status`}
       }
end


task :help => :default

class DiffToHtmlCallbacks
  attr_accessor :output

  def initialize(output, options = {})
    @output       = output
    @state        = :init
    @line_started = true
    options       ||= {}

    @styles = {
        ins: "text-decoration: underline;color:#006622; background-color: #ccffdd; ",
        del: "text-decoration: line-through;color:#ff0000; background-color: #ffe6e6;",
        eq:  ""
    }

  end

  def to_html(element)
    case element
    when "\n"
      result        = "<br/>"
      @line_started = true
    when " "
      result = @line_started ? '&nbsp' : " "
    else
      @line_started = false
      result        = element.gsub(/[<>&]/, {"\n" => '<br/>', '<' => '&lt;', '>' => '&gt;', '&' => '&amp;'})
    end
    result
  end

  def handle_entry(element, state)
    unless @state == state
      @output.push "</span>" unless @state == :init
      @state = state
      @output.push %Q{<span style="#{@styles[state]}">}
    end

    @output.push(to_html(element))
  end

  private :handle_entry

# This will be called with both lines are the same
  def match(event)
    handle_entry(event.old_element, :eq)
  end

# This will be called when there is a line in A that isn't in B
  def discard_a(event)
    handle_entry(event.old_element, :del)
  end

# This will be called when there is a line in B that isn't in A
  def discard_b(event)
    handle_entry(event.new_element, :ins)
  end

end