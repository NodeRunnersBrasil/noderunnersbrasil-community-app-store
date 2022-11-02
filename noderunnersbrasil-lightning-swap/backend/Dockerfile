FROM python:3.7-alpine
COPY . /app
WORKDIR /app
RUN apk add git
RUN pip install -r requirements.txt
EXPOSE 1536
CMD [ "python3", "__main__.py" ]