FROM python:3.9-slim-buster

WORKDIR /server

RUN apt-get update \
    && apt-get -y install libpq-dev gcc
RUN /usr/local/bin/python -m pip install --upgrade pip
COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY . .

CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0"]