class Webworker

  def initialize(parent) #

    @handlers = {}
    if Native(parent).is_a?(String) # this is the name of the worker script - when used in the main script
      @worker = %x{new Worker(#{parent})}
    else
      @worker = parent # now I am in the worker script
    end
  end

  def createWorker(script)
    @worker = %x{new Worker(#{script})}
  end

  def post_message(object)
    %x{#{@worker}.postMessage(#{object.to_json});}
  end

  def on_message(&block)
    listener = lambda do |event|
      payload = Native(event)[:data]
      $log.benchmark("Received #{payload[0 .. 30]} in #{__FILE__}") do
        block.call(JSON.parse(payload))
      end
    end
    %x{ #{@worker}.addEventListener('message', #{listener}, false);}
  end

end

class NamedWebworker < Webworker
  def post_named_message(cmd, object)
    post_message({name: cmd, payload: object})
  end

  def on_named_message(cmd, &block)
    # if there is no handler, we have to
    # install a generic on_message handler
    #
    if @handlers.empty?
      on_message do |object|
        if object.is_a? Hash
          handler = @handlers[object[:name]]
          handler.call(object) if handler
        else
          # todo handle else part
        end
      end
    end

    # now we register the handler
    @handlers[cmd] = block
  end

end