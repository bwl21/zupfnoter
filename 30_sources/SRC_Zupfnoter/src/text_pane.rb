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

        editor.setTheme("ace/theme/chrome");
        editor.getSession().setMode("ace/mode/abc");

        editor.setTheme("ace/theme/xcode");

        editor.setOptions({
          highlightActiveLine: true,
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: false        });
      }
      @editor = `editor`
      @range = `ace.require('ace/range').Range`
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
        clear_markers  #todo:replace this by a routine to update markers if available https://github.com/ajaxorg/cloud9/blob/master/plugins-client/ext.language/marker.js#L137
        block.call(e)
      }
    end

    #
    # Install a handler for "selectionChange" event
    # @param block [Lambda] Procedure to be executed
    #
    # @return [type] [description]
    def on_selection_change(&block)
      Native(Native(@editor)[:selection]).on(:changeSelection) do |e|
        block.call(e)
      end
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
      $log.debug("set editor selection to #{selection_start}, #{selection_end} (#{__FILE__} #{__LINE__}) ")

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
      `self.editor.getSession().setValue(text)`
    end

    #

    # @param [Array] annotations  array of {row: 1, text: "", type: "error" | "warning" | "info"}
    #                aguments defined by ace
    def set_annotations(annotations)
      annotations.each { |annotation|
        annotation[:row] = annotation[:row] -1  # annotations count on row 0
      }
      set_markers(annotations)
      %x{#{@editor}.getSession().setAnnotations(#{annotations.to_n})}
    end


    # here I started routines to maintain markers
    # maybe it is better to go back to https://github.com/ajaxorg/cloud9/blob/master/plugins-client/ext.language/marker.js#L137
    # for the time bi

    def set_markers(annotations)
      annotations.each do |annotation|
        add_marker(annotation)
      end
    end

    def add_marker(annotation, to = nil)
      marker_end = to || {row: annotation[:row], col: annotation[:col]} # this is for eas of maintainability
      @markers << {
          from: [annotation[:row], annotation[:col]],
          to: [marker_end[:row], marker_end[:col]],
          id: %x{#{@editor}.getSession().addMarker(new #{@range}(#{annotation[:row]}, #{annotation[:col] - 1}, #{marker_end[:row]}, #{marker_end[:col]}), "marked", "line", true)}
      }
    end

    def clear_markers
      @markers.each do |marker|
        %x{#{@editor}.session.removeMarker(#{marker[:id]})}
      end
      @markers.clear
    end

  end

end