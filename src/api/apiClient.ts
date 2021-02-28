import axios, {AxiosRequestConfig, Method} from 'axios';
import {AppConfiguration} from '../configuration/appConfiguration';
import {ErrorHandler} from '../errors/errorHandler';
import {AxiosUtils} from '../utilities/axiosUtils';
import {CallContext} from '../utilities/callContext';
import {HttpProxy} from '../utilities/httpProxy';

/*
 * A class via which to call our API
 */
export class ApiClient {

    private readonly _configuration: AppConfiguration;

    public constructor(configuration: AppConfiguration) {
        this._configuration = configuration;
    }

    /*
     * Return claims from the API, which originated from the OAuth endpoint
     */
    public async getUserInfoClaims(accessToken: string, context: CallContext): Promise<CallContext> {

        return this.getApiData(
            accessToken,
            '/userclaims/current',
            'GET',
            null,
            context);
    }

    /*
     * Return the list of companies
     */
    public async getCompanyList(accessToken: string, context: CallContext): Promise<CallContext> {

        return this.getApiData(
            accessToken,
            '/companies',
            'GET',
            null,
            context);
    }

    /*
     * Return the transactions for a specific company
     */
    public async getCompanyTransactions(
        accessToken: string, id: number, context: CallContext): Promise<CallContext> {

        return this.getApiData(
            accessToken,
            `/companies/${id}/transactions`,
            'GET',
            null,
            context);
    }

    /*
     * A parameterised way to call the API and handle common aspects only once
     */
    private async getApiData(
        accessToken: string,
        path: string,
        method: Method,
        payload: any,
        context: CallContext): Promise<CallContext> {

        // Define request options
        const url = `${this._configuration.apiBaseUrl}${path}`;
        const options: AxiosRequestConfig = {
            url,
            method,
            data: payload,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            httpsAgent: HttpProxy.getAgent(),
        };

        // Add headers used for correlation and testing
        const customHeaders = context.customHeaders;
        for (const header in customHeaders) {
            if (header) {
                options.headers[header] = customHeaders[header];
            }
        }

        // Start measuring performance
        const startTime = process.hrtime();

        try {

            // Call the API
            const response = await axios.request(options);
            AxiosUtils.checkJson(response.data);

            // Record the status code
            if (response.status) {
                context.statusCode = response.status;
            }

            // Record response data
            context.response = response.data;

        } catch (e) {

            // Add the status code to the context
            if (e.response && e.response.status) {
                context.statusCode = e.response.status;
            }

            // Add error details to the context
            const hasErrorCode = e.response && e.response.data && e.response.data.code;
            context.error = hasErrorCode ?
                ErrorHandler.fromHttpResponse(e.response.data.code, e) :
                ErrorHandler.fromHttpResponse('api_request_error', e);

        } finally {

            // Report the time taken
            const endTime = process.hrtime(startTime);
            context.millisecondsTaken = Math.floor((endTime[0] * 1000000000 + endTime[1]) / 1000000);
        }

        return context;
    }
}
