require 'opal-jquery'

class ConsoleLogger

  LOGLEVELS = {message: 0,
               error: 1,
               warning: 2,
               info: 3,
               debug: 4
  }
  LOGICONS = {
      :message => :"icon-info-circled",
      :error => :"icon-error-alt",
      :warning => :"icon-attention",
      :info => :"icon-info-circled",
      :debug => :"icon-minus-squared"
  }

  attr_reader :annotations

  def initialize(element_id)
    @console = element_id # Element.find("##{element_id}")
    @loglevel = LOGLEVELS[:info]
    clear_annotations
  end

  def clear_annotations
    @annotations = []
  end

  def error(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :error)
    write(:error, msg)
  end

  def warning(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :warning)
    write(:warning, msg)
  end

  def info(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :info)
    write(:info, msg)
  end

  def debug(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :debug)
    write(:debug, msg)
  end

  def message(msg, start_pos = nil, end_pos = nil)
    add_annotation(msg, start_pos, end_pos, :message)
    write(:message, msg)
  end

  def loglevel=(level)
    @loglevel = LOGLEVELS[level.to_sym] || LOGLEVELS[:debug]
    $log.message("logging messages up to #{LOGLEVELS.invert[@loglevel]}")
  end

  def loglevel
    LOGLEVELS.invert[@loglevel]
  end

  private

  def add_annotation(msg, start_pos, end_pos, type)
    @annotations << {row: start_pos.first, col: start_pos.last, text: msg, type: type} if start_pos
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
