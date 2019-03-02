FROM gitpod/workspace-full

USER gitpod
RUN rvm install ruby-2.4.1 && rvm use 2.4.1

# add your tools here
