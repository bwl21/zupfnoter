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


    class Client
      attr_accessor :root_in_dropbox, :app_name


      def initialize(key)
        @errorlogger = lambda { |error| $log.error(error) }

        @root = `new Dropbox.Client({ key: key });`
        %x{
           self.root.onError.addListener(function(error) {
                                   self.errorlogger(error)
           });
        }
      end


      # this method supports to execute a block in a promise
      #
      # with_promise(arg1, arg2, arg3) do |args, iblock|
      #    # the payload code handle argument
      #    # args = [arg1, arg2, arg3] to be processed in the block
      #    # iblock = the block provided to the underlying API.
      #    #          note that the argumeents of the same depend
      #    #          on the underlying API
      # end
      #
      # @param [Array] *args to be passed to the payload
      # @yieldparam [Block] payload the block with the job to do
      # @return [Promise]
      #
      def with_promise(&block)
        Promise.new.tap do |promise|
          block.call(lambda{|error, data|
            if error
              promise.reject(error)
            else
              promise.resolve(data)
            end
            }
          )
        end
      end

      def authenticate()
        with_promise() do |iblock|
          %x(#@root.authenticate(iblock))
        end
      end

      def get_account_info()
        with_promise() do | iblock|
          %x{#@root.getAccountInfo(iblock)}
        end
      end

      def write_file(filename, data)
        with_promise() do |iblock|
          %x{#@root.writeFile(#{filename}, #{data}, iblock)}
        end
      end

      def read_file(filename)
        with_promise() do |iblock|
          %x{#@root.readFile(#{filename}, iblock)}
        end
      end

      def read_dir(dirname = "/")
        with_promise() do |iblock|
          %x{#@root.readdir(#{dirname}, iblock)}
          nil
        end
      end


    end

  end
end