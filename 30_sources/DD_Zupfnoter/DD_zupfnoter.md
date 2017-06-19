# Basic architecture

Zupfnoter applies the following models

* **abctext** this is entered by user and maintained in textpane.rb
* **abcmodel** this is created by abc2svg
* **musicmodel** this is created by transform. Model elements are such as Playable, Note, Rest, Goto etc. This conceptualizes the Harpnote Elements.
* **drawingmodel** this represents the layout independent of the target format. Model elements are such asl "Ellipse, Path, (FlowLine)". This conceptualizes graphical terms.
* **svg**  created from drawingmodel by svgengine
* **pdf** created from drawingmodel by pdfengine
* **harpnoteplayer** created from musicmodel

# Handling google analytics

* Analytics ia applied for webserver-installation only, not for localhost nor desktop
* this is done by the method `javascript_include_analytics` which is defined in the related rake tasks.
* for localhost, the method is not defined, and therefore the template does not include the script

# build environments

## rvm ruby homebrew etc

### having some trouble with SIP

    https://digitizor.com/fix-homebrew-permissions-osx-el-capitan/
    
    https://www.computersnyou.com/5307/setup-homebrew-and-rvm-on-mac-osx-10-11-ei-capitan/
    
    http://stackoverflow.com/questions/22459944/ruby-2-1-1-with-rvm-getting-libyaml-errors
    
### my setup on osx
 
1. install homebrew locally
    
    https://github.com/Homebrew/brew/blob/master/docs/Installation.md#installation
    
    cd ~
    git clone https://github.com/Homebrew/brew.git
    export PATH=${HOME}/brew/bin:${PATH}
    
2. update ~/.bashrc 

    # Add RVM to PATH for scripting. Make sure this is the last PATH variable change.
    export PATH=${HOME}/brew/bin:${PATH}
    export PATH="$PATH:$HOME/.rvm/bin"
    
3. install rvm

    https://rvm.io/rvm/install

    

## project documentation

* goto `30_source/ZSUPP_Tools`
* `rake`

## maintain the application

* goto `30_source/SRC_Zupfnoter/src`
* `rake`

## updating syntax highlighting

* goto your clone of the ace reporitory (../200_zupfnoter_external_components/ace)
* update the files as described in <http://ace.c9.io/#nav=higlighter>
* run  `node static.js --allow-save` .
* navigate to http://localhost:8888/tool/mode_creator.html
* perform necessary changes
* perform 

	node Makefile.dryice.js -nc -m full

* copy the contents of `200_zupfnoter_external_components/ace/build/src-min-noconflict` to 
`30_sources/SRC_Zupfnoter/vendor/ace`

# preparing a release

Zupfnoter uses gitflow http://nvie.com/posts/a-successful-git-branching-model/

Before preparing a release, everything that should go to this release shall be committed to the develop branch.

* Gitflow: Start new release
    Pattern: V_1.4.0_RC2
* adjust version.rb
* perform all the builds
	`rake build`
	`rake deploy`
* Gitflow: finish the release
* switch back to the development branch
* bump version in src/version.rb, add ".dev"

# building the desktop app

The desktop app is built based on node-webkit. The major steps to build it are described in

https://github.com/rogerwang/node-webkit/wiki/How-to-package-and-distribute-your-apps

Approach follows nodebob but uses rake to do this.

1. create the webapp
2. create zupfnoter.nw
3. create the binaries for windows and osx



