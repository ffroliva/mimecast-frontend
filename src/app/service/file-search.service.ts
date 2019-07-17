import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';

import { SearchResponseModel } from '../model/search-response.model';
import { SearchRequestModel } from '../model/search-request.model';

@Injectable({
  providedIn: 'root'
})
export class FileSearchService {

  private subject: Subject<SearchResponseModel> = new Subject();

  constructor(
    private http: HttpClient,
    ) { }

  search(searchRequestModel: SearchRequestModel): void {
    const param = new HttpParams()
    .set('rootPath', searchRequestModel.rootPath)
    .set('searchTerm', searchRequestModel.searchTerm);
    const eventSource = new EventSource(`/api/file/search?${param.toString()}`);

    eventSource.addEventListener('searchFile', (e) => {
      console.log(e);
    }, false);

    eventSource.onmessage = (event) => {
      this.subject.next(JSON.parse(event.data));
    };

    eventSource.onerror = (event) => {
      eventSource.close();
      this.subject.next(null);
    };
  }

  sendSearchResponse(searchResponseModel: SearchResponseModel) {
    this.subject.next(searchResponseModel);
  }

  getSearchResult(): Observable<SearchResponseModel> {
    return this.subject.asObservable();
  }

}
