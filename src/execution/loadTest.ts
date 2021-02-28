import color from 'colors';
import {Guid} from 'guid-typescript';
import {ApiClient} from '../api/apiClient';
import {Configuration} from '../configuration/configuration';
import {Authenticator} from '../oauth/authenticator';
import {CallContext} from '../utilities/callContext';

/*
 * A primitive load test to run some requests in parallel and report results
 */
export class LoadTest {

    private readonly _authenticator: Authenticator;
    private readonly _apiClient: ApiClient;
    private readonly _sessionId: string;
    private _totalCount: number;
    private _errorCount: number;

    public constructor(configuration: Configuration) {
        this._authenticator = new Authenticator(configuration);
        this._apiClient = new ApiClient(configuration.app);
        this._sessionId = Guid.create().toString();
        this._totalCount = 0;
        this._errorCount = 0;
    }

    /*
     * Start the work, which will result in 100 total API calls
     */
    /* eslint-disable max-len */
    public async execute(): Promise<void> {

        // First get some access tokens
        const startMessage = `Load test session ${this._sessionId} starting at ${new Date().toISOString()}\n`;
        console.log(color.blue(startMessage));
        const accessTokens: string[] = await this.getAccessTokens();

        // Show a startup message
        const startTime = process.hrtime();
        const header = '\nOPERATION...\tSTART TIME ...............\tCORRELATION ID ...................\tSTATUS\tMS\tERROR';
        console.log(color.yellow(header));

        // First execute some warm up requests
        await this.sendWarmupRequests(accessTokens);

        // Next execute the main body of requests
        await this.sendLoadTestRequests(accessTokens);

        // Report results
        const endTime = process.hrtime(startTime);
        const millisecondsTaken = Math.floor((endTime[0] * 1000000000 + endTime[1]) / 1000000);
        const endMessage = `Load test session ${this._sessionId} completed in ${millisecondsTaken} milliseconds`;
        const errorStats = `${this._errorCount} errors from ${this._totalCount} requests`;
        console.log(color.blue(`\n${endMessage}: (${errorStats})`));
    }

    /*
     * Do some initial work to get access tokens
     */
    private async getAccessTokens(): Promise<string[]> {

        // Initialse authentication
        await this._authenticator.initialise();

        // First get 5 access tokens
        const accessTokens: string[] = [];
        for (let index = 0; index < 5; index++) {
            accessTokens.push(await this._authenticator.getAccessToken());
        }

        // Return access tokens for later API requests, which will run faster
        return accessTokens;
    }

    /*
     * Do a warm up request for each token, to trigger the API to do authorization and claims lookup
     */
    private async sendWarmupRequests(accessTokens: string[]): Promise<void> {

        const requests: (() => Promise<CallContext>)[] = [];
        for (let index = 0; index < 5; index++) {
            requests.push(this.createUserInfoRequest(accessTokens[index]));
        }
        await this.executeApiRequests(requests);
    }

    /*
     * Create the main body of API requests
     */
    private async sendLoadTestRequests(accessTokens: string[]): Promise<void> {

        // Next produce some requests that will run in parallel
        const requests: (() => Promise<CallContext>)[] = [];
        for (let index = 0; index < 95; index++) {

            // Create a 401 error on request 10, by making the access token act expired
            let accessToken = accessTokens[index % 5];
            if (index === 10) {
                accessToken += 'x';
            }

            // Create some mixed requests
            if (index % 5 === 0) {

                // User info
                requests.push(this.createUserInfoRequest(accessToken));

            } else if (index % 5 === 1) {

                // Transactions for company 1
                requests.push(this.createTransactionsRequest(accessToken, 1));

            } else if (index % 5 === 2) {

                // On request 32 try to access unauthorized data for company 3
                const companyId = (index === 32) ? 3 : 2;
                requests.push(this.createTransactionsRequest(accessToken, companyId));

            } else if (index % 5 === 4) {

                // Transactions for company 4
                requests.push(this.createTransactionsRequest(accessToken, 4));

            } else {

                // Company list
                requests.push(this.createCompaniesRequest(accessToken));
            }
        }

        await this.executeApiRequests(requests);
    }

    /*
     * Create a user info request callback
     */
    private createUserInfoRequest(accessToken: string): () => Promise<CallContext> {

        const context = this.createRequestContext('getUserInfo');
        return () => this._apiClient.getUserInfoClaims(accessToken, context);
    }

    /*
     * Create a get companies request callback
     */
    private createCompaniesRequest(accessToken: string): () => Promise<CallContext> {

        const context = this.createRequestContext('getCompanies');
        return () => this._apiClient.getCompanyList(accessToken, context);
    }

    /*
     * Create a get transactions request callback
     */
    private createTransactionsRequest(accessToken: string, companyId: number): () => Promise<CallContext> {

        const context = this.createRequestContext('getTransactions');
        return () => this._apiClient.getCompanyTransactions(
            accessToken,
            companyId,
            context);
    }

    /*
     * Issue API requests in batches of 5, to avoid excessive queueing in the client
     * By default there is a limit of 5 concurrent outgoing requests to a single host
     */
    private async executeApiRequests(requests: (() => Promise<CallContext>)[]): Promise<CallContext[]> {

        // Set counters
        const total = requests.length;
        const batchSize = 5;
        let current = 0;

        // Process one batch at a time
        const results: CallContext[] = [];
        while (current < total) {

            // Get a batch of requests
            const requestBatch = requests.slice(current, Math.min(current + batchSize, total));

            // Execute them to create promises
            const promises = requestBatch.map((r) => this.executeApiRequest(r));

            // Wait for the batch to complete
            const batchResults = await Promise.all(promises);

            // Process results
            batchResults.forEach((r) => results.push(r));
            current += batchSize;
        }

        return results;
    }

    /*
     * Start execution and return a success promise for both successful and failed API requests
     */
    private executeApiRequest(callback: () => Promise<CallContext>): Promise<CallContext> {

        return new Promise<CallContext>((resolve) => {

            // Call 'then' to start firing the API request
            callback().then((context) => {

                // Report success or failure
                if (!context.error) {
                    console.log(color.green(context.toString()));
                } else {
                    this._errorCount++;
                    console.log(color.red(context.toString()));
                }

                // Resolve the promise
                resolve(context);
            });
        });
    }

    /*
     * Create the call context and supply request details
     */
    private createRequestContext(operationName: string): CallContext {

        // Create context for this operation
        const context = new CallContext(this._sessionId, operationName);

        // On request 14 we'll simulate a 500 error via a custom header
        this._totalCount++;
        if (this._totalCount === 14) {
            context.cause500 = true;
        }

        return context;
    }
}
