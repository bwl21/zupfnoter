FROM gitpod/workspace-full

USER gitpod
RUN /home/gitpod/.rvm/bin/rvm install ruby-2.4.1 && /home/gitpod/.rvm/bin/rvm use 2.4.1

# add your tools here
