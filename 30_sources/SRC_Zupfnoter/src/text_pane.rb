module Harpnotes


  class TextPane
    attr_accessor :editor, :controller, :autofold



    # this is an undo manger used for the configuration only
    # it applies the momento pattern
    # it is used within TextPane only
    #
    # we do not have a class for momento it is a simple hash {title: "string", state: {}}
    #
    class UndoManager

      # the constructor
      def initialize
        reset
      end

      # reset the undo manager
      # used when a new music is loaded
      def reset
        @undostack    = []
        @redostack    = []
        @currentstate = {title: "init state", state: {}}
      end

      # register the execution of a command
      #
      # @param [Object] newstate the new state of the confi
      # @param [String] title the title to be shown in the history
      # @return [Object] the momento of the new state
      def do(newstate, title)
        @undostack.push(@currentstate)
        @redostack    = []
        @currentstate = {title: title, state: newstate}
        @currentstate
      end

      # perform undo
      #
      # @return [Object] the momento of the new state or nil if there is no more undo
      def undo
        if @undostack[1]  # prevent from undogin initialization
          momento = @undostack.pop
          @redostack.push(@currentstate)
          @currentstate = momento
        end
      end

      # perform redo
      #
      # @return [Object] the momento of the new state or nil if there is no more redo
      def redo
        unless @redostack.empty?
          momento = @redostack.pop
          @undostack.push(@currentstate)
          @currentstate = momento
        end
      end

      # return the undo history as an array of momentos
      def undo_history
        [@undostack, @currentstate].flatten.reverse
      end

      # return the redo history as an array of momentos
      def redo_history
        [@redostack].flatten.reverse
      end
    end


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

        // clear shortcuts occupied by Zupfnoter
        editor.commands.bindKey("Cmd-L", null);
        editor.commands.bindKey("Ctrl-L", null);
        editor.commands.bindKey("Ctrl-P", null);
        editor.commands.bindKey("Ctrl-K", null);
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
      @on_change         = lambda {}
      @config_separator  = '%%%%zupfnoter'
      @dirty             = {} # hash to maintain dirty flag for zn_abc, zn_config, zn_resources
      @config_undo       = UndoManager.new

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
      @on_change = block
      # changes in the editor
      Native(Native(@editor).getSession).on(:change) { |e|
        save_to_localstorage('zn_abc')
        clear_markers #todo:replace this by a routine to update markers if available https://github.com/ajaxorg/cloud9/blob/master/plugins-client/ext.language/marker.js#L137
        @on_change.call(e) #unless @inhibit_callbacks
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
      %x{#{@editor}.selection.clearSelection()}
      niil
    end


    # this returns an array of notes in a chord
    # it is used to implement edits of chords sucht as first, last, second, secondLast, swapFirstWithLast, innerpart, reverse
    # if there is no proper result, it returns the matching sting
    def _get_unison_edit_replacement(chordmatch, noteregex, mode)

      notes  = chordmatch[1].scan(Regexp.new(noteregex))
      result = "[" + chordmatch[1] + "]"
      case mode
      when "replaceByFirst"
        result = notes[0]
      when "replaceByLast"
        result = notes[-1]
      when "replaceBySecond"
        result = notes[1] if notes[1]
      when "replaceBySecondLast"
        result = notes[-2] if notes[1]
      when "replaceByInnerPart"
        result = "[" + notes[1 .. -2].join + "]" if notes[2]
      when "swapFirstWithLast"
        result = "[" + [notes[-1], notes[1 .. -2], notes[0]].flatten.join + "]" if notes[1]
      when "revert"
        result = "[" + notes.reverse.join + "]"
      else

      end

      result
    end

    def edit_unisons(mode)
      selectionrange = %x{#{@editor}.selection.getRange()};
      oldvalue = `#{@editor}.getSession().doc.getTextRange(#{editor}.selection.getRange())`
      if oldvalue.empty?
        raise I18n.t("Selection is empty")
      else
        note = %Q{[\\^\\_=]?[a-zA-Z][',]*}
        #regexp = /\[([\^\_=]?[a-zA-Z][',]*)\s*([\^\_=]?[a-zA-Z][',]*)\s*(([\^\_=]?[a-zA-Z][',]*\s*)*)([\^\_=]?[a-zA-Z][',]*)+\]/
        regexp = Regexp.new(%Q{\\[(#{note})\\s*(#{note})?\\s*((#{note}\\s*)*)(#{note})?\\]})
        regexp = Regexp.new(%Q{\\[\\s*((#{note}\\s*)+)\\]})

        #regexp = /\[([\^\_=]?[a-zA-Z][',]*)\s*(([\^\_=]?[a-zA-Z][',]*\s*)*)([\^\_=]?[a-zA-Z][',]*)+\]/
        newvalue = oldvalue
        newvalue = oldvalue.gsub(regexp) { |i| _get_unison_edit_replacement(Regexp.last_match, note, mode)  } #if mode == "replaceByFirst"
        %x{#{editor}.session.replace(#{selectionrange}, #{newvalue});}
      end
      nil
    end

    #
    # Get the border of the current selection
    #
    # Note that it returns [row, col] for start and end
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

    # Get all selections, even if they are not contiguous
    #
    # @retun [array of Array of numbers] it is the index in the editor (not row, col.)
    def get_selection_ranges
      %x{
        var doc = self.editor.selection.doc;
        var ranges = self.editor.selection.getAllRanges();
        var result = ranges.map(function(therange){
           var range_start = doc.positionToIndex(therange.start, 0);
           var range_end = doc.positionToIndex(therange.end, 0);
           return([range_start, range_end])
        })
      }
      `result`
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

    def set_focus
      `#{@editor}.focus()`
    end

    #
    # Select by position (in opposite to row/column pairs)
    # @param requested_selection_start [Numeric] Begin of the intended selection
    # @param requested_selection_end [Numeric] End of intended selection
    # @param [boolean] expand_selection - expand the selection if true
    #
    # @return [type] [description]
    def select_add_range_by_position(requested_selection_start, requested_selection_end, expand_selection = false)
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
        #{@editor}.selection.addRange(range, false);
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
      therange = new #{@range}(#{startpos}[0], #{startpos}[1], #{endpos}[0], #{endpos}[1]);
      #{editor}.getSession().replace(therange, #{text});
      }
    end

    # replace a text in the editor
    # this is to maintain undo stack
    # @param oldtext the text to be removed
    # œparam newtext  the new tet to be entered
    def replace_text(oldtext, newtext)
      %x{self.editor.replace(#{newtext}, {needle: #{oldtext}}) }
      nil
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
      nil
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

    # get the config model
    # return arry of [config_model, status]
    # status indicates if we got a model from editor
    # todo: cleant this up
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
    def set_config_model(object, desc = "no desc", handleundo = true)
      @dirty['zn_config'] = true # used to decide if we save to localstore
      @config_undo.do(object, desc) if handleundo == true
      _set_config_model(object)
    end

    # this applies the object to the config
    # values not in object are not changed in config
    # @param [string] desc bascially used for undo stack report
    def patch_config_part(key, object, desc = key)
      pconfig       = Confstack::Confstack.new(false) # what we get from editor
      pconfig_patch = Confstack::Confstack.new(false) # how we patch the editor
      pconfig.push(_get_config_model)

      pconfig_patch[key] = object
      pconfig.push(pconfig_patch.get)
      set_config_model(pconfig.get, desc, true)
    end

    def copy_config_part_to_extract(key, targetid, desc = key)
      pconfig       = Confstack::Confstack.new(false) # what we get from editor
      pconfig_patch = Confstack::Confstack.new(false) # how we patch the editor
      pconfig.push(_get_config_model)

      key0 = key.gsub(/^extract\.\d+/, "extract.#{targetid}")
      pconfig_patch[key0] = pconfig.get(key)
      pconfig.push(pconfig_patch.get)
      set_config_model(pconfig.get, desc, true)
    end

    def neat_config_part
      _set_config_json(_get_config_json, "neat config_part", false) # _get_config_json performs the neat
    end

    # @param [String] key the name of the resource
    # @param [Object] value the value of the resource as object
    def patch_resources(key, value)
      @dirty['zn_resources'] = true
      $resources[key]        = value
      save_to_localstorage('zn_resources')
      @on_change.call(nil)
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

      set_config_model(pconfig.get, "extend #{key}", true)
    end

    # deletes the entry of key in the config part
    def delete_config_part(key)
      if key.start_with? '$resources'
        $resources.delete(key.split(".").last)
      else
        pconfig = Confstack::Confstack.new(false) # what we get from editor
        # need to deep dup of current config model since delete mutes the model, as a side effect it changes current state.
        # as consequence, undo does not work properly
        pconfig.push(_get_config_model.deep_dup)
        pconfig[key] = Confstack::DeleteMe   # this is muting operation!
        set_config_model(pconfig.get, "delete #{key}", true)
      end
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
        newtext = %x{#{@lyrics_editor}.getSession().getValue()}
        newtext = " " if newtext.empty?
        newtext = newtext.split("\n").map { |l| "W:#{l}" }.join("\n")
        newtext = %Q{\n#{newtext}\n}
        replace_text(oldtext, newtext)
      end
      nil
    end


    # this restores editor session from localstorage
    #
    # note we have all in one entry from 'abc_data'
    # this is outdated and migrated to
    # the new approach with 'zn_abc', 'zn_config', 'zn_resources'
    #
    def restore_from_localstorage
      abc = Native(`localStorage.getItem('abc_data')`)
      unless abc.nil?
        `localStorage.removeItem('abc_data')` # we convert localstorage so store abc, config and resources as three items
        set_text(abc) unless abc.nil?
      else
        abctext = Native(`localStorage.getItem('zn_abc')`)
        _set_abc_to_editor(abctext) if abctext

        configjson = Native(`localStorage.getItem('zn_config')`) || {}
        @config_undo.reset
        _set_config_json(configjson, "from localstore zn_config", true) if configjson

        resources = Native(`localStorage.getItem('zn_resources')`)
        _set_resources_json(resources) if resources
      end

      @dirty = {}
    end


    # @param [String] dirty_name  # name of localstore entry which shall be set to dirty and thus forcefully stored
    def save_to_localstorage(dirty_name = nil)
      @dirty[dirty_name] = true if dirty_name
      `localStorage.setItem('zn_abc', #{_get_abc_from_editor})` if @dirty['zn_abc'] == true
      `localStorage.setItem('zn_config', #{_get_config_json})` if @dirty['zn_config'] == true
      `localStorage.setItem('zn_resources', #{_get_resources_json})` if @dirty['zn_resources'] == true
      @dirty = {}
    end

    def clean_localstorage
      `localStorage.removeItem('zn_abc')`
      `localStorage.removeItem('zn_config')`
      `localStorage.removeItem('zn_resources')`
      nil
    end


    def get_config_from_text(fulltext)
      configjson = fulltext.split(@config_separator).select{|i| i.start_with? ".config"}.first&.gsub(".config", "")
      configjson ? JSON.parse(configjson) : nil
    end

    #####################################################################################
    #private

    # this method splits the parts out of the given text
    def   _split_parts(fulltext)

      _clean_models
      clean_localstorage

      fulltext.split(@config_separator).each_with_index do |part, i|
        if i == 0
          _set_abc_to_editor(part)
        elsif part.start_with? ".config"
          @config_undo.reset
          _set_config_json(part.split(".config").last, "from loaded abc", true)
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
      save_to_localstorage('zn_abc')
    end

    def _get_abc_from_editor
      result = ""
      %x{#{result} = self.editor.getSession().getValue()}
      result
    end

    def _set_config_json(json, desc = "no desc", handleundo = true)
      set_config_model(JSON.parse(json), desc, handleundo)
    end

    def _get_config_json
      options = $conf[:neatjson]
      result  = $log.benchmark("neat_json", __LINE__, __FILE__) { JSON.neat_generate(_get_config_model, options) }
      result
    end

    def _get_config_model
      @config_models['config'] || {}
    end

    def _set_config_model(object)
      @config_models['config'] = object
      save_to_localstorage('zn_config')
      @on_change.call(nil) # fire dirty flag in contoller
    end

    def undo_config
      momento = @config_undo.undo
      if momento
        $log.info("undo: #{momento[:title]}: #{momento[:state].dig('extract', '0', 'legend', 'pos')}")
        set_config_model(momento[:state], momento[:title], false) if momento
      end
    end

    def redo_config
      momento = @config_undo.redo
      if momento
        $log.info("redo: #{momento[:title]}: #{momento[:state].dig('extract', '0', 'legend', 'pos')}")
        set_config_model(momento[:state], momento[:title], false) if momento
      end
    end

    def history_config
      {undo: @config_undo.undo_history, redo: @config_undo.redo_history}
    end


    def _set_resources_json(json)
      $resources = JSON.parse(json)
      save_to_localstorage('zn_resources')
      @on_change.call(nil) # fire dirty flag in contoller
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