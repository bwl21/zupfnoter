class ConfstackEditor

  attr_reader :form

  def initialize(key, value)
    @key   = key
    @value = Confstack.new(false)
    if value.is_a? String
      @value.push('$value' => value)
    elsif value.is_a? Number
      @value.push('$value' => value)
    elsif value.is_a? Array
      @value.push('$array' => value.join(", "))
    elsif value.is_a? Hash
      @value.push(value)
    else
      $log.error("BUG: unsupported confstack class for #{key}: #{value.class}")
    end

    @record = @value.keys.inject({}) { |r, k| r[k] = @value[k]; r }
    nil
  end


  def show_form
    x=@form.to_n
    %x{
    if (w2ui[#{x}.name]){w2ui[#{x}.name].destroy()};
    $('#configtab').w2form(#{x});
    $('#configtab #form').w2render(#{x}.name);
    }
    register_events
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
        name:     "configform",
        header:   I18n.t(@key),
        style:    'border: 0px; background-color: transparent;',
        fields:   @value.keys.map { |key| mk_field(key) }.flatten,
        record:   @record,
        formHTML: %Q{
                  #{@value.keys.map { |key| mk_fieldHTML(key) }.join('<br/>')}
                  <div class="w2ui-buttonsx">
                      <button class="w2ui-btn" name="Ok">#{I18n.t('Ok')}</button>
                      <button class="w2ui-btn" name="Cancel">#{I18n.t('Cancel')}</button>
                  </div>
                  }
    }
    show_form
    self
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
         #{@value[key]}
        </div>
    }
    end
  end

end


def foo
  formDefinition = {
      name:    'barnumbers',
      text:    I18n.t('barnumbers'),
      style:   'border: 0px; background-color: transparent;',
      fields:  [
                   {field: 'barnumbers.voices', type: 'string', required: true, html: {caption: I18n.t('barnumbers.voices')}},
                   {
                       field:    'pos',
                       type:     'string',
                       required: true,
                       tooltip:  "barnumbers.pos",
                       html:     {caption: I18n.t('barnumbers.pos'), attr: 'style="width: 300px"'}
                   },
                   {field: 'barnumbers.style', type: 'string', required: true, html: {caption: I18n.t('barnumbers.style')}},
                   {field: 'barnumbers.prefiix', type: 'string', required: true, html: {caption: I18n.t('barnumbers.prefix')}}
               ],
      actions: {
          "Ok"     => lambda { alert "Ok" },
          "Cancel" => lambda { %x{debugger;w2popup.close();} }
      }
  }


  formDefinition[:formHTML] = formDefinition[:fields].map do |field|
    %Q{
        <div class="w2ui-field">
        <label>#{field[:html][:caption]}</label>
        <input name="#{field[:field]}" type="#{field[:type]}" maxlength="100" size="60"/>
        <input name="first_name" type="checkbox" />
        <input name="first_name" type="checkbox" />
        <input name="first_name" type="checkbox" />
        </div>
    }
  end.join('<br/>')


  form = W2ui::Popupform.new(formDefinition)
  form.open
end