import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ValidatorFn, FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { SearchRequestModel } from '../model/search-request.model';
import { SearchResponseModel } from '../model/search-response.model';
import { FileSearchService } from '../service/file-search.service';
import { ServerService } from '../service/server.service';
import { DialogService } from '../shared/services/dialog.service';


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
