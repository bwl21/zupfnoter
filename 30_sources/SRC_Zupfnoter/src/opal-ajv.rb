module Ajv

# this class provides validation

  class JsonValidator
    def initialize
      @root = `Ajv({allErrors: true, jsonPointers: true})`;
      add_schema(_schema, 'zupfnoter');
    end

    def add_schema(schema, schemaname)
      %x{
      #{@root}.addSchema(#{schema.to_n}, #{schemaname})
      }
    end

    def validate(schemaname, data)

      valid=false
      %x{
      #{valid} = #{@root}.validate(#{schemaname}, #{data.to_n})
     }
      unless valid
        errors = %x{#{@root}.errors}
        errors.each do |error|
          path    = `#{error}.dataPath`
          path    = path[1 .. -1].gsub("/", '.') if path.start_with? "/"
          message = %x{#{path}+ ': ' + #{error}.message + "\n" + JSON.stringify(error.params, null, " ")}
          $log.error(message)
        end
      end
    end


    def validate_conf(conf)
      validate('zupfnoter', conf.get)
    end

    def _schema
      {:$schema     => "http://json-schema.org/draft-04/schema#",
       :description => "Generated from x.json with shasum 0b1781e0803dc084178858e9fbe2b4e0b65c08e7",
       :type        => "object",
       :required    => ["confstack", "produce", "abc_parser", "restposition", "wrap", "defaults", "templates", "annotations", "extract", "layout", "neatjson"],

       :definitions => {
           :pos           => {:type        => "array",
                              :minItems    => 2,
                              :uniqueItems => false,
                              :items       => {:type => "number"}},
           :notes_entry   => {:type       => "object",
                              :required   => ["pos", "text", "style"],
                              :properties =>
                                  {:pos   => {:'$ref' => '#/definitions/pos'},
                                   :text  => {:type => "string"},
                                   :style => {:type => "string"}}},
           :minc_entry => {
               :type                 => "object",
               :required             => [:minc_f],
               :additionalProperties => false,
               :properties           => {:minc_f => {:type => "number"}}
           }
       },

       :properties  => {
           :confstack    => {:type       => "object",
                             :required   => ["env"],
                             :properties =>
                                 {:env => {:type => "string"}}},
           :produce      => {:type        => "array",
                             :minItems    => 1,
                             :uniqueItems => true,
                             :items       => {:type => "integer"}},
           :abc_parser   => {:type => "string"},
           :restposition => {:type       => "object",
                             :required   => ["default", "repeatstart", "repeatend"],
                             :properties =>
                                 {:default     => {:type => "string"},
                                  :repeatstart => {:type => "string"},
                                  :repeatend   => {:type => "string"}}},
           :wrap         => {:type => "integer"},
           :defaults     => {:type       => "object",
                             :required   => ["notebound"],
                             :properties =>
                                 {:notebound => {:type       => "object",
                                                 :required   => ["annotation", "partname", "variantend", "tuplet"],
                                                 :properties =>

                                                     {:annotation => {:type       => "object",
                                                                      :required   => ["pos"],
                                                                      :properties =>
                                                                          {:pos => {:'$ref' => '#/definitions/pos'}}},
                                                      :partname   => {:type       => "object",
                                                                      :required   => ["pos"],
                                                                      :properties =>
                                                                          {:pos => {:'$ref' => '#/definitions/pos'}}},
                                                      :variantend => {:type       => "object",
                                                                      :required   => ["pos"],
                                                                      :properties =>
                                                                          {:pos => {:'$ref' => '#/definitions/pos'}}},
                                                      :tuplet     => {:type       => "object",
                                                                      :required   => ["cp1", "cp2", "shape"],
                                                                      :properties =>
                                                                          {:cp1   => {:type        => "array",
                                                                                      :minItems    => 1,
                                                                                      :uniqueItems => true,
                                                                                      :items       => {:type => "integer"}},
                                                                           :cp2   => {:type        => "array",
                                                                                      :minItems    => 1,
                                                                                      :uniqueItems => true,
                                                                                      :items       => {:type => "integer"}},
                                                                           :shape => {:type        => "array",
                                                                                      :minItems    => 1,
                                                                                      :uniqueItems => true,
                                                                                      :items       => {:type => "string"}},
                                                                           :show  => {:type => 'boolean'}
                                                                          }}}}}},
           :templates    => {:type       => "object",
                             :required   => ["notes", "lyrics", "tuplet", "annotations"],
                             :properties =>
                                 {:notes       => {:"$ref" => '#/definitions/notes_entry'},
                                  :lyrics      => {:type       => "object",
                                                   :required   => ["verses", "pos"],
                                                   :properties =>
                                                       {:verses => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type => "integer"}},
                                                        :pos    => {:'$ref' => '#/definitions/pos'}}},
                                  :tuplet      => {:type       => "object",
                                                   :required   => ["cp1", "cp2", "shape"],
                                                   :properties =>
                                                       {:cp1   => {:'$ref' => '#/definitions/pos'},
                                                        :cp2   => {:'$ref' => '#/definitions/pos'},
                                                        :shape => {:type        => "array",
                                                                   :minItems    => 1,
                                                                   :uniqueItems => true,
                                                                   :items       => {:type => "string"}}}},
                                  :annotations => {:type       => "object",
                                                   :required   => ["text", "pos"],
                                                   :properties =>
                                                       {:text => {:type => "string"},
                                                        :pos  => {:'$ref' => '#/definitions/pos'}}}}},
           :annotations  => {:type       => "object",
                             :required   => ["vl", "vt", "vr"],
                             :properties =>
                                 {:vl => {:type       => "object",
                                          :required   => ["text", "pos"],
                                          :properties =>
                                              {:text => {:type => "string"},
                                               :pos  => {:'$ref' => '#/definitions/pos'}}},
                                  :vt => {:type       => "object",
                                          :required   => ["text", "pos"],
                                          :properties =>
                                              {:text => {:type => "string"},
                                               :pos  => {:'$ref' => '#/definitions/pos'}}},
                                  :vr => {:type       => "object",
                                          :required   => ["text", "pos"],
                                          :properties =>
                                              {:text => {:type => "string"},
                                               :pos  => {:'$ref' => '#/definitions/pos'}}}}},
           :extract      => {:type              => "object",
                             #:required          => ["0", "1", "2", "3"],
                             :patternProperties =>
                                 {:"\d*" => {:type       => "object",
                                             :requiredx  =>
                                                 ["title", "filenamepart", "startpos", "voices", "synchlines",
                                                  "flowlines", "subflowlines", "jumplines", "repeatsigns", "layoutlines",
                                                  "legend", "lyrics", "layout", "nonflowrest", "notes", "barnumbers",
                                                  "countnotes", "stringnames", "printer"],
                                             :properties =>
                                                 {:title        => {:type => "string"},
                                                  :filenamepart => {},
                                                  :startpos     => {:type => "integer"},
                                                  :voices       => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type => "integer"}},
                                                  :synchlines   => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type        => "array",
                                                                                     :minItems    => 1,
                                                                                     :uniqueItems => true,
                                                                                     :items       => {:type => "integer"}}},
                                                  :flowlines    => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type => "integer"}},
                                                  :subflowlines => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type => "integer"}},
                                                  :jumplines    => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type => "integer"}},
                                                  :repeatsigns  => {:type       => "object",
                                                                    :requiredx  => ["voices", "left", "right"],
                                                                    :properties =>
                                                                        {:voices => {:type        => "array",
                                                                                     :minItems    => 0,
                                                                                     :uniqueItems => true,
                                                                                     :items       => {}},
                                                                         :left   => {:type       => "object",
                                                                                     :required   => ["pos", "text", "style"],
                                                                                     :properties =>
                                                                                         {:pos   => {:'$ref' => '#/definitions/pos'},
                                                                                          :text  => {:type => "string"},
                                                                                          :style => {:type => "string"}}},
                                                                         :right  => {:type       => "object",
                                                                                     :required   => ["pos", "text", "style"],
                                                                                     :properties =>
                                                                                         {:pos   => {:'$ref' => '#/definitions/pos'},
                                                                                          :text  => {:type => "string"},
                                                                                          :style => {:type => "string"}}}}},
                                                  :layoutlines  => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type => "integer"}},
                                                  :legend       => {:type       => "object",
                                                                    :required   => ["spos", "pos"],
                                                                    :properties =>
                                                                        {:spos => {:"$ref" => "#/definitions/pos"},
                                                                         :pos  => {:"$ref" => "#/definitions/pos"}
                                                                        }
                                                  },
                                                  :lyrics       => {:type       => "object",
                                                                    :properties =>
                                                                        {}},
                                                  :layout       => {:type                 => "object",
                                                                    :requiredx            => ["limit_a3", "LINE_THIN", "LINE_MEDIUM", "LINE_THICK", "ELLIPSE_SIZE", "REST_SIZE", "grid"],
                                                                    :additionalProperties => false,
                                                                    :properties           =>
                                                                        {:limit_a3          => {:type => "boolean"},
                                                                         :LINE_THIN         => {:type => "number"},
                                                                         :LINE_MEDIUM       => {:type => "number"},
                                                                         :LINE_THICK        => {:type => "number"},
                                                                         :DRAWING_AREA_SIZE => {:type     => "array",
                                                                                                :minItems => 2,
                                                                                                :items    => {:type => "number"}},
                                                                         :ELLIPSE_SIZE      => {:type     => "array",
                                                                                                :minItems => 2,
                                                                                                :items    => {:type => "number"}},
                                                                         :REST_SIZE         => {:type     => "array",
                                                                                                :minItems => 2,
                                                                                                :items    => {:type => "number"}},
                                                                         :grid              => {:type => "boolean"},
                                                                         :packer            => {:type       => 'object',
                                                                                                :properties => {
                                                                                                    :pack_method            => {:type => 'integer'},
                                                                                                    :pack_max_spread_factor => {:type => 'number'},
                                                                                                    :pack_min_increment     => {:type => 'number'}
                                                                                                }},
                                                                         :minc              => {:type                 => "object",
                                                                                                :additionalProperties => false,
                                                                                                :patternProperties    => {
                                                                                                    "\d*" => {:'$ref' => '#/definitions/minc_entry'}
                                                                                                }
                                                                         }
                                                                        }
                                                  },
                                                  :nonflowrest  => {:type => "boolean"},
                                                  :notes        => {:patternProperties => {'.*' => {:"$ref" => '#/definitions/notes_entry'}}},
                                                  :barnumbers   => {:type       => "object",
                                                                    :required   => ["voices", "pos", "autopos", "style", "prefix"],
                                                                    :properties =>
                                                                        {:voices  => {:type        => "array",
                                                                                      :minItems    => 0,
                                                                                      :uniqueItems => true,
                                                                                      :items       => {}},
                                                                         :pos     => {:'$ref' => '#/definitions/pos'},
                                                                         :autopos => {:type => "boolean"},
                                                                         :style   => {:type => "string"},
                                                                         :prefix  => {:type => "string"}}},
                                                  :countnotes   => {:type       => "object",
                                                                    :required   => ["voices", "pos", "autopos", "style"],
                                                                    :properties =>
                                                                        {:voices  => {:type        => "array",
                                                                                      :minItems    => 0,
                                                                                      :uniqueItems => true,
                                                                                      :items       => {}},
                                                                         :pos     => {:'$ref' => '#/definitions/pos'},
                                                                         :autopos => {:type => "boolean"},
                                                                         :style   => {:type => "string"}}},
                                                  :stringnames  => {:type       => "object",
                                                                    :required   => ["text", "vpos", "style", "marks"],
                                                                    :properties =>
                                                                        {:text  => {:type => "string"},
                                                                         :vpos  => {:type        => "array",
                                                                                    :minItems    => 0,
                                                                                    :uniqueItems => true,
                                                                                    :items       => {}},
                                                                         :style => {:type => "string"},
                                                                         :marks => {:type       => "object",
                                                                                    :required   => ["vpos", "hpos"],
                                                                                    :properties =>
                                                                                        {:vpos => {:type        => "array",
                                                                                                   :minItems    => 1,
                                                                                                   :uniqueItems => true,
                                                                                                   :items       => {:type => "integer"}},
                                                                                         :hpos => {:type        => "array",
                                                                                                   :minItems    => 1,
                                                                                                   :uniqueItems => true,
                                                                                                   :items       => {:type => "integer"}}}}}},
                                                  :printer      => {:type       => "object",
                                                                    :required   => ["a3_offset", "a4_offset", "show_border"],
                                                                    :properties =>
                                                                        {:a3_offset   => {:type        => "array",
                                                                                          :minItems    => 2,
                                                                                          :axItems     => 2,
                                                                                          :uniqueItems => false,
                                                                                          :items       => {:type => "integer"}},
                                                                         :a4_offset   => {:type        => "array",
                                                                                          :minItems    => 2,
                                                                                          :uniqueItems => false,
                                                                                          :items       => {:type => "integer"}},
                                                                         :show_border => {:type => "boolean"}}}}},
                                  :"1"   => {:type       => "object",
                                             :required   => ["title", "filenamepart", "voices"],
                                             :properties =>
                                                 {:title        => {:type => "string"},
                                                  :filenamepart => {},
                                                  :voices       => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type => "integer"}}}},
                                  :"2"   => {:type       => "object",
                                             :required   => ["title", "filenamepart", "voices"],
                                             :properties =>
                                                 {:title        => {:type => "string"},
                                                  :filenamepart => {},
                                                  :voices       => {:type        => "array",
                                                                    :minItems    => 1,
                                                                    :uniqueItems => true,
                                                                    :items       => {:type => "integer"}}}}}},
           :layout       => {:type       => "object",
                             :required   => ["grid", "limit_a3", "SHOW_SLUR", "LINE_THIN", "LINE_MEDIUM", "LINE_THICK", "ELLIPSE_SIZE", "REST_SIZE", "X_SPACING", "X_OFFSET", "Y_SCALE", "DRAWING_AREA_SIZE", "BEAT_RESOLUTION", "SHORTEST_NOTE", "BEAT_PER_DURATION", "PITCH_OFFSET", "FONT_STYLE_DEF", "MM_PER_POINT", "DURATION_TO_STYLE", "REST_TO_GLYPH"],
                             :properties =>
                                 {:grid              => {:type => "boolean"},
                                  :limit_a3          => {:type => "boolean"},
                                  :SHOW_SLUR         => {:type => "boolean"},
                                  :LINE_THIN         => {:type => "number"},
                                  :LINE_MEDIUM       => {:type => "number"},
                                  :LINE_THICK        => {:type => "number"},
                                  :ELLIPSE_SIZE      => {:type        => "array",
                                                         :minItems    => 1,
                                                         :uniqueItems => true,
                                                         :items       => {:type => "number"}},
                                  :REST_SIZE         => {:type        => "array",
                                                         :minItems    => 1,
                                                         :uniqueItems => true,
                                                         :items       => {:type => "integer"}},
                                  :X_SPACING         => {:type => "number"},
                                  :X_OFFSET          => {:type => "number"},
                                  :Y_SCALE           => {:type => "integer"},
                                  :DRAWING_AREA_SIZE => {:type        => "array",
                                                         :minItems    => 1,
                                                         :uniqueItems => true,
                                                         :items       => {:type => "integer"}},
                                  :BEAT_RESOLUTION   => {:type => "integer"},
                                  :SHORTEST_NOTE     => {:type => "integer"},
                                  :BEAT_PER_DURATION => {:type => "integer"},
                                  :PITCH_OFFSET      => {:type => "integer"},
                                  :FONT_STYLE_DEF    => {:type       => "object",
                                                         :required   => ["bold", "italic", "large", "regular", "small_bold", "small_italic", "small", "smaller"],
                                                         :properties =>
                                                             {".*" => {:type       => "object",
                                                                       :required   => ["text_color", "font_size", "font_style"],
                                                                       :properties =>
                                                                           {:text_color => {:type        => "array",
                                                                                            :minItems    => 3,
                                                                                            :uniqueItems => false,
                                                                                            :items       => {:type => "integer"}},
                                                                            :font_size  => {:type => "integer"},
                                                                            :font_style => {:type => "string"}}} #,
                                                              # :italic       => {:type       => "object",
                                                              #                   :required   => ["text_color", "font_size", "font_style"],
                                                              #                   :properties =>
                                                              #                       {:text_color => {:type        => "array",
                                                              #                                        :minItems    => 1,
                                                              #                                        :uniqueItems => true,
                                                              #                                        :items       => {:type => "integer"}},
                                                              #                        :font_size  => {:type => "integer"},
                                                              #                        :font_style => {:type => "string"}}},
                                                              # :large        => {:type       => "object",
                                                              #                   :required   => ["text_color", "font_size", "font_style"],
                                                              #                   :properties =>
                                                              #                       {:text_color => {:type        => "array",
                                                              #                                        :minItems    => 1,
                                                              #                                        :uniqueItems => true,
                                                              #                                        :items       => {:type => "integer"}},
                                                              #                        :font_size  => {:type => "integer"},
                                                              #                        :font_style => {:type => "string"}}},
                                                              # :regular      => {:type       => "object",
                                                              #                   :required   => ["text_color", "font_size", "font_style"],
                                                              #                   :properties =>
                                                              #                       {:text_color => {:type        => "array",
                                                              #                                        :minItems    => 1,
                                                              #                                        :uniqueItems => true,
                                                              #                                        :items       => {:type => "integer"}},
                                                              #                        :font_size  => {:type => "integer"},
                                                              #                        :font_style => {:type => "string"}}},
                                                              # :small_bold   => {:type       => "object",
                                                              #                   :required   => ["text_color", "font_size", "font_style"],
                                                              #                   :properties =>
                                                              #                       {:text_color => {:type        => "array",
                                                              #                                        :minItems    => 1,
                                                              #                                        :uniqueItems => true,
                                                              #                                        :items       => {:type => "integer"}},
                                                              #                        :font_size  => {:type => "integer"},
                                                              #                        :font_style => {:type => "string"}}},
                                                              # :small_italic => {:type       => "object",
                                                              #                   :required   => ["text_color", "font_size", "font_style"],
                                                              #                   :properties =>
                                                              #                       {:text_color => {:type        => "array",
                                                              #                                        :minItems    => 1,
                                                              #                                        :uniqueItems => true,
                                                              #                                        :items       => {:type => "integer"}},
                                                              #                        :font_size  => {:type => "integer"},
                                                              #                        :font_style => {:type => "string"}}},
                                                              # :small        => {:type       => "object",
                                                              #                   :required   => ["text_color", "font_size", "font_style"],
                                                              #                   :properties =>
                                                              #                       {:text_color => {:type        => "array",
                                                              #                                        :minItems    => 1,
                                                              #                                        :uniqueItems => true,
                                                              #                                        :items       => {:type => "integer"}},
                                                              #                        :font_size  => {:type => "integer"},
                                                              #                        :font_style => {:type => "string"}}},
                                                              # :smaller      => {:type       => "object",
                                                              #                   :required   => ["text_color", "font_size", "font_style"],
                                                              #                   :properties =>
                                                              #                       {:text_color => {:type        => "array",
                                                              #                                        :minItems    => 1,
                                                              #                                        :uniqueItems => true,
                                                              #                                        :items       => {:type => "integer"}},
                                                              #                        :font_size  => {:type => "integer"},
                                                              #                        :font_style => {:type => "string"}}}
                                                             }
                                  },
                                  :MM_PER_POINT      => {:type => "number"},
                                  :DURATION_TO_STYLE => {:type              => "object",
                                                         :required          => ["err", "d64", "d48", "d32", "d24", "d16", "d12", "d8", "d6", "d4", "d3", "d2", "d1"],
                                                         :patternProperties =>
                                                             {".*" => {:type        => "array",
                                                                       :minItems    => 3,
                                                                       :uniqueItems => false,
                                                                       :items       => {:type => ["number", "string", "boolean"]}} #,
                                                              # :d64 => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "integer"}},
                                                              # :d48 => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d32 => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d24 => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d16 => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d12 => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d8  => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d6  => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d4  => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d3  => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d2  => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}},
                                                              # :d1  => {:type        => "array",
                                                              #          :minItems    => 1,
                                                              #          :uniqueItems => true,
                                                              #          :items       => {:type => "number"}}}
                                                             }},
                                  :REST_TO_GLYPH     => {:type              => "object",
                                                         # :required   => ["err", "d64", "d48", "d32", "d24", "d16", "d12", "d8", "d6", "d4", "d3", "d2", "d1"],
                                                         :patternProperties =>
                                                             {'.*' => {:type        => "array",
                                                                       :minItems    => 1,
                                                                       :uniqueItems => true,
                                                                       :items       => [{:type        => "array",
                                                                                         :minItems    => 1,
                                                                                         :uniqueItems => false,
                                                                                         :items       => {:type => "number"}},
                                                                                        {:type => "string"},
                                                                                        {:type => "boolean"}]}


                                                             }
                                  }
                                 }
           },
           :neatjson     => {:type       => "object",
                             :required   => ["wrap", "aligned", "after_comma", "after_colon_1", "after_colon_n", "before_colon_n", "explicit_sort"],
                             :properties =>
                                 {:wrap           => {:type => "integer"},
                                  :aligned        => {:type => "boolean"},
                                  :after_comma    => {:type => "integer"},
                                  :after_colon_1  => {:type => "integer"},
                                  :after_colon_n  => {:type => "integer"},
                                  :before_colon_n => {:type => "integer"},
                                  :sorted         => {:type => "boolean"},
                                  :explicit_sort  => {:type => "object"}
                                 }}}}

    end
  end
end