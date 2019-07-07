import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { SearchResponseModel } from '../model/search-response.model';
import { SearchRequestModel } from '../model/search-request.model';

@Injectable({
  providedIn: 'root'
})
export class FileSearchService {

  constructor(
    private http: HttpClient,
    ) { }

  search(searchRequestModel: SearchRequestModel): Observable<SearchResponseModel[]> {
    return this.http.post<SearchResponseModel[]>('api/file/search', searchRequestModel);
  }

}
