import { Component, OnInit } from '@angular/core';

import { SearchResponseModel } from '../model/search-response.model';
ng
@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {

  searchResult: SearchResponseModel[];

  constructor() { }

  ngOnInit() {
  }

  searchResultChanged(searchResult: SearchResponseModel[]) {
    console.log('searchResultChanged', searchResult);
    this.searchResult = searchResult;
}

}
