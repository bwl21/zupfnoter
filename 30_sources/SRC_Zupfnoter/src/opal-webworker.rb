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
    r = {name: cmd, payload: object}.to_json
    post_message(r)
  end

  def on_named_message(cmd, &block)
    # if there is no handler, we have to
    # install a generic on_message handler
    #
    if @handlers.empty?
      on_message do |event|
        data = Native(event)[:data]
        if data.start_with?("{")
          data = JSON.parse(data)
          handler = @handlers[data[:name]]
          if handler
            handler.call(data)
          end
        end
      end
    end

    # now we register the handler
    @handlers[cmd] = block
  end

end