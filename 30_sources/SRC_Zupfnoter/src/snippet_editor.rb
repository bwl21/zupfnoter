# This class implements the "Snippet - Editor"
# the various kinds o snipets are represented
# by subclasses of Form, and selected by Form.form_factory based on the thoken.

class SnippetEditor
  class Form
    attr_accessor :on_change


    def initialize
      @validate = nil;
    end

    # @param [String] token - the ace syntax token to be edited.
    # @param [Lambda] saveblock - the process to save the edit result in the editor
    def self.form_factory(token, saveblock)
      a={'jumptarget'    => Jumptarget,
         'draggable'     => Draggable,
         'goto'          => Goto,
         'annotation'    => Annotation,
         'annotationref' => AnnotationRef,
         'beforeBar'     => Goto,
         'beforeNote'    => BeforeNote,
         'shifter'       => Shifter
      }

      result = a[token.split('.')[2]].new
      result.on_save(saveblock)
      result
    end


    # @param [Lambda] saveblock the lambda to handle the result
    def on_save(saveblock)
      @saveblock = saveblock
    end


    # transform the string represntation to the forms record
    # @param [String] string transform the string representation to the forms record.
    def to_record(string)
      @fields = [
          {field: 'value', type: 'text', required: true}
      ]
      @record = {value: string}
    end

    # transform the result record to string
    # @param [Object] record to be converted to string
    def to_string(record)
      wrapup_string(record[:value])
    end

    def wrapup_string(string)
      if @is_new
        %Q{ #{string} }
      else
        string
      end
    end

    # load the form with the string
    # note that we use to_record, to_fields, to_string
    # to be able to specify snipper specifics in the subldasses
    def to_form(string)
      to_record(string)
      @theForm = {
          name:       "editsnippet",
          text:       I18n.t(self.class.name.split("::").last),
          fields:     @fields,
          record:     @record,
          onChange:   lambda { |event|
            a = lambda { |event|
              puts 'change'
            }
            `event.onComplete=#{a}`
          },
          onValidate: @validate,
          actions:    {
              Cancel: lambda { `w2popup.close()` },
              Save:   lambda do
                if `this.validate()`.empty?
                  @saveblock.call(to_string(Hash.new(`this.record`)))
                  `w2popup.close()`
                else
                  $log.error(I18n.t('There is an error in the data you have entered'))
                end
              end
          }
      }.to_n
    end

    def refresh_form
      `w2ui[#{@theForm}.name].refresh()`
    end

    # show the form
    # todo: maybe this is not that elegant, extract this to opal-w2ui
    def show_form
      %x{
         if (w2ui[#{@theForm}.name]) {
           w2ui[#{@theForm}.name].destroy()
         }
        $().w2form(#{@theForm});

        w2popup.open( {
            title: #{@theForm}.text,
            body: '<div id="form" style="width: 100%; height: 100%;"></div>',
            style: 'padding: 15px 0px 0px 0px',
            width: 800,
            height: 300,
            showMax: true,
            modal:true,
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
    end
  end

  class Goto < Form
    def to_string(record)
      unless record[:second] === ''
        wrapup_string(%Q{"^@#{record[:target]}@#{record[:first]},#{record[:second]},#{record[:third]}"})
      else
        wrapup_string(%Q{"^@#{record[:target]}@#{record[:first]}"})
      end
    end

    def to_record(line)
      if line
        level = line.match(/\"\^@([^\@]*)@(\-?\d*)(,(\-?\d*)?,?(\-?\d*)?)?\"$/)
        if level
          target   = level[1]
          distance = [2, 4, 5].map { |i| level[i] ? level[i].to_i : nil }.compact
        else
          level    = [1] # just to fill all fields
          target   = "ERROR"
          distance = [0]
        end
      else
        level    = [1, 2, 3] # just to fill all fields
        @is_new  = true
        target   = ""
        distance = [3, -3, -3]
      end

      @fields = [
          {field: :target, type: 'text', required: false, html: {caption: I18n.t("jumptarget"), text: I18n.t('target to jump to')}},
          {field: :first, type: 'int', required: true, html: {caption: I18n.t("in distance"), text: I18n.t('Distance for in-line from last note before variation')}},
          {field: :second, type: 'int', required: false, html: {caption: I18n.t("out distance"), text: I18n.t('Distance for out-line from firat note after variation')}},
          {field: :third, type: 'int', required: false, html: {caption: I18n.t("followup distance"), text: I18n.t('Distance for followup-line from first note after variation')}},
      ]

      @validate = lambda do |event|
        `#{event}.errors.push({ field: this.get('second'), error: #{I18n.t('Please provide also value for out-line')} });` if `this.record['second'] === ''` and not `this.record['third'] === ''`
        `#{event}.errors.push({ field: this.get('third'), error: #{I18n.t('Please provide also followup-line')} });` if `this.record['third'] === ''` and not `this.record['second'] === ''`
      end

      if level[3]
        @record = {target: target, first: distance[0].to_i, second: distance[1].to_i, third: distance[2].to_i}
      else
        @record = {target: target, first: distance[0].to_i, second: nil, third: nil}
      end
    end
  end

  class Jumptarget < Form
    def to_string(record)
      wrapup_string(%Q{"^:#{record[:target]}"})
    end

    def to_record(line)
      if line
        match = line.match(/^\"\^(\:)([^\@]+)"$/)
        if match
          target = match[2]
        else
          target = "ERROR"
        end
      else
        @is_new = true
        target  = ""
      end

      @fields = [
          {field: :target, type: 'text', required: true, html: {caption: I18n.t("Name of target"), text: I18n.t('the name for this target')}}
      ]
      @record = {target: target}
    end
  end

  class Shifter < Form
    def to_string(record)
      result = @lookup.invert()[record[:target][:id]]
      wrapup_string(%Q{"^#{result}"})
    end

    def to_record(line)
      @lookup = {'<' => 'left', '>' => 'right', '?' => 'choose'}
      if line
        match = line.match(/^\"\^([<>])\"$/)
        if match
          target = @lookup[match[1]]
        else
          target = "ERROR"
        end
      else
        @is_new = true
        target  = ""
      end

      @fields = [
          {field: :target, type: 'list', options: {items: @lookup.values}, required: true, html: {caption: I18n.t("direction"), text: I18n.t('direction to shift the note')}}
      ]
      @record = {target: target}
    end
  end

  class Annotation < Form
    def to_string(record)
      unless record[:X] === ''
        wrapup_string(%Q{"^!#{record[:text]}@#{record[:X]},#{record[:Y]}"})
      else
        wrapup_string(%Q{"^!#{record[:text]}"})
      end
    end

    def to_record(line)
      if line
        match = line.match(/^\"\^(\!)([^\@]+)?(\@(\-?[0-9\.]+),(\-?[0-9\.]+))?\"$/)
        if match
          text  = match[2]
          pos_x = match[4] if match[4]
          pos_y = match[5] if match[5]
        else
          text  = "ERROR"
          pos_x = nil
          pos_y = nil
        end
      else
        @is_new = true
        text    = ""
        pos_x   = nil
        pos_y   = nil
      end

      @fields = [
          {field: :text, type: 'text', required: false, html: {caption: I18n.t("text"), text: I18n.t('Text of annotation')}},
          {field: :X, type: 'int', required: false, html: {caption: I18n.t("X-position"), text: I18n.t('horizontal position')}},
          {field: :Y, type: 'int', required: false, html: {caption: I18n.t("Y-position"), text: I18n.t('vertical position (top->down)')}},
      ]

      @validate = lambda do |event|
        `#{event}.errors.push({ field: this.get('X'), error: #{I18n.t('Please provide also X')} });` if `this.record['X'] === ''` and not `this.record['Y'] === ''`
        `#{event}.errors.push({ field: this.get('Y'), error: #{I18n.t('Please provide also Y')} });` if `this.record['Y'] === ''` and not `this.record['X'] === ''`
      end

      @record = {text: text, X: pos_x, Y: pos_y}
    end
  end

  class AnnotationRef < Form
    def to_string(record)
      unless record[:X] === ''
        wrapup_string(%Q{"^##{record[:text]}@#{record[:X]},#{record[:Y]}"})
      else
        wrapup_string(%Q{"^##{record[:text]}"})
      end
    end

    def to_record(line)
      if line
        match = line.match(/^\"\^(\#)([^\@]+)?(\@(\-?[0-9\.]+),(\-?[0-9\.]+))?\"$/)
        if match
          text  = match[2]
          pos_x = match[4] if match[4]
          pos_y = match[5] if match[5]
        else
          text  = "ERROR"
          pos_x = nil
          pos_y = nil
        end
      else
        @is_new = true
        text    = ""
        pos_x   = nil
        pos_y   = nil
      end

      @validate = lambda do |event|
        `#{event}.errors.push({ field: this.get('X'), error: #{I18n.t('Please provide also X')} });` if `this.record['X'] === ''` and not `this.record['Y'] === ''`
        `#{event}.errors.push({ field: this.get('Y'), error: #{I18n.t('Please provide also Y')} });` if `this.record['Y'] === ''` and not `this.record['X'] === ''`
      end

      @fields = [
          {field: :text, type: 'string', required: true, html: {caption: I18n.t("Name of annotation"), text: I18n.t('Name of annotation')}},
          {field: :X, type: 'int', required: false, html: {caption: I18n.t("X-position"), text: I18n.t('horizontal position')}},
          {field: :Y, type: 'int', required: false, html: {caption: I18n.t("Y-position"), text: I18n.t('vertical position (top->down)')}},
      ]
      @record = {text: text, X: pos_x, Y: pos_y}
    end
  end

  class Draggable < Form
    def to_string(record)
      wrapup_string(%Q{[r: #{record[:target]}]})
    end

    def to_record(line)
      if line
        match = line.match(/^\[r:\s*([a-zA-Z_0-9)]+)\]$/)
        if match
          target = match[1]
        else
          target = "ERROR"
        end
      else
        @is_new = true
        target  = ""
      end

      @fields = [
          {field: :target, type: 'text', required: true, html: {caption: I18n.t("Name of draggable"), text: I18n.t('the name for the dreaggables of this note')}}
      ]
      @record = {target: target}
    end
  end

  class BeforeNote < Form
    def to_record(string)
      super(string)
      @fields = [
          {field:   "selector", type: :list,
           options: {items: [:set_draggable, :anntoation, :annotationref, :jumptarget]}}
      ]
    end
  end


  def setup(token, content, &block)
    @form = Form.form_factory(token, block)
    @form.to_form(content)
    @form.show_form
  end
end