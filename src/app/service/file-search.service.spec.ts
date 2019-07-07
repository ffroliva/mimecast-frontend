import { TestBed } from '@angular/core/testing';

import { FileSearchService } from './file-search.service';

describe('FileSearchService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FileSearchService = TestBed.get(FileSearchService);
    expect(service).toBeTruthy();
  });
});
