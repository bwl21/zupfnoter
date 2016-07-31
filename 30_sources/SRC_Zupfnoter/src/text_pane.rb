module Harpnotes

  class TextPane
    attr_accessor :editor

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

    #@param selection_start [Numeric] Start position

    #
    # Select by position (in opposite to row/column pairs)
    # @param selection_start [Numeric] Begin of the intended selection
    # @param selection_end [Numeric] End of intended selection
    #
    # @return [type] [description]
    def select_range_by_position(selection_start, selection_end)
      #$log.debug("set editor selection to #{selection_start}, #{selection_end} (#{__FILE__} #{__LINE__}) ")

      %x{
        doc = self.editor.selection.doc
        startrange = doc.indexToPosition(selection_start);
        endrange = doc.indexToPosition(selection_end);
        range = new Range(startrange.row, startrange.column, endrange.row, endrange.column);
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


    def resize
      `#{@editor}.resize()`
    end


    def set_config_part(object)
      the_selection = get_selection_positions
      options       = {wrap:          object['wrap']||$conf['wrap'], aligned: true, after_comma: 1, after_colon_1: 1, after_colon_n: 1, before_colon_n: 1, sort: true,
                       explicit_sort: [[:produce, :annotations, :extract,
                                        :title, :voices, :flowlines, :subflowlines, :synchlines, :jumplines, :repeatsigns, :layoutlines, :countnotes, :legend, :notes, :lyrics, :nonflowrest, :tuplet, :layout,
                                        :annotation, :partname, :variantend, :countnote, :stringnames, # sort within notebound
                                        "0", "1", "2", "3", "4", "5", "6", :verses, :pos, :vpos, :text, :style, # extracts
                                        :cp1, :cp2, :shape
                                       ],
                                       []],
      }

      configjson = JSON.neat_generate(object, options)

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

    def patch_config_part(key, object)
      pconfig     = Confstack::Confstack.new(false)
      config_part = get_config_part
      begin
        config = %x{json_parse(#{config_part})}
        config = JSON.parse(config_part)
        pconfig.push(config)
        pconfig[key] = object
        set_config_part(pconfig.get)
      rescue Object => error
        line_col = get_config_position(error.last)
        $log.error("#{error.first} at #{line_col}", line_col)
        set_annotations($log.annotations)
      end
    end


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

  end

end