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


    class RestPosition < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="60"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: ['center', 'next', 'default']},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html:        {caption: I18n.t("#{key}.caption")}}
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

    class ZnUnknown < ZnTypes
      def self.to_html(key)
      end

      def self.to_w2uifield(key)
      end
    end


    ## this is the

    def initialize
      @typemap = {
          IntegerPairs    => ['synchlines'],
          FloatPair       => ['pos', 'size', 'spos', 'ELLIPSE_SIZE', 'REST_SIZE', "DRAWING_AREA_SIZE", 'cp1', 'cp2', 'a3_offset', 'a4_offset'],
          IntegerList     => ['voices', 'flowlines', 'subflowlines', 'jumplines', 'layoutlines', 'verses', 'hpos', 'vpos', "produce", "llpos", "trpos"],
          Integer         => ['startpos', 'pack_method', 'p_repeat', 'p_begin', 'p_end', 'p_follow'],
          OneLineString   => ['title', 'filenamepart', 'url'],
          MultiLineString => ['text'],
          Boolean         => ['limit_a3', 'autopos', 'show_border', 'nonflowrest', "show", "fill"],
          Float           => ['LINE_THIN', 'LINE_MEDIUM', 'LINE_THICK', 'pack_max_spreadfactor', 'pack_min_increment', 'minc_f'],
          TupletShape     => ['shape'],
          TextStyle       => ['style'],
          RestPosition    => ['default', 'repeatstart', 'repeatend'],
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
      keyparts = key.split('.')
      lookupkey = keyparts.last
      lookupkey_with_x = keyparts[-2] + '.x' if keyparts[-2]
      @typemap[lookupkey] || @typemap[lookupkey_with_x] || ZnUnknown
    end
  end

  #
  #def initialize(title, editor, value_handler, refresh_handler)
  def initialize(editorparams)
    @title                 = editorparams[:title]
    @editor                = editorparams[:editor]
    @refresh_handler       = editorparams[:refresh_handler]
    @newentry_handler      = editorparams[:newentry_handler]
    @quicksetting_commands = editorparams[:quicksetting_commands]
    @controller            = editorparams[:controller]

    value_handler = editorparams[:value_handler]

    $log.timestamp("initialize Form  #{__FILE__} #{__LINE__}")

    value_handler_result = $log.benchmark("value handler #{__FILE__} #{__LINE__}") { value_handler.call }

    $log.benchmark("process value handler result #{__FILE__} #{__LINE__}") do
      @value                = Confstack.new(false)
      @effective_value_raw  = Confstack.new(false)
      @default_value        = Confstack.new(false)
      @default_value.strict = false

      @value.push(value_handler_result[:current])
      @effective_value_raw.push(value_handler_result[:effective])
      #@default_value.push($log.benchmark("getvalues #{__FILE__} #{__LINE__}") { value_handler_result[:default] })
    end

    @form   = nil # Form object to be passed to w2ui
    @helper = ConfHelper.new # helper to convert input to model and vice vversa
    @record = {} # hash to prepare the record for the form

    @record          = @value.keys.inject({}) { |r, k| r[k] = @helper.to_string(k, @value[k]); r }
    @effective_value = @effective_value_raw.keys.inject({}) { |r, k| r[k] = @helper.to_string(k, @effective_value_raw[k]); r }
    $log.timestamp("end initialize Form  #{__FILE__} #{__LINE__}")
    nil
  end


  def show_form
    $log.timestamp("initialize Form  #{__FILE__} #{__LINE__}")
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
        patchvalue[k] = @helper.to_value(k, value) unless value.nil?
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
    $log.timestamp("generate Form  #{__FILE__} #{__LINE__}")

    presetmenu = {id:    'presets', text: I18n.t('Quick Setting'), type: :menu, icon: 'fa fa-star-o', disabled: @quicksetting_commands.empty?,
                  items: @quicksetting_commands.map { |i| {id: i, text: i.split(".").last} }
    }

    @form = {
        name:       "configform",
        #header:     I18n.t(@title),
        style:      'border: 0px; background-color: transparent;',
        fields:     @value.keys.map { |key| @helper.to_w2uifield(key) }.flatten.compact,
        record:     @record,
        focus:      -1,
        onChange:   lambda { |event|
          a=lambda { push_config_to_editor
          `document.getElementById(#{event}.target).focus()`
            #nil
          }
          `event.onComplete=#{a}`
        },
        toolbar:    {
            style:   'background-color: #f0f0f0; padding: 0px; overflow:hidden; height:30px;', #todo fix this
            items:   [
                         {id: 'title', class: 'foobar', style: "margin-top:0px", type: 'html', html: %Q{<div style="font-size:120%;vertical-align:top;margin-bottom: 8px;">#{I18n.t(@title)}</div>}},
                         {id: 'bt3', type: 'spacer'},
                         presetmenu,
                         {id: 'new_entry', type: 'button', text: I18n.t('New Entry'), icon: 'fa fa-plus-square-o', disabled: @newentry_handler.nil?},
                         {id: 'refresh', type: 'button', caption: 'Refresh', icon: 'fa fa-refresh'},
                     ],
            onClick: lambda do |event|
              the_target = Native(event).target

              if the_target.start_with? 'presets:'
                @controller.handle_command (%Q{addconf "#{the_target.split('presets:').last}"})
              end

              refresh_form if (the_target == 'refresh')

              @newentry_handler.call if (the_target == 'new_entry')
            end
        },
        onValidate: lambda { alert("validate"); nil },
        formHTML:   %Q{
                    <table>
                    <tr><th style="width:20em;">#{I18n.t("Name")}</th>
                    <th>#{I18n.t("Value")}</th><th/><th>#{I18n.t("Effective value")}</th></tr>
                    #{@value.keys.map { |key| mk_fieldHTML(key, @value[key]) }.join}
                    </table>
                    }
    }
    show_form
    self
  end

  def refresh_form
    @refresh_handler.call
  end


  # @param [String] key the key of the field
  # @param [Object] value - the current value from editor basically used to determin the icon on the delete button
  def mk_fieldHTML(key, value)
    help_button   = %Q{<div class="w2ui-field" style="padding:2pt;"><button tabIndex="-1" class="znconfig-button fa fa-question-circle-o"  name="#{key}:help"></button></div>}
    delete_icon   = value.nil? ? 'fa-minus' : 'fa-trash'
    delete_button = %Q{<button tabIndex="-1" class="znconfig-button fa #{delete_icon}" name="#{key}:delete"></button >}
    padding       = 1.5 * (key.split(".").count - 1)
    first_indent  = %Q{<span style="padding-left:#{padding}em;"><span>} # "<td>&nbsp;</td>" * (key.split(".").count + 2)
    last_indent   = "" #"<td>&nbsp;</td>" * (15 - key.split(".").count)

    if @helper.to_type(key) == ConfstackEditor::ConfHelper::ZnUnknown
      fillup_button = %Q{<button tabIndex="-1" class="znconfig-button fa fa-circle-o" title="#{I18n.t('Add missing entries')}" name="#{key}:fillup"></button>} if @helper.to_template(key)
      %Q{
         <tr style="border:1pt solid blue;">

           <td  colspan="2" >
            #{first_indent}
      #{delete_button}
      #{fillup_button}
           <strong>#{ I18n.t_key(key)}</strong>
           </td>
           <td style="vertical-align: top;">#{help_button}</td>
         </tr>
        }
    else
      default_button = %Q{<button tabIndex="-1" class="znconfig-button fa fa-circle-o" title="#{@effective_value[key]}" name="#{key}:fillup"></button>}
      %Q{
        <tr>
         <td style="vertical-align: top;">#{first_indent}
      #{delete_button}
      #{default_button}
           <strong>#{ I18n.t_key(key)}</strong>
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