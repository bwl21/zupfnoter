require 'promise'


module Opal
  module DropboxJs


    # this is a dummy client to register before login
    class NilClient
      attr_accessor :root_in_dropbox, :app_name

      def authenticate()
        raise "not logged in to dropbox"
      end
    end

    # This class wraps the dropbox-js client
    # http://coffeedoc.info/github/dropbox/dropbox-js/master/class_index.html
    # all methods yield a promise (see http://opalrb.org/blog/2014/05/07/promises-in-opal/)
    class Client
      attr_accessor :root_in_dropbox, :app_name


      # @param [String] key - the Dropbox API key
      def initialize(key)
        @errorlogger = lambda { |error| $log.error(error) }

        @root = `new Dropbox.Client({ key: #{key} });`
        # %x{
        #    self.root.onError.addListener(function(error) {
        #                            self.errorlogger(error)
        #    });
        # }
      end


      # this method supports to execute a block in a promise
      #
      # with_promise() do |iblock|
      #     the payload code handle argument
      #     iblock = the block provided to the underlying API.
      #              its signature is derived from the the underlying library.
      #              in this case it is defined by the callbacks of drobox-js which has two paramteres (error, data)
      # end
      #
      # @yieldparam [Lambda] block payload the block with the job to do
      # @return [Promise]
      #
      def with_promise(&block)
        Promise.new.tap do |promise|
          block.call(lambda { |error, data|
            if error
              promise.reject(error)
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
            if false
              promise.reject(error)
            else
              promise.resolve(Native(data))
            end
            }
          )
        end
      end

      # this is like with_promie, but
      # does a bunch of retries
      def with_promise_retry(info= "", retries = 2, &block)
        Promise.new.tap do |promise|
          remaining = retries
          handler   = lambda { |error, data|
            if error
              remaining -= 1
              if remaining >= 0
                $log.info("#{remaining} remaining retries #{info}")
                block.call(handler)
              else
                $log.error(error)
                promise.reject(error)
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
          %x(#@root.authenticate(#{iblock}))
        end
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
        $log.debug("waiting")
        with_promise_retry(filename, 2) do |iblock|
          %x{#@root.writeFile(#{filename}, #{data}, #{iblock})}
        end
      end


      # @param [String] filename name of the file to be read
      # @return [Promise]

      def read_file(filename)
        with_promise() do |iblock|
          %x{#@root.readFile(#{filename}, #{iblock})}
        end
      end


      # @param [String] dirname - name of the directory to be read
      # @return [Promise]

      def read_dir(dirname = "/")
        with_promise() do |iblock|
          %x{#@root.readdir(#{dirname}, #{iblock})}
          nil
        end
      end


      def choose_file(options)

        with_promise_chooser() do |iblock|
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
        end
      end


    end

  end
end