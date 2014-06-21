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
        var editor = ace.edit(div);
        // editor.setTheme("ace/theme/tomorrow_night");
      }
      @editor = `editor`
    end



    #
    # Install a handler for "change" event
    # @param block [Lambda] The procedure to be executed wheneve the doucument is changed.
    #
    # @return [type] [description]
    def on_change(&block)
      # changes in the editor
      Native(Native(@editor).getSession).on(:change){|e|
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
        self.editor.selection.setSelectionRange(myrange, false);
      }
    end


    #
    # Get the current text of the editor
    #
    # @return [String] The content of the text field.
    def get_text
      `self.editor.getSession().getValue()`
    end

    def set_text(text)
      `self.editor.getSession().setValue(text)`
    end

  end

end
