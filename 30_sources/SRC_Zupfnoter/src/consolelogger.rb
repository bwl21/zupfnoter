require 'opal-jquery'

class ConsoleLogger

  def initialize(element_id)
    @console = Element.find("##{element_id}")
  end

  def error(msg)
    write(:error, Time.now, msg)
  end

  def warning(msg)
    write(:error, Time.now, msg)
  end

  def info(msg)
    write(:error, Time.now, msg)
  end

  def write(type, time, msg)
    icons = {
        :error => :"icon-error-alt",
        :warning => :"icon-attention",
        :info => :"icon-info-circled"
    }

    @console << "<li class='#{type}'><i class=\"#{icons[type]}\"><span class='time'>#{time}</span><span class='msg'>#{msg}</span></li>"
  end

end
