class Controller



  def setup_nodewebkit
    begin
      %x{

        var gui = require('nw.gui');
        var fs = require('fs')

        var menu = new gui.Menu({ type: 'menubar', label: 'foobar'});

        menu.append(new gui.MenuItem({
          label: 'Zupfnoter',
          submenu: new gui.Menu()
        }));

        menu.items[0].submenu.append(new gui.MenuItem({
          label: 'About Zupfnoter',
          icon: 'public/menuicons/about-26.png',

          click: function () {
            alert("Zupfnoter version "+ #{VERSION} + "\n" + #{COPYRIGHT});
          }
        }))

        menu.items[0].submenu.append(new gui.MenuItem({
          label: 'show arguments',
          click: function () {
            #{arg=nil}
              #{arg} = gui.App.argv;
            #{$log.info(arg)};
          }
        }))


        menu.items[0].submenu.append(new gui.MenuItem({
          label: 'Quit Zupfnoter',
          icon: 'public/menuicons/exit-26.png',

          click: function () {
            gui.App.quit();
          }
        }));

        menu.append(new gui.MenuItem({
          label: 'File',
          submenu: new gui.Menu()
        }));


        var chooser = $("#fileDialog");

        chooser.change(function(evt) {

          var filename = $(this).val();
          #{f = `filename`.gsub("\\", "\\\\")
            handle_command(%Q{_fopen "#{f}"}) }
          // Reset the selected value to empty ('')
          $(this).val('');
        });

        menu.items[1].submenu.append(new gui.MenuItem({
          label: 'open',
          icon: 'public/menuicons/view_file-26.png',
          click: function () {
            chooser.trigger('click');
          }
        }));


        var savechooser = $("#folderDialog");

        savechooser.change(function(evt) {
          var filename = $(this).val();

          #{f = `filename`
            set_status({nwworkingdir: f})
            f = f.gsub("\\", "\\\\")
            handle_command(%Q{_fsave "#{f}"})
           }

          // Reset the selected value to empty ('')
          $(this).val('');
        });

        menu.items[1].submenu.append(new gui.MenuItem({
          label: 'save',
          icon: 'public/menuicons/save-26.png',
          click: function () {
            savechooser.attr("nwworkingdir", #{@systemstatus[:nwworkingdir]});
            savechooser.trigger('click');
          }
        }));

        menu.append(new gui.MenuItem({
          label: 'View',
          submenu: new gui.Menu()
        }));


        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'refresh',
          icon: 'public/menuicons/refresh-26.png',

          click: function () {
            #{render_previews}
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'play all',
          icon: 'public/menuicons/play-26.png',

          click: function () {
            #{handle_command('p all')}
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'play from here',
          icon: 'public/menuicons/last-26.png',
          click: function () {
            #{handle_command('p ff')}
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'play selection',
          icon: 'public/menuicons/music_transcripts-26.png',
          click: function () {
            #{handle_command('p sel')}
          }
        }));


        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'set extract 0',
          icon: 'public/menuicons/0-26.png',

          click: function () {
            #{handle_command('view 0')}
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'set extract 1',
          icon: 'public/menuicons/1-26.png',
          click: function () {
            #{handle_command('view 1')}
          }
        }));

        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'set extract 2',
          icon: 'public/menuicons/2-26.png',
          click: function () {
            #{handle_command('view 2')}
          }
        }));
        menu.items[2].submenu.append(new gui.MenuItem({
          label: 'set extract 3',
          icon: 'public/menuicons/3-26.png',
          click: function () {
            #{handle_command('view 3')}
          }
        }));



        gui.Window.get().menu = menu;
        gui.Window.title = "zupfnoter";
        gui.Window.get().show();

      }

      # %x{
      # fs = require('fs')
      # #{text = nil};
      # #{text} = fs.readFileSync(gui.App.argv[0]).toString();
      # #{$log.info(text)};
      # #{@editor.set_text(text)};
      # }

      __ic_06_node_fs_commands
    rescue Exception => e
      $log.debug "error with node webkit: #{e.message} #{e.backtrace.join('\n')} (#{__FILE__} #{__LINE__})"
    end
  end


  private
  def __ic_06_node_fs_commands

    @commands.add_command(:_fsave) do |command|
      command.add_parameter(:path, :string) do |parameter|
        parameter.set_default { @node_fs_path }
      end

      command.undoable = false ## todo make this undoable

      command.set_help { "save to local file system {#{command.parameter_help(0)}}" }

      command.as_action do |args|

        abc_code = @editor.get_text
        metadata = @abc_transformer.get_metadata(abc_code)
        filebase = metadata[:F].first
        if filebase
          filebase = filebase.split("\n").first
        else
          raise "Filename not specified in song add an F: instruction" ## "#{metadata[:X]}_#{metadata[:T]}"
        end

        rootpath = args[:path]
        $log.info("saving to #{rootpath}")

        layout_harpnotes # todo: this uses a side-effect to get the @song populated
        render_previews

        print_variants = @music_model.harpnote_options[:print]
        pdfs={}
        print_variants.each_with_index.map do |print_variant, index|
          filename = print_variant[:title].gsub(/[^a-zA-Z0-9\-\_]/, "_")
          pdfs["#{rootpath}/#{filebase}_#{print_variant[:title]}_a3.pdf"] = render_a3(index).output(:blob)
          pdfs["#{rootpath}/#{filebase}_#{print_variant[:title]}_a4.pdf"] = render_a4(index).output(:blob)
        end

        `var fs = require('fs')`

        pdfs.each do |name, pdfdata|
          %x{
            fs.writeFileSync(#{name}, #{pdfdata})
          }
          $log.info(name)
        end
        name = "#{rootpath}/#{filebase}.abc"
        %x{fs.writeFileSync(name, #{@editor.get_text})  }
        $log.info("save abco to #{name}")

      end
    end

    @commands.add_command(:_fopen) do |command|

      command.add_parameter(:path, :string) do |p|
        p.set_help { "path to open" }
      end

      command.set_help { "read file from local filesystem #{command.parameter_help(0)}" }

      command.as_action do |args|

        args[:oldval] = {text: @editor.get_text, nwworkdir: @systemstatus[:nwworkingdir]}
        rootpath = args[:path] # command_tokens[2] || @dropboxpath || "/"
        begin
          `var fs = require('fs')`
          text = `fs.readFileSync(#{rootpath}).toString();`
          nwdir = rootpath.match(/(.*)([\/\\].+)/)[1]
          set_status({nwworkingdir: nwdir})
          $log.info("opened #{rootpath}")
          #{$log.info(`text`)};
          @editor.set_text(text)
        rescue Exception => e
          $log.error(e.message)
        end

      end

      command.as_inverse do |args|
        # todo maintain editor status
        set_status({nwworkdir: args[:oldval][:nwworkingdir]})
        @editor.set_text(args[:oldval][:text])
      end

    end


  end

end