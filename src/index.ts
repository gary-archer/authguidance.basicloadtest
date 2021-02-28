import color from 'colors';
import {ErrorHandler} from './errors/errorHandler';
import {LoadTest} from './execution/loadTest';
import {ConfigurationLoader} from './utilities/configurationLoader';
import {HttpProxy} from './utilities/httpProxy';

(async () => {
    try {

        // Load configuration and initialize HTTP debugging
        const configuration = ConfigurationLoader.loadConfiguration();

        // Set up HTTP debugging
        HttpProxy.initialize(configuration.app.useProxy, configuration.app.proxyUrl);

        // Do the work of the load test
        const loadTest = new LoadTest(configuration);
        await loadTest.execute();

    } catch (e) {

        // Handle exceptions in the load test code
        const error = ErrorHandler.fromException(e);
        console.log(color.red(error.toString()));
    }
})();
