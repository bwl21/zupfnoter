require 'opal-jquery'

class ConsoleLogger

  def initialize(element_id)
    @console = Element.find("##{element_id}")
  end

  def error(msg)
    write(:error, msg)
  end

  def warning(msg)
    write(:warning, msg)
  end

  def info(msg)
    write(:info,  msg)
  end

  def write(type, msg)
    icons = {
        :error => :"icon-error-alt",
        :warning => :"icon-attention",
        :info => :"icon-info-circled"
    }
    time = Time.now.strftime("%H:%M:%S")
    @console << "<li class='#{type}'><i class=\"#{icons[type]}\"><span class='time'>#{time}</span><span class='msg'>#{msg}</span></li>"
    #Native(@console.parent).scrollTop(9999999) -- whyever this does not work :-)
    `self.console.parent().scrollTop(999999)`
  end

end
