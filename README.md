# Mimecast File Search Term app

## Installing node dependencies

At the root path of the project run the following line: 
```
npm install
```

## Running the app localhost

To run the app at localhost execute `ng serve`.

The app will be available at: `http://localhost:4200/`.

## Proxying the backend

This application depends on a spring-boot backend that by default is runs at: http://localhost:8080.

In order to overcome CORS problems between frontend and backend a proxy was configure at: `./src/proxy.conf.json`.
```json
{
    "/api/*": {
      "target": "http://localhost:8080",
      "secure": false,
      "logLevel": "debug",
      "changeOrigin": true,
      "pathRewrite": {
        "^/api": ""
      }
    }
  }
```


## Building the backend

Maven is used as the project's build tool for the backend. 

To build the backend run in the following command: `mvn clean install`.

Make sure this command is execute inside the folder where the `pom.xml` is located.

### Running the backend

To run the backend execute: `mvn spring-boot:run` or if you prefer, import the `mimecast-backend` folder into your favorite IDE, and run the main method of the following class: `br.com.ffroliva.mimecast.MimecastApplication`

## Overview of the app:

The app is composed of two main components `search-form` and `search-result-list` that are wrapped into to a componet called `welcome`.

The `search-form` component is responsable for collecting the inputs and submitting it to the request to `file-search-service`.

The result of the then rendered as a list to the `file-result-list`.



