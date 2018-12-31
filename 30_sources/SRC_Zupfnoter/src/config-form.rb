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

      def self.to_neutral(key, string = "")
        nil
      end

      def self.to_template(key)
        # handle the case notes.x
        template       = key.split('.')[-2] # templates are for "extract....<template>.x"
        voice_template = key.split('.')[-3] # templates are for "extract.<template>.v_<voice>.x"
        a              = $conf.get("templates.#{template}") if template
        a              = $conf.get("templates.#{voice_template}") if voice_template and not a.nil?

        if a.nil?
          help_key = key
          help_key = help_key.gsub(/^(extract\.)(\d+)(.*)$/) { "#{$1}0#{$3}" }
          a        = $conf.get(help_key)
        end

        a
      end

      def self.to_html(key)
        %Q{<input name="#{key}"" title = "#{key}"" type="string" maxlength="100" size="40"></input>}
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
        string.split(",").map { |pair| values = pair.split('-'); [values[0] || 0, values[1] || 0].map { |i| i.to_i } }
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
        list = string.split(",")
        [list[0] || 0, list[1] || 0].map { |i| i.to_f }
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
        0
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
        true # not really necesasry, use cannot empty this field :-)
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
        %Q{<input name="#{key}"" type="checkbox" class="w2ui-input" title = "#{key}" size="40">&nbsp;#{I18n.t(key)}</input>}
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
        0
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
        %Q{<textarea name="#{key}" title = "#{key}" cols="40"></textarea>}
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


    class NoteAnchor < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="40"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: ['box', 'center']},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html: {caption: I18n.t("#{key}.caption")}}
      end

      def self.to_value(key, string)
        string[:id]
      end

      def self.to_template(key)

      end

      def self.to_neutral
        $log.error("BUG: this should not happen Neutral RestPosition #{__FILE__} #{__LINE__}")
      end
    end


    class NoteAlign < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="40"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: ['l', 'r', 'auto']},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html: {caption: I18n.t("#{key}.caption")}}
      end

      def self.to_value(key, string)
        string[:id]
      end

      def self.to_template(key)

      end

      def self.to_neutral
        $log.error("BUG: this should not happen Neutral RestPosition #{__FILE__} #{__LINE__}")
      end
    end

    class RestPosition < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="40"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: ['center', 'next', 'previous', 'default']},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html: {caption: I18n.t("#{key}.caption")}}
      end

      def self.to_value(key, string)
        string[:id]
      end

      def self.to_template(key)

      end

      def self.to_neutral
        $log.error("BUG: this should not happen Neutral RestPosition #{__FILE__} #{__LINE__}")
      end
    end

    class Color < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="40"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: ['black', 'grey', 'darkgrey', 'dimgrey']},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html: {caption: I18n.t("#{key}.caption")}}
      end

      def self.to_value(key, string)
        string[:id]
      end

      def self.to_neutral
        $log.error("BUG: this should not happen Neutral Color #{__FILE__} #{__LINE__}")
      end
    end

    class Imagename < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="40"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: $resources.keys},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html: {caption: I18n.t("#{key}.caption")}}
      end

      def self.to_value(key, string)
        string[:id]
      end

      def self.to_neutral
        $log.error("BUG: this should not happen Imagename.to_neutral #{__FILE__} #{__LINE__}")
      end
    end

    class Instrument < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="40"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: ['37-strings-g-g', '25-strings-g-g', '21-strings-a-f', '18-strings-b-e', 'saitenspiel', 'Zipino',
                               'okon-f', 'okon-g', 'okon-c', 'okon-d']},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html: {caption: I18n.t("#{key}.caption")}}
      end

      def self.to_value(key, string)
        string[:id]
      end

      def self.to_neutral
        $log.error("BUG: this should not happen Neutral Instrument #{__FILE__} #{__LINE__}")
      end
    end

    class TextStyle < ZnTypes
      def self.to_html(key)
        %Q{<input name="#{key}" title = "#{key}" type="list" size="40"></input>}
      end

      def self.to_w2uifield(key)
        {field:       key,
         type:        'list',
         options:     {items: $conf['layout.FONT_STYLE_DEF'].keys},
         required:    true,
         text:        I18n.t("#{key}.text"),
         tooltip:     I18n.t("#{key}.tooltip"),
         placeholder: '', #@value[key],
         html: {caption: I18n.t("#{key}.caption")}}
      end

      def self.to_value(key, string)
        string[:id]
      end

      def self.to_neutral
        $log.error("BUG: this should not happen Neutral TextStyle #{__FILE__} #{__LINE__}")
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
          FloatPair       => ['apbase', 'pos', 'size', 'spos', 'ELLIPSE_SIZE', 'REST_SIZE', "DRAWING_AREA_SIZE", 'cp1', 'cp2', 'a3_offset', 'a4_offset', 'jumpline_anchor'],
          IntegerList     => ['a4_pages', 'voices', 'flowlines', 'subflowlines', 'jumplines', 'layoutlines', 'verses', 'hpos', 'vpos', "produce", "llpos", "trpos"],
          Integer         => ['startpos', 'pack_method', 'p_repeat', 'p_begin', 'p_end', 'p_follow', 'PITCH_OFFSET'],
          OneLineString   => ['title', 'filenamepart', 'url', 'filebase', 'imagename'],
          MultiLineString => ['text'],
          NoteAlign       => ['align'],
          NoteAnchor      => ['apanchor'],
          Boolean         => ['autopos', 'limit_a3', 'bottomup', 'beams', 'show_border', 'nonflowrest', "show", "fill", "grid"],
          Float           => ['LINE_THIN', 'LINE_MEDIUM', 'LINE_THICK', 'pack_max_spreadfactor', 'pack_min_increment', 'nshift', 'minc_f', "scale", "X_SPACING", "X_OFFSET", "height"],
          TupletShape     => ['shape'],
          TextStyle       => ['style'],
          RestPosition    => ['default', 'repeatstart', 'repeatend'],
          Instrument      => ['instrument'],
          Imagename       => ['imagename'],
          Color           => ['color_default', 'color_variant1', 'color_variant2']
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

    def to_neutral(key, value = nil)
      _type(key).to_neutral(key, value)
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
      keyparts         = key.split('.')
      lookupkey        = keyparts.last
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
    nil
  end


  def show_form
    x = @form.to_n
    %x{
    if (w2ui[#{x}.name]){w2ui[#{x}.name].destroy()};
    if (w2ui.configformtoolbar) w2ui.configformtoolbar.destroy();
    $('#configtoolbar').w2toolbar(#{x}.toolbars);
    $('#configeditor').w2form(#{x});
    $('#configeditor #form').w2render(#{x}.name);
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
  # @param [String] undo_title - if given it forwareded to @editor.patch_config_part for reference in undo manager
  def push_config_to_editor(undo_title = nil)
    patchvalue = Confstack.new(false)
    @live_record.each do |k, v|
      value = Native(v)
      if @record[k].nil? # this covers the new entry case
        patchvalue[k] = @helper.to_value(k, value) unless value.nil?
      else
        if value.nil?
          patchvalue[k] = @helper.to_neutral(k, @record[k]) # this will produce the 'empty value'
        elsif value.is_a? String
          patchvalue[k] = @helper.to_value(k, value) unless (@record[k] == value) #or v.nil?
        elsif value.is_a? Boolean or value.is_a? Numeric
          patchvalue[k] = @helper.to_value(k, value) unless (@record[k] == value) #or v.nil?
        elsif value.has_key?(:id) # return value is an object (e.g. selection list)
          patchvalue[k] = @helper.to_value(k, value)
        else
          $log.error("BUG this should not happen #{__FILE__} #{__LINE__}")
        end
      end
    end
    patchvalue = patchvalue.get
    patchvalue.keys.each do |k|
      @editor.patch_config_part(k, patchvalue[k], undo_title)
    end
    refresh_form
  end


  # this registers the events for field related buttons
  #
  def register_events

    # this handles entries of field related "burger menu"
    entry_menu_handler = lambda do |evt|
      target = Native(evt)[:item][:id].split(':')
      case target.last
      when 'delete'
        @editor.delete_config_part(target.first)
        refresh_form
        register_events
      when 'push0'
        @controller.handle_command(%Q{cpconfig #{target.first} 0})
        refresh_form
        register_events
      when 'pop0'
        current_view = target.first.match(/extract\.(\d+).*/)[1]
        key0         = target.first.gsub(/extract.(\d+)/, "extract.0")
        @controller.handle_command(%Q{cpconfig #{key0} #{current_view}})
        refresh_form
        register_events
      end
    end


    # this handles config form buttons
    handler = lambda do |evt|
      target = Native(evt).target[:name].split(':')
      case target.last
      when 'delete'
        @editor.delete_config_part(target.first)
        refresh_form
        register_events
      when 'neutral'
        @editor.patch_config_part(target.first, @helper.to_neutral(target.first), %Q{neutral #{target.first}})
      when 'help'
        helptext = I18n.t_help(target.first) #%Q{<div style="padding:1em"><p>das ist der hilfetext zu #{target.first}</p></div>}

        if target.first.start_with? "$resources"
          img      = $resources[target.first.split('.').last]
          helptext = %Q{<img style="width:300px;" src="#{img.join}"</img>} if img
          `$(#{evt}.target).w2overlay({html: #{helptext}, selectable: false})`
        else
          `$(#{evt}.target).w2overlay({html: #{helptext}, selectable: true})`
        end
      when 'default'
        if (a = @default_value[target.first])
          @editor.patch_config_part(target.first, a, %Q{to default #{target.first}})
          refresh_form
          register_events
        end
      when 'fillup'
        @editor.extend_config_part(target.first, @helper.to_template(target.first))
        refresh_form
        register_events
      when 'menu'
        items = []
        if target.first.start_with? "extract."
          items.push({id: %Q{#{target.first}:push0}, text: %Q{#{I18n.t("push to extract 0")} "#{target.first}"}, icon: 'fa fa-level-down'})
          items.push({id: %Q{#{target.first}:pop0}, text: %Q{#{I18n.t("pop from extract 0")} "#{target.first}"}, icon: 'fa fa-level-up'})
        end
        %x{
          $(#{evt}.target).w2menu({
                          left          : -20,
                          onSelect: #{entry_menu_handler},
                          items: #{items.to_n}
            })
          }
        nil
      end
    end

    %x{$('.znconfig-button').click(#{handler})}
    nil # no %x at the end of the method
  end


  # this moves the configuration of the forms menu into
  # config-form. This method is called from user-interface.js
  #
  # the id must match a parameter set specified in edit conf command
  #
  def self.get_config_form_menu_entries
    [
        {
            id:      'extract_annotation',
            text:    'Extract-Annotation',
            icon:    'fa fa-bars',
            tooltip: "Edit annotations of an extract"
        },
        {
            id:      'notes',
            text:    'page annotation',
            icon:    'fa fa-file-text-o',
            tooltip: "edit settings for sheet annotations\nin current extract"
        },
        {},
        {
            id:      'basic_settings',
            text:    'basic settings',
            icon:    'fa fa-heartbeat',
            tooltip: "Edit basic settings of extract"
        },
        {id: 'lyrics', text: 'lyrics', icon: 'fa fa-font', tooltip: "edit settings for lyrics\nin current extract"},
        {
            id:      'layout',
            text:    'layout',
            icon:    'fa fa-align-center',
            tooltip: "Edit layout paerameters\nin current extract"
        },
        {
            id:      'instrument_specific',
            text:    'instrument specific',
            icon:    'fa fa-pie-chart',
            tooltip: "settings for specific instrument sizes"
        },
        {},
        {
            id:      'barnumbers_countnotes',
            text:    'barnumbers and countnotes',
            icon:    'fa fa-list-ol',
            tooltip: "edit barnumbers or countnotes"
        },
        {
            id:      'repeatsigns',
            text:    'repeat signs',
            icon:    'fa fa-repeat',
            tooltip: "edit shape of repeat signs"
        },
        {
            id:      'annotations',
            text:    'annotations',
            icon:    'fa fa-commenting-o',
            tooltip: "edit settings for sheet annotations\nin current extract"
        },
        {},
        {
            id:      'stringnames',
            icon:    'fa fa-ellipsis-h',
            text:    'Stringnames',
            tooltip: "Edit presentation of stringanmes"
        },
        {id: 'printer', icon: 'fa fa-print', text: 'Printer adapt', tooltip: "Edit printer correction paerameters"},
        {},
        {id: 'notebound', icon: 'fa fa-adjust', text: 'notebound', tooltip: "edit notebound settings"},
        {},
        {id: 'images', icon: 'fa fa-image', text: 'images', tooltip: "edit placement of images"},
        {},
        # {id: 'template', icon: 'fa fa-file-code-o', text: 'template', tooltip:"edit Template properties"},
        {id: 'all_parameters', icon: 'fa fa-list', text: 'all parameters', tooltip: 'edit all parameters'}
    ]
  end

  def generate_form

    presetmenu = {id:    'presets', text: I18n.t('Quick Setting'), type: :menu, icon: 'fa fa-star-o', disabled: @quicksetting_commands.empty?,
                  items: @quicksetting_commands.map { |i| {id: i, text: i.split(".").last} }
    }

    undo_history = @editor.history_config[:undo]
    if undo_history.count > 2
      undo_button = {id:       'undo', type: 'button', icon: 'fa fa-undo',
                     disabled: false,
                     tooltip:  %Q{#{I18n.t("undo")} #{undo_history.first[:title]} },
                     onClick:  lambda { |e| @controller.handle_command(%Q{undoconfig}); refresh_form }
      }
    else
      undo_button = {id: 'un do', tooltip: "", type: 'button', icon: 'fa fa-undo', disabled: true}
    end

    redo_history = @editor.history_config[:redo]
    unless redo_history.empty?
      redo_button = {id:       'redo', type: 'button', icon: 'fa fa-repeat',
                     disabled: false,
                     tooltip:  %Q{#{I18n.t("redo")} #{redo_history.first[:title]} },
                     onClick:  lambda { |e| @controller.handle_command(%Q{redoconfig}); refresh_form }
      }
    else
      redo_button = {id: 'redo', tooltip: "", type: 'button', icon: 'fa fa-repeat', disabled: true}
    end

    @form = {
        name: "configform",
        #header:     I18n.t(@title),
        style:      'border: 0px; background-color: transparent;',
        fields:     @value.keys.map { |key| @helper.to_w2uifield(key) }.flatten.compact,
        record:     @record,
        focus:      -1,
        onChange:   lambda { |event|
          a = lambda {
            push_config_to_editor(%Q{edit #{`#{event}.target`}})
            %x{
               document.getElementById(#{event}.target).focus()
              }
            nil
          }
          %x{ event.onComplete=#{a}}
          nil
        },
        toolbars:   {
            name:    'configformtoolbar',
            items:   [
                         {id: 'title', class: 'foobar', style: "margin-top:0px", type: 'html', html: %Q{<h4 style="color:black;margin-left:3pt;">#{I18n.t(@title)}</h4>}},
                         {id: 'bt3', type: 'spacer'},
                         {id: 'bt4', type: 'break'},
                         undo_button,
                         redo_button,
                         {id: 'bt5', type: 'break'},
                         {
                             type:    'menu',
                             text:    "Edit Config",
                             id:      'edit_config',
                             icon:    'fa fa-pencil',
                             tooltip: "Edit configuration with forms",
                             items:   self.class.get_config_form_menu_entries
                         },


                         presetmenu,
                         {id: 'new_entry', type: 'button', text: I18n.t('New Entry'), icon: 'fa fa-plus-square-o', disabled: @newentry_handler.nil?},
                         {id: 'refresh', type: 'button', caption: 'Refresh', icon: 'fa fa-refresh'},
                     ],
            onClick: lambda do |event|
              the_target = Native(event).target

              if the_target.start_with? 'presets:'
                @controller.handle_command (%Q{addconf "#{the_target.split('presets:').last}"})
              end

              if the_target.start_with? 'edit_config' and the_target.split(':')[1]
                @controller.handle_command (%Q{editconf #{the_target.split(':')[1]}})
              end

              refresh_form if (the_target == 'refresh')

              @newentry_handler.call if (the_target == 'new_entry')
            end
        },
        onValidate: nil,
        formHTML:   %Q{
                    <table >
                    <tr><th style="width:20em; height:2em;">#{I18n.t("Name")}</th>
                         <th>#{I18n.t("Value")}</th>
                         <th></th><th></th><th>#{I18n.t("Effective value")}</th>
                    </tr>
                    #{@value.keys.map { |key| mk_fieldHTML(key, @value[key]) }.join}
                    </table>
                    }
    }
    $log.benchmark("showing form #{__FILE__}:#{__LINE__}") { show_form }
    self
  end

  def refresh_form
    $log.benchmark("refreshing form #{__FILE__}:#{__LINE__}") { @refresh_handler.call }
  end


  # @param [String] key the key of the field
  # @param [Object] value - the current value from editor basically used to determin the icon on the delete button
  def mk_fieldHTML(key, value)
    help_button   = %Q{<div class="w2ui-field" style="padding:2pt;"><button tabIndex="-1" class="znconfig-button fa fa-question-circle-o"  name="#{key}:help"></button></div>}
    menu_button   = %Q{<div class="w2ui-field" style="padding:2pt;"><button tabIndex="-1" class="znconfig-button fa fa-bars" name="#{key}:menu"></button></div>}
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
           <td style="vertical-align: top;">#{menu_button}</td>
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
        <td style="vertical-align: top;">#{menu_button}</td>
        <td style="vertical-align: top;">#{help_button}</td>
        <td style="vertical-align: top;">#{@effective_value[key]}</td>
       </tr>
    }
    end
  end

end