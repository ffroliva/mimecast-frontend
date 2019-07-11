import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize, take } from 'rxjs/operators';

import { ServerService } from '../service/server.service';
import { FileSearchService } from '../service/file-search.service';
import { SearchResponseModel } from '../model/search-response.model';
import { SearchRequestModel } from '../model/search-request.model';
import { MatDialog } from '@angular/material';
import { MessageDialogComponent } from '../shared/components/message-dialog/message-dialog.component';
import { ApiErrorModel } from '../shared/model/api-error-model';

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss']
})
export class SearchFormComponent implements OnInit {
  servers$: Observable<string[]>;

  formGroup: FormGroup;

  loading: boolean;

  error: any;

  @Output() searchResultChanged: EventEmitter<SearchResponseModel[]> = new EventEmitter();

  constructor(
    private formBuilder: FormBuilder,
    private serverService: ServerService,
    private fileSearchService: FileSearchService,
    public dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.servers$ = this.serverService.getServers();
    this.createForm();
  }

  createForm() {
    this.formGroup = this.formBuilder.group({
      server: ['', Validators.required],
      rootPath: ['', Validators.required],
      searchTerm: ['', Validators.required],
    });
  }

  search() {
    this.loading = true;
    const requestModel = this._createSerchRequestModel();
    console.log(requestModel);
    this.fileSearchService
      .search(requestModel)
      .pipe(
        finalize(() => this.loading = false),
        take(1),
      )
      .subscribe(
        (searchResult: SearchResponseModel[]) => {
          this.searchResultChanged.emit(searchResult);
        },
        (error: ApiErrorModel) => {
          error = error;
          console.log(error);
          this.openDialog(error);
        }
      );
  }

  _createSerchRequestModel(): SearchRequestModel {
    const server = this.formGroup.controls.server.value;
    const rootPath = this.formGroup.controls.rootPath.value;
    const searchTerm = this.formGroup.controls.searchTerm.value;
    return SearchRequestModel.of(server, rootPath, searchTerm);
  }

  openDialog(error: ApiErrorModel): void {
    const dialogRef = this.dialog.open(MessageDialogComponent, {
      width: '250ipx',
      data: error,
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }
}
