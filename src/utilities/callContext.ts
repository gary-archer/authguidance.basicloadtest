import {Guid} from 'guid-typescript';
import {LoadTestError} from '../errors/loadTestError';

/*
 * Contextual information about a request and response
 */
export class CallContext {

    // Request fields
    private readonly _sessionId: string;
    private readonly _operationName: string;
    private readonly _correlationId: string;
    private readonly _utcTime: Date;
    private _cause500: boolean;

    // Response fields
    private _statusCode: number;
    private _response: any;
    private _error: LoadTestError | null;
    private _millisecondsTaken: number;

    /*
     * Set defaults
     */
    public constructor(sessionId: string, operationName: string) {

        // Set request fields
        this._sessionId = sessionId;
        this._operationName = operationName;
        this._correlationId = Guid.create().toString();
        this._utcTime = new Date();
        this._cause500 = false;

        // Initialise response fields
        this._statusCode = 0;
        this._response = null;
        this._error = null;
        this._millisecondsTaken = 0;
    }

    /*
     * Add headers useful for API testing and log analysis
     */
    public get customHeaders(): any {

        // API logs use this to record the application name of the caller
        const headers: any = {};
        headers['x-mycompany-api-client'] = 'BasicLoadTest';

        // Headers for correlating specific API calls to specific API log entries
        headers['x-mycompany-correlation-id'] = this._correlationId;
        headers['x-mycompany-session-id'] = this._sessionId;

        // A header to cause an API exception and 500 response, to enable early people focus on incident management
        if (this._cause500) {
            headers['x-mycompany-test-exception'] = 'SampleApi';
        }

        return headers;
    }

    /*
     * A flag to enable us to test 500 errors
     */
    public set cause500(value: boolean) {
        this._cause500 = true;
    }

    public set statusCode(value: number) {
        this._statusCode = value;
    }

    public get statusCode(): number {
        return this._statusCode;
    }

    public set response(value: any) {
        this._response = value;
    }

    public get response(): any {
        return this._response;
    }

    public set error(value: LoadTestError | null) {
        this._error = value;
    }

    public get error(): LoadTestError | null {
        return this._error;
    }

    public set millisecondsTaken(value: number) {
        this._millisecondsTaken = value;
    }

    public get millisecondsTaken(): number {
        return this._millisecondsTaken;
    }

    /*
     * Output tabular data that can be directed to a file and then compared to the API logs
     */
    /* eslint-disable max-len */
    public toString(): string {
        let result = `${this._operationName}\t${this._utcTime.toISOString()}\t${this._correlationId}\t${this._statusCode}\t${this._millisecondsTaken}`;
        if (this._error) {
            result += `\t${this._error.getErrorCode()}`;
        }
        return result;
    }
}
