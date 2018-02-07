module Harpnotes


  class TextPane
    attr_accessor :editor, :controller, :autofold

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
      @inhibit_callbacks = false
      @markers           = []
      @autofold          = true
      @config_separator  = '%%%%zupfnoter'

      _clean_models

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
        save_to_localstore('zn_abc')
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
      result = _get_abc_from_editor.strip
      result += %Q{\n\n#{@config_separator}.config\n\n} + _get_config_json
      result += %Q{\n\n#{@config_separator}.resources\n\n} + _get_resources_json if _has_resources?
      result
    end

    # add new text to the editor pane as loaded from file
    # @param text the text to be set to the editor
    def set_text(text)
      _split_parts(text)
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
        {row: annotation[:start_pos].first - 1, # annotations count on row 0
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
      text = message.split(/\r?\n/).map { |l| "% #{l}" }.join("\n") + "\n%\n"
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

    def get_abc_part
      `self.editor.getSession().getValue()`
    end

    # get the config part of the music
    def get_config_part
      @config_models[:config]
    end

    def get_config_model
      config_model = _get_config_model
      config_model ? [_get_config_model, true] : [{}, false]
    end

    def get_checksum
      s = _get_abc_from_editor.strip
      %x{
            var i;
            var chk = 0x12345678;

            for (i = 0; i < #{s}.length; i++) {
              chk += (#{s}.charCodeAt(i) * (i + 1));
           }
         }
      `chk`.to_s.scan(/...?/).join(' ') # separate in three parts
    end


    def resize
      `#{@editor}.resize()`
    end


    # this pushes the object to the config part of the editor
    #
    def set_config_model(object)
      @dirty['zn_config'] = true
      _set_config_model(object)
    end

    # this applies the object to the config
    # values not in object are not changed in config
    def patch_config_part(key, object)
      pconfig       = Confstack::Confstack.new(false) # what we get from editor
      pconfig_patch = Confstack::Confstack.new(false) # how we patch the editor
      pconfig.push(_get_config_model)

      pconfig_patch[key] = object
      pconfig.push(pconfig_patch.get)
      _set_config_model(pconfig.get)
    end


    # @param [String] key the name of the resource
    # @param [Object] value the value of the resource as object
    def patch_resources(key, value)
      @dirty['zn_resources'] = true
      $resources[key]        = value
      save_to_localstore
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

      pconfig.push(_get_config_model)
      pconfig_patch[key] = object

      pconfig.push(pconfig_patch.get)
      pconfig.push(_get_config_model)

      _set_config_model(pconfig.get)
    end

    # deletes the entry of key in the config part
    def delete_config_part(key)
      pconfig = Confstack::Confstack.new(false) # what we get from editor
      pconfig.push(_get_config_model)
      pconfig[key] = Confstack::DeleteMe
      _set_config_model(pconfig.get)
    end

    # returns the value of key in in config part
    def get_config_part_value(key)
      pconfig = Confstack::Confstack.new(false)
      pconfig.push(_get_config_model)
      result = pconfig[key]
      result
    end

    def get_lyrics
      retval = get_lyrics_raw
      if retval.count > 0
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
      $log.clear_errors # to rais error for multiple lyrics

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
      @handle_from_lyrics = false
      %x{#{@lyrics_editor}.getSession().setValue(#{get_lyrics});}
      @handle_from_lyrics = true

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


    def restore_from_localstore
      abctext = Native(`localStorage.getItem('zn_abc')`)
      _set_abc_to_editor(abctext) if abctext

      configjson = Native(`localStorage.getItem('zn_config')`) || {}
      _set_config_json(configjson) if configjson

      resources = Native(`localStorage.getItem('zn_resources')`)
      _set_resources_json(resources) if resources
      @dirty = {}
    end

    def save_to_localstore(dirty = nil)
      @dirty[dirty] = true if dirty
      `localStorage.setItem('zn_abc', #{_get_abc_from_editor})` if @dirty['zn_abc'] == true
      `localStorage.setItem('zn_config', #{_get_config_json})` if @dirty['zn_config'] == true
      `localStorage.setItem('zn_resources', #{_get_resources_json})` if @dirty['zn_resources'] == true
      @dirty = {}
    end

    #####################################################################################
    #private

    # this method splits the parts out of the given text
    def _split_parts(fulltext)

      _clean_models

      fulltext.split(@config_separator).each_with_index do |part, i|
        if i == 0
          _set_abc_to_editor(part)
        elsif part.start_with? ".config"
          _set_config_json(part.split(".config").last)
        elsif part.start_with? ".resources"
          _set_resources_json(part.split(".resources").last)
        else
          $log.error(I18n.t("unsupported section found in abc file: ") + part[0 .. 10])
        end
      end
    end

    def _set_abc_to_editor(abctext)
      @inhibit_callbacks = true
      %x{self.editor.getSession().setValue(#{abctext});}
      @inhibit_callbacks = false
    end

    def _get_abc_from_editor
      %x{self.editor.getSession().getValue()}
    end

    def _set_config_json(json)
      _set_config_model(JSON.parse(json))
    end

    def _get_config_json
      options = $conf[:neatjson]
      result  = $log.benchmark("neat_json", __LINE__, __FILE__) { JSON.neat_generate(_get_config_model, options) }
      result
    end

    def _get_config_model
      @config_models['config']
    end

    def _set_config_model(object)
      @dirty['zn_config']      = true
      @config_models['config'] = object
      save_to_localstore
    end

    def _set_resources_json(json)
      @dirty['zn_resources'] = true
      $resources             = JSON.parse(json)
      save_to_localstore
    end

    def _get_resources_json
      result = JSON.neat_generate($resources, $conf[:neatjson])
      result
    end

    def _has_resources?
      not $resources.empty?
    end

    def _clean_models
      $resources     = {}
      @config_models = {}
      @dirty         = {}
    end
  end

end