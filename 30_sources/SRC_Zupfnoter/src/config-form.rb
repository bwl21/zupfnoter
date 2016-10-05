# This class implements the "Snippet - Editor"
# the various kinds o snipets are represented
# by subclasses of Form, and selected by Form.form_factory based on the thoken.

class SnippetEditor

  # This class handles the various types of snippets
  # It is repsonsible for selecting form binding the fields
  #
  class Form
    attr_accessor :on_change

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
          text:       self.class.name,
          fields:     @fields,
          record:     @record,
          onChange:   lambda { |event|
            a = lambda { |event|
            }
            `event.onComplete=#{a}`
          },
          onValidate: lambda { alert("validate"); nil },
          actions:    {
              reset: lambda { `w2popup.close()` },
              save:  lambda do
                @saveblock.call(to_string(Native::Hash.new(`this.record`)))
                `w2popup.close()`
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
            width: 600,
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
    end
  end

  class Goto < Form
    def to_string(record)
      if record[:second]
        wrapup_string(%Q{"^@#{record[:target]}@#{record[:first]},#{record[:second]},#{record[:third]}"})
      else
        wrapup_string(%Q{"^@#{record[:target]}@#{record[:first]}"})
      end
    end

    def to_record(line)
      `debugger`
      if line
        level = line.match(/\"\^@([^\@]*)@(\-?\d*)(,(\-?\d*),(\-?\d*))?\"$/)
        if level
          target   = level[1]
          distance = [2, 4, 5].map { |i| level[i] ? level[i].to_i : nil }.compact
        else
          level    = [1, 2, 3] # just to fill all fields
          target   = "ERROR"
          distance = [0, 0, 0]
        end
      else
        level    = [1, 2, 3] # just to fill all fields
        @is_new = true
        target   = ""
        distance = [3, -3, -3]
      end

      @fields = [
          {field: :target, type: 'text', required: false, html: {caption: I18n.t("jumptarget"), text: I18n.t('target to jump to')}},
          {field: :first, type: 'int', required: true, html: {caption: I18n.t("in distance"), text: I18n.t('Distance for first line from target')}},
          {field: :second, type: 'int', required: false, html: {caption: I18n.t("out distance"), text: I18n.t('Distance for second line from target')}},
          {field: :third, type: 'int', required: false, html: {caption: I18n.t("followup distance"), text: I18n.t('Distance for followup line from followup note')}},
      ]
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
        target = ""
      end

      @fields = [
          {field: :target, type: 'text', required: true, html: {caption: I18n.t("name of target"), text: I18n.t('the name for this target')}}
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
      @lookup = {'<' => 'left', '>' => 'right', '?' => 'choose' }
      if line
        match = line.match(/^\"\^([<>])\"$/)
        if match
          target = @lookup[match[1]]
        else
          target = "ERROR"
        end
      else
        @is_new = true
        target = ""
      end

      @fields = [
          {field: :target, type: 'list', options: {items: @lookup.values}, required: true, html: {caption: I18n.t("direction"), text: I18n.t('direction to shift the note')}}
      ]
      @record = {target: target}
    end
  end

  class Annotation < Form
    def to_string(record)
      if record[:X]
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
        text  = ""
        pos_x = nil
        pos_y = nil
      end

      @fields = [
          {field: :text, type: 'text', required: false, html: {caption: I18n.t("text"), text: I18n.t('Text of annotation')}},
          {field: :X, type: 'int', required: false, html: {caption: I18n.t("X-position"), text: I18n.t('horizontal position')}},
          {field: :Y, type: 'int', required: false, html: {caption: I18n.t("Y-position"), text: I18n.t('vertical position (top->down)')}},
      ]
      @record = {text: text, X: pos_x, Y: pos_y}
    end
  end

  class AnnotationRef < Form
    def to_string(record)
      if record[:X]
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
        text  = ""
        pos_x = nil
        pos_y = nil
      end

      @fields = [
          {field: :text, type: 'label', required: false, html: {caption: I18n.t("label"), text: I18n.t('Name of annotation')}},
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
        target = ""
      end

      @fields = [
          {field: :target, type: 'text', required: true, html: {caption: I18n.t("name of draggable"), text: I18n.t('the name for the dreaggables of theis note')}}
      ]
      @record = {target: target}
    end
  end

  class BeforeNote < Form
    def to_record(string)
      super(string)
      @fields = [
          {field:   "selector", type: :list,
           options: {items: [:draggable, :anntoation, :annotationref, :jumptarget]}}
      ]
    end
  end


  def setup(token, content, &block)
    @form = Form.form_factory(token, block)
    @form.to_form(content)
    @form.show_form
  end

end


class ConfstackEditor


# this class acts as helper for the configuration editor
# its main purpose is to provide a conf editor based type sytem
# Subclasses of ZnType represent the ConfHelper Types.
# assication between config entry and ConfHelper Types
# is defined by the lookuptable at the bottom of this class
# todo: Implement a proper schema to derive the types
#
# note, we have types o various levels
#
# * the config Value type as it is in the JSON part
# * the type for the UI-Framework
# * the type for middleware betwenn conf and UI-Framework. this is represented by ZnTypes

  class ConfHelper

    #s is the abstract ConfHelper Tpyp
    class ZnTypes
      def self.to_value(key, string)
        string
      end

      def self.to_string(key, value)
        value.to_s
      end

      def self.get_help(key)
        I18n.t(key)
      end

      def self.get_tooltip(key)
        I18n.t(key)
      end

      def self.to_neutral(key)
        nil
      end

      def self.to_template(key)
        # handle the case notes.x
        template = key.split('.')[-2] # templates are for "extract.x.<template>"
        a        = $conf.get("templates.#{template}") if template

        unless a
          help_key = key
          help_key = help_key.gsub(/^(extract\.)(\d+)(.*)$/) { "#{$1}0#{$3}" }
          a        = $conf.get(help_key)
        end

        a
      end

      def self.to_html(key)
        %Q{<input name="#{key}"" title = "#{key}"" type="string" maxlength="100" size="60"></input>}
      end

      def self.to_w2uifield(key)
        {field:    key,
         type:     'string',
         required: true,
         text:     I18n.t("#{key}.text"),
         tooltip:  I18n.t("#{key}.tooltip"),
         html:     {caption: I18n.t("#{key}.caption")}}
      end
    end

    class IntegerPairs < ZnTypes
      def self.to_value(key, string)
        string.split(",").map { |i| i.split('-').map { |i| i.to_i } }
      end

      def self.to_string(key, value)
        a = value.map { |v| %Q{#{v.first}-#{v.last}} }.join(", ")
      end

      def self.to_neutral(key)
        []
      end
    end

    class FloatPair < ZnTypes
      def self.to_value(key, string)
        string.split(",").map { |i| i.to_f }
      end

      def self.to_string(key, value)
        %Q{#{value.first}, #{value.last}}
      end

      def self.to_neutral(key)
        [0, 0]
      end
    end

    class Integer < ZnTypes
      def self.to_value(key, string)
        string.to_i
      end

      def self.to_string(key, value)
        value.to_s
      end

      def self.to_neutral(key)
        nil
      end
    end

    class Boolean < ZnTypes
      def self.to_value(key, string)
        r = string.to_s.eql?('true') ? true : false
        r
      end

      def self.to_string(key, value)
        value
      end

      def self.to_neutral(key)
        nil
      end

      def self.to_w2uifield(key)
        {field:    key,
         type:     'checkbox',
         options:  {items: [:true, :false]},
         required: true,
         text:     I18n.t("#{key}.text"),
         tooltip:  I18n.t("#{key}.tooltip"),
         html:     {caption: I18n.t("#{key}.caption")}}
      end

      def self.to_html(key)
        %Q{<input name="#{key}"" type="checkbox" class="w2ui-input" title = "#{key}" size="60">&nbsp;#{I18n.t(key)}</input>}
      end
    end

    class Float < ZnTypes
      def self.to_value(key, string)
        string.to_f
      end

      def self.to_string(key, value)
        value.to_s
      end

      def self.to_neutral(key)
        nil
      end
    end

    class OneLineString < ZnTypes
      def self.to_value(key, string)
        string
      end

      def self.to_string(key, value)
        value
      end

      def self.to_neutral(key)
        ""
      end
    end

    class MultiLineString < OneLineString
      def self.to_html(key)
        %Q{<textarea name="#{key}" title = "#{key}" cols="60"></textarea>}
      end
    end

    class IntegerList < ZnTypes
      def self.to_value(key, string)
        string.split(",").map { |i| i.to_i }
      end

      def self.to_string(key, value)
        value.map { |i| i.to_s }.join(", ")
      end

      def self.to_neutral(key)
        []
      end
    end

    class TupletShape < ZnTypes
      def self.to_value(key, string)
        string.split(",").map { |s| s.strip }
      end

      def self.to_string(key, value)
        value.join(', ')
      end

      def self.to_neutral(key)
        "c"
      end
    end


    class TextStyle < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="60"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: $conf['layout.FONT_STYLE_DEF'].keys},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html:        {caption: I18n.t("#{key}.caption")}}
      end
    end


    ## this is the 

    def initialize
      @typemap = {
          IntegerPairs    => ['synchlines'],
          FloatPair       => ['pos', 'spos', 'ELLIPSE_SIZE', 'REST_SIZE', 'cp1', 'cp2'],
          IntegerList     => ['voices', 'flowlines', 'subflowlines', 'jumplines', 'layoutlines', 'verses', 'hpos', 'vpos', :produce],
          Integer         => ['startpos'],
          OneLineString   => ['title'],
          MultiLineString => ['text'],
          Boolean         => ['limit_a3', 'autopos'],
          Float           => ['LINE_THIN', 'LINE_MEDIUM', 'LINE_THICK'],
          TupletShape     => ['shape'],
          TextStyle       => ['style']
      }.inject({}) { |r, (k, v)| v.each { |i| r[i] = k }; r }

      nil
    end

    def get_help(key)
      I18n.t(key)
    end

    def get_tooltip(key)
      I18n.t(key)
    end

    def to_string(key, value)
      _type(key).to_string(key, value) unless value.nil?
    end

    def to_html(key)
      _type(key).to_html(key)
    end

    def to_value(key, string)
      _type(key).to_value(key, string) unless string.nil?
    end

    def to_neutral(key)
      _type(key).to_neutral(key)
    end

    def to_template(key)
      _type(key).to_template(key)
    end

    def to_w2uifield(key)
      _type(key).to_w2uifield(key)
    end

    def to_type(key)
      _type(key)
    end

    def _type(key)
      lookupkey = key.split('.').last
      @typemap[lookupkey] || ZnTypes
    end
  end

  #
  #def initialize(title, editor, value_handler, refresh_handler)
  def initialize(editorparams)
    @title           = editorparams[:title]
    @editor          = editorparams[:editor]
    @refresh_handler = editorparams[:refresh_handler]

    value_handler = editorparams[:value_handler]

    $log.timestamp("initialize Form")

    value_handler_result = $log.benchmark("value handler") { value_handler.call }

    $log.benchmark("process value handler result") do
      @value                = Confstack.new(false)
      @effective_value      = Confstack.new(false)
      @default_value        = Confstack.new(false)
      @default_value.strict = false

      @value.push(value_handler_result[:current])
      @effective_value.push(value_handler_result[:effective])
      @default_value.push($log.benchmark('getvalues') { value_handler_result[:default] })
    end

    @form   = nil # Form object to be passed to w2ui
    @helper = ConfHelper.new # helper to convert input to model and vice vversa
    @record = {} # hash to prepare the record for the form

    @record = @value.keys.inject({}) { |r, k| r[k] = @helper.to_string(k, @value[k]); r }
    $log.timestamp("end initialize Form")
    nil
  end


  def show_form
    $log.timestamp("initialize Form")
    x=@form.to_n
    %x{
    if (w2ui[#{x}.name]){w2ui[#{x}.name].destroy()};
    $('#configtab').w2form(#{x});
    $('#configtab #form').w2render(#{x}.name);
    }
    @live_record = Native(`w2ui['configform'].record`)
    register_events
  end

  # This performs the push to the editor
  # it is done field by field
  # distinguish the cases
  # record     liverecord
  #   nil         nil         don't do anything
  #   nil         notnil      set the value
  #   no nil      nil         set to no effect value
  #   no nil     delete       actively delete the value from the editor
  # field had no value and does not provide one - don't do anything
  # filed
  def push_config_to_editor
    patchvalue = Confstack.new(false)
    @live_record.each do |k, v|
      value = Native(v)
      if @record[k].nil?
        patchvalue[k] = @helper.to_value(k, v) unless v.nil?
      else
        if value.nil?
          patchvalue[k] = @helper.to_value(k, nil) # this will produce the 'empty value'
        elsif value.is_a? String
          patchvalue[k] = @helper.to_value(k, value) unless (@record[k] == value) #or v.nil?
        elsif value.is_a? Boolean
          patchvalue[k] = @helper.to_value(k, value) unless (@record[k] == value) #or v.nil?
        else # return value is an object (e.g. selection list)
          value         = value[:id]
          patchvalue[k] = @helper.to_value(k, value)
        end
      end
    end

    patchvalue = patchvalue.get
    patchvalue.keys.each do |k|
      @editor.patch_config_part(k, patchvalue[k])
    end

    refresh_form
  end


  # this registers the events for fields
  # as of now it is only config button
  def register_events
    handler = lambda do |evt|
      target = Native(evt).target[:name].split(':')
      case target.last
        when 'delete'
          @editor.delete_config_part(target.first)
          refresh_form
          register_events
        when 'neutral'
          @editor.patch_config_part(target.first, @helper.to_neutral(target.first))
        when 'help'
          helptext = I18n.t_help(target.first) #%Q{<div style="padding:1em"><p>das ist der hilfetext zu #{target.first}</p></div>}
          `$(#{evt}.target).w2overlay(#{helptext})`
        when 'default'
          if a=@default_value[target.first]
            @editor.patch_config_part(target.first, a)
            refresh_form
            register_events
          end
        when 'fillup'
          @editor.extend_config_part(target.first, @helper.to_template(target.first))
          refresh_form
          register_events
      end
    end

    %x{$('.znconfig-button').click(#{handler})}
  end

  def generate_form
    $log.timestamp("generate Form")
    @form = {
        name:       "configform",
        #header:     I18n.t(@title),
        style:      'border: 0px; background-color: transparent;',
        fields:     @value.keys.map { |key| @helper.to_w2uifield(key) }.flatten,
        record:     @record,
        onChange:   lambda { |event|
          a=lambda { push_config_to_editor }
          `event.onComplete=#{a}`
        },
        toolbar:    {
            items:   [
                         {id: 'title', type: 'html', html: %Q{<div style="font-size:150%;vertical-align:middle;margin-bottom: 4px;">#{I18n.t(@title)}</div>}},
                         {id: 'bt3', type: 'spacer'},
                         {id: 'refresh', type: 'button', caption: 'Refresh', img: 'icon-page'},
                     ],
            onClick: lambda do |event|
              refresh_form if (Native(event).target == 'refresh')
            end
        },
        onValidate: lambda { alert("validate"); nil },
        formHTML:   %Q{
                    <table>
                    <tr><th style="width:20em;">#{I18n.t("Name")}</th>
                    <th>#{I18n.t("Value")}</th><th/><th>#{I18n.t("Effective value")}</th></tr>
                    #{@value.keys.map { |key| mk_fieldHTML(key) }.join}
                    </table>
                    }
    }
    show_form
    self
  end

  def refresh_form
    # todo handle focus
    @refresh_handler.call
  end


  def mk_fieldHTML(key)

    help_button  = %Q{<div class="w2ui-field" style="padding:2pt;"><button class="znconfig-button fa fa-question-circle-o"  name="#{key}:help"></button></div>}
    padding      = 1.5 * (key.split(".").count - 1)
    first_indent = %Q{<span style="padding-left:#{padding}em;"><span>} # "<td>&nbsp;</td>" * (key.split(".").count + 2)
    last_indent  = "" #"<td>&nbsp;</td>" * (15 - key.split(".").count)

    if @default_value[key].is_a? Hash # todo query type
      fillup_button = %Q{<button class="znconfig-button fa fa-circle-o" title="#{I18n.t('Add missing entries')}" name="#{key}:fillup"></button>} if @helper.to_template(key)

      %Q{
         <tr style="border:1pt solid blue;">

           <td  colspan="2" >
            #{first_indent}
            <button class="znconfig-button fa fa-times-circle" name="#{key}:delete"></button >
            #{fillup_button}
           <strong>#{ I18n.t_key("#{key}")}</strong>
           </td>
           <td style="vertical-align: top;">#{help_button}</td>
         </tr>
        }
    else
      default_button = %Q{<button class="foobar znconfig-button fa fa-circle-o" title="#{@default_value[key].to_s}" name="#{key}:fillup"></button>}

      %Q{
        <tr>
         <td style="vertical-align: top;">#{first_indent}
         <button class="znconfig-button fa fa-times-circle" name="#{key}:delete"></button >
         #{default_button}

            <strong>#{ I18n.t_key("#{key}")}</strong>
        </td>
        <td style="vertical-align: top;">
         <div class="w2ui-field" style="padding:1pt;">
            #{@helper.to_html(key)}
         </div>
        </td>
        <td style="vertical-align: top;">#{help_button}</td>
        <td style="vertical-align: top;">#{@effective_value[key]}</td>
       </tr>
    }
    end
  end

end