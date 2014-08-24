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


    @commands.add_command(:showundo) do |c|
      c.undoable = false
      c.set_help { "show undo stack" }
      c.as_action do |a|
        history = @commands.undostack.map { |c| "#{c.first}: #{c[1].name}(#{c.last})" }
        $log.info("<pre>#{history.join("\n")}</pre>")
      end
    end

    @commands.add_command(:showredo) do |c|
      c.undoable = false
      c.set_help { "show redo stack" }
      c.as_action do |a|
        history = @commands.redostack.map { |c| "#{c.first}: #{c[1].name}(#{c.last})" }
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
        parameter.set_help { "r(all | ff | sel): range to play" }
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
      c.set_help { "create song #{c.parameter_help(0)} #{c.parameter_help(1)}" }
      c.add_parameter(:id, :string) do |parameter|
        parameter.set_help { "value for X: line, a unique id" }
      end

      c.add_parameter(:title, :string) do |parameter|
        parameter.set_default { "untitled" }
        parameter.set_help { "Title of the song" }
      end

      c.as_action do |args|

        song_id = args[:id]
        song_title = args[:title]
        raise "no id specified" unless song_id
        raise "no title specified" unless song_title

        ## todo use erb for this
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
      c.add_parameter(:id, :string) { |parameter|
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

  def __ic_05_dropbox_commands
    @commands.add_command(:dlogin) do |command|
      command.add_parameter(:scope, :string) do |parameter|
        parameter.set_default { "app" }
        parameter.set_help { "(app | full) app: app only | full: full dropbox" }
      end

      command.set_help { "dropbox login for #{command.parameter_help(0)}" }

      command.as_action do |args|
        case args[:scope]
          when "full"
            @dropboxclient = Opal::DropboxJs::Client.new('us2s6tq6bubk6xh')
            @dropboxclient.app_name = "full Dropbox"
            @dropboxpath = "/zupfnoter/"

          when "app"
            @dropboxclient = Opal::DropboxJs::Client.new('xr3zna7wrp75zax')
            @dropboxclient.app_name = "App folder only"
            @dropboxpath = "/"

          else
            $log.error("select app | full")
        end

        @dropboxclient.authenticate().then do
          $log.info("logged in at dropbox with #{args[:app]} access")
        end
      end

      command.as_inverse do |args|
        $log.info("logged out from dropbox")
        @dropboxclient = nil
      end
    end

    @commands.add_command(:dls) do |command|
      command.undoable = false

      command.add_parameter(:path, :string) do |parameter|
        parameter.set_default { @dropboxpath || "/" }
        parameter.set_help { "path in dropbox #{@dropboxclient.app_name}" }
      end

      command.set_help { "list files in #{command.parameter_help(0)}" } # todo factor out to comman class

      command.as_action do |args|
        rootpath = args[:path]
        $log.info("#{@dropboxclient.app_name}: #{args[:path]}:")

        @dropboxclient.authenticate().then do
          @dropboxclient.read_dir(rootpath)
        end.then do |entries|
          $log.info("<pre>" + entries.select { |entry| entry =~ /\.abc$/ }.join("\n").to_s + "</pre>")
        end
      end
    end

    @commands.add_command(:dcd) do |command|
      command.add_parameter(:path, :string) do |parameter|
        parameter.set_default { @dropboxpath }
        parameter.set_help { "path in dropbox #{@dropboxclient.app_name}" }
      end

      command.set_help { "dropbox change dir to #{command.parameter_help(0)}" }

      command.as_action do |args|
        rootpath = args[:path]
        args[:oldval] = @dropboxpath
        @dropboxpath = rootpath
        $log.info("dropbox path changed to #{@dropboxpath}")
      end

      command.as_inverse do |args|
        @dropboxpath = args[:oldval]
        $log.info("dropbox path changed back to #{@dropboxpath}")
      end
    end

    @commands.add_command(:dpwd) do |command|
      command.undoable = false

      command.set_help { "show drobox path" }

      command.as_action do |args|
        $log.info("#{@dropboxclient.app_name}: #{@dropboxpath}")
      end
    end

    @commands.add_command(:dsave) do |command|

      command.add_parameter(:path, :string) do |parameter|
        parameter.set_default { @dropboxpath }
        parameter.set_help { "path to save in #{@dropboxclient.app_name}" }
      end

      command.undoable = false ## todo make this undoable

      command.set_help { "save to dropbox {#{command.parameter_help(0)}}" }

      command.as_action do |args|
        abc_code = @editor.get_text
        metadata = @abc_transformer.get_metadata(abc_code)
        filebase = "#{metadata[:X]}_#{metadata[:T]}"
        print_variant = @song.harpnote_options[:print][0][:title]

        rootpath = args[:path]

        @dropboxclient.authenticate().then do

          Promise.when(
              @dropboxclient.write_file("#{rootpath}#{filebase}.abc", @editor.get_text),
              @dropboxclient.write_file("#{rootpath}#{filebase}_#{print_variant}_a3.pdf", render_a3(0).output(:raw)),
              @dropboxclient.write_file("#{rootpath}#{filebase}_#{print_variant}_a4.pdf", render_a4(0).output(:raw))
          )
        end.then do
          $log.info("all files saved")
        end.fail do |err|
          $log.error("there was an error saving files #{err}")
        end
      end
    end

    @commands.add_command(:dopen) do |command|

      command.add_parameter(:fileid, :string, "file id")
      command.add_parameter(:path, :string) do |p|
        p.set_default { @dropboxpath }
        p.set_help { "path to save in #{@dropboxclient.app_name}" }
      end

      command.set_help { "read file with #{command.parameter_help(0)}, from dropbox #{command.parameter_help(1)}" }

      command.as_action do |args|
        args[:oldval] = @editor.get_text
        fileid = args[:fileid]
        rootpath = args[:path] # command_tokens[2] || @dropboxpath || "/"
        $log.info("get from Dropbox path #{rootpath}#{fileid}_ ...:")

        @dropboxclient.authenticate().then do |error, data|
          @dropboxclient.read_dir(rootpath)
        end.then do |entries|
          $log.puts entries
          file = entries.select { |entry| entry =~ /#{fileid}_.*\.abc$/ }.first
          @dropboxclient.read_file("#{rootpath}#{file}")
        end.then do |abc_text|
          $log.puts "got it"
          @editor.set_text(abc_text)
        end
      end

      command.as_inverse do |args|
        @editor.set_text(args[:oldval])
      end

    end

  end
end

