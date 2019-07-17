import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { SearchResponseModel } from '../model/search-response.model';
import { FileSearchService } from '../service/file-search.service';

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
