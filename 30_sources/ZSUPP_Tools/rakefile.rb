##
# generate a task for each manifest file
#
#
manifestfiles=Dir["../ZSUPP_Manifests/*.yaml"]

manifestfiles.each{|file|
  taskdesc=File.basename(file, ".yaml")
  taskname=taskdesc.split("_")[0]
  desc "generate #{taskdesc}"
  task taskname do
    cmd="wortsammler -bpm #{file}"
    sh cmd
  end
}

