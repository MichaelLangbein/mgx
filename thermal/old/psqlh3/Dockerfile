FROM postgis/postgis

RUN apt update -y
RUN apt install postgis make gcc g++ pgxnclient wget postgresql-server-dev-15 -y
RUN wget https://github.com/Kitware/CMake/releases/download/v3.26.1/cmake-3.26.1-linux-x86_64.tar.gz
RUN tar -xf cmake-3.26.1-linux-x86_64.tar.gz
RUN mv cmake-3.26.1-linux-x86_64 /opt/
RUN cd /opt
RUN ln -s /opt/cmake-3.26.1-linux-x86_64/bin/* /usr/local/bin/
RUN pgxn install h3
