class Webworker

  def initialize(parent)
    @worker = parent
  end

  def createWorker(script)
    @worker = %x{new Worker(#{script})}
  end

  def postMessage(object)
    %x{#{@worker}.postMessage(#{object.to_n});}
  end

  def onMessage(&block)
    %x{ #{@worker}.addEventListener('message', #{&block}, false);
      }
  end
end