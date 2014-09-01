require 'opal-jquery'

class ConsoleLogger

  LOGLEVELS = {error: 0,
               warning: 1,
               info: 2,
               debug: 3
  }
  LOGICONS = {
      :error => :"icon-error-alt",
      :warning => :"icon-attention",
      :info => :"icon-info-circled",
      :debug => :"icon-minus-squared"
  }


  def initialize(element_id)
    @console = Element.find("##{element_id}")
    @loglevel = LOGLEVELS[:debug]
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

  def write(type, msg)

    current_level = LOGLEVELS[type] || 0
    if (current_level <= @loglevel)
      time = Time.now.strftime("%H:%M:%S")
      @console << "<li class='#{type}'><i class=\"#{LOGICONS[type]}\"><span class='time'>#{time}</span><span class='msg'>#{msg}</span></li>"
      #Native(@console.parent).scrollTop(9999999) -- whyever this does not work :-)
      `self.console.parent().scrollTop(999999)`

      puts msg
    end
  end

end
