LOGLEVELS = {message: 0,
             error:   1,
             warning: 2,
             info:    3,
             debug:   4
}
LOGICONS  = {
    :message => :"icon-info-circled",
    :error   => :"icon-error-alt",
    :warning => :"icon-attention",
    :info    => :"icon-info-circled",
    :debug   => :"icon-minus-squared"
}

class Logger

  attr_reader :annotations
  attr :benchmarkstack

  def clear_annotations
    @annotations = []
  end

  def initialize(element_id)
    @console   = element_id # Element.find("##{element_id}")
    @loglevel  = LOGLEVELS[:info]
    @timestamp = Time.now
    @benchmarkstack = 0
    clear_errors
    clear_annotations
  end

  def clear_annotations
    @annotations = []
  end


  def log_from_worker(payload)
    send(payload[:type], *payload[:args])
  end

  # emit an error message and record an annoation to mark the error position
  # in a source text
  #
  # @param [String] msg the message
  # @param [Array] start_pos start position in the source text as [row, col]
  # @param [Array] end_pos  end position in the source text as [row, col]
  #                             derived from start_pos if left out
  #
  # @return [Object] undefined
  def error(msg, start_pos = nil, end_pos = nil, backtrace = [])
    @captured_errors.push(msg)
    add_annotation(msg, start_pos, end_pos, :error)
    backtrace_message = backtrace.join("\n") if loglevel == :debug
    write(:error, "#{msg}#{backtrace_message}")
  end

  # for documentation see : error
  def warning(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :warning) if loglevel?(:warning)
    write(:warning, msg)
  end

  # for documentation see : error
  def info(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :info)
    write(:info, msg)
  end

  # for documentation see : error
  def debug(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :debug)
    write(:debug, msg)
  end

  # for documentation see : error
  def message(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :message)
    write(:message, msg)
  end

  # outputs an info entry with the current timestamp
  def timestamp(msg, start_pos = nil, end_pos = nil)
    $log.info("Timestamp #{Time.now() - @timestamp} sec: #{msg}")
  end

  # resets the timestamp. subsequent calls to timestamp are based on this time
  def timestamp_start()
    @timestamp = Time.now
  end

  def clear_errors
    @captured_errors = []
  end

  def has_errors?
    @captured_errors.count > 0
  end

  def get_errors
    @captured_errors
  end


  def get_status
     {annotations: @annotations, captured_errors: @captured_errors}
  end

  def set_status(status)
    @annotations = status[:annotations]
    @captured_errors = status[:captured_errors]
  end
  # executes the block and outputs n info entry with the duration
  # returns the result of the block
  def benchmark(msg, &block)
    s      = Time.now
    @benchmarkstack  +=1
    result = block.call
    $log.info("#{@benchmarkstack}  elapsed #{Time.now() - s} sec for #{msg}")
    @benchmarkstack -=1
    result
  end

  def console_log(msg)
    %x{console.log(#{msg})}
  end

  # adjust the level to filter the messages
  # @param [String] level messages below this level will be reported
  #                 e.g. "warning" will report errors and warning only
  def loglevel=(level)
    @loglevel = LOGLEVELS[level.to_sym] || LOGLEVELS[:debug]
    $log.message("logging messages up to #{LOGLEVELS.invert[@loglevel]}")
  end

  # return the loglevel
  def loglevel
    LOGLEVELS.invert[@loglevel]
  end

  # this queries if a particular loglevel will be shown
  def loglevel?(type)
    (LOGLEVELS[type] || LOGLEVELS[:warning]) <= @loglevel
  end

  def loglevels
    LOGLEVELS.keys
  end

  private

  def add_annotation(msg, start_pos, end_pos, type)
    if start_pos
      the_start = start_pos
      the_end   = end_pos || [the_start.first, the_start.last + 1]
      @annotations << {start_pos: the_start, end_pos: the_end, text: msg, type: type}
    end
    nil
  end

  def write(type, msg)
    if (loglevel?(type))
      time = Time.now.strftime("%H:%M:%S")
      # @console.write_html "<li class='#{type}'><i class=\"#{LOGICONS[type]}\"><span class='time'>#{time}</span><span class='msg'>#{msg}</span></li>"
      puts msg
    end
  end

end

class NodeLogger < Logger

  def write(type, msg)

    current_level = LOGLEVELS[type] || LOGLEVELS[:warning]
    if (current_level <= @loglevel)
      time = Time.now.strftime("%H:%M:%S")
      puts msg
    end
  end
end

class ConsoleLogger < Logger

  def initialize(element_id)
    super
    @console = element_id
  end

  def write(type, msg)

    current_level = LOGLEVELS[type] || LOGLEVELS[:warning]
    if (current_level <= @loglevel)
      time = Time.now.strftime("%H:%M:%S")
      @console.write_html "<li class='#{type}'><i class=\"#{LOGICONS[type]}\"><span class='time'>#{time}</span><span class='msg'>#{msg}</span></li>"
      puts msg
    end
  end

end
