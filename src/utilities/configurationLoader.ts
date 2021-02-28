import fs from 'fs-extra';
import {Configuration} from '../configuration/configuration';

/*
 * Provide data from our configuration files
 */
export class ConfigurationLoader {

    /*
     * Load the configuration
     */
    public static loadConfiguration(): Configuration {
        const configurationBuffer = fs.readFileSync('config.json');
        return JSON.parse(configurationBuffer.toString()) as Configuration;
    }
}
