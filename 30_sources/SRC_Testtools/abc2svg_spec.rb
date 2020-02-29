#
require 'json'
load("config.mft.rb")

sourcefiles = Dir["#{$conf[:testsourcefolder]}/*.abc"].sort
#sourcefiles = $conf[:sourcefiles]

class String
  def cleanfordiff
    self.gsub(/<!-- CreationDate:[^-]*-->/, "").gsub(/<meta name="generator".*\/>/, "")
  end

  def cleandirname(dirname)
    self.gsub(dirname, "")
  end
end

describe "inspect generated pdfs" do

  filenamepart = "-test"

  sourcefiles.each do |sourcefilename|

    it "handles #{sourcefilename}" do
      verdict = {}
      outfilename = File.basename(sourcefilename, '.abc')

      outfilebase     = "#{$conf[:testoutputfolder]}/#{outfilename}"
      reffilebase     = "#{$conf[:testreferencefolder]}/#{outfilename}"
      difffilebase    = "#{$conf[:testdifffolder]}/#{outfilename}"

      # cleanup output folder
      ["err", "html", "pdf"].each do |ext|
        FileUtils.rm "#{outfilebase}}*.#{ext}" rescue nil
      end


      unless false # testreference == testoutput
        if File.exist?("#{reffilebase}_#{filenamepart}_a3.png")
          cmd            = %Q{npx pixelmatch "#{outfilebase}_#{filenamepart}_a3.png" "#{reffilebase}_#{filenamepart}_a3.png" "#{difffilebase}.diff.png" 0.1}
          changed_pixels = %x{#{cmd}}
          #require 'pry';binding.pry
          changed_pixels = changed_pixels.match(/.*pixels:\s*(\d+).*/)[1].to_i
          FileUtils.rm "#{difffilebase}.diff.png" if changed_pixels == 0
          verdict[:changed_pixels] = changed_pixels unless changed_pixels < 100
        end
      else
        FileUtils.rm "#{difffilebase}.diff.png" if File.exist?("#{difffilebase}.diff.png")
      end


      ["abc.err.log"].each do |ext|

        testoutput = File.read("#{outfilebase}.#{ext}").cleanfordiff#.gsub(/^.*#{outfilebasename}/, outfilebasename)
        referenceoutput = File.read("#{reffilebase}.#{ext}").cleanfordiff#.gsub(/^.*#{outfilebasename}/, outfilebasename) rescue testoutput

        verdict[:abort]     = true if testoutput.include?("*** Abort")
        verdict[ext.to_sym] = "different" unless testoutput == referenceoutput
      end

      expect(verdict).to eq({})
    end
  end

end

