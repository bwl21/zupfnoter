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
        token_str = `localStorage.getItem(#{@accesstoken_key})`
        return nil if `token_str === null || token_str === undefined`
        
        # Try to parse as JSON (new format with refresh_token)
        begin
          parsed_token = JSON.parse(token_str)
          refresh_token = parsed_token["refresh_token"]

          if refresh_token
            # Try to refresh token if refresh_token exists
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
        rescue
          # Old format (plain string token) - user needs to re-login
          $log.info("Old token format detected. Clearing and requiring re-login.")
          `localStorage.removeItem(#{@accesstoken_key})`
          nil
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
                 // Initialize Dropbox client with new access token
                 #{@root} = new Dropbox({accessToken: token.access_token})
                 // Clear code from URL only AFTER successful token exchange
                 window.history.replaceState(null, null, window.location.pathname);
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

            // PKCE flow returns code in query string (?code=...)
            // Note: URL will be cleaned AFTER successful token exchange in getAccesstokenWithRefresh()
            dropbox_answers = parseQueryString(window.location.search);
            code_from_url = dropbox_answers.code;

            if (dropbox_answers.error)
                 {
                   #{remove_access_token_from_localstore}
                   #{iblock.call(%x{{error: dropbox_answers.error_description}}, nil)}
                   return ;
                 }

             access_token = #{get_access_token_from_localstore};  // try to get accesstoken from previous session
             console.log("access_token:", access_token);
             console.log("code_from_url:", code_from_url);

             // Simple logic: if we have a token, use it. If code in URL, exchange it for new token.
             // Ignore code in URL if we already have a valid token (avoids "code expired" errors on reload)

             if (access_token) {
               // Case 1: Already logged in - use existing token
               #{@root} = new Dropbox({accessToken: access_token})
               #{iblock.call(nil, true)}
             }
             else if (code_from_url) {
               // Case 2: New login - code in URL, no token yet
               // This will be exchanged for tokens in getAccesstokenWithRefresh()
               #{getAccesstokenWithRefresh(iblock, `code_from_url`)}
             }
             else {
               // Case 3: Not logged in - no token and no code
               #{iblock.call(nil, false)}
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
          $log.info("Reconnecting to Dropbox with token: #{access_token[0..10]}...")
          @root = %x{new Dropbox({accessToken: #{access_token}})}
        else
          $log.warn("No access token available for reconnect")
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
          %x{
            (async function() {
              try {
                let token = localStorage.getItem(#{@accesstoken_key});
                if (!token) {
                  #{iblock}({error: 'Not authenticated'}, nil);
                  return;
                }
                
                // Try to parse token and get fresh access token if needed
                try {
                  const tokenData = JSON.parse(token);
                  const refreshToken = tokenData.refresh_token;
                  
                  if (refreshToken) {
                    try {
                      const newTokenData = await #{@dropboxPKCE}.refreshToken(refreshToken);
                      tokenData.access_token = newTokenData.access_token;
                      localStorage.setItem(#{@accesstoken_key}, JSON.stringify(tokenData));
                      token = newTokenData.access_token;
                    } catch (refreshError) {
                      console.warn('Token refresh failed, using existing token:', refreshError);
                      token = tokenData.access_token;
                    }
                  } else {
                    token = tokenData.access_token;
                  }
                } catch (parseError) {
                  // Old token format (plain string)
                }
                
                const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Bearer ' + token,
                    'Dropbox-API-Arg': JSON.stringify({path: #{filename}, mode: {'.tag': 'overwrite'}}),
                    'Content-Type': 'application/octet-stream'
                  },
                  body: #{data}
                });
                
                if (!response.ok) {
                  #{iblock}({error: 'HTTP ' + response.status}, nil);
                  return;
                }
                
                const result = await response.json();
                #{iblock}(nil, result);
              } catch(error) {
                console.error('Error writing file:', error);
                #{iblock}(error, nil);
              }
            })();
          }
        end
      end

      # @param [String] filename name of the file to be read
      # @return [Promise]

      def read_file(filename)
         with_promise() do |iblock|
           %x{
             (async function() {
               try {
                 let token = localStorage.getItem(#{@accesstoken_key});
                 if (!token) {
                   #{iblock}({error: 'Not authenticated'}, nil);
                   return;
                 }
                 
                 // Try to parse token and get fresh access token if needed
                 try {
                   const tokenData = JSON.parse(token);
                   const refreshToken = tokenData.refresh_token;
                   
                   if (refreshToken) {
                     // Try to refresh the token
                     try {
                       const newTokenData = await #{@dropboxPKCE}.refreshToken(refreshToken);
                       tokenData.access_token = newTokenData.access_token;
                       localStorage.setItem(#{@accesstoken_key}, JSON.stringify(tokenData));
                       token = newTokenData.access_token;
                       console.log('Token refreshed successfully');
                     } catch (refreshError) {
                       console.warn('Token refresh failed, using existing token:', refreshError);
                       token = tokenData.access_token;
                     }
                   } else {
                     token = tokenData.access_token;
                   }
                 } catch (parseError) {
                   // Old token format (plain string)
                 }
                 
                 // Download file
                 const response = await fetch('https://content.dropboxapi.com/2/files/download', {
                   method: 'POST',
                   headers: {
                     'Authorization': 'Bearer ' + token,
                     'Dropbox-API-Arg': JSON.stringify({path: #{filename}})
                   }
                 });
                 
                 if (!response.ok) {
                   #{iblock}({error: 'HTTP ' + response.status + ': ' + response.statusText}, nil);
                   return;
                 }
                 
                 const blob = await response.blob();
                 const reader = new FileReader();
                 reader.addEventListener("loadend", function(){
                   #{iblock}(nil, reader.result);
                 });
                 reader.readAsText(blob);
               } catch(error) {
                 console.error('Error reading file:', error);
                 #{iblock}(error, nil);
               }
             })();
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