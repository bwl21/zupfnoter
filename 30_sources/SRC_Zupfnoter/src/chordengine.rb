class Chordengine

  def initialize(key)

    root           = 0
    minor_second   = 1
    major_second   = 2
    minor_third    = 3
    major_third    = 4
    perfect_fourth = 5
    tritone        = 6
    perfect_fifth  = 7
    minor_sixth    = 8
    major_sixth    = 9
    minor_seventh  = 10
    major_seventh  = 11

    @chordtypes = {
        'Maj'          => [root, major_third, perfect_fifth],
        'min'          => [root, minor_third, perfect_fifth],
        'Diminished'   => [root, minor_third, tritone],
        'Augmented'    => [root, major_third, minor_sixth],
        'Sus2'         => [root, major_second, perfect_fifth],
        'Sus4'         => [root, perfect_fourth, perfect_fifth],
        'add2'         => [root, major_second, major_third, perfect_fifth],
        '6'            => [root, major_third, perfect_fifth, major_sixth],
        '6/9'          => [root, major_third, perfect_fifth, major_sixth, major_second],
        'Maj7'         => [root, major_third, perfect_fifth, major_seventh],
        'Dominant 7th' => [root, major_third, perfect_fifth, minor_seventh],
        'min7'         => [root, minor_third, perfect_fifth, minor_seventh],
        '7b5'          => [root, major_third, tritone, minor_seventh],
        '7#5'          => [root, major_third, minor_sixth, minor_seventh],
        'min9'         => [root, minor_third, perfect_fifth, minor_seventh, major_second],
        '9'            => [root, major_third, perfect_fifth, minor_seventh, major_second],
        'add9'         => [root, major_third, perfect_fifth, major_second],
        '11'           => [root, major_third, perfect_fifth, minor_seventh, major_second, perfect_fourth],
        '13'           => [root, major_third, perfect_fifth, minor_seventh, major_second, perfect_fourth, major_sixth]
    }

    @chordsymbols =
        {
            ''    => 'Maj',
            'M'   => 'Maj',
            'm'   => 'min',
            'm7'   => 'min7',
            'aug' => 'Augmented',
            'dim' => 'Diminished',
            '+'   => 'Augmented',
            '°'   => 'Diminished',
            'dom' => 'Maj',
            '6'   =>  '6',
            '7'   => 'Dominant 7th',
            'sus' => 'Sus4'
        }

    # todo: this table should be for step and mode
    # %
    # %
    # % C:  C Am F Dm7
    # % D:  G, Dm F6
    # % E:
    @chordstofind =
        {
            ''    => 'Maj',
            'dim' => 'Diminished',
            '+'   => 'Augmented',
            #            '°'   => 'Diminished',
            '6'   => '6',
            '7'   => 'Dominant 7th',
            'sus' => 'Sus4',
            "m7" => 'min',
            "m" => 'min'
        }


    # todo: notenames as sharp_mode
    #
    @notenames = {
        sharp: {
            major: %W{C C# D D# E F F# G G# A A# B},
            minor: {}
        },
        flat:  {
            major: %W{C Db D Eb E F Gb G Ab A Bb B},
            minor: {}
        }
    }

    @notenames_sharp = %W{C C# D D# E F F# G G# A A# B}
    @midi_sharp      = Hash[@notenames_sharp.each_with_index.to_a]
    @notenames_flat  = %W{C Db D Eb E F Gb G Ab A Bb B}
    @midi_flat       = Hash[@notenames_flat.each_with_index.to_a]
    @midi_by_name    = @midi_flat.merge(@midi_sharp)
  end

  def chordnotes(chordsymbol, style = "#")
    chordparts = chordsymbol.strip.match(/([a-gA-G][#b]?)(.*)/)
    if chordparts
      root = @midi_by_name[chordparts[1]]

      mode  = @chordsymbols[chordparts[2]] || chordparts[2]
      chord = @chordtypes[mode]

      if chord.nil?
        chord = []
      end
    else
      chord = []
    end

    notenames = style == '#' ? @notenames_sharp : @notenames_flat
    result    = chord.map { |i| (i + root) % 12 }.sort.map { |i| notenames[i] }

    return result
  end

  def chordtable
    retval = {}
    @notenames_sharp.product(@chordstofind.keys).each do |root, type|
      chordsymbol         = "#{root}#{type}"
      result              = chordnotes(chordsymbol, "#")
      retval[chordsymbol] = result
    end
    retval
  end

  def chordfor(notes)
    return [] if notes.empty?
    invertedchordtable = chordtable.keys.group_by { |k| chordtable[k] }
    midinotes          = tomidi(notes.map { |i| i.strip }).compact.sort
    chords             = invertedchordtable.keys.select { |key| (tomidi(key) & midinotes) == midinotes }
    chords.map { |i| invertedchordtable[i] }.flatten
  end

  def tomidi(notes)
    notes.map { |i| @midi_by_name[i.strip] }
  end
end