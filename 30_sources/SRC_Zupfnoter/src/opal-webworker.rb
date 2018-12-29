class Webworker

  def initialize(parent) #

    @handlers = {}
    if Native(parent).is_a?(String) # this is the name of the worker script - when used in the main script
      @worker = %x{new Worker(#{parent})}
      @name   = "main script"
    else
      @worker = parent # now I am in the worker script
      @name   = "worker"
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
      result  = nil
      # $log.benchmark("parsing  #{payload[0 .. 30]} in #{@name}") do
      result = JSON.parse(payload)
      # end
      # $log.benchmark("Received #{payload[0 .. 30]} in #{@name}") do
      block.call(result)
      nil
      # end
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
        # $log.benchmark(object[:name]) do
        if object.is_a? Hash
          handler = @handlers[object[:name]]
          handler.call(object) if handler
        else
          # todo handle else part
        end
          # end
      end
    end

    # now we register the handler
    @handlers[cmd] = block
  end

end