# require 'promise'

## this wraps dropbox - api - v2.0

module Opal
  module DropboxJs

    # this is a dummy client to register before login
    class NilClient
      attr_accessor :root_in_dropbox, :app_name, :app_id

      def method_missing(m, *args, &block)
        raise I18n.t("you are not logged in to dropbox")
      end

      def is_authenticated?
        false
      end
    end

    # This class wraps the dropbox-js client
    # http://coffeedoc.info/github/dropbox/dropbox-js/master/class_index.html
    # all methods yield a promise (see http://opalrb.org/blog/2014/05/07/promises-in-opal/)
    class Client
      attr_accessor :root_in_dropbox, :app_name, :app_id, :login_info

      # @param [String] key - the Dropbox API key
      def initialize(key)
        @errorlogger = lambda { |error| $log.error(error) }

        @accesstoken_key = "dbx_token"
        @app_secret = "jt8veky2idx2kkj"
        @app_key = key

        ## todo do we need this?  @root = `new Dropbox({clientId: #{key}, clientSecret: #{@app_secret}})`

        @redirect_uri = Controller::get_uri[:origin] + "/"
        @dropboxPKCE = `new DropboxPKCE(#{key}, #{@redirect_uri})`;
      end

      def get_access_token_from_localstore
        token = `localStorage.getItem(#{@accesstoken_key})`
        if token
          parsed_token = JSON.parse(`token`)
          refresh_token = parsed_token["refresh_token"]

          if refresh_token
            new_access_token = get_new_access_token_from_dropbox(refresh_token)
            if new_access_token
              parsed_token["access_token"] = new_access_token
              save_access_and_refresh_token_to_localstore(parsed_token)
              new_access_token
            else
              parsed_token["access_token"]
            end
          else
            parsed_token["access_token"]
          end
        else
          nil # Kein Token gefunden
        end
      end

      def get_new_access_token_from_dropbox(refresh_token)
        new_token = nil
        %x{
          (async function() {
            try {
              const response = await #{@dropboxPKCE}.refreshToken(#{refresh_token});
              #{new_token} = response.access_token;
              console.log("New access token obtained:", #{new_token});
            } catch (error) {
              console.error("Token refresh failed:", error.message);
            }
          })();
        }
        new_token
      end

      def get_refresh_token_from_localstore
        r = %x{ localStorage.getItem(#{@refreshtoken_key}) }
      end

      def save_access_and_refresh_token_to_localstore(token)
        %x{
             localStorage.setItem(#{@accesstoken_key}, JSON.stringify(#{token}))
        }
      end

      def remove_access_token_from_localstore
        r = %x{ localStorage.removeItem( #{@accesstoken_key}) }
      end

      def revoke_zombie_access_token(access_token)
        %x{
           dbx =  new Dropbox({accessToken: #{access_token}});

           dbx.authTokenRevoke()
           .then(function(response) {
             #{$log.error("Zombie-Token revoked")};
           }
          ).catch(function(error){
            #{$log.error("failed to revoke Zombie-token")};
           }
          );
        }
        nil
      end

      def revoke_access_token()
        with_promise do |iblock|
          %x{
           access_token = #{get_access_token_from_localstore};  // try to ge an accesstoken from previous session
           if (access_token){
              #{@root}.authTokenRevoke()                       // revoke the access toke at dropbox
                    .then(function (response) {
                        #{remove_access_token_from_localstore};  // remove an existing access token in case of success
                        #{iblock.call(nil, `response`)}
                       }
                     ).catch(function (error) {
                        #{remove_access_token_from_localstore};  // remove an existing access token in case of error; it is mainly a malformed token
                        #{iblock.call(`error`, nil)} }
                     );
            }
           else
            {
             #{
            message = I18n.t("No access token to revoke")
            iblock.call(`{error: #{message}}`, nil)
          }
            }
         }
        end
      end

      def getAccessToken(iblock)
        %x{
           const parsedUrl = new URL(window.location.href);
           const code = parsedUrl.searchParams.get('code')
           if (code) {
             console.log("Authorization code found, exchanging for tokens...");
             #{getAccesstokenWithRefresh(iblock, `code`)}
           }
           else {
             console.log("No authorization code in URL, checking for existing access token");
            #{getAccessTokenNoRefresh(iblock)}
           }
         }
      end

      def getAccesstokenWithRefresh(iblock, code)
        %x{
             (async function() {
               try {
                 console.log("Exchanging code for tokens...");
                 const token = await #{@dropboxPKCE}.exchangeCodeForTokens(#{code});
                 console.log("Token exchange successful:", token);
                 #{save_access_and_refresh_token_to_localstore(`token`)}
                 #{iblock.call(nil, true)}
               } catch (error) {
                 console.error("Token exchange failed:", error.message);
                 alert("getAccessTokenWithRefresh: " + error.message);
                 #{iblock.call(`{error: error.message}`, nil)}
               }
             })();
        }
      end

      def getAccessTokenNoRefresh(iblock)
        %x{
            parseQueryString = function(str) {
                  var ret = Object.create(null);

                  if (typeof str !== 'string') {
                    return ret;
                  }

                  str = str.trim().replace(/^(\?|#|&)/, '');

                  if (!str) {
                    return ret;
                  }

                  str.split('&').forEach(function (param) {
                    var parts = param.replace(/\+/g, ' ').split('=');
                    // Firefox (pre 40) decodes `%3D` to `=`
                    // https://github.com/sindresorhus/query-string/pull/37
                    var key = parts.shift();
                    var val = parts.length > 0 ? parts.join('=') : undefined;

                    key = decodeURIComponent(key);

                    // missing `=` should be `null`:
                    // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
                    val = val === undefined ? null : decodeURIComponent(val);

                    if (ret[key] === undefined) {
                      ret[key] = val;
                    } else if (Array.isArray(ret[key])) {
                      ret[key].push(val);
                    } else {
                      ret[key] = [ret[key], val];
                    }
                  });
                  return ret;
                }

            dropbox_answers = parseQueryString(window.location.hash);   // see if access token is provided by url as part of the authentification process
            window.history.replaceState(null, null, window.location.pathname); // remove access-token from addressbar (http://stackoverflow.com/questions/22753052/remove-url-parameters-without-refreshing-page)
            access_token_from_url = dropbox_answers.access_token;

            if (dropbox_answers.error)
                 {
                   #{remove_access_token_from_localstore}
                   #{iblock.call(%x{{error: dropbox_answers.error_description}}, nil)}
                   return ;
                 }

            access_token = #{get_access_token_from_localstore};  // try to ge an accesstoken from previous session

            // login-status
            //
            //app      token       url-token   |  status     situation
            //
            // no        no            no       !   ok        not logged in
            // no        no            yes      !   fail      zombie login
            // no        yes           no       !   fail      zombie token
            // no        yes           no       !   fail      zombie token and zombie login
            //
            // yes       no            yes      !   ok        new login
            // yes       no            no       !   fail      lost token
            // yes       yes           yes      !   fail      zombie login
            // yes       yes           no       !   ok        already logged in

            if ( #{@app_id.nil?}){
              if (! access_token && ! access_token_from_url)
               {
                // we are not logged in
               }
              else
               {
                 message = #{I18n.t("Zombie token or zombie login occured. Maybe you hit the back button in the browser.")}
                 #{iblock.call(%x{{"error": message }}, nil)}
               }
             }
            else
             {
              if (!access_token ) {
                if (access_token_from_url) {   // new login
                    #{@root} = new Dropbox({accessToken: access_token_from_url})
                    #{save_access_and_refresh_token_to_localstore(`access_token_from_url`)}
                    #{iblock.call(nil, true)}
                 }
                else  // ! lost token
                 {
                    message = #{I18n.t("Access token lost; do note use browser back or refresh button in login procedure.")}
                    #{iblock.call(%x{{"error": message }}, nil)}
                 }
               }
             else  // has token
              {
                if (access_token_from_url){ // zombie token
                  message = #{I18n.t("Zombie Accesstoken revoked; do not use Browser back after login to dropbox")}
                #{
                  revoke_zombie_access_token(`access_token_from_url`)
                  iblock.call(%x{{"error": message }}, nil)
                }
                 }
              else  // already logged in
               {
                #{@root} = new Dropbox({accessToken: access_token})
                #{iblock.call(nil, true)}
               }
            }
          }
        }
      end

      # this method supports to execute a block in a promise
      #
      # with_promise() do |iblock|
      #     the payload code handle argument
      #     iblock = the block provided to the underlying API.
      #              its signature is derived from the the underlying library.
      #              in this case it is defined by the callbacks of drobox-js V1 which has two paramteres (error, data)
      # end
      #
      # @yieldparam [Lambda] block payload the block with the job to do
      # @return [Promise]
      #
      def with_promise(&block)
        Promise.new.tap do |promise|
          block.call(lambda { |error, data|
            if error
              # todo: don't know if this is generic enough. it assumes that error is a dedicated structure.
              errorjson = %x{JSON.stringify(error)}
              errormessage = Native(error).error rescue errorjson
              promise.reject(errormessage)
            else
              promise.resolve(data)
            end
          }
          )
        end
      end

      # this method supports to invoke the dropbox_chooser
      #
      # with_promise() do |iblock|
      #     the payload code handle argument
      #     iblock = the block provided to the underlying API.
      #              its signature is derived from the the underlying library.
      #              in this case it is defined by the callbacks of
      #              dropbox chooser which has one parameter (and no error handling)
      #
      # @yieldparam [Lambda] block payload the block with the job to do
      # @return [Promise]
      #
      def with_promise_chooser(&block)
        Promise.new.tap do |promise|
          block.call(lambda { |data|
            if data == false
              promise.reject(I18n.t("you are not logged in to dropbox"))
            else
              promise.resolve(Native(data))
            end
          }
          )
        end
      end

      # this is like with_promie, but
      # does a bunch of retries
      def with_promise_retry(info = "", retries = 2, &block)
        Promise.new.tap do |promise|
          remaining = retries
          handler = lambda { |error, data|
            if error
              remaining -= 1
              if remaining >= 0
                $log.info("#{remaining} remaining retries #{info}, error: #{`error.error`}")
                block.call(handler)
              else
                $log.error(I18n.t("Error from Dropbox with failed retries"))
                promise.reject("Repeated Error from Dropobox")
              end
            else
              $log.info("successs #{info}")
              promise.resolve(data)
            end
          }
          block.call(handler)
        end
      end

      # authenticate on dropbox
      # @return [Promise]
      def authenticate()
        with_promise() do |iblock|
          getAccessToken(iblock)
        end
      end

      ## this performs a login on Dropbox
      def login
        %x{
           #{@dropboxPKCE}.getAuthUrl(#{Controller::get_uri[:origin]}).then(function(authUrl){
             window.location.href = authUrl;
           })
         }
      end

      def reconnect()
        access_token = get_access_token_from_localstore # try to get an accesstoken from previous session
        if access_token
          @root = %x{new Dropbox({accessToken: #{access_token}})}
        end
      end

      def is_authenticated?
        not Native(get_access_token_from_localstore).nil?
      end

      def validate_token
        %x{
        #{@login_info} = 'unknown token status';
        #{@root}.usersGetCurrentAccount()
           .then((response) => {
             #{@login_info} = response;
             alert("foo" + JSON.stringify(response));
             console.log('Token ist gültig:', response);
        })
        .catch((error) => {
          if (error.status === 401) {
            #{@login_info} = 'TOKEN UNGÜLTIG: ' + error.message;
            alert('Dropbox-Zugriff ist ungültig oder abgelaufen.');
          } else {
            #{@login_info} = 'SonstigerFehler: ' + error.message;
            alert('Ein anderer Fehler ist aufgetreten:', error);
          }
          });
        }
      end

      # get information about the dropbox account
      # @return [Promise]
      def get_account_info()
        with_promise() do |iblock|
          %x{#@root.getAccountInfo(#{iblock})}
        end
      end

      # write a file to dropbox

      # @param [String] filename of the file to be written to
      # @param [String] data data to be written to the file
      # @return [Promise]

      def write_file(filename, data)
        with_promise_retry(filename, 4) do |iblock|
          %x{#{@root}.filesUpload({path: #{filename}, contents: #{data}, mode:{'.tag': 'overwrite'}})
            .then(function(response){
                #{iblock}(nil, response)})
            .catch(function(error){
                #{iblock}(error, nil)})
            }
        end
      end

      # @param [String] filename name of the file to be read
      # @return [Promise]

      def read_file(filename)
        with_promise() do |iblock|
          %x{#@root.filesDownload({path: #{filename}})
                .then(function(response){
                    reader = new FileReader();
                    reader.addEventListener("loadend", function(){
                     #{iblock}(nil, reader.result);
                    });
                    reader.readAsText(response.result.fileBlob);
                 })
                .catch(function(error){#{iblock}(error, nil)})
                }
        end
      end

      # @param [String] dirname - name of the directory to be read
      # @return [Promise]

      def read_dir(dirname = "/")
        with_promise() do |iblock|
          %x{
          #{@root}.filesListFolder({path: #{dirname}})
                .then(function (response) {
                    #{iblock}(nil, response.result.entries.map(function(i){return i.name}))
                })
                .catch(function (error) {
                    #{iblock}(error, nil)
                });
          }
        end
      end

      # @param [String] dirname - name of the directory to be read
      # @return [Promise]

      def read_dirxx(dirname = "/")
        a = %x{#{@root}.filesListFolder({path: #{dirname}})}
        Promise.from_native(a).then do |value|
          Promise.new.tap do |promise|
            begin
              result = Native(value)[:entries].map { |i| i.name }
              promise.resolve(result)
            rescue Exception => error
              promise.reject(error.message)
            end
          end
        end
      end

      def choose_file(options)

        with_promise_chooser() do |iblock|
          if is_authenticated?
            %x{
              dropbox_options = {

                  // Required. Called when a user selects an item in the Chooser.
                      success: #{iblock},

                  // Optional. Called when the user closes the dialog without selecting a file
                  // and does not include any parameters.
                          cancel: function() {

                                  },

                       linkType: "direct", // or "direct"

                  // Optional. This is a list of file extensions. If specified, the user will
                  // only be able to select files with these extensions. You may also specify
                  // file types, such as "video" or "images" in the list. For more information,
                  // see File types below. By default, all extensions are allowed.
                      extensions: ['.abc'],
                  };

                  Dropbox.choose(dropbox_options);
          }
          else
            iblock.call(false)
          end
        end
      end

    end

  end
end