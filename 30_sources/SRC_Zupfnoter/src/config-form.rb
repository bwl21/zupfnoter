class ConfstackEditor

  class ConfHelper
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
        template = key.split('.')[-2]
        a        = $conf.get("templates.#{template}") if template

        a
      end

      def self.to_html(key)
        %Q{<input name="#{key}"" title = "#{key}"" type="string" maxlength="100" size="60"></input>}
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
        string.to_s.eql?('true') ? true : false
      end

      def self.to_string(key, value)
        value.to_s
      end

      def self.to_neutral(key)
        nil
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


    def initialize
      @typemap = {
          IntegerPairs    => ['synchlines'],
          FloatPair       => ['pos', 'spos', 'ELLIPSE_SIZE', 'REST_SIZE', 'cp1', 'cp2'],
          IntegerList     => ['voices', 'flowlines', 'subflowlines', 'jumplines', 'layoutlines', 'verses', 'hpos', 'vpos', :produce],
          Integer         => ['startpos'],
          OneLineString   => ['title'],
          MultiLineString => ['text'],
          Boolean         => ['limit_a3'],
          Float           => ['LINE_THIN', 'LINE_MEDIUM', 'LINE_THICK'],
          TupletShape     => ['shape']
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
      `debugger`
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

    def _type(key)
      lookupkey = key.split('.').last
      @typemap[lookupkey] || ZnTypes
    end
  end

  def initialize(title, editor, value_handler, refresh_handler)
    $log.timestamp("initialize Form")
    @title           = title
    @editor          = editor
    @refresh_handler = refresh_handler

    value_handler_result = $log.benchmark("value handler") { value_handler.call }

    @value                = Confstack.new(false)
    @effective_value      = Confstack.new(false)
    @default_value        = Confstack.new(false)
    @default_value.strict = false

    @value.push(value_handler_result[:current])
    @effective_value.push(value_handler_result[:effective])
    @default_value.push($log.benchmark('getvalues') { value_handler_result[:default] })

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
      if @record[k].nil?
        patchvalue[k] = @helper.to_value(k, v) unless v.nil?
      else
        if v.nil?
          patchvalue[k] = @helper.to_value(k, nil) # this will produce the 'empty value'
        else
          patchvalue[k] = @helper.to_value(k, v) unless (@record[k] == v) #or v.nil?
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
        when 'neutral'
          @editor.patch_config_part(target.first, @helper.to_neutral(target.first))
        when 'fillup'
          `debugger`
          if @default_value[target.first]
            @editor.patch_config_part(target.first, @default_value[target.first])
          else
            @editor.extend_config_part(target.first, @helper.to_template(target.first))
          end
      end
      register_events
    end
    %x{$('.znconfig-button').click(#{handler})}
  end

  def generate_form
    $log.timestamp("generate Form")
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
                    <table>
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

    fillupbutton = %Q{<button class="znconfig-button fa fa-circle-o" name="#{key}:fillup">#{key}</button>} if @helper.to_template(key)
    unless @default_value[key].is_a? Hash
      fillupbutton = %Q{<button class="znconfig-button fa fa-circle-o" name="#{key}:fillup">#{@default_value[key]}</button>}
    end

    if @value[key].is_a? Hash # todo query type

      %Q{
         <tr>
           <td>
            <hr/>
            <button class="znconfig-button fa fa-times-circle" name="#{key}:delete"></button >
            #{fillupbutton}
           </td>
           <td><hr/><div><strong>#{ I18n.t_key("#{key}")}</strong></div></td>
          <td/>
         </tr>
        }
    else
      %Q{
        <tr>
         <td> <button class="znconfig-button fa fa-times-circle" name="#{key}:delete"></button ></td>
         <td>
            <div><strong>#{ I18n.t_key("#{key}")}</strong></div>

        </td>
        <td> <div class="w2ui-field">
            #{@helper.to_html(key)}
            #{fillupbutton}
      #{@effective_value[key]} / #{@default_value[key]}
            </div>  </td>
       </tr>
    }
    end
  end

end