module Harpnotes

  class TextPane
    attr_accessor :editor, :controller

    #
    # Initializes the text pane
    # @param div [String] The id of the div for the textpae
    #
    # @return [object] The javascript object for Ace
    def initialize(div)
      %x{
        // see http://stackoverflow.com/questions/13545433/autocompletion-in-ace-editor
        //     http://stackoverflow.com/questions/26991288/ace-editor-autocompletion-remove-local-variables
        var langTools = ace.require("ace/ext/language_tools");
        langTools.setCompleters([langTools.snippetCompleter])

        var editor = ace.edit(div);
        editor.$blockScrolling = Infinity;

        editor.getSession().setMode("ace/mode/abc");

        editor.setTheme("ace/theme/abc");

        editor.setOptions({
          highlightActiveLine: true,
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: false        });

        // todo: refine autocompletion according to http://plnkr.co/edit/6MVntVmXYUbjR0DI82Cr?p=preview
        //                                          https://github.com/ajaxorg/ace/wiki/How-to-enable-Autocomplete-in-the-Ace-editor

      }
      @editor            = `editor`
      @range             = `ace.require('ace/range').Range`
      @inhibit_callbacks = false;
      @markers = []
      create_lyrics_editor('abcLyrics')
    end

    def create_lyrics_editor(div)
      #
      # Initializes the text pane
      # @param div [String] The id of the div for the textpae
      #
      # @return [object] The javascript object for Ace
      %x{
        // see http://stackoverflow.com/questions/13545433/autocompletion-in-ace-editor
        //     http://stackoverflow.com/questions/26991288/ace-editor-autocompletion-remove-local-variables
        var langTools = ace.require("ace/ext/language_tools");
        langTools.setCompleters([langTools.snippetCompleter])

        var editor = ace.edit(div);
        editor.$blockScrolling = Infinity;

        editor.getSession().setMode("ace/mode/markdown");

        editor.setTheme("ace/theme/abc");

        editor.setOptions({
          highlightActiveLine: true,
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: false        });

        // todo: refine autocompletion according to http://plnkr.co/edit/6MVntVmXYUbjR0DI82Cr?p=preview
        //                                          https://github.com/ajaxorg/ace/wiki/How-to-enable-Autocomplete-in-the-Ace-editor
        editor.on('change', function(){#{from_lyrics}})
      }
      @lyrics_editor            = `editor`
      @lyrics_range             = `ace.require('ace/range').Range`
      @lyrics_inhibit_callbacks = false;
      @lyrics_markers = []
    end

    #
    # Install a handler for "change" event
    # @param block [Lambda] The procedure to be executed wheneve the doucument is changed.
    #
    # @return [type] [description]
    def on_change(&block)
      # changes in the editor
      Native(Native(@editor).getSession).on(:change) { |e|
        clear_markers #todo:replace this by a routine to update markers if available https://github.com/ajaxorg/cloud9/blob/master/plugins-client/ext.language/marker.js#L137
        block.call(e) #unless @inhibit_callbacks
      }
    end

    #
    # Install a handler for "selection change" event
    # @param block [Lambda] Procedure to be executed
    #
    # @return [type] [description]
    def on_selection_change(&block)
      Native(Native(@editor)[:selection]).on(:changeSelection) do |e|
        block.call(e) unless @inhibit_callbacks
      end
    end

    #
    # Install a handler for "cursor change" event
    # @param block [Lambda] Procedure to be executed
    #
    # @return [type] [description]
    def on_cursor_change(&block)
      block.call(nil)
      Native(Native(@editor)[:selection]).on(:changeCursor) do |e|
        block.call(e) unless @inhibit_callbacks
      end
    end


    def clear_selection
      %x{
      #{@editor}.selection.clearSelection()
      }
    end


    #
    # Get the border of the current selection
    # todo: this might be not enough in case of multiple selectios.
    #
    # Note that it returnes [row, col] for start and end
    # counting from "0"
    #
    # @return [Array of Number] [start, end] position of selection
    def get_selection_positions
      %x{
        doc = self.editor.selection.doc;
        range = self.editor.selection.getRange();
        range_start = doc.positionToIndex(range.start, 0);
        range_end = doc.positionToIndex(range.end, 0);
      }
      [`range_start`, `range_end`]
    end

    # This method provides information about the current selection
    # the results are intended to be shown in the statuslilne
    # therefore, we add 1 to row and column
    #
    # note it also provides token information in which we
    # do not increment startpos and endpos such that it can be
    # used together with patchtoken
    #
    # result: {selection: [], token: {type: <type>, value: <value>}}
    def get_selection_info
      %x{
         doc = self.editor.selection.doc;
         range = self.editor.selection.getRange();
         token = self.editor.session.getTokenAt(range.start.row, range.start.column);
         if (token){
           token.startpos = [range.start.row, token.start];
           token.endpos = [range.start.row, token.start + token.value.length];
         }
         else
         {
          //todo handle missing token
         }
        }
      # note that
      Native(`{selection: [[range.start.row+1, range.start.column+1], [range.end.row+1, range.end.column+1]], token: token}`)
    end

    #
    # Select by position (in opposite to row/column pairs)
    # @param requested_selection_start [Numeric] Begin of the intended selection
    # @param requested_selection_end [Numeric] End of intended selection
    # @param [boolean] expand_selection - expand the selection if true
    #
    # @return [type] [description]
    def select_range_by_position(requested_selection_start, requested_selection_end, expand_selection = false)
      #$log.debug("set editor selection to #{selection_start}, #{selection_end} (#{__FILE__} #{__LINE__}) ")

      if expand_selection
        current_selection = get_selection_positions
      else
        current_selection = [requested_selection_start, requested_selection_end]
      end
      selection_newstart = [current_selection.first, requested_selection_start].min
      selection_end      = [current_selection.last, requested_selection_end].max

      %x{
        doc = self.editor.selection.doc
        startrange = doc.indexToPosition(#{selection_newstart});
        endrange = doc.indexToPosition(#{selection_end});
        range = new #{@range}(startrange.row, startrange.column, endrange.row, endrange.column);
        myrange = {start:startrange, end:endrange}
        #{@editor}.focus();
        #{@editor}.selection.setSelectionRange(myrange, false);
      }
    end


    #
    # Get the current text of the editor
    #
    # @return [String] The content of the text field.
    def get_text
      `self.editor.getSession().getValue()`
    end

    # add new text to the editor
    # @param text the text to be set to the editor
    def set_text(text)
      %x{
         self.editor.getSession().setValue(text);
      }
    end

    # replaces the text of the range by
    # range is a reange object
    # s
    # @param [Array] startpos [row, col] starting with 0
    # @param [Array] endpos   [row, col] starting with 0
    # @param [String] text
    def replace_range(startpos, endpos, text)
      %x{
      therange = new #{@range}(#{startpos}[0], #{startpos}[1], #{endpos}[0], #{endpos}[1])
      #{editor}.getSession().replace(therange, #{text})
      }
    end

    # replace a text in the editor
    # this is to maintain undo stack
    # @param oldtext the text to be removed
    # œparam newtext  the new tet to be entered
    def replace_text(oldtext, newtext)
      %x{self.editor.replace(#{newtext}, {needle: #{oldtext}}) }
    end

    # @param [Array] annotations  array of {row: 1, text: "", type: "error" | "warning" | "info"}
    #                aguments defined by ace
    def set_annotations(annotations)
      editor_annotations = annotations.map do |annotation|
        {row:  annotation[:start_pos].first - 1, # annotations count on row 0
         text: annotation[:text],
         type: annotation[:type]
        }
      end
      set_markers(annotations)
      %x{#{@editor}.getSession().setAnnotations(#{editor_annotations.to_n})}
    end


    # here I started routines to maintain markers
    # maybe it is better to go back to https://github.com/ajaxorg/cloud9/blob/master/plugins-client/ext.language/marker.js#L137
    # for the time bi

    def set_markers(annotations)
      clear_markers
      annotations.each do |annotation|
        add_marker(annotation)
      end
    end


    def prepend_comment(message)
      text =message.split(/\r?\n/).map { |l| "% #{l}" }.join("\n") + "\n%\n"
      %x{
      #{@editor}.selection.moveCursorFileStart();
      #{@editor}.insert(#{text});
      }
    end


    def append_text(text)
      %x{
      #{@editor}.selection.moveCursorFileEnd();
      #{@editor}.insert(#{text});
      }
    end

    def add_marker(annotation)
      marker_start = {row: annotation[:start_pos].first, col: annotation[:start_pos].last} # this is for eas of maintainability
      marker_end   = {row: annotation[:end_pos].first, col: annotation[:end_pos].last} # this is for eas of maintainability
      id           = %x{#{@editor}.getSession().addMarker(new #{@range}(#{marker_start[:row] - 1}, #{marker_start[:col] - 1},
                                                              #{marker_end[:row] - 1}, #{marker_end[:col] - 1}),
                                               "marked", "line", true)}
      # id = %x{#{@editor}.getSession().addMarker(new #{@range}(23, 3,
      #                                                         23, 5),
      #                                          "marked", "line", true)}
      @markers << {
          from: [marker_start[:row], marker_start[:col]],
          to:   [marker_end[:row], marker_end[:col]],
          id:   id
      }
      nil
    end

    def clear_markers
      @markers.each do |marker|
        %x{#{@editor}.session.removeMarker(#{marker[:id]})}
      end
      @markers.clear
    end


    # get the abc part of the stuff
    CONFIG_SEPARATOR = "%%%%zupfnoter.config"

    def get_abc_part
      get_text.split(CONFIG_SEPARATOR).first
    end

    # get the config part of the music
    def get_config_part
      get_text.split(CONFIG_SEPARATOR)[1] || "{}"
    end

    def get_parsed_config
      config_part = get_config_part
      begin
        config = JSON.parse(config_part)
        status = true
      rescue Exception => error
        line_col = get_config_position(error.message.split.last.to_i)
        $log.error("#{error.message} at #{line_col}", line_col)
        config = {}
        status = false
      end
      [config, status]
    end

    def neat_config
      config, status = get_parsed_config
      set_config_part(config) if status
    end

    def get_checksum
      s = get_text
      %x{
            var i;
            var chk = 0x12345678;

            for (i = 0; i < #{s}.length; i++) {
              chk += (#{s}.charCodeAt(i) * (i + 1));
           }
         }
      `chk`.to_s.scan(/...?/).join(' ')
    end


    def resize
      `#{@editor}.resize()`
    end


    # this pushes the object to the config part of the editor
    #
    def set_config_part(object)
      the_selection = get_selection_positions
      options       = $conf[:neatjson]



      configjson = ""
      $log.benchmark("neat_json", __LINE__, __FILE__) {configjson = JSON.neat_generate(object, options)}

      unless get_text.split(CONFIG_SEPARATOR)[1]
        append_text(%Q{\n\n#{CONFIG_SEPARATOR}\n\n\{\}})
      end

      oldconfigpart      = get_config_part
      @inhibit_callbacks = true
      unless oldconfigpart.strip == configjson.strip
        replace_text(CONFIG_SEPARATOR + oldconfigpart, "#{CONFIG_SEPARATOR}\n\n#{configjson}")
        select_range_by_position(the_selection.first, the_selection.last)
      end
      @inhibit_callbacks = false
    end

    # this applies the object to the config
    # values not in object are not changed in config
    def patch_config_part(key, object)
      pconfig       = Confstack::Confstack.new(false) # what we get from editor
      pconfig_patch = Confstack::Confstack.new(false) # how we patch the editor
      config_part   = get_config_part
      begin
        config = JSON.parse(config_part)
        pconfig.push(config)

        pconfig_patch[key] = object
        pconfig.push(pconfig_patch.get)
        set_config_part(pconfig.get)

      rescue Object => error
        line_col = get_config_position(error.last)
        $log.error("#{error.first} at #{line_col}", line_col)
        set_annotations($log.annotations)
      end
    end


    # this methods patches a token
    # @param [Array] endpos [row, col]
    def patch_token(token, endpos, newvalue)
      oldtoken = get_selection_info.token
      raise "cannot patch token if there is a name mismatch '#{oldtoken.type}' - '#{token}'" unless oldtoken.type.to_s == token.to_s
      #raise "cannot patch token if in wrong position" if oldtoken.endpos != endpos

      replace_range(oldtoken.startpos, oldtoken.endpos, newvalue)
    end

    # this adds the parts of object which are not yet in config
    # it does not change the values of config
    def extend_config_part(key, object)
      pconfig       = Confstack::Confstack.new(false) # what we get from editor
      pconfig_patch = Confstack::Confstack.new(false) # how we patch the editor
      config_part   = get_config_part
      begin
        config = JSON.parse(config_part)
        pconfig.push(config)

        pconfig_patch[key] = object
        pconfig.push(pconfig_patch.get)
        pconfig.push(config)

        set_config_part(pconfig.get)

      rescue Object => error
        line_col = get_config_position(error.last)
        $log.error("#{error.first} at #{line_col}", line_col)
        set_annotations($log.annotations)
      end
    end

    # deletes the entry of key in the config part
    def delete_config_part(key)
      pconfig     = Confstack::Confstack.new(false) # what we get from editor
      config_part = get_config_part
      config      = JSON.parse(config_part)
      pconfig.push(config)
      pconfig[key] = Confstack::DeleteMe
      set_config_part(pconfig.get)
    end

    # returns the value of key in in config part
    def get_config_part_value(key)
      pconfig     = Confstack::Confstack.new(false)
      config_part = get_config_part
      begin
        config = %x{json_parse(#{config_part})}
        config = JSON.parse(config_part)
        pconfig.push(config)
        result = pconfig[key]
      rescue Object => error
        line_col = get_config_position(error.last)
        $log.error("#{error.first} at #{line_col}", line_col)
        set_annotations($log.annotations)
      end
      result
    end

    # get the line and column of an error in the config part
    # @param [Numerical] charpos the position in the config part
    def get_config_position(charpos)
      cp       = charpos + (get_abc_part + CONFIG_SEPARATOR).length
      lines    = get_text[0, cp].split("\n")
      line_no  = lines.count
      char_pos = lines.last.length()
      return line_no, char_pos
    end

    def get_lyrics
      retval = get_lyrics_raw
      if retval.count >0
        lyrics = retval.map { |r| r.first.gsub(/\nW\:[ \t]*/, "\n") }.join().strip
      else
        lyrics = nil
      end
      lyrics
    end

    def get_lyrics_raw
      regex    = /((\n((W\:)([^\n]*)\n)+)+)/
      abc_code = get_abc_part
      retval   = abc_code.scan(regex)
      if retval.count > 1
        $log.error("you have more than one lyrics section in your abc code")
      end
      retval
    end


    # this copies the lyrics to the lyrics editor
    def to_lyrics
      $log.clear_errors  # to rais error for multiple lyrics

      # add initial lyrics
      # abc editor does not have one
      lyrics = get_lyrics
      unless lyrics
        abc            = get_abc_part
        abc_with_lyris = abc.strip + "\n%\nW:\n%\n%\n"
        replace_text(abc, abc_with_lyris)
      end

      # ned to suppress the change handler
      # Ace fires the change handler twice
      # first when removing the old value
      # then when setting the new value
      @handle_from_lyrics=false
      %x{#{@lyrics_editor}.getSession().setValue(#{get_lyrics});}
      @handle_from_lyrics=true

      @controller.call_consumers(:error_alert)
      nil
    end

    def from_lyrics
      if @handle_from_lyrics
        lyrics_raw = get_lyrics_raw

        oldtext = lyrics_raw.first.first # this depends on the the pattern in get_lyrics_raw
        # first match, first group
        newtext = %x{#{@lyrics_editor}.getSession().getValue();}
        newtext = " " if newtext.empty?
        newtext = newtext.split("\n").map { |l| "W:#{l}" }.join("\n")
        newtext = %Q{\n#{newtext}\n}
        replace_text(oldtext, newtext)
      end
      nil
    end

  end

end