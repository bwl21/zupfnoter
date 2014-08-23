module CommandController

  # This class represents the definition of a particular parameter in the command
  # Note that it does not store the value!
  #
  # Help and Default is defined as a procedure. This allows to react on current
  # values in the controller if the command definition acts on the state of the controller
  #
  class Parameter
    attr_reader :name

    # create the parameter
    # @name [Symbol] the name of the parameter
    # @type [Symbol] the type of the parameter intendend for help
    def initialize(name, type)
      @name = name
      @type = type
    end

    # @params[Block] block - the block to compute the help string for the parameter
    def set_help(&block)
      @help_action = block
    end

    # @param [Block] block - the block to compute the default value of the parameter
    def set_default(&block)
      @default_action = block
    end

    # get the help string for the parameter
    def get_help
      @help_action.call
    end

    # geht the default value for the parameter
    def get_default
      @default_action.call
    end
  end


  # This represents a particular command
  class Command
    attr_reader :name, :parameters

    # the initialization
    def initialize(name)
      @name = name
      @help_action = lambda { "no help defined for #{name}" }
      @parameters = []
      @action = lambda { |p| raise "No action defined for #{name}" } #do nothing by default
      @inverse_action = lambda { |p| raise "No  undo defined fore #{name}" } #do nothing by default
      @undoable = true
    end

    # Add a parameter
    #
    # @param [String] name - the name of the parameter
    # @param [String] type - the type of the parameter (used for help)
    # @param [String] help - the help string
    # @param [String] default - the default value of the paramter
    # @param [Block] block - the block to refine the parameter
    def add_parameter(name, type, help = nil, default = nil, &block)
      parameter = Parameter.new(name, type)
      parameter.set_help { help }
      parameter.set_default { default }

      block.call(parameter) if block_given?
      @parameters.push(parameter)
    end

    # this defines the action to be done to perform command
    # @param [block] block the action to be performed. Accepts arguments as hash.
    def as_action(&block)
      @action = block
    end

    # this defines the action to be done to command
    # @param [block] block the action to be performed. Accepts arguments as hash.
    def as_inverse(&block)
      @inverse_action = block
    end

    # this defines the action to be done by the command
    # @param [block] block the action to be performed. Does not take arguments.
    def set_help(&block)
      @help_action = block
    end

    # intended to be used from the commandStack only


    # perform the command
    # @param [Hash] arguments - the arguments to apply to the command
    def perform(arguments)
      @action.call(arguments)
    end

    # invert the command
    # @param [Hash] arguments - the arguments to apply to the command
    def invert(arguments)
      @inverse_action.call(arguments)
    end


    def get_clean_argument_values(arguments)
      result = {}
      @parameters.each do |p|
        result[p.name] = arguments[p.name] || p.get_default
      end
      result
    end

    def get_help()
      @help_action.call()
    end

    def parameter_name(index)
      @parameters[index].name
    end

    def parameter_help(index)
      @parameters[index].get_help
    end

    def parameter_default(index)
      @parameters[index].get_default
    end

    def undoable?
      @undoable
    end

    def undoable=(value)
      @undoable = value
    end
  end

# this class implements a command stack for the controller of e.g. an MVC appication.
# Its main purpose is to handle the user interaction, which can be provided either as interactions on the
# GUO or as commands provided by a console or even by a macro file.
#
# The approach is such that the command stack can register commands with is basically a named obuect
# with arguments. For command and menu driven systems, help and parameter defaulting is provided.
#
# So Command basically provides methods to
# 1. define commands
# 2. execute commands
# 3. undo / redo commands

  class CommandStack
    def initialize()
      @commands = {}
      @undo_stack = []
      @redo_stack = []
      @history_stack = []
    end

    def add_command(name, &block)
      command = Command.new(name)
      block.call(command)
      @commands[command.name] = command
    end

    def can_undo?
      not @undo_stack.empty?
    end

    def can_redo?
      not @redo_stack.empty?
    end

    def perform(command, arguments)
      the_arguments = command.get_clean_argument_values(arguments)

      command.perform(the_arguments)
      if command.undoable?
        @undo_stack.push([command, the_arguments])
        @redo_stack.clear
      end
      @history_stack.push(["  do", command, the_arguments])

    end

    def undo
      if can_undo?
        command, arguments = @undo_stack.pop
        @redo_stack.push([command, arguments])
        @history_stack.push(["undo", command, arguments])
        command.invert(arguments)
      else
        raise "nothing to undo"
      end
    end

    def redo
      if can_redo?
        command, arguments = @redo_stack.pop
        perform(command, arguments)
      else
        raise "nothing to redo"
      end
    end

    STRING_COMMAND_REGEX = /([^ \\\^"{]+)|"(([^\\"]|\\["n\\])*)"|(\{.+\})/

    def parse_string(command)
      r = command.scan(STRING_COMMAND_REGEX).map { |s| s.select{|x| x.is_a? Object }.first }

    end

    def run_string(command)
      arguments = {}
      parts = parse_string(command)
      the_command = @commands[parts.first.to_sym]
      raise "wrong command: #{command}" unless the_command

      parts[1 .. -1].each_with_index do |argument, index|
        begin
          arguments[the_command.parameter_name(index)] = argument
        rescue
          raise "too many arguments in '#{command}'"
        end
      end
      perform(the_command, arguments)
    end

    def history
      @history_stack
    end

    def help_string_style()
      @commands.to_a.map { |k, c|
        parameter_names = c.parameters.map { |p| "{#{p.name}}" }.join(" ")
        "#{c.name} #{parameter_names} : #{c.get_help}"
      }
    end
  end
end

