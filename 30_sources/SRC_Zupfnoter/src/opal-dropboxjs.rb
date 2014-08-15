module Opal
  module DropboxJs
    class Client
      attr_accessor :root


      def initialize(key)
        @errorlogger = lambda{|error| $log.error(error)}

        @root = `new Dropbox.Client({ key: key });`
        %x{
           self.root.onError.addListener(function(error) {
                                   self.errorlogger(error)
           });
        }
      end

      def authenticate(&block)
        %x{
          self.root.authenticate(function(error, data){
            if (error) {
                                   self.errorlogger(error)
            }
           block.call("logged in");
           });
          }
      end

      def get_account_info(&block)
        %x{
            self.root.getAccountInfo(function(error, accountInfo) {
            if (error) {
                                   self.errorlogger(error)
             }

            block.call(Opal.Native.$Native(accountInfo));
           });
          }
        end

      def write_file(filename, data, &block)
        %x{
        self.root.writeFile(filename, data, function(error, stat) {
          if (error) {
                                   self.errorlogger(error)
          }
          block(Opal.Native.$Native(stat));
          });
        }
      end


      def read_file(filename, &block)
        %x{
        self.root.readFile(filename, function(error, data) {
          if (error) {
                                   self.errorlogger(error)
          }

          block(data);
        });
        }
      end

      def read_dir(dirname, &block)
        %x{
            self.root.readdir("/", function(error, entries) {
              if (error) {
                                   self.errorlogger(error)
              }
              block(entries);
            });
        }
      end

    end



  end
end