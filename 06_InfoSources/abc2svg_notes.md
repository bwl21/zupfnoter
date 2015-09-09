# handling of Key

# element names

istart
:   Startposition in abc

iend
:   endposition in abc

key
: the resulting key

k_delta
:   halftones of key shift (not transposition ...)

k_sf
:   number of accidentials; + => sharps - => flats

okey
:   the orginal key

transpose
:   


# info from JEF

Hi Bernhard,

On Tue, 18 Aug 2015 14:12:56 +0200
Weichel Bernhard <bernhard.weichel@googlemail.com> wrote:
	[snip]
There is no direct relation between the internal pitches and the MIDI
pitches.
The internal pitches are rather the note offsets in the staves. With a
treble clef, the middle C is 16, D is 17, E is 18...
The translation to MIDI pitch depends on the key signature and on the
previous accidentals. This is done in abc2svg_play-1.js, function pit2f().

I understand that. It was the same with abcjs. For this, I had created a call "AbcPitchProvider" which had a method get_midi_pitch!(note) was called note by note and handled all these things. My intention was a method [for example annotate_pitches(voice_tb)] which iterates through the voice and computes the midi-pitches. By this iteration it can consider the key signature and the previous accidentials also the reset of the same on a bar. There are some tricky issues which you have already solved in the player - but to be honest I have big problems to understand that code (my JS - Skills are close to zero;  and the code is very compact :-). I indeed tried to extract some code from abc2svg_play-1.js but totally failed.

The play method add() does all the job to convert a sequence of notes
into a MIDI sequence. You may duplicate this function and replace the
a_e.push() calls by calls to your function.

	[snip]
The transposition is done while parsing the ABC source. The pitches are
translated in the function note_transpose().

This means that the pitches already represent the transposed values.

Right

2.2. I see that the parser reacts on transpose-property of a voice. At least it yields error messages. But I cannot see the effect in SVG or in the model.

Sorry, I don't understand the question.

I mean this.

V:1 clef=treble transpose=2
cdefgabc'

Sorry as I have both abcjs and abc2svg in my system, the messages came from abcjs. This voice propery seems not to be recognized by abc2svg
It is not that important, since we would not use it anyhow.

Oh yes. The parameter 'transpose=' in V: is used for playing only.
As abc2svg is the same as abcm2ps, it is not seen!
Use %%transpose instead.

	[snip]
	It seems to be 1536 * 1/x. Where does these number come from?

This value comes from the initial abc2ps software. It was defined so
that the shortest notes have integer durations.

I see. As a matter of curiosity, is there a motivation that the maximum length is not a power of 2, e.g. 2048?
Nevertheless, also not that important.

I think that this simplifies handling 3-plets.

4. It appears that lyrics is not yet fully represented the model. In only find traces of "w:" - lines, but not of "W:"- lines. Could you alsoe expose W: lines? Would it also be possible to expose the ocntent of "w:" lines as a consecutive text in addition to the representation in the notes (which is great).

The W: lines are part of the formatting stuff, as many other ABC
information fields as the titles T:. These fields are memorizes in the
hash + array variable 'info'.

it seems that this is not accessible by get_abcmodel? I searchd in tsfirst, voice_tb, music_types

If you need it, I may add a method to give you more internal information.

	[snip]
The problem with the model after generation is that some values are
destroyed, as the linkages between the music symbols (the root
'tsfirst' is reset on each output of new music lines and the linkages
are cut at start and at end of these music lines).

As I am dealing with voice_tb only, 	It does not harm that tsfirst is reset.

Yes, but the linkages in the voices are also changed, and at end of
generation, there are only the symbols of the last displayed music line.

-- 
Ken ar c'hentañ	|	      ** Breizh ha Linux atav! **
Jef		|		http://moinejf.free.fr/