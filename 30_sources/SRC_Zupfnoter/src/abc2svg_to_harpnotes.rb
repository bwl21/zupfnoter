require "native"

module Harpnotes
  # the input faciities, basically the ABCinput stuff.

  module Input

    class Abc2svgToHarpnotes < AbstractAbcToHarpnotes

      ABC2SVG_DURATION_FACTOR = 1536 # a whole note is 1536 in the time domain of abc2svg

      attr_reader :abc_model

      def initialize
        super
        @abcplay           = nil # this is an instance of abcplay which we need to pass throug to load the player from abc
        @abc_code          = nil
        @previous_new_part = []
        @score_statements  = [] # need this to capture score statments in the header
        @part_table        = {}
        @abc_model         = {}

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

        abc_parser                   = ABC2SVG::Abc2Svg.new(nil, {mode: :model}) # first argument is the container for SVG
        abc_parser.abcplay           = @abcplay if @abcplay
        @abc_model, player_model_abc = abc_parser.get_abcmodel(zupfnoter_abc)

        raise I18n.t("no suitable ABC found") if @abc_model.nil?
        _make_metadata
        result = _transform_voices

        result.meta_data        = @meta_data
        result.harpnote_options = _make_harpnote_options

        filebase = result.meta_data[:filename]
        $log.error(I18n.t("Filename not specified in song add an F: instruction"), [1, 1]) if filebase.empty?

        [result, player_model_abc]
      end

      def _make_harpnote_options
        result = {lyrics: {text: @info_fields[:W]}}

        result[:template] = $conf.get('template')
        result[:print]    = $conf.get("produce").map do |i|
          title = $conf.get("extract.#{i}.title")
          if title
            filenamepart = ($conf.get("extract.#{i}.filenamepart") || title).strip.gsub(/[^a-zA-Z0-9\-\_]/, "_")
            {title: title, view_id: i, filenamepart: filenamepart}
          else
            $log.error(I18n.t("could not find extract with number") + " #{i}", [1, 1], [1000, 1000])
            nil
          end
        end.compact
        result
      end

      def _get_key_by_accidentals(key_model)
        {
            #0=ionian(major), 1=dorian, 2=phrygian, 3=lydian, 4=mixolydia, 5=aeolian(minor) and 6=locrian

            7  => ['C#', 'D#Dor', 'E#Phr', 'F#Lyd', 'G#Mix', 'A#m', 'B#Loc'],
            6  => ['F#', 'G#Dor', 'A#Phr', 'BLyd', 'C#Mix', 'D#m', 'E#Loc'],
            5  => ['B', 'C#Dor', 'D#Phr', 'ELyd', 'F#Mix', 'G#m', 'A#Loc'],
            4  => ['E', 'F#Dor', 'G#Phr', 'ALyd', 'BMix', 'C#m', 'D#Loc'],
            3  => ['A', 'BDor', 'C#Phr', 'DLyd', 'EMix', 'F#m', 'G#Loc'],
            2  => ['D', 'EDor', 'F#Phr', 'GLyd', 'AMix', 'Bm', 'C#Loc'],
            1  => ['G', 'ADor', 'BPhr', 'CLyd', 'DMix', 'Em', 'F#Loc'],
            0  => ['C', 'DDor', 'EPhr', 'FLyd', 'GMix', 'Am', 'BLoc'],
            -1 => ['F', 'GDor', 'APhr', 'BbLyd', 'CMix', 'Dm', 'ELoc'],
            -2 => ['Bb', 'CDor', 'DPhr', 'EbLyd', 'FMix', 'Gm', 'ALoc'],
            -3 => ['Eb', 'FDor', 'GPhr', 'AbLyd', 'BbMix', 'Cm', 'DLoc'],
            -4 => ['Ab', 'BbDor', 'CPhr', 'DbLyd', 'EbMix', 'Fm', 'GLoc'],
            -5 => ['Db', 'EbDor', 'FPhr', 'GbLyd', 'AbMix', 'Bbm', 'CLoc'],
            -6 => ['Gb', 'AbDor', 'BbPhr' 'CbLyd', 'DbMix', 'Ebm', 'FLoc'],
            -7 => ['Cb' 'DbDor', 'EbPhr' 'FbLyd', 'GbMix', 'Abm', 'BbLoc'],
        }[key_model[:k_sf]][key_model[:k_mode]]
      end

      def _make_metadata
        key           = _get_key_by_accidentals(@abc_model[:voices].first[:voice_properties][:key])
        o_key         = _get_key_by_accidentals(@abc_model[:voices].first[:voice_properties][:okey])
        o_key_display = ""
        o_key_display = "(Original in #{o_key})" unless key == o_key

        tempo_note = @abc_model[:voices].first[:voice_properties][:sym] rescue nil

        if tempo_note && tempo_note[:tempo_notes]
          duration      = tempo_note[:tempo_notes].map { |i| i / ABC2SVG_DURATION_FACTOR }
          bpm           = tempo_note[:tempo].to_i
          tempo_display = @info_fields[:Q].join(" ")
        else
          duration      = [0.25]
          bpm           = 120
          tempo_display = '1/4=120'
        end
        bpm = 120 unless bpm >= 1

        @meta_data = {number:        (@info_fields[:X].first),
                      composer:      (@info_fields[:C] or []).join("\n"),
                      title:         (@info_fields[:T] or []).join("\n"),
                      filename:      (@info_fields[:F] or []).join("\n"),
                      tempo:         {duration: duration, bpm: bpm, sym: tempo_note},
                      tempo_display: tempo_display,
                      meter:         @info_fields[:M],
                      key:           key,
                      o_key:         o_key_display
        }
      end

      private


      def _mkznid(voice_element)
        result = @remark_table[voice_element[:time]]
        if result
          unless result.match(/[a-z][a-zA-Z0-9_]*/)
            start_pos = charpos_to_line_column(voice_element[:istart])
            end_pos   = charpos_to_line_column(voice_element[:iend])
            $log.error("illegal character in of [r:] (must be of [a-z][a-z0.9_])", start_pos, end_pos)
            result = nil
          end
        else
          result = "#{voice_element[:time]}" unless result
        end

        result
      end

      # This resets the converter
      # to be called when beginning a new voice
      def _reset_state

        @countnames = (1 .. 32).to_a.map { |i| [i, 'e', 'u', 'e'] }.flatten

        @jumptargets = {} # the lookup table for jumps

        @is_first_measure   = true # this is the first measure after a meter statement
        @measure_start_time = 0
        @measure_count      = 0

        @next_note_marks   = {measure:          false,
                              repeat_start:     false,
                              variant_ending:   false,
                              variant_followup: false
        }
        @previous_new_part = []
        @previous_note     = nil
        @remark_table      = {}
        @repetition_stack  = []
        @variant_endings   = [[]] # nested array of variant ending groups
        @tie_started       = false
        @variant_no        = 0
        @slurstack         = 0
        @tuplet_count      = 1
        @tuplet_down_count = 1
        @countby           = nil # bount by part of a whole note: 8 => count 1/8
        @wmeasure          = 0 # length of a measure. Set to 0 unless measure is specified

      end

      def _transform_voices
        hn_voices = @abc_model[:voices].each_with_index.map do |voice_model, voice_index|
          voice_id = "v_#{voice_index + 1}" # to make it more intuitive fore the user
          result   = _transform_voice(voice_model, voice_id)
          result   += _make_variant_ending_jumps(voice_id) unless result.empty?
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

        voice_model[:symbols].each do |voice_model_element|
          voice_model_element[:start_pos] = charpos_to_line_column(voice_model_element[:istart])
          voice_model_element[:end_pos]   = charpos_to_line_column(voice_model_element[:iend])
        end

        @pitch_providers = voice_model[:symbols].map do |voice_model_element|
          voice_model_element if voice_model_element[:type].to_s == note_id
        end

        result = voice_model[:symbols].each_with_index.map do |voice_model_element, index|
          type = @abc_model[:music_types][voice_model_element[:type]]
          begin
            result = self.send("_transform_#{type}", voice_model_element, index, voice_index)
          rescue Exception => e
            $log.error("Bug: #{e}", charpos_to_line_column(voice_model_element[:istart]))
            nil
          end
          result
        end

        # handle the jumplines
        result    = result.flatten
        jumplines = result.inject([]) do |jumplines, element|
          jumplines << _make_jumplines(element, voice_index)
          jumplines
        end

        #handle notebound annotations

        notebound_annotations = result.inject([]) do |notebound_annotations, element|
          notebound_annotations << _make_notebound_annotations(element, voice_index)
        end

        result += (jumplines + notebound_annotations)

        result = result.flatten.compact

        if (result.count == 0)
          num_voice_index = voice_index.gsub("v_", '').to_i

          unless @score_statements.last && @score_statements.last[:sy][:voices][num_voice_index - 1][:range] == -1
            $log.error("#{I18n.t("Empty voice")} #{num_voice_index}:  V:#{voice_model[:voice_properties][:id]}")
            # charpos_to_line_column(@score_statements.last[:istart] -1 ),
            # charpos_to_line_column(@score_statements.last[:iend] -1 )
            # )
          end
          #result = nil
        end
        result
      end

      # investigate if we should draw a bar on the very first note
      # algrithm: Compare time of first bar wmeasuere (the length of a measure)
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
          @next_note_marks[:measure] = true if bars.first and (@measure_start_time == 0) #bars[2] and (bars.first[:time] == (bars[2][:time] - bars[1][:time]))
        end
      end

      def _bar_is_repetition_end?(type)
        type =~ /^:.*$/
      end

      def _transform_bar(voice_element, index, voice_index)
        result = []
        type   = voice_element[:bar_type]

        text = voice_element[:text]
        distance = _extract_goto_info_from_bar(voice_element).last[:distance] rescue [-10, 10, 15]
        @next_note_marks[:measure]      = true unless voice_element[:invisible] or type =~ /^\:?([\[\]]+)$/ # "]" is not a visible bar - useful for variant ending between measures
        @next_note_marks[:repeat_start] = true if type =~ /^.*:$/

        if voice_element[:rbstart] == 2
          @variant_no                       += 1
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
        # variant_edinngs.last -> the current variant ending group
        # variant_endings.last.last - > the current variant ending within the current variant ending group
        # [:rbstart] check if it is really started
        if (voice_element[:rbstop] == 2) and (!@variant_endings.last.last.nil?) and (@variant_endings.last.last[:rbstart])
          @variant_endings.last.last[:rbstop]     = @previous_note
          @variant_endings.last.last[:repeat_end] = true if _bar_is_repetition_end?(type)

          # here we handle multiple variant endings with end with a repetition
          # where the repetion start is not the very beginning
          #
          if _bar_is_repetition_end?(type) # variant ends with a repeat; push the repotition start
            @pushed_variant_ending_repeat = true
            @repetition_stack.push @repetition_stack.last
          else # variant does not end with a repeat; check if we have pushed a variant repetion and santize the same.
            @repetition_stack.pop if @pushed_variant_ending_repeat and @repetition_stack.count > 1
          end
          #prepare a new variant
          # t_ending group if there is only an rbstop
          unless voice_element[:rbstart] == 2 # create a new group if the stop also starts a new one
            @next_note_marks[:variant_followup] = true
            @variant_endings.push([])
            @variant_no = 0
          end
        end


        result << _transform_bar_repeat_end(voice_element, index, voice_index) if _bar_is_repetition_end?(type)

        # here we handle the case that a repeat is within a measure (textcase 3016 in measure repeats)
        # it shall not create a bar in harpnotes
        if type.include? ':'
          unless false # @is_first_measure ## first measure after a meter statment cannot suppress bar
            @next_note_marks[:measure] = false unless (voice_element[:time] - @measure_start_time) == @wmeasure
          end
        end

        @is_first_measure = false
        result
      end

      def _transform_part(voice_element, index, voice_index)
        if @part_table[voice_element[:time]]
          start_pos = charpos_to_line_column(voice_element[:istart])
          end_pos   = charpos_to_line_column(voice_element[:iend])
          $log.error("abc:#{start_pos.first}:#{start_pos.last} Error: " + I18n.t("Multiple parts for same note"), start_pos, end_pos)
        end
        @part_table[voice_element[:time]] = voice_element[:text]
        nil
      end

      def _transform_remark(voice_element, index, voice_index)
        if @remark_table[voice_element[:time]]
          start_pos = charpos_to_line_column(voice_element[:istart])
          end_pos   = charpos_to_line_column(voice_element[:iend])
          $log.error("abc:#{start_pos.first}:#{start_pos.last} Error: " + I18n.t("Multiple remarks for same note"), start_pos, end_pos)
        end
        @remark_table[voice_element[:time]] = voice_element[:text]
        nil
      end

      # @param [Object] voice_index this is not used but keeps the inteface consistent with _transform_rest
      def _transform_note(voice_element, index, voice_index)
        origin             = _parse_origin(voice_element)
        start_pos, end_pos = origin[:startChar], origin[:endChar]

        #handle tuplets
        tuplet, tuplet_end, tuplet_start = _parse_tuplet_info(voice_element)

        decorations = _parse_decorations(voice_element)

        _transform_measure_start(voice_element)

        # transform the individual notes
        duration = _convert_duration(voice_element[:notes].first[:dur])

        notes = voice_element[:notes].map do |the_note|
          #duration = _convert_duration(the_note[:dur])

          result               = Harpnotes::Music::Note.new(the_note[:midi], duration)
          result.decorations   = decorations
          result.measure_count = @measure_count
          result.count_note    = _transform_count_note(voice_element)
          result.time          = voice_element[:time]
          result.znid          = _mkznid(voice_element)
          result.origin        = origin
          result.start_pos     = charpos_to_line_column(start_pos) # get column und line number of abc_code
          result.end_pos       = charpos_to_line_column(end_pos)

          result.tuplet       = tuplet
          result.tuplet_start = tuplet_start
          result.tuplet_end   = tuplet_end
          result.variant      = @variant_no
          result
        end

        # the postprocessing
        # support the case of repetitions from the very beginning


        result = []
        if notes.count == 1
          result << notes.first
        else
          # handle duration and orign
          synchpoint               = Harpnotes::Music::SynchPoint.new(notes)
          first_note               = notes.first # note it does not matter if it is first or last
          synchpoint.znid          = _mkznid(voice_element)
          synchpoint.decorations   = decorations
          synchpoint.measure_count = @measure_count
          synchpoint.count_note    = _transform_count_note(voice_element)
          synchpoint.time          = first_note.time
          synchpoint.duration      = first_note.duration
          synchpoint.origin        = first_note.origin
          synchpoint.start_pos     = first_note.start_pos
          synchpoint.end_pos       = first_note.end_pos

          #handle tuplets of synchpoint
          synchpoint.tuplet       = first_note.tuplet
          synchpoint.tuplet_start = first_note.tuplet_start
          synchpoint.tuplet_end   = first_note.tuplet_end

          result << synchpoint
        end

        # if there is no (even virtual repetition start - declare one)
        if @repetition_stack.empty?
          @repetition_stack << result.last
        end

        # handle ties
        # note that abc2svg only indicates tie start by  voice_element[:ti1] but has no tie end
        result.first.tie_end   = @tie_started
        @tie_started           = !voice_element[:ti1].nil?
        result.first.tie_start = @tie_started


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

        # note that this updates the reasult
        # this is the reason that it is an array
        _make_repeats_jumps_annotations(result, voice_element, voice_index)

        result
      end

      def _transform_measure_start(voice_element)
        if @next_note_marks[:measure]
          @measure_count      += 1
          @measure_start_time = voice_element[:time] # for count_notes
        end
      end


      # this generates the count notes
      # Approach
      # 1. have a lookup table for one full bar how to count: 1eue 2eue 3eue ...
      # 2. compute the coount numbers covered by a particlar note:
      # 3. lookup in the coountnames: REsult maybe something like eu3e or 3eue or 2eue3eue
      # 4. split on notes (numbers) and fracts (eue)
      # 5. set trailing fracts (fracts with i > 1) to nil (e.g. 4eue) -> "4"
      # 6. combine ths tuff again
      # 7. normalize "ue" to "u"
      def _transform_count_note(voice_element)
        if @countby
          count_base  = ABC2SVG_DURATION_FACTOR / @countby
          count_start = 4 * (voice_element[:time] - @measure_start_time) / count_base # literal 4: divide one beat by 4: 1eue
          count_end   = count_start + 4 * voice_element[:dur] / count_base

          if (count_start % 1 == 0) and (count_end % 1) == 0
            count_range = (count_start ... count_end).to_a.map { |i| @countnames[i] }.join
          else
            if (count_start % 1) == 0 # start of tuplet
              count_range = (count_start ... count_end.ceil).to_a.map { |i| @countnames[i] }.join('')
            else
              count_range = '' #(count_start % 1).to_s[1..2] # we are out of sync, don't know what to do.
            end
          end

          # clenaup count_range

          notes  = count_range.split(/[eui\?]+/)
          fracts = count_range.split(/[0-9]+/)
          fracts = [''] if fracts.empty? # https://github.com/bwl21/zupfnoter/issues/84

          # now cleanup contnotes
          # todo:can we use regular expressions for this
          fracts.each_with_index { |v, i| fracts[i] = nil if i >= 1 }
          count_range = fracts.zip(notes).flatten.compact.join(" ").strip.split.join("-")
          count_range = count_range.gsub('ue', 'u')
          count_range
        end
      end

      def _convert_duration(raw_duration)
        # 128 to limit the maximum duration to the error note
        duration = [128, ((raw_duration / ABC2SVG_DURATION_FACTOR) * @_shortest_note).round].min
        duration
      end

      def _transform_staves(voice_element, index, voice_index)
        @score_statements = [] unless @score_statements
        @score_statements.push voice_element
        if @score_statements.length > 1
          start_pos = charpos_to_line_column(voice_element[:istart])
          end_pos   = charpos_to_line_column(voice_element[:iend])
          $log.error(%Q{#{I18n.t("you have multiple %%score statements")}: #{@score_statements.length}}, start_pos, end_pos)
        else
        end
      end

      # @param [Integer] index  - this is required to determine the pitch of the rest
      def _transform_rest(voice_element, index, voice_index)

        origin             = _parse_origin(voice_element)
        start_pos, end_pos = origin[:startChar], origin[:endChar]

        pitch_notes = [@pitch_providers[0 .. index].compact.last, @pitch_providers[index .. -1].compact.first]

        pitch_notes = [(pitch_notes.first or pitch_notes.last)] if $conf['restposition.default'] == :previous
        pitch_notes = [(pitch_notes.last or pitch_notes.first)] if $conf['restposition.default'] == :next

        decorations = _parse_decorations(voice_element)

        pitch_notes = pitch_notes.compact
        unless pitch_notes.empty?
          pitch_notes = pitch_notes.map { |pitch_note| pitch_note[:notes].last[:midi] }
          pitch       = (average_pitch = pitch_notes.inject(:+) / pitch_notes.length).floor.to_i
        else
          pitch = 60
        end

        if (pitch.nil?)
          raise("undefined pitch")
          pitch = 60
        end

        _transform_measure_start(voice_element)
        duration = _convert_duration(voice_element[:notes].first[:dur])

        tuplet, tuplet_end, tuplet_start = _parse_tuplet_info(voice_element)

        result               = Harpnotes::Music::Pause.new(pitch, duration)
        result.measure_count = @measure_count
        result.decorations   = decorations
        result.count_note    = _transform_count_note(voice_element)
        result.znid          = _mkznid(voice_element)
        result.time          = voice_element[:time]
        result.origin        = _parse_origin(voice_element)
        result.start_pos     = charpos_to_line_column(start_pos) # get column und line number of abc_code
        result.end_pos       = charpos_to_line_column(end_pos)
        result.variant       = @variant_no

        #handle tuplets of synchpoint
        result.tuplet       = tuplet
        result.tuplet_start = tuplet_start
        result.tuplet_end   = tuplet_end

        result.visible      = false if voice_element[:invis]

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

      def _transform_tempo(voice_element, index, voice_id)

        # note that abc2svd yields Tune based Tempo in voice_propoeties.sym as well as in symbols
        # therefore we need to filter the Tune based tempo ...
        unless voice_element[:istart] == @meta_data[:tempo][:sym][:istart]
          start_pos = charpos_to_line_column(voice_element[:istart])
          end_pos   = charpos_to_line_column(voice_element[:iend])
          $log.error("abc:#{start_pos.first}:#{start_pos.last} Error: " + I18n.t("tempo change not suported by zupfnoter"), start_pos, end_pos)
        end
      end

      def _transform_yspace(voice_element, index)
        #  This is a stub for future expansion
      end

      def _transform_bar_repeat_end(voice_element, index, voice_id)
        level = @repetition_stack.length
        if level == 1
          start = @repetition_stack.last
        else
          start = @repetition_stack.pop
        end

        goto_info = _extract_goto_info_from_bar(voice_element)
        distance = goto_info.last[:distance] rescue [2]
        if distance.count > 1
          raise "too many distance values for repeat end. Need only one #{distance}"
        end


        # handle the case that a repetition ends with a rest
        # in this case the pitch of the rest shall be the pitch
        # of the previous note
        if @previous_note.is_a? Harpnotes::Music::Pause
          @previous_note.pitch = @previous_note.prev_pitch if $conf['restposition.repeatend'] == :previous
        end

        distance                         = distance.first
        @next_note_marks[:first_in_part] = true

        entity   = @previous_note
        conf_key = "notebound.c_jumplines.#{voice_id}.#{entity.znid}.p_repeat"

        [Harpnotes::Music::Goto.new(@previous_note, start, distance: distance, is_repeat: true, level: level, conf_key: conf_key)]
      end

      def _transform_grace
        nil #
      end

      def _transform_format(voice_element)
        nil
      end

      def _transform_key(voice_element)
        nil
      end


      # here we handle meter changes
      # there are some special cases to consider
      # * meter changes within ia measure - ensure that countnotes are computed correctly
      # * meter changes before a in measuer repeat - so we have a bar which is not a relevant one
      def _transform_meter(voice_element)
        @is_first_measure = true

        @wmeasure = voice_element[:wmeasure]
        @countby = voice_element[:a_meter].first[:bot].to_i rescue nil

        nil
      end

      def _transform_block(voice_element)
        nil
      end

      def _transform_clef(voice_element)
        nil
      end

      def _make_variant_ending_jumps(voice_id)
        result           = []
        lastvariantgroup = (@variant_endings.last.empty? ? -2 : -1)
        @variant_endings[0 .. lastvariantgroup].each do |variant_ending_group|
          # variant ending startlines

          distance  = variant_ending_group[0][:distance]
          entity    = variant_ending_group.first[:rbstop]
          conf_base = "notebound.c_jumplines.#{voice_id}.#{entity.znid}"

          if variant_ending_group[-1][:is_followup]
            lastvariant = -2 # need to suppres startlines for the pseudo variation caused by followup notes
          else
            lastvariant = -1
          end


          # variant ending startlines
          variant_ending_group[1 .. lastvariant].each_with_index do |variant_ending, index|
            conf_key = %Q{#{conf_base}.#{index}.p_begin}
            result << Harpnotes::Music::Goto.new(variant_ending_group[0][:rbstop], variant_ending[:rbstart], conf_key: conf_key, distance: distance[0], from_anchor: :after, to_anchor: :before)
          end

          # variant ending endlines
          variant_ending_group[1 .. -3].each_with_index do |variant_ending, index|
            # note that the repeat line is drawn by the _transform_bar_repeat_end
            # so we do not have the variant end line in this case
            unless variant_ending[:repeat_end]
              #  conf_key = %Q{#{conf_base}.#{index}.p_end}
              conf_key = %Q{#{conf_base}.p_end}
              result << Harpnotes::Music::Goto.new(variant_ending[:rbstop], variant_ending_group[-1][:rbstart], conf_key: conf_key, distance: distance[1], from_anchor: :after, to_anchor: :before, vertical_anchor: :to)
            end
          end

          # variant ending followupliens
          if variant_ending_group[-1][:is_followup]
            conf_key = %Q{#{conf_base}.p_follow}
            result << Harpnotes::Music::Goto.new(variant_ending_group[-2][:rbstop], variant_ending_group[-1][:rbstart], conf_key: conf_key, distance: distance[2], from_anchor: :after, to_anchor: :before, vertical_anchor: :to)
          end
        end
        result
      end

      # make the jumplines if an explicit goto of an element
      # @param [Playable] element - an element of the converted voice
      def _make_jumplines(element, voice_id)
        if element.is_a?(Harpnotes::Music::Playable)
          goto_infos = _extract_goto_info_from_bar(element.origin[:raw_voice_element])
          goto_infos.inject([]) do |result, goto_info|
            targetname = goto_info[:target]
            target     = @jumptargets[targetname]
            conf_key   = "notebound.c_jumplines.#{voice_id}.#{element.znid}.p_goto"


            argument = goto_info[:distance].first || 2
            if target.nil?
              $log.error("target '#{targetname}' not found in voice at #{element.start_pos_to_s}", element.start_pos, element.end_pos)
            else
              result << Harpnotes::Music::Goto.new(element, target, conf_key: conf_key, distance: argument) #todo: better algorithm
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
          chords = _extract_chord_lines(entity.origin[:raw_voice_element])
          chords.each_with_index do |name, index|

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
                  annotation = {text: text, style: :regular}
                when "<"
                  entity.shift = {dir: -1, size: text, style: :regular}
                  entity.notes.each { |note| note.shift = {dir: -1, size: text, style: :regular} } if entity.is_a? Harpnotes::Music::SynchPoint
                when ">"
                  entity.shift = {dir: 1, size: text, style: :regular}
                  entity.notes.each { |note| note.shift = {dir: 1, size: text, style: :regular} } if entity.is_a? Harpnotes::Music::SynchPoint
                else
                  annotation = nil # it is not an annotation
              end

              if annotation
                notepos  = [pos_x, pos_y].map { |p| p.to_f } if pos_x
                position = notepos || annotation[:pos] || $conf['defaults.notebound.annotation.pos']
                conf_key = "notebound.annotation.#{voice_id}.#{entity.znid}" if entity.znid # this is for backwards conpatibility reasons
                conf_key = "notebound.annotation.#{voice_id}.#{entity.znid}.#{index}" if index > 0
                result << Harpnotes::Music::NoteBoundAnnotation.new(entity, {style: annotation[:style], pos: position, text: annotation[:text]}, conf_key)
              end
            else
              # $log.error("syntax error in annotation: #{name}")
            end
          end
        end
        result
      end

      # this appends repeats, jumplines, annotations to the resultl
      # it also matainss @previous_note, prev_pitch, next_pitch
      #
      # @param [Array of Harpnotes::Music:Entity:] harpnote_elements elements created by the current note/rest
      # @param [Object] voice_element: voice element as provided by abc2svg
      # @param [integer] voice_id the id of the voice according to the sequence sequence in the ABC-Code. First voice is 1
      #
      # note that this method upddates its fist parameter
      def _make_repeats_jumps_annotations(harpnote_elements, voice_element, voice_id)
        the_note   = harpnote_elements.first
        part_label = @part_table[voice_element[:time]]

        # we maintain the prev_pitch/next_pitch
        # for more detailed layout control of
        # repeatmarks, tuplets etc.
        if @previous_note
          @previous_note.next_pitch         = the_note.pitch
          @previous_note.next_playable      = the_note
          @previous_note.next_first_in_part = true if part_label
          the_note.prev_pitch               = @previous_note.pitch
          the_note.prev_playable            = @previous_note
        end


        @previous_note = the_note # notes.first # save this for repeat lines etc.
        znid           = the_note.znid

        # handle parts as annotation

        if part_label
          conf_key = "notebound.partname.#{voice_id}.#{znid}" if znid #$conf['defaults.notebound.variantend.pos']
          position = $conf['defaults.notebound.partname.pos']

          harpnote_elements.first.first_in_part = true
          harpnote_elements << Harpnotes::Music::NoteBoundAnnotation.new(harpnote_elements.first, {style: :regular, pos: position, text: part_label}, conf_key)
        end

        # handle repeats
        if @next_note_marks[:repeat_start]
          @previous_note.first_in_part = true
          @repetition_stack << harpnote_elements.first
          @next_note_marks[:repeat_start] = false
        end

        if @next_note_marks[:first_in_part]
          @previous_note.first_in_part     = true
          @next_note_marks[:first_in_part] = false
        end

        # handle variant endings
        if @next_note_marks[:variant_ending]
          text                                  = @next_note_marks[:variant_ending][:text]
          conf_key                              = "notebound.variantend.#{voice_id}.#{znid}" if znid #$conf['defaults.notebound.variantend.pos']
          position                              = $conf['defaults.notebound.variantend.pos']
          harpnote_elements.first.first_in_part = true
          harpnote_elements << Harpnotes::Music::NoteBoundAnnotation.new(harpnote_elements.first, {style: :regular, pos: position, text: text, policy: :Goto}, conf_key)
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
              start_pos = charpos_to_line_column(bar[:istart])
              end_pos   = charpos_to_line_column(bar[:iend])
              $log.error("Syntax-Error in Jump anotation", start_pos, end_pos)
              #raise "Syntax-Error in Jump annotation: #{line}"
            end
          end
          result
        end
        result
      end


      def _parse_decorations(voice_element)
        a_dd   = voice_element[:a_dd] || []
        result = a_dd.map do |dd|
          result = dd[:name].to_sym
        end

        result.flatten.select { |i| [:fermata, :emphasis].include? i }
        #[:fermata]
      end

      # thie provides a minimized origin
      # to be used for backannotation purposes
      def _parse_origin(voice_element)
        {
            startChar:         voice_element[:istart],
            endChar:           voice_element[:iend],
            start_pos:         voice_element[:start_pos],
            end_pos:           voice_element[:end_pos],
            raw_voice_element: voice_element # required extract_goto_info
        }
      end

      # this parses the slur information from abc2svg
      # every slur has 4 bits
      # so the slurs are parsed by shifting by 4 and masking 4 bits
      def _parse_slur(slurstart)
        startvalue = slurstart || 0
        result     = []
        while startvalue > 0 do
          result.push startvalue & 0xf
          startvalue >>= 4
        end
        result
      end

      # this parses the tuplet_information out of the voice_elment
      def _parse_tuplet_info(voice_element)
        if voice_element[:in_tuplet]

          # check for nested tuplets
          if voice_element[:tp1]
            start_pos = charpos_to_line_column(voice_element[:istart])
            end_pos   = charpos_to_line_column(voice_element[:iend])
            $log.error("abc:#{start_pos.first}:#{start_pos.last} Error: " + I18n.t("Nested Tuplet"), start_pos, end_pos)
          end

          #find tuplet start
          if voice_element[:tp0]
            @tuplet_p    = voice_element[:tp0]
            tuplet_start = true
          else
            tuplet_start = nil
          end

          # we are within a tuplet
          tuplet = @tuplet_p # the size of tuplet (3, etc.

          # detect tuiplet end
          if voice_element[:te0]
            tuplet_end = true
          else
            tuplet_end = nil
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
