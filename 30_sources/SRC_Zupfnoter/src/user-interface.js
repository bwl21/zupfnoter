function init_w2ui(uicontroller) {

  w2popup.defaults.speed = 0;

  var zoomlevel = [1400, 2200];
  var current_perspective = 'tb_perspective:Alle';
  var isFullScreen = false;


// file import methods


  function pasteXml(text) {
    // try {
    //   var xmldata = $.parseXML(text);
    // }
    // catch (ex) {
    //   #{$log.error(`ex.message`)}
    // }

    var xmldata = $.parseXML(text);

    var options = {
      'u': 0, 'b': 0, 'n': 0,    // unfold repeats (1), bars per line, chars per line
      'c': 0, 'v': 0, 'd': 0,    // credit text filter level (0-6), no volta on higher voice numbers (1), denominator unit length (L:)
      'm': 0, 'x': 0,           // with midi volume and panning (1), no line breaks (1)
      'p': 'f'
    };              // page format: scale (1.0), width, left- and right margin in cm

    var result = vertaal(xmldata, options);


    debugger;
    uicontroller.dropped_abc = result[0]

    uicontroller.$handle_command('drop')
  }

  function pasteMxl(text) {
    zip = new JSZip(text)
    text = zip.file(/^[^/ ]*\.xml$/)[0].asText();
    pasteXml(text);
  }

  function pasteAbc(text) {
    uicontroller.dropped_abc = text
    uicontroller.$handle_command('drop')
  }

  function handleDrop(event) {
    event.stopPropagation();
    event.preventDefault();
    files = event.target.files;
    if (!files) {
      files = event.dataTransfer.files;
    }
    reader = new FileReader();

    reader.onload = function (e) {
      text = e.target.result;
      if (text[0] == '<') {
        pasteXml(text);
      }
      else if (files[0].name.endsWith(".mxl")) {
        pasteMxl(text)
      }
      else {
        pasteAbc(text);
      }
    }
    if (files[0].name.endsWith('.mxl')) {
      reader.readAsBinaryString(files[0]);
    }
    else {
      reader.readAsText(files[0], "UTF-8");
    }
  }


  function handleDragover(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  function initializeFileDrop(element) {
    var a = document.getElementById(element);
    a.addEventListener('dragover', handleDragover, false);
    a.addEventListener('drop', handleDrop);
  }

  document.getElementById('file_input')
    .addEventListener('change', function(event){debugger;handleDrop(event)}, false);

  initializeFileDrop('layout');

  function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var contents = e.target.result;
      displayContents(contents);
    };
    reader.readAsText(file);
  }



// UI-Methods
  function zoomHarpPreview(size) {
    uicontroller.$set_harppreview_size(size);
    $("#harpPreview svg").attr('height', size[1]).attr('width', size[0]);
  };

  function createNewSheet() {
    openPopup({
      name: 'createNewSheetForm',
      text: w2utils.lang('Create new Sheet'),
      style: 'border: 0px; background-color: transparent;',
      fields: [
        {field: 'id', type: 'string', required: true, html: {caption: 'X:'}},
        {
          field: 'title',
          type: 'text',
          required: true,
          tooltip: "Enter the title of your sheet",
          html: {caption: w2utils.lang('Title'), attr: 'style="width: 300px"'}
        }
      ],
      actions: {
        "Ok": function () {
          if (this.validate().length == 0) {
            uicontroller.$handle_command("c " + this.record.id + '"' + this.record.title + '"');
            w2popup.close();
          }
        },
        "Cancel": function () {
          w2popup.close();
        }
      }
    })
  }


  function open_data_uri_window(url) {
    var url_with_name = url.replace("data:application/pdf;", "data:application/pdf;name=myname.pdf;")

    var html = '<html>' +
      '<style>html, body { padding: 0; margin: 0; } iframe { width: 100%; height: 100%; border: 0;}  </style>' +
      '<body>' +
      '<iframe type="application/pdf" src="' + url_with_name + '"></iframe>' +
      '</body></html>';
    a = window.open("about:blank", "Zupfnoter");
    a.document.write(html);
    a.document.close();
  }

  previews = {
    'tbPreview:tbPrintA3': function () {
      url = uicontroller.$render_a3().$output('datauristring')
      open_data_uri_window(url)
    },

    'tbPreview:tbPrintA4': function () {
      url = uicontroller.$render_a4().$output('datauristring')
      open_data_uri_window(url)
    },

    'tbPreview:tbPrintNotes': function () {
      a = window.open();
      //  a.document.write('<style type="text/css">rect.abcref {fill:grey;fill-opacity:0.01}</style>');
      //a.document.write($('#tunePreview').html());
      a.document.write(uicontroller.tune_preview_printer.$get_html());
      a.document.close();
    }
  }

  perspectives = {
    'tb_perspective:Alle': function () {
      w2ui['layout'].show('left', window.instant);
      w2ui['layout'].hide('bottom', window.instant);
      w2ui['layout'].show('main', window.instant);
      w2ui['layout'].show('preview', window.instant);
      w2ui['layout'].sizeTo('preview', "50%");
      zoomHarpPreview(zoomlevel);
    },
    'tb_perspective:NotenEingabe': function () {
      w2ui['layout'].show('left', window.instant);
      w2ui['layout'].hide('bottom', window.instant);
      w2ui['layout'].show('main', window.instant);
      w2ui['layout'].hide('preview', window.instant);
      w2ui['layout'].sizeTo('preview', "50%");
    },
    'tb_perspective:HarfenEingabe': function () {
      w2ui['layout'].show('left', window.instant);
      w2ui['layout'].hide('bottom', window.instant);
      w2ui['layout'].hide('main', window.instant);
      w2ui['layout'].show('preview', window.instant);
      w2ui['layout'].sizeTo('preview', "100%");
      zoomHarpPreview(zoomlevel);
    },
    'tb_perspective:Noten': function () {
      w2ui['layout'].hide('left', window.instant);
      w2ui['layout'].hide('bottom', window.instant);
      w2ui['layout'].show('main', window.instant);
      w2ui['layout'].hide('preview', window.instant);
      $("#tunePreview").attr('width', '25cm');
    },
    'tb_perspective:Harfe': function () {
      w2ui['layout'].sizeTo('preview', "100%");
      w2ui['layout'].show('preview', window.instant);
      w2ui['layout'].hide('left', window.instant);
      w2ui['layout'].hide('bottom', window.instant);
      w2ui['layout'].hide('main', window.instant);
      zoomHarpPreview(['98%', '100%'])
    }
  }
  scalehandlers = {
    'tb_scale:groß': function () {
      zoomlevel = [2200, 1400];
      zoomHarpPreview(zoomlevel);
    },
    'tb_scale:mittel': function () {
      zoomlevel = [1500, 750];
      zoomHarpPreview(zoomlevel);
    },
    'tb_scale:klein': function () {
      zoomlevel = [800, 400];
      zoomHarpPreview(zoomlevel);
    },
    'tb_scale:fit': function () {
      zoomlevel = ['100%', '100%'];
      zoomHarpPreview(zoomlevel);
    }
  }

  toolbarhandlers = {
    'tb_file:tb_create': createNewSheet,
    'tb_file:tb_import': function(){ $('#file_input').click()},
    'tb_file:tb_export': function(){uicontroller.$handle_command("download_abc")},

    'tb_view:0': function () {
      uicontroller.$handle_command("view 0")
    },
    'tb_view:1': function () {
      uicontroller.$handle_command("view 1")
    },
    'tb_view:2': function () {
      uicontroller.$handle_command("view 2")
    },
    'tb_view:3': function () {
      uicontroller.$handle_command("view 3")
    },
    'tb_view:4': function () {
      uicontroller.$handle_command("view 4")
    },
    'tb_view:5': function () {
      uicontroller.$handle_command("view 5")
    },
    'tbPlay': function () {
      uicontroller.$play_abc('auto');
    },

    'tbRender': function () {
      uicontroller.editor.$resize();
      uicontroller.$render_previews();
    },

    'tb_create': createNewSheet,

    'tb_open': function () {
      uicontroller.$handle_command("dchoose")
    },

    'tb_save': function () {
      $("#tb_layout_top_toolbar_item_tb_save table").removeClass("alert")
      disable_save();
      setTimeout(function () {
        uicontroller.$handle_command("dsave");
      }, 100)

    },

    'tb_download': function () {
      uicontroller.$handle_command("download_abc")
    },

    'tb_logout': function () {
      uicontroller.$handle_command("dlogout")
    },


    'tb_login': function () {
      openPopup({
        name: 'loginForm',
        text: w2utils.lang('Login'),
        style: 'border: 0px; background-color: transparent;',
        fields: [
          {
            field: 'folder',
            type: 'text',
            required: true,
            html: {caption: 'Folder in Dropbox', attr: 'style="width: 300px"'}
          },
        ],
        actions: {
          "Ok": function () {
            if (this.validate().length == 0) {
              w2popup.close();
              uicontroller.$handle_command("dlogin full \"" + this.record.folder + "\"")
            }
          },
          "Cancel": function () {
            this.clear();
            w2popup.close();
          }
        }
      })
    }
  }

  var pstyle = 'background-color:  #f7f7f7; padding: 0px; overflow:hidden; '; // pajnel style
  var tbstyle = 'background-color: #ffffff; padding: 0px; overflow:hidden; height:30px;'; // toolbar style
  var sbstyle = 'background-color: #ffffff; padding: 0  px; overflow:hidden; height:30px;border-top:1px solid black !important;'; // statusbar style

  function toggle_full_screen() {
    if (isFullScreen) {
      perspectives[current_perspective]();
      isFullScreen = false;
    }
    else {
      perspectives['tb_perspective:Harfe']();
      isFullScreen = true;
    }
  }

  this.toggle_full_screen = function () {
    toggle_full_screen();
  }

  var toolbar = {
    id: 'toolbar',
    name: 'toolbar',
    style: tbstyle,
    items: [
      {type: 'button', id: 'tb_home', icon: 'fa fa-home', text: 'Zupfnoter'},
      {type: 'html', html: '<div style="width:25px"/>'},
      {
        type: 'menu',
        id: 'tb_file',
        text: 'File',
        icon: 'fa fa-file',
        tooltip: 'interact with local files',
        items: [
          {type: 'button', id: 'tb_create', text: 'New', icon: 'fa fa-file-o', tooltip: 'Create new sheet'},
          {
            type: 'button',
            id: 'tb_import',
            text: 'Import',
            icon: 'fa fa-upload',
            tooltip: 'import abc, xml from local system'
          },
          {
            type: 'button',
            id: 'tb_export',
            text: 'Dl abc',
            icon: 'fa fa-download',
            tooltip: 'download abc to local system'
          },
        ]
      },
      {type: 'button', id: 'tb_create', text: 'New', icon: 'fa fa-file-o', tooltip: 'Create new sheet'},
      {
        type: 'button',
        id: 'tb_download',
        text: 'Dl abc',
        icon: 'fa fa-download',
        tooltip: 'download abc to local system'
      },
      {
        type: 'menu',
        id: 'tbDropbox',
        text: 'Dropbox',
        icon: 'fa fa-dropbox',
        tooltip: 'Interact with dropbox',
        items: [
          {type: 'button', id: 'tb_open', text: 'Open', icon: 'fa fa-search', tooltip: 'Open ABC file in dropbox'},
          {type: 'button', id: 'tb_save', text: 'Save', icon: 'fa fa-floppy-o', tooltip: 'Save ABC file in dropbox'},
          {
            type: 'button',
            id: 'tb_login',
            text: 'Login',
            icon: 'fa fa-sign-in',
            tooltip: 'Login in dropbox;\nchoose folder in Dropbox'
          },
          {
            type: 'button',
            id: 'tb_logout',
            text: 'Logout',
            icon: 'fa fa-sign-out',
            tooltip: 'Logout from Dropbox'
          }
        ]
      },

      {
        type: 'button',
        id: 'tb_login',
        text: 'Login',
        icon: 'fa fa-dropbox',
        tooltip: 'Login in dropbox;\nchoose folder in Dropbox'
      },
      {type: 'button', id: 'tb_open', text: 'Open', icon: 'fa fa-dropbox', tooltip: 'Open ABC file in dropbox'},
      {type: 'button', id: 'tb_save', text: 'Save', icon: 'fa fa-dropbox', tooltip: 'Save ABC file in dropbox'},


      {type: 'spacer'},

      {type: 'break'},
      {
        type: 'menu',
        id: 'tbPreview',
        text: 'Print',
        icon: 'fa fa-print',
        hint: 'Open a preview and printz window',
        items: [
          {
            type: 'button',
            id: 'tbPrintA3',
            text: 'A3',
            icon: 'fa fa-file-pdf-o',
            tooltip: 'Print A3 Harpnotes'
          },
          {
            type: 'button',
            id: 'tbPrintA4',
            text: 'A4',
            icon: 'fa fa-file-pdf-o',
            tooltip: 'Print A4 Harpnotes'
          },
          {type: 'button', id: 'tbPrintNotes', text: 'Tune', icon: 'fa fa-music', tooltip: 'Print Tune'}
        ]
      },

      {type: 'break'},
      {
        type: 'button',
        id: 'tbFullScreen',
        text: '',
        icon: 'fa fa-arrows-alt',
        tooltip: "harpnotes only\napplicable to proofread harpnotes"
      },
      {
        type: 'menu',
        id: 'tb_perspective',
        text: 'Perspective',
        icon: 'fa fa-binoculars',
        tooltip: 'set screen perspective',
        items: [
          {text: 'All', icon: 'fa fa-th-large', id: 'Alle', tooltip: "show all panes"},
          {
            text: 'Enter Notes',
            icon: 'fa fa-music',
            id: 'NotenEingabe',
            tooltip: "editor and notes\napplicable to enter notes"
          },
          {
            text: 'Enter Harp',
            icon: 'fa fa-file-picture-o',
            id: 'HarfenEingabe',
            tooltip: "editor and harpnotes\napplicaple to tweak the notes for harp"
          },
          {text: 'Tune', icon: 'fa fa-music', id: 'Noten', tooltip: "notes only"},
          {
            text: 'Harp',
            icon: 'fa fa-arrows-alt',
            id: 'Harfe',
            tooltip: "harpnotes only\napplicable to proofread harpnotes"
          }
        ]
      },
      {type: 'break', id: 'break0'},
      {
        type: 'menu',
        id: 'tb_view',
        text: 'Extract',
        icon: 'fa fa-shopping-basket',
        tooltip: "Choose extract",
        items: [
          {text: 'Extract 0', icon: 'fa fa-asterisk', id: "0"},
          {},
          {text: 'Extract 1', icon: 'fa fa-tags', id: "1"},
          {text: 'Extract 2', icon: 'fa fa-tags', id: "2"},
          {text: 'Extract 3', icon: 'fa fa-tags', id: "3"},
          {text: 'Extract 4', icon: 'fa fa-tags', id: "4"},
          {text: 'Extract 5', icon: 'fa fa-tags', id: "5"}
        ]
      },
      {type: 'break'},
      {type: 'button', id: 'tbRender', text: 'Render', icon: 'fa fa-refresh', tooltip: 'Render previews'},
      {type: 'button', id: 'tbPlay', text: 'Play', icon: 'fa fa-play', tooltip: 'Play music'},
      {
        type: 'menu', text: 'Help', id: 'tbHelp', icon: 'fa fa-question', tooltip: 'Get help', items: [
        {
          text: 'Version info',
          icon: 'fa fa-tags',
          id: "tbVersionInfo",
          tooltip: 'Open the version information on website'
        },
        {text: 'Videos', icon: 'fa fa-youtube-play', id: "tbTutorials", tooltip: 'Open the video tutorials on youtube'},
        {text: 'Manual', icon: 'fa fa-book', id: "tbManual", tooltip: 'Open the user manual'},
        {text: 'Homepage', icon: 'fa fa-home', id: "tbHomepage", tooltip: 'Open Zupfnoter website'},
        {text: ''},
        {
          text: 'Reference',
          icon: 'fa fa-map-o',
          id: "tbReference",
          tooltip: 'Open a new Zupfnoter window\nwith the reference page'
        },
        {
          text: 'Demo',
          icon: 'fa fa-tags',
          id: "tbDemo",
          tooltip: 'Open a demo sheet\n(Ich steh an deiner Kripen hier)'
        },
        {},
        {
          text: 'abc Tutorial concise',
          icon: 'fa fa-leanpub',
          id: "tbAbcTutorial",
          tooltip: 'Open an concise ABC tutorial (in German)'
        },
        {
          text: 'abc Tutorial detail',
          icon: 'fa fa-graduation-cap',
          id: "tbAbcTutorialSchacherl",
          tooltip: 'Open a detailed ABC tutorial (in German)'
        },

      ]
      }
    ],

    onClick: function (event) {
      // handle perspectives
      if (perspectives[event.target]) {
        perspectives[event.target]();
        isFullScreen = false;
        current_perspective = event.target;
        if (event.subItem) {
          event.item.text = event.subItem.text
        }
      }

      if (toolbarhandlers[event.target]) {
        toolbarhandlers[event.target]();
      }

      // handle full screen
      if (event.target == 'tbFullScreen') {
        toggle_full_screen();
      }

      // handle previews
      if (previews[event.target]) {
        previews[event.target]();
      }

      // handle config
      config_event = event.target.split(":")
      if (config_event[0] == 'config') {
        if (config_event[1]) {
          uicontroller.$handle_command("addconf " + event.target.split(":")[1])
        }
      }

      // handle dropbox menu
      if (config_event[0] == "tbDropbox") {
        if (toolbarhandlers[config_event[1]]) {
          toolbarhandlers[config_event[1]]();
        }
      }


      if (event.target == "tb_home") {
        w2popup.open( {title: 'About Zupfnoter', body: uicontroller.$about_zupfnoter()})
      }
      if (event.target == "tbHelp:tbVersionInfo") {
        window.open(uicontroller.$info_url())
      }
      if (event.target == "tbHelp:tbTutorials") {
        window.open("https://www.youtube.com/channel/UCNwzBbzhyHJOn9eHHl_guHg")
      }
      if (event.target == "tbHelp:tbAbcTutorial") {
        window.open("http://penzeng.de/Geige/Abc.htm")
      }
      if (event.target == "tbHelp:tbAbcTutorialSchacherl") {
        window.open("http://kurs.schacherl.info/ABC-Musiknotation/abc_syntax/abc_syntax.html")
      }
      if (event.target == "tbHelp:tbHomepage") {
        window.open("http://www.zupfnoter.de")
      }
      if (event.target == "tbHelp:tbManual") {
        window.open("/public/UD_Zupfnoter-Handbuch-de_review.pdf")
      }
      if (event.target == "tbHelp:tbReference") {
        window.open("?mode=demo&load=public/demos/3015_reference_sheet.abc")
      }
      if (event.target == "tbHelp:tbDemo") {
        window.open("?mode=demo&load=public/demos/21_Ich_steh_an_deiner_krippen_hier.abc")
      }
    }
  }

  var editor_toolbar = {
    id: 'toolbar',
    name: 'editor-toolbar',
    style: tbstyle,
    items: [
      {type: 'spacer'},
      {
        type: 'menu', text: "Add Config", id: 'config', icon: 'fa fa-gear', tooltip: "configure your sheet",
        items: [
          {id: 'title', tooltip: "insert a title for the \ncurrent extract"},
          {id: 'voices', tooltip: "specify voices to \nbe shown in current extract"},
          {text: 'flowlines', tooltip: "specify which voices \nshow the flowline"},
          {text: 'jumplines', tooltip: "specify which voices \nshow the jumplines"},
          {text: 'repeatsigns', tooltip: "specify which voices\nshow repeat signs instead of jumplines"},
          {text: 'synchlines', tooltip: "specify which voices\nare connected by synchronization lines"},
          {
            text: 'layoutlines',
            tooltip: "specify which voides\nare considered to compute \nvertical spacing"
          },
          {text: 'subflowlines', tooltip: "specify which voices \nshow the subflowlines"},
          {},

          {text: 'legend', tooltip: "specify details for legend"},
          {text: 'lyrics', tooltip: "specify details for lyrics"},
          {id: 'notes', text: 'page annotation', tooltip: "enter a page bound annotation"},
          {text: ''},

          {text: 'nonflowrest', tooltip: "specify if rests are shown outside of flowlines"},
          {text: 'startpos', tooltip: "specify the vertical start position of the notes"},
          {
            text: 'countnotes',
            tooltip: "specify which voices\n shwow countnotes\n and appeareance of the same"
          },
          {
            text: 'barnumbers',
            tooltip: "specify which voices\n shwow bar numbers\n and appeareance of the same"
          },
          {text: 'layout', tooltip: "specify laoyut details \n(e.g. size of symbols)"},
          {
            text: 'stringnames',
            tooltip: "specify output of stringnames.\n Stringnames help to tune the instrument"
          },
          {text: ''},
          {text: 'produce', tooltip: "specify which extracts shall be saved as PDF"},
          {
            id: 'annotations',
            text: 'annotations',
            tooltip: "specify temmplate for\n note bound annotations"
          },
          {text: ''},
          {text: 'stringnames.full', tooltip: "specify full details for stringnams"},
          {text: 'repeatsigns.full', tooltip: "specify all details for repeat signs"},
          {text: 'barnumbers.full', tooltip: "specify all details for bar numbers"},
          {text: ''},
          {
            id: 'printer',
            text: 'Printer adapt',
            tooltip: "specify printer adaptations details \n(e.g. offsets)"
          },
          {
            id: 'restpos_1.3',
            text: 'rests as V 1.3',
            tooltip: "configure positioning of rests\ncompatible to version 1.3"
          },
          {text: 'xx', tooltip: "inject the default configuration (for development use only)"},
        ]
      },
      {
        type: 'menu',
        text: "Edit Config",
        id: 'edit_config',
        icon: 'fa fa-pencil',
        tooltip: "Edit configuration with forms",
        items: [
          {
            id: 'extract_annotation',
            text: 'Extract-Annotation',
            icon: 'fa fa-bars',
            tooltip: "Edit annotations of an extract"
          },
          {
            id: 'notes',
            text: 'page annotation',
            icon: 'fa fa-file-text-o',
            tooltip: "edit settings for sheet annotations\nin current extract"
          },
          {},
          {
            id: 'basic_settings',
            text: 'basic settings',
            icon: 'fa fa-heartbeat',
            tooltip: "Edit basic settings of extract"
          },
          {id: 'lyrics', text: 'lyrics', icon: 'fa fa-font', tooltip: "edit settings for lyrics\nin current extract"},
          {
            id: 'layout',
            text: 'layout',
            icon: 'fa fa-align-center',
            tooltip: "Edit layout paerameters\nin current extract"
          },
          {
            id: 'instrument_specific',
            text: 'instrument specific',
            icon: 'fa fa-pie-chart',
            tooltip: "settings for specific instrument sizes"
          },
          {},
          {
            id: 'barnumbers_countnotes',
            text: 'barnumbers and countnotes',
            icon: 'fa fa-music',
            icon: 'fa fa-list-ol',
            tooltip: "edit barnumbers or countnotes"
          },
          {
            id: 'repeatsigns',
            text: 'repeat signs',
            icon: 'fa fa-repeat',
            tooltip: "edit shape of repeat signs"
          },
          {
            id: 'annotations',
            text: 'annotations',
            icon: 'fa fa-commenting-o',
            tooltip: "edit settings for sheet annotations\nin current extract"
          },
          {},
          {
            id: 'stringnames',
            icon: 'fa fa-ellipsis-h',
            text: 'Stringnames',
            tooltip: "Edit presentation of stringanmes"
          },
          {id: 'printer', icon: 'fa fa-print', text: 'Printer adapt', tooltip: "Edit printer correction paerameters"},
          {},
          {id: 'minc', icon: 'fa fa-adjust', text: 'minc', tooltip: "edit extra increments"}
        ]
      },
      {
        type: 'menu',
        text: "Insert Addon",
        id: 'add_snippet',
        items: [
          // note the text here shall match the names of subclasses of Snippeteditor::Form to get the right translation
          {id: 'goto', text: 'Goto', tooltip: "Add a Jump"},
          {id: 'shifter', text: 'Shifter', tooltip: "Add a shift"},
          {},
          {id: 'draggable', text: 'Draggable', tooltip: "Add a draggable mark"},
          {},
          {id: 'annotation', text: 'Annotation', tooltip: "Add an annotation"},
          {id: 'annotationref', text: 'AnnotationRef', tooltip: "Add a predefined annotation"},
          {},
          {id: 'jumptarget', text: 'Jumptarget', tooltip: "Add a Jumptarget"}
        ],
        icon: 'fa fa-gear',
        tooltip: "Insert addon at cursor position",
      },
      {
        type: 'button',
        text: "Edit Addon",
        id: 'edit_snippet',
        icon: 'fa fa-pencil',
        tooltip: "Edit addon on cursor position"
      }
    ],

    onClick: function (event) {
      // handle perspectives
      if (perspectives[event.target]) {
        perspectives[event.target]();
        if (event.subItem) {
          event.item.text = event.subItem.text
        }
      }

      // handle previews
      if (previews[event.target]) {
        previews[event.target]();
      }

      config_event = event.target.split(":")
      if (['config'].includes(config_event[0])) {
        if (config_event[1]) {
          uicontroller.$handle_command("addconf " + event.target.split(":")[1])
        }
      }

      config_event2 = event.target.split(":")
      if (['edit_config'].includes(config_event2[0])) {
        if (config_event2[1]) {
          w2ui.layout_left_tabs.click('configtab');
          uicontroller.$handle_command("editconf " + config_event2[1])
        }
      }

      config_event3 = event.target.split(":")
      if (['edit_snippet'].includes(config_event3[0])) {
        w2ui.layout_left_tabs.click('abcEditor');
        uicontroller.$handle_command("editsnippet")
      }

      config_event4 = event.target.split(":")
      if (['add_snippet'].includes(config_event4[0])) {
        if (config_event4[1]) {
          w2ui.layout_left_tabs.click('abcEditor');
          uicontroller.$handle_command("addsnippet " + config_event4[1])
        }
      }
    }

  }
  var statusbar = {
    id: 'statusbarbar',
    name: 'statusbar',
    style: sbstyle,
    items: [
      {
        type: 'button',
        id: 'sb_cursorposition',
        text: '<div style="padding: 0px !important;"><span class="editor-status-position" "></span></div>'
      },
      {
        type: 'button',
        id: 'sb_tokeninfo',
        size: '50px',
        text: '<div style="padding: 0px !important;"><span class="editor-status-tokeninfo" "></span></div>'
      },
      {
        type: 'button',
        id: 'sb_dropbox-status',
        text: '<div style="padding: 0px !important;"><span class="dropbox-status" "></span></div>'
      },
      {
        type: 'button',
        id: 'sb_loglevel',
        text: '<div style="padding: 0px !important;"><span class="sb-loglevel" "></span></div>'
      },
      {
        type: 'button',
        id: 'sb_mode',
        text: '<div style="padding: 0px !important;"><span class="sb-mode" "></span></div>'
      },
      {type: 'spacer'},
      {
        type: 'button',
        id: 'sb_confkey',
        text: '<div style="padding: 0px !important;"><span class="mouseover-conf-key"></span></div>'
      },

    ],

    onClick: function (event) {
      sb_event = event.target.split(":")
      if (sb_event[0] == 'sb_loglevel') {
        uicontroller.$toggle_console()
      }
    }
  }


  var editortabshtml = '<div id="editortabspanel" style="height:100%">'
    + '<div id="abcEditor" class="tab" style="height:100%;"></div>'
    + '<div id="abcLyrics" class="tab" style="height:100%;"></div>'
    + '<div id="configtab" class="tab" style="height:100%;"></div>'
    + '</div>'
  ;

  var editortabsconfig = {
    name: 'editortabs',
    active: 'abcEditor',
    tabs: [
      {id: 'abcEditor', text: w2utils.lang('abc')},
      {id: 'abcLyrics', text: w2utils.lang('lyrics')},
      {id: 'configtab', text: w2utils.lang('Configuration')}
    ],
    onClick: function (event) {
      $('#editortabspanel .tab').hide();
      if (event.target == "abcLyrics") {
        uicontroller.editor.$to_lyrics()
      }
      $('#' + event.target).show();
      $('#' + event.target).resize();
    }
  };

  var zoomtabsconfig = {
    name: 'zoomtabs',
    active: 'groß',
    tabs: [
      {text: 'large', id: 'groß', icon: 'fa fa-expand', tooltip: "large view\nto see all details"},
      {
        text: 'medium',
        id: 'mittel',
        icon: 'fa fa-dot-circle-o',
        tooltip: "medium view\nmost commonly used\nautoscroll works"
      },
      {text: 'small', id: 'klein', icon: 'fa fa-compress', tooltip: "small view\nto get an overview"},
      {text: 'fit', id: 'fit', icon: 'fa fa-arrows-alt', tooltip: "fit to viewport"}

      // {id: 'groß', text: w2utils.lang('large'), icon: ''},
      // {id: 'mittel', text: w2utils.lang('medium')},
      // {id: 'klein', text: w2utils.lang('small')},
      // {id: 'fit', text: w2utils.lang('fit')}
    ],
    onClick: function (event) {
      $('#harpPreview .tab').hide();
      scalehandlers['tb_scale:' + event.target]();
      $('#harpPreview #' + event.target).show();
    }
  };


  $('#statusbar-layout').w2layout(
    {
      name: 'statusbar-laoyut',
      panels: [
        //{type: 'main', id: 'statusbar', resizable: false, style: pstyle, content: '<div id="statusbar" style="overflow:hidden;border: 1pt solid #000000;" class="zn-statusbar" >statusbar</div>',  hidden: false}
        {
          type: 'main',
          id: 'statusbar',
          resizable: false,
          style: pstyle,
          content: '',
          toolbar: statusbar,
          hidden: false
        }
      ]
    }
  );

  $('#layout').w2layout({
    name: 'layout',
    panels: [
      {type: 'top', id: 'foobar', size: 30, resizable: false, content: '', toolbar: toolbar, hidden: false},  // Toolbar
      {
        type: 'left',
        size: '50%',
        hidden: false,
        resizable: true,
        toolbar: editor_toolbar,
        style: pstyle,
        tabs: editortabsconfig,
        content: editortabshtml
      },
      {
        type: 'main',
        style: pstyle,
        overflow: 'hidden',
        //tabs: editortabsconfig,
        content: '<div id="tunePreview"  style="height:100%;" ></div>'
      },
      {
        type: 'preview',
        size: '50%',
        resizable: true,
        hidden: false,
        style: pstyle,
        tabs: zoomtabsconfig,
        content: '<div id="harpPreview" style="height:100%"></div>'
      },
      {
        type: 'right',
        size: 200,
        resizable: true,
        hidden: true,
        style: pstyle,
        content: '<div id="configEditor"></div>'
      },
      {
        type: 'bottom',
        size: '10%',
        resizable: true,
        hidden: true,
        style: pstyle,
        content: '<div id="commandconsole"></div>'
      }
    ]

  });

  w2ui['layout'].refresh();
  $('#editortabspanel .tab').hide();
  $('#abcEditor').show();

  w2ui['layout'].onResize = function (event) {
    uicontroller.editor.$resize();
  }
}
;


/*
 here we have some entry points to be used by controller
 TODO: refactor this?
 */

function set_tbitem_caption(item, caption) {
  w2ui.layout_top_toolbar.set(item, {text: caption});
}

function update_systemstatus_w2ui(systemstatus) {
  $(".dropbox-status").html(systemstatus.dropbox);
  w2ui.layout_top_toolbar.set('tb_home', {text: "Zupfnoter" + " " + systemstatus.version})

  var tb_view_title = w2ui.layout_top_toolbar.get('tb_view:' + systemstatus.view)
  tb_view_title = (tb_view_title ? tb_view_title.text : systemstatus.view)

  set_tbitem_caption('tb_view', 'Extract ' + tb_view_title);

  $(".sb-loglevel").html('Loglevel: ' + systemstatus.loglevel);
  $(".sb-mode").html(w2utils.lang('Mode') + ': ' + systemstatus.mode);

  if (systemstatus.mode == 'demo') {
    w2ui.layout_top_toolbar.disable('tb_file')
    w2ui.layout_top_toolbar.disable('tb_create')
    w2ui.layout_top_toolbar.disable('tb_open')
    w2ui.layout_top_toolbar.disable('tb_save')
    w2ui.layout_top_toolbar.disable('tbDropbox')
    w2ui.layout_top_toolbar.disable('tb_login')
  }
  else {
    w2ui.layout_top_toolbar.enable('tb_file')
    w2ui.layout_top_toolbar.enable('tb_create')
    w2ui.layout_top_toolbar.enable('tb_open')
    // w2ui.layout_top_toolbar.enable('tb_save')
    w2ui.layout_top_toolbar.enable('tbDropbox')
    w2ui.layout_top_toolbar.enable('tb_login')
  }


  if (systemstatus.music_model == 'changed') {
    $("#tb_layout_top_toolbar_item_tb_save table").addClass("alert")
  } else {
    $("#tb_layout_top_toolbar_item_tb_save table").removeClass("alert")
  }
  ;


}

function update_error_status_w2ui(errors) {
  w2popup.open({title: w2utils.lang("Errors occurred"), body: errors, width: 700})
}

function update_editor_status_w2ui(editorstatus) {
  $(".editor-status-position").html(editorstatus.position);
  $(".editor-status-tokeninfo").html(editorstatus.tokeninfo);
  if (editorstatus.token.type.startsWith("zupfnoter.editable")) {
    w2ui.layout_left_toolbar.enable('edit_snippet')
  }
  else {
    w2ui.layout_left_toolbar.disable('edit_snippet')
  }

  // todo: implement a proper inhibit manager
  if (editorstatus.token.type.startsWith("zupfnoter.editable.before")) {
    w2ui.layout_left_toolbar.enable('add_snippet');
    w2ui.layout_left_toolbar.enable('add_snippet:annotation', 'add_snippet:annotationref', 'add_snippet:jumptarget', 'add_snippet:draggable', 'add_snippet:shifter');

    w2ui.layout_left_toolbar.disable('edit_snippet');
  }
  else {
    w2ui.layout_left_toolbar.disable('add_snippet')
  }

  if (editorstatus.token.type.startsWith("zupfnoter.editable.beforeBar")) {
    w2ui.layout_left_toolbar.disable('add_snippet:annotation', 'add_snippet:annotationref', 'add_snippet:jumptarget', 'add_snippet:draggable', 'add_snippet:shifter');
  }


  w2ui.layout_left_toolbar.refresh()
}

function update_mouseover_status_w2ui(element_info) {
  $(".mouseover-conf-key").html(element_info);
}

function update_play_w2ui(status) {
  if (status == "start") {
    w2ui.layout_top_toolbar.set('tbPlay', {text: "Stop", icon: "fa fa-stop"})
  }
  else {
    w2ui.layout_top_toolbar.set('tbPlay', {text: "Play", icon: "fa fa-play"})
  }
}

function disable_save() {
  w2ui.layout_top_toolbar.disable('tb_save')
};

function enable_save() {
  w2ui.layout_top_toolbar.enable('tb_save')
};

function before_open() {
  w2ui.layout_left_tabs.click('abcEditor')
};

function set_extract_menu(id, text) {
  w2ui.layout_top_toolbar.set('tb_view:' + id, {text: text});
  w2ui.layout_top_toolbar.refresh();
};

;

function openPopup(theForm) {

  if (!w2ui[theForm.name]) {
    $().w2form(theForm);
  }
  $().w2popup('open', {
    title: theForm.text,
    body: '<div id="form" style="width: 100%; height: 100%;"></div>',
    style: 'padding: 15px 0px 0px 0px',
    width: 500,
    height: 300,
    modal: true,
    showMax: true,
    onToggle: function (event) {
      $(w2ui[theForm.name].box).hide();
      event.onComplete = function () {
        $(w2ui[theForm.name].box).show();
        w2ui[theForm.name].resize();
      }
    },
    onOpen: function (event) {
      event.onComplete = function () {
        // specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler, which would make this code execute too early and hence not deliver.
        $('#w2ui-popup #form').w2render(theForm.name);
      }
    }
  });
}

if (String.prototype.repeat == undefined) {
  String.prototype.repeat = function (n) {
    n = n || 1;
    return Array(n + 1).join(this);
  }
}

