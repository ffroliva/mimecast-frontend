import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { SearchRequestModel } from '../model/search-request.model';
import { SearchResponseModel } from '../model/search-response.model';
import { FileSearchService } from '../service/file-search.service';
import { ServerService } from '../service/server.service';
import { DialogAlertComponent } from '../shared/components/dialog-alert/dialog-alert.component';
import { DialogService } from '../shared/services/dialog.service';

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
    private dialogService: DialogService,
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
        this.loading = false;
        if (this.dataSource.length === 0) {
          this.dialogService.showAlert('Unable to read files from the given directory.');
        }
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
