require 'promise'


module Opal
  module DropboxJs
    class Client
      attr_accessor :root


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
      def with_promise(*args, &block)
        Promise.new.tap do |promise|
          block.call(args, lambda{|error, data|
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
        with_promise() do |args, iblock|
          %x(self.root.authenticate(iblock))
        end
      end

      def get_account_info()
        with_promise(nil) do |args, iblock|
          %x{self.root.getAccountInfo(iblock)}
        end
      end

      def write_file(filename, data)
        with_promise(filename, data) do |args, iblock|
          %x{self.root.writeFile(args[0], args[1], iblock)}
        end
      end

      def read_file(filename)
        with_promise(filename) do |args, iblock|
          %x{self.root.readFile(args[0], iblock)}
        end
      end

      def read_dir(dirname = "/")
        with_promise(dirname) do |args, iblock|
          %x{self.root.readdir(args[0], iblock)}
          nil
        end
      end
    end

  end
end