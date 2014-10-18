module ABCJS
  module Write
    class Printer

      def initialize(div, printerparams={})
        # setup the tune previewer
        @parent = Native(Element.find("##{div}"))

        # todo: someone is setting the width of the surrounding div (abwrite.js line 520)
        # this inverts the setting of abcjs
        # todo: approach does not work on Firefos
        @parent.css(:width, printerparams[:staffwidth]+50)  # 50 found out experimental

        @parent.find('svg').remove()
        paper =  Raphael::Paper.new(div, printerparams[:staffwidth], 900) # don't know why it is 700 width #Raphael(this.div, 1100, 700);
                                                    # note that this value is overridden by printerparam staffwidth
                                                    # which has a default of 700
        @paper = paper.raw
        pp = printerparams.to_n
        @printer = `new ABCJS.write.Printer(self.paper, pp)`; # Todo handle printerparams
      end

      #
      # Add an selection handler ... note that ABCJS.write acts upon a listener object where it calls
      # highlight(abcelem)
      #
      # @param block [type] [description]
      #
      # @return [type] [description
      def on_select(&block)
        %x{
            self.printer.addSelectListener(
              {// anonymous object!
               highlight: function(abcelem){
                 block.apply(null , [abcelem]);
                }
              }
            )
          }
      end

      def range_highlight(from, to)
        %x{
        self.printer.rangeHighlight(from, to);
        }
        nil
      end

      def range_highlight_more(from, to)
        %x{
        self.printer.rangeHighlightMore(from, to);
        }
        nil
      end

      def range_unhighlight_more(from, to)
        %x{
        self.printer.rangeUnhighlightMore(from, to);
        }
        nil
      end


      def draw(abc_code)
        %x{

        var book = new ABCJS.TuneBook(abc_code);
        var parser = new ABCJS.parse.Parse();
        parser.parse(abc_code);
        var tune = parser.getTune();


        // memoize the some container properties
        // note that printABC changes the width of the surrounding div :-(
        var top = self.parent.scrollTop();
        var width = self.parent.width();

        self.paper.clear();
        self.printer.printABC(tune)

        // reset the aforehead mentioned container poperties
        self.parent.scrollTop(top);
        self.parent.width(width);
        }
      end
    end
  end
end