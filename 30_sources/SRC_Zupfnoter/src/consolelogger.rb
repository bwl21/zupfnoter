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


  def initialize(element_id)
    @console = element_id # Element.find("##{element_id}")
    @loglevel = LOGLEVELS[:info]
  end

  def error(msg)
    write(:error, msg)
  end

  def warning(msg)
    write(:warning, msg)
  end

  def info(msg)
    write(:info, msg)
  end

  def debug(msg)
    write(:debug, msg)
  end

  def message(msg)
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

  def write(type, msg)

    current_level = LOGLEVELS[type] || LOGLEVELS[:warning]
    if (current_level <= @loglevel)
      time = Time.now.strftime("%H:%M:%S")
      @console.write_html "<li class='#{type}'><i class=\"#{LOGICONS[type]}\"><span class='time'>#{time}</span><span class='msg'>#{msg}</span></li>"
      puts msg
    end
  end

end
