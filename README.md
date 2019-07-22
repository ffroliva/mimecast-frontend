# Mimecast File Search App

## Overview of the app

This app searches and count the number of matches a given terms is found in files of a given filepath at `localhost` in a stream like fashion. (non-blocking)

## Stack of tecnologies

- Frontend: Angular 8+, Angular Material and Server Side Events (SSE)
- Backend: spring-boot and spring-webflux (for data streaming)

## How it workes

The application starting point is the `search-form.component`.

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
search-form.component.html
```html
<mat-card fxflex fxLayoutGap="16px" class="example-container">
    <mat-card-title>Search Form</mat-card-title>
    <mat-card-content>
        <form class="example-container" [formGroup]="formGroup" >
            <label id="example-radio-group-label">Pick a server to search:</label>
            <mat-radio-group aria-labelledby="example-radio-group-label" class="example-radio-group"
                formControlName="server">
                <mat-radio-button class="example-radio-button" *ngFor="let server of (servers$ | async)"
                    [value]="server">
                    {{server}}
                </mat-radio-button>
            </mat-radio-group>
            <mat-error></mat-error>
            <mat-form-field>
                <input matInput formControlName="rootPath" placeholder="Path to search at selected server" required>
            </mat-form-field>
            <mat-form-field>
                <input matInput formControlName="searchTerm" placeholder="Search term" required>
            </mat-form-field>
        </form>
    </mat-card-content>
    <mat-card-actions>
        <button type="button" mat-raised-button color="primary" (click)="search()" [disabled]="formGroup.invalid">SEARCH</button>
    </mat-card-actions>
    <mat-progress-bar mode="indeterminate" *ngIf="loading"></mat-progress-bar>
</mat-card>
<app-search-result-list [dataSource]="dataSource"></app-search-result-list>
```

The `search-form.component` has a form with three fields: 

- **Pick a server to search:** Radio button to select the server to search at. The list of avaiable servers is an endpoint in the backend that returns a list of servers. For simplicity only a single item,'localhost', is added in the list retrived from the backend.
- **Path to search at selected server:** File path to search at the selected server. 
- **Search Term:** word or phrase to serch for.

On the `ngInit` lifecycle hook is where the magic happend. Three actions are executed inside of it:
1. Initialize the `servers$` instance which is an observable that is used to fetch list of servers in the backend. This observable is used in the `search-form.component.html` with `| async` 
2. Create a reactive form by calling `this.createForm()`. This method uses `formBuilder` to initialize the reactive `formGroup`. 
3. Subscribe to the `getSearchResult()` which is the method responsable for receving the data as a stream. _(More on this bellow)_

When the user triggers the search button the app calls the `search` method from `file-search-service` who uses an instance of `EventSource` to enable the browser to receive automatic updates from a server via HTTP connection. 

The `onmessage` method from the `eventSource` attribute receives the data from the backend. In order to update the result, which is a `mat-table`, I created a `subject` that was transformed as an observable I subscribed to and on every message received I concat it to the `dataSource` array that is consumed by `search-result-list.component`.

file-search.service.ts
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

import { SearchResponseModel } from '../model/search-response.model';
import { SearchRequestModel } from '../model/search-request.model';

@Injectable({
  providedIn: 'root'
})
export class FileSearchService {

  private subject: Subject<SearchResponseModel> = new Subject();

  constructor(
    private http: HttpClient,
    ) { }

  search(searchRequestModel: SearchRequestModel): void {
    const param = new HttpParams()
    .set('rootPath', searchRequestModel.rootPath)
    .set('searchTerm', searchRequestModel.searchTerm);
    const eventSource = new EventSource(`/api/file/search?${param.toString()}`);

    eventSource.onmessage = (event) => {
      this.subject.next(JSON.parse(event.data));
    };

    eventSource.onerror = (event) => {
      eventSource.close();
      this.subject.next(null);
    };
  }

  sendSearchResponse(searchResponseModel: SearchResponseModel) {
    this.subject.next(searchResponseModel);
  }

  getSearchResult(): Observable<SearchResponseModel> {
    return this.subject.asObservable();
  }

}
```
search-result-list.component.ts
```typescript
import { Component, OnInit, Input } from '@angular/core';
import { SearchResponseModel } from '../model/search-response.model';

@Component({
  selector: 'app-search-result-list',
  templateUrl: './search-result-list.component.html',
  styleUrls: ['./search-result-list.component.scss']
})
export class SearchResultListComponent implements OnInit {

  displayedColumns: string[] = ['position', 'filePath', 'count'];
  @Input() dataSource: Array<SearchResponseModel> = [];

  constructor() {}

  ngOnInit() { }

}
```

## Considerations about the stream of data:

One of the main problems about non-blocking data streaming is the capacity the consumer has to process the incoming dataflow from the backend. In this app, when I searched in folders with many files and folders deep, if no **backpressure** mechanism where introduced the browser would crash. In order to release the pressure due to the volume of that being produced by the backend a delayed of 100 miliseconds where introduced in the backend which allowed the browser can handle incoming data properly.

## Considerations about the Server Side Event

Server side events have a peculiarity that it only accepts `GET` methods.

## Stringboot Webflux for the datastreaming

Spring framework has an API fro data streaming called webflux. I used this API to produce the streaming in the `FileSearchController.java`

```java
@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/file")
public class FileSearchController {

    private final SearchService searchService;
    private String host;

    @GetMapping(
            value = "/search", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<SearchResponse> search(
            @RequestParam(value = "rootPath") String rootPath,
            @RequestParam(value = "searchTerm") String searchTerm,
            ServerHttpRequest request) {
        return Flux.fromStream(searchService
                .search(SearchRequest.of(request.getURI().getHost(), rootPath, searchTerm)))
                .delayElements(Duration.of(100L, ChronoUnit.MILLIS));
    }
}
```

Observe that `MediaType.TEXT_EVENT_STREAM_VALUE` is produced. SSE expects this media type. Since we receive a text strem this stream needs to be parsed to the a JSON. We there for use `JSON.parse(event.data)`.

## Erro handling

If a handled exception is thrown it is logged in the backend with as `BusinessException`. In the frontend no data is processed a `DialogAlertComponent` is presented with a message.

## Google guava for the rescue in the file search in the backend.

While developing the backend I faced situations where I was not able to handle exceptions properly. I developed two other implementations of the file search, one using `Files.walk` and `Files.walkfiletree`. 

1. At first I used `Files.walk` who eventually might throws `java.io.UncheckedIOException: java.nio.file.AccessDeniedException:` which can't be catched by a `try-catch` block. I, therefore, dropped this implementation.

2. Then, I tried using `Files.walkfiletree`. However, in this implementation I was not able to properly return a stream of data out of it. This implementation was also dropped.

3. My third and final implementation used google guava toolbox to search the files of a given directory. With google guava I was able to handle erros properly. Here is the code:

```java
@Slf4j
@Service
public class FileSearchService implements SearchService {

    @Override
    public Stream<SearchResponse> search(SearchRequest searchRequest) {
        try {
            File file = Paths.get(searchRequest.getRootPath()).toFile();
            Validation.execute(ServerValidationRule.of(searchRequest.getHost()));
            Validation.execute(IsValidPath.of(file));
            return StreamSupport
                    .stream(Files.fileTraverser()
                            .breadthFirst(file).spliterator(), true)
                    .filter(f -> f.isFile() && f.canRead())
                    .map(f -> this.searchFileContent(f, searchRequest.getSearchTerm()))
                    .sorted(Comparator.comparing(SearchResponse::getFilePath));
        } catch (Exception e) {
            throw new BusinessException(MessageProperty.INVALID_PATH
                    .bind(searchRequest.getRootPath()));
        }
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
## How to run the APP

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

## Developed by Flávio Oliva