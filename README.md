# Mimecast File Search App

## Overview of the app

This app searches and count the number of matches of a given terms is found in files of a given filepath at various `servers` in a stream like fashion. (non-blocking)

## Stack of tecnologies

- Frontend: Angular 8+, Angular Material and Server Side Events (SSE)
- Backend: spring-boot and spring-webflux (for data streaming)

## How it workes

`search-form.component` is the application's starting point.

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
  count = 0;
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
        if (this.dataSource.length < 50) {
          this.dataSource = [message.data, ...this.dataSource];
        } else {
          this.dataSource.pop();
          this.dataSource = [message.data, ...this.dataSource];
        }
      } else  if (message && message.type === 'error') {
        this.dialogService.showAlert(message.data.message);
      } else {
        this.loading = false;
      }
      this.count++;
      this.changeDetectorRefs.detectChanges();
      if ( this.count % 50 === 0 ) {
        console.log(`Reached threshold of ${this.count} files searched.`);
      }
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

  private createSearchRequestModel(): SearchRequestModel {
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
            <button type="submit" mat-raised-button color="primary" >SEARCH</button>
        </mat-card-actions>
        <mat-progress-bar mode="indeterminate" *ngIf="loading"></mat-progress-bar>
    </mat-card>
</form>
<app-search-result-list [dataSource]="dataSource" [count]="count"></app-search-result-list>
```

The `search-form.component` is a form with three fields: 

- **Path to search at:** Path to search at the selected server(s). 
- **Search Term:** Word or phrase to search for.
- **Server(s) to search at:** Checkbox(es) with the name of server(s) to search at.

Three actions are executed inside `ngInit` lifecycle hook:
1. `this.createForm()` creates angular's reactive form. 
2. Subscribing at `getServers()` we fetch the list of avaiable server(s) we are able to search. This array of servers is used to create the checkboxes we can check to search at. 
3. Subscribing at `getMessage()` will be able to receive the incoming messages streamed as Server Side Event. _(More on this bellow)_

## File Search Service

When the we triggers the search button the app calls the `search` method from `file-search-service` who uses an instance of `EventSource` to enable the browser to receive automatic updates from a server via HTTP connection (SSE). 

EventSource has two main functions: `onmessage` and `onerror`.

 The `onmessage` function receives the data from the backend. Data can be of two types: `success` or `error`

 If a `success` data is received from the by the `onmessage` function the `dataSource` array is udated and the data is rendered by the `mat-table`.

 If a `error`data is received from the `onmessage` function the a modal dialog is presented with the error message received from the backend. 

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

## Erro handling

Errors are handled in two situation: 

1. If the path does not exist in the filesystem of one of the selected server(s).
2. If one of the selected server(s) is offline.

Error handled by the backend will produce messages of type `error` and data of class `ErrorResponse`. In the frontend the erro message is presented to the user using the `DialogAlertComponent`.

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

In order to test the backend you can use the following command: `curl 'http://localhost:8080/file/search?servers=http://localhost:8080&rootPath=/tmp&searchTerm=aa'`

> In my case I am using linux machine who has a _/tmp_ path. Make sure you change the `rootPath` request parameter to a valid path inside the OS where the backend server is running.

## Considerations about how dataSource is presented

Every new `success` message that is received from the backend is appended to the `dataSource` array to be presented to the user. When a threshold of 50 files has been searched we fix `dataSource` on this size and start removing the older resolt from the list and appending the new item on top of the array. This strategy was defined so the browser won't crash due to lack of memory management.

## Developed by Flávio Oliva
