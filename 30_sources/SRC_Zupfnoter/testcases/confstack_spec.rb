require 'rspec'
require '../src/confstack2'
require 'yaml'
require 'json'
require 'pry'

describe 'Confstack' do

  it 'should initialize' do

    conf = Confstack.new()

    expect(conf.is_a?(Confstack)).to eq true
  end

  it 'accesses a key' do
    conf   = Confstack.new(false)
    source = {"a" => {"b" => {"c" => "c"}}}
    conf.push({"a" => {"b" => {"c" => "c"}}})

    expect(conf.get("a.b.c")).to eq 'c'
  end


  it 'accesses a key' do
    conf   = Confstack.new
    source = {"a" => {"b" => {"c" => "c"}}}
    conf.push({"a" => {"b" => {"c" => "c"}}})

    expect { conf.get("a.b.d") }.to raise_error("confstack: key not available: a.b.d")
  end

  it 'can replace a hash' do
    conf    = Confstack.new(nil)
    origin  = {"extract" => {"0" => {"lyrics" => {"versepos" => {"0" => [1, 2]}}}}}
    overlay = {'extract' => {'0' => {'lyrics' => {"versepos" => {"0" => [1, 2]}, '0' => {'verse' => '1,2,3', 'poa' => [10, 20]}}}}}
    conf.push(origin)
    conf.push(overlay)
    expect(conf.get).to eq overlay
  end

  it 'can push and pop a hash' do
    conf   = Confstack.new
    source = {"a" => {"b" => {"c" => "c"}}}
    conf.push({"a" => {"b" => {"c" => "c"}}})
    expect(conf.get("a.b.c")).to eq 'c'
    expect { conf.get("a.b.d") }.to raise_error("confstack: key not available: a.b.d")

    conf.push({"a" => {'b' => {'c' => "c1", 'd' => "d"}}})
    expect(conf.get("a.b.d")).to eq 'd'
    expect(conf.get("a.b.c")).to eq 'c1'

    conf.push({"a" => {"b" => {"d" => "d1"}}})
    expect(conf.get("a.b.d")).to eq 'd1'

    conf.push({"a1" => "hugo"})
    expect(conf.get("a.b.c")).to eq 'c1'
    expect(conf.get("a1")).to eq 'hugo'

    conf.pop
    conf.pop
    conf.pop
    expect(conf.get("a.b.c")).to eq 'c'
    expect { (conf.get("a.b.d")) }.to raise_error("confstack: key not available: a.b.d")
  end

  it 'lists the keys' do
    conf   = Confstack.new
    source = {a1: {b1: {c1: "c"}}}
    conf.push(source)
    conf.push(source)
    conf.push({a1: {b1: {d1: 1}}})
    conf.push({a1: {b2: {d2: 1}}})
    conf.push({a2: 1})


    expect(conf.keys).to eq ["confstack", "confstack.env", "a1", "a1.b1", "a1.b1.c1", 'a1.b1.d1', 'a1.b2', 'a1.b2.d2', 'a2']
  end

  it 'flattens' do
    conf   = Confstack.new
    source = {'a' => {'b' => {'c' => "c", 'd' => "d"}}}
    conf.push(source)
    conf.push({'a' => {'b' => {'c' => 'cx'}}})

    conf.push({'a1' => "hugo", 'a2' => {'b1' => {'c' => "ci"}}})
    mainkey   = conf.keys
    conf_flat = conf.get()

    expect(conf_flat).to match(
                             {
                                 'a'         => {'b' => {'c' => 'cx', 'd' => 'd'}},
                                 'a1'        => 'hugo',
                                 'a2'        => {'b1' => {'c' => 'ci'}},
                                 'confstack' => {'env' => "confstack__default"}
                             })

    conf2 = Confstack.new
    conf2.push(conf_flat)
    expect(mainkey).to eq conf2.keys

  end

  it "survives to push nil" do
    conf   = Confstack.new
    source = {'a' => {'b' => {'c' => "c", 'd' => "d", 'e' => nil}}}
    conf.push(source)
    conf.push(nil)
    expect(conf['a']).to eq source['a']

  end


  it "pushes individual keys" do
    conf   = Confstack.new
    source = {'a' => {'b' => {'c' => "c", 'd' => "d"}}}
    conf.push(source)
    conf.push()
    conf['a.b.c']= "ca"
    expect(conf['a.b.c']).to eq "ca"
    conf.pop
    expect(conf['a.b.c']).to eq "c"
  end

  it "pushes a fragment" do
    conf = Confstack.new
    root = {
        'product' => {
            'root'     => lambda { "root missing" },
            'rootRel'  => lambda { conf['product.root'] + "...rel" },
            'leftover' => 'leftover'
        }
    }

    conf.push(root)
    conf.push('product' => {'root' => 'this is root', 'bar' => 'bar'})
  end

  it "can delete a key" do
    conf = Confstack.new(false)
    source = {'a' => {'b' => {'c' => "c", 'd' => "d"}}}
    conf.push(source)

    conf.delete('a.b.d')
    expect(conf[]) .to eq ({'a' => {'b' => {'c' => "c"}}})

    conf['a.b'] = Confstack::DeleteMe
    expect(conf[]) .to eq ({'a' => {}})

  end

end