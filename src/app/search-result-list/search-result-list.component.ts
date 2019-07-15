import { Component, OnInit, Input } from '@angular/core';
import { SearchResponseModel } from '../model/search-response.model';
import { FileSearchService } from '../service/file-search.service';

@Component({
  selector: 'app-search-result-list',
  templateUrl: './search-result-list.component.html',
  styleUrls: ['./search-result-list.component.scss']
})
export class SearchResultListComponent implements OnInit {

  dataSource: SearchResponseModel[] = [];
  displayedColumns: string[] = ['position', 'filePath', 'count'];

  constructor(private service: FileSearchService) {}

  ngOnInit() {
    this.service.getSearchResult()
    .subscribe(data => {
      if ( data ) {
        this.dataSource = this.dataSource.concat(data);
        console.log(data);
      }
    });
  }

}
