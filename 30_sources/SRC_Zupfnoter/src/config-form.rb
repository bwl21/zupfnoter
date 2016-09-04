class ConfstackEditor

  class ConfHelper
    def initialize
      @typemap = {
          integerpairs: ['synchlines'],
          pos:          ['pos', 'spos', 'ELLIPSE_SIZE', 'REST_SIZE'],
          integerlist:  ['voices', 'flowlines', 'subflowlines', 'jumplines', 'layoutlines', 'verses', 'hpos', 'vpos', :produce],
          integer:      ['startpos']
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
      type = _type(key)
      if value.nil?
        nil
      elsif type == :integerpairs
        value.map { |v| "#{v.first}-#{v.last}" }.join(", ")
      elsif type == :pos
        %Q{#{value.first}, #{value.last}}
      elsif type == :integerlist
        %Q{#{value.join(", ")}}
      else
        value.to_s
      end
    end

    def to_value(key, string)
      type = _type(key)
      if string.nil?
        nil
      elsif type == :integerpairs
        string.split(",").map { |i| i.split('-').map { |i| i.to_i } }
      elsif type == :pos
        string.split(",").map { |i| i.to_f }
      elsif type == :integerlist
        string.split(",").map { |i| i.to_i }
      elsif type == :integer
        string.to_i
      else
        string
      end
    end

    def _type(key)
      lookupkey = key.split('.').last
      @typemap[lookupkey]
    end
  end

  def initialize(title, editor, value_handler, refresh_handler)
    @title           = title
    @editor          = editor
    @refresh_handler = refresh_handler

    @value = Confstack.new(false)
    @value.push(value_handler.call)

    @form   = nil # Form object to be passed to w2ui
    @helper = ConfHelper.new # helper to convert input to model and vice vversa
    @record = {} # hash to prepare the record for the form

    @record = @value.keys.inject({}) { |r, k| r[k] = @helper.to_string(k, @value[k]); r }
    nil
  end


  def show_form
    x=@form.to_n
    %x{
    if (w2ui[#{x}.name]){w2ui[#{x}.name].destroy()};
    $('#configtab').w2form(#{x});
    $('#configtab #form').w2render(#{x}.name);
    }
    @live_record = Native(`w2ui['configform'].record`)
    register_events
  end

  def push_config_to_editor
    patchvalue = Confstack.new(false)
    @live_record.each do |k, v|
      patchvalue[k] = @helper.to_value(k, v) unless (@record[k] == v) #or v.nil?
    end
    patchvalue = patchvalue.get
    patchvalue.keys.each do |k|
      @editor.patch_config_part(k, patchvalue[k])
    end
  end


  def register_events
    handler = lambda do |evt|
      target   = Native(evt).target[:name].split(':')
      newvalue = nil
      newvalue = '' if target.last == 'delete'
      newvalue = @value[target.first] if target.last == 'default'
      if newvalue
        %x{
          w2ui['configform'].record[#{target.first}] = #{newvalue};
          w2ui['configform'].refresh();
        }
        register_events
      end
    end
    %x{$('.znconfig-button').click(#{handler})}
  end

  def generate_form
    @form = {
        name:       "configform",
        #header:     I18n.t(@title),
        style:      'border: 0px; background-color: transparent;',
        fields:     @value.keys.map { |key| mk_field(key) }.flatten,
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
        onValidate: lambda { alert("validate"); `debugger`; nil },
        formHTML:   %Q{
                  #{@value.keys.map { |key| mk_fieldHTML(key) }.join('<br/>')}
                    }
    }
    show_form
    self
  end

  def refresh_form
    @refresh_handler.call
  end

  def mk_field(key)
    {field:       key,
     type:        'string',
     required:    true,
     text:        I18n.t("#{key}.text"),
     tooltip:     I18n.t("#{key}.tooltip"),
     placeholder: @value[key],
     html:        {caption: I18n.t("#{key}.caption")}}
  end


  def mk_fieldHTML(key)
    if @value[key].is_a? Hash
      %Q{<div><strong>#{ I18n.t("#{key}.caption")}</strong></div>}
    else
      %Q{
        <div class="w2ui-field">
        <label>#{ I18n.t("#{key}.caption")}</label>
        <input name="#{key}"" title = "#{key}"" type="string" maxlength="100" size="60"></input>
        <button class="znconfig-button fa fa-arrow-circle-left" name="#{key}:default"></button>
        <button class="znconfig-button fa fa-times-circle" name="#{key}:delete"></button >
         #{@record[key]}
        </div>
    }
    end
  end

end