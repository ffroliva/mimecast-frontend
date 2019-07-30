import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { MessageEventModel } from '../model/message-event.model';
import { SearchRequestModel } from '../model/search-request.model';


@Injectable({
  providedIn: 'root'
})
export class FileSearchService {

  private subject: Subject<MessageEventModel> = new Subject();

  constructor(
    private http: HttpClient,
    ) { }

  search(searchRequestModel: SearchRequestModel): void {
    const param: HttpParams = searchRequestModel.servers
    .reduce((hp: HttpParams, value: string) => hp.append('servers', value), new HttpParams())
    .set('rootPath', searchRequestModel.rootPath)
    .set('searchTerm', searchRequestModel.searchTerm);
    const eventSource = new EventSource(`/api/file/search?${param.toString()}`);

    eventSource.onmessage = (event) => {
      this.subject.next(JSON.parse(event.data));
    };

    eventSource.onerror = (event) => {
      eventSource.close();
      this.subject.next();
    };
  }

  getMessage(): Observable<MessageEventModel> {
    return this.subject.asObservable();
  }

}
