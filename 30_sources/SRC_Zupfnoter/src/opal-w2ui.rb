module W2ui

  class Popupform
    def initialize(theForm)
      @theForm = theForm.to_n
      %x{
         if (!w2ui[#{@theForm}.name]) {
           $().w2form(#{@theForm});
         }
      }
    end

    def open2()
      %x{openPopup(#{@the_form})}
      nil
    end

    def open()
      %x{
      w2popup.open( {
          title: #{@theForm}.text,
          body: '<div id="form" style="width: 100%; height: 100%;"></div>',
          style: 'padding: 15px 0px 0px 0px',
          width: 500,
          height: 300,
          showMax: true,
          onToggle: function (event) {
            $(w2ui[#{@theForm}.name].box).hide();
            event.onComplete = function () {
              $(w2ui[#{@theForm}.name].box).show();
              w2ui[#{@theForm}.name].resize();
            }
          },
          onOpen: function (event) {

            event.onComplete = function () {

              // specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler, which would make this code execute too early and hence not deliver.
              $('#w2ui-popup #form').w2render(#{@theForm}.name);
            }
          }
      })
     }
      nil
    end

  end
end