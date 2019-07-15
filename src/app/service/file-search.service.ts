import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
    const param = new HttpParams()
    .set('rootPath', searchRequestModel.rootPath)
    .set('searchTerm', searchRequestModel.searchTerm);
    return this.http.get<SearchResponseModel[]>('api/file/search', { params: param });
  }

}
