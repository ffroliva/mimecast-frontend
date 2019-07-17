# Mimecast File Search App

## Overview of the app:

This app search and count the number of matches of a given terms in files of a given filepath at `localhost` in a stream fashion. (non-blocking)

## Stack of tecnologies used

- Frontend: Angular 8+, Angular Material and Server Side Events (SSE)
- Backend: spring-boot and spring-webflux (for data streaming)

## How it workes

The `search-form` expects three inputs: 
- **Server:** Radio button to select the server to search at. The list of avaiable servers is an endpoint in the backend that returns a list of servers. For simplicity only a single item is added to 'localhost'.
- **FilePath:** Path of the localhost server. 
- **Search Term:** word or phrase to serch for.

When the user triggers the search button the app calls the search method from `file-search-service` who uses `EventSource` to enable the browser to receive automatic updates from a server via HTTP connection. 

The data send from the backend is delived is captured by the `onmessage` method from the eventSource.

```typescript
  search(searchRequestModel: SearchRequestModel): void {
    const param = new HttpParams()
    .set('rootPath', searchRequestModel.rootPath)
    .set('searchTerm', searchRequestModel.searchTerm);
    const eventSource = new EventSource(`/api/file/search?${param.toString()}`);

    eventSource.addEventListener('searchFile', (e) => {
      console.log(e);
    }, false);

    eventSource.onmessage = (event) => {
      this.subject.next(JSON.parse(event.data));
    };

    eventSource.onerror = (event) => {
      eventSource.close();
      this.subject.next(null);
    };
  }
```


On the `ngInit` method of the 
The result of the then rendered as a list to the `file-result-list`.




## Installing node dependencies

At the root folder of the project run the following command: 

```
npm install
```

## Running the app locally

To run the app locally execute: `ng serve`

The app will be available at: `http://localhost:4200/`.

> Make sure the backend is running otherwise the app won't work properly.

## Proxying the backend

This application depends on a spring-boot backend that, by default, is configured to run at: http://localhost:8080

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

To run the backend execute: `mvn spring-boot:run`.

If you prefer, import the `mimecast-backend` folder into your favorite IDE, and run the _main_ method of the following class: `br.com.ffroliva.mimecast.MimecastApplication`

Another option would be run the following command line in your terminal: `java -jar ./target/mimecast-backend-0.0.1.jar`. 

> Make sure you run this command at root level of the mimecast-backend folder