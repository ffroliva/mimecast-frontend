import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { SearchRequestModel } from '../model/search-request.model';
import { SearchResponseModel } from '../model/search-response.model';
import { FileSearchService } from '../service/file-search.service';
import { ServerService } from '../service/server.service';


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
  loading = false;

  constructor(
    private formBuilder: FormBuilder,
    private serverService: ServerService,
    private fileSearchService: FileSearchService,
  ) { }

  ngOnInit() {
    this.servers$ = this.serverService.getServers();
    this.createForm();
    this.subscription = this.fileSearchService.getSearchResult().subscribe(data => {
      if (!data) {
        console.log();
        this.loading = !!data;
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
    });
  }

  search(event: Event) {
    event.preventDefault();
    const requestModel = this._createSerchRequestModel();
    console.log(requestModel);
    this.loading = true;
    //this.fileSearchService.clearSearch();
    this.fileSearchService.search(requestModel);
  }

  _createSerchRequestModel(): SearchRequestModel {
    const server = this.formGroup.controls.server.value;
    const rootPath = this.formGroup.controls.rootPath.value;
    const searchTerm = this.formGroup.controls.searchTerm.value;
    return SearchRequestModel.of(server, rootPath, searchTerm);
  }
}
