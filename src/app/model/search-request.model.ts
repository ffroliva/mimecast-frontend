export class SearchRequestModel {
    server: string;
    rootPath: string;
    searchTerm: string;

    private constructor(server: string, rootPath: string, searchTerm: string) {
        this.server = server;
        this.rootPath = rootPath;
        this.searchTerm = searchTerm;
    }

    static of(server: string, rootPath: string, searchTerm: string): SearchRequestModel {
        return new SearchRequestModel(server, rootPath, searchTerm);
      }
}
