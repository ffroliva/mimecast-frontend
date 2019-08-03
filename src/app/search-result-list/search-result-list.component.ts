import { Component, OnInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import { SearchResponseModel } from '../model/search-response.model';

@Component({
  selector: 'app-search-result-list',
  templateUrl: './search-result-list.component.html',
  styleUrls: ['./search-result-list.component.scss']
})
export class SearchResultListComponent implements OnChanges {

  displayedColumns: string[] = ['position', 'filePath', 'count', 'server'];
  @Input() dataSource: Array<SearchResponseModel> = [];
  @Input() count = 0;

  ngOnChanges(changes: SimpleChanges) {
    this.count = changes.count ? changes.count.currentValue : this.count;
  }

}
