require '../src/chordengine'


describe Chordengine do

  it "reports chord notes" do
    a=Chordengine.new(60)
    expect(a.chordnotes("C")).to eq(["C", "E", "G"])
    expect(a.chordnotes("C7")).to eq(["C", "E", "G", "A#"])
    expect(a.chordnotes("C7", 'b')).to eq(["C", "E", "G", "Bb"])
    expect(a.chordnotes("G#9", '#')).to eq(["C", "E", "G", "Bb"])
  end

  it "reports a chordtable" do
    a=Chordengine.new(60)
    require 'json'
    puts a.chordtable.to_json
  end

  it "reports chords for a note" do
    a=Chordengine.new(60)
    expect(a.chordfor(["C", "G", "Bb"])).to eq(%W{C A})

  end

end