export class SearchRequestModel {
    servers: string[];
    rootPath: string;
    searchTerm: string;

    private constructor(servers: Array<string>, rootPath: string, searchTerm: string) {
        this.servers = servers;
        this.rootPath = rootPath;
        this.searchTerm = searchTerm;
    }

    static of(servers: Array<string>, rootPath: string, searchTerm: string): SearchRequestModel {
        return new SearchRequestModel(servers, rootPath, searchTerm);
      }
}
