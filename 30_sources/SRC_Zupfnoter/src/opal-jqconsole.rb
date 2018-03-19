# this is a wrapper for js-console

module JqConsole

  class JqConsole
    def initialize(container, prompt, message="")
      Element.expose(:jqconsole)
      @jqconsole = Native(Element.find("##{container}").jqconsole(message, prompt))
      on_command do |cmd|
        @jqconsole.Write("no handler installed; -> #{cmd}\n")
      end

      handler(nil)
      @jqconsole
    end

    def on_command(&block)
      @handler = block
    end

    def write *stuff
      @jqconsole.Write(*stuff)
    end

    def write_html html_str
      @jqconsole.Write(html_str, "unescaped", false)
    end


    def set_focus
      @jqconsole.Focus();
    end

    # Save session to local store
    def save_to_localstorage
      history = Native(@jqconsole.GetHistory).last(15).to_json
      `localStorage.setItem('console_history', history);`
    end

    # load session from localstore
    def load_from_loacalstorage
      history = Native(`localStorage.getItem('console_history')`)
      unless history.nil?
        history = JSON.parse(history)
        @jqconsole.SetHistory(history) unless history.nil?
      end
    end

    def get_history()
      @jqconsole.GetHistory
    end

    def set_history(array)
      @jqconsole.SetHistory(array[0..4])
    end

    private

    def handler(cmd)
      if cmd && `#{cmd } != undefined`
        begin
          @handler.call(cmd)
        rescue Exception => e
          @jqconsole.Write('Error: ' + e.message + "\n")
        end
      end
      @jqconsole.Prompt(true, lambda { |c| handler(c) }, lambda { |c| false })
    end
  end
end