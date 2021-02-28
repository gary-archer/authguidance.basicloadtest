import TunnelAgent from 'tunnel-agent';
import url from 'url';

/*
 * Manage supplying the HTTP proxy on API calls and OAuth requests
 */
export class HttpProxy {

    /*
     * Create the HTTP agent at application startup
     */
    public static initialize(useProxy: boolean, proxyUrl: string): void {

        if (useProxy) {
            const opts = url.parse(proxyUrl);
            HttpProxy._agent = TunnelAgent.httpsOverHttp({
                proxy: opts,
            });
        }
    }

    /*
     * Return the configured agent
     */
    public static getAgent(): any {
        return HttpProxy._agent;
    }

    // The global proxy agent
    private static _agent: any = null;
}
