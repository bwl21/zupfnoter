module JSZip

  class ZipFile

    def initialize
      @zip = `new JSZip()`
    end

    def folder(name)
      Folder.new `self.zip.folder(name)`
    end

    def file(name, content)
      `self.zip.file(name, content)`
    end

    def to_blob
      `self.zip.generate({type:"blob"})`
    end

    def to_blob_url
      blob = to_blob
      `window.URL.createObjectURL(blob)`
    end

    def to_base64
      `self.zip.generate()`
    end

  end

  class Folder

    def initialize(folder)
      @folder = folder
    end

    def file(name, content)
      `self.folder.file(name, content)`
    end

  end

end
