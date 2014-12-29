require 'rspec'
require '../src/confstack'
require 'yaml'
require 'json'

describe 'Confstack' do

  it 'should initialize' do

    conf = Confstack.new

    expect(conf.is_a?(Confstack)).to eq true
  end

  it 'accesses a key' do
    conf = Confstack.new
    source = {a: {b: {c: "c"}}}
    conf.push({a: {b: {c: "c"}}})

    expect(conf.get("a.b.c")).to eq 'c'
  end


  it 'accesses a key' do
    conf = Confstack.new
    source = {a: {b: {c: "c"}}}
    conf.push({a: {b: {c: "c"}}})

    expect(conf.get("a.b.d")).to eq nil
  end

  it 'can push and pop a hash' do
    conf = Confstack.new
    source = {a: {b: {c: "c"}}}
    conf.push({a: {b: {c: "c"}}})
    expect(conf.get("a.b.c")).to eq 'c'
    expect(conf.get("a.b.d")).to eq nil

    conf.push({a: {b: {c: "c1", d: "d"}}})
    expect(conf.get("a.b.d")).to eq 'd'
    expect(conf.get("a.b.c")).to eq 'c1'

    conf.push({a: {b: {d: "d1"}}})
    expect(conf.get("a.b.d")).to eq 'd1'

    conf.push({a1: "hugo"})
    expect(conf.get("a.b.c")).to eq 'c1'
    expect(conf.get("a1")).to eq 'hugo'

    conf.pop
    conf.pop
    conf.pop
    expect(conf.get("a.b.c")).to eq 'c'
    expect(conf.get("a.b.d")).to eq nil
  end

  it 'lists the keys' do
    conf = Confstack.new
    source = {a1: {b1: {c1: "c"}}}
    conf.push(source)
    conf.push(source)
    conf.push({a1: {b1: {d1: 1}}})
    conf.push({a1: {b2: {d2: 1}}})
    conf.push({a2: 1})


    expect(conf.keys).to eq ["a1", "a1.b1", "a1.b1.c1", 'a1.b1.d1', 'a1.b2', 'a1.b2.d2', 'a2']
  end

  it 'flattens' do
    conf = Confstack.new
    source = {a: {b: {c: "c", d: "d"}}}
    conf.push(source)
    conf.push({a: {b: {c: "cx"}}})

    conf.push({a1: "hugo", a2: {b1: {c: "ci"}}})
    mainkey = conf.keys
    conf_flat = conf.get()

    expect(conf_flat).to eq(
                             {
                                 a: {b: {c: 'cx', d: 'd'}},
                                 a1: 'hugo',
                                 a2: {b1: {c: 'ci'}}
                             })

    conf2 = Confstack.new
    conf2.push(conf_flat)
    expect(mainkey).to eq conf2.keys

  end

  it 'loads from yaml file' do
    conf = Confstack.new
    conf_yaml = File.open("../src/default_profile.yaml").read
    source = YAML.load(conf_yaml)
    conf.push(source)
    expect(source.to_json).to eq conf.get().to_json
  end
end