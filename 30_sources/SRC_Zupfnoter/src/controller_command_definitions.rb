class Controller
  private

  def __ic_01_internal_commands
    $log.info("registering commands")
    @commands.add_command(:help) do |c|
      c.undoable = false

      c.set_help do
        "this help";
      end

      c.as_action do
        $log.info("<pre>#{@commands.help_string_style.join("\n")}</pre>")
      end
    end

    @commands.add_command(:undo) do |c|
      c.undoable = false
      c.set_help { "undo last command" }
      c.as_action do |a|
        @commands.undo
      end
    end

    @commands.add_command(:redo) do |c|
      c.undoable = false
      c.set_help { "redo last command" }
      c.as_action do |a|
        @commands.redo
      end
    end

    @commands.add_command(:history) do |c|
      c.undoable = false
      c.set_help { "show history" }
      c.as_action do |a|
        history = @commands.history.map { |c| "#{c.first}: #{c[1].name}(#{c.last})" }
        $log.info("<pre>#{history.join("\n")}</pre>")
      end
    end
  end

  def __ic_02_play_commands
    @commands.add_command(:p) do |c|
      c.undoable = false
      c.set_help { "play song #{c.parameter_help(0)}" }
      c.add_parameter(:range, :string) do |parameter|
        parameter.set_default { "ff" }
        parameter.set_help { "range: [all | ff | sel]" }
      end

      c.as_action do |argument|
        case argument[:range]
          when "sel"
            play_abc(:selection)

          when "ff"
            play_abc(:selection_ff)

          when "all"
            play_abc
          else
            $log.error("wrong range to play")
        end
      end
    end

    @commands.add_command(:stop) do |c|
      c.undoable = false
      c.set_help { "stop playing" }
      c.as_action do |a|
        stop_play_abc
      end
    end

  end

  def __ic_03_create_commands
    @commands.add_command(:c) do |c|
      c.set_help { "create song #{c.parameter_help(0)}" }
      c.add_parameter(:id, :string) do |parameter|
        parameter.set_default { nil }
        parameter.set_help { "unique id, value for X: line" }
      end

      c.add_parameter(:title, :string) do |parameter|
        parameter.set_default { nil }
        parameter.set_help { "Title of the song" }
      end

      c.as_action do |args|

        song_id = args[:id]
        song_title = args[:title]
        raise "no id specified" unless song_id
        raise "no title specified" unless song_title

        template = %Q{X:#{song_id}
T:#{song_title}
C:{copyright}
R:{rhythm}
M:4/4
L:1/4
Q:1/4=120
K:C
% %%%hn.print {"t":"alle Stimmen",         "v":[1,2,3,4], "s": [[1,2],[3,4]], "f":[1,3], "j":[1]}
% %%%hn.print {"t":"sopran, alt", "v":[1,2],     "s":[[1,2]],       "f":[1],   "j":[1]}
%%%%hn.print {"t":"tenor, bass", "v":[3, 4],     "s":[[1, 2], [3,4]],       "f":[3  ],   "j":[1, 3]}
%%%%hn.legend [10,10]
%%%%hn.note [[5, 50], "Folge: A A B B C A", "regular"]
%%%%hn.note [[360, 280], "Erstellt mit Zupfnoter 0.7", "regular"]
%%score T1 T2  B1 B2
V:T1 clef=treble-8 octave=-1 name="Sopran" snm="S"
V:T2 clef=treble-8 octave=-1 name="Alt" snm="A"
V:B1 clef=bass transpose=-24 name="Tenor" middle=D, snm="T"
V:B2 clef=bass transpose=-24 name="Bass" middle=D, snm="B"
[V:T1] c'
[V:T2] c
[V:B1] c,
[V:B2] C
%
}
        args[:oldval] = @editor.get_text
        @editor.set_text(template)
      end

      c.as_inverse do |args|
        @editor.set_text(args[:oldval])
      end
    end
  end


  def __ic_04_localstore_commands
    @commands.add_command(:lsave) do |c|
      c.undoable = false

      c.set_help do
        "save to localstore";
      end

      c.as_action do
        abc_code = @editor.get_text
        metadata = @abc_transformer.get_metadata(abc_code)
        filename = "#{metadata[:X]}_#{metadata[:T]}"
        @songbook.update(metadata[:X], abc_code, metadata[:T], true)
        $log.info("saved to '#{filename}'")
      end
    end

    @commands.add_command(:lls) do |c|
      c.undoable = false
      c.set_help { "list files in localstore" }
      c.as_action do |a|
        # list the songbook
        $log.info("<pre>" + @songbook.list.map { |k, v| "#{k}_#{v}" }.join("\n") + "</pre>")
      end
    end

    @commands.add_command(:lopen) do |c|
      c.undoable = true
      c.add_parameter(:id, :string){ |parameter|
        parameter.set_help { "id of the song to be loaded" }
      }

      c.set_help { "open song from local store  #{c.parameter_help(0)}" }

      c.as_action do |args|
        # retrieve a song
        if args[:id]
          payload = @songbook.retrieve(args[:id])
          if payload
            args[:oldval] = @editor.get_text
            @editor.set_text(payload)
          else
            $log.error("song #{command_tokens.last} not found")
          end
        else
          $log.error("plase add a song number")
        end
      end

      c.as_inverse do |args|
        @editor.set_text(args[:oldval])
      end
    end
  end

end


=begin

when "s"
abc_code = @editor.get_text
metadata = @abc_transformer.get_metadata(abc_code)
@songbook.update(metadata[:X], abc_code, metadata[:T])
$log.info("saved #{metadata[:X]}, '#{metadata[:T]}'")

when "lw"
$log.debug ("listing webdav")
Browser.HTTP.get("http://www.weichel21.de/months.js").then do |response|
  $log.debug "returned #{response.status_code}"
  $log.debug response.body

end

# retrieve a song
when "r"
if command_tokens[1]
  payload = @songbook.retrieve(command_tokens[1])
  if payload
    @editor.set_text(payload)
  else
    $log.error("song #{command_tokens.last} not found")
  end
else
  $log.error("plase add a song number")
end

# list the songbook
when "ls"
$log.info("<pre>" + @songbook.list.map { |k, v| "#{k}_#{v}" }.join("\n") + "</pre>")




=end
