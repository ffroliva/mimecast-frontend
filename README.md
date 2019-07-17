# Mimecast File Search App

## Overview of the app:

This app search and count the number of matches of a given terms in files of a given filepath at `localhost` in a stream fashion. (non-blocking)

## Stack of tecnologies used

- Frontend: Angular 8+, Angular Material and Server Side Events (SSE)
- Backend: spring-boot and spring-webflux (for data streaming)

## How it workes

The application starting point is the `search-form` component.

```typescript
@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss']
})
export class SearchFormComponent implements OnInit, OnDestroy {
  servers$: Observable<string[]>;

  formGroup: FormGroup;
  error: any;
  subscription: Subscription;
  dataSource: Array<SearchResponseModel> = [];
  loading = false;

  constructor(
    private formBuilder: FormBuilder,
    private serverService: ServerService,
    private fileSearchService: FileSearchService,
    private changeDetectorRefs: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.servers$ = this.serverService.getServers();
    this.createForm();
    this.subscription = this.fileSearchService
    .getSearchResult()
    .subscribe(data => {
      if (data) {
        this.dataSource = this.dataSource.concat(data);
      } else {
        console.log('search finished fetching data...');
        this.loading = false;
      }
      this.changeDetectorRefs.detectChanges();
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  createForm() {
    this.formGroup = this.formBuilder.group({
      server: ['', Validators.required],
      rootPath: ['', Validators.required],
      searchTerm: ['', Validators.required],
    });
  }

  search() {
    const requestModel = this._createSerchRequestModel();
    this.loading = true;
    this.dataSource = [];
    this.fileSearchService.search(requestModel);
  }

  _createSerchRequestModel(): SearchRequestModel {
    const server = this.formGroup.controls.server.value;
    const rootPath = this.formGroup.controls.rootPath.value;
    const searchTerm = this.formGroup.controls.searchTerm.value;
    return SearchRequestModel.of(server, rootPath, searchTerm);
  }
}

```
the serch form has three fields: 

- **Pick a server to search:** Radio button to select the server to search at. The list of avaiable servers is an endpoint in the backend that returns a list of servers. For simplicity only a single item is added which is 'localhost'.
- **Path to search at selected server:** Path of the localhost server. 
- **Search Term:** word or phrase to serch for.

When the user triggers the search button the app calls the search method from `file-search-service` who uses `EventSource` to enable the browser to receive automatic updates from a server via HTTP connection. 

The `onmessage` method from the eventSource receives the data from the backend. In order to update the `mat-table` we created a `subject` that is transformed as an observable we can subscribe to.

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

## Considerations about the stream of data:

One of the main problems about the stream of that is **backpressure**. In the backend the stream of data is delayed in 100 miliseconds so that it gives the browser the chance to process the incoming data. If we do not set a delay the browser is not able to handle the dataflow specially if you are searching in deep directories.

## Google guava for the rescue in relation of searching directories.

While developing the backend I faced situations where I was not able to handle exceptions properly. I developed two other implementations of the file search, one using `Files.walk` and `Files.walkfiletree`. The `Files.walk` throws `java.io.UncheckedIOException: java.nio.file.AccessDeniedException:` that I was not able to treat properly, so I had to drop this implementation.

The second implementation I tried used `Files.walkfiletree`. However, in this implementation I was not able to receive a stream of data being processed, so I dropped it.

My third and final implementation used google glava utility box to search the files of a given directory. Bellow I show the code:

```java
package br.com.ffroliva.mimecast.service.impl;

import br.com.ffroliva.mimecast.payload.SearchRequest;
import br.com.ffroliva.mimecast.payload.SearchResponse;
import br.com.ffroliva.mimecast.service.SearchService;
import br.com.ffroliva.mimecast.validation.Validation;
import br.com.ffroliva.mimecast.validation.rule.ServerValidationRule;
import com.google.common.io.Files;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.nio.charset.Charset;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

@Slf4j
@Service
public class FileSearchService implements SearchService {

    @Override
    public Stream<SearchResponse> search(SearchRequest searchRequest) {
        Validation.execute(ServerValidationRule.of(searchRequest.getHost()));

        File file = Paths.get(searchRequest.getRootPath()).toFile();
        return StreamSupport
                .stream(Files.fileTraverser()
                        .breadthFirst(file).spliterator(), true)
                .filter(f -> f.isFile() && f.canRead())
                .map(f -> this.searchFileContent(f, searchRequest.getSearchTerm()))
                .sorted(Comparator.comparing(SearchResponse::getFilePath));
    }

    private SearchResponse searchFileContent(File file, String searchTerm) {
        SearchResponse response;
        try (BufferedReader br = Files.newReader(file, Charset.defaultCharset())) {
            response = SearchResponse.of(
                    file.getAbsolutePath(),
                    countWordsInFile(searchTerm, br.lines()));
        } catch (Exception e) {
            response = SearchResponse.of(
                    file.getAbsolutePath(),
                    0);
        }
        log.debug(response.toString());
        return response;
    }

    private int countWordsInFile(String searchTerm, Stream<String> linesStream) {
        return linesStream
                .parallel()
                .map(line -> countWordsInLine(line, searchTerm))
                .reduce(0, Integer::sum);
    }

    private int countWordsInLine(String line, String searchTerm) {
        Pattern pattern = Pattern.compile(searchTerm.toLowerCase());
        Matcher matcher = pattern.matcher(line.toLowerCase());

        int count = 0;
        int i = 0;
        while (matcher.find(i)) {
            count++;
            i = matcher.start() + 1;
        }
        return count;
    }
}
```


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

## Testing the backend

In order to test the backend you can use the following command: `curl 'http://localhost:8080/file/search?rootPath=/tmp&searchTerm=aaa'`

> In my case I am using linux machine who has a _/tmp_ path. Make sure you change the `rootPath` request parameter to a valid path inside the OS where the backend is running. 