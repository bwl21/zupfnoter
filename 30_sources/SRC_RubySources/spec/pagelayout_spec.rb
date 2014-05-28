require 'prawn'
require "prawn/measurement_extensions"

GRID_MM = 115/10
GRID_Y_MM = 4
SHEET_SIZE_MM = 290

NOTE_NAMES = ["",
	"G", "G#", "A", "A#", "H", 
	"c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "h",
	"c'", "c'#", "d'", "d'#", "e'", "f'", "f'#", "g'", "g'#", "a'", "a'#", "h'",
	"c''", "c''#", "d''", "d'#", "e''", "f''", "f''#", "g''", "g''#", "a''", "a''#", "h''"
]

NOTE_VALUES = Hash[NOTE_NAMES.each_with_index.map { |value, index| [value, index] }]

NOTES = ["c", "d", "e", "f", "g", "g", "a", "a", "a", "a", "g"]

describe "Zufnoter Page layout"  do

  it "creates the right page size" do

    pdf = Prawn::Document.new(
      :page_size   => [841.89, 1190.55],
      :page_layout => :landscape,
      :margin => [10.mm, 0, 0, 0]

    )

    pdf.stroke_color 50, 100, 0, 0

    (1 .. 40) .each do|i|
    	x=i*GRID_MM.mm
    	pdf.line_width=0.1.pt
    	pdf.line [x, 290.mm], [x, 10.mm]
    	pdf.stroke
    	pdf.draw_text NOTE_NAMES[i], :at => [x-2.mm ,6.mm]
    end 
    
    y=SHEET_SIZE_MM / GRID_Y_MM # vertical height / by ygrid
    oldpos = nil
    pdf.stroke_color 255, 255, 255, 0

    NOTES.each_with_index do |v, i|
    	x = NOTE_VALUES[v] * GRID_MM.mm
    	y -=1

    	newpos = [x, 0*GRID_Y_MM.mm + y * GRID_Y_MM.mm]

    	pdf.line oldpos, newpos  if oldpos
        pdf.stroke
    	oldpos = newpos
    	pdf.fill_and_stroke_circle newpos, (0.9*GRID_Y_MM/2).mm
    end

    pdf.render_file "testoutput/pagesize.pdf"
    cmd = "pdfposter -pa3 testoutput/pagesize.pdf testoutput/pagesize_poster.pdf"
    puts `#{cmd}`
  end

end
