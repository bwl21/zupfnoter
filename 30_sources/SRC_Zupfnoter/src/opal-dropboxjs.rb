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


      # this method supports to execute a block (invocation_block)
      # according the pattern
      #
      #     invocation_block.call(args){|error, data| application_callback}
      #
      # to invoke the invocationblock, one writes
      #
      # with_promise(arg1, arg2, arg3) do invocation_block
      #|args, iblock|
      #    # the payload code handle argument
      #    # args = [arg1, arg2, arg2, invocation_block]
      #    # iblock is either the promise-handler or the application_callback
      # end
      #
      # if no application_callback is provided, then a Promise is created
      # which allows to provide the application_callback in a then-clause
      #
      # by this we provide an API which either uses callback (hell) or Promises
      #
      # note that argument handling is a bit tricky here:
      # 1. all arguments for the invocation_block are
      #
      # @param [Array] *args to be passed to the application_block
      # @yield_param [Block] invocation_block the is the job to do
      # @return [Promise] or [Nil]
      #
      def with_promise(*args, &invocation_block)
        application_callback = args.last
        unless application_callback
          promise = Promise::new
          application_callback = lambda do |error, data|
            if (error)
              promise.reject(error)
            else
              promise.resolve(data)
            end
          end
        end
        invocation_block.call(args, application_callback)
        promise || nil
      end

      def authenticate(&block)
        with_promise(nil, block) do |args, iblock|
          %x(self.root.authenticate(iblock))
        end
      end

      def get_account_info(&block)
        with_promise(nil, block) do |args, iblock|
          %x{self.root.getAccountInfo(iblock)}
        end
      end

      def write_file(filename, data, &block)
        with_promise(filename, data, block) do |args, iblock|
          %x{self.root.writeFile(args[0], args[1], iblock)}
        end
      end

      def read_file(filename, &block)
        with_promise(filename, block) do |args, iblock|
          %x{self.root.readFile(args[0], iblock)}
        end
      end

      def read_dir(dirname = "/", &block)
        with_promise(dirname, block) do |args, iblock|
          %x{self.root.readdir(args[0], iblock)}
          nil
        end
      end
    end

  end
end