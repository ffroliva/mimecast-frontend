# Mimecast File Search App

## Overview of the app

This app searches and count the number of matches of a given terms is found in files of a given filepath at various `servers` in a stream like fashion. (non-blocking)

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
  servers: string[];
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
    private dialogService: DialogService,
  ) { }

  ngOnInit() {
    this.createForm();
    this.serverService
    .getServers()
    .subscribe(servers => {
      this.servers = servers;
      this.buildServersFormArray();
    });

    this.subscription = this.fileSearchService
    .getMessage()
    .subscribe(message => {
      if (message && message.type === 'success') {
        this.dataSource = this.dataSource.concat(message.data);
      } else  if (message && message.type === 'error') {
        this.dialogService.showAlert(message.data.message);
      } else {
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
      servers: new FormArray([], Validators.compose([Validators.required, this.minSelectedCheckboxes(1)]))
    });
  }

  search(event: Event) {
    event.preventDefault();
    const requestModel = this.createSearchRequestModel();
    this.loading = true;
    this.dataSource = [];
    this.fileSearchService.search(requestModel);
  }

  private buildServersFormArray(): void {
    this.servers.forEach(server => {
      const control = new FormControl(false);
      (this.formGroup.controls.servers as FormArray).push(control);
    });
  }

  private createSerchRequestModel(): SearchRequestModel {
    const servers = this.getSelectedServers();
    const rootPath = this.formGroup.controls.rootPath.value;
    const searchTerm = this.formGroup.controls.searchTerm.value;
    return SearchRequestModel.of(servers, rootPath, searchTerm);
  }

  private getSelectedServers(): string[] {
    return (this.formGroup.controls.servers as FormArray)
      .controls
      .map((control, i) => {
        if ( control.value === true ) {
          return this.servers[i];
        }
      })
      .filter((value) => value !== undefined);
  }

  hasError = (controlName: string, errorName: string, formGroup: FormGroup) => {
    return formGroup.controls[controlName].hasError(errorName);
  }

  minSelectedCheckboxes(min = 1) {
    const validator: ValidatorFn = (formArray: FormArray) => {
        const totalSelected = formArray.controls
          // get a list of checkbox values (boolean)
          .map(control => control.value)
          // total up the number of checked checkboxes
          .reduce((prev, next) => next ? prev + next : prev, 0);
          // if the total is not greater than the minimum, return the error message
        return totalSelected >= min ? null : { required: true };

    };
    return validator;
  }
}


```
search-form.component.html
```html
<form [formGroup]="formGroup" (submit)="search($event)" fxLayout="column" fxLayoutGap="16px">
    <mat-card>
        <mat-card-title>Search Form</mat-card-title>
        <mat-card-content fxLayout="row wrap" fxLayout.lt-md="column" fxLayoutGap="16px grid">
            <mat-form-field fxFlex="50%">
                <mat-label>Path to search at</mat-label>
                <input matInput formControlName="rootPath" placeholder="Path to search" required>
                <mat-error *ngIf="formGroup.hasError('required', 'searchTerm')">Field <b>required.</b></mat-error>
            </mat-form-field>
            <mat-form-field fxFlex="50%">
                <mat-label>Search term</mat-label>
                <input matInput formControlName="searchTerm" placeholder="Search term" required>
                <mat-error *ngIf="formGroup.hasError('required', 'searchTerm')">Field <b>required.</b></mat-error>
            </mat-form-field>
            <ng-container formArrayName="servers">
                <mat-label>Server(s) to search at *</mat-label>
                <ng-container *ngFor="let server of formGroup['controls'].servers['controls']; let i = index;">
                    <div>
                        <mat-checkbox class="mat-group-checkbox" [formControlName]="i">
                            {{ servers[i] }}
                        </mat-checkbox>
                    </div>
                </ng-container>
                <mat-error *ngIf="formGroup.hasError('required', 'servers') && formGroup.get('servers').dirty" >At
                    least one server should be selected.</mat-error>
            </ng-container>
        </mat-card-content>
        <mat-card-actions>
            <button type="submit" mat-raised-button color="primary" disabled="formGroup.invalid">SEARCH</button>
        </mat-card-actions>
        <mat-progress-bar mode="indeterminate" *ngIf="loading"></mat-progress-bar>
    </mat-card>
</form>
<app-search-result-list [dataSource]="dataSource"></app-search-result-list>
```

The `search-form.component` has a form with three fields: 

- **Path to search at:** File path to search at the selected server. 
- **Search Term:** word or phrase to serch for.
- **Server(s) to search at:** Checkbox to select the server(s) to search at. There is an endpoint to the backend that gets the list of avaiable.

On the `ngInit` lifecycle hook is where the magic happend. Three actions are executed inside of it:
2. Create a reactive form by calling `this.createForm()`. This method uses `formBuilder` to initialize the reactive `formGroup`. 
1. Subcribe to `getServers()` which is the method responsable for getting the list of avaiable servers. This observable returns an array of servers that is used to dinamically create the list of checkboxes the user can check and where the app is going to search at. 
3. Subscribe to the `getMessage()` which is the method responsable for receving the data as a stream. _(More on this bellow)_

When the user triggers the search button the app calls the `search` method from `file-search-service` who uses an instance of `EventSource` to enable the browser to receive automatic updates from a server via HTTP connection. 

The `onmessage` method from the `eventSource` attribute receives the data from the backend and updates the `dataSource` used by the `mat-table`. A `subject` was created and transformed into an observable. On every message received the incomming message is concatenated into the `dataSource` array that is consumed by `search-result-list.component`.

file-search.service.ts
```typescript
@Injectable({
  providedIn: 'root'
})
export class FileSearchService {

  private subject: Subject<MessageEventModel> = new Subject();

  constructor(
    private http: HttpClient,
    ) { }

  search(searchRequestModel: SearchRequestModel): void {
    const param: HttpParams = searchRequestModel.servers
    .reduce((hp: HttpParams, value: string) => hp.append('servers', value), new HttpParams())
    .set('rootPath', searchRequestModel.rootPath)
    .set('searchTerm', searchRequestModel.searchTerm);
    const eventSource = new EventSource(`/api/file/search?${param.toString()}`);

    eventSource.onmessage = (event) => {
      this.subject.next(JSON.parse(event.data));
    };

    eventSource.onerror = (event) => {
      eventSource.close();
      this.subject.next();
    };
  }

  sendMessage(message: MessageEventModel) {
    this.subject.next(message);
  }

  getMessage(): Observable<MessageEventModel> {
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

  displayedColumns: string[] = ['position', 'filePath', 'count', 'servers'];
  @Input() dataSource: Array<SearchResponseModel> = [];

  constructor() {}

  ngOnInit() { }

}
```

SSE receives data as `text/event-stream` media type. This text needs to be parsed to JSON by calling `JSON.parse(event.data)`.

## Erro handling

From the busness perspective, an erro could be thrown in three situation: 

1. If the server was not `localhost`; and
2. If the path to be searched does not exist in the filesystem.

To handle such errors class called `BusinessException` was created. This exception was handled in the `FileSearchController.java` by annotatting `handleBusinessException(BusinessException ex)` with `@ExceptionHandler(BusinessException.class)`. The error handling function will produce a single instance of `ErrorResponse` with the `message` produced by the `BusinessException`. In the frontend the erro message is presented to the user using the `DialogAlertComponent`.

## Google guava for the rescue in the file search in the backend.

While developing the file search in the backend I faced situations where I was not able to handle exceptions properly. I developed two other implementations of the file search, one using `Files.walk` and `Files.walkfiletree`. 

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

## Testing for the backend

Most of the main functionalities were tested using JUnit5. Some functionalities used Mokito and other Restassured.

## Swagger for API documentation

The project was integrated to swagger which allowed to document the REST APIs and also test it while developing.

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
