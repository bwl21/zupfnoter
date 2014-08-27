
require "../src/command-controller"

############## der test

class Controller

  def initialize
    @commands = CommandController::CommandStack.new()
    @b = "gast"
    @cnr = 0
    self.private_methods.select { |n| n =~ /__ic.*/ }.each { |m| send(m) }
  end

  def do_commands
    @commands.run_string("help")

    @commands.run_string("grussformel hallo ciao")
    @commands.run_string('"hallo_name" "Bernhard Weichel"')
    @commands.run_string("undo")

    @commands.run_string("grussformel hi bye")
    @commands.run_string("hallo_name Bernhard")
    @commands.run_string("undo")
    @commands.run_string("undo")

    @commands.run_string("hallo_name Bernhard")
    @commands.run_string("undo")
  end

  private

  def __ic1
    @commands.add_command(:hallo_name) do |c|
      c.add_parameter(:name, :string) do |parameter|
        parameter.set_default { "gast" }
        parameter.set_help { "Der Name" }
      end

      c.set_help do
        "sag hallo zu {#{c.parameter_name(0)}} | '#{c.parameter_default(0)}'"
      end

      c.as_action do |arguments|
        name = arguments[:name]
        arguments[:oldvalue] = @cnr
        @cnr += 1
        puts "#{@hallo_formel} #{name}"
      end

      c.as_inverse do |arguments|
        name = arguments[:name]
        @cnr = arguments[:oldvalue]
        puts "#{@ciao_formel} #{name} [#{arguments[:oldvalue]}]"
      end
    end
  end

  def __ic2
    @commands.add_command(:help) do |c|
      c.set_help do
        "this help";
      end
      c.as_action do
        puts @commands.help_string_style;
      end
    end

    @commands.add_command(:grussformel) do |c|
      c.add_parameter("hallo_formel", "string")
      c.add_parameter("ciao_formel", "string")
      c.as_action do |arguments|
        arguments[:old] = [@hallo_formel, @ciao_formel]
        @hallo_formel = arguments["hallo_formel"]
        @ciao_formel =arguments["ciao_formel"]
      end
      c.as_inverse do |arguments|
        @hallo_formel, @ciao_formel = arguments[:old]
      end
    end

    @commands.add_command(:undo) do |c|
      c.undoable=false
      c.as_action do |a|
        @commands.undo
      end
    end
  end
end


a = Controller.new
a.do_commands

a = CommandController::CommandStack.new()
b = "Hugo"
cnr = 0
hallo_formel = "guten Morgen"
ciao_formel = "Ciao"

a.add_command(:hallo_name) do |c|
  c.add_parameter(:name, :string) do |parameter|
    parameter.set_default { b }
    parameter.set_help { "Der Name" }
  end

  c.set_help do
    "sag hallo zu {#{c.parameter_name(0)}} | '#{c.parameter_default(0)}'"
  end

  c.as_action do |arguments|
    name = arguments[:name]
    arguments[:oldvalue] = cnr
    cnr += 1
    puts "#{hallo_formel} #{name}"
  end

  c.as_inverse do |arguments|
    name = arguments[:name]
    cnr = arguments[:oldvalue]
    puts "#{ciao_formel} #{name} [#{arguments[:oldvalue]}]"
  end
end

#@section rdrop

a.add_command(:rdrop) do |c|
  c.add_parameter(:root_in_dropbox, :string, "Root in dropbox")
  c.add_parameter(:file_id, :string, "the X: designator")

  c.set_help do |p|
    "lies file {#{c.parameter_help(1)}} aus {#{c.parameter_help(0)}}"
  end

  c.as_action do |parameters|
    puts "reading #{parameters[:root_in_dropbox]}#{parameters[:file_id]}} #{name}"
  end

  c.as_inverse do |parameters|
    puts "cannot undo"
  end
end

puts "------------------------------------------------------"
puts a.help_string_style

b = "new Hugo"
a.run_string("hallo_name")
a.run_string("hallo_name franz")

a.undo
a.run_string("hallo_name josef")
a.run_string('hallo_name "maria und josef"')
a.undo

puts
puts a.help_string_style


b = "last hugo"
a.run_string("hallo_name")
a.undo
a.undo
a.undo

puts
puts a.help_string_style

puts a.history.map { |c| "#{c.first}: #{c[1].name}(#{c.last})" }

