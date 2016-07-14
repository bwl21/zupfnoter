require "native"

module Harpnotes
  # the input faciities, basically the ABCinput stuff.

  module Input

    class Abc2svgToHarpnotes < AbstractAbcToHarpnotes

      ABC2SVG_DURATION_FACTOR = 1536 # a whole note is 1536 in the time domain of abc2svg


      def initialize
        super
        @abc_code          = nil
        @previous_new_part = []

        @part_table = {}

        @_shortest_note = $conf.get('layout.SHORTEST_NOTE')
        _reset_state
      end

      # @param [String] zupfnoter_abc to be transformed
      #
      # @return [Harpnotes::Music::Song] the Song
      def transform(zupfnoter_abc)
        @abc_code    = zupfnoter_abc
        @annotations = $conf.get("annotations")

        @info_fields = get_metadata(@abc_code)

        abc_parser = ABC2SVG::Abc2Svg.new(nil, {mode: :model}) # first argument is the container for SVG
        @abc_model = abc_parser.get_abcmodel(zupfnoter_abc)

        _make_metadata
        result = _transform_voices

        result.meta_data        = @meta_data
        result.harpnote_options = _make_harpnote_options

        result
      end

      def _make_harpnote_options
        result = {lyrics: {text: @info_fields[:W]}}

        result[:print] = $conf.get("produce").map do |i|
          title = $conf.get("extract.#{i}.title")
          if title
            {title: title, view_id: i}
          else
            $log.error("could not find extract number #{i}", [1, 1], [1000, 1000])
            nil
          end
        end.compact
        result
      end

      def _get_key_by_accidentals(accidentals)
        {
            7  => 'C#', #,	A#m	G#Mix	D#Dor	E#Phr	F#Lyd	B#Loc
            6  => 'F#', #	D#m	C#Mix	G#Dor	A#Phr	BLyd	E#Loc
            5  => 'B', #	G#m	F#Mix	C#Dor	D#Phr	ELyd	A#Loc
            4  => 'E', #'C#m	BMix	F#Dor	G#Phr	ALyd	D#Loc
            3  => 'A', #	F#m	EMix	BDor	C#Phr	DLyd	G#Loc
            2  => 'D', #	Bm	AMix	EDor	F#Phr	GLyd	C#Loc
            1  => 'G', #	Em	DMix	ADor	BPhr	CLyd	F#Loc
            0  => 'C', #	Am	GMix	DDor	EPhr	FLyd	BLoc
            -1 => 'F', #	Dm	CMix	GDor	APhr	BbLyd	ELoc
            -2 => 'Bb', #	Gm	FMix	CDor	DPhr	EbLyd	ALoc
            -3 => 'Eb', #	Cm	BbMix	FDor	GPhr	AbLyd	DLoc
            -4 => 'Ab', #	Fm	EbMix	BbDor	CPhr	DbLyd	GLoc
            -5 => 'Db', #	Bbm	AbMix	EbDor	FPhr	GbLyd	CLoc
            -6 => 'Gb', #	Ebm	DbMix	AbDor	BbPhr	CbLyd	FLoc
            -7 => 'Cb' #	Abm	GbMix	DbDor	EbPhr	FbLyd	BbLoc
        }[accidentals]
      end

      def _make_metadata
        key           = _get_key_by_accidentals(@abc_model[:voices].first[:voice_properties][:key][:k_sf])
        o_key         = _get_key_by_accidentals(@abc_model[:voices].first[:voice_properties][:okey][:k_sf])
        o_key_display =""
        o_key_display = "(Original in #{o_key})" unless key == o_key

        tempo_id = @abc_model[:music_type_ids][:tempo].to_s
        tempo_note = _get_extra(@abc_model[:voices].first[:voice_properties][:sym], tempo_id) rescue nil

        if tempo_note
          duration         = tempo_note[:tempo_notes].map { |i| i / ABC2SVG_DURATION_FACTOR }
          duration_display = duration.map { |d| "1/#{1/d}" }
          bpm              = tempo_note[:tempo_value].to_i
          tempo            = {duration: duration, bpm: bpm}
        else
          duration         = [0.25]
          duration_display = duration.map { |d| "1/#{1/d}" }
          bpm              = 120
          tempo            = {duration: duration, bpm: bpm}
        end

        @meta_data = {composer:      (@info_fields[:C] or []).join("\n"),
                      title:         (@info_fields[:T] or []).join("\n"),
                      filename:      (@info_fields[:F] or []).join("\n"),
                      tempo:         {duration: duration, bpm: bpm},
                      tempo_display: [duration_display, "=", bpm].join(' '),
                      meter:         @info_fields[:M],
                      key:           "#{key} #{o_key_display}"
        }
      end

      private


      def _mkznid(voice_element)
        result = _get_extra(voice_element, 17) #todo: get rid of literal constant:  @abc_model[:music_type_ids][:extra].to_s
        if result
          result = result[:text]

          unless result.match(/[a-z][a-zA-Z0-9_]*/)
            start_pos=charpos_to_line_column(voice_element[:istart])
            end_pos  = charpos_to_line_column(voice_element[:iend])
            $log.error("illegal character in of [r:] (must be of [a-z][a-z0.9_])", start_pos, end_pos)
            result = nil
          end
        end

        result = "#{voice_element[:time]}" unless result

        result
      end

      # This resets the converter
      # to be called when beginning a new voice
      def _reset_state

        @jumptargets = {} # the lookup table for jumps

        @next_note_marks   = {measure:          false,
                              repeat_start:     false,
                              variant_ending:   false,
                              variant_followup: false
        }
        @previous_new_part = []
        @previous_note     = nil
        @repetition_stack  = []
        @variant_endings   = [[]] # nested array of variant ending groups
        @tie_started       = false
        @slurstack         = 0
        @tuplet_count      = 1
        @tuplet_down_count = 1
        @countby           = nil # bount by part of a whole note: 8 => count 1/8
        @wmeasure          = 0 # length of a measure. Set to 0 unless measure is specified

      end

      def _transform_voices

        part_id = @abc_model[:music_type_ids][:part].to_s # performance ...

        # get parts from the first voice.
        @abc_model[:voices].first[:symbols].each do |voice_model_element|
          part                                         = (_get_extra(voice_model_element, part_id) or {})[:text]
          @part_table[voice_model_element[:time].to_s] = part if part
        end

        hn_voices = @abc_model[:voices].each_with_index.map do |voice_model, voice_index|
          voice_id = "v_#{voice_index + 1}"
          result = _transform_voice(voice_model, voice_id)
          result += _make_variant_ending_jumps if result
          result
        end.compact

        hn_voices.unshift(hn_voices.first) # let voice-index start with 1 -> duplicate voice 0
        Harpnotes::Music::Song.new(hn_voices)
      end

      # this tansforms one particular voice
      # @param [Integer] voice_index the index of the voice
      # @param [Object] voice_model the voice model as provided by ABC2SVG
      def _transform_voice(voice_model, voice_index)
        note_id = @abc_model[:music_type_ids][:note].to_s

        _reset_state
        @wmeasure = voice_model[:voice_properties][:meter][:wmeasure]
        @countby = voice_model[:voice_properties][:meter][:a_meter].first[:bot].to_i rescue nil
        _investigate_first_bar(voice_model)

        @pitch_providers = voice_model[:symbols].map do |voice_model_element|
          voice_model_element if voice_model_element[:type].to_s == note_id
        end

        result                = voice_model[:symbols].each_with_index.map do |voice_model_element, index|
          type = @abc_model[:music_types][voice_model_element[:type]]
          begin
            result = self.send("_transform_#{type}", voice_model_element, index, voice_index)
          rescue Exception => e
            $log.error("BUG: #{e}", charpos_to_line_column(voice_model_element[:istart]))
            nil
          end
          result
        end

        # handle the jumplines
        result                = result.flatten
        jumplines             = result.inject([]) do |jumplines, element|
          jumplines << _make_jumplines(element)
          jumplines
        end

        #handle notebound annotations

        notebound_annotations = result.inject([]) do |notebound_annotations, element|
          notebound_annotations << _make_notebound_annotations(element, voice_index)
        end

        result += (jumplines + notebound_annotations)

        result = result.flatten.compact

        if (result.count == 0)
          $log.error("Empty voice #{voice_index}")
          result = nil
        end
        result
      end

      # investigate if we should draw a bar on the very first note
      # algrithm: Compare time of first bar with the difference to the next bar
      # todo: this can be improved to flag errors in case wrong measures
      #
      def _investigate_first_bar(voice_model)
        symbol_bar_typeid = @abc_model[:music_type_ids][:bar].to_s

        bars = voice_model[:symbols].select do |voice_model_element|
          voice_model_element[:type].to_s == symbol_bar_typeid and not voice_model_element[:invisible]
        end.compact

        @measure_start_time = 0 #
        if bars.first
          @measure_start_time        = bars.first[:time] - @wmeasure # for count_notes
          @next_note_marks[:measure] = true if bars.first and (bars.first[:time] == @wmeasure) #bars[2] and (bars.first[:time] == (bars[2][:time] - bars[1][:time]))
        end
      end

      def _transform_bar(voice_element)
        result = []
        type   = voice_element[:bar_type]

        text = voice_element[:text]
        distance = _extract_goto_info_from_bar(voice_element).last[:distance] rescue [-10, 10, 15]

        @next_note_marks[:measure]      = true unless voice_element[:invisible]
        @next_note_marks[:repeat_start] = true if type =~/^.*:$/

        if voice_element[:rbstart] == 2
          @next_note_marks[:variant_ending] = {text: text}
        end

        # process end of variant ending
        # begin of variant ending needs to be preocessed
        # later in _make_repeats_jumps_annotations

        #if we have the very first start in a group
        #we push the previous note to serve for proper startlines
        if voice_element[:rbstart] == 2 and @variant_endings.last.empty?
          if distance.length != 3
            $log.error("you need to specify 3 values: #{distance}", charpos_to_line_column(voice_element[:istart]), charpos_to_line_column(voice_element[:iend]))

            distance = [-10, 10, 15]
          end
          @variant_endings.last.push({rbstop: @previous_note, distance: distance})
        end

        # if variant stops and we are alraedy in a variant
        if (voice_element[:rbstop] == 2) and (!@variant_endings.last.last.nil?) and (@variant_endings.last.last[:rbstart])
          @variant_endings.last.last[:rbstop] = @previous_note
          @variant_endings.last.last[:repeat_end] = true if true if type =~/^:.*$/

          #prepare a new variant_ending group if there is only an rbstop
          unless voice_element[:rbstart] == 2 # create a new group if the stop also starts a new one
            @next_note_marks[:variant_followup] = true
            @variant_endings.push([])
          end
        end


        result << _transform_bar_repeat_end(voice_element) if type =~/^:.*$/
      end

      # @param [Object] voice_index this is not used but keeps the inteface consistent with _transform_rest
      def _transform_note(voice_element, index, voice_index)
        origin                           = _parse_origin(voice_element)
        start_pos, end_pos               = origin[:startChar], origin[:endChar]

        #handle tuplets
        tuplet, tuplet_end, tuplet_start = _parse_tuplet_info(voice_element)

        if @next_note_marks[:measure]
          @measure_start_time = voice_element[:time] # for count_notes
        end

        # transform the individual notes
        duration = _convert_duration(voice_element[:notes].first[:dur])

        notes = voice_element[:notes].map do |the_note|
          #duration = _convert_duration(the_note[:dur])

          result            = Harpnotes::Music::Note.new(the_note[:midi], duration)
          result.count_note = _transform_count_note(voice_element)
          result.time       = voice_element[:time]
          result.znid       = _mkznid(voice_element)
          result.origin     = origin
          result.start_pos  = charpos_to_line_column(start_pos) # get column und line number of abc_code
          result.end_pos    = charpos_to_line_column(end_pos)

          result.tuplet       = tuplet
          result.tuplet_start = tuplet_start
          result.tuplet_end   = tuplet_end
          result
        end

        # the postprocessing
        # support the case of repetitions from the very beginning

        if @repetition_stack.empty?
          @repetition_stack << notes.last
        end

        result = []
        if notes.count == 1
          result << notes.first
        else
          # handle duration and orign
          synchpoint              = Harpnotes::Music::SynchPoint.new(notes)
          first_note              = notes.first # todo make this configurable
          synchpoint.znid         = _mkznid(voice_element)
          synchpoint.count_note   = _transform_count_note(voice_element)
          synchpoint.time         = first_note.time
          synchpoint.duration     = first_note.duration
          synchpoint.origin       = first_note.origin
          synchpoint.start_pos    = first_note.start_pos
          synchpoint.end_pos      = first_note.end_pos

          #handle tuplets of synchpoint
          synchpoint.tuplet       = first_note.tuplet
          synchpoint.tuplet_start = first_note.tuplet_start
          synchpoint.tuplet_end   = first_note.tuplet_end

          result << synchpoint
        end

        # handle ties
        # note that abc2svg only indicates tie start by  voice_element[:ti1] but has no tie end
        result.first.tie_end     = @tie_started
        @tie_started             = !voice_element[:ti1].nil?
        result.first.tie_start   = @tie_started


        # handle slurs
        # note that rests do not have slurs in practise
        result.first.slur_starts = _parse_slur(voice_element[:slur_start]).map { |i| _push_slur() }
        amount_of_slur_ends      = (voice_element[:slur_end] or 0)
        result.first.slur_ends   = (1 .. amount_of_slur_ends).map { _pop_slur } # pop_slur delivers an id.


        #harpnote_elements = [harpnote_elements] # make it an array such that we can append further elements

        if @next_note_marks[:measure]
          notes.each { |note| note.measure_start = true }
          @next_note_marks[:measure] = false
        end

        _make_repeats_jumps_annotations(result, voice_element, voice_index)

        result
      end

      def _transform_count_note(voice_element)
        if @countby
          countnames ={0.5 => "u", 0.25 => "e", 0.75 => "e"}

          count_base  = ABC2SVG_DURATION_FACTOR / @countby
          count_start = 1 + (voice_element[:time] - @measure_start_time) / count_base
          count_end   = count_start + voice_element[:dur] / count_base - 1
          count_range = (count_start.floor .. count_end.ceil).to_a.join("-")
          count_range = (countnames[count_start % 1]) unless (count_start % 1) == 0
          count_range = "?" unless count_range

          count_range
        end
      end

      def _convert_duration(raw_duration)
        # 128 to limit the maximum duration to the error note
        duration = [128, ((raw_duration/ABC2SVG_DURATION_FACTOR) * @_shortest_note).round].min
      end


      # @param [Integer] index  - this is required to determine the pitch of the rest
      def _transform_rest(voice_element, index, voice_index)

        origin             = _parse_origin(voice_element)
        start_pos, end_pos = origin[:startChar], origin[:endChar]

        pitch_note = (@pitch_providers[index .. -1].compact.first or @pitch_providers[0..index-1].compact.last)
        if pitch_note
          pitch = pitch_note[:notes].first[:midi]
        else
          pitch = 60
        end

        if (pitch.nil?)
          raise("undefined pitch")
          pitch = 60
        end

        if @next_note_marks[:measure]
          @measure_start_time = voice_element[:time] # for count_notes
        end


        the_note                         = voice_element[:notes].first
        duration                         = _convert_duration(the_note[:dur])
        tuplet, tuplet_end, tuplet_start = _parse_tuplet_info(voice_element)

        result              = Harpnotes::Music::Pause.new(pitch, duration)
        result.count_note   = _transform_count_note(voice_element)
        result.znid         = _mkznid(voice_element)
        result.time         = voice_element[:time]
        result.origin       = _parse_origin(voice_element)
        result.start_pos    = charpos_to_line_column(start_pos) # get column und line number of abc_code
        result.end_pos      = charpos_to_line_column(end_pos)

        #handle tuplets of synchpoint
        result.tuplet       = tuplet
        result.tuplet_start = tuplet_start
        result.tuplet_end   = tuplet_end

        result.visible      = false if voice_element[:invisible]

        # the post processing

        # support the case of repetitions from the very beginning

        if @repetition_stack.empty?
          @repetition_stack << result
        end

        result = [result]

        if @next_note_marks[:measure]
          result.first.measure_start = true
          @next_note_marks[:measure] = false
        end


        _make_repeats_jumps_annotations(result, voice_element, voice_index)

        result
      end

      def _transform_yspace(voice_element, index)
        #  This is a stub for future expansion
      end

      def _transform_bar_repeat_end(bar)
        if @repetition_stack.length == 1
          start = @repetition_stack.last
        else
          start = @repetition_stack.pop
        end

        goto_info = _extract_goto_info_from_bar(bar)
        distance = goto_info.last[:distance] rescue [2]
        if distance.count > 1
          raise "too many distance values for repeat end. Need only one #{distance}"
        end

        distance=distance.first

        [Harpnotes::Music::Goto.new(@previous_note, start, distance: distance)]
      end

      def _transform_format(voice_element)
        nil #`debugger`
      end

      def _transform_key(voice_element)
        nil #`debugger`
      end

      def _transform_meter(voice_element)
        @wmeasure = voice_element[:wmeasure]
        @countby = voice_element[:a_meter].first[:bot].to_i rescue nil
        nil
      end

      def _transform_clef(voice_element)
        nil #`debugger`
      end

      def _make_variant_ending_jumps
        result = []
        @variant_endings[0..-2].each do |variant_ending_group|
          # variant ending startlines
          distance = variant_ending_group[0][:distance]

          if variant_ending_group[-1][:is_followup]
            lastvariant = -2 # need to suppres startlines for the pseudo variatiion caused by followup notes
          else
            lastvariant = -1
          end


          variant_ending_group[1 .. lastvariant].each_with_index do |variant_ending, index|
            result << Harpnotes::Music::Goto.new(variant_ending_group[0][:rbstop], variant_ending[:rbstart], distance: distance[0], from_anchor: :after, to_anchor: :before)
          end

          # variant ending endlines
          variant_ending_group[1..-3].each_with_index do |variant_ending, index|
            # note that the repeat line is drawn by the _transform_bar_repeat_end
            # so we do not have the variant end line in this case
            unless variant_ending[:repeat_end]
              result << Harpnotes::Music::Goto.new(variant_ending[:rbstop], variant_ending_group[-1][:rbstart], distance: distance[1], from_anchor: :after, to_anchor: :before, vertical_anchor: :to)
            end
          end

          if variant_ending_group[-1][:is_followup]
            result << Harpnotes::Music::Goto.new(variant_ending_group[-2][:rbstop], variant_ending_group[-1][:rbstart], distance: distance[2], from_anchor: :after, to_anchor: :before, vertical_anchor: :to)
          end
        end
        result
      end

      # make the jumplilnes
      # @param [Playable] element - an element of the converted voice
      def _make_jumplines(element)
        if element.is_a?(Harpnotes::Music::Playable)
          goto_infos = _extract_goto_info_from_bar(element.origin[:raw])
          goto_infos.inject([]) do |result, goto_info|
            targetname = goto_info[:target]
            target     = @jumptargets[targetname]

            argument = goto_info[:distance].first || 2
            if target.nil?
              $log.error("target '#{targetname}' not found in voice at #{element.start_pos_to_s}", element.start_pos, element.end_pos)
            else
              result << Harpnotes::Music::Goto.new(element, target, distance: argument) #todo: better algorithm
            end

            result
          end
        else
          nil
        end
      end

      # this creates the notebound annotations for one particular entity
      # @param [Harpnotes::Music::Entity] entity
      def _make_notebound_annotations(entity, voice_id)
        result = []
        if entity.is_a? Harpnotes::Music::Playable
          chords =_extract_chord_lines(entity.origin[:raw])
          chords.each do |name|

            match = name.match(/^([!#\<\>])([^\@]+)?(\@(\-?[0-9\.]+),(\-?[0-9\.]+))?$/)
            if match
              semantic = match[1]
              text     = match[2]
              pos_x    = match[4] if match[4]
              pos_y    = match[5] if match[5]
              case semantic
                when "#"
                  annotation = @annotations[text]
                  $log.error("could not find annotation #{text}", entity.start_pos, entity.end_pos) unless annotation
                when "!"
                  annotation = {text: text}
                when "<"
                  entity.shift = {dir: :left, size: text}
                when ">"
                  entity.shift = {dir: :right, size: text}
                else
                  annotation = nil # it is not an annotation
              end

              if annotation
                notepos  = [pos_x, pos_y].map { |p| p.to_f } if pos_x
                position = notepos || annotation[:pos] || $conf['defaults.notebound.annotation.pos']
                conf_key = "notebound.annotation.#{voice_id}.#{entity.znid}.pos" if entity.znid
                result << Harpnotes::Music::NoteBoundAnnotation.new(entity, {pos: position, text: annotation[:text]}, conf_key)
              end
            else
              # $log.error("syntax error in annotation: #{name}")
            end
          end
        end
        result
      end

      # this appends repeats, jumplines, annotations to the resultl
      # @param [Array of Harpnotes::Music:Entity:] harpnote_elements elements created by the current note/rest
      def _make_repeats_jumps_annotations(harpnote_elements, voice_element, voice_id)
        @previous_note = harpnote_elements.first # notes.first # save this for repeat lines etc.
        znid           = harpnote_elements.first.znid

        # handle parts as annotation
        if part_label = @part_table[voice_element[:time].to_s]
          conf_key = "notebound.partname.#{voice_id}.#{znid}.pos" if znid #$conf['defaults.notebound.variantend.pos']
          position = $conf['defaults.notebound.partname.pos']

          harpnote_elements.first.first_in_part = true
          harpnote_elements << Harpnotes::Music::NoteBoundAnnotation.new(harpnote_elements.first, {pos: position, text: part_label}, conf_key)
        end

        # handle repeats
        if @next_note_marks[:repeat_start]
          @repetition_stack << harpnote_elements.first
          @next_note_marks[:repeat_start] = false
        end

        # handle variant endings
        if @next_note_marks[:variant_ending]
          text                                  = @next_note_marks[:variant_ending][:text]
          conf_key                              = "notebound.variantend.#{voice_id}.#{znid}.pos" if znid #$conf['defaults.notebound.variantend.pos']
          position                              = $conf['defaults.notebound.variantend.pos']
          harpnote_elements.first.first_in_part = true
          harpnote_elements << Harpnotes::Music::NoteBoundAnnotation.new(harpnote_elements.first, {pos: position, text: text}, conf_key)
          @next_note_marks[:variant_ending] = nil
          @variant_endings.last.push({})
          @variant_endings.last.last[:rbstart] = @previous_note
        end

        # if there is a note after a variant group,
        # the after jumplines should go the begining of this note
        # for this purpose add an unterminated variation
        if @next_note_marks[:variant_followup]
          @previous_note.first_in_part = true
          @variant_endings[-2].push({rbstart: @previous_note, is_followup: true})
          @next_note_marks[:variant_followup] = false
        end


        # collect chord based targets
        chords = _extract_chord_lines(voice_element)
        chords.select { |chord| chord[0] == ":" }.each do |name|
          @jumptargets[name[1 .. -1]] = harpnote_elements.select { |n| n.is_a? Harpnotes::Music::Playable }.last
        end
      end

      # read the information from th extra - property
      # @param [Object] voice_element - the particular symbol of the voice
      # @param [Object] id - the id of the extra which should be read
      #
      # @return [Object] the _first_ extra element
      def _get_extra(voice_element, id)
        r = (voice_element[:extra] and voice_element[:extra].select { |e| e[:type].to_s == id.to_s }.first) rescue nil
        r
      end

      def _push_slur
        @slurstack += 1
      end

      def _pop_slur
        result     = @slurstack
        @slurstack -= 1
        @slurstack = 0 if @slurstack < 0
        result
      end

      def _extract_chord_lines(voice_element)
        chords = voice_element[:a_gch]
        if chords
          result = chords.select { |e| e[:type] = '^' }.map { |e| e[:text] }
        else
          result = []
        end

        result
      end

      def _extract_goto_info_from_bar(bar)
        chordlines = _extract_chord_lines(bar)
        result     = chordlines.inject([]) do |result, line|
          if line.start_with?('@')
            level = line.match(/^^@([^\@]*)@(\-?\d*)(,(\-?\d*),(\-?\d*))?$/)
            if level
              target   = level[1]
              distance = [2, 4, 5].map { |i| level[i] ? level[i].to_i : nil }.compact
              result.push({target: target, distance: distance})
            else
              raise "Syntax-Error in Jump annotation: #{line}"
            end
          end
          result
        end
        result
      end

      def _parse_origin(voice_element)
        {startChar: voice_element[:istart], endChar: voice_element[:iend], raw: voice_element}
      end

      # this parses the slur information from abc2svg
      # every slur has 4 bits
      # so the slurs are parsed by shifting by 4 and masking 4 bits
      def _parse_slur(slurstart)
        startvalue = slurstart
        result     = []
        while startvalue > 0 do
          result.push startvalue & 0xf
          startvalue >>= 4
        end
        result
      end

      # this parses the tuplet_information out of the voice_elmenet
      def _parse_tuplet_info(voice_element)
        if voice_element[:in_tuplet]

          #tuplet_id = @abc_model[:music_type_ids][:tuplet].to_s # todo: optimize performance here ...
          tuplet_id = "15"
          if _get_extra(voice_element, tuplet_id) # [:extra] and voice_element[:extra][tuplet_id]   # todo: attr_reader :
            @tuplet_count      = (_get_extra(voice_element, tuplet_id)[:tuplet_p])
            @tuplet_down_count = @tuplet_count
            tuplet_start       = true
          else
            tuplet_start = nil
          end

          tuplet = @tuplet_count

          if @tuplet_down_count == 1
            @tuplet_count = 1
            tuplet_end    = true
          else
            @tuplet_down_count -= 1
            tuplet_end         = nil
          end
        else
          tuplet       = 1
          tuplet_start = nil
          tuplet_end   = nil
        end
        return tuplet, tuplet_end, tuplet_start
      end


    end
  end # module Input

end # module Harpnotes
