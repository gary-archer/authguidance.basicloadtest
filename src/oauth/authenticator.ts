import color from 'colors';
import {Client, custom, HttpOptions, Issuer} from 'openid-client';
import {Configuration} from '../configuration/configuration';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {ErrorHandler} from '../errors/errorHandler';
import {HttpProxy} from '../utilities/httpProxy';

/*
 * A class to do authenication using the resource owner password grant
 */
export class Authenticator {

    private readonly _configuration: OAuthConfiguration;
    private _issuer: Issuer<Client> | null;

    public constructor(configuration: Configuration) {

        this._configuration = configuration.oauth;
        this._issuer = null;
        Issuer[custom.http_options] = this.getHttpOptions;
    }

    /*
     * Load metadata
     */
    public async initialise(): Promise<void> {

        const startTime = process.hrtime();
        try {

            // Try to download metadata
            const endpoint = `${this._configuration.authority}/.well-known/openid-configuration`;
            this._issuer = await Issuer.discover(endpoint);

        } catch (e) {

            // Report errors
            throw ErrorHandler.fromHttpResponse('metadata_download_error', e);

        } finally {

            // Report time taken
            this.reportTimeTaken('Time to download Open Id Connect Metadata', startTime);
        }
    }

    /*
     * Make the authentication request and get a token
     */
    public async getAccessToken(): Promise<string> {

        // Create the OAuth client
        const client = new this._issuer!.Client({
            client_id: this._configuration.clientId,
            client_secret: this._configuration.clientSecret,
        });
        client[custom.http_options] = this.getHttpOptions;

        // Try to authenticate
        const startTime = process.hrtime();
        try {

            // Send the Password Grant message
            const tokenData = await client.grant({
                grant_type: 'password',
                username: this._configuration.userId,
                password: this._configuration.password,
                scope: this._configuration.scope,
            });

            // Return the token
            return tokenData.access_token!;

        } catch (e) {

            // Report errors
            throw ErrorHandler.fromHttpResponse('password_grant_error', e);

        } finally {

            // Report time taken
            this.reportTimeTaken('Time to authenticate via Resource Owner Password Grant', startTime);
        }
    }

    /*
     * Configure Open Id Client HTTP options, including the proxy
     */
    private getHttpOptions(options: HttpOptions): HttpOptions {

        options.timeout = 10000;
        options.agent = {
            https: HttpProxy.getAgent(),
        };

        return options;
    }

    /*
     * A helper routine to measure the time taken and output results
     */
    private reportTimeTaken(description: string, startTime: any): void {

        const endTime = process.hrtime(startTime);
        const millisecondsTaken = Math.floor((endTime[0] * 1000000000 + endTime[1]) / 1000000);
        console.log(
            color.yellow(
                `${description}: ${millisecondsTaken} milliseconds`));
    }
}
