import { Component, OnInit, Input } from '@angular/core';
import { SearchResponseModel } from '../model/search-response.model';

@Component({
  selector: 'app-search-result-list',
  templateUrl: './search-result-list.component.html',
  styleUrls: ['./search-result-list.component.scss']
})
export class SearchResultListComponent implements OnInit {

  @Input()
  dataSource: SearchResponseModel[];
  displayedColumns: string[] = ['position', 'filePath', 'count'];

  constructor() { }

  ngOnInit() {
  }

}
