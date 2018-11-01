class Webworker

  def initialize(parent) #

    @handlers = {}
    if Native(parent).is_a?(String)
      @worker = %x{new Worker(#{parent})}
    else
      @worker = parent
    end
  end

  def createWorker(script)
    @worker = %x{new Worker(#{script})}
  end

  def post_message(object)
    %x{#{@worker}.postMessage(#{object.to_n});}
  end

  def on_message(&block)
    %x{ #{@worker}.addEventListener('message', #{block}, false);}
  end

end

class NamedWebworker < Webworker
  def post_named_message(cmd, object)
    post_message({name: cmd, payload: object})
  end

  def on_named_message(cmd, &block)
    if @handlers.empty?
      on_message do |event|
        data    = Native(event)[:data]
        handler = @handlers[data[:name]]
        if handler
          handler.call(data)
        end
      end
    end
    @handlers[cmd] = block
  end

end