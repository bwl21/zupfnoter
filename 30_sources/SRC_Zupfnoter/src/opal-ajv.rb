module Ajv

# this class provides validation
  class JsonValidator
    def initialize

      ajv = nil
      if OPAL_PLATFORM == 'nodejs'
        ajv = %x{Ajv}
      else
        ajv = %x{Ajv}
      end
      @root = `#{ajv}({allErrors: true, jsonPointers: true})`;
      add_schema(_schema, 'zupfnoter');
    end

    def add_schema(schema, schemaname)
      %x{
      #{@root}.addSchema(#{schema.to_n}, #{schemaname})
      }
    end

    def validate(schemaname, data)

      valid = false
      %x{
      #{valid} = #{@root}.validate(#{schemaname}, #{data.to_n})
     }
      result = []
      unless valid
        errors = %x{#{@root}.errors}
        errors.each do |error|
          path = `#{error}.dataPath`
          path = path[1 .. -1].gsub("/", '.') if path.start_with? "/"
          result.push path
          message = %x{#{path}+ ': ' + #{error}.message + "\n" + JSON.stringify(error.params, null, " ")}
          $log.error(message)
        end
      end
      result
    end

    def validate_conf(conf)
      resconf        = Confstack.new()
      resconf.strict = false
      resconf.push(conf.get)
      extract0 = resconf.get("extract.0")
      resconf.get('extract').keys.each do |key|
        resconf.push({'extract' => {key => extract0}}) # push extract 0 to all others
      end
      resconf.push({'extract' => conf.get('extract')}) # push extract-specific paramters
      x = resconf.get
      validate('zupfnoter', resconf.get)
    end

    def _schema
      {:$schema     => "http://json-schema.org/draft-04/schema#",
       :description => "Generated from x.json with shasum 0b1781e0803dc084178858e9fbe2b4e0b65c08e7",
       :type        => "object",
       :required    => ["produce", "abc_parser", "restposition", "wrap", "defaults", "templates", "annotations", "extract", "layout", "neatjson"],
       :definitions => {

           :apanchor         => {:type => "string",
                                 :enum => ['manual', 'box', 'center']},
           :pos              => {:type        => "array",
                                 :minItems    => 2,
                                 :uniqueItems => false,
                                 :items       => {:type => "number"}},
           :notes_entry      => {:type       => "object",
                                 :required   => ["pos", "text", "style"],
                                 :properties =>
                                     {:pos   => {:'$ref' => '#/definitions/pos'},
                                      :text  => {:type => "string"},
                                      :style => {:type => "string"}}},
           :minc_entry       => {
               :type                 => "object",
               :required             => [:minc_f],
               :additionalProperties => false,
               :properties           => {:minc_f => {:type => "number"}}
           },
           :nconf_entry      => {
               :type                 => "object",
               :additionalProperties => false,
               :patternProperties    => {
                   "t_\d*" => {:type                 => "object",
                               :additionalProperties => false,
                               :patternProperties    => {
                                   "n_\d*" => {:type                 => "object",
                                               :additionalProperties => false,
                                               :properties           => {:nshift => {:type => 'number'}}}
                               }
                   }
               }
           },
           :notebound_pos    => {:type                 => "object",
                                 :additionalProperties => false,
                                 :patternProperties    => {
                                     "v_\d*" => {:type                 => "object",
                                                 :additionalProperties => false,
                                                 :patternProperties    => {
                                                     "t_\d*|\d*" => {
                                                         :type                 => "object",
                                                         :additionalProperties => false,
                                                         :properties           => {
                                                             pos:    {:'$ref' => '#/definitions/pos'},
                                                             align: {:type => 'string',
                                                                      :enum => ['l', 'r', 'auto']}
                                                         }
                                                     }
                                                 }
                                     }

                                 }
           },
           :notebound_repeat => {:type                 => "object",
                                 :additionalProperties => false,
                                 :patternProperties    => {
                                     "v_\d*" => {:text  => "integer",
                                                 :style => {:type => "string"},
                                                 pos:   {:'$ref' => '#/definitions/pos'}
                                     }
                                 }
           },
           :annotated_bezier => {:type       => "object",
                                 :properties =>
                                     {:cp1   => {:'$ref' => '#/definitions/pos'},
                                      :cp2   => {:'$ref' => '#/definitions/pos'},
                                      :pos   => {:'$ref' => '#/definitions/pos'},
                                      :shape => {:type        => "array",
                                                 :minItems    => 0,
                                                 :uniqueItems => true,
                                                 :items       => {:type => "string"}},
                                      :show  => {:type => 'boolean'},
                                      :style => {:type => "string"}
                                     }
           },
           :extract_layout   => {
               :type                 => "object",
               :requiredx            => ["limit_a3", "LINE_THIN", "LINE_MEDIUM", "LINE_THICK", "ELLIPSE_SIZE", "REST_SIZE", "grid"],
               :additionalProperties => false,
               :properties           =>
                   {:limit_a3        => {:type => "boolean"},
                    :beams           => {:type => "boolean"},
                    :bottomup        => {:type => "boolean"},
                    :jumpline_anchor => {:'$ref' => '#/definitions/pos'}, # todo: remove this it is there again below
                    :LINE_THIN         => {:type => "number"},
                    :LINE_MEDIUM       => {:type => "number"},
                    :LINE_THICK        => {:type => "number"},
                    :PITCH_OFFSET      => {:type => "integer"},
                    :X_SPACING         => {:type => "number"},
                    :X_OFFSET          => {:type => "number"},
                    :instrument        => {:type => 'string'},

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
                    :color             => {:type       => 'object',
                                           :properties => {:color_default  => {:type => 'string'},
                                                           :color_variant1 => {:type => 'string'},
                                                           :color_variant2 => {:type => 'string'}
                                           }},
                    :packer            => {:type       => 'object',
                                           :properties => {
                                               :pack_method            => {:type => 'integer'},
                                               :pack_max_spread_factor => {:type => 'number'},
                                               :pack_min_increment     => {:type => 'number'}
                                           }}
                   }
           }
       },

       :properties  => {
           :confstack    => {:type       => "object",
                             :required   => ["env"],
                             :properties =>
                                 {:env => {:type => "string"}}},
           :produce      => {:type        => "array",
                             :minItems    => 0,
                             :uniqueItems => true,
                             :items       => {:type => "integer"}},
           :template     => {:type                 => "object",
                             :additionalProperties => false,
                             :properties           =>
                                 {
                                     :filebase => {:type => "string"},
                                     :title    => {:type => "string"}
                                 }},
           :abc_parser   => {:type => "string"},
           :restposition => {:type                 => "object",
                             :additionalProperties => false,
                             :required             => ["default", "repeatstart", "repeatend"],
                             :properties           =>
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
                                                                          {:pos   => {:'$ref' => '#/definitions/pos'},
                                                                           :style => {:type => "string"}}},
                                                      :partname   => {:type       => "object",
                                                                      :required   => ["pos"],
                                                                      :properties =>
                                                                          {:pos   => {:'$ref' => '#/definitions/pos'},
                                                                           :style => {:type => "string"}}},
                                                      :variantend => {:type       => "object",
                                                                      :required   => ["pos"],
                                                                      :properties =>
                                                                          {:pos   => {:'$ref' => '#/definitions/pos'},
                                                                           :style => {:type => "string"}}},
                                                      :tuplet     => {'$ref'    => '#/definitions/annotated_bezier',
                                                                      :required => ["cp1", "cp2", "shape"]
                                                      }
                                                     }
                                 }
                                 }
           },
           # end of defaults
           :templates   => {:type       => "object",
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
                                                       :pos    => {:'$ref' => '#/definitions/pos'},
                                                       :style  => {:type => "string"}}},
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
                                                      {:text  => {:type => "string"},
                                                       :pos   => {:'$ref' => '#/definitions/pos'},
                                                       :style => {:type => "string"}}}}},
           :annotations => {:type       => "object",
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
           :extract     => {:type => "object",
                            #:required          => ["0", "1", "2", "3"],
                            :patternProperties =>
                                {:"\d*" => {:type                 => "object",
                                            :additionalProperties => false,
                                            :requiredx            =>
                                                ["title", "filenamepart", "startpos", "voices", "synchlines",
                                                 "flowlines", "subflowlines", "jumplines", "repeatsigns", "layoutlines",
                                                 "legend", "lyrics", "layout", "nonflowrest", "notes", "barnumbers",
                                                 "countnotes", "stringnames", "printer"],
                                            :properties           =>
                                                {:title        => {:type => "string"},
                                                 :filenamepart => {},
                                                 :startpos     => {:type => "integer"},
                                                 :voices       => {:type        => "array",
                                                                   :minItems    => 1,
                                                                   :uniqueItems => true,
                                                                   :items       => {:type => "integer"}},
                                                 :synchlines   => {:type        => "array",
                                                                   :minItems    => 0,
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
                                                                   :minItems    => 0,
                                                                   :uniqueItems => true,
                                                                   :items       => {:type => "integer"}},
                                                 :legend       => {:type       => "object",
                                                                   :required   => ["spos", "pos"],
                                                                   :properties =>
                                                                       {:spos  => {:"$ref" => "#/definitions/pos"},
                                                                        :pos   => {:"$ref" => "#/definitions/pos"},
                                                                        :style => {:type => "string"}
                                                                       }
                                                 },
                                                 :lyrics       => {:type              => "object",
                                                                   :patternProperties =>
                                                                       {".*" => {
                                                                           :type     => "object",
                                                                           :required => ["verses", "pos"]
                                                                       }}
                                                 },
                                                 :layout       => {:'$ref' => '#/definitions/extract_layout'},
                                                 :nonflowrest  => {:type => "boolean"},
                                                 :notes        => {:patternProperties => {'.*' => {:"$ref" => '#/definitions/notes_entry'}}},
                                                 :notebound    => {
                                                     :type                 => 'object',
                                                     :additionalProperties => false,
                                                     :properties           => {
                                                         :annotation   => {:'$ref' => '#/definitions/notebound_pos'},
                                                         :barnumber    => {:'$ref' => '#/definitions/notebound_pos',
                                                                           :align  => {type: 'string'}},
                                                         :c_jumplines  => {:type => 'object', # configuratoin of jumpline distances
                                                                           :additionalProperties => false,
                                                                           :patternProperties    => {
                                                                               "v_\d*" => {
                                                                                   :p_repeat => {type: 'number'},
                                                                                   :p_begin  => {type: 'number'},
                                                                                   :p_end    => {type: 'number'},
                                                                                   :p_follow => {type: 'number'}
                                                                               }
                                                                           }},
                                                         :countnote    => {:'$ref' => '#/definitions/notebound_pos'},
                                                         :decoration   => {:'$ref' => '#/definitions/notebound_pos'},
                                                         :flowline     => {:type              => 'object',
                                                                           :patternProperties => {
                                                                               "v_\d+" => {
                                                                                   :type              => 'object',
                                                                                   :patternProperties => {
                                                                                       "\d*" => {'$ref' => '#/definitions/annotated_bezier'}
                                                                                   }
                                                                               }
                                                                           }
                                                         },
                                                         :minc         => {:type                 => "object",
                                                                           :additionalProperties => false,
                                                                           :patternProperties    => {
                                                                               "\d*" => {:'$ref' => '#/definitions/minc_entry'}
                                                                           }
                                                         },
                                                         :nconf        => {:type                 => 'object',
                                                                           :additionalProperties => false,
                                                                           :patternProperties    => {
                                                                               "v_\d*" => {:'$ref' => '#/definitions/nconf_entry'}
                                                                           }
                                                         },
                                                         :partname     => {:'$ref' => '#/definitions/notebound_pos'},
                                                         :repeat_begin => {:'$ref' => '#/definitions/notebound_pos'},
                                                         :repeat_end   => {:'$ref' => '#/definitions/notebound_repeat'},
                                                         :tuplet       => {:type              => 'object',
                                                                           :patternProperties => {
                                                                               "v_\d*" => {
                                                                                   :type              => 'object',
                                                                                   :patternProperties => {
                                                                                       "\d*" => {'$ref' => '#/definitions/annotated_bezier'}
                                                                                   }
                                                                               }
                                                                           }
                                                         },
                                                         :variantend   => {:'$ref' => '#/definitions/notebound_pos'},
                                                     }
                                                 },
                                                 :tuplets      => {:type       => "object",
                                                                   :properties =>
                                                                       {:text => {:type => "string"}}
                                                 },
                                                 :barnumbers   => {:type       => "object",
                                                                   :required   => ["voices", "pos", "autopos", "style", "prefix"],
                                                                   :properties =>
                                                                       {:voices   => {:type        => "array",
                                                                                      :minItems    => 0,
                                                                                      :uniqueItems => true,
                                                                                      :items       => {}},
                                                                        :pos      => {:'$ref' => '#/definitions/pos'},
                                                                        :autopos  => {:type => "boolean"},
                                                                        :apanchor => {"$ref" => "#/definitions/apanchor"}, :style => {:type => "string"},
                                                                        :prefix   => {:type => "string"}}},
                                                 :countnotes   => {:type       => "object",
                                                                   :required   => ["voices", "pos", "autopos", "style"],
                                                                   :properties =>
                                                                       {:voices   => {:type        => "array",
                                                                                      :minItems    => 0,
                                                                                      :uniqueItems => true,
                                                                                      :items       => {}},
                                                                        :pos      => {:'$ref' => '#/definitions/pos'},
                                                                        :autopos  => {:type => "boolean"},
                                                                        :apanchor => {"$ref" => "#/definitions/apanchor"},
                                                                        :style    => {:type => "string"}}},
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
                                                 :sortmark     => {:type       => 'object',
                                                                   :properties => {
                                                                       :show => {:type => 'boolean'}
                                                                   }
                                                 },
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
                                                                        :show_border => {:type => "boolean"}
                                                                       }
                                                 },
                                                 :images       => {:type              => "object",
                                                                   :patternProperties => {
                                                                       :"\d*" => {
                                                                           :type       => "object",
                                                                           :properties => {
                                                                               :imagename => {:type => "string"},
                                                                               :show      => {:type => "boolean"},
                                                                               :pos       => {:'$ref' => '#/definitions/pos'},
                                                                               :height    => {:type => "number"}
                                                                           }
                                                                       }
                                                                   }
                                                 }
                                                }
                                },
                                 :"4"   => {:type       => "object",
                                            :required   => ["title", "voices"],
                                            :properties =>
                                                {:title        => {:type => "string"},
                                                 :filenamepart => {},
                                                 :voices       => {:type        => "array",
                                                                   :minItems    => 1,
                                                                   :uniqueItems => true,
                                                                   :items       => {:type => "integer"}}}},
                                 :"5"   => {:type       => "object",
                                            :required   => ["title", "voices"],
                                            :properties =>
                                                {:title        => {:type => "string"},
                                                 :filenamepart => {},
                                                 :voices       => {:type        => "array",
                                                                   :minItems    => 1,
                                                                   :uniqueItems => true,
                                                                   :items       => {:type => "integer"}}}}}},
           :layout      => {:type       => "object",
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
                                                        :items       => {:type => "number"}},
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
                                 :FONT_STYLE_DEF    => {:type              => "object",
                                                        :required          => ["bold", "italic", "large", "regular", "small_bold", "small_italic", "small", "smaller"],
                                                        :patternProperties =>
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
                                 :REST_TO_GLYPH     => {:type => "object",
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
           :neatjson    => {:type       => "object",
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